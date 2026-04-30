export const STAGES = [
  {
    id: 1,
    name: '墓地入口',
    biome: 'graveyard',
    waves: 10,
    boss: null,
    baseDifficulty: 1,
    description: '阴森的墓地，僵尸从四面八方涌来',
    unlocked: true,
  },
  {
    id: 2,
    name: '古老墓穴',
    biome: 'graveyard',
    waves: 10,
    boss: 'necromancer',
    baseDifficulty: 2,
    description: '墓地深处，亡灵法师在此等候',
    unlocked: false,
  },
  {
    id: 3,
    name: '废弃街道',
    biome: 'city',
    waves: 10,
    boss: null,
    baseDifficulty: 3,
    description: '城市废墟，到处都是残骸和危险',
    unlocked: false,
  },
  {
    id: 4,
    name: '城市中心',
    biome: 'city',
    waves: 10,
    boss: 'mutant_tank',
    baseDifficulty: 4,
    description: '变异坦克封锁了城市中心',
    unlocked: false,
  },
  {
    id: 5,
    name: '外围工厂',
    biome: 'factory',
    waves: 10,
    boss: null,
    baseDifficulty: 5,
    description: '废弃工厂，机械残骸遍布',
    unlocked: false,
  },
  {
    id: 6,
    name: '核心车间',
    biome: 'factory',
    waves: 10,
    boss: 'mech_walker',
    baseDifficulty: 6,
    description: '巨型机甲在此巡逻',
    unlocked: false,
  },
  {
    id: 7,
    name: '研究走廊',
    biome: 'lab',
    waves: 10,
    boss: null,
    baseDifficulty: 7,
    description: '实验室走廊，充满了变异生物',
    unlocked: false,
  },
  {
    id: 8,
    name: '主实验室',
    biome: 'lab',
    waves: 10,
    boss: 'hive_mind',
    baseDifficulty: 8,
    description: '最终boss巢穴，蜂巢意识等待着你',
    unlocked: false,
  },
];

// Wave composition per difficulty
export function getWaveComposition(waveNum, baseDifficulty) {
  const diff = baseDifficulty + Math.floor(waveNum / 3);
  const count = 15 + waveNum * 2 + diff * 3;

  const types = ['normal'];
  if (diff >= 2) types.push('runner');
  if (diff >= 3) types.push('fatty');
  if (diff >= 4) types.push('spitter');
  if (diff >= 5) types.push('exploder');
  if (diff >= 6) types.push('armored');

  return { count, types, difficulty: diff };
}
