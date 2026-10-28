import { CalcError, friendlyError, math, parseNumber } from './math-engine';

export type Matrix = number[][];
export type Vector = number[];

export type LinearResult =
  | { ok: true; kind: 'scalar'; value: number }
  | { ok: true; kind: 'vector'; value: Vector }
  | { ok: true; kind: 'matrix'; value: Matrix }
  | { ok: false; error: string };

function splitEntries(row: string): string[] {
  const trimmed = row.trim();
  if (!trimmed) return [];
  return (trimmed.includes(',') ? trimmed.split(',') : trimmed.split(/\s+/))
    .map((e) => e.trim())
    .filter(Boolean);
}

/**
 * Parses a matrix written as rows on separate lines (or separated by `;`), entries separated by
 * spaces or commas. The bracket form [[1, 2], [3, 4]] is also accepted. Entries may be expressions.
 */
export function parseMatrix(text: string, name = 'Matrix'): Matrix {
  const body = text
    .trim()
    .replace(/^\[\s*\[/, '[')
    .replace(/\]\s*\]$/, ']');
  const rows = body
    .split(/\]\s*,?\s*\[|;|\n/)
    .map((r) => r.replace(/[[\]]/g, ''))
    .map(splitEntries)
    .filter((r) => r.length > 0);
  if (rows.length === 0) throw new CalcError(`${name} is empty`);
  const width = rows[0].length;
  rows.forEach((row, i) => {
    if (row.length !== width) {
      throw new CalcError(`${name}: row ${i + 1} has ${row.length} entries but row 1 has ${width}`);
    }
  });
  return rows.map((row, i) =>
    row.map((entry, j) => parseNumber(entry, `${name} entry (${i + 1}, ${j + 1})`)),
  );
}

export function parseVector(text: string, name = 'Vector'): Vector {
  const entries = splitEntries(text.replace(/[[\]()]/g, ''));
  if (entries.length === 0) throw new CalcError(`${name} is empty`);
  return entries.map((entry, i) => parseNumber(entry, `${name} component ${i + 1}`));
}

export const dims = (m: Matrix) => `${m.length}×${m[0]?.length ?? 0}`;
const isSquare = (m: Matrix) => m.length === m[0].length;

function requireSameShape(a: Matrix, b: Matrix, op: string) {
  if (a.length !== b.length || a[0].length !== b[0].length) {
    throw new CalcError(`${op} needs matrices of the same size (A is ${dims(a)}, B is ${dims(b)})`);
  }
}

function requireSquare(m: Matrix, op: string) {
  if (!isSquare(m)) throw new CalcError(`${op} needs a square matrix (A is ${dims(m)})`);
}

const asMatrix = (value: unknown): Matrix => math.matrix(value as Matrix).toArray() as Matrix;
const asVector = (value: unknown): Vector =>
  math.flatten(math.matrix(value as Vector)).toArray() as Vector;

/** Below this |det| relative to the entries' scale, a matrix is treated as singular. */
const SINGULAR_TOLERANCE = 1e-12;

function isSingular(m: Matrix): boolean {
  const scale = Math.max(1, ...m.flat().map(Math.abs));
  return Math.abs(math.det(m)) < SINGULAR_TOLERANCE * scale ** m.length;
}

export const matrixOps = {
  add(a: Matrix, b: Matrix): Matrix {
    requireSameShape(a, b, 'Addition');
    return asMatrix(math.add(a, b));
  },
  subtract(a: Matrix, b: Matrix): Matrix {
    requireSameShape(a, b, 'Subtraction');
    return asMatrix(math.subtract(a, b));
  },
  multiply(a: Matrix, b: Matrix): Matrix {
    if (a[0].length !== b.length) {
      throw new CalcError(
        `A×B needs A's column count to equal B's row count (A is ${dims(a)}, B is ${dims(b)})`,
      );
    }
    return asMatrix(math.multiply(a, b));
  },
  transpose(a: Matrix): Matrix {
    return asMatrix(math.transpose(a));
  },
  determinant(a: Matrix): number {
    requireSquare(a, 'The determinant');
    return math.det(a);
  },
  inverse(a: Matrix): Matrix {
    requireSquare(a, 'The inverse');
    if (isSingular(a))
      throw new CalcError('A is singular (determinant is 0), so it has no inverse');
    return asMatrix(math.inv(a));
  },
  matVec(a: Matrix, v: Vector): Vector {
    if (a[0].length !== v.length) {
      throw new CalcError(
        `A·v needs v to have ${a[0].length} components to match A's columns (v has ${v.length})`,
      );
    }
    return asVector(math.multiply(a, v));
  },
  solve(a: Matrix, b: Vector): Vector {
    requireSquare(a, 'Solving Ax = b');
    if (a.length !== b.length) {
      throw new CalcError(`b needs ${a.length} components to match A's rows (b has ${b.length})`);
    }
    if (isSingular(a)) {
      throw new CalcError('A is singular, so the system has no unique solution');
    }
    return asVector(math.lusolve(a, b));
  },
};

function requireSameLength(u: Vector, v: Vector, op: string) {
  if (u.length !== v.length) {
    throw new CalcError(
      `${op} needs vectors of the same length (u has ${u.length}, v has ${v.length})`,
    );
  }
}

export const vectorOps = {
  dot(u: Vector, v: Vector): number {
    requireSameLength(u, v, 'The dot product');
    return math.dot(u, v);
  },
  cross(u: Vector, v: Vector): Vector {
    if (u.length !== 3 || v.length !== 3)
      throw new CalcError('The cross product needs two 3D vectors');
    return asVector(math.cross(u, v));
  },
  magnitude(u: Vector): number {
    return math.norm(u) as number;
  },
  normalize(u: Vector): Vector {
    const length = math.norm(u) as number;
    if (length === 0) throw new CalcError('The zero vector cannot be normalized');
    return u.map((x) => x / length);
  },
};

/** Runs an operation and converts thrown errors into a displayable result. */
export function runLinear(op: () => number | Vector | Matrix): LinearResult {
  try {
    const value = op();
    if (typeof value === 'number') return { ok: true, kind: 'scalar', value };
    if (Array.isArray(value[0])) return { ok: true, kind: 'matrix', value: value as Matrix };
    return { ok: true, kind: 'vector', value: value as Vector };
  } catch (e) {
    return { ok: false, error: friendlyError(e) };
  }
}
