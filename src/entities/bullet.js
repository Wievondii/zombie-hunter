import { IW, IH, MAX_BULLETS } from '../config.js';
import { rgba } from '../utils.js';

export const bullets = [];
export const acidProjectiles = [];

export function updateBullet(b, dt) {
  b.trail.push({ x: b.x, y: b.y, life: 0.08 });
  b.x += b.vx * dt; b.y += b.vy * dt;
  b.distanceTraveled += Math.hypot(b.vx, b.vy) * dt;
  if (b.distanceTraveled > b.maxDistance) b.alive = false;
  if (b.x < -20 || b.x > IW + 20 || b.y < -20 || b.y > IH + 20) b.alive = false;
  for (const t of b.trail) t.life -= dt;
  b.trail = b.trail.filter((t) => t.life > 0);
}

export function drawBullet(c, b) {
  for (const t of b.trail) {
    const a = t.life / 0.08;
    c.fillStyle = rgba(b.color, a * 0.6);
    c.fillRect(t.x - 1 | 0, t.y - 1 | 0, 2, 2);
  }
  c.fillStyle = b.color; c.fillRect(b.x - 1.5 | 0, b.y - 1.5 | 0, 3, 3);
  c.fillStyle = '#FFF'; c.fillRect(b.x - 0.5 | 0, b.y - 0.5 | 0, 1, 1);
}

export function updateAcid(a, dt) {
  a.x += a.vx * dt; a.y += a.vy * dt; a.life -= dt;
  if (a.life <= 0 || a.x < -20 || a.x > IW + 20 || a.y < -20 || a.y > IH + 20) a.alive = false;
}

export function drawAcid(c, a) {
  const pulse = 0.6 + 0.4 * Math.sin(a.life * 10);
  c.fillStyle = `rgba(76,175,80,${pulse})`; c.fillRect(a.x - 2 | 0, a.y - 2 | 0, 4, 4);
  c.fillStyle = `rgba(139,195,74,${pulse * 0.7})`; c.fillRect(a.x - 1 | 0, a.y - 1 | 0, 2, 2);
}

export function cleanupBullets() {
  // Swap-and-pop: O(n) without splice overhead
  for (let i = bullets.length - 1; i >= 0; i--) {
    if (!bullets[i].alive) {
      bullets[i] = bullets[bullets.length - 1];
      bullets.pop();
    }
  }
  if (bullets.length > MAX_BULLETS) bullets.length = MAX_BULLETS;
  for (let i = acidProjectiles.length - 1; i >= 0; i--) {
    if (!acidProjectiles[i].alive) {
      acidProjectiles[i] = acidProjectiles[acidProjectiles.length - 1];
      acidProjectiles.pop();
    }
  }
}

export function clearBullets() { bullets.length = 0; acidProjectiles.length = 0; }
