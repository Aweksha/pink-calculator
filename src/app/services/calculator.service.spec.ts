import { TestBed } from '@angular/core/testing';
import { KeyAction } from '../models/calculator.types';
import { actionForKey, TOKENS } from '../models/keys';
import { CalculatorService } from './calculator.service';
import { HistoryService } from './history.service';
import { SettingsService } from './settings.service';

describe('CalculatorService', () => {
  let calc: CalculatorService;

  const type = (keys: string) => {
    for (const key of keys) calc.dispatch(actionForKey(key) as KeyAction);
  };
  const shown = () => {
    const r = calc.result();
    return r?.ok ? r.display : r?.error;
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    calc = TestBed.inject(CalculatorService);
    TestBed.inject(SettingsService).angleMode.set('DEG');
  });

  it('evaluates with operator precedence', () => {
    type('2+3*4=');
    expect(shown()).toBe('14');
    calc.clear();
    type('(2+3)*4=');
    expect(shown()).toBe('20');
  });

  it('shows a readable error for division by zero and keeps the expression', () => {
    type('1/0=');
    expect(shown()).toBe('Cannot divide by zero');
    expect(calc.expression()).toBe('1 ÷ 0');
  });

  it('deletes the last input and clears everything', () => {
    type('123');
    calc.dispatch({ kind: 'delete' });
    expect(calc.expression()).toBe('12');
    calc.dispatch({ kind: 'clear' });
    expect(calc.expression()).toBe('');
    expect(calc.result()).toBeNull();
  });

  it('deletes a whole function token at once', () => {
    calc.insert(TOKENS.fn('sin', 'sin'));
    type('30');
    calc.deleteLast();
    calc.deleteLast();
    calc.deleteLast();
    expect(calc.expression()).toBe('');
  });

  it('auto-closes parentheses on evaluation', () => {
    calc.insert(TOKENS.fn('sin', 'sin'));
    type('30');
    expect(calc.pendingParens()).toBe(')');
    expect(calc.preview()).toBe('0.5');
    calc.evaluate();
    expect(shown()).toBe('0.5');
    expect(calc.expression()).toBe('sin(30)');
  });

  it('chains from the previous result when an operator follows =', () => {
    type('6*7=');
    type('+1=');
    expect(shown()).toBe('43');
  });

  it('starts a new expression when a digit follows =', () => {
    type('6*7=');
    type('5');
    expect(calc.expression()).toBe('5');
  });

  it('supports Ans', () => {
    type('6*7=');
    calc.clear();
    calc.insert(TOKENS.ans);
    type('/2=');
    expect(shown()).toBe('21');
  });

  it('toggles the sign of the trailing number', () => {
    type('5+3');
    calc.negate();
    expect(calc.expression()).toBe('5 + −3');
    calc.negate();
    expect(calc.expression()).toBe('5 + 3');
    type('=');
    calc.negate();
    expect(calc.expression()).toBe('-8');
  });

  it('respects the angle mode', () => {
    const settings = TestBed.inject(SettingsService);
    settings.angleMode.set('RAD');
    calc.insert(TOKENS.fn('sin⁻¹', 'asin'));
    type('1)=');
    expect(calc.result()?.ok && (calc.result() as { numeric: number }).numeric).toBeCloseTo(
      Math.PI / 2,
      12,
    );
  });

  it('implements memory operations', () => {
    type('5=');
    calc.applyMemory('MS');
    expect(calc.memory()).toBe(5);
    type('3=');
    calc.applyMemory('M+');
    expect(calc.memory()).toBe(8);
    calc.applyMemory('M-');
    expect(calc.memory()).toBe(5);
    calc.clear();
    calc.applyMemory('MR');
    expect(calc.expression()).toBe('5');
    calc.applyMemory('MC');
    expect(calc.memory()).toBeNull();
  });

  it('refuses to store non-numeric values in memory', () => {
    calc.applyMemory('MS');
    expect(calc.memory()).toBeNull();
    expect(calc.notice()).toMatch(/single numeric result/);
  });

  it('records successful calculations in history and reuses them', () => {
    const history = TestBed.inject(HistoryService);
    type('2^8=');
    type('1/0=');
    expect(history.entries().length).toBe(1);
    const [entry] = history.entries();
    expect(entry.expression).toBe('2^8');
    expect(entry.result).toBe('256');

    calc.clear();
    calc.useHistoryResult(entry);
    type('+1=');
    expect(shown()).toBe('257');

    calc.restoreHistoryExpression(entry);
    expect(calc.expression()).toBe('2^8');
  });
});
