import { Component, computed, inject, signal } from '@angular/core';
import { MatrixView } from '../../components/matrix-view/matrix-view';
import { AngleMode } from '../../models/calculator.types';
import {
  ANGULAR_TO_RAD_S,
  AngularUnit,
  Axis,
  cartesianToPolar,
  CONSTANTS,
  convertAngularVelocity,
  convertUnit,
  homogeneous,
  multiplyTransforms,
  polarToCartesian,
  rotatePoint2D,
  rotation2D,
  rotation3D,
  transformPoint,
  UNIT_CATEGORIES,
} from '../../services/engineering';
import { CalcError, formatNumber, parseNumber } from '../../services/math-engine';
import { SettingsService } from '../../services/settings.service';

type Computed<T> = { ok: true; value: T } | { ok: false; error: string };

/** Evaluates a panel's inputs, turning parse errors into a message instead of throwing. */
function attempt<T>(fn: () => T): Computed<T> {
  try {
    return { ok: true, value: fn() };
  } catch (e) {
    return { ok: false, error: e instanceof CalcError ? e.message : 'Could not compute this' };
  }
}

interface FrameInputs {
  axis: Axis;
  theta: string;
  tx: string;
  ty: string;
  tz: string;
}

@Component({
  selector: 'app-engineering',
  imports: [MatrixView],
  templateUrl: './engineering.html',
  styleUrl: './engineering.scss',
})
export class Engineering {
  protected readonly settings = inject(SettingsService);
  protected readonly unitLabel = computed(() =>
    this.settings.angleMode() === 'DEG' ? '°' : 'rad',
  );
  protected readonly fmt = (v: number) => formatNumber(v, 10);

  private num(text: string, label: string): number {
    return parseNumber(text, label, this.settings.angleMode());
  }

  // Degree / radian conversion
  protected readonly degrees = signal('180');
  protected readonly radians = signal('pi');
  protected readonly degToRad = computed(() =>
    attempt(() => (this.num(this.degrees(), 'Degrees') * Math.PI) / 180),
  );
  protected readonly radToDeg = computed(() =>
    attempt(() => (this.num(this.radians(), 'Radians') * 180) / Math.PI),
  );

  // Cartesian ↔ polar
  protected readonly cartX = signal('3');
  protected readonly cartY = signal('4');
  protected readonly polarR = signal('2');
  protected readonly polarTheta = signal('30');
  protected readonly toPolar = computed(() =>
    attempt(() =>
      cartesianToPolar(
        this.num(this.cartX(), 'x'),
        this.num(this.cartY(), 'y'),
        this.settings.angleMode(),
      ),
    ),
  );
  protected readonly toCartesian = computed(() =>
    attempt(() =>
      polarToCartesian(
        this.num(this.polarR(), 'r'),
        this.num(this.polarTheta(), 'θ'),
        this.settings.angleMode(),
      ),
    ),
  );

  // Vector components & magnitude
  protected readonly vx = signal('1');
  protected readonly vy = signal('2');
  protected readonly vz = signal('2');
  protected readonly vectorInfo = computed(() =>
    attempt(() => {
      const v = [this.num(this.vx(), 'x'), this.num(this.vy(), 'y'), this.num(this.vz(), 'z')];
      const magnitude = Math.hypot(...v);
      const mode = this.settings.angleMode();
      const toUnit = (rad: number) => (mode === 'DEG' ? (rad * 180) / Math.PI : rad);
      return {
        magnitude,
        unit: magnitude === 0 ? null : v.map((c) => c / magnitude),
        angles: magnitude === 0 ? null : v.map((c) => toUnit(Math.acos(c / magnitude))),
      };
    }),
  );

  // Rotation
  protected readonly rotTheta = signal('90');
  protected readonly rotAxis = signal<Axis>('z');
  protected readonly pointX = signal('1');
  protected readonly pointY = signal('0');
  protected readonly rotation = computed(() =>
    attempt(() => {
      const theta = this.num(this.rotTheta(), 'θ');
      const mode = this.settings.angleMode();
      return {
        r2: rotation2D(theta, mode),
        r3: rotation3D(this.rotAxis(), theta, mode),
        rotated: rotatePoint2D(
          this.num(this.pointX(), 'x'),
          this.num(this.pointY(), 'y'),
          theta,
          mode,
        ),
      };
    }),
  );

  // Homogeneous transforms
  protected readonly frameAB = signal<FrameInputs>({
    axis: 'z',
    theta: '90',
    tx: '1',
    ty: '0',
    tz: '0',
  });
  protected readonly frameBC = signal<FrameInputs>({
    axis: 'z',
    theta: '0',
    tx: '2',
    ty: '0',
    tz: '0',
  });
  protected readonly pointC = signal('0, 0, 0');
  protected readonly transforms = computed(() =>
    attempt(() => {
      const mode: AngleMode = this.settings.angleMode();
      const build = (f: FrameInputs, name: string) =>
        homogeneous(
          {
            axis: f.axis,
            theta: this.num(f.theta, `${name} θ`),
            translation: [
              this.num(f.tx, `${name} tx`),
              this.num(f.ty, `${name} ty`),
              this.num(f.tz, `${name} tz`),
            ],
          },
          mode,
        );
      const tAB = build(this.frameAB(), 'T_AB');
      const tBC = build(this.frameBC(), 'T_BC');
      const tAC = multiplyTransforms(tAB, tBC);
      const parts = this.pointC()
        .replace(/[[\]()]/g, '')
        .split(/[,\s]+/)
        .filter(Boolean);
      if (parts.length !== 3) throw new CalcError('Point p_C needs exactly 3 components');
      const p = parts.map((s, i) => this.num(s, `p_C component ${i + 1}`)) as [
        number,
        number,
        number,
      ];
      return { tAB, tBC, tAC, pA: transformPoint(tAC, p) };
    }),
  );

  protected updateFrame(frame: 'AB' | 'BC', key: keyof FrameInputs, value: string): void {
    const target = frame === 'AB' ? this.frameAB : this.frameBC;
    target.update((f) => ({ ...f, [key]: value }));
  }

  // Angular velocity
  protected readonly angularUnits = Object.keys(ANGULAR_TO_RAD_S) as AngularUnit[];
  protected readonly angularValue = signal('60');
  protected readonly angularFrom = signal<AngularUnit>('rpm');
  protected readonly angular = computed(() =>
    attempt(() => {
      const value = this.num(this.angularValue(), 'Angular velocity');
      return this.angularUnits.map((unit) => ({
        unit,
        value: convertAngularVelocity(value, this.angularFrom(), unit),
      }));
    }),
  );

  // Unit conversion
  protected readonly categories = UNIT_CATEGORIES;
  protected readonly categoryIndex = signal(0);
  protected readonly category = computed(() => this.categories[this.categoryIndex()]);
  protected readonly unitValue = signal('1');
  protected readonly unitFrom = signal(UNIT_CATEGORIES[0].units[3].id);
  protected readonly unitTo = signal(UNIT_CATEGORIES[0].units[7].id);
  protected readonly unitResult = computed(() =>
    attempt(() => convertUnit(this.num(this.unitValue(), 'Value'), this.unitFrom(), this.unitTo())),
  );

  protected selectCategory(index: number): void {
    this.categoryIndex.set(index);
    const units = this.categories[index].units;
    this.unitFrom.set(units[0].id);
    this.unitTo.set(units[1].id);
  }

  protected readonly constants = CONSTANTS;
  protected readonly copiedSymbol = signal<string | null>(null);

  protected async copyConstant(symbol: string, value: number): Promise<void> {
    try {
      await navigator.clipboard.writeText(String(value));
      this.copiedSymbol.set(symbol);
      setTimeout(() => this.copiedSymbol.set(null), 1500);
    } catch {
      // Clipboard may be unavailable; values remain selectable in the table.
    }
  }

  protected text(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }
}
