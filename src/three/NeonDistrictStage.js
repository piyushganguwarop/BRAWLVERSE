import * as THREE from 'three';
import { gameConfig } from '../config/gameConfig.js';

/**
 * Creates a procedural canvas texture for neon signs or glowing displays
 */
function createTextTexture(text, { width = 512, height = 128, color = '#00F0FF', bg = '#080c18', fontSize = 48, subText = '' } = {}) {
  if (typeof document === 'undefined') return new THREE.Texture();
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Outer border
  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, width - 8, height - 8);

  // Main text with neon glow
  ctx.shadowColor = color;
  ctx.shadowBlur = 18;
  ctx.fillStyle = color;
  ctx.font = `bold ${fontSize}px "Arial Black", Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = subText ? 'bottom' : 'middle';
  ctx.fillText(text, width / 2, subText ? height * 0.62 : height / 2);

  if (subText) {
    ctx.shadowBlur = 10;
    ctx.font = `bold ${Math.round(fontSize * 0.38)}px Arial, sans-serif`;
    ctx.fillStyle = '#FFFFFF';
    ctx.textBaseline = 'top';
    ctx.fillText(subText, width / 2, height * 0.65);
  }

  // Scanlines
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
  for (let y = 0; y < height; y += 4) {
    ctx.fillRect(0, y, width, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

/**
 * Creates procedural skyscraper window matrix texture
 */
function createWindowTexture(primaryColor = '#ffc83b', secondaryColor = '#00f0ff') {
  if (typeof document === 'undefined') return new THREE.Texture();
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#0f1422';
  ctx.fillRect(0, 0, 128, 256);

  const colors = [primaryColor, secondaryColor, '#ffffff', '#0f1422', '#0f1422'];
  for (let y = 8; y < 248; y += 14) {
    for (let x = 8; x < 120; x += 12) {
      if (Math.random() > 0.4) {
        ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
        ctx.fillRect(x, y, 7, 9);
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 3);
  return texture;
}

/**
 * Creates hazard stripe canvas texture for arena boundary trim
 */
function createHazardTexture() {
  if (typeof document === 'undefined') return new THREE.Texture();
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(0, 0, 256, 32);

  ctx.fillStyle = '#111827';
  for (let x = -32; x < 288; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 16, 0);
    ctx.lineTo(x - 8, 32);
    ctx.lineTo(x - 24, 32);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.repeat.set(8, 1);
  return texture;
}

export class NeonDistrictStage {
  constructor(scene, stageGroup) {
    this.scene = scene;
    this.group = stageGroup;
    this.hovercars = [];
    this.fanBlades = [];
    this.pulsingLights = [];
    this.boundaryBeams = [];
    this.billboards = [];

    this.buildStage();
  }

  buildStage() {
    const g = this.group;

    // Atmospheric Fog
    this.scene.fog = new THREE.FogExp2(0x0a0e1c, 0.016);

    // -------------------------------------------------------------
    // 1. COMBAT HELIPAD & ROOFTOP DECK
    // -------------------------------------------------------------
    const arenaW = (gameConfig.world.maxX - gameConfig.world.minX) + 2.8; // ~13.6m
    const arenaD = (gameConfig.world.maxZ - gameConfig.world.minZ) + 2.4; // ~6.8m

    // Main steel deck platform
    const deckMat = new THREE.MeshToonMaterial({
      color: 0x181f33
    });
    const deckGeo = new THREE.BoxGeometry(arenaW, 0.35, arenaD);
    const deckMesh = new THREE.Mesh(deckGeo, deckMat);
    deckMesh.position.set(0, -0.175, 0);
    deckMesh.receiveShadow = true;
    deckMesh.castShadow = true;
    g.add(deckMesh);

    // Hazard border trim around combat area
    const hazardMat = new THREE.MeshBasicMaterial({ map: createHazardTexture() });
    const trimN = new THREE.Mesh(new THREE.PlaneGeometry(arenaW, 0.22), hazardMat);
    trimN.rotation.x = -Math.PI / 2;
    trimN.position.set(0, 0.005, -arenaD * 0.48);
    g.add(trimN);

    const trimS = new THREE.Mesh(new THREE.PlaneGeometry(arenaW, 0.22), hazardMat);
    trimS.rotation.x = -Math.PI / 2;
    trimS.position.set(0, 0.005, arenaD * 0.48);
    g.add(trimS);

    // Central cybernetic energy ring
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00F0FF });
    const ringGeo = new THREE.TorusGeometry(3.6, 0.04, 8, 72);
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.set(0, 0.008, 0);
    g.add(ringMesh);

    // Inner energetic emblem (Brawl Wars "X" emblem)
    const innerRingMat = new THREE.MeshBasicMaterial({ color: 0xFF0055 });
    const innerRing = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.035, 6, 48), innerRingMat);
    innerRing.rotation.x = Math.PI / 2;
    innerRing.position.set(0, 0.009, 0);
    g.add(innerRing);

    // Lower rooftop base structure extending outward
    const baseMat = new THREE.MeshToonMaterial({ color: 0x0f1423 });
    const baseRoof = new THREE.Mesh(new THREE.BoxGeometry(42, 1.2, 28), baseMat);
    baseRoof.position.set(0, -0.95, -2);
    baseRoof.receiveShadow = true;
    g.add(baseRoof);

    // -------------------------------------------------------------
    // 2. CORNER CONTAINMENT PYLONS & LASER BOUNDARY RAILS
    // -------------------------------------------------------------
    const minX = gameConfig.world.minX; // -5.4
    const maxX = gameConfig.world.maxX; //  5.4
    const minZ = gameConfig.world.minZ; // -2.2
    const maxZ = gameConfig.world.maxZ; //  2.2

    const pylonCorners = [
      { x: minX, z: minZ, color: 0x00F0FF },
      { x: maxX, z: minZ, color: 0xFF0055 },
      { x: minX, z: maxZ, color: 0x00F0FF },
      { x: maxX, z: maxZ, color: 0xFF0055 }
    ];

    const pylonMat = new THREE.MeshToonMaterial({ color: 0x242d45 });
    for (const c of pylonCorners) {
      // Pylon base
      const pylon = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 2.6, 8), pylonMat);
      pylon.position.set(c.x, 1.3, c.z);
      pylon.castShadow = true;
      g.add(pylon);

      // Glowing vertical neon conduit
      const conduitMat = new THREE.MeshBasicMaterial({ color: c.color });
      const conduit = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.3, 8), conduitMat);
      conduit.position.set(c.x, 1.3, c.z + 0.12);
      g.add(conduit);

      // Glowing beacon top
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), conduitMat);
      beacon.position.set(c.x, 2.65, c.z);
      g.add(beacon);
      this.pulsingLights.push(beacon);
    }

    // Laser boundary perimeter beams (at Y = 0.35 and Y = 1.1)
    const laserMat = new THREE.MeshBasicMaterial({
      color: 0x00F0FF,
      transparent: true,
      opacity: 0.72
    });

    const createBeam = (p1, p2, y) => {
      const dx = p2.x - p1.x;
      const dz = p2.z - p1.z;
      const length = Math.hypot(dx, dz);
      const angle = Math.atan2(dx, dz);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, length, 6), laserMat);
      beam.position.set((p1.x + p2.x) * 0.5, y, (p1.z + p2.z) * 0.5);
      beam.rotation.x = Math.PI / 2;
      beam.rotation.z = -angle;
      g.add(beam);
      this.boundaryBeams.push(beam);
    };

    // North, South, East, West boundary beams
    for (const y of [0.4, 1.1]) {
      createBeam({ x: minX, z: minZ }, { x: maxX, z: minZ }, y);
      createBeam({ x: minX, z: maxZ }, { x: maxX, z: maxZ }, y);
      createBeam({ x: minX, z: minZ }, { x: minX, z: maxZ }, y);
      createBeam({ x: maxX, z: minZ }, { x: maxX, z: maxZ }, y);
    }

    // -------------------------------------------------------------
    // 3. ROOFTOP INDUSTRIAL INFRASTRUCTURE
    // -------------------------------------------------------------
    // Dual HVAC ventilation units with rotating exhaust fans
    const hvacMat = new THREE.MeshToonMaterial({ color: 0x1c2438 });
    const hvacPositions = [
      { x: -8.5, y: 0.8, z: -1.8 },
      { x: -10.2, y: 0.8, z: 1.8 }
    ];
    for (const pos of hvacPositions) {
      const hvac = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.6, 2.0), hvacMat);
      hvac.position.set(pos.x, pos.y, pos.z);
      hvac.castShadow = true;
      hvac.receiveShadow = true;
      g.add(hvac);

      // Fan exhaust ring & blades
      const fanRing = new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.06, 6, 24), new THREE.MeshBasicMaterial({ color: 0x00F0FF }));
      fanRing.position.set(pos.x, pos.y + 0.82, pos.z);
      fanRing.rotation.x = Math.PI / 2;
      g.add(fanRing);

      const fanBlade = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.04, 0.18), new THREE.MeshBasicMaterial({ color: 0x374151 }));
      fanBlade.position.set(pos.x, pos.y + 0.82, pos.z);
      fanBlade.rotation.x = Math.PI / 2;
      g.add(fanBlade);
      this.fanBlades.push(fanBlade);
    }

    // Penthouse access bulkhead (stairwell entrance) on the right
    const stairwell = new THREE.Mesh(new THREE.BoxGeometry(3.2, 3.2, 2.8), hvacMat);
    stairwell.position.set(9.2, 1.6, -1.5);
    stairwell.castShadow = true;
    stairwell.receiveShadow = true;
    g.add(stairwell);

    // Stairwell illuminated door
    const doorTex = createTextTexture('ACCESS 04', { width: 256, height: 256, color: '#f59e0b', fontSize: 28, subText: 'RESTRICTED' });
    const door = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.2), new THREE.MeshBasicMaterial({ map: doorTex }));
    door.position.set(7.58, 1.1, -1.5);
    door.rotation.y = -Math.PI / 2;
    g.add(door);

    // Satellite communications dish on stairwell roof
    const dishMat = new THREE.MeshToonMaterial({ color: 0x4b5563 });
    const dish = new THREE.Mesh(new THREE.SphereGeometry(0.85, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.45), dishMat);
    dish.position.set(9.5, 3.6, -1.5);
    dish.rotation.x = 0.55;
    dish.rotation.y = -0.6;
    g.add(dish);

    // Safety perimeter railings along outer rooftop edge
    const railMat = new THREE.MeshBasicMaterial({ color: 0x3b82f6 });
    for (let x = -14; x <= 14; x += 3.5) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 6), railMat);
      post.position.set(x, 0.55, -4.8);
      g.add(post);
    }
    const topRail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 29, 6), railMat);
    topRail.position.set(0, 1.08, -4.8);
    topRail.rotation.z = Math.PI / 2;
    g.add(topRail);

    // -------------------------------------------------------------
    // 4. NEON BILLBOARDS & GLOWING SIGNS
    // -------------------------------------------------------------
    // Main "BRAWL WARS" Championship Billboard across the rear skyline
    const mainBannerTex = createTextTexture('BRAWL WARS', {
      width: 512,
      height: 128,
      color: '#00F0FF',
      bg: '#050a16',
      fontSize: 56,
      subText: 'NEO-SHINJUKU CHAMPIONSHIP'
    });
    const mainBillboard = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 2.4), new THREE.MeshBasicMaterial({ map: mainBannerTex }));
    mainBillboard.position.set(0, 5.8, -5.6);
    g.add(mainBillboard);
    this.billboards.push(mainBillboard);

    // Billboard structural truss frame
    const trussMat = new THREE.MeshBasicMaterial({ color: 0x1f2937 });
    for (const x of [-4.5, 0, 4.5]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.8, 6), trussMat);
      leg.position.set(x, 3.8, -5.7);
      g.add(leg);
    }

    // Japanese Cyber Neon Signs
    const kanjiTex1 = createTextTexture('電脳格闘', { width: 256, height: 128, color: '#FF0055', bg: '#0b0c16', fontSize: 38, subText: 'CYBER BRAWL' });
    const signLeft = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.6), new THREE.MeshBasicMaterial({ map: kanjiTex1 }));
    signLeft.position.set(-8.2, 4.6, -4.8);
    signLeft.rotation.y = 0.28;
    g.add(signLeft);
    this.billboards.push(signLeft);

    const kanjiTex2 = createTextTexture('ネオ東京', { width: 256, height: 128, color: '#f59e0b', bg: '#0b0c16', fontSize: 38, subText: 'DISTRICT 09' });
    const signRight = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.6), new THREE.MeshBasicMaterial({ map: kanjiTex2 }));
    signRight.position.set(8.2, 4.6, -4.8);
    signRight.rotation.y = -0.28;
    g.add(signRight);
    this.billboards.push(signRight);

    // -------------------------------------------------------------
    // 5. SURROUNDING CYBERPUNK CITY SKYLINE (3 DEPTH LAYERS)
    // -------------------------------------------------------------
    const windowTexAmber = createWindowTexture('#f59e0b', '#00f0ff');
    const windowTexCyan = createWindowTexture('#00f0ff', '#ec4899');
    const windowMatAmber = new THREE.MeshBasicMaterial({ map: windowTexAmber });
    const windowMatCyan = new THREE.MeshBasicMaterial({ map: windowTexCyan });
    const bldgMat = new THREE.MeshToonMaterial({ color: 0x0b0f19 });

    // Layer 1: Midground Skyscrapers (Z = -9 to -16)
    const midBuildings = [
      { x: -14, y: 7, z: -10, w: 4.8, h: 16, d: 5.2, mat: windowMatCyan },
      { x: -7.5, y: 8.5, z: -13, w: 5.5, h: 19, d: 6.0, mat: windowMatAmber },
      { x: 0, y: 11, z: -16, w: 7.2, h: 24, d: 7.0, mat: windowMatCyan },
      { x: 8.0, y: 8.0, z: -13, w: 5.2, h: 18, d: 5.5, mat: windowMatAmber },
      { x: 15, y: 7.5, z: -10, w: 5.0, h: 17, d: 5.0, mat: windowMatCyan }
    ];

    for (const b of midBuildings) {
      const bldg = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), bldgMat);
      bldg.position.set(b.x, b.y, b.z);
      g.add(bldg);

      // Window facade facing the camera
      const facade = new THREE.Mesh(new THREE.PlaneGeometry(b.w * 0.88, b.h * 0.78), b.mat);
      facade.position.set(b.x, b.y + 1, b.z + b.d * 0.51);
      g.add(facade);

      // Rooftop transmission spires
      const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.12, 4.2, 6), new THREE.MeshBasicMaterial({ color: 0x64748b }));
      spire.position.set(b.x, b.y + b.h * 0.5 + 2.1, b.z);
      g.add(spire);

      // Blinking red warning beacon at spire tip
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff0044 }));
      beacon.position.set(b.x, b.y + b.h * 0.5 + 4.2, b.z);
      g.add(beacon);
      this.pulsingLights.push(beacon);
    }

    // Layer 2: Deep Skyline Megastructures (Z = -22 to -45)
    for (let i = -6; i <= 6; i++) {
      const distZ = -24 - Math.abs(i) * 3;
      const height = 26 + (Math.sin(i * 1.7) * 8 + 8);
      const width = 6.5 + Math.abs(i) * 1.2;
      const bldg2 = new THREE.Mesh(new THREE.BoxGeometry(width, height, 8), new THREE.MeshBasicMaterial({ color: 0x060913 }));
      bldg2.position.set(i * 8.5, height * 0.5 - 4, distZ);
      g.add(bldg2);

      // Vertical neon accent stripes on mega-towers
      const stripeColor = (i % 2 === 0) ? 0x00F0FF : 0xFF0055;
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.14, height * 0.7, 0.2), new THREE.MeshBasicMaterial({ color: stripeColor }));
      stripe.position.set(i * 8.5 + (i > 0 ? -width * 0.35 : width * 0.35), height * 0.45, distZ + 4.1);
      g.add(stripe);
    }

    // -------------------------------------------------------------
    // 6. ANIMATED FLYING HOVERCARS (SKY-TRAFFIC)
    // -------------------------------------------------------------
    const hovercarColors = [0x00F0FF, 0xF59E0B, 0xFF0055, 0x10B981];
    for (let i = 0; i < 5; i++) {
      const carGroup = new THREE.Group();
      const carBody = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 0.8), new THREE.MeshBasicMaterial({ color: hovercarColors[i % hovercarColors.length] }));
      carGroup.add(carBody);

      // Dual white headlights
      const hl1 = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      hl1.position.set(0.85, 0, 0.26);
      const hl2 = hl1.clone();
      hl2.position.set(0.85, 0, -0.26);
      carGroup.add(hl1, hl2);

      // Red taillights
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 0.6), new THREE.MeshBasicMaterial({ color: 0xff0022 }));
      tl.position.set(-0.85, 0, 0);
      carGroup.add(tl);

      // Initial trajectory setup
      const speed = (0.6 + Math.random() * 0.8) * (i % 2 === 0 ? 1 : -1);
      const y = 3.5 + i * 2.2;
      const z = -11 - i * 6;
      carGroup.position.set((Math.random() - 0.5) * 40, y, z);
      if (speed < 0) carGroup.rotation.y = Math.PI;

      g.add(carGroup);
      this.hovercars.push({ group: carGroup, speed, minX: -36, maxX: 36 });
    }
  }

  /**
   * Pulses the boundary containment laser beams when fighters touch or approach the wall
   */
  pulseBoundary() {
    for (const beam of this.boundaryBeams) {
      if (beam.material) {
        beam.material.opacity = 1.0;
        beam.scale.set(1.6, 1, 1.6);
      }
    }
  }

  update(time, dt) {
    // 1. Rotate HVAC ventilation fan blades
    for (const fan of this.fanBlades) {
      fan.rotation.y += dt * 8.5;
    }

    // 2. Animate flying hovercars along sky-traffic lanes
    for (const car of this.hovercars) {
      car.group.position.x += car.speed * dt * 14;
      if (car.speed > 0 && car.group.position.x > car.maxX) {
        car.group.position.x = car.minX;
      } else if (car.speed < 0 && car.group.position.x < car.minX) {
        car.group.position.x = car.maxX;
      }
      // Gentle vertical hover bob
      car.group.position.y += Math.sin(time * 3 + car.group.position.x) * 0.003;
    }

    // 3. Pulse neon beacons and holographic billboards
    const pulse = (Math.sin(time * 4) + 1) * 0.5;
    for (const beacon of this.pulsingLights) {
      if (beacon.material) {
        beacon.scale.setScalar(0.95 + pulse * 0.25);
      }
    }

    // 4. Recover boundary beam intensity
    for (const beam of this.boundaryBeams) {
      if (beam.material && beam.material.opacity > 0.68) {
        beam.material.opacity = Math.max(0.68, beam.material.opacity - dt * 1.5);
        beam.scale.lerp(new THREE.Vector3(1, 1, 1), dt * 4);
      }
    }
  }

  dispose() {
    this.hovercars.length = 0;
    this.fanBlades.length = 0;
    this.pulsingLights.length = 0;
    this.boundaryBeams.length = 0;
    this.billboards.length = 0;
  }
}
