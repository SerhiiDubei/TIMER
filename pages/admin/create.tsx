import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Shield, Clock, Sparkles, ChevronUp, ChevronDown } from 'lucide-react';
import Starfield from '@/components/Starfield';

export default function CreateRoom() {
  const router = useRouter();
  const [roomName, setRoomName] = useState('');
  const [baseMinutes, setBaseMinutes] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const adjustMinutes = (delta: number) => {
    setBaseMinutes(prev => Math.max(1, Math.min(60, prev + delta)));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_name: roomName.trim() || undefined,
          base_seconds: baseMinutes * 60
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create room');
      }

      // Store admin credentials
      sessionStorage.setItem('admin_key', data.admin_key);
      sessionStorage.setItem('room_id', data.room_id);
      sessionStorage.setItem('room_code', data.room_code);
      sessionStorage.setItem('is_admin', 'true');

      router.push(`/admin/manage/${data.room_id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>🛡️ Create Room - Archmage</title>
      </Head>

      <Starfield />

      <div className="min-h-screen flex items-center justify-center p-4 md:p-8 relative z-10">
        <div className="max-w-md w-full">
          <div className="pixel-box p-8 rounded-lg" style={{
            '--border-color': '#f4a261',
            '--glow-color': 'rgba(244, 162, 97, 0.2)'
          } as React.CSSProperties}>
            
            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex justify-center items-center gap-3 mb-4">
                <Shield size={32} className="text-arcade-amber animate-pulse" />
                <Sparkles size={24} className="text-arcade-gold animate-float" />
              </div>
              <h1 className="text-xl md:text-2xl font-arcade text-arcade-amber text-glow-amber mb-2 tracking-wider">
                ARCHMAGE SANCTUM
              </h1>
              <p className="text-xs text-arcade-cream/60 tracking-widest font-arcade">
                CREATE RITUAL
              </p>
            </div>

            <form onSubmit={handleCreate} className="space-y-6">
              {/* Room Name */}
              <div>
                <label className="block text-arcade-gold text-xs font-arcade mb-2 tracking-wider">
                  RITUAL NAME
                </label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="EPIC BATTLE"
                  maxLength={30}
                  className="w-full px-4 py-3 bg-black/50 border-2 border-arcade-gold rounded-lg text-arcade-cream placeholder-arcade-cream/30 focus:outline-none focus:border-arcade-amber focus:shadow-[0_0_10px_rgba(244,162,97,0.3)] font-arcade text-sm uppercase transition-all"
                />
                <p className="text-arcade-cream/40 text-[10px] mt-1 font-arcade">
                  OPTIONAL
                </p>
              </div>

              {/* Base Time */}
              <div>
                <label className="block text-arcade-teal text-xs font-arcade mb-2 tracking-wider">
                  BASE TIME
                </label>
                
                <div className="pixel-box p-4 rounded-lg flex items-center justify-between" style={{
                  '--border-color': '#40e0d0',
                  '--glow-color': 'rgba(64, 224, 208, 0.2)'
                } as React.CSSProperties}>
                  <button
                    type="button"
                    onClick={() => adjustMinutes(-1)}
                    className="w-12 h-12 bg-arcade-teal/20 border-2 border-arcade-teal rounded-lg flex items-center justify-center hover:bg-arcade-teal/30 active:scale-95 transition-all"
                  >
                    <ChevronDown size={20} className="text-arcade-teal" />
                  </button>

                  <div className="flex items-center gap-2">
                    <Clock size={24} className="text-arcade-teal animate-pulse" />
                    <span className="text-3xl font-arcade text-arcade-teal text-glow-teal tabular-nums">
                      {baseMinutes.toString().padStart(2, '0')}
                    </span>
                    <span className="text-sm font-arcade text-arcade-teal/60">
                      MIN
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => adjustMinutes(1)}
                    className="w-12 h-12 bg-arcade-teal/20 border-2 border-arcade-teal rounded-lg flex items-center justify-center hover:bg-arcade-teal/30 active:scale-95 transition-all"
                  >
                    <ChevronUp size={20} className="text-arcade-teal" />
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="pixel-box p-3 rounded-lg text-xs font-arcade text-arcade-red" style={{
                  '--border-color': '#ff4757',
                  '--glow-color': 'rgba(255, 71, 87, 0.3)'
                } as React.CSSProperties}>
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full pixel-box py-4 rounded-lg font-arcade text-sm tracking-wider transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(224,86,253,0.4)]"
                style={{
                  '--border-color': '#e056fd',
                  '--glow-color': 'rgba(224, 86, 253, 0.2)'
                } as React.CSSProperties}
              >
                <div className="flex items-center justify-center gap-2">
                  <Shield size={16} className="text-arcade-purple" />
                  <span className="text-arcade-purple">
                    {loading ? 'CREATING...' : 'BEGIN RITUAL'}
                  </span>
                </div>
              </button>
            </form>

            {/* Back button */}
            <button
              onClick={() => router.push('/')}
              className="w-full mt-4 py-2 text-xs font-arcade text-arcade-cream/60 hover:text-arcade-cream transition-colors"
            >
              ← BACK
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
