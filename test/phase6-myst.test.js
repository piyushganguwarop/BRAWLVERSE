import test from 'node:test';
import assert from 'node:assert';
import { CharacterModelBuilder } from '../src/three/CharacterModelBuilder.js';
import { Fighter } from '../src/characters/Fighter.js';
import { getFighter } from '../src/characters/roster.js';

test('CharacterModelBuilder: builds Myst with lithe ethereal proportions, porcelain half-mask, split-tail phantom duster coat, and floating holographic glyph rings', () => {
  const mystConfig = getFighter('myst');
  const model = CharacterModelBuilder.build(mystConfig);

  // 1. Verify model identity and root containers
  assert.strictEqual(model.fighterId, 'myst', 'Model identity should be myst');
  assert.ok(model.root, 'Should have root container');
  assert.ok(model.hips, 'Should have hips pivot');
  assert.ok(model.torso, 'Should have torso spine pivot');
  assert.ok(model.chest, 'Should have chest/upper torso pivot');
  assert.ok(model.head, 'Should have head pivot');

  // 2. Verify limbs & articulated joints
  assert.ok(model.shoulderL && model.elbowL && model.handL, 'Left arm should have shoulder, elbow, and open palm hand');
  assert.ok(model.shoulderR && model.elbowR && model.fistR, 'Right arm should have shoulder, elbow, and fist');
  assert.ok(model.hipJointL && model.kneeL && model.ankleL, 'Left leg should have hip, knee, and ankle');
  assert.ok(model.hipJointR && model.kneeR && model.ankleR, 'Right leg should have hip, knee, and ankle');

  // 3. Verify signature trickster props
  assert.ok(model.coatTailL && model.coatTailR, 'Hips should mount flowing split-tail phantom duster coat');
  assert.ok(model.halfMask, 'Head should mount porcelain half-mask');
  assert.ok(model.glyphRingL && model.glyphRingR, 'Forearms should mount floating holographic glyph rings');

  // 4. Verify materials & magenta / astral pink emission
  assert.ok(model.bodyMat, 'Should have body material');
  assert.ok(model.accentMat, 'Should have accent material');
  assert.ok(model.glowMat, 'Should have astral glyph emission material');
  assert.strictEqual(model.glowMat.color.getHex(), 0xFF00A0, 'Myst glyph rings and runes should emit Astral Pink');

  // 5. Verify backwards-compatibility joint aliases
  assert.strictEqual(model.armL, model.shoulderL);
  assert.strictEqual(model.armR, model.shoulderR);
  assert.strictEqual(model.legL, model.hipJointL);
  assert.strictEqual(model.legR, model.hipJointR);
});

test('CharacterModelBuilder: Myst procedural animation evaluates across all combat states with ethereal trickster attitude', () => {
  const model = CharacterModelBuilder.build({ id: 'myst' });

  const states = [
    'idle', 'walk', 'dash', 'jump', 'crouch', 'block',
    'punch', 'kick', 'heavy', 'grab', 'special',
    'hit', 'ko', 'knockdown', 'get_up', 'victory', 'defeat'
  ];

  for (const state of states) {
    const fighter = {
      id: 'myst',
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
    }, `Myst animation should evaluate cleanly for state: ${state}`);

    // Verify continuous rotation of holographic glyph rings
    assert.notStrictEqual(model.glyphRingL.rotation.z, 0, 'Left glyph ring should continuously rotate');
    assert.notStrictEqual(model.glyphRingR.rotation.z, 0, 'Right glyph ring should continuously rotate');

    // Verify Myst-specific poses
    if (state === 'idle') {
      // Floating open-palm guard with subtle bobbing
      assert.ok(model.hips.position.y > 0.94, 'Myst floating bobbing pelvis');
      assert.ok(model.elbowL.rotation.x > 1.1, 'Left open-palm guard held ready');
      assert.ok(model.elbowR.rotation.x > 1.2, 'Right open-palm guard held ready');
    }

    if (state === 'dash') {
      // Ethereal teleport glide dash
      assert.ok(model.torso.rotation.x <= -0.30, 'Myst dash forward ethereal glide');
      assert.ok(model.shoulderL.rotation.x > 0.20, 'Swept-back ethereal arms');
      assert.ok(model.shoulderR.rotation.x > 0.20, 'Swept-back ethereal arms');
    }

    if (state === 'block') {
      // Astral Barrier Glyph Shield
      assert.ok(model.shoulderL.rotation.x < -1.1, 'Left glyph shield arm raised');
      assert.ok(model.shoulderR.rotation.x < -1.1, 'Right glyph shield arm raised');
      assert.ok(model.elbowL.rotation.x > 1.5, 'Forearms aligned for glyph barrier');
      assert.ok(model.elbowR.rotation.x > 1.5, 'Forearms aligned for glyph barrier');
    }

    if (state === 'punch') {
      // Open palm astral pulse
      assert.ok(model.torso.rotation.y < -0.30, 'Torso torque on open-palm strike');
      assert.ok(model.shoulderR.rotation.x < -1.6, 'Right palm thrust forward');
    }

    if (state === 'kick') {
      // Spinning crescent sweep kick
      assert.ok(model.torso.rotation.y > 0.40, 'Spinning torso rotation on crescent sweep');
      assert.ok(model.thighR.rotation.z < -1.2, 'Right leg extended in high crescent arc');
    }

    if (state === 'heavy') {
      // Radial vortex release
      assert.ok(model.shoulderL.rotation.x < -1.8, 'Left arm raised for vortex channeling');
      assert.ok(model.shoulderR.rotation.x < -1.8, 'Right arm raised for vortex channeling');
    }

    if (state === 'special') {
      // Phantom Pulse spherical vortex burst
      assert.ok(model.torso.rotation.x <= -0.35, 'Torso arched forward for phantom burst');
      assert.ok(model.shoulderL.rotation.x < -1.7, 'Left arm projecting pulse burst');
      assert.ok(model.shoulderR.rotation.x < -1.7, 'Right arm projecting pulse burst');
    }

    if (state === 'hit') {
      assert.strictEqual(model.bodyMat.emissive.getHex(), 0xff3b2f, 'Hit state should activate emissive flash');
      assert.ok(model.root.rotation.z < -0.1, 'Hit state should apply hit recoil');
    }

    if (state === 'knockdown') {
      assert.strictEqual(model.root.rotation.z, -1.45, 'Knockdown should lay flat on floor');
    }

    if (state === 'victory') {
      // Ethereal meditative levitation
      assert.ok(model.hips.position.y > 1.05, 'Myst levitates above ground during victory');
      assert.ok(model.thighL.rotation.x > 0.5, 'Meditative lotus leg cross L');
      assert.ok(model.thighR.rotation.x > 0.5, 'Meditative lotus leg cross R');
    }
  }
});

test('Fighter: Myst initializes with technical archetype and executes phantom pulse combat', () => {
  const mystConfig = getFighter('myst');
  const myst = new Fighter({ id: 'player', x: -1, facing: 1, character: mystConfig });

  assert.strictEqual(myst.style, 'technical');
  assert.strictEqual(myst.character.id, 'myst');
  assert.strictEqual(myst.character.specialName, 'Phantom Pulse');
  assert.strictEqual(myst.speedMultiplier, 1.045, 'Technical archetype speed bonus');

  // Phantom Pulse special attack execution
  myst.energy = 50;
  myst.state = 'idle';
  const started = myst.startAction('special');
  assert.ok(started, 'Myst should start special attack');
  assert.strictEqual(myst.state, 'special');
  assert.strictEqual(myst.energy, 5); // 50 - 45 energyCost
});
