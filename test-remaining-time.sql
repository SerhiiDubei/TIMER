-- TEST: Check if calculate_remaining_time works

-- Replace with YOUR actual room_id and player_id
SELECT 
    p.id as player_id,
    p.name,
    r.started_at,
    r.base_seconds,
    EXTRACT(EPOCH FROM (NOW() - r.started_at))::INTEGER as elapsed_seconds,
    calculate_remaining_time(p.id, r.id) as remaining_time
FROM players p
JOIN rooms r ON r.id = p.room_id
WHERE r.status = 'running'
AND p.eliminated_at IS NULL;

-- If remaining_time shows correct negative numbers, then check_eliminations should work
-- Run this in Supabase SQL Editor to debug
