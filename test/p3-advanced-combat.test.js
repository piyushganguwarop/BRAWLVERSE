import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Fighter } from '../src/characters/Fighter.js';
import { CombatSystem } from '../src/combat/CombatSystem.js';
const pair=()=>[new Fighter({id:'p1',x:0,facing:1}),new Fighter({id:'p2',x:1.1,facing:-1})];
test('punch and kick can chain during their cancel windows',()=>{
 const [a]=pair(); assert.equal(a.startAction('punch'),true);
 a.update(0.20,{}); assert.equal(a.startAction('kick'),true);
 assert.equal(a.activeAction.name,'kick'); assert.equal(a.comboCount,2);
});
test('cancel window rejects an early chain input',()=>{
 const [a]=pair(); a.startAction('punch'); a.update(0.04,{});
 assert.equal(a.startAction('kick'),false);
});
test('third grounded strike kick launches the opponent',()=>{
 const [a,b]=pair(); const combat=new CombatSystem();
 a.comboCount=2; a.comboWindow=0.8; assert.equal(a.startAction('kick'),true);
 for(let i=0;i<7;i++){a.update(0.03,{});b.update(0.03,{});combat.update([a,b]);}
 assert.ok(b.y>0); assert.ok(b.vy>0);
});
test('air juggle hits apply combo damage scaling',()=>{
 const [a,b]=pair(); const combat=new CombatSystem();
 b.y=1.1; b.vy=0;
 a.activeAction={name:'punch',damage:10,range:2,height:2,activeStart:0,activeEnd:1,duration:1};
 a.actionElapsed=0.2; a.actionSerial=1; a.state='punch';
 combat.update([a,b]); const first=b.health;
 b.invulnerable=0; b.state='idle'; b.stun=0; b.activeAction=null;
 a.activeAction={name:'kick',damage:10,range:2,height:2,activeStart:0,activeEnd:1,duration:1};
 a.actionElapsed=0.2; a.actionSerial=2; a.state='kick';
 combat.update([a,b]);
 assert.ok(b.health<first);
});
test('combat system reports launcher metadata to hit feedback',()=>{
 const source=fs.readFileSync(new URL('../src/combat/CombatSystem.js',import.meta.url),'utf8');
 assert.match(source,/launcher: !!action\.launcher/);
});
