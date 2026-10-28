# Pink Calculator

A fun project: a responsive scientific and graphing calculator styled like a classic pocket
calculator, in pink. Built with Angular, TypeScript, SCSS and [mathjs](https://mathjs.org/).

> **About This Project**
>
> Since all internship activities were completed on company devices using company credentials,
> this calculator is a replica recreated from memory, not the original internship code. This
> version includes additional functionality such as graph visualization, a cleaner interface,
> advanced scientific operations, and optional controls.

**Why pink?** The original was a first-day internship exercise (June 2025) to get comfortable
with Angular, TypeScript and the Node.js toolchain. The instructions were minimal ("build a
calculator"), so I made it pink, and the pink stuck as a running joke. This recreation keeps the
joke and adds a lot more maths. It contains no company code, credentials or proprietary material.

## Features

| View | What it does |
|---|---|
| **Basic** | Arithmetic with parentheses and precedence, %, ±, Ans, AC/DEL, memory (MC MR M+ M− MS) |
| **Scientific** | Powers, roots, trig and inverse trig (one-shot 2nd key), log/ln/logₐ, eˣ/10ˣ, n!, nCr, nPr, abs, 1/x, mod, π, e, EE notation, DEG/RAD |
| **Graph** | Plot several functions in different colours; zoom, pan, pinch, reset, trace values, hide/remove functions, evaluate at a chosen x |
| **Calculus** | Numerical derivative, definite integral, root finding (Newton or bisection) and limits, with f and f′ plotted |
| **Matrices** | A±B, A×B, Aᵀ, det, A⁻¹, A·v, solving Ax = b, dot/cross products, magnitude, normalization |
| **Engineering** | Degree/radian, Cartesian/polar, vector direction angles, 2D/3D rotation matrices, homogeneous transforms between frames, angular velocity, SI unit conversion, physical constants |

The current expression is shared between Basic and Scientific, so switching modes keeps it.
History (last 50 entries) and settings are saved in `localStorage` and can be turned off from the
history panel.

### Keyboard

| Key | Action |
|---|---|
| `0`–`9`, `.` | Numbers |
| `+ - * /` `^` `%` `!` | Operators |
| `(` `)` | Parentheses |
| `Enter` or `=` | Evaluate |
| `Backspace` | Delete last input |
| `Escape` | Clear |
| `Ctrl/Cmd + C` | Copy the result while the result is focused |

Shortcuts are ignored while typing in a text field. The graph canvas is focusable: arrow keys
pan, `+`/`-` zoom, `0` resets, and `Shift` + arrow keys trace.

## Behaviour notes

- **Evaluation** is done by mathjs; `eval()` and `new Function()` are never used. Division,
  modulo, powers and factorials pass through checked wrappers, so `1/0`, `0^-1`, `5 mod 0`
  and `3.5!` give clear errors instead of `Infinity` or gamma values.
- **Precision:** values are IEEE-754 doubles. Results are displayed to 12 significant digits,
  which hides artifacts like `0.1 + 0.2 = 0.30000000000000004`. Scientific notation is used
  below 1e-9 and from 1e12. Trig results are rounded to 15 significant digits, so
  `sin(180°)` is exactly `0` and `tan(45°)` is exactly `1`. `tan(90°)` reports an error.
- **Real numbers only:** results that would be complex, such as `sqrt(-1)` or `ln(-2)`, are
  reported as domain errors. Invalid results are never silently turned into zero.
- **Percent** follows mathjs: `50%` = 0.5, `200 + 10%` = 220, `200 × 10%` = 20.
- **log** is base 10, **ln** is natural log, and `log(x, b)` uses base b.
- **Unclosed parentheses** are closed automatically when you press `=`; the pending `)` appear
  faded in the display. An extra `)` is reported as unmatched.
- **Graph and Calculus** always use radians.
- **Calculus results are numerical approximations** and are labelled as such. Derivatives use
  Ridders' extrapolation, integrals use adaptive Simpson's rule (capped at 200,000 evaluations),
  roots use Newton's method or bisection, and limits are estimated by sampling toward the point.
  Symbolic calculus is out of scope.
- **Engineering conventions:** right-handed frames; counter-clockwise positive angles; active
  rotations on column vectors (p′ = R·p); T_AB = [R t; 0 1] maps frame-B coordinates into
  frame A, so T_AC = T_AB · T_BC. Constants are CODATA 2018.

## Graphing engine

The graph is a small custom canvas renderer
([graph-canvas.ts](src/app/components/graph-canvas/graph-canvas.ts)). It is used instead of the
Desmos API, which needs an API key and licence agreement, and instead of Plotly.js, which would
add about 3.5 MB. It samples each function once per pixel column and breaks lines at
discontinuities. It runs entirely in the browser, so no third-party graphing service receives
your expressions.

## Privacy

No account, backend or analytics. Calculations never leave the browser. History and preferences
are stored only in this browser's `localStorage`. The only third-party request is for the Nunito
and JetBrains Mono fonts from Google Fonts. If Google Fonts is blocked, the app falls back to
system fonts.

## Project structure

```text
src/app/
├── components/        calculator, calculator-display, calculator-keypad, history,
│                      graph, graph-canvas, mode-toggle, disclaimer, matrix-view, tool-result
├── features/          calculus, linear-algebra, engineering (lazy-loaded tool panels)
├── models/            calculator.types.ts, keys.ts (keypad + keyboard mapping)
├── services/          math-engine.ts      mathjs setup, safe evaluation, error messages
│                      numerics.ts         derivative, integral, root, limit
│                      linear-algebra.ts   matrix/vector parsing and operations
│                      engineering.ts      rotations, transforms, conversions, constants
│                      calculator.service.ts, history.service.ts,
│                      settings.service.ts, graph.service.ts
└── app.ts / app.routes.ts
```

UI components hold no maths. All calculation logic lives in plain TypeScript modules under
`services/`, which are unit-tested directly. Theme colours are defined once as CSS custom
properties in [styles.scss](src/styles.scss), with a dark "rose night" theme.

## Development

Requires Node.js 20.19+ or 22.12+ (Angular 21).

```bash
npm install
npm start              # http://localhost:4200
npm run test:ci        # unit + integration tests (Vitest)
npm run build          # production build in dist/pink-calculator/browser
```

## Deployment (GitHub Pages)

The app uses hash URLs (`/#/scientific`), so refreshing and deep links work on GitHub Pages
without a 404 fallback.

1. Push to a GitHub repository named `pink-calculator`. If you use a different name, update
   `--base-href` in the `build:gh-pages` script.
2. In **Settings → Pages**, set **Source** to **GitHub Actions**.
3. Each push to `main` runs [.github/workflows/deploy.yml](.github/workflows/deploy.yml). It
   tests, builds and publishes to `https://<username>.github.io/pink-calculator/`.

To build manually: `npm run build:gh-pages` and publish `dist/pink-calculator/browser`.
