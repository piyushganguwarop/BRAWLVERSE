import { Fighter } from '../src/characters/Fighter.js';
import { CombatSystem } from '../src/combat/CombatSystem.js';
import { RoundManager } from '../src/combat/RoundManager.js';
import { gameConfig } from '../src/config/gameConfig.js';
import { getFighter } from '../src/characters/roster.js';

const blankInput = () => ({
  left: false, right: false, jump: false, down: false,
  punch: false, kick: false, heavy: false, special: false, grab: false, block: false,
  dashForward: false, dashBack: false, dash: false,
  crouch: false, depthUp: false, depthDown: false,
  moveX: 0, moveZ: 0
});

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
      id: `slot${slot}`, x: slot === 0 ? -2.5 : 2.5, y: 0, z: 0, facing: slot === 0 ? 1 : -1,
      character: getFighter(player.fighterId)
    }));
    this.combat = new CombatSystem(hitEvent => {
      this.emit('match:hit', {
        roomId: this.roomId,
        attackerSlot: hitEvent.attacker?.id === 'slot0' ? 0 : 1,
        targetSlot: hitEvent.target?.id === 'slot0' ? 0 : 1,
        damage: hitEvent.damage,
        blocked: hitEvent.blocked,
        perfect: hitEvent.perfect,
        combo: hitEvent.combo,
        action: hitEvent.action,
        launcher: hitEvent.launcher
      });
    });
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
    a.updateFacing(b);
    b.updateFacing(a);
    for (let slot = 0; slot < 2; slot++) {
      const fighter = this.fighters[slot], input = this.inputs[slot], previous = this.previousInputs[slot];
      fighter.update(dt, input);
      for (const action of ['punch', 'kick', 'heavy', 'special', 'grab']) {
        if (input[action] && !previous[action]) fighter.startAction(action);
      }
      this.previousInputs[slot] = { ...input };
    }
    const dx = b.x - a.x;
    const dz = (b.z ?? 0) - (a.z ?? 0);
    const dist2D = Math.hypot(dx, dz);
    const spacing = gameConfig.world.fighterSpacing || 0.92;
    if (dist2D < spacing) {
      const push = (spacing - dist2D) / 2;
      const nx = dist2D > 0.0001 ? dx / dist2D : 1;
      const nz = dist2D > 0.0001 ? dz / dist2D : 0;
      a.x = Math.max(gameConfig.world.minX, Math.min(gameConfig.world.maxX, a.x - push * nx));
      b.x = Math.max(gameConfig.world.minX, Math.min(gameConfig.world.maxX, b.x + push * nx));
      const minZ = gameConfig.world.minZ ?? -1.5;
      const maxZ = gameConfig.world.maxZ ?? 1.5;
      a.z = Math.max(minZ, Math.min(maxZ, (a.z ?? 0) - push * nz));
      b.z = Math.max(minZ, Math.min(maxZ, (b.z ?? 0) + push * nz));
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
      players: this.fighters.map((fighter, slot) => ({
        slot,
        x: fighter.x,
        y: fighter.y,
        z: fighter.z ?? 0,
        vx: fighter.vx ?? 0,
        vy: fighter.vy ?? 0,
        vz: fighter.vz ?? 0,
        facing: fighter.facing,
        facingAngle: fighter.facingAngle,
        health: fighter.health,
        energy: fighter.energy,
        state: fighter.state,
        blocking: fighter.blocking,
        crouching: fighter.crouching,
        actionTime: fighter.actionTime,
        activeAction: fighter.activeAction?.name ?? null,
        hitFlash: fighter.hitFlash,
        dashTime: fighter.dashTime ?? 0
      }))
    });
  }

  rematch() {
    if (this.stopped) return false;
    clearTimeout(this.nextRoundTimer);
    this.round.reset(); this.recreateFighters(); this.lastSequence = [-1, -1];
    this.emit('room:rematch', { stageId: this.stageId, players: this.players.map((player, slot) => ({ name: player.name, fighterId: player.fighterId, slot, host: slot === 0 })) });
    this.publish();
    return true;
  }

  stop() { this.stopped = true; clearInterval(this.timer); clearTimeout(this.nextRoundTimer); }
}
