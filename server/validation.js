export const FIGHTER_IDS = Object.freeze(['atlas', 'volt', 'rook', 'myst', 'blaze', 'nova', 'cipher', 'onyx']);
export const ALLOWED_INPUTS = Object.freeze(['left', 'right', 'jump', 'down', 'punch', 'kick', 'special', 'grab', 'block', 'dashForward', 'dashBack']);
export const STAGE_IDS = Object.freeze(['neon', 'temple', 'rooftop']);
const fighterSet = new Set(FIGHTER_IDS);

export function cleanPlayerName(value) {
  return String(value ?? 'Player').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 18) || 'Player';
}

export function cleanFighterId(value) {
  return fighterSet.has(String(value)) ? String(value) : 'atlas';
}

export function cleanStageId(value) {
  return STAGE_IDS.includes(String(value)) ? String(value) : 'neon';
}

export function isValidRoomCode(value) {
  return typeof value === 'string' && /^[A-F0-9]{6}$/i.test(value.trim());
}

export function sanitizeInputPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  return Object.fromEntries(ALLOWED_INPUTS.map(key => [key, payload[key] === true]));
}
