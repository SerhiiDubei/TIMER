# ⚡ Швидкий старт (5 хвилин)

## Передумови
- ✅ Node.js 18+ встановлено
- ✅ Акаунт на [supabase.com](https://supabase.com) (безкоштовно)

## Крок 1: Встановлення (1 хв)

```bash
cd C:\Users\user\Desktop\TIMER
npm install
```

## Крок 2: Supabase (2 хв)

### 2.1 Створити проект
1. Відкрийте https://supabase.com/dashboard
2. Клік "New Project"
3. Введіть назву, пароль
4. Клік "Create"

### 2.2 Виконати SQL
1. В Dashboard → SQL Editor
2. Скопіюйте весь `supabase-schema.sql`
3. Вставте і клік "Run"

### 2.3 Увімкнути Realtime
1. Database → Replication
2. Увімкніть для: `rooms`, `players`, `events`

## Крок 3: Конфігурація (1 хв)

### 3.1 Створити .env.local
Скопіюйте `.env.local.example` → `.env.local`

### 3.2 Додати ключі
Settings → API в Supabase, скопіюйте:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=any-random-string
```

## Крок 4: Запуск (1 хв)

```bash
npm run dev
```

Відкрийте http://localhost:3000

## 🎮 Швидкий тест (3 хв)

### 1. Створити кімнату
- Клік "Create New Room (Admin)"
- 20 minutes → "Create Room"
- **Збережіть Room Code!**

### 2. Приєднатись як гравець
- Нова вкладка інкогніто
- Введіть Room Code і ім'я
- "Join Game"

### 3. Згенерувати коди
- В адмін панелі:
- Type: "Add Time (Self)"
- Seconds: 300
- Count: 3
- "Generate Codes"
- "Copy All"

### 4. Стартувати гру
- "Start Game" в адмін панелі
- Таймер побачите у всіх!

### 5. Використати код
- Як гравець: вставте один код
- "Redeem"
- Час +5 хвилин! ✨

## ✅ Працює!

Якщо все вище пройшло успішно - **проект готовий!**

## 📚 Що далі?

- 📖 Детальна інструкція: `SETUP.md`
- 🏗️ Архітектура: `ARCHITECTURE.md`
- 📚 Приклади API: `EXAMPLES.md`
- ✅ Повний чеклист: `CHECKLIST.md`

## 🐛 Проблеми?

### "Failed to fetch"
→ Перевірте ключі в `.env.local`

### "Room not found"
→ Перевірте чи виконали SQL схему

### Realtime не працює
→ Увімкніть Replication в Supabase

### Інше
→ Читайте `SETUP.md` → "Поширені проблеми"

---

**🎉 Готово за 5 хвилин!**
