import { IW, IH, PI2 } from '../config.js';
import { rgba } from '../utils.js';

const lights = [];
let _ctx = null;
let _lightCanvas = null;
let _lightCtx = null;

export function initLighting(canvas) {
  _ctx = canvas.getContext('2d');
  _lightCanvas = document.createElement('canvas');
  _lightCanvas.width = IW;
  _lightCanvas.height = IH;
  _lightCtx = _lightCanvas.getContext('2d');
  _lightCtx.imageSmoothingEnabled = false;
}

export function addLight(x, y, radius, color, intensity) {
  if (lights.length < 80) lights.push({ x, y, radius, color, intensity });
}

export function drawLighting(player) {
  if (!_ctx || !_lightCtx) return;

  const lc = _lightCtx;
  const w = _lightCanvas.width;
  const h = _lightCanvas.height;

  // 1. Fill with dark overlay
  lc.clearRect(0, 0, w, h);
  lc.fillStyle = 'rgba(8,8,20,0.55)';
  lc.fillRect(0, 0, w, h);

  // 2. Cut holes for lights
  lc.globalCompositeOperation = 'destination-out';

  const playerRadius = player?.alive ? Math.max(100, Math.min(IW, IH) * 0.2) : 0;

  for (const l of lights) {
    const dx = player?.alive ? l.x - player.x : 9999;
    const dy = player?.alive ? l.y - player.y : 9999;
    const distToPlayer = Math.sqrt(dx * dx + dy * dy);
    if (player?.alive && distToPlayer + l.radius < playerRadius * 0.8) continue;

    const grad = lc.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.radius);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    lc.fillStyle = grad;
    lc.beginPath(); lc.arc(l.x, l.y, l.radius, 0, PI2); lc.fill();
  }

  // Player ambient light
  if (player?.alive) {
    const grad = lc.createRadialGradient(player.x, player.y, 0, player.x, player.y, playerRadius);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    lc.fillStyle = grad;
    lc.beginPath(); lc.arc(player.x, player.y, playerRadius, 0, PI2); lc.fill();
  }

  lc.globalCompositeOperation = 'source-over';

  // 3. Draw lighting overlay on game canvas (source-over = simple overlay)
  _ctx.drawImage(_lightCanvas, 0, 0);

  // Clear lights for next frame
  lights.length = 0;
}
