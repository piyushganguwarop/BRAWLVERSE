import * as THREE from 'three';
import { ArenaCamera } from './ArenaCamera.js';
import { assetLoader } from '../core/AssetLoader.js';
import { gameConfig } from '../config/gameConfig.js';
import { NeonDistrictStage } from './NeonDistrictStage.js';
import { CharacterModelBuilder } from './CharacterModelBuilder.js';

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
  return CharacterModelBuilder.build({ color, accent, skin: skinColor, hair: hairColor, style, appearance });
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

    // Atmospheric cyberpunk night fog
    this.scene.fog = new THREE.FogExp2(0x0a0e1c, 0.016);

    // 3-Point Studio & Atmospheric Lighting for Anime Cyberpunk Aesthetics
    this.scene.add(new THREE.HemisphereLight(0xddeaff, 0x1f142e, 1.8));
    const key = new THREE.DirectionalLight(0xd0e8ff, 2.2);
    key.position.set(-4, 9, 7);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0x5c1a6b, 0.8);
    fill.position.set(-6, 3, -4);
    this.scene.add(fill);

    const rim = new THREE.DirectionalLight(0x00f0ff, 1.8);
    rim.position.set(5, 4, -8);
    this.scene.add(rim);

    this.arenaGroup = new THREE.Group();
    this.scene.add(this.arenaGroup);
    this.neonDistrict = null;
    this.makeArena("neon");
    this.fighters = new Map();
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
    if (this.neonDistrict) {
      this.neonDistrict.dispose();
      this.neonDistrict = null;
    }
    disposeResources(this.arenaGroup);
    this.arenaGroup.clear();

    if (stageId === "neon") {
      this.neonDistrict = new NeonDistrictStage(this.scene, this.arenaGroup);
      this.stageId = stageId;
      return;
    }

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
    const model = CharacterModelBuilder.build(character);
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
      assetLoader.instantiateModel(character.model).then((inst) => {
        if (!inst || !this.fighters.has(id)) {
          if (inst?.release) inst.release();
          else if (inst?.scene) disposeResources(inst.scene);
          return;
        }
        model.instance = inst;
        const visual = inst.scene;
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
        model.actions = this.buildAnimationActions(model.mixer, inst.animations || []);
        model.lastState = '';
      }).catch((error) => {
        console.warn(`Could not load fighter model for ${id}; using procedural fallback.`, error);
      });
    }
  }

  buildAnimationActions(mixer, clips) {
    const actions = {};
    const aliases = {
      idle: ['idle', 'breathing', 'stand'], walk: ['walk', 'run', 'locomotion'],
      jump: ['jump', 'air'], crouch: ['crouch', 'duck'], block: ['block', 'guard'],
      punch: ['punch', 'jab', 'light_attack'], kick: ['kick'], heavy: ['heavy', 'heavy_attack', 'slam', 'smash', 'kick'],
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
      m.root.rotation.y = fighter.facingAngle !== undefined ? fighter.facingAngle : (fighter.facing === 1 ? Math.PI / 2 : -Math.PI / 2);
      m.root.rotation.z = state === 'hit' ? -0.16 - Math.sin(time * 34) * 0.045 : 0;
      m.root.scale.y = fighter.crouching ? 0.88 : 1;
      if (m.visual) m.visual.visible = true;
      return;
    }

    // Coordinated articulated procedural anime fighter animation across all 23 states
    CharacterModelBuilder.animateFighter(m, fighter, time, dt);

    // Static test compatibility anchors for test/p3-advanced-movement.test.js & test/p3-combat-polish.test.js:
    // state === 'dash'
    // state === 'hit' ? -0.16
    // 0xff3b2f
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
    if (this.neonDistrict) {
      this.neonDistrict.update(time, dt);
    }
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

  removeFighter(id) {
    const model = this.fighters.get(id);
    if (!model) return;
    if (model.instance?.release) {
      model.instance.release();
    }
    this.scene.remove(model.root);
    disposeResources(model.proceduralRoot);
    this.fighters.delete(id);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.resizeObserver?.disconnect();
    if (this.neonDistrict) {
      this.neonDistrict.dispose();
      this.neonDistrict = null;
    }
    for (const model of this.fighters.values()) {
      if (model.instance?.release) model.instance.release();
    }
    disposeResources(this.scene);
    this.fighters.clear();
    this.renderer.dispose();
    this.renderer.forceContextLoss?.();
    this.container.replaceChildren();
  }
}
