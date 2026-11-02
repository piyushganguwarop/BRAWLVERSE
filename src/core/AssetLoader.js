import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';

/**
 * AssetLoader - Centralized asset loading pipeline for Brawl Wars.
 * Features:
 * - Progress tracking across multiple concurrent assets
 * - Loading event callbacks (onProgress, onLoad, onError)
 * - Cache retention to prevent redundant network fetches
 * - Graceful fallback on missing or corrupted 3D assets
 */
export class AssetLoader {
  constructor() {
    this.textureLoader = new THREE.TextureLoader();
    this.gltfLoader = new GLTFLoader();
    this.cache = new Map();
    this.totalItems = 0;
    this.loadedItems = 0;
    this.failedItems = 0;
    this.listeners = {
      progress: [],
      load: [],
      error: []
    };
  }

  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
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
   * Load a GLTF/GLB model with caching and fallback
   * @param {string} url Model URL
   * @returns {Promise<any>}
   */
  async loadModel(url) {
    if (this.cache.has(url)) {
      return this.cache.get(url);
    }

    this.totalItems++;
    return new Promise((resolve) => {
      this.gltfLoader.load(
        url,
        (gltf) => {
          this.loadedItems++;
          this.cache.set(url, gltf);
          this.emitProgress(url);
          resolve(gltf);
        },
        (xhr) => {
          if (xhr.lengthComputable && xhr.total > 0) {
            const itemRatio = xhr.loaded / xhr.total;
            this.notify('itemProgress', { url, ratio: itemRatio });
          }
        },
        (error) => {
          this.failedItems++;
          this.loadedItems++;
          console.warn(`[AssetLoader] Failed to load model "${url}", will use procedural fallback.`, error);
          this.emitProgress(url);
          this.notify('error', { url, error });
          resolve(null); // Resolve with null so game startup does not hang
        }
      );
    });
  }

  /**
   * Load a texture with caching
   * @param {string} url Texture URL
   * @returns {Promise<THREE.Texture|null>}
   */
  async loadTexture(url) {
    if (this.cache.has(url)) {
      return this.cache.get(url);
    }

    this.totalItems++;
    return new Promise((resolve) => {
      this.textureLoader.load(
        url,
        (texture) => {
          this.loadedItems++;
          this.cache.set(url, texture);
          this.emitProgress(url);
          resolve(texture);
        },
        undefined,
        (error) => {
          this.failedItems++;
          this.loadedItems++;
          console.warn(`[AssetLoader] Failed to load texture "${url}".`, error);
          this.emitProgress(url);
          this.notify('error', { url, error });
          resolve(null);
        }
      );
    });
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

  clear() {
    this.cache.clear();
    this.totalItems = 0;
    this.loadedItems = 0;
    this.failedItems = 0;
  }
}

export const assetLoader = new AssetLoader();
