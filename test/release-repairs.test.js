import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('FightScene creates pause controls before its first HUD layout', async () => {
  const fight = await source('src/scenes/FightScene.js');
  const create = fight.slice(fight.indexOf('  create() {'), fight.indexOf('  createHud() {'));
  assert.ok(create.indexOf('this.createPauseButton()') < create.indexOf('this.layoutHud('));
  assert.doesNotMatch(fight.slice(fight.indexOf('  createHud() {'), fight.indexOf('  createTrainingPanel() {')), /this\.layoutHud\(/, 'HUD creation does not layout before pause controls exist');
});

test('fighter selection reserves separate roster, details and action regions', async () => {
  const select = await source('src/scenes/SelectScene.js');
  assert.match(select, /toolbarTop/);
  assert.match(select, /cardsBottom/);
  assert.match(select, /infoPanel\.setPosition\(infoX, infoY\)/);
  assert.match(select, /showSidePreviews = width >= 1500/);
  assert.match(select, /this\.startButton\.setPosition\(width \/ 2, height - 32\)/);
});

test('creator preview frames model bounds on resize and appearance changes', async () => {
  const preview = await source('src/characters/CustomizerPreview.js');
  assert.match(preview, /Box3/);
  assert.match(preview, /camera\.lookAt\(center\)/);
  assert.match(preview, /renderer\.setSize\(w, h, false\); this\.frameModel\(\)/);
  assert.match(preview, /this\.frameModel\(\);\s*}\s*\n\s*animate\(/);
});

test('creator modal uses a single scroll container and disposes its preview on close', async () => {
  const css = await source('src/style.css');
  const select = await source('src/scenes/SelectScene.js');
  assert.match(css, /\.creator-panel\{overflow:hidden/);
  assert.match(css, /\.creator-card\{max-height:[^}]+overflow-y:auto/);
  assert.match(select, /this\.creatorPreview\?\.dispose\(\)/);
});
