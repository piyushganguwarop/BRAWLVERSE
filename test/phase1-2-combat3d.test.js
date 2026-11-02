import test from 'node:test';
import assert from 'node:assert/strict';
import { Fighter } from '../src/characters/Fighter.js';
import { CombatSystem } from '../src/combat/CombatSystem.js';
import { gameConfig } from '../src/config/gameConfig.js';

test('Phase 1.2 Combat 3D: Frontal hit connects while attack directly behind cleanly misses', () => {
  const combat = new CombatSystem();
  const attacker = new Fighter({ id: 'hero', x: 0, z: 0, facing: 1 });
  const frontTarget = new Fighter({ id: 'dummy_front', x: 1.0, z: 0, facing: -1 });
  const behindTarget = new Fighter({ id: 'dummy_behind', x: -1.0, z: 0, facing: 1 });

  attacker.facingAngle = Math.PI / 2; // Facing +X
  attacker.facingVector = { x: 1, z: 0 };
  const punchSpec = gameConfig.combat.punch;

  // Front target must hit
  assert.equal(combat.check3DHit(attacker, punchSpec, frontTarget), true, 'Frontal attack must hit');
  // Behind target must miss
  assert.equal(combat.check3DHit(attacker, punchSpec, behindTarget), false, 'Attack behind attacker must cleanly miss');
});

test('Phase 1.2 Combat 3D: Depth reach strictly validates Z distance (same X)', () => {
  const combat = new CombatSystem();
  const attacker = new Fighter({ id: 'hero', x: 0, z: 0, facing: 1 });
  attacker.facingAngle = 0; // Facing +Z
  attacker.facingVector = { x: 0, z: 1 };

  const closeZTarget = new Fighter({ id: 'target_in_depth', x: 0, z: 0.6, facing: -1 });
  const farZTarget = new Fighter({ id: 'target_out_depth', x: 0, z: 1.6, facing: -1 });
  const punchSpec = gameConfig.combat.punch; // depthReach is ~0.85m

  assert.equal(combat.check3DHit(attacker, punchSpec, closeZTarget), true, 'Target within depth reach must hit');
  assert.equal(combat.check3DHit(attacker, punchSpec, farZTarget), false, 'Target beyond depth reach must miss');
});

test('Phase 1.2 Combat 3D: Horizontal reach strictly validates X distance (same Z)', () => {
  const combat = new CombatSystem();
  const attacker = new Fighter({ id: 'hero', x: 0, z: 0, facing: 1 });
  attacker.facingAngle = Math.PI / 2;
  attacker.facingVector = { x: 1, z: 0 };

  const inRangeTarget = new Fighter({ id: 'target_in_x', x: 0.9, z: 0, facing: -1 });
  const outRangeTarget = new Fighter({ id: 'target_out_x', x: 2.5, z: 0, facing: -1 });
  const punchSpec = gameConfig.combat.punch;

  assert.equal(combat.check3DHit(attacker, punchSpec, inRangeTarget), true, 'Target within range must hit');
  assert.equal(combat.check3DHit(attacker, punchSpec, outRangeTarget), false, 'Target beyond range must miss');
});

test('Phase 1.2 Combat 3D: Diagonal 3D alignment connects when facing matches', () => {
  const combat = new CombatSystem();
  const attacker = new Fighter({ id: 'hero', x: 0, z: 0, facing: 1 });
  const diagonalTarget = new Fighter({ id: 'target_diag', x: 0.7, z: 0.7, facing: -1 });

  // Update facing towards diagonal target
  attacker.updateFacing(diagonalTarget);
  const punchSpec = gameConfig.combat.punch;

  assert.equal(combat.check3DHit(attacker, punchSpec, diagonalTarget), true, 'Diagonal target aligned with facing must hit');

  // Turn attacker 180 degrees away from diagonal target
  attacker.facingAngle = attacker.facingAngle + Math.PI;
  attacker.facingVector = { x: Math.sin(attacker.facingAngle), z: Math.cos(attacker.facingAngle) };

  assert.equal(combat.check3DHit(attacker, punchSpec, diagonalTarget), false, 'Target behind diagonal facing must miss');
});

test('Phase 1.2 Combat 3D: Vertical separation validates Y elevation', () => {
  const combat = new CombatSystem();
  const attacker = new Fighter({ id: 'hero', x: 0, z: 0, facing: 1 });
  attacker.facingVector = { x: 1, z: 0 };
  const punchSpec = gameConfig.combat.punch; // height reach = 1.5

  const groundedTarget = new Fighter({ id: 'grounded', x: 1.0, y: 0.4, z: 0, facing: -1 });
  const highAirTarget = new Fighter({ id: 'high_air', x: 1.0, y: 2.8, z: 0, facing: -1 });

  assert.equal(combat.check3DHit(attacker, punchSpec, groundedTarget), true, 'Target within height overlap must hit');
  assert.equal(combat.check3DHit(attacker, punchSpec, highAirTarget), false, 'Target above vertical height reach must miss');
});

test('Phase 1.2 Combat 3D: Aerial attacks apply jump elevation and distinct move tuning', () => {
  const attacker = new Fighter({ id: 'hero', x: 0, y: 0.6, z: 0, facing: 1 });
  const target = new Fighter({ id: 'dummy', x: 1.0, y: 0, z: 0, facing: -1 });

  attacker.startAction('kick');
  assert.equal(attacker.activeAction.variant, 'air', 'Attacking in air must produce air variant');
  assert.ok(attacker.activeAction.range > gameConfig.combat.kick.range, 'Air attack has extended range tuning');

  const combat = new CombatSystem();
  assert.equal(combat.check3DHit(attacker, attacker.activeAction, target), true, 'Air attack can reach grounded opponent');
});

test('Phase 1.2 Combat 3D: Grab breaks block and applies unmitigated damage', () => {
  const attacker = new Fighter({ id: 'hero', x: 0, z: 0, facing: 1 });
  const blocker = new Fighter({ id: 'blocker', x: 0.8, z: 0, facing: -1 });
  blocker.blocking = true;
  blocker.updateFacing(attacker);

  attacker.startAction('grab');
  const spec = attacker.activeAction;
  assert.equal(spec.breaksGuard, true, 'Grab must have breaksGuard = true');

  const result = blocker.takeHit(spec.damage, attacker.facing, spec, attacker);
  assert.equal(result.blocked, false, 'Grab must break guard');
  assert.equal(result.damage, spec.damage, 'Grab damage must not be reduced by blocking');
});

test('Phase 1.2 Combat 3D: Directional blocking reduces frontal hits and allows back hits', () => {
  const defender = new Fighter({ id: 'defender', x: 0, z: 0, facing: -1 });
  defender.facingAngle = -Math.PI / 2;
  defender.facingVector = { x: -1, z: 0 }; // Facing -X
  defender.blocking = true;

  const frontalAttacker = new Fighter({ id: 'frontal', x: -1.0, z: 0, facing: 1 });
  const rearAttacker = new Fighter({ id: 'rear', x: 1.0, z: 0, facing: -1 });

  // Frontal attack into guard
  const frontHit = defender.takeHit(20, frontalAttacker.facing, gameConfig.combat.punch, frontalAttacker);
  assert.equal(frontHit.blocked, true, 'Frontal attack must be blocked');
  assert.ok(frontHit.damage < 20, 'Blocked damage must be reduced');

  // Reset invulnerability window for second test strike
  defender.invulnerable = 0;

  // Rear attack into back
  const backHit = defender.takeHit(20, rearAttacker.facing, gameConfig.combat.punch, rearAttacker);
  assert.equal(backHit.blocked, false, 'Rear attack must bypass guard');
  assert.equal(backHit.damage, 20, 'Unblocked rear attack deals full damage');
});

test('Phase 1.2 Combat 3D: Facing hysteresis prevents erratic flip at close range (< 0.18m)', () => {
  const f1 = new Fighter({ id: 'f1', x: 0, z: 0, facing: 1 });
  const f2 = new Fighter({ id: 'f2', x: 0.10, z: 0.05, facing: -1 }); // Distance = 0.11m (< 0.18m)

  const initialAngle = f1.facingAngle;
  const initialFacing = f1.facing;

  // Move f2 slightly behind f1 within the 0.18m deadzone
  f2.x = -0.05;
  f1.updateFacing(f2);

  assert.equal(f1.facingAngle, initialAngle, 'Facing angle must not flip within contact deadzone');
  assert.equal(f1.facing, initialFacing, 'Facing direction must not flip within contact deadzone');

  // Move f2 outside deadzone (> 0.18m)
  f2.x = -1.0;
  f1.updateFacing(f2);
  assert.notEqual(f1.facingAngle, initialAngle, 'Facing angle updates once separation exceeds deadzone');
  assert.equal(f1.facing, -1, 'Facing direction updates to left');
});

test('Phase 1.2 Combat 3D: One hit per valid attack serial prevents duplicate damage', () => {
  const hits = [];
  const combat = new CombatSystem(hit => hits.push(hit));

  const attacker = new Fighter({ id: 'hero', x: 0, z: 0, facing: 1 });
  const target = new Fighter({ id: 'dummy', x: 0.8, z: 0, facing: -1 });

  attacker.startAction('punch');
  const initialHp = target.health;

  // Simulate multiple animation frames during active window
  for (let frame = 0; frame < 8; frame++) {
    attacker.update(0.016, {});
    target.update(0.016, {});
    combat.update([attacker, target]);
  }

  // Exactly one hit must have connected during the entire active window
  assert.equal(hits.length, 1, 'Only one hit registered for single punch');
  assert.ok(target.health < initialHp, 'Target took damage once');
  const hpAfterFirstHit = target.health;

  // Further frames in same action must not hit again
  attacker.update(0.016, {});
  combat.update([attacker, target]);
  assert.equal(hits.length, 1);
  assert.equal(target.health, hpAfterFirstHit);
});
