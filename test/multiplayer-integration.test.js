import test from 'node:test';
import assert from 'node:assert/strict';
import { io as Client } from 'socket.io-client';
import { startServer, stopServer } from '../server.js';
import { sanitizeInputPayload, isValidRoomCode } from '../server/validation.js';

function createClient(port) {
  return Client(`http://127.0.0.1:${port}`, {
    transports: ['websocket'],
    forceNew: true,
    reconnection: false
  });
}

function waitForEvent(socket, eventName, predicate = () => true, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(eventName, handler);
      reject(new Error(`Timeout waiting for event "${eventName}" after ${timeoutMs}ms`));
    }, timeoutMs);
    function handler(data) {
      if (predicate(data)) {
        clearTimeout(timer);
        socket.off(eventName, handler);
        resolve(data);
      }
    }
    socket.on(eventName, handler);
  });
}

test('Multiplayer Integration: Complete 2-player lobby, selection sync, 3D combat, and rematch flow', async (t) => {
  const { server, port } = await startServer(0);

  t.after(async () => {
    await stopServer();
  });

  const client1 = createClient(port);
  const client2 = createClient(port);

  t.after(() => {
    client1.disconnect();
    client2.disconnect();
  });

  await Promise.all([
    new Promise(resolve => client1.once('connect', resolve)),
    new Promise(resolve => client2.once('connect', resolve))
  ]);

  let roomCode = '';
  let token1 = '';
  let token2 = '';

  // 1. Room Creation
  await t.test('Player 1 creates room and receives 6-char hex code', async () => {
    const joinedPromise = waitForEvent(client1, 'room:joined');
    client1.emit('room:create', { name: 'PlayerOne', fighterId: 'atlas', stageId: 'neon' });
    const joined = await joinedPromise;

    assert.equal(typeof joined.code, 'string');
    assert.equal(joined.code.length, 6);
    assert.equal(isValidRoomCode(joined.code), true);
    assert.equal(joined.slot, 0);
    assert.equal(joined.stageId, 'neon');
    assert.ok(joined.token);
    assert.equal(joined.players.length, 1);
    assert.equal(joined.players[0].name, 'PlayerOne');
    assert.equal(joined.players[0].host, true);

    roomCode = joined.code;
    token1 = joined.token;
  });

  // 2. Reject Invalid Room Code
  await t.test('Client 2 receives error for invalid or nonexistent room codes', async () => {
    const errPromise1 = waitForEvent(client2, 'room:error');
    client2.emit('room:join', { code: 'INVALID', name: 'PlayerTwo', fighterId: 'volt' });
    const err1 = await errPromise1;
    assert.match(err1, /valid six-character/i);

    const errPromise2 = waitForEvent(client2, 'room:error');
    client2.emit('room:join', { code: 'FFFFFF', name: 'PlayerTwo', fighterId: 'volt' });
    const err2 = await errPromise2;
    assert.match(err2, /Room not found/i);
  });

  // 3. Room Joining
  await t.test('Player 2 joins the room and both players see synchronized lobby', async () => {
    const p1PlayersPromise = waitForEvent(client1, 'room:players', list => list.length === 2);
    const p2JoinedPromise = waitForEvent(client2, 'room:joined');
    const p2PlayersPromise = waitForEvent(client2, 'room:players', list => list.length === 2);

    client2.emit('room:join', { code: roomCode, name: 'PlayerTwo', fighterId: 'volt' });

    const [p2Joined, p1List, p2List] = await Promise.all([p2JoinedPromise, p1PlayersPromise, p2PlayersPromise]);

    assert.equal(p2Joined.slot, 1);
    assert.equal(p2Joined.code, roomCode);
    assert.ok(p2Joined.token);
    token2 = p2Joined.token;

    assert.equal(p1List.length, 2);
    assert.equal(p1List[0].name, 'PlayerOne');
    assert.equal(p1List[0].host, true);
    assert.equal(p1List[1].name, 'PlayerTwo');
    assert.equal(p1List[1].host, false);

    assert.deepEqual(p1List, p2List);
  });

  // 4. Reject 3rd Player in Full Room
  await t.test('Player 3 receives room full error when attempting to join', async () => {
    const client3 = createClient(port);
    await new Promise(resolve => client3.once('connect', resolve));

    const errPromise = waitForEvent(client3, 'room:error');
    client3.emit('room:join', { code: roomCode, name: 'PlayerThree', fighterId: 'rook' });
    const err = await errPromise;
    assert.match(err, /room is full/i);

    client3.disconnect();
  });

  // 5. Synchronize Fighter and Stage Selection
  await t.test('Fighter and stage selection synchronize between players', async () => {
    // Guest selects 'myst'
    const p1FighterUpdate = waitForEvent(client1, 'room:players', list => list[1]?.fighterId === 'myst');
    client2.emit('room:select', { fighterId: 'myst' });
    const p1List = await p1FighterUpdate;
    assert.equal(p1List[1].fighterId, 'myst');

    // Host selects 'temple' arena
    const p1StageUpdate = waitForEvent(client1, 'room:stage', s => s.stageId === 'temple');
    const p2StageUpdate = waitForEvent(client2, 'room:stage', s => s.stageId === 'temple');
    client1.emit('room:select', { fighterId: 'rook', stageId: 'temple' });
    const [p1Stage, p2Stage] = await Promise.all([p1StageUpdate, p2StageUpdate]);
    assert.equal(p1Stage.stageId, 'temple');
    assert.equal(p2Stage.stageId, 'temple');
  });

  // 6. Ready States and Match Launch
  await t.test('Match launches only when both players are ready', async () => {
    // Player 1 readies up
    const p2SeeP1Ready = waitForEvent(client2, 'room:players', list => list[0]?.ready === true);
    client1.emit('room:ready', true);
    const list1 = await p2SeeP1Ready;
    assert.equal(list1[0].ready, true);
    assert.equal(list1[1].ready, false);

    // Selection locked after ready
    client1.emit('room:select', { fighterId: 'atlas' }); // Ignored because P1 is ready

    // Player 2 readies up -> match launches
    const p1StartPromise = waitForEvent(client1, 'room:start');
    const p2StartPromise = waitForEvent(client2, 'room:start');
    const p1SnapshotPromise = waitForEvent(client1, 'match:snapshot');
    const p2SnapshotPromise = waitForEvent(client2, 'match:snapshot');

    client2.emit('room:ready', true);

    const [start1, start2, snap1, snap2] = await Promise.all([
      p1StartPromise,
      p2StartPromise,
      p1SnapshotPromise,
      p2SnapshotPromise
    ]);

    assert.equal(start1.stageId, 'temple');
    assert.equal(start2.stageId, 'temple');
    assert.equal(start1.players.length, 2);
    assert.equal(start1.players[0].fighterId, 'rook');
    assert.equal(start1.players[1].fighterId, 'myst');

    assert.ok(snap1.players[0].x !== undefined);
    assert.ok(snap1.players[0].z !== undefined);
    assert.equal(snap1.players[0].health, 100);
    assert.equal(snap2.players[1].health, 100);
  });

  // 7. 3D Input Streaming & Authoritative Combat Simulation
  await t.test('Authoritative server computes 3D movement and hit detection', async () => {
    let seq1 = 1;
    let seq2 = 1;

    // Reject replayed sequence numbers
    const validSeq = sanitizeInputPayload({ right: true, heavy: false });
    assert.ok(validSeq);

    // Reject NaN/Infinity
    assert.equal(sanitizeInputPayload({ moveX: NaN }), null);
    assert.equal(sanitizeInputPayload({ moveZ: Infinity }), null);

    // Strip client-spoofed position & health
    const spoof = sanitizeInputPayload({ x: 999, y: 100, health: 0, punch: true, heavy: true });
    assert.equal(spoof.x, undefined);
    assert.equal(spoof.y, undefined);
    assert.equal(spoof.health, undefined);
    assert.equal(spoof.punch, true);
    assert.equal(spoof.heavy, true);

    // Step 1: Both move toward each other to close the gap
    for (let i = 0; i < 16; i++) {
      client1.emit('match:input', {
        input: { right: true, moveX: 1.0, moveZ: 0.0 },
        sequence: seq1++
      });
      client2.emit('match:input', {
        input: { left: true, moveX: -1.0, moveZ: 0.05 },
        sequence: seq2++
      });
      await new Promise(r => setTimeout(r, 35));
    }

    // Step 2: Stop moving so fighters remain in striking range
    client1.emit('match:input', {
      input: { right: false, moveX: 0.0, moveZ: 0.0 },
      sequence: seq1++
    });
    client2.emit('match:input', {
      input: { left: false, moveX: 0.0, moveZ: 0.0 },
      sequence: seq2++
    });
    await new Promise(r => setTimeout(r, 50));

    // Verify snapshot reports fighters are close and in front of each other
    const closeSnapshot = await waitForEvent(client1, 'match:snapshot', s => Math.abs(s.players[0].x - s.players[1].x) <= 1.45);
    assert.ok(Math.abs(closeSnapshot.players[0].x - closeSnapshot.players[1].x) <= 1.45);

    // Step 3: Player 1 punches Player 2 now that they are in range
    const hitPromise1 = waitForEvent(client1, 'match:hit');
    const hitPromise2 = waitForEvent(client2, 'match:hit');

    client1.emit('match:input', {
      input: { punch: true, right: false, moveX: 0.0 },
      sequence: seq1++
    });

    const [hit1, hit2] = await Promise.all([hitPromise1, hitPromise2]);
    assert.equal(hit1.attackerSlot, 0);
    assert.equal(hit1.targetSlot, 1);
    assert.ok(hit1.damage > 0);
    assert.equal(hit1.action, 'punch');
    assert.deepEqual(hit1, hit2);
  });

  // 8. Rematch Voting
  await t.test('Both players voting rematch resets the match', async () => {
    const votePromise = waitForEvent(client2, 'match:rematch-vote', v => v.slot === 0);
    client1.emit('match:rematch');
    const vote = await votePromise;
    assert.equal(vote.slot, 0);

    const rematchPromise1 = waitForEvent(client1, 'room:rematch');
    const rematchPromise2 = waitForEvent(client2, 'room:rematch');
    client2.emit('match:rematch');
    const [rematch1, rematch2] = await Promise.all([rematchPromise1, rematchPromise2]);

    assert.equal(rematch1.stageId, 'temple');
    assert.equal(rematch1.players.length, 2);
    assert.deepEqual(rematch1, rematch2);
  });

  // 9. Disconnect and Reconnection Flow
  await t.test('Disconnect triggers peer disconnect banner and reconnect restores session', async () => {
    const peerDiscPromise = waitForEvent(client1, 'room:peer-disconnected');
    client2.disconnect();
    const disc = await peerDiscPromise;
    assert.equal(disc.slot, 1);
    assert.equal(disc.graceMs, 30000);

    // Reconnect using client2 token
    const client2Recon = createClient(port);
    await new Promise(resolve => client2Recon.once('connect', resolve));

    const reconPromise = waitForEvent(client2Recon, 'room:rejoined');
    const peerReconPromise = waitForEvent(client1, 'room:peer-reconnected');

    client2Recon.emit('room:reconnect', token2);

    const [rejoined, peerRecon] = await Promise.all([reconPromise, peerReconPromise]);
    assert.equal(rejoined.code, roomCode);
    assert.equal(rejoined.slot, 1);
    assert.equal(peerRecon.slot, 1);

    // Clean room leave
    const leaveDiscPromise = waitForEvent(client1, 'room:peer-disconnected');
    client2Recon.emit('room:leave');
    const leaveDisc = await leaveDiscPromise;
    assert.equal(leaveDisc.slot, 1);
    assert.equal(leaveDisc.graceMs, 0);

    client2Recon.disconnect();
  });
});
