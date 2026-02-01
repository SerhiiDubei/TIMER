import type { NextApiRequest, NextApiResponse } from 'next';
import { getServiceSupabase } from '@/lib/supabase';
import { generateRoomCode, generateAdminKey } from '@/lib/utils';
import { CreateRoomResponse } from '@/lib/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CreateRoomResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = getServiceSupabase();
    const { base_seconds = 1200 } = req.body;

    // Generate unique room code
    let roomCode = generateRoomCode();
    let attempts = 0;
    
    while (attempts < 10) {
      const { data: existing } = await supabase
        .from('rooms')
        .select('id')
        .eq('room_code', roomCode)
        .single();
      
      if (!existing) break;
      roomCode = generateRoomCode();
      attempts++;
    }

    const adminKey = generateAdminKey();

    // Create room
    const { data: room, error } = await supabase
      .from('rooms')
      .insert({
        room_code: roomCode,
        status: 'lobby',
        admin_key: adminKey,
        base_seconds
      })
      .select()
      .single();

    if (error) throw error;

    res.status(200).json({
      room_code: room.room_code,
      admin_key: adminKey,
      room_id: room.id
    });
  } catch (error: any) {
    console.error('Create room error:', error);
    res.status(500).json({ error: error.message || 'Failed to create room' });
  }
}
