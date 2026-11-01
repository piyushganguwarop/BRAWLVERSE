import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const scene = fs.readFileSync(new URL('../src/scenes/SelectScene.js', import.meta.url), 'utf8');
const fight = fs.readFileSync(new URL('../src/scenes/FightScene.js', import.meta.url), 'utf8');

test('selection screen exposes and persists Easy, Normal and Hard CPU choices', () => {
  assert.match(scene, /createDifficultySelector\(\)/);
  assert.match(scene, /\['easy', 'normal', 'hard'\]/);
  assert.match(scene, /fighter\.cpu\.difficulty/);
  assert.match(scene, /difficulty: firstArcade\?\.difficulty \?\? this\.difficulty/);
});

test('fight scene uses CPUController for non-online opponents and rebuilds it after round reset', () => {
  assert.match(fight, /new CPUController\(\{ fighter: this\.cpu, opponent: this\.player, difficulty: this\.cpuDifficulty \}\)/);
  assert.match(fight, /const decision = this\.cpuAI\.update\(dt\)/);
  assert.match(fight, /if \(decision\.action\) this\.cpu\.startAction\(decision\.action\)/);
  assert.match(fight, /this\.online \? null : new CPUController/);
});
