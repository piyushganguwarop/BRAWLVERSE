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

  // --- UI Sound Effects ---

  playHover() {
    try {
      const ctx = this.ensureContext();
      if (!ctx || !this.sfxGain) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(740, now);
      osc.frequency.exponentialRampToValueAtTime(1180, now + 0.035);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.04);
    } catch {}
  }

  playConfirm() {
    try {
      const ctx = this.ensureContext();
      if (!ctx || !this.sfxGain) return;
      const now = ctx.currentTime;
      // Dual-tone high confirmation chime
      [587.33, 880.00].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);
        gain.gain.setValueAtTime(0.28, now + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.12);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now + idx * 0.04);
        osc.stop(now + idx * 0.04 + 0.13);
      });
    } catch {}
  }

  playCancel() {
    try {
      const ctx = this.ensureContext();
      if (!ctx || !this.sfxGain) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.07);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.08);
    } catch {}
  }

  playSelect() {
    try {
      const ctx = this.ensureContext();
      if (!ctx || !this.sfxGain) return;
      const now = ctx.currentTime;
      // High-energy lock-in whoosh + chord
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(780, now + 0.14);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.15);
    } catch {}
  }

  playCountdown(final = false) {
    try {
      const ctx = this.ensureContext();
      if (!ctx || !this.sfxGain) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(final ? 880 : 440, now);
      gain.gain.setValueAtTime(final ? 0.45 : 0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (final ? 0.35 : 0.12));
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + (final ? 0.36 : 0.13));
    } catch {}
  }

  // --- Procedural Synthwave BGM Engine ---

  startBGM(track = 'menu') {
    this.currentTrack = track;
    try {
      if (this.bgmTimer) {
        clearInterval(this.bgmTimer);
        this.bgmTimer = null;
      }
      const ctx = this.ensureContext();
      if (!ctx || !this.musicGain) return;

      this.bgmStep = 0;
      this.bgmNextTime = ctx.currentTime + 0.08;

      const tempo = track === 'combat' ? 134 : track === 'victory' ? 124 : 112;
      const stepDuration = 60 / tempo / 4; // 16th-note step

      this.bgmTimer = setInterval(() => {
        try {
          if (!this.ctx || this.currentTrack !== track) return;
          const scheduleAhead = this.ctx.currentTime + 0.28;
          while (this.bgmNextTime < scheduleAhead) {
            this.scheduleBGMStep(track, this.bgmStep, this.bgmNextTime, stepDuration);
            this.bgmNextTime += stepDuration;
            this.bgmStep = (this.bgmStep + 1) % 64; // 4-bar 16th loop
          }
        } catch {}
      }, 50);
    } catch {}
  }

  stopBGM() {
    this.currentTrack = null;
    try {
      if (this.bgmTimer) {
        clearInterval(this.bgmTimer);
        this.bgmTimer = null;
      }
    } catch {}
  }

  scheduleBGMStep(track, step, time, stepDur) {
    if (!this.ctx || !this.musicGain) return;

    if (track === 'menu') {
      // 1. Chill Cyberpunk Arp & Bass (112 BPM)
      // Kick on beat 1 and 3 (step 0, 16, 32, 48)
      if (step % 16 === 0) {
        this.synthKick(time, 0.45, 0.14);
      }
      // Hi-hat on every 8th note
      if (step % 2 === 0) {
        this.synthHat(time, step % 8 === 4 ? 0.15 : 0.08, 0.04);
      }
      // Bassline on root steps (A minor -> D minor -> F major -> E minor)
      const bassNotes = [55, 73.4, 43.6, 82.4]; // A1, D2, F1, E2
      const bar = Math.floor(step / 16);
      if (step % 4 === 0) {
        const note = bassNotes[bar];
        this.synthTone(time, note, 'sawtooth', stepDur * 2.8, 0.22, 280);
      }
      // Synth Pluck Arpeggio
      const scale = [220, 261.6, 329.6, 392, 440, 523.2, 392, 329.6];
      const arpNote = scale[step % scale.length];
      if (step % 2 === 0) {
        this.synthTone(time, arpNote, 'sine', stepDur * 1.5, 0.14, 1400);
      }
    } else if (track === 'combat') {
      // 2. High-Energy Fighting Cyber-Techno (134 BPM)
      // 4-on-the-floor driving kick drum
      if (step % 4 === 0) {
        this.synthKick(time, 0.70, 0.16);
      }
      // Snare / Clap on beats 2 and 4 (steps 4, 12, 20, 28...)
      if (step % 8 === 4) {
        this.synthSnare(time, 0.38);
      }
      // Offbeat hi-hat (steps 2, 6, 10, 14...)
      if (step % 4 === 2) {
        this.synthHat(time, 0.18, 0.06);
      }
      // Driving 16th rolling synth bass
      const combatRoots = [65.4, 77.8, 87.3, 98.0]; // C2, Eb2, F2, G2
      const cBar = Math.floor(step / 16);
      const root = combatRoots[cBar];
      const oct = (step % 4 === 2 || step % 4 === 3) ? root * 2 : root;
      this.synthTone(time, oct, 'sawtooth', stepDur * 0.85, 0.28, 450);

      // Cyber Synth Stabs on offbeats
      if (step % 8 === 2 || step % 8 === 6) {
        this.synthTone(time, root * 4, 'square', stepDur * 1.1, 0.18, 1800);
      }
    } else if (track === 'victory') {
      // 3. Triumphant Fanfare Celebration (124 BPM)
      if (step % 4 === 0) {
        this.synthKick(time, 0.5, 0.18);
      }
      if (step % 8 === 4) {
        this.synthSnare(time, 0.35);
      }
      const victoryChords = [
        [587.33, 739.99, 880.00], // D major
        [659.25, 783.99, 987.77], // E minor
        [739.99, 880.00, 1108.73], // F# minor
        [880.00, 1108.73, 1318.51] // A major
      ];
      const vBar = Math.floor(step / 16);
      if (step % 8 === 0) {
        const chord = victoryChords[vBar];
        chord.forEach(freq => {
          this.synthTone(time, freq, 'triangle', stepDur * 4, 0.16, 2200);
        });
      }
    }
  }

  synthKick(time, gainVal, decay) {
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(145, time);
      osc.frequency.exponentialRampToValueAtTime(36, time + decay);
      gain.gain.setValueAtTime(gainVal, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + decay);
      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(time);
      osc.stop(time + decay + 0.01);
    } catch {}
  }

  synthSnare(time, gainVal) {
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(240, time);
      osc.frequency.exponentialRampToValueAtTime(80, time + 0.12);
      gain.gain.setValueAtTime(gainVal, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(time);
      osc.stop(time + 0.13);
    } catch {}
  }

  synthHat(time, gainVal, dur) {
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(6500, time);
      gain.gain.setValueAtTime(gainVal, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(time);
      osc.stop(time + dur + 0.01);
    } catch {}
  }

  synthTone(time, freq, type, dur, gainVal, filterFreq = 0) {
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(gainVal, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

      if (filterFreq > 0 && this.ctx.createBiquadFilter) {
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(filterFreq, time);
        osc.connect(filter);
        filter.connect(gain);
      } else {
        osc.connect(gain);
      }

      gain.connect(this.musicGain);
      osc.start(time);
      osc.stop(time + dur + 0.01);
    } catch {}
  }
}

export const audioManager = new AudioManager();
