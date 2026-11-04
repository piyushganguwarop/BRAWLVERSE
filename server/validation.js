export const FIGHTER_IDS = Object.freeze(['atlas', 'volt', 'rook', 'myst', 'blaze', 'nova', 'cipher', 'onyx']);
export const ALLOWED_INPUTS = Object.freeze(['left', 'right', 'jump', 'down', 'punch', 'kick', 'special', 'grab', 'block', 'dashForward', 'dashBack']);
export const EXTENDED_ALLOWED_BUTTONS = Object.freeze([
  'left', 'right', 'jump', 'down', 'crouch', 'depthUp', 'depthDown',
  'punch', 'kick', 'heavy', 'special', 'grab', 'block',
  'dashForward', 'dashBack', 'dash'
]);
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

  // Strict rejection of NaN or infinite numeric values
  if (payload.moveX !== undefined && (!Number.isFinite(payload.moveX) || Number.isNaN(payload.moveX))) return null;
  if (payload.moveZ !== undefined && (!Number.isFinite(payload.moveZ) || Number.isNaN(payload.moveZ))) return null;

  const hasExtended = ('heavy' in payload) || ('crouch' in payload) || ('depthUp' in payload) ||
    ('depthDown' in payload) || ('dash' in payload) || ('moveX' in payload) || ('moveZ' in payload);

  if (!hasExtended) {
    return Object.fromEntries(ALLOWED_INPUTS.map(key => [key, payload[key] === true]));
  }

  let moveX = typeof payload.moveX === 'number' && Number.isFinite(payload.moveX) ? Math.max(-1, Math.min(1, payload.moveX)) : 0;
  let moveZ = typeof payload.moveZ === 'number' && Number.isFinite(payload.moveZ) ? Math.max(-1, Math.min(1, payload.moveZ)) : 0;
  const moveLen = Math.hypot(moveX, moveZ);
  if (moveLen > 1.0) {
    moveX /= moveLen;
    moveZ /= moveLen;
  }

  const buttons = Object.fromEntries(EXTENDED_ALLOWED_BUTTONS.map(key => [key, payload[key] === true]));
  return {
    ...buttons,
    moveX,
    moveZ
  };
}
