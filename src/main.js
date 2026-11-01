import Phaser from 'phaser';
import { gameConfig } from './config/gameConfig.js';
import { FightScene } from './scenes/FightScene.js';
import { SelectScene } from './scenes/SelectScene.js';
import { MainMenuScene } from './scenes/MainMenuScene.js';
import { audioManager } from './audio/AudioManager.js';
import './style.css';

const bootMessage = document.getElementById('boot-message');
const runtimeNotice = document.getElementById('runtime-notice');
const runtimeMessage = document.getElementById('runtime-notice-message');
const reloadButton = document.getElementById('runtime-reload');
reloadButton?.addEventListener('click', () => window.location.reload());

// Unlock Web Audio on first user interaction
const unlockAudio = () => {
  audioManager.ensureContext();
  window.removeEventListener('pointerdown', unlockAudio);
  window.removeEventListener('keydown', unlockAudio);
};
window.addEventListener('pointerdown', unlockAudio);
window.addEventListener('keydown', unlockAudio);

// Keep fullscreen checkboxes synchronized on browser fullscreen changes (e.g. Escape key)
document.addEventListener('fullscreenchange', () => {
  const isFullscreen = !!document.fullscreenElement;
  const menuFs = document.getElementById('setting-fullscreen');
  if (menuFs) menuFs.checked = isFullscreen;
  const pauseFs = document.getElementById('pause-setting-fullscreen');
  if (pauseFs) pauseFs.checked = isFullscreen;
});

function reportRuntimeIssue(message, error) {
  if (message && (message.includes('ResizeObserver') || message.includes('Script error.'))) return;
  if (error) console.error('Brawl Wars Runtime Error:', error);
  if (runtimeMessage) runtimeMessage.textContent = String(message || 'Unexpected game error').slice(0, 240);
  if (runtimeNotice) runtimeNotice.hidden = false;
  document.getElementById('boot-screen')?.classList.add('is-hidden');
}
window.addEventListener('error', event => reportRuntimeIssue(event.message || 'A script failed to load.', event.error));
window.addEventListener('unhandledrejection', event => {
  const reason = event.reason;
  reportRuntimeIssue(reason?.message || reason || 'An asynchronous operation failed.', reason);
});
if (bootMessage) bootMessage.textContent = 'Loading game systems...';

const config = {
  type: Phaser.AUTO,
  parent: 'phaser-root',
  width: gameConfig.width,
  height: gameConfig.height,
  transparent: true,
  backgroundColor: 'rgba(0,0,0,0)',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: '100%',
    height: '100%'
  },
  input: { activePointers: 4 },
  scene: [MainMenuScene, SelectScene, FightScene]
};

try {
  const game = new Phaser.Game(config);
  game.events.once(Phaser.Core.Events.READY, () => {
    if (bootMessage) bootMessage.textContent = 'Entering the arena...';
  });
} catch (error) {
  reportRuntimeIssue(error?.message || 'The game could not start.');
  throw error;
}
