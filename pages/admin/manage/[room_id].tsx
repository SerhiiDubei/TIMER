import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { supabase } from '@/lib/supabase';
import { RoomState, Player, Event } from '@/lib/types';
import { formatTime } from '@/lib/utils';
import VersionFooter from '@/components/VersionFooter';

export default function AdminManage() {
  const router = useRouter();
  const { room_id } = router.query;

  const [state, setState] = useState<RoomState | null>(null);
  const [adminKey, setAdminKey] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [generatingCodes, setGeneratingCodes] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [message, setMessage] = useState('');

  // Code generation form
  const [codeCount, setCodeCount] = useState(5);
  const [effectType, setEffectType] = useState<'self_add' | 'self_subtract' | 'team_add'>('self_add');
  const [seconds, setSeconds] = useState(300);

  const fetchState = useCallback(async () => {
    if (!room_id || typeof room_id !== 'string') return;

    try {
      const response = await fetch(`/api/rooms/${room_id}/state`);
      const data = await response.json();

      if (response.ok) {
        setState(data);
      }
    } catch (error) {
      console.error('Failed to fetch state:', error);
    } finally {
      setLoading(false);
    }
  }, [room_id]);

  useEffect(() => {
    const storedAdminKey = sessionStorage.getItem('admin_key');
    if (!storedAdminKey) {
      router.push('/');
      return;
    }
    setAdminKey(storedAdminKey);
    fetchState();
  }, [room_id, fetchState, router]);

  useEffect(() => {
    const interval = setInterval(fetchState, 3000);
    return () => clearInterval(interval);
  }, [fetchState]);

  // Temporary polling until Vercel Cron works + DB migration done
  useEffect(() => {
    if (!room_id || typeof room_id !== 'string') return;
    if (!state || state.room.status !== 'running') return;

    const checkEliminations = async () => {
      try {
        await fetch('/api/admin/check-eliminations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ secret: 'timer-game-secret-2026' })
        });
      } catch (error) {
        console.error('[CHECK] Error:', error);
      }
    };

    // Check every 10 seconds
    checkEliminations();
    const interval = setInterval(checkEliminations, 10000);

    return () => clearInterval(interval);
  }, [room_id, state?.room.status]);

  // Realtime
  useEffect(() => {
    if (!room_id || typeof room_id !== 'string') return;

    const channel = supabase
      .channel(`admin:${room_id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${room_id}` },
        () => fetchState()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'events', filter: `room_id=eq.${room_id}` },
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

  const handleStartGame = async () => {
    setStarting(true);
    setMessage('');

    try {
      const response = await fetch('/api/rooms/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id,
          admin_key: adminKey
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('✅ Game started!');
        fetchState();
      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch (error: any) {
      setMessage(`❌ ${error.message}`);
    } finally {
      setStarting(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleGenerateCodes = async () => {
    setGeneratingCodes(true);
    setMessage('');
    setGeneratedCodes([]);

    try {
      const batch = Array(codeCount).fill(null).map(() => ({
        effect_type: effectType,
        payload: effectType === 'team_add' 
          ? { seconds, scope: 'all' }
          : { seconds: effectType === 'self_subtract' ? -seconds : seconds }
      }));

      const response = await fetch('/api/codes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id,
          admin_key: adminKey,
          batch
        })
      });

      const data = await response.json();

      if (response.ok) {
        setGeneratedCodes(data.codes);
        setMessage(`✅ Generated ${data.codes.length} codes!`);
      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch (error: any) {
      setMessage(`❌ ${error.message}`);
    } finally {
      setGeneratingCodes(false);
    }
  };

  const copyAllCodes = () => {
    const text = generatedCodes.join('\n');
    navigator.clipboard.writeText(text);
    setMessage('📋 Codes copied to clipboard!');
    setTimeout(() => setMessage(''), 2000);
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

  const isLobby = state.room.status === 'lobby';
  const isRunning = state.room.status === 'running';
  const alivePlayers = state.players.filter(p => !p.eliminated_at);

  return (
    <>
      <Head>
        <title>Admin - {state.room.room_code}</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-4 border border-white/20">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">
                  🎮 Admin Panel
                </h1>
                <p className="text-white/60">Room: <span className="font-mono text-white">{state.room.room_code}</span></p>
              </div>
              <div className="text-right">
                <div className="text-white/60 text-sm">Status</div>
                <div className={`text-lg font-semibold ${
                  isRunning ? 'text-green-300' : 'text-yellow-300'
                }`}>
                  {state.room.status.toUpperCase()}
                </div>
              </div>
            </div>
          </div>

          {message && (
            <div className="bg-blue-500/20 border border-blue-500/50 rounded-xl p-4 mb-4 text-white text-center">
              {message}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Game Control */}
              {isLobby && (
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                  <h2 className="text-xl font-bold text-white mb-4">🚀 Game Control</h2>
                  <p className="text-white/60 text-sm mb-4">
                    Players ready: {state.players.length}
                  </p>
                  <button
                    onClick={handleStartGame}
                    disabled={starting || state.players.length === 0}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                  >
                    {starting ? 'Starting...' : 'Start Game'}
                  </button>
                </div>
              )}

              {/* Stats */}
              {isRunning && (
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                  <h2 className="text-xl font-bold text-white mb-4">📊 Game Stats</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="text-white/60 text-sm">Total Players</div>
                      <div className="text-3xl font-bold text-white">{state.players.length}</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="text-white/60 text-sm">Still Alive</div>
                      <div className="text-3xl font-bold text-green-300">{alivePlayers.length}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Players List */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                <h2 className="text-xl font-bold text-white mb-4">
                  👥 Players ({state.players.length})
                </h2>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {state.players.map((player: Player) => (
                    <div
                      key={player.id}
                      className={`flex justify-between items-center p-3 rounded-lg ${
                        player.eliminated_at
                          ? 'bg-red-500/10 border border-red-500/30'
                          : 'bg-white/5 border border-white/10'
                      }`}
                    >
                      <div>
                        <div className="text-white font-medium">{player.name}</div>
                        <div className="text-white/50 text-xs">
                          Joined {new Date(player.joined_at).toLocaleTimeString()}
                        </div>
                      </div>
                      <div>
                        {player.eliminated_at ? (
                          <span className="text-red-300 text-sm">💀 Eliminated</span>
                        ) : (
                          <span className="text-green-300 text-sm">✓ Alive</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {/* Code Generator */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                <h2 className="text-xl font-bold text-white mb-4">🎫 Generate Codes</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">
                      Number of Codes
                    </label>
                    <input
                      type="number"
                      value={codeCount}
                      onChange={(e) => setCodeCount(parseInt(e.target.value) || 1)}
                      min={1}
                      max={50}
                      className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-white text-sm font-medium mb-2">
                      Effect Type
                    </label>
                    <select
                      value={effectType}
                      onChange={(e) => setEffectType(e.target.value as any)}
                      className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="self_add">➕ Add Time (Self)</option>
                      <option value="self_subtract">➖ Subtract Time (Self)</option>
                      <option value="team_add">👥 Add Time (All Players)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-white text-sm font-medium mb-2">
                      Seconds ({Math.floor(seconds / 60)}m {seconds % 60}s)
                    </label>
                    <input
                      type="number"
                      value={seconds}
                      onChange={(e) => setSeconds(parseInt(e.target.value) || 0)}
                      step={30}
                      min={-600}
                      max={600}
                      className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <button
                    onClick={handleGenerateCodes}
                    disabled={generatingCodes}
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                  >
                    {generatingCodes ? 'Generating...' : 'Generate Codes'}
                  </button>
                </div>

                {generatedCodes.length > 0 && (
                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-white font-medium">Generated Codes:</div>
                      <button
                        onClick={copyAllCodes}
                        className="text-sm text-purple-300 hover:text-purple-200"
                      >
                        📋 Copy All
                      </button>
                    </div>
                    <div className="bg-black/30 rounded-lg p-4 max-h-64 overflow-y-auto">
                      {generatedCodes.map((code, idx) => (
                        <div
                          key={idx}
                          className="font-mono text-green-300 text-sm py-1"
                        >
                          {code}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Recent Events */}
              {state.recent_events && state.recent_events.length > 0 && (
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                  <h2 className="text-xl font-bold text-white mb-4">📜 Recent Events</h2>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {state.recent_events.map((event: Event) => (
                      <div
                        key={event.id}
                        className="text-white/70 text-sm p-3 bg-white/5 rounded-lg"
                      >
                        <div className="flex justify-between">
                          <span>
                            {event.type === 'game_started' && '🎮 Game started'}
                            {event.type === 'player_joined' && `👋 ${event.payload?.name} joined`}
                            {event.type === 'code_used' && '🎫 Code redeemed'}
                            {event.type === 'time_adjust' && `⏱️ Time ${event.time_delta_seconds > 0 ? '+' : ''}${event.time_delta_seconds}s`}
                            {event.type === 'player_eliminated' && '💀 Player eliminated'}
                          </span>
                          <span className="text-white/50 text-xs">
                            {new Date(event.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <VersionFooter />
      </div>
    </>
  );
}
