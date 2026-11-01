import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const input=fs.readFileSync(new URL('../src/input/InputController.js',import.meta.url),'utf8');
const fight=fs.readFileSync(new URL('../src/scenes/FightScene.js',import.meta.url),'utf8');
const select=fs.readFileSync(new URL('../src/scenes/SelectScene.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/style.css',import.meta.url),'utf8');
test('local mode creates two independent human input states',()=>{
  assert.match(input,/getState2\(\)/);
  assert.match(input,/NUMPAD_ONE/);
  assert.match(input,/leftArrow/);
  assert.match(fight,/this\.localVersus = this\.mode === 'local'/);
  assert.match(fight,/this\.cpu\.update\(dt, input2\)/);
  assert.match(fight,/handleSecondPlayerActions\(input2\)/);
});
test('local selection lets player two choose a distinct fighter',()=>{
  assert.match(select,/createPlayerTwoSelector\(\)/);
  assert.match(select,/changePlayerTwo\(direction\)/);
  assert.match(select,/this\.playerTwoIndex === this\.selectedIndex/);
  assert.match(select,/const opponent = this\.mode === 'local' \? roster\[this\.playerTwoIndex\]/);
});
test('mobile local-versus mode provides a separate player two touch pad',()=>{
  assert.match(fight,/createPlayerTwoTouchControls\(\)/);
  assert.match(fight,/data-control-p2/);
  assert.match(html,/<div id="touch-controls"/);
  assert.match(css,/#p2-touch-controls/);
});
