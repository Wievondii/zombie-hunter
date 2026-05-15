# AGENTS.md

## Project

Pixel Zombie Hunter — browser-based pixel-art zombie survival shooter. Pure vanilla JS (no framework), Vite bundler, single-page canvas game at fixed 640×360 resolution.

## Commands

- `npm run dev` — start dev server at `http://localhost:3000`
- `npm run build` — production build to `dist/`
- `npm run preview` — preview production build

No test suite, no lint, no typecheck. CI only runs `npm ci && npm run build`.

## Structure

- `src/main.js` — game entry point, main loop, all wiring
- `src/config.js` — constants (resolution, grid, limits)
- `src/entities/` — player, zombies, bullets, pickups, powerups, hazards
- `src/systems/` — particles, spatial grid, lighting, waves, combo, effects
- `src/ui/` — HUD, menus, shop
- `src/flow/` — game state machine (title → char select → stage select → game → results)
- `src/map/` — tile map
- `src/data/` — character/stage definitions
- `public/` — static assets served as-is

## Conventions

- ES modules throughout (`"type": "module"` in package.json)
- Canvas-only rendering, no DOM manipulation for game graphics
- Game logic runs at fixed 640×360; CSS transform scales to viewport
- All imports use explicit `.js` extensions
- Chinese UI text (game is in Chinese)
