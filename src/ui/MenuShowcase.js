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
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
    this.camera.position.set(0, 1.15, 5.0);
    this.camera.lookAt(0, 1.05, 0);

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
    const hemiLight = new THREE.HemisphereLight(0xbad2f5, 0x070d17, 2.2);
    this.scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
    keyLight.position.set(2.4, 4.0, 3.5);
    keyLight.castShadow = true;
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x12ddeb, 4.2);
    rimLight.position.set(-2.8, 2.6, -2.4);
    this.scene.add(rimLight);

    const fillLight = new THREE.PointLight(0x162c4a, 1.4, 10);
    fillLight.position.set(0, 0.5, 2.2);
    this.scene.add(fillLight);

    // Reflective Cyber Pedestal
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(1.35, 1.5, 0.14, 48),
      new THREE.MeshStandardMaterial({ color: 0x0d1522, roughness: 0.35, metalness: 0.45 })
    );
    pedestal.position.y = -0.07;
    pedestal.receiveShadow = true;
    this.scene.add(pedestal);

    // Glowing Electric Cyan Pedestal Accent Ring
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.22, 0.018, 8, 64),
      new THREE.MeshBasicMaterial({ color: 0x12ddeb })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.005;
    this.scene.add(ring);

    // Floating Cyber Energy Motes (Atmospheric Particles)
    const particleCount = 45;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    this.particleSpeeds = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 2.8;
      positions[i * 3 + 1] = Math.random() * 2.2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2.4;
      this.particleSpeeds[i] = 0.15 + Math.random() * 0.25;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x12ddeb,
      size: 0.035,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });
    this.particles = new THREE.Points(particleGeo, particleMat);
    this.scene.add(this.particles);

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
    if (nameEl) nameEl.textContent = config.name;
    if (styleEl) styleEl.textContent = config.title || 'THE HEAVYWEIGHT';
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

    if (this.particles) {
      const posAttr = this.particles.geometry.attributes.position;
      const array = posAttr.array;
      for (let i = 0; i < this.particleSpeeds.length; i++) {
        array[i * 3 + 1] += this.particleSpeeds[i] * dt;
        if (array[i * 3 + 1] > 2.4) {
          array[i * 3 + 1] = 0.05;
          array[i * 3] = (Math.random() - 0.5) * 2.8;
          array[i * 3 + 2] = (Math.random() - 0.5) * 2.4;
        }
      }
      posAttr.needsUpdate = true;
      this.particles.rotation.y = time * 0.04;
    }

    if (this.model) {
      const dummyFighter = {
        id: this.fighterConfig.id,
        character: this.fighterConfig,
        state: 'idle',
        facing: 1,
        facingAngle: 0.18 + Math.sin(time * 0.45) * 0.14,
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vz: 0,
        actionTime: 0
      };
      CharacterModelBuilder.animateFighter(this.model, dummyFighter, time, dt);
    }

    this.camera.position.x = Math.sin(time * 0.3) * 0.08;
    this.camera.position.y = 1.15 + Math.cos(time * 0.3) * 0.03;
    this.camera.lookAt(0, 1.05, 0);

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
