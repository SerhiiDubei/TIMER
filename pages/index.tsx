import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'head';
import { Gamepad2, Users, Shield, Sparkles } from 'lucide-react';
import Starfield from '@/components/Starfield';
import VersionFooter from '@/components/VersionFooter';

export default function Home() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_code: roomCode.toUpperCase(),
          name: playerName
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join room');
      }

      // Store player info in sessionStorage
      sessionStorage.setItem('player_id', data.player_id);
      sessionStorage.setItem('room_id', data.room_id);
      sessionStorage.setItem('player_name', playerName);

      router.push(`/room/${data.room_id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = () => {
    router.push('/admin/create');
  };

  return (
    <>
      <Head>
        <title>⏱️ Arcane Timer Arena</title>
        <meta name="description" content="Pixel-style multiplayer timer game" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <Starfield />

      <div className="min-h-screen flex items-center justify-center p-4 md:p-8 relative z-10">
        <div className="max-w-md w-full">
          {/* Arcade Cabinet Style */}
          <div className="pixel-box p-8 rounded-lg" style={{
            '--border-color': '#ffd700',
            '--glow-color': 'rgba(255, 215, 0, 0.2)'
          } as React.CSSProperties}>
            
            {/* Title */}
            <div className="text-center mb-8">
              <div className="flex justify-center items-center gap-3 mb-4">
                <Gamepad2 size={32} className="text-arcade-gold animate-pulse" />
                <Sparkles size={24} className="text-arcade-purple animate-float" />
              </div>
              <h1 className="text-2xl md:text-3xl font-arcade text-arcade-gold text-glow-gold mb-2 tracking-wider">
                ARCANE TIMER
              </h1>
              <p className="text-xs text-arcade-cream/60 tracking-widest">
                ARENA
              </p>
            </div>

            {/* Join Form */}
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-arcade-teal text-xs font-arcade mb-2 tracking-wider">
                  ROOM CODE
                </label>
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  maxLength={6}
                  className="w-full px-4 py-3 bg-black/50 border-2 border-arcade-teal rounded-lg text-arcade-cream placeholder-arcade-cream/30 focus:outline-none focus:border-arcade-gold focus:shadow-[0_0_10px_rgba(255,215,0,0.3)] uppercase font-arcade text-sm transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-arcade-purple text-xs font-arcade mb-2 tracking-wider">
                  YOUR NAME
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="PLAYER"
                  maxLength={20}
                  className="w-full px-4 py-3 bg-black/50 border-2 border-arcade-purple rounded-lg text-arcade-cream placeholder-arcade-cream/30 focus:outline-none focus:border-arcade-gold focus:shadow-[0_0_10px_rgba(255,215,0,0.3)] font-arcade text-sm transition-all"
                  required
                />
              </div>

              {error && (
                <div className="pixel-box p-3 rounded-lg text-xs font-arcade text-arcade-red" style={{
                  '--border-color': '#ff4757',
                  '--glow-color': 'rgba(255, 71, 87, 0.3)'
                } as React.CSSProperties}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full pixel-box py-4 rounded-lg font-arcade text-sm tracking-wider transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(57,255,20,0.4)]"
                style={{
                  '--border-color': '#39ff14',
                  '--glow-color': 'rgba(57, 255, 20, 0.2)'
                } as React.CSSProperties}
              >
                <div className="flex items-center justify-center gap-2">
                  <Users size={16} className="text-arcade-green" />
                  <span className="text-arcade-green">
                    {loading ? 'JOINING...' : 'JOIN GAME'}
                  </span>
                </div>
              </button>
            </form>

            {/* Divider */}
            <div className="my-6 border-t-2 border-arcade-gold/30"></div>

            {/* Create Room Button */}
            <button
              onClick={handleCreateRoom}
              className="w-full pixel-box py-4 rounded-lg font-arcade text-sm tracking-wider transition-all active:scale-95 hover:shadow-[0_0_20px_rgba(244,162,97,0.4)]"
              style={{
                '--border-color': '#f4a261',
                '--glow-color': 'rgba(244, 162, 97, 0.2)'
              } as React.CSSProperties}
            >
              <div className="flex items-center justify-center gap-2">
                <Shield size={16} className="text-arcade-amber" />
                <span className="text-arcade-amber">
                  CREATE ROOM
                </span>
              </div>
            </button>
          </div>

          {/* Footer hint */}
          <p className="text-arcade-cream/40 text-center mt-6 text-xs font-arcade tracking-wider">
            ENTER CODE FROM ADMIN
          </p>
        </div>
        
        <VersionFooter />
      </div>
    </>
  );
}
