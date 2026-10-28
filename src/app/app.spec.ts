import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';

describe('App shell', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it('shows the main modes and the tools navigation', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const links = [...fixture.nativeElement.querySelectorAll('nav a')].map((a: Element) =>
      a.textContent?.trim(),
    );
    expect(links).toEqual(['Basic', 'Scientific', 'Graph', 'Calculus', 'Matrices', 'Engineering']);
  });

  it('always shows the project disclaimer', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const disclaimer = fixture.nativeElement.querySelector('app-disclaimer');
    expect(disclaimer.textContent).toContain('About This Project');
    expect(disclaimer.textContent).toContain('replica recreated from memory');
  });
});
