# ================================================
# TIMER GAME - Швидке налаштування
# ================================================

Write-Host "================================" -ForegroundColor Cyan
Write-Host "   TIMER GAME - Setup Script" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Перевірка .env.local
if (Test-Path ".env.local") {
    Write-Host "[✓] .env.local вже існує" -ForegroundColor Green
    Write-Host ""
    Get-Content ".env.local"
    Write-Host ""
} else {
    Write-Host "[!] .env.local НЕ ЗНАЙДЕНО" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Створюємо .env.local..." -ForegroundColor Yellow
    
    # Запитати ANON KEY
    Write-Host ""
    Write-Host "Відкрийте: https://supabase.com/dashboard/project/ffnmlfnzufddmecfpive/api" -ForegroundColor Cyan
    Write-Host "Скопіюйте 'anon public' ключ і вставте тут:" -ForegroundColor Cyan
    $anonKey = Read-Host "ANON KEY"
    
    # Створити файл
    $envContent = @"
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://ffnmlfnzufddmecfpive.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=$anonKey
SUPABASE_SERVICE_ROLE_KEY=sbp_2de832711f66f44fa5f220e50c24480aadae1c7c

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=timer-game-secret-2026
"@
    
    $envContent | Out-File -FilePath ".env.local" -Encoding UTF8
    Write-Host "[✓] .env.local створено!" -ForegroundColor Green
}

# Перевірка node_modules
Write-Host ""
if (Test-Path "node_modules") {
    Write-Host "[✓] node_modules встановлено" -ForegroundColor Green
} else {
    Write-Host "[!] node_modules НЕ ЗНАЙДЕНО" -ForegroundColor Yellow
    Write-Host "Встановлюємо залежності..." -ForegroundColor Yellow
    npm install
    Write-Host "[✓] Залежності встановлено!" -ForegroundColor Green
}

# Інструкції для SQL
Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "   НАСТУПНІ КРОКИ:" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Виконайте SQL схему:" -ForegroundColor Yellow
Write-Host "   https://supabase.com/dashboard/project/ffnmlfnzufddmecfpive/editor" -ForegroundColor Cyan
Write-Host "   Скопіюйте вміст supabase-schema.sql і запустіть"
Write-Host ""
Write-Host "2. Увімкніть Realtime:" -ForegroundColor Yellow
Write-Host "   https://supabase.com/dashboard/project/ffnmlfnzufddmecfpive/database/replication" -ForegroundColor Cyan
Write-Host "   Увімкніть для: rooms, players, events"
Write-Host ""
Write-Host "3. Запустіть проект:" -ForegroundColor Yellow
Write-Host "   npm run dev" -ForegroundColor Green
Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Запитати чи запустити dev server
$response = Read-Host "Запустити dev server зараз? (y/n)"
if ($response -eq "y" -or $response -eq "Y") {
    Write-Host ""
    Write-Host "Запускаємо npm run dev..." -ForegroundColor Green
    npm run dev
}
