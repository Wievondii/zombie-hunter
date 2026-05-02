import { randRange, randInt } from '../utils.js';

// Rarity tiers
export const RARITY = Object.freeze({
  COMMON:    { name: '普通', color: '#CCCCCC', weight: 60, statBonus: 0 },
  UNCOMMON:  { name: '优秀', color: '#4CAF50', weight: 25, statBonus: 1 },
  RARE:      { name: '稀有', color: '#2196F3', weight: 10, statBonus: 2 },
  EPIC:      { name: '史诗', color: '#9C27B0', weight: 4,  statBonus: 3 },
  LEGENDARY: { name: '传说', color: '#FFD700', weight: 1,  statBonus: 4 },
});

// Stat types for random bonuses
export const STAT_TYPES = [
  { id: 'damage',   name: '伤害',   min: 0.05, max: 0.20, format: (v) => `+${Math.round(v * 100)}%` },
  { id: 'fireRate', name: '射速',   min: -0.10, max: -0.03, format: (v) => `+${Math.round(-v * 100)}%` },
  { id: 'hp',       name: '生命',   min: 5, max: 30, format: (v) => `+${Math.round(v)}` },
  { id: 'speed',    name: '速度',   min: 10, max: 40, format: (v) => `+${Math.round(v)}` },
  { id: 'armor',    name: '护甲',   min: 0.05, max: 0.15, format: (v) => `-${Math.round(v * 100)}%伤害` },
  { id: 'critChance', name: '暴击率', min: 0.05, max: 0.20, format: (v) => `+${Math.round(v * 100)}%` },
  { id: 'critDamage', name: '暴击伤害', min: 0.2, max: 0.5, format: (v) => `+${Math.round(v * 100)}%` },
  { id: 'pickupRadius', name: '拾取范围', min: 5, max: 20, format: (v) => `+${Math.round(v)}` },
];

// Weapon definitions (expanded)
export const WEAPONS = {
  pistol:   { name: '手枪',     type: 'pistol',  baseDamage: 1,   baseFireRate: 0.38, ammoCost: 0, spread: 0.05, bulletSpeed: 600, bulletColor: '#FFE066', penetrating: false },
  shotgun:  { name: '散弹枪',   type: 'shotgun', baseDamage: 1.4, baseFireRate: 0.7,  ammoCost: 1, spread: 0.35, pelletCount: 6, bulletSpeed: 480, bulletColor: '#FFAA44', penetrating: false },
  smg:      { name: '冲锋枪',   type: 'smg',     baseDamage: 0.55,baseFireRate: 0.09, ammoCost: 1, spread: 0.1,  bulletSpeed: 650, bulletColor: '#FFCC88', penetrating: false },
  rifle:    { name: '战术步枪', type: 'rifle',   baseDamage: 3.5, baseFireRate: 0.55, ammoCost: 1, spread: 0.02, bulletSpeed: 800, bulletColor: '#FF6666', penetrating: true },
  sniper:   { name: '狙击枪',   type: 'rifle',   baseDamage: 8,   baseFireRate: 1.2,  ammoCost: 2, spread: 0.01, bulletSpeed: 1000, bulletColor: '#00BCD4', penetrating: true },
  launcher: { name: '火箭筒',   type: 'launcher', baseDamage: 5,  baseFireRate: 1.5,  ammoCost: 3, spread: 0.05, bulletSpeed: 400, bulletColor: '#FF5722', penetrating: false, explosive: true, explosionRadius: 50 },
  laser:    { name: '激光枪',   type: 'laser',   baseDamage: 0.8, baseFireRate: 0.05, ammoCost: 0, spread: 0,    bulletSpeed: 1200, bulletColor: '#E040FB', penetrating: true },
  minigun:  { name: '加特林',   type: 'minigun', baseDamage: 0.4, baseFireRate: 0.04, ammoCost: 1, spread: 0.15, bulletSpeed: 700, bulletColor: '#FFCC88', penetrating: false },
};

// Armor definitions
export const ARMORS = {
  light_vest:   { name: '轻型背心', defense: 0.05, speedPenalty: 0 },
  heavy_vest:   { name: '重型防弹衣', defense: 0.15, speedPenalty: -20 },
  tactical:     { name: '战术护甲', defense: 0.10, speedPenalty: -10 },
  nano_armor:   { name: '纳米护甲', defense: 0.20, speedPenalty: -5 },
};

// Accessory definitions
export const ACCESSORIES = {
  speed_boots:  { name: '疾风靴', stat: 'speed', value: 30 },
  crit_ring:    { name: '暴击戒指', stat: 'critChance', value: 0.10 },
  ammo_belt:    { name: '弹药带', stat: 'maxAmmo', value: 50 },
  magnet_charm: { name: '磁铁吊坠', stat: 'pickupRadius', value: 15 },
  damage_gem:   { name: '力量宝石', stat: 'damage', value: 0.10 },
};

// Roll a random rarity based on weights
export function rollRarity() {
  const total = Object.values(RARITY).reduce((s, r) => s + r.weight, 0);
  let roll = Math.random() * total;
  for (const rarity of Object.values(RARITY)) {
    roll -= rarity.weight;
    if (roll <= 0) return rarity;
  }
  return RARITY.COMMON;
}

// Generate random stat bonuses
function generateStats(count) {
  const stats = {};
  const available = [...STAT_TYPES];
  for (let i = 0; i < count && available.length > 0; i++) {
    const idx = randInt(0, available.length - 1);
    const stat = available.splice(idx, 1)[0];
    stats[stat.id] = randRange(stat.min, stat.max);
  }
  return stats;
}

// Generate a loot item
export function generateLoot(type = 'weapon', forceRarity = null) {
  const rarity = forceRarity || rollRarity();
  const stats = generateStats(rarity.statBonus);

  let baseItem;
  if (type === 'weapon') {
    const weaponKeys = Object.keys(WEAPONS);
    const key = weaponKeys[randInt(0, weaponKeys.length - 1)];
    baseItem = { ...WEAPONS[key], id: key };
  } else if (type === 'armor') {
    const armorKeys = Object.keys(ARMORS);
    const key = armorKeys[randInt(0, armorKeys.length - 1)];
    baseItem = { ...ARMORS[key], id: key };
  } else {
    const accKeys = Object.keys(ACCESSORIES);
    const key = accKeys[randInt(0, accKeys.length - 1)];
    baseItem = { ...ACCESSORIES[key], id: key };
  }

  return {
    ...baseItem,
    type,
    rarity,
    stats,
    uid: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
  };
}

// Generate a drop from a zombie
export function generateDrop(zombieType, stageDifficulty) {
  // Base drop chance
  let dropChance = 0.08 + stageDifficulty * 0.01;
  if (zombieType === 'boss') dropChance = 1.0;

  if (Math.random() > dropChance) return null;

  // Determine item type
  const typeRoll = Math.random();
  const type = typeRoll < 0.5 ? 'weapon' : typeRoll < 0.8 ? 'armor' : 'accessory';

  // Boss always drops rare+
  const forceRarity = zombieType === 'boss' ? RARITY.RARE : null;

  return generateLoot(type, forceRarity);
}

// Apply item stats to player
export function applyItemStats(player, item) {
  if (!item.stats) return;
  for (const [statId, value] of Object.entries(item.stats)) {
    switch (statId) {
      case 'damage': player.damageMult += value; break;
      case 'fireRate': player.fireRateMult += value; player.fireRateMult = Math.max(0.15, player.fireRateMult); break;
      case 'hp': player.maxHp += value; player.hp = Math.min(player.hp + value, player.maxHp); break;
      case 'speed': player.speed += value; player.speed = Math.min(500, player.speed); break;
      case 'armor': player.armorMult -= value; player.armorMult = Math.max(0.15, player.armorMult); break;
      case 'critChance': player.critChance = Math.min(0.85, (player.critChance || 0) + value); break;
      case 'critDamage': player.critDamage = (player.critDamage || 1.5) + value; break;
      case 'pickupRadius': player.pickupRadius = (player.pickupRadius || 22) + value; break;
      case 'maxAmmo': player.maxAmmo += value; break;
    }
  }
}

// Format item for display
export function formatItem(item) {
  const lines = [`${item.rarity.name} ${item.name}`];
  if (item.stats) {
    for (const [statId, value] of Object.entries(item.stats)) {
      const statDef = STAT_TYPES.find((s) => s.id === statId);
      if (statDef) lines.push(`  ${statDef.name}: ${statDef.format(value)}`);
    }
  }
  return lines;
}
