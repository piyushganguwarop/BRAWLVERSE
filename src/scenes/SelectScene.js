import Phaser from 'phaser';
import { roster } from '../characters/roster.js';
import { onlineRoom } from '../multiplayer/OnlineRoom.js';
import { hasCustomFighter, loadCustomFighter, loadSlots, saveCustomFighter, toFighter, defaults, getActiveCustomSlot, setActiveCustomSlot } from '../characters/CustomFighter.js';
import { CustomizerPreview } from '../characters/CustomizerPreview.js';
import { ArcadeProgression } from '../modes/ArcadeProgression.js';
import { loadProgression, isFighterUnlocked, isStageUnlocked, purchaseFighter, purchaseStage, progressionSnapshot } from '../progression/Progression.js';

const COLORS = { bg: 0x10131d, panel: 0x1b2030, muted: '#9ca8bd', gold: '#f2c46b', white: '#f5f7fb' };

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
    this.selectedIndex = 0;
    this.stageIndex = 0;
    this.progression = progressionSnapshot();
    this.stages = [{ id: 'neon', name: 'NEON DISTRICT', desc: 'A glowing underground fight club' }, { id: 'temple', name: 'ANCIENT TEMPLE', desc: 'A stone arena beneath golden lanterns' }, { id: 'rooftop', name: 'CITY ROOFTOP', desc: 'A midnight battle above the skyline' }];
    this.cardObjects = [];
    this.add.rectangle(0, 0, this.scale.width, this.scale.height, COLORS.bg).setOrigin(0);
    this.backdrop = this.add.graphics();
    this.backdrop.fillGradientStyle(0x171d2d, 0x171d2d, 0x0d1018, 0x0d1018, 1);
    this.backdrop.fillRect(0, 0, this.scale.width, this.scale.height);
    this.title = this.add.text(0, 0, 'CHOOSE YOUR FIGHTER', { fontFamily: 'Arial Black, Arial', fontSize: '34px', color: COLORS.white, fontStyle: 'bold', letterSpacing: 2 }).setOrigin(0.5);
    this.subtitle = this.add.text(0, 0, `LEVEL ${this.progression.level}  ·  ${this.progression.coins} COINS  ·  SELECT A CHAMPION`, { fontSize: '12px', color: COLORS.gold, letterSpacing: 2 }).setOrigin(0.5);
    this.grid = this.add.container(0, 0);
    this.infoPanel = this.add.container(0, 0);
    this.infoBg = this.add.rectangle(0, 0, 300, 160, COLORS.panel, 0.96).setStrokeStyle(1, 0x3b455d);
    this.infoName = this.add.text(-130, -62, '', { fontSize: '25px', fontStyle: 'bold', color: COLORS.white });
    this.infoTitle = this.add.text(-130, -32, '', { fontSize: '10px', color: COLORS.gold, letterSpacing: 1.5 });
    this.infoBio = this.add.text(-130, -8, '', { fontSize: '12px', color: '#c3ccda', wordWrap: { width: 260 }, lineSpacing: 3 });
    this.specialLabel = this.add.text(-130, 40, '', { fontSize: '11px', color: '#8fd8ff' });
    this.infoPanel.add([this.infoBg, this.infoName, this.infoTitle, this.infoBio, this.specialLabel]);
    this.stageLabel = this.add.text(0, 0, '', { fontSize: '13px', color: '#f2c46b', fontStyle: 'bold', letterSpacing: 1 }).setOrigin(0.5);
    this.stageDesc = this.add.text(0, 0, '', { fontSize: '10px', color: '#b9c5d8' }).setOrigin(0.5);
    this.stagePrev = this.add.text(0, 0, '‹', { fontSize: '27px', color: '#ffffff', backgroundColor: '#252c40', padding: { x: 12, y: 3 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.stageNext = this.add.text(0, 0, '›', { fontSize: '27px', color: '#ffffff', backgroundColor: '#252c40', padding: { x: 12, y: 3 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.stagePrev.on('pointerdown', () => this.changeStage(-1));
    this.stageNext.on('pointerdown', () => this.changeStage(1));
    this.startButton = this.add.text(0, 0, this.mode === 'training' ? 'ENTER LAB  →' : 'START FIGHT  →', { fontSize: '17px', fontStyle: 'bold', color: '#141722', backgroundColor: '#f2c46b', padding: { x: 25, y: 15 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.startButton.on('pointerdown', () => this.startFight());
    this.createDifficultySelector();
    if (this.localVersus) this.createPlayerTwoSelector();
    this.hint = this.add.text(0, 0, 'PC: CLICK TO SELECT  •  MOBILE: TAP A FIGHTER', { fontSize: '10px', color: COLORS.muted, letterSpacing: 1 }).setOrigin(0.5);
    this.createCards();
    this.createSelectionPreview();
    this.createStagePreview();
    this.createOnlineButton();
    this.createCreatorButton();
    this.menuBackButton = this.add.text(0, 0, '← MENU', { fontSize: '12px', fontStyle: 'bold', color: '#ffffff', backgroundColor: '#252c40', padding: { x: 12, y: 9 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.menuBackButton.on('pointerdown', () => this.scene.start('MainMenuScene'));
    this.select(0);
    this.updateStageLabel();
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => { this.scale.off('resize', this.layout, this); this.onlineSubscriptions?.forEach(off=>off()); this.onlineSubscriptions=[]; if(this.mode==='online'&&onlineRoom.isInRoom&&!this.enteringOnlineMatch)onlineRoom.leave(); this.selectionPreview?.dispose(); this.selectionPreview = null; this.creatorPreview?.dispose(); this.creatorPreview = null; const creator=document.getElementById('creator-panel'); if(creator)creator.hidden=true; document.getElementById('selection-preview')?.remove(); document.getElementById('stage-preview')?.remove(); });
    this.layout({ width: this.scale.width, height: this.scale.height });
    if (this.openCreatorOnStart) this.time.delayedCall(80, () => this.openCreator());
  }



  createPlayerTwoSelector() {
    this.playerTwoIndex = Math.min(1, roster.length - 1);
    this.p2Title = this.add.text(0, 0, 'PLAYER 2 FIGHTER', { fontSize:'9px', color:COLORS.muted, letterSpacing:1 }).setOrigin(0.5);
    this.p2Name = this.add.text(0, 0, roster[this.playerTwoIndex].name.toUpperCase(), { fontSize:'12px', fontStyle:'bold', color:COLORS.white, backgroundColor:'#252c40', padding:{x:12,y:8} }).setOrigin(0.5).setInteractive({useHandCursor:true});
    this.p2Prev = this.add.text(0,0,'‹',{fontSize:'22px',color:'#fff',backgroundColor:'#252c40',padding:{x:9,y:2}}).setOrigin(0.5).setInteractive({useHandCursor:true});
    this.p2Next = this.add.text(0,0,'›',{fontSize:'22px',color:'#fff',backgroundColor:'#252c40',padding:{x:9,y:2}}).setOrigin(0.5).setInteractive({useHandCursor:true});
    this.p2Prev.on('pointerdown',()=>this.changePlayerTwo(-1));
    this.p2Next.on('pointerdown',()=>this.changePlayerTwo(1));
    this.p2Name.on('pointerdown',()=>this.changePlayerTwo(1));
  }

  changePlayerTwo(direction) {
    const options=roster.map((fighter,index)=>({fighter,index})).filter(item=>item.index!==this.selectedIndex && isFighterUnlocked(item.fighter.id));
    const current=options.findIndex(item=>item.index===this.playerTwoIndex);
    this.playerTwoIndex=options[(current+direction+options.length)%options.length].index;
    this.p2Name?.setText(roster[this.playerTwoIndex].name.toUpperCase());
  }

  createDifficultySelector() {
    this.difficulty = localStorage.getItem('fighter.cpu.difficulty') || 'normal';
    if (!['easy', 'normal', 'hard'].includes(this.difficulty)) this.difficulty = 'normal';
    this.difficultyLabel = this.add.text(0, 0, 'CPU DIFFICULTY', { fontSize: '9px', color: COLORS.muted, letterSpacing: 1 }).setOrigin(0.5);
    this.difficultyButtons = ['easy', 'normal', 'hard'].map(level => {
      const button = this.add.text(0, 0, level.toUpperCase(), {
        fontSize: '10px', fontStyle: 'bold', color: '#ffffff',
        backgroundColor: '#252c40', padding: { x: 10, y: 7 }
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
      button.setStyle({ color: selected ? '#171923' : '#ffffff', backgroundColor: selected ? '#f2c46b' : '#252c40' });
    });
  }

  createCreatorButton() {
    this.creatorButton = this.add.text(0, 0, '✦ CREATE FIGHTER', { fontSize: '13px', fontStyle: 'bold', color: '#171923', backgroundColor: '#8fd8c0', padding: { x: 15, y: 12 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.creatorButton.on('pointerdown', () => this.openCreator());
  }
  openCreator() {
    const panel = document.getElementById('creator-panel'); if (!panel) return;
    const ids = ['name','build','hair-style','outfit','style','color','accent','skin','hair','eye-color','bottom-color','face','brows','beard','top','bottom','gloves','shoes','accessory','height','width','legs','muscle'];
    const el = key => document.getElementById(`creator-${key}`);
    const map = {'name':'name','build':'build','hair-style':'hairStyle','outfit':'outfit','style':'style','color':'color','accent':'accent','skin':'skin','hair':'hair','eye-color':'eyeColor','bottom-color':'bottomColor','face':'face','brows':'brows','beard':'beard','top':'top','bottom':'bottom','gloves':'gloves','shoes':'shoes','accessory':'accessory','height':'height','width':'width','legs':'legs','muscle':'muscle'};
    const slotEl=document.getElementById('creator-slot'), savedEl=document.getElementById('creator-saved'), useCustomEl=document.getElementById('creator-use-custom');
    useCustomEl.checked=localStorage.getItem('fighter.custom.use.v1')==='1';
    const updateStartLabel=()=>this.startButton?.setText(localStorage.getItem('fighter.custom.use.v1')==='1'?'START CUSTOM FIGHT  →':'START FIGHT  →');
    updateStartLabel();
    const status=document.getElementById('creator-status');
    const fields=()=>Object.fromEntries(ids.map(key=>[map[key], ['height','width','legs','muscle'].includes(key)?Number(el(key).value):el(key).value]));
    const setFields=value=>{const v={...defaults,...value};Object.entries(map).forEach(([id,key])=>{el(id).value=v[key]??defaults[key];});preview();};
    const refreshSaved=()=>{const slots=loadSlots();savedEl.innerHTML='<option value="">Choose saved fighter</option>'+slots.map((v,i)=>v?`<option value="${i}">Slot ${i+1}: ${this.escapeHtml(v.name)}</option>`:'').join('');};
    const preview=()=>{
      const v=fields();
      if(!this.creatorPreview){this.creatorPreview=new CustomizerPreview(document.getElementById('creator-3d-preview'),part=>{status.textContent=`Selected ${part.toUpperCase()} · customize its related options.`;});}
      this.creatorPreview.update(v);
      for(const key of ['height','width','legs','muscle']) document.getElementById(`creator-${key}-value`).textContent=`${v[key]}%`;
      const zoom=document.getElementById('creator-zoom');if(zoom&&!zoom.dataset.bound){zoom.dataset.bound='1';zoom.oninput=()=>this.creatorPreview?.setZoom(Number(zoom.value)/10);}
      const left=document.getElementById('creator-rotate-left'),right=document.getElementById('creator-rotate-right');
      if(left&&!left.dataset.bound){left.dataset.bound='1';left.onclick=()=>this.creatorPreview?.rotate(-1);right.onclick=()=>this.creatorPreview?.rotate(1);}
      if(zoom)this.creatorPreview.setZoom(Number(zoom.value)/10);
    };
    slotEl.value=String(getActiveCustomSlot());
    const current=loadCustomFighter(Number(slotEl.value));setFields(current);refreshSaved();
    slotEl.onchange=()=>{const slot=Number(slotEl.value);const saved=loadSlots()[slot];setFields(saved||defaults);if(saved&&useCustomEl.checked){setActiveCustomSlot(slot);localStorage.setItem('fighter.custom.use.v1','1');}else if(!saved&&useCustomEl.checked){useCustomEl.checked=false;localStorage.setItem('fighter.custom.use.v1','0');status.textContent='Empty slot selected. Custom fighter use has been turned off.';}else status.textContent=saved?`Loaded slot ${slot+1}.`:`Slot ${slot+1} is empty.`;updateStartLabel();};
    savedEl.onchange=()=>{if(savedEl.value!==''){slotEl.value=savedEl.value;setActiveCustomSlot(Number(savedEl.value));useCustomEl.checked=true;localStorage.setItem('fighter.custom.use.v1','1');setFields(loadCustomFighter(Number(savedEl.value)));status.textContent='Saved fighter loaded and selected for your next match.';updateStartLabel();}};
    ids.forEach(key=>el(key).oninput=preview);
    useCustomEl.onchange=()=>{localStorage.setItem('fighter.custom.use.v1',useCustomEl.checked?'1':'0');if(useCustomEl.checked&&!loadSlots()[Number(slotEl.value)]){useCustomEl.checked=false;localStorage.setItem('fighter.custom.use.v1','0');status.textContent='Save a fighter in this slot before selecting it for a match.';}else if(useCustomEl.checked){setActiveCustomSlot(Number(slotEl.value));}updateStartLabel();};
    document.getElementById('creator-close').onclick=()=>{panel.hidden=true;this.creatorPreview?.dispose();this.creatorPreview=null;};
    document.getElementById('creator-random').onclick=()=>{
      const pick=a=>a[Math.floor(Math.random()*a.length)];
      const sets={color:['#2869b5','#9c3e36','#6945a1','#247c75','#b75b26','#354d8b'],accent:['#e6b84c','#42d8c5','#ff8d6b','#8bc5ff','#f2c46b'],skin:['#f0c6a0','#b97855','#9b6549','#87583f','#daa27c'],hair:['#20232c','#171923','#5a3424','#b58a45','#d8d8d8'], 'hair-style':['short','spiky','long','curly','bald'],build:['slim','athletic','bulky'],face:['oval','square','round'],brows:['normal','strong','angled'],beard:['none','stubble','beard','mustache'],top:['tee','jacket','hoodie','vest'],bottom:['pants','shorts','joggers'],gloves:['wraps','boxing','none'],shoes:['high','boots','light'],accessory:['none','glasses','headband','chain']};
      Object.entries(sets).forEach(([key,values])=>el(key).value=pick(values));preview();
    };
    document.getElementById('creator-save').onclick=()=>{
      const slot=Number(slotEl.value)||0;const value=saveCustomFighter(fields(),slot);this.customFighter=toFighter(value);setActiveCustomSlot(slot);useCustomEl.checked=true;localStorage.setItem('fighter.custom.use.v1','1');refreshSaved();savedEl.value=String(slot);
      status.textContent=`${value.name} saved in slot ${slot+1}. It is selected for your next match.`;updateStartLabel();
    };
    preview();panel.hidden=false;
  }

  createOnlineButton() {
    this.onlineButton=this.add.text(0,0,'ONLINE ROOM',{fontSize:'13px',fontStyle:'bold',color:'#ffffff',backgroundColor:'#315b8e',padding:{x:16,y:12}}).setOrigin(0.5).setInteractive({useHandCursor:true});
    this.onlineButton.on('pointerdown',()=>this.openOnlinePanel());
  }
  async openOnlinePanel(){
    const panel=document.getElementById('online-panel'); if(!panel)return; panel.hidden=false;
    const status=document.getElementById('online-status'), players=document.getElementById('room-players'), ready=document.getElementById('room-ready');
    const name=()=>document.getElementById('online-name').value.trim()||'Player';
    const fighter=()=>roster[this.selectedIndex].id;
    const close=()=>{panel.hidden=true;}; document.getElementById('online-close').onclick=close;
    const showPlayers=list=>{players.innerHTML=list.map((p,i)=>`<div>${p.host||i===0?'HOST':'GUEST'}: ${this.escapeHtml(p.name)} · ${this.escapeHtml(p.fighterId)} · ${p.ready?'READY':'NOT READY'}</div>`).join('');ready.disabled=list.length!==2;};
    try { status.textContent='Connecting to room server…'; await onlineRoom.connect(); status.textContent="Create a room or enter a friend code."; }
    catch { status.textContent='Room server unavailable. Deploy the Node server and set VITE_GAME_SERVER.'; return; }
    const selected=()=>({fighterId:fighter(),stageId:this.stages[this.stageIndex].id});
    document.getElementById('room-create').onclick=()=>onlineRoom.create({name:name(),...selected()});
    document.getElementById('room-join').onclick=()=>{onlineRoom.join(document.getElementById('room-code').value,{name:name(),...selected()});onlineRoom.select(selected());};
    ready.onclick=()=>{onlineRoom.select(selected());onlineRoom.ready(true);};
    if(!this.onlineSubscriptions){
      this.onlineSubscriptions=[];
      this.onlineSubscriptions.push(onlineRoom.on('room:joined',data=>{status.textContent=`Room ${data.code} · You are ${data.slot===0?'Host':'Guest'}`;document.getElementById('room-code').value=data.code;showPlayers(data.players);}));
      this.onlineSubscriptions.push(onlineRoom.on('room:players',showPlayers));
      this.onlineSubscriptions.push(onlineRoom.on('room:error',message=>{status.textContent=message;}));
      this.onlineSubscriptions.push(onlineRoom.on('room:start',data=>{showPlayers(data.players);panel.hidden=true;this.enteringOnlineMatch=true;this.scene.start('FightScene',{online:true,mode:'online',slot:onlineRoom.slot,players:data.players,stageId:data.stageId});}));
    }
  }
  escapeHtml(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  createSelectionPreview() {
    document.getElementById('selection-preview')?.remove();
    const host = document.createElement('div');
    host.id = 'selection-preview';
    host.innerHTML = '<div class="selection-preview-heading">FIGHTER PREVIEW</div><div class="selection-preview-name" id="selection-preview-name">ATLAS</div><div class="selection-preview-canvas" id="selection-preview-canvas"></div><div class="selection-preview-hint">DRAG TO ROTATE · SCROLL TO ZOOM</div>';
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
    const isVolt = fighter.id === 'volt';
    const isRook = fighter.id === 'rook';
    const isMyst = fighter.id === 'myst';
    this.selectionPreview.update({
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
    host.innerHTML = '<div class="stage-preview-title">ARENA PREVIEW</div><div class="stage-preview-art" id="stage-preview-art"></div>';
    document.getElementById('game-root')?.appendChild(host);
    this.stagePreviewHost = host;
    this.drawStagePreview();
  }

  drawStagePreview() {
    const art = document.getElementById('stage-preview-art');
    if (!art) return;
    const scenes = [
      {bg:'linear-gradient(160deg,#111a32,#293d68 55%,#090d18)', glow:'#37d8ff', floor:'#1c2942', label:'NEON DISTRICT'},
      {bg:'linear-gradient(160deg,#34271d,#80613c 55%,#17110d)', glow:'#f2c46b', floor:'#463322', label:'ANCIENT TEMPLE'},
      {bg:'linear-gradient(160deg,#101b32,#30466d 55%,#070b16)', glow:'#a9c9ff', floor:'#202b42', label:'CITY ROOFTOP'}
    ];
    const stage = scenes[this.stageIndex];
    art.style.background = stage.bg;
    art.style.setProperty('--stage-glow', stage.glow);
    art.style.setProperty('--stage-floor', stage.floor);
    art.innerHTML = `<div class="stage-skyline skyline-a"></div><div class="stage-skyline skyline-b"></div><div class="stage-glow"></div><div class="stage-floor"></div><div class="stage-preview-label">${stage.label}</div>`;
    this.stagePreviewHost.hidden = this.scale.width < 980;
  }

  createCards() {
    roster.forEach((fighter, index) => {
      const card = this.add.container(0, 0);
      const isRook = fighter.id === 'rook';
      const isVolt = fighter.id === 'volt';
      const isMyst = fighter.id === 'myst';
      const bg = this.add.rectangle(0, 0, 150, 190, COLORS.panel).setStrokeStyle(1, 0x343d52);
      const portrait = this.add.rectangle(0, -30, 116, 112, fighter.color, 1).setStrokeStyle(1, fighter.accent);
      const glow = this.add.circle(0, -32, 31, fighter.accent, 0.14);
      const shoulders = this.add.ellipse(0, 2, isRook ? 94 : isVolt ? 68 : isMyst ? 66 : 76, isRook ? 44 : 38, fighter.accent, 1);
      const torso = this.add.rectangle(0, 4, isRook ? 68 : isVolt ? 48 : isMyst ? 46 : 54, 42, fighter.color, 1);
      const head = this.add.circle(0, isRook ? -37 : -39, isRook ? 25 : isMyst ? 21 : 23, isRook ? 0x374151 : (fighter.skin ?? 0xc98f68));
      const hair = this.add.ellipse(0, isVolt ? -56 : isMyst ? -48 : -52, isVolt ? 52 : isMyst ? 38 : 48, isVolt ? 26 : isMyst ? 32 : 22, fighter.hair ?? 0x20232c);
      const name = this.add.text(0, 54, fighter.name, { fontSize: '16px', fontStyle: 'bold', color: COLORS.white, letterSpacing: 1 }).setOrigin(0.5);
      const role = this.add.text(0, 74, fighter.title, { fontSize: '8px', color: COLORS.gold, letterSpacing: 0.6 }).setOrigin(0.5);
      const locked = !isFighterUnlocked(fighter.id);
      const lockLabel = this.add.text(0, -82, locked ? 'LOCKED' : '', { fontSize: '10px', fontStyle: 'bold', color: '#ffffff', backgroundColor: '#713c35', padding: { x: 7, y: 4 } }).setOrigin(0.5);
      const selected = this.add.rectangle(0, 0, 150, 190).setStrokeStyle(3, COLORS.gold).setVisible(false);
      card.add([bg, portrait, glow, shoulders, torso, head, hair, name, role, lockLabel, selected]);
      card.setData('locked', locked);
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
      card.getAt(9)?.setText('');
      this.subtitle.setText(`LEVEL ${this.progression.level}  ·  ${this.progression.coins} COINS  ·  ${fighter.name} UNLOCKED`);
      this.select(index);
    } else this.subtitle.setText(`${fighter.name}: ${result.reason}  ·  ${this.progression.coins} COINS`);
  }

  changeStage(direction) {
    const next = (this.stageIndex + direction + this.stages.length) % this.stages.length;
    const stage = this.stages[next];
    if (!isStageUnlocked(stage.id)) {
      const result = purchaseStage(stage.id);
      this.progression = progressionSnapshot();
      if (!result.ok) { this.subtitle.setText(`${stage.name}: ${result.reason}  ·  ${this.progression.coins} COINS`); return; }
      this.subtitle.setText(`${stage.name} UNLOCKED  ·  ${this.progression.coins} COINS`);
    }
    this.stageIndex = next;
    this.updateStageLabel();
  }

  updateStageLabel() { const stage = this.stages[this.stageIndex]; this.stageLabel.setText(`STAGE  /  ${stage.name}${isStageUnlocked(stage.id) ? '' : '  ·  LOCKED'}`); this.stageDesc.setText(stage.desc); this.drawStagePreview(); }

  select(index) {
    if (!isFighterUnlocked(roster[index].id)) return;
    this.selectedIndex = index;
    const fighter = roster[index];
    this.cardObjects.forEach((card, i) => card.getData('selectedBorder').setVisible(i === index));
    this.infoName.setText(fighter.name);
    this.infoTitle.setText(fighter.title);
    this.infoBio.setText(fighter.bio);
    this.specialLabel.setText(`SPECIAL  /  ${fighter.specialName}`);
    this.updateSelectionPreview(fighter);
    this.infoBg.setStrokeStyle(1, fighter.accent);
  }

  layout({ width, height }) {
    const compact = width < 760;
    const narrow = width < 520;
    const desktopSplit = width >= 900;
    const showSidePreviews = width >= 1500;
    if (this.selectionPreviewHost) this.selectionPreviewHost.hidden = !showSidePreviews;
    if (this.stagePreviewHost) this.stagePreviewHost.hidden = !showSidePreviews;
    this.title.setPosition(width / 2, compact ? 34 : 44).setFontSize(compact ? '21px' : '31px');
    this.subtitle.setPosition(width / 2, compact ? 60 : 76).setFontSize(compact ? '9px' : '12px');
    const columns = 4;
    const rows = Math.ceil(roster.length / columns);
    const gap = compact ? 5 : 12;
    const toolbarHeight = this.localVersus ? 236 : 200;
    const toolbarTop = height - toolbarHeight;
    const startY = compact ? 82 : 112;
    const cardAreaBottom = toolbarTop - (desktopSplit ? 18 : 104);
    const cardH = Math.max(56, Math.min(compact ? 150 : 190, (cardAreaBottom - startY - gap) / rows));
    const cardW = Math.max(55, Math.min(compact ? 118 : 150, (width - (desktopSplit ? 48 : 28) - (columns - 1) * gap) / columns));
    const totalW = columns * cardW + (columns - 1) * gap;
    const contentLeft = desktopSplit ? Math.max(18, (width - (totalW + 330 + 24)) / 2) : (width - totalW) / 2;
    const startX = contentLeft + cardW / 2;
    this.cardObjects.forEach((card, i) => {
      const col = i % columns, row = Math.floor(i / columns);
      card.setPosition(startX + col * (cardW + gap), startY + row * (cardH + gap));
      card.setScale(cardW / 150, cardH / 190);
    });
    const cardsBottom = startY + rows * (cardH + gap) - gap;
    const infoWidth = desktopSplit ? 300 : Math.max(250, width - 32);
    const infoHeight = desktopSplit ? Math.min(220, Math.max(160, toolbarTop - startY - 20)) : Math.min(82, Math.max(64, toolbarTop - cardsBottom - 10));
    const infoX = desktopSplit ? contentLeft + totalW + 24 + infoWidth / 2 : width / 2;
    const infoY = desktopSplit ? startY + Math.min(112, (toolbarTop - startY) / 2) : cardsBottom + infoHeight / 2 + 6;
    this.infoBg.setSize(infoWidth, infoHeight);
    if (desktopSplit) {
      this.infoName.setPosition(-infoWidth / 2 + 16, -infoHeight / 2 + 16);
      this.infoTitle.setPosition(-infoWidth / 2 + 16, -infoHeight / 2 + 48);
      this.infoBio.setPosition(-infoWidth / 2 + 16, -infoHeight / 2 + 72).setWordWrapWidth(infoWidth - 32);
      this.specialLabel.setPosition(-infoWidth / 2 + 16, infoHeight / 2 - 34);
    } else {
      this.infoName.setPosition(-infoWidth / 2 + 10, -infoHeight / 2 + 8).setFontSize(narrow ? '16px' : '18px');
      this.infoTitle.setPosition(-infoWidth / 2 + 10, -infoHeight / 2 + 30).setFontSize('8px');
      this.infoBio.setPosition(-infoWidth / 2 + 10, -infoHeight / 2 + 46).setFontSize('9px').setWordWrapWidth(infoWidth - 20).setMaxLines(1);
      this.specialLabel.setPosition(infoWidth / 2 - 10, -infoHeight / 2 + 10).setOrigin(1, 0).setFontSize('8px');
    }
    this.infoPanel.setPosition(infoX, infoY).setScale(1);
    this.infoPanel.setVisible(infoHeight >= 60);
    const stageY = toolbarTop + 18;
    if (this.selectionPreviewHost) { this.selectionPreviewHost.style.right = '2.2%'; this.selectionPreviewHost.style.top = `${Math.max(115, Math.round(height * 0.23))}px`; }
    if (this.stagePreviewHost) { this.stagePreviewHost.style.left = '2.2%'; this.stagePreviewHost.style.top = `${Math.max(150, Math.round(height * 0.30))}px`; }
    this.stageLabel.setPosition(width / 2, stageY);
    this.stageDesc.setPosition(width / 2, stageY + 18);
    const isCpuMode = !this.localVersus && this.mode !== 'online';
    this.difficultyLabel?.setVisible(isCpuMode);
    this.difficultyButtons?.forEach(button => button.setVisible(isCpuMode));
    if (isCpuMode) {
      this.difficultyLabel?.setPosition(width / 2, stageY + 38);
      this.difficultyButtons?.forEach((button, i) => button.setPosition(width / 2 + (i - 1) * 86, stageY + 60));
    }
    this.stagePrev.setPosition(width / 2 - (compact ? 125 : 165), stageY + 7).setScale(compact ? 0.75 : 1);
    this.stageNext.setPosition(width / 2 + (compact ? 125 : 165), stageY + 7).setScale(compact ? 0.75 : 1);
    this.startButton.setPosition(width / 2, height - 32).setScale(compact ? 0.78 : 0.92);
    this.onlineButton?.setPosition(width - (compact ? 90 : 112), compact ? 28 : 42).setScale(compact ? 0.78 : 1);
    this.menuBackButton?.setPosition(compact ? 52 : 62, compact ? 28 : 42).setScale(compact ? 0.78 : 1);
    this.creatorButton?.setPosition(compact ? width / 2 : 145, compact ? 75 : 42).setScale(compact ? 0.72 : 1);
    this.hint.setPosition(width / 2, height - 65).setVisible(!compact);
    if (this.localVersus && this.p2Title) {
      const y = height - 85;
      this.p2Title.setPosition(width / 2, y - 21);
      this.p2Prev.setPosition(width / 2 - 115, y);
      this.p2Name.setPosition(width / 2, y);
      this.p2Next.setPosition(width / 2 + 115, y);
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
