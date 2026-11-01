import test from 'node:test';
import assert from 'node:assert/strict';
import { RoundManager } from '../src/combat/RoundManager.js';

test('round timer only advances while the round is playing', () => {
  const match = new RoundManager({ roundDuration: 60 });
  match.tick(12.5);
  assert.equal(match.remaining, 47.5);
  match.completeRound('player');
  match.tick(10);
  assert.equal(match.remaining, 47.5);
});

test('health knockout decides the round and a second win completes the match', () => {
  const match = new RoundManager();
  assert.equal(match.decideWinner(100, 0).lastWinner, 'player');
  assert.equal(match.nextRound(), true);
  assert.equal(match.round, 2);
  assert.equal(match.decideWinner(0, 100).lastWinner, 'opponent');
  assert.equal(match.phase, 'round-complete');
  assert.equal(match.nextRound(), true);
  match.decideWinner(100, 0);
  assert.equal(match.phase, 'complete');
  assert.equal(match.matchWinner, 'player');
});

test('timeout compares remaining health and supports a draw', () => {
  const match = new RoundManager({ roundDuration: 1 });
  match.tick(1);
  assert.equal(match.decideWinner(55, 40).lastWinner, 'player');
  const draw = new RoundManager({ roundDuration: 1 });
  draw.tick(1);
  assert.equal(draw.decideWinner(40, 40).lastWinner, 'draw');
  assert.deepEqual(draw.wins, { player: 0, opponent: 0 });
});

test('simultaneous knockout is a draw and cannot double-complete', () => {
  const match = new RoundManager();
  const first = match.decideWinner(0, 0);
  assert.equal(first.lastWinner, 'draw');
  assert.equal(match.decideWinner(0, 0), null);
  assert.equal(match.wins.player, 0);
  assert.equal(match.wins.opponent, 0);
});

test('rejects invalid match configuration and winner values', () => {
  assert.throws(() => new RoundManager({ roundsToWin: 0 }), RangeError);
  const match = new RoundManager();
  assert.throws(() => match.completeRound('nobody'), TypeError);
});
