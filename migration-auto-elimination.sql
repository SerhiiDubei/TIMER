-- ===================================
-- MIGRATION: Add auto-elimination architecture
-- ===================================

-- 1. Додаємо колонку з ТОЧНИМ часом елімінації
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS should_eliminate_at TIMESTAMPTZ;

-- 2. Індекс для швидкої перевірки
CREATE INDEX IF NOT EXISTS idx_players_should_eliminate 
ON players(should_eliminate_at) 
WHERE should_eliminate_at IS NOT NULL AND eliminated_at IS NULL;

-- 3. Функція для розрахунку часу елімін��ції
CREATE OR REPLACE FUNCTION calculate_elimination_time(
    p_player_id UUID,
    p_room_id UUID
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
    v_started_at TIMESTAMPTZ;
    v_base_seconds INTEGER;
    v_adjustments INTEGER;
    v_elimination_time TIMESTAMPTZ;
BEGIN
    -- Отримуємо дані кімнати
    SELECT started_at, base_seconds INTO v_started_at, v_base_seconds
    FROM rooms
    WHERE id = p_room_id;
    
    -- Якщо гра не почалась - повертаємо NULL
    IF v_started_at IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Сума всіх time adjustments для цього гравця
    SELECT COALESCE(SUM(time_delta_seconds), 0) INTO v_adjustments
    FROM events
    WHERE room_id = p_room_id
    AND target_player_id = p_player_id
    AND type = 'time_adjust';
    
    -- Розраховуємо ТОЧНИЙ час елімінації
    v_elimination_time := v_started_at + (v_base_seconds + v_adjustments) * INTERVAL '1 second';
    
    RETURN v_elimination_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Функція для оновлення should_eliminate_at
CREATE OR REPLACE FUNCTION update_player_elimination_time()
RETURNS TRIGGER AS $$
BEGIN
    -- Якщо це time_adjust event
    IF NEW.type = 'time_adjust' AND NEW.target_player_id IS NOT NULL THEN
        -- Перераховуємо час елімінації для цього гравця
        UPDATE players
        SET should_eliminate_at = calculate_elimination_time(NEW.target_player_id, NEW.room_id)
        WHERE id = NEW.target_player_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Тригер на events - автоматично оновлює should_eliminate_at
DROP TRIGGER IF EXISTS trigger_update_elimination_time ON events;
CREATE TRIGGER trigger_update_elimination_time
    AFTER INSERT ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_player_elimination_time();

-- 6. Функція для оновлення всіх гравців після старту гри
CREATE OR REPLACE FUNCTION update_all_players_elimination_time()
RETURNS TRIGGER AS $$
BEGIN
    -- Якщо гра тільки що почалась
    IF OLD.status = 'lobby' AND NEW.status = 'running' AND NEW.started_at IS NOT NULL THEN
        -- Встановлюємо should_eliminate_at для ВСІХ гравців кімнати
        UPDATE players
        SET should_eliminate_at = calculate_elimination_time(id, NEW.id)
        WHERE room_id = NEW.id
        AND eliminated_at IS NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Тригер на rooms - встановлює should_eliminate_at при старті
DROP TRIGGER IF EXISTS trigger_game_start ON rooms;
CREATE TRIGGER trigger_game_start
    AFTER UPDATE ON rooms
    FOR EACH ROW
    EXECUTE FUNCTION update_all_players_elimination_time();

-- 8. ГОЛОВНА ФУНКЦІЯ - автоматична елімінація
CREATE OR REPLACE FUNCTION auto_eliminate_players()
RETURNS TABLE(eliminated_count INTEGER, room_id UUID) AS $$
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
    INTO v_eliminated, room_id
    FROM logged l
    GROUP BY l.room_id;
    
    -- Перевіряємо чи є переможець в кожній кімнаті
    FOR v_room IN 
        SELECT DISTINCT r.id as room_id
        FROM rooms r
        WHERE r.status = 'running'
    LOOP
        SELECT COUNT(*), MAX(id) INTO v_alive_count, v_winner_id
        FROM players
        WHERE room_id = v_room.room_id
        AND eliminated_at IS NULL;
        
        IF v_alive_count = 1 THEN
            -- Є переможець!
            UPDATE rooms
            SET status = 'finished', winner_player_id = v_winner_id
            WHERE id = v_room.room_id;
            
            INSERT INTO events (room_id, type, target_player_id, payload)
            VALUES (v_room.room_id, 'game_finished', v_winner_id, 
                    jsonb_build_object('winner_id', v_winner_id));
        END IF;
    END LOOP;
    
    RETURN QUERY 
    SELECT v_eliminated, room_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================
-- ГОТОВО! Тепер база САМА керує елімінаціями!
-- ===================================

-- Для тестування виклич:
-- SELECT * FROM auto_eliminate_players();
