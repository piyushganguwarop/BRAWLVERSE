import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('P2 settings expose graphics quality and fullscreen preferences', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  assert.match(html, /id="setting-quality"/);
  assert.match(html, /id="setting-fullscreen"/);
  assert.match(html, /id="setting-shake"/);
});

test('Pause menu has an in-match settings panel with live controls', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const fight = fs.readFileSync('src/scenes/FightScene.js', 'utf8');
  assert.match(html, /id="pause-settings-panel"/);
  assert.match(html, /id="pause-setting-quality"/);
  assert.match(fight, /openPauseSettings\(\)/);
  assert.match(fight, /bindPauseSettings\(\)/);
  assert.match(fight, /applyQuality\(quality\.value\)/);
});

test('Graphics quality changes renderer pixel ratio and shadows', () => {
  const three = fs.readFileSync('src/three/ThreeStage.js', 'utf8');
  assert.match(three, /applyQuality\(quality = 'high'\)/);
  assert.match(three, /setPixelRatio/);
  assert.match(three, /shadowMap\.enabled = preset\.shadows/);
});

test('Fullscreen preference requests and exits browser fullscreen', () => {
  const menu = fs.readFileSync('src/scenes/MainMenuScene.js', 'utf8');
  const fight = fs.readFileSync('src/scenes/FightScene.js', 'utf8');
  assert.match(menu, /requestFullscreen\(\)/);
  assert.match(menu, /exitFullscreen\(\)/);
  assert.match(fight, /requestFullscreen\(\)/);
  assert.match(fight, /exitFullscreen\(\)/);
});
