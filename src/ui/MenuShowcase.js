import * as THREE from 'three';
import { CharacterModelBuilder } from '../three/CharacterModelBuilder.js';
import { getFighter, roster } from '../characters/roster.js';
import { loadSlots, getActiveCustomSlot, toFighter } from '../characters/CustomFighter.js';

export class MenuShowcase {
  constructor(container) {
    this.container = container;
    this.disposed = false;
    this.frameId = null;
    this.lastTime = performance.now();

    // Scene & Camera setup
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
    this.camera.position.set(0, 1.25, 4.4);
    this.camera.lookAt(0, 0.95, 0);

    // WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.className = 'menu-hero-canvas';
    this.renderer.domElement.setAttribute('aria-label', '3D Champion Showcase');
    this.container.appendChild(this.renderer.domElement);

    // Studio 3-Point Anime Lighting
    const hemiLight = new THREE.HemisphereLight(0xbad2f5, 0x141a29, 2.0);
    this.scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff1d6, 2.8);
    keyLight.position.set(2.5, 4.0, 3.5);
    keyLight.castShadow = true;
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 3.2);
    rimLight.position.set(-3.0, 2.5, -2.5);
    this.scene.add(rimLight);

    const fillLight = new THREE.PointLight(0xe6b84c, 1.2, 8);
    fillLight.position.set(0, 0.4, 2.0);
    this.scene.add(fillLight);

    // Reflective Cyber Pedestal
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(1.35, 1.5, 0.14, 48),
      new THREE.MeshStandardMaterial({ color: 0x171f30, roughness: 0.45, metalness: 0.35 })
    );
    pedestal.position.y = -0.07;
    pedestal.receiveShadow = true;
    this.scene.add(pedestal);

    // Glowing Neon Pedestal Accent Ring
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.22, 0.016, 8, 64),
      new THREE.MeshBasicMaterial({ color: 0xf2c46b })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.005;
    this.scene.add(ring);

    // Model root container
    this.modelRoot = new THREE.Group();
    this.scene.add(this.modelRoot);

    // Load active fighter
    this.loadActiveFighter();

    // Resize handling
    this.resize = this.resize.bind(this);
    this.resize();
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(this.container);

    // Start loop
    this.animate = this.animate.bind(this);
    this.frameId = requestAnimationFrame(this.animate);
  }

  loadActiveFighter() {
    // Clear previous
    while (this.modelRoot.children.length > 0) {
      const child = this.modelRoot.children[0];
      this.modelRoot.remove(child);
    }

    let config = null;
    const useCustom = localStorage.getItem('fighter.custom.use.v1') === '1';
    if (useCustom) {
      const slot = getActiveCustomSlot();
      const saved = loadSlots()[slot];
      if (saved) config = toFighter(saved);
    }

    if (!config) {
      const lastFighterId = localStorage.getItem('fighter.lastSelected') || 'atlas';
      config = getFighter(lastFighterId) || roster[0];
    }

    this.fighterConfig = config;
    this.model = CharacterModelBuilder.build(config);
    this.modelRoot.add(this.model.root);

    // Update hero caption if DOM exists
    const nameEl = document.getElementById('menu-hero-name');
    const styleEl = document.getElementById('menu-hero-style');
    if (nameEl) nameEl.textContent = `${config.name} · ${config.title || 'CHAMPION'}`;
    if (styleEl) styleEl.textContent = `${(config.style || 'BALANCED').toUpperCase()} · SPECIAL: ${config.specialName || 'TITAN BREAKER'}`;
  }

  resize() {
    if (this.disposed || !this.container) return;
    const width = this.container.clientWidth || 360;
    const height = this.container.clientHeight || 420;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  animate() {
    if (this.disposed) return;
    this.frameId = requestAnimationFrame(this.animate);

    const now = performance.now();
    const dt = Math.min(0.1, (now - this.lastTime) * 0.001);
    this.lastTime = now;
    const time = now * 0.001;

    if (this.model) {
      const dummyFighter = {
        id: this.fighterConfig.id,
        character: this.fighterConfig,
        state: 'idle',
        facing: 1,
        facingAngle: 0.20 + Math.sin(time * 0.45) * 0.16,
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vz: 0,
        actionTime: 0
      };
      CharacterModelBuilder.animateFighter(this.model, dummyFighter, time, dt);
    }

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.disposed = true;
    if (this.frameId) cancelAnimationFrame(this.frameId);
    this.observer?.disconnect();
    this.scene?.traverse(o => {
      if (o.isMesh) {
        o.geometry?.dispose();
        if (Array.isArray(o.material)) o.material.forEach(m => m.dispose());
        else o.material?.dispose();
      }
    });
    this.renderer?.dispose();
    this.renderer?.domElement?.remove();
  }
}
