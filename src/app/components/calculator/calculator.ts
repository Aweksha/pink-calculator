import { Component, inject, input } from '@angular/core';
import { CalculatorDisplay } from '../calculator-display/calculator-display';
import { CalculatorKeypad } from '../calculator-keypad/calculator-keypad';
import { HistoryPanel } from '../history/history-panel';
import { actionForKey } from '../../models/keys';
import { CalculatorService } from '../../services/calculator.service';
import { SettingsService } from '../../services/settings.service';

const TEXT_INPUTS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

@Component({
  selector: 'app-calculator',
  imports: [CalculatorDisplay, CalculatorKeypad, HistoryPanel],
  templateUrl: './calculator.html',
  styleUrl: './calculator.scss',
  host: { '(document:keydown)': 'onKeydown($event)' },
})
export class Calculator {
  /** Bound from route data: Basic vs Scientific view of the same calculator state. */
  readonly scientific = input(false);

  protected readonly calc = inject(CalculatorService);
  protected readonly settings = inject(SettingsService);

  protected onKeydown(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target as HTMLElement | null;
    if (target && (TEXT_INPUTS.has(target.tagName) || target.isContentEditable)) return;
    // Let focused buttons and links handle their own activation keys.
    if ((event.key === 'Enter' || event.key === ' ') && target?.closest('button, a')) return;

    const action = actionForKey(event.key);
    if (!action) return;
    event.preventDefault();
    this.calc.dispatch(action);
  }
}
