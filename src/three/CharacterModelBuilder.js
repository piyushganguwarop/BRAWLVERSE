import * as THREE from 'three';

function toonMat(color) {
  return new THREE.MeshToonMaterial({ color });
}

function boxMesh(w, h, d, mat, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function sphereMesh(r, mat, x = 0, y = 0, z = 0, seg = 14) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, seg, seg), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function cylMesh(rt, rb, h, mat, x = 0, y = 0, z = 0, seg = 10) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * CharacterModelBuilder - Reusable anime fighter construction system
 * Builds articulated anatomical hierarchies for Atlas and other fighters with 16 joint pivots.
 */
export class CharacterModelBuilder {
  static build({
    id = 'atlas',
    color = 0x1a56db,      // Cobalt blue
    accent = 0xf59e0b,     // Golden amber
    skin = 0xd49b78,       // Warm anime skin tone
    hair = 0x1e2433,       // Dark navy/charcoal hair
    style = 'balanced',
    appearance = {}
  } = {}) {
    const root = new THREE.Group();

    // 1. Materials
    const bodyMat = toonMat(color);
    const accentMat = toonMat(accent);
    const skinMat = toonMat(skin);
    const hairMat = toonMat(hair);
    const darkMat = toonMat(0x111827);
    const pantsColor = appearance.bottomColor ? Number.parseInt(String(appearance.bottomColor).replace('#', ''), 16) : 0x1f293d;
    const pantsMat = toonMat(pantsColor);
    const metalMat = toonMat(0x475569);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x00F0FF });

    const isAtlas = id === 'atlas' || !id;

    // 2. Proportions & Scaling
    const buildScale = appearance.bodyScale || 1.0;
    const isTank = style === 'tank' || style === 'power';
    const isSpeed = style === 'fast';
    const chestWidth = (isTank ? 0.78 : isSpeed ? 0.62 : 0.68) * buildScale;

    // Root -> Hips Pivot (Y = 0.95m from floor)
    const hips = new THREE.Group();
    hips.position.y = 0.98;
    root.add(hips);

    // Pelvis & Belt
    const pelvis = boxMesh(chestWidth * 0.88, 0.28, 0.36, pantsMat, 0, 0, 0);
    hips.add(pelvis);

    // Tactical Belt & Buckle
    const belt = boxMesh(chestWidth * 0.92, 0.09, 0.38, darkMat, 0, 0.11, 0);
    const buckle = boxMesh(0.14, 0.11, 0.40, accentMat, 0, 0.11, 0);
    pelvis.add(belt);
    pelvis.add(buckle);

    // Belt utility pouches
    const pouchL = boxMesh(0.10, 0.12, 0.15, metalMat, -chestWidth * 0.42, 0.08, 0.05);
    const pouchR = boxMesh(0.10, 0.12, 0.15, metalMat, chestWidth * 0.42, 0.08, 0.05);
    pelvis.add(pouchL, pouchR);

    // Torso / Spine Pivot (Y = +0.14 above hips)
    const torso = new THREE.Group();
    torso.position.set(0, 0.14, 0);
    hips.add(torso);

    // Lower Abdomen
    const absMesh = boxMesh(chestWidth * 0.82, 0.26, 0.34, bodyMat, 0, 0.13, 0);
    torso.add(absMesh);

    // Chest / Upper Torso
    const chest = new THREE.Group();
    chest.position.set(0, 0.26, 0);
    torso.add(chest);

    const chestMesh = boxMesh(chestWidth, 0.36, 0.38, bodyMat, 0, 0.18, 0);
    chest.add(chestMesh);

    // High Cybernetic Jacket Collar & Lapels
    const collarL = boxMesh(0.10, 0.22, 0.32, accentMat, -chestWidth * 0.32, 0.34, 0.02);
    collarL.rotation.z = -0.15;
    const collarR = boxMesh(0.10, 0.22, 0.32, accentMat, chestWidth * 0.32, 0.34, 0.02);
    collarR.rotation.z = 0.15;
    const collarBack = boxMesh(chestWidth * 0.68, 0.20, 0.08, accentMat, 0, 0.35, -0.16);
    chest.add(collarL, collarR, collarBack);

    // Chest accent plate & energy conduit
    const chestPlate = boxMesh(chestWidth * 0.65, 0.16, 0.04, accentMat, 0, 0.22, 0.20);
    chest.add(chestPlate);
    if (isAtlas) {
      const coreLight = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.10, 0.06), glowMat);
      coreLight.position.set(0, 0.22, 0.21);
      chest.add(coreLight);
    }

    // Neck & Head Pivot
    const neck = cylMesh(0.11, 0.13, 0.16, skinMat, 0, 0.42, 0);
    chest.add(neck);

    const head = new THREE.Group();
    head.position.set(0, 0.12, 0.02);
    neck.add(head);

    // Anime Sculpted Face Mesh
    const face = sphereMesh(0.24, skinMat, 0, 0.14, 0, 16);
    face.scale.set(0.92, 1.05, 0.98);
    head.add(face);

    // Tapered Anime Chin
    const chin = boxMesh(0.16, 0.14, 0.18, skinMat, 0, 0.02, 0.08);
    chin.rotation.x = 0.35;
    head.add(chin);

    // Stylized Anime Eyes
    const scleraMat = toonMat(0xffffff, 0.2);
    const irisColor = appearance.eyeColor ? Number.parseInt(String(appearance.eyeColor).replace('#', ''), 16) : 0x00d4ff;
    const irisMat = toonMat(irisColor, 0.2);
    const pupilMat = toonMat(0x0f172a, 0.1);

    for (const side of [-1, 1]) {
      const eyeX = side * 0.095;
      const eyeY = 0.17;
      const eyeZ = 0.21;

      // Sclera
      const sclera = boxMesh(0.065, 0.045, 0.04, scleraMat, eyeX, eyeY, eyeZ);
      sclera.rotation.y = side * 0.12;
      head.add(sclera);

      // Iris
      const iris = boxMesh(0.038, 0.038, 0.045, irisMat, eyeX, eyeY, eyeZ + 0.005);
      head.add(iris);

      // Pupil highlight
      const pupil = boxMesh(0.016, 0.016, 0.05, pupilMat, eyeX + side * 0.005, eyeY + 0.005, eyeZ + 0.008);
      head.add(pupil);

      // Expressive angled anime brow
      const brow = boxMesh(0.085, 0.024, 0.03, hairMat, eyeX, eyeY + 0.05, eyeZ + 0.01);
      brow.rotation.z = side * -0.16;
      head.add(brow);
    }

    // Anime Sculpted Hair (Multi-part volume)
    const hairGroup = new THREE.Group();
    head.add(hairGroup);

    // Base Hair Volume
    const hairBase = sphereMesh(0.26, hairMat, 0, 0.22, -0.04, 14);
    hairBase.scale.set(1.02, 0.95, 1.08);
    hairGroup.add(hairBase);

    // Dynamic Spiky Bangs & Tufts
    const spikes = [
      { x: 0, y: 0.34, z: 0.16, sx: 0.10, sy: 0.20, sz: 0.12, rx: 0.45, rz: 0 },
      { x: -0.12, y: 0.32, z: 0.14, sx: 0.09, sy: 0.18, sz: 0.10, rx: 0.35, rz: 0.28 },
      { x: 0.12, y: 0.32, z: 0.14, sx: 0.09, sy: 0.18, sz: 0.10, rx: 0.35, rz: -0.28 },
      { x: -0.20, y: 0.24, z: 0.08, sx: 0.08, sy: 0.24, sz: 0.10, rx: 0.15, rz: 0.45 },
      { x: 0.20, y: 0.24, z: 0.08, sx: 0.08, sy: 0.24, sz: 0.10, rx: 0.15, rz: -0.45 },
      { x: 0, y: 0.42, z: -0.02, sx: 0.11, sy: 0.22, sz: 0.12, rx: -0.25, rz: 0 },
      { x: -0.11, y: 0.39, z: -0.08, sx: 0.09, sy: 0.20, sz: 0.10, rx: -0.35, rz: 0.25 },
      { x: 0.11, y: 0.39, z: -0.08, sx: 0.09, sy: 0.20, sz: 0.10, rx: -0.35, rz: -0.25 }
    ];

    for (const sp of spikes) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(sp.sx, sp.sy, 5), hairMat);
      spike.position.set(sp.x, sp.y, sp.z);
      spike.rotation.set(sp.rx, 0, sp.rz);
      spike.castShadow = true;
      hairGroup.add(spike);
    }

    // -------------------------------------------------------------
    // 3. ARMS & ARTICULATED ELBOWS / GAUNTLETS
    // -------------------------------------------------------------
    // LEFT ARM (Tactical jacket sleeve & combat glove)
    const shoulderL = new THREE.Group();
    shoulderL.position.set(-chestWidth * 0.54, 0.30, 0);
    chest.add(shoulderL);

    // Shoulder pauldron armor
    const pauldronL = boxMesh(0.18, 0.14, 0.24, accentMat, -0.05, 0.04, 0);
    shoulderL.add(pauldronL);

    const upperArmL = new THREE.Group();
    shoulderL.add(upperArmL);
    upperArmL.add(cylMesh(0.10, 0.09, 0.32, bodyMat, 0, -0.16, 0));

    // Elbow Joint L
    const elbowL = new THREE.Group();
    elbowL.position.set(0, -0.32, 0);
    upperArmL.add(elbowL);

    const forearmL = new THREE.Group();
    elbowL.add(forearmL);
    forearmL.add(cylMesh(0.09, 0.08, 0.30, darkMat, 0, -0.15, 0));

    // Left Combat Glove
    const handL = boxMesh(0.13, 0.15, 0.16, accentMat, 0, -0.36, 0.02);
    forearmL.add(handL);

    // RIGHT ARM (Atlas's Heavy Cybernetic Titan Gauntlet)
    const shoulderR = new THREE.Group();
    shoulderR.position.set(chestWidth * 0.54, 0.30, 0);
    chest.add(shoulderR);

    // Reinforced pauldron on striking arm
    const pauldronR = boxMesh(0.22, 0.16, 0.26, accentMat, 0.06, 0.05, 0);
    shoulderR.add(pauldronR);

    const upperArmR = new THREE.Group();
    shoulderR.add(upperArmR);
    upperArmR.add(cylMesh(0.11, 0.10, 0.32, bodyMat, 0, -0.16, 0));

    // Elbow Joint R
    const elbowR = new THREE.Group();
    elbowR.position.set(0, -0.32, 0);
    upperArmR.add(elbowR);

    const forearmR = new THREE.Group();
    elbowR.add(forearmR);

    // TITAN ENERGY GAUNTLET
    const gauntletMesh = boxMesh(0.20, 0.34, 0.22, accentMat, 0, -0.16, 0);
    forearmR.add(gauntletMesh);

    // Energy conduits on gauntlet
    const conduitGlow = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.28, 0.23), glowMat);
    conduitGlow.position.set(0.09, -0.16, 0);
    forearmR.add(conduitGlow);

    // Heavy fist / knuckle guard
    const fistR = boxMesh(0.18, 0.18, 0.20, metalMat, 0, -0.38, 0.02);
    const knuckles = boxMesh(0.19, 0.06, 0.21, glowMat, 0, -0.42, 0.04);
    forearmR.add(fistR, knuckles);

    // -------------------------------------------------------------
    // 4. LEGS & ARTICULATED KNEES / COMBAT BOOTS
    // -------------------------------------------------------------
    // LEFT LEG
    const hipJointL = new THREE.Group();
    hipJointL.position.set(-chestWidth * 0.32, -0.12, 0);
    hips.add(hipJointL);

    const thighL = new THREE.Group();
    hipJointL.add(thighL);
    thighL.add(cylMesh(0.13, 0.11, 0.44, pantsMat, 0, -0.22, 0));

    // Knee Joint L
    const kneeL = new THREE.Group();
    kneeL.position.set(0, -0.44, 0);
    thighL.add(kneeL);

    // Protective Kneepad
    const padL = boxMesh(0.14, 0.12, 0.08, metalMat, 0, 0, 0.10);
    kneeL.add(padL);

    const shinL = new THREE.Group();
    kneeL.add(shinL);
    shinL.add(cylMesh(0.11, 0.095, 0.42, pantsMat, 0, -0.21, 0));

    // Combat High-Top Boot L
    const ankleL = new THREE.Group();
    ankleL.position.set(0, -0.42, 0);
    shinL.add(ankleL);

    const bootL = boxMesh(0.16, 0.18, 0.32, darkMat, 0, -0.09, 0.05);
    const soleL = boxMesh(0.17, 0.04, 0.34, accentMat, 0, -0.18, 0.05);
    ankleL.add(bootL, soleL);

    // RIGHT LEG
    const hipJointR = new THREE.Group();
    hipJointR.position.set(chestWidth * 0.32, -0.12, 0);
    hips.add(hipJointR);

    const thighR = new THREE.Group();
    hipJointR.add(thighR);
    thighR.add(cylMesh(0.13, 0.11, 0.44, pantsMat, 0, -0.22, 0));

    // Knee Joint R
    const kneeR = new THREE.Group();
    kneeR.position.set(0, -0.44, 0);
    thighR.add(kneeR);

    const padR = boxMesh(0.14, 0.12, 0.08, metalMat, 0, 0, 0.10);
    kneeR.add(padR);

    const shinR = new THREE.Group();
    kneeR.add(shinR);
    shinR.add(cylMesh(0.11, 0.095, 0.42, pantsMat, 0, -0.21, 0));

    // Combat High-Top Boot R
    const ankleR = new THREE.Group();
    ankleR.position.set(0, -0.42, 0);
    shinR.add(ankleR);

    const bootR = boxMesh(0.16, 0.18, 0.32, darkMat, 0, -0.09, 0.05);
    const soleR = boxMesh(0.17, 0.04, 0.34, accentMat, 0, -0.18, 0.05);
    ankleR.add(bootR, soleR);

    // Apply custom width & height scaling
    root.scale.y = appearance.heightScale || 1.0;
    root.scale.x = appearance.widthScale || 1.0;

    return {
      root,
      hips,
      torso,
      chest,
      head,
      // Left Arm
      shoulderL,
      upperArmL,
      elbowL,
      forearmL,
      handL,
      // Right Arm
      shoulderR,
      upperArmR,
      elbowR,
      forearmR,
      fistR,
      // Left Leg
      hipJointL,
      thighL,
      kneeL,
      shinL,
      ankleL,
      // Right Leg
      hipJointR,
      thighR,
      kneeR,
      shinR,
      ankleR,
      // Compatibility references for existing tests
      armL: shoulderL,
      armR: shoulderR,
      legL: hipJointL,
      legR: hipJointR,
      bodyMat,
      accentMat,
      skinMat,
      glowMat
    };
  }

  /**
   * Evaluates the coordinated procedural animation state for a fighter model
   */
  static animateFighter(model, fighter, time, dt) {
    const m = model;
    const state = fighter.blocking ? 'block' : fighter.crouching ? 'crouch' : fighter.state;
    const moving = state === 'walk' || state === 'dash';
    const airborne = fighter.y > 0.03 || state === 'jump';
    const vx = fighter.vx || 0;
    const vz = fighter.vz || 0;
    const speed = Math.hypot(vx, vz);

    // Locomotion cadence
    const gaitFreq = state === 'dash' ? 14 : moving ? 9 : 2.4;
    const gait = Math.sin(time * gaitFreq);
    const cosGait = Math.cos(time * gaitFreq);
    const pulse = Math.sin(time * 22);

    // Neutral base positions reset
    m.root.position.set(fighter.x, fighter.y, fighter.z !== undefined ? fighter.z : 0);
    m.root.rotation.y = fighter.facingAngle !== undefined ? fighter.facingAngle : (fighter.facing === 1 ? Math.PI / 2 : -Math.PI / 2);
    m.root.rotation.z = state === 'hit' ? -0.16 - Math.sin(time * 34) * 0.045 : 0;
    m.root.scale.y = fighter.crouching ? 0.76 : 1.0;

    // Reset joint rotations
    m.torso.rotation.set(0, 0, 0);
    m.chest.rotation.set(0, 0, 0);
    m.head.rotation.set(0, 0, 0);
    m.shoulderL.rotation.set(0, 0, 0);
    m.upperArmL.rotation.set(0, 0, 0);
    m.elbowL.rotation.set(0, 0, 0);
    m.shoulderR.rotation.set(0, 0, 0);
    m.upperArmR.rotation.set(0, 0, 0);
    m.elbowR.rotation.set(0, 0, 0);
    m.hipJointL.rotation.set(0, 0, 0);
    m.thighL.rotation.set(0, 0, 0);
    m.kneeL.rotation.set(0, 0, 0);
    m.ankleL.rotation.set(0, 0, 0);
    m.hipJointR.rotation.set(0, 0, 0);
    m.thighR.rotation.set(0, 0, 0);
    m.kneeR.rotation.set(0, 0, 0);
    m.ankleR.rotation.set(0, 0, 0);

    // -------------------------------------------------------------
    // STATE: IDLE (Breathing & Ready Guard)
    // -------------------------------------------------------------
    if (state === 'idle') {
      const breath = Math.sin(time * 2.4);
      m.chest.rotation.x = breath * 0.035;
      m.torso.position.y = 0.14 + breath * 0.008;

      // Relaxed martial guard
      m.shoulderL.rotation.set(-0.45, 0.18, 0.12);
      m.elbowL.rotation.x = 0.85;
      m.shoulderR.rotation.set(-0.55, -0.22, -0.14);
      m.elbowR.rotation.x = 1.05;

      // Slight spring stance
      m.thighL.rotation.x = 0.08;
      m.kneeL.rotation.x = -0.16;
      m.thighR.rotation.x = -0.06;
      m.kneeR.rotation.x = -0.12;
    }

    // -------------------------------------------------------------
    // STATE: WALK / FORWARD / BACKWARD / DEPTH STRAFE
    // -------------------------------------------------------------
    else if (state === 'walk') {
      const isBackward = (vx * (fighter.facing || 1)) < -0.1;
      const stride = isBackward ? 0.42 : 0.62;

      // Pelvis bobbing
      m.hips.position.y = 0.98 + Math.abs(cosGait) * 0.04;
      m.torso.rotation.y = -gait * 0.14; // Counter-twist

      // Left Leg stride & knee bend
      m.thighL.rotation.x = gait * stride;
      m.kneeL.rotation.x = gait > 0 ? -gait * 0.75 : -0.15; // Flex knee when lifting
      m.ankleL.rotation.x = gait > 0 ? 0.2 : -0.1;

      // Right Leg stride & knee bend
      m.thighR.rotation.x = -gait * stride;
      m.kneeR.rotation.x = gait < 0 ? gait * 0.75 : -0.15;
      m.ankleR.rotation.x = gait < 0 ? 0.2 : -0.1;

      // Counter-arm swing with bent elbows
      m.shoulderL.rotation.set(-gait * 0.55 - 0.2, 0.12, 0.10);
      m.elbowL.rotation.x = 0.65 + Math.max(0, -gait * 0.3);
      m.shoulderR.rotation.set(gait * 0.55 - 0.2, -0.12, -0.10);
      m.elbowR.rotation.x = 0.65 + Math.max(0, gait * 0.3);

      // Depth lean
      if (Math.abs(vz) > 0.1) {
        m.torso.rotation.z = (vz > 0 ? 0.12 : -0.12);
      }
    }

    // -------------------------------------------------------------
    // STATE: DASH / RUN (Forward Lean & High Drive)
    // -------------------------------------------------------------
    else if (state === 'dash') {
      m.torso.rotation.x = -0.28;
      m.chest.rotation.x = -0.12;
      m.hips.position.y = 0.88;

      // Aggressive sprinting arms
      m.shoulderL.rotation.set(-gait * 0.95 - 0.3, 0.15, 0.12);
      m.elbowL.rotation.x = 1.35;
      m.shoulderR.rotation.set(gait * 0.95 - 0.3, -0.15, -0.12);
      m.elbowR.rotation.x = 1.35;

      // High driving knees
      m.thighL.rotation.x = gait * 0.85;
      m.kneeL.rotation.x = gait > 0 ? -gait * 1.25 : -0.2;
      m.thighR.rotation.x = -gait * 0.85;
      m.kneeR.rotation.x = gait < 0 ? gait * 1.25 : -0.2;
    }

    // -------------------------------------------------------------
    // STATE: JUMP START / LOOP / LANDING
    // -------------------------------------------------------------
    else if (airborne) {
      const vy = fighter.vy || 0;
      m.torso.rotation.x = -0.14;

      if (vy > 2.0) {
        // Jump ascent
        m.shoulderL.rotation.set(-1.1, 0.25, 0.2);
        m.shoulderR.rotation.set(-1.1, -0.25, -0.2);
        m.elbowL.rotation.x = 0.45; m.elbowR.rotation.x = 0.45;
        m.thighL.rotation.x = 0.55; m.kneeL.rotation.x = -0.85;
        m.thighR.rotation.x = 0.25; m.kneeR.rotation.x = -0.45;
      } else {
        // Apex & descent
        m.shoulderL.rotation.set(-0.85, 0.3, 0.35);
        m.shoulderR.rotation.set(-0.85, -0.3, -0.35);
        m.elbowL.rotation.x = 0.55; m.elbowR.rotation.x = 0.55;
        m.thighL.rotation.x = 0.45; m.kneeL.rotation.x = -0.65;
        m.thighR.rotation.x = -0.25; m.kneeR.rotation.x = -0.75;
      }
    }

    // -------------------------------------------------------------
    // STATE: CROUCH
    // -------------------------------------------------------------
    else if (state === 'crouch' || fighter.crouching) {
      m.hips.position.y = 0.65;
      m.torso.rotation.x = 0.18;
      m.thighL.rotation.set(0.65, 0, -0.2);
      m.kneeL.rotation.x = -1.25;
      m.thighR.rotation.set(0.55, 0, 0.2);
      m.kneeR.rotation.x = -1.15;

      // Compact low guard
      m.shoulderL.rotation.set(-0.85, 0.2, 0.15);
      m.elbowL.rotation.x = 1.45;
      m.shoulderR.rotation.set(-0.95, -0.2, -0.15);
      m.elbowR.rotation.x = 1.45;
    }

    // -------------------------------------------------------------
    // STATE: BLOCK / PERFECT BLOCK
    // -------------------------------------------------------------
    else if (state === 'block' || fighter.blocking) {
      m.torso.rotation.x = -0.08;
      // Tight X-cross guard over head and chest
      m.shoulderL.rotation.set(-1.25, 0.45, 0.35);
      m.elbowL.rotation.x = 1.65;
      m.shoulderR.rotation.set(-1.25, -0.45, -0.35);
      m.elbowR.rotation.x = 1.65;

      // Braced foot stance
      m.thighL.rotation.x = 0.25; m.kneeL.rotation.x = -0.45;
      m.thighR.rotation.x = -0.35; m.kneeR.rotation.x = -0.35;

      if (fighter.perfectBlock) {
        m.elbowR.rotation.x = 0.85;
        m.elbowL.rotation.x = 0.85;
      }
    }

    // -------------------------------------------------------------
    // STATE: PUNCH (Fast Lightning Jab / Cross)
    // -------------------------------------------------------------
    else if (state === 'punch') {
      m.torso.rotation.y = -0.32; // Body torque
      m.torso.rotation.x = 0.08;
      // Striking arm snap
      m.shoulderR.rotation.set(-1.75 - pulse * 0.08, -0.12, 0);
      m.elbowR.rotation.x = 0.05; // Straight arm snap
      // Guarding left hand protecting chin
      m.shoulderL.rotation.set(-0.95, 0.35, 0.25);
      m.elbowL.rotation.x = 1.55;

      // Driving stance
      m.thighL.rotation.x = 0.35; m.kneeL.rotation.x = -0.55;
      m.thighR.rotation.x = -0.45; m.kneeR.rotation.x = -0.25;
    }

    // -------------------------------------------------------------
    // STATE: KICK (Martial Arts Roundhouse / Snap Kick)
    // -------------------------------------------------------------
    else if (state === 'kick') {
      m.torso.rotation.y = 0.45;
      m.torso.rotation.z = 0.22; // Counterbalance lean
      // Kicking leg whip
      m.thighR.rotation.set(-0.35, 0.45, -1.35 - pulse * 0.08);
      m.kneeR.rotation.x = 0.15; // Full snap extension
      // Pivot leg support
      m.thighL.rotation.set(0.18, 0, 0.12);
      m.kneeL.rotation.x = -0.45;

      // Guarding arms
      m.shoulderL.rotation.set(-0.85, 0.3, 0.25);
      m.elbowL.rotation.x = 1.15;
      m.shoulderR.rotation.set(-0.65, -0.2, -0.35);
      m.elbowR.rotation.x = 0.95;
    }

    // -------------------------------------------------------------
    // STATE: HEAVY (Titan Hammer Overhead Power Strike)
    // -------------------------------------------------------------
    else if (state === 'heavy') {
      m.torso.rotation.set(-0.25, -0.35, -0.12);
      // Overhead devastating slam
      m.shoulderR.rotation.set(-2.25 - pulse * 0.12, -0.25, 0);
      m.elbowR.rotation.x = 0.35;
      m.shoulderL.rotation.set(-1.15, 0.35, 0.25);
      m.elbowL.rotation.x = 1.35;

      m.thighL.rotation.x = 0.55; m.kneeL.rotation.x = -0.85;
      m.thighR.rotation.x = -0.45; m.kneeR.rotation.x = -0.35;
    }

    // -------------------------------------------------------------
    // STATE: GRAB
    // -------------------------------------------------------------
    else if (state === 'grab') {
      m.torso.rotation.x = -0.18;
      m.shoulderL.rotation.set(-1.45, 0.22, 0.12);
      m.elbowL.rotation.x = 0.25;
      m.shoulderR.rotation.set(-1.45, -0.22, -0.12);
      m.elbowR.rotation.x = 0.25;
      m.thighL.rotation.x = 0.35; m.kneeL.rotation.x = -0.55;
    }

    // -------------------------------------------------------------
    // STATE: SPECIAL (Titan Breaker / Aether Thrust)
    // -------------------------------------------------------------
    else if (state === 'special') {
      m.torso.rotation.set(-0.35, -0.42, 0);
      m.hips.position.y = 0.75 + Math.sin(time * 16) * 0.05;

      // Energy conduit thrust
      m.shoulderR.rotation.set(-1.95, -0.22, 0);
      m.elbowR.rotation.x = 0.02; // Rigid thrust spear
      m.shoulderL.rotation.set(0.65, 0.25, 0.2); // Swept back
      m.elbowL.rotation.x = 0.45;

      m.thighL.rotation.x = 0.75; m.kneeL.rotation.x = -1.15;
      m.thighR.rotation.x = -0.65; m.kneeR.rotation.x = -0.25;
    }

    // -------------------------------------------------------------
    // STATE: HIT REACTION
    // -------------------------------------------------------------
    else if (state === 'hit') {
      m.torso.rotation.set(0.35, Math.sin(time * 38) * 0.15, 0);
      m.head.rotation.set(-0.25, 0, Math.sin(time * 32) * 0.15);
      // Arms flailing from impact
      m.shoulderL.rotation.set(0.85, 0.35, 0.35);
      m.elbowL.rotation.x = 0.65;
      m.shoulderR.rotation.set(0.85, -0.35, -0.35);
      m.elbowR.rotation.x = 0.65;

      m.thighL.rotation.x = 0.35; m.kneeL.rotation.x = -0.45;
      m.thighR.rotation.x = -0.35; m.kneeR.rotation.x = -0.35;
    }

    // -------------------------------------------------------------
    // STATE: KO / KNOCKDOWN / DEFEAT
    // -------------------------------------------------------------
    else if (state === 'ko' || state === 'defeat') {
      m.root.rotation.z = -1.45; // Flat on floor
      m.root.position.y = 0.16;
      m.shoulderL.rotation.set(0.65, 0.2, 0);
      m.shoulderR.rotation.set(0.65, -0.2, 0);
      m.thighL.rotation.x = 0.25;
      m.thighR.rotation.x = -0.15;
    }

    // -------------------------------------------------------------
    // STATE: VICTORY
    // -------------------------------------------------------------
    else if (state === 'victory') {
      m.torso.rotation.set(-0.06, 0.18, 0);
      // Titan gauntlet raised triumphantly into the skyline
      m.shoulderR.rotation.set(-2.45, -0.15, 0.10);
      m.elbowR.rotation.x = 0.15;
      m.shoulderL.rotation.set(0.25, 0.15, 0.35);
      m.elbowL.rotation.x = 0.85;

      m.thighL.rotation.x = 0.15; m.kneeL.rotation.x = -0.25;
      m.thighR.rotation.x = -0.25; m.kneeR.rotation.x = -0.15;
    }

    // Hit flash emissive effect (preserved for test assertion: 0xff3b2f)
    const flash = fighter.hitFlash > 0;
    m.bodyMat.emissive.setHex(flash ? 0xff3b2f : 0x000000);
    m.bodyMat.emissiveIntensity = flash ? 1.45 : 0;
  }
}
