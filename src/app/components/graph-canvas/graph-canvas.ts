import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { PlotSeries } from '../../models/calculator.types';
import { SettingsService } from '../../services/settings.service';

interface Viewport {
  /** World coordinates at the centre of the canvas. */
  cx: number;
  cy: number;
  /** CSS pixels per world unit (same on both axes). */
  scale: number;
}

const MIN_SCALE = 1e-4;
const MAX_SCALE = 1e8;
const DEFAULT_SPAN = 20;

function niceStep(raw: number): number {
  const exponent = Math.floor(Math.log10(raw));
  const fraction = raw / 10 ** exponent;
  const nice = fraction < 1.5 ? 1 : fraction < 3.5 ? 2 : fraction < 7.5 ? 5 : 10;
  return nice * 10 ** exponent;
}

export function formatAxisValue(v: number): string {
  if (Math.abs(v) < 1e-12) return '0';
  const abs = Math.abs(v);
  if (abs >= 1e6 || abs < 1e-4) return v.toExponential(1).replace('e+', 'e');
  return Number(v.toPrecision(6)).toString();
}

/**
 * Lightweight canvas plotter: samples each function once per pixel column, breaks lines at
 * discontinuities, and supports wheel/pinch zoom, drag panning, tracing, and keyboard control.
 */
@Component({
  selector: 'app-graph-canvas',
  templateUrl: './graph-canvas.html',
  styleUrl: './graph-canvas.scss',
})
export class GraphCanvas {
  readonly series = input<PlotSeries[]>([]);
  readonly label = input('Graph of the plotted functions');

  private readonly settings = inject(SettingsService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  private readonly size = signal({ width: 0, height: 0 });
  private readonly view = signal<Viewport>({ cx: 0, cy: 0, scale: 0 });
  /** Traced x-coordinate (world units), set by hovering, tapping, or arrow keys. */
  readonly traceX = signal<number | null>(null);

  protected readonly traceValues = computed(() => {
    const x = this.traceX();
    if (x === null) return [];
    return this.series().map((s) => ({ ...s, y: s.fn(x) }));
  });
  protected readonly traceLabel = computed(() => {
    const x = this.traceX();
    return x === null ? '' : formatAxisValue(Number(x.toPrecision(8)));
  });
  protected readonly formatValue = (y: number) =>
    Number.isFinite(y) ? formatAxisValue(Number(y.toPrecision(8))) : 'undefined';

  private readonly pointers = new Map<number, { x: number; y: number }>();
  private pinchDistance = 0;
  private dragged = false;
  private frame = 0;

  constructor() {
    afterNextRender(() => {
      const observer = new ResizeObserver(([entry]) => {
        const { width, height } = entry.contentRect;
        this.size.set({ width, height });
        if (this.view().scale === 0 && width > 0) this.reset();
      });
      observer.observe(this.canvasRef().nativeElement);
      this.destroyRef.onDestroy(() => {
        observer.disconnect();
        cancelAnimationFrame(this.frame);
      });
    });

    effect(() => {
      this.series();
      this.view();
      this.size();
      this.traceX();
      this.settings.resolvedTheme();
      cancelAnimationFrame(this.frame);
      this.frame = requestAnimationFrame(() => this.draw());
    });
  }

  reset(): void {
    const { width } = this.size();
    this.view.set({ cx: 0, cy: 0, scale: Math.max(width, 1) / DEFAULT_SPAN });
  }

  zoomIn(): void {
    this.zoomAround(this.size().width / 2, this.size().height / 2, 1.5);
  }

  zoomOut(): void {
    this.zoomAround(this.size().width / 2, this.size().height / 2, 1 / 1.5);
  }

  private toWorldX(px: number, v = this.view()): number {
    return v.cx + (px - this.size().width / 2) / v.scale;
  }

  private toScreenX(x: number, v = this.view()): number {
    return (x - v.cx) * v.scale + this.size().width / 2;
  }

  private toScreenY(y: number, v = this.view()): number {
    return this.size().height / 2 - (y - v.cy) * v.scale;
  }

  private zoomAround(px: number, py: number, factor: number): void {
    const { width, height } = this.size();
    this.view.update((v) => {
      const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * factor));
      const wx = v.cx + (px - width / 2) / v.scale;
      const wy = v.cy - (py - height / 2) / v.scale;
      return { scale, cx: wx - (px - width / 2) / scale, cy: wy + (py - height / 2) / scale };
    });
  }

  private panBy(dx: number, dy: number): void {
    this.view.update((v) => ({ ...v, cx: v.cx - dx / v.scale, cy: v.cy + dy / v.scale }));
  }

  private localPoint(event: PointerEvent | WheelEvent) {
    const rect = this.canvasRef().nativeElement.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  protected onWheel(event: WheelEvent): void {
    event.preventDefault();
    const { x, y } = this.localPoint(event);
    this.zoomAround(x, y, Math.exp(-event.deltaY * 0.0015));
  }

  protected onPointerDown(event: PointerEvent): void {
    this.canvasRef().nativeElement.setPointerCapture(event.pointerId);
    this.pointers.set(event.pointerId, this.localPoint(event));
    this.dragged = false;
    if (this.pointers.size === 2) this.pinchDistance = this.currentPinchDistance();
  }

  protected onPointerMove(event: PointerEvent): void {
    const point = this.localPoint(event);
    const previous = this.pointers.get(event.pointerId);
    if (!previous) {
      if (event.pointerType === 'mouse') this.traceX.set(this.toWorldX(point.x));
      return;
    }
    if (this.pointers.size === 1) {
      const dx = point.x - previous.x;
      const dy = point.y - previous.y;
      if (Math.abs(dx) + Math.abs(dy) > 2) this.dragged = true;
      if (this.dragged) this.panBy(dx, dy);
      this.pointers.set(event.pointerId, point);
    } else if (this.pointers.size === 2) {
      this.pointers.set(event.pointerId, point);
      const distance = this.currentPinchDistance();
      const [a, b] = [...this.pointers.values()];
      if (this.pinchDistance > 0) {
        this.zoomAround((a.x + b.x) / 2, (a.y + b.y) / 2, distance / this.pinchDistance);
      }
      this.pinchDistance = distance;
      this.dragged = true;
    }
  }

  protected onPointerUp(event: PointerEvent): void {
    const point = this.pointers.get(event.pointerId);
    this.pointers.delete(event.pointerId);
    if (point && !this.dragged) this.traceX.set(this.toWorldX(point.x));
    if (this.pointers.size < 2) this.pinchDistance = 0;
  }

  protected onPointerLeave(event: PointerEvent): void {
    if (event.pointerType === 'mouse' && this.pointers.size === 0) this.traceX.set(null);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const step = 40;
    const handled: Record<string, () => void> = {
      ArrowLeft: () => (event.shiftKey ? this.moveTrace(-1) : this.panBy(step, 0)),
      ArrowRight: () => (event.shiftKey ? this.moveTrace(1) : this.panBy(-step, 0)),
      ArrowUp: () => this.panBy(0, step),
      ArrowDown: () => this.panBy(0, -step),
      '+': () => this.zoomIn(),
      '=': () => this.zoomIn(),
      '-': () => this.zoomOut(),
      '0': () => this.reset(),
    };
    const action = handled[event.key];
    if (!action) return;
    event.preventDefault();
    action();
  }

  private moveTrace(direction: number): void {
    const v = this.view();
    const step = niceStep(40 / v.scale) / 4;
    const current = this.traceX() ?? v.cx;
    this.traceX.set(Math.round((current + direction * step) / step) * step);
  }

  private currentPinchDistance(): number {
    const [a, b] = [...this.pointers.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  }

  private draw(): void {
    const canvas = this.canvasRef().nativeElement;
    const { width, height } = this.size();
    const v = this.view();
    if (width === 0 || height === 0 || v.scale === 0) return;

    const dpr = globalThis.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const css = getComputedStyle(this.host.nativeElement);
    const color = (name: string) => css.getPropertyValue(name).trim();

    ctx.fillStyle = color('--surface');
    ctx.fillRect(0, 0, width, height);

    const xMin = this.toWorldX(0);
    const xMax = this.toWorldX(width);
    const yMax = v.cy + height / 2 / v.scale;
    const yMin = v.cy - height / 2 / v.scale;
    const step = niceStep(90 / v.scale);
    const minor = step / 5;

    const gridLines = (spacing: number, stroke: string) => {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = Math.ceil(xMin / spacing) * spacing; x <= xMax; x += spacing) {
        const px = Math.round(this.toScreenX(x)) + 0.5;
        ctx.moveTo(px, 0);
        ctx.lineTo(px, height);
      }
      for (let y = Math.ceil(yMin / spacing) * spacing; y <= yMax; y += spacing) {
        const py = Math.round(this.toScreenY(y)) + 0.5;
        ctx.moveTo(0, py);
        ctx.lineTo(width, py);
      }
      ctx.stroke();
    };
    gridLines(minor, color('--graph-grid-minor'));
    gridLines(step, color('--graph-grid'));

    // Axes, clamped to the edges when the origin is off-screen so labels stay visible.
    const axisX = Math.min(Math.max(this.toScreenX(0), 0), width);
    const axisY = Math.min(Math.max(this.toScreenY(0), 0), height);
    ctx.strokeStyle = color('--graph-axis');
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (xMin <= 0 && xMax >= 0) {
      ctx.moveTo(axisX, 0);
      ctx.lineTo(axisX, height);
    }
    if (yMin <= 0 && yMax >= 0) {
      ctx.moveTo(0, axisY);
      ctx.lineTo(width, axisY);
    }
    ctx.stroke();

    ctx.fillStyle = color('--graph-label');
    ctx.font = '600 11px Nunito, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const labelY = Math.min(axisY + 4, height - 14);
    for (let x = Math.ceil(xMin / step) * step; x <= xMax; x += step) {
      const px = this.toScreenX(x);
      if (Math.abs(x) < step / 2 || px < 14 || px > width - 14) continue;
      ctx.fillText(formatAxisValue(x), px, labelY);
    }
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const labelX = Math.max(axisX - 4, 30);
    for (let y = Math.ceil(yMin / step) * step; y <= yMax; y += step) {
      const py = this.toScreenY(y);
      if (Math.abs(y) < step / 2 || py < 8 || py > height - 8) continue;
      ctx.fillText(formatAxisValue(y), labelX, py);
    }

    const limit = height * 4;
    for (const s of this.series()) {
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.setLineDash(s.dashed ? [6, 5] : []);
      ctx.beginPath();
      let penDown = false;
      let previous = 0;
      for (let px = 0; px <= width; px++) {
        const y = s.fn(this.toWorldX(px));
        if (!Number.isFinite(y)) {
          penDown = false;
          continue;
        }
        const py = Math.min(Math.max(this.toScreenY(y), -limit), height + limit);
        // A jump larger than the canvas height between adjacent columns is treated as an asymptote.
        if (penDown && Math.abs(py - previous) > height) penDown = false;
        if (penDown) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
        penDown = true;
        previous = py;
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);

    const traceX = this.traceX();
    if (traceX !== null) {
      const px = this.toScreenX(traceX);
      ctx.strokeStyle = color('--graph-axis');
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, height);
      ctx.stroke();
      ctx.setLineDash([]);
      for (const s of this.series()) {
        const y = s.fn(traceX);
        if (!Number.isFinite(y)) continue;
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(px, this.toScreenY(y), 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
