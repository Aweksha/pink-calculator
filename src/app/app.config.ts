import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding, withHashLocation } from '@angular/router';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Hash URLs keep refresh and deep links working on GitHub Pages, which has no SPA fallback.
    provideRouter(routes, withHashLocation(), withComponentInputBinding()),
  ],
};
