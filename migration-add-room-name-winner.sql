-- Migration: Add room_name and winner_player_id columns
-- Run this in Supabase SQL Editor

-- Add new columns to rooms table
ALTER TABLE rooms 
ADD COLUMN IF NOT EXISTS room_name TEXT,
ADD COLUMN IF NOT EXISTS winner_player_id UUID;

-- Update the check_eliminations function to check for winner
CREATE OR REPLACE FUNCTION check_eliminations(p_room_id UUID)
RETURNS TABLE(player_id UUID, player_name TEXT) AS $$
DECLARE
    v_player RECORD;
    v_remaining INTEGER;
    v_alive_count INTEGER;
    v_winner_id UUID;
BEGIN
    -- Loop through all alive players in the room
    FOR v_player IN 
        SELECT id, name, room_id
        FROM players
        WHERE room_id = p_room_id
        AND eliminated_at IS NULL
    LOOP
        -- Calculate their remaining time
        v_remaining := calculate_remaining_time(v_player.id, p_room_id);
        
        -- If time is up, eliminate them
        IF v_remaining <= 0 THEN
            UPDATE players
            SET eliminated_at = NOW()
            WHERE id = v_player.id;
            
            -- Log elimination event
            INSERT INTO events (room_id, type, target_player_id, payload)
            VALUES (p_room_id, 'player_eliminated', v_player.id, jsonb_build_object('remaining', v_remaining));
            
            -- Return eliminated player info
            player_id := v_player.id;
            player_name := v_player.name;
            RETURN NEXT;
        END IF;
    END LOOP;

    -- Check if only 1 player remains alive - they win!
    SELECT COUNT(*), MAX(id) INTO v_alive_count, v_winner_id
    FROM players
    WHERE room_id = p_room_id
    AND eliminated_at IS NULL;

    IF v_alive_count = 1 THEN
        -- Set room to finished and mark winner
        UPDATE rooms
        SET status = 'finished', winner_player_id = v_winner_id
        WHERE id = p_room_id;

        -- Log game finished event
        INSERT INTO events (room_id, type, target_player_id, payload)
        VALUES (p_room_id, 'game_finished', v_winner_id, jsonb_build_object('winner_id', v_winner_id));
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
