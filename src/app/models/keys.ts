import { KeyAction, KeyDef, MemoryOp, Token, TokenType } from './calculator.types';

const token = (display: string, expr: string, type: TokenType): Token => ({ display, expr, type });

export const TOKENS = {
  digit: (d: string) => token(d, d, 'digit'),
  point: token('.', '.', 'digit'),
  exponent: token('E', 'e', 'digit'),
  plus: token(' + ', '+', 'operator'),
  minus: token(' − ', '-', 'operator'),
  times: token(' × ', '*', 'operator'),
  divide: token(' ÷ ', '/', 'operator'),
  power: token('^', '^', 'operator'),
  mod: token(' mod ', ' mod ', 'operator'),
  negative: token('−', '-', 'operator'),
  percent: token('%', '%', 'postfix'),
  factorial: token('!', '!', 'postfix'),
  square: token('²', '^2', 'postfix'),
  cube: token('³', '^3', 'postfix'),
  reciprocal: token('⁻¹', '^(-1)', 'postfix'),
  open: token('(', '(', 'open'),
  close: token(')', ')', 'close'),
  comma: token(', ', ',', 'comma'),
  pi: token('π', ' pi ', 'constant'),
  e: token('e', ' e ', 'constant'),
  ans: token('Ans', ' Ans ', 'constant'),
  fn: (display: string, name: string) => token(`${display}(`, ` ${name}(`, 'function'),
  value: (display: string, expr: string) => token(display, expr, 'value'),
};

const insert = (t: Token): KeyAction => ({ kind: 'insert', token: t });
const memory = (op: MemoryOp, aria: string): KeyDef => ({
  label: op === 'M-' ? 'M−' : op,
  aria,
  action: { kind: 'memory', op },
  variant: 'memory',
});
const digit = (d: string): KeyDef => ({
  label: d,
  aria: d,
  action: insert(TOKENS.digit(d)),
  variant: 'digit',
});
const fnKey = (label: string, aria: string, t: Token, second?: KeyDef['second']): KeyDef => ({
  label,
  aria,
  action: insert(t),
  variant: 'function',
  second,
});

export const MEMORY_KEYS: KeyDef[] = [
  memory('MC', 'Memory clear'),
  memory('MR', 'Memory recall'),
  memory('M+', 'Add to memory'),
  memory('M-', 'Subtract from memory'),
  memory('MS', 'Memory store'),
];

export const BASIC_KEYS: KeyDef[] = [
  { label: 'AC', aria: 'All clear', action: { kind: 'clear' }, variant: 'action' },
  { label: 'DEL', aria: 'Delete last input', action: { kind: 'delete' }, variant: 'action' },
  { label: '(', aria: 'Open parenthesis', action: insert(TOKENS.open), variant: 'operator' },
  { label: ')', aria: 'Close parenthesis', action: insert(TOKENS.close), variant: 'operator' },
  { label: '÷', aria: 'Divide', action: insert(TOKENS.divide), variant: 'operator' },
  digit('7'),
  digit('8'),
  digit('9'),
  { label: '%', aria: 'Percent', action: insert(TOKENS.percent), variant: 'operator' },
  { label: '×', aria: 'Multiply', action: insert(TOKENS.times), variant: 'operator' },
  digit('4'),
  digit('5'),
  digit('6'),
  { label: '±', aria: 'Toggle sign', action: { kind: 'negate' }, variant: 'operator' },
  { label: '−', aria: 'Subtract', action: insert(TOKENS.minus), variant: 'operator' },
  digit('1'),
  digit('2'),
  digit('3'),
  { label: 'Ans', aria: 'Previous answer', action: insert(TOKENS.ans), variant: 'operator' },
  { label: '+', aria: 'Add', action: insert(TOKENS.plus), variant: 'operator' },
  { ...digit('0'), span: 2 },
  { label: '.', aria: 'Decimal point', action: insert(TOKENS.point), variant: 'digit' },
  { label: '=', aria: 'Equals', action: { kind: 'evaluate' }, variant: 'equals', span: 2 },
];

export const SCIENTIFIC_KEYS: KeyDef[] = [
  {
    label: '2nd',
    aria: 'Second function: inverse trigonometry',
    action: { kind: 'second' },
    variant: 'action',
  },
  { label: 'π', aria: 'Pi', action: insert(TOKENS.pi), variant: 'function' },
  { label: 'e', aria: "Euler's number", action: insert(TOKENS.e), variant: 'function' },
  {
    label: ',',
    aria: 'Argument separator comma',
    action: insert(TOKENS.comma),
    variant: 'function',
  },
  { label: 'n!', aria: 'Factorial', action: insert(TOKENS.factorial), variant: 'function' },

  fnKey('sin', 'Sine', TOKENS.fn('sin', 'sin'), {
    label: 'sin⁻¹',
    aria: 'Inverse sine',
    action: insert(TOKENS.fn('sin⁻¹', 'asin')),
  }),
  fnKey('cos', 'Cosine', TOKENS.fn('cos', 'cos'), {
    label: 'cos⁻¹',
    aria: 'Inverse cosine',
    action: insert(TOKENS.fn('cos⁻¹', 'acos')),
  }),
  fnKey('tan', 'Tangent', TOKENS.fn('tan', 'tan'), {
    label: 'tan⁻¹',
    aria: 'Inverse tangent',
    action: insert(TOKENS.fn('tan⁻¹', 'atan')),
  }),
  fnKey('log', 'Logarithm base 10', TOKENS.fn('log', 'log10')),
  fnKey('ln', 'Natural logarithm', TOKENS.fn('ln', 'ln')),

  { label: 'x²', aria: 'Square', action: insert(TOKENS.square), variant: 'function' },
  { label: 'x³', aria: 'Cube', action: insert(TOKENS.cube), variant: 'function' },
  { label: 'xʸ', aria: 'Power', action: insert(TOKENS.power), variant: 'function' },
  fnKey('10ˣ', 'Ten to the power of', { display: '10^(', expr: '10^(', type: 'open' }),
  fnKey('eˣ', 'e to the power of', { display: 'e^(', expr: ' e^(', type: 'open' }),

  fnKey('√x', 'Square root', TOKENS.fn('√', 'sqrt')),
  fnKey('∛x', 'Cube root', TOKENS.fn('∛', 'cbrt')),
  fnKey('ⁿ√x', 'nth root: root(n, x)', TOKENS.fn('root', 'nroot')),
  fnKey('|x|', 'Absolute value', TOKENS.fn('abs', 'abs')),
  { label: '1/x', aria: 'Reciprocal', action: insert(TOKENS.reciprocal), variant: 'function' },

  { label: 'mod', aria: 'Modulo', action: insert(TOKENS.mod), variant: 'function' },
  fnKey('nCr', 'Combinations: nCr(n, r)', TOKENS.fn('nCr', 'nCr')),
  fnKey('nPr', 'Permutations: nPr(n, r)', TOKENS.fn('nPr', 'nPr')),
  {
    label: 'EE',
    aria: 'Times ten to the power (scientific notation)',
    action: insert(TOKENS.exponent),
    variant: 'function',
  },
  fnKey('logₐ', 'Logarithm with any base: logₐ(x, a)', TOKENS.fn('logₐ', 'log')),
];

/** Physical keyboard mapping. Returns null for keys the calculator does not handle. */
export function actionForKey(key: string): KeyAction | null {
  if (/^[0-9]$/.test(key)) return insert(TOKENS.digit(key));
  switch (key) {
    case '.':
    case ',':
      return insert(TOKENS.point);
    case '+':
      return insert(TOKENS.plus);
    case '-':
      return insert(TOKENS.minus);
    case '*':
    case 'x':
      return insert(TOKENS.times);
    case '/':
      return insert(TOKENS.divide);
    case '^':
      return insert(TOKENS.power);
    case '%':
      return insert(TOKENS.percent);
    case '!':
      return insert(TOKENS.factorial);
    case '(':
      return insert(TOKENS.open);
    case ')':
      return insert(TOKENS.close);
    case 'Enter':
    case '=':
      return { kind: 'evaluate' };
    case 'Backspace':
      return { kind: 'delete' };
    case 'Escape':
    case 'Delete':
      return { kind: 'clear' };
    default:
      return null;
  }
}
