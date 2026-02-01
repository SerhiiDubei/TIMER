import type { NextApiRequest, NextApiResponse } from 'next';
import { getServiceSupabase } from '@/lib/supabase';
import { StartGameRequest } from '@/lib/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ success: boolean; started_at: string } | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { room_id, admin_key } = req.body as StartGameRequest;

    if (!room_id || !admin_key) {
      return res.status(400).json({ error: 'Room ID and admin key are required' });
    }

    const supabase = getServiceSupabase();

    // Verify admin key
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', room_id)
      .single();

    if (roomError || !room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.admin_key !== admin_key) {
      return res.status(403).json({ error: 'Invalid admin key' });
    }

    if (room.status !== 'lobby') {
      return res.status(400).json({ error: 'Game already started or finished' });
    }

    // Check minimum players (need at least 2)
    const { data: players } = await supabase
      .from('players')
      .select('id')
      .eq('room_id', room_id)
      .is('eliminated_at', null);

    if (!players || players.length < 2) {
      return res.status(400).json({ error: 'Need at least 2 players to start the game' });
    }

    // Start game
    const started_at = new Date().toISOString();
    
    const { error: updateError } = await supabase
      .from('rooms')
      .update({
        status: 'running',
        started_at
      })
      .eq('id', room_id);

    if (updateError) throw updateError;

    // Log game_started event
    await supabase
      .from('events')
      .insert({
        room_id,
        type: 'game_started',
        payload: { started_at }
      });

    res.status(200).json({
      success: true,
      started_at
    });
  } catch (error: any) {
    console.error('Start game error:', error);
    res.status(500).json({ error: error.message || 'Failed to start game' });
  }
}
