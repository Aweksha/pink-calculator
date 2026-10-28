import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CalculatorService } from '../../services/calculator.service';
import { SettingsService } from '../../services/settings.service';
import { Calculator } from './calculator';

describe('Calculator (UI integration)', () => {
  let fixture: ComponentFixture<Calculator>;
  let el: HTMLElement;

  const button = (label: string) => {
    const match = [...el.querySelectorAll<HTMLButtonElement>('button')].find(
      (b) => b.getAttribute('aria-label') === label || b.textContent?.trim() === label,
    );
    if (!match) throw new Error(`No button "${label}"`);
    return match;
  };
  const press = async (...labels: string[]) => {
    for (const label of labels) button(label).click();
    await fixture.whenStable();
  };
  const output = () => el.querySelector('output')!.textContent!.trim();
  const key = async (k: string, target: EventTarget = document.body) => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({ imports: [Calculator] }).compileComponents();
    fixture = TestBed.createComponent(Calculator);
    el = fixture.nativeElement;
    TestBed.inject(SettingsService).angleMode.set('DEG');
    await fixture.whenStable();
  });

  it('calculates by clicking keys', async () => {
    await press('2', '+', '3', '×', '4', '=');
    expect(output()).toBe('14');
    expect(el.querySelector('.expression')!.textContent).toContain('2 + 3 × 4');
  });

  it('shows errors accessibly instead of crashing', async () => {
    await press('1', '÷', '0', '=');
    const alert = el.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('Cannot divide by zero');
  });

  it('supports keyboard input', async () => {
    for (const k of ['(', '2', '+', '3', ')', '*', '4']) await key(k);
    await key('Enter');
    expect(output()).toBe('20');
    await key('Escape');
    expect(output()).toBe('0');
  });

  it('ignores keyboard shortcuts while typing in inputs', async () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    await key('5', input);
    expect(TestBed.inject(CalculatorService).expression()).toBe('');
    input.remove();
  });

  it('hides scientific keys in basic mode and shows them in scientific mode', async () => {
    expect(el.querySelector('[aria-label="Sine"]')).toBeNull();
    fixture.componentRef.setInput('scientific', true);
    await fixture.whenStable();
    expect(el.querySelector('[aria-label="Sine"]')).not.toBeNull();
    expect(el.textContent).toContain('DEG');
  });

  it('preserves the expression when switching modes', async () => {
    await press('7', '×');
    fixture.componentRef.setInput('scientific', true);
    await fixture.whenStable();
    expect(TestBed.inject(CalculatorService).expression()).toBe('7 × ');
  });

  it('evaluates scientific functions with the 2nd toggle and DEG/RAD', async () => {
    fixture.componentRef.setInput('scientific', true);
    await fixture.whenStable();
    await press('Second function: inverse trigonometry');
    await press('Inverse sine', '1', '=');
    expect(output()).toBe('90');

    await press('RAD', 'AC', 'Cosine', 'Pi', '=');
    expect(output()).toBe('-1');
  });

  it('adds results to history and reuses them on click', async () => {
    await press('2', '+', '2', '=');
    const entries = el.querySelectorAll('.entries li');
    expect(entries.length).toBe(1);
    expect(entries[0].textContent).toContain('= 4');

    await press('AC');
    button('Insert result 4').click();
    await press('×', '3', '=');
    expect(output()).toBe('12');
  });

  it('toggles the history panel', async () => {
    expect(el.querySelector('app-history-panel')).not.toBeNull();
    await press('Hide history');
    expect(el.querySelector('app-history-panel')).toBeNull();
  });
});
