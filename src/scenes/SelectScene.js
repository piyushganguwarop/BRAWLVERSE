import Phaser from 'phaser';
import { roster } from '../characters/roster.js';
import { onlineRoom } from '../multiplayer/OnlineRoom.js';
import { hasCustomFighter, loadCustomFighter, loadSlots, saveCustomFighter, toFighter, defaults, getActiveCustomSlot, setActiveCustomSlot } from '../characters/CustomFighter.js';
import { CustomizerPreview } from '../characters/CustomizerPreview.js';
import { ArcadeProgression } from '../modes/ArcadeProgression.js';
import { loadProgression, isFighterUnlocked, isStageUnlocked, purchaseFighter, purchaseStage, progressionSnapshot } from '../progression/Progression.js';
import { audioManager } from '../audio/AudioManager.js';

const COLORS = {
  bg: 0x070d17,
  panel: 0x101b2c,
  panelBorder: 0x24344d,
  cyan: '#12ddeb',
  cyanNum: 0x12ddeb,
  magenta: '#ff3d91',
  magentaNum: 0xff3d91,
  violet: '#9b67ff',
  gold: '#f4c65e',
  muted: '#91a2b9',
  white: '#f4f7fc'
};

export class SelectScene extends Phaser.Scene {
  constructor() { super('SelectScene'); }

  init(data = {}) {
    this.mode = data.mode === 'versus' ? 'local' : (data.mode || 'arcade');
    this.localVersus = this.mode === 'local';
    this.openCreatorOnStart = !!data.openCreator;
  }

  create() {
    const touchControls = document.getElementById('touch-controls');
    if (touchControls) touchControls.style.display = 'none';
    audioManager.startBGM('menu');
    this.selectedIndex = 0;
    this.stageIndex = 0;
    this.progression = progressionSnapshot();
    this.stages = [
      { id: 'neon', name: 'NEON DISTRICT', desc: 'A glowing underground fight club beneath rain-slicked asphalt' },
      { id: 'temple', name: 'ANCIENT TEMPLE', desc: 'A sacred stone arena flanked by pagoda roofs and golden lanterns' },
      { id: 'rooftop', name: 'CITY ROOFTOP', desc: 'A midnight battle above the towering skyscraper skyline' }
    ];
    this.cardObjects = [];

    // Background gradient and cyber grid
    this.add.rectangle(0, 0, this.scale.width, this.scale.height, COLORS.bg).setOrigin(0);
    this.backdrop = this.add.graphics();
    this.backdrop.fillGradientStyle(0x101b2c, 0x101b2c, 0x070d17, 0x070d17, 1);
    this.backdrop.fillRect(0, 0, this.scale.width, this.scale.height);

    // Subtle ambient cyber grid lines
    this.gridLines = this.add.graphics();
    this.gridLines.lineStyle(1, 0x12ddeb, 0.04);
    for (let x = 0; x < this.scale.width; x += 48) {
      this.gridLines.lineBetween(x, 0, x, this.scale.height);
    }
    for (let y = 0; y < this.scale.height; y += 48) {
      this.gridLines.lineBetween(0, y, this.scale.width, y);
    }

    // Top Header
    this.title = this.add.text(0, 0, 'CHOOSE YOUR FIGHTER', {
      fontFamily: 'Orbitron, Arial Black, sans-serif',
      fontSize: '28px',
      color: COLORS.white,
      fontStyle: 'bold',
      letterSpacing: 3
    }).setOrigin(0.5);

    const modeName = this.mode === 'training' ? 'TRAINING LAB' : this.mode === 'local' ? 'LOCAL VERSUS' : this.mode === 'online' ? 'ONLINE PVP' : 'ARCADE GAUNTLET';
    this.subtitle = this.add.text(0, 0, `${modeName}  ·  LEVEL ${this.progression.level}  ·  ${this.progression.coins} COINS`, {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '13px',
      color: COLORS.cyan,
      fontStyle: 'bold',
      letterSpacing: 2
    }).setOrigin(0.5);

    this.grid = this.add.container(0, 0);
    this.infoPanel = this.add.container(0, 0);
    this.infoBg = this.add.rectangle(0, 0, 300, 160, COLORS.panel, 0.96).setStrokeStyle(1, 0x12ddeb);
    this.infoName = this.add.text(-130, -62, '', { fontFamily: 'Orbitron, sans-serif', fontSize: '24px', fontStyle: 'bold', color: COLORS.white, letterSpacing: 1 });
    this.infoTitle = this.add.text(-130, -32, '', { fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: COLORS.cyan, fontStyle: 'bold', letterSpacing: 1.5 });
    this.infoBio = this.add.text(-130, -8, '', { fontFamily: 'Inter, sans-serif', fontSize: '12px', color: COLORS.muted, wordWrap: { width: 260 }, lineSpacing: 3 });
    this.specialLabel = this.add.text(-130, 40, '', { fontFamily: 'Rajdhani, sans-serif', fontSize: '12px', fontStyle: 'bold', color: COLORS.gold, letterSpacing: 1 });
    this.infoPanel.add([this.infoBg, this.infoName, this.infoTitle, this.infoBio, this.specialLabel]);

    // Stage Carousel Controls
    this.stageLabel = this.add.text(0, 0, '', { fontFamily: 'Orbitron, sans-serif', fontSize: '13px', color: COLORS.cyan, fontStyle: 'bold', letterSpacing: 1.5 }).setOrigin(0.5);
    this.stageDesc = this.add.text(0, 0, '', { fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: COLORS.muted }).setOrigin(0.5);
    this.stagePrev = this.add.text(0, 0, '‹', { fontFamily: 'Orbitron, sans-serif', fontSize: '24px', color: COLORS.cyan, backgroundColor: '#101d30', padding: { x: 12, y: 3 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.stageNext = this.add.text(0, 0, '›', { fontFamily: 'Orbitron, sans-serif', fontSize: '24px', color: COLORS.cyan, backgroundColor: '#101d30', padding: { x: 12, y: 3 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.stagePrev.on('pointerdown', () => { audioManager.playHover(); this.changeStage(-1); });
    this.stageNext.on('pointerdown', () => { audioManager.playHover(); this.changeStage(1); });

    // Primary Start Fight Button
    this.startButton = this.add.text(0, 0, this.mode === 'training' ? 'ENTER LAB  ▶' : 'START FIGHT  ▶', {
      fontFamily: 'Orbitron, sans-serif',
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#071321',
      backgroundColor: '#12ddeb',
      padding: { x: 28, y: 14 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.startButton.on('pointerdown', () => { audioManager.playConfirm(); this.startFight(); });

    this.createDifficultySelector();
    if (this.localVersus) this.createPlayerTwoSelector();
    this.hint = this.add.text(0, 0, 'PC: CLICK TO SELECT  •  MOBILE: TAP A FIGHTER', { fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: COLORS.muted, letterSpacing: 1.5 }).setOrigin(0.5);
    this.createCards();
    this.createSelectionPreview();
    this.createStagePreview();
    this.createOnlineButton();
    this.createCreatorButton();

    this.menuBackButton = this.add.text(0, 0, '← BACK', {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#ffffff',
      backgroundColor: '#101d30',
      padding: { x: 14, y: 8 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.menuBackButton.on('pointerdown', () => { audioManager.playCancel(); this.scene.start('MainMenuScene'); });

    this.select(0);
    this.updateStageLabel();
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.layout, this);
      this.onlineSubscriptions?.forEach(off => off());
      this.onlineSubscriptions = [];
      if (this.mode === 'online' && onlineRoom.isInRoom && !this.enteringOnlineMatch) onlineRoom.leave();
      this.selectionPreview?.dispose();
      this.selectionPreview = null;
      this.creatorPreview?.dispose();
      this.creatorPreview = null;
      const creator = document.getElementById('creator-panel');
      if (creator) creator.hidden = true;
      document.getElementById('selection-preview')?.remove();
      document.getElementById('stage-preview')?.remove();
    });
    this.layout({ width: this.scale.width, height: this.scale.height });
    if (this.openCreatorOnStart) this.time.delayedCall(80, () => this.openCreator());
  }

  createPlayerTwoSelector() {
    this.playerTwoIndex = Math.min(1, roster.length - 1);
    this.p2Title = this.add.text(0, 0, 'PLAYER 2 RIVAL', { fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', fontStyle: 'bold', color: '#ff3d91', letterSpacing: 1.5 }).setOrigin(0.5);
    this.p2Name = this.add.text(0, 0, roster[this.playerTwoIndex].name.toUpperCase(), { fontFamily: 'Orbitron, sans-serif', fontSize: '11px', fontStyle: 'bold', color: COLORS.white, backgroundColor: '#2a1222', padding: { x: 12, y: 6 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.p2Prev = this.add.text(0, 0, '‹', { fontSize: '20px', color: '#ff3d91', backgroundColor: '#18101c', padding: { x: 9, y: 2 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.p2Next = this.add.text(0, 0, '›', { fontSize: '20px', color: '#ff3d91', backgroundColor: '#18101c', padding: { x: 9, y: 2 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.p2Prev.on('pointerdown', () => this.changePlayerTwo(-1));
    this.p2Next.on('pointerdown', () => this.changePlayerTwo(1));
    this.p2Name.on('pointerdown', () => this.changePlayerTwo(1));
  }

  changePlayerTwo(direction) {
    const options = roster.map((fighter, index) => ({ fighter, index })).filter(item => item.index !== this.selectedIndex && isFighterUnlocked(item.fighter.id));
    const current = options.findIndex(item => item.index === this.playerTwoIndex);
    this.playerTwoIndex = options[(current + direction + options.length) % options.length].index;
    this.p2Name?.setText(roster[this.playerTwoIndex].name.toUpperCase());
  }

  createDifficultySelector() {
    this.difficulty = localStorage.getItem('fighter.cpu.difficulty') || 'normal';
    if (!['easy', 'normal', 'hard'].includes(this.difficulty)) this.difficulty = 'normal';
    this.difficultyLabel = this.add.text(0, 0, 'CPU DIFFICULTY', { fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', fontStyle: 'bold', color: COLORS.muted, letterSpacing: 1.5 }).setOrigin(0.5);
    this.difficultyButtons = ['easy', 'normal', 'hard'].map(level => {
      const button = this.add.text(0, 0, level.toUpperCase(), {
        fontFamily: 'Orbitron, sans-serif',
        fontSize: '10px', fontStyle: 'bold', color: '#ffffff',
        backgroundColor: '#101d30', padding: { x: 12, y: 6 }
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      button.on('pointerdown', () => {
        this.difficulty = level;
        localStorage.setItem('fighter.cpu.difficulty', level);
        this.updateDifficultyButtons();
      });
      return button;
    });
    this.updateDifficultyButtons();
  }

  updateDifficultyButtons() {
    this.difficultyButtons?.forEach((button, index) => {
      const selected = ['easy', 'normal', 'hard'][index] === this.difficulty;
      button.setStyle({ color: selected ? '#071321' : COLORS.muted, backgroundColor: selected ? '#12ddeb' : '#101d30' });
    });
  }

  createCreatorButton() {
    this.creatorButton = this.add.text(0, 0, '✦ WORKSHOP', { fontFamily: 'Rajdhani, sans-serif', fontSize: '12px', fontStyle: 'bold', color: '#12ddeb', backgroundColor: '#101d30', padding: { x: 14, y: 8 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.creatorButton.on('pointerdown', () => this.openCreator());
  }

  openCreator() {
    const panel = document.getElementById('creator-panel'); if (!panel) return;
    const ids = ['name','build','hair-style','outfit','style','color','accent','skin','hair','eye-color','bottom-color','face','brows','beard','top','bottom','gloves','shoes','accessory','height','width','legs','muscle'];
    const el = key => document.getElementById(`creator-${key}`);
    const map = {'name':'name','build':'build','hair-style':'hairStyle','outfit':'outfit','style':'style','color':'color','accent':'accent','skin':'skin','hair':'hair','eye-color':'eyeColor','bottom-color':'bottomColor','face':'face','brows':'brows','beard':'beard','top':'top','bottom':'bottom','gloves':'gloves','shoes':'shoes','accessory':'accessory','height':'height','width':'width','legs':'legs','muscle':'muscle'};
    const slotEl = document.getElementById('creator-slot'), savedEl = document.getElementById('creator-saved'), useCustomEl = document.getElementById('creator-use-custom');
    useCustomEl.checked = localStorage.getItem('fighter.custom.use.v1') === '1';
    const updateStartLabel = () => this.startButton?.setText(localStorage.getItem('fighter.custom.use.v1') === '1' ? 'START CUSTOM FIGHT  ▶' : (this.mode === 'training' ? 'ENTER LAB  ▶' : 'START FIGHT  ▶'));
    updateStartLabel();
    const status = document.getElementById('creator-status');
    const fields = () => Object.fromEntries(ids.map(key => [map[key], ['height','width','legs','muscle'].includes(key) ? Number(el(key).value) : el(key).value]));
    const setFields = value => { const v = { ...defaults, ...value }; Object.entries(map).forEach(([id, key]) => { el(id).value = v[key] ?? defaults[key]; }); preview(); };
    const refreshSaved = () => { const slots = loadSlots(); savedEl.innerHTML = '<option value="">Choose saved fighter</option>' + slots.map((v, i) => v ? `<option value="${i}">Slot ${i+1}: ${this.escapeHtml(v.name)}</option>` : '').join(''); };
    const preview = () => {
      const v = fields();
      if (!this.creatorPreview) { this.creatorPreview = new CustomizerPreview(document.getElementById('creator-3d-preview'), part => { status.textContent = `Selected ${part.toUpperCase()} · customize its related options.`; }); }
      this.creatorPreview.update(v);
      for (const key of ['height','width','legs','muscle']) document.getElementById(`creator-${key}-value`).textContent = `${v[key]}%`;
      const zoom = document.getElementById('creator-zoom'); if (zoom && !zoom.dataset.bound) { zoom.dataset.bound = '1'; zoom.oninput = () => this.creatorPreview?.setZoom(Number(zoom.value) / 10); }
      const left = document.getElementById('creator-rotate-left'), right = document.getElementById('creator-rotate-right');
      if (left && !left.dataset.bound) { left.dataset.bound = '1'; left.onclick = () => this.creatorPreview?.rotate(-1); right.onclick = () => this.creatorPreview?.rotate(1); }
      if (zoom) this.creatorPreview.setZoom(Number(zoom.value) / 10);
    };
    slotEl.value = String(getActiveCustomSlot());
    const current = loadCustomFighter(Number(slotEl.value)); setFields(current); refreshSaved();
    slotEl.onchange = () => { const slot = Number(slotEl.value); const saved = loadSlots()[slot]; setFields(saved || defaults); if (saved && useCustomEl.checked) { setActiveCustomSlot(slot); localStorage.setItem('fighter.custom.use.v1', '1'); } else if (!saved && useCustomEl.checked) { useCustomEl.checked = false; localStorage.setItem('fighter.custom.use.v1', '0'); status.textContent = 'Empty slot selected. Custom fighter use has been turned off.'; } else status.textContent = saved ? `Loaded slot ${slot+1}.` : `Slot ${slot+1} is empty.`; updateStartLabel(); };
    savedEl.onchange = () => { if (savedEl.value !== '') { slotEl.value = savedEl.value; setActiveCustomSlot(Number(savedEl.value)); useCustomEl.checked = true; localStorage.setItem('fighter.custom.use.v1', '1'); setFields(loadCustomFighter(Number(savedEl.value))); status.textContent = 'Saved fighter loaded and selected for your next match.'; updateStartLabel(); } };
    ids.forEach(key => el(key).oninput = preview);
    useCustomEl.onchange = () => { localStorage.setItem('fighter.custom.use.v1', useCustomEl.checked ? '1' : '0'); if (useCustomEl.checked && !loadSlots()[Number(slotEl.value)]) { useCustomEl.checked = false; localStorage.setItem('fighter.custom.use.v1', '0'); status.textContent = 'Save a fighter in this slot before selecting it for a match.'; } else if (useCustomEl.checked) { setActiveCustomSlot(Number(slotEl.value)); } updateStartLabel(); };
    document.getElementById('creator-close').onclick = () => { panel.hidden = true; this.creatorPreview?.dispose(); this.creatorPreview = null; };
    document.getElementById('creator-random').onclick = () => {
      const pick = a => a[Math.floor(Math.random() * a.length)];
      const sets = { color: ['#2869b5','#9c3e36','#6945a1','#247c75','#b75b26','#354d8b'], accent: ['#e6b84c','#42d8c5','#ff8d6b','#8bc5ff','#f2c46b'], skin: ['#f0c6a0','#b97855','#9b6549','#87583f','#daa27c'], hair: ['#20232c','#171923','#5a3424','#b58a45','#d8d8d8'], 'hair-style': ['short','spiky','long','curly','bald'], build: ['slim','athletic','bulky'], face: ['oval','square','round'], brows: ['normal','strong','angled'], beard: ['none','stubble','beard','mustache'], top: ['tee','jacket','hoodie','vest'], bottom: ['pants','shorts','joggers'], gloves: ['wraps','boxing','none'], shoes: ['high','boots','light'], accessory: ['none','glasses','headband','chain'] };
      Object.entries(sets).forEach(([key, values]) => el(key).value = pick(values)); preview();
    };
    document.getElementById('creator-save').onclick = () => {
      const slot = Number(slotEl.value) || 0; const value = saveCustomFighter(fields(), slot); this.customFighter = toFighter(value); setActiveCustomSlot(slot); useCustomEl.checked = true; localStorage.setItem('fighter.custom.use.v1', '1'); refreshSaved(); savedEl.value = String(slot);
      status.textContent = `${value.name} saved in slot ${slot+1}. It is selected for your next match.`; updateStartLabel();
    };
    preview(); panel.hidden = false;
  }

  createOnlineButton() {
    this.onlineButton = this.add.text(0, 0, 'ONLINE ROOM', { fontFamily: 'Rajdhani, sans-serif', fontSize: '12px', fontStyle: 'bold', color: '#ffffff', backgroundColor: '#17263b', padding: { x: 14, y: 8 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.onlineButton.on('pointerdown', () => this.openOnlinePanel());
  }

  async openOnlinePanel() {
    const panel = document.getElementById('online-panel'); if (!panel) return; panel.hidden = false;
    const status = document.getElementById('online-status'), players = document.getElementById('room-players'), ready = document.getElementById('room-ready');
    const name = () => document.getElementById('online-name').value.trim() || 'Player';
    const fighter = () => roster[this.selectedIndex].id;
    const close = () => { panel.hidden = true; }; document.getElementById('online-close').onclick = close;
    const showPlayers = list => { players.innerHTML = list.map((p, i) => `<div>${p.host || i === 0 ? 'HOST' : 'GUEST'}: ${this.escapeHtml(p.name)} · ${this.escapeHtml(p.fighterId)} · ${p.ready ? 'READY' : 'NOT READY'}</div>`).join(''); ready.disabled = list.length !== 2; };
    try { status.textContent = 'Connecting to room server…'; await onlineRoom.connect(); status.textContent = 'Create a room or enter a friend code.'; }
    catch { status.textContent = 'Room server unavailable. Deploy the Node server and set VITE_GAME_SERVER.'; return; }
    const selected = () => ({ fighterId: fighter(), stageId: this.stages[this.stageIndex].id });
    document.getElementById('room-create').onclick = () => onlineRoom.create({ name: name(), ...selected() });
    document.getElementById('room-join').onclick = () => { onlineRoom.join(document.getElementById('room-code').value, { name: name(), ...selected() }); onlineRoom.select(selected()); };
    ready.onclick = () => { onlineRoom.select(selected()); onlineRoom.ready(true); };
    if (!this.onlineSubscriptions) {
      this.onlineSubscriptions = [];
      this.onlineSubscriptions.push(onlineRoom.on('room:joined', data => { status.textContent = `Room ${data.code} · You are ${data.slot === 0 ? 'Host' : 'Guest'}`; document.getElementById('room-code').value = data.code; showPlayers(data.players); }));
      this.onlineSubscriptions.push(onlineRoom.on('room:players', showPlayers));
      this.onlineSubscriptions.push(onlineRoom.on('room:error', message => { status.textContent = message; }));
      this.onlineSubscriptions.push(onlineRoom.on('room:start', data => { showPlayers(data.players); panel.hidden = true; this.enteringOnlineMatch = true; this.scene.start('FightScene', { online: true, mode: 'online', slot: onlineRoom.slot, players: data.players, stageId: data.stageId }); }));
    }
  }

  escapeHtml(value) { return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  createSelectionPreview() {
    document.getElementById('selection-preview')?.remove();
    const host = document.createElement('div');
    host.id = 'selection-preview';
    host.className = 'bv-panel bv-selection-preview-panel';
    host.innerHTML = `
      <div class="bv-preview-tag">
        <span class="bv-tag-badge">03</span>
        <span class="bv-tag-title">FIGHTER SHOWCASE</span>
      </div>
      <div class="selection-preview-header">
        <div class="selection-preview-name" id="selection-preview-name">ATLAS</div>
        <div class="selection-preview-archetype" id="selection-preview-archetype">BALANCED · THE HEAVYWEIGHT</div>
      </div>
      <div class="selection-preview-canvas" id="selection-preview-canvas"></div>
      <div class="bv-stats-matrix" id="selection-preview-stats">
        <div class="bv-stat-row">
          <span class="bv-stat-name">POWER</span>
          <div class="bv-stat-blocks" data-stat="power">
            <span class="block active"></span><span class="block active"></span><span class="block active"></span><span class="block active"></span><span class="block"></span>
          </div>
        </div>
        <div class="bv-stat-row">
          <span class="bv-stat-name">SPEED</span>
          <div class="bv-stat-blocks" data-stat="speed">
            <span class="block active"></span><span class="block active"></span><span class="block active"></span><span class="block"></span><span class="block"></span>
          </div>
        </div>
        <div class="bv-stat-row">
          <span class="bv-stat-name">RANGE</span>
          <div class="bv-stat-blocks" data-stat="range">
            <span class="block active"></span><span class="block active"></span><span class="block active"></span><span class="block"></span><span class="block"></span>
          </div>
        </div>
        <div class="bv-stat-row">
          <span class="bv-stat-name">DEFENSE</span>
          <div class="bv-stat-blocks" data-stat="defense">
            <span class="block active"></span><span class="block active"></span><span class="block active"></span><span class="block active"></span><span class="block"></span>
          </div>
        </div>
      </div>
      <div class="selection-preview-special" id="selection-preview-special">
        <span class="special-icon">★</span> SPECIAL: <strong id="selection-special-name">TITAN BREAKER</strong>
      </div>
      <div class="selection-preview-bio" id="selection-preview-bio">A disciplined all-rounder with strong counters.</div>
      <div class="selection-preview-hint">DRAG TO ROTATE · SCROLL TO ZOOM</div>
    `;
    document.getElementById('game-root')?.appendChild(host);
    this.selectionPreviewHost = host;
    this.selectionPreview = new CustomizerPreview(host.querySelector('#selection-preview-canvas'));
    this.selectionPreviewHost.hidden = this.scale.width < 980;
  }

  updateSelectionPreview(fighter) {
    if (!this.selectionPreview || !fighter) return;
    const hex = value => `#${Number(value ?? 0).toString(16).padStart(6, '0').slice(-6)}`;
    const name = document.getElementById('selection-preview-name');
    if (name) name.textContent = fighter.name;
    const arch = document.getElementById('selection-preview-archetype');
    if (arch) {
      const styleName = (fighter.style || 'BALANCED').toUpperCase();
      arch.textContent = `${styleName} · ${fighter.title || 'CHAMPION'}`;
      arch.setAttribute('data-style', fighter.style || 'balanced');
    }
    const special = document.getElementById('selection-special-name');
    if (special) special.textContent = (fighter.specialName || 'SPECIAL ATTACK').toUpperCase();
    const bio = document.getElementById('selection-preview-bio');
    if (bio) bio.textContent = fighter.bio || '';

    // Segmented stat blocks update
    const stats = fighter.stats || { power: 3, speed: 3, guard: 3 };
    const powerVal = stats.power ?? 3;
    const speedVal = stats.speed ?? 3;
    const defenseVal = stats.guard ?? 3;
    const rangeVal = fighter.id === 'myst' ? 5 : fighter.id === 'volt' ? 4 : 3;

    const updateBlocks = (attr, val) => {
      const container = document.querySelector(`.bv-stat-blocks[data-stat="${attr}"]`);
      if (container) {
        container.innerHTML = [1, 2, 3, 4, 5].map(i =>
          `<span class="block${i <= val ? ' active' : ''}"></span>`
        ).join('');
      }
    };
    updateBlocks('power', powerVal);
    updateBlocks('speed', speedVal);
    updateBlocks('range', rangeVal);
    updateBlocks('defense', defenseVal);

    const isVolt = fighter.id === 'volt';
    const isRook = fighter.id === 'rook';
    const isMyst = fighter.id === 'myst';
    this.selectionPreview.update({
      fighterId: fighter.id,
      fighterConfig: fighter,
      name: fighter.name,
      color: hex(fighter.color),
      accent: hex(fighter.accent),
      skin: hex(fighter.skin),
      hair: hex(fighter.hair),
      bottomColor: isVolt ? '#1b2234' : isRook ? '#1f2937' : isMyst ? '#221a30' : '#202a3b',
      eyeColor: isVolt ? '#a6ff00' : isRook ? '#ff2040' : isMyst ? '#42d8c5' : '#171b24',
      build: isRook ? 'bulky' : isVolt || isMyst ? 'slim' : 'athletic',
      height: isRook ? 114 : isMyst ? 98 : isVolt ? 96 : 100,
      width: isRook ? 116 : isVolt ? 94 : isMyst ? 96 : 100,
      legs: isVolt ? 104 : isRook ? 100 : 100,
      muscle: isRook ? 90 : isVolt ? 45 : isMyst ? 35 : 68,
      hairStyle: isVolt ? 'spiky' : isMyst ? 'long' : 'short',
      face: isRook ? 'square' : isMyst ? 'oval' : 'oval',
      brows: isRook ? 'strong' : 'normal',
      beard: 'none',
      top: isRook ? 'vest' : isVolt ? 'jacket' : isMyst ? 'hoodie' : 'tee',
      bottom: 'pants',
      gloves: isRook ? 'boxing' : 'wraps',
      shoes: isMyst ? 'light' : 'boots',
      accessory: isVolt ? 'headband' : isRook || isMyst ? 'mask' : 'none',
      outfit: isMyst ? 'street' : 'combat'
    });
  }

  createStagePreview() {
    document.getElementById('stage-preview')?.remove();
    const host = document.createElement('div');
    host.id = 'stage-preview';
    host.className = 'bv-panel bv-stage-preview-panel';
    host.innerHTML = `
      <div class="bv-preview-tag">
        <span class="bv-tag-badge">04</span>
        <span class="bv-tag-title">ARENA SELECT</span>
      </div>
      <div class="stage-preview-header">
        <div class="stage-preview-title" id="stage-preview-name">NEON DISTRICT</div>
        <div class="stage-preview-subtitle" id="stage-preview-sub">NEO-TOKYO UNDERGROUND</div>
      </div>
      <div class="stage-preview-art" id="stage-preview-art"></div>
      <div class="stage-preview-desc" id="stage-preview-desc">A glowing underground fight club with neon billboards.</div>
      <div class="bv-stage-selector">
        <div class="bv-stage-nav-row">
          <button class="bv-stage-nav-btn prev" id="stage-btn-prev" type="button" aria-label="Previous Arena">‹ PREV</button>
          <span class="bv-stage-counter" id="stage-counter">ARENA 1 / 3</span>
          <button class="bv-stage-nav-btn next" id="stage-btn-next" type="button" aria-label="Next Arena">NEXT ›</button>
        </div>
        <div class="bv-stage-thumbnails" id="stage-thumbnails">
          <button class="stage-thumb active" data-stage="0" type="button">
            <span class="stage-thumb-dot"></span>
            <span class="stage-thumb-name">NEON</span>
          </button>
          <button class="stage-thumb" data-stage="1" type="button">
            <span class="stage-thumb-dot"></span>
            <span class="stage-thumb-name">TEMPLE</span>
          </button>
          <button class="stage-thumb" data-stage="2" type="button">
            <span class="stage-thumb-dot"></span>
            <span class="stage-thumb-name">ROOFTOP</span>
          </button>
        </div>
      </div>
      <div class="stage-preview-lock" id="stage-preview-lock" hidden></div>
    `;
    document.getElementById('game-root')?.appendChild(host);
    this.stagePreviewHost = host;

    const prevBtn = host.querySelector('#stage-btn-prev');
    const nextBtn = host.querySelector('#stage-btn-next');
    if (prevBtn) prevBtn.onclick = () => { audioManager.playHover(); this.changeStage(-1); };
    if (nextBtn) nextBtn.onclick = () => { audioManager.playHover(); this.changeStage(1); };
    host.querySelectorAll('.stage-thumb').forEach(thumb => {
      thumb.onclick = () => {
        const target = Number(thumb.getAttribute('data-stage'));
        if (target !== this.stageIndex) {
          audioManager.playSelect();
          const diff = target - this.stageIndex;
          this.changeStage(diff);
        }
      };
    });

    this.drawStagePreview();
  }

  drawStagePreview() {
    const art = document.getElementById('stage-preview-art');
    if (!art) return;
    const scenes = [
      {
        bg: 'linear-gradient(160deg,#0a1324,#162744 55%,#070d17)',
        glow: '#12ddeb',
        floor: '#162842',
        label: 'NEON DISTRICT',
        sub: 'NEO-TOKYO UNDERGROUND',
        desc: 'A glowing underground arena beneath neon billboards, holographic signs, and rain-slicked asphalt.'
      },
      {
        bg: 'linear-gradient(160deg,#2b1f14,#5c4327 55%,#120e0a)',
        glow: '#f4c65e',
        floor: '#3d2c19',
        label: 'ANCIENT TEMPLE',
        sub: 'SACRED LANTERN SANCTUARY',
        desc: 'A sacred stone arena flanked by ancient pagoda roofs, bronze statues, and golden paper lanterns.'
      },
      {
        bg: 'linear-gradient(160deg,#0d182e,#223659 55%,#080f1e)',
        glow: '#38bdf8',
        floor: '#1c2d4a',
        label: 'CITY ROOFTOP',
        sub: 'MIDNIGHT SKYLINE HELIPAD',
        desc: 'A high-stakes midnight duel above the skyscraper skyline with glowing aviation lights and city breeze.'
      }
    ];
    const stage = scenes[this.stageIndex] || scenes[0];
    art.style.background = stage.bg;
    art.style.setProperty('--stage-glow', stage.glow);
    art.style.setProperty('--stage-floor', stage.floor);
    art.innerHTML = `
      <div class="stage-skyline skyline-a"></div>
      <div class="stage-skyline skyline-b"></div>
      <div class="stage-spotlight spot-left"></div>
      <div class="stage-spotlight spot-right"></div>
      <div class="stage-glow"></div>
      <div class="stage-floor"></div>
      <div class="stage-preview-label">${stage.label}</div>
    `;

    const nameEl = document.getElementById('stage-preview-name');
    if (nameEl) nameEl.textContent = stage.label;
    const subEl = document.getElementById('stage-preview-sub');
    if (subEl) subEl.textContent = stage.sub;
    const descEl = document.getElementById('stage-preview-desc');
    if (descEl) descEl.textContent = stage.desc;
    const counterEl = document.getElementById('stage-counter');
    if (counterEl) counterEl.textContent = `ARENA ${this.stageIndex + 1} / ${this.stages.length}`;

    document.querySelectorAll('#stage-thumbnails .stage-thumb').forEach((thumb, idx) => {
      thumb.classList.toggle('active', idx === this.stageIndex);
    });

    const lockEl = document.getElementById('stage-preview-lock');
    if (lockEl) {
      const unlocked = isStageUnlocked(this.stages[this.stageIndex].id);
      lockEl.hidden = unlocked;
      if (!unlocked) lockEl.textContent = '🔒 LOCKED · CLICK TO UNLOCK';
    }

    this.stagePreviewHost.hidden = this.scale.width < 980;
  }

  createCards() {
    roster.forEach((fighter, index) => {
      const card = this.add.container(0, 0);
      const isRook = fighter.id === 'rook';
      const isVolt = fighter.id === 'volt';
      const isMyst = fighter.id === 'myst';
      const bg = this.add.rectangle(0, 0, 150, 190, COLORS.panel).setStrokeStyle(1, 0x24344d);
      const portrait = this.add.rectangle(0, -30, 116, 112, fighter.color, 1).setStrokeStyle(1, fighter.accent);
      const glow = this.add.circle(0, -32, 31, fighter.accent, 0.16);
      const shoulders = this.add.ellipse(0, 2, isRook ? 94 : isVolt ? 68 : isMyst ? 66 : 76, isRook ? 44 : 38, fighter.accent, 1);
      const torso = this.add.rectangle(0, 4, isRook ? 68 : isVolt ? 48 : isMyst ? 46 : 54, 42, fighter.color, 1);
      const head = this.add.circle(0, isRook ? -37 : -39, isRook ? 25 : isMyst ? 21 : 23, isRook ? 0x374151 : (fighter.skin ?? 0xc98f68));
      const hair = this.add.ellipse(0, isVolt ? -56 : isMyst ? -48 : -52, isVolt ? 52 : isMyst ? 38 : 48, isVolt ? 26 : isMyst ? 32 : 22, fighter.hair ?? 0x20232c);
      const styleTag = (fighter.style || 'BALANCED').toUpperCase();
      const styleColor = isRook ? '#ff3d91' : isVolt ? '#38bdf8' : isMyst ? '#9b67ff' : '#12ddeb';
      const badge = this.add.text(0, 38, styleTag, { fontFamily: 'Rajdhani, sans-serif', fontSize: '8px', fontStyle: 'bold', color: styleColor, backgroundColor: '#070d17', padding: { x: 6, y: 2 } }).setOrigin(0.5);
      const name = this.add.text(0, 56, fighter.name, { fontFamily: 'Orbitron, sans-serif', fontSize: '14px', fontStyle: 'bold', color: '#ffffff', letterSpacing: 1.5 }).setOrigin(0.5);
      const role = this.add.text(0, 74, fighter.title, { fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: '#91a2b9', letterSpacing: 0.8 }).setOrigin(0.5);
      const locked = !isFighterUnlocked(fighter.id);
      const lockLabel = this.add.text(0, -82, locked ? 'LOCKED' : '', { fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', fontStyle: 'bold', color: '#ffffff', backgroundColor: '#8a2035', padding: { x: 7, y: 3 } }).setOrigin(0.5);
      const selected = this.add.rectangle(0, 0, 150, 190).setStrokeStyle(3, 0x12ddeb).setVisible(false);
      card.add([bg, portrait, glow, shoulders, torso, head, hair, badge, name, role, lockLabel, selected]);
      card.setData('locked', locked);
      card.setData('lockLabel', lockLabel);
      card.setSize(150, 190).setInteractive(new Phaser.Geom.Rectangle(-75, -95, 150, 190), Phaser.Geom.Rectangle.Contains);
      card.on('pointerdown', () => locked ? this.unlockFighter(index) : this.select(index));
      card.setData('selectedBorder', selected);
      this.grid.add(card);
      this.cardObjects.push(card);
    });
  }

  unlockFighter(index) {
    const fighter = roster[index];
    const result = purchaseFighter(fighter.id);
    this.progression = progressionSnapshot();
    if (result.ok) {
      const card = this.cardObjects[index];
      card.setData('locked', false);
      card.getData('lockLabel')?.setText('');
      card.getAt(9)?.setText?.('');
      this.subtitle.setText(`LEVEL ${this.progression.level}  ·  ${this.progression.coins} COINS  ·  ${fighter.name} UNLOCKED`);
      this.select(index);
    } else this.subtitle.setText(`${fighter.name}: ${result.reason}  ·  ${this.progression.coins} COINS`);
  }

  changeStage(direction) {
    const next = (this.stageIndex + direction + this.stages.length) % this.stages.length;
    const stage = this.stages[next];
    this.stageIndex = next;
    const unlocked = isStageUnlocked(stage.id);
    if (!unlocked) {
      const result = purchaseStage(stage.id);
      this.progression = progressionSnapshot();
      if (result.ok) {
        this.subtitle.setText(`${stage.name} UNLOCKED  ·  ${this.progression.coins} COINS`);
      } else {
        this.subtitle.setText(`${stage.name}: ${result.reason}  ·  ${this.progression.coins} COINS`);
      }
    } else {
      const modeName = this.mode === 'training' ? 'TRAINING LAB' : this.mode === 'local' ? 'LOCAL VERSUS' : this.mode === 'online' ? 'ONLINE PVP' : 'ARCADE GAUNTLET';
      this.subtitle.setText(`${modeName}  ·  LEVEL ${this.progression.level}  ·  ${this.progression.coins} COINS`);
    }
    this.updateStageLabel();
  }

  updateStageLabel() {
    const stage = this.stages[this.stageIndex];
    this.stageLabel.setText(`STAGE  /  ${stage.name}${isStageUnlocked(stage.id) ? '' : '  ·  LOCKED'}`);
    this.stageDesc.setText(stage.desc);
    this.drawStagePreview();
  }

  select(index) {
    if (!isFighterUnlocked(roster[index].id)) return;
    audioManager.playSelect();
    this.selectedIndex = index;
    const fighter = roster[index];
    this.cardObjects.forEach((card, i) => card.getData('selectedBorder').setVisible(i === index));
    this.infoName.setText(fighter.name);
    this.infoTitle.setText(fighter.title);
    this.infoBio.setText(fighter.bio);
    this.specialLabel.setText(`SPECIAL  /  ${fighter.specialName}`);
    this.updateSelectionPreview(fighter);
    this.infoBg.setStrokeStyle(1, fighter.accent || 0x12ddeb);
  }

  layout({ width, height }) {
    const isMobileShort = height < 500;
    const compact = width < 760 || isMobileShort;
    const narrow = width < 520;
    const desktopSplit = width >= 900 && !isMobileShort;
    const showSidePreviews = width >= 1500 || width >= 980;
    const sidePreviewsActive = showSidePreviews && !isMobileShort;
    if (this.selectionPreviewHost) this.selectionPreviewHost.hidden = !sidePreviewsActive;
    if (this.stagePreviewHost) this.stagePreviewHost.hidden = !sidePreviewsActive;

    this.title.setPosition(width / 2, isMobileShort ? 14 : (compact ? 26 : 38))
      .setFontSize(isMobileShort ? '15px' : (compact ? '20px' : '28px'));
    this.subtitle.setPosition(width / 2, isMobileShort ? 28 : (compact ? 48 : 68))
      .setFontSize(isMobileShort ? '10px' : (compact ? '10px' : '13px'));

    const columns = isMobileShort ? 8 : 4;
    const rows = Math.ceil(roster.length / columns);
    const gap = isMobileShort ? 8 : (compact ? 6 : 14);
    const toolbarHeight = isMobileShort ? 160 : (this.localVersus ? 236 : 200);
    const toolbarTop = height - toolbarHeight;
    const startY = isMobileShort ? 90 : (compact ? 70 : 180);
    const cardAreaBottom = isMobileShort ? 136 : (toolbarTop - (desktopSplit ? 18 : 104));
    const cardH = isMobileShort ? 92 : Math.max(56, Math.min(compact ? 150 : 190, (cardAreaBottom - startY - gap) / rows));
    const cardW = isMobileShort ? Math.max(72, Math.min(92, Math.floor((width - 48 - (columns - 1) * gap) / columns))) : Math.max(55, Math.min(compact ? 118 : 150, (width - (desktopSplit ? 48 : 28) - (columns - 1) * gap) / columns));
    const totalW = columns * cardW + (columns - 1) * gap;
    const contentLeft = (width - totalW) / 2;
    const startX = contentLeft + cardW / 2;
    this.cardObjects.forEach((card, i) => {
      const col = i % columns, row = Math.floor(i / columns);
      card.setPosition(startX + col * (cardW + gap), startY + row * (cardH + gap));
      card.setScale(cardW / 150, cardH / 190);
    });
    const cardsBottom = isMobileShort ? (startY + cardH / 2) : (startY + rows * (cardH + gap) - gap);

    const infoWidth = isMobileShort ? Math.min(width - 32, 620) : (desktopSplit ? 300 : Math.max(250, width - 32));
    const infoHeight = isMobileShort ? 44 : (desktopSplit ? Math.min(220, Math.max(160, toolbarTop - startY - 20)) : Math.min(82, Math.max(64, toolbarTop - cardsBottom - 10)));
    const infoX = isMobileShort ? (width / 2) : (desktopSplit ? contentLeft + totalW + 24 + infoWidth / 2 : width / 2);
    const infoY = isMobileShort ? 168 : (desktopSplit ? startY + Math.min(112, (toolbarTop - startY) / 2) : cardsBottom + infoHeight / 2 + 6);
    this.infoBg.setSize(infoWidth, infoHeight);

    if (isMobileShort) {
      this.infoName.setPosition(-infoWidth / 2 + 14, -7).setFontSize('13px').setOrigin(0, 0.5);
      this.infoTitle.setPosition(-infoWidth / 2 + 14, 9).setFontSize('8px').setOrigin(0, 0.5);
      this.specialLabel.setPosition(infoWidth / 2 - 14, -7).setFontSize('9px').setOrigin(1, 0.5);
      this.infoBio.setPosition(infoWidth / 2 - 14, 9).setFontSize('8px').setOrigin(1, 0.5).setWordWrapWidth(infoWidth / 2).setMaxLines(1);
    } else if (desktopSplit) {
      this.infoName.setPosition(-infoWidth / 2 + 16, -infoHeight / 2 + 16).setOrigin(0, 0);
      this.infoTitle.setPosition(-infoWidth / 2 + 16, -infoHeight / 2 + 48).setOrigin(0, 0);
      this.infoBio.setPosition(-infoWidth / 2 + 16, -infoHeight / 2 + 72).setWordWrapWidth(infoWidth - 32).setOrigin(0, 0);
      this.specialLabel.setPosition(-infoWidth / 2 + 16, infoHeight / 2 - 34).setOrigin(0, 0);
    } else {
      this.infoName.setPosition(-infoWidth / 2 + 10, -infoHeight / 2 + 8).setFontSize(narrow ? '16px' : '18px').setOrigin(0, 0);
      this.infoTitle.setPosition(-infoWidth / 2 + 10, -infoHeight / 2 + 30).setFontSize('8px').setOrigin(0, 0);
      this.infoBio.setPosition(-infoWidth / 2 + 10, -infoHeight / 2 + 46).setFontSize('9px').setWordWrapWidth(infoWidth - 20).setMaxLines(1).setOrigin(0, 0);
      this.specialLabel.setPosition(infoWidth / 2 - 10, -infoHeight / 2 + 10).setOrigin(1, 0).setFontSize('8px');
    }
    this.infoPanel.setPosition(infoX, infoY).setScale(1);
    this.infoPanel.setVisible(isMobileShort || (!sidePreviewsActive && infoHeight >= 60));

    const stageY = isMobileShort ? 224 : toolbarTop + 18;
    if (this.selectionPreviewHost) {
      if (width >= 1500) {
        this.selectionPreviewHost.style.right = '32px';
        this.selectionPreviewHost.style.top = '95px';
      } else if (width >= 1200) {
        this.selectionPreviewHost.style.right = '20px';
        this.selectionPreviewHost.style.top = '85px';
      } else {
        this.selectionPreviewHost.style.right = '12px';
        this.selectionPreviewHost.style.top = '75px';
      }
    }
    if (this.stagePreviewHost) {
      if (width >= 1500) {
        this.stagePreviewHost.style.left = '32px';
        this.stagePreviewHost.style.top = '95px';
      } else if (width >= 1200) {
        this.stagePreviewHost.style.left = '20px';
        this.stagePreviewHost.style.top = '85px';
      } else {
        this.stagePreviewHost.style.left = '12px';
        this.stagePreviewHost.style.top = '75px';
      }
    }

    this.stageLabel.setPosition(width / 2, stageY).setFontSize(isMobileShort ? '13px' : '15px').setVisible(isMobileShort || !sidePreviewsActive);
    this.stageDesc.setPosition(width / 2, stageY + 16).setFontSize(isMobileShort ? '9px' : '11px').setVisible(isMobileShort || (!sidePreviewsActive && !isMobileShort));
    this.stagePrev.setPosition(width / 2 - (isMobileShort ? 145 : (compact ? 120 : 165)), stageY + (isMobileShort ? 0 : 4)).setScale(isMobileShort ? 0.8 : (compact ? 0.7 : 1)).setVisible(isMobileShort || !sidePreviewsActive);
    this.stageNext.setPosition(width / 2 + (isMobileShort ? 145 : (compact ? 120 : 165)), stageY + (isMobileShort ? 0 : 4)).setScale(isMobileShort ? 0.8 : (compact ? 0.7 : 1)).setVisible(isMobileShort || !sidePreviewsActive);

    const isCpuMode = !this.localVersus && this.mode !== 'online';
    this.difficultyLabel?.setVisible(isCpuMode && !isMobileShort);
    this.difficultyButtons?.forEach(button => button.setVisible(isCpuMode));
    if (isCpuMode) {
      const diffY = isMobileShort ? 266 : (sidePreviewsActive ? cardsBottom + 35 : stageY + 38);
      this.difficultyLabel?.setPosition(width / 2, diffY);
      this.difficultyButtons?.forEach((button, i) => button.setPosition(width / 2 + (i - 1) * (isMobileShort ? 78 : 90), isMobileShort ? diffY : diffY + 24).setScale(isMobileShort ? 0.76 : 1));
    }

    this.startButton.setPosition(width / 2, height - 32).setScale(compact ? 0.75 : 0.95);
    this.onlineButton?.setPosition(width - (compact ? 80 : 112), isMobileShort ? 18 : (compact ? 28 : 42)).setScale(compact ? 0.72 : 1);
    this.menuBackButton?.setPosition(compact ? 46 : 62, isMobileShort ? 18 : (compact ? 28 : 42)).setScale(compact ? 0.72 : 1);
    this.creatorButton?.setPosition(isMobileShort ? 112 : (compact ? (width / 2) : 145), isMobileShort ? 18 : (compact ? 75 : 42)).setScale(compact ? 0.72 : 1);
    this.hint.setPosition(width / 2, height - 68).setVisible(!compact && !isMobileShort);

    if (this.localVersus && this.p2Title) {
      const y = sidePreviewsActive ? cardsBottom + 35 : height - 85;
      this.p2Title.setPosition(width / 2, y);
      this.p2Prev.setPosition(width / 2 - 120, y + 24);
      this.p2Name.setPosition(width / 2, y + 24);
      this.p2Next.setPosition(width / 2 + 120, y + 24);
    }
  }

  startFight() {
    const selected = roster[this.selectedIndex];
    if (!isFighterUnlocked(selected.id) || !isStageUnlocked(this.stages[this.stageIndex].id)) return;
    const useCustom = localStorage.getItem('fighter.custom.use.v1') === '1';
    const customSlot = getActiveCustomSlot();
    const savedCustom = useCustom ? loadSlots()[customSlot] : null;
    const player = savedCustom ? toFighter(savedCustom) : selected;
    const rivals = roster.filter((fighter) => fighter.id !== player.id);
    if (this.localVersus && this.playerTwoIndex === this.selectedIndex) this.changePlayerTwo(1);
    const opponent = this.mode === 'local' ? roster[this.playerTwoIndex] : Phaser.Utils.Array.GetRandom(rivals.length ? rivals : roster);
    const arcadeRun = this.mode === 'arcade' ? new ArcadeProgression({ playerId: player.id, stageId: this.stages[this.stageIndex].id }) : null;
    const firstArcade = arcadeRun?.current();
    this.scene.start('FightScene', {
      mode: this.mode, playerId: player.id, customFighter: savedCustom ? player : null,
      cpuId: firstArcade?.fighterId ?? opponent.id,
      stageId: firstArcade?.stageId ?? this.stages[this.stageIndex].id,
      difficulty: firstArcade?.difficulty ?? this.difficulty,
      arcadeRun: arcadeRun?.serialize() ?? null
    });
  }
}
