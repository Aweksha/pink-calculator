import { Component, computed, ElementRef, input, signal, viewChild } from '@angular/core';
import { AngleMode, EvaluationResult } from '../../models/calculator.types';

@Component({
  selector: 'app-calculator-display',
  templateUrl: './calculator-display.html',
  styleUrl: './calculator-display.scss',
})
export class CalculatorDisplay {
  readonly expression = input('');
  readonly pendingParens = input('');
  readonly preview = input<string | null>(null);
  readonly result = input<EvaluationResult | null>(null);
  readonly notice = input<string | null>(null);
  readonly angleMode = input<AngleMode>('DEG');
  readonly showAngleMode = input(false);
  readonly memory = input<number | null>(null);
  readonly second = input(false);

  private readonly output = viewChild.required<ElementRef<HTMLElement>>('output');
  protected readonly copied = signal(false);

  protected readonly error = computed(() => {
    const r = this.result();
    return r && !r.ok ? r.error : null;
  });

  /** Text in the large output line: the result, a live preview, or the expression itself. */
  protected readonly mainText = computed(() => {
    const r = this.result();
    if (r?.ok) return r.display;
    return this.preview() ?? (this.expression() || '0');
  });

  protected readonly showingResult = computed(() => !!this.result()?.ok);

  protected readonly sizeClass = computed(() => {
    const length = this.mainText().length;
    return length > 28 ? 'xs' : length > 18 ? 'sm' : length > 12 ? 'md' : '';
  });

  /** Ctrl/Cmd+C on the focused output copies the result unless the user selected part of it. */
  protected onOutputKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') {
      const selection = globalThis.getSelection?.()?.toString();
      if (selection) return;
      event.preventDefault();
      void this.copy();
    }
  }

  async copy(): Promise<void> {
    const text = this.output().nativeElement.textContent?.trim() ?? '';
    try {
      await navigator.clipboard.writeText(text);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    } catch {
      // Clipboard access can be blocked; the output text remains selectable.
    }
  }
}
