import { computed, DOCUMENT, effect, inject, Injectable, signal } from '@angular/core';
import { AngleMode, ThemePreference } from '../models/calculator.types';
import { storage } from './storage';

interface StoredSettings {
  angleMode: AngleMode;
  theme: ThemePreference;
  persistHistory: boolean;
  historyOpen: boolean;
}

export const SETTINGS_KEY = 'pink-calculator:settings';

const DEFAULTS: StoredSettings = {
  angleMode: 'DEG',
  theme: 'system',
  persistHistory: true,
  historyOpen: true,
};

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly document = inject(DOCUMENT);
  private readonly stored = { ...DEFAULTS, ...storage.read<Partial<StoredSettings>>(SETTINGS_KEY) };

  readonly angleMode = signal<AngleMode>(this.stored.angleMode);
  readonly theme = signal<ThemePreference>(this.stored.theme);
  readonly persistHistory = signal(this.stored.persistHistory);
  readonly historyOpen = signal(this.stored.historyOpen);

  private readonly systemDark = signal(this.prefersDark());
  readonly resolvedTheme = computed(() => {
    const theme = this.theme();
    return theme === 'system' ? (this.systemDark() ? 'dark' : 'light') : theme;
  });

  constructor() {
    this.document.defaultView
      ?.matchMedia?.('(prefers-color-scheme: dark)')
      .addEventListener?.('change', (e) => this.systemDark.set(e.matches));

    effect(() => {
      storage.write(SETTINGS_KEY, {
        angleMode: this.angleMode(),
        theme: this.theme(),
        persistHistory: this.persistHistory(),
        historyOpen: this.historyOpen(),
      } satisfies StoredSettings);
    });

    effect(() => {
      const theme = this.theme();
      const root = this.document.documentElement;
      if (theme === 'system') root.removeAttribute('data-theme');
      else root.setAttribute('data-theme', theme);
    });
  }

  toggleAngleMode(): void {
    this.angleMode.update((m) => (m === 'DEG' ? 'RAD' : 'DEG'));
  }

  cycleTheme(): void {
    const order: ThemePreference[] = ['system', 'light', 'dark'];
    this.theme.update((t) => order[(order.indexOf(t) + 1) % order.length]);
  }

  private prefersDark(): boolean {
    return this.document.defaultView?.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  }
}
