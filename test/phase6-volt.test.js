import test from 'node:test';
import assert from 'node:assert';
import { CharacterModelBuilder } from '../src/three/CharacterModelBuilder.js';
import { Fighter } from '../src/characters/Fighter.js';
import { getFighter } from '../src/characters/roster.js';

test('CharacterModelBuilder: builds Volt with lean aerodynamic proportions, articulated joints, and dual shock blades', () => {
  const voltConfig = getFighter('volt');
  const model = CharacterModelBuilder.build(voltConfig);

  // 1. Verify model identity and root containers
  assert.strictEqual(model.fighterId, 'volt', 'Model identity should be volt');
  assert.ok(model.root, 'Should have root container');
  assert.ok(model.hips, 'Should have hips pivot');
  assert.ok(model.torso, 'Should have torso spine pivot');
  assert.ok(model.chest, 'Should have chest/upper torso pivot');
  assert.ok(model.head, 'Should have head pivot');

  // 2. Verify limbs & articulated joints
  assert.ok(model.shoulderL && model.elbowL && model.handL, 'Left arm should have shoulder, elbow, and hand');
  assert.ok(model.shoulderR && model.elbowR && model.fistR, 'Right arm should have shoulder, elbow, and fist');
  assert.ok(model.hipJointL && model.kneeL && model.ankleL, 'Left leg should have hip, knee, and ankle');
  assert.ok(model.hipJointR && model.kneeR && model.ankleR, 'Right leg should have hip, knee, and ankle');

  // 3. Verify signature dual forearm plasma shock blades
  assert.ok(model.shockBladeL, 'Left forearm should mount a plasma shock blade');
  assert.ok(model.shockBladeR, 'Right forearm should mount a plasma shock blade');

  // 4. Verify materials & neon lime plasma glow
  assert.ok(model.bodyMat, 'Should have body material');
  assert.ok(model.accentMat, 'Should have accent material');
  assert.ok(model.glowMat, 'Should have plasma glow material');
  assert.strictEqual(model.glowMat.color.getHex(), 0xA6FF00, 'Volt plasma should emit Neon Lime / Electric Yellow');

  // 5. Verify backwards-compatibility joint aliases
  assert.strictEqual(model.armL, model.shoulderL);
  assert.strictEqual(model.armR, model.shoulderR);
  assert.strictEqual(model.legL, model.hipJointL);
  assert.strictEqual(model.legR, model.hipJointR);
});

test('CharacterModelBuilder: Volt procedural animation evaluates across all combat states with bespoke attitude', () => {
  const model = CharacterModelBuilder.build({ id: 'volt' });

  const states = [
    'idle', 'walk', 'dash', 'jump', 'crouch', 'block',
    'punch', 'kick', 'heavy', 'grab', 'special',
    'hit', 'ko', 'knockdown', 'get_up', 'victory', 'defeat'
  ];

  for (const state of states) {
    const fighter = {
      id: 'volt',
      x: 1.0,
      y: state === 'jump' ? 1.4 : 0,
      z: 0.1,
      vx: state === 'walk' || state === 'dash' ? 5.5 : 0,
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
    }, `Volt animation should evaluate cleanly for state: ${state}`);

    // Verify Volt-specific poses
    if (state === 'idle') {
      // Ready predatory guard: blades pointing forward, forward torso lean
      assert.ok(model.torso.rotation.x < 0, 'Volt idle should have an aggressive forward torso lean');
      assert.ok(model.elbowL.rotation.x > 1.2, 'Volt left blade should be raised forward');
      assert.ok(model.elbowR.rotation.x > 1.2, 'Volt right blade should be raised forward');
    }

    if (state === 'dash') {
      // High-speed sprint skate: deep forward pitch and swept-back arms
      assert.ok(model.torso.rotation.x <= -0.35, 'Volt dash should have deep aerodynamic forward pitch');
      assert.ok(model.shoulderL.rotation.x > 0.3, 'Volt arms should sweep back like jet wings');
      assert.ok(model.shoulderR.rotation.x > 0.3, 'Volt arms should sweep back like jet wings');
    }

    if (state === 'block') {
      // Crossed shock blades X-guard
      assert.ok(model.shoulderL.rotation.z > 0.35, 'Left arm crossed inward');
      assert.ok(model.shoulderR.rotation.z < -0.35, 'Right arm crossed inward');
    }

    if (state === 'punch') {
      // Rigid thrust shock-blade snap
      assert.ok(model.elbowR.rotation.x < 0.1, 'Striking shock-blade should snap straight');
    }

    if (state === 'heavy') {
      // Leaping dual-blade X-slash downward
      assert.ok(model.shoulderL.rotation.x < -1.8, 'Left blade raised high for X-slash');
      assert.ok(model.shoulderR.rotation.x < -1.8, 'Right blade raised high for X-slash');
    }

    if (state === 'special') {
      // Flash Rush dual-blade thrust
      assert.ok(model.shoulderL.rotation.x < -1.8, 'Left blade thrusting forward in Flash Rush');
      assert.ok(model.shoulderR.rotation.x < -1.8, 'Right blade thrusting forward in Flash Rush');
      assert.strictEqual(model.elbowL.rotation.x, 0.04);
      assert.strictEqual(model.elbowR.rotation.x, 0.04);
    }

    if (state === 'hit') {
      assert.strictEqual(model.bodyMat.emissive.getHex(), 0xff3b2f, 'Hit state should activate emissive flash');
      assert.ok(model.root.rotation.z < -0.1, 'Hit state should apply hit recoil');
    }

    if (state === 'knockdown') {
      assert.strictEqual(model.root.rotation.z, -1.45, 'Knockdown should lay flat on floor');
    }

    if (state === 'victory') {
      // Crossed sheath pose over chest
      assert.ok(model.elbowL.rotation.x > 1.8, 'Left arm tightly sheathed over chest');
      assert.ok(model.elbowR.rotation.x > 1.8, 'Right arm tightly sheathed over chest');
    }
  }
});

test('Fighter: Volt initializes with speed archetype and executes high-speed rushdown combat', () => {
  const voltConfig = getFighter('volt');
  const volt = new Fighter({ id: 'player', x: -1, facing: 1, character: voltConfig });

  assert.strictEqual(volt.style, 'fast');
  assert.strictEqual(volt.character.id, 'volt');
  assert.strictEqual(volt.character.specialName, 'Flash Rush');
  assert.ok(volt.speedMultiplier > 1.05, 'Speed archetype should provide speed boost');

  // Dash execution
  volt.update(0.016, { dashForward: true });
  assert.strictEqual(volt.state, 'dash');
  assert.ok(volt.vx > 8, 'Dash should burst forward with high velocity');

  // Flash Rush special attack execution
  volt.energy = 50;
  volt.state = 'idle';
  volt.dashTime = 0;
  const started = volt.startAction('special');
  assert.ok(started, 'Volt should start special attack');
  assert.strictEqual(volt.state, 'special');
  assert.strictEqual(volt.energy, 5); // 50 - 45 energyCost
});
