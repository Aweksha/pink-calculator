import {
  all,
  create,
  FunctionNode,
  isComplex,
  isFunctionNode,
  isMatrix,
  isOperatorNode,
  isResultSet,
  isSymbolNode,
  MathNode,
} from 'mathjs';
import { AngleMode, EvaluationResult } from '../models/calculator.types';

/**
 * Shared mathjs instance. `predictable` keeps results real-valued: operations that
 * would produce complex numbers (e.g. sqrt(-1)) return NaN, which we report as domain errors.
 */
export const math = create(all, { predictable: true });

/** An error whose message is already suitable for display. */
export class CalcError extends Error {}

type AnyFn = (...args: unknown[]) => unknown;
const call = (fn: unknown, ...args: unknown[]) => (fn as AnyFn)(...args);

/** Significant digits shown for results. Values are computed in IEEE-754 double precision. */
export const DISPLAY_PRECISION = 12;

export function formatNumber(value: number, precision = DISPLAY_PRECISION): string {
  if (Object.is(value, -0)) value = 0;
  return math.format(value, { notation: 'auto', precision, lowerExp: -9, upperExp: 12 });
}

/** Removes trig rounding artifacts such as sin(π) = 1.2e-16 or tan(45°) = 0.9999999999999999. */
function tidyTrig(value: number): number {
  if (Math.abs(value) < 1e-15) return 0;
  return Number(value.toPrecision(15));
}

function requireReal(name: string, x: unknown): number {
  if (typeof x !== 'number') throw new CalcError(`${name} needs a single real number`);
  return x;
}

function trigFunctions(mode: AngleMode): Record<string, AnyFn> {
  const toRad = (x: number) => (mode === 'DEG' ? (x * Math.PI) / 180 : x);
  const fromRad = (x: number) => (mode === 'DEG' ? (x * 180) / Math.PI : x);
  const inverse = (name: string, fn: (x: number) => number, bounded: boolean) => (x: unknown) => {
    const v = requireReal(name, x);
    if (bounded && Math.abs(v) > 1) {
      throw new CalcError(`${name} is only defined for inputs between −1 and 1`);
    }
    return tidyTrig(fromRad(fn(v)));
  };
  const undefinedAt = (name: string, zero: string) =>
    new CalcError(`${name} is undefined at this angle (${zero} = 0)`);

  return {
    sin: (x) => tidyTrig(Math.sin(toRad(requireReal('sin', x)))),
    cos: (x) => tidyTrig(Math.cos(toRad(requireReal('cos', x)))),
    tan: (x) => {
      const r = toRad(requireReal('tan', x));
      if (Math.abs(Math.cos(r)) < 1e-15) throw undefinedAt('tan', 'cos');
      return tidyTrig(Math.tan(r));
    },
    sec: (x) => {
      const c = Math.cos(toRad(requireReal('sec', x)));
      if (Math.abs(c) < 1e-15) throw undefinedAt('sec', 'cos');
      return tidyTrig(1 / c);
    },
    csc: (x) => {
      const s = Math.sin(toRad(requireReal('csc', x)));
      if (Math.abs(s) < 1e-15) throw undefinedAt('csc', 'sin');
      return tidyTrig(1 / s);
    },
    cot: (x) => {
      const r = toRad(requireReal('cot', x));
      if (Math.abs(Math.sin(r)) < 1e-15) throw undefinedAt('cot', 'sin');
      return tidyTrig(Math.cos(r) / Math.sin(r));
    },
    asin: inverse('asin', Math.asin, true),
    acos: inverse('acos', Math.acos, true),
    atan: inverse('atan', Math.atan, false),
    atan2: (y, x) =>
      tidyTrig(fromRad(Math.atan2(requireReal('atan2', y), requireReal('atan2', x)))),
  };
}

function requireWhole(name: string, value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new CalcError(`${name} needs ${label} to be a whole number ≥ 0`);
  }
  return value;
}

function positiveLog(name: string, base: (x: number) => number, fallback: unknown) {
  return (x: unknown) => {
    if (typeof x !== 'number') return call(fallback, x);
    if (x <= 0) throw new CalcError(`${name} is only defined for positive numbers`);
    return base(x);
  };
}

/** Functions available in every expression, on top of mathjs built-ins. */
function extraFunctions(): Record<string, AnyFn> {
  return {
    sqrt: (x) => {
      if (typeof x === 'number' && x < 0) {
        throw new CalcError('The square root of a negative number is not a real number');
      }
      return call(math.sqrt, x);
    },
    nroot: (n, x) => {
      const degree = requireReal('root', n);
      const radicand = requireReal('root', x);
      if (degree === 0) throw new CalcError('The 0th root is undefined');
      if (radicand < 0 && !(Number.isInteger(degree) && degree % 2 !== 0)) {
        throw new CalcError('An even root of a negative number is not a real number');
      }
      return Number.isInteger(degree)
        ? math.nthRoot(radicand, degree)
        : Math.pow(radicand, 1 / degree);
    },
    ln: positiveLog('ln', Math.log, math.log),
    log10: positiveLog('log', Math.log10, math.log10),
    log2: positiveLog('log₂', Math.log2, math.log2),
    // `log(x)` means base 10 (calculator convention); `log(x, b)` uses base b.
    log: (x, b) => {
      if (b === undefined) return positiveLog('log', Math.log10, math.log10)(x);
      const value = requireReal('log', x);
      const base = requireReal('log', b);
      if (value <= 0 || base <= 0 || base === 1) {
        throw new CalcError('log(x, b) needs x > 0 and a positive base b ≠ 1');
      }
      return Math.log(value) / Math.log(base);
    },
    nCr: (n, r) => {
      const nn = requireWhole('nCr', n, 'n');
      const rr = requireWhole('nCr', r, 'r');
      if (rr > nn) throw new CalcError('nCr needs r ≤ n');
      return math.combinations(nn, rr);
    },
    nPr: (n, r) => {
      const nn = requireWhole('nPr', n, 'n');
      const rr = requireWhole('nPr', r, 'r');
      if (rr > nn) throw new CalcError('nPr needs r ≤ n');
      return math.permutations(nn, rr);
    },
    safeDivide: (a, b) => {
      if (b === 0) throw new CalcError('Cannot divide by zero');
      return call(math.divide, a, b);
    },
    safeMod: (a, b) => {
      if (b === 0) throw new CalcError('Modulo by zero is undefined');
      return call(math.mod, a, b);
    },
    safePow: (a, b) => {
      if (a === 0 && typeof b === 'number' && b < 0) {
        throw new CalcError('Cannot divide by zero (0 raised to a negative power)');
      }
      return call(math.pow, a, b);
    },
    safeFactorial: (n) => {
      if (typeof n !== 'number' || !Number.isInteger(n) || n < 0) {
        throw new CalcError('Factorial is only defined for whole numbers ≥ 0');
      }
      if (n > 170) throw new CalcError('Factorial is too large to represent (overflow)');
      return math.factorial(n);
    },
  };
}

const OPERATOR_WRAPPERS: Record<string, string> = {
  divide: 'safeDivide',
  mod: 'safeMod',
  pow: 'safePow',
  factorial: 'safeFactorial',
};

/** Routes risky operators through checked functions so errors are explicit rather than Infinity/gamma. */
function wrapOperators(node: MathNode): MathNode {
  return node.transform((n) => {
    if (!isOperatorNode(n)) return n;
    const wrapper = OPERATOR_WRAPPERS[n.fn];
    return wrapper ? new FunctionNode(wrapper, n.args.map(wrapOperators)) : n;
  });
}

export interface ScopeOptions {
  angleMode: AngleMode;
  ans?: unknown;
}

export function createScope({ angleMode, ans }: ScopeOptions): Map<string, unknown> {
  const scope = new Map<string, unknown>(Object.entries(extraFunctions()));
  for (const [name, fn] of Object.entries(trigFunctions(angleMode))) scope.set(name, fn);
  if (ans !== undefined) scope.set('Ans', ans);
  return scope;
}

/** Parses an expression and applies the safety rewrites. Throws mathjs or CalcError errors. */
export function parseExpression(expr: string): MathNode {
  return wrapOperators(math.parse(expr));
}

function tidyMatrix(value: unknown): unknown {
  let maxAbs = 0;
  call(math.forEach, value, (v: unknown) => {
    if (typeof v !== 'number') return;
    if (!Number.isFinite(v))
      throw new CalcError('The result contains undefined or infinite values');
    maxAbs = Math.max(maxAbs, Math.abs(v));
  });
  return call(math.map, value, (v: unknown) =>
    typeof v === 'number' && Math.abs(v) < 1e-12 * maxAbs ? 0 : v,
  );
}

export function describeValue(value: unknown): EvaluationResult {
  if (isResultSet(value)) {
    const entries = (value as { entries: unknown[] }).entries;
    return describeValue(entries[entries.length - 1]);
  }
  if (typeof value === 'number') {
    if (Number.isNaN(value)) {
      return {
        ok: false,
        error: 'Math domain error: the result is not a real number',
      };
    }
    if (!Number.isFinite(value)) {
      return { ok: false, error: 'The result is too large to represent (overflow)' };
    }
    return { ok: true, value, display: formatNumber(value), numeric: value };
  }
  if (isComplex(value)) {
    return { ok: false, error: 'The result is a complex number; only real numbers are supported' };
  }
  if (isMatrix(value) || Array.isArray(value)) {
    try {
      const tidy = tidyMatrix(value);
      return {
        ok: true,
        value: tidy,
        display: math.format(tidy, { precision: DISPLAY_PRECISION }),
      };
    } catch (e) {
      return { ok: false, error: friendlyError(e) };
    }
  }
  if (typeof value === 'boolean') return { ok: true, value, display: String(value) };
  if (value === undefined) return { ok: false, error: 'Enter an expression' };
  if (typeof value === 'function') {
    return { ok: false, error: 'That defines a function rather than producing a value' };
  }
  if (typeof value === 'object' && value !== null && 'toNumber' in value) {
    return { ok: true, value, display: math.format(value, { precision: DISPLAY_PRECISION }) };
  }
  return { ok: false, error: 'The result is not a number' };
}

/** Converts any thrown value into a readable message; never exposes raw exceptions. */
export function friendlyError(e: unknown): string {
  if (e instanceof CalcError) return e.message;
  const msg = e instanceof Error ? e.message : String(e);
  const symbol = /Undefined symbol (\w+)/.exec(msg);
  if (symbol) {
    return symbol[1] === 'Ans'
      ? 'There is no previous answer yet. Calculate something first'
      : `Unknown name “${symbol[1]}”`;
  }
  const fn = /Undefined function (\w+)/.exec(msg);
  if (fn) return `Unknown function “${fn[1]}”`;
  if (/Parenthesis \) expected/.test(msg)) return 'Missing a closing parenthesis';
  if (/Unexpected operator \)/.test(msg)) return 'Unmatched closing parenthesis';
  if (/Unexpected end of expression/.test(msg)) return 'The expression is incomplete';
  if (/Dimension mismatch|dimension/i.test(msg)) {
    return 'Matrix or vector dimensions do not match for this operation';
  }
  if (/determinant is zero|singular/i.test(msg)) {
    return 'The matrix is singular (determinant is 0), so it has no inverse';
  }
  if (/Too (few|many) arguments/.test(msg)) return 'Wrong number of arguments for a function';
  if (/Unexpected type of argument/.test(msg)) return 'A function received the wrong kind of value';
  if (e instanceof SyntaxError || /Unexpected|Value expected|expected/.test(msg)) {
    return 'Invalid syntax. Check the expression';
  }
  return 'Could not evaluate this expression';
}

export function evaluateExpression(expr: string, options: ScopeOptions): EvaluationResult {
  if (!expr.trim()) return { ok: false, error: 'Enter an expression' };
  try {
    const value = parseExpression(expr).compile().evaluate(createScope(options));
    return describeValue(value);
  } catch (e) {
    return { ok: false, error: friendlyError(e) };
  }
}

/** Evaluates a short numeric input (e.g. "pi/2", "1e-3") used by the tool panels. */
export function parseNumber(text: string, label: string, angleMode: AngleMode = 'RAD'): number {
  const trimmed = text.trim();
  if (!trimmed) throw new CalcError(`Enter a value for ${label}`);
  const result = evaluateExpression(trimmed, { angleMode });
  if (!result.ok) throw new CalcError(`${label}: ${result.error}`);
  if (result.numeric === undefined) throw new CalcError(`${label} must be a single number`);
  return result.numeric;
}

/** Serialises a result so it can be re-inserted into an expression without losing precision. */
export function toExpression(value: unknown): string {
  if (typeof value === 'number') {
    const text = math.format(value, { precision: 15 });
    return /^-|e/.test(text) ? `(${text})` : text;
  }
  return `(${math.format(value)})`;
}

const UNICODE_REPLACEMENTS: [RegExp, string][] = [
  [/×|·/g, '*'],
  [/÷/g, '/'],
  [/−/g, '-'],
  [/π/g, 'pi'],
  [/√/g, 'sqrt'],
  [/∛/g, 'cbrt'],
  [/²/g, '^2'],
  [/³/g, '^3'],
];

export function normalizeInput(text: string): string {
  return UNICODE_REPLACEMENTS.reduce(
    (acc, [pattern, replacement]) => acc.replace(pattern, replacement),
    text,
  );
}

export type CompiledFunction =
  { ok: true; fn: (x: number) => number; expression: string } | { ok: false; error: string };

/**
 * Compiles "y = …" / "f(x) = …" / "…" into a real function of x. Trig uses radians.
 * Evaluation errors at individual points (e.g. division by zero) yield NaN, which plots as a gap.
 */
export function compileFunction(text: string): CompiledFunction {
  const body = normalizeInput(text)
    .trim()
    .replace(/^(y|f\s*\(\s*x\s*\))\s*=\s*/i, '');
  if (!body) return { ok: false, error: 'Enter a function of x, e.g. y = x^2' };
  if (body.includes('='))
    return { ok: false, error: 'Only functions of the form y = f(x) are supported' };

  let node: MathNode;
  try {
    node = parseExpression(body);
  } catch (e) {
    return { ok: false, error: friendlyError(e) };
  }

  const scope = createScope({ angleMode: 'RAD' });
  const problems: string[] = [];
  node.traverse((n, path, parent) => {
    if (!isSymbolNode(n)) return;
    const isCallee = parent && isFunctionNode(parent) && path === 'fn';
    const known = scope.has(n.name) || n.name in math;
    if (isCallee && !known) problems.push(`Unknown function “${n.name}”`);
    if (!isCallee && n.name !== 'x') {
      const value = scope.get(n.name) ?? (math as unknown as Record<string, unknown>)[n.name];
      if (value === undefined || typeof value === 'function') {
        problems.push(`Unknown variable “${n.name}”. Use x as the variable`);
      }
    }
  });
  if (problems.length) return { ok: false, error: problems[0] };

  const code = node.compile();
  const fn = (x: number) => {
    scope.set('x', x);
    try {
      const y = code.evaluate(scope);
      return typeof y === 'number' ? y : NaN;
    } catch {
      return NaN;
    }
  };

  const probe = (() => {
    scope.set('x', 0.5);
    try {
      return code.evaluate(scope);
    } catch {
      return 0;
    }
  })();
  if (typeof probe !== 'number')
    return { ok: false, error: 'The function must return a single real number' };

  return { ok: true, fn, expression: body };
}
