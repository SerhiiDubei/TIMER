# 🚀 Повна інструкція по налаштуванню

## Крок 1: Клонування та встановлення

```bash
cd C:\Users\user\Desktop\TIMER
npm install
```

## Крок 2: Налаштування Supabase

### 2.1 Створіть проект

1. Перейдіть на https://supabase.com
2. Натисніть "New Project"
3. Введіть назву, пароль бази даних
4. Оберіть регіон (найближчий до вас)
5. Дочекайтеся створення (2-3 хвилини)

### 2.2 Виконайте SQL схему

1. У Supabase Dashboard → SQL Editor
2. Скопіюйте весь вміст файлу `supabase-schema.sql`
3. Вставте і натисніть "Run"
4. Перевірте, що всі таблиці створені в Table Editor

### 2.3 Отримайте ключі

1. Settings → API
2. Скопіюйте:
   - Project URL
   - anon/public key
   - service_role key (секретний!)

### 2.4 Налаштуйте Realtime

1. Database → Replication
2. Увімкніть replication для таблиць:
   - rooms
   - players
   - events

## Крок 3: Environment Variables

Створіть файл `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=your-random-secret-for-cron
```

⚠️ **ВАЖЛИВО**: Ніколи не комітьте `.env.local` в git!

## Крок 4: Запуск локально

```bash
npm run dev
```

Відкрийте http://localhost:3000

## Крок 5: Тестування

### Створіть тестову гру:

1. Відкрийте http://localhost:3000
2. Натисніть "Create New Room (Admin)"
3. Залиште 20 хвилин, натисніть "Create Room"
4. **ЗБЕРЕЖІТЬ admin key** (показується один раз!)
5. Скопіюйте Room Code

### Приєднайтеся як гравець:

1. Відкрийте в іншому браузері/інкогніто
2. Введіть Room Code та ім'я
3. Натисніть "Join Game"

### Згенеруйте коди:

1. В адмін панелі оберіть тип коду
2. Встановіть кількість секунд
3. Натисніть "Generate Codes"
4. Скопіюйте коди

### Запустіть гру:

1. В адмін панелі натисніть "Start Game"
2. Всі гравці побачать таймер

### Використайте код:

1. Як гравець введіть код
2. Натисніть "Redeem"
3. Час змінився!

## Крок 6: Налаштування Cron Job (опціонально)

### Для локальної розробки:

В окремому терміналі:
```bash
node scripts/check-eliminations-loop.js
```

### Для продакшн (Vercel):

Файл `vercel.json` вже налаштований. Після деплою cron job запуститься автоматично.

## Крок 7: Деплой на Vercel

```bash
# Встановіть Vercel CLI
npm install -g vercel

# Деплой
vercel

# Встановіть environment variables в Vercel Dashboard:
# Settings → Environment Variables
# Додайте всі змінні з .env.local
```

## Готово! 🎉

Ваша гра запущена і готова до використання!

## Поширені проблеми

### 1. "Failed to fetch state"
- Перевірте, чи правильні ключі в `.env.local`
- Перевірте, чи виконали SQL схему

### 2. "Invalid admin key"
- Admin key зберігається тільки в sessionStorage
- Якщо закрили вкладку - створіть нову кімнату

### 3. "Code not found"
- Коди чутливі до регістру (автоматично upper case)
- Коди одноразові - перевірте, чи не використані

### 4. Realtime не працює
- Перевірте Replication в Supabase
- Перевірте Row Level Security policies

### 5. Гравці не виключаються автоматично
- Запустіть cron job script
- Або налаштуйте Vercel Cron

## Потрібна допомога?

Перевірте:
1. Console в браузері (F12) на помилки
2. Vercel logs (якщо задеплоєно)
3. Supabase logs (Dashboard → Logs)
