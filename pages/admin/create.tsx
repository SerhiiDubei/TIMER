import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function CreateRoom() {
  const router = useRouter();
  const [roomName, setRoomName] = useState('');
  const [baseMinutes, setBaseMinutes] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
        <title>Create Room - Admin</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
            <h1 className="text-3xl font-bold text-white text-center mb-2">
              🎮 Create Game Room
            </h1>
            <p className="text-white/60 text-center mb-6 text-sm">
              Set up a new game as admin
            </p>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Room Name (optional)
                </label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="My Epic Game"
                  maxLength={50}
                  className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-white/50 text-xs mt-1">
                  Give your room a custom name (optional)
                </p>
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Starting Time (minutes)
                </label>
                <input
                  type="number"
                  value={baseMinutes}
                  onChange={(e) => setBaseMinutes(parseInt(e.target.value) || 20)}
                  min={1}
                  max={120}
                  className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
                <p className="text-white/50 text-xs mt-1">
                  Each player will start with this amount of time
                </p>
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
                {loading ? 'Creating...' : 'Create Room'}
              </button>
            </form>

            <button
              onClick={() => router.push('/')}
              className="w-full mt-4 bg-white/10 hover:bg-white/20 text-white py-2 px-4 rounded-lg transition-colors text-sm"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
