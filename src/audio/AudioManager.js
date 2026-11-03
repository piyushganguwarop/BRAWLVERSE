/**
 * Procedural Web Audio engine for Brawl Wars.
 * Provides master, music, and sound-effects buses with live volume control
 * and synthesized combat audio without external asset dependencies.
 */

class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.initialized = false;
  }

  ensureContext() {
    if (typeof window === 'undefined') return null;
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    try {
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();

      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.syncVolumes();
      this.initialized = true;
    } catch {
      return null;
    }
    return this.ctx;
  }

  syncVolumes() {
    try {
      const getPref = (key, fallback) => {
        try {
          return typeof localStorage !== 'undefined' ? (localStorage.getItem(key) ?? fallback) : fallback;
        } catch {
          return fallback;
        }
      };
      const master = Number(getPref('fighter.settings.master', 80)) / 100;
      const music = Number(getPref('fighter.settings.music', 65)) / 100;
      const effects = Number(getPref('fighter.settings.effects', 85)) / 100;
      this.setMasterVolume(master);
      this.setMusicVolume(music);
      this.setEffectsVolume(effects);
    } catch {}
  }

  setMasterVolume(val) {
    try {
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, val)), this.ctx.currentTime);
      }
    } catch {}
  }

  setMusicVolume(val) {
    try {
      if (this.musicGain && this.ctx) {
        this.musicGain.gain.setValueAtTime(Math.max(0, Math.min(1, val)), this.ctx.currentTime);
      }
    } catch {}
  }

  setEffectsVolume(val) {
    try {
      if (this.sfxGain && this.ctx) {
        this.sfxGain.gain.setValueAtTime(Math.max(0, Math.min(1, val)), this.ctx.currentTime);
      }
    } catch {}
  }

  // --- Sound Effects Synthesis ---

  playPunch() {
    try {
      const ctx = this.ensureContext();
      if (!ctx || !this.sfxGain) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);
      gain.gain.setValueAtTime(0.8, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.13);
    } catch {}
  }

  playKick() {
    try {
      const ctx = this.ensureContext();
      if (!ctx || !this.sfxGain) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(32, now + 0.18);
      gain.gain.setValueAtTime(1.0, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.19);
    } catch {}
  }

  playHeavy() {
    try {
      const ctx = this.ensureContext();
      if (!ctx || !this.sfxGain) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(130, now);
      osc.frequency.exponentialRampToValueAtTime(22, now + 0.24);
      gain.gain.setValueAtTime(1.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.24);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.25);
    } catch {}
  }

  playDash() {
    try {
      const ctx = this.ensureContext();
      if (!ctx || !this.sfxGain) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.12);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.13);
    } catch {}
  }

  playGrab() {
    try {
      const ctx = this.ensureContext();
      if (!ctx || !this.sfxGain) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.linearRampToValueAtTime(70, now + 0.15);
      gain.gain.setValueAtTime(0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.16);
    } catch {}
  }

  playBlock(perfect = false) {
    try {
      const ctx = this.ensureContext();
      if (!ctx || !this.sfxGain) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = perfect ? 'triangle' : 'square';
      osc.frequency.setValueAtTime(perfect ? 880 : 440, now);
      osc.frequency.exponentialRampToValueAtTime(perfect ? 1320 : 220, now + 0.1);
      gain.gain.setValueAtTime(perfect ? 0.7 : 0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.11);
    } catch {}
  }

  playSpecial() {
    try {
      const ctx = this.ensureContext();
      if (!ctx || !this.sfxGain) return;
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(180, now);
      osc1.frequency.exponentialRampToValueAtTime(620, now + 0.28);
      gain1.gain.setValueAtTime(0.5, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
      osc1.connect(gain1);
      gain1.connect(this.sfxGain);
      osc1.start(now);
      osc1.stop(now + 0.29);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(90, now);
      osc2.frequency.exponentialRampToValueAtTime(30, now + 0.32);
      gain2.gain.setValueAtTime(0.9, now);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.32);
      osc2.connect(gain2);
      gain2.connect(this.sfxGain);
      osc2.start(now);
      osc2.stop(now + 0.33);
    } catch {}
  }

  playLauncher() {
    try {
      const ctx = this.ensureContext();
      if (!ctx || !this.sfxGain) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(540, now + 0.22);
      gain.gain.setValueAtTime(0.8, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.23);
    } catch {}
  }

  playRoundStart() {
    try {
      const ctx = this.ensureContext();
      if (!ctx || !this.sfxGain) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now);
      gain.gain.setValueAtTime(0.7, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.86);
    } catch {}
  }

  playKO() {
    try {
      const ctx = this.ensureContext();
      if (!ctx || !this.sfxGain) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(130, now);
      osc.frequency.exponentialRampToValueAtTime(28, now + 0.65);
      gain.gain.setValueAtTime(0.8, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.65);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.66);
    } catch {}
  }

  playVictory() {
    try {
      const ctx = this.ensureContext();
      if (!ctx || !this.sfxGain) return;
      const notes = [293.66, 369.99, 440.00, 587.33];
      notes.forEach((freq, idx) => {
        const start = ctx.currentTime + idx * 0.12;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.5, start);
        gain.gain.exponentialRampToValueAtTime(0.01, start + 0.35);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(start);
        osc.stop(start + 0.36);
      });
    } catch {}
  }

  playClick() {
    try {
      const ctx = this.ensureContext();
      if (!ctx || !this.sfxGain) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.05);
    } catch {}
  }
}

export const audioManager = new AudioManager();
