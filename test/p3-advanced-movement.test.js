import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const input=fs.readFileSync(new URL('../src/input/InputController.js',import.meta.url),'utf8');
const fighter=fs.readFileSync(new URL('../src/characters/Fighter.js',import.meta.url),'utf8');
const three=fs.readFileSync(new URL('../src/three/ThreeStage.js',import.meta.url),'utf8');
test('player one and player two have separate dash bindings',()=>{
 assert.match(input,/dashForward: 'E'/); assert.match(input,/dashBack: 'Q'/);
 assert.match(input,/p2DashForward: 'NUMPAD_SIX'/); assert.match(input,/p2DashBack: 'NUMPAD_FOUR'/);
 assert.match(input,/dashForward:k\.dashForward\.isDown/); assert.match(input,/dashForward:k\.p2DashForward\.isDown/);
});
test('fighter dash has burst velocity, cooldown and short evade window',()=>{
 assert.match(fighter,/this\.dashCooldown = 0/); assert.match(fighter,/this\.dashTime = 0\.16/);
 assert.match(fighter,/this\.dashCooldown = 0\.62/); assert.match(fighter,/this\.invulnerable = Math\.max/);
 assert.match(fighter,/this\.vx = this\.dashDirection \* 10\.5/);
});
test('air and crouch attacks apply distinct move tuning',()=>{
 assert.match(fighter,/variant === 'air'/); assert.match(fighter,/variant === 'crouch'/);
 assert.match(fighter,/damage: spec\.damage \* 0\.88/); assert.match(fighter,/damage: spec\.damage \* 1\.08/);
});
test('procedural fighter has a dash pose',()=>assert.match(three,/state === 'dash'/));
