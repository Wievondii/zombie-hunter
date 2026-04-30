import { spawnFloatingText } from './particles.js';

export const comboSystem = {
  count: 0,
  timer: 0,
  multiplier: 1,
  maxTimer: 3,

  onKill(x, y) {
    this.count++;
    this.timer = this.maxTimer;
    if (this.count >= 20) { this.multiplier = 5; spawnFloatingText(x, y - 15, 'x5 COMBO!', '#FF1744', 1); }
    else if (this.count >= 10) { this.multiplier = 3; spawnFloatingText(x, y - 15, 'x3 COMBO!', '#FF9800', 1); }
    else if (this.count >= 5) { this.multiplier = 2; spawnFloatingText(x, y - 15, 'x2 COMBO!', '#FFD700', 1); }
  },

  update(dt) {
    if (this.timer > 0) { this.timer -= dt; if (this.timer <= 0) { this.count = 0; this.multiplier = 1; } }
  },

  addScore(base) { return base * this.multiplier; },

  reset() { this.count = 0; this.timer = 0; this.multiplier = 1; },
};
