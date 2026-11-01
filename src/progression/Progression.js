import { roster } from '../characters/roster.js';

const KEY = 'fighter.progression.v1';
const FIGHTER_UNLOCKS = {
  myst: { level: 2, coins: 100 }, blaze: { level: 3, coins: 180 },
  nova: { level: 4, coins: 240 }, cipher: { level: 5, coins: 300 }, onyx: { level: 6, coins: 400 }
};
const STAGE_UNLOCKS = { temple: { level: 3, coins: 150 }, rooftop: { level: 5, coins: 250 } };
const fresh = () => ({ xp: 0, coins: 0, wins: 0, losses: 0, unlockedFighters: ['atlas','volt','rook'], unlockedStages: ['neon'] });
export function loadProgression() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    const state = { ...fresh(), ...(saved || {}) };
    state.xp = Math.max(0, Number(state.xp) || 0);
    state.coins = Math.max(0, Number(state.coins) || 0);
    state.wins = Math.max(0, Number(state.wins) || 0);
    state.losses = Math.max(0, Number(state.losses) || 0);
    state.unlockedFighters = [...new Set(['atlas','volt','rook', ...(Array.isArray(state.unlockedFighters) ? state.unlockedFighters : [])])].filter(id => roster.some(f => f.id === id));
    state.unlockedStages = [...new Set(['neon', ...(Array.isArray(state.unlockedStages) ? state.unlockedStages : [])])].filter(id => ['neon','temple','rooftop'].includes(id));
    return state;
  } catch { return fresh(); }
}
export function saveProgression(state) {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
  return state;
}
export function getPlayerLevel(xp) { return Math.floor(Math.sqrt(Math.max(0, Number(xp) || 0) / 100)) + 1; }
export function xpForNextLevel(level) { return level * level * 100; }
export function isFighterUnlocked(id, state = loadProgression()) { return state.unlockedFighters.includes(id); }
export function isStageUnlocked(id, state = loadProgression()) { return state.unlockedStages.includes(id); }
export function purchaseFighter(id) {
  const state = loadProgression(), cost = FIGHTER_UNLOCKS[id];
  if (state.unlockedFighters.includes(id)) return { ok: true, state, reason: 'unlocked' };
  if (!cost) return { ok: false, state, reason: 'unavailable' };
  if (getPlayerLevel(state.xp) < cost.level) return { ok: false, state, reason: `Reach level ${cost.level}` };
  if (state.coins < cost.coins) return { ok: false, state, reason: `Need ${cost.coins} coins` };
  state.coins -= cost.coins; state.unlockedFighters.push(id); saveProgression(state);
  return { ok: true, state, reason: 'purchased' };
}
export function purchaseStage(id) {
  const state = loadProgression(), cost = STAGE_UNLOCKS[id];
  if (state.unlockedStages.includes(id)) return { ok: true, state, reason: 'unlocked' };
  if (!cost) return { ok: false, state, reason: 'unavailable' };
  if (getPlayerLevel(state.xp) < cost.level) return { ok: false, state, reason: `Reach level ${cost.level}` };
  if (state.coins < cost.coins) return { ok: false, state, reason: `Need ${cost.coins} coins` };
  state.coins -= cost.coins; state.unlockedStages.push(id); saveProgression(state);
  return { ok: true, state, reason: 'purchased' };
}
export function awardMatch({ won, mode = 'arcade', arcadeComplete = false } = {}) {
  const state = loadProgression();
  const xp = won ? (mode === 'arcade' ? 100 : 60) + (arcadeComplete ? 250 : 0) : 25;
  const coins = won ? (mode === 'arcade' ? 60 : 35) + (arcadeComplete ? 150 : 0) : 10;
  state.xp += xp; state.coins += coins;
  if (won) state.wins += 1; else state.losses += 1;
  saveProgression(state);
  return { state, xp, coins, level: getPlayerLevel(state.xp) };
}
export function progressionSnapshot() {
  const state = loadProgression(), level = getPlayerLevel(state.xp);
  return { ...state, level, nextLevelXp: xpForNextLevel(level), progress: Math.min(1, (state.xp - (level-1)*(level-1)*100) / (level*level*100 - (level-1)*(level-1)*100)) };
}
