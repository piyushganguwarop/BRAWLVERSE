import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const PORT = 5184;
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
  console.log('--- BRAWL WARS PHASE 6.3: IN-BROWSER MYST VERIFICATION ---');
  const server = await startStaticServer();
  const tempProfileDir = path.resolve('.temp-edge-profile-p6-myst');

  const edgeBin = findEdgeBinary();
  const edgeArgs = [
    `--remote-debugging-port=9234`,
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
      const res = await fetch('http://127.0.0.1:9234/json/version');
      if (res.ok) {
        versionData = await res.json();
        break;
      }
    } catch {}
    await new Promise(r => setTimeout(r, 200));
  }

  if (!versionData) {
    throw new Error('Failed to connect to Edge remote debugging port 9234');
  }

  const listRes = await fetch('http://127.0.0.1:9234/json/list');
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

    // Transition directly into FightScene with Player = Myst, Opponent = Atlas
    console.log('[Step 1] Starting FightScene with Myst...');
    await cdp.eval(`
      new Promise((resolve) => {
        const game = window.__brawlGame;
        const current = game.scene.getScenes(true)[0];
        current.scene.start('FightScene', {
          mode: 'training',
          playerId: 'myst',
          cpuId: 'atlas',
          stageId: 'neon'
        });

        const checkFight = setInterval(() => {
          const fight = game.scene.getScene('FightScene');
          if (fight && fight.three && fight.player && fight.player.character && fight.player.character.id === 'myst') {
            clearInterval(checkFight);
            setTimeout(resolve, 500);
          }
        }, 100);
      });
    `);

    // Verify Myst model creation & signature trickster props
    const fighterCheck = await cdp.eval(`
      (() => {
        const fight = window.__brawlGame.scene.getScene('FightScene');
        const p = fight.player;
        const model = fight.three.fighters.get('player');
        return {
          id: p.id,
          characterId: p.character.id,
          name: p.character.name,
          style: p.character.style,
          damageMultiplier: p.damageMultiplier,
          speedMultiplier: p.speedMultiplier,
          specialName: p.character.specialName,
          modelFighterId: model.fighterId,
          hasCoatTailL: !!model.coatTailL,
          hasCoatTailR: !!model.coatTailR,
          hasHalfMask: !!model.halfMask,
          hasGlyphRingL: !!model.glyphRingL,
          hasGlyphRingR: !!model.glyphRingR,
          hasGlowMat: !!model.glowMat,
          glowColorHex: model.glowMat.color.getHexString().toUpperCase()
        };
      })()
    `);

    console.log('[Step 1] Myst Model & Fighter state:', fighterCheck);
    const step1Pass = fighterCheck.characterId === 'myst' &&
                      fighterCheck.modelFighterId === 'myst' &&
                      fighterCheck.hasCoatTailL &&
                      fighterCheck.hasCoatTailR &&
                      fighterCheck.hasHalfMask &&
                      fighterCheck.hasGlyphRingL &&
                      fighterCheck.hasGlyphRingR &&
                      fighterCheck.glowColorHex === 'FF00A0';
    results.push({ name: 'Myst Model Construction, Half-Mask & Glyph Rings', pass: step1Pass, details: fighterCheck });

    // 2. Test Myst Technical Archetype & Floating Open-Palm Stance
    console.log('[Step 2] Testing Myst Technical Stats and Floating Idle Guard...');
    const idleCheck = await cdp.eval(`
      (() => {
        const fight = window.__brawlGame.scene.getScene('FightScene');
        const model = fight.three.fighters.get('player');
        return {
          hipsPosY: model.hips.position.y,
          elbowLRotX: model.elbowL.rotation.x,
          elbowRRotX: model.elbowR.rotation.x,
          style: fight.player.style,
          speedMultiplier: fight.player.speedMultiplier
        };
      })()
    `);
    console.log('[Step 2] Myst Idle pose & stats:', idleCheck);
    const step2Pass = idleCheck.hipsPosY > 0.94 &&
                      idleCheck.elbowLRotX > 1.1 &&
                      idleCheck.elbowRRotX > 1.2 &&
                      idleCheck.style === 'technical' &&
                      idleCheck.speedMultiplier === 1.045;
    results.push({ name: 'Myst Floating Open-Palm Guard & Technical Stats', pass: step2Pass, details: idleCheck });

    // 3. Test Myst Ethereal Teleport Glide Dash
    console.log('[Step 3] Testing Myst Ethereal Teleport Glide Dash...');
    await cdp.eval(`
      (() => {
        const fight = window.__brawlGame.scene.getScene('FightScene');
        fight.player.dashCooldown = 0;
        fight.player.dashTime = 0.16;
        fight.player.dashDirection = 1;
        fight.player.state = 'dash';
        fight.three.updateFighter(fight.player, 1.5, 0.016);
      })()
    `);
    const dashCheck = await cdp.eval(`
      (() => {
        const fight = window.__brawlGame.scene.getScene('FightScene');
        const model = fight.three.fighters.get('player');
        return {
          torsoRotX: model.torso.rotation.x,
          shoulderLRotX: model.shoulderL.rotation.x,
          shoulderRRotX: model.shoulderR.rotation.x
        };
      })()
    `);
    console.log('[Step 3] Myst Dash Pose:', dashCheck);
    const step3Pass = dashCheck.torsoRotX <= -0.30 &&
                      dashCheck.shoulderLRotX > 0.20 &&
                      dashCheck.shoulderRRotX > 0.20;
    results.push({ name: 'Myst Ethereal Teleport Glide Dash', pass: step3Pass, details: dashCheck });

    // 4. Test Myst Spinning Crescent Sweep Kick
    console.log('[Step 4] Testing Myst Crescent Sweep Kick...');
    await cdp.eval(`
      (() => {
        const fight = window.__brawlGame.scene.getScene('FightScene');
        fight.player.dashTime = 0;
        fight.player.state = 'kick';
        fight.three.updateFighter(fight.player, 2.0, 0.016);
      })()
    `);
    const kickCheck = await cdp.eval(`
      (() => {
        const fight = window.__brawlGame.scene.getScene('FightScene');
        const model = fight.three.fighters.get('player');
        return {
          torsoRotY: model.torso.rotation.y,
          thighRRotZ: model.thighR.rotation.z
        };
      })()
    `);
    console.log('[Step 4] Myst Crescent Kick Pose:', kickCheck);
    const step4Pass = kickCheck.torsoRotY > 0.40 && kickCheck.thighRRotZ < -1.2;
    results.push({ name: 'Myst Spinning Crescent Sweep Kick', pass: step4Pass, details: kickCheck });

    // 5. Test Myst Phantom Pulse Spherical Vortex Burst Special
    console.log('[Step 5] Testing Myst Phantom Pulse Special...');
    await cdp.eval(`
      (() => {
        const fight = window.__brawlGame.scene.getScene('FightScene');
        fight.player.x = 0;
        fight.player.z = 0;
        fight.cpu.x = 2.0;
        fight.cpu.z = 0;
        fight.player.energy = 50;
        fight.player.startAction('special');
        fight.three.updateFighter(fight.player, 3.0, 0.016);
      })()
    `);
    const specialCheck = await cdp.eval(`
      (() => {
        const fight = window.__brawlGame.scene.getScene('FightScene');
        const model = fight.three.fighters.get('player');
        return {
          playerState: fight.player.state,
          playerEnergy: fight.player.energy,
          torsoRotX: model.torso.rotation.x,
          shoulderLRotX: model.shoulderL.rotation.x,
          shoulderRRotX: model.shoulderR.rotation.x
        };
      })()
    `);
    console.log('[Step 5] Myst Phantom Pulse Pose:', specialCheck);
    const step5Pass = specialCheck.playerState === 'special' &&
                      specialCheck.torsoRotX <= -0.35 &&
                      specialCheck.shoulderLRotX < -1.7 &&
                      specialCheck.shoulderRRotX < -1.7;
    results.push({ name: 'Myst Phantom Pulse Vortex Burst', pass: step5Pass, details: specialCheck });

    // 6. Test Myst Astral Barrier Glyph Shield
    console.log('[Step 6] Testing Myst Astral Barrier Glyph Shield Block...');
    await cdp.eval(`
      (() => {
        const fight = window.__brawlGame.scene.getScene('FightScene');
        fight.player.state = 'idle';
        fight.player.blocking = true;
        fight.three.updateFighter(fight.player, 4.0, 0.016);
      })()
    `);
    const blockCheck = await cdp.eval(`
      (() => {
        const fight = window.__brawlGame.scene.getScene('FightScene');
        const model = fight.three.fighters.get('player');
        return {
          blocking: fight.player.blocking,
          shoulderLRotX: model.shoulderL.rotation.x,
          shoulderRRotX: model.shoulderR.rotation.x,
          elbowLRotX: model.elbowL.rotation.x,
          elbowRRotX: model.elbowR.rotation.x
        };
      })()
    `);
    console.log('[Step 6] Myst Glyph Shield Block:', blockCheck);
    const step6Pass = blockCheck.blocking === true &&
                      blockCheck.shoulderLRotX < -1.1 &&
                      blockCheck.shoulderRRotX < -1.1 &&
                      blockCheck.elbowLRotX > 1.5 &&
                      blockCheck.elbowRRotX > 1.5;
    results.push({ name: 'Myst Astral Barrier Glyph Shield Block', pass: step6Pass, details: blockCheck });

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
  console.log('PHASE 6.3 MYST IN-BROWSER CDP VERIFICATION SUMMARY');
  console.log('======================================================');
  let allPass = true;
  for (const r of results) {
    const status = r.pass ? 'PASS' : 'FAIL';
    console.log(`[${status}] ${r.name}`);
    if (!r.pass) allPass = false;
  }
  console.log('======================================================');
  console.log(`Final Result: ${allPass ? 'ALL CHECKS PASSED (6/6)' : 'FAILURES DETECTED'}`);
  console.log('======================================================\n');

  if (!allPass) process.exit(1);
}

runVerification().catch(err => {
  console.error('Fatal verification script error:', err);
  process.exit(1);
});
