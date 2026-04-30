import { randRange } from './utils.js';
import { loadData } from './utils.js';

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.masterVol = 0.7;
    this.sfxVol = 0.8;
    this.musicVol = 0.4;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.musicNodes = [];
    this.musicPlaying = false;
    this._ambientSrc = null;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.masterVol;
      this.masterGain.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxVol;
      this.sfxGain.connect(this.masterGain);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicVol;
      this.musicGain.connect(this.masterGain);
    } catch (_) {
      this.enabled = false;
    }
    // Load saved settings
    const saved = loadData();
    if (saved?.settings) {
      this.masterVol = saved.settings.masterVol ?? 0.7;
      this.sfxVol = saved.settings.sfxVol ?? 0.8;
      this.musicVol = saved.settings.musicVol ?? 0.4;
      this.setMasterVol(this.masterVol);
      this.setSfxVol(this.sfxVol);
      this.setMusicVol(this.musicVol);
    }
  }

  resume() { if (this.ctx?.state === 'suspended') this.ctx.resume(); }
  setMasterVol(v) { this.masterVol = v; if (this.masterGain) this.masterGain.gain.value = v; }
  setSfxVol(v) { this.sfxVol = v; if (this.sfxGain) this.sfxGain.gain.value = v; }
  setMusicVol(v) { this.musicVol = v; if (this.musicGain) this.musicGain.gain.value = v; }

  _play(freq, type, duration, vol = 0.08, freqEnd = null) {
    if (!this.enabled || !this.ctx) return;
    this.resume();
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if (freqEnd) osc.frequency.linearRampToValueAtTime(freqEnd, t + duration);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + duration);
    } catch (_) {}
  }

  shoot(weaponType) {
    const v = 0.06 * this.sfxVol;
    switch (weaponType) {
      case 'pistol':
        this._play(200 + randRange(-20, 20), 'square', 0.08, v, 80);
        this._play(60, 'sawtooth', 0.06, v * 0.7, 30);
        break;
      case 'shotgun':
        this._play(100 + randRange(-15, 15), 'square', 0.12, v * 1.2, 40);
        this._play(50, 'sawtooth', 0.1, v, 20);
        this._play(180, 'triangle', 0.05, v * 0.6, 60);
        break;
      case 'smg':
        this._play(300 + randRange(-30, 30), 'square', 0.04, v * 0.5, 120);
        this._play(80, 'sawtooth', 0.03, v * 0.4, 40);
        break;
      case 'rifle':
        this._play(150 + randRange(-10, 10), 'square', 0.1, v, 50);
        this._play(40, 'sawtooth', 0.08, v * 0.8, 20);
        this._play(400, 'triangle', 0.03, v * 0.5, 200);
        break;
      default:
        this._play(200, 'square', 0.08, v, 80);
    }
  }

  zombieHit() { this._play(300 + randRange(-30, 30), 'square', 0.06, this.sfxVol * 0.04, 100); this._play(80, 'triangle', 0.05, this.sfxVol * 0.03, 40); }
  zombieDie() { this._play(50 + randRange(-10, 10), 'sawtooth', 0.15, this.sfxVol * 0.1, 20); this._play(200, 'square', 0.06, this.sfxVol * 0.06, 60); }
  playerHurt() { this._play(30, 'sawtooth', 0.2, this.sfxVol * 0.12, 15); this._play(400, 'square', 0.04, this.sfxVol * 0.05, 200); }
  coinCollect() { this._play(800 + randRange(-50, 50), 'square', 0.06, this.sfxVol * 0.04, 1200); this._play(600, 'triangle', 0.04, this.sfxVol * 0.03, 900); }
  purchase() { this._play(500, 'square', 0.08, this.sfxVol * 0.06, 700); this._play(700, 'triangle', 0.06, this.sfxVol * 0.04, 900); }
  waveUp() { this._play(100, 'sawtooth', 0.25, this.sfxVol * 0.2, 300); this._play(200, 'square', 0.15, this.sfxVol * 0.15, 400); this._play(300, 'triangle', 0.1, this.sfxVol * 0.1, 500); }
  click() { this._play(600, 'square', 0.03, this.sfxVol * 0.03, 800); }
  explosion() { this._play(60, 'sawtooth', 0.4, this.sfxVol * 0.15, 20); this._play(100, 'square', 0.3, this.sfxVol * 0.1, 30); this._play(30, 'sawtooth', 0.5, this.sfxVol * 0.12, 10); }
  acidSpit() { this._play(400, 'sine', 0.15, this.sfxVol * 0.05, 200); this._play(200, 'triangle', 0.1, this.sfxVol * 0.03, 100); }
  perkSelect() { this._play(600, 'square', 0.1, this.sfxVol * 0.06, 900); this._play(800, 'triangle', 0.08, this.sfxVol * 0.04, 1100); this._play(1000, 'sine', 0.06, this.sfxVol * 0.03, 1200); }
  bossRoar() { this._play(40, 'sawtooth', 0.6, this.sfxVol * 0.15, 20); this._play(60, 'square', 0.4, this.sfxVol * 0.1, 30); this._play(80, 'triangle', 0.3, this.sfxVol * 0.08, 40); }
  heartbeat() { this._play(40, 'sine', 0.15, this.sfxVol * 0.08, 30); setTimeout(() => this._play(50, 'sine', 0.1, this.sfxVol * 0.06, 35), 150); }

  startAmbient() {
    if (!this.enabled || !this.ctx) return;
    try {
      const bufSize = this.ctx.sampleRate * 2;
      const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * 0.015;
      const src = this.ctx.createBufferSource();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      src.buffer = buf; src.loop = true;
      filter.type = 'lowpass'; filter.frequency.value = 300;
      gain.gain.value = 0.03 * this.sfxVol;
      src.connect(filter); filter.connect(gain); gain.connect(this.masterGain);
      src.start();
      this._ambientSrc = src;
    } catch (_) {}
  }

  stopAmbient() { if (this._ambientSrc) { try { this._ambientSrc.stop(); } catch (_) {} this._ambientSrc = null; } }

  startMusic() {
    if (!this.enabled || !this.ctx || this.musicPlaying) return;
    this.musicPlaying = true;
    this._playMusicLoop();
  }

  stopMusic() {
    this.musicPlaying = false;
    this.musicNodes.forEach((n) => { try { n.stop(); } catch (_) {} });
    this.musicNodes = [];
  }

  _playMusicLoop() {
    if (!this.musicPlaying || !this.ctx) return;
    const t = this.ctx.currentTime;
    const bpm = 80;
    const beatDur = 60 / bpm;
    const barDur = beatDur * 4;
    const bassNotes = [65.41, 73.42, 82.41, 98.00, 110.00, 82.41, 73.42, 65.41];
    const melodyNotes = [261.63, 293.66, 329.63, 293.66, 261.63, 220.00, 246.94, 261.63];

    // Bass
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    osc.type = 'triangle'; filter.type = 'lowpass'; filter.frequency.value = 200; filter.Q.value = 2;
    osc.connect(filter); filter.connect(gain); gain.connect(this.musicGain);
    gain.gain.setValueAtTime(0.1, t);
    for (let i = 0; i < bassNotes.length; i++) osc.frequency.setValueAtTime(bassNotes[i], t + i * beatDur);
    gain.gain.setValueAtTime(0.1, t + barDur - 0.1);
    gain.gain.linearRampToValueAtTime(0.0001, t + barDur);
    osc.start(t); osc.stop(t + barDur);
    this.musicNodes.push(osc);

    // Melody
    const mOsc = this.ctx.createOscillator();
    const mGain = this.ctx.createGain();
    const mFilter = this.ctx.createBiquadFilter();
    mOsc.type = 'sine'; mFilter.type = 'bandpass'; mFilter.frequency.value = 800; mFilter.Q.value = 1;
    mOsc.connect(mFilter); mFilter.connect(mGain); mGain.connect(this.musicGain);
    mGain.gain.setValueAtTime(0.04, t);
    for (let i = 0; i < melodyNotes.length; i++) mOsc.frequency.setValueAtTime(melodyNotes[i], t + i * beatDur);
    mGain.gain.setValueAtTime(0.04, t + barDur - 0.1);
    mGain.gain.linearRampToValueAtTime(0.0001, t + barDur);
    mOsc.start(t); mOsc.stop(t + barDur);
    this.musicNodes.push(mOsc);

    // Kick drum
    for (let i = 0; i < 8; i++) {
      if (i % 2 === 0) {
        const nOsc = this.ctx.createOscillator();
        const nGain = this.ctx.createGain();
        nOsc.type = 'square';
        nOsc.frequency.setValueAtTime(80, t + i * beatDur);
        nOsc.frequency.linearRampToValueAtTime(40, t + i * beatDur + 0.05);
        nGain.gain.setValueAtTime(0.06, t + i * beatDur);
        nGain.gain.exponentialRampToValueAtTime(0.0001, t + i * beatDur + 0.08);
        nOsc.connect(nGain); nGain.connect(this.musicGain);
        nOsc.start(t + i * beatDur); nOsc.stop(t + i * beatDur + 0.1);
        this.musicNodes.push(nOsc);
      }
    }

    setTimeout(() => {
      this.musicNodes = this.musicNodes.filter((n) => n !== osc && n !== mOsc);
      if (this.musicPlaying) this._playMusicLoop();
    }, (barDur - 0.2) * 1000);
  }
}

export const audio = new AudioEngine();

// Pause/resume audio on tab visibility change
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (audio.musicPlaying) { audio._wasMusicPlaying = true; audio.stopMusic(); }
    if (audio._ambientSrc) { audio._wasAmbient = true; audio.stopAmbient(); }
    if (audio.ctx?.state === 'running') audio.ctx.suspend();
  } else {
    if (audio.ctx?.state === 'suspended') audio.ctx.resume();
    if (audio._wasMusicPlaying) { audio._wasMusicPlaying = false; audio.startMusic(); }
    if (audio._wasAmbient) { audio._wasAmbient = false; audio.startAmbient(); }
  }
});
