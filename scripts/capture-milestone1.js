import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const PORT = 5192;
const DIST_DIR = path.resolve('dist');
const OUTPUT_DIR = path.resolve('docs/audit_screenshots');
const ARTIFACT_IMG_DIR = 'C:\\Users\\piyush\\.gemini\\antigravity\\brain\\9dfb95c2-6a48-46bc-b32c-952e5b0ed0e7\\screenshots';

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.mkdirSync(ARTIFACT_IMG_DIR, { recursive: true });

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

function startStaticServer() {
  const server = http.createServer((req, res) => {
    let reqPath = decodeURI(req.url.split('?')[0]);
    if (reqPath === '/') reqPath = '/index.html';
    const filePath = path.join(DIST_DIR, reqPath);

    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found: ' + reqPath);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });

  return new Promise((resolve) => {
    server.listen(PORT, '127.0.0.1', () => {
      console.log(`[HTTP Server] Serving production dist/ on http://localhost:${PORT}`);
      resolve(server);
    });
  });
}

function findEdgeBinary() {
  const candidates = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    process.env.LOCALAPPDATA + '\\Microsoft\\Edge\\Application\\msedge.exe'
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return 'msedge';
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.id = 1;
    this.callbacks = new Map();
  }

  async connect() {
    const WebSocketModule = await import('ws');
    const WebSocket = WebSocketModule.WebSocket || WebSocketModule.default;
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.on('open', resolve);
      this.ws.on('error', reject);
    });

    this.ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expr) {
    const res = await this.send('Runtime.evaluate', {
      expression: expr,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error(`CDP Eval Exception: ${res.exceptionDetails.text || JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result?.value;
  }

  async setViewport(width, height) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 900
    });
  }

  async screenshot(filename) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.data, 'base64');
    const localPath = path.join(OUTPUT_DIR, filename);
    const artifactPath = path.join(ARTIFACT_IMG_DIR, filename);
    fs.writeFileSync(localPath, buffer);
    fs.writeFileSync(artifactPath, buffer);
    console.log(`[Screenshot Saved] ${filename} (${buffer.length} bytes)`);
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

async function run() {
  console.log('=== BRAWLVERSE MILESTONE 1: CAPTURING MAIN MENU & MODE SELECT SCREENSHOTS ===');
  const server = await startStaticServer();
  const tempProfileDir = path.resolve('.temp-edge-profile-m1');

  const edgeBin = findEdgeBinary();
  const edgeArgs = [
    `--remote-debugging-port=9244`,
    `--user-data-dir=${tempProfileDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--headless=new',
    '--disable-gpu',
    '--window-size=1920,1080',
    `http://localhost:${PORT}`
  ];

  console.log(`[Browser] Launching Edge: ${edgeBin}`);
  const edgeProcess = spawn(edgeBin, edgeArgs);

  let versionData = null;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9244/json/version');
      if (res.ok) {
        versionData = await res.json();
        break;
      }
    } catch {}
    await new Promise(r => setTimeout(r, 200));
  }

  if (!versionData) {
    throw new Error('Failed to connect to Edge remote debugging port 9244');
  }

  const listRes = await fetch('http://127.0.0.1:9244/json/list');
  const pages = await listRes.json();
  const gamePage = pages.find(p => p.type === 'page' && p.url.includes(String(PORT)));
  if (!gamePage) throw new Error('Game page not found in Edge');

  const cdp = new CDPClient(gamePage.webSocketDebuggerUrl);
  await cdp.connect();
  console.log('[CDP] Connected to Edge browser tab.');

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');

  try {
    console.log('[Step 1] Waiting for game boot...');
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 300));
      try {
        const ready = await cdp.eval('typeof window.__brawlGame !== "undefined" && !!window.__brawlGame.isBooted');
        if (ready) break;
      } catch {}
    }

    // Wait for Three.js model & showcase to settle
    await new Promise(r => setTimeout(r, 1200));

    // 1. 1920x1080 Desktop Main Menu
    await cdp.setViewport(1920, 1080);
    await new Promise(r => setTimeout(r, 600));
    console.log('Capturing: m1_01_main_menu_1920x1080.png');
    await cdp.screenshot('m1_01_main_menu_1920x1080.png');

    // 2. 1366x768 Compact Desktop Main Menu
    await cdp.setViewport(1366, 768);
    await new Promise(r => setTimeout(r, 600));
    console.log('Capturing: m1_02_main_menu_1366x768.png');
    await cdp.screenshot('m1_02_main_menu_1366x768.png');

    // 3. 844x390 Mobile Landscape Main Menu
    await cdp.setViewport(844, 390);
    await new Promise(r => setTimeout(r, 600));
    console.log('Capturing: m1_03_main_menu_844x390.png');
    await cdp.screenshot('m1_03_main_menu_844x390.png');

    // Reset to 1920x1080 and click PLAY to open Mode Select
    await cdp.setViewport(1920, 1080);
    await new Promise(r => setTimeout(r, 400));
    console.log('Clicking PLAY button...');
    const clickResult = await cdp.eval(`
      (() => {
        const playBtn = document.querySelector('button[data-go="modes"]');
        if (playBtn) {
          playBtn.click();
          return {
            found: true,
            homeHidden: document.querySelector('[data-menu-screen="home"]').hidden,
            modesHidden: document.querySelector('[data-menu-screen="modes"]').hidden
          };
        }
        return { found: false };
      })()
    `);
    console.log('[Click Result]', clickResult);
    await new Promise(r => setTimeout(r, 600));
    console.log('Capturing: m1_04_mode_select_1920x1080.png');
    await cdp.screenshot('m1_04_mode_select_1920x1080.png');

    console.log('=== MILESTONE 1 SCREENSHOT CAPTURE COMPLETE ===');
  } catch (err) {
    console.error('[Error during capture]', err);
  } finally {
    cdp.close();
    edgeProcess.kill();
    server.close();
    try {
      fs.rmSync(tempProfileDir, { recursive: true, force: true });
    } catch {}
  }
}

run();
