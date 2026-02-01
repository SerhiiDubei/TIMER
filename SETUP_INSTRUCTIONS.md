# 🚀 Інструкція для запуску з вашим Supabase токеном

## ✅ Що у вас вже є:

```
Service Role Key: sbp_2de832711f66f44fa5f220e50c24480aadae1c7c
```

## ⚠️ Що ще потрібно з Supabase:

### 1. Відкрийте ваш проект Supabase
Перейдіть на https://supabase.com/dashboard

### 2. Знайдіть ці ключі:

**Settings → API** і скопіюйте:

1. **Project URL** (виглядає як: `https://xxxxx.supabase.co`)
2. **anon/public key** (починається з `eyJhbGci...`)

### 3. Створіть файл `.env.local`

Створіть файл `.env.local` в корені проекту (`C:\Users\user\Desktop\TIMER\.env.local`) з таким вмістом:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://ВСТАВТЕ_ВАШ_URL.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci_ВСТАВТЕ_ВАШ_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=sbp_2de832711f66f44fa5f220e50c24480aadae1c7c

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Cron Job Security
CRON_SECRET=timer-game-secret-2026
```

## 📋 Далі виконайте:

### Крок 1: Виконайте SQL схему

1. У Supabase Dashboard → **SQL Editor**
2. Скопіюйте весь вміст файлу `supabase-schema.sql`
3. Вставте і натисніть **Run**
4. Перевірте що створилось 4 таблиці: rooms, players, codes, events

### Крок 2: Увімкніть Realtime

1. Database → **Replication**
2. Увімкніть для таблиць:
   - ✅ rooms
   - ✅ players
   - ✅ events

### Крок 3: Встановіть залежності

```bash
cd C:\Users\user\Desktop\TIMER
npm install
```

### Крок 4: Запустіть проект

```bash
npm run dev
```

### Крок 5: Відкрийте браузер

```
http://localhost:3000
```

## 🎮 Готово!

Тепер можете:
1. Створити кімнату (admin)
2. Приєднатись як гравець
3. Згенерувати коди
4. Грати!

---

## 🆘 Якщо щось не працює:

**"Failed to fetch"** → Перевірте чи правильні ключі в `.env.local`

**"Room not found"** → Перевірте чи виконали SQL схему

**Realtime не працює** → Перевірте Replication в Supabase

---

**Детальніше:** Читайте `QUICK_START.md` або `SETUP.md`
