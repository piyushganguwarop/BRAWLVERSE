import { roster } from '../characters/roster.js';

const DIFFICULTY = ['easy', 'normal', 'hard'];
const STAGE_IDS = ['neon', 'temple', 'rooftop'];

export class ArcadeProgression {
  constructor({ playerId, opponents = null, stageId = 'neon' } = {}) {
    const pool = opponents || roster.filter(f => f.id !== playerId).map(f => f.id);
    this.opponents = [...pool];
    if (!this.opponents.length) this.opponents = roster.filter(f => f.id !== playerId).map(f => f.id);
    this.stageId = STAGE_IDS.includes(stageId) ? stageId : 'neon';
    this.index = 0;
    this.wins = 0;
    this.losses = 0;
    this.status = 'active';
  }

  current() {
    if (this.status !== 'active') return null;
    const fighterId = this.opponents[this.index];
    const boss = this.index === this.opponents.length - 1;
    return {
      index: this.index,
      total: this.opponents.length,
      fighterId,
      difficulty: DIFFICULTY[Math.min(2, Math.floor(this.index / Math.max(1, Math.ceil(this.opponents.length / 3))))],
      stageId: STAGE_IDS[this.index % STAGE_IDS.length],
      boss,
      label: boss ? 'FINAL BOSS' : `FIGHT ${this.index + 1} / ${this.opponents.length}`
    };
  }

  recordMatch(won) {
    if (this.status !== 'active') return this.snapshot();
    if (won) this.wins += 1;
    else this.losses += 1;
    if (!won) this.status = 'defeat';
    else if (this.index >= this.opponents.length - 1) this.status = 'complete';
    else this.status = 'between-fights';
    return this.snapshot();
  }

  nextFight() {
    if (this.status !== 'between-fights') return false;
    this.index += 1;
    this.status = 'active';
    return true;
  }

  snapshot() {
    return { index: this.index, total: this.opponents.length, wins: this.wins, losses: this.losses, status: this.status, current: this.current() };
  }

  serialize() {
    return { opponents: [...this.opponents], stageId: this.stageId, index: this.index, wins: this.wins, losses: this.losses, status: this.status };
  }

  static restore(data) {
    const run = new ArcadeProgression({ opponents: data?.opponents, stageId: data?.stageId });
    run.index = Math.max(0, Math.min(run.opponents.length - 1, Number(data?.index) || 0));
    run.wins = Math.max(0, Number(data?.wins) || 0);
    run.losses = Math.max(0, Number(data?.losses) || 0);
    run.status = ['active','between-fights','defeat','complete'].includes(data?.status) ? data.status : 'active';
    return run;
  }
}
