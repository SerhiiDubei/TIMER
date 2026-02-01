import type { NextApiRequest, NextApiResponse } from 'next';
import { getServiceSupabase } from '@/lib/supabase';
import { RoomState } from '@/lib/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RoomState | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { room_id, player_id } = req.query;

    if (!room_id || typeof room_id !== 'string') {
      return res.status(400).json({ error: 'Room ID is required' });
    }

    const supabase = getServiceSupabase();

    // Get room
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', room_id)
      .single();

    if (roomError || !room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Get players
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', room_id)
      .order('joined_at', { ascending: true });

    if (playersError) throw playersError;

    // Get recent events (last 10)
    const { data: recent_events, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .eq('room_id', room_id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (eventsError) throw eventsError;

    const state: RoomState = {
      room,
      players: players || [],
      recent_events: recent_events || []
    };

    // If player_id provided, calculate their remaining time
    if (player_id && typeof player_id === 'string') {
      const { data: remainingData } = await supabase
        .rpc('calculate_remaining_time', {
          p_player_id: player_id,
          p_room_id: room_id
        });

      if (remainingData !== null) {
        state.my_remaining = remainingData;
      }

      // Calculate adjustments
      const { data: adjustments } = await supabase
        .from('events')
        .select('time_delta_seconds')
        .eq('room_id', room_id)
        .eq('target_player_id', player_id)
        .eq('type', 'time_adjust');

      if (adjustments) {
        state.my_adjustments = adjustments.reduce((sum, e) => sum + e.time_delta_seconds, 0);
      }
    }

    res.status(200).json(state);
  } catch (error: any) {
    console.error('Get state error:', error);
    res.status(500).json({ error: error.message || 'Failed to get room state' });
  }
}
