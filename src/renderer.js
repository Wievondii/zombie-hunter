import { IW, IH, PI2 } from './config.js';

export function drawCrosshair(c, mx, my) {
  const cx = mx | 0, cy = my | 0, sz = 8, gap = 3;
  c.fillStyle = '#FF4444';
  c.fillRect(cx - sz - gap, cy - 1, sz, 2);
  c.fillRect(cx + gap, cy - 1, sz, 2);
  c.fillRect(cx - 1, cy - sz - gap, 2, sz);
  c.fillRect(cx - 1, cy + gap, 2, sz);
  c.fillStyle = '#FFF';
  c.fillRect(cx - 1, cy - 1, 2, 2);
  c.fillStyle = '#FF0000';
  c.fillRect(cx, cy, 1, 1);
}
