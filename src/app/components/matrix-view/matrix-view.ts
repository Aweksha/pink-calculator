import { Component, input } from '@angular/core';
import { formatNumber } from '../../services/math-engine';

@Component({
  selector: 'app-matrix-view',
  template: `
    <table class="matrix-table" [attr.aria-label]="label()">
      <tbody>
        @for (row of matrix(); track $index) {
          <tr>
            @for (cell of row; track $index) {
              <td>{{ format(cell) }}</td>
            }
          </tr>
        }
      </tbody>
    </table>
  `,
  styles: `
    :host {
      display: inline-block;
      max-width: 100%;
      overflow-x: auto;
    }
  `,
})
export class MatrixView {
  readonly matrix = input.required<number[][]>();
  readonly label = input('Matrix');
  protected readonly format = (v: number) => formatNumber(v, 10);
}
