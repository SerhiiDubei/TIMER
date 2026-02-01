import type { NextApiRequest, NextApiResponse } from 'next';
import { getServiceSupabase } from '@/lib/supabase';

// Periodic job endpoint to check all active rooms for eliminations
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ checked: number; eliminated: any[] } | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Optional: Add a secret key check for security
    const { secret } = req.body;
    if (secret !== process.env.CRON_SECRET && process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const supabase = getServiceSupabase();

    // Get all running rooms
    const { data: rooms, error: roomsError } = await supabase
      .from('rooms')
      .select('id')
      .eq('status', 'running');

    if (roomsError) throw roomsError;

    if (!rooms || rooms.length === 0) {
      return res.status(200).json({ checked: 0, eliminated: [] });
    }

    // Check eliminations for each room
    const allEliminated = [];
    for (const room of rooms) {
      console.log(`[CHECK-ELIMINATIONS] Checking room ${room.id}`);
      
      const { data: eliminated, error } = await supabase
        .rpc('check_eliminations', { p_room_id: room.id });

      if (error) {
        console.error(`[CHECK-ELIMINATIONS] Error for room ${room.id}:`, error);
      } else {
        console.log(`[CHECK-ELIMINATIONS] Room ${room.id} eliminated:`, eliminated);
        if (eliminated) {
          allEliminated.push(...eliminated);
        }
      }
    }

    res.status(200).json({
      checked: rooms.length,
      eliminated: allEliminated
    });
  } catch (error: any) {
    console.error('Check eliminations error:', error);
    res.status(500).json({ error: error.message || 'Failed to check eliminations' });
  }
}
