import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const PORT = 5183;
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
  console.log('--- BRAWL WARS PHASE 6.2: IN-BROWSER ROOK VERIFICATION ---');
  const server = await startStaticServer();
  const tempProfileDir = path.resolve('.temp-edge-profile-p6-rook');

  const edgeBin = findEdgeBinary();
  const edgeArgs = [
    `--remote-debugging-port=9233`,
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
      const res = await fetch('http://127.0.0.1:9233/json/version');
      if (res.ok) {
        versionData = await res.json();
        break;
      }
    } catch {}
    await new Promise(r => setTimeout(r, 200));
  }

  if (!versionData) {
    throw new Error('Failed to connect to Edge remote debugging port 9233');
  }

  const listRes = await fetch('http://127.0.0.1:9233/json/list');
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

    // Transition directly into FightScene with Player = Rook, Opponent = Atlas
    console.log('[Step 1] Starting FightScene with Rook...');
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
          if (fight && fight.three && fight.player && fight.player.character && fight.player.character.id === 'rook') {
            clearInterval(checkFight);
            setTimeout(resolve, 500);
          }
        }, 100);
      });
    `);

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
          guardMultiplier: p.guardMultiplier,
          specialName: p.character.specialName,
          modelFighterId: model.fighterId,
          hasPistonPlateL: !!model.pistonPlateL,
          hasPistonPlateR: !!model.pistonPlateR,
          hasSteamVentL: !!model.steamVentL,
          hasSteamVentR: !!model.steamVentR,
          hasGlowMat: !!model.glowMat,
          glowColorHex: model.glowMat.color.getHexString().toUpperCase()
        };
      })()
    `);

    console.log('[Step 1] Rook Model & Fighter state:', fighterCheck);
    const step1Pass = fighterCheck.characterId === 'rook' &&
                      fighterCheck.modelFighterId === 'rook' &&
                      fighterCheck.hasPistonPlateL &&
                      fighterCheck.hasPistonPlateR &&
                      fighterCheck.hasSteamVentL &&
                      fighterCheck.hasSteamVentR &&
                      fighterCheck.glowColorHex === 'FF2040';
    results.push({ name: 'Rook Model Construction & Hydraulic Piston Gauntlets', pass: step1Pass, details: fighterCheck });

    // 2. Test Rook Tank Archetype & Immovable Wide Sumo Stance
    console.log('[Step 2] Testing Rook Tank Stats and Sumo Idle Guard...');
    const idleCheck = await cdp.eval(`
      (() => {
        const fight = window.__brawlGame.scene.getScene('FightScene');
        const model = fight.three.fighters.get('player');
        return {
          thighLRotZ: model.thighL.rotation.z,
          thighRRotZ: model.thighR.rotation.z,
          shoulderLRotY: model.shoulderL.rotation.y,
          shoulderRRotY: model.shoulderR.rotation.y,
          damageMultiplier: fight.player.damageMultiplier,
          guardMultiplier: fight.player.guardMultiplier
        };
      })()
    `);
    console.log('[Step 2] Rook Idle pose & stats:', idleCheck);
    const step2Pass = idleCheck.thighLRotZ < -0.15 &&
                      idleCheck.thighRRotZ > 0.15 &&
                      idleCheck.shoulderLRotY > 0.25 &&
                      idleCheck.shoulderRRotY < -0.25 &&
                      idleCheck.damageMultiplier > 1.0 &&
                      idleCheck.guardMultiplier < 0.95;
    results.push({ name: 'Rook Sumo Idle Guard & Colossus Armor Stats', pass: step2Pass, details: idleCheck });

    // 3. Test Rook Dash Hydraulic Bull Charge
    console.log('[Step 3] Testing Rook Hydraulic Bull Charge...');
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
          elbowLRotX: model.elbowL.rotation.x,
          elbowRRotX: model.elbowR.rotation.x
        };
      })()
    `);
    console.log('[Step 3] Rook Dash Pose:', dashCheck);
    const step3Pass = dashCheck.torsoRotX <= -0.30 &&
                      dashCheck.elbowLRotX > 1.3 &&
                      dashCheck.elbowRRotX > 1.3;
    results.push({ name: 'Rook Hydraulic Bull Charge Dash', pass: step3Pass, details: dashCheck });

    // 4. Test Rook Two-Handed Sledgehammer Slam
    console.log('[Step 4] Testing Rook Sledgehammer Heavy Strike...');
    await cdp.eval(`
      (() => {
        const fight = window.__brawlGame.scene.getScene('FightScene');
        fight.player.dashTime = 0;
        fight.player.state = 'heavy';
        fight.three.updateFighter(fight.player, 2.0, 0.016);
      })()
    `);
    const heavyCheck = await cdp.eval(`
      (() => {
        const fight = window.__brawlGame.scene.getScene('FightScene');
        const model = fight.three.fighters.get('player');
        return {
          shoulderLRotX: model.shoulderL.rotation.x,
          shoulderRRotX: model.shoulderR.rotation.x
        };
      })()
    `);
    console.log('[Step 4] Rook Sledgehammer Heavy Pose:', heavyCheck);
    const step4Pass = heavyCheck.shoulderLRotX < -2.1 && heavyCheck.shoulderRRotX < -2.1;
    results.push({ name: 'Rook Two-Handed Sledgehammer Heavy Strike', pass: step4Pass, details: heavyCheck });

    // 5. Test Rook Iron Fortress Seismic Ground-Pound Special
    console.log('[Step 5] Testing Rook Iron Fortress Ground-Pound Special...');
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
    console.log('[Step 5] Rook Iron Fortress Pose:', specialCheck);
    const step5Pass = specialCheck.playerState === 'special' &&
                      specialCheck.torsoRotX <= -0.50 &&
                      specialCheck.shoulderLRotX < -1.2 &&
                      specialCheck.shoulderRRotX < -1.2;
    results.push({ name: 'Rook Iron Fortress Seismic Ground-Pound', pass: step5Pass, details: specialCheck });

    // 6. Test Rook Twin Buckler Fortress Shield Lock (#IronWall)
    console.log('[Step 6] Testing Rook Twin Buckler Fortress Shield Lock...');
    await cdp.eval(`
      (() => {
        const fight = window.__brawlGame.scene.getScene('FightScene');
        fight.player.activeAction = null;
        fight.player.blocking = true;
        fight.three.updateFighter(fight.player, 4.0, 0.016);
      })()
    `);
    const blockCheck = await cdp.eval(`
      (() => {
        const fight = window.__brawlGame.scene.getScene('FightScene');
        const model = fight.three.fighters.get('player');
        return {
          shoulderLRotX: model.shoulderL.rotation.x,
          shoulderRRotX: model.shoulderR.rotation.x,
          elbowLRotX: model.elbowL.rotation.x,
          elbowRRotX: model.elbowR.rotation.x
        };
      })()
    `);
    console.log('[Step 6] Rook Iron Wall Block Pose:', blockCheck);
    const step6Pass = blockCheck.shoulderLRotX < -1.1 &&
                      blockCheck.shoulderRRotX < -1.1 &&
                      blockCheck.elbowLRotX > 1.4 &&
                      blockCheck.elbowRRotX > 1.4;
    results.push({ name: 'Rook Twin Buckler Iron Wall Block', pass: step6Pass, details: blockCheck });

  } catch (err) {
    console.error('Error during verification:', err);
    results.push({ name: 'Verification Runtime', pass: false, error: err.message });
  } finally {
    cdp.close();
    edgeProcess.kill();
    server.close();
    try {
      fs.rmSync(tempProfileDir, { recursive: true, force: true });
    } catch {}
  }

  console.log('\n--- VERIFICATION RESULTS ---');
  let allPass = true;
  for (const r of results) {
    console.log(`[${r.pass ? 'PASS' : 'FAIL'}] ${r.name}`);
    if (!r.pass) allPass = false;
  }
  if (!allPass) process.exit(1);
  console.log('--- ALL ROOK VERIFICATION CHECKS PASSED ---\n');
}

runVerification();
