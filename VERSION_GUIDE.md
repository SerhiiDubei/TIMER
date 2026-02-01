# 📦 Гід по версіонуванню

## 🔍 Де знайти версію?

Версія відображається **в правому нижньому куті** на всіх сторінках:

```
v1.1.0 • 01.02.2026, 19:51
```

---

## 🔄 Як оновити версію перед push?

### 1️⃣ **Автоматично (рекомендовано):**

```bash
node update-version.js
git add version.json public/version.json
git commit -m "Update version timestamp"
git push
```

Скрипт автоматично оновить час білду.

---

### 2️⃣ **Вручну змінити версію:**

Відкрий `version.json`:

```json
{
  "version": "1.2.0",  ← ЗМІНИТИ ТУТ
  "buildTime": "...",
  "features": [
    "Custom room names",
    "..."
  ]
}
```

Потім:

```bash
node update-version.js  # Оновить час
Copy-Item version.json public\version.json  # PowerShell
# або cp version.json public/version.json  # bash/Linux
git add -A
git commit -m "Version 1.2.0: New features"
git push
```

---

## 📋 Коли збільшувати версію?

- **1.0.0 → 1.0.1** - дрібні виправлення (bugfix)
- **1.0.0 → 1.1.0** - нові фічі (features)
- **1.0.0 → 2.0.0** - великі зміни (breaking changes)

---

## ✅ Поточна версія: **v1.1.0**

### Фічі:
- ✅ Custom room names
- ✅ Minimum 2 players to start
- ✅ Winner detection
- ✅ Auto-elimination every 5s
- ✅ Timer animation fixed
- ✅ Version display

---

**Після push на GitHub → Vercel автоматично задеплоїть нову версію!** 🚀
