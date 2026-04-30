export const ACHIEVEMENTS = [
  { id: 'first_kill',    name: '初次击杀',   desc: '击杀第一只僵尸',     icon: '🎯', check: (s) => s.totalKills >= 1 },
  { id: 'kill_100',      name: '百人斩',     desc: '累计击杀100只僵尸',   icon: '💀', check: (s) => s.totalKills >= 100 },
  { id: 'kill_1000',     name: '千人斩',     desc: '累计击杀1000只僵尸',  icon: '☠️', check: (s) => s.totalKills >= 1000 },
  { id: 'wave_10',       name: '生存者',     desc: '到达第10波',          icon: '🌊', check: (s) => s.maxWave >= 10 },
  { id: 'wave_20',       name: '不死战士',   desc: '到达第20波',          icon: '🔥', check: (s) => s.maxWave >= 20 },
  { id: 'boss_kill',     name: '屠魔勇士',   desc: '击败第一个Boss',      icon: '👑', check: (s) => s.bossKills >= 1 },
  { id: 'all_bosses',    name: '全Boss通关',  desc: '击败所有Boss',       icon: '🏆', check: (s) => s.bossKills >= 4 },
  { id: 'no_damage',     name: '无伤波次',   desc: '一波内不受任何伤害',  icon: '🛡️', check: (s) => s.noDamageWaves >= 1 },
  { id: 'combo_20',      name: '连杀大师',   desc: '达成20连杀',          icon: '⚡', check: (s) => s.maxCombo >= 20 },
  { id: 'all_weapons',   name: '武器收集家', desc: '拥有所有武器',        icon: '🔫', check: (s) => s.weaponsOwned >= 7 },
  { id: 'coins_5000',    name: '富甲一方',   desc: '单局获得5000金币',    icon: '💰', check: (s) => s.maxCoins >= 5000 },
  { id: 'death_10',      name: '屡败屡战',   desc: '累计死亡10次',        icon: '💀', check: (s) => s.totalDeaths >= 10 },
  { id: 'speed_run',     name: '速通达人',   desc: '5分钟内通关一个关卡', icon: '⏱️', check: (s) => s.fastestClear <= 300 },
];

const ACHIEVE_KEY = 'zombie_hunter_achievements';

export class AchievementSystem {
  constructor() {
    this.unlocked = new Set();
    this.stats = {
      totalKills: 0,
      totalDeaths: 0,
      maxWave: 0,
      bossKills: 0,
      noDamageWaves: 0,
      maxCombo: 0,
      weaponsOwned: 0,
      maxCoins: 0,
      fastestClear: Infinity,
    };
    this.notifications = [];
  }

  load() {
    try {
      const d = JSON.parse(localStorage.getItem(ACHIEVE_KEY));
      if (d) {
        this.unlocked = new Set(d.unlocked || []);
        if (d.stats) Object.assign(this.stats, d.stats);
      }
    } catch (_) {}
  }

  save() {
    try {
      localStorage.setItem(ACHIEVE_KEY, JSON.stringify({
        unlocked: [...this.unlocked],
        stats: this.stats,
      }));
    } catch (_) {}
  }

  updateStats(updates) {
    for (const [key, value] of Object.entries(updates)) {
      if (key === 'fastestClear') {
        this.stats[key] = Math.min(this.stats[key], value);
      } else {
        this.stats[key] = Math.max(this.stats[key], value);
      }
    }
    this.checkAll();
    this.save();
  }

  checkAll() {
    for (const ach of ACHIEVEMENTS) {
      if (!this.unlocked.has(ach.id) && ach.check(this.stats)) {
        this.unlocked.add(ach.id);
        this.notifications.push({ ...ach, timer: 4 });
      }
    }
  }

  update(dt) {
    for (let i = this.notifications.length - 1; i >= 0; i--) {
      this.notifications[i].timer -= dt;
      if (this.notifications[i].timer <= 0) this.notifications.splice(i, 1);
    }
  }

  draw(c, IW, IH) {
    let y = IH * 0.15;
    for (const n of this.notifications) {
      const alpha = Math.min(1, n.timer / 0.5);
      const panelW = Math.min(250, IW * 0.3);
      const panelH = 36;
      const panelX = IW / 2 - panelW / 2;

      c.globalAlpha = alpha * 0.85;
      c.fillStyle = '#1D1D2F';
      c.fillRect(panelX, y, panelW, panelH);
      c.strokeStyle = '#FFD700';
      c.lineWidth = 2;
      c.strokeRect(panelX, y, panelW, panelH);
      c.lineWidth = 1;

      c.globalAlpha = alpha;
      c.fillStyle = '#FFD700';
      c.font = 'bold 10px Courier New,monospace';
      c.textAlign = 'center';
      c.fillText(`${n.icon} 成就解锁: ${n.name}`, IW / 2, y + 14);
      c.fillStyle = '#AAA';
      c.font = '8px Courier New,monospace';
      c.fillText(n.desc, IW / 2, y + 27);
      c.textAlign = 'start';
      c.globalAlpha = 1;

      y += panelH + 4;
    }
  }

  getProgress() {
    return { unlocked: this.unlocked.size, total: ACHIEVEMENTS.length };
  }
}

export const achievements = new AchievementSystem();
