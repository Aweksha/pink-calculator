import { Component, input } from '@angular/core';

export type ToolOutcome =
  { ok: true; text: string; detail?: string } | { ok: false; error: string } | null;

/** Result or error box shared by the tool panels. Numerical results carry an "approx." badge. */
@Component({
  selector: 'app-tool-result',
  template: `
    @if (outcome(); as r) {
      @if (r.ok) {
        <div class="result-box" aria-live="polite">
          {{ r.text }}
          @if (approximate()) {
            <span class="approx-badge" title="Numerical approximation">approx.</span>
          }
          @if (r.detail) {
            <p class="hint">{{ r.detail }}</p>
          }
        </div>
      } @else {
        <p class="error-message" role="alert">{{ r.error }}</p>
      }
    }
  `,
  styles: `
    .hint {
      font-family: var(--font);
    }
  `,
})
export class ToolResult {
  readonly outcome = input<ToolOutcome>(null);
  readonly approximate = input(false);
}
