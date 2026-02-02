import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Hourglass, Sparkles, Scroll, AlertTriangle, Crown, Flame, Feather, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { RoomState } from '@/lib/types';
import { formatTimeObject, calculateRemainingTime } from '@/lib/utils';
import Starfield from '@/components/Starfield';
import VersionFooter from '@/components/VersionFooter';

export default function RoomPage() {
  const router = useRouter();
  const { room_id } = router.query;

  const [state, setState] = useState<RoomState | null>(null);
  const [playerId, setPlayerId] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);
  const [message, setMessage] = useState('');
  const [localRemaining, setLocalRemaining] = useState<number>(0);
  const [deciseconds, setDeciseconds] = useState<number>(0);
  const [shake, setShake] = useState(false);
  const [flash, setFlash] = useState<'GOLD' | 'RED' | null>(null);
  const [floatingText, setFloatingText] = useState<{text: string; color: string; id: number} | null>(null);
  
  const logsEndRef = useRef<HTMLDivElement>(null);

  const fetchState = useCallback(async () => {
    if (!room_id || typeof room_id !== 'string') return;

    try {
      const response = await fetch(`/api/rooms/${room_id}/state?player_id=${playerId}`);
      const data = await response.json();

      if (response.ok) {
        setState(data);
        if (data.my_remaining !== undefined) {
          setLocalRemaining(data.my_remaining);
        }
      }
    } catch (error) {
      console.error('Failed to fetch state:', error);
    } finally {
      setLoading(false);
    }
  }, [room_id, playerId]);

  useEffect(() => {
    const storedPlayerId = sessionStorage.getItem('player_id');
    const storedPlayerName = sessionStorage.getItem('player_name');

    if (!storedPlayerId) {
      router.push('/');
      return;
    }

    setPlayerId(storedPlayerId);
    setPlayerName(storedPlayerName || '');
    fetchState();
  }, [room_id, fetchState, router]);

  useEffect(() => {
    const interval = setInterval(fetchState, 2000);
    return () => clearInterval(interval);
  }, [fetchState]);

  // Local timer countdown (100ms for smooth deciseconds)
  useEffect(() => {
    if (!state?.room?.started_at) return;

    const interval = setInterval(() => {
      const remaining = calculateRemainingTime(
        state.room.base_seconds,
        state.room.started_at,
        state.my_adjustments || 0
      );
      setLocalRemaining(remaining);
      
      // Calculate deciseconds (0-9) from current milliseconds
      const now = Date.now();
      const ds = Math.floor((now % 1000) / 100);
      setDeciseconds(ds);
    }, 100);

    return () => clearInterval(interval);
  }, [state]);

  useEffect(() => {
    if (!room_id || typeof room_id !== 'string') return;

    const channel = supabase
      .channel(`room:${room_id}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'events', filter: `room_id=eq.${room_id}` },
        () => fetchState()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${room_id}` },
        () => fetchState()
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${room_id}` },
        () => fetchState()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room_id, fetchState]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state?.events]);

  const handleRedeemCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || redeeming) return;

    setRedeeming(true);
    setMessage('');

    try {
      const response = await fetch('/api/codes/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id,
          player_id: playerId,
          code: code.trim().toUpperCase()
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`✨ RUNE ACTIVATED!`);
        setFlash('GOLD');
        setFloatingText({
          text: data.delta_seconds > 0 ? `+${data.delta_seconds}s` : `${data.delta_seconds}s`,
          color: data.delta_seconds > 0 ? 'text-arcade-gold' : 'text-arcade-red',
          id: Date.now()
        });
        setTimeout(() => setFlash(null), 500);
        setCode('');
        fetchState();
      } else {
        setMessage(`❌ ${data.error}`);
        setShake(true);
        setTimeout(() => setShake(false), 500);
      }
    } catch (error: any) {
      setMessage(`❌ ${error.message}`);
    } finally {
      setRedeeming(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  if (loading) {
    return (
      <>
        <Starfield />
        <div className="min-h-screen flex items-center justify-center relative z-10">
          <div className="text-arcade-cream font-arcade text-sm animate-pulse">LOADING...</div>
        </div>
      </>
    );
  }

  if (!state) {
    return (
      <>
        <Starfield />
        <div className="min-h-screen flex items-center justify-center relative z-10">
          <div className="text-arcade-red font-arcade text-sm">RITUAL NOT FOUND</div>
        </div>
      </>
    );
  }

  const isLobby = state.room?.status === 'lobby';
  const isRunning = state.room?.status === 'running';
  const isFinished = state.room?.status === 'finished';
  const myPlayer = state.players?.find(p => p.id === playerId);
  const isEliminated = myPlayer?.eliminated_at != null;
  const timeIsUp = localRemaining <= 0 && isRunning && !isEliminated;
  const winner = isFinished && state.room?.winner_player_id 
    ? state.players?.find(p => p.id === state.room.winner_player_id)
    : null;
  const iWon = winner?.id === playerId;

  const { m = 0, s = 0 } = formatTimeObject(localRemaining) || {};
  const ms = deciseconds; // Use real-time deciseconds 0-9

  return (
    <>
      <Head>
        <title>{state.room.room_name || `Room ${state.room.room_code}`}</title>
      </Head>

      <Starfield />

      {/* Flash overlay */}
      {flash && (
        <div className={`fixed inset-0 pointer-events-none z-40 mix-blend-screen ${
          flash === 'GOLD' ? 'bg-arcade-gold' : 'bg-arcade-red'
        } animate-pulse opacity-40`} />
      )}

      <div className={`min-h-screen p-4 md:p-8 relative z-10 ${shake ? 'animate-pulse' : ''}`}>
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Header */}
          <header className="pixel-box p-4 rounded-lg" style={{
            '--border-color': '#ffd700',
            '--glow-color': 'rgba(255, 215, 0, 0.2)'
          } as React.CSSProperties}>
            <div className="flex items-center gap-3 text-arcade-gold">
              <Hourglass size={24} className="animate-spin-slow" />
              <div className="flex-1">
                <h1 className="text-sm md:text-lg font-arcade tracking-widest text-glow-gold">
                  ARCANE HOURGLASS
                </h1>
                {state.room.room_name && (
                  <p className="text-xs text-arcade-teal mt-1">"{state.room.room_name}"</p>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className={`w-2 h-2 rounded-full ${
                  isRunning ? 'bg-arcade-teal animate-pulse' : 'bg-arcade-red'
                }`} />
                <span className="text-arcade-cream">{isRunning ? 'ACTIVE' : isLobby ? 'WAITING' : 'ENDED'}</span>
              </div>
            </div>
          </header>

          {/* Waiting for Start */}
          {isLobby && (
            <div className="pixel-box p-6 rounded-lg text-center" style={{
              '--border-color': '#40e0d0',
              '--glow-color': 'rgba(64, 224, 208, 0.2)'
            } as React.CSSProperties}>
              <Sparkles size={32} className="text-arcade-teal mx-auto mb-3 animate-float" />
              <h2 className="text-lg font-arcade text-arcade-teal mb-2">WAITING FOR ARCHMAGE...</h2>
              <p className="text-xs text-arcade-cream/60 font-arcade">
                PLAYERS: {state.players?.length || 0}
              </p>
            </div>
          )}

          {/* Eliminated Screen */}
          {isEliminated && (
            <div className="pixel-box p-6 rounded-lg text-center" style={{
              '--border-color': '#ff4757',
              '--glow-color': 'rgba(255, 71, 87, 0.3)'
            } as React.CSSProperties}>
              <div className="text-5xl mb-3">💀</div>
              <h2 className="text-2xl font-arcade text-arcade-red text-glow-red mb-2">ELIMINATED</h2>
              <p className="text-xs text-arcade-cream/60 font-arcade">YOUR RITUAL HAS FAILED</p>
            </div>
          )}

          {/* Winner Screen */}
          {isFinished && iWon && (
            <div className="pixel-box p-8 rounded-lg text-center" style={{
              '--border-color': '#ffd700',
              '--glow-color': 'rgba(255, 215, 0, 0.4)'
            } as React.CSSProperties}>
              <Crown size={48} className="text-arcade-gold mx-auto mb-4 animate-float" />
              <h2 className="text-3xl font-arcade text-arcade-gold text-glow-gold mb-2">VICTORY!</h2>
              <p className="text-sm text-arcade-cream font-arcade">YOU ARE THE LAST SURVIVOR</p>
            </div>
          )}

          {/* Time's Up Warning */}
          {timeIsUp && !isEliminated && (
            <div className="pixel-box p-4 rounded-lg text-center glitch-container" style={{
              '--border-color': '#ff4757',
              '--glow-color': 'rgba(255, 71, 87, 0.4)'
            } as React.CSSProperties}>
              <div className="flex items-center justify-center gap-3 text-arcade-red glitch-text">
                <AlertTriangle size={24} />
                <span className="font-arcade text-sm">TIME IS UP! AWAITING ELIMINATION...</span>
                <AlertTriangle size={24} />
              </div>
            </div>
          )}

          {/* Timer Display */}
          {(isRunning || (isFinished && !iWon)) && !isEliminated && (
            <div className="flex flex-col items-center justify-center min-h-[400px] py-12 relative">
              {/* Floating Text */}
              {floatingText && (
                <div
                  key={floatingText.id}
                  className={`absolute top-0 text-6xl font-bold ${floatingText.color} z-20 pointer-events-none animate-float`}
                  style={{
                    textShadow: '0 0 20px currentColor, 0 0 40px currentColor'
                  }}
                >
                  {floatingText.text}
                </div>
              )}

              {/* Giant Timer */}
              <div 
                className="flex items-center justify-center gap-2 md:gap-4 font-arcade"
                style={{
                  fontSize: 'clamp(2rem, 8vw, 6rem)',
                  fontWeight: 'bold',
                  letterSpacing: '0.1em',
                  color: localRemaining < 60000 && localRemaining > 0 ? '#ff4757' : '#40e0d0',
                  textShadow: localRemaining < 60000 && localRemaining > 0 
                    ? '0 0 20px #ff4757, 0 0 40px #ff0000, 0 0 60px #ff4757' 
                    : '0 0 20px #40e0d0, 0 0 40px #00d9ff, 0 0 60px #40e0d0',
                  animation: localRemaining < 10000 && localRemaining > 0 ? 'pulse 1s infinite' : 'none'
                }}
              >
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{m.toString().padStart(2, '0')}</span>
                <span style={{ opacity: 0.7 }}>:</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{s.toString().padStart(2, '0')}</span>
                <span style={{ opacity: 0.6, fontSize: '0.7em' }}>.</span>
                <span style={{ opacity: 0.9, fontSize: '0.85em', fontVariantNumeric: 'tabular-nums' }}>{ms}</span>
              </div>

              {/* Adjustments */}
              {state.my_adjustments !== undefined && state.my_adjustments !== 0 && (
                <div className="text-center mt-6 text-2xl font-bold" style={{
                  color: state.my_adjustments > 0 ? '#39ff14' : '#ff4757',
                  textShadow: state.my_adjustments > 0 
                    ? '0 0 10px #39ff14, 0 0 20px #39ff14' 
                    : '0 0 10px #ff4757, 0 0 20px #ff4757'
                }}>
                  {state.my_adjustments > 0 ? '+' : ''}{state.my_adjustments}s
                </div>
              )}
            </div>
          )}

          {/* Code Input */}
          {isRunning && !isEliminated && (
            <form onSubmit={handleRedeemCode} className="relative">
              <div className="pixel-box p-3 rounded-lg flex items-center gap-3" style={{
                '--border-color': message.includes('❌') ? '#ff4757' : '#40e0d0',
                '--glow-color': message.includes('❌') ? 'rgba(255, 71, 87, 0.2)' : 'rgba(64, 224, 208, 0.2)'
              } as React.CSSProperties}>
                <Feather size={20} className="text-arcade-teal animate-bounce" />
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="ENTER RUNE CODE..."
                  className="flex-1 bg-transparent border-none outline-none text-arcade-cream placeholder-arcade-cream/30 font-arcade uppercase tracking-wider text-sm"
                  autoComplete="off"
                />
                <button
                  type="submit"
                  disabled={!code || redeeming}
                  className="p-2 hover:text-arcade-gold disabled:opacity-30 text-arcade-cream transition-colors"
                >
                  <Flame size={20} />
                </button>
              </div>

              {message && (
                <div className={`absolute -top-10 left-0 font-arcade text-xs p-2 rounded ${
                  message.includes('❌') ? 'text-arcade-red bg-black/80 border border-arcade-red' : 'text-arcade-green bg-black/80 border border-arcade-green'
                }`}>
                  {message}
                </div>
              )}
            </form>
          )}

          {/* Chronicle */}
          <div className="pixel-box p-4 rounded-lg h-64 flex flex-col" style={{
            '--border-color': '#e056fd',
            '--glow-color': 'rgba(224, 86, 253, 0.2)'
          } as React.CSSProperties}>
            <div className="flex items-center gap-2 mb-4 border-b-2 border-arcade-purple/30 pb-2">
              <Scroll size={16} className="text-arcade-purple" />
              <span className="text-xs text-arcade-purple tracking-widest font-arcade">CHRONICLE</span>
            </div>

            <div className="flex-1 overflow-y-auto tome-scrollbar flex flex-col gap-3 pr-2">
              {!state.events || state.events.length === 0 ? (
                <div className="text-arcade-cream/50 text-center mt-10 italic text-xs font-arcade">
                  The pages are empty...
                </div>
              ) : (
                state.events.slice(0, 20).map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 text-xs p-3 rounded bg-black/50 border-l-4 border-arcade-purple/50"
                  >
                    <div className="flex-1 text-arcade-cream/80 font-arcade text-[10px] leading-relaxed">
                      {event.type === 'player_joined' && `${event.payload?.name} joined`}
                      {event.type === 'game_started' && 'Ritual begun'}
                      {event.type === 'player_eliminated' && `💀 ${event.payload?.name} eliminated`}
                      {event.type === 'code_used' && `✨ Code used`}
                      {event.type === 'time_adjust' && `⚡ Time adjusted`}
                    </div>
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </div>

          {/* Players */}
          <div className="pixel-box p-4 rounded-lg" style={{
            '--border-color': '#40e0d0',
            '--glow-color': 'rgba(64, 224, 208, 0.2)'
          } as React.CSSProperties}>
            <div className="flex items-center gap-2 mb-3">
              <Users size={16} className="text-arcade-teal" />
              <span className="text-xs text-arcade-teal tracking-widest font-arcade">
                APPRENTICES ({state.players?.filter(p => !p.eliminated_at).length || 0}/{state.players?.length || 0})
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {state.players?.map((player) => (
                <div
                  key={player.id}
                  className={`flex items-center gap-2 p-2 rounded bg-black/30 border ${
                    player.eliminated_at 
                      ? 'border-arcade-red/30 opacity-50' 
                      : 'border-arcade-green/30'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${
                    player.eliminated_at ? 'bg-arcade-red' : 'bg-arcade-green animate-pulse'
                  }`} />
                  <span className={`text-xs font-arcade truncate ${
                    player.id === playerId ? 'text-arcade-gold' : 'text-arcade-cream'
                  }`}>
                    {player.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <VersionFooter />
      </div>
    </>
  );
}
