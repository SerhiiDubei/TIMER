import type { NextApiRequest, NextApiResponse } from 'next';
import { getServiceSupabase } from '@/lib/supabase';
import { generateGameCode, hashCode } from '@/lib/utils';
import { GenerateCodesRequest, GenerateCodesResponse } from '@/lib/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GenerateCodesResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { room_id, admin_key, batch } = req.body as GenerateCodesRequest;

    if (!room_id || !admin_key || !batch || !Array.isArray(batch)) {
      return res.status(400).json({ error: 'Missing or invalid fields' });
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

    // Generate codes
    const codes: string[] = [];
    const codeInserts = [];

    for (const item of batch) {
      const code = generateGameCode();
      const codeHash = await hashCode(code);

      codeInserts.push({
        room_id,
        code_hash: codeHash,
        effect_type: item.effect_type,
        payload: item.payload,
        expires_at: item.expires_at || null
      });

      codes.push(code);
    }

    // Insert codes
    const { error: insertError } = await supabase
      .from('codes')
      .insert(codeInserts);

    if (insertError) throw insertError;

    res.status(200).json({ codes });
  } catch (error: any) {
    console.error('Generate codes error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate codes' });
  }
}
