import { Component, computed, inject, signal } from '@angular/core';
import { GraphCanvas, formatAxisValue } from '../graph-canvas/graph-canvas';
import { GraphService } from '../../services/graph.service';
import { CalcError, parseNumber } from '../../services/math-engine';

@Component({
  selector: 'app-graph',
  imports: [GraphCanvas],
  templateUrl: './graph.html',
  styleUrl: './graph.scss',
})
export class Graph {
  protected readonly graph = inject(GraphService);
  protected readonly evalAt = signal('1');

  protected readonly evaluation = computed(() => {
    try {
      const x = parseNumber(this.evalAt(), 'x');
      const rows = this.graph
        .functions()
        .filter((f) => f.fn)
        .map((f) => {
          const y = f.fn!(x);
          return {
            id: f.id,
            text: f.text,
            color: f.color,
            value: Number.isFinite(y) ? formatAxisValue(Number(y.toPrecision(10))) : 'undefined',
          };
        });
      return { ok: true as const, rows };
    } catch (e) {
      return { ok: false as const, error: e instanceof CalcError ? e.message : 'Invalid x value' };
    }
  });

  protected readonly examples = [
    'y = sin(x)',
    'y = x^3 - 2x',
    'y = 1/x',
    'y = e^(-x^2)',
    'y = abs(x) - 2',
  ];

  protected text(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }
}
