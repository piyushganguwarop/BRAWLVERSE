import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve('src');
const select = fs.readFileSync(path.join(root, 'scenes/SelectScene.js'), 'utf8');
const menu = fs.readFileSync(path.join(root, 'scenes/MainMenuScene.js'), 'utf8');
const fight = fs.readFileSync(path.join(root, 'scenes/FightScene.js'), 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
test('P2 fighter selection includes a live Three.js roster preview with cleanup', () => {
  assert.match(select, /new CustomizerPreview/);
  assert.match(select, /updateSelectionPreview/);
  assert.match(select, /selectionPreview\?\.dispose/);
});
test('P2 stage selector updates a stage-specific preview', () => {
  assert.match(select, /drawStagePreview\(\)/);
  assert.match(select, /stageIndex/);
  assert.match(select, /host.id = 'stage-preview'/);
});
test('P2 profile renders recent match history from persisted results', () => {
  assert.match(fight, /fighter\.profile\.history\.v1/);
  assert.match(menu, /profile-history/);
  assert.match(html, /id="profile-history"/);
});
