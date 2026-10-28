import { computed, inject, Injectable, signal } from '@angular/core';
import {
  EvaluationResult,
  HistoryEntry,
  KeyAction,
  MemoryOp,
  Token,
} from '../models/calculator.types';
import { TOKENS } from '../models/keys';
import { HistoryService } from './history.service';
import { evaluateExpression, formatNumber, toExpression } from './math-engine';
import { SettingsService } from './settings.service';

const join = (tokens: Token[], field: 'display' | 'expr') => tokens.map((t) => t[field]).join('');

function openParens(tokens: Token[]): number {
  let depth = 0;
  for (const t of tokens) {
    if (t.expr.endsWith('(')) depth++;
    else if (t.type === 'close') depth--;
  }
  return depth;
}

const withClosedParens = (tokens: Token[]) => [
  ...tokens,
  ...Array.from({ length: Math.max(0, openParens(tokens)) }, () => TOKENS.close),
];

/**
 * Calculator state shared by the Basic and Scientific views, so switching modes keeps the
 * current expression. Evaluation itself lives in math-engine.ts.
 */
@Injectable({ providedIn: 'root' })
export class CalculatorService {
  private readonly settings = inject(SettingsService);
  private readonly history = inject(HistoryService);

  readonly tokens = signal<Token[]>([]);
  /** Result of the last "=" press; cleared as soon as the user edits the expression. */
  readonly result = signal<EvaluationResult | null>(null);
  readonly lastAnswer = signal<unknown>(undefined);
  readonly memory = signal<number | null>(null);
  readonly second = signal(false);
  /** Short-lived message for actions that cannot complete, e.g. storing a matrix in memory. */
  readonly notice = signal<string | null>(null);

  readonly expression = computed(() => join(this.tokens(), 'display'));
  /** Closing parentheses that will be added automatically on evaluation. */
  readonly pendingParens = computed(() => ')'.repeat(Math.max(0, openParens(this.tokens()))));

  /** Live result while typing. Invalid partial input simply shows nothing. */
  readonly preview = computed(() => {
    if (this.result() || this.tokens().length === 0) return null;
    const evaluated = this.evaluateTokens(withClosedParens(this.tokens()));
    return evaluated.ok && this.tokens().some((t) => t.type !== 'digit') ? evaluated.display : null;
  });

  dispatch(action: KeyAction): void {
    this.notice.set(null);
    switch (action.kind) {
      case 'insert':
        return this.insert(action.token);
      case 'clear':
        return this.clear();
      case 'delete':
        return this.deleteLast();
      case 'evaluate':
        return this.evaluate();
      case 'negate':
        return this.negate();
      case 'memory':
        return this.applyMemory(action.op);
      case 'second':
        this.second.update((s) => !s);
        return;
    }
  }

  insert(token: Token): void {
    const previous = this.result();
    if (previous) {
      this.result.set(null);
      // Continuing with an operator chains from the previous result, anything else starts fresh.
      const continues = token.type === 'operator' || token.type === 'postfix';
      if (continues && previous.ok) {
        this.tokens.set([TOKENS.value(previous.display, toExpression(previous.value)), token]);
        return;
      }
      this.tokens.set([token]);
      return;
    }
    this.tokens.update((t) => [...t, token]);
  }

  clear(): void {
    this.tokens.set([]);
    this.result.set(null);
  }

  deleteLast(): void {
    if (this.result()) {
      this.result.set(null);
      return;
    }
    this.tokens.update((t) => t.slice(0, -1));
  }

  evaluate(): void {
    const tokens = this.tokens();
    if (tokens.length === 0) return;
    const closed = withClosedParens(tokens);
    const outcome = this.evaluateTokens(closed);
    this.result.set(outcome);
    if (!outcome.ok) return;
    this.tokens.set(closed);
    this.lastAnswer.set(outcome.value);
    this.history.add({
      expression: join(closed, 'display'),
      tokens: closed,
      result: outcome.display,
      valueExpr: toExpression(outcome.value),
    });
  }

  /** Toggles the sign of the trailing number, or starts a negative number. */
  negate(): void {
    const previous = this.result();
    if (previous?.ok && typeof previous.value === 'number') {
      const negated = -previous.value;
      this.result.set(null);
      this.tokens.set([TOKENS.value(formatNumber(negated), toExpression(negated))]);
      return;
    }
    this.result.set(null);
    this.tokens.update((tokens) => {
      let start = tokens.length;
      while (
        start > 0 &&
        (tokens[start - 1].type === 'digit' || tokens[start - 1].type === 'value')
      ) {
        start--;
      }
      const before = tokens[start - 1];
      if (before && before.display === TOKENS.negative.display && before.type === 'operator') {
        return [...tokens.slice(0, start - 1), ...tokens.slice(start)];
      }
      return [...tokens.slice(0, start), TOKENS.negative, ...tokens.slice(start)];
    });
  }

  applyMemory(op: MemoryOp): void {
    if (op === 'MC') return this.memory.set(null);
    if (op === 'MR') {
      const stored = this.memory();
      if (stored === null) return this.notice.set('Memory is empty');
      return this.insert(TOKENS.value(formatNumber(stored), toExpression(stored)));
    }
    const current = this.currentNumber();
    if (current === null) return this.notice.set('Memory needs a single numeric result');
    const stored = this.memory() ?? 0;
    this.memory.set(op === 'MS' ? current : op === 'M+' ? stored + current : stored - current);
  }

  useHistoryResult(entry: HistoryEntry): void {
    this.insert(TOKENS.value(entry.result, entry.valueExpr));
  }

  restoreHistoryExpression(entry: HistoryEntry): void {
    this.result.set(null);
    this.tokens.set(entry.tokens);
  }

  /** The number currently shown: the last result, or the value of the expression being typed. */
  private currentNumber(): number | null {
    const tokens = this.tokens();
    const shown =
      this.result() ?? (tokens.length ? this.evaluateTokens(withClosedParens(tokens)) : null);
    return shown?.ok && typeof shown.value === 'number' ? shown.value : null;
  }

  private evaluateTokens(tokens: Token[]): EvaluationResult {
    return evaluateExpression(join(tokens, 'expr'), {
      angleMode: this.settings.angleMode(),
      ans: this.lastAnswer(),
    });
  }
}
