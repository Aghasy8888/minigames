# MiniGames

Web application with 2 pages and 2 dialogs, built from a design mockup using **TypeScript + HTML + SCSS only** (no frameworks or ready-made UI libraries).

## Live demo

https://aghasy8888.github.io/minigames/

Deployed from the `gh-pages` branch (GitHub Pages → Deploy from a branch → `gh-pages` / root).

## Pages and dialogs

- **Home**
- **Library**
- **Auth** modal (sign in / sign up)
- **Game Details** modal

## Goals

Demonstrate valid semantic responsive UI, maintainable readable code, Figma style/graphics export, and TypeScript for the required behavior.

## Stories

1. **Project Setup & Home Page Layout** — tooling (bundler, TypeScript, ESLint, Prettier, Husky, Sass tokens), adaptive Home layout at all breakpoints, Auth dialog layout.
2. **Library Page Layout, Game Details Dialog & Home Page Slider Logic** — adaptive Library layout, Game Details dialog, Home slider interaction.
3. **Backend API Integration & Authentication** — REST API data, filtering, sorting, pagination, skeletons, snackbar, email/password and Firebase Google OAuth.
4. **Custom Routing & Unit Testing** — SPA routing with History API (deep-linking, 404, empty/not-found states), Vitest/Jest coverage.

## App session (Story 4)

After a successful login, registration, or Google sign-in, the app stores one JSON object in `localStorage`:

- **Key:** `minigames:minigames-aghasy:app-session`
- **Value:** `{ "email", "displayName", "authenticatedAt", "avatarUrl"? }`
  - `authenticatedAt` is `Date.now()` (milliseconds) at the moment of authentication.
  - `avatarUrl` is present only when the account has a photo.
  - No passwords, Firebase tokens, or other credentials are stored.
- **Lifetime:** 5 minutes from `authenticatedAt`. Reloading or using the app does not extend it.
- **Invalid data:** invalid JSON, a missing field, a wrong field type, or an `authenticatedAt` in the future removes this key, signs out of Firebase, and starts in Guest Mode.

To test expiry: DevTools → Application → Local Storage → set `authenticatedAt` to a value older than 5 minutes (e.g. `Date.now() - 6 * 60 * 1000`), then reload the page or try a protected action.

## Setup

```bash
npm install
npm run dev
```

## Testing

Requires Node.js 22.12+ (the repo pins 24 in `.nvmrc`; run `nvm use`).

```bash
npm install
npm test               # all unit test suites
npm run test:coverage  # same suites + terminal coverage table
```

- Check the `All files` row, `% Stmts` column, in the coverage table (target: 80%+). An HTML report is also written to `coverage/index.html`.
- Tests need no `.env` file, Firebase credentials, or network: Firebase and `fetch` are mocked, and time and env values are faked in tests, so results don't depend on time zone or locale.
- Coverage exclusions (each with a reason) are listed in `vitest.config.ts`.
- "Updating thresholds to configuration file" is expected. Vitest only raises the coverage floors in `vitest.config.ts` when a run beats them; on unchanged code the file stays the same.
