import test from 'node:test';
import assert from 'node:assert';
import { audioManager } from '../src/audio/AudioManager.js';

test('Phase 7 - AudioManager: procedural BGM engine handles track lifecycle and stops cleanly', () => {
  assert.strictEqual(typeof audioManager.startBGM, 'function');
  assert.strictEqual(typeof audioManager.stopBGM, 'function');

  // Should handle headless execution safely without throwing
  assert.doesNotThrow(() => audioManager.startBGM('menu'));
  assert.strictEqual(audioManager.currentTrack, 'menu');

  assert.doesNotThrow(() => audioManager.startBGM('combat'));
  assert.strictEqual(audioManager.currentTrack, 'combat');

  assert.doesNotThrow(() => audioManager.startBGM('victory'));
  assert.strictEqual(audioManager.currentTrack, 'victory');

  assert.doesNotThrow(() => audioManager.stopBGM());
  assert.strictEqual(audioManager.currentTrack, null);
});

test('Phase 7 - AudioManager: exposes responsive UI sound effects', () => {
  assert.strictEqual(typeof audioManager.playHover, 'function');
  assert.strictEqual(typeof audioManager.playConfirm, 'function');
  assert.strictEqual(typeof audioManager.playCancel, 'function');
  assert.strictEqual(typeof audioManager.playSelect, 'function');
  assert.strictEqual(typeof audioManager.playCountdown, 'function');

  // Headless safety
  assert.doesNotThrow(() => audioManager.playHover());
  assert.doesNotThrow(() => audioManager.playConfirm());
  assert.doesNotThrow(() => audioManager.playCancel());
  assert.doesNotThrow(() => audioManager.playSelect());
  assert.doesNotThrow(() => audioManager.playCountdown(false));
  assert.doesNotThrow(() => audioManager.playCountdown(true));
});

test('Phase 7 - AudioManager: volume bus mixing and clamping integrity', () => {
  assert.doesNotThrow(() => audioManager.setMasterVolume(0.75));
  assert.doesNotThrow(() => audioManager.setMusicVolume(0.60));
  assert.doesNotThrow(() => audioManager.setEffectsVolume(0.85));

  // Clamping
  assert.doesNotThrow(() => audioManager.setMasterVolume(-0.5));
  assert.doesNotThrow(() => audioManager.setMusicVolume(1.5));
  assert.doesNotThrow(() => audioManager.syncVolumes());
});

