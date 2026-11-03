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
 * Builds articulated anatomical hierarchies for Atlas, Volt, Rook, and Myst with joint pivots.
 */
export class CharacterModelBuilder {
  static build(config = {}) {
    const id = config.id || 'atlas';
    switch (id) {
      case 'volt':
        return this.buildVolt(config);
      case 'rook':
        return this.buildRook(config);
      case 'myst':
        return this.buildMyst(config);
      case 'atlas':
      default:
        return this.buildAtlas(config);
    }
  }

  static buildAtlas({
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
      glowMat,
      fighterId: 'atlas'
    };
  }

  /**
   * Fighter 2: Volt (The Lightning Striker)
   * Lean, aerodynamic rushdown build with swept-back hair, cyber-visor, and dual forearm plasma shock blades.
   */
  static buildVolt({
    id = 'volt',
    color = 0x9c3e36,      // Russet/Crimson
    accent = 0xf2c45e,     // Gold/Amber
    skin = 0x9b6549,       // Warm skin tone
    hair = 0x171923,       // Obsidian charcoal
    style = 'fast',
    appearance = {}
  } = {}) {
    const root = new THREE.Group();

    // 1. Materials
    const bodyMat = toonMat(color);
    const accentMat = toonMat(accent);
    const skinMat = toonMat(skin);
    const hairMat = toonMat(hair);
    const darkMat = toonMat(0x141721);
    const pantsColor = appearance.bottomColor ? Number.parseInt(String(appearance.bottomColor).replace('#', ''), 16) : 0x181c28;
    const pantsMat = toonMat(pantsColor);
    const metalMat = toonMat(0x2d3748);
    // Neon Lime / Electric plasma emission for Volt
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xA6FF00 });

    // 2. Proportions & Scaling (Lean, aerodynamic rushdown build)
    const buildScale = (appearance.bodyScale || 1.0) * 0.95;
    const chestWidth = 0.58 * buildScale;

    // Root -> Hips Pivot (Y = 0.94m from floor)
    const hips = new THREE.Group();
    hips.position.y = 0.94;
    root.add(hips);

    // Pelvis & High-Speed Belt
    const pelvis = boxMesh(chestWidth * 0.86, 0.25, 0.32, pantsMat, 0, 0, 0);
    hips.add(pelvis);

    // Aerodynamic Belt with compact power cells
    const belt = boxMesh(chestWidth * 0.90, 0.08, 0.34, darkMat, 0, 0.09, 0);
    const buckle = boxMesh(0.12, 0.10, 0.36, glowMat, 0, 0.09, 0);
    pelvis.add(belt);
    pelvis.add(buckle);

    // Energy canisters / power capacitors on hips
    const capL = cylMesh(0.045, 0.045, 0.16, metalMat, -chestWidth * 0.44, 0.05, 0);
    const capGlowL = boxMesh(0.02, 0.12, 0.10, glowMat, -chestWidth * 0.44, 0.05, 0);
    const capR = cylMesh(0.045, 0.045, 0.16, metalMat, chestWidth * 0.44, 0.05, 0);
    const capGlowR = boxMesh(0.02, 0.12, 0.10, glowMat, chestWidth * 0.44, 0.05, 0);
    pelvis.add(capL);
    pelvis.add(capGlowL);
    pelvis.add(capR);
    pelvis.add(capGlowR);

    // Torso / Spine Pivot (Y = +0.13 above hips)
    const torso = new THREE.Group();
    torso.position.set(0, 0.13, 0);
    hips.add(torso);

    // Lower Abdomen (Tapered compression suit)
    const absMesh = boxMesh(chestWidth * 0.78, 0.24, 0.30, bodyMat, 0, 0.12, 0);
    torso.add(absMesh);

    // Upper Torso / Chest
    const chest = new THREE.Group();
    chest.position.set(0, 0.24, 0);
    torso.add(chest);

    const chestMesh = boxMesh(chestWidth, 0.34, 0.34, bodyMat, 0, 0.17, 0);
    chest.add(chestMesh);

    // Aerodynamic Chevron Chest Armor & Central Conduit
    const chevronL = boxMesh(0.14, 0.20, 0.05, accentMat, -chestWidth * 0.24, 0.20, 0.18);
    chevronL.rotation.z = -0.35;
    const chevronR = boxMesh(0.14, 0.20, 0.05, accentMat, chestWidth * 0.24, 0.20, 0.18);
    chevronR.rotation.z = 0.35;
    const lightningConduit = boxMesh(0.04, 0.26, 0.06, glowMat, 0, 0.19, 0.19);
    chest.add(chevronL);
    chest.add(chevronR);
    chest.add(lightningConduit);

    // Low-profile aerodynamic collar
    const collar = boxMesh(chestWidth * 0.55, 0.10, 0.28, darkMat, 0, 0.34, -0.02);
    chest.add(collar);

    // Neck & Head Pivot
    const neck = cylMesh(0.095, 0.11, 0.15, skinMat, 0, 0.41, 0);
    chest.add(neck);

    const head = new THREE.Group();
    head.position.set(0, 0.11, 0.02);
    neck.add(head);

    // Lean Sculpted Face
    const face = sphereMesh(0.22, skinMat, 0, 0.13, 0, 16);
    face.scale.set(0.88, 1.05, 0.94);
    head.add(face);

    // Sharp aerodynamic chin
    const chin = boxMesh(0.14, 0.12, 0.16, skinMat, 0, 0.02, 0.07);
    chin.rotation.x = 0.40;
    head.add(chin);

    // Cyber Visor Goggles with glowing slit
    const visorFrame = boxMesh(0.30, 0.08, 0.10, darkMat, 0, 0.17, 0.17);
    const visorLens = boxMesh(0.26, 0.04, 0.11, glowMat, 0, 0.17, 0.18);
    head.add(visorFrame);
    head.add(visorLens);

    // Expressive angled eyebrows above visor
    for (const side of [-1, 1]) {
      const brow = boxMesh(0.08, 0.022, 0.03, hairMat, side * 0.09, 0.23, 0.19);
      brow.rotation.z = side * -0.22;
      head.add(brow);
    }

    // Swept-Back Lightning Hair (Sculpted back-slanting spikes)
    const hairGroup = new THREE.Group();
    head.add(hairGroup);

    const hairBase = sphereMesh(0.24, hairMat, 0, 0.20, -0.05, 14);
    hairBase.scale.set(0.96, 0.94, 1.10);
    hairGroup.add(hairBase);

    // Dynamic wind-swept spikes pointing backward & up
    const voltSpikes = [
      { x: 0, y: 0.32, z: -0.04, sx: 0.09, sy: 0.28, rx: -0.75, rz: 0 },
      { x: -0.10, y: 0.30, z: -0.06, sx: 0.08, sy: 0.26, rx: -0.80, rz: 0.25 },
      { x: 0.10, y: 0.30, z: -0.06, sx: 0.08, sy: 0.26, rx: -0.80, rz: -0.25 },
      { x: -0.16, y: 0.22, z: -0.08, sx: 0.07, sy: 0.24, rx: -0.85, rz: 0.40 },
      { x: 0.16, y: 0.22, z: -0.08, sx: 0.07, sy: 0.24, rx: -0.85, rz: -0.40 },
      { x: 0, y: 0.24, z: -0.16, sx: 0.08, sy: 0.28, rx: -1.05, rz: 0 },
      { x: 0, y: 0.36, z: 0.08, sx: 0.08, sy: 0.20, rx: -0.35, rz: 0 }
    ];
    for (const sp of voltSpikes) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(sp.sx, sp.sy, 5), hairMat);
      cone.position.set(sp.x, sp.y, sp.z);
      cone.rotation.set(sp.rx, 0, sp.rz);
      cone.castShadow = true;
      hairGroup.add(cone);
    }

    // -------------------------------------------------------------
    // 3. ARMS: DUAL FOREARM-MOUNTED PLASMA SHOCK BLADES
    // -------------------------------------------------------------
    // LEFT ARM
    const shoulderL = new THREE.Group();
    shoulderL.position.set(-chestWidth * 0.52, 0.28, 0);
    chest.add(shoulderL);

    const pauldronL = boxMesh(0.14, 0.12, 0.20, accentMat, -0.03, 0.03, 0);
    pauldronL.rotation.z = -0.18;
    shoulderL.add(pauldronL);

    const upperArmL = new THREE.Group();
    shoulderL.add(upperArmL);
    upperArmL.add(cylMesh(0.085, 0.08, 0.30, bodyMat, 0, -0.15, 0));

    const elbowL = new THREE.Group();
    elbowL.position.set(0, -0.30, 0);
    upperArmL.add(elbowL);

    const forearmL = new THREE.Group();
    elbowL.add(forearmL);
    forearmL.add(cylMesh(0.08, 0.075, 0.28, darkMat, 0, -0.14, 0));

    // Forearm Shock Blade Emitter L
    const emitterL = boxMesh(0.09, 0.26, 0.14, metalMat, -0.05, -0.16, 0.02);
    // Shock Blade L (Plasma edge extending past fist)
    const bladeL = boxMesh(0.03, 0.44, 0.08, glowMat, -0.07, -0.26, 0.04);
    bladeL.rotation.x = -0.15;
    forearmL.add(emitterL);
    forearmL.add(bladeL);

    // Combat Glove Hand L
    const handL = boxMesh(0.11, 0.13, 0.14, accentMat, 0, -0.32, 0.01);
    forearmL.add(handL);

    // RIGHT ARM
    const shoulderR = new THREE.Group();
    shoulderR.position.set(chestWidth * 0.52, 0.28, 0);
    chest.add(shoulderR);

    const pauldronR = boxMesh(0.14, 0.12, 0.20, accentMat, 0.03, 0.03, 0);
    pauldronR.rotation.z = 0.18;
    shoulderR.add(pauldronR);

    const upperArmR = new THREE.Group();
    shoulderR.add(upperArmR);
    upperArmR.add(cylMesh(0.085, 0.08, 0.30, bodyMat, 0, -0.15, 0));

    const elbowR = new THREE.Group();
    elbowR.position.set(0, -0.30, 0);
    upperArmR.add(elbowR);

    const forearmR = new THREE.Group();
    elbowR.add(forearmR);
    forearmR.add(cylMesh(0.08, 0.075, 0.28, darkMat, 0, -0.14, 0));

    // Forearm Shock Blade Emitter R
    const emitterR = boxMesh(0.09, 0.26, 0.14, metalMat, 0.05, -0.16, 0.02);
    // Shock Blade R (Plasma edge extending past fist)
    const bladeR = boxMesh(0.03, 0.44, 0.08, glowMat, 0.07, -0.26, 0.04);
    bladeR.rotation.x = -0.15;
    forearmR.add(emitterR);
    forearmR.add(bladeR);

    // Combat Glove Fist R
    const fistR = boxMesh(0.12, 0.13, 0.15, accentMat, 0, -0.32, 0.01);
    forearmR.add(fistR);

    // -------------------------------------------------------------
    // 4. LEGS: AERODYNAMIC SPRINT LEGS & KNEE SPIKES
    // -------------------------------------------------------------
    // LEFT LEG
    const hipJointL = new THREE.Group();
    hipJointL.position.set(-chestWidth * 0.30, -0.11, 0);
    hips.add(hipJointL);

    const thighL = new THREE.Group();
    hipJointL.add(thighL);
    thighL.add(cylMesh(0.11, 0.095, 0.42, pantsMat, 0, -0.21, 0));

    const kneeL = new THREE.Group();
    kneeL.position.set(0, -0.42, 0);
    thighL.add(kneeL);

    // Aerodynamic pointed kneepad
    const kneePadL = boxMesh(0.12, 0.10, 0.08, accentMat, 0, 0, 0.08);
    const kneeSpikeL = boxMesh(0.04, 0.08, 0.06, glowMat, 0, 0.02, 0.12);
    kneeL.add(kneePadL);
    kneeL.add(kneeSpikeL);

    const shinL = new THREE.Group();
    kneeL.add(shinL);
    shinL.add(cylMesh(0.095, 0.08, 0.40, pantsMat, 0, -0.20, 0));

    const ankleL = new THREE.Group();
    ankleL.position.set(0, -0.40, 0);
    shinL.add(ankleL);

    // High-speed sprint boot L
    const bootL = boxMesh(0.14, 0.16, 0.28, darkMat, 0, -0.08, 0.04);
    const soleL = boxMesh(0.15, 0.04, 0.30, accentMat, 0, -0.16, 0.04);
    const thrusterL = boxMesh(0.08, 0.06, 0.04, glowMat, 0, -0.06, -0.11);
    ankleL.add(bootL);
    ankleL.add(soleL);
    ankleL.add(thrusterL);

    // RIGHT LEG
    const hipJointR = new THREE.Group();
    hipJointR.position.set(chestWidth * 0.30, -0.11, 0);
    hips.add(hipJointR);

    const thighR = new THREE.Group();
    hipJointR.add(thighR);
    thighR.add(cylMesh(0.11, 0.095, 0.42, pantsMat, 0, -0.21, 0));

    const kneeR = new THREE.Group();
    kneeR.position.set(0, -0.42, 0);
    thighR.add(kneeR);

    // Aerodynamic pointed kneepad
    const kneePadR = boxMesh(0.12, 0.10, 0.08, accentMat, 0, 0, 0.08);
    const kneeSpikeR = boxMesh(0.04, 0.08, 0.06, glowMat, 0, 0.02, 0.12);
    kneeR.add(kneePadR);
    kneeR.add(kneeSpikeR);

    const shinR = new THREE.Group();
    kneeR.add(shinR);
    shinR.add(cylMesh(0.095, 0.08, 0.40, pantsMat, 0, -0.20, 0));

    const ankleR = new THREE.Group();
    ankleR.position.set(0, -0.40, 0);
    shinR.add(ankleR);

    // High-speed sprint boot R
    const bootR = boxMesh(0.14, 0.16, 0.28, darkMat, 0, -0.08, 0.04);
    const soleR = boxMesh(0.15, 0.04, 0.30, accentMat, 0, -0.16, 0.04);
    const thrusterR = boxMesh(0.08, 0.06, 0.04, glowMat, 0, -0.06, -0.11);
    ankleR.add(bootR);
    ankleR.add(soleR);
    ankleR.add(thrusterR);

    root.scale.y = appearance.heightScale || 1.0;
    root.scale.x = appearance.widthScale || 1.0;

    return {
      fighterId: 'volt',
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
      shockBladeL: bladeL,
      // Right Arm
      shoulderR,
      upperArmR,
      elbowR,
      forearmR,
      fistR,
      shockBladeR: bladeR,
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
      // Compatibility references
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
   * Fighter 3: Rook (The Iron Fortress)
   * Towering 8.0-head colossus with blast helm, crimson sensor slit, tiered pauldrons, and dual hydraulic piston fists.
   */
  static buildRook({
    id = 'rook',
    color = 0x53616f,      // Gunmetal slate
    accent = 0x9eb7c8,     // Ice cyan / steel
    skin = 0xc58a67,       // Weathered bronze skin
    hair = 0x30251f,       // Charcoal crewcut
    style = 'tank',
    appearance = {}
  } = {}) {
    const root = new THREE.Group();

    // 1. Materials
    const bodyMat = toonMat(color);
    const accentMat = toonMat(accent);
    const skinMat = toonMat(skin);
    const hairMat = toonMat(hair);
    const darkMat = toonMat(0x1a202c);
    const pantsColor = appearance.bottomColor ? Number.parseInt(String(appearance.bottomColor).replace('#', ''), 16) : 0x242d3d;
    const pantsMat = toonMat(pantsColor);
    const metalMat = toonMat(0x374151);
    // Crimson core / sensor eye emission
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xFF2040 });

    // 2. Proportions & Scaling (Towering Colossus Chassis)
    const buildScale = (appearance.bodyScale || 1.0) * 1.14;
    const chestWidth = 0.78 * buildScale;

    // Root -> Hips Pivot (Y = 1.02m from floor)
    const hips = new THREE.Group();
    hips.position.y = 1.02;
    root.add(hips);

    // Massive Pelvis & Armored Belt
    const pelvis = boxMesh(chestWidth * 0.92, 0.34, 0.44, pantsMat, 0, 0, 0);
    hips.add(pelvis);

    // Reinforced Industrial Belt
    const belt = boxMesh(chestWidth * 0.96, 0.12, 0.46, darkMat, 0, 0.12, 0);
    const buckle = boxMesh(0.20, 0.14, 0.48, metalMat, 0, 0.12, 0);
    pelvis.add(belt);
    pelvis.add(buckle);

    // Hanging Armor Tassets (Groin & Thigh plates)
    const tassetFront = boxMesh(0.22, 0.28, 0.08, accentMat, 0, -0.16, 0.22);
    const tassetL = boxMesh(0.10, 0.26, 0.24, metalMat, -chestWidth * 0.46, -0.12, 0);
    const tassetR = boxMesh(0.10, 0.26, 0.24, metalMat, chestWidth * 0.46, -0.12, 0);
    pelvis.add(tassetFront);
    pelvis.add(tassetL);
    pelvis.add(tassetR);

    // Torso / Spine Pivot (Y = +0.16 above hips)
    const torso = new THREE.Group();
    torso.position.set(0, 0.16, 0);
    hips.add(torso);

    // Abdominal Hydraulic Armor
    const absMesh = boxMesh(chestWidth * 0.86, 0.30, 0.42, darkMat, 0, 0.15, 0);
    torso.add(absMesh);

    // Heavy Upper Torso / Chest
    const chest = new THREE.Group();
    chest.position.set(0, 0.28, 0);
    torso.add(chest);

    const chestMesh = boxMesh(chestWidth, 0.42, 0.48, bodyMat, 0, 0.21, 0);
    chest.add(chestMesh);

    // Layered Fortress Chestplate & Crimson Core
    const chestPlate = boxMesh(chestWidth * 0.82, 0.26, 0.10, metalMat, 0, 0.24, 0.23);
    const reactorHousing = boxMesh(0.20, 0.20, 0.12, darkMat, 0, 0.24, 0.25);
    const reactorCore = boxMesh(0.10, 0.10, 0.14, glowMat, 0, 0.24, 0.26);
    chest.add(chestPlate);
    chest.add(reactorHousing);
    chest.add(reactorCore);

    // Heavy Industrial Neck Guard / Reinforced Collar
    const collar = boxMesh(chestWidth * 0.72, 0.22, 0.24, metalMat, 0, 0.44, -0.06);
    chest.add(collar);

    // Neck & Head Pivot
    const neck = cylMesh(0.14, 0.16, 0.18, skinMat, 0, 0.48, 0);
    chest.add(neck);

    const head = new THREE.Group();
    head.position.set(0, 0.12, 0.02);
    neck.add(head);

    // Heavy Armored Blast Helm
    const helm = boxMesh(0.32, 0.34, 0.32, metalMat, 0, 0.16, 0);
    const jawGuard = boxMesh(0.28, 0.16, 0.16, darkMat, 0, 0.06, 0.12);
    // Narrow horizontal crimson sensor slit
    const sensorSlit = boxMesh(0.24, 0.04, 0.08, glowMat, 0, 0.18, 0.15);
    const browPlate = boxMesh(0.28, 0.08, 0.10, accentMat, 0, 0.24, 0.14);
    head.add(helm);
    head.add(jawGuard);
    head.add(sensorSlit);
    head.add(browPlate);

    // -------------------------------------------------------------
    // 3. ARMS: TIERED FORTRESS PAULDRONS & DUAL HYDRAULIC PISTON FISTS
    // -------------------------------------------------------------
    // LEFT ARM
    const shoulderL = new THREE.Group();
    shoulderL.position.set(-chestWidth * 0.56, 0.34, 0);
    chest.add(shoulderL);

    // Tiered Fortress Pauldron L
    const pauldronL1 = boxMesh(0.28, 0.20, 0.34, accentMat, -0.08, 0.06, 0);
    const pauldronL2 = boxMesh(0.24, 0.10, 0.30, metalMat, -0.08, 0.16, 0);
    shoulderL.add(pauldronL1);
    shoulderL.add(pauldronL2);

    const upperArmL = new THREE.Group();
    shoulderL.add(upperArmL);
    upperArmL.add(cylMesh(0.13, 0.12, 0.36, bodyMat, 0, -0.18, 0));

    const elbowL = new THREE.Group();
    elbowL.position.set(0, -0.36, 0);
    upperArmL.add(elbowL);

    const forearmL = new THREE.Group();
    elbowL.add(forearmL);
    forearmL.add(cylMesh(0.12, 0.11, 0.32, darkMat, 0, -0.16, 0));

    // Hydraulic Piston Assembly L
    const pistonPlateL = boxMesh(0.22, 0.26, 0.22, metalMat, -0.04, -0.18, 0.03);
    const steamVentL = boxMesh(0.06, 0.10, 0.08, darkMat, -0.12, -0.12, 0.08);
    forearmL.add(pistonPlateL);
    forearmL.add(steamVentL);

    // Heavy Armored Fist L
    const handL = boxMesh(0.18, 0.18, 0.20, metalMat, 0, -0.38, 0.02);
    const knucklesL = boxMesh(0.19, 0.06, 0.21, accentMat, 0, -0.42, 0.04);
    forearmL.add(handL);
    forearmL.add(knucklesL);

    // RIGHT ARM
    const shoulderR = new THREE.Group();
    shoulderR.position.set(chestWidth * 0.56, 0.34, 0);
    chest.add(shoulderR);

    // Tiered Fortress Pauldron R
    const pauldronR1 = boxMesh(0.28, 0.20, 0.34, accentMat, 0.08, 0.06, 0);
    const pauldronR2 = boxMesh(0.24, 0.10, 0.30, metalMat, 0.08, 0.16, 0);
    shoulderR.add(pauldronR1);
    shoulderR.add(pauldronR2);

    const upperArmR = new THREE.Group();
    shoulderR.add(upperArmR);
    upperArmR.add(cylMesh(0.13, 0.12, 0.36, bodyMat, 0, -0.18, 0));

    const elbowR = new THREE.Group();
    elbowR.position.set(0, -0.36, 0);
    upperArmR.add(elbowR);

    const forearmR = new THREE.Group();
    elbowR.add(forearmR);
    forearmR.add(cylMesh(0.12, 0.11, 0.32, darkMat, 0, -0.16, 0));

    // Hydraulic Piston Assembly R
    const pistonPlateR = boxMesh(0.22, 0.26, 0.22, metalMat, 0.04, -0.18, 0.03);
    const steamVentR = boxMesh(0.06, 0.10, 0.08, darkMat, 0.12, -0.12, 0.08);
    forearmR.add(pistonPlateR);
    forearmR.add(steamVentR);

    // Heavy Armored Fist R
    const fistR = boxMesh(0.20, 0.20, 0.22, metalMat, 0, -0.38, 0.02);
    const knucklesR = boxMesh(0.21, 0.06, 0.23, accentMat, 0, -0.42, 0.04);
    forearmR.add(fistR);
    forearmR.add(knucklesR);

    // -------------------------------------------------------------
    // 4. LEGS: COLOSSUS STOMP PILLARS & HEAVY TREAD BOOTS
    // -------------------------------------------------------------
    // LEFT LEG
    const hipJointL = new THREE.Group();
    hipJointL.position.set(-chestWidth * 0.34, -0.14, 0);
    hips.add(hipJointL);

    const thighL = new THREE.Group();
    hipJointL.add(thighL);
    thighL.add(cylMesh(0.16, 0.14, 0.48, pantsMat, 0, -0.24, 0));

    const kneeL = new THREE.Group();
    kneeL.position.set(0, -0.48, 0);
    thighL.add(kneeL);

    // Fortress Kneepad Slab
    const padL = boxMesh(0.18, 0.16, 0.12, accentMat, 0, 0, 0.12);
    kneeL.add(padL);

    const shinL = new THREE.Group();
    kneeL.add(shinL);
    shinL.add(cylMesh(0.14, 0.125, 0.44, pantsMat, 0, -0.22, 0));

    const ankleL = new THREE.Group();
    ankleL.position.set(0, -0.44, 0);
    shinL.add(ankleL);

    // Heavy Colossus Stomp Boot L
    const bootL = boxMesh(0.20, 0.22, 0.36, metalMat, 0, -0.11, 0.06);
    const soleL = boxMesh(0.21, 0.06, 0.38, darkMat, 0, -0.22, 0.06);
    ankleL.add(bootL);
    ankleL.add(soleL);

    // RIGHT LEG
    const hipJointR = new THREE.Group();
    hipJointR.position.set(chestWidth * 0.34, -0.14, 0);
    hips.add(hipJointR);

    const thighR = new THREE.Group();
    hipJointR.add(thighR);
    thighR.add(cylMesh(0.16, 0.14, 0.48, pantsMat, 0, -0.24, 0));

    const kneeR = new THREE.Group();
    kneeR.position.set(0, -0.48, 0);
    thighR.add(kneeR);

    // Fortress Kneepad Slab
    const padR = boxMesh(0.18, 0.16, 0.12, accentMat, 0, 0, 0.12);
    kneeR.add(padR);

    const shinR = new THREE.Group();
    kneeR.add(shinR);
    shinR.add(cylMesh(0.14, 0.125, 0.44, pantsMat, 0, -0.22, 0));

    const ankleR = new THREE.Group();
    ankleR.position.set(0, -0.44, 0);
    shinR.add(ankleR);

    // Heavy Colossus Stomp Boot R
    const bootR = boxMesh(0.20, 0.22, 0.36, metalMat, 0, -0.11, 0.06);
    const soleR = boxMesh(0.21, 0.06, 0.38, darkMat, 0, -0.22, 0.06);
    ankleR.add(bootR);
    ankleR.add(soleR);

    root.scale.y = appearance.heightScale || 1.0;
    root.scale.x = appearance.widthScale || 1.0;

    return {
      fighterId: 'rook',
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
      pistonPlateL,
      steamVentL,
      // Right Arm
      shoulderR,
      upperArmR,
      elbowR,
      forearmR,
      fistR,
      pistonPlateR,
      steamVentR,
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
      // Compatibility references
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
   * Fighter 4: Myst (The Phantom Trickster)
   * Lithe, ethereal silhouette with porcelain half-mask, long asymmetric bangs, split-tail duster coat, and floating holographic glyph rings.
   */
  static buildMyst({
    id = 'myst',
    color = 0x6945a1,      // Phantom violet
    accent = 0x42d8c5,     // Mint cyan / astral jade
    skin = 0xdaa27c,       // Fair porcelain tone
    hair = 0x211b35,       // Deep amethyst charcoal
    style = 'technical',
    appearance = {}
  } = {}) {
    const root = new THREE.Group();

    // 1. Materials
    const bodyMat = toonMat(color);
    const accentMat = toonMat(accent);
    const skinMat = toonMat(skin);
    const hairMat = toonMat(hair);
    const darkMat = toonMat(0x1e162b);
    const maskMat = toonMat(0xf8fafc); // Porcelain white
    const pantsColor = appearance.bottomColor ? Number.parseInt(String(appearance.bottomColor).replace('#', ''), 16) : 0x221a30;
    const pantsMat = toonMat(pantsColor);
    const metalMat = toonMat(0x94a3b8);
    // Magenta / Astral Pink glow
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xFF00A0 });

    // 2. Proportions & Scaling (Lithe Ethereal Trickster)
    const buildScale = (appearance.bodyScale || 1.0) * 0.98;
    const chestWidth = 0.62 * buildScale;

    // Root -> Hips Pivot (Y = 0.96m from floor)
    const hips = new THREE.Group();
    hips.position.y = 0.96;
    root.add(hips);

    // Pelvis & Shinobi Sash (Obi)
    const pelvis = boxMesh(chestWidth * 0.88, 0.26, 0.34, pantsMat, 0, 0, 0);
    hips.add(pelvis);

    // Astral Mint Sash / Obi
    const obi = boxMesh(chestWidth * 0.92, 0.10, 0.36, accentMat, 0, 0.10, 0);
    const obiRibbon = boxMesh(0.12, 0.22, 0.06, accentMat, -0.10, 0.02, 0.20);
    pelvis.add(obi);
    pelvis.add(obiRibbon);

    // Flowing Split-Tail Phantom Duster Coat
    const coatTailL = boxMesh(0.18, 0.54, 0.04, bodyMat, -chestWidth * 0.28, -0.26, -0.16);
    coatTailL.rotation.x = 0.12;
    const coatLiningL = boxMesh(0.16, 0.52, 0.02, accentMat, -chestWidth * 0.28, -0.26, -0.14);
    coatLiningL.rotation.x = 0.12;

    const coatTailR = boxMesh(0.18, 0.54, 0.04, bodyMat, chestWidth * 0.28, -0.26, -0.16);
    coatTailR.rotation.x = 0.12;
    const coatLiningR = boxMesh(0.16, 0.52, 0.02, accentMat, chestWidth * 0.28, -0.26, -0.14);
    coatLiningR.rotation.x = 0.12;

    pelvis.add(coatTailL);
    pelvis.add(coatLiningL);
    pelvis.add(coatTailR);
    pelvis.add(coatLiningR);

    // Torso / Spine Pivot (Y = +0.14 above hips)
    const torso = new THREE.Group();
    torso.position.set(0, 0.14, 0);
    hips.add(torso);

    // Slim Upper Waist / Vest
    const absMesh = boxMesh(chestWidth * 0.80, 0.26, 0.32, darkMat, 0, 0.13, 0);
    torso.add(absMesh);

    // Upper Torso / Chest
    const chest = new THREE.Group();
    chest.position.set(0, 0.26, 0);
    torso.add(chest);

    const chestMesh = boxMesh(chestWidth, 0.36, 0.36, bodyMat, 0, 0.18, 0);
    chest.add(chestMesh);

    // High Flared Phantom Duster Collar
    const collarL = boxMesh(0.08, 0.26, 0.34, bodyMat, -chestWidth * 0.34, 0.36, 0.02);
    collarL.rotation.z = -0.22;
    const collarR = boxMesh(0.08, 0.26, 0.34, bodyMat, chestWidth * 0.34, 0.36, 0.02);
    collarR.rotation.z = 0.22;
    const collarBack = boxMesh(chestWidth * 0.65, 0.24, 0.08, bodyMat, 0, 0.37, -0.16);
    chest.add(collarL);
    chest.add(collarR);
    chest.add(collarBack);

    // Astral Chest Talisman / Rune
    const talisman = boxMesh(0.08, 0.12, 0.06, glowMat, 0, 0.22, 0.20);
    chest.add(talisman);

    // Neck & Head Pivot
    const neck = cylMesh(0.10, 0.12, 0.16, skinMat, 0, 0.42, 0);
    chest.add(neck);

    const head = new THREE.Group();
    head.position.set(0, 0.12, 0.02);
    neck.add(head);

    // Porcelain Sculpted Face
    const face = sphereMesh(0.23, skinMat, 0, 0.14, 0, 16);
    face.scale.set(0.90, 1.05, 0.96);
    head.add(face);

    // Delicate Tapered Anime Chin
    const chin = boxMesh(0.14, 0.13, 0.16, skinMat, 0, 0.02, 0.08);
    chin.rotation.x = 0.38;
    head.add(chin);

    // Porcelain Half-Mask (Right upper half of face)
    const halfMask = boxMesh(0.14, 0.17, 0.11, maskMat, 0.07, 0.16, 0.18);
    halfMask.rotation.y = -0.15;
    const maskEyeRune = boxMesh(0.07, 0.03, 0.12, glowMat, 0.08, 0.17, 0.19);
    head.add(halfMask);
    head.add(maskEyeRune);

    // Visible Left Eye (Anime Eye with Mint Iris)
    const scleraL = boxMesh(0.06, 0.045, 0.04, toonMat(0xffffff), -0.09, 0.17, 0.21);
    const irisL = boxMesh(0.036, 0.036, 0.045, toonMat(0x42d8c5), -0.09, 0.17, 0.215);
    const browL = boxMesh(0.08, 0.02, 0.03, hairMat, -0.09, 0.22, 0.21);
    browL.rotation.z = 0.14;
    head.add(scleraL);
    head.add(irisL);
    head.add(browL);

    // Sculpted Amethyst Hair with Long Asymmetric Bangs
    const hairGroup = new THREE.Group();
    head.add(hairGroup);

    const hairBase = sphereMesh(0.25, hairMat, 0, 0.22, -0.04, 14);
    hairBase.scale.set(1.0, 0.98, 1.06);
    hairGroup.add(hairBase);

    // Long Asymmetric Bangs draping down the left side
    const bangs = [
      { x: -0.12, y: 0.22, z: 0.16, sx: 0.08, sy: 0.32, sz: 0.08, rx: 0.20, rz: 0.15 },
      { x: -0.18, y: 0.12, z: 0.12, sx: 0.07, sy: 0.36, sz: 0.07, rx: 0.10, rz: 0.22 },
      { x: 0, y: 0.34, z: 0.16, sx: 0.08, sy: 0.18, sz: 0.08, rx: 0.35, rz: -0.10 },
      { x: 0.14, y: 0.32, z: 0.14, sx: 0.08, sy: 0.16, sz: 0.08, rx: 0.30, rz: -0.25 },
      { x: -0.08, y: 0.18, z: -0.18, sx: 0.10, sy: 0.44, sz: 0.10, rx: -0.25, rz: 0.10 },
      { x: 0.08, y: 0.18, z: -0.18, sx: 0.10, sy: 0.44, sz: 0.10, rx: -0.25, rz: -0.10 }
    ];
    for (const b of bangs) {
      const strand = new THREE.Mesh(new THREE.ConeGeometry(b.sx, b.sy, 5), hairMat);
      strand.position.set(b.x, b.y, b.z);
      strand.rotation.set(b.rx, 0, b.rz);
      strand.castShadow = true;
      hairGroup.add(strand);
    }

    // -------------------------------------------------------------
    // 3. ARMS & FLOATING HOLOGRAPHIC GLYPH RINGS
    // -------------------------------------------------------------
    // LEFT ARM
    const shoulderL = new THREE.Group();
    shoulderL.position.set(-chestWidth * 0.54, 0.29, 0);
    chest.add(shoulderL);

    const pauldronL = boxMesh(0.16, 0.14, 0.22, bodyMat, -0.04, 0.04, 0);
    shoulderL.add(pauldronL);

    const upperArmL = new THREE.Group();
    shoulderL.add(upperArmL);
    upperArmL.add(cylMesh(0.09, 0.085, 0.31, bodyMat, 0, -0.15, 0));

    const elbowL = new THREE.Group();
    elbowL.position.set(0, -0.31, 0);
    upperArmL.add(elbowL);

    const forearmL = new THREE.Group();
    elbowL.add(forearmL);
    forearmL.add(cylMesh(0.085, 0.08, 0.29, darkMat, 0, -0.14, 0));

    // Floating Holographic Glyph Ring L
    const glyphRingL = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.016, 6, 24), glowMat);
    glyphRingL.position.set(0, -0.22, 0);
    glyphRingL.rotation.x = Math.PI / 2;
    forearmL.add(glyphRingL);

    // Open Palm Strike Hand L
    const handL = boxMesh(0.11, 0.14, 0.14, skinMat, 0, -0.33, 0.01);
    forearmL.add(handL);

    // RIGHT ARM
    const shoulderR = new THREE.Group();
    shoulderR.position.set(chestWidth * 0.54, 0.29, 0);
    chest.add(shoulderR);

    const pauldronR = boxMesh(0.16, 0.14, 0.22, bodyMat, 0.04, 0.04, 0);
    shoulderR.add(pauldronR);

    const upperArmR = new THREE.Group();
    shoulderR.add(upperArmR);
    upperArmR.add(cylMesh(0.09, 0.085, 0.31, bodyMat, 0, -0.15, 0));

    const elbowR = new THREE.Group();
    elbowR.position.set(0, -0.31, 0);
    upperArmR.add(elbowR);

    const forearmR = new THREE.Group();
    elbowR.add(forearmR);
    forearmR.add(cylMesh(0.085, 0.08, 0.29, darkMat, 0, -0.14, 0));

    // Floating Holographic Glyph Ring R
    const glyphRingR = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.016, 6, 24), glowMat);
    glyphRingR.position.set(0, -0.22, 0);
    glyphRingR.rotation.x = Math.PI / 2;
    forearmR.add(glyphRingR);

    // Open Palm Strike Fist R
    const fistR = boxMesh(0.11, 0.14, 0.14, skinMat, 0, -0.33, 0.01);
    forearmR.add(fistR);

    // -------------------------------------------------------------
    // 4. LEGS & SLEEK ASTRAL COMBAT SLIPPERS
    // -------------------------------------------------------------
    // LEFT LEG
    const hipJointL = new THREE.Group();
    hipJointL.position.set(-chestWidth * 0.31, -0.12, 0);
    hips.add(hipJointL);

    const thighL = new THREE.Group();
    hipJointL.add(thighL);
    thighL.add(cylMesh(0.12, 0.10, 0.43, pantsMat, 0, -0.21, 0));

    const kneeL = new THREE.Group();
    kneeL.position.set(0, -0.43, 0);
    thighL.add(kneeL);

    const padL = boxMesh(0.13, 0.11, 0.08, darkMat, 0, 0, 0.09);
    kneeL.add(padL);

    const shinL = new THREE.Group();
    kneeL.add(shinL);
    shinL.add(cylMesh(0.10, 0.09, 0.41, pantsMat, 0, -0.20, 0));

    const ankleL = new THREE.Group();
    ankleL.position.set(0, -0.41, 0);
    shinL.add(ankleL);

    // Astral Combat Slipper L
    const bootL = boxMesh(0.14, 0.15, 0.28, darkMat, 0, -0.08, 0.04);
    const soleL = boxMesh(0.15, 0.03, 0.30, accentMat, 0, -0.16, 0.04);
    ankleL.add(bootL);
    ankleL.add(soleL);

    // RIGHT LEG
    const hipJointR = new THREE.Group();
    hipJointR.position.set(chestWidth * 0.31, -0.12, 0);
    hips.add(hipJointR);

    const thighR = new THREE.Group();
    hipJointR.add(thighR);
    thighR.add(cylMesh(0.12, 0.10, 0.43, pantsMat, 0, -0.21, 0));

    const kneeR = new THREE.Group();
    kneeR.position.set(0, -0.43, 0);
    thighR.add(kneeR);

    const padR = boxMesh(0.13, 0.11, 0.08, darkMat, 0, 0, 0.09);
    kneeR.add(padR);

    const shinR = new THREE.Group();
    kneeR.add(shinR);
    shinR.add(cylMesh(0.10, 0.09, 0.41, pantsMat, 0, -0.20, 0));

    const ankleR = new THREE.Group();
    ankleR.position.set(0, -0.41, 0);
    shinR.add(ankleR);

    // Astral Combat Slipper R
    const bootR = boxMesh(0.14, 0.15, 0.28, darkMat, 0, -0.08, 0.04);
    const soleR = boxMesh(0.15, 0.03, 0.30, accentMat, 0, -0.16, 0.04);
    ankleR.add(bootR);
    ankleR.add(soleR);

    root.scale.y = appearance.heightScale || 1.0;
    root.scale.x = appearance.widthScale || 1.0;

    return {
      fighterId: 'myst',
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
      glyphRingL,
      // Right Arm
      shoulderR,
      upperArmR,
      elbowR,
      forearmR,
      fistR,
      glyphRingR,
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
      // Props
      coatTailL,
      coatTailR,
      halfMask,
      // Compatibility references
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
  /**
   * Evaluates the coordinated procedural animation state for a fighter model
   */
  static animateFighter(model, fighter, time, dt) {
    const m = model;
    const fighterId = m.fighterId || fighter.character?.id || fighter.id || 'atlas';
    const isVolt = fighterId === 'volt';
    const isRook = fighterId === 'rook';
    const isMyst = fighterId === 'myst';
    const state = fighter.blocking ? 'block' : fighter.crouching ? 'crouch' : fighter.state;
    const moving = state === 'walk' || state === 'dash';
    const airborne = fighter.y > 0.03 || state === 'jump';
    const vx = fighter.vx || 0;
    const vz = fighter.vz || 0;
    const speed = Math.hypot(vx, vz);

    // Rotate floating holographic glyph rings for Myst
    if (m.glyphRingL) m.glyphRingL.rotation.z = time * 3.5;
    if (m.glyphRingR) m.glyphRingR.rotation.z = -time * 3.5;

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
      if (isRook) {
        const breath = Math.sin(time * 1.6);
        m.hips.position.y = 1.00;
        m.chest.rotation.x = breath * 0.025;
        m.torso.position.y = 0.16 + breath * 0.005;

        // Immovable wide sumo plant
        m.thighL.rotation.set(0.12, 0, -0.22);
        m.kneeL.rotation.x = -0.24;
        m.thighR.rotation.set(0.12, 0, 0.22);
        m.kneeR.rotation.x = -0.24;

        // Heavy hydraulic piston arms held wide
        m.shoulderL.rotation.set(-0.50, 0.35, 0.28);
        m.elbowL.rotation.x = 1.10;
        m.shoulderR.rotation.set(-0.50, -0.35, -0.28);
        m.elbowR.rotation.x = 1.10;
      } else if (isVolt) {
        const breath = Math.sin(time * 3.2);
        m.chest.rotation.x = breath * 0.04;
        m.torso.position.y = 0.12 + breath * 0.008;
        m.torso.rotation.x = -0.12; // Forward predatory lean

        // Ready guard with dual shock blades pointing forward
        m.shoulderL.rotation.set(-0.65, 0.28, 0.22);
        m.elbowL.rotation.x = 1.35;
        m.shoulderR.rotation.set(-0.75, -0.28, -0.22);
        m.elbowR.rotation.x = 1.45;

        m.thighL.rotation.x = 0.14;
        m.kneeL.rotation.x = -0.28;
        m.thighR.rotation.x = -0.12;
        m.kneeR.rotation.x = -0.22;
      } else if (isMyst) {
        const breath = Math.sin(time * 2.0);
        m.hips.position.y = 0.96 + breath * 0.02; // Subtle floating bob
        m.chest.rotation.x = breath * 0.03;
        m.torso.rotation.x = -0.04;

        // Floating open-palm guard
        m.shoulderL.rotation.set(-0.60, 0.22, 0.15);
        m.elbowL.rotation.x = 1.25;
        m.shoulderR.rotation.set(-0.70, -0.22, -0.15);
        m.elbowR.rotation.x = 1.35;

        m.thighL.rotation.set(0.08, 0, -0.08);
        m.kneeL.rotation.x = -0.18;
        m.thighR.rotation.set(-0.04, 0, 0.08);
        m.kneeR.rotation.x = -0.14;
      } else {
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
    }

    // -------------------------------------------------------------
    // STATE: WALK / FORWARD / BACKWARD / DEPTH STRAFE
    // -------------------------------------------------------------
    else if (state === 'walk') {
      const isBackward = (vx * (fighter.facing || 1)) < -0.1;
      const stride = isBackward ? 0.42 : 0.62;

      // Pelvis bobbing
      m.hips.position.y = (isRook ? 1.02 : isVolt ? 0.94 : isMyst ? 0.96 : 0.98) + Math.abs(cosGait) * 0.04;
      m.torso.rotation.y = -gait * 0.14; // Counter-twist
      if (isRook) {
        m.torso.rotation.z = Math.sin(time * 6) * 0.08; // Heavy rocking sway
        m.thighL.rotation.x = gait * 0.48;
        m.kneeL.rotation.x = gait > 0 ? -gait * 0.55 : -0.15;
        m.thighR.rotation.x = -gait * 0.48;
        m.kneeR.rotation.x = gait < 0 ? gait * 0.55 : -0.15;

        m.shoulderL.rotation.set(-gait * 0.45 - 0.2, 0.20, 0.18);
        m.elbowL.rotation.x = 0.85;
        m.shoulderR.rotation.set(gait * 0.45 - 0.2, -0.20, -0.18);
        m.elbowR.rotation.x = 0.85;
      } else if (isVolt) {
        m.torso.rotation.x = -0.16;
        m.thighL.rotation.x = gait * 0.72;
        m.kneeL.rotation.x = gait > 0 ? -gait * 0.95 : -0.15;
        m.ankleL.rotation.x = gait > 0 ? 0.2 : -0.1;

        m.thighR.rotation.x = -gait * 0.72;
        m.kneeR.rotation.x = gait < 0 ? gait * 0.95 : -0.15;
        m.ankleR.rotation.x = gait < 0 ? 0.2 : -0.1;

        m.shoulderL.rotation.set(-gait * 0.65 - 0.35, 0.22, 0.15);
        m.elbowL.rotation.x = 1.15;
        m.shoulderR.rotation.set(gait * 0.65 - 0.35, -0.22, -0.15);
        m.elbowR.rotation.x = 1.15;
      } else if (isMyst) {
        m.thighL.rotation.x = gait * 0.55;
        m.kneeL.rotation.x = gait > 0 ? -gait * 0.65 : -0.15;
        m.thighR.rotation.x = -gait * 0.55;
        m.kneeR.rotation.x = gait < 0 ? gait * 0.65 : -0.15;

        m.shoulderL.rotation.set(-gait * 0.45 - 0.20, 0.15, 0.12);
        m.elbowL.rotation.x = 0.95;
        m.shoulderR.rotation.set(gait * 0.45 - 0.20, -0.15, -0.12);
        m.elbowR.rotation.x = 0.95;
      } else {
        m.thighL.rotation.x = gait * stride;
        m.kneeL.rotation.x = gait > 0 ? -gait * 0.75 : -0.15;
        m.ankleL.rotation.x = gait > 0 ? 0.2 : -0.1;

        m.thighR.rotation.x = -gait * stride;
        m.kneeR.rotation.x = gait < 0 ? gait * 0.75 : -0.15;
        m.ankleR.rotation.x = gait < 0 ? 0.2 : -0.1;

        m.shoulderL.rotation.set(-gait * 0.55 - 0.2, 0.12, 0.10);
        m.elbowL.rotation.x = 0.65 + Math.max(0, -gait * 0.3);
        m.shoulderR.rotation.set(gait * 0.55 - 0.2, -0.12, -0.10);
        m.elbowR.rotation.x = 0.65 + Math.max(0, gait * 0.3);
      }

      // Depth lean
      if (Math.abs(vz) > 0.1) {
        m.torso.rotation.z = (vz > 0 ? 0.12 : -0.12);
      }
    }

    // -------------------------------------------------------------
    // STATE: DASH / RUN (Forward Lean & High Drive)
    // -------------------------------------------------------------
    else if (state === 'dash') {
      if (isRook) {
        // Heavy hydraulic bull charge
        m.torso.rotation.x = -0.32;
        m.hips.position.y = 0.88;
        m.shoulderL.rotation.set(-1.15, 0.30, 0.20);
        m.elbowL.rotation.x = 1.45;
        m.shoulderR.rotation.set(-1.15, -0.30, -0.20);
        m.elbowR.rotation.x = 1.45;
        m.thighL.rotation.x = gait * 0.70;
        m.kneeL.rotation.x = gait > 0 ? -gait * 1.05 : -0.20;
        m.thighR.rotation.x = -gait * 0.70;
        m.kneeR.rotation.x = gait < 0 ? gait * 1.05 : -0.20;
      } else if (isVolt) {
        m.torso.rotation.x = -0.38;
        m.chest.rotation.x = -0.18;
        m.hips.position.y = 0.82;

        // Swept-back jet-wing arms
        m.shoulderL.rotation.set(0.65 - gait * 0.3, 0.25, 0.35);
        m.elbowL.rotation.x = 0.35;
        m.shoulderR.rotation.set(0.65 + gait * 0.3, -0.25, -0.35);
        m.elbowR.rotation.x = 0.35;

        m.thighL.rotation.x = gait * 0.95;
        m.kneeL.rotation.x = gait > 0 ? -gait * 1.45 : -0.25;
        m.thighR.rotation.x = -gait * 0.95;
        m.kneeR.rotation.x = gait < 0 ? gait * 1.45 : -0.25;
      } else if (isMyst) {
        m.torso.rotation.x = -0.32;
        m.hips.position.y = 0.86;
        m.shoulderL.rotation.set(0.55 - gait * 0.25, 0.20, 0.25);
        m.elbowL.rotation.x = 0.45;
        m.shoulderR.rotation.set(0.55 + gait * 0.25, -0.20, -0.25);
        m.elbowR.rotation.x = 0.45;
        m.thighL.rotation.x = gait * 0.80;
        m.kneeL.rotation.x = gait > 0 ? -gait * 1.15 : -0.20;
        m.thighR.rotation.x = -gait * 0.80;
        m.kneeR.rotation.x = gait < 0 ? gait * 1.15 : -0.20;
      } else {
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
      if (isRook) {
        m.hips.position.y = 0.68;
        m.torso.rotation.x = 0.22;
        m.thighL.rotation.set(0.60, 0, -0.30);
        m.kneeL.rotation.x = -1.15;
        m.thighR.rotation.set(0.60, 0, 0.30);
        m.kneeR.rotation.x = -1.15;

        // Heavy fortress shield guard
        m.shoulderL.rotation.set(-0.95, 0.25, 0.20);
        m.elbowL.rotation.x = 1.55;
        m.shoulderR.rotation.set(-0.95, -0.25, -0.20);
        m.elbowR.rotation.x = 1.55;
      } else if (isVolt) {
        m.hips.position.y = 0.58;
        m.torso.rotation.x = 0.25;
        m.thighL.rotation.set(0.75, 0, -0.25);
        m.kneeL.rotation.x = -1.35;
        m.thighR.rotation.set(0.65, 0, 0.25);
        m.kneeR.rotation.x = -1.25;

        // Low predatory blade guard
        m.shoulderL.rotation.set(-1.15, 0.30, 0.20);
        m.elbowL.rotation.x = 1.65;
        m.shoulderR.rotation.set(-0.45, -0.15, 0);
        m.elbowR.rotation.x = 0.55;
      } else if (isMyst) {
        m.hips.position.y = 0.62;
        m.torso.rotation.x = 0.18;
        m.thighL.rotation.set(0.65, 0, -0.18);
        m.kneeL.rotation.x = -1.25;
        m.thighR.rotation.set(0.55, 0, 0.18);
        m.kneeR.rotation.x = -1.15;
        m.shoulderL.rotation.set(-0.90, 0.22, 0.15);
        m.elbowL.rotation.x = 1.45;
        m.shoulderR.rotation.set(-0.90, -0.22, -0.15);
        m.elbowR.rotation.x = 1.45;
      } else {
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
    }

    // -------------------------------------------------------------
    // STATE: BLOCK / PERFECT BLOCK
    // -------------------------------------------------------------
    else if (state === 'block' || fighter.blocking) {
      if (isRook) {
        // Twin Buckler Fortress Shield Lock (#IronWall)
        m.torso.rotation.x = -0.05;
        m.shoulderL.rotation.set(-1.20, 0.25, 0.10);
        m.elbowL.rotation.x = 1.55;
        m.shoulderR.rotation.set(-1.20, -0.25, -0.10);
        m.elbowR.rotation.x = 1.55;

        m.thighL.rotation.set(0.20, 0, -0.25);
        m.kneeL.rotation.x = -0.35;
        m.thighR.rotation.set(-0.30, 0, 0.25);
        m.kneeR.rotation.x = -0.35;
      } else if (isVolt) {
        m.torso.rotation.x = -0.06;
        // Crossed shock-blade defensive parry (X-guard)
        m.shoulderL.rotation.set(-1.35, 0.55, 0.45);
        m.elbowL.rotation.x = 1.75;
        m.shoulderR.rotation.set(-1.35, -0.55, -0.45);
        m.elbowR.rotation.x = 1.75;

        m.thighL.rotation.x = 0.30; m.kneeL.rotation.x = -0.50;
        m.thighR.rotation.x = -0.30; m.kneeR.rotation.x = -0.30;
      } else if (isMyst) {
        // Astral Barrier Glyph Shield
        m.torso.rotation.x = -0.06;
        m.shoulderL.rotation.set(-1.30, 0.40, 0.30);
        m.elbowL.rotation.x = 1.70;
        m.shoulderR.rotation.set(-1.30, -0.40, -0.30);
        m.elbowR.rotation.x = 1.70;

        m.thighL.rotation.x = 0.25; m.kneeL.rotation.x = -0.45;
        m.thighR.rotation.x = -0.30; m.kneeR.rotation.x = -0.35;
      } else {
        m.torso.rotation.x = -0.08;
        // Tight X-cross guard over head and chest
        m.shoulderL.rotation.set(-1.25, 0.45, 0.35);
        m.elbowL.rotation.x = 1.65;
        m.shoulderR.rotation.set(-1.25, -0.45, -0.35);
        m.elbowR.rotation.x = 1.65;

        // Braced foot stance
        m.thighL.rotation.x = 0.25; m.kneeL.rotation.x = -0.45;
        m.thighR.rotation.x = -0.35; m.kneeR.rotation.x = -0.35;
      }

      if (fighter.perfectBlock) {
        m.elbowR.rotation.x = 0.85;
        m.elbowL.rotation.x = 0.85;
      }
    }

    // -------------------------------------------------------------
    // STATE: PUNCH (Fast Lightning Jab / Heavy Piston Strike / Astral Pulse)
    // -------------------------------------------------------------
    else if (state === 'punch') {
      if (isRook) {
        // Heavy armored backhand / piston strike
        m.torso.rotation.y = -0.42;
        m.shoulderR.rotation.set(-1.65 - pulse * 0.06, -0.15, 0);
        m.elbowR.rotation.x = 0.12;
        m.shoulderL.rotation.set(-0.75, 0.35, 0.25);
        m.elbowL.rotation.x = 1.35;

        m.thighL.rotation.x = 0.40; m.kneeL.rotation.x = -0.60;
        m.thighR.rotation.x = -0.45; m.kneeR.rotation.x = -0.30;
      } else if (isVolt) {
        m.torso.rotation.y = -0.38;
        m.shoulderR.rotation.set(-1.85 - pulse * 0.08, -0.08, 0);
        m.elbowR.rotation.x = 0.02; // Rigid thrust shock-blade snap
        m.shoulderL.rotation.set(-1.15, 0.30, 0.25);
        m.elbowL.rotation.x = 1.65;

        m.thighL.rotation.x = 0.40; m.kneeL.rotation.x = -0.60;
        m.thighR.rotation.x = -0.40; m.kneeR.rotation.x = -0.20;
      } else if (isMyst) {
        // Open palm astral pulse
        m.torso.rotation.y = -0.35;
        m.shoulderR.rotation.set(-1.80 - pulse * 0.08, -0.10, 0);
        m.elbowR.rotation.x = 0.05;
        m.shoulderL.rotation.set(-0.90, 0.30, 0.20);
        m.elbowL.rotation.x = 1.45;

        m.thighL.rotation.x = 0.35; m.kneeL.rotation.x = -0.55;
        m.thighR.rotation.x = -0.40; m.kneeR.rotation.x = -0.25;
      } else {
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
    }

    // -------------------------------------------------------------
    // STATE: KICK (Martial Arts Roundhouse / Knee Breaker / Crescent Sweep)
    // -------------------------------------------------------------
    else if (state === 'kick') {
      if (isRook) {
        // Devastating knee/shin breaker stomp
        m.torso.rotation.set(0.15, 0.25, 0.12);
        m.thighR.rotation.set(-0.25, 0.25, -0.95 - pulse * 0.06);
        m.kneeR.rotation.x = 0.25;
        m.thighL.rotation.set(0.12, 0, 0.15);
        m.kneeL.rotation.x = -0.40;

        m.shoulderL.rotation.set(-0.75, 0.30, 0.20);
        m.elbowL.rotation.x = 1.05;
        m.shoulderR.rotation.set(-0.55, -0.20, -0.25);
        m.elbowR.rotation.x = 0.85;
      } else if (isVolt) {
        m.torso.rotation.y = 0.55;
        m.torso.rotation.z = 0.28;
        m.thighR.rotation.set(-0.40, 0.50, -1.45 - pulse * 0.08);
        m.kneeR.rotation.x = 0.20; // Full snap extension
        m.thighL.rotation.set(0.20, 0, 0.15);
        m.kneeL.rotation.x = -0.50;

        m.shoulderL.rotation.set(-0.95, 0.35, 0.25);
        m.elbowL.rotation.x = 1.25;
        m.shoulderR.rotation.set(-0.75, -0.25, -0.35);
        m.elbowR.rotation.x = 1.05;
      } else if (isMyst) {
        // Spinning crescent sweep kick
        m.torso.rotation.y = 0.50;
        m.torso.rotation.z = 0.25;
        m.thighR.rotation.set(-0.35, 0.45, -1.40 - pulse * 0.08);
        m.kneeR.rotation.x = 0.18;
        m.thighL.rotation.set(0.18, 0, 0.12);
        m.kneeL.rotation.x = -0.45;

        m.shoulderL.rotation.set(-0.85, 0.30, 0.22);
        m.elbowL.rotation.x = 1.20;
        m.shoulderR.rotation.set(-0.70, -0.20, -0.30);
        m.elbowR.rotation.x = 1.00;
      } else {
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
    }

    // -------------------------------------------------------------
    // STATE: HEAVY (Titan Hammer / Leaping X-Slash / Sledgehammer / Vortex)
    // -------------------------------------------------------------
    else if (state === 'heavy') {
      if (isRook) {
        // Two-Handed Sledgehammer Slam (ground bounce)
        m.torso.rotation.set(-0.35, 0, 0);
        m.shoulderL.rotation.set(-2.25 - pulse * 0.10, 0.15, 0);
        m.elbowL.rotation.x = 0.30;
        m.shoulderR.rotation.set(-2.25 - pulse * 0.10, -0.15, 0);
        m.elbowR.rotation.x = 0.30;

        m.thighL.rotation.x = 0.65; m.kneeL.rotation.x = -0.95;
        m.thighR.rotation.x = -0.55; m.kneeR.rotation.x = -0.45;
      } else if (isVolt) {
        m.torso.rotation.set(-0.35, 0, 0);
        // Leaping dual-blade X-slash downward
        m.shoulderL.rotation.set(-1.95 - pulse * 0.1, 0.45, -0.25);
        m.elbowL.rotation.x = 0.45;
        m.shoulderR.rotation.set(-1.95 - pulse * 0.1, -0.45, 0.25);
        m.elbowR.rotation.x = 0.45;

        m.thighL.rotation.x = 0.65; m.kneeL.rotation.x = -0.95;
        m.thighR.rotation.x = -0.50; m.kneeR.rotation.x = -0.40;
      } else if (isMyst) {
        // Radial vortex release
        m.torso.rotation.set(-0.28, 0, 0);
        m.shoulderL.rotation.set(-2.05 - pulse * 0.10, 0.35, 0);
        m.elbowL.rotation.x = 0.40;
        m.shoulderR.rotation.set(-2.05 - pulse * 0.10, -0.35, 0);
        m.elbowR.rotation.x = 0.40;

        m.thighL.rotation.x = 0.60; m.kneeL.rotation.x = -0.85;
        m.thighR.rotation.x = -0.45; m.kneeR.rotation.x = -0.35;
      } else {
        m.torso.rotation.set(-0.25, -0.35, -0.12);
        // Overhead devastating slam
        m.shoulderR.rotation.set(-2.25 - pulse * 0.12, -0.25, 0);
        m.elbowR.rotation.x = 0.35;
        m.shoulderL.rotation.set(-1.15, 0.35, 0.25);
        m.elbowL.rotation.x = 1.35;

        m.thighL.rotation.x = 0.55; m.kneeL.rotation.x = -0.85;
        m.thighR.rotation.x = -0.45; m.kneeR.rotation.x = -0.35;
      }
    }

    // -------------------------------------------------------------
    // STATE: GRAB
    // -------------------------------------------------------------
    else if (state === 'grab') {
      if (isRook) {
        // Colossus bear-hug crush
        m.torso.rotation.x = -0.15;
        m.shoulderL.rotation.set(-1.35, 0.40, 0.20);
        m.elbowL.rotation.x = 0.50;
        m.shoulderR.rotation.set(-1.35, -0.40, -0.20);
        m.elbowR.rotation.x = 0.50;
        m.thighL.rotation.x = 0.30; m.kneeL.rotation.x = -0.45;
      } else if (isVolt) {
        m.torso.rotation.x = -0.18;
        m.shoulderL.rotation.set(-1.55, 0.25, 0.15);
        m.elbowL.rotation.x = 0.20;
        m.shoulderR.rotation.set(-1.55, -0.25, -0.15);
        m.elbowR.rotation.x = 0.20;
        m.thighL.rotation.x = 0.40; m.kneeL.rotation.x = -0.60;
      } else if (isMyst) {
        m.torso.rotation.x = -0.16;
        m.shoulderL.rotation.set(-1.40, 0.25, 0.12);
        m.elbowL.rotation.x = 0.25;
        m.shoulderR.rotation.set(-1.40, -0.25, -0.12);
        m.elbowR.rotation.x = 0.25;
        m.thighL.rotation.x = 0.30; m.kneeL.rotation.x = -0.50;
      } else {
        m.torso.rotation.x = -0.18;
        m.shoulderL.rotation.set(-1.45, 0.22, 0.12);
        m.elbowL.rotation.x = 0.25;
        m.shoulderR.rotation.set(-1.45, -0.22, -0.12);
        m.elbowR.rotation.x = 0.25;
        m.thighL.rotation.x = 0.35; m.kneeL.rotation.x = -0.55;
      }
    }

    // -------------------------------------------------------------
    // STATE: SPECIAL (Titan Breaker / Flash Rush / Iron Fortress / Phantom Pulse)
    // -------------------------------------------------------------
    else if (state === 'special') {
      if (isRook) {
        // Iron Fortress - Seismic Shockwave Ground-Pound
        m.torso.rotation.set(-0.55, 0, 0);
        m.hips.position.y = 0.62;
        m.shoulderL.rotation.set(-1.35, 0.15, 0);
        m.elbowL.rotation.x = 0.15;
        m.shoulderR.rotation.set(-1.35, -0.15, 0);
        m.elbowR.rotation.x = 0.15;

        m.thighL.rotation.set(0.85, 0, -0.30);
        m.kneeL.rotation.x = -1.35;
        m.thighR.rotation.set(0.85, 0, 0.30);
        m.kneeR.rotation.x = -1.35;
      } else if (isVolt) {
        // Flash Rush - High-speed dual-blade sonic thrust
        m.torso.rotation.set(-0.45, 0, 0);
        m.hips.position.y = 0.70;
        m.shoulderL.rotation.set(-1.90, 0.18, 0.08);
        m.elbowL.rotation.x = 0.04;
        m.shoulderR.rotation.set(-1.90, -0.18, -0.08);
        m.elbowR.rotation.x = 0.04;

        m.thighL.rotation.x = 0.85; m.kneeL.rotation.x = -1.25;
        m.thighR.rotation.x = -0.75; m.kneeR.rotation.x = -0.25;
      } else if (isMyst) {
        // Phantom Pulse - Spherical vortex burst
        m.torso.rotation.set(-0.40, 0, 0);
        m.hips.position.y = 0.78;
        m.shoulderL.rotation.set(-1.85, 0.30, 0.15);
        m.elbowL.rotation.x = 0.10;
        m.shoulderR.rotation.set(-1.85, -0.30, -0.15);
        m.elbowR.rotation.x = 0.10;

        m.thighL.rotation.x = 0.75; m.kneeL.rotation.x = -1.15;
        m.thighR.rotation.x = -0.70; m.kneeR.rotation.x = -0.25;
      } else {
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
    else if (state === 'ko' || state === 'defeat' || state === 'knockdown') {
      m.root.rotation.z = -1.45; // Flat on floor
      m.root.position.y = 0.16;
      m.shoulderL.rotation.set(0.65, 0.2, 0);
      m.shoulderR.rotation.set(0.65, -0.2, 0);
      m.thighL.rotation.x = 0.25;
      m.thighR.rotation.x = -0.15;
    }

    // -------------------------------------------------------------
    // STATE: GET_UP (Rising transition from floor to grounded stance)
    // -------------------------------------------------------------
    else if (state === 'get_up') {
      const getUpProgress = Math.min(1, Math.max(0, 1 - (fighter.actionTime || 0) / 0.28));
      m.root.rotation.z = -1.45 * (1 - getUpProgress);
      m.root.position.y = 0.16 * (1 - getUpProgress);
      m.torso.rotation.x = -0.22 * (1 - getUpProgress);
      m.kneeL.rotation.x = -0.55 * (1 - getUpProgress);
      m.kneeR.rotation.x = -0.55 * (1 - getUpProgress);
      m.shoulderL.rotation.set(-0.35 * (1 - getUpProgress), 0.2, 0);
      m.shoulderR.rotation.set(-0.35 * (1 - getUpProgress), -0.2, 0);
    }

    // -------------------------------------------------------------
    // STATE: VICTORY
    // -------------------------------------------------------------
    else if (state === 'victory') {
      if (isRook) {
        // Double chest-pound with hydraulic steam burst
        m.torso.rotation.set(0.08, 0, 0);
        m.shoulderL.rotation.set(-1.15, 0.35, 0.25);
        m.elbowL.rotation.x = 1.65;
        m.shoulderR.rotation.set(-1.15, -0.35, -0.25);
        m.elbowR.rotation.x = 1.65;

        m.thighL.rotation.set(0.10, 0, -0.20);
        m.kneeL.rotation.x = -0.15;
        m.thighR.rotation.set(0.10, 0, 0.20);
        m.kneeR.rotation.x = -0.15;
      } else if (isVolt) {
        // Crossed sheath pose
        m.torso.rotation.set(0.04, 0, 0);
        m.shoulderL.rotation.set(-1.15, 0.65, 0.35);
        m.elbowL.rotation.x = 1.95;
        m.shoulderR.rotation.set(-1.15, -0.65, -0.35);
        m.elbowR.rotation.x = 1.95;

        m.thighL.rotation.x = 0.10; m.kneeL.rotation.x = -0.18;
        m.thighR.rotation.x = -0.15; m.kneeR.rotation.x = -0.12;
      } else if (isMyst) {
        // Ethereal meditative levitation
        m.hips.position.y = 1.15 + Math.sin(time * 2.5) * 0.04;
        m.torso.rotation.set(0, 0, 0);
        m.shoulderL.rotation.set(-0.65, 0.35, 0.25);
        m.elbowL.rotation.x = 1.45;
        m.shoulderR.rotation.set(-0.65, -0.35, -0.25);
        m.elbowR.rotation.x = 1.45;

        m.thighL.rotation.set(0.75, 0, -0.55);
        m.kneeL.rotation.x = -1.35;
        m.thighR.rotation.set(0.75, 0, 0.55);
        m.kneeR.rotation.x = -1.35;
      } else {
        m.torso.rotation.set(-0.06, 0.18, 0);
        // Titan gauntlet raised triumphantly into the skyline
        m.shoulderR.rotation.set(-2.45, -0.15, 0.10);
        m.elbowR.rotation.x = 0.15;
        m.shoulderL.rotation.set(0.25, 0.15, 0.35);
        m.elbowL.rotation.x = 0.85;

        m.thighL.rotation.x = 0.15; m.kneeL.rotation.x = -0.25;
        m.thighR.rotation.x = -0.25; m.kneeR.rotation.x = -0.15;
      }
    }

    // Hit flash emissive effect (preserved for test assertion: 0xff3b2f)
    const flash = fighter.hitFlash > 0;
    m.bodyMat.emissive.setHex(flash ? 0xff3b2f : 0x000000);
    m.bodyMat.emissiveIntensity = flash ? 1.45 : 0;
  }
}
