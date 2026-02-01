# 🏗️ Архітектура проекту

## Загальна схема

```
┌─────────────────────────────────────────────────────────┐
│                   CLIENT (Browser)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  Join Page   │  │  Room Page   │  │  Admin Page  │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│         │                  │                  │         │
└─────────┼──────────────────┼──────────────────┼─────────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
                    ┌────────▼─────────┐
                    │   Next.js API    │
                    │     Routes       │
                    └────────┬─────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
    ┌─────▼─────┐    ┌───────▼───────┐   ┌────▼──────┐
    │  Supabase │    │  Rate Limiter │   │   Cron    │
    │    DB     │    │   + Security  │   │    Job    │
    └───────────┘    └───────────────┘   └───────────┘
```

## Ключові принципи

### 1. Єдине джерело правди (Single Source of Truth)

**Сервер завжди правий:**
- Час рахується на сервері від `started_at`
- Клієнт лише відображає локальний countdown
- При кожній взаємодії - сервер перераховує

### 2. Event Sourcing для часу

Час НЕ зберігається як значення, а рахується за формулою:

```typescript
remaining = base_seconds - elapsed + sum(adjustments)
```

Де:
- `base_seconds` - стартовий час з rooms
- `elapsed = now() - started_at`
- `adjustments = SUM(events.time_delta_seconds WHERE target = player_id)`

**Переваги:**
- Аудит всіх змін
- Можливість відкату/аналізу
- Немає race conditions
- Легко масштабувати

### 3. Append-Only Events

Таблиця `events` - append-only log:
- НЕ можна видалити/змінити
- Тільки INSERT
- Швидкі запити через індекси

### 4. Realtime через Supabase

```typescript
supabase
  .channel(`room:${room_id}`)
  .on('postgres_changes', 
    { table: 'events', filter: `room_id=eq.${room_id}` },
    () => fetchState()
  )
  .subscribe()
```

**Триггери:**
- Нова подія → оновити UI
- Новий гравець → показати в списку
- Гра стартувала → запустити таймер

## Потік даних

### Створення кімнати

```
Admin → POST /api/rooms/create
         ↓
    Generate room_code (6 chars)
    Generate admin_key (32 chars)
         ↓
    INSERT INTO rooms
         ↓
    Return: room_code, admin_key, room_id
```

### Приєднання гравця

```
Player → POST /api/rooms/join
         ↓
    Find room by room_code
         ↓
    INSERT INTO players
    INSERT INTO events (player_joined)
         ↓
    Realtime → notify all clients
         ↓
    Return: player_id, room_id
```

### Старт гри

```
Admin → POST /api/rooms/start (with admin_key)
         ↓
    Verify admin_key
         ↓
    UPDATE rooms SET status='running', started_at=NOW()
    INSERT INTO events (game_started)
         ↓
    Realtime → all clients start countdown
```

### Використання коду

```
Player → POST /api/codes/redeem
         ↓
    Rate limit check (5/10sec)
         ↓
    Find code (iterate & verify bcrypt hash)
         ↓
    Transaction:
      - UPDATE codes SET used_at=NOW(), used_by=player_id
      - INSERT events (code_used)
      - INSERT events (time_adjust) для кожного target
         ↓
    Call check_eliminations(room_id)
         ↓
    Realtime → update all clients
         ↓
    Return: new remaining time
```

### Перевірка вибуття

```
Cron (every 10 sec) → POST /api/admin/check-eliminations
                         ↓
                   Get all running rooms
                         ↓
            For each room: check_eliminations()
                         ↓
                   SQL Function:
                     1. Get all alive players
                     2. Calculate remaining for each
                     3. If remaining <= 0:
                        - UPDATE players SET eliminated_at=NOW()
                        - INSERT event (player_eliminated)
                         ↓
                   Realtime → update clients
```

## Безпека

### 1. Admin Key

```typescript
// NEVER expose in client code
sessionStorage.setItem('admin_key', key); // ❌ BAD
// Only use in API calls from session

// Server checks:
if (room.admin_key !== provided_admin_key) {
  return 403; // Forbidden
}
```

### 2. Code Hashing

```typescript
// Store:
const hash = await bcrypt.hash(code, 10);
await supabase.from('codes').insert({ code_hash: hash });

// Verify:
const codes = await getUnusedCodes(room_id);
for (const c of codes) {
  if (await bcrypt.compare(inputCode, c.code_hash)) {
    // Match!
  }
}
```

### 3. Rate Limiting

```typescript
// In-memory map
const rateLimitMap = new Map<player_id, timestamp[]>();

function checkRateLimit(playerId: string): boolean {
  const now = Date.now();
  const attempts = rateLimitMap.get(playerId) || [];
  const recent = attempts.filter(t => now - t < 10000);
  
  if (recent.length >= 5) return false; // Limited
  
  recent.push(now);
  rateLimitMap.set(playerId, recent);
  return true;
}
```

### 4. Row Level Security (RLS)

```sql
-- Rooms: anyone can read, service role can write
CREATE POLICY "Anyone can read rooms" 
  ON rooms FOR SELECT USING (true);

-- Codes: ONLY service role
CREATE POLICY "Service role can access codes" 
  ON codes FOR ALL USING (true);
```

## Масштабування

### Проблеми при >100 гравців:

1. **Rate Limiter в пам'яті** - не працює з кількома серверами
   - Рішення: Redis
   
2. **Cron на кожному сервері** - дублювання
   - Рішення: Dedicated cron service або Vercel Cron
   
3. **Realtime connections** - ліміт Supabase
   - Рішення: Upgrade план або custom WebSocket server

### Оптимізації:

```typescript
// 1. Batch updates
const adjustments = players.map(p => ({
  room_id,
  type: 'time_adjust',
  target_player_id: p.id,
  time_delta_seconds: 300
}));
await supabase.from('events').insert(adjustments);

// 2. Index optimization
CREATE INDEX idx_events_player_time 
  ON events(target_player_id, type, time_delta_seconds)
  WHERE type = 'time_adjust';

// 3. Connection pooling
const supabase = createClient(url, key, {
  db: { pool: { max: 10 } }
});
```

## Можливі покращення

### MVP+:
1. **Steal Code UI** - вибір гравця для крадіжки
2. **Temptation Codes** - вибір опції (1/2/4 гравці)
3. **Player Stats** - історія використаних кодів
4. **Spectator Mode** - перегляд після elimination
5. **Sound Effects** - аудіо при події

### V2:
1. **Teams** - командна гра
2. **Power-ups** - заморожування, захист
3. **Leaderboard** - топ гравців
4. **Achievements** - досягнення
5. **Custom Themes** - кастомізація UI

## Тестування

### Unit Tests (TODO):
```typescript
describe('calculateRemainingTime', () => {
  it('should calculate correct remaining time', () => {
    const base = 1200;
    const started = '2024-01-01T12:00:00Z';
    const adjustments = 300;
    // Mock Date.now() = started + 600 sec
    expect(calculateRemainingTime(base, started, adjustments)).toBe(900);
  });
});
```

### E2E Tests (TODO):
- Створення кімнати
- Приєднання 5 гравців
- Старт гри
- Використання коду
- Перевірка вибуття

## Метрики (для моніторингу)

1. **Game Metrics:**
   - Active rooms count
   - Players per room avg
   - Codes redeemed per minute
   - Eliminations per game

2. **Performance:**
   - API response time
   - DB query time
   - Realtime latency
   - Client render time

3. **Errors:**
   - Failed code redemptions
   - Rate limit hits
   - DB connection errors
   - Client crashes

---

**Питання?** Читайте SETUP.md або README.md
