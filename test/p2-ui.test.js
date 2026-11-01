import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const fight = readFileSync(new URL('../src/scenes/FightScene.js', import.meta.url), 'utf8');

test('P2 registers the main menu scene before fighter selection', () => {
  assert.match(main, /import \{ MainMenuScene \}/);
  assert.match(main, /scene:\s*\[MainMenuScene,\s*SelectScene,\s*FightScene\]/);
});

test('P2 provides the required navigation screens and settings controls', () => {
  for (const id of ['menu-shell','setting-master','setting-music','setting-effects','profile-name','profile-fighters','profile-record']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  for (const mode of ['arcade','online','local','training','creator','settings','profile']) {
    assert.match(html, new RegExp(`data-go="${mode}"`));
  }
});

test('P2 provides pause and match result actions wired in the fight scene', () => {
  for (const id of ['pause-resume','pause-restart','pause-controls','pause-settings','pause-quit','results-rematch','results-select','results-menu']) assert.match(html, new RegExp(`id="${id}"`));
  for (const action of ['openPauseMenu','closePauseMenu','results-panel','fighter.profile.stats.v1']) assert.ok(fight.includes(action));
});
