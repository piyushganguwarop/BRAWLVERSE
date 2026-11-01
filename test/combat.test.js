import test from 'node:test';
import assert from 'node:assert/strict';
import { Fighter } from '../src/characters/Fighter.js';
import { CombatSystem } from '../src/combat/CombatSystem.js';

const makePair = () => [
  new Fighter({ id: 'a', x: 0, facing: 1 }),
  new Fighter({ id: 'b', x: 1.2, facing: -1 })
];

test('fighters can move, jump and remain inside arena bounds', () => {
  const [a] = makePair();
  a.update(0.1, { right: true, jump: true });
  assert.ok(a.x > 0);
  assert.ok(a.y > 0);
  for (let i = 0; i < 100; i++) a.update(0.033, { right: true });
  assert.ok(a.x <= 5.4);
});

test('punch deals one hit during its active window', () => {
  const [a, b] = makePair();
  const hits = [];
  const combat = new CombatSystem(hit => hits.push(hit));
  assert.equal(a.startAction('punch'), true);
  for (let i = 0; i < 12; i++) { a.update(0.03, {}); b.update(0.03, {}); combat.update([a, b]); }
  assert.equal(hits.length, 1);
  assert.ok(b.health < 100);
});

test('special attack consumes energy and cannot start without enough energy', () => {
  const [a] = makePair();
  a.energy = 20;
  assert.equal(a.startAction('special'), false);
  a.energy = 60;
  assert.equal(a.startAction('special'), true);
  assert.equal(a.energy, 15);
});

test('guard reduces frontal damage and does not guard attacks from behind', () => {
  const [a, b] = makePair();
  b.blocking = true; b.blockAge = 1;
  const front = b.takeHit(10, 1, {});
  assert.equal(front.blocked, true);
  assert.ok(front.damage < 10);
  b.health = 100; b.invulnerable = 0; b.blocking = true; b.facing = 1;
  const behind = b.takeHit(10, 1, {});
  assert.equal(behind.blocked, false);
  assert.equal(behind.damage, 10);
});

test('grab breaks guard and applies full damage', () => {
  const [a, b] = makePair();
  b.blocking = true; b.blockAge = 1;
  const result = b.takeHit(15, 1, { breaksGuard: true, hitstun: 0.3, knockback: 0.5 });
  assert.equal(result.blocked, false);
  assert.equal(result.damage, 15);
  assert.equal(b.state, 'hit');
});
