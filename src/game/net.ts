/**
 * net.ts — WebRTC networking layer for online multiplayer.
 *
 * Uses PeerJS for signaling (free cloud, no server needed).
 * Host runs the game loop; guest sends inputs and receives state.
 */
import Peer, { DataConnection } from 'peerjs';

// ---- Types ----

export interface NetInput {
  left: number;
  right: number;
  jump: number;
  block: number;
  strike: number;
  special: number;
  superMove: number;
  pickupLine: number;
  kick: number;
}

export type NetMessage =
  | { type: 'pick'; fighterIndex: number }
  | { type: 'ready' }
  | { type: 'start'; p1Index: number; p2Index: number }
  | { type: 'input'; input: NetInput }
  | { type: 'state'; snapshot: NetSnapshot }
  | { type: 'ping'; t: number }
  | { type: 'pong'; t: number }
  | { type: 'gameover' };

/** Minimal snapshot the host sends every few frames so the guest can render. */
export interface NetSnapshot {
  p1: NetFighterState;
  p2: NetFighterState;
  powerUps: NetPowerUp[];
  particles: NetParticle[];
  floats: NetFloat[];
  projectiles: NetProjectile[];
  clock: number;
  paused: boolean;
}

export interface NetFighterState {
  x: number; y: number; vx: number; vy: number;
  hp: number; seats: number; meter: number;
  blocking: boolean; stun: number; invincible: number;
  facing: number; atk: number;
  thought: string; name: string; id: string;
}

export interface NetPowerUp {
  x: number; y: number; type: string; id: number;
}

export interface NetParticle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; color: string; size: number;
}

export interface NetFloat {
  x: number; y: number; text: string; color: string;
  life: number;
}

export interface NetProjectile {
  x: number; y: number; vx: number; vy: number;
  ownerId: string; kind: string;
}

// ---- Room codes ----

const ROOM_PREFIX = 'bo272-';
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars (0/O, 1/I)
const CODE_LEN = 5;

function generateCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LEN; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

export function displayCode(peerId: string): string {
  return peerId.replace(ROOM_PREFIX, '');
}

// ---- Connection manager ----

export type NetRole = 'host' | 'guest' | null;
export type NetStatus = 'idle' | 'creating' | 'joining' | 'waiting' | 'connected' | 'error' | 'disconnected';

export interface NetCallbacks {
  onStatusChange: (status: NetStatus, error?: string) => void;
  onMessage: (msg: NetMessage) => void;
  onDisconnect: () => void;
}

let peer: Peer | null = null;
let conn: DataConnection | null = null;
let role: NetRole = null;
let roomCode = '';
let callbacks: NetCallbacks | null = null;

export function getRole(): NetRole { return role; }
export function getRoomCode(): string { return roomCode; }
export function isConnected(): boolean { return conn?.open === true; }

/** Update the message callback (e.g. when transitioning from lobby to match). */
export function setMessageHandler(handler: (msg: NetMessage) => void): void {
  if (callbacks) callbacks.onMessage = handler;
}

function setStatus(status: NetStatus, error?: string) {
  callbacks?.onStatusChange(status, error);
}

function attachConn(c: DataConnection) {
  conn = c;
  c.on('open', () => setStatus('connected'));
  c.on('data', (data) => {
    if (data && typeof data === 'object' && 'type' in (data as object)) {
      callbacks?.onMessage(data as NetMessage);
    }
  });
  c.on('close', () => {
    setStatus('disconnected');
    callbacks?.onDisconnect();
  });
  c.on('error', (err) => {
    setStatus('error', err.message || 'Connection error');
  });
}

/** Host: create a room and wait for a guest to connect. */
export function createRoom(cb: NetCallbacks): string {
  cleanup();
  callbacks = cb;
  role = 'host';
  roomCode = generateCode();
  const peerId = ROOM_PREFIX + roomCode;
  setStatus('creating');

  peer = new Peer(peerId, { debug: 0 });
  peer.on('open', () => setStatus('waiting'));
  peer.on('connection', (c) => attachConn(c));
  peer.on('error', (err) => {
    // If the ID is taken, try another
    if (err.type === 'unavailable-id') {
      peer?.destroy();
      roomCode = generateCode();
      const newId = ROOM_PREFIX + roomCode;
      peer = new Peer(newId, { debug: 0 });
      peer.on('open', () => setStatus('waiting'));
      peer.on('connection', (c) => attachConn(c));
      peer.on('error', (e2) => setStatus('error', e2.message || 'Failed to create room'));
    } else {
      setStatus('error', err.message || 'Failed to create room');
    }
  });

  return roomCode;
}

/** Guest: join a room by code. */
export function joinRoom(code: string, cb: NetCallbacks): void {
  cleanup();
  callbacks = cb;
  role = 'guest';
  roomCode = code.toUpperCase().trim();
  const peerId = ROOM_PREFIX + roomCode;
  setStatus('joining');

  peer = new Peer({ debug: 0 });
  peer.on('open', () => {
    const c = peer!.connect(peerId, { serialization: 'json', reliable: true });
    attachConn(c);
  });
  peer.on('error', (err) => {
    if (err.type === 'peer-unavailable') {
      setStatus('error', 'Room not found. Check the code and try again.');
    } else {
      setStatus('error', err.message || 'Failed to join room');
    }
  });
}

/** Send a message to the connected peer. */
export function send(msg: NetMessage): void {
  if (conn?.open) conn.send(msg);
}

/** Clean up everything. */
export function cleanup(): void {
  conn?.close();
  peer?.destroy();
  conn = null;
  peer = null;
  role = null;
  roomCode = '';
  callbacks = null;
}
