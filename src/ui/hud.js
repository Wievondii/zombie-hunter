import { IW, IH, ZOMBIES_PER_WAVE } from '../config.js';
import { rgba } from '../utils.js';
import { POWERUP_TYPES, WEAPON_DATA, SHOP_ITEMS } from '../data.js';
import { killFeed } from '../systems/killfeed.js';
import { comboSystem } from '../systems/combo.js';
import { waveState } from '../systems/waves.js';
import { zombies } from '../entities/zombie.js';
import { acidProjectiles } from '../entities/bullet.js';
import { hazards } from '../entities/hazard.js';
import { powerups } from '../entities/powerup.js';
import { drawText, drawBar, FONT, measureText } from './TextRenderer.js';

// ==================== MINIMAP ====================
function drawMinimap(c) {
  const mmW = Math.max(60, IW * 0.12 | 0);
  const mmH = Math.max(40, IH * 0.12 | 0);
  const mmX = IW - mmW - 6;
  const mmY = 34;

  // Background
  c.fillStyle = 'rgba(0,0,0,0.7)';
  c.fillRect(mmX - 2, mmY - 2, mmW + 4, mmH + 4);
  c.fillStyle = '#111';
  c.fillRect(mmX, mmY, mmW, mmH);

  // Grid
  c.fillStyle = 'rgba(255,255,255,0.04)';
  for (let i = 0; i < mmW; i += 10) c.fillRect(mmX + i, mmY, 1, mmH);
  for (let i = 0; i < mmH; i += 10) c.fillRect(mmX, mmY + i, mmW, 1);

  // Entities
  const drawDot = (arr, color, sz = 2) => {
    c.fillStyle = color;
    for (const e of arr) {
      if (!e.alive) continue;
      c.fillRect(mmX + (e.x / IW) * mmW | 0, mmY + (e.y / IH) * mmH | 0, sz, sz);
    }
  };
  drawDot(hazards, '#FF5722');
  drawDot(zombies, '#FF4444');
  drawDot(powerups, '#FFD700');
  drawDot(acidProjectiles, '#4CAF50', 1);

  // Player dot (larger, centered)
  const p = window.__game?.player;
  if (p?.alive) {
    c.fillStyle = '#4CAF50';
    c.fillRect(mmX + (p.x / IW) * mmW - 1 | 0, mmY + (p.y / IH) * mmH - 1 | 0, 3, 3);
  }

  // Border
  c.strokeStyle = '#4A4A6F'; c.lineWidth = 1;
  c.strokeRect(mmX, mmY, mmW, mmH);

  // Legend (below minimap)
  const legY = mmY + mmH + 4;
  const legSize = FONT.TINY();
  const entries = [
    ['#4CAF50', '玩家'], ['#FF4444', '僵尸'], ['#FFD700', '道具'],
    ['#FF5722', '危险'], ['#4CAF50', '酸液'],
  ];
  let legX = mmX;
  for (const [color, label] of entries) {
    c.fillStyle = color;
    c.fillRect(legX, legY + 1, 3, 3);
    legX += 4;
    drawText(c, label, legX, legY + legSize * 0.8, { size: legSize, color: '#888' });
    legX += measureText(c, label, legSize) + 4;
  }
}

// ==================== BOSS HP BAR ====================
function drawBossBar(c, boss) {
  if (!boss) return;
  const barW = Math.min(IW * 0.5, 300);
  const barH = Math.max(6, IH * 0.018 | 0);
  const barX = IW / 2 - barW / 2;
  const barY = 6;
  const hpR = boss.hp / boss.maxHp;

  // Background
  c.fillStyle = 'rgba(0,0,0,0.8)';
  c.fillRect(barX - 4, barY - 4, barW + 8, barH + 20);

  // Boss name
  drawText(c, boss.bossName || 'BOSS', barX, barY - 2, {
    size: FONT.SMALL(), color: '#FF4444', bold: true, baseline: 'top',
  });

  // HP text
  drawText(c, `${Math.ceil(boss.hp)}/${boss.maxHp}`, barX + barW, barY - 2, {
    size: FONT.SMALL(), color: '#FFF', align: 'right', baseline: 'top',
  });

  // HP bar
  const hpColor = hpR > 0.5 ? '#4CAF50' : hpR > 0.25 ? '#FF9800' : '#F44336';
  drawBar(c, barX, barY + FONT.SMALL() + 2, barW, barH, hpR, hpColor, '#333', '#111');
}

// ==================== MAIN HUD ====================
export function drawHUD(c, player, gameTime, score, kills) {
  // ---- Top bar background ----
  const topH = Math.max(24, IH * 0.07 | 0);
  c.fillStyle = 'rgba(0,0,0,0.75)';
  c.fillRect(0, 0, IW, topH);
  c.fillStyle = '#3D3D5C';
  c.fillRect(0, topH - 1, IW, 1);

  const bodySize = FONT.BODY();
  const smallSize = FONT.SMALL();
  const pad = Math.max(4, IW * 0.012 | 0);
  const y1 = topH * 0.35;  // top row baseline
  const y2 = topH * 0.78;  // bottom row baseline

  // ---- HP bar ----
  const hpX = pad;
  const hpW = Math.max(80, IW * 0.18 | 0);
  const hpH = Math.max(6, topH * 0.22 | 0);
  const hpY = pad;
  const hpR = player.hp / player.maxHp;
  const hpColor = hpR > 0.5 ? '#4CAF50' : hpR > 0.25 ? '#FF9800' : '#F44336';
  drawBar(c, hpX, hpY, hpW, hpH, hpR, hpColor);
  drawText(c, `HP ${Math.ceil(player.hp)}/${player.maxHp}`, hpX + hpW / 2, hpY + hpH / 2, {
    size: smallSize, color: '#FFF', bold: true, align: 'center', baseline: 'middle',
  });

  // ---- Stats row (right of HP bar) ----
  let sx = hpX + hpW + pad * 2;
  // Ammo
  drawText(c, `弹药: ${player.ammo}`, sx, y1, { size: bodySize, color: '#FFD700', bold: true });
  sx += measureText(c, `弹药: ${player.ammo}`, bodySize, true) + pad * 2;
  // Coins
  drawText(c, `金币: ${player.coins}`, sx, y1, { size: bodySize, color: '#FFD700', bold: true });
  sx += measureText(c, `金币: ${player.coins}`, bodySize, true) + pad * 2;
  // Wave
  drawText(c, `波次 ${waveState.number}`, sx, y1, { size: bodySize, color: '#FF8888', bold: true });
  sx += measureText(c, `波次 ${waveState.number}`, bodySize, true) + pad * 2;
  // Score
  drawText(c, `分数: ${score}`, sx, y1, { size: bodySize, color: '#FFF', bold: true });
  sx += measureText(c, `分数: ${score}`, bodySize, true) + pad * 2;
  // Kills
  drawText(c, `击杀: ${kills ?? 0}`, sx, y1, { size: bodySize, color: '#FF6666', bold: true });

  // ---- Second row: survival time + combo ----
  const mins = Math.floor(gameTime / 60);
  const secs = Math.floor(gameTime % 60);
  drawText(c, `时间: ${mins}:${secs.toString().padStart(2, '0')}`, pad, y2, {
    size: smallSize, color: '#AAA',
  });

  if (comboSystem.count >= 5) {
    const ca = Math.min(1, comboSystem.timer / 1);
    drawText(c, `${comboSystem.count}连杀 x${comboSystem.multiplier}`, pad + IW * 0.12, y2, {
      size: smallSize, color: '#FFD700', alpha: ca, bold: true,
    });
  }

  // ---- Player stats (if modified from defaults) ----
  let statX = pad + IW * 0.28;
  if (player.armorMult < 1) {
    drawText(c, `护甲: -${Math.round((1 - player.armorMult) * 100)}%`, statX, y2, {
      size: FONT.TINY(), color: '#90CAF9',
    });
    statX += measureText(c, `护甲: -${Math.round((1 - player.armorMult) * 100)}%`, FONT.TINY()) + pad;
  }
  if (player.critChance > 0) {
    drawText(c, `暴击: ${Math.round(player.critChance * 100)}%`, statX, y2, {
      size: FONT.TINY(), color: '#CE93D8',
    });
  }

  // ---- Boss HP bar ----
  const boss = zombies.find((z) => z.alive && z.boss);
  if (boss) drawBossBar(c, boss);

  // ---- Active powerups ----
  let puX = IW - pad;
  const puY = topH + 4;
  for (const k in player.activePowerups) {
    if (player.activePowerups[k] <= 0) continue;
    const pu = POWERUP_TYPES[k]; if (!pu) continue;
    const txt = `${pu.icon}${Math.ceil(player.activePowerups[k])}s`;
    const tw = measureText(c, txt, smallSize, true);
    puX -= tw + pad * 2;
    c.fillStyle = rgba(pu.color, 0.6);
    c.fillRect(puX - 2, puY - 2, tw + 4, smallSize + 4);
    drawText(c, txt, puX, puY + smallSize / 2, {
      size: smallSize, color: '#FFF', bold: true, baseline: 'middle',
    });
    puX -= pad;
  }

  // ---- Weapon bar ----
  const wbH = Math.max(28, IH * 0.07 | 0);
  const wbY = IH - wbH;
  c.fillStyle = 'rgba(0,0,0,0.8)';
  c.fillRect(0, wbY, IW, wbH);
  c.fillStyle = '#3D3D5C';
  c.fillRect(0, wbY, IW, 1);

  const allWN = ['pistol', 'shotgun', 'smg', 'rifle', 'sniper', 'launcher', 'minigun'];
  const ownedWeapons = allWN.filter(wn => player.weapons.includes(wn));
  const displayWeapons = ownedWeapons.length > 0 ? ownedWeapons : ['pistol'];
  const weaponKeys = ['1', '2', '3', '4', '5', '6', '7'];
  const slotW = Math.max(50, Math.min(70, IW * 0.09 | 0));
  const slotH = wbH - 6;
  const totalSlotW = displayWeapons.length * slotW + (displayWeapons.length - 1) * 4;
  let wStartX = IW / 2 - totalSlotW / 2;

  displayWeapons.forEach((wn, i) => {
    const wx = wStartX + i * (slotW + 4);
    const wy = wbY + 3;
    const equipped = player.currentWeapon === wn;
    const wd = WEAPON_DATA[wn];

    // Slot background
    if (equipped) {
      c.fillStyle = '#FFD700'; c.fillRect(wx - 1, wy - 1, slotW + 2, slotH + 2);
      c.fillStyle = '#3D2F00'; c.fillRect(wx, wy, slotW, slotH);
    } else {
      c.fillStyle = '#555'; c.fillRect(wx, wy, slotW, slotH);
    }

    // Weapon name
    const nameSize = FONT.SMALL();
    drawText(c, `[${weaponKeys[i]}] ${wd.name}`, wx + slotW / 2, wy + slotH * 0.3, {
      size: nameSize, color: '#FFF', bold: true, align: 'center', baseline: 'middle',
    });

    // Sub-text
    const subSize = FONT.TINY();
    const dmgLvl = Math.floor(player.weaponUpgrades.damage / 0.15);
    const spdLvl = Math.floor(-player.weaponUpgrades.fireRate / 0.03);
    const lvlStr = dmgLvl > 0 || spdLvl > 0 ? ` [${dmgLvl > 0 ? 'D' + dmgLvl : ''}${spdLvl > 0 ? 'S' + spdLvl : ''}]` : '';
    const sub = wd.ammoCost > 0 ? `消耗${wd.ammoCost}/发${lvlStr}` : `无限${lvlStr}`;
    drawText(c, sub, wx + slotW / 2, wy + slotH * 0.7, {
      size: subSize, color: '#AAA', align: 'center', baseline: 'middle',
    });
  });

  // ---- Current weapon stats (above weapon bar) ----
  const cwd = player.weaponData;
  if (cwd) {
    const infoY = wbY - smallSize - 4;
    const info = `伤害:${(cwd.damage * (1 + player.weaponUpgrades.damage) * player.damageMult).toFixed(1)} | 射速:${(1 / player.getEffectiveFireRate()).toFixed(1)}/s${cwd.penetrating ? ' | 穿透' : ''}`;
    drawText(c, info, IW / 2, infoY, {
      size: FONT.TINY(), color: '#999', align: 'center', baseline: 'bottom',
    });
  }

  // ---- Wave progress bar ----
  const wpW = Math.max(120, IW * 0.2 | 0);
  const wpH = Math.max(3, IH * 0.008 | 0);
  const wpX = IW / 2 - wpW / 2;
  const wpY = wbY - wpH - smallSize - 8;
  const wpR = waveState.killed / ZOMBIES_PER_WAVE;
  drawBar(c, wpX, wpY, wpW, wpH, wpR, '#FF8888', '#333', '#222');
  drawText(c, `${waveState.killed}/${ZOMBIES_PER_WAVE}`, IW / 2, wpY - 2, {
    size: FONT.TINY(), color: '#AAA', align: 'center', baseline: 'bottom',
  });

  // ---- Controls hint (first 8s) ----
  if (gameTime < 8) {
    const a = gameTime < 2 ? Math.min(1, gameTime / 2) : gameTime < 6 ? 1 : Math.max(0, (8 - gameTime) / 2);
    drawText(c, 'WASD移动 | 鼠标射击 | 1-7武器 | E商店 | ESC暂停 | 空格技能', IW / 2, wpY - 4, {
      size: FONT.TINY(), color: '#FFF', align: 'center', baseline: 'bottom', alpha: a * 0.9,
    });
  }

  // ---- Kill feed (right side, below minimap) ----
  const mmH = Math.max(40, IH * 0.12 | 0);
  for (let i = 0; i < killFeed.length; i++) {
    const kf = killFeed[i];
    const a = Math.min(1, kf.life / 0.5);
    drawText(c, kf.text, IW - 6, 34 + mmH + 20 + i * (smallSize + 2), {
      size: FONT.TINY(), color: kf.color, align: 'right', alpha: a,
    });
  }

  // ---- Minimap ----
  drawMinimap(c);
}
