import test from 'node:test';
import assert from 'node:assert/strict';
import { CPUController, CPU_DIFFICULTIES, CPU_PROFILES } from '../src/ai/CPUController.js';

const fighter = (x, state='idle', energy=60) => ({ x, state, energy, facing: x < 0 ? 1 : -1, activeAction: null, actionSerial: 0 });

test('exposes three valid CPU difficulty profiles with increasing reaction speed', () => {
  assert.deepEqual(CPU_DIFFICULTIES, ['easy','normal','hard']);
  assert.ok(CPU_PROFILES.easy.thinkMin > CPU_PROFILES.normal.thinkMin);
  assert.ok(CPU_PROFILES.normal.thinkMin > CPU_PROFILES.hard.thinkMin);
  assert.ok(CPU_PROFILES.easy.reaction < CPU_PROFILES.hard.reaction);
});

test('CPU approaches an opponent at long range', () => {
  const cpu = fighter(3), player = fighter(-3);
  const ai = new CPUController({ fighter: cpu, opponent: player, rng: () => 0.99 });
  const decision = ai.update(0.016);
  assert.equal(decision.intent, 'approach');
  assert.equal(decision.movement.left, true);
});

test('CPU can react to an attack with a block', () => {
  const cpu = fighter(1), player = fighter(0, 'punch');
  const ai = new CPUController({ fighter: cpu, opponent: player, difficulty: 'hard', rng: () => 0.1 });
  const decision = ai.update(0.016);
  assert.equal(decision.intent, 'block');
  assert.equal(decision.movement.block, true);
});

test('CPU schedules an attack when close and aggressive', () => {
  const cpu = fighter(1), player = fighter(0);
  const ai = new CPUController({ fighter: cpu, opponent: player, difficulty: 'hard', rng: () => 0.8 });
  const decision = ai.update(0.016);
  assert.ok(['punch','kick','grab','special'].includes(decision.action));
});

test('CPU uses special when energy and random decision allow it', () => {
  const cpu = fighter(1,'idle',80), player = fighter(0);
  // first rng controls think timer, second attack selection, third special selection
  const values = [0.8,0.0,0.0];
  const ai = new CPUController({ fighter: cpu, opponent: player, difficulty: 'hard', rng: () => values.shift() ?? 0 });
  assert.equal(ai.update(0.016).action, 'special');
});

test('unknown difficulty safely falls back to normal', () => {
  const ai = new CPUController({ fighter: fighter(1), opponent: fighter(0), difficulty: 'impossible' });
  assert.equal(ai.difficulty, 'normal');
});
