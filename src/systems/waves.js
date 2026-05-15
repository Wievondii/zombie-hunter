import { ZOMBIES_PER_WAVE } from '../config.js';
import { audio } from '../audio.js';
import { spawnFloatingText } from './particles.js';
import { triggerShake } from './effects.js';
import { addKillFeed } from './killfeed.js';
import { comboSystem } from './combo.js';

export const WAVE_TYPES = {
  normal: { name: '普通波次', color: '#FFFFFF' },
  elite: { name: '精英波次', color: '#FF9800', rewardMult: 2.0 },
  reward: { name: '奖励波次', color: '#FFD700', rewardMult: 3.0 },
  swarm: { name: '虫潮波次', color: '#F44336', rewardMult: 1.0 },
};

export const waveState = {
  number: 1,
  killed: 0,
  transitionTimer: 0,
  isTransition: false,
  spawnTimer: 0,
  spawnInterval: 1.6,
  difficultyLevel: 1,
  difficultyMultiplier: 1,
  pendingSpawns: [],
  bossWave: false,
  bossSpawned: false,
  stageWaves: 10,
  stageCompleteTimer: 0,
  waveType: 'normal',
};

export function resetWaves() {
  waveState.number = 1;
  waveState.killed = 0;
  waveState.transitionTimer = 0;
  waveState.isTransition = false;
  waveState.spawnTimer = 0;
  waveState.spawnInterval = 1.6;
  waveState.difficultyLevel = 1;
  waveState.difficultyMultiplier = 1;
  waveState.pendingSpawns = [];
  waveState.bossWave = false;
  waveState.bossSpawned = false;
  waveState.stageWaves = 10;
  waveState.stageCompleteTimer = 0;
  waveState.waveType = 'normal';
}

export function advanceWave(player, generatePerkChoices, setPerkSelectState, stageBoss, onStageComplete) {
  waveState.number++;
  waveState.killed = 0;
  waveState.difficultyLevel = Math.min(10, Math.floor(waveState.number / 3) + 1);
  waveState.difficultyMultiplier = 1 + (waveState.number - 1) * 0.15;
  waveState.spawnInterval = Math.max(0.3, 1.6 - waveState.number * 0.08);

  // Determine wave type: normal, elite (every 4th), reward (every 7th), swarm (random chance)
  if (waveState.number % 7 === 0) {
    waveState.waveType = 'reward';
  } else if (waveState.number % 4 === 0) {
    waveState.waveType = 'elite';
  } else if (waveState.number >= 6 && Math.random() < 0.12) {
    waveState.waveType = 'swarm';
  } else {
    waveState.waveType = 'normal';
  }

  // Check if this is a boss wave
  if (stageBoss && waveState.number === waveState.stageWaves) {
    waveState.bossWave = true;
    waveState.bossSpawned = false;
    waveState.waveType = 'normal'; // Boss waves are always normal type
  }

  // Non-boss stages: complete after clearing the last wave
  if (!stageBoss && waveState.number > waveState.stageWaves) {
    if (onStageComplete) onStageComplete();
    return;
  }

  waveState.isTransition = true;
  waveState.transitionTimer = 1.5;
  audio.waveUp();
  triggerShake(4, 0.3);

  const wt = WAVE_TYPES[waveState.waveType];
  const waveBonus = Math.floor((waveState.number * 20 + comboSystem.count * 2) * (wt.rewardMult || 1));
  player.coins += waveBonus;
  spawnFloatingText(player.x, player.y - 20, `${wt.name} ${waveState.number}! +${waveBonus}金币`, wt.color);
  addKillFeed(`${wt.name} ${waveState.number - 1} 清除! +${waveBonus}金币`, wt.color);
  player.hp = Math.min(player.maxHp, player.hp + 10);
  if (waveState.number % 3 === 0 && player.ammo < player.maxAmmo) {
    player.ammo = Math.min(player.maxAmmo, player.ammo + 40);
    spawnFloatingText(player.x, player.y - 35, '弹药补给!', '#88CCFF');
  }
  if (waveState.number % 5 === 0) {
    generatePerkChoices();
    setPerkSelectState();
  }
  // Reward wave: extra ammo and health
  if (waveState.waveType === 'reward') {
    player.ammo = Math.min(player.maxAmmo, player.ammo + 60);
    player.hp = Math.min(player.maxHp, player.hp + 20);
    spawnFloatingText(player.x, player.y - 50, '丰厚奖励!', '#FFD700');
  }
}

export function updateWaveTransition(dt) {
  if (waveState.isTransition) {
    waveState.transitionTimer -= dt;
    if (waveState.transitionTimer <= 0) waveState.isTransition = false;
  }
}
