import type { NextApiRequest, NextApiResponse } from 'next';
import { getServiceSupabase } from '@/lib/supabase';
import { JoinRoomRequest, JoinRoomResponse } from '@/lib/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<JoinRoomResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { room_code, name } = req.body as JoinRoomRequest;

    if (!room_code || !name) {
      return res.status(400).json({ error: 'Room code and name are required' });
    }

    if (name.length > 50) {
      return res.status(400).json({ error: 'Name too long (max 50 characters)' });
    }

    const supabase = getServiceSupabase();

    // Find room
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('room_code', room_code.toUpperCase())
      .single();

    if (roomError || !room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Check if room is joinable
    if (room.status === 'finished') {
      return res.status(400).json({ error: 'Game has finished' });
    }

    // Create player
    const { data: player, error: playerError } = await supabase
      .from('players')
      .insert({
        room_id: room.id,
        name: name.trim(),
        is_admin: false
      })
      .select()
      .single();

    if (playerError) throw playerError;

    // Log player_joined event
    await supabase
      .from('events')
      .insert({
        room_id: room.id,
        type: 'player_joined',
        actor_player_id: player.id,
        target_player_id: player.id,
        payload: { name: player.name }
      });

    res.status(200).json({
      room_id: room.id,
      player_id: player.id,
      player
    });
  } catch (error: any) {
    console.error('Join room error:', error);
    res.status(500).json({ error: error.message || 'Failed to join room' });
  }
}
