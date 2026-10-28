import { computed, Injectable, signal } from '@angular/core';
import { PlotSeries } from '../models/calculator.types';
import { compileFunction } from './math-engine';

export const PLOT_COLORS = ['#D65B8C', '#3E7CC9', '#2E9466', '#D9822B', '#7D5BD0', '#1C9A9A'];

export interface GraphFunction {
  id: string;
  text: string;
  color: string;
  visible: boolean;
  error: string | null;
  fn: ((x: number) => number) | null;
}

let nextId = 1;

function build(text: string, color: string, visible = true): GraphFunction {
  const compiled = compileFunction(text);
  return {
    id: `f${nextId++}`,
    text,
    color,
    visible,
    error: compiled.ok ? null : compiled.error,
    fn: compiled.ok ? compiled.fn : null,
  };
}

/** Plotted functions. Kept in a root service so they survive switching tabs. */
@Injectable({ providedIn: 'root' })
export class GraphService {
  readonly functions = signal<GraphFunction[]>([build('y = x^2', PLOT_COLORS[0])]);

  readonly series = computed<PlotSeries[]>(() =>
    this.functions()
      .filter((f) => f.visible && f.fn)
      .map((f) => ({ id: f.id, label: f.text, color: f.color, fn: f.fn! })),
  );

  add(text = ''): void {
    this.functions.update((list) => {
      const used = new Set(list.map((f) => f.color));
      const color =
        PLOT_COLORS.find((c) => !used.has(c)) ?? PLOT_COLORS[list.length % PLOT_COLORS.length];
      return [...list, build(text, color)];
    });
  }

  update(id: string, text: string): void {
    this.functions.update((list) =>
      list.map((f) => (f.id === id ? { ...build(text, f.color, f.visible), id } : f)),
    );
  }

  toggle(id: string): void {
    this.functions.update((list) =>
      list.map((f) => (f.id === id ? { ...f, visible: !f.visible } : f)),
    );
  }

  remove(id: string): void {
    this.functions.update((list) => list.filter((f) => f.id !== id));
  }
}
