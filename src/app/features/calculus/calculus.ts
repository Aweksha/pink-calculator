import { Component, computed, signal } from '@angular/core';
import { GraphCanvas } from '../../components/graph-canvas/graph-canvas';
import { ToolOutcome, ToolResult } from '../../components/tool-result/tool-result';
import { NumericResult, PlotSeries } from '../../models/calculator.types';
import { CalcError, compileFunction, formatNumber, parseNumber } from '../../services/math-engine';
import { derivative, findRoot, integrate, limit, LimitDirection } from '../../services/numerics';

function parseLimitPoint(text: string): number {
  const t = text.trim().toLowerCase().replace(/\s/g, '');
  if (['inf', '+inf', 'infinity', '∞', '+∞'].includes(t)) return Infinity;
  if (['-inf', '-infinity', '-∞', '−∞'].includes(t)) return -Infinity;
  return parseNumber(text, 'a');
}

const show = (v: number) => (Number.isFinite(v) ? formatNumber(v, 10) : v > 0 ? '+∞' : '−∞');

@Component({
  selector: 'app-calculus',
  imports: [GraphCanvas, ToolResult],
  templateUrl: './calculus.html',
  styleUrl: './calculus.scss',
})
export class Calculus {
  protected readonly fnText = signal('x^2');
  protected readonly compiled = computed(() => compileFunction(this.fnText()));

  protected readonly derivPoint = signal('3');
  protected readonly intFrom = signal('0');
  protected readonly intTo = signal('1');
  protected readonly rootMode = signal<'guess' | 'bracket'>('guess');
  protected readonly rootGuess = signal('1');
  protected readonly rootA = signal('0');
  protected readonly rootB = signal('3');
  protected readonly limitPoint = signal('0');
  protected readonly limitDirection = signal<LimitDirection>('both');

  protected readonly derivResult = signal<ToolOutcome>(null);
  protected readonly intResult = signal<ToolOutcome>(null);
  protected readonly rootResult = signal<ToolOutcome>(null);
  protected readonly limitResult = signal<ToolOutcome>(null);

  protected readonly series = computed<PlotSeries[]>(() => {
    const c = this.compiled();
    if (!c.ok) return [];
    const f = c.fn;
    const fPrime = (x: number) => {
      const h = 1e-5 * Math.max(1, Math.abs(x));
      return (f(x + h) - f(x - h)) / (2 * h);
    };
    return [
      { id: 'f', label: `f(x) = ${c.expression}`, color: '#D65B8C', fn: f },
      { id: 'df', label: 'f′(x) (numerical)', color: '#3E7CC9', fn: fPrime, dashed: true },
    ];
  });

  protected text(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  private run(
    target: typeof this.derivResult,
    compute: (f: (x: number) => number) => NumericResult,
    label: (v: number) => string,
  ) {
    const c = this.compiled();
    if (!c.ok) {
      target.set({ ok: false, error: c.error });
      return;
    }
    try {
      const r = compute(c.fn);
      target.set(
        r.ok ? { ok: true, text: label(r.value), detail: r.detail } : { ok: false, error: r.error },
      );
    } catch (e) {
      target.set({
        ok: false,
        error: e instanceof CalcError ? e.message : 'Could not compute this',
      });
    }
  }

  computeDerivative(): void {
    this.run(
      this.derivResult,
      (f) => derivative(f, parseNumber(this.derivPoint(), 'x₀')),
      (v) => `f′(${this.derivPoint().trim()}) ≈ ${show(v)}`,
    );
  }

  computeIntegral(): void {
    this.run(
      this.intResult,
      (f) => integrate(f, parseNumber(this.intFrom(), 'a'), parseNumber(this.intTo(), 'b')),
      (v) => `∫ f(x) dx from ${this.intFrom().trim()} to ${this.intTo().trim()} ≈ ${show(v)}`,
    );
  }

  computeRoot(): void {
    this.run(
      this.rootResult,
      (f) =>
        this.rootMode() === 'guess'
          ? findRoot(f, { guess: parseNumber(this.rootGuess(), 'initial guess') })
          : findRoot(f, {
              bracket: [parseNumber(this.rootA(), 'a'), parseNumber(this.rootB(), 'b')],
            }),
      (v) => `x ≈ ${show(v)}`,
    );
  }

  computeLimit(): void {
    const arrow = { both: '', left: '⁻', right: '⁺' }[this.limitDirection()];
    this.run(
      this.limitResult,
      (f) => limit(f, parseLimitPoint(this.limitPoint()), this.limitDirection()),
      (v) => `lim x→${this.limitPoint().trim()}${arrow} f(x) ≈ ${show(v)}`,
    );
  }
}
