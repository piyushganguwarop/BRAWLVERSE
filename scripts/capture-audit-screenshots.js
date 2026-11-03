import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const PORT = 5186;
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

async function captureAudit() {
  console.log('=== BRAWL WARS PHASE 7: CAPTURING APPLICATION AUDIT SCREENSHOTS ===');
  const server = await startStaticServer();
  const tempProfileDir = path.resolve('.temp-edge-profile-audit');

  const edgeBin = findEdgeBinary();
  const edgeArgs = [
    `--remote-debugging-port=9236`,
    `--user-data-dir=${tempProfileDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--headless=new',
    '--disable-gpu',
    '--window-size=1280,720',
    `http://localhost:${PORT}`
  ];

  console.log(`[Browser] Launching Edge: ${edgeBin}`);
  const edgeProcess = spawn(edgeBin, edgeArgs);

  let versionData = null;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9236/json/version');
      if (res.ok) {
        versionData = await res.json();
        break;
      }
    } catch {}
    await new Promise(r => setTimeout(r, 200));
  }

  if (!versionData) {
    throw new Error('Failed to connect to Edge remote debugging port 9236');
  }

  const listRes = await fetch('http://127.0.0.1:9236/json/list');
  const pages = await listRes.json();
  const gamePage = pages.find(p => p.url.includes(`localhost:${PORT}`)) || pages[0];

  const cdp = new CDPClient(gamePage.webSocketDebuggerUrl);
  await cdp.connect();
  console.log('[CDP] Connected to Edge browser tab.');

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');

  try {
    // 1. Wait for game to boot into MainMenuScene
    console.log('[Step 1] Waiting for game boot...');
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 300));
      try {
        const ready = await cdp.eval('typeof window.__brawlGame !== "undefined" && !!window.__brawlGame.isBooted');
        if (ready) break;
      } catch {}
    }

    await new Promise(r => setTimeout(r, 1000));

    // 1. Main Menu Screen
    console.log('Capturing: 01_main_menu.png');
    await cdp.screenshot('01_main_menu.png');

    // 2. Settings Screen (Main Menu)
    console.log('Navigating to Settings...');
    await cdp.eval(`
      (() => {
        const btn = document.querySelector('button[data-go="settings"]');
        if (btn) btn.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 500));
    console.log('Capturing: 02_settings_screen.png');
    await cdp.screenshot('02_settings_screen.png');

    // 3. Profile Screen (Main Menu)
    console.log('Navigating to Profile...');
    await cdp.eval(`
      (() => {
        const back = document.querySelector('[data-menu-screen="settings"] .menu-back');
        if (back) back.click();
        const profBtn = document.querySelector('button[data-go="profile"]');
        if (profBtn) profBtn.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 500));
    console.log('Capturing: 03_player_profile.png');
    await cdp.screenshot('03_player_profile.png');

    // 4. Return to home and launch Fighter Creator
    console.log('Navigating to Fighter Creator...');
    await cdp.eval(`
      (() => {
        const back = document.querySelector('[data-menu-screen="profile"] .menu-back');
        if (back) back.click();
        const creatorBtn = document.querySelector('button[data-go="creator"]');
        if (creatorBtn) creatorBtn.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 1200));
    console.log('Capturing: 04_fighter_creator.png');
    await cdp.screenshot('04_fighter_creator.png');

    // Close Creator to return to SelectScene
    await cdp.eval(`
      (() => {
        const close = document.getElementById('creator-close');
        if (close) close.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 600));

    // 5. SelectScene (Atlas)
    console.log('Capturing: 05_fighter_select_atlas.png');
    await cdp.screenshot('05_fighter_select_atlas.png');

    // Select Volt
    console.log('Selecting Volt...');
    await cdp.eval(`
      (() => {
        const select = window.__brawlGame.scene.getScene('SelectScene');
        if (select) select.select(1);
      })()
    `);
    await new Promise(r => setTimeout(r, 600));
    console.log('Capturing: 06_fighter_select_volt.png');
    await cdp.screenshot('06_fighter_select_volt.png');

    // Select Rook
    console.log('Selecting Rook...');
    await cdp.eval(`
      (() => {
        const select = window.__brawlGame.scene.getScene('SelectScene');
        if (select) select.select(2);
      })()
    `);
    await new Promise(r => setTimeout(r, 600));
    console.log('Capturing: 07_fighter_select_rook.png');
    await cdp.screenshot('07_fighter_select_rook.png');

    // Cycle Stage to Ancient Temple
    console.log('Cycling Stage to Ancient Temple...');
    await cdp.eval(`
      (() => {
        const select = window.__brawlGame.scene.getScene('SelectScene');
        if (select) select.changeStage(1);
      })()
    `);
    await new Promise(r => setTimeout(r, 600));
    console.log('Capturing: 08_stage_select_temple.png');
    await cdp.screenshot('08_stage_select_temple.png');

    // 9. Start Match (FightScene with Volt vs Rook in Neon District)
    console.log('Launching FightScene...');
    await cdp.eval(`
      new Promise((resolve) => {
        const game = window.__brawlGame;
        const current = game.scene.getScenes(true)[0];
        current.scene.start('FightScene', {
          mode: 'arcade',
          playerId: 'volt',
          cpuId: 'rook',
          stageId: 'neon'
        });

        const checkFight = setInterval(() => {
          const fight = game.scene.getScene('FightScene');
          if (fight && fight.three && fight.player && fight.player.character.id === 'volt') {
            clearInterval(checkFight);
            setTimeout(resolve, 800);
          }
        }, 100);
      });
    `);
    await new Promise(r => setTimeout(r, 1200));
    console.log('Capturing: 09_fight_hud_in_match.png');
    await cdp.screenshot('09_fight_hud_in_match.png');

    // 10. Open Pause Menu
    console.log('Opening Pause Menu...');
    await cdp.eval(`
      (() => {
        const fight = window.__brawlGame.scene.getScene('FightScene');
        if (fight) fight.openPauseMenu();
      })()
    `);
    await new Promise(r => setTimeout(r, 600));
    console.log('Capturing: 10_pause_menu.png');
    await cdp.screenshot('10_pause_menu.png');

    // 11. Open Pause Settings
    console.log('Opening In-Match Pause Settings...');
    await cdp.eval(`
      (() => {
        const fight = window.__brawlGame.scene.getScene('FightScene');
        if (fight) fight.openPauseSettings();
      })()
    `);
    await new Promise(r => setTimeout(r, 600));
    console.log('Capturing: 11_pause_settings.png');
    await cdp.screenshot('11_pause_settings.png');

    // Close pause and trigger match victory
    console.log('Triggering Match Complete / Victory Screen...');
    await cdp.eval(`
      (() => {
        const fight = window.__brawlGame.scene.getScene('FightScene');
        if (fight) {
          fight.closePauseSettings();
          fight.closePauseMenu();
          fight.cpu.health = 0;
          fight.matchFlow.wins.player = 2;
          fight.matchFlow.phase = 'complete';
          fight.matchFlow.matchWinner = 'player';
          fight.finishRound();
        }
      })()
    `);
    await new Promise(r => setTimeout(r, 1000));
    console.log('Capturing: 12_match_victory_results.png');
    await cdp.screenshot('12_match_victory_results.png');

    // 13. Training Lab Screen
    console.log('Launching Training Lab...');
    await cdp.eval(`
      new Promise((resolve) => {
        const game = window.__brawlGame;
        const current = game.scene.getScenes(true)[0];
        document.getElementById('results-panel').hidden = true;
        current.scene.start('FightScene', {
          mode: 'training',
          playerId: 'atlas',
          cpuId: 'myst',
          stageId: 'neon'
        });

        const checkFight = setInterval(() => {
          const fight = game.scene.getScene('FightScene');
          if (fight && fight.three && fight.training) {
            clearInterval(checkFight);
            setTimeout(resolve, 800);
          }
        }, 100);
      });
    `);
    await new Promise(r => setTimeout(r, 1000));
    console.log('Capturing: 13_training_lab_hud.png');
    await cdp.screenshot('13_training_lab_hud.png');

    // 14. Mobile Viewport (390x844) FightScene with Touch Controls
    console.log('Switching to mobile viewport (390x844)...');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    await cdp.eval(`
      (() => {
        window.__brawlGame.scale.resize(390, 844);
        const touch = document.getElementById('touch-controls');
        if (touch) touch.style.display = 'flex';
      })()
    `);
    await new Promise(r => setTimeout(r, 1000));
    console.log('Capturing: 14_mobile_fight_touch.png');
    await cdp.screenshot('14_mobile_fight_touch.png');

    // 15. Mobile Main Menu
    console.log('Navigating to Mobile Main Menu...');
    await cdp.eval(`
      (() => {
        const game = window.__brawlGame;
        const current = game.scene.getScenes(true)[0];
        current.scene.start('MainMenuScene');
      })()
    `);
    await new Promise(r => setTimeout(r, 1000));
    console.log('Capturing: 15_mobile_main_menu.png');
    await cdp.screenshot('15_mobile_main_menu.png');

  } catch (err) {
    console.error('Error during screenshot capture:', err);
  } finally {
    cdp.close();
    edgeProcess.kill('SIGKILL');
    server.close();
    try {
      fs.rmSync(tempProfileDir, { recursive: true, force: true });
    } catch {}
  }
  console.log('=== SCREENSHOT CAPTURE COMPLETE ===');
}

captureAudit().catch(console.error);
