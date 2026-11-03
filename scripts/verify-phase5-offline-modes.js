import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const PORT = 5179;
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
      this.ws.once('open', resolve);
      this.ws.once('error', reject);
    });

    this.ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    });
  }

  send(method, params = {}) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
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
      const details = res.exceptionDetails.exception?.description || res.exceptionDetails.text || JSON.stringify(res.exceptionDetails);
      throw new Error(`CDP Eval Exception: ${details}`);
    }
    return res.result.value;
  }

  close() {
    if (this.ws) {
      try { this.ws.close(); } catch {}
    }
  }
}

async function runPhase5GameplayVerification() {
  console.log('\n========================================================================');
  console.log('   BRAWL WARS: Phase 5 Offline Game Modes In-Browser Verification       ');
  console.log('========================================================================\n');

  const server = await startStaticServer();
  const userDataDir = path.resolve('temp-edge-phase5-profile');
  const remoteDebuggingPort = 9223;

  const edgeBin = findEdgeBinary();
  const chromeArgs = [
    `--remote-debugging-port=${remoteDebuggingPort}`,
    '--headless=new',
    '--disable-gpu-sandbox',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-webgpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${userDataDir}`,
    `http://localhost:${PORT}`
  ];

  const browserProcess = spawn(edgeBin, chromeArgs, { stdio: 'ignore' });
  let cdp = null;
  const results = [];

  const logResult = (step, name, passed, details) => {
    results.push({ step, name, passed, details });
    const mark = passed ? '✔ PASS' : '✖ FAIL';
    console.log(`  ${mark} [STEP ${step}]: ${name}`);
    console.log(`         Details: ${details}\n`);
  };

  try {
    // Wait for CDP endpoint
    let targets = null;
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 250));
      try {
        const resp = await fetch(`http://127.0.0.1:${remoteDebuggingPort}/json`);
        targets = await resp.json();
        if (targets && targets.length > 0) break;
      } catch {}
    }

    if (!targets || targets.length === 0) {
      throw new Error('Could not connect to browser CDP endpoint');
    }

    const pageTarget = targets.find(t => t.type === 'page') || targets[0];
    cdp = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();

    // Wait for page and Phaser game to boot and expose __brawlGame
    let gameReady = false;
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 300));
      try {
        gameReady = await cdp.evaluate('typeof window.__brawlGame !== "undefined" && !!window.__brawlGame.isBooted');
        if (gameReady) break;
      } catch {}
    }

    if (!gameReady) {
      throw new Error('Timeout waiting for game to boot');
    }
    await new Promise(r => setTimeout(r, 500));

    // 1. Test Main Menu Mode Navigation
    const menuResult = await cdp.evaluate(`
      (function() {
        const game = window.__brawlGame;
        const mainScene = game.scene.getScene('MainMenuScene');
        const active = game.scene.isActive('MainMenuScene');
        const arcadeBtn = !!document.querySelector('[data-go="arcade"]');
        const localBtn = !!document.querySelector('[data-go="local"]');
        const trainBtn = !!document.querySelector('[data-go="training"]');
        return { active, arcadeBtn, localBtn, trainBtn };
      })()
    `);
    const menuPass = menuResult.active && menuResult.arcadeBtn && menuResult.localBtn && menuResult.trainBtn;
    logResult(1, 'Main Menu Mode Navigation Hub', menuPass,
      `MainMenuScene active=${menuResult.active}; arcadeBtn=${menuResult.arcadeBtn}; localBtn=${menuResult.localBtn}; trainBtn=${menuResult.trainBtn}`);

    // 2. Test Arcade Mode: Launch, Progression, Ladder Advance & Defeat Retry
    // Transition to SelectScene for Arcade
    await cdp.evaluate(`
      (function() {
        const game = window.__brawlGame;
        document.getElementById('menu-shell').hidden = true;
        game.scene.stop('MainMenuScene');
        game.scene.start('SelectScene', { mode: 'arcade' });
      })()
    `);
    await new Promise(r => setTimeout(r, 600));

    // Choose fighter and start Arcade match
    await cdp.evaluate(`
      (function() {
        const select = window.__brawlGame.scene.getScene('SelectScene');
        select.selectedIndex = 0; // Atlas
        select.stageIndex = 0;    // Neon District
        select.startFight();
      })()
    `);
    await new Promise(r => setTimeout(r, 800));

    const arcadeResult = await cdp.evaluate(`
      (function() {
        const game = window.__brawlGame;
        const fight = game.scene.getScene('FightScene');
        const isArcade = fight.mode === 'arcade';
        const hasLadder = !!fight.arcadeRun;
        const opponentId = fight.cpuCharacter.id;
        
        // Simulate Match Victory in Fight 1
        fight.matchFlow.completeRound('player');
        fight.matchFlow.phase = 'playing';
        fight.matchFlow.completeRound('player');
        fight.finishRound();
        
        const nextButton = document.getElementById('arcade-next-fight');
        const hasNextButton = !!nextButton && nextButton.textContent.includes('NEXT OPPONENT');
        
        // Advance to Fight 2
        if (nextButton) nextButton.click();
        return { isArcade, hasLadder, opponentId, hasNextButton };
      })()
    `);
    await new Promise(r => setTimeout(r, 800));

    const arcadeFight2Result = await cdp.evaluate(`
      (function() {
        const game = window.__brawlGame;
        const fight2 = game.scene.getScene('FightScene');
        const ladderAdvanced = fight2.arcadeRun?.current()?.index === 1;

        // Simulate Defeat in Fight 2
        fight2.matchFlow.completeRound('opponent');
        fight2.matchFlow.phase = 'playing';
        fight2.matchFlow.completeRound('opponent');
        fight2.finishRound();
        
        const defeatStatus = fight2.arcadeRun?.status === 'defeat';
        const rematchBtn = document.getElementById('results-rematch');
        if (rematchBtn) rematchBtn.click();
        
        const retriedStatus = fight2.arcadeRun?.status === 'active';
        return { ladderAdvanced, defeatStatus, retriedStatus };
      })()
    `);

    const arcadePass = arcadeResult.isArcade && arcadeResult.hasLadder && arcadeResult.hasNextButton && arcadeFight2Result.ladderAdvanced && arcadeFight2Result.defeatStatus && arcadeFight2Result.retriedStatus;
    logResult(2, 'Arcade Mode End-to-End Progression & Defeat Retry', arcadePass,
      `Arcade init: mode=${arcadeResult.isArcade}, opp=${arcadeResult.opponentId}; Next fight btn=${arcadeResult.hasNextButton}; Ladder adv=${arcadeFight2Result.ladderAdvanced}; Defeat status=${arcadeFight2Result.defeatStatus}; Retry status=${arcadeFight2Result.retriedStatus}`);

    // 3. Test Training Mode: HTML Lab, Dummy Switching, 3D Position Reset, and Pause Toggle
    await cdp.evaluate(`
      (function() {
        const game = window.__brawlGame;
        document.getElementById('results-panel').hidden = true;
        game.scene.stop('FightScene');
        game.scene.start('FightScene', { mode: 'training', playerId: 'atlas', cpuId: 'volt', stageId: 'neon' });
      })()
    `);
    await new Promise(r => setTimeout(r, 800));

    const trainingResult = await cdp.evaluate(`
      (function() {
        const game = window.__brawlGame;
        const fight = game.scene.getScene('FightScene');
        
        const isTraining = fight.training === true;
        const panelPresent = !!document.getElementById('training-panel');
        const dummySelect = document.getElementById('training-dummy');
        
        // Dummy behavior switching
        dummySelect.value = 'guard';
        dummySelect.dispatchEvent(new Event('change'));
        const guardActive = fight.trainingSettings.dummy === 'guard';
        
        dummySelect.value = 'attack';
        dummySelect.dispatchEvent(new Event('change'));
        const attackActive = fight.trainingSettings.dummy === 'attack';
        
        // Displace fighters in X, Y, Z
        fight.player.x = 1.8; fight.player.z = 1.2; fight.player.vx = 4; fight.player.vz = 2; fight.player.health = 50;
        fight.cpu.x = -1.5; fight.cpu.z = -1.0; fight.cpu.vx = -3; fight.cpu.vz = -1; fight.cpu.health = 20;
        
        // Reset positions via hotkey
        fight.handleRestartKey();
        const p1Reset = fight.player.x === -2.5 && fight.player.z === 0 && fight.player.health === 100 && fight.player.vx === 0 && fight.player.vz === 0;
        const dummyReset = fight.cpu.x === 2.5 && fight.cpu.z === 0 && fight.cpu.health === 100 && fight.cpu.vx === 0 && fight.cpu.vz === 0;
        
        // Pause toggle
        fight.handlePauseToggle();
        const pauseOpen = fight.pauseOpen === true && !document.getElementById('pause-panel').hidden;
        fight.handlePauseToggle();
        const pauseClosed = fight.pauseOpen === false;
        
        // Return to Menu
        document.getElementById('pause-quit').click();
        return {
          isTraining,
          panelPresent,
          guardActive,
          attackActive,
          p1Reset,
          dummyReset,
          pauseOpen,
          pauseClosed
        };
      })()
    `);
    await new Promise(r => setTimeout(r, 600));

    const trainingCleanupResult = await cdp.evaluate(`
      (function() {
        const game = window.__brawlGame;
        const returnedToMenu = game.scene.isActive('MainMenuScene');
        const trainingPanelCleaned = !document.getElementById('training-panel');
        return { returnedToMenu, trainingPanelCleaned };
      })()
    `);

    const trainingPass = trainingResult.isTraining && trainingResult.panelPresent && trainingResult.guardActive && trainingResult.attackActive && trainingResult.p1Reset && trainingResult.dummyReset && trainingResult.pauseOpen && trainingResult.pauseClosed && trainingCleanupResult.returnedToMenu && trainingCleanupResult.trainingPanelCleaned;
    logResult(3, 'Training Lab: Behaviors, 3D Reset, Pause Toggle & Scene Cleanup', trainingPass,
      `Training mode=${trainingResult.isTraining}; Lab panel=${trainingResult.panelPresent}; Dummy switch (guard=${trainingResult.guardActive}, attack=${trainingResult.attackActive}); 3D Reset (P1=${trainingResult.p1Reset}, Dummy=${trainingResult.dummyReset}); Pause ESC=${trainingResult.pauseOpen}->${trainingResult.pauseClosed}; Menu exit cleanup=${trainingCleanupResult.trainingPanelCleaned}`);

    // 4. Test Local Versus Mode: Dual Roster Selection, Independent Victor Reporting & Rematch
    await cdp.evaluate(`
      (function() {
        const game = window.__brawlGame;
        document.getElementById('menu-shell').hidden = true;
        game.scene.stop('MainMenuScene');
        game.scene.start('SelectScene', { mode: 'local' });
      })()
    `);
    await new Promise(r => setTimeout(r, 600));

    await cdp.evaluate(`
      (function() {
        const select = window.__brawlGame.scene.getScene('SelectScene');
        select.selectedIndex = 0;   // P1 Atlas
        select.playerTwoIndex = 1;  // P2 Volt
        select.startFight();
      })()
    `);
    await new Promise(r => setTimeout(r, 800));

    const localVersusResult = await cdp.evaluate(`
      (function() {
        const game = window.__brawlGame;
        const fight = game.scene.getScene('FightScene');
        
        const isLocal = fight.localVersus === true;
        const p1Id = fight.playerCharacter.id;
        const p2Id = fight.cpuCharacter.id;
        
        // P1 Wins Match
        fight.matchFlow.completeRound('player');
        fight.matchFlow.phase = 'playing';
        fight.matchFlow.completeRound('player');
        fight.finishRound();
        
        const p1WinTitle = document.getElementById('results-title').textContent;
        const p1WinSubtitle = document.getElementById('results-subtitle').textContent;
        
        // Rematch
        document.getElementById('results-rematch').click();
        const rematchReset = fight.playerWins === 0 && fight.cpuWins === 0 && fight.roundNumber === 1 && fight.player.health === 100;
        
        // P2 Wins Match
        fight.matchFlow.completeRound('opponent');
        fight.matchFlow.phase = 'playing';
        fight.matchFlow.completeRound('opponent');
        fight.finishRound();
        
        const p2WinTitle = document.getElementById('results-title').textContent;
        const p2WinSubtitle = document.getElementById('results-subtitle').textContent;
        
        // Exit to Menu
        document.getElementById('results-menu').click();
        return {
          isLocal,
          p1Id,
          p2Id,
          p1WinTitle,
          p1WinSubtitle,
          rematchReset,
          p2WinTitle,
          p2WinSubtitle
        };
      })()
    `);
    await new Promise(r => setTimeout(r, 600));

    const localMenuResult = await cdp.evaluate(`
      (function() {
        const game = window.__brawlGame;
        const menuActive = game.scene.isActive('MainMenuScene');
        const resultsHidden = document.getElementById('results-panel').hidden === true;
        return { menuActive, resultsHidden };
      })()
    `);

    const localPass = localVersusResult.isLocal && localVersusResult.p1WinTitle === 'PLAYER 1 WINS' && localVersusResult.p2WinTitle === 'PLAYER 2 WINS' && localVersusResult.rematchReset && localMenuResult.menuActive && localMenuResult.resultsHidden;
    logResult(4, 'Local Versus Mode: Dual Selection, Unambiguous Victor Reporting & Rematch', localPass,
      `Local mode=${localVersusResult.isLocal}; P1=${localVersusResult.p1Id} vs P2=${localVersusResult.p2Id}; P1 Victory="${localVersusResult.p1WinTitle}"; P2 Victory="${localVersusResult.p2WinTitle}"; Rematch reset=${localVersusResult.rematchReset}; Clean Menu exit=${localMenuResult.menuActive}`);

  } catch (err) {
    console.error('Phase 5 Verification Error:', err);
    logResult(99, 'Fatal Error During Execution', false, err.message);
  } finally {
    if (cdp) cdp.close();
    if (browserProcess) browserProcess.kill();
    server.close();
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {}
  }

  const allPassed = results.every(r => r.passed);
  console.log('========================================================================');
  if (allPassed) {
    console.log(`   Phase 5 Offline Game Modes Verification: ALL CHECKS PASSED (${results.length}/${results.length})`);
  } else {
    console.log('   Phase 5 Offline Game Modes Verification: SOME CHECKS FAILED');
  }
  console.log('========================================================================\n');

  fs.writeFileSync('scripts/phase5-gameplay-verification.json', JSON.stringify({
    timestamp: new Date().toISOString(),
    allPassed,
    results
  }, null, 2));

  process.exit(allPassed ? 0 : 1);
}

runPhase5GameplayVerification();
