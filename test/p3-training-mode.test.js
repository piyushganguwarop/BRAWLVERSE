import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const fight = fs.readFileSync(new URL('../src/scenes/FightScene.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
test('training mode has independent setup and does not finish rounds on knockout', () => {
  assert.match(fight, /this\.training = this\.mode === 'training'/);
  assert.match(fight, /if \(!this\.training && this\.matchFlow\.decideWinner/);
  assert.match(fight, /this\.training \? '∞'/);
});
test('training dummy supports stationary, guard and attack-back behavior', () => {
  for (const value of ['stationary','guard','attack']) assert.ok(fight.includes(`value="${value}"`));
  assert.match(fight, /this\.trainingSettings\.dummy === 'stationary'/);
  assert.match(fight, /this\.trainingSettings\.dummy === 'guard'/);
});
test('training lab exposes health and energy toggles, stats, and reset controls', () => {
  for (const id of ['training-player-health','training-dummy-health','training-energy','training-damage','training-hits','training-combo','training-last','training-reset','training-clear']) assert.ok(fight.includes(id), `missing ${id}`);
  assert.match(fight, /resetTrainingPositions\(\)/);
  assert.match(fight, /this\.trainingStats\.damage \+= dealt/);
  assert.match(fight, /this\.trainingStats\.maxCombo/);
  assert.match(css, /#training-panel/);
});
