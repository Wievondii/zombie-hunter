# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pixel Zombie Hunter v3.0 — a browser-based pixel-art top-down zombie survival shooter built with vanilla JavaScript and HTML5 Canvas. No frameworks, no TypeScript. All rendering is done via `CanvasRenderingContext2D` with pixel-art style (`image-rendering: pixelated`).

## Commands

```bash
npm run dev      # Start Vite dev server (localhost)
npm run build    # Production build to dist/
npm run preview  # Preview production build
```

No test suite, linter, or formatter is configured.

## Architecture

### Canvas & Rendering

Fixed internal resolution of **640×360** (`IW`/`IH` from `config.js`). CSS transform scales the canvas to fill the viewport. All game logic and rendering operates in this fixed coordinate space — never use screen pixels.

### Game Loop (`src/main.js`)

`gameLoop()` via `requestAnimationFrame` → `updateGame(dt)` → `render()`. The `dt` is capped at 0.2s to prevent spiral-of-death. A `FlowState` state machine (`src/flow/GameFlow.js`) gates what runs:

- `TITLE`, `CHAR_SELECT`, `STAGE_SELECT`, `RESULTS` — UI-only screens rendered in `render()`
- `PLAYING` — full game update + render
- `SHOP`, `PAUSED`, `PERK_SELECT`, `SETTINGS` — overlays on top of the game scene

### Entity System

All game entities are plain arrays (no ECS). Each module exports its array and update/draw functions:

- `entities/player.js` — `Player` class, turret system
- `entities/zombie.js` — `Zombie` class, `spawnZombie()`, `cleanupZombies()`
- `entities/bullet.js` — bullets + acid projectiles
- `entities/pickup.js` — coins, ammo, health, loot drops
- `entities/powerup.js` — timed powerups (speed, shield, nuke, etc.)
- `entities/hazard.js` — acid pools, exploding barrels

### Spatial Optimization

`systems/spatial-grid.js` — uniform grid for broad-phase collision. Zombie-bullet and zombie-turret queries use `zombieGrid.query(x, y, radius)` before narrow-phase distance checks.

### Stat Stacking

Three layers modify player stats, all in `src/entities/player.js`:

1. **Character base** (`data/characters.js`) — set in `initGame()`
2. **Perks** (`data.js` PERKS array) — multiplicative, every 5 waves. Applied with floor/ceiling clamps (armorMult ≥ 0.15, fireRateMult ≥ 0.15, speed ≤ 500)
3. **Loot items** (`loot/LootSystem.js` `applyItemStats()`) — additive, with same clamps

Effective fire rate: `getEffectiveFireRate()` — `Math.max(0.03, base * fireRateMult + weaponUpgrades.fireRate)`

### Boss System (`boss/BossAI.js`)

Boss definitions in `BOSS_DEFS` with phase-based AI (`BossController`). Each boss has 3 phases triggered by HP thresholds, each phase unlocking new attack patterns. Boss types: `necromancer`, `mutant_tank`, `mech_walker`, `hive_mind`, `plague_spreader`, `shadow_assassin`, `iron_fortress`.

### Wave System (`systems/waves.js`)

`waveState` tracks current wave, kills, difficulty. `advanceWave()` handles wave transitions, perk selection, and stage completion. Non-boss stages complete after clearing `stageWaves` (6) waves. Boss stages trigger a boss wave on the final wave.

### Kill Registration

AoE kills must go through `registerKill()` in `main.js` (not just `z.takeDamage()` → `z.onDeath()`). This ensures `score`, `kills`, `waveState.killed`, and achievements all update. The `onDeath()` method in `zombie.js` handles drops, particles, combo, and kill feed — but NOT score/kills/wave progress.

### UI (`ui/`)

- `hud.js` — in-game HUD (HP, ammo, weapon bar, minimap, boss bar). Sets `player.weaponSlots` each frame for consistent weapon key binding.
- `shop.js` — scrollable shop overlay with `mouseWheelDelta` from `input.js`
- `menus.js` — start, pause, settings, perk select, game over screens
- `TextRenderer.js` — bitmap-style text rendering utility

### Map (`map/TileMap.js`)

Tile-based map with wall collision. `resolveCollision()` pushes entities out of walls. `isWall()` / `isWalkable()` for bullet and spawn checks.

### Key Constants (`config.js`)

- `ZOMBIES_PER_WAVE = 15` — kills needed per wave
- `MAX_ZOMBIES = 150` — entity cap (furthest culled)
- `MAX_PARTICLES = 800`, `MAX_BULLETS = 300`

## Conventions

- All game text is in Chinese (zh-CN)
- Pixel-art rendering: integer coordinates (`| 0`), no anti-aliasing
- Color palette: dark backgrounds (#0a0a15), red/gold accents for danger/rewards
- Entity cleanup uses swap-and-pop pattern for O(1) removal from arrays
- `window.__game` exposes `{ zombies, bullets, particles, pickups, player }` for cross-module access (used by hazards, bosses)
