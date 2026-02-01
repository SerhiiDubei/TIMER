-- ===================================
-- FIX: auto_eliminate_players - виправлення ambiguous column reference
-- ===================================

-- Спочатку видаляємо стару версію
DROP FUNCTION IF EXISTS auto_eliminate_players();

-- Створюємо нову правильну версію
CREATE OR REPLACE FUNCTION auto_eliminate_players()
RETURNS TABLE(eliminated_count INTEGER, affected_room_id UUID) AS $$
DECLARE
    v_eliminated INTEGER;
    v_room RECORD;
    v_alive_count INTEGER;
    v_winner_id UUID;
BEGIN
    -- Елімінуємо всіх гравців у яких час вийшов
    WITH eliminated AS (
        UPDATE players
        SET eliminated_at = NOW()
        WHERE should_eliminate_at <= NOW()
        AND eliminated_at IS NULL
        RETURNING id, room_id, name
    ), logged AS (
        INSERT INTO events (room_id, type, target_player_id, payload)
        SELECT 
            e.room_id,
            'player_eliminated',
            e.id,
            jsonb_build_object('name', e.name, 'time', NOW())
        FROM eliminated e
        RETURNING room_id
    )
    SELECT COUNT(*)::INTEGER, l.room_id 
    INTO v_eliminated, affected_room_id
    FROM logged l
    GROUP BY l.room_id;
    
    -- Перевіряємо чи є переможець в кожній кімнаті
    FOR v_room IN 
        SELECT DISTINCT r.id as room_id_value
        FROM rooms r
        WHERE r.status = 'running'
    LOOP
        SELECT COUNT(*) INTO v_alive_count
        FROM players p
        WHERE p.room_id = v_room.room_id_value
        AND p.eliminated_at IS NULL;
        
        -- Якщо залишився 1 гравець - отримуємо його ID
        IF v_alive_count = 1 THEN
            SELECT p.id INTO v_winner_id
            FROM players p
            WHERE p.room_id = v_room.room_id_value
            AND p.eliminated_at IS NULL
            LIMIT 1;
        END IF;
        
        IF v_alive_count = 1 AND v_winner_id IS NOT NULL THEN
            -- Є переможець!
            UPDATE rooms
            SET status = 'finished', winner_player_id = v_winner_id
            WHERE id = v_room.room_id_value;
            
            -- Не створюємо event - winner вже записаний в rooms.winner_player_id
        END IF;
    END LOOP;
    
    RETURN QUERY 
    SELECT v_eliminated, affected_room_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Тестуємо:
SELECT * FROM auto_eliminate_players();
