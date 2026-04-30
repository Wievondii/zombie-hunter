import { IW, IH } from '../config.js';

export class TransitionManager {
  constructor() {
    this.active = false;
    this.type = 'fade'; // 'fade', 'pixelate', 'slide'
    this.progress = 0;
    this.duration = 0.5;
    this.direction = 'in'; // 'in' = appearing, 'out' = disappearing
    this.callback = null;
    this.color = '#000';
  }

  start(type = 'fade', direction = 'out', duration = 0.5, callback = null, color = '#000') {
    this.active = true;
    this.type = type;
    this.direction = direction;
    this.progress = 0;
    this.duration = duration;
    this.callback = callback;
    this.color = color;
  }

  fadeIn(duration = 0.5, callback = null) {
    this.start('fade', 'in', duration, callback);
  }

  fadeOut(duration = 0.5, callback = null, color = '#000') {
    this.start('fade', 'out', duration, callback, color);
  }

  update(dt) {
    if (!this.active) return;
    this.progress += dt / this.duration;
    if (this.progress >= 1) {
      this.progress = 1;
      this.active = false;
      if (this.callback) this.callback();
    }
  }

  draw(c) {
    if (!this.active) return;

    const p = this.direction === 'out' ? this.progress : 1 - this.progress;

    switch (this.type) {
      case 'fade': {
        c.fillStyle = this.color;
        c.globalAlpha = p;
        c.fillRect(0, 0, IW, IH);
        c.globalAlpha = 1;
        break;
      }
      case 'pixelate': {
        const pixelSize = Math.floor(p * 20) + 1;
        if (pixelSize > 1) {
          // Sample and draw pixelated blocks
          for (let y = 0; y < IH; y += pixelSize) {
            for (let x = 0; x < IW; x += pixelSize) {
              c.fillStyle = this.color;
              c.globalAlpha = p * 0.8;
              c.fillRect(x, y, pixelSize, pixelSize);
            }
          }
          c.globalAlpha = 1;
        }
        break;
      }
      case 'slide': {
        const slideW = Math.floor(IW * p);
        c.fillStyle = this.color;
        c.fillRect(0, 0, slideW, IH);
        break;
      }
    }
  }
}
