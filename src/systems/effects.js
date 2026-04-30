import { IW, IH } from '../config.js';
import { rgba } from '../utils.js';

let shakeAmount = 0, shakeDuration = 0;
let damageVignette = 0, lowHpPulse = 0, flashEffect = 0, flashColor = '#FFF';
let hitStopTimer = 0;

export function triggerShake(amount, duration) { shakeAmount = Math.max(shakeAmount, amount); shakeDuration = Math.max(shakeDuration, duration); }
export function getShakeOffset() { if (shakeDuration <= 0) return { x: 0, y: 0 }; return { x: (Math.random() - 0.5) * shakeAmount * 2, y: (Math.random() - 0.5) * shakeAmount * 2 }; }
export function triggerDamageVignette(v) { damageVignette = Math.max(damageVignette, v); }
export function triggerFlash(color = '#FFF') { flashEffect = 1; flashColor = color; }
export function triggerHitStop(duration) { hitStopTimer = Math.max(hitStopTimer, duration); }
export function getHitStopTimer() { return hitStopTimer; }

export function updateEffects(dt) {
  damageVignette = Math.max(0, damageVignette - dt * 3);
  lowHpPulse += dt * 4;
  flashEffect = Math.max(0, flashEffect - dt * 6);
  hitStopTimer = Math.max(0, hitStopTimer - dt);
  if (shakeDuration > 0) { shakeDuration -= dt; if (shakeDuration <= 0) shakeAmount = 0; }
  else shakeAmount = Math.max(0, shakeAmount - dt * 20);
}

export function drawScreenEffects(c, player) {
  if (flashEffect > 0) { c.fillStyle = rgba(flashColor, flashEffect * 0.3); c.fillRect(0, 0, IW, IH); }
  if (damageVignette > 0) {
    const g = c.createRadialGradient(IW / 2, IH / 2, IW * 0.3, IW / 2, IH / 2, IW * 0.7);
    g.addColorStop(0, 'rgba(255,0,0,0)'); g.addColorStop(1, rgba('#FF0000', damageVignette * 0.5));
    c.fillStyle = g; c.fillRect(0, 0, IW, IH);
  }
  if (player?.alive && player.hp < player.maxHp * 0.3) {
    const a = 0.15 + 0.1 * Math.sin(lowHpPulse);
    const g = c.createRadialGradient(IW / 2, IH / 2, IW * 0.2, IW / 2, IH / 2, IW * 0.6);
    g.addColorStop(0, 'rgba(255,0,0,0)'); g.addColorStop(1, rgba('#FF0000', a));
    c.fillStyle = g; c.fillRect(0, 0, IW, IH);
  }
}

export function drawVignette(c) {
  const vig = c.createRadialGradient(IW / 2, IH / 2, IW * 0.35, IW / 2, IH / 2, IW * 0.7);
  vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,0.25)');
  c.fillStyle = vig; c.fillRect(0, 0, IW, IH);
}
