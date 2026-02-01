# 📚 Приклади використання API та кодів

## API Приклади

### 1. Створення кімнати

```bash
curl -X POST http://localhost:3000/api/rooms/create \
  -H "Content-Type: application/json" \
  -d '{"base_seconds": 1200}'
```

**Відповідь:**
```json
{
  "room_code": "ABC123",
  "admin_key": "xKj9...Nm2p",
  "room_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### 2. Приєднання до кімнати

```bash
curl -X POST http://localhost:3000/api/rooms/join \
  -H "Content-Type: application/json" \
  -d '{
    "room_code": "ABC123",
    "name": "Player One"
  }'
```

**Відповідь:**
```json
{
  "room_id": "550e8400-e29b-41d4-a716-446655440000",
  "player_id": "660e8400-e29b-41d4-a716-446655440001",
  "player": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "Player One",
    "room_id": "550e8400-e29b-41d4-a716-446655440000",
    "joined_at": "2024-01-15T10:00:00Z",
    "eliminated_at": null
  }
}
```

### 3. Старт гри

```bash
curl -X POST http://localhost:3000/api/rooms/start \
  -H "Content-Type: application/json" \
  -d '{
    "room_id": "550e8400-e29b-41d4-a716-446655440000",
    "admin_key": "xKj9...Nm2p"
  }'
```

### 4. Отримати стан кімнати

```bash
curl "http://localhost:3000/api/rooms/550e8400-e29b-41d4-a716-446655440000/state?player_id=660e8400-e29b-41d4-a716-446655440001"
```

**Відповідь:**
```json
{
  "room": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "room_code": "ABC123",
    "status": "running",
    "started_at": "2024-01-15T10:05:00Z",
    "base_seconds": 1200
  },
  "players": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "Player One",
      "eliminated_at": null
    }
  ],
  "recent_events": [...],
  "my_remaining": 1150,
  "my_adjustments": 0
}
```

### 5. Генерація кодів

```bash
curl -X POST http://localhost:3000/api/codes/generate \
  -H "Content-Type: application/json" \
  -d '{
    "room_id": "550e8400-e29b-41d4-a716-446655440000",
    "admin_key": "xKj9...Nm2p",
    "batch": [
      {
        "effect_type": "self_add",
        "payload": {"seconds": 300}
      },
      {
        "effect_type": "self_subtract",
        "payload": {"seconds": -120}
      },
      {
        "effect_type": "team_add",
        "payload": {"seconds": 180, "scope": "all"}
      }
    ]
  }'
```

**Відповідь:**
```json
{
  "codes": ["ABC-DEF", "GHI-JKL", "MNO-PQR"]
}
```

### 6. Використання коду

```bash
curl -X POST http://localhost:3000/api/codes/redeem \
  -H "Content-Type: application/json" \
  -d '{
    "room_id": "550e8400-e29b-41d4-a716-446655440000",
    "player_id": "660e8400-e29b-41d4-a716-446655440001",
    "code": "ABC-DEF"
  }'
```

**Відповідь:**
```json
{
  "success": true,
  "remaining": 1450,
  "message": "Code redeemed successfully",
  "events": [...]
}
```

## Приклади кодів для різних сценаріїв

### Сценарій 1: Базова гра (20 хв, 10 гравців)

```javascript
// 5 кодів +5 хвилин (бонуси)
{
  "effect_type": "self_add",
  "payload": { "seconds": 300 }
}

// 3 коди -2 хвилини (ризик)
{
  "effect_type": "self_subtract",
  "payload": { "seconds": -120 }
}

// 2 коди +3 хвилини всім (командні)
{
  "effect_type": "team_add",
  "payload": { "seconds": 180, "scope": "all" }
}
```

### Сценарій 2: Швидка гра (5 хв, 5 гравців)

```javascript
// 10 кодів +1 хвилина
{
  "effect_type": "self_add",
  "payload": { "seconds": 60 }
}

// 5 кодів -30 секунд
{
  "effect_type": "self_subtract",
  "payload": { "seconds": -30 }
}

// 2 коди +2 хвилини всім
{
  "effect_type": "team_add",
  "payload": { "seconds": 120, "scope": "all" }
}
```

### Сценарій 3: Довга гра (60 хв, 20+ гравців)

```javascript
// 20 кодів +10 хвилин
{
  "effect_type": "self_add",
  "payload": { "seconds": 600 }
}

// 10 кодів -5 хвилин (небезпечні)
{
  "effect_type": "self_subtract",
  "payload": { "seconds": -300 }
}

// 5 кодів +8 хвилин всім (події)
{
  "effect_type": "team_add",
  "payload": { "seconds": 480, "scope": "all" }
}

// З експірацією (дійсний 15 хв)
{
  "effect_type": "self_add",
  "payload": { "seconds": 900 },
  "expires_at": "2024-01-15T10:20:00Z"
}
```

### Сценарій 4: PvP режим (з steal)

⚠️ **Примітка**: Для steal потрібно знати player_id цілі. Краще генерувати динамічно.

```javascript
// Backend code для генерації steal кодів:
const alivePlayers = await getAlivePlayers(room_id);

for (let i = 0; i < 5; i++) {
  const randomTarget = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
  
  await generateCode({
    effect_type: "steal",
    payload: {
      from_player_id: randomTarget.id,
      seconds: 300  // Вкрасти 5 хвилин
    }
  });
}
```

## Приклади фронтенд інтеграції

### React Hook для таймера

```typescript
function useGameTimer(roomId: string, playerId: string) {
  const [remaining, setRemaining] = useState(0);
  const [adjustments, setAdjustments] = useState(0);

  useEffect(() => {
    const fetchState = async () => {
      const res = await fetch(`/api/rooms/${roomId}/state?player_id=${playerId}`);
      const data = await res.json();
      
      if (data.my_remaining !== undefined) {
        setRemaining(data.my_remaining);
        setAdjustments(data.my_adjustments || 0);
      }
    };

    fetchState();
    const interval = setInterval(fetchState, 2000);
    return () => clearInterval(interval);
  }, [roomId, playerId]);

  // Local countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return { remaining, adjustments };
}
```

### Realtime підписка

```typescript
function useRealtimeRoom(roomId: string) {
  const [players, setPlayers] = useState([]);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const channel = supabase
      .channel(`room:${roomId}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'events',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          setEvents(prev => [payload.new, ...prev].slice(0, 10));
          // Refetch players if needed
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  return { players, events };
}
```

## SQL запити для аналітики

### Топ гравців по виживанню

```sql
SELECT 
  p.name,
  EXTRACT(EPOCH FROM (p.eliminated_at - r.started_at)) as survived_seconds
FROM players p
JOIN rooms r ON p.room_id = r.id
WHERE p.eliminated_at IS NOT NULL
ORDER BY survived_seconds DESC
LIMIT 10;
```

### Статистика використання кодів

```sql
SELECT 
  c.effect_type,
  COUNT(*) as total_used,
  AVG(EXTRACT(EPOCH FROM (c.used_at - r.started_at))) as avg_time_to_use
FROM codes c
JOIN rooms r ON c.room_id = r.id
WHERE c.used_at IS NOT NULL
GROUP BY c.effect_type;
```

### Активні кімнати

```sql
SELECT 
  room_code,
  status,
  started_at,
  (SELECT COUNT(*) FROM players WHERE room_id = rooms.id) as player_count,
  (SELECT COUNT(*) FROM players WHERE room_id = rooms.id AND eliminated_at IS NULL) as alive_count
FROM rooms
WHERE status = 'running'
ORDER BY started_at DESC;
```

## Тестові дані

### Seed скрипт для тестування

```sql
-- Створити тестову кімнату
INSERT INTO rooms (room_code, status, admin_key, base_seconds)
VALUES ('TEST01', 'lobby', 'test-admin-key', 1200)
RETURNING id;

-- Додати тестових гравців (use returned room id)
INSERT INTO players (room_id, name) VALUES
  ('your-room-id', 'Alice'),
  ('your-room-id', 'Bob'),
  ('your-room-id', 'Charlie');

-- Створити тестові коди (хеш для "TEST-001")
INSERT INTO codes (room_id, code_hash, effect_type, payload)
VALUES (
  'your-room-id',
  '$2a$10$...', -- bcrypt hash
  'self_add',
  '{"seconds": 300}'::jsonb
);
```

## Troubleshooting

### Код не спрацьовує

```bash
# Перевірити чи код існує та не використаний
SELECT * FROM codes 
WHERE room_id = 'your-room-id' 
AND used_at IS NULL;

# Перевірити події гравця
SELECT * FROM events 
WHERE target_player_id = 'your-player-id' 
ORDER BY created_at DESC 
LIMIT 10;
```

### Перерахувати час гравця вручну

```sql
SELECT calculate_remaining_time(
  'player-id'::uuid,
  'room-id'::uuid
);
```

### Скинути кімнату

```sql
-- УВАГА: Видалить всі дані кімнати
DELETE FROM rooms WHERE room_code = 'ABC123';
-- Cascade видалить players, codes, events
```

---

**Більше прикладів?** Дивіться код в `/pages/api/` або пишіть в Issues!
