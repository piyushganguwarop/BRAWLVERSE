import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { NeonDistrictStage } from '../src/three/NeonDistrictStage.js';
import { CharacterModelBuilder } from '../src/three/CharacterModelBuilder.js';
import { audioManager } from '../src/audio/AudioManager.js';

test('NeonDistrictStage: generates rooftop geometry, neon billboards, boundary lasers, and skyline', () => {
  const scene = new THREE.Scene();
  const arenaGroup = new THREE.Group();
  scene.add(arenaGroup);

  const stage = new NeonDistrictStage(scene, arenaGroup);

  // Verification of key architectural elements
  assert.ok(arenaGroup.children.length > 5, 'Arena group should contain multiple architectural meshes');
  assert.ok(stage.boundaryBeams.length >= 4, 'Should contain at least 4 boundary laser beams');
  assert.ok(stage.hovercars.length >= 4, 'Should contain flying hovercars in sky-traffic lanes');
  assert.ok(stage.fanBlades.length >= 2, 'Should contain animated HVAC fan blades');
  assert.ok(stage.billboards.length >= 3, 'Should contain neon billboards');

  // Verify boundary pulse reaction
  const initialOpacity = stage.boundaryBeams[0].material.opacity;
  stage.pulseBoundary();
  assert.strictEqual(stage.boundaryBeams[0].material.opacity, 1.0, 'Pulse should maximize laser opacity');

  // Verify time update step (fan rotation, hovercar travel)
  const initialCarX = stage.hovercars[0].group.position.x;
  stage.update(1.0, 0.016);
  assert.notStrictEqual(stage.hovercars[0].group.position.x, initialCarX, 'Hovercars should advance along sky-lanes');

  // Verify safe disposal
  stage.dispose();
  assert.strictEqual(stage.hovercars.length, 0);
  assert.strictEqual(stage.boundaryBeams.length, 0);
});

test('CharacterModelBuilder: builds Atlas with heroic anime proportions, articulated joints, and Titan Gauntlet', () => {
  const model = CharacterModelBuilder.build({
    id: 'atlas',
    color: 0x1a56db,
    accent: 0xf59e0b,
    skin: 0xd49b78,
    hair: 0x1e2433,
    style: 'balanced'
  });

  // Verify articulated anatomical hierarchy
  assert.ok(model.root, 'Should have root container');
  assert.ok(model.hips, 'Should have hips pivot');
  assert.ok(model.torso, 'Should have torso spine pivot');
  assert.ok(model.chest, 'Should have chest/upper torso pivot');
  assert.ok(model.head, 'Should have head pivot');

  // Verify limbs & articulation joints
  assert.ok(model.shoulderL && model.elbowL && model.handL, 'Left arm should have shoulder, elbow, and hand');
  assert.ok(model.shoulderR && model.elbowR && model.fistR, 'Right arm should have shoulder, elbow, and heavy fist');
  assert.ok(model.hipJointL && model.kneeL && model.ankleL, 'Left leg should have hip, knee, and ankle');
  assert.ok(model.hipJointR && model.kneeR && model.ankleR, 'Right leg should have hip, knee, and ankle');

  // Verify materials & glowing energy conduit
  assert.ok(model.bodyMat, 'Should have body material');
  assert.ok(model.accentMat, 'Should have accent material');
  assert.ok(model.glowMat, 'Should have glowing gauntlet conduit material');
});

test('CharacterModelBuilder: procedural animation evaluates across all combat states', () => {
  const model = CharacterModelBuilder.build({ id: 'atlas' });

  const states = [
    'idle', 'walk', 'dash', 'jump', 'crouch', 'block',
    'punch', 'kick', 'heavy', 'grab', 'special',
    'hit', 'ko', 'victory', 'defeat'
  ];

  for (const state of states) {
    const fighter = {
      id: 'player',
      x: 1.5,
      y: state === 'jump' ? 1.2 : 0,
      z: 0.2,
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
      CharacterModelBuilder.animateFighter(model, fighter, 1.5, 0.016);
    }, `Should evaluate animation cleanly for state: ${state}`);

    if (state === 'hit') {
      assert.strictEqual(model.bodyMat.emissive.getHex(), 0xff3b2f, 'Hit state should activate emissive flash');
      assert.ok(model.root.rotation.z < -0.1, 'Hit state should apply hit recoil');
    }
  }
});

test('AudioManager: exposes synthesized heavy attack and dash sounds', () => {
  assert.strictEqual(typeof audioManager.playHeavy, 'function');
  assert.strictEqual(typeof audioManager.playDash, 'function');

  // Safe execution in headless/Node test environment
  assert.doesNotThrow(() => audioManager.playHeavy());
  assert.doesNotThrow(() => audioManager.playDash());
});
