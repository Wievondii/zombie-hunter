import { IW, IH, PI2 } from '../config.js';
import { clamp, randRange } from '../utils.js';
import { WEAPON_DATA, POWERUP_TYPES } from '../data.js';
import { audio } from '../audio.js';
import { keys, mouseX, mouseY, mouseDown, joyActive, joyDx, joyDy } from '../input.js';
import { spawnParticles, createParticle, particles, spawnFloatingText } from '../systems/particles.js';
import { triggerShake } from '../systems/effects.js';
import { addLight } from '../systems/lighting.js';
import { bullets } from './bullet.js';
import { AnimationController, Facing } from '../sprites/AnimationController.js';

export const turrets = [];

export class Player {
  constructor() {
    this.x = IW / 2; this.y = IH / 2;
    this.width = 14; this.height = 14; this.speed = 200;
    this.hp = 100; this.maxHp = 100; this.alive = true;
    this.invincibleTimer = 0; this.aimAngle = 0;
    this.weapons = ['pistol']; this.currentWeaponIndex = 0;
    this.ammo = 60; this.maxAmmo = 200; this.coins = 0;
    this.recoilOffset = 0; this.flashTimer = 0;
    this.animTimer = 0; this.muzzleFlash = { x: 0, y: 0, timer: 0 };
    this._shotCooldown = 0;
    this.damageMult = 1; this.armorMult = 1; this.coinMult = 1;
    this.regenRate = 0; this.fireRateMult = 1;
    this.weaponUpgrades = { damage: 0, fireRate: 0 };
    this._lastX = undefined; this._lastY = undefined;
    this.activePowerups = { speed: 0, rapidFire: 0, shield: 0, magnet: 0 };
    this.anim = new AnimationController();

    // Character ability system
    this.characterId = 'soldier';
    this.special = null;
    this.abilityCooldown = 0;
    this.abilityMaxCooldown = 3;

    // Warrior rage state
    this.rageActive = false;
    this.rageTimer = 0;
    this.meleeDamageMult = 1.0;

    // Scout dodge state
    this.dodgeTimer = 0;
    this.dodgeDx = 0;
    this.dodgeDy = 0;
    this.dodgeSpeed = 600;
    this.dodgeDuration = 0.2;

    // Crit stats (from loot)
    this.critChance = 0;
    this.critDamage = 1.5;
    this.pickupRadius = 22;

    // Slow debuff (from cryo wraith)
    this._slowTimer = 0;
    this._slowMult = 1;

    // Weapon display order (set by HUD each frame)
    this.weaponSlots = null;
  }

  get currentWeapon() { return this.weapons[this.currentWeaponIndex]; }
  get weaponData() { return WEAPON_DATA[this.currentWeapon]; }
  getEffectiveSpeed() {
    const slowMult = this._slowTimer > 0 ? this._slowMult : 1;
    return this.speed * (this.activePowerups.speed > 0 ? 1.5 : 1) * slowMult;
  }
  getEffectiveFireRate() {
    const base = this.weaponData?.fireRate || 0.38;
    const mult = this.fireRateMult * (this.activePowerups.rapidFire > 0 ? 0.5 : 1);
    return Math.max(0.03, base * mult + this.weaponUpgrades.fireRate);
  }

  update(dt) {
    if (!this.alive) return;
    this.invincibleTimer = Math.max(0, this.invincibleTimer - dt);
    this.recoilOffset = Math.max(0, this.recoilOffset - dt * 15);
    this.flashTimer = Math.max(0, this.flashTimer - dt);
    this.muzzleFlash.timer = Math.max(0, this.muzzleFlash.timer - dt);
    this.animTimer += dt;
    this.abilityCooldown = Math.max(0, this.abilityCooldown - dt);

    // Rage timer countdown
    if (this.rageActive) {
      this.rageTimer -= dt;
      if (this.rageTimer <= 0) {
        this.rageActive = false;
        this.rageTimer = 0;
        this.armorMult = this._originalArmorMult ?? this.armorMult;
        this.meleeDamageMult = 1.0;
      } else {
        // Red glow particles around player during rage (2-3 per frame)
        const gc = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < gc; i++) {
          const angle = Math.random() * PI2;
          const dist = 14 + Math.random() * 10;
          const color = ['#F44336', '#FF5252', '#FF8A80', '#FF0000'][Math.floor(Math.random() * 4)];
          const p = createParticle(
            this.x + Math.cos(angle) * dist,
            this.y + Math.sin(angle) * dist,
            Math.cos(angle) * 30,
            Math.sin(angle) * 30,
            color, 0.25 + Math.random() * 0.15, 1.8 + Math.random() * 0.5
          );
          particles.push(p);
        }
      }
    }

    for (const k in this.activePowerups) { if (this.activePowerups[k] > 0) this.activePowerups[k] -= dt; }
    if (this._slowTimer > 0) this._slowTimer -= dt;
    if (this.regenRate > 0) this.hp = Math.min(this.maxHp, this.hp + this.regenRate * dt);

    // Magnet
    if (this.activePowerups.magnet > 0) {
      for (const pk of window.__game?.pickups ?? []) {
        if (!pk.alive) continue;
        const d = Math.hypot(pk.x - this.x, pk.y - this.y);
        if (d < 120) {
          const a = Math.atan2(this.y - pk.y, this.x - pk.x);
          pk.x += Math.cos(a) * 200 * dt; pk.y += Math.sin(a) * 200 * dt;
        }
      }
    }

    // Scout dodge movement
    if (this.dodgeTimer > 0) {
      this.dodgeTimer -= dt;
      this.x = clamp(this.x + this.dodgeDx * this.dodgeSpeed * dt, 10, IW - 10);
      this.y = clamp(this.y + this.dodgeDy * this.dodgeSpeed * dt, 10, IH - 10);
      this.invincibleTimer = Math.max(this.invincibleTimer, 0.05);
      spawnParticles(this.x, this.y, 2, ['#4CAF50', '#81C784', '#FFF'], 80, 0.15, 1.5);
      return; // Skip normal movement during dodge
    }

    let moveX = 0, moveY = 0;
    if (keys['w'] || keys['arrowup']) moveY -= 1;
    if (keys['s'] || keys['arrowdown']) moveY += 1;
    if (keys['a'] || keys['arrowleft']) moveX -= 1;
    if (keys['d'] || keys['arrowright']) moveX += 1;
    if (joyActive) { moveX = joyDx; moveY = joyDy; }
    if (moveX !== 0 || moveY !== 0) { const len = Math.hypot(moveX, moveY); moveX /= len; moveY /= len; }
    const spd = this.getEffectiveSpeed();
    const isMoving = moveX !== 0 || moveY !== 0;
    this.x = clamp(this.x + moveX * spd * dt, 10, IW - 10);
    this.y = clamp(this.y + moveY * spd * dt, 10, IH - 10);
    this.aimAngle = Math.atan2(mouseY - this.y, mouseX - this.x);

    // Update animation
    if (isMoving) this.anim.setFacingFromVelocity(moveX, moveY);
    this.anim.update(dt, isMoving, mouseDown && this.canShoot());

    // Weapon switch (1-7) — uses display order from HUD
    const slots = this.weaponSlots || this.weapons;
    if (keys['1'] && slots.length > 0) this.switchWeapon(this.weapons.indexOf(slots[0]));
    if (keys['2'] && slots.length > 1) this.switchWeapon(this.weapons.indexOf(slots[1]));
    if (keys['3'] && slots.length > 2) this.switchWeapon(this.weapons.indexOf(slots[2]));
    if (keys['4'] && slots.length > 3) this.switchWeapon(this.weapons.indexOf(slots[3]));
    if (keys['5'] && slots.length > 4) this.switchWeapon(this.weapons.indexOf(slots[4]));
    if (keys['6'] && slots.length > 5) this.switchWeapon(this.weapons.indexOf(slots[5]));
    if (keys['7'] && slots.length > 6) this.switchWeapon(this.weapons.indexOf(slots[6]));

    // Ability activation (Space or Shift)
    if ((keys[' '] || keys['shift']) && this.abilityCooldown <= 0 && this.special) {
      this.activateAbility();
    }

    // Shooting
    const wdata = this.weaponData;
    if (mouseDown && wdata) {
      if ((wdata.ammoCost === 0 || this.ammo >= wdata.ammoCost) && this.canShoot()) this.shoot(mouseX, mouseY);
    }
    if (!mouseDown) this._shotCooldown = 0;
    this._shotCooldown = Math.max(0, this._shotCooldown - dt);
  }

  activateAbility() {
    if (this.special === 'dodge') {
      // Scout dodge: quick dash in movement direction
      let dx = 0, dy = 0;
      if (keys['w'] || keys['arrowup']) dy -= 1;
      if (keys['s'] || keys['arrowdown']) dy += 1;
      if (keys['a'] || keys['arrowleft']) dx -= 1;
      if (keys['d'] || keys['arrowright']) dx += 1;
      if (dx === 0 && dy === 0) { dx = Math.cos(this.aimAngle); dy = Math.sin(this.aimAngle); }
      const len = Math.hypot(dx, dy);
      this.dodgeDx = dx / len;
      this.dodgeDy = dy / len;
      this.dodgeTimer = this.dodgeDuration;
      this.abilityCooldown = this.abilityMaxCooldown;
      this.invincibleTimer = this.dodgeDuration + 0.1;
      audio.click();
      spawnParticles(this.x, this.y, 10, ['#4CAF50', '#81C784', '#FFF'], 150, 0.3, 2);
    } else if (this.special === 'turret') {
      // Engineer turret: deploy auto-shooting turret
      turrets.push({
        x: this.x, y: this.y,
        hp: 30, maxHp: 30,
        damage: 2,
        range: 120,
        fireRate: 0.4,
        fireCooldown: 0,
        life: 15,
        alive: true,
        animTimer: 0,
      });
      this.abilityCooldown = this.abilityMaxCooldown;
      audio.purchase();
      spawnParticles(this.x, this.y, 12, ['#FF9800', '#FFB74D', '#FFF'], 100, 0.3, 2);
      triggerShake(3, 0.1);
    } else if (this.special === 'mage_fireball') {
      // Mage fireball: explosive projectile with AoE damage
      const angle = this.aimAngle;
      const bx = this.x + Math.cos(angle) * 14;
      const by = this.y + Math.sin(angle) * 14;
      bullets.push({
        x: bx, y: by,
        vx: Math.cos(angle) * 200,
        vy: Math.sin(angle) * 200,
        damage: 60 * this.damageMult,
        penetrating: false,
        color: '#FF6F00',
        alive: true,
        trail: [],
        distanceTraveled: 0,
        maxDistance: 400,
        explosive: true,
        explosionRadius: 40,
      });
      this.abilityCooldown = this.abilityMaxCooldown;
      audio.shoot('launcher');
      spawnParticles(bx, by, 10, ['#FF6F00', '#FF9800', '#FF5722', '#FFF'], 180, 0.35, 2.5);
      triggerShake(4, 0.15);
    } else if (this.special === 'elf_summon') {
      // Elf summon: mobile friendly archer
      turrets.push({
        x: this.x + 20, y: this.y,
        hp: 50, maxHp: 50,
        damage: 15,
        range: 150,
        fireRate: 0.5,
        fireCooldown: 0,
        life: 10,
        alive: true,
        animTimer: 0,
        type: 'elf',
        speed: 120,
      });
      this.abilityCooldown = this.abilityMaxCooldown;
      audio.purchase();
      // Green pillar effect: 20 upward particles
      for (let i = 0; i < 20; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
        const spd = 60 + Math.random() * 100;
        const color = ['#4CAF50', '#81C784', '#A5D6A7', '#FFF'][Math.floor(Math.random() * 4)];
        const p = createParticle(
          this.x + (Math.random() - 0.5) * 16,
          this.y,
          Math.cos(angle) * spd,
          Math.sin(angle) * spd - 30,
          color, 0.4 + Math.random() * 0.3, 2 + Math.random()
        );
        particles.push(p);
      }
      triggerShake(2, 0.1);
    } else if (this.special === 'warrior_rage') {
      // Warrior rage: damage reduction + melee damage buff
      this.rageActive = true;
      this.rageTimer = 5;
      this._originalArmorMult = this.armorMult;
      this.armorMult *= 0.5;
      this.meleeDamageMult = 2.0;
      this.abilityCooldown = this.abilityMaxCooldown;
      spawnParticles(this.x, this.y, 20, ['#F44336', '#FF5252', '#D32F2F', '#FF0000'], 200, 0.5, 3);
      triggerShake(6, 0.25);
    }
  }

  canShoot() { return this._shotCooldown <= 0 && this.dodgeTimer <= 0; }

  shoot(tx, ty) {
    const wdata = this.weaponData;
    if (!wdata) return;
    this._shotCooldown = this.getEffectiveFireRate();
    if (wdata.ammoCost > 0) { if (this.ammo < wdata.ammoCost) return; this.ammo -= wdata.ammoCost; }
    const angle = this.aimAngle;
    const bLen = 14;
    const bx = this.x + Math.cos(angle) * bLen;
    const by = this.y + Math.sin(angle) * bLen;
    this.muzzleFlash = { x: bx, y: by, timer: 0.05 };
    this.flashTimer = 0.04; this.recoilOffset = 3;
    audio.shoot(this.currentWeapon);
    let dmg = wdata.damage * (1 + this.weaponUpgrades.damage) * this.damageMult;

    // Crit check
    let isCrit = false;
    if (this.critChance > 0 && Math.random() < this.critChance) {
      dmg *= this.critDamage;
      isCrit = true;
    }

    if (wdata.type === 'shotgun') {
      const pc = wdata.pelletCount || 5;
      const sp = wdata.spread || 0.3;
      for (let i = 0; i < pc; i++) {
        const a = angle + (Math.random() - 0.5) * sp;
        const s = wdata.bulletSpeed * (0.85 + Math.random() * 0.3);
        bullets.push({ x: bx, y: by, vx: Math.cos(a) * s, vy: Math.sin(a) * s, damage: dmg, penetrating: false, color: isCrit ? '#FF1744' : wdata.bulletColor, alive: true, trail: [], distanceTraveled: 0, maxDistance: 550 });
      }
      spawnParticles(bx, by, 8, ['#FFAA00', '#FFD700', '#FF8800', '#FFF'], 200, 0.2, 2);
    } else if (wdata.type === 'launcher') {
      // Explosive projectile
      bullets.push({ x: bx, y: by, vx: Math.cos(angle) * wdata.bulletSpeed, vy: Math.sin(angle) * wdata.bulletSpeed, damage: dmg, penetrating: false, color: wdata.bulletColor, alive: true, trail: [], distanceTraveled: 0, maxDistance: 550, explosive: true, explosionRadius: wdata.explosionRadius || 50 });
      spawnParticles(bx, by, 5, ['#FF5722', '#FF8A65', '#FFF'], 150, 0.2, 2);
    } else {
      const sa = angle + (Math.random() - 0.5) * (wdata.spread || 0.04);
      bullets.push({ x: bx, y: by, vx: Math.cos(sa) * wdata.bulletSpeed, vy: Math.sin(sa) * wdata.bulletSpeed, damage: dmg, penetrating: wdata.penetrating || false, color: isCrit ? '#FF1744' : wdata.bulletColor, alive: true, trail: [], distanceTraveled: 0, maxDistance: 550 });
      spawnParticles(bx, by, 3, ['#FFAA00', '#FFD700', '#FFF'], 100, 0.15, 1.5);
    }

    if (isCrit) spawnFloatingText(bx, by - 8, '暴击!', '#FF1744', 0.6);

    const ea = angle + Math.PI + (Math.random() - 0.5) * 0.6;
    const es = 60 + Math.random() * 80;
    const sp = createParticle(this.x, this.y, Math.cos(ea) * es, Math.sin(ea) * es - 40, '#D4A574', 0.4, 2);
    particles.push(sp);
    triggerShake(wdata.recoilShake || 1.5, 0.06);
    addLight(bx, by, 80, '#FFAA00', 0.4);
  }

  switchWeapon(i) { if (i >= 0 && i < this.weapons.length) { this.currentWeaponIndex = i; this._shotCooldown = 0; } }
  addWeapon(w) { if (!this.weapons.includes(w)) { this.weapons.push(w); return true; } return false; }

  takeDamage(amount) {
    if (this.invincibleTimer > 0) return;
    if (this.dodgeTimer > 0) return; // Immune during dodge
    if (this.activePowerups.shield > 0) {
      amount *= 0.3;
      spawnParticles(this.x, this.y, 8, ['#2196F3', '#64B5F6', '#FFF'], 120, 0.3, 2);
    }
    amount *= this.armorMult;
    amount = Math.max(0, amount);
    this.hp -= amount; this.invincibleTimer = 0.5;
    triggerShake(6, 0.2);
    spawnParticles(this.x, this.y, 15, ['#FF4444', '#FF0000', '#FF6666', '#AA0000'], 180, 0.5, 3);
    audio.playerHurt();
    if (this.hp <= 0) {
      this.hp = 0; this.alive = false;
      spawnParticles(this.x, this.y, 40, ['#FF4444', '#FF0000', '#FF8888', '#FFF', '#AA0000'], 250, 0.8, 4);
      triggerShake(15, 0.5);
    }
  }

  draw(c) {
    if (!this.alive) return;
    const px = this.x | 0, py = this.y | 0;
    if (this.invincibleTimer > 0 && (this.invincibleTimer * 20 | 0) % 2 === 0) c.globalAlpha = 0.5;

    // Dodge trail effect
    if (this.dodgeTimer > 0) {
      c.globalAlpha = 0.4;
      c.fillStyle = '#4CAF50';
      c.fillRect(px - 6, py - 6, 12, 12);
      c.globalAlpha = 0.6;
    }

    // Shield visual
    if (this.activePowerups.shield > 0) {
      c.strokeStyle = `rgba(33,150,243,${0.5 + 0.3 * Math.sin(this.animTimer * 6)})`;
      c.lineWidth = 2; c.beginPath(); c.arc(px, py, 18, 0, PI2); c.stroke(); c.lineWidth = 1;
    }
    if (this.activePowerups.speed > 0) { c.fillStyle = 'rgba(0,229,255,0.15)'; c.fillRect(px - 6, py - 2, 12, 4); }

    // Animation
    const isWalk = this.anim.state === 'walk';
    const wc = isWalk ? Math.sin(this.animTimer * 10) * 3 : 0;
    const flip = this.anim.flipX;
    const dir = flip ? -1 : 1;

    // Shadow
    c.fillStyle = 'rgba(0,0,0,0.4)'; c.fillRect(px - 7, py + 5, 14, 4);

    // Boots (animated)
    c.fillStyle = '#3D2B1F';
    c.fillRect(px - 5, py + 3 + wc, 4, 3);
    c.fillRect(px + 1, py + 3 - wc, 4, 3);

    // Pants (animated)
    c.fillStyle = '#3D5A80';
    c.fillRect(px - 5, py + 1 + wc * 0.5, 4, 3);
    c.fillRect(px + 1, py + 1 - wc * 0.5, 4, 3);

    // Body (red when rage active)
    if (this.rageActive) {
      c.fillStyle = '#F44336'; c.fillRect(px - 5, py - 4, 10, 7);
      c.fillStyle = '#D32F2F'; c.fillRect(px - 5, py - 4, 10, 1); c.fillRect(px - 5, py + 1, 10, 1);
      // Belt
      c.fillStyle = '#FF5722'; c.fillRect(px - 5, py + 2, 10, 2);
      // Red aura glow
      c.fillStyle = 'rgba(244,67,54,0.15)';
      c.fillRect(px - 8, py - 8, 16, 16);
    } else {
      c.fillStyle = '#4A90D9'; c.fillRect(px - 5, py - 4, 10, 7);
      c.fillStyle = '#2C5F8A'; c.fillRect(px - 5, py - 4, 10, 1); c.fillRect(px - 5, py + 1, 10, 1);
      // Belt
      c.fillStyle = '#8B6914'; c.fillRect(px - 5, py + 2, 10, 2);
    }

    // Head (directional)
    if (this.anim.isUp) {
      // Back of head
      c.fillStyle = '#3D2B1F'; c.fillRect(px - 4, py - 10, 8, 3);
      c.fillRect(px - 5, py - 9, 10, 2);
    } else {
      // Face
      c.fillStyle = '#F4C59A'; c.fillRect(px - 4, py - 9, 8, 6);
      c.fillStyle = '#D4A574'; c.fillRect(px - 4, py - 9, 8, 1);

      // Eyes (directional offset)
      const eyeOff = flip ? -1 : 1;
      c.fillStyle = '#000';
      c.fillRect(px - 1 + eyeOff, py - 7, 1, 1);
      c.fillRect(px + 1 + eyeOff, py - 7, 1, 1);

      // Hair
      c.fillStyle = '#3D2B1F';
      c.fillRect(px - 5, py - 11, 10, 2);
      c.fillRect(px - 4, py - 12, 8, 1);

      // Mouth (subtle)
      c.fillStyle = '#C4956A';
      c.fillRect(px - 1, py - 5, 2, 1);
    }

    // Gun arm
    const angle = this.aimAngle;
    const gl = 12;
    const gtx = px + Math.cos(angle) * gl, gty = py + Math.sin(angle) * gl;
    const gmx = px + Math.cos(angle) * 6, gmy = py + Math.sin(angle) * 6;

    // Gun (3-layer)
    c.strokeStyle = '#555'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(px, py - 2); c.lineTo(gtx, gty); c.stroke();
    c.strokeStyle = '#777'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(px, py - 2); c.lineTo(gmx, gmy); c.stroke();
    c.lineWidth = 1; c.strokeStyle = '#999';
    c.beginPath(); c.moveTo(px, py - 3); c.lineTo(gtx, gty); c.stroke();

    // Muzzle flash
    if (this.muzzleFlash.timer > 0) {
      c.fillStyle = '#FFE066'; c.fillRect(gtx - 2 | 0, gty - 2 | 0, 5, 5);
      c.fillStyle = '#FFF'; c.fillRect(gtx - 1 | 0, gty - 1 | 0, 3, 3);
      c.fillStyle = '#FFAA00'; c.fillRect(gtx - 4 | 0, gty - 4 | 0, 8, 8);
    }

    c.globalAlpha = 1;
  }
}

// Turret update/draw functions
export function updateTurrets(dt, zombies, bullets) {
  for (let i = turrets.length - 1; i >= 0; i--) {
    const t = turrets[i];
    t.life -= dt;
    t.animTimer += dt;
    if (t.life <= 0 || t.hp <= 0) {
      if (t.hp <= 0) spawnParticles(t.x, t.y, 15, ['#FF9800', '#795548', '#333'], 120, 0.4, 2);
      turrets.splice(i, 1);
      continue;
    }

    // Elf: move toward nearest zombie
    if (t.type === 'elf') {
      let nearest = null, nearestDist = t.range * t.range;
      for (const z of zombies) {
        if (!z.alive) continue;
        const dx = z.x - t.x, dy = z.y - t.y;
        const d = dx * dx + dy * dy;
        if (d < nearestDist) { nearestDist = d; nearest = z; }
      }
      if (nearest) {
        const angle = Math.atan2(nearest.y - t.y, nearest.x - t.x);
        t.x = clamp(t.x + Math.cos(angle) * t.speed * dt, 10, IW - 10);
        t.y = clamp(t.y + Math.sin(angle) * t.speed * dt, 10, IH - 10);
      }
    }

    // Find nearest zombie
    t.fireCooldown -= dt;
    if (t.fireCooldown <= 0) {
      let nearest = null, nearestDist = t.range * t.range;
      for (const z of zombies) {
        if (!z.alive) continue;
        const dx = z.x - t.x, dy = z.y - t.y;
        const d = dx * dx + dy * dy;
        if (d < nearestDist) { nearestDist = d; nearest = z; }
      }
      if (nearest) {
        const angle = Math.atan2(nearest.y - t.y, nearest.x - t.x);
        const speed = 500;
        bullets.push({
          x: t.x, y: t.y - 5,
          vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          damage: t.damage, penetrating: false, color: '#FF9800',
          alive: true, trail: [], distanceTraveled: 0, maxDistance: t.range + 20,
        });
        t.fireCooldown = t.fireRate;
        audio.shoot('smg');
      }
    }
  }
}

export function drawTurrets(c) {
  for (const t of turrets) {
    const px = t.x | 0, py = t.y | 0;

    // Elf summon: green pixie archer
    if (t.type === 'elf') {
      // Green glow circle
      c.fillStyle = 'rgba(76,175,80,0.2)';
      c.beginPath(); c.arc(px, py, 12, 0, PI2); c.fill();
      // Inner glow
      c.fillStyle = 'rgba(76,175,80,0.15)';
      c.fillRect(px - 7, py - 7, 14, 14);
      // Wings (extended for 8x9 body)
      c.fillStyle = '#A5D6A7';
      c.fillRect(px - 7, py - 2, 3, 5);
      c.fillRect(px + 4, py - 2, 3, 5);
      // Body (8x9)
      c.fillStyle = '#4CAF50';
      c.fillRect(px - 4, py - 4, 8, 9);
      // Head
      c.fillStyle = '#81C784';
      c.fillRect(px - 4, py - 7, 8, 4);
      // Eyes
      c.fillStyle = '#FFF';
      c.fillRect(px - 2, py - 6, 1, 1);
      c.fillRect(px + 1, py - 6, 1, 1);
      // Hair
      c.fillStyle = '#2E7D32';
      c.fillRect(px - 5, py - 8, 10, 1);
      c.fillRect(px - 4, py - 9, 8, 1);
      // Bow
      c.fillStyle = '#8D6E63';
      c.fillRect(px + 4, py - 4, 2, 6);
      // HP bar
      if (t.hp < t.maxHp) {
        const hpW = 12, hpH = 2;
        c.fillStyle = '#333'; c.fillRect(px - hpW / 2, py - 12, hpW, hpH);
        c.fillStyle = '#4CAF50'; c.fillRect(px - hpW / 2, py - 12, (hpW * t.hp / t.maxHp) | 0, hpH);
      }
      continue; // Skip regular turret draw
    }

    // Base
    c.fillStyle = '#5D4037';
    c.fillRect(px - 6, py - 2, 12, 8);
    // Body
    c.fillStyle = '#795548';
    c.fillRect(px - 4, py - 8, 8, 8);
    // Barrel
    c.fillStyle = '#424242';
    c.fillRect(px - 2, py - 12, 4, 6);
    // Light indicator
    c.fillStyle = t.life < 3 ? '#F44336' : '#4CAF50';
    c.fillRect(px - 1, py - 10, 2, 2);
    // HP bar
    if (t.hp < t.maxHp) {
      const hpW = 10, hpH = 2;
      c.fillStyle = '#333'; c.fillRect(px - hpW / 2, py - 14, hpW, hpH);
      c.fillStyle = '#4CAF50'; c.fillRect(px - hpW / 2, py - 14, (hpW * t.hp / t.maxHp) | 0, hpH);
    }
  }
}
