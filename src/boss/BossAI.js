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
