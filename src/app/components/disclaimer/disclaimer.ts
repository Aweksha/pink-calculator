import { Component } from '@angular/core';

/** Required project disclaimer (SRS §1.2). Always visible; not collapsible. */
@Component({
  selector: 'app-disclaimer',
  template: `
    <aside class="disclaimer" aria-labelledby="disclaimer-title">
      <span class="icon" aria-hidden="true">i</span>
      <div>
        <h2 id="disclaimer-title">About This Project</h2>
        <p>
          Since all internship activities were completed on company devices using company
          credentials, this calculator is a replica recreated from memory, not the original
          internship code. This version includes additional functionality such as graph
          visualization, a cleaner interface, advanced scientific operations, and optional controls.
        </p>
      </div>
    </aside>
  `,
  styles: `
    .disclaimer {
      display: flex;
      gap: 14px;
      padding: 16px 18px;
      border-radius: var(--radius-lg);
      background: var(--peach);
      border: 1px solid var(--border);
    }
    .icon {
      flex: none;
      display: grid;
      place-items: center;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--primary-strong);
      color: var(--on-primary);
      font-weight: 900;
      font-style: italic;
      font-family: Georgia, serif;
    }
    h2 {
      font-size: 1rem;
      font-weight: 900;
    }
    p {
      margin: 4px 0 0;
      font-size: 0.92rem;
    }
  `,
})
export class Disclaimer {}
