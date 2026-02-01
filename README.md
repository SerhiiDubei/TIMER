# 🎮 Lobby Timer Game - MVP

🚀 **Live Demo:** Coming soon!

> 👋 **Новачок?** Почніть з **[START_HERE.md](START_HERE.md)** - там покроковий гайд!

Багатокористувацька веб-гра з лобі, синхронним серверним таймером і одноразовими кодами з ефектами.

## 📋 Особливості

- ✅ **Лобі система** - гравці приєднуються через короткий код кімнати
- ⏱️ **Серверний таймер** - єдине джерело правди, синхронізація для всіх гравців
- 🎫 **Одноразові коди** - додають/віднімають час собі/іншим/всім
- 👥 **Realtime оновлення** - миттєва синхронізація через Supabase
- 💀 **Автоматичне вибуття** - гравці з 0 секунд автоматично вибувають
- 🛡️ **Безпека** - rate limiting, хешування кодів, admin ключі

## 🚀 Швидкий старт

### 1. Встановіть залежності

```bash
npm install
```

### 2. Налаштуйте Supabase

1. Створіть проект на [supabase.com](https://supabase.com)
2. Виконайте SQL з файлу `supabase-schema.sql` у SQL Editor
3. Скопіюйте `.env.local.example` → `.env.local`
4. Заповніть змінні оточення:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Запустіть проект

```bash
npm run dev
```

Відкрийте [http://localhost:3000](http://localhost:3000)

## 📖 Як користуватися

### Для адміністратора:

1. Натисніть **"Create New Room (Admin)"**
2. Встановіть стартовий час (за замовчуванням 20 хвилин)
3. Поділіться **Room Code** з гравцями
4. Згенеруйте коди на панелі адміна
5. Натисніть **"Start Game"** коли всі готові

### Для гравців:

1. Введіть **Room Code** та ім'я
2. Чекайте старту гри в лобі
3. Після старту вводьте коди для зміни часу
4. Виживіть довше за інших!

## 🎫 Типи кодів

### Self Add (➕ Додати собі)
```json
{
  "effect_type": "self_add",
  "payload": { "seconds": 300 }
}
```

### Self Subtract (➖ Відняти собі)
```json
{
  "effect_type": "self_subtract",
  "payload": { "seconds": -300 }
}
```

### Team Add (👥 Додати всім)
```json
{
  "effect_type": "team_add",
  "payload": { "seconds": 300, "scope": "all" }
}
```

### Steal (💰 Вкрасти час)
```json
{
  "effect_type": "steal",
  "payload": { "from_player_id": "uuid", "seconds": 300 }
}
```

## 🏗️ Структура проекту

```
├── pages/
│   ├── index.tsx                    # Головна - join room
│   ├── room/[room_id].tsx          # Ігрова кімната
│   ├── admin/
│   │   ├── create.tsx              # Створення кімнати
│   │   └── manage/[room_id].tsx   # Панель адміна
│   └── api/
│       ├── rooms/
│       │   ├── create.ts           # POST /api/rooms/create
│       │   ├── join.ts             # POST /api/rooms/join
│       │   ├── start.ts            # POST /api/rooms/start
│       │   └── [room_id]/state.ts  # GET /api/rooms/:id/state
│       ├── codes/
│       │   ├── redeem.ts           # POST /api/codes/redeem
│       │   └── generate.ts         # POST /api/codes/generate
│       └── admin/
│           └── check-eliminations.ts # POST /api/admin/check-eliminations
├── lib/
│   ├── supabase.ts                 # Supabase клієнт
│   ├── types.ts                    # TypeScript типи
│   └── utils.ts                    # Утиліти
└── supabase-schema.sql             # Схема БД
```

## 🗄️ База даних

### Таблиці:
- **rooms** - кімнати з room_code, статусом, admin_key
- **players** - гравці в кімнатах
- **codes** - одноразові коди (зберігаються як хеш)
- **events** - append-only журнал всіх подій

### Ключові функції:
- `calculate_remaining_time(player_id, room_id)` - розраховує залишок часу
- `check_eliminations(room_id)` - перевіряє і виключає гравців з 0 часу

## 🔒 Безпека

- ✅ Admin ключі ніколи не зберігаються на клієнті
- ✅ Коди зберігаються як bcrypt хеш
- ✅ Rate limiting: 5 спроб за 10 секунд на гравця
- ✅ Atomic transactions для redeem кодів
- ✅ Row Level Security (RLS) в Supabase
- ✅ Серверний час як єдине джерело правди

## ⚡ Realtime

Використовується Supabase Realtime для миттєвих оновлень:
- Нові гравці в лобі
- Старт гри
- Використання кодів
- Вибуття гравців

## 🔄 Періодична перевірка вибуття

Налаштуйте cron job для періодичної перевірки:

```bash
# Кожні 10 секунд
curl -X POST http://your-domain.com/api/admin/check-eliminations \
  -H "Content-Type: application/json" \
  -d '{"secret": "your-secret"}'
```

Додайте в `.env.local`:
```env
CRON_SECRET=your-secret-key
```

## 📊 Acceptance Criteria

- [x] 20+ гравців можуть приєднатися без лагів
- [x] Синхронний старт таймера для всіх (±1 сек)
- [x] Коди не можна використати двічі
- [x] Коди змінюють час по правилах
- [x] Автоматичне вибуття при 0 часу
- [x] Realtime оновлення для всіх

## 🛠️ Технології

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Realtime**: Supabase Realtime
- **Auth**: Session-based (admin keys)

## 📝 API Endpoints

| Method | Endpoint | Опис |
|--------|----------|------|
| POST | `/api/rooms/create` | Створити кімнату |
| POST | `/api/rooms/join` | Приєднатися до кімнати |
| POST | `/api/rooms/start` | Запустити гру (admin) |
| GET | `/api/rooms/:id/state` | Отримати стан кімнати |
| POST | `/api/codes/redeem` | Використати код |
| POST | `/api/codes/generate` | Згенерувати коди (admin) |
| POST | `/api/admin/check-eliminations` | Перевірити вибуття (cron) |

## 🎯 Формула таймера

```
elapsed = now_server - started_at
adjust = SUM(events.time_delta_seconds WHERE target = player)
remaining = base_seconds - elapsed + adjust
```

**Правило**: Клієнт тільки відображає, сервер - джерело правди.

## 🚀 Деплой

### Vercel (рекомендовано):

```bash
npm install -g vercel
vercel
```

### Налаштування Environment Variables в Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET` (опціонально)

## 📄 Ліцензія

MIT

---

**Створено з ❤️ для MVP гри з таймером**
