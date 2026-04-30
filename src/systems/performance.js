export const perf = {
  level: 2, // 0=low, 1=medium, 2=high
  frameTimeAvg: 0,
  fps: 60,

  update(dt) {
    this.frameTimeAvg = this.frameTimeAvg * 0.95 + dt * 1000 * 0.05;
    this.fps = this.fps * 0.95 + (1 / dt) * 0.05;
    if (this.frameTimeAvg > 22 && this.level > 0) this.level--;
    else if (this.frameTimeAvg < 14 && this.level < 2) this.level++;
  },

  get particleMult() { return this.level === 0 ? 0.4 : this.level === 1 ? 0.7 : 1; },
  get maxParticles() { return this.level === 0 ? 300 : this.level === 1 ? 500 : 800; },
  get skipLighting() { return this.level === 0; },
};
