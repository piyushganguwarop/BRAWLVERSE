import test from 'node:test';
import assert from 'node:assert/strict';
import { ArcadeProgression } from '../src/modes/ArcadeProgression.js';

test('arcade builds opponents without selecting the player', () => {
 const run=new ArcadeProgression({playerId:'atlas'});
 assert.equal(run.current().index,0); assert.notEqual(run.current().fighterId,'atlas'); assert.equal(run.current().total,7);
});
test('arcade advances after wins and completes after final boss', () => {
 const run=new ArcadeProgression({opponents:['volt','rook']});
 assert.equal(run.recordMatch(true).status,'between-fights'); assert.equal(run.nextFight(),true);
 assert.equal(run.current().boss,true); assert.equal(run.recordMatch(true).status,'complete');
 assert.equal(run.nextFight(),false); assert.equal(run.wins,2);
});
test('arcade ends immediately after a loss', () => {
 const run=new ArcadeProgression({opponents:['volt','rook']});
 assert.equal(run.recordMatch(false).status,'defeat'); assert.equal(run.current(),null); assert.equal(run.nextFight(),false);
});
test('difficulty increases across arcade ladder and stages rotate', () => {
 const run=new ArcadeProgression({opponents:['a','b','c','d','e','f']});
 assert.equal(run.current().difficulty,'easy');
 for(let i=0;i<2;i++){run.recordMatch(true);run.nextFight();}
 assert.equal(run.current().difficulty,'normal');
 for(let i=0;i<2;i++){run.recordMatch(true);run.nextFight();}
 assert.equal(run.current().difficulty,'hard');
 assert.ok(['neon','temple','rooftop'].includes(run.current().stageId));
});
test('arcade progress serializes and restores', () => {
 const run=new ArcadeProgression({opponents:['volt','rook','myst']});run.recordMatch(true);run.nextFight();
 const restored=ArcadeProgression.restore(run.serialize());
 assert.equal(restored.index,1);assert.equal(restored.wins,1);assert.equal(restored.current().fighterId,'rook');
});
test('selection and result flow passes arcade state between fights', async () => {
 const fs=await import('node:fs');
 const select=fs.readFileSync(new URL('../src/scenes/SelectScene.js',import.meta.url),'utf8');
 const fight=fs.readFileSync(new URL('../src/scenes/FightScene.js',import.meta.url),'utf8');
 assert.match(select,/new ArcadeProgression/);assert.match(select,/arcadeRun: arcadeRun/);
 assert.match(fight,/showArcadeResultAction/);assert.match(fight,/NEXT OPPONENT/);
});
