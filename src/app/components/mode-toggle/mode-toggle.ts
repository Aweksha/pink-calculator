import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface NavLink {
  path: string;
  label: string;
}

/** Main view navigation (Basic | Scientific | Graph) plus the advanced Tools group. */
@Component({
  selector: 'app-mode-toggle',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './mode-toggle.html',
  styleUrl: './mode-toggle.scss',
})
export class ModeToggle {
  protected readonly modes: NavLink[] = [
    { path: '/basic', label: 'Basic' },
    { path: '/scientific', label: 'Scientific' },
    { path: '/graph', label: 'Graph' },
  ];

  protected readonly tools: NavLink[] = [
    { path: '/tools/calculus', label: 'Calculus' },
    { path: '/tools/matrices', label: 'Matrices' },
    { path: '/tools/engineering', label: 'Engineering' },
  ];
}
