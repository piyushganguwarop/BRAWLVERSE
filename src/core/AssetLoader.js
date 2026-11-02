import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';

/**
 * AssetLoader - Centralized asset loading pipeline for Brawl Wars.
 * Features:
 * - In-flight promise caching for concurrent load deduplication
 * - Typed cache keys ('model:<url>', 'texture:<url>')
 * - Resilient failure recovery: failed requests do not permanently poison cache
 * - Reference counted model instances and safe resource ownership
 * - Event callbacks (progress, itemProgress, load, error)
 * - Safe GPU resource disposal on clear
 */
export class AssetLoader {
  constructor() {
    this.textureLoader = new THREE.TextureLoader();
    this.gltfLoader = new GLTFLoader();
    this.cache = new Map();
    this.loadingPromises = new Map();
    this.refCounts = new Map();
    this.instanceRegistry = new Map(); // instance scene -> cache key
    this.totalItems = 0;
    this.loadedItems = 0;
    this.failedItems = 0;
    this.listeners = {
      progress: [],
      load: [],
      error: [],
      itemProgress: []
    };
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return () => {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    };
  }

  notify(event, data) {
    for (const callback of this.listeners[event] || []) {
      try {
        callback(data);
      } catch (err) {
        console.error(`AssetLoader listener error on '${event}':`, err);
      }
    }
  }

  /**
   * Load a GLTF/GLB model with deduplication, caching, and fallback
   * @param {string} url Model URL
   * @returns {Promise<any>}
   */
  async loadModel(url) {
    const key = `model:${url}`;
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    if (this.cache.has(url)) {
      return this.cache.get(url);
    }
    if (this.loadingPromises.has(key)) {
      return this.loadingPromises.get(key);
    }

    this.totalItems++;
    const promise = new Promise((resolve) => {
      this.gltfLoader.load(
        url,
        (gltf) => {
          this.loadedItems++;
          this.cache.set(key, gltf);
          this.loadingPromises.delete(key);
          this.emitProgress(url);
          resolve(gltf);
        },
        (xhr) => {
          if (xhr?.lengthComputable && xhr.total > 0) {
            const itemRatio = xhr.loaded / xhr.total;
            this.notify('itemProgress', { url, ratio: itemRatio, type: 'model' });
          }
        },
        (error) => {
          this.failedItems++;
          this.loadedItems++;
          this.loadingPromises.delete(key); // Do NOT cache failure so retry can work
          console.warn(`[AssetLoader] Failed to load model "${url}", will use procedural fallback.`, error);
          this.emitProgress(url);
          this.notify('error', { url, error, type: 'model' });
          resolve(null); // Resolve with null so game startup does not hang
        }
      );
    });

    this.loadingPromises.set(key, promise);
    return promise;
  }

  /**
   * Load a texture with deduplication and caching
   * @param {string} url Texture URL
   * @returns {Promise<THREE.Texture|null>}
   */
  async loadTexture(url) {
    const key = `texture:${url}`;
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    if (this.cache.has(url)) {
      return this.cache.get(url);
    }
    if (this.loadingPromises.has(key)) {
      return this.loadingPromises.get(key);
    }

    this.totalItems++;
    const promise = new Promise((resolve) => {
      this.textureLoader.load(
        url,
        (texture) => {
          this.loadedItems++;
          this.cache.set(key, texture);
          this.loadingPromises.delete(key);
          this.emitProgress(url);
          resolve(texture);
        },
        (xhr) => {
          if (xhr?.lengthComputable && xhr.total > 0) {
            this.notify('itemProgress', { url, ratio: xhr.loaded / xhr.total, type: 'texture' });
          }
        },
        (error) => {
          this.failedItems++;
          this.loadedItems++;
          this.loadingPromises.delete(key);
          console.warn(`[AssetLoader] Failed to load texture "${url}".`, error);
          this.emitProgress(url);
          this.notify('error', { url, error, type: 'texture' });
          resolve(null);
        }
      );
    });

    this.loadingPromises.set(key, promise);
    return promise;
  }

  emitProgress(itemUrl) {
    const ratio = this.totalItems > 0 ? this.loadedItems / this.totalItems : 1.0;
    this.notify('progress', {
      loaded: this.loadedItems,
      total: this.totalItems,
      failed: this.failedItems,
      ratio,
      itemUrl
    });

    if (this.loadedItems >= this.totalItems && this.totalItems > 0) {
      this.notify('load', { total: this.totalItems });
    }
  }

  /**
   * Loads or retrieves a cached model and returns a cloned instance ready for scene insertion.
   * Clones materials so each instance has independent uniforms and does not destroy shared buffers on release.
   */
  async instantiateModel(url) {
    const key = `model:${url}`;
    const gltf = await this.loadModel(url);
    if (!gltf || !gltf.scene) return null;

    // Increment reference count
    const count = (this.refCounts.get(key) || 0) + 1;
    this.refCounts.set(key, count);

    // Deep clone scene hierarchy
    const clonedScene = gltf.scene.clone(true);

    // Deep clone materials to prevent cross-fighter mutation or premature disposal
    clonedScene.traverse((node) => {
      if (node.isMesh && node.material) {
        node.material = Array.isArray(node.material)
          ? node.material.map(m => m.clone())
          : node.material.clone();
      }
    });

    this.instanceRegistry.set(clonedScene, key);

    return {
      scene: clonedScene,
      animations: gltf.animations || [],
      url,
      release: () => this.releaseInstance(clonedScene)
    };
  }

  /**
   * Release a cloned model instance and decrement its reference count.
   * Disposes the instance's own cloned materials while keeping shared base geometry intact.
   */
  releaseInstance(instanceScene) {
    if (!instanceScene) return;
    const key = this.instanceRegistry.get(instanceScene);
    if (!key) return;

    this.instanceRegistry.delete(instanceScene);
    const count = Math.max(0, (this.refCounts.get(key) || 1) - 1);
    this.refCounts.set(key, count);

    // Dispose instance's cloned materials (do NOT dispose shared base geometry)
    instanceScene.traverse((node) => {
      if (!node.isMesh) return;
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      for (const m of mats) m?.dispose?.();
    });
  }

  /**
   * Safely dispose a cached asset and its GPU resources if no active instances exist.
   * @param {string} url
   * @param {string} [type='model']
   */
  disposeAsset(url, type = 'model') {
    const key = url.includes(':') ? url : `${type}:${url}`;
    const activeRefs = this.refCounts.get(key) || 0;
    if (activeRefs > 0) {
      // Still referenced by an active fighter; do not invalidate active GPU geometry
      return false;
    }

    const asset = this.cache.get(key) || this.cache.get(url);
    if (!asset) return false;

    if (asset.scene) {
      asset.scene.traverse((node) => {
        if (!node.isMesh) return;
        node.geometry?.dispose?.();
        const mats = Array.isArray(node.material) ? node.material : [node.material];
        for (const m of mats) {
          if (!m) continue;
          for (const v of Object.values(m)) if (v?.isTexture) v.dispose?.();
          m.dispose?.();
        }
      });
    } else if (asset.isTexture) {
      asset.dispose?.();
    }

    this.cache.delete(key);
    this.cache.delete(url);
    this.refCounts.delete(key);
    return true;
  }

  clear() {
    for (const key of Array.from(this.cache.keys())) {
      const asset = this.cache.get(key);
      if (asset?.scene) {
        asset.scene.traverse((node) => {
          if (!node.isMesh) return;
          node.geometry?.dispose?.();
          const mats = Array.isArray(node.material) ? node.material : [node.material];
          for (const m of mats) {
            if (!m) continue;
            for (const v of Object.values(m)) if (v?.isTexture) v.dispose?.();
            m.dispose?.();
          }
        });
      } else if (asset?.isTexture) {
        asset.dispose?.();
      }
    }
    this.cache.clear();
    this.loadingPromises.clear();
    this.refCounts.clear();
    this.instanceRegistry.clear();
    this.totalItems = 0;
    this.loadedItems = 0;
    this.failedItems = 0;
  }
}

export const assetLoader = new AssetLoader();
