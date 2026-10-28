import { AngleMode } from '../models/calculator.types';
import { CalcError, math } from './math-engine';
import { Matrix } from './linear-algebra';

/*
 * Conventions used throughout the Engineering panel:
 * - Right-handed coordinate frames; positive angles rotate counter-clockwise when viewed
 *   looking down the rotation axis towards the origin.
 * - Rotations are active (they rotate points, not frames) and act on column vectors: p' = R·p.
 * - Homogeneous transforms are T = [R t; 0 1]. T_AB maps coordinates in frame B to frame A,
 *   so chains compose left to right: T_AC = T_AB · T_BC.
 */

export type Axis = 'x' | 'y' | 'z';

export const toRadians = (angle: number, mode: AngleMode) =>
  mode === 'DEG' ? (angle * Math.PI) / 180 : angle;
export const fromRadians = (angle: number, mode: AngleMode) =>
  mode === 'DEG' ? (angle * 180) / Math.PI : angle;

/** Rounds away floating-point noise (e.g. cos(90°) = 6e-17) in generated matrices. */
const clean = (v: number) => (Math.abs(v) < 1e-14 ? 0 : v);

export function polarToCartesian(r: number, theta: number, mode: AngleMode) {
  const t = toRadians(theta, mode);
  return { x: clean(r * Math.cos(t)), y: clean(r * Math.sin(t)) };
}

export function cartesianToPolar(x: number, y: number, mode: AngleMode) {
  return { r: Math.hypot(x, y), theta: fromRadians(Math.atan2(y, x), mode) };
}

export function rotation2D(theta: number, mode: AngleMode): Matrix {
  const t = toRadians(theta, mode);
  const c = clean(Math.cos(t));
  const s = clean(Math.sin(t));
  return [
    [c, -s],
    [s, c],
  ];
}

export function rotation3D(axis: Axis, theta: number, mode: AngleMode): Matrix {
  const t = toRadians(theta, mode);
  const c = clean(Math.cos(t));
  const s = clean(Math.sin(t));
  switch (axis) {
    case 'x':
      return [
        [1, 0, 0],
        [0, c, -s],
        [0, s, c],
      ];
    case 'y':
      return [
        [c, 0, s],
        [0, 1, 0],
        [-s, 0, c],
      ];
    case 'z':
      return [
        [c, -s, 0],
        [s, c, 0],
        [0, 0, 1],
      ];
  }
}

export function rotatePoint2D(x: number, y: number, theta: number, mode: AngleMode) {
  const [[a, b], [c, d]] = rotation2D(theta, mode);
  return { x: clean(a * x + b * y), y: clean(c * x + d * y) };
}

export interface FrameSpec {
  axis: Axis;
  theta: number;
  translation: [number, number, number];
}

export function homogeneous({ axis, theta, translation }: FrameSpec, mode: AngleMode): Matrix {
  const r = rotation3D(axis, theta, mode);
  return [
    [...r[0], translation[0]],
    [...r[1], translation[1]],
    [...r[2], translation[2]],
    [0, 0, 0, 1],
  ];
}

export function multiplyTransforms(a: Matrix, b: Matrix): Matrix {
  return (math.multiply(a, b) as Matrix).map((row) => row.map(clean));
}

/** Maps a 3D point expressed in the transform's source frame into its target frame. */
export function transformPoint(t: Matrix, p: [number, number, number]): [number, number, number] {
  const [x, y, z] = [0, 1, 2].map((i) =>
    clean(t[i][0] * p[0] + t[i][1] * p[1] + t[i][2] * p[2] + t[i][3]),
  );
  return [x, y, z];
}

export type AngularUnit = 'rad/s' | 'deg/s' | 'rpm' | 'rev/s';

/** Factor converting one unit of angular velocity into rad/s. */
export const ANGULAR_TO_RAD_S: Record<AngularUnit, number> = {
  'rad/s': 1,
  'deg/s': Math.PI / 180,
  rpm: (2 * Math.PI) / 60,
  'rev/s': 2 * Math.PI,
};

export function convertAngularVelocity(value: number, from: AngularUnit, to: AngularUnit): number {
  return (value * ANGULAR_TO_RAD_S[from]) / ANGULAR_TO_RAD_S[to];
}

export interface UnitCategory {
  name: string;
  units: { id: string; label: string }[];
}

export const UNIT_CATEGORIES: UnitCategory[] = [
  {
    name: 'Length',
    units: [
      { id: 'm', label: 'metre (m)' },
      { id: 'cm', label: 'centimetre (cm)' },
      { id: 'mm', label: 'millimetre (mm)' },
      { id: 'km', label: 'kilometre (km)' },
      { id: 'in', label: 'inch (in)' },
      { id: 'ft', label: 'foot (ft)' },
      { id: 'yd', label: 'yard (yd)' },
      { id: 'mi', label: 'mile (mi)' },
    ],
  },
  {
    name: 'Mass',
    units: [
      { id: 'kg', label: 'kilogram (kg)' },
      { id: 'g', label: 'gram (g)' },
      { id: 'mg', label: 'milligram (mg)' },
      { id: 'tonne', label: 'tonne (t)' },
      { id: 'lbm', label: 'pound (lb)' },
      { id: 'oz', label: 'ounce (oz)' },
    ],
  },
  {
    name: 'Time',
    units: [
      { id: 's', label: 'second (s)' },
      { id: 'ms', label: 'millisecond (ms)' },
      { id: 'min', label: 'minute (min)' },
      { id: 'h', label: 'hour (h)' },
      { id: 'day', label: 'day' },
    ],
  },
  {
    name: 'Speed',
    units: [
      { id: 'm/s', label: 'metre per second (m/s)' },
      { id: 'km/h', label: 'kilometre per hour (km/h)' },
      { id: 'mi/h', label: 'mile per hour (mph)' },
      { id: 'ft/s', label: 'foot per second (ft/s)' },
    ],
  },
  {
    name: 'Force',
    units: [
      { id: 'N', label: 'newton (N)' },
      { id: 'kN', label: 'kilonewton (kN)' },
      { id: 'lbf', label: 'pound-force (lbf)' },
      { id: 'dyn', label: 'dyne (dyn)' },
    ],
  },
  {
    name: 'Energy',
    units: [
      { id: 'J', label: 'joule (J)' },
      { id: 'kJ', label: 'kilojoule (kJ)' },
      { id: 'cal', label: 'calorie (cal)' },
      { id: 'kcal', label: 'kilocalorie (kcal)' },
      { id: 'kWh', label: 'kilowatt-hour (kWh)' },
      { id: 'eV', label: 'electronvolt (eV)' },
      { id: 'BTU', label: 'British thermal unit (BTU)' },
    ],
  },
  {
    name: 'Power',
    units: [
      { id: 'W', label: 'watt (W)' },
      { id: 'kW', label: 'kilowatt (kW)' },
      { id: 'hp', label: 'horsepower (hp)' },
    ],
  },
  {
    name: 'Pressure',
    units: [
      { id: 'Pa', label: 'pascal (Pa)' },
      { id: 'kPa', label: 'kilopascal (kPa)' },
      { id: 'bar', label: 'bar' },
      { id: 'atm', label: 'atmosphere (atm)' },
      { id: 'psi', label: 'pound per sq. inch (psi)' },
      { id: 'mmHg', label: 'millimetre of mercury (mmHg)' },
    ],
  },
  {
    name: 'Temperature',
    units: [
      { id: 'degC', label: 'Celsius (°C)' },
      { id: 'degF', label: 'Fahrenheit (°F)' },
      { id: 'K', label: 'kelvin (K)' },
    ],
  },
  {
    name: 'Angle',
    units: [
      { id: 'deg', label: 'degree (°)' },
      { id: 'rad', label: 'radian (rad)' },
      { id: 'grad', label: 'gradian (grad)' },
      { id: 'arcmin', label: 'arcminute' },
      { id: 'arcsec', label: 'arcsecond' },
      { id: 'cycle', label: 'revolution' },
    ],
  },
];

// mathjs has no calorie; use the thermochemical calorie (exactly 4.184 J), allowing kcal.
math.createUnit('cal', { definition: '4.184 J', prefixes: 'short' });

export function convertUnit(value: number, from: string, to: string): number {
  try {
    return math.unit(value, from).toNumber(to);
  } catch {
    throw new CalcError(`Cannot convert ${from} to ${to}`);
  }
}

export interface PhysicalConstant {
  symbol: string;
  name: string;
  value: number;
  unit: string;
  exact?: boolean;
}

/** CODATA 2018 recommended values. */
export const CONSTANTS: PhysicalConstant[] = [
  { symbol: 'c', name: 'Speed of light in vacuum', value: 299792458, unit: 'm/s', exact: true },
  { symbol: 'g₀', name: 'Standard gravity', value: 9.80665, unit: 'm/s²', exact: true },
  { symbol: 'G', name: 'Gravitational constant', value: 6.6743e-11, unit: 'm³/(kg·s²)' },
  { symbol: 'h', name: 'Planck constant', value: 6.62607015e-34, unit: 'J·s', exact: true },
  { symbol: 'ħ', name: 'Reduced Planck constant', value: 1.054571817e-34, unit: 'J·s' },
  { symbol: 'e', name: 'Elementary charge', value: 1.602176634e-19, unit: 'C', exact: true },
  { symbol: 'k_B', name: 'Boltzmann constant', value: 1.380649e-23, unit: 'J/K', exact: true },
  { symbol: 'N_A', name: 'Avogadro constant', value: 6.02214076e23, unit: '1/mol', exact: true },
  { symbol: 'R', name: 'Molar gas constant', value: 8.314462618, unit: 'J/(mol·K)' },
  { symbol: 'ε₀', name: 'Vacuum permittivity', value: 8.8541878128e-12, unit: 'F/m' },
  { symbol: 'μ₀', name: 'Vacuum permeability', value: 1.25663706212e-6, unit: 'N/A²' },
  { symbol: 'mₑ', name: 'Electron mass', value: 9.1093837015e-31, unit: 'kg' },
  { symbol: 'mₚ', name: 'Proton mass', value: 1.67262192369e-27, unit: 'kg' },
  { symbol: 'σ', name: 'Stefan–Boltzmann constant', value: 5.670374419e-8, unit: 'W/(m²·K⁴)' },
];
