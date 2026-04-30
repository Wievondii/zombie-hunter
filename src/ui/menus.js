import { IW, IH, PI2, GAME_VERSION } from '../config.js';
import { rgba, loadData, saveData } from '../utils.js';
import { PERKS } from '../data.js';
import { audio } from '../audio.js';
import { spawnFloatingText } from '../systems/particles.js';
import { drawText, drawBar, FONT } from './TextRenderer.js';

let crtEnabled = false;
export let perkChoices = [];
export let showPerfMonitor = false;
export let settingsLayoutData = null;
let fpsArr = [];

export function generatePerkChoices() {
  const shuffled = [...PERKS].sort(() => Math.random() - 0.5);
  perkChoices = shuffled.slice(0, 3);
}

export function pushFps(dt) { fpsArr.push(1 / dt); if (fpsArr.length > 60) fpsArr.shift(); }

// ==================== START SCREEN ====================
export function drawStartUI(c) {
  c.fillStyle = 'rgba(0,0,0,0.7)'; c.fillRect(0, 0, IW, IH);
  const t = Date.now() / 1000;
  c.fillStyle = 'rgba(255,68,68,0.08)';
  for (let i = 0; i < 15; i++) {
    const x = (Math.sin(t * 0.3 + i * 2.1) * 0.4 + 0.5) * IW;
    const y = (Math.cos(t * 0.4 + i * 1.7) * 0.4 + 0.5) * IH;
    c.beginPath(); c.arc(x, y, 20 + Math.sin(t + i) * 8, 0, PI2); c.fill();
  }

  drawText(c, '僵尸猎人', IW / 2, IH * 0.32, { size: FONT.TITLE(), color: '#FF4444', bold: true, align: 'center' });
  drawText(c, `PIXEL ZOMBIE HUNTER v${GAME_VERSION}`, IW / 2, IH * 0.40, { size: FONT.SUBTITLE(), color: '#FFD700', align: 'center' });

  // Zombie icons
  const iconY = IH * 0.46;
  c.fillStyle = '#5D8A3C'; c.fillRect(IW / 2 - 15, iconY - 8, 12, 14); c.fillRect(IW / 2 - 19, iconY - 14, 8, 8);
  c.fillStyle = '#FF0000'; c.fillRect(IW / 2 - 17, iconY - 12, 2, 2); c.fillRect(IW / 2 - 13, iconY - 12, 2, 2);
  c.fillStyle = '#D4843C'; c.fillRect(IW / 2 + 3, iconY - 7, 10, 13); c.fillRect(IW / 2 + 1, iconY - 12, 7, 7);
  c.fillStyle = '#FF0000'; c.fillRect(IW / 2 + 3, iconY - 10, 2, 2); c.fillRect(IW / 2 + 7, iconY - 10, 2, 2);

  const body = FONT.BODY();
  drawText(c, 'WASD 移动 | 鼠标瞄准&射击', IW / 2, IH * 0.58, { size: body, color: '#FFF', align: 'center' });
  drawText(c, '1-4 切换武器 | E 打开商店 | ESC 暂停', IW / 2, IH * 0.63, { size: body, color: '#FFF', align: 'center' });
  drawText(c, '击杀僵尸获取金币 | 购买更强武器', IW / 2, IH * 0.68, { size: body, color: '#FFF', align: 'center' });

  const sd = loadData(); const hs = sd?.highScore || 0;
  if (hs > 0) drawText(c, `最高分: ${hs}`, IW / 2, IH * 0.73, { size: FONT.SMALL(), color: '#888', align: 'center' });

  const pulse = Math.sin(Date.now() / 800) * 0.3 + 0.7;
  drawText(c, '点击开始游戏', IW / 2, IH * 0.82, { size: FONT.SUBTITLE(), color: '#FFD700', align: 'center', bold: true, alpha: pulse });
}

// ==================== GAME OVER ====================
export function drawGameOverUI(c, score, waveNumber, player) {
  c.fillStyle = 'rgba(0,0,0,0.85)'; c.fillRect(0, 0, IW, IH);
  const t = Date.now() / 1000;
  c.fillStyle = 'rgba(255,0,0,0.04)';
  for (let i = 0; i < 10; i++) {
    const x = (Math.sin(t * 0.5 + i * 1.8) * 0.3 + 0.5) * IW;
    const y = (Math.cos(t * 0.6 + i * 2.2) * 0.3 + 0.5) * IH;
    c.beginPath(); c.arc(x, y, 30 + Math.sin(t + i) * 10, 0, PI2); c.fill();
  }

  drawText(c, '游戏结束', IW / 2, IH * 0.15, { size: FONT.TITLE(), color: '#FF4444', bold: true, align: 'center' });
  const body = FONT.BODY();
  drawText(c, `最终得分: ${score}`, IW / 2, IH * 0.30, { size: body, color: '#FFD700', align: 'center' });
  drawText(c, `到达波次: ${waveNumber}`, IW / 2, IH * 0.36, { size: body, color: '#FFD700', align: 'center' });
  drawText(c, `持有金币: ${player.coins}`, IW / 2, IH * 0.42, { size: body, color: '#FFD700', align: 'center' });
  drawText(c, `武器数: ${player.weapons.length}`, IW / 2, IH * 0.48, { size: FONT.SMALL(), color: '#AAA', align: 'center' });

  const sd = loadData(); const hs = sd?.highScore || 0;
  if (score > hs) drawText(c, '新纪录!', IW / 2, IH * 0.56, { size: FONT.SUBTITLE(), color: '#FF4444', bold: true, align: 'center' });
  else if (hs > 0) drawText(c, `最高分: ${hs}`, IW / 2, IH * 0.56, { size: FONT.SMALL(), color: '#888', align: 'center' });

  drawText(c, '点击任意位置重新开始', IW / 2, IH * 0.70, { size: body, color: '#FFF', align: 'center', bold: true });
}

// ==================== PAUSE ====================
let mouseX = 0, mouseY = 0;
export function setMenuMouse(x, y) { mouseX = x; mouseY = y; }

export function drawPauseUI(c, waveNumber, score, player) {
  c.fillStyle = 'rgba(0,0,0,0.65)'; c.fillRect(0, 0, IW, IH);
  drawText(c, '暂停', IW / 2, IH * 0.18, { size: FONT.TITLE(), color: '#FFD700', bold: true, align: 'center' });
  drawText(c, `波次: ${waveNumber} | 得分: ${score} | 金币: ${player.coins}`, IW / 2, IH * 0.28, {
    size: FONT.SMALL(), color: '#AAA', align: 'center',
  });

  const opts = ['继续游戏', '设置', '退出到标题'];
  const btnW = Math.min(200, IW * 0.3);
  const btnH = Math.max(20, IH * 0.05);
  const startY = IH * 0.40;

  return opts.map((opt, i) => {
    const y = startY + i * (btnH + IH * 0.02);
    const x = IW / 2 - btnW / 2;
    const hovered = mouseX >= x && mouseX <= x + btnW && mouseY >= y && mouseY <= y + btnH;
    c.fillStyle = hovered ? '#3D4A3D' : '#2D2D3F';
    c.fillRect(x, y, btnW, btnH);
    c.strokeStyle = hovered ? '#4CAF50' : '#4A4A6F';
    c.lineWidth = 1; c.strokeRect(x, y, btnW, btnH);
    drawText(c, opt, IW / 2, y + btnH / 2, {
      size: FONT.BODY(), color: hovered ? '#4CAF50' : '#FFF', align: 'center', baseline: 'middle', bold: true,
    });
    return { x, y, w: btnW, h: btnH };
  });
}

export function handlePauseClick(mx, my) {
  const btnW = Math.min(200, IW * 0.3);
  const btnH = Math.max(20, IH * 0.05);
  const startY = IH * 0.40;
  for (let i = 0; i < 3; i++) {
    const y = startY + i * (btnH + IH * 0.02);
    const x = IW / 2 - btnW / 2;
    if (mx >= x && mx <= x + btnW && my >= y && my <= y + btnH) {
      audio.click();
      return i;
    }
  }
  return -1;
}

// ==================== SETTINGS ====================
export function drawSettingsUI(c, mx, my) {
  c.fillStyle = 'rgba(0,0,0,0.85)'; c.fillRect(0, 0, IW, IH);
  const pW = Math.min(350, IW * 0.5);
  const pH = Math.min(300, IH * 0.7);
  const pX = IW / 2 - pW / 2;
  const pY = IH / 2 - pH / 2;

  c.fillStyle = '#2D2D3F'; c.fillRect(pX, pY, pW, pH);
  c.strokeStyle = '#4A4A6F'; c.lineWidth = 2; c.strokeRect(pX, pY, pW, pH); c.lineWidth = 1;

  drawText(c, '设置', IW / 2, pY + IH * 0.04, { size: FONT.SUBTITLE(), color: '#FFD700', bold: true, align: 'center' });

  const sliders = [
    { label: '主音量', val: audio.masterVol, key: 'master' },
    { label: '音效', val: audio.sfxVol, key: 'sfx' },
    { label: '音乐', val: audio.musicVol, key: 'music' },
  ];
  const sY = pY + IH * 0.10;
  const slX = pX + pW * 0.3;
  const slW = pW * 0.5;
  const slH = Math.max(4, IH * 0.012);

  sliders.forEach((s, i) => {
    const y = sY + i * IH * 0.08;
    drawText(c, s.label, pX + pW * 0.05, y + slH / 2, {
      size: FONT.SMALL(), color: '#FFF', baseline: 'middle',
    });
    c.fillStyle = '#333'; c.fillRect(slX, y, slW, slH);
    c.fillStyle = '#FFD700'; c.fillRect(slX, y, slW * s.val, slH);
    c.fillStyle = '#FFF'; c.fillRect(slX + slW * s.val - 2, y - 2, 4, slH + 4);
    drawText(c, `${Math.round(s.val * 100)}%`, pX + pW * 0.88, y + slH / 2, {
      size: FONT.TINY(), color: '#AAA', align: 'right', baseline: 'middle',
    });
  });

  // CRT toggle
  const crtY = sY + sliders.length * IH * 0.08 + IH * 0.04;
  drawText(c, 'CRT扫描线', pX + pW * 0.05, crtY + 6, { size: FONT.SMALL(), color: '#FFF', baseline: 'middle' });
  c.fillStyle = crtEnabled ? '#4CAF50' : '#F44336';
  c.fillRect(pX + pW * 0.6, crtY, pW * 0.15, 14);
  drawText(c, crtEnabled ? 'ON' : 'OFF', pX + pW * 0.675, crtY + 7, {
    size: FONT.TINY(), color: '#FFF', align: 'center', baseline: 'middle', bold: true,
  });

  // Fullscreen
  const fsY = crtY + IH * 0.06;
  drawText(c, '全屏模式 (F11)', pX + pW * 0.05, fsY + 6, { size: FONT.SMALL(), color: '#FFF', baseline: 'middle' });

  // Perf monitor
  const pmY = fsY + IH * 0.06;
  drawText(c, '性能监视器 (F3)', pX + pW * 0.05, pmY + 6, { size: FONT.SMALL(), color: '#FFF', baseline: 'middle' });
  c.fillStyle = showPerfMonitor ? '#4CAF50' : '#F44336';
  c.fillRect(pX + pW * 0.6, pmY, pW * 0.15, 14);
  drawText(c, showPerfMonitor ? 'ON' : 'OFF', pX + pW * 0.675, pmY + 7, {
    size: FONT.TINY(), color: '#FFF', align: 'center', baseline: 'middle', bold: true,
  });

  drawText(c, '按 ESC 返回', IW / 2, pY + pH - IH * 0.04, {
    size: FONT.TINY(), color: '#666', align: 'center',
  });

  settingsLayoutData = { panelX: pX, panelY: pY, panelW: pW, panelH: pH, sliders, sliderStartY: sY, slX, slW, slH, crtY, fsY, pmY };
}

export function handleSettingsClick(mx, my) {
  if (!settingsLayoutData) return;
  const { panelX, panelY, panelW, panelH, sliders, sliderStartY, slX, slW, slH, crtY, fsY, pmY } = settingsLayoutData;

  sliders.forEach((s, i) => {
    const y = sliderStartY + i * IH * 0.08;
    if (mx >= slX && mx <= slX + slW && my >= y && my <= y + slH + 4) {
      const v = Math.max(0, Math.min(1, (mx - slX) / slW));
      if (s.key === 'master') { audio.setMasterVol(v); audio.masterVol = v; }
      else if (s.key === 'sfx') { audio.setSfxVol(v); audio.sfxVol = v; }
      else if (s.key === 'music') { audio.setMusicVol(v); audio.musicVol = v; }
      saveData({ highScore: loadData()?.highScore || 0, settings: { masterVol: audio.masterVol, sfxVol: audio.sfxVol, musicVol: audio.musicVol } });
    }
  });

  if (mx >= panelX + panelW * 0.6 && mx <= panelX + panelW * 0.75 && my >= crtY && my <= crtY + 14) {
    crtEnabled = !crtEnabled;
    document.body.classList.toggle('crt-scanlines', crtEnabled);
  }
  if (mx >= panelX && mx <= panelX + panelW && my >= fsY && my <= fsY + 14) {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen();
  }
  if (mx >= panelX + panelW * 0.6 && mx <= panelX + panelW * 0.75 && my >= pmY && my <= pmY + 14) {
    showPerfMonitor = !showPerfMonitor;
  }
}

// ==================== PERK SELECT ====================
export function drawPerkSelectUI(c, mx, my) {
  c.fillStyle = 'rgba(0,0,0,0.85)'; c.fillRect(0, 0, IW, IH);
  drawText(c, '选择增益', IW / 2, IH * 0.08, { size: FONT.TITLE(), color: '#FFD700', bold: true, align: 'center' });
  drawText(c, '每5波选择一个永久增益', IW / 2, IH * 0.14, { size: FONT.SMALL(), color: '#AAA', align: 'center' });

  const cardW = Math.min(150, IW * 0.22);
  const cardH = Math.min(160, IH * 0.45);
  const gap = Math.max(10, IW * 0.02);
  const totalW = cardW * 3 + gap * 2;
  const startX = IW / 2 - totalW / 2;
  const startY = IH * 0.20;

  perkChoices.forEach((p, i) => {
    const x = startX + i * (cardW + gap);
    const y = startY;
    const hovered = mx >= x && mx <= x + cardW && my >= y && my <= y + cardH;

    c.fillStyle = hovered ? '#2D3A2D' : '#1D1D2F';
    c.fillRect(x, y, cardW, cardH);
    c.strokeStyle = hovered ? '#4CAF50' : '#4A4A6F';
    c.lineWidth = 2; c.strokeRect(x, y, cardW, cardH); c.lineWidth = 1;

    drawText(c, p.name, x + cardW / 2, y + cardH * 0.25, {
      size: FONT.BODY(), color: '#FFD700', bold: true, align: 'center',
    });
    drawText(c, p.desc, x + cardW / 2, y + cardH * 0.50, {
      size: FONT.SMALL(), color: '#CCC', align: 'center',
    });

    if (hovered) {
      c.fillStyle = rgba('#4CAF50', 0.15);
      c.fillRect(x, y, cardW, cardH);
    }
  });
}

export function handlePerkClick(mx, my, player) {
  const cardW = Math.min(150, IW * 0.22);
  const cardH = Math.min(160, IH * 0.45);
  const gap = Math.max(10, IW * 0.02);
  const totalW = cardW * 3 + gap * 2;
  const startX = IW / 2 - totalW / 2;
  const startY = IH * 0.20;

  for (let i = 0; i < perkChoices.length; i++) {
    const x = startX + i * (cardW + gap);
    if (mx >= x && mx <= x + cardW && my >= startY && my <= startY + cardH) {
      perkChoices[i].apply(player);
      audio.perkSelect();
      spawnFloatingText(player.x, player.y - 20, perkChoices[i].name, '#4CAF50');
      return true;
    }
  }
  return false;
}

// ==================== PERFORMANCE MONITOR ====================
export function drawPerfMonitor(c) {
  if (!showPerfMonitor || fpsArr.length === 0) return;
  const avg = fpsArr.reduce((a, b) => a + b, 0) / fpsArr.length;
  c.fillStyle = 'rgba(0,0,0,0.6)';
  c.fillRect(4, IH - 70, 120, 65);
  const s = FONT.TINY();
  drawText(c, `FPS: ${avg.toFixed(0)}`, 8, IH - 58, { size: s, color: avg >= 50 ? '#4CAF50' : avg >= 30 ? '#FF9800' : '#F44336', bold: true });
  drawText(c, `僵尸: ${window.__game?.zombies?.length ?? 0}`, 8, IH - 46, { size: s, color: '#AAA' });
  drawText(c, `子弹: ${window.__game?.bullets?.length ?? 0}`, 8, IH - 34, { size: s, color: '#AAA' });
  drawText(c, `粒子: ${window.__game?.particles?.length ?? 0}`, 8, IH - 22, { size: s, color: '#AAA' });
}
