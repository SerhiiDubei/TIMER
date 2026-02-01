import type { NextApiRequest, NextApiResponse } from 'next';
import { getServiceSupabase } from '@/lib/supabase';

// НОВА АРХІТЕКТУРА: База САМА знає коли елімінувати!
// Цей endpoint просто каже базі "перевір чи є кого елімінувати ЗАРАЗ"
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ eliminated_count: number } | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { secret } = req.body;
    if (secret !== process.env.CRON_SECRET && process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const supabase = getServiceSupabase();

    // Викликаємо функцію auto_eliminate_players()
    // База САМА знає кого елімінувати (по should_eliminate_at <= NOW())
    const { data, error } = await supabase
      .rpc('auto_eliminate_players');

    if (error) {
      console.error('[AUTO-ELIMINATE] Error:', error);
      throw error;
    }

    const eliminatedCount = data?.reduce((sum: number, row: any) => sum + (row.eliminated_count || 0), 0) || 0;
    
    console.log(`[AUTO-ELIMINATE] Eliminated ${eliminatedCount} players`);

    res.status(200).json({
      eliminated_count: eliminatedCount
    });
  } catch (error: any) {
    console.error('[AUTO-ELIMINATE] Fatal error:', error);
    res.status(500).json({ error: error.message || 'Failed to auto-eliminate' });
  }
}
