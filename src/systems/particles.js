import { PI2, MAX_PARTICLES } from '../config.js';
import { rgba } from '../utils.js';
import { perf } from './performance.js';

export const particles = [];
export const floatingTexts = [];
export const bloodPools = [];

// Reusable particle pool to reduce GC
const _pool = [];
const MAX_POOL = 200;

export function createParticle(x, y, vx, vy, color, life, size = 2) {
  if (_pool.length > 0) {
    const p = _pool.pop();
    p.x = x; p.y = y; p.vx = vx; p.vy = vy;
    p.color = color; p.life = life; p.maxLife = life;
    p.size = size; p.alive = true;
    return p;
  }
  return { x, y, vx, vy, color, life, maxLife: life, size, alive: true };
}

function _recycleParticle(p) {
  if (_pool.length < MAX_POOL) _pool.push(p);
}

export function updateParticle(p, dt) {
  p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 120 * dt;
  p.life -= dt; if (p.life <= 0) p.alive = false;
}

export function drawParticle(c, p) {
  const a = Math.max(0, p.life / p.maxLife);
  const s = p.size * (0.6 + 0.4 * a);
  c.fillStyle = rgba(p.color, a);
  c.fillRect(p.x - s / 2 | 0, p.y - s / 2 | 0, Math.ceil(s), Math.ceil(s));
}

export function spawnParticles(x, y, count, colors, speed = 150, life = 0.5, size = 2) {
  // Scale down particle count based on performance level
  const scaled = Math.max(1, Math.ceil(count * perf.particleMult));
  for (let i = 0; i < scaled; i++) {
    const angle = Math.random() * PI2;
    const spd = speed * (0.4 + Math.random() * 1.6);
    const vx = Math.cos(angle) * spd;
    const vy = Math.sin(angle) * spd - Math.random() * 100;
    const color = colors[Math.floor(Math.random() * colors.length)];
    particles.push(createParticle(x, y, vx, vy, color, life * (0.5 + Math.random()), size));
  }
  if (particles.length > perf.maxParticles) {
    const excess = particles.splice(0, particles.length - perf.maxParticles);
    for (const p of excess) _recycleParticle(p);
  }
}

export function spawnFloatingText(x, y, text, color = '#FFD700', life = 0.8) {
  floatingTexts.push({ x, y, text, color, life, maxLife: life, vy: -80, alive: true });
}

export function spawnBloodPool(x, y, size) {
  bloodPools.push({ x, y, size: size + Math.random() * 4, alpha: 0.6, life: 15 + Math.random() * 10 });
}

export function updateParticlesAndTexts(dt) {
  // Swap-and-pop for particles
  for (let i = particles.length - 1; i >= 0; i--) {
    updateParticle(particles[i], dt);
    if (!particles[i].alive) {
      _recycleParticle(particles[i]);
      particles[i] = particles[particles.length - 1];
      particles.pop();
    }
  }
  // Swap-and-pop for floating texts
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    floatingTexts[i].y += floatingTexts[i].vy * dt;
    floatingTexts[i].life -= dt;
    if (floatingTexts[i].life <= 0) {
      floatingTexts[i] = floatingTexts[floatingTexts.length - 1];
      floatingTexts.pop();
    }
  }
}

export function updateBloodPools(dt) {
  for (let i = bloodPools.length - 1; i >= 0; i--) {
    bloodPools[i].life -= dt;
    if (bloodPools[i].life <= 0) {
      bloodPools[i] = bloodPools[bloodPools.length - 1];
      bloodPools.pop();
    }
  }
}

export function drawBloodPools(c) {
  for (const bp of bloodPools) {
    const a = bp.alpha * Math.min(1, bp.life / 5);
    c.fillStyle = rgba('#8B0000', a);
    c.beginPath(); c.arc(bp.x, bp.y, bp.size, 0, PI2); c.fill();
    c.fillStyle = rgba('#5C0000', a * 0.5);
    c.beginPath(); c.arc(bp.x + 2, bp.y - 1, bp.size * 0.6, 0, PI2); c.fill();
  }
}

export function clearAll() {
  // Recycle particles back to pool
  for (const p of particles) _recycleParticle(p);
  particles.length = 0;
  floatingTexts.length = 0;
  bloodPools.length = 0;
}
