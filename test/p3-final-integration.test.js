import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=path=>fs.readFileSync(new URL(path,import.meta.url),'utf8');
test('match results award progression and show earned XP and coins',()=>{
 const fight=read('../src/scenes/FightScene.js');
 assert.match(fight,/awardMatch\(\{ won, mode: this\.mode/);
 assert.match(fight,/\+\$\{reward\.xp\} XP/);
 assert.match(fight,/\+\$\{reward\.coins\} COINS/);
});
test('selection prevents use of locked fighters and arenas',()=>{
 const select=read('../src/scenes/SelectScene.js');
 assert.match(select,/if \(!isFighterUnlocked\(roster\[index\]\.id\)\) return/);
 assert.match(select,/purchaseFighter\(fighter\.id\)/);
 assert.match(select,/purchaseStage\(stage\.id\)/);
 assert.match(select,/if \(!isFighterUnlocked\(selected\.id\) \|\| !isStageUnlocked/);
});
test('profile shows level, XP, wallet and unlock counts',()=>{
 const html=read('../index.html'), menu=read('../src/scenes/MainMenuScene.js');
 for(const id of ['profile-level','profile-wallet','profile-xp','profile-xp-bar','profile-unlocks']) assert.ok(html.includes(`id="${id}"`));
 assert.match(menu,/progressionSnapshot\(\)/);
});
test('release documentation describes final P3.8 package',()=>{
 const readme=read('../README.md');
 assert.match(readme,/P3\.7/); assert.match(readme,/P3\.8/);
});
