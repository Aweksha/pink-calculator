import { Component, inject, output } from '@angular/core';
import { HistoryEntry } from '../../models/calculator.types';
import { HistoryService } from '../../services/history.service';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-history-panel',
  templateUrl: './history-panel.html',
  styleUrl: './history-panel.scss',
})
export class HistoryPanel {
  protected readonly history = inject(HistoryService);
  protected readonly settings = inject(SettingsService);

  readonly useResult = output<HistoryEntry>();
  readonly useExpression = output<HistoryEntry>();
}
