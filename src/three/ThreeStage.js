import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ArenaCamera } from './ArenaCamera.js';

function material(color, roughness = 0.72) {
  return new THREE.MeshToonMaterial({ color });
}
function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
function sphere(r, mat, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 14), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}

function disposeResources(root) {
  root?.traverse?.(node => {
    if (!node.isMesh) return;
    node.geometry?.dispose?.();
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const mat of materials) {
      if (!mat) continue;
      for (const value of Object.values(mat)) if (value?.isTexture) value.dispose();
      mat.dispose?.();
    }
  });
}

function createFighter(color, accent, skinColor = 0xc98f68, hairColor = 0x20232c, style = 'balanced', appearance = {}) {
  const root = new THREE.Group();
  const bodyMat = material(color);
  const accentMat = material(accent);
  const skinMat = material(skinColor);
  const darkMat = material(hairColor);
  const pantsMat = material(appearance.bottomColor ? Number.parseInt(String(appearance.bottomColor).replace('#',''),16) : 0x202a3b);
  const torso = new THREE.Group();
  torso.position.y = 1.28;
  root.add(torso);
  const buildScale = appearance.bodyScale || 1;
  const bodyWidth = (style === 'tank' || style === 'power' ? 0.82 : 0.72) * buildScale;
  torso.scale.set(buildScale, 1, 1);
  torso.add(box(bodyWidth, 0.82, 0.42, bodyMat, 0, 0, 0));
  const topStyle = appearance.top || 'tee';
  torso.add(box(0.76, appearance.outfit === 'combat' ? 0.2 : 0.13, 0.44, accentMat, 0, -0.28, 0));
  if (topStyle === 'jacket') { torso.add(box(0.12, 0.76, 0.46, accentMat, -0.29, 0, 0.02)); torso.add(box(0.12, 0.76, 0.46, accentMat, 0.29, 0, 0.02)); }
  if (topStyle === 'hoodie') { torso.add(sphere(0.19, darkMat, 0, 0.36, -0.2)); torso.add(box(0.36, 0.13, 0.035, accentMat, 0, -0.22, 0.235)); }
  if (topStyle === 'tee') torso.add(box(0.15, 0.15, 0.035, accentMat, 0, 0.02, 0.235));
  if (topStyle === 'vest') { torso.add(box(0.18, 0.72, 0.46, skinMat, -0.22, 0, 0.015)); torso.add(box(0.18, 0.72, 0.46, skinMat, 0.22, 0, 0.015)); }
  if (appearance.accessory === 'chain') { const chain = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.018, 6, 24, Math.PI), accentMat); chain.position.set(0, 0.12, 0.22); torso.add(chain); }
  if (appearance.outfit === 'combat') torso.add(box(0.82, 0.16, 0.46, accentMat, 0, 0.27, 0));
  if (appearance.outfit === 'street') torso.add(box(0.84, 0.12, 0.45, darkMat, 0, -0.38, 0));
  const head = sphere(0.29, skinMat, 0, 0.63, 0);
  head.scale.set(appearance.face === 'square' ? 1.08 : appearance.face === 'round' ? 1.12 : 1, appearance.face === 'round' ? 0.92 : 1, 0.96);
  torso.add(head);
  // Eyes and brows face the camera (+Z).
  const eyeMat = material(0xf4f1e9, 0.35);
  const irisMat = material(appearance.eyeColor ? Number.parseInt(String(appearance.eyeColor).replace('#',''),16) : 0x171923, 0.3);
  for (const x of [-0.105, 0.105]) {
    torso.add(sphere(0.027, eyeMat, x, 0.66, 0.257));
    torso.add(sphere(0.013, irisMat, x, 0.66, 0.282));
    const brow = box(0.085, appearance.brows === 'strong' ? 0.035 : 0.018, 0.025, darkMat, x, 0.715, 0.255);
    if (appearance.brows === 'angled') brow.rotation.z = x < 0 ? -0.18 : 0.18;
    torso.add(brow);
  }
  if (appearance.beard && appearance.beard !== 'none') {
    const beard = sphere(0.17, darkMat, 0, 0.48, 0.205);
    beard.scale.set(appearance.beard === 'stubble' ? 0.92 : 1, appearance.beard === 'mustache' ? 0.22 : 0.58, 0.38);
    torso.add(beard);
  }
  if (appearance.accessory === 'mask') { torso.add(box(0.34, 0.14, 0.055, accentMat, 0, 0.56, 0.25)); }
  if (appearance.accessory === 'glasses') {
    for (const x of [-0.105, 0.105]) { const lens = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.012, 6, 16), material(0x20242d, 0.3)); lens.position.set(x, 0.66, 0.275); torso.add(lens); }
    torso.add(box(0.08, 0.015, 0.018, darkMat, 0, 0.66, 0.275));
  } else if (appearance.accessory === 'headband') {
    torso.add(box(0.53, 0.07, 0.31, accentMat, 0, 0.78, 0));
  }
  if (appearance.hairStyle !== 'bald') {
    const hair = sphere(appearance.hairStyle === 'long' ? 0.31 : 0.295, darkMat, 0, 0.79, -0.015);
    hair.scale.set(1, appearance.hairStyle === 'spiky' ? 0.82 : appearance.hairStyle === 'long' ? 1.05 : 0.55, 1);
    torso.add(hair);
    if (appearance.hairStyle === 'long') { torso.add(box(0.12, 0.48, 0.16, darkMat, -0.23, 0.35, -0.02)); torso.add(box(0.12, 0.48, 0.16, darkMat, 0.23, 0.35, -0.02)); }
    if (appearance.hairStyle === 'curly') for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; torso.add(sphere(0.075, darkMat, Math.cos(a) * 0.22, 0.86, Math.sin(a) * 0.16)); }
    if (appearance.hairStyle === 'spiky') for (let i = -2; i <= 2; i++) torso.add(new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 7), darkMat)).position.set(i * 0.095, 0.98, 0.01);
  }
  torso.add(box(0.13, 0.08, 0.035, darkMat, 0.12, 0.62, 0.25));

  const armL = new THREE.Group(); armL.position.set(-0.46, 0.27, 0); torso.add(armL);
  armL.add(box(0.22, 0.62, 0.24, bodyMat, 0, -0.28, 0));
  armL.add(sphere(appearance.gloves === 'boxing' ? 0.19 : 0.14, appearance.gloves === 'boxing' ? accentMat : skinMat, 0, -0.61, 0)).visible = appearance.gloves !== 'none';
  if (appearance.gloves === 'wraps') armL.add(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.1, 12), accentMat)).position.y = -0.51;
  const armR = new THREE.Group(); armR.position.set(0.46, 0.27, 0); torso.add(armR);
  armR.add(box(0.22, 0.62, 0.24, bodyMat, 0, -0.28, 0));
  armR.add(sphere(appearance.gloves === 'boxing' ? 0.19 : 0.14, appearance.gloves === 'boxing' ? accentMat : skinMat, 0, -0.61, 0)).visible = appearance.gloves !== 'none';
  if (appearance.gloves === 'wraps') armR.add(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.1, 12), accentMat)).position.y = -0.51;

  const legL = new THREE.Group(); legL.position.set(-0.2, 0.88, 0); root.add(legL);
  const legLength = (appearance.bottom === 'shorts' ? 0.52 : 0.72) * (appearance.legScale || 1);
  legL.add(box(0.27, legLength, 0.3, pantsMat, 0, -0.35, 0));
  if (appearance.bottom === 'joggers') legL.add(box(0.035, legLength * 0.8, 0.31, accentMat, -0.1, -0.35, 0.16));
  legL.add(box(0.3, 0.16, 0.48, appearance.shoes === 'boots' ? bodyMat : accentMat, 0, -0.69, 0.08));
  const legR = new THREE.Group(); legR.position.set(0.2, 0.88, 0); root.add(legR);
  legR.add(box(0.27, legLength, 0.3, pantsMat, 0, -0.35, 0));
  if (appearance.bottom === 'joggers') legR.add(box(0.035, legLength * 0.8, 0.31, accentMat, -0.1, -0.35, 0.16));
  legR.add(box(0.3, 0.16, 0.48, appearance.shoes === 'boots' ? bodyMat : accentMat, 0, -0.69, 0.08));
  const heightScale = appearance.heightScale || 1;
  root.scale.y = heightScale;
  root.scale.x = appearance.widthScale || 1;
  torso.scale.x *= appearance.widthScale || 1;
  if (appearance.muscle) { torso.scale.x *= 0.96 + appearance.muscle * 0.08; torso.scale.z *= 0.96 + appearance.muscle * 0.06; }


  return { root, torso, head, armL, armR, legL, legR, bodyMat, accentMat, skinMat };
}

export class ThreeStage {
  constructor(container) {
    this.container = container;
    if (container) container.replaceChildren();
    this.scene = new THREE.Scene();
    this.scene.background = null;
    this.arenaCamera = new ArenaCamera();
    this.camera = this.arenaCamera.camera;
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.applyQuality(localStorage.getItem('fighter.settings.quality') || 'high');
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    this.renderer.shadowMap.enabled = (localStorage.getItem('fighter.settings.quality') || 'high') !== 'low';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    this.scene.add(new THREE.HemisphereLight(0xddeaff, 0x423044, 2.0));
    const key = new THREE.DirectionalLight(0xffe2c2, 2.5);
    key.position.set(-4, 9, 7); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x6a9dff, 1.3); rim.position.set(5, 4, -5); this.scene.add(rim);

    this.arenaGroup = new THREE.Group();
    this.scene.add(this.arenaGroup);
    this.makeArena("neon");
    this.fighters = new Map();
    this.gltfLoader = new GLTFLoader();
    this.clock = new THREE.Clock();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.animate = this.animate.bind(this);
    this.raf = requestAnimationFrame(this.animate);
  }

  applyQuality(quality = 'high') {
    const presets = { low: { ratio: 1, shadows: false }, medium: { ratio: 1.35, shadows: true }, high: { ratio: 2, shadows: true } };
    const preset = presets[quality] || presets.high;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, preset.ratio));
    this.renderer.shadowMap.enabled = preset.shadows;
    this.quality = quality in presets ? quality : 'high';
    this.resize();
  }

  makeArena(stageId = "neon") {
    disposeResources(this.arenaGroup);
    this.arenaGroup.clear();
    const g = this.arenaGroup;
    const themes = {
      neon: { floor: 0x171d32, wall: 0x17223d, trim: 0x4b7bba, accent: 0xe34d9b, sign: 0x25395c },
      temple: { floor: 0x59402d, wall: 0x34251f, trim: 0xb88745, accent: 0xe5c078, sign: 0x6c3d25 },
      rooftop: { floor: 0x343b48, wall: 0x202936, trim: 0x73899b, accent: 0x65d5d0, sign: 0x354d5b }
    };
    const t = themes[stageId] || themes.neon;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 14), material(t.floor));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.04; floor.receiveShadow = true; g.add(floor);
    const platform = new THREE.Mesh(new THREE.BoxGeometry(14, 0.22, 5), material(t.trim));
    platform.position.set(0, -0.13, 0); platform.receiveShadow = true; platform.castShadow = true; g.add(platform);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(24, 9), material(t.wall, 1));
    back.position.set(0, 3.1, -4); g.add(back);
    for (let i = -5; i <= 5; i++) {
      const pillar = box(0.16, 5.8, 0.2, material(i % 2 ? t.trim : t.accent), i * 1.85, 2.8, -3.5);
      g.add(pillar);
    }
    const sign = box(5.4, 0.8, 0.3, material(t.sign), 0, 5.7, -3.25); g.add(sign);
    const trim = box(5.0, 0.48, 0.12, material(t.accent), 0, 5.7, -3.05); g.add(trim);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(7, 0.035, 8, 100), new THREE.MeshBasicMaterial({ color: t.accent }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.015; g.add(ring);

    if (stageId === "temple") {
      for (let x of [-8, 8]) {
        g.add(box(1.1, 4.8, 1.1, material(0x8b6039), x, 2.35, -2.8));
        g.add(box(1.8, 0.35, 1.5, material(0xc59a55), x, 4.9, -2.8));
      }
      for (let x = -6; x <= 6; x += 3) g.add(sphere(0.18, material(0xe9b95f), x, 4.8, -3.1));
    } else if (stageId === "rooftop") {
      for (let x = -10; x <= 10; x += 2.5) {
        g.add(box(0.9, 1.8 + (Math.abs(x) % 3) * 0.45, 0.8, material(0x46586b), x, 1.0, -5.2));
        g.add(box(0.95, 0.08, 0.84, material(0x6a8293), x, 2.0 + (Math.abs(x) % 3) * 0.45, -5.2));
      }
      const moon = sphere(0.7, new THREE.MeshBasicMaterial({ color: 0xb8e5ee }), 8, 5.6, -5.5); g.add(moon);
    } else {
      for (let x = -9; x <= 9; x += 3) {
        const glow = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 0.12), new THREE.MeshBasicMaterial({ color: t.accent }));
        glow.position.set(x, 3.7, -3.7); g.add(glow);
      }
    }
    this.stageId = stageId;
  }

  setArena(stageId) { this.makeArena(stageId); }

  addFighter(id, character) {
    const model = createFighter(character.color, character.accent, character.skin, character.hair, character.style, character.appearance || {});
    model.proceduralRoot = model.root;
    model.mixer = null;
    model.actions = {};
    model.activeClip = null;
    model.lastState = '';
    this.scene.add(model.root);
    this.fighters.set(id, model);

    // GLB is optional. The procedural fighter remains visible if no model is supplied
    // or the file cannot be loaded, so the game always remains playable.
    if (character.model) {
      this.gltfLoader.load(character.model, (gltf) => {
        if (!this.fighters.has(id)) { disposeResources(gltf.scene); return; }
        const visual = gltf.scene;
        const bounds = new THREE.Box3().setFromObject(visual);
        const size = bounds.getSize(new THREE.Vector3());
        const height = Math.max(size.y, 0.001);
        visual.scale.setScalar(2.05 / height);
        const scaledBounds = new THREE.Box3().setFromObject(visual);
        visual.position.y -= scaledBounds.min.y;
        visual.traverse((node) => {
          if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; }
        });
        model.root.add(visual);
        model.proceduralRoot.visible = false;
        model.visual = visual;
        model.mixer = new THREE.AnimationMixer(visual);
        model.actions = this.buildAnimationActions(model.mixer, gltf.animations || []);
        model.lastState = '';
      }, undefined, (error) => {
        console.warn(`Could not load fighter model for ${id}; using procedural fallback.`, error);
      });
    }
  }

  buildAnimationActions(mixer, clips) {
    const actions = {};
    const aliases = {
      idle: ['idle', 'breathing', 'stand'], walk: ['walk', 'run', 'locomotion'],
      jump: ['jump', 'air'], crouch: ['crouch', 'duck'], block: ['block', 'guard'],
      punch: ['punch', 'jab', 'light_attack'], kick: ['kick', 'heavy_attack'],
      grab: ['grab', 'throw'], special: ['special', 'ultimate', 'skill'],
      hit: ['hit', 'hurt', 'damage'], ko: ['ko', 'knockout', 'death'], victory: ['victory', 'win']
    };
    for (const [state, names] of Object.entries(aliases)) {
      const clip = clips.find((candidate) => names.some((name) => candidate.name.toLowerCase().includes(name)));
      if (clip) actions[state] = mixer.clipAction(clip);
    }
    return actions;
  }

  updateLoadedAnimation(model, state, dt) {
    if (!model.mixer) return;
    const next = model.actions[state] || model.actions.idle;
    if (state !== model.lastState && next) {
      const previous = model.activeClip;
      next.reset().fadeIn(0.12).play();
      if (previous && previous !== next) previous.fadeOut(0.1);
      model.activeClip = next;
      model.lastState = state;
    }
    model.mixer.update(dt);
  }

  updateFighter(fighter, time, dt = 1 / 60) {
    const m = this.fighters.get(fighter.id); if (!m) return;
    const state = fighter.blocking ? 'block' : fighter.crouching ? 'crouch' : fighter.state;
    this.updateLoadedAnimation(m, state, dt);
    const targetZ = fighter.z !== undefined ? fighter.z : (fighter.id === 'player' ? 0.35 : -0.15);
    if (m.visual) {
      m.root.position.set(fighter.x, fighter.y, targetZ);
      m.root.rotation.y = fighter.facing === 1 ? 0 : Math.PI;
      m.root.rotation.z = state === 'hit' ? -0.16 - Math.sin(time * 34) * 0.045 : 0;
      m.root.scale.y = fighter.crouching ? 0.88 : 1;
      if (m.visual) m.visual.visible = true;
      return;
    }
    const moving = state === 'walk' || state === 'dash';
    const airborne = fighter.y > 0.03 || state === 'jump';
    const phase = time * (moving ? 10 : 2.2) + (fighter.id === 'cpu' ? Math.PI : 0);
    const gait = Math.sin(phase);
    const pulse = Math.sin(time * 18);
    const action = Math.max(0, Math.min(1, fighter.actionTime / 0.55));

    m.root.position.set(fighter.x, fighter.y, targetZ);
    m.root.rotation.y = fighter.facing === 1 ? 0 : Math.PI;
    m.root.rotation.z = state === 'hit' ? -0.16 - Math.sin(time * 34) * 0.045 : 0;

    // Locomotion and grounded stance.
    m.legL.rotation.x = moving ? gait * 0.55 : 0;
    m.legR.rotation.x = moving ? -gait * 0.55 : 0;
    m.torso.rotation.x = airborne ? -0.12 : moving ? Math.abs(gait) * 0.035 : 0;
    m.torso.rotation.z = state === 'hit' ? Math.sin(time * 38) * 0.22 : moving ? Math.sin(phase) * 0.025 : 0;
    m.root.scale.y = fighter.crouching ? 0.72 : 1;

    // Neutral guard, crouch guard and jump pose.
    m.armL.rotation.set(0, 0, 0);
    m.armR.rotation.set(0, 0, 0);
    if (fighter.blocking || state === 'block') {
      m.armL.rotation.x = -1.18; m.armR.rotation.x = -1.18;
      m.armL.rotation.z = 0.35; m.armR.rotation.z = -0.35;
      m.torso.rotation.x = -0.08;
    } else if (airborne) {
      m.armL.rotation.x = -0.85; m.armR.rotation.x = -0.85;
      m.armL.rotation.z = 0.24; m.armR.rotation.z = -0.24;
      m.legL.rotation.x = 0.35; m.legR.rotation.x = -0.35;
    } else if (moving) {
      m.armL.rotation.x = -gait * 0.32; m.armR.rotation.x = gait * 0.32;
    }

    // Distinct attack poses. The small oscillation makes each pose feel active
    // while the combat state machine controls the actual hit timing.
    if (state === 'dash') {
      m.torso.rotation.x = -0.18;
      m.armL.rotation.x = -0.65; m.armR.rotation.x = -0.65;
      m.root.rotation.z = -0.06;
    } else if (state === 'punch') {
      m.armR.rotation.x = -1.95 - pulse * 0.08;
      m.armR.rotation.z = -0.12;
      m.torso.rotation.y = -0.18;
      m.torso.rotation.z = -0.06;
    } else if (state === 'kick') {
      m.legR.rotation.x = -1.18 - pulse * 0.08;
      m.armL.rotation.x = -0.9; m.armR.rotation.x = -0.9;
      m.torso.rotation.z = 0.10;
    } else if (state === 'grab') {
      m.armL.rotation.x = -1.45; m.armR.rotation.x = -1.45;
      m.armL.rotation.z = 0.18; m.armR.rotation.z = -0.18;
      m.torso.rotation.y = -0.22;
    } else if (state === 'special') {
      m.armL.rotation.x = -1.85; m.armR.rotation.x = -1.85;
      m.armL.rotation.z = 0.28; m.armR.rotation.z = -0.28;
      m.torso.rotation.x = -0.18 + pulse * 0.04;
      m.root.position.y += Math.max(0, Math.sin(time * 12)) * 0.08;
    } else if (state === 'hit') {
      m.armL.rotation.x = 0.9; m.armR.rotation.x = 0.9;
      m.armL.rotation.z = 0.18; m.armR.rotation.z = -0.18;
      m.torso.rotation.x = 0.3;
      m.legL.rotation.x = 0.18; m.legR.rotation.x = -0.18;
    } else if (state === 'ko') {
      m.root.rotation.z = -1.35; m.root.position.y = 0.18;
      m.armL.rotation.x = 0.8; m.armR.rotation.x = 0.8;
    } else if (state === 'victory') {
      m.armL.rotation.x = -2.35; m.armR.rotation.x = -2.35;
      m.torso.rotation.z = Math.sin(time * 4) * 0.045;
    }

    const flash = fighter.hitFlash > 0;
    m.bodyMat.emissive.setHex(flash ? 0xff3b2f : 0x000000);
    m.bodyMat.emissiveIntensity = flash ? 1.25 : 0;
  }

  resize() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    if (this.arenaCamera) {
      this.arenaCamera.resize(w, h);
    } else if (this.camera?.isOrthographicCamera) {
      const aspect = w / h;
      const viewHeight = 8.1;
      this.camera.left = -viewHeight * aspect / 2;
      this.camera.right = viewHeight * aspect / 2;
      this.camera.top = viewHeight / 2;
      this.camera.bottom = -viewHeight / 2;
      this.camera.updateProjectionMatrix();
    }
    this.renderer.setSize(w, h);
  }

  animate() {
    this.raf = requestAnimationFrame(this.animate);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const time = this.clock.elapsedTime;
    this.fighters.forEach((_, id) => { if (this.currentFighters?.[id]) this.updateFighter(this.currentFighters[id], time, dt); });
    if (this.arenaCamera && this.currentFighters) {
      const fighterList = Object.values(this.currentFighters);
      const p1 = this.currentFighters['player'] || fighterList[0];
      const p2 = this.currentFighters['cpu'] || this.currentFighters['remote'] || fighterList[1];
      this.arenaCamera.update(p1, p2, dt);
    }
    this.renderer.render(this.scene, this.camera);
  }

  setFighters(fighters) { this.currentFighters = Object.fromEntries(fighters.map(f => [f.id, f])); }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.resizeObserver?.disconnect();
    disposeResources(this.scene);
    this.fighters.clear();
    this.renderer.dispose();
    this.renderer.forceContextLoss?.();
    this.container.replaceChildren();
  }
}
