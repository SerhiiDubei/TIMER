# Налаштування періодичної перевірки вибуття (Cron Job)

## Варіант 1: Vercel Cron Jobs (рекомендовано)

Створіть файл `vercel.json` в корені проекту:

```json
{
  "crons": [
    {
      "path": "/api/admin/check-eliminations",
      "schedule": "*/10 * * * * *"
    }
  ]
}
```

Schedule: кожні 10 секунд

## Варіант 2: External Cron Service

Використовуйте сервіс як:
- **EasyCron** (https://www.easycron.com)
- **cron-job.org** (https://cron-job.org)

Налаштування:
- URL: `https://your-domain.com/api/admin/check-eliminations`
- Method: POST
- Headers: `Content-Type: application/json`
- Body: `{"secret": "your-secret-key"}`
- Interval: Every 10 seconds

## Варіант 3: Local Node Script

Для локальної розробки/тестування:

```bash
# У папці scripts
node check-eliminations-loop.js
```

Цей скрипт буде викликати endpoint кожні 10 секунд.

## Безпека

Додайте в `.env.local`:
```
CRON_SECRET=random-secure-string-here
```

Endpoint перевірить цей secret перед виконанням.
