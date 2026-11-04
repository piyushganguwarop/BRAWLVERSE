import * as THREE from 'three';
import { CharacterModelBuilder } from '../three/CharacterModelBuilder.js';
import { getFighter } from './roster.js';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

/** Interactive, device-friendly procedural 3D preview. All meshes are original game geometry. */
export class CustomizerPreview {
  constructor(host, onPart = () => {}) {
    this.host = host;
    this.onPart = onPart;
    this.disposed = false;
    this.drag = null;
    this.yaw = 0;
    this.zoom = 6.8;
    this.frameBounds = new THREE.Box3();
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#172238');
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    this.camera.position.set(0, 1.55, this.zoom);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.className = 'creator-3d-canvas';
    this.renderer.domElement.setAttribute('aria-label', 'Drag to rotate your fighter. Pinch or scroll to zoom.');
    host.appendChild(this.renderer.domElement);

    this.scene.add(new THREE.HemisphereLight(0xc7dcff, 0x263044, 2.0));
    const key = new THREE.DirectionalLight(0xffe0b2, 3.0);
    key.position.set(3, 5, 5); key.castShadow = true; this.scene.add(key);
    const rim = new THREE.PointLight(0x65b9ff, 28, 12);
    rim.position.set(-3, 2, 1); this.scene.add(rim);
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.7, 0.12, 48), new THREE.MeshStandardMaterial({ color: '#283650', metalness: 0.35, roughness: 0.6 }));
    floor.position.y = -0.08; floor.receiveShadow = true; this.scene.add(floor);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.018, 8, 80), new THREE.MeshBasicMaterial({ color: '#79baff' }));
    ring.rotation.x = Math.PI / 2; ring.position.y = -0.005; this.scene.add(ring);

    this.root = new THREE.Group(); this.scene.add(this.root);
    this.build();
    this.modelBounds = new THREE.Box3();
    this.frameModel();
    this.bind();
    this.resize();
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(host);
    this.animate = this.animate.bind(this);
    this.frame = requestAnimationFrame(this.animate);
  }

  material(color, roughness = 0.68, metalness = 0.04) {
    return new THREE.MeshStandardMaterial({ color, roughness, metalness });
  }
  mesh(name, geometry, material, parent, position, scale) {
    const object = new THREE.Mesh(geometry, material);
    object.name = name;
    object.position.set(...position);
    if (scale) object.scale.set(...scale);
    object.castShadow = true; object.receiveShadow = true;
    parent.add(object);
    (this.parts[name] ||= []).push(object);
    return object;
  }
  build() {
    this.parts = {};
    this.groups = {};
    this.materials = {
      skin: this.material('#b97855'), cloth: this.material('#2869b5'), accent: this.material('#e6b84c', 0.42, 0.28),
      hair: this.material('#20232c'), pants: this.material('#202a3b'), shoe: this.material('#101827', 0.45, 0.16),
      eye: this.material('#f5f4ec', 0.32), pupil: this.material('#171b24', 0.3), trim: this.material('#aebbd0', 0.45, 0.2)
    };
    const m = this.materials;
    const torso = this.groups.torso = new THREE.Group(); torso.position.y = 1.35; this.root.add(torso);
    const head = this.groups.head = new THREE.Group(); head.position.y = 0.62; torso.add(head);
    const armL = this.groups.armL = new THREE.Group(); armL.position.set(-0.43, 0.16, 0); torso.add(armL);
    const armR = this.groups.armR = new THREE.Group(); armR.position.set(0.43, 0.16, 0); torso.add(armR);
    const legL = this.groups.legL = new THREE.Group(); legL.position.set(-0.2, 0.86, 0); this.root.add(legL);
    const legR = this.groups.legR = new THREE.Group(); legR.position.set(0.2, 0.86, 0); this.root.add(legR);

    this.mesh('torso', new THREE.CapsuleGeometry(0.37, 0.62, 8, 16), m.cloth, torso, [0, 0, 0], [1.04, 1, 0.78]);
    this.mesh('pelvis', new THREE.BoxGeometry(0.62, 0.32, 0.42), m.pants, this.root, [0, 0.91, 0]);
    this.mesh('neck', new THREE.CylinderGeometry(0.12, 0.14, 0.22, 16), m.skin, torso, [0, 0.48, 0]);
    this.mesh('head', new THREE.SphereGeometry(0.29, 24, 20), m.skin, head, [0, 0.1, 0], [0.88, 1.08, 0.86]);
    this.mesh('nose', new THREE.ConeGeometry(0.045, 0.12, 8), m.skin, head, [0, 0.06, 0.255], [0.7, 1, 0.7]).rotation.x = Math.PI / 2;
    for (const x of [-0.115, 0.115]) {
      this.mesh('eyes', new THREE.SphereGeometry(0.036, 12, 10), m.eye, head, [x, 0.13, 0.237], [1, 0.72, 0.5]);
      this.mesh('pupils', new THREE.SphereGeometry(0.017, 10, 8), m.pupil, head, [x, 0.13, 0.258]);
      this.mesh('brows', new THREE.BoxGeometry(0.095, 0.025, 0.025), m.hair, head, [x, 0.205, 0.24]);
    }
    this.mesh('hairCap', new THREE.SphereGeometry(0.3, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), m.hair, head, [0, 0.22, -0.005], [1, 0.72, 0.95]);
    this.mesh('hairFringe', new THREE.BoxGeometry(0.34, 0.08, 0.12), m.hair, head, [0, 0.16, 0.205]);
    this.mesh('beard', new THREE.SphereGeometry(0.18, 16, 12), m.hair, head, [0, -0.12, 0.12], [1, 0.5, 0.65]);
    this.mesh('mustache', new THREE.SphereGeometry(0.09, 12, 8), m.hair, head, [0, -0.04, 0.22], [1, 0.32, 0.5]);

    for (const arm of [armL, armR]) {
      this.mesh('arms', new THREE.CapsuleGeometry(0.12, 0.55, 6, 12), m.skin, arm, [0, -0.32, 0]);
      this.mesh('gloves', new THREE.SphereGeometry(0.15, 16, 12), m.accent, arm, [0, -0.66, 0.04], [1, 1, 0.9]);
      this.mesh('wristWrap', new THREE.CylinderGeometry(0.125, 0.125, 0.12, 16), m.trim, arm, [0, -0.53, 0]);
    }
    for (const leg of [legL, legR]) {
      this.mesh('legs', new THREE.CapsuleGeometry(0.15, 0.63, 6, 12), m.pants, leg, [0, -0.34, 0]);
      this.mesh('shoes', new THREE.BoxGeometry(0.3, 0.16, 0.46), m.shoe, leg, [0, -0.7, 0.08]);
      this.mesh('shoeSole', new THREE.BoxGeometry(0.31, 0.045, 0.47), m.accent, leg, [0, -0.78, 0.08]);
    }
    this.mesh('belt', new THREE.BoxGeometry(0.67, 0.12, 0.45), m.accent, this.root, [0, 1.03, 0.015]);
    this.mesh('groundShadow', new THREE.CircleGeometry(0.85, 32), this.material('#080d18', 1), this.root, [0, -0.005, 0]).rotation.x = -Math.PI / 2;
    this.groups.generated = new THREE.Group(); this.root.add(this.groups.generated);
  }

  clearGenerated() {
    const group = this.groups.generated;
    group.traverse(o => { if (o.isMesh) { o.geometry.dispose(); if (o.material !== this.materials.cloth && o.material !== this.materials.accent && o.material !== this.materials.skin && o.material !== this.materials.hair && o.material !== this.materials.pants && o.material !== this.materials.shoe && o.material !== this.materials.trim) o.material.dispose(); } });
    group.clear();
  }
  addGenerated(name, geometry, material, position, scale) {
    const o = new THREE.Mesh(geometry, material); o.name = name; o.position.set(...position); if (scale) o.scale.set(...scale);
    o.castShadow = true; o.receiveShadow = true; this.groups.generated.add(o); return o;
  }
  bind() {
    const el = this.renderer.domElement;
    el.addEventListener('pointerdown', e => { this.drag = { x: e.clientX, y: e.clientY, moved: false, startX: e.clientX, startY: e.clientY }; el.setPointerCapture(e.pointerId); });
    el.addEventListener('pointermove', e => {
      if (!this.drag) return;
      const dx = e.clientX - this.drag.x, dy = e.clientY - this.drag.y;
      if (Math.abs(e.clientX - this.drag.startX) + Math.abs(e.clientY - this.drag.startY) > 4) this.drag.moved = true;
      this.yaw += dx * 0.012; this.root.rotation.y = this.yaw;
      this.drag.x = e.clientX; this.drag.y = e.clientY;
      if (e.pointerType === 'touch' && Math.abs(dy) > 2) this.setZoom(this.zoom + dy * 0.012);
    });
    el.addEventListener('pointerup', e => {
      if (this.drag && !this.drag.moved) this.pickPart(e);
      this.drag = null;
    });
    el.addEventListener('pointercancel', () => { this.drag = null; });
    el.addEventListener('wheel', e => { e.preventDefault(); this.setZoom(this.zoom + e.deltaY * 0.008); }, { passive: false });
  }
  pickPart(e) {
    const r = this.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    const ray = new THREE.Raycaster(); ray.setFromCamera(mouse, this.camera);
    const hit = ray.intersectObjects(this.root.children, true).find(x => x.object.name && x.object.name !== 'groundShadow');
    if (hit) this.onPart(hit.object.name);
  }
  resize() {
    if (this.disposed) return;
    const w = Math.max(1, this.host.clientWidth), h = Math.max(1, this.host.clientHeight);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.renderer.setSize(w, h, false); this.frameModel();
  }
  frameModel() {
    if (!this.root || !this.camera || this.disposed) return;
    this.modelBounds.setFromObject(this.root);
    const size = this.modelBounds.getSize(new THREE.Vector3());
    const center = this.modelBounds.getCenter(new THREE.Vector3());
    const aspect = Math.max(this.camera.aspect || 1, 0.35);
    const verticalFov = THREE.MathUtils.degToRad(this.camera.fov);
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect);
    const fitDistance = Math.max(size.y / (2 * Math.tan(verticalFov / 2)), size.x / (2 * Math.tan(horizontalFov / 2))) * 1.05;
    const distance = Math.max(3.5, fitDistance * (this.zoom / 6.8));
    this.camera.position.set(center.x, center.y, center.z + distance);
    this.camera.lookAt(center);
    this.camera.near = Math.max(0.01, distance / 100);
    this.camera.far = distance * 20;
    this.camera.updateProjectionMatrix();
  }
  setZoom(v) { this.zoom = clamp(v, 4.8, 9); this.frameModel(); }
  rotate(dir) { this.yaw += dir * 0.45; this.root.rotation.y = this.yaw; }

  update(v) {
    if (this.disposed) return;

    const rosterId = v.fighterId || (['atlas', 'volt', 'rook', 'myst'].includes(v.id) ? v.id : ['atlas', 'volt', 'rook', 'myst'].includes(v.name?.toLowerCase()) ? v.name.toLowerCase() : null);
    if (rosterId) {
      if (!this.characterModel || this.currentFighterId !== rosterId) {
        if (this.characterModel) {
          this.root.remove(this.characterModel.root);
          this.characterModel = null;
        }
        const cfg = v.fighterConfig || getFighter(rosterId) || { id: rosterId, name: v.name };
        this.currentFighterId = rosterId;
        this.currentFighterConfig = cfg;
        this.characterModel = CharacterModelBuilder.build(cfg);
        this.root.add(this.characterModel.root);
      }
      for (const key of Object.keys(this.groups)) {
        if (this.groups[key]) this.groups[key].visible = false;
      }
      for (const name of Object.keys(this.parts)) {
        for (const p of this.parts[name]) p.visible = false;
      }
      this.root.scale.set(1, 1, 1);
      this.frameModel();
      return;
    }

    if (this.characterModel) {
      this.root.remove(this.characterModel.root);
      this.characterModel = null;
      this.currentFighterId = null;
      this.currentFighterConfig = null;
      for (const key of Object.keys(this.groups)) {
        if (this.groups[key]) this.groups[key].visible = true;
      }
      for (const name of Object.keys(this.parts)) {
        for (const p of this.parts[name]) p.visible = true;
      }
    }

    const m = this.materials;
    m.cloth.color.set(v.color); m.accent.color.set(v.accent); m.skin.color.set(v.skin); m.hair.color.set(v.hair); m.pants.color.set(v.bottomColor || '#202a3b'); m.pupil.color.set(v.eyeColor || '#171b24');
    const build = { slim: 0.9, athletic: 1, bulky: 1.14 }[v.build] || 1;
    const width = (Number(v.width) || 100) / 100 * build;
    const height = (Number(v.height) || 100) / 100;
    const legs = (Number(v.legs) || 100) / 100;
    const muscle = (Number(v.muscle) || 50) / 100;
    this.root.scale.set(width, height, 1);
    this.groups.torso.scale.set(1 + muscle * 0.16, 1, 1 + muscle * 0.08);
    this.groups.legL.scale.y = this.groups.legR.scale.y = legs;

    for (const p of this.parts.hairCap || []) { p.visible = v.hairStyle !== 'bald'; p.scale.set(v.hairStyle === 'curly' ? 1.12 : 1, v.hairStyle === 'spiky' ? 0.9 : v.hairStyle === 'long' ? 0.92 : 0.65, 0.95); }
    for (const p of this.parts.hairFringe || []) { p.visible = v.hairStyle !== 'bald' && v.hairStyle !== 'long'; p.scale.set(v.hairStyle === 'spiky' ? 1.2 : v.hairStyle === 'curly' ? 1.08 : 1, v.hairStyle === 'spiky' ? 1.7 : 1, 1); }
    this.clearGenerated();
    const g = this.groups.generated;
    if (v.hairStyle === 'spiky') for (let i = -2; i <= 2; i++) this.addGenerated('hairSpike', new THREE.ConeGeometry(0.07, 0.22 + (2 - Math.abs(i)) * 0.035, 7), m.hair, [i * 0.095, 0.48, 0.02]);
    if (v.hairStyle === 'long') for (const x of [-0.24, 0.24]) this.addGenerated('longHair', new THREE.CapsuleGeometry(0.065, 0.36, 5, 8), m.hair, [x, -0.06, -0.03]);
    if (v.hairStyle === 'curly') for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; this.addGenerated('curl', new THREE.SphereGeometry(0.075, 10, 8), m.hair, [Math.cos(a) * 0.22, 0.38, Math.sin(a) * 0.17]); }

    for (const p of this.parts.beard || []) p.visible = v.beard === 'beard' || v.beard === 'stubble';
    for (const p of this.parts.mustache || []) p.visible = v.beard === 'mustache' || v.beard === 'beard';
    for (const p of this.parts.brows || []) { p.scale.y = v.brows === 'strong' ? 1.8 : 1; p.rotation.z = v.brows === 'angled' ? (p.position.x < 0 ? -0.2 : 0.2) : 0; }
    for (const p of this.parts.head || []) p.scale.set(v.face === 'square' ? 1.04 : v.face === 'round' ? 1.12 : 0.88, v.face === 'round' ? 1 : 1.08, 0.86);

    // Distinct upper garments: tee, jacket panels, hoodie hood/pocket, and vest.
    const top = v.top || 'tee';
    if (top === 'jacket') {
      for (const x of [-0.27, 0.27]) this.addGenerated('jacketPanel', new THREE.BoxGeometry(0.13, 0.72, 0.46), m.accent, [x, 0.02, 0.02]);
      this.addGenerated('jacketZip', new THREE.BoxGeometry(0.018, 0.62, 0.02), m.trim, [0, 0.02, 0.24]);
    } else if (top === 'hoodie') {
      this.addGenerated('hood', new THREE.TorusGeometry(0.2, 0.075, 8, 20, Math.PI), m.accent, [0, 0.36, -0.19]);
      this.addGenerated('hoodPocket', new THREE.BoxGeometry(0.34, 0.12, 0.035), m.accent, [0, -0.2, 0.3]);
      this.addGenerated('hoodCordL', new THREE.CylinderGeometry(0.009, 0.009, 0.18, 6), m.trim, [-0.07, 0.2, 0.25]);
      this.addGenerated('hoodCordR', new THREE.CylinderGeometry(0.009, 0.009, 0.18, 6), m.trim, [0.07, 0.2, 0.25]);
    } else if (top === 'vest') {
      for (const x of [-0.22, 0.22]) this.addGenerated('vestTrim', new THREE.BoxGeometry(0.14, 0.68, 0.035), m.accent, [x, 0, 0.3]);
    } else {
      this.addGenerated('teeLogo', new THREE.BoxGeometry(0.16, 0.16, 0.025), m.accent, [0, 0.04, 0.3]);
    }
    if (v.outfit === 'combat') {
      this.addGenerated('chestArmor', new THREE.BoxGeometry(0.56, 0.16, 0.045), m.accent, [0, 0.25, 0.29]);
      for (const x of [-0.35, 0.35]) this.addGenerated('shoulderPad', new THREE.SphereGeometry(0.16, 12, 10), m.accent, [x, 0.28, 0]);
    } else if (v.outfit === 'street') {
      this.addGenerated('streetHem', new THREE.BoxGeometry(0.72, 0.1, 0.44), m.pants, [0, -0.35, 0]);
    }

    // Separate lower garment details and footwear options.
    if (v.bottom === 'shorts') {
      for (const x of [-0.2, 0.2]) this.addGenerated('shortLeg', new THREE.BoxGeometry(0.28, 0.3, 0.34), m.cloth, [x, 0.73, 0.02]);
    } else if (v.bottom === 'joggers') {
      for (const x of [-0.2, 0.2]) this.addGenerated('joggerStripe', new THREE.BoxGeometry(0.035, 0.58, 0.31), m.accent, [x - 0.1, 0.48, 0.16]);
    }
    if (v.shoes === 'boots') for (const x of [-0.2, 0.2]) this.addGenerated('bootCuff', new THREE.CylinderGeometry(0.17, 0.16, 0.18, 12), m.accent, [x, 0.14, 0]);
    if (v.shoes === 'light') for (const p of this.parts.shoeSole || []) p.visible = false; else for (const p of this.parts.shoeSole || []) p.visible = true;
    if (v.gloves === 'boxing') for (const p of this.parts.gloves || []) p.scale.set(1.3, 1.25, 1.25);
    else for (const p of this.parts.gloves || []) p.scale.set(1, 1, 1);
    for (const p of this.parts.gloves || []) p.visible = v.gloves !== 'none';
    for (const p of this.parts.wristWrap || []) p.visible = v.gloves === 'wraps';

    if (v.accessory === 'glasses') {
      for (const x of [-0.115, 0.115]) this.addGenerated('glassesLens', new THREE.TorusGeometry(0.067, 0.012, 6, 18), m.trim, [x, 0.13, 0.26]);
      this.addGenerated('glassesBridge', new THREE.BoxGeometry(0.08, 0.014, 0.018), m.trim, [0, 0.13, 0.26]);
    } else if (v.accessory === 'headband') {
      this.addGenerated('headband', new THREE.TorusGeometry(0.265, 0.035, 8, 32), m.accent, [0, 0.22, 0]);
    } else if (v.accessory === 'chain') {
      this.addGenerated('chain', new THREE.TorusGeometry(0.2, 0.018, 6, 32, Math.PI), m.accent, [0, -0.32, 0.19]);
    } else if (v.accessory === 'mask') {
      this.addGenerated('mask', new THREE.BoxGeometry(0.34, 0.14, 0.035), m.accent, [0, -0.04, 0.24]);
    }
    this.frameModel();
  }

  animate() {
    if (this.disposed) return;
    this.frame = requestAnimationFrame(this.animate);
    const now = performance.now();
    const t = now * 0.0018;
    const dt = Math.min(0.1, (now - (this.lastTime || now)) * 0.001);
    this.lastTime = now;

    if (this.characterModel && this.currentFighterConfig) {
      const dummy = {
        id: this.currentFighterConfig.id,
        character: this.currentFighterConfig,
        state: 'idle',
        facing: 1,
        facingAngle: 0.18 + Math.sin(now * 0.001 * 0.45) * 0.14,
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vz: 0,
        actionTime: 0
      };
      CharacterModelBuilder.animateFighter(this.characterModel, dummy, now * 0.001, dt);
    } else if (this.groups?.torso) {
      this.groups.torso.rotation.z = Math.sin(t) * 0.012;
      this.groups.armL.rotation.x = Math.sin(t * 1.2) * 0.025;
      this.groups.armR.rotation.x = -Math.sin(t * 1.2) * 0.025;
    }
    this.renderer.render(this.scene, this.camera);
  }
  dispose() {
    this.disposed = true; cancelAnimationFrame(this.frame); this.observer?.disconnect();
    this.characterModel = null;
    this.scene.traverse(o => { if (o.isMesh) { o.geometry.dispose(); if (Array.isArray(o.material)) o.material.forEach(m => m.dispose()); else o.material.dispose(); } });
    this.renderer.dispose(); this.renderer.domElement.remove();
  }
}
