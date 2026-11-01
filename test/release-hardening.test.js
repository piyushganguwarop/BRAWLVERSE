import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { cleanPlayerName, cleanFighterId, isValidRoomCode, sanitizeInputPayload } from '../server/validation.js';
import { AuthoritativeMatch } from '../server/AuthoritativeMatch.js';

test('player names remove control characters and enforce length', () => {
  assert.equal(cleanPlayerName('  Player\nOne  '), 'PlayerOne');
  assert.equal(cleanPlayerName('x'.repeat(30)).length, 18);
  assert.equal(cleanPlayerName('   '), 'Player');
});

test('fighter IDs are allow-listed', () => {
  assert.equal(cleanFighterId('volt'), 'volt');
  assert.equal(cleanFighterId('admin-script'), 'atlas');
});

test('room codes require six hexadecimal characters', () => {
  assert.equal(isValidRoomCode('a1B2c3'), true);
  assert.equal(isValidRoomCode('AB12'), false);
  assert.equal(isValidRoomCode('AB12!@'), false);
  assert.equal(isValidRoomCode('../etc/'), false);
});

test('input payloads accept only known boolean-true controls', () => {
  assert.deepEqual(sanitizeInputPayload({ left: true, punch: 1, admin: true }), {
    left: true, right: false, jump: false, down: false, punch: false,
    kick: false, special: false, grab: false, block: false, dashForward: false, dashBack: false
  });
  assert.equal(sanitizeInputPayload(null), null);
  assert.equal(sanitizeInputPayload([]), null);
});

test('online sanitizer preserves only strict boolean movement, dash and combat inputs', () => {
  assert.deepEqual(sanitizeInputPayload({ dashForward: true, dashBack: true, jump: 'true', health: 0 }), {
    left:false,right:false,jump:false,down:false,punch:false,kick:false,special:false,grab:false,block:false,dashForward:true,dashBack:true
  });
});

test('authoritative match rejects replayed input and computes hit damage on server state', () => {
  const emitted=[];
  const match=new AuthoritativeMatch({ roomId:'ABC123', players:[{fighterId:'atlas'},{fighterId:'volt'}], stageId:'neon', emit:(event,payload)=>emitted.push({event,payload}) });
  match.fighters[0].x=-0.6; match.fighters[1].x=0.6;
  match.setInput(0,{left:false,right:false,jump:false,down:false,punch:true,kick:false,special:false,grab:false,block:false,dashForward:false,dashBack:false},1);
  for(let i=0;i<12;i++)match.tick(1/30);
  assert.ok(match.fighters[1].health < 100);
  assert.equal(match.setInput(0,{},1),false);
  assert.ok(emitted.some(item=>item.event==='match:snapshot'));
  match.stop();
});

test('Brawl Wars startup screen and recoverable error UI are present', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const main = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(html, /<title>Brawl Wars/);
  assert.match(html, /id="boot-screen"/);
  assert.match(html, /id="runtime-notice"/);
  assert.match(main, /unhandledrejection/);
  assert.match(main, /runtime-reload/);
});

test('room server requires configured production origins and exposes a health endpoint', async () => {
  const server = await readFile(new URL('../server.js', import.meta.url), 'utf8');
  assert.match(server, /production \? \[\] : developmentOrigins/);
  assert.match(server, /ALLOWED_ORIGIN is required in production/);
  assert.match(server, /app\.get\('\/health'/);
  assert.match(server, /maxHttpBufferSize: 16 \* 1024/);
});
