import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const PORT = 5185;
const DIST_DIR = path.resolve('dist');

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

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

async function runVerification() {
  console.log('--- BRAWL WARS PHASE 6.4: IN-BROWSER ROSTER & OFFLINE MODES VERIFICATION ---');
  const server = await startStaticServer();
  const tempProfileDir = path.resolve('.temp-edge-profile-p6-modes');

  const edgeBin = findEdgeBinary();
  const edgeArgs = [
    `--remote-debugging-port=9235`,
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
      const res = await fetch('http://127.0.0.1:9235/json/version');
      if (res.ok) {
        versionData = await res.json();
        break;
      }
    } catch {}
    await new Promise(r => setTimeout(r, 200));
  }

  if (!versionData) {
    throw new Error('Failed to connect to Edge remote debugging port 9235');
  }

  const listRes = await fetch('http://127.0.0.1:9235/json/list');
  const pages = await listRes.json();
  const gamePage = pages.find(p => p.url.includes(`localhost:${PORT}`)) || pages[0];

  const cdp = new CDPClient(gamePage.webSocketDebuggerUrl);
  await cdp.connect();
  console.log('[CDP] Connected to Edge browser tab.');

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');

  const results = [];

  try {
    // 1. Wait for game initialization
    console.log('[Step 1] Waiting for game to load and boot...');
    let gameReady = false;
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 300));
      try {
        gameReady = await cdp.eval('typeof window.__brawlGame !== "undefined" && !!window.__brawlGame.isBooted');
        if (gameReady) break;
      } catch {}
    }

    if (!gameReady) {
      throw new Error('Timeout waiting for game to boot');
    }

    // 2. Test SelectScene Navigation and Fighter Selection Previews
    console.log('[Step 2] Testing SelectScene fighter previews for Atlas, Volt, Rook...');
    await cdp.eval(`
      new Promise((resolve) => {
        const game = window.__brawlGame;
        const current = game.scene.getScenes(true)[0];
        current.scene.start('SelectScene', { mode: 'arcade' });

        const checkSelect = setInterval(() => {
          const select = game.scene.getScene('SelectScene');
          if (select && select.scene.isActive() && select.cardObjects && select.cardObjects.length >= 4) {
            clearInterval(checkSelect);
            setTimeout(resolve, 400);
          }
        }, 100);
      });
    `);

    const selectChecks = await cdp.eval(`
      (() => {
        const select = window.__brawlGame.scene.getScene('SelectScene');
        // Test selection of Atlas (0), Volt (1), Rook (2)
        select.select(0);
        const pAtlas = select.selectedIndex === 0 && select.infoName.text === 'ATLAS';
        select.select(1);
        const pVolt = select.selectedIndex === 1 && select.infoName.text === 'VOLT';
        select.select(2);
        const pRook = select.selectedIndex === 2 && select.infoName.text === 'ROOK';
        return { pAtlas, pVolt, pRook };
      })()
    `);
    console.log('[Step 2] SelectScene previews:', selectChecks);
    const step2Pass = selectChecks.pAtlas && selectChecks.pVolt && selectChecks.pRook;
    results.push({ name: 'SelectScene Fighter Selection & Previews', pass: step2Pass, details: selectChecks });

    // 3. Test Arcade Mode with Volt
    console.log('[Step 3] Testing Arcade Mode with Volt...');
    await cdp.eval(`
      new Promise((resolve) => {
        const game = window.__brawlGame;
        const select = game.scene.getScene('SelectScene');
        select.scene.start('FightScene', {
          mode: 'arcade',
          playerId: 'volt',
          cpuId: 'rook',
          stageId: 'neon'
        });

        const checkFight = setInterval(() => {
          const fight = game.scene.getScene('FightScene');
          if (fight && fight.three && fight.player && fight.player.character.id === 'volt' && fight.cpu && fight.cpu.character.id === 'rook') {
            clearInterval(checkFight);
            setTimeout(resolve, 400);
          }
        }, 100);
      });
    `);

    const arcadeFightCheck = await cdp.eval(`
      (() => {
        const fight = window.__brawlGame.scene.getScene('FightScene');
        const pModel = fight.three.fighters.get('player');
        const cpuModel = fight.three.fighters.get(fight.cpu.id);
        return {
          mode: fight.mode,
          playerId: fight.player.character.id,
          cpuId: fight.cpu.character.id,
          playerHasShockBlades: !!(pModel.shockBladeL && pModel.shockBladeR),
          cpuHasPistonPlates: !!(cpuModel.pistonPlateL && cpuModel.pistonPlateR)
        };
      })()
    `);
    console.log('[Step 3] Arcade Fight State:', arcadeFightCheck);
    const step3Pass = arcadeFightCheck.mode === 'arcade' &&
                      arcadeFightCheck.playerId === 'volt' &&
                      arcadeFightCheck.cpuId === 'rook' &&
                      arcadeFightCheck.playerHasShockBlades &&
                      arcadeFightCheck.cpuHasPistonPlates;
    results.push({ name: 'Arcade Mode Match (Volt vs Rook)', pass: step3Pass, details: arcadeFightCheck });

    // 4. Test Training Mode with Rook vs Atlas Dummy
    console.log('[Step 4] Testing Training Mode with Rook vs Atlas Dummy...');
    await cdp.eval(`
      new Promise((resolve) => {
        const game = window.__brawlGame;
        const current = game.scene.getScenes(true)[0];
        current.scene.start('FightScene', {
          mode: 'training',
          playerId: 'rook',
          cpuId: 'atlas',
          stageId: 'neon'
        });

        const checkFight = setInterval(() => {
          const fight = game.scene.getScene('FightScene');
          if (fight && fight.three && fight.training && fight.player.character.id === 'rook' && fight.cpu.character.id === 'atlas') {
            clearInterval(checkFight);
            setTimeout(resolve, 400);
          }
        }, 100);
      });
    `);

    const trainingFightCheck = await cdp.eval(`
      (() => {
        const fight = window.__brawlGame.scene.getScene('FightScene');
        const pModel = fight.three.fighters.get('player');
        const cpuModel = fight.three.fighters.get(fight.cpu.id);
        return {
          training: fight.training,
          playerId: fight.player.character.id,
          cpuId: fight.cpu.character.id,
          pModelId: pModel.fighterId,
          cpuModelId: cpuModel.fighterId,
          pHasSteamVents: !!(pModel.steamVentL && pModel.steamVentR),
          cpuHasGauntletFist: !!cpuModel.fistR
        };
      })()
    `);
    console.log('[Step 4] Training Fight State:', trainingFightCheck);
    const step4Pass = trainingFightCheck.training &&
                      trainingFightCheck.playerId === 'rook' &&
                      trainingFightCheck.cpuId === 'atlas' &&
                      trainingFightCheck.pHasSteamVents &&
                      trainingFightCheck.cpuHasGauntletFist;
    results.push({ name: 'Training Lab (Rook vs Atlas Dummy)', pass: step4Pass, details: trainingFightCheck });

    // 5. Test Local Versus Mode (Myst P1 vs Volt P2)
    console.log('[Step 5] Testing Local Versus Mode (Myst P1 vs Volt P2)...');
    await cdp.eval(`
      new Promise((resolve) => {
        const game = window.__brawlGame;
        const current = game.scene.getScenes(true)[0];
        current.scene.start('FightScene', {
          mode: 'local',
          playerId: 'myst',
          cpuId: 'volt',
          stageId: 'neon'
        });

        const checkFight = setInterval(() => {
          const fight = game.scene.getScene('FightScene');
          if (fight && fight.three && fight.localVersus && fight.player.character.id === 'myst' && fight.cpu.character.id === 'volt') {
            clearInterval(checkFight);
            setTimeout(resolve, 400);
          }
        }, 100);
      });
    `);

    const versusFightCheck = await cdp.eval(`
      (() => {
        const fight = window.__brawlGame.scene.getScene('FightScene');
        const p1Model = fight.three.fighters.get('player');
        const p2Model = fight.three.fighters.get(fight.cpu.id);
        return {
          localVersus: fight.localVersus,
          p1Id: fight.player.character.id,
          p2Id: fight.cpu.character.id,
          p1ModelId: p1Model.fighterId,
          p2ModelId: p2Model.fighterId,
          p1HasCoatAndGlyphs: !!(p1Model.coatTailL && p1Model.glyphRingL),
          p2HasShockBlades: !!(p2Model.shockBladeL && p2Model.shockBladeR)
        };
      })()
    `);
    console.log('[Step 5] Local Versus State:', versusFightCheck);
    const step5Pass = versusFightCheck.localVersus &&
                      versusFightCheck.p1Id === 'myst' &&
                      versusFightCheck.p2Id === 'volt' &&
                      versusFightCheck.p1HasCoatAndGlyphs &&
                      versusFightCheck.p2HasShockBlades;
    results.push({ name: 'Local Versus Mode (Myst P1 vs Volt P2)', pass: step5Pass, details: versusFightCheck });

    // 6. Test Combat Exchange in Local Versus (P1 Myst hits P2 Volt)
    console.log('[Step 6] Testing Combat Exchange in Local Versus...');
    await cdp.eval(`
      (() => {
        const fight = window.__brawlGame.scene.getScene('FightScene');
        fight.player.x = 0;
        fight.player.z = 0;
        fight.player.facing = 1;
        fight.cpu.x = 0.8;
        fight.cpu.z = 0;
        fight.cpu.facing = -1;
        fight.player.startAction('punch');
        // Step time into punch active window
        fight.player.actionElapsed = fight.player.activeAction.startup + 0.02;
        fight.combat.update([fight.player, fight.cpu]);
      })()
    `);

    const combatCheck = await cdp.eval(`
      (() => {
        const fight = window.__brawlGame.scene.getScene('FightScene');
        return {
          p2Health: fight.cpu.health,
          p2State: fight.cpu.state,
          maxHealth: 100
        };
      })()
    `);
    console.log('[Step 6] Combat Hit Outcome:', combatCheck);
    const step6Pass = combatCheck.p2Health < 100 && combatCheck.p2State === 'hit';
    results.push({ name: 'In-Arena 3D Combat Hit & State Transition', pass: step6Pass, details: combatCheck });

  } catch (err) {
    console.error('[Error during verification]:', err);
    results.push({ name: 'Verification Execution', pass: false, error: err.message });
  } finally {
    cdp.close();
    edgeProcess.kill('SIGKILL');
    server.close();
    try {
      fs.rmSync(tempProfileDir, { recursive: true, force: true });
    } catch {}
  }

  console.log('\n======================================================');
  console.log('PHASE 6.4 ROSTER & MODES CDP VERIFICATION SUMMARY');
  console.log('======================================================');
  let allPass = true;
  for (const r of results) {
    const status = r.pass ? 'PASS' : 'FAIL';
    console.log(`[${status}] ${r.name}`);
    if (!r.pass) allPass = false;
  }
  console.log('======================================================');
  console.log(`Final Result: ${allPass ? 'ALL CHECKS PASSED (5/5)' : 'FAILURES DETECTED'}`);
  console.log('======================================================\n');

  if (!allPass) process.exit(1);
}

runVerification().catch(err => {
  console.error('Fatal verification script error:', err);
  process.exit(1);
});
