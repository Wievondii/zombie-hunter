import { IW, IH, PI2, MAX_ZOMBIES } from '../config.js';
import { clamp, dist2, normalizeAngle } from '../utils.js';
import { ZOMBIE_TYPES, POWERUP_TYPES } from '../data.js';
import { audio } from '../audio.js';
import { spawnParticles, spawnFloatingText, spawnBloodPool } from '../systems/particles.js';
import { triggerShake, triggerHitStop, triggerFlash } from '../systems/effects.js';
import { addLight } from '../systems/lighting.js';
import { comboSystem } from '../systems/combo.js';
import { addKillFeed } from '../systems/killfeed.js';
import { pickups } from './pickup.js';
import { powerups } from './powerup.js';
import { acidProjectiles } from './bullet.js';
import { waveState } from '../systems/waves.js';
import { AnimationController } from '../sprites/AnimationController.js';
import { generateDrop } from '../loot/LootSystem.js';
import { BOSS_DEFS, BossController } from '../boss/BossAI.js';

export const zombies = [];

export class Zombie {
  constructor(type, x, y) {
    const d = ZOMBIE_TYPES[type];
    this.type = type; this.x = x; this.y = y;
    this.hp = d.hp * (1 + (waveState.number - 1) * 0.08);
    this.maxHp = this.hp;
    this.speed = d.speed * (0.85 + Math.random() * 0.3);
    this.damage = d.damage;
    this.color = d.color; this.colorDark = d.colorDark; this.colorClothes = d.colorClothes;
    this.size = d.size; this.coinDrop = d.coinDrop; this.xpValue = d.xpValue;
    this.alive = true;
    this.wobbleOffset = Math.random() * PI2;
    this.wobbleSpeed = 2 + Math.random() * 4;
    this.animTimer = Math.random() * PI2;
    this.flashTimer = 0; this.stunTimer = 0;
    this.rangeAttack = d.rangeAttack || false;
    this.spitTimer = d.spitInterval || 3;
    this.explodes = d.explodes || false;
    this.explosionRadius = d.explosionRadius || 60;
    this.frontArmor = d.frontArmor || 0;
    this.boss = d.boss || false; this.bossPhase = 0;
    this.bossAttackTimer = 2; this.aimAngle = 0;
    this.anim = new AnimationController();
    // Initialize boss AI if this is a boss zombie with a boss definition
    if (this.boss && BOSS_DEFS[type]) {
      const bossDef = BOSS_DEFS[type];
      this.bossController = new BossController(bossDef);
      this.hp = bossDef.hp * (1 + (waveState.number - 1) * 0.05);
      this.maxHp = this.hp;
      this.speed = bossDef.speed;
      this.damage = bossDef.damage;
      this.size = bossDef.size;
      this.color = bossDef.color;
      this.colorDark = bossDef.colorDark;
      this.bossName = bossDef.name;
    } else {
      this.bossController = null;
    }
  }

  update(dt, px, py) {
    if (!this.alive) return;
    this.flashTimer = Math.max(0, this.flashTimer - dt);
    this.stunTimer = Math.max(0, this.stunTimer - dt);
    this.animTimer += dt;
    this.wobbleOffset += dt * this.wobbleSpeed;
    if (this.stunTimer > 0) return;

    const dx = px - this.x, dy = py - this.y;
    const d = Math.hypot(dx, dy);
    this.aimAngle = Math.atan2(dy, dx);

    if (this.bossController) {
      // Use advanced boss AI — pass player reference from window
      const playerRef = window.__game?.player;
      this.bossController.update(dt, this, playerRef || { x: px, y: py }, zombies, Zombie);
    } else if (this.boss) {
      // Fallback simple boss AI
      const phaseIdx = Math.floor((1 - this.hp / this.maxHp) * 3);
      if (phaseIdx > this.bossPhase) { this.bossPhase = phaseIdx; this.speed *= 1.15; audio.bossRoar(); triggerShake(8, 0.3); }
      this.bossAttackTimer -= dt;
      if (this.bossAttackTimer <= 0 && d < 200) {
        this.bossAttackTimer = 1.5 - this.bossPhase * 0.3;
        this.speed *= 2;
        setTimeout(() => { if (this.alive) this.speed /= 2; }, 300);
      }
    }

    if (this.rangeAttack && d < 250 && d > 60) {
      this.spitTimer -= dt;
      if (this.spitTimer <= 0) {
        this.spitTimer = 2.5 + Math.random();
        const spd = 200;
        const a = this.aimAngle + (Math.random() - 0.5) * 0.2;
        acidProjectiles.push({ x: this.x, y: this.y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, alive: true, life: 3, damage: 5 });
        audio.acidSpit();
      }
    }

    if (d > 3) {
      const ms = this.speed * (0.9 + 0.2 * Math.sin(this.wobbleOffset));
      const vx = (dx / d) * ms;
      const vy = (dy / d) * ms;
      this.x += vx * dt;
      this.y += vy * dt;
      this.anim.setFacingFromVelocity(vx, vy);
      this.anim.update(dt, true, false);
    } else {
      this.anim.update(dt, false, false);
    }
  }

  takeDamage(amount, fromAngle) {
    if (this.frontArmor > 0 && fromAngle !== undefined) {
      const angleDiff = Math.abs(normalizeAngle(fromAngle - this.aimAngle));
      if (angleDiff < Math.PI / 3) amount *= this.frontArmor;
    }
    this.hp -= amount; this.flashTimer = 0.08; this.stunTimer = 0.06;
    spawnParticles(this.x, this.y, 3, ['#FF4444', '#AA0000', '#880000'], 100, 0.25, 2);
    audio.zombieHit();
    if (this.hp <= 0) { this.alive = false; this.onDeath(); }
  }

  onDeath(playerRef) {
    if (this.explodes) {
      audio.explosion(); triggerShake(10, 0.3); triggerFlash('#FF5722');
      spawnParticles(this.x, this.y, 30, ['#FF5722', '#FF9800', '#FFEB3B', '#FFF', '#BF360C'], 300, 0.6, 4);
      spawnBloodPool(this.x, this.y, 15);
      for (const z of zombies) { if (!z.alive || z === this) continue; if (dist2(z.x, z.y, this.x, this.y) < this.explosionRadius ** 2) z.takeDamage(3); }
      if (playerRef && dist2(playerRef.x, playerRef.y, this.x, this.y) < this.explosionRadius ** 2) playerRef.takeDamage(20);
      addLight(this.x, this.y, 120, '#FF5722', 0.6);
    }
    const coinMult = playerRef?.coinMult ?? 1;
    const coinAmount = Math.floor((this.coinDrop[0] + Math.random() * (this.coinDrop[1] - this.coinDrop[0])) * coinMult);
    const dropCount = Math.min(coinAmount, 12);
    for (let i = 0; i < dropCount; i++) {
      const angle = Math.random() * PI2;
      const d = 10 + Math.random() * 40;
      pickups.push({ x: clamp(this.x + Math.cos(angle) * d, 5, IW - 5), y: clamp(this.y + Math.sin(angle) * d, 5, IH - 5), type: 'coin', alive: true, life: 15, bobOffset: Math.random() * PI2, size: 6 });
    }
    if (Math.random() < 0.12) pickups.push({ x: this.x + (Math.random() - 0.5) * 20, y: this.y + (Math.random() - 0.5) * 20, type: 'ammo', alive: true, life: 15, bobOffset: Math.random() * PI2, size: 7 });
    if (Math.random() < 0.05) pickups.push({ x: this.x + (Math.random() - 0.5) * 20, y: this.y + (Math.random() - 0.5) * 20, type: 'health', alive: true, life: 15, bobOffset: Math.random() * PI2, size: 8 });
    if (Math.random() < 0.03) { const types = Object.keys(POWERUP_TYPES); powerups.push({ x: this.x, y: this.y, type: types[Math.floor(Math.random() * types.length)], ...POWERUP_TYPES[types[Math.floor(Math.random() * types.length)]], alive: true, life: 20, bobOffset: Math.random() * PI2, timer: 0 }); }
    // Loot drop
    const lootDrop = generateDrop(this.type, waveState.difficultyLevel);
    if (lootDrop) {
      pickups.push({ x: this.x + (Math.random() - 0.5) * 30, y: this.y + (Math.random() - 0.5) * 30, type: 'loot', alive: true, life: 30, bobOffset: Math.random() * PI2, size: 8, item: lootDrop });
    }
    spawnParticles(this.x, this.y, 18, [this.color, this.colorDark, '#555', '#333', '#880000'], 200, 0.55, 3);
    spawnBloodPool(this.x, this.y, this.size * 0.6);
    spawnFloatingText(this.x, this.y - 5, `+${coinAmount}`, '#FFD700');
    audio.zombieDie(); triggerShake(2, 0.08); triggerHitStop(0.03);
    addKillFeed(`击杀 ${ZOMBIE_TYPES[this.type].name}`, this.boss ? '#FF1744' : '#FF4444');
    comboSystem.onKill(this.x, this.y);
  }

  draw(c) {
    if (!this.alive) return;
    const px = this.x | 0, py = this.y | 0, s = this.size;
    const wobble = Math.sin(this.animTimer * 3) * 1.5;
    const flip = this.anim.flipX;
    const isUp = this.anim.isUp;

    if (this.flashTimer > 0) { c.fillStyle = '#FFF'; c.fillRect(px - s / 2 - 2, py - s / 2 - 2, s + 4, s + 4); }

    // Shadow
    c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(px - s / 2, py + s / 2 - 2, s, 3);
    const bodyY = py + wobble;

    // Arms (animated, behind body when facing up)
    const aw = Math.sin(this.animTimer * 5) * 3;
    c.fillStyle = this.color;
    if (isUp) {
      c.fillRect(px - s / 2 - 3, bodyY - 3 + aw, 4, s / 2);
      c.fillRect(px + s / 2 - 1, bodyY - 3 - aw, 4, s / 2);
    }

    // Body
    c.fillStyle = this.color; c.fillRect(px - s / 2 + 1, bodyY - s / 2, s - 2, s - 1);
    c.fillStyle = this.colorDark; c.fillRect(px - s / 2 + 1, bodyY - s / 2, s - 2, 2); c.fillRect(px - s / 2 + 1, bodyY + s / 2 - 3, s - 2, 2);
    c.fillStyle = this.colorClothes; c.fillRect(px - s / 2 + 2, bodyY - 2, s - 4, s / 2);
    if (this.frontArmor > 0) { c.fillStyle = 'rgba(144,164,174,0.6)'; c.fillRect(px - s / 2 + 1, bodyY - s / 2 + 2, s - 2, s - 4); }

    // Head (directional)
    const hs = s * 0.55;
    if (isUp) {
      // Back of head only
      c.fillStyle = this.color; c.fillRect(px - hs / 2, bodyY - s / 2 - hs + 1, hs, hs);
      c.fillStyle = this.colorDark; c.fillRect(px - hs / 2, bodyY - s / 2 - hs + 1, hs, 2);
    } else {
      // Face
      c.fillStyle = this.color; c.fillRect(px - hs / 2, bodyY - s / 2 - hs + 1, hs, hs);
      c.fillStyle = this.colorDark; c.fillRect(px - hs / 2, bodyY - s / 2 - hs + 1, hs, 2);

      // Eyes (directional offset)
      const eyeOff = flip ? -1 : 1;
      c.fillStyle = '#FF0000';
      c.fillRect(px - 2 + eyeOff, bodyY - s / 2 - hs + 3, 2, 2);
      c.fillRect(px + 1 + eyeOff, bodyY - s / 2 - hs + 3, 2, 2);
      c.fillStyle = '#880000';
      c.fillRect(px - 1 + eyeOff, bodyY - s / 2 - hs + 3, 1, 1);
      c.fillRect(px + 2 + eyeOff, bodyY - s / 2 - hs + 3, 1, 1);
    }

    // Boss crown
    if (this.boss) { c.fillStyle = '#FFD700'; c.fillRect(px - 4, bodyY - s / 2 - hs - 3, 8, 3); c.fillRect(px - 3, bodyY - s / 2 - hs - 5, 2, 2); c.fillRect(px + 1, bodyY - s / 2 - hs - 5, 2, 2); }

    // Arms (in front of body when not facing up)
    if (!isUp) {
      c.fillStyle = this.color;
      c.fillRect(px - s / 2 - 3, bodyY - 3 + aw, 4, s / 2);
      c.fillRect(px + s / 2 - 1, bodyY - 3 - aw, 4, s / 2);
    }

    // HP bar
    if (this.maxHp >= 2) {
      const hpW = s, hpH = 2, hpY = bodyY - s / 2 - hs - 3 - (this.boss ? 5 : 0);
      c.fillStyle = '#333'; c.fillRect(px - hpW / 2, hpY, hpW, hpH);
      const r = this.hp / this.maxHp;
      c.fillStyle = r > 0.5 ? '#4CAF50' : r > 0.25 ? '#FF9800' : '#F44336';
      c.fillRect(px - hpW / 2, hpY, (hpW * r) | 0, hpH);
    }
  }
}

export function spawnZombie(player) {
  const side = Math.floor(Math.random() * 4);
  let x, y;
  // Spawn just inside the playable area (inside the 2-tile-thick wall = 32px)
  const inner = 36;
  switch (side) {
    case 0: x = inner + Math.random() * (IW - inner * 2); y = inner; break;
    case 1: x = inner + Math.random() * (IW - inner * 2); y = IH - inner; break;
    case 2: x = inner; y = inner + Math.random() * (IH - inner * 2); break;
    case 3: x = IW - inner; y = inner + Math.random() * (IH - inner * 2); break;
  }
  let type = 'normal';
  const roll = Math.random();
  const wb = Math.min(waveState.number * 0.02, 0.3);
  const dl = waveState.difficultyLevel;
  if (dl >= 6 && roll < 0.05 + wb * 0.3) {
    const bossTypes = Object.keys(BOSS_DEFS);
    type = bossTypes[Math.floor(Math.random() * bossTypes.length)] || 'boss';
  }
  else if (dl >= 5 && roll < 0.15 + wb) type = 'armored';
  else if (dl >= 4 && roll < 0.22 + wb) type = 'exploder';
  else if (dl >= 3 && roll < 0.30 + wb) type = 'spitter';
  else if (dl >= 2 && roll < 0.25 + wb) type = 'fatty';
  else if (dl >= 1 && roll < 0.40 + wb) type = 'runner';
  zombies.push(new Zombie(type, x, y));
}

export function cleanupZombies(player) {
  // Swap-and-pop for dead zombies
  for (let i = zombies.length - 1; i >= 0; i--) {
    if (!zombies[i].alive) {
      zombies[i] = zombies[zombies.length - 1];
      zombies.pop();
    }
  }
  // Cap zombies: remove the ones furthest from player
  if (zombies.length > MAX_ZOMBIES) {
    // Find and remove furthest zombies without full sort
    let removeCount = zombies.length - MAX_ZOMBIES;
    while (removeCount > 0) {
      let farthestIdx = 0, farthestDist = 0;
      for (let i = 0; i < zombies.length; i++) {
        const d = dist2(zombies[i].x, zombies[i].y, player.x, player.y);
        if (d > farthestDist) { farthestDist = d; farthestIdx = i; }
      }
      zombies[farthestIdx] = zombies[zombies.length - 1];
      zombies.pop();
      removeCount--;
    }
  }
}

export function clearZombies() { zombies.length = 0; }
