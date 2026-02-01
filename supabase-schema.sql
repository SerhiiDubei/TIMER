-- ===================================
-- LOBBY TIMER GAME - DATABASE SCHEMA
-- ===================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===================================
-- 1. ROOMS TABLE
-- ===================================
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_code TEXT UNIQUE NOT NULL,
    room_name TEXT,
    status TEXT NOT NULL CHECK (status IN ('lobby', 'running', 'finished')),
    admin_key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    base_seconds INTEGER NOT NULL DEFAULT 1200,
    winner_player_id UUID
);

CREATE INDEX idx_rooms_room_code ON rooms(room_code);
CREATE INDEX idx_rooms_status ON rooms(status);

-- ===================================
-- 2. PLAYERS TABLE
-- ===================================
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    eliminated_at TIMESTAMPTZ,
    last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_players_room_id ON players(room_id);
CREATE INDEX idx_players_eliminated ON players(eliminated_at) WHERE eliminated_at IS NULL;

-- ===================================
-- 3. CODES TABLE
-- ===================================
CREATE TABLE codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    code_hash TEXT UNIQUE NOT NULL,
    effect_type TEXT NOT NULL CHECK (effect_type IN ('self_add', 'self_subtract', 'steal', 'team_add', 'temptation')),
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    used_at TIMESTAMPTZ,
    used_by_player_id UUID REFERENCES players(id)
);

CREATE INDEX idx_codes_room_id ON codes(room_id);
CREATE INDEX idx_codes_code_hash ON codes(code_hash);
CREATE INDEX idx_codes_used ON codes(used_at) WHERE used_at IS NULL;

-- ===================================
-- 4. EVENTS TABLE (append-only log)
-- ===================================
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    type TEXT NOT NULL CHECK (type IN ('time_adjust', 'code_used', 'game_started', 'player_eliminated', 'player_joined')),
    actor_player_id UUID REFERENCES players(id),
    target_player_id UUID REFERENCES players(id),
    payload JSONB,
    time_delta_seconds INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_events_room_id ON events(room_id);
CREATE INDEX idx_events_target_player ON events(target_player_id);
CREATE INDEX idx_events_type ON events(type);
CREATE INDEX idx_events_created_at ON events(created_at DESC);

-- ===================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ===================================

-- Enable RLS
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Rooms: Everyone can read, service role can write
CREATE POLICY "Anyone can read rooms" ON rooms FOR SELECT USING (true);
CREATE POLICY "Service role can modify rooms" ON rooms FOR ALL USING (true);

-- Players: Everyone can read, service role can write
CREATE POLICY "Anyone can read players" ON players FOR SELECT USING (true);
CREATE POLICY "Service role can modify players" ON players FOR ALL USING (true);

-- Codes: Only service role can access (security)
CREATE POLICY "Service role can access codes" ON codes FOR ALL USING (true);

-- Events: Everyone can read, service role can write
CREATE POLICY "Anyone can read events" ON events FOR SELECT USING (true);
CREATE POLICY "Service role can modify events" ON events FOR ALL USING (true);

-- ===================================
-- 6. REALTIME CONFIGURATION
-- ===================================

-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE events;

-- ===================================
-- 7. HELPER FUNCTIONS
-- ===================================

-- Function to calculate remaining time for a player
CREATE OR REPLACE FUNCTION calculate_remaining_time(
    p_player_id UUID,
    p_room_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    v_started_at TIMESTAMPTZ;
    v_base_seconds INTEGER;
    v_elapsed_seconds INTEGER;
    v_adjustments INTEGER;
    v_remaining INTEGER;
BEGIN
    -- Get room data
    SELECT started_at, base_seconds INTO v_started_at, v_base_seconds
    FROM rooms
    WHERE id = p_room_id;
    
    -- If game hasn't started, return base time
    IF v_started_at IS NULL THEN
        RETURN v_base_seconds;
    END IF;
    
    -- Calculate elapsed time
    v_elapsed_seconds := EXTRACT(EPOCH FROM (NOW() - v_started_at))::INTEGER;
    
    -- Sum all time adjustments for this player
    SELECT COALESCE(SUM(time_delta_seconds), 0) INTO v_adjustments
    FROM events
    WHERE room_id = p_room_id
    AND target_player_id = p_player_id
    AND type = 'time_adjust';
    
    -- Calculate remaining: base - elapsed + adjustments
    v_remaining := v_base_seconds - v_elapsed_seconds + v_adjustments;
    
    RETURN v_remaining;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and eliminate players with 0 or negative time
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

-- ===================================
-- 8. SAMPLE DATA (for testing)
-- ===================================

-- Uncomment to insert sample room
-- INSERT INTO rooms (room_code, status, admin_key, base_seconds)
-- VALUES ('TEST01', 'lobby', 'admin-secret-key-123', 1200);
