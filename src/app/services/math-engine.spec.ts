import { AngleMode } from '../models/calculator.types';
import { compileFunction, evaluateExpression, formatNumber } from './math-engine';

const evaluate = (expr: string, angleMode: AngleMode = 'RAD', ans?: unknown) =>
  evaluateExpression(expr, { angleMode, ans });

function expectValue(expr: string, expected: number, angleMode: AngleMode = 'RAD') {
  const result = evaluate(expr, angleMode);
  if (!result.ok) throw new Error(`${expr} failed: ${result.error}`);
  expect(result.numeric).toBeCloseTo(expected, 10);
}

function expectError(expr: string, pattern: RegExp, angleMode: AngleMode = 'RAD') {
  const result = evaluate(expr, angleMode);
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.error).toMatch(pattern);
}

describe('math engine: SRS minimum test cases', () => {
  it.each([
    ['2+2', 4],
    ['2+3*4', 14],
    ['(2+3)*4', 20],
    ['sqrt(81)', 9],
    ['2^8', 256],
    ['log10(100)', 2],
    ['5!', 120],
    ['det([[1,2],[3,4]])', -2],
    ['dot([1,2,3],[4,5,6])', 32],
  ])('%s = %d', (expr, expected) => expectValue(expr, expected));

  it('sin(30) in DEG is exactly 0.5', () => {
    const result = evaluate('sin(30)', 'DEG');
    expect(result.ok && result.numeric).toBe(0.5);
  });

  it('cos(π) in RAD is -1', () => expectValue('cos(pi)', -1));
  it('asin(1) in DEG is 90', () => expectValue('asin(1)', 90, 'DEG'));
  it('1/0 is an error', () => expectError('1/0', /divide by zero/));
  it('sqrt(-1) is a domain error', () => expectError('sqrt(-1)', /not a real number/));
});

describe('math engine: FR-01 basic arithmetic', () => {
  it('handles decimals and negatives', () => {
    expectValue('-2.5 * 4', -10);
    expectValue('3 - -2', 5);
  });

  it('hides floating-point artifacts in the display', () => {
    const result = evaluate('0.1 + 0.2');
    expect(result.ok && result.display).toBe('0.3');
  });

  it('documents percent behaviour', () => {
    expectValue('50%', 0.5);
    expectValue('200 + 10%', 220);
    expectValue('200 * 10%', 20);
  });

  it('uses scientific notation for large and small numbers', () => {
    expect(formatNumber(1e15)).toBe('1e+15');
    expect(formatNumber(1.5e-10)).toBe('1.5e-10');
    expect(formatNumber(123456789)).toBe('123456789');
  });

  it('reports invalid syntax and unmatched parentheses', () => {
    expectError('2+', /incomplete/);
    expectError('(2+3', /closing parenthesis/);
    expectError('2+3)', /Unmatched/);
    expectError('foo(2)', /Unknown function “foo”/);
  });

  it('reports overflow instead of Infinity', () => {
    expectError('10^400', /too large/);
  });
});

describe('math engine: FR-02 scientific functions', () => {
  it.each([
    ['sqrt(144)', 12],
    ['cbrt(-8)', -2],
    ['nroot(4, 16)', 2],
    ['nroot(3, -27)', -3],
    ['log10(1000)', 3],
    ['ln(e)', 1],
    ['log(1000)', 3],
    ['log(8, 2)', 3],
    ['e^2', Math.E ** 2],
    ['10^3', 1000],
    ['2^10', 1024],
    ['nCr(5, 2)', 10],
    ['nPr(5, 2)', 20],
    ['abs(-3)', 3],
    ['4^(-1)', 0.25],
    ['10 mod 3', 1],
    ['sqrt(abs(-16)) + 3!', 10],
  ])('%s = %d', (expr, expected) => expectValue(expr, expected));

  it('sin(π/2) is 1 in RAD', () => expectValue('sin(pi/2)', 1));

  it('rejects invalid factorials', () => {
    expectError('3.5!', /whole numbers/);
    expectError('(-1)!', /whole numbers/);
    expectError('171!', /too large/);
  });

  it('rejects domain errors with clear messages', () => {
    expectError('ln(0)', /positive/);
    expectError('log10(-5)', /positive/);
    expectError('asin(2)', /between −1 and 1/);
    expectError('nroot(2, -4)', /not a real number/);
    expectError('0^(-1)', /divide by zero/);
    expectError('5 mod 0', /Modulo by zero/);
    expectError('nCr(2, 5)', /r ≤ n/);
  });
});

describe('math engine: FR-03 angle modes', () => {
  it('evaluates trig in degrees', () => {
    expectValue('sin(30)', 0.5, 'DEG');
    expectValue('cos(60)', 0.5, 'DEG');
    expectValue('tan(45)', 1, 'DEG');
    expectValue('sin(180)', 0, 'DEG');
  });

  it('evaluates trig in radians', () => expectValue('sin(pi/6)', 0.5));

  it('returns inverse trig in the selected unit', () => {
    expectValue('asin(0.5)', 30, 'DEG');
    expectValue('asin(0.5)', 0.5235987756);
    expectValue('atan(1)', 45, 'DEG');
  });

  it('reports tan(90°) as undefined', () => expectError('tan(90)', /undefined/, 'DEG'));
});

describe('math engine: Ans', () => {
  it('uses the previous answer', () => {
    const result = evaluate('Ans * 2', 'RAD', 21);
    expect(result.ok && result.numeric).toBe(42);
  });

  it('explains when there is no previous answer', () => {
    expectError('Ans + 1', /no previous answer/);
  });
});

describe('compileFunction (graphing)', () => {
  it('accepts y =, f(x) = and bare expressions with unicode', () => {
    for (const text of ['y = x^2', 'f(x) = x²', 'x*x']) {
      const compiled = compileFunction(text);
      expect(compiled.ok).toBe(true);
      if (compiled.ok) expect(compiled.fn(3)).toBe(9);
    }
  });

  it('supports implicit multiplication', () => {
    const compiled = compileFunction('y = x³ - 2x');
    expect(compiled.ok && compiled.fn(2)).toBe(4);
  });

  it('returns NaN where the function is undefined', () => {
    const compiled = compileFunction('y = 1/x');
    expect(compiled.ok && Number.isNaN(compiled.fn(0))).toBe(true);
  });

  it('rejects unsupported equations with readable errors', () => {
    expect(compileFunction('x = 3')).toEqual({
      ok: false,
      error: 'Only functions of the form y = f(x) are supported',
    });
    expect(compileFunction('y = t^2')).toMatchObject({
      ok: false,
      error: expect.stringMatching(/Unknown variable “t”/),
    });
    expect(compileFunction('y = foo(x)')).toMatchObject({
      ok: false,
      error: expect.stringMatching(/Unknown function/),
    });
    expect(compileFunction('y = (x')).toMatchObject({ ok: false });
    expect(compileFunction('')).toMatchObject({ ok: false });
  });
});
