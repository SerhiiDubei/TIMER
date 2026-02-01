-- DEBUG: Отримати останню room та всі дані для аналізу

-- 1. Остання створена кімната
SELECT 
  id,
  room_code,
  room_name,
  status,
  started_at,
  base_seconds,
  winner_player_id,
  created_at
FROM rooms
ORDER BY created_at DESC
LIMIT 1;

-- 2. Гравці в останній кімнаті (використай room_id з результату вище)
SELECT 
  id,
  name,
  is_alive,
  should_eliminate_at,
  EXTRACT(EPOCH FROM (should_eliminate_at - NOW())) as seconds_until_elimination,
  created_at
FROM players
WHERE room_id = (SELECT id FROM rooms ORDER BY created_at DESC LIMIT 1)
ORDER BY created_at;

-- 3. Всі події для останньої кімнати
SELECT 
  id,
  event_type,
  player_id,
  value,
  created_at
FROM events
WHERE room_id = (SELECT id FROM rooms ORDER BY created_at DESC LIMIT 1)
ORDER BY created_at DESC
LIMIT 50;

-- 4. Перевірити чи спрацьовує функція розрахунку часу
SELECT 
  p.id,
  p.name,
  p.is_alive,
  calculate_remaining_time(p.id) as calculated_remaining_seconds,
  p.should_eliminate_at,
  NOW() as current_time,
  (p.should_eliminate_at < NOW()) as should_be_eliminated
FROM players p
WHERE room_id = (SELECT id FROM rooms ORDER BY created_at DESC LIMIT 1);
