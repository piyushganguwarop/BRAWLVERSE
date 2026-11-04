import { io } from 'socket.io-client';

const TOKEN_KEY = 'fighter-room-reconnect-token';
class OnlineRoom {
  constructor() {
    this.socket = null;
    this.session = null;
    this.slot = null;
    this.code = null;
    this.token = null;
    this.stageId = 'neon';
  }

  connect(url = import.meta.env.VITE_GAME_SERVER || window.location.origin) {
    if (this.socket?.connected) return Promise.resolve();
    if (!this.socket) {
      this.socket = io(url, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 8,
        reconnectionDelay: 500,
        reconnectionDelayMax: 4000,
        timeout: 10000
      });

      this.socket.on('connect', () => {
        const saved = this.token || sessionStorage.getItem(TOKEN_KEY);
        if (saved) this.socket.emit('room:reconnect', saved);
      });

      const accept = data => {
        this.slot = data.slot;
        this.code = data.code;
        this.token = data.token;
        if (data.stageId) this.stageId = data.stageId;
        if (this.token) sessionStorage.setItem(TOKEN_KEY, this.token);
      };

      this.socket.on('room:joined', accept);
      this.socket.on('room:rejoined', accept);
      this.socket.on('room:slot', data => {
        if (Number.isInteger(data?.slot)) this.slot = data.slot;
      });
      this.socket.on('room:stage', data => {
        if (data?.stageId) this.stageId = data.stageId;
      });
      this.socket.on('room:reconnect-failed', () => {
        this.token = null;
        this.slot = null;
        this.code = null;
        sessionStorage.removeItem(TOKEN_KEY);
      });
    }

    return new Promise((resolve, reject) => {
      this.socket.once('connect', resolve);
      this.socket.once('connect_error', reject);
    });
  }

  on(event, fn) {
    this.socket?.on(event, fn);
    return () => this.socket?.off(event, fn);
  }

  sendInput(input, sequence) {
    if (this.socket?.connected) this.socket.emit('match:input', { input, sequence });
  }

  onRemoteInput(fn) { return this.on('match:remote-input', fn); }
  onStageUpdate(fn) { return this.on('room:stage', fn); }
  onHit(fn) { return this.on('match:hit', fn); }
  sendReadyState(value) { this.ready(value); }

  get isConnected() { return !!this.socket?.connected; }
  get isInRoom() { return this.slot === 0 || this.slot === 1; }

  create(player) { this.socket.emit('room:create', player); }
  join(code, player) { this.socket.emit('room:join', { ...player, code }); }
  ready(value) { this.socket?.emit('room:ready', value); }
  select(selection) { this.socket?.emit('room:select', selection); }
  voteRematch() { this.socket?.emit('match:rematch'); }

  leave() {
    if (this.socket?.connected && this.isInRoom) this.socket.emit('room:leave');
    this.session = null;
    this.slot = null;
    this.code = null;
    this.token = null;
    sessionStorage.removeItem(TOKEN_KEY);
  }
}

export const onlineRoom = new OnlineRoom();
