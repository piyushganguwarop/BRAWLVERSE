import { Fighter } from '../src/characters/Fighter.js';
import { CombatSystem } from '../src/combat/CombatSystem.js';
import { RoundManager } from '../src/combat/RoundManager.js';
import { gameConfig } from '../src/config/gameConfig.js';
import { getFighter } from '../src/characters/roster.js';

const blankInput = () => ({ left:false,right:false,jump:false,down:false,punch:false,kick:false,special:false,grab:false,block:false,dashForward:false,dashBack:false });

export class AuthoritativeMatch {
  constructor({ roomId, players, stageId, emit, onSuspicious = () => {} }) {
    this.roomId = roomId;
    this.players = players;
    this.stageId = stageId;
    this.emit = emit;
    this.onSuspicious = onSuspicious;
    this.connected = [true, true];
    this.inputs = [blankInput(), blankInput()];
    this.previousInputs = [blankInput(), blankInput()];
    this.lastSequence = [-1, -1];
    this.round = new RoundManager({ roundsToWin: 2, roundDuration: 99 });
    this.stopped = false;
    this.recreateFighters();
  }

  recreateFighters() {
    this.fighters = this.players.map((player, slot) => new Fighter({
      id: `slot${slot}`, x: slot === 0 ? -2.5 : 2.5, facing: slot === 0 ? 1 : -1,
      character: getFighter(player.fighterId)
    }));
    this.combat = new CombatSystem();
    this.inputs = [blankInput(), blankInput()];
    this.previousInputs = [blankInput(), blankInput()];
  }

  setConnected(slot, connected) {
    if (slot !== 0 && slot !== 1) return;
    this.connected[slot] = !!connected;
    if (!connected) this.inputs[slot] = blankInput();
  }

  setInput(slot, input, sequence) {
    if (this.stopped || !this.connected[slot] || !Number.isSafeInteger(sequence) || sequence <= this.lastSequence[slot]) {
      this.onSuspicious({ roomId: this.roomId, slot, reason: 'invalid-or-replayed-input-sequence', sequence });
      return false;
    }
    this.lastSequence[slot] = sequence;
    this.inputs[slot] = input;
    return true;
  }

  start() {
    if (this.timer || this.stopped) return;
    this.timer = setInterval(() => this.tick(1 / 30), 1000 / 30);
    this.timer.unref?.();
    this.publish();
  }

  tick(dt) {
    if (this.stopped || !this.connected.every(Boolean) || this.round.phase !== 'playing') return;
    const [a, b] = this.fighters;
    a.facing = b.x >= a.x ? 1 : -1; b.facing = -a.facing;
    for (let slot = 0; slot < 2; slot++) {
      const fighter = this.fighters[slot], input = this.inputs[slot], previous = this.previousInputs[slot];
      fighter.update(dt, input);
      for (const action of ['punch','kick','special','grab']) if (input[action] && !previous[action]) fighter.startAction(action);
      this.previousInputs[slot] = { ...input };
    }
    const dx = b.x - a.x;
    if (Math.abs(dx) < gameConfig.world.fighterSpacing) {
      const push = (gameConfig.world.fighterSpacing - Math.abs(dx)) / 2;
      const sign = Math.sign(dx) || 1;
      a.x = Math.max(gameConfig.world.minX, Math.min(gameConfig.world.maxX, a.x - push * sign));
      b.x = Math.max(gameConfig.world.minX, Math.min(gameConfig.world.maxX, b.x + push * sign));
    }
    this.combat.update(this.fighters);
    this.round.tick(dt);
    const decision = this.round.decideWinner(a.health, b.health);
    if (decision) this.onRoundComplete();
    this.publish();
  }

  onRoundComplete() {
    const state = this.round.snapshot();
    this.emit('match:round-complete', { roomId: this.roomId, round: state, winnerSlot: state.lastWinner === 'draw' ? null : state.lastWinner === 'player' ? 0 : 1 });
    if (state.matchWinner) {
      this.emit('match:complete', { roomId: this.roomId, winnerSlot: state.matchWinner === 'player' ? 0 : 1, wins: state.wins, stageId: this.stageId });
      return;
    }
    clearTimeout(this.nextRoundTimer);
    this.nextRoundTimer = setTimeout(() => {
      if (this.stopped || !this.round.nextRound()) return;
      this.recreateFighters();
      this.emit('match:round-start', { roomId: this.roomId, round: this.round.snapshot() });
      this.publish();
    }, 2200);
    this.nextRoundTimer.unref?.();
  }

  publish() {
    this.emit('match:snapshot', {
      roomId: this.roomId, stageId: this.stageId, round: this.round.snapshot(),
      players: this.fighters.map((fighter, slot) => ({ slot, x:fighter.x, y:fighter.y, facing:fighter.facing, health:fighter.health, energy:fighter.energy, state:fighter.state, blocking:fighter.blocking, crouching:fighter.crouching, actionTime:fighter.actionTime, activeAction:fighter.activeAction?.name ?? null, hitFlash:fighter.hitFlash }))
    });
  }

  rematch() {
    if (this.stopped) return false;
    clearTimeout(this.nextRoundTimer);
    this.round.reset(); this.recreateFighters(); this.lastSequence = [-1, -1];
    this.emit('room:rematch', { stageId: this.stageId, players: this.players.map((player, slot) => ({ name:player.name, fighterId:player.fighterId, slot, host:slot===0 })) });
    this.publish();
    return true;
  }

  stop() { this.stopped = true; clearInterval(this.timer); clearTimeout(this.nextRoundTimer); }
}
