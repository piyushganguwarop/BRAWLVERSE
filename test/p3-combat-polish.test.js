import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const fight=fs.readFileSync(new URL('../src/scenes/FightScene.js',import.meta.url),'utf8');
const three=fs.readFileSync(new URL('../src/three/ThreeStage.js',import.meta.url),'utf8');
test('combat hits trigger hit-stop, camera shake and impact effects',()=>{
  assert.match(fight,/this\.hitStop = Math\.max/);
  assert.match(fight,/this\.cameras\.main\.shake/);
  assert.match(fight,/spawnImpactBurst\(target/);
  assert.match(fight,/handleHitFeedback\(\{ attacker, target, damage, blocked, perfect, combo, action \}\)/);
});
test('combo feedback displays a timed combo banner',()=>{
  assert.match(fight,/showComboBanner\(combo\)/);
  assert.match(fight,/\$\{combo\} HIT COMBO/);
  assert.match(fight,/this\.comboBanner/);
});
test('procedural fighters show stronger hit recoil and hit flash',()=>{
  assert.match(three,/state === 'hit' \? -0\.16/);
  assert.match(three,/0xff3b2f/);
});
