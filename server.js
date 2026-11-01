import express from 'express';
import { createServer } from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';
import { Server } from 'socket.io';
import { cleanPlayerName, cleanFighterId, cleanStageId, isValidRoomCode, sanitizeInputPayload } from './server/validation.js';
import { AuthoritativeMatch } from './server/AuthoritativeMatch.js';

const app = express();
app.disable('x-powered-by');
app.get('/health', (_req, res) => res.status(200).json({ ok: true, service: 'brawl-wars-room-server', rooms: rooms.size }));
const http = createServer(app);
const production = process.env.NODE_ENV === 'production';
const configuredOrigins = (process.env.ALLOWED_ORIGIN || '')
  .split(',').map(value => value.trim()).filter(Boolean);
const developmentOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
const allowedOrigins = configuredOrigins.length ? configuredOrigins : (production ? [] : developmentOrigins);
const io = new Server(http, {
  cors: {
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Origin is not allowed'));
    },
    methods: ['GET', 'POST']
  },
  maxHttpBufferSize: 16 * 1024,
  pingInterval: 25000,
  pingTimeout: 20000,
  connectTimeout: 10000
});

const rooms = new Map();
const MAX_ROOMS = 500;
const ROOM_IDLE_MS = 10 * 60 * 1000;
const RECONNECT_GRACE_MS = 30000;
const code = () => randomBytes(3).toString('hex').toUpperCase();
const publicPlayers = room => room.players.map(({ token, expiry, id, ...player }, slot) => ({ ...player, slot, host: slot === 0 }));
const sendPlayers = room => io.to(room.id).emit('room:players', publicPlayers(room));

function touchRoom(room) {
  room.lastActivity = Date.now();
  if (room.expiry) clearTimeout(room.expiry);
  room.expiry = null;
  if (!room.started || room.players.length < 2 || room.players.some(player => !player.connected)) {
    room.expiry = setTimeout(() => {
      const current = rooms.get(room.id);
      if (!current) return;
      const idle = Date.now() - current.lastActivity >= ROOM_IDLE_MS;
      if (idle && (current.players.length < 2 || current.players.some(player => !player.connected))) {
        rooms.delete(current.id);
        for (const player of current.players) {
          if (player.id) io.sockets.sockets.get(player.id)?.leave(current.id);
        }
      } else touchRoom(current);
    }, ROOM_IDLE_MS);
    room.expiry.unref?.();
  }
}

function allowEvent(socket, event, limit, windowMs) {
  const now = Date.now();
  socket.data.eventTimes ||= new Map();
  const timestamps = (socket.data.eventTimes.get(event) || []).filter(time => now - time < windowMs);
  if (timestamps.length >= limit) {
    socket.emit('room:error', 'You are sending actions too quickly. Please slow down.');
    return false;
  }
  timestamps.push(now);
  socket.data.eventTimes.set(event, timestamps);
  return true;
}

function getOwnedPlayer(socket) {
  const room = rooms.get(socket.data.room);
  const player = room?.players[socket.data.slot];
  if (!room || !player || player.id !== socket.id || !player.connected) return null;
  return { room, player };
}

function attachPlayer(socket, room, player, slot, eventName) {
  if (player.expiry) clearTimeout(player.expiry);
  player.expiry = null;
  player.id = socket.id;
  player.connected = true;
  socket.join(room.id);
  socket.data.room = room.id;
  socket.data.slot = slot;
  socket.data.token = player.token;
  room.match?.setConnected(slot, true);
  touchRoom(room);
  socket.emit(eventName, { code: room.id, slot, token: player.token, players: publicPlayers(room) });
  sendPlayers(room);
}

function removePlayer(room, player, message = 'A player left the room.') {
  room.match?.stop(); room.match = null;
  if (player.expiry) clearTimeout(player.expiry);
  room.players = room.players.filter(item => item !== player);
  if (!room.players.length) {
    if (room.expiry) clearTimeout(room.expiry);
    rooms.delete(room.id);
    return;
  }
  room.hostToken = room.players[0].token;
  room.started = false;
  room.rematchVotes = new Set();
  room.players.forEach((current, slot) => {
    current.ready = false;
    const socket = current.connected && current.id ? io.sockets.sockets.get(current.id) : null;
    if (socket) { socket.data.slot = slot; socket.data.room = room.id; socket.emit('room:slot', { slot, host: slot === 0 }); }
  });
  sendPlayers(room);
  io.to(room.id).emit('room:error', message);
  touchRoom(room);
}

io.on('connection', socket => {
  socket.on('room:create', (payload = {}) => {
    if (!allowEvent(socket, 'room:create', 4, 60000)) return;
    if (rooms.size >= MAX_ROOMS) return socket.emit('room:error', 'The room service is busy. Try again shortly.');
    let id;
    do { id = code(); } while (rooms.has(id));
    if (socket.data.room) return socket.emit('room:error', 'Leave your current room before creating another.');
    const player = {
      id: socket.id, token: randomUUID(), name: cleanPlayerName(payload?.name),
      fighterId: cleanFighterId(payload?.fighterId), ready: false, connected: true, expiry: null
    };
    const room = { id, hostToken: player.token, stageId: cleanStageId(payload?.stageId), players: [player], expiry: null, lastActivity: Date.now(), started: false, rematchVotes: new Set() };
    rooms.set(id, room);
    attachPlayer(socket, room, player, 0, 'room:joined');
  });

  socket.on('room:join', (payload = {}) => {
    if (!allowEvent(socket, 'room:join', 8, 60000)) return;
    if (socket.data.room) return socket.emit('room:error', 'Leave your current room before joining another.');
    const id = String(payload?.code || '').trim().toUpperCase();
    if (!isValidRoomCode(id)) return socket.emit('room:error', 'Enter a valid six-character room code.');
    const room = rooms.get(id);
    if (!room) return socket.emit('room:error', 'Room not found. Check the code.');
    if (room.players.length >= 2) return socket.emit('room:error', 'This room is full.');
    const player = {
      id: socket.id, token: randomUUID(), name: cleanPlayerName(payload?.name),
      fighterId: cleanFighterId(payload?.fighterId), ready: false, connected: true, expiry: null
    };
    room.players.push(player);
    attachPlayer(socket, room, player, 1, 'room:joined');
  });

  socket.on('room:reconnect', token => {
    if (!allowEvent(socket, 'room:reconnect', 5, 60000)) return;
    if (socket.data.room) return socket.emit('room:error', 'Leave your current room before reconnecting.');
    const key = typeof token === 'string' ? token.slice(0, 64) : '';
    if (!key) return socket.emit('room:reconnect-failed', 'Reconnect token is invalid.');
    for (const room of rooms.values()) {
      const slot = room.players.findIndex(player => player.token === key);
      if (slot < 0) continue;
      const player = room.players[slot];
      if (player.connected) return socket.emit('room:error', 'This player is already connected.');
      attachPlayer(socket, room, player, slot, 'room:rejoined');
      socket.to(room.id).emit('room:peer-reconnected', { slot });
      return;
    }
    socket.emit('room:reconnect-failed', 'Your room has expired. Create or join another room.');
  });

  socket.on('room:ready', ready => {
    if (!allowEvent(socket, 'room:ready', 10, 10000)) return;
    const owned = getOwnedPlayer(socket);
    if (!owned || typeof ready !== 'boolean') return;
    owned.player.ready = ready;
    touchRoom(owned.room);
    sendPlayers(owned.room);
    if (!owned.room.started && owned.room.players.length === 2 && owned.room.players.every(player => player.ready && player.connected)) {
      owned.room.started = true;
      owned.room.match?.stop();
      owned.room.match = new AuthoritativeMatch({
        roomId: owned.room.id, players: owned.room.players, stageId: owned.room.stageId,
        emit: (event, payload) => io.to(owned.room.id).emit(event, payload),
        onSuspicious: details => console.warn(JSON.stringify({ type: 'suspicious-match-input', ...details, at: Date.now() }))
      });
      if (owned.room.expiry) clearTimeout(owned.room.expiry);
      owned.room.expiry = null;
      io.to(owned.room.id).emit('room:start', { players: publicPlayers(owned.room), stageId: owned.room.stageId });
      owned.room.match.start();
    }
  });

  socket.on('room:select', fighterId => {
    if (!allowEvent(socket, 'room:select', 12, 10000)) return;
    const owned = getOwnedPlayer(socket);
    if (!owned || owned.room.started || owned.player.ready) return;
    const selection = typeof fighterId === 'string' ? { fighterId } : fighterId;
    if (!selection || typeof selection.fighterId !== 'string' || cleanFighterId(selection.fighterId) !== selection.fighterId) return;
    owned.room.started = false;
    owned.room.rematchVotes.clear();
    owned.player.fighterId = selection.fighterId;
    owned.room.stageId = cleanStageId(selection.stageId ?? owned.room.stageId);
    owned.player.ready = false;
    touchRoom(owned.room);
    sendPlayers(owned.room);
  });

  socket.on('match:input', payload => {
    const owned = getOwnedPlayer(socket);
    if (!owned || !owned.room.started || !owned.room.match || owned.room.players.length !== 2 || !owned.room.players.every(player => player.ready && player.connected)) return;
    if (!allowEvent(socket, 'match:input', 40, 1000)) return;
    const input = sanitizeInputPayload(payload?.input);
    if (!input) { console.warn(JSON.stringify({ type: 'suspicious-match-input', roomId: owned.room.id, slot: socket.data.slot, reason: 'invalid-input-payload', at: Date.now() })); return; }
    owned.room.match.setInput(socket.data.slot, input, payload.sequence);
  });

  socket.on('match:rematch', () => {
    if (!allowEvent(socket, 'match:rematch', 3, 60000)) return;
    const owned = getOwnedPlayer(socket);
    if (!owned || !owned.room.started || !owned.room.match || owned.room.players.length !== 2 || !owned.room.players.every(player => player.connected)) return;
    owned.room.rematchVotes ||= new Set();
    owned.room.rematchVotes.add(owned.player.token);
    if (owned.room.players.every(player => owned.room.rematchVotes.has(player.token))) {
      owned.room.rematchVotes.clear();
      owned.room.match.rematch();
    }
  });

  socket.on('room:leave', () => {
    const owned = getOwnedPlayer(socket);
    if (!owned) return;
    socket.to(owned.room.id).emit('room:peer-disconnected', { slot: socket.data.slot, graceMs: 0 });
    owned.room.match?.setConnected(socket.data.slot, false);
    socket.leave(owned.room.id);
    removePlayer(owned.room, owned.player);
    socket.data.room = null;
    socket.data.slot = null;
    socket.data.token = null;
  });

  socket.on('disconnect', () => {
    const owned = getOwnedPlayer(socket);
    if (!owned) return;
    const { room, player } = owned;
    player.connected = false;
    if (!room.match) { room.started = false; player.ready = false; }
    room.match?.setConnected(socket.data.slot, false);
    player.expiry = setTimeout(() => {
      const current = rooms.get(room.id);
      if (!current || player.connected) return;
      removePlayer(current, player, 'The other player did not reconnect.');
    }, RECONNECT_GRACE_MS);
    player.expiry.unref?.();
    socket.to(room.id).emit('room:peer-disconnected', { slot: socket.data.slot, graceMs: RECONNECT_GRACE_MS });
    sendPlayers(room);
    touchRoom(room);
  });
});

const port = Number(process.env.PORT || 3001);
http.listen(port, '0.0.0.0', () => {
  console.log(`Brawl Wars room server listening on ${port}`);
  if (production && !configuredOrigins.length) console.error('ALLOWED_ORIGIN is required in production. Browser origins will be rejected.');
});
