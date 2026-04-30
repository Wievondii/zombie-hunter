import { PI2 } from '../config.js';
import { dist2 } from '../utils.js';
import { audio } from '../audio.js';
import { spawnParticles } from '../systems/particles.js';
import { triggerShake, triggerFlash } from '../systems/effects.js';
import { addLight } from '../systems/lighting.js';
import { bullets } from './bullet.js';

export const hazards = [];

export function createAcidPool(x, y) {
  return { x, y, type: 'acid', radius: 20 + Math.random() * 10, damage: 3, tickTimer: 0, alive: true, life: 20 + Math.random() * 10 };
}

export function createBarrel(x, y) {
  return { x, y, type: 'barrel', radius: 12, hp: 3, alive: true, exploded: false };
}

export function updateHazards(dt, player) {
  for (let i = hazards.length - 1; i >= 0; i--) {
    const h = hazards[i];
    if (h.type === 'acid') {
      h.life -= dt; h.tickTimer += dt;
      if (h.life <= 0) { hazards.splice(i, 1); continue; }
      if (h.tickTimer >= 0.5 && player.alive) {
        h.tickTimer = 0;
        if (dist2(player.x, player.y, h.x, h.y) < h.radius ** 2) player.takeDamage(h.damage);
      }
    }
    if (h.type === 'barrel' && !h.exploded) {
      for (const b of bullets) {
        if (!b.alive) continue;
        if (dist2(b.x, b.y, h.x, h.y) < h.radius ** 2) {
          h.hp--; b.alive = false;
          if (h.hp <= 0) {
            h.exploded = true; h.alive = false;
            audio.explosion(); triggerShake(10, 0.3); triggerFlash('#FF5722');
            spawnParticles(h.x, h.y, 30, ['#FF5722', '#FF9800', '#FFEB3B', '#FFF', '#BF360C'], 300, 0.6, 4);
            addLight(h.x, h.y, 120, '#FF5722', 0.6);
            if (player.alive && dist2(player.x, player.y, h.x, h.y) < 80 ** 2) player.takeDamage(25);
          }
        }
      }
    }
  }
}

export function drawHazard(c, h) {
  if (h.type === 'acid') {
    const a = 0.3 + 0.15 * Math.sin(h.life);
    c.fillStyle = `rgba(76,175,80,${a})`; c.beginPath(); c.arc(h.x, h.y, h.radius, 0, PI2); c.fill();
    c.fillStyle = `rgba(139,195,74,${a * 0.5})`; c.beginPath(); c.arc(h.x, h.y, h.radius * 0.6, 0, PI2); c.fill();
  } else if (h.type === 'barrel') {
    const px = h.x | 0, py = h.y | 0;
    c.fillStyle = '#5D4037'; c.fillRect(px - 8, py - 10, 16, 20);
    c.fillStyle = '#795548'; c.fillRect(px - 6, py - 8, 12, 16);
    c.fillStyle = '#FF5722'; c.fillRect(px - 3, py - 3, 6, 6);
    c.fillStyle = '#FF8A65'; c.fillRect(px - 2, py - 2, 4, 4);
    c.fillStyle = '#3E2723'; c.fillRect(px - 8, py - 10, 16, 2); c.fillRect(px - 8, py + 8, 16, 2);
  }
}

export function clearHazards() { hazards.length = 0; }
