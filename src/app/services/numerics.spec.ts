import { compileFunction } from './math-engine';
import { derivative, findRoot, integrate, limit } from './numerics';

const fn = (text: string) => {
  const compiled = compileFunction(text);
  if (!compiled.ok) throw new Error(compiled.error);
  return compiled.fn;
};

const value = (r: { ok: boolean; value?: number }) => {
  if (!r.ok) throw new Error(JSON.stringify(r));
  return r.value!;
};

describe('derivative', () => {
  it('d/dx x² at 3 ≈ 6', () => expect(value(derivative(fn('x^2'), 3))).toBeCloseTo(6, 8));
  it('d/dx sin at 0 ≈ 1', () => expect(value(derivative(fn('sin(x)'), 0))).toBeCloseTo(1, 8));
  it('d/dx e^x at 1 ≈ e', () => expect(value(derivative(fn('e^x'), 1))).toBeCloseTo(Math.E, 8));

  it('rejects corners and undefined points', () => {
    expect(derivative(fn('abs(x)'), 0).ok).toBe(false);
    expect(derivative(fn('1/x'), 0).ok).toBe(false);
  });
});

describe('integrate', () => {
  it('∫₀¹ x² ≈ 1/3', () => expect(value(integrate(fn('x^2'), 0, 1))).toBeCloseTo(1 / 3, 9));
  it('∫₀^π sin ≈ 2', () => expect(value(integrate(fn('sin(x)'), 0, Math.PI))).toBeCloseTo(2, 9));
  it('reversed bounds flip the sign', () =>
    expect(value(integrate(fn('x'), 2, 0))).toBeCloseTo(-2, 9));
  it('reports singularities', () => expect(integrate(fn('1/x'), 0, 1).ok).toBe(false));
});

describe('findRoot', () => {
  it('x² − 4 from guess 1 ≈ 2 (Newton)', () =>
    expect(value(findRoot(fn('x^2 - 4'), { guess: 1 }))).toBeCloseTo(2, 10));
  it('cos(x) − x in [0, 1] (bisection)', () =>
    expect(value(findRoot(fn('cos(x) - x'), { bracket: [0, 1] }))).toBeCloseTo(0.7390851332, 9));
  it('rejects brackets without a sign change', () =>
    expect(findRoot(fn('x^2 + 1'), { bracket: [-1, 1] }).ok).toBe(false));
  it('reports a zero derivative', () =>
    expect(findRoot(fn('x^2 + 1'), { guess: 0 }).ok).toBe(false));
});

describe('limit', () => {
  it('sin(x)/x → 1 as x → 0', () =>
    expect(value(limit(fn('sin(x)/x'), 0, 'both'))).toBeCloseTo(1, 6));
  it('(1 + 1/x)^x → e as x → ∞', () =>
    expect(value(limit(fn('(1 + 1/x)^x'), Infinity, 'both'))).toBeCloseTo(Math.E, 4));
  it('1/x² → +∞ as x → 0', () => expect(value(limit(fn('1/x^2'), 0, 'both'))).toBe(Infinity));
  it('reports differing one-sided limits', () => {
    const result = limit(fn('abs(x)/x'), 0, 'both');
    expect(result.ok).toBe(false);
    expect(value(limit(fn('abs(x)/x'), 0, 'right'))).toBeCloseTo(1, 10);
  });
});
