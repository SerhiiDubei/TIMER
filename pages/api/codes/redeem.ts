import type { NextApiRequest, NextApiResponse } from 'next';
import { getServiceSupabase } from '@/lib/supabase';
import { verifyCode } from '@/lib/utils';
import { RedeemCodeRequest, RedeemCodeResponse, Event } from '@/lib/types';

// Rate limiting map: player_id -> array of timestamps
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 10000; // 10 seconds
const RATE_LIMIT_MAX = 5; // 5 attempts per window

function checkRateLimit(playerId: string): boolean {
  const now = Date.now();
  const attempts = rateLimitMap.get(playerId) || [];
  
  // Remove old attempts outside window
  const recentAttempts = attempts.filter(t => now - t < RATE_LIMIT_WINDOW);
  
  if (recentAttempts.length >= RATE_LIMIT_MAX) {
    return false; // Rate limited
  }
  
  recentAttempts.push(now);
  rateLimitMap.set(playerId, recentAttempts);
  return true;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RedeemCodeResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { room_id, player_id, code } = req.body as RedeemCodeRequest;

    if (!room_id || !player_id || !code) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Rate limiting
    if (!checkRateLimit(player_id)) {
      return res.status(429).json({ 
        success: false, 
        message: 'Too many attempts. Please wait.' 
      });
    }

    const supabase = getServiceSupabase();

    // Check room status
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', room_id)
      .single();

    if (roomError || !room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    if (room.status !== 'running') {
      return res.status(400).json({ success: false, message: 'Game is not running' });
    }

    // Check player status
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('*')
      .eq('id', player_id)
      .eq('room_id', room_id)
      .single();

    if (playerError || !player) {
      return res.status(404).json({ success: false, message: 'Player not found' });
    }

    if (player.eliminated_at) {
      return res.status(400).json({ success: false, message: 'You are eliminated' });
    }

    // Find code (check all unused codes in room)
    const { data: codes, error: codesError } = await supabase
      .from('codes')
      .select('*')
      .eq('room_id', room_id)
      .is('used_at', null);

    if (codesError || !codes || codes.length === 0) {
      return res.status(404).json({ success: false, message: 'Invalid code' });
    }

    // Verify code against hashes
    let matchedCode = null;
    for (const c of codes) {
      if (await verifyCode(code.toUpperCase(), c.code_hash)) {
        matchedCode = c;
        break;
      }
    }

    if (!matchedCode) {
      return res.status(404).json({ success: false, message: 'Invalid code' });
    }

    // Check expiration
    if (matchedCode.expires_at && new Date(matchedCode.expires_at) < new Date()) {
      return res.status(400).json({ success: false, message: 'Code expired' });
    }

    // Execute code effect atomically
    const createdEvents: Event[] = [];

    // Mark code as used
    const { error: updateError } = await supabase
      .from('codes')
      .update({
        used_at: new Date().toISOString(),
        used_by_player_id: player_id
      })
      .eq('id', matchedCode.id);

    if (updateError) throw updateError;

    // Log code_used event
    const { data: codeUsedEvent } = await supabase
      .from('events')
      .insert({
        room_id,
        type: 'code_used',
        actor_player_id: player_id,
        payload: { code_id: matchedCode.id, effect_type: matchedCode.effect_type }
      })
      .select()
      .single();

    if (codeUsedEvent) createdEvents.push(codeUsedEvent);

    // Apply effect based on type
    switch (matchedCode.effect_type) {
      case 'self_add':
      case 'self_subtract': {
        const seconds = matchedCode.payload.seconds;
        const { data: adjustEvent } = await supabase
          .from('events')
          .insert({
            room_id,
            type: 'time_adjust',
            actor_player_id: player_id,
            target_player_id: player_id,
            time_delta_seconds: seconds,
            payload: { reason: matchedCode.effect_type }
          })
          .select()
          .single();
        if (adjustEvent) createdEvents.push(adjustEvent);
        break;
      }

      case 'steal': {
        const { from_player_id, seconds } = matchedCode.payload;
        // Subtract from target
        const { data: stealEvent1 } = await supabase
          .from('events')
          .insert({
            room_id,
            type: 'time_adjust',
            actor_player_id: player_id,
            target_player_id: from_player_id,
            time_delta_seconds: -seconds,
            payload: { reason: 'stolen_by', stolen_by: player_id }
          })
          .select()
          .single();
        // Add to actor
        const { data: stealEvent2 } = await supabase
          .from('events')
          .insert({
            room_id,
            type: 'time_adjust',
            actor_player_id: player_id,
            target_player_id: player_id,
            time_delta_seconds: seconds,
            payload: { reason: 'stolen_from', stolen_from: from_player_id }
          })
          .select()
          .single();
        if (stealEvent1) createdEvents.push(stealEvent1);
        if (stealEvent2) createdEvents.push(stealEvent2);
        break;
      }

      case 'team_add': {
        const { seconds, scope, player_ids } = matchedCode.payload;
        let targets: string[] = [];
        
        if (scope === 'all') {
          const { data: allPlayers } = await supabase
            .from('players')
            .select('id')
            .eq('room_id', room_id)
            .is('eliminated_at', null);
          targets = allPlayers?.map(p => p.id) || [];
        } else if (scope === 'list' && player_ids) {
          targets = player_ids;
        }

        for (const target_id of targets) {
          const { data: teamEvent } = await supabase
            .from('events')
            .insert({
              room_id,
              type: 'time_adjust',
              actor_player_id: player_id,
              target_player_id: target_id,
              time_delta_seconds: seconds,
              payload: { reason: 'team_add' }
            })
            .select()
            .single();
          if (teamEvent) createdEvents.push(teamEvent);
        }
        break;
      }
    }

    // Check for eliminations
    await supabase.rpc('check_eliminations', { p_room_id: room_id });

    // Calculate new remaining time
    const { data: remaining } = await supabase
      .rpc('calculate_remaining_time', {
        p_player_id: player_id,
        p_room_id: room_id
      });

    res.status(200).json({
      success: true,
      remaining: remaining ?? undefined,
      message: 'Code redeemed successfully',
      events: createdEvents
    });
  } catch (error: any) {
    console.error('Redeem code error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to redeem code' 
    });
  }
}
