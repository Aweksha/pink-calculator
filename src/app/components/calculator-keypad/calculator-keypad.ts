import { Component, input, output } from '@angular/core';
import { KeyAction, KeyDef } from '../../models/calculator.types';
import { BASIC_KEYS, MEMORY_KEYS, SCIENTIFIC_KEYS } from '../../models/keys';

@Component({
  selector: 'app-calculator-keypad',
  templateUrl: './calculator-keypad.html',
  styleUrl: './calculator-keypad.scss',
})
export class CalculatorKeypad {
  readonly scientific = input(false);
  readonly second = input(false);
  readonly pressed = output<KeyAction>();

  protected readonly memoryKeys = MEMORY_KEYS;
  protected readonly basicKeys = BASIC_KEYS;
  protected readonly scientificKeys = SCIENTIFIC_KEYS;

  protected view(key: KeyDef) {
    return this.second() && key.second ? key.second : key;
  }

  protected press(key: KeyDef): void {
    this.pressed.emit(this.view(key).action);
    // 2nd is one-shot, like a hardware calculator: it releases after one inverse function.
    if (this.second() && key.second) this.pressed.emit({ kind: 'second' });
  }
}
