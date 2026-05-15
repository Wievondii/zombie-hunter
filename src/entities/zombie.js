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

    // Skill system (M3 new zombies)
    this.skill = d.skill || null;
    this.skillCooldown = d.skillCooldown || 0;
    this.skillRange = d.skillRange || 0;
    this.skillTimer = 0;
    this.skillActive = false;
    this.isMinion = false;

    // Charge skill state
    this.chargeDir = { x: 0, y: 0 };
    this.chargeTimer = 0;
    this.speedMult = 1;

    // Leap skill state
    this.leapTarget = null;
    this.leapTimer = 0;

    // Shield skill state
    this.shieldAngle = 0;

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

    // === M3 Skill behavior ===
    this.skillTimer = Math.max(0, this.skillTimer - dt);

    if (this.skill === 'charge') {
      this._updateChargeSkill(dt, dx, dy, d);
    } else if (this.skill === 'summon') {
      this._updateSummonSkill(dt);
    } else if (this.skill === 'leap') {
      this._updateLeapSkill(dt, dx, dy, d);
    } else if (this.skill === 'freezeAura') {
      this._updateFreezeAuraSkill(d);
    } else if (this.skill === 'shield') {
      this._updateShieldSkill(dx, dy);
    }

    // === Movement ===
    if (this.skillActive && this.skill === 'charge' && this.chargeTimer > 0) {
      // Charge movement — rush in chargeDir at 3x speed
      const ms = this.speed * this.speedMult;
      this.x += this.chargeDir.x * ms * dt;
      this.y += this.chargeDir.y * ms * dt;
      this.anim.setFacingFromVelocity(this.chargeDir.x, this.chargeDir.y);
      this.anim.update(dt, true, false);
      // Stop charge if close to player
      if (d < this.size + 12) {
        this.skillActive = false;
        this.speedMult = 1;
      }
      // Trail particles
      if (Math.random() < 0.4) {
        spawnParticles(this.x, this.y, 1, ['#FF6F00', '#FF9800', '#FF5722'], 80, 0.25, 2);
      }
    } else if (this.skillActive && this.skill === 'leap') {
      // Leap windup — don't move, count down
      this.anim.update(dt, false, false);
    } else if (d > 3) {
      const ms = this.speed * (0.9 + 0.2 * Math.sin(this.wobbleOffset)) * this.speedMult;
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

  // === M3 Skill helpers ===

  _updateChargeSkill(dt, dx, dy, d) {
    if (this.skillActive) {
      this.chargeTimer -= dt;
      if (this.chargeTimer <= 0) {
        this.skillActive = false;
        this.speedMult = 1;
      }
    } else if (d < this.skillRange && this.skillTimer <= 0) {
      // Start charge toward player
      const dd = Math.hypot(dx, dy) || 1;
      this.chargeDir = { x: dx / dd, y: dy / dd };
      this.skillActive = true;
      this.skillTimer = this.skillCooldown;
      this.chargeTimer = 0.5;
      this.speedMult = 3;
    }
  }

  _updateSummonSkill(dt) {
    if (this.skillTimer > 0) return;
    this.skillTimer = this.skillCooldown;

    if (zombies.length >= MAX_ZOMBIES) return;

    // Spawn 1-2 normal zombies nearby
    const count = Math.min(1 + Math.floor(Math.random() * 2), MAX_ZOMBIES - zombies.length);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * PI2;
      const dist = 20 + Math.random() * 10;
      const zx = this.x + Math.cos(angle) * dist;
      const zy = this.y + Math.sin(angle) * dist;
      const minion = new Zombie('normal', zx, zy);
      minion.isMinion = true;
      minion.xpValue = 0;
      minion.hp = 1;
      minion.maxHp = 1;
      zombies.push(minion);
    }
    // Purple summon particles
    spawnParticles(this.x, this.y, 12, ['#673AB7', '#9C27B0', '#E040FB'], 150, 0.5, 3);
  }

  _updateLeapSkill(dt, dx, dy, d) {
    if (this.skillActive) {
      this.leapTimer -= dt;
      if (this.leapTimer <= 0) {
        // Teleport to target (clamped to safe bounds)
        this.x = clamp(this.leapTarget.x, 20, IW - 20);
        this.y = clamp(this.leapTarget.y, 20, IH - 20);
        this.skillActive = false;
        // Landing particles
        spawnParticles(this.x, this.y, 15, ['#FF9800', '#FFEB3B', '#FFF'], 200, 0.4, 3);
        triggerShake(4, 0.12);
      }
    } else if (d < this.skillRange && this.skillTimer <= 0) {
      // Start leap — pick random position near player
      const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 1.0;
      const dist = Math.min(d * 0.6, 80);
      this.leapTarget = {
        x: clamp(this.x + Math.cos(angle) * dist, 20, IW - 20),
        y: clamp(this.y + Math.sin(angle) * dist, 20, IH - 20)
      };
      this.skillActive = true;
      this.skillTimer = this.skillCooldown;
      this.leapTimer = 0.3;
      // Pre-jump warning particles (red circle)
      spawnParticles(this.x, this.y, 6, ['#FF5722', '#FF9800', '#F44336'], 60, 0.35, 4);
    }
  }

  _updateFreezeAuraSkill(d) {
    if (d >= this.skillRange) return;
    const player = window.__game?.player;
    if (!player) return;
    // Apply slow debuff — refresh timer, take lowest mult
    player._slowTimer = 0.5;
    player._slowMult = Math.min(player._slowMult, 0.5);
    // Blue aura particles
    if (Math.random() < 0.3) {
      const a = Math.random() * PI2;
      const rd = this.size * 0.6;
      spawnParticles(this.x + Math.cos(a) * rd, this.y + Math.sin(a) * rd, 1, ['#00BCD4', '#4DD0E1', '#80DEEA'], 40, 0.4, 2);
    }
  }

  _updateShieldSkill(dx, dy) {
    this.shieldAngle = Math.atan2(dy, dx);
  }

  takeDamage(amount, fromAngle) {
    // Shielder: 80% damage reduction from front (±60°)
    if (this.skill === 'shield' && this.shieldAngle !== undefined && fromAngle !== undefined) {
      const angleDiff = Math.abs(normalizeAngle(fromAngle - this.shieldAngle));
      if (angleDiff < Math.PI / 3) amount *= 0.2;
    }
    // Existing frontArmor (armored zombie)
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
    // B2: Minions skip all rewards — no coins, no combo, no killfeed
    if (this.isMinion) {
      // Still handle explosion if applicable (e.g. exploder minion)
      if (this.explodes) {
        audio.explosion(); triggerShake(10, 0.3); triggerFlash('#FF5722');
        spawnParticles(this.x, this.y, 30, ['#FF5722', '#FF9800', '#FFEB3B', '#FFF', '#BF360C'], 300, 0.6, 4);
        spawnBloodPool(this.x, this.y, 15);
        for (const z of zombies) { if (!z.alive || z === this) continue; if (dist2(z.x, z.y, this.x, this.y) < this.explosionRadius ** 2) z.takeDamage(3); }
        if (playerRef && dist2(playerRef.x, playerRef.y, this.x, this.y) < this.explosionRadius ** 2) playerRef.takeDamage(20);
        addLight(this.x, this.y, 120, '#FF5722', 0.6);
      }
      // Minimal death particles, no rewards
      spawnParticles(this.x, this.y, 6, ['#555', '#333', '#880000'], 100, 0.3, 2);
      return;
    }

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

    // Boss-specific rendering
    if (this.boss) {
      const bossType = this.type;
      const pulse = Math.sin(this.animTimer * 4) * 0.3 + 0.7;
      const eyeOff = flip ? -1 : 1;
      const hpRatio = this.hp / this.maxHp;
      const phaseIdx = hpRatio > 0.6 ? 0 : hpRatio > 0.3 ? 1 : 2;

      // Phase aura — intensifies as boss gets weaker
      if (phaseIdx > 0) {
        const auraSize = s + 6 + phaseIdx * 4;
        const auraAlpha = 0.1 + phaseIdx * 0.08;
        c.fillStyle = `rgba(${parseInt(this.color.slice(1, 3), 16)},${parseInt(this.color.slice(3, 5), 16)},${parseInt(this.color.slice(5, 7), 16)},${auraAlpha})`;
        c.beginPath(); c.arc(px, bodyY, auraSize, 0, PI2); c.fill();
      }

      if (bossType === 'necromancer') {
        // Dark robe + staff + glowing eyes + soul wisps
        c.fillStyle = '#4A148C';
        c.fillRect(px - s / 2 - 1, bodyY - 2, s + 2, s / 2 + 4);
        // Robe details
        c.fillStyle = '#6A1B9A';
        c.fillRect(px - s / 2 + 2, bodyY, s - 4, 2);
        c.fillStyle = '#7B1FA2';
        c.fillRect(px - 2, bodyY - s / 2 - hs - 8, 4, 12); // Staff
        c.fillStyle = '#E040FB';
        c.fillRect(px - 2, bodyY - s / 2 - hs - 10, 4, 3); // Staff orb
        // Staff orb glow
        c.fillStyle = `rgba(224,64,251,${pulse * 0.5})`;
        c.beginPath(); c.arc(px, bodyY - s / 2 - hs - 8, 5, 0, PI2); c.fill();
        // Glowing eyes
        if (!isUp) {
          c.fillStyle = `rgba(224,64,251,${pulse})`;
          c.fillRect(px - 2 + eyeOff, bodyY - s / 2 - hs + 3, 2, 2);
          c.fillRect(px + 1 + eyeOff, bodyY - s / 2 - hs + 3, 2, 2);
        }
        // Soul wisps in phase 2+
        if (phaseIdx >= 1 && Math.random() < 0.25) {
          const wa = Math.random() * PI2;
          spawnParticles(px + Math.cos(wa) * s, bodyY + Math.sin(wa) * s, 1, ['#CE93D8', '#E040FB', '#7B1FA2'], 30, 0.4, 1.5);
        }
      } else if (bossType === 'mutant_tank') {
        // Thick armor plates + chains + damage cracks
        c.fillStyle = '#3E2723';
        c.fillRect(px - s / 2 - 2, bodyY - s / 2, s + 4, s);
        c.fillStyle = '#5D4037';
        c.fillRect(px - s / 2 + 1, bodyY - s / 2 + 2, s - 2, 3);
        c.fillRect(px - s / 2 + 1, bodyY + s / 2 - 5, s - 2, 3);
        // Chain links
        c.fillStyle = '#FFD700';
        c.fillRect(px - s / 2 - 3, bodyY - 2, 3, 2);
        c.fillRect(px + s / 2, bodyY - 2, 3, 2);
        // Damage cracks in phase 2+
        if (phaseIdx >= 1) {
          c.fillStyle = '#8D6E63';
          c.fillRect(px - 2, bodyY - s / 2 + 4, 2, 4);
          c.fillRect(px + 1, bodyY + s / 2 - 8, 2, 3);
        }
        // Rage sparks in phase 3
        if (phaseIdx >= 2 && Math.random() < 0.2) {
          spawnParticles(px + (Math.random() - 0.5) * s, bodyY - s / 2, 1, ['#FF5722', '#FF8A65'], 40, 0.3, 1);
        }
      } else if (bossType === 'mech_walker') {
        // Metallic body + antenna + visor + exhaust vents
        c.fillStyle = '#455A64';
        c.fillRect(px - s / 2 - 1, bodyY - s / 2 - 1, s + 2, s + 2);
        c.fillStyle = '#90A4AE';
        c.fillRect(px - s / 2 + 2, bodyY - s / 2 + 2, s - 4, s - 4);
        // Panel lines
        c.fillStyle = '#78909C';
        c.fillRect(px - s / 2 + 3, bodyY - 1, s - 6, 1);
        c.fillRect(px - 1, bodyY - s / 2 + 3, 1, s - 6);
        // Antenna
        c.fillStyle = '#F44336';
        c.fillRect(px, bodyY - s / 2 - hs - 6, 2, 6);
        c.fillStyle = '#FF5722';
        c.fillRect(px - 1, bodyY - s / 2 - hs - 8, 4, 3);
        // Antenna blink
        if (Math.sin(this.animTimer * 6) > 0.5) {
          c.fillStyle = '#FF8A65';
          c.fillRect(px - 1, bodyY - s / 2 - hs - 8, 4, 3);
        }
        // Visor
        if (!isUp) {
          c.fillStyle = `rgba(33,150,243,${pulse})`;
          c.fillRect(px - 3 + eyeOff, bodyY - s / 2 - hs + 2, 6, 2);
        }
        // Exhaust sparks in phase 2+
        if (phaseIdx >= 1 && Math.random() < 0.15) {
          spawnParticles(px + (Math.random() - 0.5) * 4, bodyY + s / 2, 1, ['#FF9800', '#FFC107'], 30, 0.25, 1);
        }
      } else if (bossType === 'hive_mind') {
        // Tentacles + pulsing core + neural tendrils
        c.fillStyle = '#AD1457';
        const tentacleCount = 4 + phaseIdx;
        for (let i = 0; i < tentacleCount; i++) {
          const ta = this.animTimer * 2 + i * (PI2 / tentacleCount);
          const tx = Math.cos(ta) * (s / 2 + 4 + phaseIdx * 2);
          const ty = Math.sin(ta) * (s / 2 + 4 + phaseIdx * 2);
          c.fillRect(px + tx - 1, bodyY + ty - 1, 3, 3);
        }
        // Pulsing core
        c.fillStyle = `rgba(233,30,99,${pulse})`;
        c.fillRect(px - 3, bodyY - 3, 6, 6);
        // Core glow
        c.fillStyle = `rgba(244,67,54,${pulse * 0.4})`;
        c.beginPath(); c.arc(px, bodyY, 8 + phaseIdx * 2, 0, PI2); c.fill();
        // Neural sparks in phase 2+
        if (phaseIdx >= 1 && Math.random() < 0.2) {
          spawnParticles(px + (Math.random() - 0.5) * s * 1.5, bodyY + (Math.random() - 0.5) * s * 1.5, 1, ['#F48FB1', '#F06292'], 25, 0.3, 1);
        }
      } else if (bossType === 'plague_spreader') {
        // Gas mask + hood + toxic particles + plague aura
        c.fillStyle = '#2E7D32';
        c.fillRect(px - s / 2 - 1, bodyY - s / 2 - hs, s + 2, hs + 2); // Hood
        // Hood texture
        c.fillStyle = '#388E3C';
        c.fillRect(px - s / 2, bodyY - s / 2 - hs + 2, s, 1);
        // Gas mask
        if (!isUp) {
          c.fillStyle = '#1B5E20';
          c.fillRect(px - 3 + eyeOff, bodyY - s / 2 - hs + 2, 6, 4);
          c.fillStyle = '#4CAF50';
          c.fillRect(px - 2 + eyeOff, bodyY - s / 2 - hs + 3, 2, 2);
          c.fillRect(px + 1 + eyeOff, bodyY - s / 2 - hs + 3, 2, 2);
          // Mask filter
          c.fillStyle = '#66BB6A';
          c.fillRect(px + eyeOff * 2, bodyY - s / 2 - hs + 5, 3, 2);
        }
        // Toxic particles — more in higher phases
        const toxicChance = 0.2 + phaseIdx * 0.1;
        if (Math.random() < toxicChance) {
          spawnParticles(px + (Math.random() - 0.5) * s, bodyY - s / 2, 1, ['#4CAF50', '#81C784', '#A5D6A7'], 20, 0.3, 1);
        }
      } else if (bossType === 'shadow_assassin') {
        // Cloak + dual blades + shadow trail
        c.fillStyle = '#311B92';
        c.fillRect(px - s / 2 - 2, bodyY - s / 2 - hs, s + 4, s + hs);
        // Cloak edge detail
        c.fillStyle = '#4A148C';
        c.fillRect(px - s / 2 - 2, bodyY + s / 2 - 2, s + 4, 2);
        // Blades — longer in phase 2+
        const bladeLen = s / 2 + phaseIdx * 2;
        c.fillStyle = '#CE93D8';
        c.fillRect(px - s / 2 - 4, bodyY - 3, 3, bladeLen);
        c.fillRect(px + s / 2 + 1, bodyY - 3, 3, bladeLen);
        // Blade glow in phase 3
        if (phaseIdx >= 2) {
          c.fillStyle = `rgba(206,147,216,${pulse * 0.4})`;
          c.fillRect(px - s / 2 - 5, bodyY - 4, 5, bladeLen + 2);
          c.fillRect(px + s / 2, bodyY - 4, 5, bladeLen + 2);
        }
        // Smoke trail — more intense in higher phases
        const smokeChance = 0.15 + phaseIdx * 0.1;
        if (Math.random() < smokeChance) {
          spawnParticles(px + (Math.random() - 0.5) * 6, bodyY + s / 2, 1, ['#7B1FA2', '#4A148C', '#311B92'], 30, 0.4, 1.5);
        }
      } else if (bossType === 'iron_fortress') {
        // Heavy plating + shield + laser sight + armor damage
        c.fillStyle = '#37474F';
        c.fillRect(px - s / 2 - 3, bodyY - s / 2 - 2, s + 6, s + 4);
        c.fillStyle = '#607D8B';
        c.fillRect(px - s / 2 + 1, bodyY - s / 2 + 2, s - 2, s - 4);
        // Armor rivets
        c.fillStyle = '#90A4AE';
        c.fillRect(px - s / 2 + 2, bodyY - s / 2 + 3, 2, 2);
        c.fillRect(px + s / 2 - 4, bodyY - s / 2 + 3, 2, 2);
        c.fillRect(px - s / 2 + 2, bodyY + s / 2 - 5, 2, 2);
        c.fillRect(px + s / 2 - 4, bodyY + s / 2 - 5, 2, 2);
        // Shield
        c.fillStyle = '#90A4AE';
        c.fillRect(px - s / 2 - 4, bodyY - s / 2 + 2, 3, s - 4);
        // Shield damage in phase 2+
        if (phaseIdx >= 1) {
          c.fillStyle = '#78909C';
          c.fillRect(px - s / 2 - 4, bodyY - 2, 3, 3);
        }
        // Laser sight
        if (!isUp) {
          c.fillStyle = `rgba(244,67,54,${pulse})`;
          c.fillRect(px + eyeOff * 2, bodyY - s / 2 - hs + 3, 2, 2);
        }
        // Sparks in phase 3
        if (phaseIdx >= 2 && Math.random() < 0.15) {
          spawnParticles(px + (Math.random() - 0.5) * s, bodyY - s / 2, 1, ['#FFC107', '#FF9800'], 35, 0.25, 1);
        }
      } else if (bossType === 'cryo_wraith') {
        // Ice crystal body + frost aura + frozen trail
        c.fillStyle = '#0288D1';
        c.fillRect(px - s / 2 - 1, bodyY - s / 2 - 1, s + 2, s + 2);
        c.fillStyle = '#4FC3F7';
        c.fillRect(px - s / 2 + 2, bodyY - s / 2 + 2, s - 4, s - 4);
        // Ice crystals on shoulders
        c.fillStyle = '#B3E5FC';
        c.fillRect(px - s / 2 - 3, bodyY - s / 2 - 2, 4, 4);
        c.fillRect(px + s / 2 - 1, bodyY - s / 2 - 2, 4, 4);
        // Frost crown spikes — more in higher phases
        c.fillStyle = '#E0F7FA';
        c.fillRect(px - 3, bodyY - s / 2 - hs - 6, 2, 5);
        c.fillRect(px + 1, bodyY - s / 2 - hs - 6, 2, 5);
        c.fillRect(px - 1, bodyY - s / 2 - hs - 8, 2, 3);
        if (phaseIdx >= 1) {
          c.fillRect(px - 5, bodyY - s / 2 - hs - 4, 2, 3);
          c.fillRect(px + 3, bodyY - s / 2 - hs - 4, 2, 3);
        }
        // Glowing ice eyes
        if (!isUp) {
          c.fillStyle = `rgba(179,229,252,${pulse})`;
          c.fillRect(px - 2 + eyeOff, bodyY - s / 2 - hs + 3, 2, 2);
          c.fillRect(px + 1 + eyeOff, bodyY - s / 2 - hs + 3, 2, 2);
        }
        // Frost particles — more in higher phases
        const frostChance = 0.25 + phaseIdx * 0.12;
        if (Math.random() < frostChance) {
          spawnParticles(px + (Math.random() - 0.5) * s, bodyY - s / 2, 1, ['#80DEEA', '#B3E5FC', '#E0F7FA'], 20, 0.4, 1);
        }
      } else if (bossType === 'pyro_maniac') {
        // Fire body + flame crown + ember trail
        c.fillStyle = '#E65100';
        c.fillRect(px - s / 2 - 1, bodyY - s / 2 - 1, s + 2, s + 2);
        c.fillStyle = '#FF6D00';
        c.fillRect(px - s / 2 + 2, bodyY - s / 2 + 2, s - 4, s - 4);
        // Flame shoulder pads
        c.fillStyle = '#FFAB00';
        c.fillRect(px - s / 2 - 3, bodyY - s / 2, 5, 5);
        c.fillRect(px + s / 2 - 2, bodyY - s / 2, 5, 5);
        // Animated flame crown — taller in higher phases
        const flameH1 = 4 + phaseIdx * 2 + Math.sin(this.animTimer * 8) * 2;
        const flameH2 = 5 + phaseIdx * 2 + Math.cos(this.animTimer * 7) * 2;
        c.fillStyle = '#FF3D00';
        c.fillRect(px - 4, bodyY - s / 2 - hs - flameH1, 3, flameH1);
        c.fillRect(px + 1, bodyY - s / 2 - hs - flameH2, 3, flameH2);
        c.fillStyle = '#FFAB00';
        c.fillRect(px - 3, bodyY - s / 2 - hs - flameH1 + 1, 2, flameH1 - 2);
        c.fillRect(px + 2, bodyY - s / 2 - hs - flameH2 + 1, 2, flameH2 - 2);
        // Extra flames in phase 2+
        if (phaseIdx >= 1) {
          const flameH3 = 3 + Math.sin(this.animTimer * 9) * 1.5;
          c.fillStyle = '#FF6D00';
          c.fillRect(px - 1, bodyY - s / 2 - hs - flameH3 - 2, 2, flameH3);
        }
        // Glowing fire eyes
        if (!isUp) {
          c.fillStyle = `rgba(255,171,0,${pulse})`;
          c.fillRect(px - 2 + eyeOff, bodyY - s / 2 - hs + 3, 2, 2);
          c.fillRect(px + 1 + eyeOff, bodyY - s / 2 - hs + 3, 2, 2);
        }
        // Ember particles — more in higher phases
        const emberChance = 0.3 + phaseIdx * 0.12;
        if (Math.random() < emberChance) {
          spawnParticles(px + (Math.random() - 0.5) * s, bodyY - s / 2, 1, ['#FF6D00', '#FFAB00', '#FF3D00'], 25, 0.35, 1.5);
        }
      }

      // Boss crown (all bosses)
      c.fillStyle = '#FFD700';
      c.fillRect(px - 4, bodyY - s / 2 - hs - 3, 8, 3);
      c.fillRect(px - 3, bodyY - s / 2 - hs - 5, 2, 2);
      c.fillRect(px + 1, bodyY - s / 2 - hs - 5, 2, 2);
    }

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

    // === M3 Skill visuals ===

    // Freeze aura: blue pulsing circle
    if (this.skill === 'freezeAura') {
      const pulse = Math.sin(this.animTimer * 3) * 0.15 + 0.25;
      c.fillStyle = `rgba(0,188,212,${pulse})`;
      c.beginPath(); c.arc(px, bodyY, this.skillRange, 0, PI2); c.fill();
      c.strokeStyle = `rgba(0,188,212,${pulse * 0.6})`;
      c.lineWidth = 1;
      c.beginPath(); c.arc(px, bodyY, this.skillRange - 8, 0, PI2); c.stroke();
    }

    // Shield: gray arc on front
    if (this.skill === 'shield') {
      const shieldR = s * 0.7;
      c.fillStyle = '#90A4AE';
      // Draw shield arc covering ±60° of shieldAngle
      const startAngle = this.shieldAngle - Math.PI / 3;
      const endAngle = this.shieldAngle + Math.PI / 3;
      c.beginPath();
      c.arc(px, bodyY, shieldR, startAngle, endAngle);
      c.lineTo(px, bodyY);
      c.closePath();
      c.fill();
      c.strokeStyle = '#546E7A';
      c.lineWidth = 1.5;
      c.stroke();
      // Shield highlight
      c.fillStyle = '#B0BEC5';
      c.beginPath();
      c.arc(px, bodyY, shieldR * 0.6, this.shieldAngle - 0.3, this.shieldAngle + 0.3);
      c.lineTo(px, bodyY);
      c.closePath();
      c.fill();
    }

    // Leap windup: red warning circle
    if (this.skill === 'leap' && this.skillActive) {
      const pulse = 0.3 + Math.sin(this.animTimer * 10) * 0.2;
      c.fillStyle = `rgba(255,87,34,${pulse})`;
      c.beginPath(); c.arc(px, bodyY, s + 6, 0, PI2); c.fill();
      c.strokeStyle = `rgba(255,87,34,${pulse * 0.8})`;
      c.lineWidth = 1.5;
      c.beginPath(); c.arc(px, bodyY, s + 8, 0, PI2); c.stroke();
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

  // M3 new zombie types — independent 10% chance per type per threshold
  const nr = Math.random();
  if (dl >= 6 && nr < 0.10) type = 'shielder';
  else if (dl >= 5 && nr < 0.10) type = 'leaper';
  else if (dl >= 4 && nr < 0.10) type = 'summoner';
  else if (dl >= 3 && nr < 0.10) type = 'freezer';
  else if (dl >= 2 && nr < 0.10) type = 'charger';
  else if (dl >= 6 && roll < 0.05 + wb * 0.3) {
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
