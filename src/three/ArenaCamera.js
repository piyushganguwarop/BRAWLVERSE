import * as THREE from 'three';
import { gameConfig } from '../config/gameConfig.js';

/**
 * ArenaCamera - Angled Third-Person Dynamic Tracking Camera for Brawl Wars
 * 
 * Implements:
 * - Midpoint framing of two fighters in full 3D space (X, Y, Z)
 * - Dynamic separation-based zoom and elevation
 * - Framerate-independent exponential decay smoothing
 * - Containment boundary clamping
 * - Cinematic impact camera shake
 */
export class ArenaCamera {
  constructor({
    fov = 46,
    aspect = 16 / 9,
    near = 0.1,
    far = 150,
    baseDistance = 7.8,
    minDistance = 6.2,
    maxDistance = 14.5,
    baseHeight = 3.2,
    smoothing = 8.5,
    bounds = {
      minX: (gameConfig?.world?.minX ?? -5.4) * 1.25,
      maxX: (gameConfig?.world?.maxX ?? 5.4) * 1.25,
      minZ: (gameConfig?.world?.minZ ?? -2.2) * 1.35,
      maxZ: (gameConfig?.world?.maxZ ?? 2.2) * 1.35,
      minHeight: 2.2,
      maxHeight: 6.5
    }
  } = {}) {
    this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this.baseDistance = baseDistance;
    this.minDistance = minDistance;
    this.maxDistance = maxDistance;
    this.baseHeight = baseHeight;
    this.smoothing = smoothing;
    this.bounds = bounds;

    this.currentPos = new THREE.Vector3(0, baseHeight, baseDistance);
    this.targetPos = new THREE.Vector3(0, baseHeight, baseDistance);
    this.currentLookAt = new THREE.Vector3(0, 1.25, 0);
    this.targetLookAt = new THREE.Vector3(0, 1.25, 0);

    this.camera.position.copy(this.currentPos);
    this.camera.lookAt(this.currentLookAt);

    // Camera shake parameters
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
    this.shakeElapsed = 0;
    this.shakeOffset = new THREE.Vector3();
  }

  /**
   * Update camera position and look-at target
   * @param {THREE.Vector3|{x:number, y:number, z:number}} p1Pos Position of Fighter 1
   * @param {THREE.Vector3|{x:number, y:number, z:number}} [p2Pos] Position of Fighter 2 (optional)
   * @param {number} dt Delta time in seconds
   */
  update(p1Pos, p2Pos, dt = 1 / 60) {
    const p1 = p1Pos || { x: 0, y: 0, z: 0 };
    const p2 = p2Pos || p1;

    // 1. Calculate midpoint in 3D space
    const midX = (p1.x + p2.x) * 0.5;
    const midY = (p1.y + p2.y) * 0.5;
    const midZ = ((p1.z ?? 0) + (p2.z ?? 0)) * 0.5;

    // 2. Calculate separation distance across X and Z
    const dx = p1.x - p2.x;
    const dz = (p1.z ?? 0) - (p2.z ?? 0);
    const separation = Math.sqrt(dx * dx + dz * dz);

    // 3. Dynamic distance and elevation
    const targetDistance = Math.min(
      this.maxDistance,
      Math.max(this.minDistance, this.baseDistance + separation * 0.52)
    );
    const targetHeight = Math.min(
      this.bounds.maxHeight,
      Math.max(this.bounds.minHeight, this.baseHeight + separation * 0.18 + midY * 0.45)
    );

    // 4. Clamped midpoint inside stage bounds
    const clampedMidX = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, midX));
    const clampedMidZ = Math.max(this.bounds.minZ, Math.min(this.bounds.maxZ, midZ));

    // Target camera position (angled behind and above the fighters)
    this.targetPos.set(
      clampedMidX,
      targetHeight,
      clampedMidZ + targetDistance
    );

    // Target look-at: slightly above the midpoint (chest height)
    this.targetLookAt.set(
      clampedMidX,
      1.25 + midY * 0.4,
      clampedMidZ
    );

    // 5. Framerate-independent exponential smoothing: 1 - exp(-lambda * dt)
    const smoothFactor = 1.0 - Math.exp(-this.smoothing * dt);
    this.currentPos.lerp(this.targetPos, Math.min(1.0, smoothFactor));
    this.currentLookAt.lerp(this.targetLookAt, Math.min(1.0, smoothFactor));

    // 6. Camera shake calculation
    this.shakeOffset.set(0, 0, 0);
    if (this.shakeDuration > 0 && this.shakeElapsed < this.shakeDuration) {
      this.shakeElapsed += dt;
      const progress = 1.0 - (this.shakeElapsed / this.shakeDuration);
      const intensity = this.shakeIntensity * progress;
      this.shakeOffset.set(
        (Math.random() - 0.5) * 2 * intensity,
        (Math.random() - 0.5) * 2 * intensity * 0.7,
        (Math.random() - 0.5) * intensity * 0.5
      );
    } else {
      this.shakeDuration = 0;
      this.shakeIntensity = 0;
    }

    // Apply to Three.js camera
    this.camera.position.copy(this.currentPos).add(this.shakeOffset);
    this.camera.lookAt(this.currentLookAt);
  }

  /**
   * Trigger an impact camera shake
   * @param {number} intensity Amplitude of shake in world units
   * @param {number} duration Duration in seconds
   */
  shake(intensity = 0.25, duration = 0.18) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeDuration = Math.max(this.shakeDuration, duration);
    this.shakeElapsed = 0;
  }

  /**
   * Resize camera aspect ratio
   */
  resize(width, height) {
    if (!height) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Instantly snap camera without smoothing (e.g. on round start or reset)
   */
  snap(p1Pos, p2Pos) {
    this.update(p1Pos, p2Pos, 100);
    this.currentPos.copy(this.targetPos);
    this.currentLookAt.copy(this.targetLookAt);
    this.camera.position.copy(this.currentPos);
    this.camera.lookAt(this.currentLookAt);
  }
}

