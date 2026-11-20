import React, { useState, useEffect, useRef } from 'react';
import { Wifi, WifiOff, Copy, Check, ArrowLeft, Loader2, Users, Gamepad2 } from 'lucide-react';
import type { Politician } from '../game/types';
import { POLITICIANS } from '../game/logic';
import { VS } from '../game/balance';
import {
  createRoom, joinRoom, send, cleanup, getRoomCode, getRole, isConnected,
  type NetStatus, type NetMessage, type NetCallbacks,
} from '../game/net';

interface OnlineLobbyProps {
  selectedPolitician: Politician;
  onStartMatch: (p1: Politician, p2: Politician, role: 'host' | 'guest') => void;
  onBack: () => void;
}

type LobbyPhase = 'menu' | 'hosting' | 'joining' | 'pick' | 'waiting' | 'vs';

export const OnlineLobby: React.FC<OnlineLobbyProps> = ({ selectedPolitician, onStartMatch, onBack }) => {
  const [phase, setPhase] = useState<LobbyPhase>('menu');
  const [status, setStatus] = useState<NetStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [myFighter, setMyFighter] = useState<Politician>(selectedPolitician);
  const [opponentFighter, setOpponentFighter] = useState<Politician | null>(null);
  const [myReady, setMyReady] = useState(false);
  const [opponentReady, setOpponentReady] = useState(false);
  const myFighterRef = useRef(myFighter);
  myFighterRef.current = myFighter;

  // Network callbacks
  useEffect(() => {
    return () => { cleanup(); };
  }, []);

  const netCallbacks: NetCallbacks = {
    onStatusChange: (s, err) => {
      setStatus(s);
      if (err) setError(err);
      if (s === 'connected') {
        setPhase('pick');
        setError(null);
        // Send our fighter pick immediately
        const idx = POLITICIANS.findIndex(p => p.id === myFighterRef.current.id);
        send({ type: 'pick', fighterIndex: idx });
      }
    },
    onMessage: (msg: NetMessage) => {
      switch (msg.type) {
        case 'pick': {
          const p = POLITICIANS[msg.fighterIndex];
          if (p) setOpponentFighter(p);
          break;
        }
        case 'ready':
          setOpponentReady(true);
          break;
        case 'start': {
          const p1 = POLITICIANS[msg.p1Index];
          const p2 = POLITICIANS[msg.p2Index];
          if (p1 && p2) {
            const r = getRole();
            if (r === 'guest') {
              onStartMatch(p1, p2, 'guest');
            }
          }
          break;
        }
        default:
          break;
      }
    },
    onDisconnect: () => {
      setError('Opponent disconnected');
      setPhase('menu');
      setOpponentFighter(null);
      setMyReady(false);
      setOpponentReady(false);
    },
  };

  // Start match when both ready
  useEffect(() => {
    if (myReady && opponentReady && opponentFighter && getRole() === 'host') {
      const p1Index = POLITICIANS.findIndex(p => p.id === myFighter.id);
      const p2Index = POLITICIANS.findIndex(p => p.id === opponentFighter.id);
      send({ type: 'start', p1Index, p2Index });
      onStartMatch(myFighter, opponentFighter, 'host');
    }
  }, [myReady, opponentReady, opponentFighter, myFighter, onStartMatch]);

  const handleHost = () => {
    setError(null);
    const code = createRoom(netCallbacks);
    setRoomCode(code);
    setPhase('hosting');
  };

  const handleJoin = () => {
    if (joinCode.trim().length < 3) {
      setError('Enter a valid room code');
      return;
    }
    setError(null);
    joinRoom(joinCode, netCallbacks);
    setPhase('joining');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard may fail on some browsers */ }
  };

  const handlePickFighter = (p: Politician) => {
    if (opponentFighter && p.id === opponentFighter.id) return; // can't pick same
    setMyFighter(p);
    const idx = POLITICIANS.findIndex(q => q.id === p.id);
    send({ type: 'pick', fighterIndex: idx });
  };

  const handleReady = () => {
    setMyReady(true);
    send({ type: 'ready' });
  };

  const handleLeave = () => {
    cleanup();
    setPhase('menu');
    setStatus('idle');
    setError(null);
    setRoomCode('');
    setJoinCode('');
    setOpponentFighter(null);
    setMyReady(false);
    setOpponentReady(false);
  };

  // ---- Render ----

  return (
    <div className="absolute inset-0 z-[70] bg-[#050a07] overflow-y-auto" role="dialog" aria-modal="true" aria-label="Online Multiplayer Lobby">
      <div className="min-h-full flex flex-col items-center justify-center gap-4 p-4 sm:p-6">

        {/* Title */}
        <div className="flex items-center gap-2 text-[#ffd700] font-black tracking-widest text-lg sm:text-2xl">
          <Wifi size={22} /> ONLINE MULTIPLAYER
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-900/60 border border-red-500 rounded-xl px-4 py-2 text-red-200 text-sm max-w-md">
            <WifiOff size={16} className="shrink-0" /> {error}
          </div>
        )}

        {/* Menu: Create or Join */}
        {phase === 'menu' && (
          <div className="flex flex-col items-center gap-3 w-full max-w-sm">
            <p className="text-[#d7e0d3] text-sm text-center">
              Play with a friend online! One player creates a room, the other joins with the code.
            </p>
            <button
              type="button"
              onClick={handleHost}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#ffd700] glass px-6 py-3 font-bold text-[#ffd700] hover:bg-[#ffd700]/10 transition-colors"
            >
              <Gamepad2 size={18} /> Create Room
            </button>
            <div className="text-[#8a9a8e] text-xs font-bold tracking-wider">— OR —</div>
            <div className="flex gap-2 w-full">
              <input
                type="text"
                maxLength={6}
                placeholder="ROOM CODE"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                className="flex-1 rounded-xl border border-[#1e3327] bg-[#0a1410] px-4 py-3 text-center font-mono font-bold text-lg text-white tracking-[0.3em] placeholder:text-[#3a4a3e] placeholder:tracking-widest focus:border-[#ffd700] outline-none"
                onKeyDown={e => { if (e.key === 'Enter') handleJoin(); }}
              />
              <button
                type="button"
                onClick={handleJoin}
                disabled={joinCode.trim().length < 3}
                className="rounded-xl border border-[#1e3327] glass px-5 py-3 font-bold text-[#f5eedb] enabled:hover:border-[#ffd700] disabled:opacity-40 transition-colors"
              >
                Join
              </button>
            </div>
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-2 rounded-xl border border-[#1e3327] glass px-4 py-2 text-[13px] font-bold text-[#f5eedb] mt-2"
            >
              <ArrowLeft size={14} /> Back to Map
            </button>
          </div>
        )}

        {/* Hosting: waiting for guest */}
        {phase === 'hosting' && status !== 'connected' && (
          <div className="flex flex-col items-center gap-4 w-full max-w-sm">
            <p className="text-[#d7e0d3] text-sm text-center">
              Share this room code with your friend:
            </p>
            <div className="flex items-center gap-2">
              <div className="bg-[#0a1410] border-2 border-[#ffd700] rounded-xl px-6 py-3 font-mono font-black text-3xl text-[#ffd700] tracking-[0.5em] select-all">
                {roomCode}
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="rounded-xl border border-[#1e3327] glass p-3 text-[#f5eedb] hover:border-[#ffd700] transition-colors"
                aria-label="Copy room code"
              >
                {copied ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
              </button>
            </div>
            <div className="flex items-center gap-2 text-[#8a9a8e] text-sm">
              <Loader2 size={16} className="animate-spin" /> Waiting for opponent to join...
            </div>
            <button type="button" onClick={handleLeave}
              className="flex items-center gap-2 rounded-xl border border-[#1e3327] glass px-4 py-2 text-[13px] font-bold text-[#f5eedb]">
              <ArrowLeft size={14} /> Cancel
            </button>
          </div>
        )}

        {/* Joining: connecting */}
        {phase === 'joining' && status !== 'connected' && (
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 text-[#d7e0d3] text-sm">
              <Loader2 size={16} className="animate-spin" /> Connecting to room <span className="font-mono font-bold text-[#ffd700]">{joinCode}</span>...
            </div>
            <button type="button" onClick={handleLeave}
              className="flex items-center gap-2 rounded-xl border border-[#1e3327] glass px-4 py-2 text-[13px] font-bold text-[#f5eedb]">
              <ArrowLeft size={14} /> Cancel
            </button>
          </div>
        )}

        {/* Fighter Pick (both connected) */}
        {phase === 'pick' && (
          <div className="flex flex-col items-center gap-4 w-full max-w-3xl">
            <div className="flex items-center gap-2 text-green-400 text-sm font-bold">
              <Users size={16} /> Connected! Room: <span className="font-mono text-[#ffd700]">{getRoomCode()}</span>
            </div>

            <div className="text-[#ffd700] font-black tracking-widest text-sm">
              {getRole() === 'host' ? 'YOU ARE PLAYER 1' : 'YOU ARE PLAYER 2'} — PICK YOUR FIGHTER
            </div>

            {/* Fighter grid */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 w-full max-w-3xl" data-online-grid>
              {POLITICIANS.map(p => {
                const isMyPick = p.id === myFighter.id;
                const isOpponentPick = opponentFighter && p.id === opponentFighter.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={!!isOpponentPick || myReady}
                    onClick={() => handlePickFighter(p)}
                    className={`flex items-center justify-center gap-2 rounded-xl border px-2 font-bold text-[13px] transition-all
                      ${isMyPick
                        ? 'border-[#ffd700] bg-[#ffd700]/15 text-[#ffd700] ring-2 ring-[#ffd700]/40'
                        : isOpponentPick
                          ? 'border-red-500/50 bg-red-900/20 text-red-300 opacity-50 cursor-not-allowed'
                          : 'border-[#1e3327] text-[#f5eedb] glass enabled:hover:border-[#ffd700] disabled:opacity-35 disabled:cursor-not-allowed'
                      }`}
                    style={{ minHeight: VS.chipHeight }}
                    aria-label={isOpponentPick ? `${p.name} (opponent's pick)` : isMyPick ? `${p.name} (your pick)` : `Pick ${p.name}`}
                  >
                    <span className="inline-block w-3 h-3 rounded-full shrink-0" style={{ background: p.col, boxShadow: `0 0 0 2px ${p.colSecondary}` }} />
                    <span className="truncate">{p.name.split(' ')[0]}</span>
                    {isMyPick && <span className="text-[10px]">✓</span>}
                    {isOpponentPick && <span className="text-[10px]">🎮</span>}
                  </button>
                );
              })}
            </div>

            {/* Status row */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md">
              <div className="flex-1 text-center">
                <div className="text-[11px] font-bold text-[#ffd700] tracking-widest">
                  {getRole() === 'host' ? 'PLAYER 1 (YOU)' : 'PLAYER 1 (OPPONENT)'}
                </div>
                <div className="font-serif font-bold text-white text-lg truncate">
                  {getRole() === 'host' ? myFighter.name : (opponentFighter?.name ?? '...')}
                </div>
                <div className="text-[11px] text-green-400">
                  {getRole() === 'host' ? (myReady ? '✓ READY' : 'Picking...') : (opponentReady ? '✓ READY' : 'Picking...')}
                </div>
              </div>
              <div className="font-serif font-black italic text-2xl text-[#ffd700]">VS</div>
              <div className="flex-1 text-center">
                <div className="text-[11px] font-bold text-[#ffd700] tracking-widest">
                  {getRole() === 'guest' ? 'PLAYER 2 (YOU)' : 'PLAYER 2 (OPPONENT)'}
                </div>
                <div className="font-serif font-bold text-white text-lg truncate">
                  {getRole() === 'guest' ? myFighter.name : (opponentFighter?.name ?? '...')}
                </div>
                <div className="text-[11px] text-green-400">
                  {getRole() === 'guest' ? (myReady ? '✓ READY' : 'Picking...') : (opponentReady ? '✓ READY' : 'Picking...')}
                </div>
              </div>
            </div>

            {/* Ready / Leave buttons */}
            <div className="flex items-center gap-3">
              {!myReady ? (
                <button
                  type="button"
                  onClick={handleReady}
                  className="flex items-center gap-2 rounded-xl border-2 border-green-500 bg-green-900/30 px-6 py-3 font-bold text-green-300 hover:bg-green-800/40 transition-colors animate-pulse"
                >
                  <Check size={18} /> LOCK IN & READY
                </button>
              ) : (
                <div className="flex items-center gap-2 text-green-400 text-sm font-bold">
                  <Loader2 size={16} className="animate-spin" /> Waiting for opponent...
                </div>
              )}
              <button type="button" onClick={handleLeave}
                className="flex items-center gap-2 rounded-xl border border-[#1e3327] glass px-4 py-2 text-[13px] font-bold text-[#f5eedb]">
                <ArrowLeft size={14} /> Leave
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
