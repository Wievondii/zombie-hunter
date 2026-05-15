import { PI2 } from '../config.js';
import { dist2, randRange } from '../utils.js';
import { audio } from '../audio.js';
import { triggerShake, triggerFlash } from '../systems/effects.js';
import { addLight } from '../systems/lighting.js';
import { spawnParticles, spawnFloatingText } from '../systems/particles.js';
import { acidProjectiles } from '../entities/bullet.js';

// Boss attack patterns
const PATTERNS = {
  // Necromancer patterns
  darkBolt: {
    name: 'darkBolt',
    cooldown: 2.5,
    execute(boss, player) {
      const angle = Math.atan2(player.y - boss.y, player.x - boss.x);
      for (let i = -1; i <= 1; i++) {
        const a = angle + i * 0.2;
        acidProjectiles.push({
          x: boss.x, y: boss.y,
          vx: Math.cos(a) * 250, vy: Math.sin(a) * 250,
          alive: true, life: 4, damage: 8,
          color: '#9C27B0',
        });
      }
      audio.acidSpit();
    },
  },
  summonMinions: {
    name: 'summonMinions',
    cooldown: 8,
    execute(boss, player, zombies, Zombie) {
      for (let i = 0; i < 3; i++) {
        const angle = Math.random() * PI2;
        const d = 40 + Math.random() * 30;
        const z = new Zombie('normal', boss.x + Math.cos(angle) * d, boss.y + Math.sin(angle) * d);
        z.hp = 2; z.maxHp = 2;
        zombies.push(z);
      }
      spawnFloatingText(boss.x, boss.y - 20, '召唤亡灵!', '#9C27B0');
      audio.bossRoar();
    },
  },
  poisonCloud: {
    name: 'poisonCloud',
    cooldown: 6,
    execute(boss, player) {
      // Create acid pools around the boss
      for (let i = 0; i < 5; i++) {
        const angle = Math.random() * PI2;
        const d = 30 + Math.random() * 60;
        const x = boss.x + Math.cos(angle) * d;
        const y = boss.y + Math.sin(angle) * d;
        // Push to hazards via global
        if (window.__game?.hazards) {
          window.__game.hazards.push({ x, y, type: 'acid', radius: 15 + Math.random() * 10, damage: 2, tickTimer: 0, alive: true, life: 8 });
        }
      }
      spawnParticles(boss.x, boss.y, 20, ['#9C27B0', '#7B1FA2', '#CE93D8'], 100, 0.5, 3);
    },
  },
  charge: {
    name: 'charge',
    cooldown: 5,
    execute(boss, player) {
      const angle = Math.atan2(player.y - boss.y, player.x - boss.x);
      boss._chargeVx = Math.cos(angle) * 400;
      boss._chargeVy = Math.sin(angle) * 400;
      boss._chargeTimer = 0.6;
      triggerShake(8, 0.3);
      spawnFloatingText(boss.x, boss.y - 20, '冲锋!', '#FF5722');
    },
  },
  shockwave: {
    name: 'shockwave',
    cooldown: 4,
    execute(boss, player) {
      // Damage player if close
      const d = Math.sqrt(dist2(boss.x, boss.y, player.x, player.y));
      if (d < 100) {
        player.takeDamage(15);
        triggerShake(10, 0.4);
      }
      spawnParticles(boss.x, boss.y, 30, ['#FF5722', '#FF8A65', '#FFF'], 200, 0.4, 4);
      addLight(boss.x, boss.y, 100, '#FF5722', 0.6);
    },
  },
  laserSweep: {
    name: 'laserSweep',
    cooldown: 3,
    execute(boss, player) {
      // Fire a line of projectiles
      const baseAngle = Math.atan2(player.y - boss.y, player.x - boss.x);
      for (let i = 0; i < 8; i++) {
        const a = baseAngle + (i - 4) * 0.08;
        acidProjectiles.push({
          x: boss.x, y: boss.y,
          vx: Math.cos(a) * 350, vy: Math.sin(a) * 350,
          alive: true, life: 3, damage: 5,
          color: '#F44336',
        });
      }
      addLight(boss.x, boss.y, 60, '#F44336', 0.4);
    },
  },
  // Plague Spreader patterns
  poisonBarrage: {
    name: 'poisonBarrage',
    cooldown: 4,
    execute(boss, player) {
      const baseAngle = Math.atan2(player.y - boss.y, player.x - boss.x);
      for (let i = 0; i < 6; i++) {
        const a = baseAngle + (i - 2.5) * 0.15;
        acidProjectiles.push({
          x: boss.x, y: boss.y,
          vx: Math.cos(a) * 180, vy: Math.sin(a) * 180,
          alive: true, life: 4, damage: 6,
          color: '#4CAF50',
        });
      }
      audio.acidSpit();
    },
  },
  toxicCloud: {
    name: 'toxicCloud',
    cooldown: 7,
    execute(boss, player) {
      for (let i = 0; i < 4; i++) {
        const angle = Math.random() * PI2;
        const d = 20 + Math.random() * 50;
        const x = boss.x + Math.cos(angle) * d;
        const y = boss.y + Math.sin(angle) * d;
        if (window.__game?.hazards) {
          window.__game.hazards.push({ x, y, type: 'acid', radius: 12 + Math.random() * 8, damage: 3, tickTimer: 0, alive: true, life: 10 });
        }
      }
      spawnParticles(boss.x, boss.y, 15, ['#4CAF50', '#388E3C', '#A5D6A7'], 80, 0.4, 3);
    },
  },
  // Shadow Assassin patterns
  teleportStrike: {
    name: 'teleportStrike',
    cooldown: 6,
    execute(boss, player) {
      const angle = Math.atan2(player.y - boss.y, player.x - boss.x);
      const dist = 40;
      boss.x = player.x - Math.cos(angle) * dist;
      boss.y = player.y - Math.sin(angle) * dist;
      spawnParticles(boss.x, boss.y, 20, ['#7B1FA2', '#4A148C', '#CE93D8'], 150, 0.3, 3);
      triggerShake(6, 0.2);
      const d = Math.sqrt(dist2(boss.x, boss.y, player.x, player.y));
      if (d < 60) {
        player.takeDamage(12);
        triggerShake(8, 0.3);
      }
      addLight(boss.x, boss.y, 40, '#7B1FA2', 0.5);
    },
  },
  shadowSlash: {
    name: 'shadowSlash',
    cooldown: 2,
    execute(boss, player) {
      const angle = Math.atan2(player.y - boss.y, player.x - boss.x);
      for (let i = -1; i <= 1; i++) {
        const a = angle + i * 0.3;
        acidProjectiles.push({
          x: boss.x, y: boss.y,
          vx: Math.cos(a) * 300, vy: Math.sin(a) * 300,
          alive: true, life: 2, damage: 10,
          color: '#9C27B0',
        });
      }
    },
  },
  // Cryo Wraith patterns
  iceSpike: {
    name: 'iceSpike',
    cooldown: 2.0,
    execute(boss, player) {
      const angle = Math.atan2(player.y - boss.y, player.x - boss.x);
      // Fan of 5 ice spikes
      for (let i = -2; i <= 2; i++) {
        const a = angle + i * 0.18;
        acidProjectiles.push({
          x: boss.x, y: boss.y,
          vx: Math.cos(a) * 220, vy: Math.sin(a) * 220,
          alive: true, life: 3.5, damage: 7,
          color: '#80DEEA',
        });
      }
      audio.acidSpit();
      addLight(boss.x, boss.y, 50, '#80DEEA', 0.4);
    },
  },
  frostNova: {
    name: 'frostNova',
    cooldown: 7,
    execute(boss, player) {
      // AoE slow — damage nearby player and slow them
      const d = Math.sqrt(dist2(boss.x, boss.y, player.x, player.y));
      if (d < 120) {
        player.takeDamage(10);
        // Apply slow effect via global
        if (window.__game?.player) {
          window.__game.player._slowTimer = 3.0;
          window.__game.player._slowMult = 0.4;
        }
        triggerShake(8, 0.3);
      }
      // Ring of ice projectiles
      for (let i = 0; i < 12; i++) {
        const a = (PI2 / 12) * i;
        acidProjectiles.push({
          x: boss.x, y: boss.y,
          vx: Math.cos(a) * 180, vy: Math.sin(a) * 180,
          alive: true, life: 2.5, damage: 5,
          color: '#4DD0E1',
        });
      }
      spawnParticles(boss.x, boss.y, 25, ['#80DEEA', '#4DD0E1', '#E0F7FA', '#FFF'], 150, 0.5, 3);
      addLight(boss.x, boss.y, 100, '#80DEEA', 0.6);
      spawnFloatingText(boss.x, boss.y - 20, '冰霜新星!', '#80DEEA');
    },
  },
  iceBarrier: {
    name: 'iceBarrier',
    cooldown: 10,
    execute(boss, player) {
      // Spawn ice hazards around boss as barriers
      for (let i = 0; i < 6; i++) {
        const angle = (PI2 / 6) * i;
        const d = 50 + Math.random() * 20;
        const x = boss.x + Math.cos(angle) * d;
        const y = boss.y + Math.sin(angle) * d;
        if (window.__game?.hazards) {
          window.__game.hazards.push({
            x, y, type: 'ice', radius: 10 + Math.random() * 6,
            damage: 1, tickTimer: 0, alive: true, life: 12,
          });
        }
      }
      spawnParticles(boss.x, boss.y, 15, ['#B3E5FC', '#81D4FA', '#4FC3F7'], 100, 0.4, 2);
      spawnFloatingText(boss.x, boss.y - 20, '冰晶屏障!', '#4FC3F7');
    },
  },
  // Pyro Maniac patterns
  fireBlast: {
    name: 'fireBlast',
    cooldown: 2.2,
    execute(boss, player) {
      const angle = Math.atan2(player.y - boss.y, player.x - boss.x);
      // Triple fireball spread
      for (let i = -1; i <= 1; i++) {
        const a = angle + i * 0.25;
        acidProjectiles.push({
          x: boss.x, y: boss.y,
          vx: Math.cos(a) * 280, vy: Math.sin(a) * 280,
          alive: true, life: 3, damage: 9,
          color: '#FF6D00',
        });
      }
      audio.acidSpit();
      addLight(boss.x, boss.y, 50, '#FF6D00', 0.5);
    },
  },
  fireWave: {
    name: 'fireWave',
    cooldown: 5,
    execute(boss, player) {
      const baseAngle = Math.atan2(player.y - boss.y, player.x - boss.x);
      // Line of fire projectiles
      for (let i = 0; i < 10; i++) {
        const a = baseAngle + (i - 5) * 0.06;
        acidProjectiles.push({
          x: boss.x, y: boss.y,
          vx: Math.cos(a) * 320, vy: Math.sin(a) * 320,
          alive: true, life: 2.5, damage: 6,
          color: '#FF3D00',
        });
      }
      spawnParticles(boss.x, boss.y, 20, ['#FF6D00', '#FF3D00', '#FFAB00', '#FFF'], 180, 0.4, 3);
      addLight(boss.x, boss.y, 70, '#FF6D00', 0.5);
      triggerShake(6, 0.2);
    },
  },
  inferno: {
    name: 'inferno',
    cooldown: 8,
    execute(boss, player) {
      // Fire pools around boss
      for (let i = 0; i < 5; i++) {
        const angle = Math.random() * PI2;
        const d = 25 + Math.random() * 70;
        const x = boss.x + Math.cos(angle) * d;
        const y = boss.y + Math.sin(angle) * d;
        if (window.__game?.hazards) {
          window.__game.hazards.push({
            x, y, type: 'fire', radius: 14 + Math.random() * 10,
            damage: 3, tickTimer: 0, alive: true, life: 8,
          });
        }
      }
      // Damage nearby player
      const d = Math.sqrt(dist2(boss.x, boss.y, player.x, player.y));
      if (d < 90) {
        player.takeDamage(12);
        triggerShake(10, 0.3);
      }
      spawnParticles(boss.x, boss.y, 30, ['#FF6D00', '#FF3D00', '#FFAB00', '#FF8F00', '#FFF'], 200, 0.6, 4);
      addLight(boss.x, boss.y, 120, '#FF6D00', 0.7);
      spawnFloatingText(boss.x, boss.y - 20, '地狱烈焰!', '#FF6D00');
    },
  },
  // Iron Fortress patterns
  heavySlam: {
    name: 'heavySlam',
    cooldown: 5,
    execute(boss, player) {
      const d = Math.sqrt(dist2(boss.x, boss.y, player.x, player.y));
      if (d < 80) {
        player.takeDamage(20);
        triggerShake(12, 0.4);
        spawnParticles(boss.x, boss.y, 25, ['#607D8B', '#37474F', '#FFF'], 200, 0.5, 4);
      }
      addLight(boss.x, boss.y, 80, '#607D8B', 0.6);
    },
  },
  laserBarrage: {
    name: 'laserBarrage',
    cooldown: 3.5,
    execute(boss, player) {
      const baseAngle = Math.atan2(player.y - boss.y, player.x - boss.x);
      for (let i = 0; i < 5; i++) {
        const a = baseAngle + (i - 2) * 0.12;
        acidProjectiles.push({
          x: boss.x, y: boss.y,
          vx: Math.cos(a) * 400, vy: Math.sin(a) * 400,
          alive: true, life: 2.5, damage: 7,
          color: '#F44336',
        });
      }
      addLight(boss.x, boss.y, 50, '#F44336', 0.4);
    },
  },
};

// Boss definitions
export const BOSS_DEFS = {
  necromancer: {
    name: '亡灵法师',
    hp: 80,
    speed: 40,
    damage: 15,
    size: 30,
    color: '#7B1FA2',
    colorDark: '#4A148C',
    phases: [
      { hpThreshold: 1.0, patterns: ['darkBolt', 'summonMinions'], speed: 40 },
      { hpThreshold: 0.6, patterns: ['darkBolt', 'poisonCloud', 'summonMinions'], speed: 50 },
      { hpThreshold: 0.3, patterns: ['darkBolt', 'charge', 'poisonCloud', 'summonMinions'], speed: 65 },
    ],
  },
  mutant_tank: {
    name: '变异坦克',
    hp: 120,
    speed: 30,
    damage: 25,
    size: 36,
    color: '#5D4037',
    colorDark: '#3E2723',
    phases: [
      { hpThreshold: 1.0, patterns: ['shockwave', 'charge'], speed: 30 },
      { hpThreshold: 0.5, patterns: ['shockwave', 'charge', 'laserSweep'], speed: 40 },
      { hpThreshold: 0.2, patterns: ['charge', 'laserSweep', 'shockwave'], speed: 55 },
    ],
  },
  mech_walker: {
    name: '机甲战士',
    hp: 150,
    speed: 35,
    damage: 20,
    size: 34,
    color: '#607D8B',
    colorDark: '#37474F',
    phases: [
      { hpThreshold: 1.0, patterns: ['laserSweep', 'shockwave'], speed: 35 },
      { hpThreshold: 0.5, patterns: ['laserSweep', 'charge', 'shockwave'], speed: 45 },
      { hpThreshold: 0.25, patterns: ['laserSweep', 'charge', 'shockwave'], speed: 60 },
    ],
  },
  hive_mind: {
    name: '蜂巢意识',
    hp: 200,
    speed: 25,
    damage: 30,
    size: 40,
    color: '#E91E63',
    colorDark: '#880E4F',
    phases: [
      { hpThreshold: 1.0, patterns: ['darkBolt', 'summonMinions'], speed: 25 },
      { hpThreshold: 0.6, patterns: ['darkBolt', 'poisonCloud', 'summonMinions', 'charge'], speed: 35 },
      { hpThreshold: 0.3, patterns: ['darkBolt', 'charge', 'poisonCloud', 'laserSweep', 'summonMinions'], speed: 50 },
    ],
  },
  plague_spreader: {
    name: '瘟疫散布者',
    hp: 100,
    speed: 35,
    damage: 18,
    size: 28,
    color: '#4CAF50',
    colorDark: '#2E7D32',
    phases: [
      { hpThreshold: 1.0, patterns: ['poisonBarrage', 'toxicCloud'], speed: 35 },
      { hpThreshold: 0.5, patterns: ['poisonBarrage', 'toxicCloud', 'charge'], speed: 45 },
      { hpThreshold: 0.25, patterns: ['poisonBarrage', 'charge', 'toxicCloud', 'summonMinions'], speed: 60 },
    ],
  },
  shadow_assassin: {
    name: '暗影刺客',
    hp: 90,
    speed: 55,
    damage: 22,
    size: 26,
    color: '#7B1FA2',
    colorDark: '#4A148C',
    phases: [
      { hpThreshold: 1.0, patterns: ['shadowSlash', 'teleportStrike'], speed: 55 },
      { hpThreshold: 0.5, patterns: ['shadowSlash', 'teleportStrike', 'charge'], speed: 70 },
      { hpThreshold: 0.2, patterns: ['shadowSlash', 'charge', 'teleportStrike', 'darkBolt'], speed: 85 },
    ],
  },
  iron_fortress: {
    name: '钢铁堡垒',
    hp: 180,
    speed: 20,
    damage: 28,
    size: 38,
    color: '#607D8B',
    colorDark: '#37474F',
    phases: [
      { hpThreshold: 1.0, patterns: ['heavySlam', 'laserBarrage'], speed: 20 },
      { hpThreshold: 0.5, patterns: ['heavySlam', 'laserBarrage', 'shockwave'], speed: 30 },
      { hpThreshold: 0.25, patterns: ['heavySlam', 'laserBarrage', 'shockwave', 'charge'], speed: 45 },
    ],
  },
  cryo_wraith: {
    name: '寒冰亡魂',
    hp: 100,
    speed: 38,
    damage: 14,
    size: 30,
    color: '#4FC3F7',
    colorDark: '#0288D1',
    phases: [
      { hpThreshold: 1.0, patterns: ['iceSpike', 'frostNova'], speed: 38 },
      { hpThreshold: 0.55, patterns: ['iceSpike', 'frostNova', 'iceBarrier'], speed: 48 },
      { hpThreshold: 0.25, patterns: ['iceSpike', 'frostNova', 'iceBarrier', 'charge'], speed: 60 },
    ],
  },
  pyro_maniac: {
    name: '烈焰狂人',
    hp: 120,
    speed: 32,
    damage: 20,
    size: 32,
    color: '#FF6D00',
    colorDark: '#E65100',
    phases: [
      { hpThreshold: 1.0, patterns: ['fireBlast', 'fireWave'], speed: 32 },
      { hpThreshold: 0.5, patterns: ['fireBlast', 'fireWave', 'inferno'], speed: 42 },
      { hpThreshold: 0.25, patterns: ['fireBlast', 'fireWave', 'inferno', 'charge'], speed: 55 },
    ],
  },
};

export class BossController {
  constructor(bossDef) {
    this.def = bossDef;
    this.currentPhase = 0;
    this.patternTimers = {};
    this._chargeVx = 0;
    this._chargeVy = 0;
    this._chargeTimer = 0;
    // Initialize all pattern timers
    for (const phase of bossDef.phases) {
      for (const pName of phase.patterns) {
        if (!this.patternTimers[pName]) this.patternTimers[pName] = 0;
      }
    }
  }

  update(dt, boss, player, zombies, Zombie) {
    // Update charge movement
    if (this._chargeTimer > 0) {
      this._chargeTimer -= dt;
      boss.x += this._chargeVx * dt;
      boss.y += this._chargeVy * dt;
      if (this._chargeTimer <= 0) {
        this._chargeVx = 0;
        this._chargeVy = 0;
      }
      return;
    }

    // Determine current phase
    const hpRatio = boss.hp / boss.maxHp;
    let phase = this.def.phases[0];
    for (let i = this.def.phases.length - 1; i >= 0; i--) {
      if (hpRatio <= this.def.phases[i].hpThreshold) {
        phase = this.def.phases[i];
        if (i !== this.currentPhase) {
          this.currentPhase = i;
          boss.speed = phase.speed;
          triggerShake(6, 0.3);
          spawnFloatingText(boss.x, boss.y - 30, `阶段 ${i + 1}!`, '#FF4444', 1.5);
        }
        break;
      }
    }

    // Update pattern timers and execute
    for (const pName of phase.patterns) {
      this.patternTimers[pName] -= dt;
      if (this.patternTimers[pName] <= 0) {
        const pattern = PATTERNS[pName];
        if (pattern) {
          pattern.execute(boss, player, zombies, Zombie);
          this.patternTimers[pName] = pattern.cooldown;
        }
      }
    }
  }
}
