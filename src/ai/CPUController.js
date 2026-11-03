const PROFILES = {
  easy:   { thinkMin: 0.78, thinkMax: 1.18, blockChance: 0.12, attackChance: 0.48, specialChance: 0.12, reaction: 0.62, aggression: 0.55 },
  normal: { thinkMin: 0.42, thinkMax: 0.68, blockChance: 0.32, attackChance: 0.68, specialChance: 0.30, reaction: 0.82, aggression: 0.78 },
  hard:   { thinkMin: 0.20, thinkMax: 0.36, blockChance: 0.55, attackChance: 0.86, specialChance: 0.58, reaction: 1.0, aggression: 1.0 }
};

const THREATS = new Set(['punch', 'kick', 'heavy', 'grab', 'special']);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/**
 * Decision-making layer for a CPU fighter. It returns movement input and at
 * most one action request per update. Inject rng for deterministic tests.
 */
export class CPUController {
  constructor({ fighter, opponent, difficulty = 'normal', rng = Math.random } = {}) {
    if (!fighter || !opponent) throw new TypeError('CPUController needs fighter and opponent');
    this.fighter = fighter;
    this.opponent = opponent;
    this.rng = rng;
    this.setDifficulty(difficulty);
    this.thinkTimer = 0;
    this.intent = 'approach';
    this.pendingAction = null;
    this.lastOpponentActionSerial = opponent.actionSerial ?? 0;
  }

  setDifficulty(level) {
    this.difficulty = PROFILES[level] ? level : 'normal';
    this.profile = PROFILES[this.difficulty];
  }

  update(dt) {
    const cpu = this.fighter, player = this.opponent, p = this.profile;
    const dx = player.x - cpu.x;
    const dz = (player.z ?? 0) - (cpu.z ?? 0);
    const distance = Math.abs(dx);
    const depthDist = Math.abs(dz);
    const toward = Math.sign(dx) || cpu.facing;
    const threat = THREATS.has(player.state) || !!player.activeAction;
    const movement = { left: false, right: false, depthUp: false, depthDown: false, block: false };
    this.thinkTimer -= dt;

    if (this.thinkTimer <= 0) {
      this.thinkTimer = p.thinkMin + this.rng() * (p.thinkMax - p.thinkMin);
      const canReact = this.rng() <= p.reaction;
      if (threat && distance < 2.7 && canReact && this.rng() < p.blockChance) {
        this.intent = 'block';
        this.pendingAction = null;
      } else if (distance > (1.8 - p.aggression * 0.35) || depthDist > 0.5) {
        this.intent = 'approach';
        this.pendingAction = null;
      } else if (this.rng() < p.attackChance) {
        const choices = distance < 1.3
          ? ['punch', 'kick', 'grab']
          : (this.difficulty === 'hard' ? ['punch', 'kick', 'heavy'] : ['punch', 'kick']);
        if (cpu.energy >= 45 && this.rng() < p.specialChance) this.pendingAction = 'special';
        else this.pendingAction = choices[Math.floor(this.rng() * choices.length)];
        this.intent = 'attack';
      } else if (distance < 1.4 && this.rng() < 0.5) {
        this.intent = 'retreat';
        this.pendingAction = null;
      } else {
        this.intent = 'guard';
        this.pendingAction = null;
      }
    }

    if (this.intent === 'approach') {
      if (distance > 1.35) {
        movement.left = toward < 0;
        movement.right = toward > 0;
      }
      if (depthDist > 0.25) {
        movement.depthUp = dz < -0.15;
        movement.depthDown = dz > 0.15;
      }
    } else if (this.intent === 'retreat' && distance < 2.2) {
      movement.left = toward > 0;
      movement.right = toward < 0;
    } else if (this.intent === 'block' || this.intent === 'guard') {
      movement.block = this.intent === 'block' || threat;
    }

    let action = null;
    if (this.pendingAction && cpu.state === 'idle' && distance <= (this.pendingAction === 'grab' ? 1.3 : this.pendingAction === 'special' ? 3.1 : 2.05)) {
      action = this.pendingAction;
      this.pendingAction = null;
    } else if (this.pendingAction && distance > 3.3) {
      this.pendingAction = null;
    }
    return { movement, action, intent: this.intent, distance };
  }
}

export const CPU_DIFFICULTIES = Object.freeze(Object.keys(PROFILES));
export const CPU_PROFILES = Object.freeze(Object.fromEntries(Object.entries(PROFILES).map(([k,v]) => [k, Object.freeze({...v})])));
