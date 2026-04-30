import { PI2, PICKUP_RADIUS } from '../config.js';
import { audio } from '../audio.js';
import { spawnFloatingText } from '../systems/particles.js';
import { applyItemStats } from '../loot/LootSystem.js';

export const pickups = [];

export function updatePickups(dt, player) {
  for (let i = pickups.length - 1; i >= 0; i--) {
    const pk = pickups[i];
    pk.life -= dt; pk.bobOffset += dt * 4;
    if (pk.life <= 0) { pickups.splice(i, 1); continue; }
    if (!player.alive) continue;
    const dx = player.x - pk.x, dy = player.y - pk.y;
    const radius = player.pickupRadius || PICKUP_RADIUS;
    if (dx * dx + dy * dy < radius ** 2) {
      if (pk.type === 'coin') {
        player.coins += 1;
        audio.coinCollect();
        spawnFloatingText(pk.x, pk.y, '+1', '#FFD700');
      } else if (pk.type === 'ammo') {
        player.ammo = Math.min(player.maxAmmo, player.ammo + 8);
        audio.coinCollect();
        spawnFloatingText(pk.x, pk.y, '+8弹', '#88CCFF');
      } else if (pk.type === 'health') {
        player.hp = Math.min(player.maxHp, player.hp + 15);
        audio.purchase();
        spawnFloatingText(pk.x, pk.y, '+15HP', '#FF6666');
      } else if (pk.type === 'loot' && pk.item) {
        // Auto-equip loot
        applyItemStats(player, pk.item);
        audio.perkSelect();
        spawnFloatingText(pk.x, pk.y, `${pk.item.rarity.name} ${pk.item.name}`, pk.item.rarity.color, 1.2);
      }
      pickups.splice(i, 1);
    }
  }
}

export function drawPickup(c, pk) {
  const alpha = pk.life < 3 ? 0.4 + 0.3 * Math.sin(pk.life * 20) : 1;
  const bobY = Math.sin(pk.bobOffset) * 3;
  const px = pk.x | 0, py = (pk.y + bobY) | 0;
  c.globalAlpha = alpha;

  if (pk.type === 'coin') {
    c.fillStyle = '#FFD700'; c.fillRect(px - 3, py - 2, 6, 5); c.fillRect(px - 2, py - 3, 4, 7);
    c.fillStyle = '#FFEC8B'; c.fillRect(px - 1, py - 1, 2, 3);
    c.fillStyle = '#DAA520'; c.fillRect(px - 2, py, 4, 1);
  } else if (pk.type === 'ammo') {
    c.fillStyle = '#8B7355'; c.fillRect(px - 3, py - 3, 7, 7);
    c.fillStyle = '#A0896C'; c.fillRect(px - 2, py - 2, 5, 5);
    c.fillStyle = '#FFD700'; c.fillRect(px - 1, py - 1, 1, 3); c.fillRect(px + 1, py - 1, 1, 3);
  } else if (pk.type === 'health') {
    c.fillStyle = '#FF4444'; c.fillRect(px - 2, py - 1, 2, 2); c.fillRect(px + 1, py - 1, 2, 2);
    c.fillRect(px - 3, py, 7, 2); c.fillRect(px - 2, py + 1, 5, 2); c.fillRect(px - 1, py + 2, 3, 2); c.fillRect(px, py + 3, 1, 1);
    c.fillStyle = '#FF6666'; c.fillRect(px - 1, py, 3, 2);
  } else if (pk.type === 'loot' && pk.item) {
    // Loot item — diamond shape with rarity color
    const color = pk.item.rarity.color;
    const s = pk.size || 8;
    c.fillStyle = color;
    c.fillRect(px - s / 2, py - s / 4, s, s / 2);
    c.fillRect(px - s / 4, py - s / 2, s / 2, s);
    // Inner highlight
    c.fillStyle = '#FFF';
    c.fillRect(px - 1, py - 1, 2, 2);
    // Glow pulse
    const pulse = 0.3 + 0.2 * Math.sin(pk.bobOffset * 2);
    c.fillStyle = `rgba(${parseInt(color.slice(1, 3), 16)},${parseInt(color.slice(3, 5), 16)},${parseInt(color.slice(5, 7), 16)},${pulse})`;
    c.beginPath(); c.arc(px, py, s, 0, PI2); c.fill();
  }

  c.globalAlpha = 1;
}

export function clearPickups() { pickups.length = 0; }
