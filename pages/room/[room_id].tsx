import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { supabase } from '@/lib/supabase';
import { RoomState, Player, Event } from '@/lib/types';
import { formatTime, calculateRemainingTime } from '@/lib/utils';
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

  // Fetch room state
  const fetchState = useCallback(async () => {
    if (!room_id || typeof room_id !== 'string') return;

    try {
      const response = await fetch(
        `/api/rooms/${room_id}/state?player_id=${playerId}`
      );
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

  // Initialize
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

  // Poll for updates
  useEffect(() => {
    const interval = setInterval(fetchState, 2000);
    return () => clearInterval(interval);
  }, [fetchState]);

  // Local timer countdown
  useEffect(() => {
    if (!state?.room.started_at) return;

    const interval = setInterval(() => {
      const remaining = calculateRemainingTime(
        state.room.base_seconds,
        state.room.started_at,
        state.my_adjustments || 0
      );
      setLocalRemaining(remaining);
    }, 100);

    return () => clearInterval(interval);
  }, [state]);

  // Realtime subscriptions
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

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setRedeeming(true);
    setMessage('');

    try {
      const response = await fetch('/api/codes/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id,
          player_id: playerId,
          code: code.toUpperCase()
        })
      });

      const data = await response.json();

      if (data.success) {
        setMessage('✅ Code redeemed successfully!');
        setCode('');
        fetchState();
      } else {
        setMessage(`❌ ${data.message}`);
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
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Room not found</div>
      </div>
    );
  }

  const myPlayer = state.players.find(p => p.id === playerId);
  const isEliminated = myPlayer?.eliminated_at !== null;
  const isLobby = state.room.status === 'lobby';
  const isRunning = state.room.status === 'running';
  const isFinished = state.room.status === 'finished';
  const winner = state.players.find(p => p.id === state.room.winner_player_id);
  const timeIsUp = localRemaining <= 0 && isRunning && !isEliminated;

  return (
    <>
      <Head>
        <title>{isLobby ? 'Lobby' : 'Game'} - {state.room.room_code}</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-4 border border-white/20">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {state.room.room_name || `Room: ${state.room.room_code}`}
                </h1>
                <p className="text-white/60">
                  {playerName} {isEliminated && '(Eliminated)'}
                </p>
              </div>
              <div className="text-right">
                <div className="text-white/60 text-sm">Status</div>
                <div className="text-white font-semibold capitalize">
                  {state.room.status}
                </div>
              </div>
            </div>
          </div>

          {/* Lobby Screen */}
          {isLobby && (
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 text-center">
              <h2 className="text-3xl font-bold text-white mb-4">
                ⏳ Waiting for game to start...
              </h2>
              <p className="text-white/60 mb-6">
                {state.players.length} player{state.players.length !== 1 ? 's' : ''} in lobby
              </p>
              <div className="text-white/80 mb-4">
                Starting time: {Math.floor(state.room.base_seconds / 60)} minutes
              </div>
              {state.players.length < 2 && (
                <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3 text-yellow-200 text-sm">
                  ⚠️ Need at least 2 players to start
                </div>
              )}
            </div>
          )}

          {/* Game Finished Screen */}
          {isFinished && (
            <div className="bg-gradient-to-br from-yellow-500/20 to-purple-500/20 backdrop-blur-lg rounded-2xl p-8 border border-yellow-500/50 text-center mb-4">
              <div className="text-6xl mb-4">🏆</div>
              <h2 className="text-4xl font-bold text-white mb-4">
                Game Over!
              </h2>
              {winner && (
                <div className="text-2xl text-yellow-300 font-semibold">
                  {winner.id === playerId ? 'YOU WIN!' : `${winner.name} wins!`}
                </div>
              )}
            </div>
          )}

          {/* Game Screen */}
          {isRunning && !isFinished && (
            <>
              {/* Time Up Warning */}
              {timeIsUp && (
                <div className="bg-red-500/30 backdrop-blur-lg rounded-2xl p-6 mb-4 border-2 border-red-500 text-center animate-pulse">
                  <div className="text-5xl mb-2">⏰</div>
                  <div className="text-2xl font-bold text-white mb-2">
                    Your time is up!
                  </div>
                  <div className="text-red-200">
                    Waiting for elimination check...
                  </div>
                </div>
              )}

              {/* Timer */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-4 border border-white/20 text-center">
                <div className="text-white/60 text-sm mb-2">Your Time Remaining</div>
                <div className={`text-7xl font-bold tabular-nums transition-colors duration-300 ${
                  localRemaining <= 0 ? 'text-red-500 animate-pulse' :
                  localRemaining <= 60 ? 'text-red-400 animate-pulse' :
                  localRemaining <= 180 ? 'text-yellow-300' :
                  'text-white'
                }`} style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {formatTime(Math.max(0, localRemaining))}
                </div>
                {state.my_adjustments !== undefined && state.my_adjustments !== 0 && (
                  <div className="text-white/60 text-sm mt-2">
                    Adjustments: {state.my_adjustments > 0 ? '+' : ''}{state.my_adjustments}s
                  </div>
                )}
              </div>

              {/* Code Input */}
              {!isEliminated && (
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-4 border border-white/20">
                  <form onSubmit={handleRedeem} className="flex gap-2">
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="Enter code (e.g. ABC-123)"
                      className="flex-1 px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 uppercase"
                      disabled={redeeming}
                    />
                    <button
                      type="submit"
                      disabled={redeeming || !code.trim()}
                      className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white font-semibold rounded-lg transition-colors"
                    >
                      {redeeming ? '...' : 'Redeem'}
                    </button>
                  </form>
                  {message && (
                    <div className="mt-3 text-center text-white">
                      {message}
                    </div>
                  )}
                </div>
              )}

              {isEliminated && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-2xl p-6 mb-4 text-center">
                  <div className="text-3xl mb-2">💀</div>
                  <div className="text-white font-semibold text-xl">You are eliminated!</div>
                  <div className="text-white/60 text-sm mt-1">Time ran out</div>
                </div>
              )}
            </>
          )}

          {/* Players List */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <h3 className="text-white font-semibold mb-4">
              Players ({state.players.length})
            </h3>
            <div className="space-y-2">
              {state.players.map((player: Player) => (
                <div
                  key={player.id}
                  className={`flex justify-between items-center p-3 rounded-lg ${
                    player.eliminated_at
                      ? 'bg-red-500/10 border border-red-500/30'
                      : 'bg-white/5 border border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{player.name}</span>
                    {player.id === playerId && (
                      <span className="text-xs text-purple-300">(You)</span>
                    )}
                  </div>
                  <div>
                    {player.eliminated_at ? (
                      <span className="text-red-300 text-sm">❌ Out</span>
                    ) : (
                      <span className="text-green-300 text-sm">✓ Alive</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Events */}
          {state.recent_events && state.recent_events.length > 0 && (
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mt-4 border border-white/20">
              <h3 className="text-white font-semibold mb-4">Recent Activity</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {state.recent_events.slice(0, 5).map((event: Event) => (
                  <div
                    key={event.id}
                    className="text-white/70 text-sm p-2 bg-white/5 rounded"
                  >
                    {event.type === 'game_started' && '🎮 Game started!'}
                    {event.type === 'player_joined' && `👋 ${event.payload?.name} joined`}
                    {event.type === 'code_used' && '🎫 Code redeemed'}
                    {event.type === 'time_adjust' && `⏱️ Time adjusted (${event.time_delta_seconds > 0 ? '+' : ''}${event.time_delta_seconds}s)`}
                    {event.type === 'player_eliminated' && '💀 Player eliminated'}
                    {event.type === 'game_finished' && '🏆 Game finished!'}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <VersionFooter />
      </div>
    </>
  );
}
