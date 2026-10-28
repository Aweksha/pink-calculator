import { effect, inject, Injectable, signal } from '@angular/core';
import { HistoryEntry } from '../models/calculator.types';
import { SettingsService } from './settings.service';
import { storage } from './storage';

export const HISTORY_KEY = 'pink-calculator:history';
export const HISTORY_LIMIT = 50;

/** Recent calculations. Stored only in this browser's localStorage, never sent anywhere. */
@Injectable({ providedIn: 'root' })
export class HistoryService {
  private readonly settings = inject(SettingsService);

  readonly entries = signal<HistoryEntry[]>(
    this.settings.persistHistory() ? (storage.read<HistoryEntry[]>(HISTORY_KEY) ?? []) : [],
  );

  constructor() {
    effect(() => {
      const entries = this.entries();
      if (this.settings.persistHistory()) storage.write(HISTORY_KEY, entries);
      else storage.remove(HISTORY_KEY);
    });
  }

  add(entry: Omit<HistoryEntry, 'id' | 'timestamp'>): void {
    const full: HistoryEntry = {
      ...entry,
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
    };
    this.entries.update((list) => [full, ...list].slice(0, HISTORY_LIMIT));
  }

  clear(): void {
    this.entries.set([]);
  }
}
