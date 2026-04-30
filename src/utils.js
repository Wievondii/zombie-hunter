export const clamp = (v, mn, mx) => (v < mn ? mn : v > mx ? mx : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const dist = (x1, y1, x2, y2) => Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
export const dist2 = (x1, y1, x2, y2) => (x2 - x1) ** 2 + (y2 - y1) ** 2;
export const randRange = (a, b) => a + Math.random() * (b - a);
export const randInt = (a, b) => Math.floor(randRange(a, b + 1));
export const angleTo = (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1);
export const normalizeAngle = (a) => {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
};

const _hexCache = {};
export const hexToRgb = (hex) => {
  if (_hexCache[hex]) return _hexCache[hex];
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const result = { r, g, b };
  _hexCache[hex] = result;
  return result;
};

export const rgba = (hex, a) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
};

export const seededRand = (seed) => {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
};

const SAVE_KEY = 'pixel_zombie_hunter_v3';
const BACKUP_KEY = 'pixel_zombie_hunter_v3_backup';
const CURRENT_VERSION = 3;

function _validate(data) {
  if (!data || typeof data !== 'object') return null;
  const clean = {};
  if (typeof data.highScore === 'number' && isFinite(data.highScore)) clean.highScore = Math.max(0, Math.floor(data.highScore));
  if (data.settings && typeof data.settings === 'object') {
    clean.settings = {};
    const v = data.settings.masterVol;
    clean.settings.masterVol = (typeof v === 'number' && isFinite(v)) ? Math.max(0, Math.min(1, v)) : 0.7;
    const s = data.settings.sfxVol;
    clean.settings.sfxVol = (typeof s === 'number' && isFinite(s)) ? Math.max(0, Math.min(1, s)) : 0.8;
    const m = data.settings.musicVol;
    clean.settings.musicVol = (typeof m === 'number' && isFinite(m)) ? Math.max(0, Math.min(1, m)) : 0.4;
  }
  clean.version = CURRENT_VERSION;
  return clean;
}

export function saveData(data) {
  try {
    const validated = _validate(data);
    if (!validated) return;
    // Backup current before saving new
    const current = localStorage.getItem(SAVE_KEY);
    if (current) localStorage.setItem(BACKUP_KEY, current);
    localStorage.setItem(SAVE_KEY, JSON.stringify(validated));
  } catch (_) {}
}

export function loadData() {
  try {
    const d = localStorage.getItem(SAVE_KEY);
    if (!d) {
      // Try migration from old keys
      for (const oldKey of ['pixel_zombie_hunter_v2', 'pixel_zombie_hunter_v1']) {
        const old = localStorage.getItem(oldKey);
        if (old) {
          const parsed = JSON.parse(old);
          const validated = _validate(parsed);
          if (validated) {
            localStorage.setItem(SAVE_KEY, JSON.stringify(validated));
            localStorage.removeItem(oldKey);
            return validated;
          }
        }
      }
      return null;
    }
    const parsed = JSON.parse(d);
    const validated = _validate(parsed);
    if (!validated) {
      // Data corrupted, try backup
      const backup = localStorage.getItem(BACKUP_KEY);
      if (backup) {
        const backupParsed = JSON.parse(backup);
        const backupValidated = _validate(backupParsed);
        if (backupValidated) {
          localStorage.setItem(SAVE_KEY, backup);
          return backupValidated;
        }
      }
      return null;
    }
    return validated;
  } catch (_) {
    // Try backup on parse error
    try {
      const backup = localStorage.getItem(BACKUP_KEY);
      if (backup) return _validate(JSON.parse(backup));
    } catch (_) {}
    return null;
  }
}

// Export for GameFlow to use
export { SAVE_KEY, CURRENT_VERSION };
