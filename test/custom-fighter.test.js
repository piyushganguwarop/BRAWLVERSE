import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanFighter, toFighter, defaults, saveCustomFighter, loadSlots, getActiveCustomSlot, setActiveCustomSlot } from '../src/characters/CustomFighter.js';

test('custom fighter appearance is sanitized and keeps allowed options', () => {
  const fighter = cleanFighter({ ...defaults, name: '  TEST CHAMPION  ', face: 'square', accessory: 'glasses', height: 120, color: 'bad' });
  assert.equal(fighter.name, 'TEST CHAMPION');
  assert.equal(fighter.face, 'square');
  assert.equal(fighter.accessory, 'glasses');
  assert.equal(fighter.height, 112);
  assert.equal(fighter.color, defaults.color);
});

test('custom fighter appearance maps into the 3D fighter configuration', () => {
  const fighter = toFighter({ ...defaults, name: 'Nova', height: 108, width: 110, legs: 104, face: 'round', beard: 'stubble' });
  assert.equal(fighter.name, 'NOVA');
  assert.equal(fighter.appearance.heightScale, 1.08);
  assert.equal(fighter.appearance.widthScale, 1.1);
  assert.equal(fighter.appearance.legScale, 1.04);
  assert.equal(fighter.appearance.face, 'round');
  assert.equal(fighter.appearance.beard, 'stubble');
});


test('custom fighter preserves eye, trouser and accessory choices', () => {
  const fighter = cleanFighter({ ...defaults, eyeColor: '#315f9b', bottomColor: '#6945a1', accessory: 'mask' });
  assert.equal(fighter.eyeColor, '#315f9b');
  assert.equal(fighter.bottomColor, '#6945a1');
  assert.equal(fighter.accessory, 'mask');
});

test('invalid color and accessory values fall back safely', () => {
  const fighter = cleanFighter({ ...defaults, eyeColor: 'blue', bottomColor: 'red', accessory: 'unknown' });
  assert.equal(fighter.eyeColor, defaults.eyeColor);
  assert.equal(fighter.bottomColor, defaults.bottomColor);
  assert.equal(fighter.accessory, defaults.accessory);
});


test('three character slots save and restore independently with an active slot', () => {
  const previous = globalThis.localStorage;
  const data = new Map();
  globalThis.localStorage = { getItem: key => data.has(key) ? data.get(key) : null, setItem: (key, value) => data.set(key, String(value)) };
  try {
    saveCustomFighter({ ...defaults, name: 'SLOT ONE' }, 0);
    saveCustomFighter({ ...defaults, name: 'SLOT THREE', accessory: 'mask' }, 2);
    setActiveCustomSlot(2);
    const slots = loadSlots();
    assert.equal(slots[0].name, 'SLOT ONE');
    assert.equal(slots[1], null);
    assert.equal(slots[2].name, 'SLOT THREE');
    assert.equal(getActiveCustomSlot(), 2);
  } finally {
    if (previous === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previous;
  }
});
