import { Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Disclaimer } from './components/disclaimer/disclaimer';
import { ModeToggle } from './components/mode-toggle/mode-toggle';
import { SettingsService } from './services/settings.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ModeToggle, Disclaimer],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly settings = inject(SettingsService);

  protected readonly themeLabel = computed(
    () =>
      ({ system: 'Theme: system', light: 'Theme: light', dark: 'Theme: dark' })[
        this.settings.theme()
      ],
  );
  protected readonly themeIcon = computed(
    () => ({ system: '◐', light: '☀', dark: '☾' })[this.settings.theme()],
  );
}
