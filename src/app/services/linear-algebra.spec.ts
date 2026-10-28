import { matrixOps, parseMatrix, parseVector, runLinear, vectorOps } from './linear-algebra';

describe('parseMatrix', () => {
  it('accepts rows on lines, semicolons and bracket notation', () => {
    const expected = [
      [1, 2],
      [3, 4],
    ];
    expect(parseMatrix('1 2\n3 4')).toEqual(expected);
    expect(parseMatrix('1, 2; 3, 4')).toEqual(expected);
    expect(parseMatrix('[[1, 2], [3, 4]]')).toEqual(expected);
  });

  it('evaluates expression entries', () => {
    expect(parseMatrix('1/2, sqrt(4)')).toEqual([[0.5, 2]]);
  });

  it('reports ragged rows', () => {
    expect(() => parseMatrix('1 2\n3')).toThrow(/row 2 has 1 entries but row 1 has 2/);
  });
});

describe('matrix operations', () => {
  const A = [
    [1, 2],
    [3, 4],
  ];
  const B = [
    [5, 6],
    [7, 8],
  ];

  it('adds, subtracts and multiplies', () => {
    expect(matrixOps.add(A, B)).toEqual([
      [6, 8],
      [10, 12],
    ]);
    expect(matrixOps.subtract(B, A)).toEqual([
      [4, 4],
      [4, 4],
    ]);
    expect(matrixOps.multiply(A, B)).toEqual([
      [19, 22],
      [43, 50],
    ]);
  });

  it('transposes and computes determinants', () => {
    expect(matrixOps.transpose([[1, 2, 3]])).toEqual([[1], [2], [3]]);
    expect(matrixOps.determinant(A)).toBeCloseTo(-2, 12);
  });

  it('inverts and solves', () => {
    const inv = matrixOps.inverse(A);
    expect(inv[0][0]).toBeCloseTo(-2, 12);
    expect(inv[1][1]).toBeCloseTo(-0.5, 12);
    const x = matrixOps.solve(A, [5, 11]);
    expect(x[0]).toBeCloseTo(1, 12);
    expect(x[1]).toBeCloseTo(2, 12);
  });

  it('multiplies a matrix by a vector', () => {
    expect(matrixOps.matVec(A, [1, 1])).toEqual([3, 7]);
  });

  it('reports dimension mismatches and singular matrices', () => {
    expect(runLinear(() => matrixOps.add(A, [[1, 2, 3]]))).toMatchObject({
      ok: false,
      error: expect.stringMatching(/same size/),
    });
    expect(runLinear(() => matrixOps.multiply([[1, 2, 3]], A))).toMatchObject({ ok: false });
    expect(runLinear(() => matrixOps.determinant([[1, 2, 3]]))).toMatchObject({
      ok: false,
      error: expect.stringMatching(/square/),
    });
    const singular = [
      [1, 2],
      [2, 4],
    ];
    expect(runLinear(() => matrixOps.inverse(singular))).toMatchObject({
      ok: false,
      error: expect.stringMatching(/singular/),
    });
    expect(runLinear(() => matrixOps.solve(singular, [1, 2]))).toMatchObject({ ok: false });
  });
});

describe('vector operations', () => {
  it('computes dot and cross products', () => {
    expect(vectorOps.dot([1, 2, 3], [4, 5, 6])).toBe(32);
    expect(vectorOps.cross([1, 0, 0], [0, 1, 0])).toEqual([0, 0, 1]);
  });

  it('computes magnitude and normalizes', () => {
    expect(vectorOps.magnitude([3, 4])).toBe(5);
    expect(vectorOps.normalize([3, 4])).toEqual([0.6, 0.8]);
  });

  it('parses vectors and reports errors', () => {
    expect(parseVector('[1, 2, 3]')).toEqual([1, 2, 3]);
    expect(parseVector('1 2 3')).toEqual([1, 2, 3]);
    expect(runLinear(() => vectorOps.cross([1, 2], [3, 4]))).toMatchObject({ ok: false });
    expect(runLinear(() => vectorOps.normalize([0, 0]))).toMatchObject({ ok: false });
    expect(runLinear(() => vectorOps.dot([1], [1, 2]))).toMatchObject({ ok: false });
  });
});
