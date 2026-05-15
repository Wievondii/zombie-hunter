export const ZOMBIE_TYPES = {
  normal:   { name: '普通僵尸',   hp: 1,  speed: 75,  damage: 10, color: '#5D8A3C', colorDark: '#3D5A24', colorClothes: '#6B4F3C', size: 13, coinDrop: [5, 15],   xpValue: 10 },
  runner:   { name: '疾速僵尸',   hp: 1,  speed: 170, damage: 8,  color: '#D4843C', colorDark: '#A06028', colorClothes: '#5C3D2E', size: 11, coinDrop: [8, 20],   xpValue: 15 },
  fatty:    { name: '胖僵尸',     hp: 3,  speed: 50,  damage: 20, color: '#7B4F8A', colorDark: '#4A2D55', colorClothes: '#3D3D3D', size: 17, coinDrop: [20, 40],  xpValue: 30 },
  spitter:  { name: '喷酸僵尸',   hp: 2,  speed: 60,  damage: 8,  color: '#4CAF50', colorDark: '#2E7D32', colorClothes: '#33691E', size: 14, coinDrop: [15, 30],  xpValue: 20, rangeAttack: true, spitInterval: 2.5 },
  exploder: { name: '爆裂僵尸',   hp: 1,  speed: 90,  damage: 15, color: '#FF5722', colorDark: '#BF360C', colorClothes: '#4E342E', size: 15, coinDrop: [25, 50],  xpValue: 25, explodes: true, explosionRadius: 60 },
  armored:  { name: '装甲僵尸',   hp: 5,  speed: 45,  damage: 15, color: '#607D8B', colorDark: '#37474F', colorClothes: '#263238', size: 16, coinDrop: [30, 60],  xpValue: 35, frontArmor: 0.5 },
  boss:     { name: '巨型僵尸',   hp: 15, speed: 35,  damage: 35, color: '#8B1A1A', colorDark: '#4A0A0A', colorClothes: '#2A2A2A', size: 26, coinDrop: [100, 200], xpValue: 100, boss: true, phases: 3 },
  necromancer:  { name: '亡灵法师',   hp: 80, speed: 40, damage: 15, color: '#7B1FA2', colorDark: '#4A148C', colorClothes: '#311B92', size: 30, coinDrop: [150, 300], xpValue: 150, boss: true },
  mutant_tank:  { name: '变异坦克',   hp: 120, speed: 30, damage: 25, color: '#5D4037', colorDark: '#3E2723', colorClothes: '#3E2723', size: 36, coinDrop: [200, 400], xpValue: 200, boss: true },
  mech_walker:  { name: '机甲战士',   hp: 150, speed: 35, damage: 20, color: '#607D8B', colorDark: '#37474F', colorClothes: '#263238', size: 34, coinDrop: [250, 500], xpValue: 250, boss: true },
  hive_mind:    { name: '蜂巢意识',   hp: 200, speed: 25, damage: 30, color: '#E91E63', colorDark: '#880E4F', colorClothes: '#880E4F', size: 40, coinDrop: [300, 600], xpValue: 300, boss: true },
  cryo_wraith:  { name: '寒冰亡魂',   hp: 100, speed: 38, damage: 14, color: '#4FC3F7', colorDark: '#0288D1', colorClothes: '#01579B', size: 30, coinDrop: [180, 360], xpValue: 180, boss: true },
  pyro_maniac:  { name: '烈焰狂人',   hp: 120, speed: 32,  damage: 20, color: '#FF6D00', colorDark: '#E65100', colorClothes: '#BF360C', size: 32, coinDrop: [220, 440], xpValue: 220, boss: true },

  // === New zombie types (M3) ===
  charger:   { name: '冲锋僵尸', hp: 40, speed: 120, damage: 20, size: 16, xpValue: 15, color: '#FF6F00', colorDark: '#BF360C', colorClothes: '#4E342E', coinDrop: [10, 20], skill: 'charge', skillCooldown: 4, skillRange: 150 },
  summoner:  { name: '召唤僵尸', hp: 80, speed: 50,  damage: 15, size: 20, xpValue: 25, color: '#673AB7', colorDark: '#4A148C', colorClothes: '#311B92', coinDrop: [15, 30], skill: 'summon', skillCooldown: 8, skillRange: 0 },
  leaper:    { name: '跳跃僵尸', hp: 35, speed: 80,  damage: 18, size: 16, xpValue: 15, color: '#FF9800', colorDark: '#E65100', colorClothes: '#4E342E', coinDrop: [10, 20], skill: 'leap', skillCooldown: 5, skillRange: 120 },
  freezer:   { name: '冰冻僵尸', hp: 50, speed: 60,  damage: 12, size: 18, xpValue: 20, color: '#00BCD4', colorDark: '#00838F', colorClothes: '#004D40', coinDrop: [12, 25], skill: 'freezeAura', skillCooldown: 0, skillRange: 60 },
  shielder:  { name: '盾卫僵尸', hp: 120, speed: 55, damage: 18, size: 20, xpValue: 25, color: '#78909C', colorDark: '#546E7A', colorClothes: '#37474F', coinDrop: [20, 40], skill: 'shield', skillCooldown: 0, skillRange: 0 },
};

export const WEAPON_DATA = {
  pistol:  { name: '手枪',     type: 'pistol',  damage: 1,   fireRate: 0.38, bulletSpeed: 600, ammoCost: 0, spread: 0.05, bulletColor: '#FFE066', recoilShake: 1.5, penetrating: false, description: '基础武器 | 无限弹药' },
  shotgun: { name: '散弹枪',   type: 'shotgun', damage: 1.4, fireRate: 0.7,  bulletSpeed: 480, ammoCost: 1, spread: 0.35, pelletCount: 6, bulletColor: '#FFAA44', recoilShake: 4, penetrating: false, description: '近战利器 | 散射6发弹丸' },
  smg:     { name: '冲锋枪',   type: 'smg',     damage: 0.55,fireRate: 0.09, bulletSpeed: 650, ammoCost: 1, spread: 0.1,  bulletColor: '#FFCC88', recoilShake: 0.8, penetrating: false, description: '高射速 | 弹药消耗快' },
  rifle:   { name: '战术步枪', type: 'rifle',   damage: 3.5, fireRate: 0.55, bulletSpeed: 800, ammoCost: 1, spread: 0.02, bulletColor: '#FF6666', recoilShake: 3, penetrating: true, description: '高伤害穿透 | 精准射击' },
  sniper:  { name: '狙击枪',   type: 'rifle',   damage: 8,   fireRate: 1.2,  bulletSpeed: 1000, ammoCost: 2, spread: 0.01, bulletColor: '#00BCD4', recoilShake: 5, penetrating: true, description: '超高伤害穿透 | 远程精准' },
  launcher:{ name: '火箭筒',   type: 'launcher', damage: 5,  fireRate: 1.5,  bulletSpeed: 400, ammoCost: 3, spread: 0.05, bulletColor: '#FF5722', recoilShake: 6, penetrating: false, explosive: true, explosionRadius: 50, description: '范围爆炸 | 高弹药消耗' },
  minigun: { name: '加特林',   type: 'smg',     damage: 0.4, fireRate: 0.04, bulletSpeed: 700, ammoCost: 1, spread: 0.15, bulletColor: '#FFCC88', recoilShake: 0.5, penetrating: false, description: '超高射速 | 弹药消耗极快' },

  // === 近战武器 ===
  melee_knife:  { name: '匕首',     type: 'melee', damage: 25, range: 35, arc: Math.PI * 0.6, cooldown: 0.4,  knockback: 8,  color: '#CCCCCC', weaponKey: 'melee_knife' },
  melee_axe:    { name: '战斧',     type: 'melee', damage: 50, range: 40, arc: Math.PI * 0.5, cooldown: 0.8,  knockback: 20, color: '#8B4513', weaponKey: 'melee_axe' },
  melee_sword:  { name: '长剑',     type: 'melee', damage: 35, range: 45, arc: Math.PI * 0.7, cooldown: 0.6,  knockback: 12, color: '#B0C4DE', weaponKey: 'melee_sword' },
};

export const SHOP_ITEMS = [
  { id: 'shotgun',      name: '散弹枪',     price: 200, type: 'weapon',  weaponKey: 'shotgun' },
  { id: 'smg',          name: '冲锋枪',     price: 350, type: 'weapon',  weaponKey: 'smg' },
  { id: 'rifle',        name: '战术步枪',   price: 500, type: 'weapon',  weaponKey: 'rifle' },
  { id: 'sniper',       name: '狙击枪',     price: 800, type: 'weapon',  weaponKey: 'sniper' },
  { id: 'launcher',     name: '火箭筒',     price: 1000, type: 'weapon', weaponKey: 'launcher' },
  { id: 'minigun',      name: '加特林',     price: 1200, type: 'weapon', weaponKey: 'minigun' },
  { id: 'ammo30',       name: '弹药×30',    price: 50,  type: 'ammo',    amount: 30 },
  { id: 'ammo100',      name: '弹药×100',   price: 140, type: 'ammo',    amount: 100 },
  { id: 'health',       name: '医疗包',     price: 80,  type: 'health',  amount: 35 },
  { id: 'upgrade_dmg',  name: '伤害升级',   price: 300, type: 'upgrade', stat: 'damage',   amount: 0.15, desc: '所有武器伤害+15%' },
  { id: 'upgrade_speed',name: '射速升级',   price: 250, type: 'upgrade', stat: 'fireRate',  amount: -0.03, desc: '所有武器射速+10%' },

  // === 近战武器 ===
  { id: 'melee_knife', name: '匕首',   type: 'melee', price: 100, weaponKey: 'melee_knife', desc: '快速近战武器' },
  { id: 'melee_axe',   name: '战斧',   type: 'melee', price: 200, weaponKey: 'melee_axe',   desc: '高伤害近战武器' },
  { id: 'melee_sword', name: '长剑',   type: 'melee', price: 150, weaponKey: 'melee_sword', desc: '均衡近战武器' },
];

export const POWERUP_TYPES = {
  speed:     { name: '加速',       color: '#00E5FF', duration: 8,  icon: '⚡' },
  rapidFire: { name: '急速射击',   color: '#FF9800', duration: 6,  icon: '🔥' },
  shield:    { name: '护盾',       color: '#2196F3', duration: 10, icon: '🛡' },
  magnet:    { name: '磁铁',       color: '#E040FB', duration: 12, icon: '🧲' },
  nuke:      { name: '核弹',       color: '#FF1744', duration: 0,  icon: '💥' },
};

export const PERKS = [
  { id: 'hp_max',     name: '强健体魄', desc: '最大HP+25',       apply: (p) => { p.maxHp += 25; p.hp = Math.min(p.hp + 25, p.maxHp); } },
  { id: 'speed_up',   name: '疾跑',     desc: '移动速度+15%',    apply: (p) => { p.speed = Math.min(500, p.speed * 1.15); } },
  { id: 'damage_up',  name: '狂暴',     desc: '所有武器伤害+20%', apply: (p) => { p.damageMult *= 1.2; } },
  { id: 'ammo_max',   name: '弹药专家', desc: '最大弹药+50',     apply: (p) => { p.maxAmmo += 50; } },
  { id: 'armor',      name: '铁甲',     desc: '受伤减少20%',     apply: (p) => { p.armorMult = Math.max(0.15, p.armorMult * 0.8); } },
  { id: 'coin_up',    name: '财迷',     desc: '金币获取+30%',    apply: (p) => { p.coinMult *= 1.3; } },
  { id: 'regen',      name: '再生',     desc: '每秒恢复1HP',     apply: (p) => { p.regenRate += 1; } },
  { id: 'fire_rate',  name: '快手',     desc: '射速+15%',        apply: (p) => { p.fireRateMult = Math.max(0.15, p.fireRateMult * 0.85); } },
];
