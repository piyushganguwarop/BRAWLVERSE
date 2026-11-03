import test from 'node:test';
import assert from 'node:assert/strict';
import { Fighter } from '../src/characters/Fighter.js';
import { CombatSystem } from '../src/combat/CombatSystem.js';
import { CPUController } from '../src/ai/CPUController.js';
import { CharacterModelBuilder } from '../src/three/CharacterModelBuilder.js';
import { gameConfig } from '../src/config/gameConfig.js';

test('Phase 4: Fighter transitions into knockdown and get_up upon landing from air hit', () => {
  const f = new Fighter({ id: 'p1', x: 0, y: 1.5, facing: 1 });
  f.vy = -5.0; // Falling toward ground
  f.takeHit(10, -1, {}, { x: 1.0, z: 0 }); // Hit in midair
  assert.strictEqual(f.state, 'hit');
  assert.strictEqual(f.knockdownOnLanding, true, 'Air hit must flag knockdownOnLanding');

  // Advance time until grounded
  f.update(0.35, {});
  assert.strictEqual(f.y, 0, 'Fighter must be on ground');
  assert.strictEqual(f.state, 'knockdown', 'Landed fighter must enter knockdown state');
  assert.ok(f.invulnerable > 0, 'Knocked down fighter must be invulnerable');

  // Verify damage immunity during knockdown
  const hitResult = f.takeHit(20, -1, {}, { x: 1.0, z: 0 });
  assert.strictEqual(hitResult.damage, 0, 'Must not take damage while in knockdown');

  // Advance through knockdown duration (0.40s) -> transitions to get_up
  f.update(0.42, {});
  assert.strictEqual(f.state, 'get_up', 'Must transition from knockdown to get_up');
  assert.ok(f.invulnerable > 0, 'Must remain invulnerable during get_up');

  // Advance through get_up duration (0.28s) -> transitions to idle
  f.update(0.30, {});
  assert.strictEqual(f.state, 'idle', 'Must recover to idle after get_up finishes');
});

test('Phase 4: Fighter actions are locked during knockdown and get_up states', () => {
  const f = new Fighter({ id: 'p1', x: 0, y: 0, facing: 1 });
  f.state = 'knockdown';
  assert.strictEqual(f.startAction('punch'), false, 'Cannot punch during knockdown');
  assert.strictEqual(f.startAction('dash'), false, 'Cannot dash during knockdown');

  f.state = 'get_up';
  assert.strictEqual(f.startAction('kick'), false, 'Cannot kick during get_up');
  assert.strictEqual(f.startAction('special'), false, 'Cannot special during get_up');
});

test('Phase 4: CPUController recognizes heavy attack as a threat and blocks', () => {
  const cpu = { x: 1.0, z: 0, state: 'idle', energy: 50, facing: -1, activeAction: null, actionSerial: 0 };
  const player = { x: 0, z: 0, state: 'heavy', energy: 50, facing: 1, activeAction: { name: 'heavy' }, actionSerial: 1 };

  const ai = new CPUController({ fighter: cpu, opponent: player, difficulty: 'hard', rng: () => 0.05 });
  const decision = ai.update(0.016);
  assert.strictEqual(decision.intent, 'block', 'CPU must recognize heavy attack as threat to block');
  assert.strictEqual(decision.movement.block, true, 'CPU must set block movement');
});

test('Phase 4: CPUController tracks opponent across 3D depth (Z-axis)', () => {
  const cpu = { x: 0, z: 1.2, state: 'idle', energy: 50, facing: 1, activeAction: null, actionSerial: 0 };
  const player = { x: 0.2, z: -1.0, state: 'idle', energy: 50, facing: -1, activeAction: null, actionSerial: 0 };

  const ai = new CPUController({ fighter: cpu, opponent: player, difficulty: 'normal', rng: () => 0.99 });
  const decision = ai.update(0.016);
  assert.strictEqual(decision.intent, 'approach');
  assert.strictEqual(decision.movement.depthUp, true, 'CPU must move depthUp toward player at -1.0 Z');
  assert.strictEqual(decision.movement.depthDown, false);
});

test('Phase 4: CharacterModelBuilder evaluates knockdown and get_up poses', () => {
  const model = CharacterModelBuilder.build({ id: 'atlas' });

  const knockdownFighter = {
    id: 'player',
    x: 0, y: 0, z: 0,
    state: 'knockdown',
    facing: 1,
    facingAngle: Math.PI / 2,
    actionTime: 0.3
  };
  assert.doesNotThrow(() => {
    CharacterModelBuilder.animateFighter(model, knockdownFighter, 1.0, 0.016);
  });
  assert.strictEqual(model.root.rotation.z, -1.45, 'Knockdown pose must lie flat on ground');

  const getUpFighter = {
    id: 'player',
    x: 0, y: 0, z: 0,
    state: 'get_up',
    facing: 1,
    facingAngle: Math.PI / 2,
    actionTime: 0.14
  };
  assert.doesNotThrow(() => {
    CharacterModelBuilder.animateFighter(model, getUpFighter, 1.0, 0.016);
  });
  assert.ok(model.root.rotation.z > -1.45 && model.root.rotation.z < 0, 'Get_up pose must interpolate rising angle');
});

test('Phase 4: Three-hit cancel chain punch -> kick -> heavy executes smoothly', () => {
  const a = new Fighter({ id: 'p1', x: 0, facing: 1 });
  assert.strictEqual(a.startAction('punch'), true);
  assert.strictEqual(a.comboCount, 1);

  // Advance into punch cancel window
  a.update(gameConfig.combat.punch.cancelStart + 0.02, {});
  assert.strictEqual(a.startAction('kick'), true);
  assert.strictEqual(a.activeAction.name, 'kick');
  assert.strictEqual(a.comboCount, 2);

  // Advance into kick cancel window
  a.update(gameConfig.combat.kick.cancelStart + 0.02, {});
  assert.strictEqual(a.startAction('heavy'), true);
  assert.strictEqual(a.activeAction.name, 'heavy');
  assert.strictEqual(a.comboCount, 3);
});
