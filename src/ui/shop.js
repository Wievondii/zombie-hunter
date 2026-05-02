import { IW, IH } from '../config.js';
import { WEAPON_DATA, SHOP_ITEMS } from '../data.js';
import { audio } from '../audio.js';
import { triggerShake } from '../systems/effects.js';
import { spawnFloatingText } from '../systems/particles.js';
import { drawText, FONT } from './TextRenderer.js';

export let shopLayoutData = null;
let shopScrollY = 0;

export function scrollShop(delta) {
  shopScrollY += delta;
}

export function drawShopUI(c, player) {
  c.fillStyle = 'rgba(0,0,0,0.75)'; c.fillRect(0, 0, IW, IH);
  const pW = Math.min(420, IW * 0.6);
  const pH = Math.min(380, IH * 0.85);
  const pX = IW / 2 - pW / 2;
  const pY = IH / 2 - pH / 2;

  c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillRect(pX + 4, pY + 4, pW, pH);
  c.fillStyle = '#2D2D3F'; c.fillRect(pX, pY, pW, pH);
  c.strokeStyle = '#4A4A6F'; c.lineWidth = 2; c.strokeRect(pX, pY, pW, pH); c.lineWidth = 1;

  drawText(c, '商店', IW / 2, pY + pH * 0.06, { size: FONT.SUBTITLE(), color: '#FFD700', bold: true, align: 'center' });
  drawText(c, `持有金币: ${player.coins}`, IW / 2, pY + pH * 0.12, { size: FONT.BODY(), color: '#FFD700', align: 'center', bold: true });

  const iStartY = pY + pH * 0.18;
  const iH = Math.max(28, pH * 0.08);
  const itemsAreaTop = iStartY;
  const itemsAreaBottom = pY + pH - pH * 0.08;
  const visibleH = itemsAreaBottom - itemsAreaTop;
  const totalContentH = SHOP_ITEMS.length * iH;
  const maxScroll = Math.max(0, totalContentH - visibleH);
  shopScrollY = Math.max(0, Math.min(shopScrollY, maxScroll));

  // Clip to items area
  c.save();
  c.beginPath();
  c.rect(pX + 8, itemsAreaTop, pW - 16, visibleH);
  c.clip();

  SHOP_ITEMS.forEach((item, idx) => {
    const iy = iStartY + idx * iH - shopScrollY;
    if (iy + iH < itemsAreaTop || iy > itemsAreaBottom) return;
    const alreadyOwned = item.type === 'weapon' && player.weapons.includes(item.weaponKey);
    const canAfford = player.coins >= item.price;
    const isMaxAmmo = item.type === 'ammo' && player.ammo >= player.maxAmmo;
    const isFullHp = item.type === 'health' && player.hp >= player.maxHp;
    const isMaxUpgrade = item.type === 'upgrade' && player.weaponUpgrades[item.stat] >= 0.5;
    const canBuy = !alreadyOwned && canAfford && !isMaxAmmo && !isFullHp && !isMaxUpgrade;

    c.fillStyle = alreadyOwned || isMaxAmmo || isFullHp || isMaxUpgrade ? '#3A3A3A' : canBuy ? '#3D4A3D' : '#4A3A3A';
    c.fillRect(pX + 10, iy, pW - 20, iH - 2);
    c.fillStyle = '#555'; c.fillRect(pX + 10, iy, pW - 20, 1);

    drawText(c, item.name, pX + 18, iy + iH * 0.35, {
      size: FONT.SMALL(), color: '#FFF', bold: true, baseline: 'middle',
    });

    if (item.type === 'weapon' && WEAPON_DATA[item.weaponKey]) {
      drawText(c, WEAPON_DATA[item.weaponKey].description, pX + 18, iy + iH * 0.7, {
        size: FONT.TINY(), color: '#AAA', baseline: 'middle',
      });
    } else if (item.type === 'upgrade') {
      drawText(c, item.desc || `升级${item.stat}`, pX + 18, iy + iH * 0.7, {
        size: FONT.TINY(), color: '#AAA', baseline: 'middle',
      });
    }

    const statusX = pX + pW - 18;
    if (alreadyOwned) drawText(c, '已拥有', statusX, iy + iH / 2, { size: FONT.TINY(), color: '#888', align: 'right', baseline: 'middle' });
    else if (isMaxAmmo) drawText(c, '弹药已满', statusX, iy + iH / 2, { size: FONT.TINY(), color: '#888', align: 'right', baseline: 'middle' });
    else if (isFullHp) drawText(c, '生命已满', statusX, iy + iH / 2, { size: FONT.TINY(), color: '#888', align: 'right', baseline: 'middle' });
    else if (isMaxUpgrade) drawText(c, '已满级', statusX, iy + iH / 2, { size: FONT.TINY(), color: '#888', align: 'right', baseline: 'middle' });
    else drawText(c, `💰 ${item.price}`, statusX, iy + iH / 2, { size: FONT.SMALL(), color: canAfford ? '#FFD700' : '#FF4444', align: 'right', baseline: 'middle', bold: true });
  });

  c.restore();

  // Scroll indicator
  if (maxScroll > 0) {
    const barH = Math.max(10, visibleH * (visibleH / totalContentH));
    const barY = itemsAreaTop + (shopScrollY / maxScroll) * (visibleH - barH);
    c.fillStyle = 'rgba(255,255,255,0.2)';
    c.fillRect(pX + pW - 6, barY, 3, barH);
  }

  // Scroll hint
  if (maxScroll > 0) {
    drawText(c, '滚轮滚动', IW / 2, itemsAreaBottom + 4, {
      size: FONT.TINY(), color: '#555', align: 'center',
    });
  }

  drawText(c, '按 E 关闭 | 点击购买', IW / 2, pY + pH - pH * 0.03, {
    size: FONT.TINY(), color: '#666', align: 'center',
  });

  shopLayoutData = { panelX: pX, panelY: pY, panelW: pW, panelH: pH, itemStartY: iStartY, itemHeight: iH, items: SHOP_ITEMS, itemsAreaTop, itemsAreaBottom, scrollY: () => shopScrollY };
}

export function handleShopClick(mx, my, player) {
  if (!shopLayoutData) return;
  const { panelX, panelY, panelW, panelH, itemStartY, itemHeight, items, itemsAreaTop, itemsAreaBottom, scrollY } = shopLayoutData;
  if (mx < panelX || mx > panelX + panelW || my < panelY || my > panelY + panelH) return;
  if (my < itemsAreaTop || my > itemsAreaBottom) return;
  const scroll = scrollY();
  const relY = my - itemStartY + scroll;
  const idx = (relY / itemHeight) | 0;
  if (idx < 0 || idx >= items.length || relY < 0) return;
  const item = items[idx];
  const alreadyOwned = item.type === 'weapon' && player.weapons.includes(item.weaponKey);
  const canAfford = player.coins >= item.price;
  const isMaxAmmo = item.type === 'ammo' && player.ammo >= player.maxAmmo;
  const isFullHp = item.type === 'health' && player.hp >= player.maxHp;
  const isMaxUpgrade = item.type === 'upgrade' && player.weaponUpgrades[item.stat] >= 0.5;
  if (alreadyOwned || !canAfford || isMaxAmmo || isFullHp || isMaxUpgrade) return;
  player.coins -= item.price;
  if (item.type === 'weapon') { player.addWeapon(item.weaponKey); player.switchWeapon(player.weapons.indexOf(item.weaponKey)); spawnFloatingText(player.x, player.y - 20, `获得 ${item.name}!`, '#FFD700'); }
  else if (item.type === 'ammo') { player.ammo = Math.min(player.maxAmmo, player.ammo + item.amount); spawnFloatingText(player.x, player.y - 20, `+${item.amount} 弹药`, '#88CCFF'); }
  else if (item.type === 'health') { player.hp = Math.min(player.maxHp, player.hp + item.amount); spawnFloatingText(player.x, player.y - 20, `+${item.amount} HP`, '#FF6666'); }
  else if (item.type === 'upgrade') { player.weaponUpgrades[item.stat] += item.amount; spawnFloatingText(player.x, player.y - 20, `升级! ${item.stat}`, '#4CAF50'); }
  audio.purchase(); triggerShake(1, 0.05);
}
