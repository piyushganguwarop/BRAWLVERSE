/**
 * Deterministic best-of-three match flow.
 * Pure state model so match rules can be tested without Phaser or a browser.
 */
export class RoundManager {
  constructor({ roundsToWin = 2, roundDuration = 99 } = {}) {
    if (!Number.isInteger(roundsToWin) || roundsToWin < 1) throw new RangeError('roundsToWin must be a positive integer');
    if (!Number.isFinite(roundDuration) || roundDuration <= 0) throw new RangeError('roundDuration must be positive');
    this.roundsToWin = roundsToWin;
    this.roundDuration = roundDuration;
    this.reset();
  }

  reset() {
    this.round = 1;
    this.wins = { player: 0, opponent: 0 };
    this.remaining = this.roundDuration;
    this.phase = 'playing';
    this.lastWinner = null;
    this.matchWinner = null;
    return this.snapshot();
  }

  tick(deltaSeconds) {
    if (this.phase !== 'playing' || !Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return this.snapshot();
    this.remaining = Math.max(0, this.remaining - deltaSeconds);
    return this.snapshot();
  }

  decideWinner(playerHealth, opponentHealth) {
    if (this.phase !== 'playing') return null;
    const p = Math.max(0, Number(playerHealth) || 0);
    const o = Math.max(0, Number(opponentHealth) || 0);
    if (p <= 0 && o <= 0) return this.completeRound('draw');
    if (p <= 0) return this.completeRound('opponent');
    if (o <= 0) return this.completeRound('player');
    if (this.remaining <= 0) return this.completeRound(p === o ? 'draw' : p > o ? 'player' : 'opponent');
    return null;
  }

  completeRound(winner) {
    if (this.phase !== 'playing') return null;
    if (!['player', 'opponent', 'draw'].includes(winner)) throw new TypeError('Invalid round winner');
    this.lastWinner = winner;
    if (winner !== 'draw') this.wins[winner] += 1;
    this.matchWinner = this.wins.player >= this.roundsToWin ? 'player'
      : this.wins.opponent >= this.roundsToWin ? 'opponent' : null;
    this.phase = this.matchWinner ? 'complete' : 'round-complete';
    return this.snapshot();
  }

  nextRound() {
    if (this.phase !== 'round-complete') return false;
    this.round += 1;
    this.remaining = this.roundDuration;
    this.lastWinner = null;
    this.phase = 'playing';
    return true;
  }

  snapshot() {
    return {
      round: this.round,
      wins: { ...this.wins },
      remaining: this.remaining,
      phase: this.phase,
      lastWinner: this.lastWinner,
      matchWinner: this.matchWinner,
      roundsToWin: this.roundsToWin
    };
  }
}
