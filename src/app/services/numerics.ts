import { NumericResult } from '../models/calculator.types';

type RealFn = (x: number) => number;

const fail = (error: string): NumericResult => ({ ok: false, error });

/**
 * Numerical derivative using Ridders' extrapolation of central differences.
 * Also compares one-sided slopes to detect corners such as |x| at 0.
 */
export function derivative(f: RealFn, x: number): NumericResult {
  if (!Number.isFinite(f(x))) return fail('f(x) is undefined at this point');

  const scale = Math.max(1, Math.abs(x));
  const small = 1e-6 * scale;
  const left = (f(x) - f(x - small)) / small;
  const right = (f(x + small) - f(x)) / small;
  if (!Number.isFinite(left) || !Number.isFinite(right)) {
    return fail('The function is undefined next to this point');
  }
  if (Math.abs(left - right) > 1e-3 * Math.max(1, Math.abs(left), Math.abs(right))) {
    return fail('The function is not differentiable here: left and right slopes differ');
  }

  const central = (h: number) => (f(x + h) - f(x - h)) / (2 * h);
  const CON = 1.4;
  const CON2 = CON * CON;
  const size = 10;
  const table: number[][] = Array.from({ length: size }, () => new Array<number>(size).fill(0));
  let h = 0.1 * scale;
  table[0][0] = central(h);
  let best = table[0][0];
  let error = Infinity;
  for (let i = 1; i < size; i++) {
    h /= CON;
    table[0][i] = central(h);
    let factor = CON2;
    for (let j = 1; j <= i; j++) {
      table[j][i] = (table[j - 1][i] * factor - table[j - 1][i - 1]) / (factor - 1);
      factor *= CON2;
      const candidate = Math.max(
        Math.abs(table[j][i] - table[j - 1][i]),
        Math.abs(table[j][i] - table[j - 1][i - 1]),
      );
      if (candidate <= error) {
        error = candidate;
        best = table[j][i];
      }
    }
    if (Math.abs(table[i][i] - table[i - 1][i - 1]) >= 2 * error) break;
  }
  if (!Number.isFinite(best)) return fail('The derivative could not be computed at this point');
  return { ok: true, value: best, detail: `Estimated error ≈ ${error.toExponential(1)}` };
}

/** Adaptive Simpson integration with an evaluation budget. */
export function integrate(f: RealFn, a: number, b: number): NumericResult {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return fail('Integration bounds must be finite');
  if (a === b) return { ok: true, value: 0 };
  const sign = a < b ? 1 : -1;
  const [lo, hi] = a < b ? [a, b] : [b, a];

  const MAX_EVALS = 200_000;
  let evals = 0;
  let nonFinite = false;
  const g = (x: number) => {
    evals++;
    const y = f(x);
    if (!Number.isFinite(y)) nonFinite = true;
    return y;
  };

  const simpson = (fa: number, fm: number, fb: number, width: number) =>
    (width / 6) * (fa + 4 * fm + fb);

  const recurse = (
    l: number,
    r: number,
    fl: number,
    fm: number,
    fr: number,
    whole: number,
    eps: number,
    depth: number,
  ): number => {
    const m = (l + r) / 2;
    const flm = g((l + m) / 2);
    const frm = g((m + r) / 2);
    const left = simpson(fl, flm, fm, m - l);
    const right = simpson(fm, frm, fr, r - m);
    const delta = left + right - whole;
    if (nonFinite || evals > MAX_EVALS) return NaN;
    if (depth <= 0 || Math.abs(delta) <= 15 * eps) return left + right + delta / 15;
    return (
      recurse(l, m, fl, flm, fm, left, eps / 2, depth - 1) +
      recurse(m, r, fm, frm, fr, right, eps / 2, depth - 1)
    );
  };

  const fa = g(lo);
  const fb = g(hi);
  const fm = g((lo + hi) / 2);
  const value = recurse(lo, hi, fa, fm, fb, simpson(fa, fm, fb, hi - lo), 1e-10, 50);

  if (nonFinite) return fail('The function is not finite on this interval (possible singularity)');
  if (evals > MAX_EVALS || !Number.isFinite(value)) {
    return fail('Integration did not converge within the evaluation limit');
  }
  return { ok: true, value: sign * value, detail: `${evals} function evaluations` };
}

export interface RootOptions {
  guess?: number;
  bracket?: [number, number];
}

/** Bisection when a sign-changing bracket is given, otherwise Newton's method from a guess. */
export function findRoot(f: RealFn, { guess, bracket }: RootOptions): NumericResult {
  if (bracket) {
    let [a, b] = bracket;
    let fa = f(a);
    const fb = f(b);
    if (!Number.isFinite(fa) || !Number.isFinite(fb))
      return fail('f is undefined at a bracket endpoint');
    if (fa === 0) return { ok: true, value: a };
    if (fb === 0) return { ok: true, value: b };
    if (Math.sign(fa) === Math.sign(fb)) return fail('f(a) and f(b) must have opposite signs');
    for (let i = 0; i < 200; i++) {
      const m = (a + b) / 2;
      const fm = f(m);
      if (!Number.isFinite(fm)) return fail('f is undefined inside the bracket');
      if (fm === 0 || Math.abs(b - a) < 1e-15 * Math.max(1, Math.abs(m))) {
        return { ok: true, value: m, detail: `Bisection, ${i + 1} iterations` };
      }
      if (Math.sign(fm) === Math.sign(fa)) {
        a = m;
        fa = fm;
      } else {
        b = m;
      }
    }
    return { ok: true, value: (a + b) / 2, detail: 'Bisection, 200 iterations' };
  }

  if (guess === undefined || !Number.isFinite(guess))
    return fail('Enter an initial guess or a bracket');
  let x = guess;
  for (let i = 0; i < 100; i++) {
    const fx = f(x);
    if (!Number.isFinite(fx)) return fail("Newton's method reached a point where f is undefined");
    if (fx === 0) return { ok: true, value: x, detail: `Newton's method, ${i} iterations` };
    const h = 1e-7 * Math.max(1, Math.abs(x));
    const slope = (f(x + h) - f(x - h)) / (2 * h);
    if (!Number.isFinite(slope) || slope === 0) {
      return fail('The derivative is zero here. Try a different initial guess');
    }
    const next = x - fx / slope;
    if (Math.abs(next - x) <= 1e-13 * Math.max(1, Math.abs(x))) {
      if (Math.abs(f(next)) > 1e-8 * Math.max(1, Math.abs(fx))) break;
      return { ok: true, value: next, detail: `Newton's method, ${i + 1} iterations` };
    }
    x = next;
  }
  return fail("Newton's method did not converge. Try another guess or a bracket");
}

export type LimitDirection = 'both' | 'left' | 'right';

function oneSidedLimit(f: RealFn, point: (k: number) => number): number | 'diverges' | null {
  const values: number[] = [];
  for (let k = 1; k <= 8; k++) {
    const y = f(point(k));
    if (Number.isFinite(y)) values.push(y);
  }
  if (values.length < 4) return null;
  const tail = values.slice(-4);
  const growing = tail.every((v, i) => i === 0 || Math.abs(v) > 5 * Math.abs(tail[i - 1]));
  if (growing && Math.abs(tail[3]) > 1e6) return 'diverges';
  const diffs = tail.slice(1).map((v, i) => Math.abs(v - tail[i]));
  const scale = Math.max(1, Math.abs(tail[3]));
  if (diffs[2] < 1e-5 * scale && diffs[1] < 1e-3 * scale) return tail[3];
  return null;
}

/**
 * Estimates a limit by sampling f at points approaching `a` (x = a ± 10⁻ᵏ, or x = ±10ᵏ for a = ±∞).
 * This is heuristic: it can be fooled by highly oscillating functions.
 */
export function limit(f: RealFn, a: number, direction: LimitDirection): NumericResult {
  const sides: { name: 'left' | 'right'; point: (k: number) => number }[] = [];
  if (a === Infinity) sides.push({ name: 'left', point: (k) => 10 ** k });
  else if (a === -Infinity) sides.push({ name: 'right', point: (k) => -(10 ** k) });
  else {
    if (direction !== 'right') sides.push({ name: 'left', point: (k) => a - 10 ** -k });
    if (direction !== 'left') sides.push({ name: 'right', point: (k) => a + 10 ** -k });
  }

  const results = sides.map((side) => {
    const value = oneSidedLimit(f, side.point);
    if (value === 'diverges') {
      const sample = f(side.point(8));
      return { name: side.name, value: sample > 0 ? Infinity : -Infinity };
    }
    return { name: side.name, value };
  });

  const missing = results.find((r) => r.value === null);
  if (missing)
    return { ok: false, error: `The ${missing.name}-hand limit did not converge numerically` };

  const values = results.map((r) => r.value as number);
  if (values.length === 2) {
    const [l, r] = values;
    const agree = l === r || Math.abs(l - r) < 1e-5 * Math.max(1, Math.abs(l), Math.abs(r));
    if (!agree) {
      return {
        ok: false,
        error: `Left and right limits differ (${fmt(l)} vs ${fmt(r)}), so the two-sided limit does not exist`,
      };
    }
    return { ok: true, value: Number.isFinite(l) ? (l + r) / 2 : l };
  }
  return { ok: true, value: values[0] };
}

function fmt(v: number): string {
  if (v === Infinity) return '+∞';
  if (v === -Infinity) return '−∞';
  return Number(v.toPrecision(8)).toString();
}
