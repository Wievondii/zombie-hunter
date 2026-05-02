import { IW, IH } from './config.js';
import { audio } from './audio.js';

export const keys = {};
export let mouseX = IW / 2, mouseY = IH / 2;
export let mouseDown = false, mouseJustPressed = false;
export let joyActive = false, joyDx = 0, joyDy = 0;
export let mouseWheelDelta = 0;

export function initInput(canvas) {
  function mapMouse(clientX, clientY) {
    // getBoundingClientRect() accounts for CSS transform: scale()
    const r = canvas.getBoundingClientRect();
    mouseX = (clientX - r.left) * (IW / r.width);
    mouseY = (clientY - r.top) * (IH / r.height);
    mouseX = Math.max(0, Math.min(IW, mouseX));
    mouseY = Math.max(0, Math.min(IH, mouseY));
  }

  canvas.addEventListener('mousemove', (e) => {
    mapMouse(e.clientX, e.clientY);
  });
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
      const r = canvas.getBoundingClientRect();
      const inBounds = e.clientX >= r.left && e.clientX <= r.right
                    && e.clientY >= r.top && e.clientY <= r.bottom;
      if (inBounds) { mouseDown = true; mouseJustPressed = true; audio.resume(); }
    }
  });
  canvas.addEventListener('mouseup', (e) => { if (e.button === 0) mouseDown = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('keydown', (e) => { keys[e.key.toLowerCase()] = true; audio.resume(); });
  window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

  // Touch
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    mapMouse(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: false });
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault(); audio.resume();
    mapMouse(e.touches[0].clientX, e.touches[0].clientY);
    mouseDown = true; mouseJustPressed = true;
  }, { passive: false });
  canvas.addEventListener('touchend', (e) => { e.preventDefault(); mouseDown = false; }, { passive: false });

  // Mouse wheel
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    mouseWheelDelta += e.deltaY;
  }, { passive: false });
}

export function resetJustPressed() { mouseJustPressed = false; mouseWheelDelta = 0; }
