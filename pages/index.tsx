import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
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
        <title>Lobby Timer Game</title>
        <meta name="description" content="Multiplayer timer game with lobby" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
            <h1 className="text-4xl font-bold text-white text-center mb-8">
              ⏱️ Timer Game
            </h1>

            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Room Code
                </label>
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  maxLength={6}
                  className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 uppercase"
                  required
                />
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your name"
                  maxLength={50}
                  className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-200 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                {loading ? 'Joining...' : 'Join Game'}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-white/20">
              <button
                onClick={handleCreateRoom}
                className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-4 rounded-lg transition-colors border border-white/30"
              >
                Create New Room (Admin)
              </button>
            </div>
          </div>

          <p className="text-white/60 text-center mt-4 text-sm">
            Enter the room code shared by your game admin
          </p>
        </div>
        <VersionFooter />
      </div>

      <style jsx global>{`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
            'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
            sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
      `}</style>
    </>
  );
}
