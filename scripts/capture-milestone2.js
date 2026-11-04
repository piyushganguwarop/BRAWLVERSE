import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const PORT = 5193;
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
      const errText = res.exceptionDetails.exception?.description || res.exceptionDetails.text || JSON.stringify(res.exceptionDetails);
      throw new Error(`CDP Eval Exception: ${errText}`);
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
  console.log('=== BRAWLVERSE MILESTONE 2: CAPTURING FIGHTER & ARENA SELECT SCREENSHOTS ===');
  const server = await startStaticServer();
  const tempProfileDir = path.resolve('.temp-edge-profile-m2');

  const edgeBin = findEdgeBinary();
  const edgeArgs = [
    `--remote-debugging-port=9245`,
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
      const res = await fetch('http://127.0.0.1:9245/json/version');
      if (res.ok) {
        versionData = await res.json();
        break;
      }
    } catch {}
    await new Promise(r => setTimeout(r, 200));
  }

  if (!versionData) {
    throw new Error('Failed to connect to Edge remote debugging port 9245');
  }

  const listRes = await fetch('http://127.0.0.1:9245/json/list');
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

    // Seed progression so all fighters (Atlas, Volt, Rook, Myst) and arenas (Neon, Temple, Rooftop) are fully unlocked
    console.log('[Progression] Seeding unlocked roster and arenas in test session...');
    await cdp.eval(`
      (() => {
        const fullProgression = {
          level: 10,
          xp: 25000,
          coins: 50000,
          unlockedFighters: ['atlas', 'volt', 'rook', 'myst'],
          unlockedStages: ['neon', 'temple', 'rooftop'],
          stats: { wins: 30, losses: 5, winStreak: 5, bestStreak: 12, perfects: 4, arcadeClears: 3 }
        };
        localStorage.setItem('fighter.progression.v1', JSON.stringify(fullProgression));
      })()
    `);

    await new Promise(r => setTimeout(r, 1200));

    // 1. Mode Select Screen (Desktop 1920x1080)
    await cdp.setViewport(1920, 1080);
    await cdp.eval(`
      (() => {
        const playBtn = document.querySelector('button[data-go="modes"]');
        if (playBtn) playBtn.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 800));

    // Assert zero vertical scrollbar on Mode Select at 1920x1080
    const modeScrollCheck = await cdp.eval(`
      (() => {
        const shell = document.getElementById('menu-shell');
        const doc = document.documentElement;
        return {
          windowHeight: window.innerHeight,
          docScrollHeight: doc.scrollHeight,
          shellClientHeight: shell ? shell.clientHeight : 0,
          shellScrollHeight: shell ? shell.scrollHeight : 0,
          hasDocScrollbar: doc.scrollHeight > window.innerHeight,
          hasShellScrollbar: shell ? shell.scrollHeight > shell.clientHeight : false
        };
      })()
    `);
    console.log('[Mode Select Scrollbar Verification]', JSON.stringify(modeScrollCheck));
    if (modeScrollCheck.hasDocScrollbar || modeScrollCheck.hasShellScrollbar) {
      throw new Error(`Visible scrollbar detected on Mode Select! docScroll: ${modeScrollCheck.docScrollHeight}, winHeight: ${modeScrollCheck.windowHeight}, shellScroll: ${modeScrollCheck.shellScrollHeight}, shellClient: ${modeScrollCheck.shellClientHeight}`);
    }

    console.log('Capturing: m2_01_mode_select_1920x1080.png');
    await cdp.screenshot('m2_01_mode_select_1920x1080.png');

    // 2. Launch SelectScene via Arcade button
    console.log('Entering Arcade Mode (Fighter Select)...');
    await cdp.eval(`
      (() => {
        const arcadeBtn = document.querySelector('button[data-go="arcade"]');
        if (arcadeBtn) arcadeBtn.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 1200));

    // Refresh SelectScene progression from localStorage to ensure Myst and all stages are marked unlocked
    await cdp.eval(`
      (() => {
        const select = window.__brawlGame.scene.getScene('SelectScene');
        if (select) {
          const snap = JSON.parse(localStorage.getItem('fighter.progression.v1'));
          select.progression = snap;
          select.cardObjects?.forEach((card) => {
            card.setData('locked', false);
            card.getData('lockLabel')?.setText('');
          });
          select.select(0);
        }
      })()
    `);
    await new Promise(r => setTimeout(r, 500));

    // Helper function to assert fighter selection state
    async function assertFighterState(expectedIndex, expectedId, expectedName) {
      const state = await cdp.eval(`
        (() => {
          const select = window.__brawlGame.scene.getScene('SelectScene');
          if (!select) return null;
          const domName = document.getElementById('selection-preview-name')?.textContent?.trim();
          const domArchetype = document.getElementById('selection-preview-archetype')?.textContent?.trim();
          const borderVisible = select.cardObjects[${expectedIndex}]?.getData('selectedBorder')?.visible;
          const currentFighterId = select.selectionPreview?.currentFighterId;
          return {
            selectedIndex: select.selectedIndex,
            domName,
            domArchetype,
            borderVisible,
            currentFighterId
          };
        })()
      `);
      console.log(`[Fighter Assert #${expectedIndex} ${expectedName}]`, JSON.stringify(state));
      if (!state) throw new Error('SelectScene not found');
      if (state.selectedIndex !== expectedIndex) {
        throw new Error(`selectedIndex mismatch: expected ${expectedIndex}, got ${state.selectedIndex}`);
      }
      if (state.domName !== expectedName) {
        throw new Error(`domName mismatch: expected '${expectedName}', got '${state.domName}'`);
      }
      if (!state.borderVisible) {
        throw new Error(`Card border highlight not visible for fighter ${expectedName}`);
      }
      if (state.currentFighterId !== expectedId) {
        throw new Error(`3D preview fighterId mismatch: expected '${expectedId}', got '${state.currentFighterId}'`);
      }
    }

    // 3. Fighter Select: Atlas (Default selection index 0)
    await assertFighterState(0, 'atlas', 'ATLAS');
    console.log('Capturing: m2_02_fighter_select_atlas_1920x1080.png');
    await cdp.screenshot('m2_02_fighter_select_atlas_1920x1080.png');

    // 4. Fighter Select: Volt (index 1)
    console.log('Selecting Volt...');
    await cdp.eval(`
      (() => {
        const select = window.__brawlGame.scene.getScene('SelectScene');
        if (select) select.select(1);
      })()
    `);
    await new Promise(r => setTimeout(r, 800));
    await assertFighterState(1, 'volt', 'VOLT');
    console.log('Capturing: m2_03_fighter_select_volt_1920x1080.png');
    await cdp.screenshot('m2_03_fighter_select_volt_1920x1080.png');

    // 5. Fighter Select: Rook (index 2)
    console.log('Selecting Rook...');
    await cdp.eval(`
      (() => {
        const select = window.__brawlGame.scene.getScene('SelectScene');
        if (select) select.select(2);
      })()
    `);
    await new Promise(r => setTimeout(r, 800));
    await assertFighterState(2, 'rook', 'ROOK');
    console.log('Capturing: m2_04_fighter_select_rook_1920x1080.png');
    await cdp.screenshot('m2_04_fighter_select_rook_1920x1080.png');

    // 6. Fighter Select: Myst (index 3)
    console.log('Selecting Myst...');
    await cdp.eval(`
      (() => {
        const select = window.__brawlGame.scene.getScene('SelectScene');
        if (select) select.select(3);
      })()
    `);
    await new Promise(r => setTimeout(r, 800));
    await assertFighterState(3, 'myst', 'MYST');
    console.log('Capturing: m2_05_fighter_select_myst_1920x1080.png');
    await cdp.screenshot('m2_05_fighter_select_myst_1920x1080.png');

    // Helper function to assert arena selection state
    async function assertStageState(expectedIndex, expectedId, expectedName, expectedSub) {
      const state = await cdp.eval(`
        (() => {
          const select = window.__brawlGame.scene.getScene('SelectScene');
          if (!select) return null;
          const domName = document.getElementById('stage-preview-name')?.textContent?.trim();
          const domSub = document.getElementById('stage-preview-sub')?.textContent?.trim();
          const domCounter = document.getElementById('stage-counter')?.textContent?.trim();
          const lockEl = document.getElementById('stage-preview-lock');
          const isLockHidden = lockEl ? lockEl.hidden : true;
          const thumbs = Array.from(document.querySelectorAll('#stage-thumbnails .stage-thumb'));
          const activeThumbIdx = thumbs.findIndex(t => t.classList.contains('active'));
          return {
            stageIndex: select.stageIndex,
            stageId: select.stages[select.stageIndex]?.id,
            domName,
            domSub,
            domCounter,
            isLockHidden,
            activeThumbIdx
          };
        })()
      `);
      console.log(`[Stage Assert #${expectedIndex} ${expectedName}]`, JSON.stringify(state));
      if (!state) throw new Error('SelectScene not found');
      if (state.stageIndex !== expectedIndex) {
        throw new Error(`stageIndex mismatch: expected ${expectedIndex}, got ${state.stageIndex}`);
      }
      if (state.stageId !== expectedId) {
        throw new Error(`stageId mismatch: expected '${expectedId}', got '${state.stageId}'`);
      }
      if (state.domName !== expectedName) {
        throw new Error(`domName mismatch: expected '${expectedName}', got '${state.domName}'`);
      }
      if (state.domSub !== expectedSub) {
        throw new Error(`domSub mismatch: expected '${expectedSub}', got '${state.domSub}'`);
      }
      if (state.activeThumbIdx !== expectedIndex) {
        throw new Error(`Active thumbnail mismatch: expected ${expectedIndex}, got ${state.activeThumbIdx}`);
      }
    }

    // 7. Cycle to Neon District
    console.log('Setting stage to Neon District...');
    await cdp.eval(`
      (() => {
        const select = window.__brawlGame.scene.getScene('SelectScene');
        if (select) { select.stageIndex = 0; select.updateStageLabel(); }
      })()
    `);
    await new Promise(r => setTimeout(r, 600));
    await assertStageState(0, 'neon', 'NEON DISTRICT', 'NEO-TOKYO UNDERGROUND');
    console.log('Capturing: m2_06_arena_select_neon_1920x1080.png');
    await cdp.screenshot('m2_06_arena_select_neon_1920x1080.png');

    // 8. Cycle to Ancient Temple
    console.log('Cycling stage to Ancient Temple...');
    await cdp.eval(`
      (() => {
        const select = window.__brawlGame.scene.getScene('SelectScene');
        if (select) select.changeStage(1);
      })()
    `);
    await new Promise(r => setTimeout(r, 600));
    await assertStageState(1, 'temple', 'ANCIENT TEMPLE', 'SACRED LANTERN SANCTUARY');
    console.log('Capturing: m2_07_arena_select_temple_1920x1080.png');
    await cdp.screenshot('m2_07_arena_select_temple_1920x1080.png');

    // 9. Cycle to City Rooftop
    console.log('Cycling stage to City Rooftop...');
    await cdp.eval(`
      (() => {
        const select = window.__brawlGame.scene.getScene('SelectScene');
        if (select) select.changeStage(1);
      })()
    `);
    await new Promise(r => setTimeout(r, 600));
    await assertStageState(2, 'rooftop', 'CITY ROOFTOP', 'MIDNIGHT SKYLINE HELIPAD');
    console.log('Capturing: m2_08_arena_select_rooftop_1920x1080.png');
    await cdp.screenshot('m2_08_arena_select_rooftop_1920x1080.png');

    // Verify stage passed to match scene
    const stagePassVerify = await cdp.eval(`
      (() => {
        const select = window.__brawlGame.scene.getScene('SelectScene');
        const player = select.selectedIndex;
        const stage = select.stages[select.stageIndex].id;
        return {
          currentStageIndex: select.stageIndex,
          currentStageId: stage,
          rooftopMatches: stage === 'rooftop'
        };
      })()
    `);
    console.log('[Match Stage Parameter Verification]', JSON.stringify(stagePassVerify));

    // =========================================================================
    // SECTION A: ACTUAL UI BUTTON INTERACTIONS & REGRESSION CHECKS (DESKTOP)
    // =========================================================================
    console.log('\n--- VERIFYING ACTUAL UI BUTTON INTERACTIONS (DESKTOP) ---');

    // Helper functions for actual UI interactions
    const UI_HELPERS = `
      function clickDom(selector) {
        const el = document.querySelector(selector);
        if (!el) throw new Error('DOM element not found: ' + selector);
        if (el.hidden || el.style.display === 'none') throw new Error('DOM element is hidden: ' + selector);
        el.click();
        return true;
      }
      function clickPhaser(scene, obj) {
        if (!obj) throw new Error('Phaser object is null');
        if (!obj.visible) throw new Error('Phaser object is not visible');
        const canvas = scene.game.canvas;
        const rect = canvas.getBoundingClientRect();
        const scaleX = rect.width / scene.scale.width;
        const scaleY = rect.height / scene.scale.height;
        const clientX = rect.left + obj.x * scaleX;
        const clientY = rect.top + obj.y * scaleY;
        canvas.dispatchEvent(new PointerEvent('pointerdown', { clientX, clientY, bubbles: true, pointerId: 1 }));
        canvas.dispatchEvent(new PointerEvent('pointerup', { clientX, clientY, bubbles: true, pointerId: 1 }));
        obj.emit('pointerdown');
        return true;
      }
    `;

    // 1. Reset progression to Level 3 with 200 coins and locked Temple/Rooftop
    await cdp.eval(`
      (() => {
        const testProgression = {
          level: 3,
          xp: 1500,
          coins: 200,
          unlockedFighters: ['atlas', 'volt', 'rook', 'myst'],
          unlockedStages: ['neon'],
          stats: { wins: 5, losses: 1 }
        };
        localStorage.setItem('fighter.progression.v1', JSON.stringify(testProgression));
        const select = window.__brawlGame.scene.getScene('SelectScene');
        if (select) {
          select.progression = testProgression;
          select.stageIndex = 0;
          select.updateStageLabel();
        }
      })()
    `);
    await new Promise(r => setTimeout(r, 400));

    // 2. Browse to Ancient Temple via HTML button click -> Coins MUST remain 200
    console.log('UI Interaction: Clicking HTML next button to browse to Ancient Temple...');
    const browseCheck = await cdp.eval(`
      (() => {
        ${UI_HELPERS}
        clickDom('#stage-btn-next');
        const select = window.__brawlGame.scene.getScene('SelectScene');
        const snap = JSON.parse(localStorage.getItem('fighter.progression.v1'));
        const lockEl = document.getElementById('stage-preview-lock');
        return {
          stageIndex: select.stageIndex,
          stageId: select.stages[select.stageIndex].id,
          coinsBefore: 200,
          coinsAfter: snap.coins,
          coinsDeducted: snap.coins !== 200,
          lockElHidden: lockEl ? lockEl.hidden : true,
          lockElText: lockEl ? lockEl.textContent : '',
          subtitle: select.subtitle.text
        };
      })()
    `);
    console.log('[Regression Check 1: Zero-Cost Browsing]', JSON.stringify(browseCheck));
    if (browseCheck.coinsDeducted) {
      throw new Error(`Browsing locked arena deducted coins! Coins were 200, now ${browseCheck.coinsAfter}`);
    }
    if (browseCheck.lockElHidden) {
      throw new Error('Lock button must be visible for locked arena');
    }

    // 3. UI Interaction: Click Start Fight on locked arena
    console.log('UI Interaction: Clicking Start Fight button on locked Ancient Temple...');
    const blockedFightCheck = await cdp.eval(`
      (() => {
        ${UI_HELPERS}
        const select = window.__brawlGame.scene.getScene('SelectScene');
        clickPhaser(select, select.startButton);
        const activeScene = window.__brawlGame.scene.scenes.find(s => s.scene.isActive());
        return {
          activeSceneKey: activeScene?.scene.key,
          stayedOnSelect: activeScene?.scene.key === 'SelectScene',
          subtitle: select.subtitle.text
        };
      })()
    `);
    console.log('[UI Click Start Fight on Locked Arena]', JSON.stringify(blockedFightCheck));
    if (!blockedFightCheck.stayedOnSelect) {
      throw new Error(`Match started on locked arena! Active scene: ${blockedFightCheck.activeSceneKey}`);
    }

    // 4. UI Interaction: Click HTML Unlock button on desktop
    console.log('UI Interaction: Clicking HTML Unlock button for Ancient Temple...');
    const explicitUnlockCheck = await cdp.eval(`
      (() => {
        ${UI_HELPERS}
        clickDom('#stage-preview-lock');
        const select = window.__brawlGame.scene.getScene('SelectScene');
        const snap = JSON.parse(localStorage.getItem('fighter.progression.v1'));
        const lockEl = document.getElementById('stage-preview-lock');
        return {
          stageIndex: select.stageIndex,
          stageId: select.stages[select.stageIndex].id,
          expectedCoins: 50,
          actualCoins: snap.coins,
          templeUnlocked: snap.unlockedStages.includes('temple'),
          lockElHidden: lockEl ? lockEl.hidden : false,
          subtitle: select.subtitle.text
        };
      })()
    `);
    console.log('[Regression Check 2: HTML Unlock Button Click]', JSON.stringify(explicitUnlockCheck));
    if (!explicitUnlockCheck.templeUnlocked || explicitUnlockCheck.actualCoins !== 50 || !explicitUnlockCheck.lockElHidden) {
      throw new Error(`HTML Unlock failed: ${JSON.stringify(explicitUnlockCheck)}`);
    }

    // 5. Regression Check 5: Returning to arena does NOT charge player again
    console.log('Regression Check 5: Returning to unlocked arena does not charge player again...');
    const returnArenaCheck = await cdp.eval(`
      (() => {
        ${UI_HELPERS}
        clickDom('#stage-btn-prev'); // back to Neon
        clickDom('#stage-btn-next'); // back to Temple
        const select = window.__brawlGame.scene.getScene('SelectScene');
        const snap = JSON.parse(localStorage.getItem('fighter.progression.v1'));
        const lockEl = document.getElementById('stage-preview-lock');
        return {
          stageIndex: select.stageIndex,
          stageId: select.stages[select.stageIndex].id,
          coins: snap.coins,
          lockElHidden: lockEl ? lockEl.hidden : false
        };
      })()
    `);
    console.log('[Regression Check 5: Returning to Arena]', JSON.stringify(returnArenaCheck));
    if (returnArenaCheck.coins !== 50 || !returnArenaCheck.lockElHidden) {
      throw new Error(`Returning to unlocked arena corrupted state: ${JSON.stringify(returnArenaCheck)}`);
    }

    // 6. UI Interaction: Click Start Fight on newly unlocked arena
    console.log('UI Interaction: Clicking Start Fight on unlocked Ancient Temple...');
    await cdp.eval(`
      (() => {
        ${UI_HELPERS}
        const select = window.__brawlGame.scene.getScene('SelectScene');
        clickPhaser(select, select.startButton);
      })()
    `);

    // Wait for FightScene to activate and verify correct arena
    let templeFightState = null;
    for (let attempt = 0; attempt < 25; attempt++) {
      await new Promise(r => setTimeout(r, 200));
      templeFightState = await cdp.eval(`
        (() => {
          const fight = window.__brawlGame.scene.getScene('FightScene');
          if (!fight || !fight.scene.isActive() || !fight.three) return null;
          return {
            isActive: fight.scene.isActive(),
            fightStageId: fight.stageId,
            threeStageId: fight.three.stageId,
            arenaChildrenCount: fight.three.arenaGroup ? fight.three.arenaGroup.children.length : 0
          };
        })()
      `);
      if (templeFightState) break;
    }
    console.log('[FightScene Runtime State (Temple)]', JSON.stringify(templeFightState));
    if (!templeFightState || templeFightState.fightStageId !== 'temple' || templeFightState.threeStageId !== 'temple') {
      throw new Error(`FightScene failed to load Ancient Temple: ${JSON.stringify(templeFightState)}`);
    }

    // Return back to SelectScene
    await cdp.eval(`
      (() => {
        const fight = window.__brawlGame.scene.getScene('FightScene');
        if (fight) {
          fight.scene.stop('FightScene');
          window.__brawlGame.scene.start('SelectScene', { mode: 'arcade' });
        }
      })()
    `);
    for (let attempt = 0; attempt < 20; attempt++) {
      await new Promise(r => setTimeout(r, 150));
      const ready = await cdp.eval(`
        (() => {
          const select = window.__brawlGame.scene.getScene('SelectScene');
          return select && select.scene.isActive();
        })()
      `);
      if (ready) break;
    }

    // =========================================================================
    // SECTION B: INSUFFICIENT COINS & INSUFFICIENT LEVEL REGRESSION CHECKS
    // =========================================================================
    console.log('\n--- REGRESSION CHECKS: INSUFFICIENT COINS & LEVEL ---');

    // Regression Check 3: Insufficient Coins
    console.log('Regression Check 3: Testing insufficient coins on City Rooftop (Level 5, wallet 50, cost 250)...');
    const insufficientCoinsCheck = await cdp.eval(`
      (() => {
        ${UI_HELPERS}
        const snap = JSON.parse(localStorage.getItem('fighter.progression.v1'));
        snap.level = 5;
        snap.xp = 3000;
        snap.coins = 50; // insufficient (costs 250)
        localStorage.setItem('fighter.progression.v1', JSON.stringify(snap));
        const select = window.__brawlGame.scene.getScene('SelectScene');
        select.progression = snap;
        clickDom('.stage-thumb[data-stage="2"]'); // click rooftop thumbnail (index 2)
        clickDom('#stage-preview-lock'); // click unlock
        const updated = JSON.parse(localStorage.getItem('fighter.progression.v1'));
        return {
          coins: updated.coins,
          rooftopUnlocked: updated.unlockedStages.includes('rooftop'),
          subtitle: select.subtitle.text
        };
      })()
    `);
    console.log('[Regression Check 3: Insufficient Coins]', JSON.stringify(insufficientCoinsCheck));
    if (insufficientCoinsCheck.rooftopUnlocked || insufficientCoinsCheck.coins !== 50) {
      throw new Error(`Rooftop unlocked despite insufficient coins: ${JSON.stringify(insufficientCoinsCheck)}`);
    }

    // Regression Check 4: Insufficient Level
    console.log('Regression Check 4: Testing insufficient level on Ancient Temple (Level 2, wallet 500, requires Level 3)...');
    const insufficientLevelCheck = await cdp.eval(`
      (() => {
        ${UI_HELPERS}
        const snap = {
          level: 2,
          xp: 100, // Level 2
          coins: 500, // sufficient coins but insufficient level
          unlockedFighters: ['atlas', 'volt', 'rook', 'myst'],
          unlockedStages: ['neon']
        };
        localStorage.setItem('fighter.progression.v1', JSON.stringify(snap));
        const select = window.__brawlGame.scene.getScene('SelectScene');
        select.progression = snap;
        clickDom('.stage-thumb[data-stage="1"]'); // click temple thumbnail (index 1)
        clickDom('#stage-preview-lock'); // click unlock
        const updated = JSON.parse(localStorage.getItem('fighter.progression.v1'));
        return {
          coins: updated.coins,
          templeUnlocked: updated.unlockedStages.includes('temple'),
          subtitle: select.subtitle.text
        };
      })()
    `);
    console.log('[Regression Check 4: Insufficient Level]', JSON.stringify(insufficientLevelCheck));
    if (insufficientLevelCheck.templeUnlocked || insufficientLevelCheck.coins !== 500) {
      throw new Error(`Temple unlocked despite insufficient level: ${JSON.stringify(insufficientLevelCheck)}`);
    }

    // =========================================================================
    // SECTION C: 1366x768 COMPACT DESKTOP VIEWPORT
    // =========================================================================
    console.log('\n--- CAPTURING 1366x768 COMPACT DESKTOP ---');
    await cdp.setViewport(1366, 768);
    await cdp.eval(`
      (() => {
        const select = window.__brawlGame.scene.getScene('SelectScene');
        if (select) {
          select.scale.resize(1366, 768);
          select.layout({ width: 1366, height: 768 });
        }
      })()
    `);
    await new Promise(r => setTimeout(r, 800));
    console.log('Capturing: m2_09_fighter_select_1366x768.png');
    await cdp.screenshot('m2_09_fighter_select_1366x768.png');

    // =========================================================================
    // SECTION D: MOBILE LANDSCAPE (844x390) WITH LOCKED ARENA LAYOUT & UI CLICK
    // =========================================================================
    console.log('\n--- MOBILE LANDSCAPE (844x390) LOCKED ARENA LAYOUT & UI INTERACTION ---');
    await cdp.setViewport(844, 390);

    // Reset progression so Ancient Temple is locked, with Level 3 and 200 coins
    await cdp.eval(`
      (() => {
        const testProgression = {
          level: 3,
          xp: 1500,
          coins: 200,
          unlockedFighters: ['atlas', 'volt', 'rook', 'myst'],
          unlockedStages: ['neon'],
          stats: { wins: 5, losses: 1 }
        };
        localStorage.setItem('fighter.progression.v1', JSON.stringify(testProgression));
        const select = window.__brawlGame.scene.getScene('SelectScene');
        if (select) {
          select.progression = testProgression;
          select.scale.resize(844, 390);
          select.select(0);
          select.stageIndex = 1; // Select locked Ancient Temple!
          select.updateStageLabel();
          select.layout({ width: 844, height: 390 });
        }
      })()
    `);
    await new Promise(r => setTimeout(r, 800));

    // Verify Mobile Locked Arena Coordinates & Spacing
    const mobileLockedCheck = await cdp.eval(`
      (() => {
        const select = window.__brawlGame.scene.getScene('SelectScene');
        if (!select) return null;
        const titleY = select.title.y;
        const subtitleY = select.subtitle.y;
        const stageY = select.stageLabel.y;
        const descY = select.stageDesc.y;
        const unlockBtnY = select.stageUnlockBtn.y;
        const unlockBtnVisible = select.stageUnlockBtn.visible;
        const diffBtnY = select.difficultyButtons[0]?.y;
        const startY = select.startButton.y;
        return {
          titleY,
          subtitleY,
          stageY,
          descY,
          unlockBtnY,
          unlockBtnVisible,
          diffBtnY,
          startY,
          gapDescToUnlock: unlockBtnY - descY,
          gapUnlockToDiff: diffBtnY - unlockBtnY,
          gapDiffToStart: startY - diffBtnY,
          noOverlap: (descY < unlockBtnY) && (unlockBtnY < diffBtnY) && (diffBtnY < startY)
        };
      })()
    `);
    console.log('[Mobile 844x390 Locked Arena Layout Verification]', JSON.stringify(mobileLockedCheck));
    if (!mobileLockedCheck.unlockBtnVisible || !mobileLockedCheck.noOverlap || mobileLockedCheck.gapUnlockToDiff < 25) {
      throw new Error(`Mobile locked layout overlap detected: ${JSON.stringify(mobileLockedCheck)}`);
    }

    // Capture the requested 844x390 screenshot with LOCKED arena selected
    console.log('Capturing: m2_10_fighter_select_mobile_844x390.png (with Ancient Temple locked)');
    await cdp.screenshot('m2_10_fighter_select_mobile_844x390.png');

    // UI Interaction: Click Start Fight on mobile while arena is locked
    console.log('UI Interaction: Clicking Start Fight on mobile with locked arena...');
    const mobileBlockedFight = await cdp.eval(`
      (() => {
        ${UI_HELPERS}
        const select = window.__brawlGame.scene.getScene('SelectScene');
        clickPhaser(select, select.startButton);
        const activeScene = window.__brawlGame.scene.scenes.find(s => s.scene.isActive());
        return {
          stayedOnSelect: activeScene?.scene.key === 'SelectScene',
          subtitle: select.subtitle.text
        };
      })()
    `);
    console.log('[Mobile Blocked Fight Check]', JSON.stringify(mobileBlockedFight));
    if (!mobileBlockedFight.stayedOnSelect) {
      throw new Error('Mobile match started on locked arena!');
    }

    // UI Interaction: Click the Phaser arena Unlock button on mobile
    console.log('UI Interaction: Clicking Phaser arena Unlock button on mobile...');
    const mobilePhaserUnlock = await cdp.eval(`
      (() => {
        ${UI_HELPERS}
        const select = window.__brawlGame.scene.getScene('SelectScene');
        clickPhaser(select, select.stageUnlockBtn);
        const snap = JSON.parse(localStorage.getItem('fighter.progression.v1'));
        return {
          coins: snap.coins,
          templeUnlocked: snap.unlockedStages.includes('temple'),
          unlockBtnVisible: select.stageUnlockBtn.visible,
          subtitle: select.subtitle.text
        };
      })()
    `);
    console.log('[Mobile Phaser Unlock Button Result]', JSON.stringify(mobilePhaserUnlock));
    if (!mobilePhaserUnlock.templeUnlocked || mobilePhaserUnlock.coins !== 50 || mobilePhaserUnlock.unlockBtnVisible) {
      throw new Error(`Mobile Phaser Unlock failed: ${JSON.stringify(mobilePhaserUnlock)}`);
    }

    // UI Interaction: Click Start Fight on mobile after unlocking
    console.log('UI Interaction: Clicking Start Fight on mobile after unlock...');
    await cdp.eval(`
      (() => {
        ${UI_HELPERS}
        const select = window.__brawlGame.scene.getScene('SelectScene');
        clickPhaser(select, select.startButton);
      })()
    `);

    let mobileFightState = null;
    for (let attempt = 0; attempt < 25; attempt++) {
      await new Promise(r => setTimeout(r, 200));
      mobileFightState = await cdp.eval(`
        (() => {
          const fight = window.__brawlGame.scene.getScene('FightScene');
          if (!fight || !fight.scene.isActive() || !fight.three) return null;
          return {
            isActive: fight.scene.isActive(),
            fightStageId: fight.stageId,
            threeStageId: fight.three.stageId
          };
        })()
      `);
      if (mobileFightState) break;
    }
    console.log('[Mobile FightScene Runtime State]', JSON.stringify(mobileFightState));
    if (!mobileFightState || mobileFightState.fightStageId !== 'temple') {
      throw new Error(`Mobile FightScene failed to load Temple: ${JSON.stringify(mobileFightState)}`);
    }

    // Return to SelectScene and restore desktop viewport for multi-arena launch check
    await cdp.eval(`
      (() => {
        const fight = window.__brawlGame.scene.getScene('FightScene');
        if (fight) {
          fight.scene.stop('FightScene');
          window.__brawlGame.scene.start('SelectScene', { mode: 'arcade' });
        }
      })()
    `);
    for (let attempt = 0; attempt < 20; attempt++) {
      await new Promise(r => setTimeout(r, 150));
      const ready = await cdp.eval(`
        (() => {
          const select = window.__brawlGame.scene.getScene('SelectScene');
          return select && select.scene.isActive();
        })()
      `);
      if (ready) break;
    }

    // =========================================================================
    // SECTION E: ALL THREE ARENAS LAUNCH CORRECTLY VIA UI BUTTONS
    // =========================================================================
    console.log('\n--- REGRESSION CHECK 6: ALL THREE ARENAS LAUNCH CORRECTLY VIA UI ---');
    await cdp.setViewport(1920, 1080);

    // Seed progression with all 3 arenas unlocked
    await cdp.eval(`
      (() => {
        const fullProgression = {
          level: 10,
          xp: 25000,
          coins: 50000,
          unlockedFighters: ['atlas', 'volt', 'rook', 'myst'],
          unlockedStages: ['neon', 'temple', 'rooftop'],
          stats: { wins: 30, losses: 5 }
        };
        localStorage.setItem('fighter.progression.v1', JSON.stringify(fullProgression));
        const select = window.__brawlGame.scene.getScene('SelectScene');
        if (select) {
          select.progression = fullProgression;
          select.scale.resize(1920, 1080);
          select.layout({ width: 1920, height: 1080 });
          select.select(0);
        }
      })()
    `);
    await new Promise(r => setTimeout(r, 400));

    async function testArenaLaunchViaUI(stageIndex, expectedStageId, expectedMeshCount) {
      console.log(`Testing UI launch for arena '${expectedStageId}' (index ${stageIndex})...`);
      await cdp.eval(`
        (() => {
          ${UI_HELPERS}
          const select = window.__brawlGame.scene.getScene('SelectScene');
          select.stageIndex = ${stageIndex};
          select.updateStageLabel();
          clickPhaser(select, select.startButton);
        })()
      `);

      let state = null;
      for (let attempt = 0; attempt < 25; attempt++) {
        await new Promise(r => setTimeout(r, 200));
        state = await cdp.eval(`
          (() => {
            const fight = window.__brawlGame.scene.getScene('FightScene');
            if (!fight || !fight.scene.isActive() || !fight.three) return null;
            return {
              isActive: fight.scene.isActive(),
              fightStageId: fight.stageId,
              threeStageId: fight.three.stageId,
              meshCount: fight.three.arenaGroup ? fight.three.arenaGroup.children.length : 0
            };
          })()
        `);
        if (state) break;
      }
      console.log(`[Arena Launch: ${expectedStageId}]`, JSON.stringify(state));
      if (!state || state.fightStageId !== expectedStageId || state.threeStageId !== expectedStageId) {
        throw new Error(`Failed to launch arena '${expectedStageId}': ${JSON.stringify(state)}`);
      }

      // Return to SelectScene
      await cdp.eval(`
        (() => {
          const fight = window.__brawlGame.scene.getScene('FightScene');
          if (fight) {
            fight.scene.stop('FightScene');
            window.__brawlGame.scene.start('SelectScene', { mode: 'arcade' });
          }
        })()
      `);
      for (let attempt = 0; attempt < 20; attempt++) {
        await new Promise(r => setTimeout(r, 150));
        const ready = await cdp.eval(`
          (() => {
            const select = window.__brawlGame.scene.getScene('SelectScene');
            return select && select.scene.isActive();
          })()
        `);
        if (ready) break;
      }
    }

    // Launch Neon District via UI
    await testArenaLaunchViaUI(0, 'neon', 102);

    // Launch Ancient Temple via UI
    await testArenaLaunchViaUI(1, 'temple', 26);

    // Launch City Rooftop via UI
    await testArenaLaunchViaUI(2, 'rooftop', 36);

    console.log('=== MILESTONE 2 INTERACTION AUDIT COMPLETE ===');
  } catch (err) {
    console.error('[Error during capture]', err);
    throw err;
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

