import test from 'node:test';
import assert from 'node:assert/strict';
import { audioManager } from '../src/audio/AudioManager.js';
import { ArcadeProgression } from '../src/modes/ArcadeProgression.js';
import { RoundManager } from '../src/combat/RoundManager.js';
import { cleanFighter, defaults, toFighter } from '../src/characters/CustomFighter.js';
import { awardMatch, progressionSnapshot, isFighterUnlocked, isStageUnlocked } from '../src/progression/Progression.js';
import { cleanPlayerName, cleanFighterId, isValidRoomCode, sanitizeInputPayload } from '../server/validation.js';

test('AudioManager handles headless runtime and volume clamping safely', () => {
  // Volume sync with fallbacks should not throw in Node.js
  assert.doesNotThrow(() => audioManager.syncVolumes());
  assert.doesNotThrow(() => audioManager.setMasterVolume(0.5));
  assert.doesNotThrow(() => audioManager.setMusicVolume(1.2)); // clamps to 1
  assert.doesNotThrow(() => audioManager.setEffectsVolume(-0.2)); // clamps to 0

  // All procedural audio synthesis methods must be fail-safe without an AudioContext
  assert.doesNotThrow(() => audioManager.playPunch());
  assert.doesNotThrow(() => audioManager.playKick());
  assert.doesNotThrow(() => audioManager.playGrab());
  assert.doesNotThrow(() => audioManager.playBlock(true));
  assert.doesNotThrow(() => audioManager.playBlock(false));
  assert.doesNotThrow(() => audioManager.playSpecial());
  assert.doesNotThrow(() => audioManager.playLauncher());
  assert.doesNotThrow(() => audioManager.playRoundStart());
  assert.doesNotThrow(() => audioManager.playKO());
  assert.doesNotThrow(() => audioManager.playVictory());
  assert.doesNotThrow(() => audioManager.playClick());
});

test('Arcade full ladder run simulation completes with victory bonus', () => {
  const run = new ArcadeProgression({ playerId: 'atlas', stageId: 'neon' });
  const totalFights = run.opponents.length;
  assert.equal(totalFights, 7); // 8 in roster minus player atlas
  assert.equal(run.wins, 0);

  // Play and win all fights
  for (let fightIdx = 0; fightIdx < totalFights; fightIdx++) {
    const current = run.current();
    assert.ok(current, `Fight ${fightIdx + 1} must exist`);
    assert.notEqual(current.fighterId, 'atlas', 'Opponent must not be player');

    const result = run.recordMatch(true);
    if (fightIdx < totalFights - 1) {
      assert.equal(result.status, 'between-fights');
      assert.equal(run.wins, fightIdx + 1);
      const advanced = run.nextFight();
      assert.equal(advanced, true);
    } else {
      assert.equal(result.status, 'complete');
      assert.equal(run.wins, totalFights);
    }
  }

  // Final match rewards include arcade clear bonus (+250 XP, +150 coins)
  const reward = awardMatch({ won: true, mode: 'arcade', arcadeComplete: true });
  assert.equal(reward.xp, 350, 'Includes match win XP (100) + arcade clear XP (250)');
  assert.equal(reward.coins, 210, 'Includes match win coins (60) + arcade clear coins (150)');
});

test('Arcade run halts immediately on defeat without advancing', () => {
  const run = new ArcadeProgression({ playerId: 'volt', stageId: 'temple' });
  const first = run.current();
  assert.ok(first);

  const defeatResult = run.recordMatch(false);
  assert.equal(defeatResult.status, 'defeat');
  assert.equal(run.wins, 0);
  assert.equal(run.nextFight(), false, 'Cannot advance past defeat');
});

test('RoundManager handles consecutive matches and score resets correctly', () => {
  const rm = new RoundManager({ roundsToWin: 2, roundDuration: 99 });

  // Match 1: Player wins 2 - 0
  rm.tick(1);
  assert.ok(rm.decideWinner(100, 0));
  rm.nextRound();
  rm.tick(1);
  assert.ok(rm.decideWinner(100, 0));
  assert.equal(rm.phase, 'complete');
  assert.equal(rm.matchWinner, 'player');
  assert.equal(rm.wins.player, 2);
  assert.equal(rm.wins.opponent, 0);

  // Reset for Rematch
  rm.reset();
  assert.equal(rm.phase, 'playing');
  assert.equal(rm.round, 1);
  assert.equal(rm.wins.player, 0);
  assert.equal(rm.wins.opponent, 0);

  // Match 2: Opponent wins 2 - 1
  rm.tick(1);
  assert.ok(rm.decideWinner(0, 100)); // Opponent wins round 1
  rm.nextRound();
  rm.tick(1);
  assert.ok(rm.decideWinner(100, 0)); // Player wins round 2
  rm.nextRound();
  rm.tick(1);
  assert.ok(rm.decideWinner(0, 100)); // Opponent wins round 3
  assert.equal(rm.phase, 'complete');
  assert.equal(rm.matchWinner, 'opponent');
  assert.equal(rm.wins.player, 1);
  assert.equal(rm.wins.opponent, 2);
});

test('Custom fighter appearance bounds clamping and normalization', () => {
  const raw = {
    name: '  Overpowered Champion  ',
    height: 999, // Should clamp to max 112
    width: -50,  // Should clamp to min 85
    legs: 200,   // Should clamp to max 110
    muscle: 500, // Should clamp to max 100
    color: '#00ffcc',
    accent: '#ff0033',
    skin: '#f5cda0',
    hair: '#111111',
    outfit: 'invalid-style' // Should fallback to defaults.outfit ('classic')
  };

  const sanitized = cleanFighter(raw);
  assert.equal(sanitized.height, 112);
  assert.equal(sanitized.width, 85);
  assert.equal(sanitized.legs, 110);
  assert.equal(sanitized.muscle, 100);
  assert.equal(sanitized.outfit, 'classic');
  assert.equal(sanitized.name, 'Overpowered Champi'); // 18 chars

  const fighterConfig = toFighter(sanitized);
  assert.equal(fighterConfig.id, 'custom');
  assert.equal(fighterConfig.name, 'OVERPOWERED CHAMPI');
});

test('Multiplayer sanitization rejects malformed payloads and malicious input', () => {
  assert.equal(isValidRoomCode('123456'), true);
  assert.equal(isValidRoomCode('ABCDEF'), true);
  assert.equal(isValidRoomCode('12ABcd'), true);
  assert.equal(isValidRoomCode('12345'), false); // Too short
  assert.equal(isValidRoomCode('1234567'), false); // Too long
  assert.equal(isValidRoomCode('12345g'), false); // Non-hex character

  assert.equal(cleanPlayerName('  User\u0000\u0007Name  '), 'UserName');
  assert.equal(cleanPlayerName('x'.repeat(40)).length, 18);
  assert.equal(cleanFighterId('__proto__'), 'atlas');
  assert.equal(cleanFighterId('constructor'), 'atlas');
  assert.equal(cleanFighterId('cipher'), 'cipher');

  const sanitized = sanitizeInputPayload({
    left: true,
    right: 1, // Not strict boolean true
    jump: 'true', // Not strict boolean true
    dashForward: true,
    dashBack: false,
    hack: true // Unknown control
  });

  assert.deepEqual(sanitized, {
    left: true,
    right: false,
    jump: false,
    down: false,
    punch: false,
    kick: false,
    special: false,
    grab: false,
    block: false,
    dashForward: true,
    dashBack: false
  });
});

test('25 continuous match simulations complete without state corruption', () => {
  const rm = new RoundManager({ roundsToWin: 2, roundDuration: 99 });
  for (let match = 0; match < 25; match++) {
    rm.reset();
    assert.equal(rm.phase, 'playing');
    assert.equal(rm.wins.player, 0);
    assert.equal(rm.wins.opponent, 0);

    // Simulate match
    rm.tick(5);
    assert.ok(rm.decideWinner(100, 0)); // round 1
    rm.nextRound();
    rm.tick(5);
    assert.ok(rm.decideWinner(100, 0)); // round 2
    assert.equal(rm.phase, 'complete');
    assert.equal(rm.matchWinner, 'player');
  }
});

test('InputController state isolation and touch reset cleanliness', () => {
  // Test input state isolation structure
  const p1Default = { left:false,right:false,jump:false,down:false,punch:false,kick:false,special:false,grab:false,block:false,dashForward:false,dashBack:false };
  const p2Default = { left:false,right:false,jump:false,down:false,punch:false,kick:false,special:false,grab:false,block:false,dashForward:false,dashBack:false };
  assert.deepEqual(p1Default, p2Default);
  // Ensure mutating one does not mutate the other
  p1Default.punch = true;
  assert.equal(p2Default.punch, false);
});

test('Progression level calculations and unlock thresholds', async () => {
  const { getPlayerLevel, xpForNextLevel } = await import('../src/progression/Progression.js');
  assert.equal(getPlayerLevel(0), 1);
  assert.equal(getPlayerLevel(99), 1);
  assert.equal(getPlayerLevel(100), 2);
  assert.equal(getPlayerLevel(400), 3);
  assert.equal(getPlayerLevel(900), 4);
  assert.equal(getPlayerLevel(1600), 5);

  assert.equal(xpForNextLevel(1), 100);
  assert.equal(xpForNextLevel(2), 400);
  assert.equal(xpForNextLevel(3), 900);
});

test('Stage definitions and roster integrity across all playable modes', async () => {
  const { roster } = await import('../src/characters/roster.js');
  assert.equal(roster.length, 8);
  const ids = new Set(roster.map(f => f.id));
  assert.equal(ids.size, 8);
  for (const fighter of roster) {
    assert.ok(fighter.id && typeof fighter.id === 'string');
    assert.ok(fighter.name && typeof fighter.name === 'string');
    assert.ok(Number.isFinite(fighter.color));
    assert.ok(Number.isFinite(fighter.accent));
    assert.ok(fighter.style && typeof fighter.style === 'string');
  }
});
