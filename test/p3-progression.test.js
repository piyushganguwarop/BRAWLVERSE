import test from 'node:test';
import assert from 'node:assert/strict';
import { awardMatch, getPlayerLevel, isFighterUnlocked, isStageUnlocked, loadProgression, purchaseFighter, purchaseStage, progressionSnapshot } from '../src/progression/Progression.js';
const withStorage = async fn => {
 const previous=globalThis.localStorage; const data=new Map();
 globalThis.localStorage={getItem:key=>data.has(key)?data.get(key):null,setItem:(key,value)=>data.set(key,String(value))};
 try { await fn(); } finally { if(previous===undefined)delete globalThis.localStorage;else globalThis.localStorage=previous; }
};
test('fresh progression starts at level one with starter fighters and arena',async()=>withStorage(()=>{
 const p=loadProgression(); assert.equal(getPlayerLevel(p.xp),1);
 assert.deepEqual(p.unlockedFighters,['atlas','volt','rook']); assert.deepEqual(p.unlockedStages,['neon']);
}));
test('match rewards add XP, coins and win or loss records',async()=>withStorage(()=>{
 const win=awardMatch({won:true,mode:'arcade'}); assert.equal(win.xp,100);assert.equal(win.coins,60);
 const loss=awardMatch({won:false,mode:'local'});assert.equal(loss.xp,25);assert.equal(loss.coins,10);
 assert.equal(loss.state.wins,1);assert.equal(loss.state.losses,1);
}));
test('arcade completion grants a clear bonus',async()=>withStorage(()=>{
 const result=awardMatch({won:true,mode:'arcade',arcadeComplete:true});
 assert.equal(result.xp,350);assert.equal(result.coins,210);
}));
test('fighter purchase checks level and wallet then unlocks permanently',async()=>withStorage(()=>{
 assert.equal(isFighterUnlocked('myst'),false);
 assert.equal(purchaseFighter('myst').ok,false);
 // A deterministic progression seed simulates earned currency at the required level.
 globalThis.localStorage.setItem('fighter.progression.v1',JSON.stringify({...loadProgression(),xp:0,coins:500}));
 assert.equal(purchaseFighter('myst').reason,'Reach level 2');
 globalThis.localStorage.setItem('fighter.progression.v1',JSON.stringify({...loadProgression(),xp:300,coins:500}));
 const result=purchaseFighter('myst');assert.equal(result.ok,true);assert.equal(isFighterUnlocked('myst'),true);
}));
test('arena purchase is gated by level and coins',async()=>withStorage(()=>{
 assert.equal(purchaseStage('temple').ok,false);
 globalThis.localStorage.setItem('fighter.progression.v1',JSON.stringify({...loadProgression(),xp:900,coins:500}));
 assert.equal(purchaseStage('temple').ok,true);assert.equal(isStageUnlocked('temple'),true);
}));
test('progression snapshot computes level and XP progress',async()=>withStorage(()=>{
 globalThis.localStorage.setItem('fighter.progression.v1',JSON.stringify({...loadProgression(),xp:150}));
 const p=progressionSnapshot();assert.equal(p.level,2);assert.ok(p.progress>0 && p.progress<1);
}));
