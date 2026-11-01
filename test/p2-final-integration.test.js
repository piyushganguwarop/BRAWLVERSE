import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const menu = readFileSync('src/scenes/MainMenuScene.js', 'utf8');
const select = readFileSync('src/scenes/SelectScene.js', 'utf8');
const fight = readFileSync('src/scenes/FightScene.js', 'utf8');
const html = readFileSync('index.html', 'utf8');

test('Main menu binds navigation actions idempotently on every scene entry', () => {
  assert.match(menu, /querySelectorAll\('\[data-go\]'\)/);
  assert.match(menu, /btn\.onclick\s*=/);
  assert.match(menu, /profile-save'\)\s*&&\s*\(\$\('profile-save'\)\.onclick\s*=/);
  assert.doesNotMatch(menu, /profile-save'\)\?\.addEventListener/);
  assert.doesNotMatch(menu, /profile-name'\)\?\.addEventListener/);
});

test('Character and stage selection pass chosen fighter and arena into the match', () => {
  assert.match(select, /this\.scene\.start\('FightScene'/);
  assert.match(select, /stageId:\s*this\.stages\[this\.stageIndex\]\.id/);
  assert.match(select, /customFighter:\s*savedCustom\s*\?\s*player\s*:\s*null/);
});

test('Match results, pause actions, and profile history are wired to persisted match data', () => {
  for (const id of ['pause-resume','pause-restart','pause-settings','pause-quit','results-rematch','results-select','results-menu']) {
    assert.ok(html.includes(`id="${id}"`), `missing ${id}`);
  }
  assert.match(fight, /fighter\.profile\.history\.v1/);
  assert.match(fight, /fighter\.profile\.stats\.v1/);
  assert.match(fight, /results-rematch/);
});

test('P2 settings and touch controls have matching markup and handlers', () => {
  for (const id of ['setting-master','setting-music','setting-effects','setting-quality','setting-fullscreen','touch-controls']) {
    assert.ok(html.includes(`id="${id}"`), `missing ${id}`);
  }
  assert.match(menu, /setting-master/);
  assert.match(fight, /touch-controls/);
});
