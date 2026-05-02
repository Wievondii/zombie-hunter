// Fixed game resolution — 640×360 pixel-perfect on all 16:9 screens
// 2560×1440 → 4x, 1920×1080 → 3x, 3840×2160 → 6x
export const GAME_WIDTH = 640;
export const GAME_HEIGHT = 360;
export const PIXEL_SCALE = 3; // kept for reference, no longer affects IW/IH

export let IW = GAME_WIDTH;
export let IH = GAME_HEIGHT;

export const GRID_CELL = 40;
export let GRID_COLS = Math.ceil(IW / GRID_CELL) + 1;
export let GRID_ROWS = Math.ceil(IH / GRID_CELL) + 1;

export const PICKUP_RADIUS = 22;
export const MAX_PARTICLES = 800;
export const MAX_BULLETS = 300;
export const MAX_ZOMBIES = 150;
export const PI2 = Math.PI * 2;
export const SAVE_KEY = 'pixel_zombie_hunter_v3';
export const GAME_VERSION = '3.0';
export const ZOMBIES_PER_WAVE = 15;

export function recalcSize() {
  IW = GAME_WIDTH;
  IH = GAME_HEIGHT;
  GRID_COLS = Math.ceil(IW / GRID_CELL) + 1;
  GRID_ROWS = Math.ceil(IH / GRID_CELL) + 1;
}
