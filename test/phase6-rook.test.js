import test from 'node:test';
import assert from 'node:assert';
import { CharacterModelBuilder } from '../src/three/CharacterModelBuilder.js';
import { Fighter } from '../src/characters/Fighter.js';
import { getFighter } from '../src/characters/roster.js';

test('CharacterModelBuilder: builds Rook with towering colossus proportions, blast helm, and hydraulic piston gauntlets', () => {
  const rookConfig = getFighter('rook');
  const model = CharacterModelBuilder.build(rookConfig);

  // 1. Verify model identity and root containers
  assert.strictEqual(model.fighterId, 'rook', 'Model identity should be rook');
  assert.ok(model.root, 'Should have root container');
  assert.ok(model.hips, 'Should have hips pivot');
  assert.ok(model.torso, 'Should have torso spine pivot');
  assert.ok(model.chest, 'Should have chest/upper torso pivot');
  assert.ok(model.head, 'Should have head pivot');

  // 2. Verify limbs & articulated joints
  assert.ok(model.shoulderL && model.elbowL && model.handL, 'Left arm should have shoulder, elbow, and hand');
  assert.ok(model.shoulderR && model.elbowR && model.fistR, 'Right arm should have shoulder, elbow, and heavy fist');
  assert.ok(model.hipJointL && model.kneeL && model.ankleL, 'Left leg should have hip, knee, and ankle');
  assert.ok(model.hipJointR && model.kneeR && model.ankleR, 'Right leg should have hip, knee, and ankle');

  // 3. Verify signature hydraulic piston assemblies
  assert.ok(model.pistonPlateL && model.steamVentL, 'Left forearm should mount hydraulic piston plates and steam vent');
  assert.ok(model.pistonPlateR && model.steamVentR, 'Right forearm should mount hydraulic piston plates and steam vent');

  // 4. Verify materials & crimson reactor / sensor slit emission
  assert.ok(model.bodyMat, 'Should have body material');
  assert.ok(model.accentMat, 'Should have accent material');
  assert.ok(model.glowMat, 'Should have crimson core emission material');
  assert.strictEqual(model.glowMat.color.getHex(), 0xFF2040, 'Rook sensor and core should emit Crimson');

  // 5. Verify backwards-compatibility joint aliases
  assert.strictEqual(model.armL, model.shoulderL);
  assert.strictEqual(model.armR, model.shoulderR);
  assert.strictEqual(model.legL, model.hipJointL);
  assert.strictEqual(model.legR, model.hipJointR);
});

test('CharacterModelBuilder: Rook procedural animation evaluates across all combat states with tank attitude', () => {
  const model = CharacterModelBuilder.build({ id: 'rook' });

  const states = [
    'idle', 'walk', 'dash', 'jump', 'crouch', 'block',
    'punch', 'kick', 'heavy', 'grab', 'special',
    'hit', 'ko', 'knockdown', 'get_up', 'victory', 'defeat'
  ];

  for (const state of states) {
    const fighter = {
      id: 'rook',
      x: 1.0,
      y: state === 'jump' ? 1.4 : 0,
      z: 0.1,
      vx: state === 'walk' || state === 'dash' ? 4.0 : 0,
      vz: 0,
      facing: 1,
      facingAngle: Math.PI / 2,
      state,
      blocking: state === 'block',
      crouching: state === 'crouch',
      actionTime: 0.2,
      hitFlash: state === 'hit' ? 0.15 : 0
    };

    assert.doesNotThrow(() => {
      CharacterModelBuilder.animateFighter(model, fighter, 1.2, 0.016);
    }, `Rook animation should evaluate cleanly for state: ${state}`);

    // Verify Rook-specific poses
    if (state === 'idle') {
      // Immovable wide sumo plant: wide legs and wide piston arms
      assert.ok(model.thighL.rotation.z < -0.15, 'Rook left thigh flared wide');
      assert.ok(model.thighR.rotation.z > 0.15, 'Rook right thigh flared wide');
      assert.ok(model.shoulderL.rotation.y > 0.25, 'Rook arms held wide');
      assert.ok(model.shoulderR.rotation.y < -0.25, 'Rook arms held wide');
    }

    if (state === 'walk') {
      // Heavy colossus march rocking sway
      assert.notStrictEqual(model.torso.rotation.z, 0, 'Rook walk should have rocking colossus sway');
    }

    if (state === 'dash') {
      // Hydraulic bull charge
      assert.ok(model.torso.rotation.x <= -0.30, 'Rook dash should be a heavy bull charge forward');
      assert.ok(model.elbowL.rotation.x > 1.3, 'Arms tucked in ramming posture');
      assert.ok(model.elbowR.rotation.x > 1.3, 'Arms tucked in ramming posture');
    }

    if (state === 'block') {
      // Twin Buckler Fortress Shield Lock (#IronWall)
      assert.ok(model.shoulderL.rotation.x < -1.1, 'Left shield plate raised');
      assert.ok(model.shoulderR.rotation.x < -1.1, 'Right shield plate raised');
      assert.ok(model.elbowL.rotation.x > 1.4, 'Forearm locked parallel');
      assert.ok(model.elbowR.rotation.x > 1.4, 'Forearm locked parallel');
    }

    if (state === 'punch') {
      // Heavy piston strike
      assert.ok(model.torso.rotation.y < -0.35, 'Heavy torso torque on punch');
      assert.ok(model.shoulderR.rotation.x < -1.5, 'Right arm driving forward');
    }

    if (state === 'heavy') {
      // Two-Handed Sledgehammer Slam overhead
      assert.ok(model.shoulderL.rotation.x < -2.1, 'Left fist raised high overhead');
      assert.ok(model.shoulderR.rotation.x < -2.1, 'Right fist raised high overhead');
    }

    if (state === 'special') {
      // Iron Fortress seismic ground pound
      assert.ok(model.torso.rotation.x <= -0.50, 'Torso slammed downward onto deck');
      assert.ok(model.shoulderL.rotation.x < -1.2, 'Left fist slammed onto floor');
      assert.ok(model.shoulderR.rotation.x < -1.2, 'Right fist slammed onto floor');
    }

    if (state === 'hit') {
      assert.strictEqual(model.bodyMat.emissive.getHex(), 0xff3b2f, 'Hit state should activate emissive flash');
      assert.ok(model.root.rotation.z < -0.1, 'Hit state should apply hit recoil');
    }

    if (state === 'knockdown') {
      assert.strictEqual(model.root.rotation.z, -1.45, 'Knockdown should lay flat on floor');
    }

    if (state === 'victory') {
      // Double chest-pound with hydraulic steam burst
      assert.ok(model.elbowL.rotation.x > 1.5, 'Left arm pounding chest');
      assert.ok(model.elbowR.rotation.x > 1.5, 'Right arm pounding chest');
    }
  }
});

test('Fighter: Rook initializes with tank archetype and executes heavy fortress combat', () => {
  const rookConfig = getFighter('rook');
  const rook = new Fighter({ id: 'player', x: -1, facing: 1, character: rookConfig });

  assert.strictEqual(rook.style, 'tank');
  assert.strictEqual(rook.character.id, 'rook');
  assert.strictEqual(rook.character.specialName, 'Iron Fortress');
  assert.ok(rook.damageMultiplier > 1.0, 'Tank archetype should provide high damage');
  assert.ok(rook.guardMultiplier < 0.95, 'Tank archetype should provide high guard damage reduction');

  // Iron Fortress special attack execution
  rook.energy = 50;
  rook.state = 'idle';
  const started = rook.startAction('special');
  assert.ok(started, 'Rook should start special attack');
  assert.strictEqual(rook.state, 'special');
  assert.strictEqual(rook.energy, 5); // 50 - 45 energyCost
});
