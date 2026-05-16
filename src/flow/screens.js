import { IW, IH, PI2 } from '../config.js';
import { rgba } from '../utils.js';
import { CHARACTERS } from '../data/characters.js';
import { STAGES } from '../data/stages.js';
import { GAME_VERSION } from '../config.js';
import { dailyChallenge } from '../systems/daily.js';
import { achievements } from '../systems/achievements.js';
import { drawText, FONT } from '../ui/TextRenderer.js';

// ==================== TITLE SCREEN ====================
export function drawTitleScreen(c, mouseX, mouseY) {
  c.fillStyle = '#0a0a15';
  c.fillRect(0, 0, IW, IH);

  // Animated background particles
  const t = Date.now() / 1000;
  for (let i = 0; i < 25; i++) {
    const x = (Math.sin(t * 0.2 + i * 1.7) * 0.4 + 0.5) * IW;
    const y = (Math.cos(t * 0.3 + i * 2.3) * 0.4 + 0.5) * IH;
    const r = 15 + Math.sin(t + i) * 8;
    c.fillStyle = `rgba(255,68,68,${0.03 + 0.02 * Math.sin(t + i)})`;
    c.beginPath(); c.arc(x, y, r, 0, PI2); c.fill();
  }

  // Title
  drawText(c, '僵尸猎人', IW / 2, IH * 0.28, { size: 28, color: '#FF4444', bold: true, align: 'center' });
  drawText(c, `PIXEL ZOMBIE HUNTER v${GAME_VERSION}`, IW / 2, IH * 0.36, { size: 14, color: '#FFD700', align: 'center' });

  // Zombie icons
  const iconY = IH * 0.44;
  c.fillStyle = '#5D8A3C';
  c.fillRect(IW / 2 - 20, iconY - 10, 16, 18);
  c.fillRect(IW / 2 - 25, iconY - 18, 10, 10);
  c.fillStyle = '#FF0000';
  c.fillRect(IW / 2 - 22, iconY - 15, 3, 3);
  c.fillRect(IW / 2 - 17, iconY - 15, 3, 3);

  c.fillStyle = '#D4843C';
  c.fillRect(IW / 2 + 4, iconY - 8, 14, 16);
  c.fillRect(IW / 2 + 1, iconY - 15, 10, 9);
  c.fillStyle = '#FF0000';
  c.fillRect(IW / 2 + 4, iconY - 12, 3, 3);
  c.fillRect(IW / 2 + 9, iconY - 12, 3, 3);

  // Menu buttons
  const btnY = IH * 0.54;
  const btnW = 160;
  const btnH = 24;
  const btns = ['开始游戏', '每日挑战', '设置'];

  const hovereds = [];
  btns.forEach((label, i) => {
    const y = btnY + i * 30;
    const x = IW / 2 - btnW / 2;
    const hovered = mouseX >= x && mouseX <= x + btnW && mouseY >= y && mouseY <= y + btnH;
    hovereds.push(hovered);

    c.fillStyle = hovered ? '#3D4A3D' : '#2D2D3F';
    c.fillRect(x, y, btnW, btnH);
    c.strokeStyle = hovered ? '#4CAF50' : '#4A4A6F';
    c.lineWidth = 2;
    c.strokeRect(x, y, btnW, btnH);
    c.lineWidth = 1;

    drawText(c, label, IW / 2, y + btnH / 2, {
      size: FONT.BODY(), color: hovered ? '#4CAF50' : '#FFF', align: 'center', baseline: 'middle', bold: true,
    });
  });

  // Daily challenge info
  const daily = dailyChallenge;
  drawText(c, `每日挑战 ${daily.date} | 最高分: ${daily.bestScore} | 最高波次: ${daily.bestWave}`, IW / 2, IH * 0.49, {
    size: FONT.TINY(), color: '#888', align: 'center',
  });

  // Achievement progress
  const prog = achievements.getProgress();
  drawText(c, `成就: ${prog.unlocked}/${prog.total}`, IW / 2, IH * 0.52, {
    size: FONT.TINY(), color: '#666', align: 'center',
  });

  // Controls hint
  drawText(c, 'WASD移动 | 鼠标瞄准射击 | 1-7切换武器 | E商店 | ESC暂停 | 空格技能', IW / 2, IH * 0.92, {
    size: FONT.TINY(), color: '#666', align: 'center',
  });

  return { btnY, btnW, btnH, btns, hovereds };
}

// ==================== CHARACTER SELECT ====================
export function drawCharSelect(c, mouseX, mouseY) {
  c.fillStyle = 'rgba(0,0,0,0.9)';
  c.fillRect(0, 0, IW, IH);

  drawText(c, '选择角色', IW / 2, IH * 0.08, { size: FONT.TITLE(), color: '#FFD700', bold: true, align: 'center' });

  // Skill display mapping for character select tooltip
  const SKILL_INFO = {
    'dodge': { name: '闪避翻滚', cd: '3s' },
    'turret': { name: '部署炮塔', cd: '3s' },
    'mage_fireball': { name: '火球术', cd: '4s' },
    'elf_summon': { name: '召唤精灵', cd: '12s' },
    'warrior_rage': { name: '狂暴', cd: '8s' },
  };

  const chars = Object.values(CHARACTERS);
  const cardW = 140;
  const cardH = 100;
  const gap = 12;
  const cols = 3;
  const totalW = cardW * cols + gap * (cols - 1);
  const startX = (IW - totalW) / 2;
  const startY = IH * 0.15;

  const hovereds = [];
  chars.forEach((ch, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = startX + col * (cardW + gap);
    const y = startY + row * (cardH + gap);
    const hovered = mouseX >= x && mouseX <= x + cardW && mouseY >= y && mouseY <= y + cardH;
    hovereds.push(hovered);

    c.fillStyle = hovered ? '#2D3A2D' : '#1D1D2F';
    c.fillRect(x, y, cardW, cardH);
    c.strokeStyle = hovered ? '#4CAF50' : '#3A3A5F';
    c.lineWidth = 2;
    c.strokeRect(x, y, cardW, cardH);
    c.lineWidth = 1;

    // Character icon (20x20)
    c.fillStyle = ch.color;
    c.fillRect(x + cardW / 2 - 10, y + 4, 20, 20);

    // Name
    drawText(c, ch.name, x + cardW / 2, y + 30, { size: FONT.BODY(), color: '#FFD700', bold: true, align: 'center' });

    // Stats (compact: HP + speed on one line)
    drawText(c, `HP:${ch.hp} 速度:${ch.speed}`, x + cardW / 2, y + 44, { size: FONT.TINY(), color: '#AAA', align: 'center' });
    drawText(c, `伤害:${Math.round(ch.damageMult * 100)}%`, x + cardW / 2, y + 54, { size: FONT.TINY(), color: '#AAA', align: 'center' });

    // Description
    drawText(c, ch.desc, x + cardW / 2, y + 65, { size: FONT.TINY(), color: '#888', align: 'center' });

    // Skill tooltip on hover
    if (hovered && ch.special) {
      const si = SKILL_INFO[ch.special];
      if (si) {
        const ttY = y + cardH - 2;
        const ttH = 18;
        c.fillStyle = 'rgba(0,0,0,0.85)';
        c.fillRect(x + 2, ttY - ttH, cardW - 4, ttH);
        drawText(c, `${si.name} CD:${si.cd}`, x + cardW / 2, ttY - ttH / 2, {
          size: FONT.TINY(), color: ch.color, bold: true, align: 'center', baseline: 'middle',
        });
      }
    }
  });

  // Back button
  const backW = 80;
  const backH = 20;
  const backX = IW / 2 - backW / 2;
  const backY = IH * 0.88;
  const backHovered = mouseX >= backX && mouseX <= backX + backW && mouseY >= backY && mouseY <= backY + backH;
  c.fillStyle = backHovered ? '#3D3D3D' : '#2D2D2D';
  c.fillRect(backX, backY, backW, backH);
  drawText(c, '返回', IW / 2, backY + backH / 2, {
    size: FONT.SMALL(), color: backHovered ? '#FFF' : '#888', align: 'center', baseline: 'middle', bold: true,
  });

  return { chars, startX, startY, cardW, cardH, gap, hovereds, backX, backY, backW, backH, backHovered };
}

// ==================== STAGE SELECT ====================
export function drawStageSelect(c, mouseX, mouseY, unlockedStages) {
  c.fillStyle = '#0a0a15';
  c.fillRect(0, 0, IW, IH);

  drawText(c, '选择关卡', IW / 2, IH * 0.06, { size: FONT.TITLE(), color: '#FFD700', bold: true, align: 'center' });

  const cardW = 110;
  const cardH = 80;
  const cols = 4;
  const gap = 10;
  const totalW = cols * cardW + (cols - 1) * gap;
  const startX = IW / 2 - totalW / 2;
  const startY = IH * 0.14;

  const hovereds = [];
  STAGES.forEach((stage, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = startX + col * (cardW + gap);
    const y = startY + row * (cardH + gap + 14);
    const unlocked = unlockedStages.has(stage.id);
    const hovered = unlocked && mouseX >= x && mouseX <= x + cardW && mouseY >= y && mouseY <= y + cardH;
    hovereds.push(hovered);

    c.fillStyle = !unlocked ? '#151520' : hovered ? '#2D3A2D' : '#1D1D2F';
    c.fillRect(x, y, cardW, cardH);
    c.strokeStyle = !unlocked ? '#222' : hovered ? '#4CAF50' : '#3A3A5F';
    c.lineWidth = 2;
    c.strokeRect(x, y, cardW, cardH);
    c.lineWidth = 1;

    // Stage number
    drawText(c, `${stage.id}`, x + cardW / 2, y + 20, {
      size: FONT.SUBTITLE(), color: !unlocked ? '#333' : '#FFD700', bold: true, align: 'center',
    });

    // Stage name
    drawText(c, stage.name, x + cardW / 2, y + 40, {
      size: FONT.SMALL(), color: !unlocked ? '#444' : '#FFF', bold: true, align: 'center',
    });

    // Biome
    drawText(c, stage.biome, x + cardW / 2, y + 54, {
      size: FONT.TINY(), color: !unlocked ? '#333' : '#888', align: 'center',
    });

    // Boss indicator
    if (stage.boss) {
      drawText(c, 'BOSS', x + cardW / 2, y + 68, {
        size: FONT.TINY(), color: !unlocked ? '#331111' : '#FF4444', align: 'center',
      });
    }

    // Lock icon
    if (!unlocked) {
      drawText(c, '🔒', x + cardW / 2, y + 45, {
        size: FONT.SUBTITLE(), color: '#555', align: 'center',
      });
    }
  });

  // Back button
  const backW = 80;
  const backH = 20;
  const backX = IW / 2 - backW / 2;
  const backY = IH * 0.92;
  const backHovered = mouseX >= backX && mouseX <= backX + backW && mouseY >= backY && mouseY <= backY + backH;
  c.fillStyle = backHovered ? '#3D3D3D' : '#2D2D2D';
  c.fillRect(backX, backY, backW, backH);
  drawText(c, '返回', IW / 2, backY + backH / 2, {
    size: FONT.SMALL(), color: backHovered ? '#FFF' : '#888', align: 'center', baseline: 'middle', bold: true,
  });

  return { startX, startY, cardW, cardH, gap, cols, hovereds, backX, backY, backW, backH, backHovered };
}

// ==================== RESULTS SCREEN ====================
export function drawResultsScreen(c, mouseX, mouseY, results) {
  c.fillStyle = 'rgba(0,0,0,0.85)';
  c.fillRect(0, 0, IW, IH);

  const won = results.won;
  drawText(c, won ? '关卡完成!' : '任务失败', IW / 2, IH * 0.12, {
    size: 22, color: won ? '#4CAF50' : '#FF4444', bold: true, align: 'center',
  });

  // Stats
  const stats = [
    `得分: ${results.score}`,
    `波次: ${results.wave}`,
    `击杀: ${results.kills}`,
    `金币: ${results.coins}`,
    `存活时间: ${Math.floor(results.time)}秒`,
  ];
  stats.forEach((s, i) => {
    drawText(c, s, IW / 2, IH * 0.25 + i * 18, { size: FONT.BODY(), color: '#FFD700', align: 'center' });
  });

  // Continue button
  const btnW = 120;
  const btnH = 24;
  const btnX = IW / 2 - btnW / 2;
  const btnY = IH * 0.75;
  const hovered = mouseX >= btnX && mouseX <= btnX + btnW && mouseY >= btnY && mouseY <= btnY + btnH;
  c.fillStyle = hovered ? '#3D4A3D' : '#2D2D3F';
  c.fillRect(btnX, btnY, btnW, btnH);
  c.strokeStyle = hovered ? '#4CAF50' : '#4A4A6F';
  c.lineWidth = 2;
  c.strokeRect(btnX, btnY, btnW, btnH);
  c.lineWidth = 1;
  drawText(c, '继续', IW / 2, btnY + btnH / 2, {
    size: FONT.BODY(), color: hovered ? '#4CAF50' : '#FFF', align: 'center', baseline: 'middle', bold: true,
  });

  return { btnX, btnY, btnW, btnH, hovered };
}
