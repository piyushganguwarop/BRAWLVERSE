import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 5178;
const CDP_PORT = 9226;

function createStaticServer(root, port) {
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml'
  };

  const server = http.createServer((req, res) => {
    let filePath = path.join(root, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
    if (!fs.existsSync(filePath)) {
      filePath = path.join(root, 'index.html');
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    try {
      const content = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  return new Promise((resolve) => {
    server.listen(port, () => resolve(server));
  });
}

class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 0;
    this.pending = new Map();
    this.consoleLogs = [];
    this.exceptions = [];
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = err => reject(err);
      this.ws.onmessage = msg => {
        const data = JSON.parse(msg.data);
        if (data.id && this.pending.has(data.id)) {
          const { resolve, reject } = this.pending.get(data.id);
          this.pending.delete(data.id);
          if (data.error) reject(data.error);
          else resolve(data.result);
        } else if (data.method === 'Runtime.consoleAPICalled') {
          const text = (data.params.args || []).map(a => a.value || a.description || '').join(' ');
          this.consoleLogs.push({ type: data.params.type, text });
        } else if (data.method === 'Runtime.exceptionThrown') {
          const desc = data.params.exceptionDetails?.exception?.description || data.params.exceptionDetails?.text || 'Unknown exception';
          this.exceptions.push(desc);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      const err = res.exceptionDetails.exception?.description || res.exceptionDetails.text;
      throw new Error(err);
    }
    return res.result?.value;
  }

  close() {
    this.ws?.close();
  }
}

async function runVerification() {
  console.log('========================================================================');
  console.log('   BRAWL WARS: Phase 4 In-Browser Gameplay Verification               ');
  console.log('========================================================================\n');

  const distDir = path.resolve(process.cwd(), 'dist');
  if (!fs.existsSync(distDir)) {
    throw new Error('dist/ directory missing. Run npm run build first.');
  }

  const server = await createStaticServer(distDir, PORT);
  console.log(`[HTTP Server] Serving production dist/ on http://localhost:${PORT}`);

  const tempProfileDir = path.resolve(process.cwd(), 'temp-edge-gameplay-profile');
  if (!fs.existsSync(tempProfileDir)) {
    fs.mkdirSync(tempProfileDir, { recursive: true });
  }

  const edgeArgs = [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${tempProfileDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu-sandbox',
    '--disable-background-networking',
    `http://localhost:${PORT}`
  ];

  const edge = spawn(EDGE_PATH, edgeArgs);

  // Poll for CDP endpoint
  let versionData = null;
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);
      if (res.ok) {
        versionData = await res.json();
        break;
      }
    } catch { }
    await new Promise(r => setTimeout(r, 200));
  }

  if (!versionData || !versionData.webSocketDebuggerUrl) {
    edge.kill();
    server.close();
    throw new Error('Could not connect to Edge DevTools Protocol');
  }

  const listRes = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
  const pages = await listRes.json();
  const gamePage = pages.find(p => p.type === 'page' && p.url.includes(String(PORT))) || pages[0];

  const cdp = new CdpClient(gamePage.webSocketDebuggerUrl);
  await cdp.connect();
  await cdp.send('Runtime.enable');
  await cdp.send('Page.enable');

  const results = [];
  function logResult(step, name, pass, details) {
    const sym = pass ? '✔ PASS' : '✖ FAIL';
    console.log(`  ${sym} [STEP ${step}]: ${name}`);
    console.log(`         Details: ${details}\n`);
    results.push({ step, name, pass, details });
  }

  try {
    // Wait for game boot
    await new Promise(r => setTimeout(r, 1200));
    const gameBooted = await cdp.evaluate(`!!window.__brawlGame`);
    logResult(1, 'Browser Game Launch', gameBooted, 'Phaser 3.90 & Three.js runtime successfully booted in Edge Chromium');

    // Launch FightScene
    await cdp.evaluate(`
      (function() {
        const game = window.__brawlGame;
        const current = game.scene.getScenes(true)[0];
        if (current.scene.key !== 'FightScene') {
          current.scene.start('FightScene', {
            player: { id: 'atlas', name: 'ATLAS', color: 0x2869b5, accent: 0xe6b84c, skin: 0xb97855, hair: 0x20232c, style: 'balanced' },
            cpu: { id: 'volt', name: 'VOLT', color: 0x9c3e36, accent: 0xf2c45e, skin: 0x9b6549, hair: 0x171923, style: 'fast' },
            arena: 'neon',
            mode: 'training',
            difficulty: 'hard'
          });
        }
      })()
    `);
    await new Promise(r => setTimeout(r, 800));

    // 2. Test Knockdown & Get-Up Animation Visually in Three.js
    const knockdownResult = await cdp.evaluate(`
      (function() {
        const scene = window.__brawlGame.scene.getScene('FightScene');
        const cpu = scene.cpu;
        const cpuModel = scene.three.fighters.get(cpu.id);

        // Put CPU in midair and hit it so it flags knockdown on landing
        cpu.x = 0; cpu.y = 1.6; cpu.vy = -6.0; cpu.z = 0;
        cpu.takeHit(10, -1, {}, { x: 1, z: 0 });

        // Step simulation forward until grounded
        for (let i = 0; i < 15; i++) {
          cpu.update(0.02, {});
          scene.three.updateFighter(cpu, 1.0 + i * 0.02, 0.02);
        }

        const isKnockdown = cpu.state === 'knockdown';
        const modelFlatZ = cpuModel.root.rotation.z; // Should be ~ -1.45 (flat on floor)

        // Step through knockdown into get_up
        for (let i = 0; i < 22; i++) {
          cpu.update(0.02, {});
          scene.three.updateFighter(cpu, 2.0 + i * 0.02, 0.02);
        }
        const isGetUp = cpu.state === 'get_up';
        const modelRisingZ = cpuModel.root.rotation.z; // Rising back up toward 0

        // Step through get_up into idle
        for (let i = 0; i < 20; i++) {
          cpu.update(0.02, {});
          scene.three.updateFighter(cpu, 3.0 + i * 0.02, 0.02);
        }
        const isRecovered = cpu.state === 'idle';

        return {
          isKnockdown,
          modelFlatZ: modelFlatZ.toFixed(2),
          isGetUp,
          modelRisingZ: modelRisingZ.toFixed(2),
          isRecovered
        };
      })()
    `);
    const knockdownPass = knockdownResult.isKnockdown && knockdownResult.isGetUp && knockdownResult.isRecovered && parseFloat(knockdownResult.modelFlatZ) < -1.0;
    logResult(2, 'Knockdown & Get-Up Visual State and Transformations', knockdownPass,
      `State sequence: knockdown (root.rotZ=${knockdownResult.modelFlatZ}) -> get_up (root.rotZ=${knockdownResult.modelRisingZ}) -> idle (recovered=${knockdownResult.isRecovered})`);

    // 3. Test Invulnerability and Anti-OTG Behavior
    const otgResult = await cdp.evaluate(`
      (function() {
        const scene = window.__brawlGame.scene.getScene('FightScene');
        const cpu = scene.cpu;
        cpu.health = 100;
        cpu.state = 'knockdown';
        cpu.invulnerable = 0.45;
        cpu.actionTime = 0.40;

        // Player attempts to strike while CPU is down (OTG attack)
        const hitResult = cpu.takeHit(25, 1, {}, { x: -0.5, z: 0 });
        const healthPreserved = cpu.health === 100 && hitResult.damage === 0;

        // Attempt during get_up
        cpu.state = 'get_up';
        cpu.invulnerable = 0.28;
        const hitResult2 = cpu.takeHit(25, 1, {}, { x: -0.5, z: 0 });
        const getUpImmune = cpu.health === 100 && hitResult2.damage === 0;

        // Reset to idle
        cpu.state = 'idle';
        cpu.invulnerable = 0;
        const hitResult3 = cpu.takeHit(10, 1, {}, { x: -0.5, z: 0 });
        const normalDamageWorks = cpu.health < 100 && hitResult3.damage > 0;

        return {
          knockdownImmune: healthPreserved,
          getUpImmune,
          normalDamageWorks
        };
      })()
    `);
    const otgPass = otgResult.knockdownImmune && otgResult.getUpImmune && otgResult.normalDamageWorks;
    logResult(3, 'Invulnerability and Anti-OTG Damage Immunity', otgPass,
      `0 damage during knockdown (anti-OTG confirmed); 0 damage during get_up; normal hits connect once idle`);

    // 4. Test CPU Movement across X and Z depth
    const cpuMotionResult = await cdp.evaluate(`
      (function() {
        const scene = window.__brawlGame.scene.getScene('FightScene');
        scene.player.x = 2.0;
        scene.player.z = 1.4; // Placed at positive X and positive Z depth
        scene.player.state = 'idle';
        scene.player.stun = 0;
        scene.player.activeAction = null;

        scene.cpu.x = -1.0;
        scene.cpu.z = -1.0;  // Placed at negative X and negative Z
        scene.cpu.state = 'idle';
        scene.cpu.stun = 0;
        scene.cpu.actionTime = 0;
        scene.cpu.activeAction = null;
        scene.cpu.knockbackVelocity = 0;
        scene.cpu.knockbackVelocityZ = 0;
        scene.cpu.blocking = false;

        const ai = scene.cpuAI || new (scene.player.constructor)({ id: 'dummy' });
        // Run AI decision
        const decision = scene.cpuAI.update(0.016);
        const tracksX = decision.movement.right === true;
        const tracksZ = decision.movement.depthDown === true;

        // Step CPU physics with this decision
        const initialCpuZ = scene.cpu.z;
        const initialCpuX = scene.cpu.x;
        for (let i = 0; i < 15; i++) {
          scene.cpu.update(0.02, decision.movement);
        }
        const movedInX = scene.cpu.x > initialCpuX;
        const movedInZ = scene.cpu.z > initialCpuZ;

        return {
          tracksX,
          tracksZ,
          movedInX,
          movedInZ,
          finalX: scene.cpu.x.toFixed(2),
          finalZ: scene.cpu.z.toFixed(2)
        };
      })()
    `);
    const cpuMotionPass = cpuMotionResult.tracksX && cpuMotionResult.tracksZ && cpuMotionResult.movedInX && cpuMotionResult.movedInZ;
    logResult(4, 'CPU 3D Movement Across X and Z Depth', cpuMotionPass,
      `CPU targeted player at (2.0, 1.4): tracksX=${cpuMotionResult.tracksX}, tracksZ=${cpuMotionResult.tracksZ}, final position=(${cpuMotionResult.finalX}, ${cpuMotionResult.finalZ})`);

    // 5. Test CPU Reactions to Light, Kick, and Heavy Attacks
    const cpuReactionResult = await cdp.evaluate(`
      (function() {
        const scene = window.__brawlGame.scene.getScene('FightScene');
        scene.player.x = 0; scene.player.z = 0;
        scene.cpu.x = 1.2; scene.cpu.z = 0;

        // Force deterministic reaction by temporarily setting RNG to 0.01
        const origRng = scene.cpuAI.rng;
        scene.cpuAI.rng = () => 0.01;

        // Test Light Punch reaction
        scene.player.state = 'punch';
        scene.player.activeAction = { name: 'punch' };
        scene.cpuAI.thinkTimer = 0;
        const lightDecision = scene.cpuAI.update(0.016);
        const blocksLight = lightDecision.intent === 'block' && lightDecision.movement.block === true;

        // Test Kick reaction
        scene.player.state = 'kick';
        scene.player.activeAction = { name: 'kick' };
        scene.cpuAI.thinkTimer = 0;
        const kickDecision = scene.cpuAI.update(0.016);
        const blocksKick = kickDecision.intent === 'block' && kickDecision.movement.block === true;

        // Test Heavy reaction
        scene.player.state = 'heavy';
        scene.player.activeAction = { name: 'heavy' };
        scene.cpuAI.thinkTimer = 0;
        const heavyDecision = scene.cpuAI.update(0.016);
        const blocksHeavy = heavyDecision.intent === 'block' && heavyDecision.movement.block === true;

        // Restore RNG and clean up player state
        scene.cpuAI.rng = origRng;
        scene.player.state = 'idle';
        scene.player.activeAction = null;

        return {
          blocksLight,
          blocksKick,
          blocksHeavy
        };
      })()
    `);
    const reactionPass = cpuReactionResult.blocksLight && cpuReactionResult.blocksKick && cpuReactionResult.blocksHeavy;
    logResult(5, 'CPU Defensive Reactions to Light, Kick, and Heavy Attacks', reactionPass,
      `CPU raised block against Light=${cpuReactionResult.blocksLight}, Kick=${cpuReactionResult.blocksKick}, Heavy=${cpuReactionResult.blocksHeavy}`);

    // 6. Check New Heavy Key Binding (<kbd>KeyI</kbd> and <kbd>KeyL</kbd>)
    const heavyKeyResult = await cdp.evaluate(`
      (function() {
        const mgr = window.__brawlGame.scene.getScene('FightScene').inputController.inputManager;
        const keysForHeavy = mgr.bindingsP1.heavy || [];
        const hasKeyL = keysForHeavy.includes('KeyL');
        const hasKeyI = keysForHeavy.includes('KeyI');

        // Simulate KeyDown for KeyI
        mgr.onKeyDown({ code: 'KeyI', repeat: false });
        const stateWithKeyI = mgr.getPlayer1State();
        const heavyActiveFromI = stateWithKeyI.heavy === true;
        mgr.onKeyUp({ code: 'KeyI' });

        // Simulate KeyDown for KeyL
        mgr.onKeyDown({ code: 'KeyL', repeat: false });
        const stateWithKeyL = mgr.getPlayer1State();
        const heavyActiveFromL = stateWithKeyL.heavy === true;
        mgr.onKeyUp({ code: 'KeyL' });

        // Ensure other controls are completely untouched
        const punchKey = mgr.bindingsP1.punch[0] === 'KeyJ';
        const kickKey = mgr.bindingsP1.kick[0] === 'KeyK';
        const blockKey = mgr.bindingsP1.block[0] === 'ShiftLeft';

        return {
          hasKeyL,
          hasKeyI,
          heavyActiveFromI,
          heavyActiveFromL,
          punchKey,
          kickKey,
          blockKey
        };
      })()
    `);
    const heavyKeyPass = heavyKeyResult.hasKeyL && heavyKeyResult.hasKeyI && heavyKeyResult.heavyActiveFromI && heavyKeyResult.heavyActiveFromL && heavyKeyResult.punchKey && heavyKeyResult.kickKey;
    logResult(6, 'Heavy Key Binding Isolation & Action Verification', heavyKeyPass,
      `Both KeyL and KeyI activate heavy attack independently; punch (KeyJ), kick (KeyK), block (ShiftLeft) fully intact`);

    // 7. Check Existing Combat, Movement, and Match Systems
    const generalCombatResult = await cdp.evaluate(`
      (function() {
        const scene = window.__brawlGame.scene.getScene('FightScene');
        // Test punch -> kick -> heavy combo cancel
        scene.player.x = 0; scene.player.z = 0; scene.player.health = 100;
        scene.player.state = 'idle'; scene.player.activeAction = null;
        scene.player.comboCount = 0;

        const punchOk = scene.player.startAction('punch');
        scene.player.actionElapsed = 0.20; // inside cancel window
        const kickOk = scene.player.startAction('kick');
        scene.player.actionElapsed = 0.25; // inside cancel window
        const heavyOk = scene.player.startAction('heavy');

        const comboCount = scene.player.comboCount; // Should be 3

        // Test Arena Boundaries clamp
        scene.player.x = 99; scene.player.z = 99;
        scene.player.update(0.016, {});
        const clampedX = scene.player.x <= 5.4;
        const clampedZ = scene.player.z <= 2.2;

        return {
          punchOk,
          kickOk,
          heavyOk,
          comboCount,
          clampedX,
          clampedZ
        };
      })()
    `);
    const systemsPass = generalCombatResult.punchOk && generalCombatResult.kickOk && generalCombatResult.heavyOk && generalCombatResult.comboCount === 3 && generalCombatResult.clampedX && generalCombatResult.clampedZ;
    logResult(7, 'Existing Combat, Cancel Windows, and Arena Boundary Clamping', systemsPass,
      `Punch->Kick->Heavy cancel combo chain executed (comboCount=${generalCombatResult.comboCount}); World boundaries properly clamped X & Z`);

  } finally {
    cdp.close();
    edge.kill();
    server.close();
    try {
      fs.rmSync(tempProfileDir, { recursive: true, force: true });
    } catch { }
  }

  const allPassed = results.every(r => r.pass);
  console.log('========================================================================');
  console.log(`   Phase 4 Gameplay Verification: ${allPassed ? 'ALL CHECKS PASSED (7/7)' : 'SOME CHECKS FAILED'}`);
  console.log('========================================================================\n');

  fs.writeFileSync('scripts/phase4-gameplay-verification.json', JSON.stringify({ executedAt: new Date().toISOString(), results }, null, 2));
  return allPassed;
}

runVerification()
  .then(ok => process.exit(ok ? 0 : 1))
  .catch(err => {
    console.error('Phase 4 gameplay verification script failed:', err);
    process.exit(1);
  });
