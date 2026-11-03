import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const PORT = 5182;
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
  console.log('--- BRAWL WARS PHASE 6.1: IN-BROWSER VOLT VERIFICATION ---');
  const server = await startStaticServer();
  const tempProfileDir = path.resolve('.temp-edge-profile-p6-volt');

  const edgeBin = findEdgeBinary();
  const edgeArgs = [
    `--remote-debugging-port=9232`,
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
      const res = await fetch('http://127.0.0.1:9232/json/version');
      if (res.ok) {
        versionData = await res.json();
        break;
      }
    } catch {}
    await new Promise(r => setTimeout(r, 200));
  }

  if (!versionData) {
    throw new Error('Failed to connect to Edge remote debugging port 9232');
  }

  const listRes = await fetch('http://127.0.0.1:9232/json/list');
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

    // Transition directly into FightScene with Player = Volt, Opponent = Atlas
    console.log('[Step 1] Starting FightScene with Volt...');
    await cdp.eval(`
      new Promise((resolve) => {
        const game = window.__brawlGame;
        const current = game.scene.getScenes(true)[0];
        current.scene.start('FightScene', {
          mode: 'training',
          playerId: 'volt',
          cpuId: 'atlas',
          stageId: 'neon'
        });

        const checkFight = setInterval(() => {
          const fight = game.scene.getScene('FightScene');
          if (fight && fight.three && fight.player && fight.player.character && fight.player.character.id === 'volt') {
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
          speedMultiplier: p.speedMultiplier,
          specialName: p.character.specialName,
          modelFighterId: model.fighterId,
          hasShockBladeL: !!model.shockBladeL,
          hasShockBladeR: !!model.shockBladeR,
          hasGlowMat: !!model.glowMat,
          glowColorHex: model.glowMat.color.getHexString().toUpperCase()
        };
      })()
    `);

    console.log('[Step 1] Volt Model & Fighter state:', fighterCheck);
    const step1Pass = fighterCheck.characterId === 'volt' &&
                      fighterCheck.modelFighterId === 'volt' &&
                      fighterCheck.hasShockBladeL &&
                      fighterCheck.hasShockBladeR &&
                      fighterCheck.glowColorHex === 'A6FF00';
    results.push({ name: 'Volt Model Construction & Shock Blades', pass: step1Pass, details: fighterCheck });

    // 2. Test Volt Speed & Predatory Ready Guard
    console.log('[Step 2] Testing Volt Speed Multiplier and Idle Guard...');
    const idleCheck = await cdp.eval(`
      (() => {
        const fight = window.__brawlGame.scene.getScene('FightScene');
        const model = fight.three.fighters.get('player');
        return {
          torsoRotX: model.torso.rotation.x,
          elbowLRotX: model.elbowL.rotation.x,
          elbowRRotX: model.elbowR.rotation.x,
          speedMult: fight.player.speedMultiplier
        };
      })()
    `);
    console.log('[Step 2] Volt Idle pose & speed:', idleCheck);
    const step2Pass = idleCheck.torsoRotX < 0 &&
                      idleCheck.elbowLRotX > 1.2 &&
                      idleCheck.elbowRRotX > 1.2 &&
                      idleCheck.speedMult > 1.05;
    results.push({ name: 'Volt Predatory Ready Guard & Rushdown Speed', pass: step2Pass, details: idleCheck });

    // 3. Test Volt Dash Sprint Pose
    console.log('[Step 3] Testing Volt Dash Sprint Skate...');
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
    console.log('[Step 3] Volt Dash Pose:', dashCheck);
    const step3Pass = dashCheck.torsoRotX <= -0.35 &&
                      dashCheck.shoulderLRotX > 0.3 &&
                      dashCheck.shoulderRRotX > 0.3;
    results.push({ name: 'Volt Swept-Wing Dash Sprint', pass: step3Pass, details: dashCheck });

    // 4. Test Volt Attack Chain: Punch -> Kick -> Heavy (Leaping X-Slash)
    console.log('[Step 4] Testing Volt Combat Attacks & X-Slash Heavy...');
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
    console.log('[Step 4] Volt Heavy X-Slash Pose:', heavyCheck);
    const step4Pass = heavyCheck.shoulderLRotX < -1.8 && heavyCheck.shoulderRRotX < -1.8;
    results.push({ name: 'Volt Leaping X-Slash Heavy Pose', pass: step4Pass, details: heavyCheck });

    // 5. Test Flash Rush Special Attack Execution & Damage
    console.log('[Step 5] Testing Volt Flash Rush Special Attack...');
    await cdp.eval(`
      (() => {
        const fight = window.__brawlGame.scene.getScene('FightScene');
        fight.player.x = 0;
        fight.player.z = 0;
        fight.cpu.x = 1.8;
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
          shoulderLRotX: model.shoulderL.rotation.x,
          shoulderRRotX: model.shoulderR.rotation.x,
          elbowLRotX: model.elbowL.rotation.x,
          elbowRRotX: model.elbowR.rotation.x
        };
      })()
    `);
    console.log('[Step 5] Volt Flash Rush Pose:', specialCheck);
    const step5Pass = specialCheck.playerState === 'special' &&
                      specialCheck.shoulderLRotX < -1.8 &&
                      specialCheck.shoulderRRotX < -1.8 &&
                      specialCheck.elbowLRotX === 0.04 &&
                      specialCheck.elbowRRotX === 0.04;
    results.push({ name: 'Volt Flash Rush Special Thrust', pass: step5Pass, details: specialCheck });

    // 6. Test Volt Crossed Blades Block (X-Guard)
    console.log('[Step 6] Testing Volt Crossed Blades X-Guard Block...');
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
          shoulderLRotZ: model.shoulderL.rotation.z,
          shoulderRRotZ: model.shoulderR.rotation.z
        };
      })()
    `);
    console.log('[Step 6] Volt X-Guard Block Pose:', blockCheck);
    const step6Pass = blockCheck.shoulderLRotZ > 0.35 && blockCheck.shoulderRRotZ < -0.35;
    results.push({ name: 'Volt Crossed Blades X-Guard Block', pass: step6Pass, details: blockCheck });

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
  console.log('--- ALL VOLT VERIFICATION CHECKS PASSED ---\n');
}

runVerification();
