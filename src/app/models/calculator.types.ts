export type AngleMode = 'DEG' | 'RAD';

export type ThemePreference = 'system' | 'light' | 'dark';

/** Outcome of evaluating an expression. Never throws; errors are user-facing messages. */
export type EvaluationResult =
  { ok: true; value: unknown; display: string; numeric?: number } | { ok: false; error: string };

/** Outcome of a numerical method. Values are always approximations. */
export type NumericResult =
  { ok: true; value: number; detail?: string } | { ok: false; error: string };

export type TokenType =
  'digit' | 'operator' | 'function' | 'constant' | 'open' | 'close' | 'postfix' | 'comma' | 'value';

/** One unit of calculator input. `display` is shown to the user, `expr` is sent to mathjs. */
export interface Token {
  display: string;
  expr: string;
  type: TokenType;
}

export type MemoryOp = 'MC' | 'MR' | 'M+' | 'M-' | 'MS';

export type KeyAction =
  | { kind: 'insert'; token: Token }
  | { kind: 'clear' }
  | { kind: 'delete' }
  | { kind: 'evaluate' }
  | { kind: 'negate' }
  | { kind: 'memory'; op: MemoryOp }
  | { kind: 'second' };

export type KeyVariant = 'digit' | 'operator' | 'function' | 'action' | 'equals' | 'memory';

export interface KeyDef {
  label: string;
  aria: string;
  action: KeyAction;
  variant: KeyVariant;
  span?: number;
  /** Alternative behaviour while the 2nd toggle is active. */
  second?: { label: string; aria: string; action: KeyAction };
}

export interface HistoryEntry {
  id: string;
  expression: string;
  tokens: Token[];
  result: string;
  /** mathjs-parsable form of the result, used when the result is reused. */
  valueExpr: string;
  timestamp: number;
}

export interface PlotSeries {
  id: string;
  label: string;
  color: string;
  fn: (x: number) => number;
  dashed?: boolean;
}
