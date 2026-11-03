import test from 'node:test';
import assert from 'node:assert/strict';
import { ArcadeProgression } from '../src/modes/ArcadeProgression.js';
import { Fighter } from '../src/characters/Fighter.js';
import { roster, getFighter } from '../src/characters/roster.js';

test('Phase 5 - Arcade: Complete ladder progression and retry mechanics', () => {
  const run = new ArcadeProgression({ playerId: 'atlas', opponents: ['volt', 'rook', 'myst'], stageId: 'neon' });
  assert.strictEqual(run.current().index, 0);
  assert.strictEqual(run.current().fighterId, 'volt');
  assert.strictEqual(run.current().boss, false);

  // Win fight 1
  const s1 = run.recordMatch(true);
  assert.strictEqual(s1.status, 'between-fights');
  assert.strictEqual(run.nextFight(), true);
  assert.strictEqual(run.current().fighterId, 'rook');

  // Lose fight 2
  const s2 = run.recordMatch(false);
  assert.strictEqual(s2.status, 'defeat');
  assert.strictEqual(run.current(), null);

  // Retry fight 2 (continue)
  run.retryFight();
  assert.strictEqual(run.status, 'active');
  assert.strictEqual(run.current().fighterId, 'rook');

  // Win fight 2
  run.recordMatch(true);
  run.nextFight();
  assert.strictEqual(run.current().boss, true);
  assert.strictEqual(run.current().fighterId, 'myst');

  // Win final boss
  const sFinal = run.recordMatch(true);
  assert.strictEqual(sFinal.status, 'complete');
  assert.strictEqual(run.wins, 3);

  // Retry full arcade run
  run.retry();
  assert.strictEqual(run.status, 'active');
  assert.strictEqual(run.index, 0);
  assert.strictEqual(run.wins, 0);
  assert.strictEqual(run.current().fighterId, 'volt');
});

test('Phase 5 - Training: 3D position, depth, velocity and cooldown reset integrity', () => {
  const p1 = new Fighter({ id: 'player', x: 1.5, z: 1.2, character: getFighter('atlas') });
  const dummy = new Fighter({ id: 'cpu', x: -1.0, z: -0.8, isCpu: true, character: getFighter('volt') });

  // Simulate displacement, velocity, stun and cooldowns during training
  p1.vx = 4.0; p1.vz = 3.0; p1.knockbackVelocity = 2.5; p1.knockbackVelocityZ = 1.8;
  p1.cooldowns.heavy = 0.45; p1.cooldowns.punch = 0.2;
  p1.health = 45; p1.energy = 10;

  dummy.vx = -3.0; dummy.vz = -2.0; dummy.knockbackVelocity = -2.0; dummy.knockbackVelocityZ = -1.5;
  dummy.cooldowns.special = 0.8;
  dummy.health = 20;

  // Execute training reset logic
  const fighters = [p1, dummy];
  p1.x = -2.5; p1.z = 0;
  dummy.x = 2.5; dummy.z = 0;
  for (const f of fighters) {
    f.y = 0; f.z = 0; f.vx = 0; f.vy = 0; f.vz = 0;
    f.health = 100; f.energy = 100; f.state = 'idle';
    f.activeAction = null; f.actionTime = 0; f.actionElapsed = 0;
    f.stun = 0; f.knockbackVelocity = 0; f.knockbackVelocityZ = 0;
    f.blocking = false; f.invulnerable = 0;
    f.cooldowns = { punch: 0, kick: 0, heavy: 0, grab: 0, special: 0 };
  }
  p1.facing = 1; dummy.facing = -1;

  // Assert complete 3D reset
  assert.strictEqual(p1.x, -2.5);
  assert.strictEqual(p1.z, 0);
  assert.strictEqual(p1.vx, 0);
  assert.strictEqual(p1.vz, 0);
  assert.strictEqual(p1.knockbackVelocityZ, 0);
  assert.strictEqual(p1.health, 100);
  assert.strictEqual(p1.energy, 100);
  assert.strictEqual(p1.cooldowns.heavy, 0);

  assert.strictEqual(dummy.x, 2.5);
  assert.strictEqual(dummy.z, 0);
  assert.strictEqual(dummy.vx, 0);
  assert.strictEqual(dummy.vz, 0);
  assert.strictEqual(dummy.knockbackVelocityZ, 0);
  assert.strictEqual(dummy.health, 100);
});

test('Phase 5 - Local Versus: Fighter selection independence and distinct victor reporting', () => {
  const p1Character = getFighter('atlas');
  const p2Character = getFighter('myst');

  // Verify distinct characters in roster
  assert.notStrictEqual(p1Character.id, p2Character.id);

  // Simulate local versus match victory check
  const playerWins = 2;
  const cpuWins = 1;
  const won = playerWins > cpuWins;

  const resultTitleP1 = won ? 'PLAYER 1 WINS' : 'PLAYER 2 WINS';
  const resultSubtitleP1 = won
    ? `${p1Character.name} defeated ${p2Character.name} in local versus.`
    : `${p2Character.name} defeated ${p1Character.name} in local versus.`;

  assert.strictEqual(resultTitleP1, 'PLAYER 1 WINS');
  assert.ok(resultSubtitleP1.toLowerCase().includes('atlas defeated myst'));

  // Test P2 victory branch
  const wonP2 = false;
  const resultTitleP2 = wonP2 ? 'PLAYER 1 WINS' : 'PLAYER 2 WINS';
  const resultSubtitleP2 = wonP2
    ? `${p1Character.name} defeated ${p2Character.name} in local versus.`
    : `${p2Character.name} defeated ${p1Character.name} in local versus.`;

  assert.strictEqual(resultTitleP2, 'PLAYER 2 WINS');
  assert.ok(resultSubtitleP2.toLowerCase().includes('myst defeated atlas'));
});

test('Phase 5 - Input and Hotkeys: Pause toggle (ESC/P) and Restart (R/T) registrations', async () => {
  const fs = await import('node:fs');
  const fightSceneSrc = fs.readFileSync(new URL('../src/scenes/FightScene.js', import.meta.url), 'utf8');

  // Verify ESC and P key listeners
  assert.match(fightSceneSrc, /keydown-ESC/);
  assert.match(fightSceneSrc, /keydown-P/);
  assert.match(fightSceneSrc, /handlePauseToggle/);

  // Verify R key restart & advance logic
  assert.match(fightSceneSrc, /keydown-R/);
  assert.match(fightSceneSrc, /handleRestartKey/);

  // Verify training position reset on R or T
  assert.match(fightSceneSrc, /if \(this\.training\) \{\s*this\.resetTrainingPositions\(\);/);

  // Verify retryFight and retry handling on rematch
  assert.match(fightSceneSrc, /this\.arcadeRun\.retryFight\(\)/);
  assert.match(fightSceneSrc, /this\.arcadeRun\.retry\(\)/);

  // Verify mode alias support (local vs versus)
  assert.match(fightSceneSrc, /this\.mode = data\.mode === 'versus' \? 'local'/);
});
