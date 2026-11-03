import Phaser from 'phaser';
import { hasCustomFighter, loadSlots, getActiveCustomSlot } from '../characters/CustomFighter.js';
import { progressionSnapshot } from '../progression/Progression.js';
import { audioManager } from '../audio/AudioManager.js';
import { MenuShowcase } from '../ui/MenuShowcase.js';

const $ = (id) => document.getElementById(id);

export class MainMenuScene extends Phaser.Scene {
  constructor() { super('MainMenuScene'); }
  create() {
    const controls = $('touch-controls'); if (controls) controls.style.display = 'none';
    $('creator-panel')?.setAttribute('hidden', ''); $('online-panel')?.setAttribute('hidden', '');
    $('pause-panel')?.setAttribute('hidden', ''); $('results-panel')?.setAttribute('hidden', '');
    this.menuBackground = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x070d17).setOrigin(0).setScrollFactor(0);
    this.menuGlow = this.add.rectangle(this.scale.width * .72, this.scale.height * .52, this.scale.width * .56, this.scale.height * 1.1, 0x101b2c, .45).setOrigin(.5);
    this.brand = this.add.text(54, 62, 'BRAWLVERSE', { fontFamily: 'Orbitron, Arial', fontSize: '13px', color: '#12ddeb', letterSpacing: 4 }).setOrigin(0, .5);
    this.hero = this.add.text(54, 190, 'ENTER THE\nBRAWLVERSE', { fontFamily: 'Orbitron, Arial', fontSize: this.scale.width < 700 ? '36px' : '62px', color: '#f5f7fb', fontStyle: 'bold', lineSpacing: -2 }).setOrigin(0, 0);
    this.tagline = this.add.text(58, 405, 'Tactical 3D combat. Master fluid movement and signature anime specials.', { fontSize: '14px', color: '#91a2b9', wordWrap: { width: Math.min(440, this.scale.width - 100) } });
    this.footer = this.add.text(this.scale.width - 60, this.scale.height - 42, 'BRAWLVERSE  ·  PHASE 7', { fontSize: '10px', color: '#91a2b9', letterSpacing: 1 }).setOrigin(1, .5);
    this.mountMenu();
    document.getElementById('boot-screen')?.classList.add('is-hidden');
    this.scale.on('resize', this.resizeMenu, this);
    this.resizeMenu({ width: this.scale.width, height: this.scale.height });
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.resizeMenu, this);
      this.showcase?.dispose();
      this.showcase = null;
    });
  }
  mountMenu() {
    const shell = $('menu-shell'); if (!shell) return;
    shell.hidden = false;
    audioManager.startBGM('menu');
    const canvasContainer = $('menu-3d-canvas');
    if (canvasContainer && !this.showcase) {
      try {
        this.showcase = new MenuShowcase(canvasContainer);
      } catch { }
    }
    this.updateQuickDossier();
    const show = (screen) => { shell.querySelectorAll('[data-menu-screen]').forEach(el => el.hidden = el.dataset.menuScreen !== screen); };
    const setStatus = (text) => { const el = $('menu-status'); if (el) el.textContent = text; };
    const launchSelect = (mode = 'arcade') => {
      this.showcase?.dispose();
      this.showcase = null;
      localStorage.setItem('fighter.lastMode', mode);
      shell.hidden = true;
      this.scene.start('SelectScene', { mode });
    };
    shell.querySelectorAll('[data-go]').forEach(btn => {
      btn.onmouseenter = () => audioManager.playHover();
      btn.onclick = () => {
        audioManager.playConfirm();
        const action = btn.dataset.go;
        if (action === 'modes') show('modes');
        else if (action === 'arcade' || action === 'local' || action === 'training') launchSelect(action);
        else if (action === 'online') { show('home'); setStatus('Open ONLINE ROOM from fighter selection to create or join a room.'); launchSelect('online'); }
        else if (action === 'creator') {
          this.showcase?.dispose();
          this.showcase = null;
          shell.hidden = true;
          this.scene.start('SelectScene', { openCreator: true });
        }
        else if (action === 'settings') { this.loadSettings(); show('settings'); }
        else if (action === 'profile') { this.loadProfile(); show('profile'); }
        else if (action === 'home') { show('home'); setStatus(''); }
      };
    });
    shell.querySelectorAll('[data-back]').forEach(btn => {
      btn.onmouseenter = () => audioManager.playHover();
      btn.onclick = () => { audioManager.playCancel(); show(btn.dataset.back || 'home'); };
    });
    for (const [id, key] of [['setting-master', 'fighter.settings.master'], ['setting-music', 'fighter.settings.music'], ['setting-effects', 'fighter.settings.effects']]) {
      const el = $(id);
      if (el) el.oninput = e => {
        localStorage.setItem(key, e.target.value);
        audioManager.syncVolumes();
        const out = el.parentElement.querySelector('output');
        if (out) out.textContent = `${e.target.value}%`;
        if (id === 'setting-effects') audioManager.playSelect();
      };
    }
    const shake = $('setting-shake'); if (shake) shake.onchange = e => localStorage.setItem('fighter.settings.shake', e.target.checked ? '1' : '0');
    const quality = $('setting-quality'); if (quality) quality.onchange = e => localStorage.setItem('fighter.settings.quality', e.target.value);
    const fullscreen = $('setting-fullscreen'); if (fullscreen) fullscreen.onchange = () => this.toggleFullscreen(fullscreen.checked);
    $('profile-name') && ($('profile-name').onchange = e => localStorage.setItem('fighter.profile.name', e.target.value.trim().slice(0, 18) || 'Player'));
    $('profile-save') && ($('profile-save').onclick = () => { audioManager.playClick(); localStorage.setItem('fighter.profile.name', $('profile-name').value.trim().slice(0, 18) || 'Player'); setStatus('Profile saved on this device.'); this.updateQuickDossier(); });
    this.loadSettings(); this.loadProfile(); show('home');
  }
  updateQuickDossier() {
    const p = progressionSnapshot();
    const lvlEl = $('menu-dossier-level');
    const coinsEl = $('menu-dossier-coins');
    const fighterEl = $('menu-dossier-fighter');
    if (lvlEl) lvlEl.textContent = `LVL ${p.level}`;
    if (coinsEl) coinsEl.textContent = Number(p.coins || 0).toLocaleString();
    if (fighterEl) {
      const useCustom = localStorage.getItem('fighter.custom.use.v1') === '1';
      const slot = getActiveCustomSlot();
      const custom = useCustom ? loadSlots()[slot] : null;
      fighterEl.textContent = custom ? custom.name.toUpperCase() : (localStorage.getItem('fighter.lastSelected') || 'ATLAS').toUpperCase();
    }
  }
  loadSettings() {
    for (const [id, key, fallback] of [['setting-master', 'fighter.settings.master', '80'], ['setting-music', 'fighter.settings.music', '65'], ['setting-effects', 'fighter.settings.effects', '85']]) { const el = $(id); if (el) el.value = localStorage.getItem(key) ?? fallback; }
    const shake = $('setting-shake'); if (shake) shake.checked = localStorage.getItem('fighter.settings.shake') === '1';
    const quality = $('setting-quality'); if (quality) quality.value = localStorage.getItem('fighter.settings.quality') || 'high';
    const fullscreen = $('setting-fullscreen'); if (fullscreen) fullscreen.checked = !!document.fullscreenElement;
    for (const id of ['setting-master', 'setting-music', 'setting-effects']) { const el = $(id); const out = el?.parentElement.querySelector('output'); if (el && out) out.textContent = `${el.value}%`; }
    audioManager.syncVolumes();
  }
  async toggleFullscreen(enabled) {
    try {
      if (enabled && !document.fullscreenElement) await document.documentElement.requestFullscreen();
      else if (!enabled && document.fullscreenElement) await document.exitFullscreen();
    } catch { const status = $('menu-status'); if (status) status.textContent = 'Fullscreen is not available in this browser.'; }
    const field = $('setting-fullscreen'); if (field) field.checked = !!document.fullscreenElement;
  }
  loadProfile() {
    const name = $('profile-name'); if (name) name.value = localStorage.getItem('fighter.profile.name') || 'Player';
    const slots = loadSlots(); const saved = slots.filter(Boolean).length;
    const count = $('profile-fighters'); if (count) count.textContent = `${saved} / 3 saved fighters`;
    const progression = progressionSnapshot();
    const level = $('profile-level'); if (level) level.textContent = `LEVEL ${progression.level}`;
    const wallet = $('profile-wallet'); if (wallet) wallet.textContent = `${progression.coins} COINS`;
    const xp = $('profile-xp'); if (xp) xp.textContent = `${progression.xp} / ${progression.nextLevelXp} XP`;
    const xpBar = $('profile-xp-bar'); if (xpBar) xpBar.style.width = `${Math.round(progression.progress * 100)}%`;
    const unlocks = $('profile-unlocks'); if (unlocks) unlocks.textContent = `${progression.unlockedFighters.length} / 8 fighters · ${progression.unlockedStages.length} / 3 arenas unlocked`;
    const mode = $('profile-mode'); if (mode) mode.textContent = (localStorage.getItem('fighter.lastMode') || 'arcade').toUpperCase();
    const record = $('profile-record'); if (record) { try { const stats = JSON.parse(localStorage.getItem('fighter.profile.stats.v1') || '{\"matches\":0,\"wins\":0,\"losses\":0}'); record.textContent = `${stats.matches || 0} matches · ${stats.wins || 0} wins · ${stats.losses || 0} losses`; } catch { record.textContent = '0 matches · 0 wins · 0 losses'; } }
    const history = $('profile-history');
    if (history) {
      let items = []; try { items = JSON.parse(localStorage.getItem('fighter.profile.history.v1') || '[]'); } catch { items = []; }
      history.innerHTML = items.length ? items.slice(0, 5).map(item => {
        const isWin = item.result === 'WIN';
        const badgeClass = isWin ? 'history-win' : 'history-loss';
        return `<div class="history-row ${badgeClass}"><span><b class="${badgeClass}-badge">${this.escape(item.result)}</b> · ${this.escape(item.player)} vs ${this.escape(item.opponent)}</span><small>${this.escape(item.score)} · ${this.escape(item.mode)} · ${this.escape(item.date)}</small></div>`;
      }).join('') : 'No matches played yet.';
    }
  }
  escape(value) { return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;'); }
  resizeMenu({ width, height } = {}) {
    width ||= this.scale.width; height ||= this.scale.height;
    const compact = width < 700;
    this.menuBackground?.setSize(width, height);
    this.menuGlow?.setPosition(width * .72, height * .52).setSize(width * .56, height * 1.1);
    this.brand?.setPosition(compact ? 20 : 54, compact ? 36 : 62);
    this.hero?.setPosition(compact ? 20 : 54, Math.max(compact ? 104 : 150, height * .25)).setFontSize(compact ? '36px' : '62px');
    this.tagline?.setPosition(compact ? 22 : 58, height * (compact ? .69 : .68)).setWordWrapWidth(Math.min(440, width - (compact ? 44 : 100)));
    this.footer?.setPosition(width - (compact ? 18 : 60), height - 24);
  }
}
