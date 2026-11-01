import Phaser from 'phaser';
import { Fighter } from '../characters/Fighter.js';
import { CombatSystem } from '../combat/CombatSystem.js';
import { RoundManager } from '../combat/RoundManager.js';
import { CPUController } from '../ai/CPUController.js';
import { ArcadeProgression } from '../modes/ArcadeProgression.js';
import { InputController } from '../input/InputController.js';
import { ThreeStage } from '../three/ThreeStage.js';
import { gameConfig } from '../config/gameConfig.js';
import { getFighter } from '../characters/roster.js';
import { onlineRoom } from '../multiplayer/OnlineRoom.js';
import { awardMatch } from '../progression/Progression.js';
import { audioManager } from '../audio/AudioManager.js';

export class FightScene extends Phaser.Scene {
  constructor() { super('FightScene'); }

  init(data = {}) {
    this.online = !!data.online;
    this.localVersus = this.mode === 'local';
    this.slot = data.slot ?? 0;
    this.roomPlayers = data.players ?? [];
    this.localPlayer = this.roomPlayers[this.slot];
    this.remotePlayer = this.roomPlayers[1 - this.slot];
    this.playerCharacter = this.online ? getFighter(this.localPlayer?.fighterId ?? 'atlas') : (data.customFighter ?? getFighter(data.playerId ?? 'atlas'));
    this.cpuCharacter = getFighter(this.online ? (this.remotePlayer?.fighterId ?? 'volt') : (data.cpuId ?? 'volt'));
    this.arcadeRun = data.arcadeRun ? ArcadeProgression.restore(data.arcadeRun) : null;
    this.stageId = data.stageId ?? "neon";
    this.mode = data.mode || 'arcade';
    this.localVersus = this.mode === 'local';
    this.cpuDifficulty = data.difficulty || localStorage.getItem('fighter.cpu.difficulty') || 'normal';
    this.training = this.mode === 'training';
    this.trainingSettings = { dummy: 'stationary', infinitePlayer: false, infiniteDummy: true, infiniteEnergy: true };
    this.trainingStats = { damage: 0, hits: 0, maxCombo: 0, lastDamage: 0 };
  }

  create() {
    const touchControls = document.getElementById('touch-controls');
    if (touchControls && matchMedia('(pointer: coarse), (max-width: 760px)').matches) touchControls.style.display = 'flex';
    if (this.localVersus && matchMedia('(pointer: coarse), (max-width: 760px)').matches) this.createPlayerTwoTouchControls();
    this.three = new ThreeStage(document.getElementById('three-root'));
    this.three.setArena(this.stageId);
    const localX = this.online && this.slot === 1 ? 2.5 : -2.5;
    const remoteX = -localX;
    this.player = new Fighter({ id: 'player', x: localX, facing: localX < 0 ? 1 : -1, character: this.playerCharacter });
    this.cpu = new Fighter({ id: this.online ? 'remote' : 'cpu', x: remoteX, facing: remoteX < 0 ? 1 : -1, isCpu: !this.online, character: this.cpuCharacter });
    this.remoteInput = {left:false,right:false,jump:false,down:false,punch:false,kick:false,special:false,grab:false,block:false,dashForward:false,dashBack:false};
    this.lastNetworkSend = 0;
    this.remoteUnsubscribe?.();
    this.remoteUnsubscribe = this.online ? onlineRoom.onRemoteInput(({input}) => { this.remoteInput = input; }) : null;
    this.peerConnected = true;
    this.peerDisconnectUnsubscribe = this.online ? onlineRoom.on('room:peer-disconnected', () => {
      this.peerConnected = false; this.remoteInput = {};
      this.statusText?.setText('OPPONENT DISCONNECTED · WAITING').setFontSize('22px').setAlpha(1);
      clearTimeout(this.peerTimeout);
      this.peerTimeout = setTimeout(() => { if (!this.peerConnected) { onlineRoom.leave(); this.scene.start('MainMenuScene'); } }, 30000);
    }) : null;
    this.peerReconnectUnsubscribe = this.online ? onlineRoom.on('room:peer-reconnected', () => {
      this.peerConnected = true; clearTimeout(this.peerTimeout); this.statusText?.setAlpha(0);
    }) : null;
    this.rematchUnsubscribe = this.online ? onlineRoom.on('room:rematch', () => {
      document.getElementById('results-panel').hidden = true;
      this.matchFlow.reset(); this.playerWins = 0; this.cpuWins = 0; this.roundNumber = 1; this.restartRound();
    }) : null;
    this.fighters = [this.player, this.cpu];
    this.three.addFighter('player', this.playerCharacter);
    this.three.addFighter(this.cpu.id, this.cpuCharacter);
    this.inputController = new InputController(this);
    this.hitStop = 0;
    this.comboDisplayTimer = 0;
    this.lastHitFeedbackAt = 0;
    this.combat = new CombatSystem(({ attacker, target, damage, blocked, perfect, combo, action, launcher }) => this.handleHitFeedback({ attacker, target, damage, blocked, perfect, combo, action, launcher }));
    this.matchFlow = new RoundManager({ roundsToWin: 2, roundDuration: 99 });
    this.roundOver = false;
    this.roundNumber = 1;
    this.playerWins = 0;
    this.cpuWins = 0;
    this.cpuAI = this.online ? null : new CPUController({ fighter: this.cpu, opponent: this.player, difficulty: this.cpuDifficulty });
    this.cpuThink = 0;
    this.cpuActionPending = false;
    this.roundSeconds = 99;
    this.createPauseButton();
    this.createHud();
    this.layoutHud({ width: this.scale.width, height: this.scale.height });
    audioManager.playRoundStart();
    if (this.online) this.bindAuthoritativeOnline();
    if (this.training) this.createTrainingPanel();
    this.scale.on('resize', this.layoutHud, this);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.layoutHud, this);
      this.input.keyboard.off('keydown-R', this.handleRestartKey, this);
      this.input.keyboard.off('keydown-T', this.resetTrainingPositions, this);
      this.three?.destroy(); this.comboBanner?.destroy(); this.nextRoundPrompt?.destroy(); this.trainingPanel?.remove(); this.p2TouchPanel?.remove();
      this.remoteUnsubscribe?.();
      this.peerDisconnectUnsubscribe?.(); this.peerReconnectUnsubscribe?.(); this.rematchUnsubscribe?.();
      clearTimeout(this.peerTimeout);
      if (this.online) onlineRoom.leave();
      for (const [element, type, handler] of this.touchListeners || []) element.removeEventListener(type, handler);
      this.touchListeners = [];
      this.inputController?.clear?.();
      document.querySelector('#results-panel .results-actions #arcade-next-fight')?.remove();
      const pause=document.getElementById('pause-panel'); if(pause)pause.hidden=true;
      const results=document.getElementById('results-panel'); if(results)results.hidden=true;
    });
    this.input.keyboard.on('keydown-R', this.handleRestartKey, this);
  }

  createHud() {
    this.hud = this.add.container(0, 0).setDepth(10);
    this.topShade = this.add.rectangle(0, 0, 10, 112, 0x090b12, 0.72).setOrigin(0);
    this.hud.add(this.topShade);
    this.playerName = this.add.text(28, 16, this.localVersus ? `P1 · ${this.playerCharacter.name}` : this.playerCharacter.name, { fontFamily: 'Arial', fontSize: '18px', fontStyle: 'bold', color: '#ffffff', letterSpacing: 2 });
    this.cpuName = this.add.text(0, 16, this.training ? 'TRAINING DUMMY' : this.localVersus ? `P2 · ${this.cpuCharacter.name}` : this.cpuCharacter.name, { fontFamily: 'Arial', fontSize: '18px', fontStyle: 'bold', color: '#ffffff', letterSpacing: 2 }).setOrigin(1, 0);
    this.playerHealthBg = this.add.rectangle(28, 48, 440, 20, 0x353744).setOrigin(0, 0.5);
    this.cpuHealthBg = this.add.rectangle(0, 48, 440, 20, 0x353744).setOrigin(1, 0.5);
    this.playerHealth = this.add.rectangle(28, 48, 440, 14, 0x42d392).setOrigin(0, 0.5);
    this.cpuHealth = this.add.rectangle(0, 48, 440, 14, 0x42d392).setOrigin(1, 0.5);
    this.playerEnergyBg = this.add.rectangle(28, 76, 240, 8, 0x353744).setOrigin(0, 0.5);
    this.cpuEnergyBg = this.add.rectangle(0, 76, 240, 8, 0x353744).setOrigin(1, 0.5);
    this.playerEnergy = this.add.rectangle(28, 76, 48, 6, 0x53a9ff).setOrigin(0, 0.5);
    this.cpuEnergy = this.add.rectangle(0, 76, 48, 6, 0x53a9ff).setOrigin(1, 0.5);
    this.timer = this.add.text(0, 18, '99', { fontFamily: 'Arial', fontSize: '34px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5, 0);
    this.roundLabel = this.add.text(0, 54, 'ROUND 01  ·  0 - 0', { fontFamily: 'Arial', fontSize: '10px', color: '#e9c77a', letterSpacing: 2 }).setOrigin(0.5, 0);
    this.statusText = this.add.text(0, 0, 'FIGHT!', { fontFamily: 'Arial Black, Arial', fontSize: '54px', fontStyle: 'bold', color: '#ffffff', stroke: '#171521', strokeThickness: 8 }).setOrigin(0.5).setAlpha(0);
    this.hud.add([this.playerName, this.cpuName, this.playerHealthBg, this.cpuHealthBg, this.playerHealth, this.cpuHealth, this.playerEnergyBg, this.cpuEnergyBg, this.playerEnergy, this.cpuEnergy, this.timer, this.roundLabel]);
    this.tweens.add({ targets: this.statusText, alpha: 1, scale: 1.08, duration: 260, yoyo: true, hold: 200, onComplete: () => this.statusText.setAlpha(0) });
  }

  createTrainingPanel() {
    document.getElementById('training-panel')?.remove();
    const panel = document.createElement('aside'); panel.id = 'training-panel';
    panel.innerHTML = `<div class="training-head"><strong>TRAINING LAB</strong><button type="button" id="training-collapse">−</button></div>
      <div class="training-controls"><label>Dummy behavior<select id="training-dummy"><option value="stationary">Stationary</option><option value="guard">Always guard</option><option value="attack">Attack back</option></select></label>
      <label class="training-toggle"><input id="training-player-health" type="checkbox"> Infinite player health</label><label class="training-toggle"><input id="training-dummy-health" type="checkbox" checked> Infinite dummy health</label><label class="training-toggle"><input id="training-energy" type="checkbox" checked> Infinite energy</label>
      <button type="button" id="training-reset">RESET POSITIONS</button><button type="button" id="training-clear">CLEAR STATS</button></div>
      <div class="training-stats"><div><small>TOTAL DAMAGE</small><b id="training-damage">0</b></div><div><small>HITS</small><b id="training-hits">0</b></div><div><small>MAX COMBO</small><b id="training-combo">0</b></div><div><small>LAST HIT</small><b id="training-last">0</b></div></div><p>Move A/D · Jump W · Punch J · Kick K · Grab G · Block Shift · Special L · Reset T</p>`;
    document.getElementById('game-root')?.appendChild(panel); const $ = id => panel.querySelector(`#${id}`);
    $('training-dummy').onchange = e => { this.trainingSettings.dummy = e.target.value; this.cpu.activeAction = null; this.cpu.actionTime = 0; this.cpu.actionElapsed = 0; this.cpu.state = 'idle'; this.cpu.blocking = false; };
    $('training-player-health').onchange = e => this.trainingSettings.infinitePlayer = e.target.checked;
    $('training-dummy-health').onchange = e => this.trainingSettings.infiniteDummy = e.target.checked;
    $('training-energy').onchange = e => this.trainingSettings.infiniteEnergy = e.target.checked;
    $('training-reset').onclick = () => this.resetTrainingPositions();
    $('training-clear').onclick = () => { this.trainingStats = { damage: 0, hits: 0, maxCombo: 0, lastDamage: 0 }; this.updateTrainingStats(); };
    $('training-collapse').onclick = () => { panel.classList.toggle('collapsed'); $('training-collapse').textContent = panel.classList.contains('collapsed') ? '+' : '−'; };
    this.trainingPanel = panel; this.input.keyboard.on('keydown-T', this.resetTrainingPositions, this); this.updateTrainingStats();
  }

  updateTrainingStats() {
    if (!this.trainingPanel) return; const stats = this.trainingStats;
    const set = (id, value) => { const el = this.trainingPanel.querySelector(`#${id}`); if (el) el.textContent = String(value); };
    set('training-damage', Math.round(stats.damage)); set('training-hits', stats.hits); set('training-combo', stats.maxCombo); set('training-last', Math.round(stats.lastDamage));
  }

  resetTrainingPositions() {
    if (!this.training) return;
    this.player.x = -2.5; this.cpu.x = 2.5;
    for (const fighter of this.fighters) { fighter.y=0; fighter.vx=0; fighter.vy=0; fighter.health=100; fighter.energy=100; fighter.state='idle'; fighter.activeAction=null; fighter.actionTime=0; fighter.actionElapsed=0; fighter.stun=0; fighter.knockbackVelocity=0; fighter.blocking=false; fighter.invulnerable=0; fighter.cooldowns={punch:0,kick:0,grab:0,special:0}; }
    this.player.facing=1; this.cpu.facing=-1; this.player.comboCount=0; this.player.comboWindow=0;
    this.three?.setFighters(this.fighters); this.updateBars();
  }

  createPauseButton() {
    this.pauseButton = this.add.text(0, 0, 'Ⅱ', { fontSize: '26px', color: '#ffffff', backgroundColor: '#242838', padding: { x: 10, y: 4 } }).setDepth(20).setInteractive({ useHandCursor: true });
    this.pauseButton.on('pointerdown', () => this.openPauseMenu());
    this.menuButton = this.add.text(0, 0, 'MENU', { fontSize: '11px', color: '#ffffff', backgroundColor: '#242838', padding: { x: 9, y: 8 } }).setDepth(20).setInteractive({ useHandCursor: true });
    this.menuButton.on('pointerdown', () => this.scene.start('MainMenuScene'));
    const panel = document.getElementById('pause-panel');
    const controlsInfo = document.getElementById('pause-info');
    if (controlsInfo && this.localVersus) controlsInfo.textContent = 'P1: A/D move · W jump · E/Q dash · J punch · K kick · G grab · Shift block · L super. P2: arrows move · Num 8 jump · Num 6/4 dash · Num 1 punch · Num 2 kick · Num 3 grab · Num 0 block · Num 5 super.';
    const bind = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = fn; };
    bind('pause-resume', () => this.closePauseMenu());
    bind('pause-restart', () => { this.closePauseMenu(); document.querySelector('#results-panel .results-actions #arcade-next-fight')?.remove(); this.matchFlow.reset(); this.playerWins = 0; this.cpuWins = 0; this.roundNumber = 1; this.restartRound(); });
    bind('pause-controls', () => { const info = document.getElementById('pause-info'); if (info) info.hidden = !info.hidden; });
    bind('pause-settings', () => this.openPauseSettings());
    bind('pause-settings-back', () => this.closePauseSettings());
    this.bindPauseSettings();
    bind('pause-quit', () => { this.closePauseMenu(); this.scene.start('MainMenuScene'); });
    bind('results-rematch', () => {
      if (this.online) { onlineRoom.voteRematch(); const button=document.getElementById('results-rematch'); if(button){button.disabled=true;button.textContent='WAITING FOR OPPONENT…';} return; }
      document.querySelector('#results-panel .results-actions #arcade-next-fight')?.remove();
      document.getElementById('results-panel').hidden = true; this.matchFlow.reset(); this.playerWins = 0; this.cpuWins = 0; this.roundNumber = 1; this.restartRound();
    });
    bind('results-select', () => { document.getElementById('results-panel').hidden = true; this.scene.start('SelectScene', { mode: this.mode }); });
    bind('results-menu', () => { document.getElementById('results-panel').hidden = true; this.scene.start('MainMenuScene'); });
  }

  bindPauseSettings() {
    const $ = id => document.getElementById(id);
    const sliders = [
      ['pause-setting-master','fighter.settings.master','pause-master-value','80'],
      ['pause-setting-music','fighter.settings.music','pause-music-value','65'],
      ['pause-setting-effects','fighter.settings.effects','pause-effects-value','85']
    ];
    for (const [id,key,outId,fallback] of sliders) {
      const input = $(id), output = $(outId);
      if (!input) continue;
      input.value = localStorage.getItem(key) ?? fallback;
      if (output) output.textContent = `${input.value}%`;
      input.oninput = () => {
        localStorage.setItem(key, input.value);
        audioManager.syncVolumes();
        if (output) output.textContent = `${input.value}%`;
      };
    }
    const quality = $('pause-setting-quality');
    if (quality) { quality.value = localStorage.getItem('fighter.settings.quality') || 'high'; quality.onchange = () => this.three?.applyQuality(quality.value); }
    const shake = $('pause-setting-shake');
    if (shake) { shake.checked = localStorage.getItem('fighter.settings.shake') === '1'; shake.onchange = () => localStorage.setItem('fighter.settings.shake', shake.checked ? '1' : '0'); }
    const fullscreen = $('pause-setting-fullscreen');
    if (fullscreen) { fullscreen.checked = !!document.fullscreenElement; fullscreen.onchange = async () => { try { if (fullscreen.checked && !document.fullscreenElement) await document.documentElement.requestFullscreen(); else if (!fullscreen.checked && document.fullscreenElement) await document.exitFullscreen(); } catch { fullscreen.checked = !!document.fullscreenElement; } }; }
    audioManager.syncVolumes();
  }
  openPauseSettings() {
    const panel = document.getElementById('pause-settings-panel');
    if (panel) panel.hidden = false;
    document.querySelectorAll('#pause-panel .modal-card > .menu-button, #pause-panel #pause-info').forEach(el => el.hidden = true);
    this.bindPauseSettings();
  }
  closePauseSettings() {
    const panel = document.getElementById('pause-settings-panel');
    if (panel) panel.hidden = true;
    document.querySelectorAll('#pause-panel .modal-card > .menu-button').forEach(el => el.hidden = false);
    const info = document.getElementById('pause-info'); if (info) info.hidden = true;
  }
  openPauseMenu() {
    if (this.roundOver || this.pauseOpen) return;
    this.pauseOpen = true; this.scene.pause();
    const panel = document.getElementById('pause-panel'); if (panel) panel.hidden = false;
    this.pauseButton?.setText('▶');
  }
  closePauseMenu() {
    const panel = document.getElementById('pause-panel'); if (panel) panel.hidden = true;
    this.closePauseSettings();
    const info = document.getElementById('pause-info'); if (info) info.hidden = true;
    this.pauseOpen = false; this.pauseButton?.setText('Ⅱ'); this.scene.resume();
  }

  layoutHud({ width, height } = {}) {
    width ||= this.scale?.width || (typeof window !== 'undefined' ? window.innerWidth : 800);
    height ||= this.scale?.height || (typeof window !== 'undefined' ? window.innerHeight : 600);
    if (!this.topShade || !this.pauseButton || !this.playerName || !this.player || !this.cpu) return;
    const compact = width < 700;
    const margin = compact ? 14 : 28;
    const barWidth = Math.max(110, Math.min(compact ? width * 0.34 : 440, (width - 150) / 2));
    this.topShade.setSize(width, compact ? 94 : 112);
    this.playerName.setPosition(margin, 10).setFontSize(compact ? '12px' : '18px');
    this.cpuName.setPosition(width - margin, 10).setFontSize(compact ? '12px' : '18px');
    this.playerHealthBg.setPosition(margin, 39).setSize(barWidth, 15);
    this.cpuHealthBg.setPosition(width - margin, 39).setSize(barWidth, 15);
    this.playerHealth.setPosition(margin, 39).setSize(barWidth * this.player.health / 100, 10);
    this.cpuHealth.setPosition(width - margin, 39).setSize(barWidth * this.cpu.health / 100, 10);
    this.playerEnergyBg.setPosition(margin, 63).setSize(barWidth * 0.58, 6);
    this.cpuEnergyBg.setPosition(width - margin, 63).setSize(barWidth * 0.58, 6);
    this.playerEnergy.setPosition(margin, 63).setSize(barWidth * 0.58 * this.player.energy / 100, 5);
    this.cpuEnergy.setPosition(width - margin, 63).setSize(barWidth * 0.58 * this.cpu.energy / 100, 5);
    this.timer.setPosition(width / 2, 7).setFontSize(compact ? '25px' : '34px');
    this.roundLabel.setPosition(width / 2, compact ? 42 : 54).setText(`ROUND ${String(this.roundNumber).padStart(2, '0')}  ·  ${this.playerWins} - ${this.cpuWins}`);
    this.statusText.setPosition(width / 2, height * 0.36).setFontSize(compact ? '36px' : '54px');
    this.pauseButton.setPosition(width - 48, compact ? 76 : 120);
    this.menuButton?.setPosition(compact ? 48 : 58, compact ? 76 : 120);
  }

  update(_time, deltaMs) {
    if (this.roundOver || (this.online && this.peerConnected === false)) return;
    const dt = Math.min(deltaMs / 1000, 0.033);
    if (this.hitStop > 0) {
      this.hitStop = Math.max(0, this.hitStop - dt);
      this.three.setFighters(this.fighters);
      return;
    }
    if (this.online) {
      const input = this.inputController.getState();
      if (this.time.now - this.lastNetworkSend > 30) {
        onlineRoom.sendInput(input, ++this.inputSequence);
        this.lastNetworkSend = this.time.now;
      }
      return;
    }
    this.matchFlow.tick(dt);
    this.roundSeconds = this.matchFlow.remaining;
    this.timer.setText(this.training ? '∞' : String(Math.ceil(this.roundSeconds)).padStart(2, '0'));
    const input = this.inputController.getState();
    const input2 = this.localVersus ? this.inputController.getState2() : null;
    if (this.training) {
      if (this.trainingSettings.infinitePlayer) this.player.health = 100;
      if (this.trainingSettings.infiniteEnergy) this.player.energy = 100;
      if (this.trainingSettings.infiniteDummy) this.cpu.health = 100;
    }
    this.player.facing = this.cpu.x >= this.player.x ? 1 : -1;
    this.cpu.facing = -this.player.facing;
    this.player.update(dt, input);
    if (this.localVersus) {
      this.cpu.update(dt, input2);
      this.handleSecondPlayerActions(input2);
    } else if (this.training && this.trainingSettings.dummy === 'stationary') {
      this.cpu.update(dt, {});
    } else if (this.training && this.trainingSettings.dummy === 'guard') {
      this.cpu.update(dt, { block: true });
    } else this.updateCpu(dt);
    this.separateFighters();
    this.handlePlayerActions(input);
    const playerHealthBefore = this.player.health;
    const dummyHealthBefore = this.cpu.health;
    this.combat.update(this.fighters);
    if (this.training) {
      const dealt = Math.max(0, dummyHealthBefore - this.cpu.health);
      if (dealt > 0) { this.trainingStats.damage += dealt; this.trainingStats.hits += 1; this.trainingStats.lastDamage = dealt; this.trainingStats.maxCombo = Math.max(this.trainingStats.maxCombo, this.player.comboCount || 1); }
      if (this.trainingSettings.infiniteDummy) this.cpu.health = 100;
      if (this.trainingSettings.infinitePlayer) this.player.health = 100;
      if (this.trainingSettings.infiniteEnergy) this.player.energy = 100;
      this.updateTrainingStats();
      if (!this.trainingSettings.infinitePlayer && this.player.health <= 0) this.resetTrainingPositions();
    }
    this.three.setFighters(this.fighters);
    this.updateBars();
    this.comboDisplayTimer = Math.max(0, (this.comboDisplayTimer || 0) - dt);
    if (!this.training && this.matchFlow.decideWinner(this.player.health, this.cpu.health)) this.finishRound();
  }

  bindAuthoritativeOnline() {
    this.inputSequence = 0;
    this.onlineUnsubscribes = [
      onlineRoom.on('match:snapshot', snapshot => {
        const local = snapshot.players?.[this.slot], remote = snapshot.players?.[1 - this.slot];
        if (!local || !remote) return;
        this.applyOnlineFighterState(this.player, local);
        this.applyOnlineFighterState(this.cpu, remote);
        this.roundNumber = snapshot.round.round;
        this.playerWins = snapshot.round.wins[this.slot === 0 ? 'player' : 'opponent'];
        this.cpuWins = snapshot.round.wins[this.slot === 0 ? 'opponent' : 'player'];
        this.roundSeconds = snapshot.round.remaining;
        this.timer.setText(String(Math.ceil(this.roundSeconds)).padStart(2, '0'));
        this.roundLabel.setText(`ROUND ${String(this.roundNumber).padStart(2,'0')}  ·  ${this.playerWins} - ${this.cpuWins}`);
        this.three.setFighters(this.fighters); this.updateBars();
      }),
      onlineRoom.on('match:round-complete', ({ round, winnerSlot }) => {
        this.roundOver = true;
        const message = winnerSlot === null ? 'ROUND DRAW' : winnerSlot === this.slot ? 'ROUND WON' : 'ROUND LOST';
        this.statusText.setText(message).setAlpha(1);
        this.playerWins = round.wins[this.slot === 0 ? 'player' : 'opponent'];
        this.cpuWins = round.wins[this.slot === 0 ? 'opponent' : 'player'];
        this.roundLabel.setText(`ROUND ${String(round.round).padStart(2,'0')}  ·  ${this.playerWins} - ${this.cpuWins}`);
      }),
      onlineRoom.on('match:round-start', () => { this.roundOver = false; this.statusText.setAlpha(0); }),
      onlineRoom.on('match:complete', result => this.showOnlineResult(result))
    ];
  }

  applyOnlineFighterState(fighter, state) {
    fighter.x=state.x; fighter.y=state.y; fighter.facing=state.facing;
    fighter.health=state.health; fighter.energy=state.energy; fighter.state=state.activeAction || state.state;
    fighter.blocking=state.blocking; fighter.crouching=state.crouching;
    fighter.actionTime=state.actionTime; fighter.hitFlash=state.hitFlash;
  }

  showOnlineResult(result) {
    this.roundOver = true;
    const won = result.winnerSlot === this.slot;
    document.getElementById('results-title').textContent = won ? 'VICTORY' : 'DEFEAT';
    document.getElementById('results-subtitle').textContent = 'Match result confirmed by the room server. Online account rewards are not enabled.';
    document.getElementById('results-score').textContent = `${result.wins[this.slot === 0 ? 'player' : 'opponent']} — ${result.wins[this.slot === 0 ? 'opponent' : 'player']}`;
    document.getElementById('results-panel').hidden = false;
  }

  handleSecondPlayerActions(input) {
    if (input.punch && !this.prevP2Punch) this.cpu.startAction('punch');
    if (input.kick && !this.prevP2Kick) this.cpu.startAction('kick');
    if (input.special && !this.prevP2Special) this.cpu.startAction('special');
    if (input.grab && !this.prevP2Grab) this.cpu.startAction('grab');
    this.prevP2Punch=input.punch; this.prevP2Kick=input.kick;
    this.prevP2Special=input.special; this.prevP2Grab=input.grab;
  }

  createPlayerTwoTouchControls() {
    document.getElementById('p2-touch-controls')?.remove();
    const panel=document.createElement('div'); panel.id='p2-touch-controls';
    panel.innerHTML='<div class="p2-touch-title">PLAYER 2</div><div class="p2-touch-move"><button data-control-p2="left">◀</button><button data-control-p2="right">▶</button><button data-control-p2="up">JUMP</button></div><div class="p2-touch-attacks"><button data-control-p2="punch">PUNCH</button><button data-control-p2="kick">KICK</button><button data-control-p2="grab">GRAB</button><button data-control-p2="block">BLOCK</button><button data-control-p2="special">SUPER</button></div>';
    document.getElementById('game-root')?.appendChild(panel);
    panel.querySelectorAll('[data-control-p2]').forEach(button=>{
      const action=button.dataset.controlP2;
      const down=e=>{e.preventDefault();this.inputController.touch2[action]=true;button.classList.add('pressed');};
      const up=e=>{e.preventDefault();this.inputController.touch2[action]=false;button.classList.remove('pressed');};
      const listeners = [['pointerdown', down], ...['pointerup','pointercancel','pointerleave'].map(type => [type, up])];
      listeners.forEach(([type, handler]) => button.addEventListener(type, handler));
      (this.touchListeners ||= []).push(...listeners.map(([type, handler]) => [button, type, handler]));
    });
    this.p2TouchPanel=panel;
  }

  handlePlayerActions(input) {
    if (input.punch && !this.prevPunch) this.player.startAction('punch');
    if (input.kick && !this.prevKick) this.player.startAction('kick');
    if (input.special && !this.prevSpecial) this.player.startAction('special');
    if (input.grab && !this.prevGrab) this.player.startAction('grab');
    this.prevPunch = input.punch; this.prevKick = input.kick; this.prevSpecial = input.special; this.prevGrab = input.grab;
  }

  updateCpu(dt) {
    if (!this.cpuAI) this.cpuAI = new CPUController({ fighter: this.cpu, opponent: this.player, difficulty: this.cpuDifficulty });
    const decision = this.cpuAI.update(dt);
    this.cpu.update(dt, decision.movement);
    if (decision.action) this.cpu.startAction(decision.action);
  }

  separateFighters() {
    const minDistance = 0.92;
    const dx = this.cpu.x - this.player.x;
    if (Math.abs(dx) < minDistance) {
      const push = (minDistance - Math.abs(dx)) / 2;
      const sign = Math.sign(dx) || 1;
      this.player.x = Phaser.Math.Clamp(this.player.x - push * sign, gameConfig.world.minX, gameConfig.world.maxX);
      this.cpu.x = Phaser.Math.Clamp(this.cpu.x + push * sign, gameConfig.world.minX, gameConfig.world.maxX);
    }
  }

  updateBars() {
    const w = this.scale.width, compact = w < 700, margin = compact ? 14 : 28;
    const barWidth = Math.max(110, Math.min(compact ? w * 0.34 : 440, (w - 150) / 2));
    this.playerHealth.width = barWidth * this.player.health / 100;
    this.cpuHealth.width = barWidth * this.cpu.health / 100;
    this.playerEnergy.width = barWidth * 0.58 * this.player.energy / 100;
    this.cpuEnergy.width = barWidth * 0.58 * this.cpu.energy / 100;
    
  }

  // Maintains the P3.6 feedback contract: handleHitFeedback({ attacker, target, damage, blocked, perfect, combo, action }).
  handleHitFeedback({ attacker, target, damage, blocked, perfect, combo, action, launcher = false }) {
    const x = this.scale.width * (attacker === this.player ? 0.62 : 0.38);
    const y = this.scale.height * 0.48;
    const label = perfect ? 'PERFECT BLOCK' : blocked ? 'BLOCKED' : `${action.toUpperCase()}  -${Math.round(damage)}`;
    const color = perfect || blocked ? '#8fd4ff' : action === 'special' ? '#f2c46b' : '#ffb0a5';
    this.showFloatText(label, color);
    this.spawnImpactBurst(target, perfect ? 0x8fd4ff : blocked ? 0x75bfff : action === 'special' ? 0xf2c46b : 0xff806d);

    // Audio feedback
    if (launcher) audioManager.playLauncher();
    else if (perfect || blocked) audioManager.playBlock(perfect);
    else if (action === 'special') audioManager.playSpecial();
    else if (action === 'kick') audioManager.playKick();
    else if (action === 'grab') audioManager.playGrab();
    else audioManager.playPunch();

    if (!blocked && !perfect) {
      this.hitStop = Math.max(this.hitStop, action === 'special' ? 0.095 : action === 'kick' ? 0.065 : 0.045);
      const isReduced = localStorage.getItem('fighter.settings.shake') === '1';
      if (this.cameras?.main) {
        if (isReduced) {
          this.cameras.main.shake(action === 'special' ? 40 : 25, action === 'special' ? 0.0015 : 0.0008);
        } else {
          this.cameras.main.shake(action === 'special' ? 150 : 85, action === 'special' ? 0.006 : 0.0025);
        }
      }
    }
    if (combo > 1 && !blocked) {
      this.comboDisplayTimer = 0.8;
      this.showComboBanner(combo);
    }
  }

  spawnImpactBurst(target, tint) {
    const x = this.scale.width * (target === this.cpu ? 0.66 : 0.34);
    const y = this.scale.height * 0.55;
    const burst = this.add.container(x, y).setDepth(18);
    const ring = this.add.circle(0, 0, 9, tint, 0).setStrokeStyle(3, tint, 1);
    burst.add(ring);
    for (let i = 0; i < 7; i++) {
      const angle = (Math.PI * 2 * i) / 7;
      const length = Phaser.Math.Between(12, 25);
      const spark = this.add.rectangle(Math.cos(angle) * 7, Math.sin(angle) * 7, 3, length, tint, 0.95);
      spark.rotation = angle;
      burst.add(spark);
      this.tweens.add({ targets: spark, x: Math.cos(angle) * length, y: Math.sin(angle) * length, alpha: 0, scaleY: 0.25, duration: 230, ease: 'Cubic.Out' });
    }
    this.tweens.add({ targets: ring, scale: 2.8, alpha: 0, duration: 220, ease: 'Cubic.Out' });
    this.time.delayedCall(260, () => burst.destroy());
  }

  showComboBanner(combo) {
    if (this.comboBanner) this.comboBanner.destroy();
    this.comboBanner = this.add.container(this.scale.width / 2, this.scale.height * 0.34).setDepth(19);
    const text = this.add.text(0, 0, `${combo} HIT COMBO`, {
      fontFamily: 'Arial Black, Arial', fontSize: this.scale.width < 700 ? '22px' : '30px',
      fontStyle: 'bold', color: '#f2c46b', stroke: '#171521', strokeThickness: 6,
      letterSpacing: 2
    }).setOrigin(0.5);
    this.comboBanner.add(text);
    this.comboBanner.setScale(0.75).setAlpha(0);
    this.tweens.add({ targets: this.comboBanner, alpha: 1, scale: 1, duration: 130, ease: 'Back.Out' });
    this.time.delayedCall(620, () => {
      if (this.comboBanner?.active) this.tweens.add({ targets: this.comboBanner, alpha: 0, y: this.comboBanner.y - 18, duration: 180, onComplete: () => this.comboBanner?.destroy() });
    });
  }

  showFloatText(text, color) {
    const label = this.add.text(this.scale.width / 2, this.scale.height * 0.42, text, { fontSize: '24px', fontStyle: 'bold', color, stroke: '#171521', strokeThickness: 5 }).setOrigin(0.5).setDepth(15);
    label.setScale(0.88); this.tweens.add({ targets: label, y: label.y - 58, alpha: 0, scale: 1.12, duration: 650, onComplete: () => label.destroy() });
  }

  finishRound() {
    if (this.roundOver) return;
    this.roundOver = true;
    audioManager.playKO();
    const flow = this.matchFlow.snapshot();
    const winner = flow.lastWinner === 'opponent' ? 'cpu' : flow.lastWinner;
    this.playerWins = flow.wins.player;
    this.cpuWins = flow.wins.opponent;
    const matchFinished = flow.phase === 'complete';
    if (winner === 'player') { this.player.state = 'victory'; this.cpu.state = 'ko'; }
    else if (winner === 'cpu') { this.cpu.state = 'victory'; this.player.state = 'ko'; }
    else { this.player.state = 'idle'; this.cpu.state = 'idle'; }
    const message = winner === 'draw' ? 'DRAW' : winner === 'player' ? 'ROUND WON' : 'ROUND LOST';
    this.statusText.setText(matchFinished ? (this.playerWins > this.cpuWins ? 'YOU WIN THE MATCH' : 'YOU LOSE THE MATCH') : message).setAlpha(1).setScale(1);
    this.roundLabel.setText(this.training ? 'TRAINING MODE' : `ROUND ${String(this.roundNumber).padStart(2, '0')}  ·  ${this.playerWins} - ${this.cpuWins}`);
    if (matchFinished) {
      const won = flow.matchWinner === 'player';
      if (won) audioManager.playVictory();
      const title = document.getElementById('results-title');
      const subtitle = document.getElementById('results-subtitle');
      const score = document.getElementById('results-score');
      if (title) title.textContent = won ? 'VICTORY' : 'DEFEAT';
      if (subtitle) subtitle.textContent = won ? `${this.playerCharacter.name} rules the arena.` : `${this.cpuCharacter.name} takes the match.`;
      if (score) score.textContent = `${this.playerWins}  —  ${this.cpuWins}`;
      const panel = document.getElementById('results-panel'); if (panel) panel.hidden = false;
      const statsKey = 'fighter.profile.stats.v1';
      try {
        const stats = JSON.parse(localStorage.getItem(statsKey) || '{"matches":0,"wins":0,"losses":0}');
        stats.matches++; stats[won ? 'wins' : 'losses']++;
        localStorage.setItem(statsKey, JSON.stringify(stats));
        const historyKey = 'fighter.profile.history.v1';
        const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
        history.unshift({ result: won ? 'WIN' : 'LOSS', player: this.playerCharacter.name, opponent: this.cpuCharacter.name, score: `${this.playerWins}-${this.cpuWins}`, mode: this.mode.toUpperCase(), stage: this.stageId, date: new Date().toLocaleDateString() });
        localStorage.setItem(historyKey, JSON.stringify(history.slice(0, 20)));
        let arcadeState = null;
        if (this.mode === 'arcade' && this.arcadeRun) {
          arcadeState = this.arcadeRun.recordMatch(won);
          const subtitleText = document.getElementById('results-subtitle');
          if (subtitleText) subtitleText.textContent = won
            ? (arcadeState.status === 'complete' ? `Arcade cleared! ${arcadeState.wins} wins.` : `Opponent defeated. ${arcadeState.wins} of ${arcadeState.total} fights cleared.`)
            : `Arcade run ended. You cleared ${arcadeState.wins} of ${arcadeState.total} fights.`;
          this.showArcadeResultAction(arcadeState);
        }
        const reward = awardMatch({ won, mode: this.mode, arcadeComplete: arcadeState?.status === 'complete' });
        const rewardLine = ` +${reward.xp} XP  ·  +${reward.coins} COINS  ·  LEVEL ${reward.level}`;
        const resultSubtitle = document.getElementById('results-subtitle');
        if (resultSubtitle) resultSubtitle.textContent += rewardLine;
      } catch (error) { console.error('Could not save match progression:', error); }
    } else {
      this.nextRoundPrompt?.destroy();
      this.nextRoundPrompt = this.add.text(this.scale.width / 2, this.scale.height * 0.49, 'NEXT ROUND  ·  TAP OR PRESS R', { fontSize: '16px', color: '#ffffff', backgroundColor: '#222638', padding: 12 }).setOrigin(0.5).setDepth(30).setInteractive();
      const advance = () => { this.nextRoundPrompt?.destroy(); this.nextRoundPrompt = null; this.advanceRound(); };
      this.nextRoundPrompt.once('pointerdown', advance);
    }
  }

  showArcadeResultAction(state) {
    const actions = document.querySelector('#results-panel .results-actions');
    if (!actions) return;
    actions.querySelector('#arcade-next-fight')?.remove();
    if (state.status === 'between-fights') {
      const button = document.createElement('button');
      button.id = 'arcade-next-fight';
      button.className = 'menu-button primary';
      button.textContent = 'NEXT OPPONENT  →';
      button.onclick = () => {
        if (!this.arcadeRun.nextFight()) return;
        const next = this.arcadeRun.current();
        document.getElementById('results-panel').hidden = true;
        this.scene.start('FightScene', {
          mode: 'arcade', playerId: this.playerCharacter.id,
          customFighter: this.playerCharacter.id === 'custom' ? this.playerCharacter : null,
          cpuId: next.fighterId, stageId: next.stageId, difficulty: next.difficulty,
          arcadeRun: this.arcadeRun.serialize()
        });
      };
      actions.prepend(button);
    } else if (state.status === 'complete' || state.status === 'defeat') {
      const button = document.createElement('button');
      button.id = 'arcade-next-fight';
      button.className = 'menu-button primary';
      button.textContent = state.status === 'complete' ? 'ARCADE CLEARED' : 'ARCADE OVER';
      button.disabled = true;
      actions.prepend(button);
    }
  }

  restartRound() {
    const localX = this.online && this.slot === 1 ? 2.5 : -2.5;
    const remoteX = -localX;
    this.player = new Fighter({ id: 'player', x: localX, facing: localX < 0 ? 1 : -1, character: this.playerCharacter });
    this.cpu = new Fighter({ id: this.online ? 'remote' : 'cpu', x: remoteX, facing: remoteX < 0 ? 1 : -1, isCpu: !this.online, character: this.cpuCharacter });
    this.remoteInput = {left:false,right:false,jump:false,down:false,punch:false,kick:false,special:false,grab:false,block:false,dashForward:false,dashBack:false};
    this.lastNetworkSend = 0;
    this.remoteUnsubscribe?.();
    this.remoteUnsubscribe = this.online ? onlineRoom.onRemoteInput(({input}) => { this.remoteInput = input; }) : null;
    this.fighters = [this.player, this.cpu];
    this.cpuAI = this.online ? null : new CPUController({ fighter: this.cpu, opponent: this.player, difficulty: this.cpuDifficulty });
    this.roundOver = false; this.cpuThink = 0; this.cpuActionPending = false; this.roundSeconds = this.matchFlow.remaining; this.hitStop = 0;
    this.comboDisplayTimer = 0;
    this.lastHitFeedbackAt = 0;
    this.combat = new CombatSystem(({ attacker, target, damage, blocked, perfect, combo, action, launcher }) => this.handleHitFeedback({ attacker, target, damage, blocked, perfect, combo, action, launcher }));
    this.statusText.setAlpha(0);
    audioManager.playRoundStart();
    this.roundLabel.setText(`ROUND ${String(this.roundNumber).padStart(2, '0')}  ·  ${this.playerWins} - ${this.cpuWins}`);
    this.layoutHud({ width: this.scale.width, height: this.scale.height });
    this.three.setFighters(this.fighters);
  }

  handleRestartKey() {
    if (this.roundOver) {
      this.advanceRound();
      return;
    }
    this.restartRound();
  }

  advanceRound() {
    this.nextRoundPrompt?.destroy();
    this.nextRoundPrompt = null;
    if (!this.roundOver || !this.matchFlow.nextRound()) return;
    this.roundNumber = this.matchFlow.round;
    this.restartRound();
  }
}
