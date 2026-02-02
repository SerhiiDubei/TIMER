import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Shield, Users, Play, Key, Copy, Zap, Skull, Crown, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { RoomState } from '@/lib/types';
import { formatTime } from '@/lib/utils';
import Starfield from '@/components/Starfield';
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
  const [lastCopied, setLastCopied] = useState<string | null>(null);

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
    const interval = setInterval(fetchState, 1000);
    return () => clearInterval(interval);
  }, [fetchState]);

  // Polling for elimination check
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

    checkEliminations();
    const interval = setInterval(checkEliminations, 2000);

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
        setMessage('✅ RITUAL BEGUN!');
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
        setMessage(`✅ ${data.codes.length} RUNES CRAFTED!`);
      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch (error: any) {
      setMessage(`❌ ${error.message}`);
    } finally {
      setGeneratingCodes(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setLastCopied(code);
    setTimeout(() => setLastCopied(null), 2000);
  };

  const copyAllCodes = () => {
    const text = generatedCodes.join('\n');
    navigator.clipboard.writeText(text);
    setMessage('📋 ALL RUNES COPIED!');
    setTimeout(() => setMessage(''), 2000);
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
  const alivePlayers = state.players?.filter(p => !p.eliminated_at) || [];

  const getEffectIcon = (type: string) => {
    if (type === 'self_add') return <Zap className="text-arcade-green" size={16} />;
    if (type === 'self_subtract') return <Skull className="text-arcade-red" size={16} />;
    return <Crown className="text-arcade-gold" size={16} />;
  };

  const getEffectLabel = (type: string) => {
    if (type === 'self_add') return 'BLESSING';
    if (type === 'self_subtract') return 'CURSE';
    return 'TEAM GIFT';
  };

  return (
    <>
      <Head>
        <title>🛡️ Archmage - {state.room.room_code}</title>
      </Head>

      <Starfield />

      <div className="min-h-screen p-4 md:p-8 relative z-10">
        <div className="max-w-6xl mx-auto space-y-4">
          {/* Header */}
          <header className="pixel-box p-4 md:p-6 rounded-lg" style={{
            '--border-color': '#f4a261',
            '--glow-color': 'rgba(244, 162, 97, 0.2)'
          } as React.CSSProperties}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-3 text-arcade-amber">
                <Shield size={24} className="animate-pulse" />
                <div>
                  <h1 className="text-lg md:text-xl font-arcade tracking-widest text-glow-amber">
                    ARCHMAGE SANCTUM
                  </h1>
                  <p className="text-xs text-arcade-cream/60 font-arcade mt-1">
                    ROOM: <span className="text-arcade-gold">{state.room.room_code}</span>
                    {state.room.room_name && <span className="text-arcade-teal ml-2">"{state.room.room_name}"</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs font-arcade">
                <div className="flex items-center gap-2 px-3 py-1 border border-arcade-teal/30 rounded bg-arcade-teal/10">
                  <Users size={14} className="text-arcade-teal" />
                  <span className="text-arcade-cream">ALIVE: {alivePlayers.length}/{state.players?.length || 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    isRunning ? 'bg-arcade-green animate-pulse' : 
                    isFinished ? 'bg-arcade-red' : 'bg-arcade-amber'
                  }`} />
                  <span className="text-arcade-cream">{state.room.status.toUpperCase()}</span>
                </div>
              </div>
            </div>
          </header>

          {/* Message */}
          {message && (
            <div className="pixel-box p-3 rounded-lg text-center font-arcade text-xs text-arcade-green" style={{
              '--border-color': '#39ff14',
              '--glow-color': 'rgba(57, 255, 20, 0.2)'
            } as React.CSSProperties}>
              {message}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* LEFT: Game Control */}
            <div className="space-y-4">
              {/* Start Game */}
              {isLobby && (
                <section className="pixel-box p-6 rounded-lg" style={{
                  '--border-color': '#40e0d0',
                  '--glow-color': 'rgba(64, 224, 208, 0.2)'
                } as React.CSSProperties}>
                  <div className="flex items-center gap-2 mb-4">
                    <Play size={20} className="text-arcade-teal" />
                    <h2 className="text-sm font-arcade text-arcade-teal tracking-wider">RITUAL CONTROL</h2>
                  </div>
                  <p className="text-xs text-arcade-cream/60 font-arcade mb-4">
                    APPRENTICES READY: {state.players?.length || 0}
                  </p>
                  <button
                    onClick={handleStartGame}
                    disabled={starting || (state.players?.length || 0) < 2}
                    className="w-full pixel-box py-3 rounded-lg font-arcade text-xs tracking-wider transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      '--border-color': '#39ff14',
                      '--glow-color': 'rgba(57, 255, 20, 0.2)'
                    } as React.CSSProperties}
                  >
                    <span className="text-arcade-green">
                      {starting ? 'BEGINNING...' : 'BEGIN RITUAL'}
                    </span>
                  </button>
                  {(state.players?.length || 0) < 2 && (
                    <div className="mt-2 flex items-center gap-2 text-arcade-red text-[10px] font-arcade">
                      <AlertCircle size={12} />
                      MIN 2 APPRENTICES
                    </div>
                  )}
                </section>
              )}

              {/* Players */}
              <section className="pixel-box p-6 rounded-lg" style={{
                '--border-color': '#e056fd',
                '--glow-color': 'rgba(224, 86, 253, 0.2)'
              } as React.CSSProperties}>
                <div className="flex items-center gap-2 mb-4">
                  <Users size={20} className="text-arcade-purple" />
                  <h2 className="text-sm font-arcade text-arcade-purple tracking-wider">
                    APPRENTICES ({state.players?.length || 0})
                  </h2>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto tome-scrollbar">
                  {!state.players || state.players.length === 0 ? (
                    <div className="text-center text-arcade-cream/30 text-xs font-arcade py-4">
                      NO APPRENTICES
                    </div>
                  ) : (
                    state.players?.map((player) => (
                      <div
                        key={player.id}
                        className={`
                          flex items-center justify-between p-3 rounded bg-black/30 border-l-4
                          ${player.eliminated_at ? 'border-arcade-red opacity-50' : 'border-arcade-green'}
                        `}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            player.eliminated_at ? 'bg-arcade-red' : 'bg-arcade-green animate-pulse'
                          }`} />
                          <span className="font-arcade text-xs text-arcade-cream">{player.name}</span>
                        </div>
                        <span className={`text-[10px] font-arcade ${
                          player.eliminated_at ? 'text-arcade-red' : 'text-arcade-green'
                        }`}>
                          {player.eliminated_at ? 'ELIMINATED' : 'ALIVE'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </section>

              {/* Winner */}
              {isFinished && state.room?.winner_player_id && (
                <section className="pixel-box p-6 rounded-lg text-center" style={{
                  '--border-color': '#ffd700',
                  '--glow-color': 'rgba(255, 215, 0, 0.3)'
                } as React.CSSProperties}>
                  <Crown size={32} className="text-arcade-gold mx-auto mb-2 animate-float" />
                  <h2 className="text-lg font-arcade text-arcade-gold text-glow-gold">
                    VICTOR
                  </h2>
                  <p className="text-sm font-arcade text-arcade-cream mt-2">
                    {state.players?.find(p => p.id === state.room?.winner_player_id)?.name}
                  </p>
                </section>
              )}
            </div>

            {/* RIGHT: Code Generation */}
            <div className="space-y-4">
              <section className="pixel-box p-6 rounded-lg" style={{
                '--border-color': '#ffd700',
                '--glow-color': 'rgba(255, 215, 0, 0.2)'
              } as React.CSSProperties}>
                <div className="flex items-center gap-2 mb-4">
                  <Key size={20} className="text-arcade-gold" />
                  <h2 className="text-sm font-arcade text-arcade-gold tracking-wider">RUNE CRAFTER</h2>
                </div>

                <div className="space-y-4">
                  {/* Type */}
                  <div>
                    <label className="block text-xs text-arcade-teal font-arcade mb-2">RUNE TYPE</label>
                    <select
                      value={effectType}
                      onChange={(e) => setEffectType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-black/50 border-2 border-arcade-teal rounded text-arcade-cream font-arcade text-xs focus:outline-none focus:border-arcade-gold"
                    >
                      <option value="self_add">BLESSING (+)</option>
                      <option value="self_subtract">CURSE (-)</option>
                      <option value="team_add">TEAM GIFT</option>
                    </select>
                  </div>

                  {/* Seconds */}
                  <div>
                    <label className="block text-xs text-arcade-purple font-arcade mb-2">POWER (SEC)</label>
                    <input
                      type="number"
                      value={seconds}
                      onChange={(e) => setSeconds(parseInt(e.target.value) || 0)}
                      min="5"
                      max="600"
                      className="w-full px-3 py-2 bg-black/50 border-2 border-arcade-purple rounded text-arcade-cream font-arcade text-xs focus:outline-none focus:border-arcade-gold tabular-nums"
                    />
                  </div>

                  {/* Count */}
                  <div>
                    <label className="block text-xs text-arcade-amber font-arcade mb-2">QUANTITY</label>
                    <input
                      type="number"
                      value={codeCount}
                      onChange={(e) => setCodeCount(parseInt(e.target.value) || 1)}
                      min="1"
                      max="20"
                      className="w-full px-3 py-2 bg-black/50 border-2 border-arcade-amber rounded text-arcade-cream font-arcade text-xs focus:outline-none focus:border-arcade-gold tabular-nums"
                    />
                  </div>

                  {/* Generate */}
                  <button
                    onClick={handleGenerateCodes}
                    disabled={generatingCodes}
                    className="w-full pixel-box py-3 rounded-lg font-arcade text-xs tracking-wider transition-all active:scale-95 disabled:opacity-50"
                    style={{
                      '--border-color': '#ffd700',
                      '--glow-color': 'rgba(255, 215, 0, 0.2)'
                    } as React.CSSProperties}
                  >
                    <span className="text-arcade-gold">
                      {generatingCodes ? 'CRAFTING...' : 'CRAFT RUNES'}
                    </span>
                  </button>
                </div>

                {/* Generated Codes */}
                {generatedCodes.length > 0 && (
                  <div className="mt-6 border-t-2 border-arcade-gold/30 pt-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-xs text-arcade-gold/70 font-arcade tracking-widest">
                        CRAFTED
                      </h3>
                      <button
                        onClick={copyAllCodes}
                        className="text-xs font-arcade text-arcade-teal hover:text-arcade-gold transition-colors"
                      >
                        COPY ALL
                      </button>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto tome-scrollbar">
                      {generatedCodes.map((code, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded bg-black/50 border border-arcade-gold/30"
                        >
                          <span className="font-mono text-xs text-arcade-cream">{code}</span>
                          <button
                            onClick={() => copyCode(code)}
                            className="p-1 hover:bg-arcade-teal/20 rounded text-arcade-teal transition-colors"
                          >
                            {lastCopied === code ? '✓' : <Copy size={14} />}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              {/* Recent Events */}
              <section className="pixel-box p-6 rounded-lg" style={{
                '--border-color': '#40e0d0',
                '--glow-color': 'rgba(64, 224, 208, 0.2)'
              } as React.CSSProperties}>
                <h2 className="text-sm font-arcade text-arcade-teal tracking-wider mb-4">
                  RECENT EVENTS
                </h2>
                <div className="space-y-2 max-h-48 overflow-y-auto tome-scrollbar">
                  {!state.recent_events || state.recent_events.length === 0 ? (
                    <div className="text-center text-arcade-cream/30 text-xs font-arcade py-4">
                      NO EVENTS
                    </div>
                  ) : (
                    state.recent_events?.slice(0, 10).map((event) => (
                      <div
                        key={event.id}
                        className="flex items-start gap-2 text-xs p-2 bg-black/30 rounded border-l-2 border-arcade-teal/50"
                      >
                        {getEffectIcon(event.type)}
                        <div className="flex-1 text-arcade-cream/80 font-arcade text-[10px] leading-relaxed">
                          {event.type === 'player_joined' && `${event.payload?.name || 'Player'} joined`}
                          {event.type === 'game_started' && 'Ritual begun'}
                          {event.type === 'player_eliminated' && `${event.payload?.name || 'Player'} eliminated`}
                          {event.type === 'code_used' && `Code used: ${getEffectLabel(event.payload?.effect_type)}`}
                          {event.type === 'time_adjust' && `Time adjusted`}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>

        <VersionFooter />
      </div>
    </>
  );
}
