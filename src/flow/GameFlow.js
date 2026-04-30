// Game flow state machine
export const FlowState = Object.freeze({
  TITLE: 'title',
  CHAR_SELECT: 'char_select',
  STAGE_SELECT: 'stage_select',
  PLAYING: 'playing',
  PAUSED: 'paused',
  SHOP: 'shop',
  PERK_SELECT: 'perk_select',
  RESULTS: 'results',
  HUB: 'hub',
  GAMEOVER: 'gameover',
  SETTINGS: 'settings',
});

const FLOW_KEY = 'zombie_hunter_flow_v3';
const FLOW_BACKUP = 'zombie_hunter_flow_v3_backup';

export class GameFlow {
  constructor() {
    this.state = FlowState.TITLE;
    this.prevState = FlowState.TITLE;
    this.selectedCharacter = null;
    this.selectedStage = null;
    this.unlockedStages = new Set([1]);
    this.totalKills = 0;
    this.totalDeaths = 0;
    this.metaCoins = 0;
    this.dailyMode = false;
    this.listeners = new Map();
  }

  on(state, callback) {
    if (!this.listeners.has(state)) this.listeners.set(state, []);
    this.listeners.get(state).push(callback);
  }

  emit(state, data) {
    const cbs = this.listeners.get(state);
    if (cbs) { for (const cb of cbs) cb(data); }
  }

  goTo(newState, data) {
    this.prevState = this.state;
    this.state = newState;
    this.currentData = data;
    this.emit(newState, data);
  }

  goBack() {
    this.goTo(this.prevState);
  }

  unlockStage(id) {
    this.unlockedStages.add(id);
  }

  isStageUnlocked(id) {
    return this.unlockedStages.has(id);
  }

  saveProgress() {
    try {
      const data = JSON.stringify({
        unlockedStages: [...this.unlockedStages],
        totalKills: Math.max(0, this.totalKills | 0),
        totalDeaths: Math.max(0, this.totalDeaths | 0),
        metaCoins: Math.max(0, this.metaCoins | 0),
        version: 3,
      });
      // Backup before saving
      const current = localStorage.getItem(FLOW_KEY);
      if (current) localStorage.setItem(FLOW_BACKUP, current);
      localStorage.setItem(FLOW_KEY, data);
    } catch (_) {}
  }

  loadProgress() {
    try {
      const d = JSON.parse(localStorage.getItem(FLOW_KEY));
      if (d && typeof d === 'object') {
        this.unlockedStages = new Set(Array.isArray(d.unlockedStages) ? d.unlockedStages : [1]);
        this.totalKills = Math.max(0, d.totalKills || 0);
        this.totalDeaths = Math.max(0, d.totalDeaths || 0);
        this.metaCoins = Math.max(0, d.metaCoins || 0);
        return;
      }
      // Try backup
      const backup = JSON.parse(localStorage.getItem(FLOW_BACKUP));
      if (backup && typeof backup === 'object') {
        this.unlockedStages = new Set(Array.isArray(backup.unlockedStages) ? backup.unlockedStages : [1]);
        this.totalKills = Math.max(0, backup.totalKills || 0);
        this.totalDeaths = Math.max(0, backup.totalDeaths || 0);
        this.metaCoins = Math.max(0, backup.metaCoins || 0);
      }
    } catch (_) {}
  }
}
