import { TestBed } from '@angular/core/testing';
import { HISTORY_KEY, HISTORY_LIMIT, HistoryService } from './history.service';
import { SettingsService } from './settings.service';

const entry = (n: number) => ({
  expression: `${n}+0`,
  tokens: [],
  result: String(n),
  valueExpr: String(n),
});

describe('HistoryService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  it('keeps only the most recent entries, newest first', () => {
    const history = TestBed.inject(HistoryService);
    for (let i = 0; i < HISTORY_LIMIT + 5; i++) history.add(entry(i));
    expect(history.entries().length).toBe(HISTORY_LIMIT);
    expect(history.entries()[0].result).toBe(String(HISTORY_LIMIT + 4));
  });

  it('persists to localStorage and restores after a reload', () => {
    const history = TestBed.inject(HistoryService);
    history.add(entry(7));
    TestBed.tick();
    expect(JSON.parse(localStorage.getItem(HISTORY_KEY)!)[0].result).toBe('7');

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    expect(TestBed.inject(HistoryService).entries()[0].result).toBe('7');
  });

  it('removes stored history when persistence is disabled', () => {
    const history = TestBed.inject(HistoryService);
    history.add(entry(1));
    TestBed.tick();
    TestBed.inject(SettingsService).persistHistory.set(false);
    TestBed.tick();
    expect(localStorage.getItem(HISTORY_KEY)).toBeNull();
    expect(history.entries().length).toBe(1);
  });

  it('clears history', () => {
    const history = TestBed.inject(HistoryService);
    history.add(entry(1));
    history.clear();
    expect(history.entries()).toEqual([]);
  });
});
