# 🚀 ІНСТРУКЦІЯ ПО ДЕПЛОЮ

## Крок 1: Створити GitHub репозиторій

1. Відкрий: https://github.com/new
2. Repository name: `timer-game` (або будь-яка назва)
3. Description: `Multiplayer lobby timer game with real-time sync`
4. **Public** (щоб безкоштовно задеплоїти)
5. **НЕ** додавай README, .gitignore (вже є)
6. Клік **"Create repository"**

## Крок 2: Запушити код на GitHub

Скопіюй команди які GitHub покаже на сторінці (щось таке):

```bash
git remote add origin https://github.com/ВАШ_USERNAME/timer-game.git
git branch -M main
git push -u origin main
```

Виконай їх в PowerShell в папці TIMER.

## Крок 3: Деплой на Vercel (безкоштовно!)

### Варіант А (через браузер - простіше):

1. Відкрий: https://vercel.com/new
2. **"Import Git Repository"**
3. Вибери свій репозиторій `timer-game`
4. **"Import"**
5. В **Environment Variables** додай (дуже важливо!):

```
NEXT_PUBLIC_SUPABASE_URL=https://ffnmlfnzufddmecfpive.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmbm1sZm56dWZkZG1lY2ZwaXZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyMDUwNDksImV4cCI6MjA3OTc4MTA0OX0.s70kB8AwTDFMEFFGFfm2WQi2PTVnDiPedOJt5l44TmI
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmbm1sZm56dWZkZG1lY2ZwaXZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIwNTA0OSwiZXhwIjoyMDc5NzgxMDQ5fQ.TvMleeSEEirz97a1MLa8AWrjn5_mrQLt2WDU3JDtXXA
CRON_SECRET=timer-game-secret-2026
```

6. Клік **"Deploy"**
7. Чекай 2-3 хвилини ☕
8. Отримаєш посилання типу: `https://timer-game.vercel.app`

### Варіант Б (через Vercel CLI):

```bash
npm i -g vercel
vercel login
vercel
# Відповідай на питання, додай environment variables
```

## Крок 4: Тестуй!

Твоє посилання буде доступне всім в інтернеті! 🌍

Поділись посиланням з друзями і тестуйте гру разом!

---

## 📝 Що робити далі:

Кожен раз коли ти робиш зміни в коді:

```bash
git add .
git commit -m "Опис змін"
git push
```

Vercel **автоматично** задеплоїть нову версію! 🎉

---

## ⚙️ Налаштування Supabase для продакшн

Після деплою, додай URL Vercel в Supabase:

1. https://supabase.com/dashboard/project/ffnmlfnzufddmecfpive/auth/url-configuration
2. **Site URL**: `https://ВАШ-ДОМЕН.vercel.app`
3. **Redirect URLs**: додай `https://ВАШ-ДОМЕН.vercel.app/**`

---

## 🐛 Troubleshooting

### Помилка "Could not find table"
→ Перевір чи виконав SQL схему в Supabase (Крок 1 з попередніх інструкцій)

### Помилка 500 на Vercel
→ Перевір Environment Variables - всі 4 мають бути додані

### Realtime не працює
→ Увімкни Replication для таблиць в Supabase

---

**Готово! Твоя гра онлайн! 🎮🌍**
