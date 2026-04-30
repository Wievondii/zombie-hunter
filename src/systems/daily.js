import { seededRand } from '../utils.js';

const DAILY_KEY = 'zombie_hunter_daily';

function getTodaySeed() {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export class DailyChallenge {
  constructor() {
    this.seed = getTodaySeed();
    this.date = getTodayString();
    this.bestScore = 0;
    this.bestWave = 0;
    this.completed = false;
    this.attempts = 0;
  }

  load() {
    try {
      const d = JSON.parse(localStorage.getItem(DAILY_KEY));
      if (d && d.date === this.date) {
        this.bestScore = d.bestScore || 0;
        this.bestWave = d.bestWave || 0;
        this.completed = d.completed || false;
        this.attempts = d.attempts || 0;
      } else if (d && d.date !== this.date) {
        // New day, reset
        this.bestScore = 0;
        this.bestWave = 0;
        this.completed = false;
        this.attempts = 0;
      }
    } catch (_) {}
  }

  save() {
    try {
      localStorage.setItem(DAILY_KEY, JSON.stringify({
        date: this.date,
        bestScore: this.bestScore,
        bestWave: this.bestWave,
        completed: this.completed,
        attempts: this.attempts,
      }));
    } catch (_) {}
  }

  getModifiers() {
    const rng = seededRand(this.seed);
    const mods = [];

    // Difficulty modifier
    const diff = Math.floor(rng() * 5) + 1;
    if (diff >= 4) mods.push({ name: '硬核模式', desc: '僵尸HP+50%', effect: 'hp_boost' });
    if (diff >= 3) mods.push({ name: '快速僵尸', desc: '僵尸速度+30%', effect: 'speed_boost' });

    // Special modifiers
    if (rng() < 0.3) mods.push({ name: '弹药稀缺', desc: '弹药掉落-50%', effect: 'ammo_scarce' });
    if (rng() < 0.25) mods.push({ name: '双倍金币', desc: '金币获取x2', effect: 'double_coins' });
    if (rng() < 0.2) mods.push({ name: '迷雾笼罩', desc: '视野范围减小', effect: 'fog' });
    if (rng() < 0.15) mods.push({ name: '精英僵尸', desc: '更多特殊僵尸', effect: 'elite' });

    return { difficulty: diff, mods, seed: this.seed };
  }

  recordResult(score, wave) {
    this.attempts++;
    this.bestScore = Math.max(this.bestScore, score);
    this.bestWave = Math.max(this.bestWave, wave);
    if (wave >= 15) this.completed = true;
    this.save();
  }
}

export const dailyChallenge = new DailyChallenge();
