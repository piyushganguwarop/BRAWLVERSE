/**
 * PerformanceMonitor - Real-time performance metrics tracking for Brawl Wars.
 * Monitors:
 * - Rolling framerate (FPS)
 * - Frame delta time (ms)
 * - Three.js WebGL draw calls & triangle counts
 * - JavaScript heap memory consumption
 * - Toggleable anime-style HUD overlay (F3 or settings toggle)
 */
export class PerformanceMonitor {
  constructor({ renderer = null, updateIntervalMs = 250 } = {}) {
    this.renderer = renderer;
    this.updateIntervalMs = updateIntervalMs;

    this.frameCount = 0;
    this.lastTimestamp = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    this.lastUpdate = this.lastTimestamp;

    this.metrics = {
      fps: 60,
      frameTimeMs: 16.6,
      drawCalls: 0,
      triangles: 0,
      geometries: 0,
      textures: 0,
      heapMb: 0
    };

    this.domElement = null;
    this.visible = false;
  }

  setRenderer(renderer) {
    this.renderer = renderer;
  }

  /**
   * Call once per frame in render loop
   */
  tick(now = (typeof performance !== 'undefined' ? performance.now() : Date.now())) {
    this.frameCount++;
    const delta = now - this.lastTimestamp;
    this.lastTimestamp = now;

    if (now - this.lastUpdate >= this.updateIntervalMs) {
      const elapsed = (now - this.lastUpdate) / 1000;
      this.metrics.fps = Math.round(this.frameCount / elapsed);
      this.metrics.frameTimeMs = Number((delta).toFixed(1));
      this.frameCount = 0;
      this.lastUpdate = now;

      // Extract Three.js renderer info if available
      if (this.renderer?.info) {
        const render = this.renderer.info.render || {};
        const memory = this.renderer.info.memory || {};
        this.metrics.drawCalls = render.calls || 0;
        this.metrics.triangles = render.triangles || 0;
        this.metrics.geometries = memory.geometries || 0;
        this.metrics.textures = memory.textures || 0;
      }

      // Extract Heap memory if browser supports performance.memory
      if (typeof performance !== 'undefined' && performance.memory) {
        this.metrics.heapMb = Number((performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(1));
      }

      if (this.visible && this.domElement) {
        this.renderDom();
      }
    }
  }

  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Attach floating HUD performance panel to DOM
   */
  mount(parent = (typeof document !== 'undefined' ? document.body : null)) {
    if (!parent || typeof document === 'undefined') return;
    if (this.domElement) return;

    const el = document.createElement('div');
    el.id = 'perf-monitor-hud';
    el.style.cssText = `
      position: fixed;
      top: 12px;
      right: 12px;
      z-index: 99999;
      background: rgba(10, 14, 26, 0.88);
      border: 1px solid rgba(0, 240, 255, 0.45);
      border-radius: 6px;
      padding: 6px 12px;
      font-family: 'Courier New', monospace;
      font-size: 11px;
      color: #00f0ff;
      letter-spacing: 1px;
      pointer-events: none;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6);
      display: ${this.visible ? 'block' : 'none'};
    `;
    parent.appendChild(el);
    this.domElement = el;
    this.renderDom();

    // Toggle on F3
    window.addEventListener('keydown', (e) => {
      if (e.code === 'F3') {
        e.preventDefault();
        this.toggle();
      }
    });
  }

  toggle(show = !this.visible) {
    this.visible = show;
    if (this.domElement) {
      this.domElement.style.display = this.visible ? 'block' : 'none';
      if (this.visible) this.renderDom();
    }
  }

  renderDom() {
    if (!this.domElement) return;
    const m = this.metrics;
    const fpsColor = m.fps >= 55 ? '#00f0ff' : m.fps >= 30 ? '#ffd700' : '#ff2a4d';
    this.domElement.innerHTML = `
      <div style="font-weight:bold; color:${fpsColor};">${m.fps} FPS <span style="color:#8899aa;">(${m.frameTimeMs}ms)</span></div>
      <div style="color:#d5e0ea;">Draw Calls: <strong>${m.drawCalls}</strong> | Tris: <strong>${m.triangles.toLocaleString()}</strong></div>
      <div style="color:#8899aa;">VRAM: ${m.textures} tex / ${m.geometries} geom ${m.heapMb ? `| Heap: ${m.heapMb}MB` : ''}</div>
    `;
  }

  destroy() {
    if (this.domElement?.parentNode) {
      this.domElement.parentNode.removeChild(this.domElement);
    }
    this.domElement = null;
  }
}
