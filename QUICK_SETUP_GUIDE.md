# ⚡ ШВИДКА ІНСТРУКЦІЯ ЗАПУСКУ

> **У вас вже є Service Role Key!** Залишилось тільки 2 ключі з Supabase.

---

## 📍 ДЕ ВИ ЗАРАЗ

```
✅ Проект створено
✅ Service Role Key є: sbp_2de832711f66f44fa5f220e50c24480aadae1c7c
❌ Потрібно ще 2 ключі з Supabase
❌ Потрібно виконати SQL схему
❌ Потрібно встановити залежності
```

---

## 🎯 ЩО РОБИТИ (5 хвилин)

### Крок 1: Отримайте ключі з Supabase (2 хв)

1. **Відкрийте** https://supabase.com/dashboard
2. **Оберіть** ваш проект (або створіть новий)
3. **Перейдіть** Settings → API
4. **Скопіюйте** ці 2 значення:

```
📋 Project URL:
https://xxxxxxxxxxxxx.supabase.co

📋 anon public key:
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ey...
```

---

### Крок 2: Створіть .env.local (1 хв)

**Варіант А: Автоматично (рекомендовано)**

Відкрийте PowerShell в папці проекту і виконайте:

```powershell
cd C:\Users\user\Desktop\TIMER
.\create-env.ps1
```

Скрипт запитає URL та Anon Key, і створить файл автоматично!

**Варіант Б: Вручну**

Створіть файл `.env.local` в папці `C:\Users\user\Desktop\TIMER\` з таким вмістом:

```env
NEXT_PUBLIC_SUPABASE_URL=https://ВАШ_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci_ВАШ_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=sbp_2de832711f66f44fa5f220e50c24480aadae1c7c
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=timer-game-secret-2026
```

⚠️ **Замініть** перші 2 рядки на ваші ключі!

---

### Крок 3: Виконайте SQL схему (1 хв)

1. **Відкрийте** Supabase Dashboard → SQL Editor
2. **Скопіюйте** весь вміст файлу `supabase-schema.sql`
3. **Вставте** в SQL Editor
4. **Натисніть** RUN (зелена кнопка)
5. **Перевірте** що створилось 4 таблиці:
   - ✅ rooms
   - ✅ players
   - ✅ codes
   - ✅ events

---

### Крок 4: Увімкніть Realtime (30 сек)

1. **Database** → Replication
2. **Увімкніть** для таблиць:
   - ✅ rooms
   - ✅ players
   - ✅ events

---

### Крок 5: Встановіть і запустіть (1 хв)

Відкрийте PowerShell:

```powershell
cd C:\Users\user\Desktop\TIMER

# Встановити залежності
npm install

# Запустити проект
npm run dev
```

---

### Крок 6: Відкрийте браузер

```
http://localhost:3000
```

---

## 🎉 ГОТОВО!

Тепер ви побачите головну сторінку гри!

### Що далі?

1. **Створіть кімнату** - натисніть "Create New Room (Admin)"
2. **Приєднайтесь** як гравець (в іншій вкладці/браузері)
3. **Згенеруйте коди** в адмін панелі
4. **Запустіть гру** і грайте!

---

## 📚 Детальніші інструкції

- **SETUP_INSTRUCTIONS.md** - покрокова інструкція
- **QUICK_START.md** - швидкий старт з поясненнями
- **SETUP.md** - повне налаштування
- **ENV_SETUP.txt** - текстова інструкція

---

## 🆘 Проблеми?

### "npm: command not found"
→ Встановіть Node.js з https://nodejs.org

### "Failed to fetch"
→ Перевірте чи правильні ключі в `.env.local`

### "Room not found"
→ Перевірте чи виконали SQL схему

### Інше
→ Читайте `SETUP_INSTRUCTIONS.md` або `SETUP.md`

---

## 📊 Чеклист

```
□ Отримав Project URL з Supabase
□ Отримав Anon Key з Supabase
□ Створив .env.local файл
□ Виконав SQL схему (supabase-schema.sql)
□ Увімкнув Realtime для таблиць
□ Виконав npm install
□ Виконав npm run dev
□ Відкрив http://localhost:3000
□ Побачив головну сторінку
□ Створив тестову кімнату
□ Приєднався як гравець
□ Згенерував коди
□ Запустив гру
```

---

**Успіхів! 🎮**
