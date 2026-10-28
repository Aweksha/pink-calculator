import {
  cartesianToPolar,
  convertAngularVelocity,
  convertUnit,
  homogeneous,
  multiplyTransforms,
  polarToCartesian,
  rotatePoint2D,
  rotation3D,
  transformPoint,
  UNIT_CATEGORIES,
} from './engineering';

describe('engineering tools', () => {
  it('converts between polar and cartesian coordinates', () => {
    expect(polarToCartesian(2, 90, 'DEG')).toEqual({ x: 0, y: 2 });
    const polar = cartesianToPolar(1, 1, 'DEG');
    expect(polar.r).toBeCloseTo(Math.SQRT2, 12);
    expect(polar.theta).toBeCloseTo(45, 12);
  });

  it('rotates a 2D point counter-clockwise', () => {
    expect(rotatePoint2D(1, 0, 90, 'DEG')).toEqual({ x: 0, y: 1 });
  });

  it('builds 3D rotation matrices', () => {
    expect(rotation3D('z', Math.PI / 2, 'RAD')).toEqual([
      [0, -1, 0],
      [1, 0, 0],
      [0, 0, 1],
    ]);
  });

  it('chains homogeneous transforms and maps points between frames', () => {
    const tAB = homogeneous({ axis: 'z', theta: 90, translation: [1, 0, 0] }, 'DEG');
    const tBC = homogeneous({ axis: 'z', theta: 0, translation: [2, 0, 0] }, 'DEG');
    const tAC = multiplyTransforms(tAB, tBC);
    expect(transformPoint(tAC, [0, 0, 0])).toEqual([1, 2, 0]);
    expect(transformPoint(tAB, [1, 0, 5])).toEqual([1, 1, 5]);
  });

  it('converts angular velocity', () => {
    expect(convertAngularVelocity(60, 'rpm', 'rev/s')).toBeCloseTo(1, 12);
    expect(convertAngularVelocity(Math.PI, 'rad/s', 'deg/s')).toBeCloseTo(180, 12);
  });

  it('converts SI units', () => {
    expect(convertUnit(1, 'km', 'm')).toBeCloseTo(1000, 9);
    expect(convertUnit(100, 'degC', 'degF')).toBeCloseTo(212, 9);
    expect(convertUnit(1, 'atm', 'Pa')).toBeCloseTo(101325, 6);
  });

  it('every listed unit converts within its category', () => {
    for (const category of UNIT_CATEGORIES) {
      const base = category.units[0].id;
      for (const unit of category.units) {
        expect(Number.isFinite(convertUnit(1, unit.id, base))).toBe(true);
      }
    }
  });
});
