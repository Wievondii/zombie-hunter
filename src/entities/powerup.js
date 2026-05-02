import { PI2 } from '../config.js';
import { spawnFloatingText } from '../systems/particles.js';
import { triggerShake, triggerFlash } from '../systems/effects.js';
import { audio } from '../audio.js';
import { addLight } from '../systems/lighting.js';
import { zombies } from './zombie.js';
import { comboSystem } from '../systems/combo.js';

export const powerups = [];

export function updatePowerups(dt, player, waveState) {
  for (let i = powerups.length - 1; i >= 0; i--) {
    const p = powerups[i];
    p.life -= dt; p.bobOffset += dt * 3; p.timer += dt;
    if (p.life <= 0) { powerups.splice(i, 1); continue; }
    if (!player.alive) continue;
    if (Math.hypot(player.x - p.x, player.y - p.y) < 25) {
      if (p.type === 'nuke') {
        for (const z of zombies) {
          if (z.alive) { z.hp = 0; z.alive = false; z.onDeath(player); waveState.killed++; }
        }
        triggerShake(15, 0.5); audio.explosion(); triggerFlash('#FF1744'); addLight(player.x, player.y, 200, '#FF1744', 0.8);
      } else {
        player.activePowerups[p.type] = p.duration;
      }
      spawnFloatingText(p.x, p.y - 10, `${p.icon} ${p.name}`, '#E040FB', 1.2);
      powerups.splice(i, 1);
    }
  }
}

export function drawPowerUp(c, p) {
  const alpha = p.life < 3 ? 0.4 + 0.3 * Math.sin(p.life * 15) : 1;
  const bobY = Math.sin(p.bobOffset) * 4;
  const px = p.x | 0, py = (p.y + bobY) | 0;
  const pulse = 0.8 + 0.2 * Math.sin(p.timer * 4);
  c.globalAlpha = alpha;
  c.fillStyle = `rgba(${parseInt(p.color.slice(1,3),16)},${parseInt(p.color.slice(3,5),16)},${parseInt(p.color.slice(5,7),16)},${pulse})`;
  c.fillRect(px - 6, py - 6, 12, 12);
  c.fillStyle = '#FFF'; c.font = 'bold 8px Courier New'; c.textAlign = 'center'; c.fillText(p.icon, px, py + 3); c.textAlign = 'start';
  c.globalAlpha = 1;
}

export function clearPowerups() { powerups.length = 0; }
