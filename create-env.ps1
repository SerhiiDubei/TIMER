# PowerShell скрипт для створення .env.local файлу

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "СТВОРЕННЯ .env.local ФАЙЛУ" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Запитати URL
Write-Host "1. Введіть ваш Supabase Project URL" -ForegroundColor Yellow
Write-Host "   (наприклад: https://abcdefgh.supabase.co)" -ForegroundColor Gray
$supabaseUrl = Read-Host "   URL"

# Запитати Anon Key
Write-Host ""
Write-Host "2. Введіть ваш Supabase Anon Key" -ForegroundColor Yellow
Write-Host "   (починається з eyJhbGci...)" -ForegroundColor Gray
$anonKey = Read-Host "   Anon Key"

# Service Role Key (вже є)
$serviceKey = "sbp_2de832711f66f44fa5f220e50c24480aadae1c7c"

# Створити вміст файлу
$envContent = @"
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=$supabaseUrl
NEXT_PUBLIC_SUPABASE_ANON_KEY=$anonKey
SUPABASE_SERVICE_ROLE_KEY=$serviceKey

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Cron Job Security
CRON_SECRET=timer-game-secret-2026
"@

# Записати файл
$envPath = Join-Path $PSScriptRoot ".env.local"
$envContent | Out-File -FilePath $envPath -Encoding UTF8

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "✅ ФАЙЛ .env.local СТВОРЕНО!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Файл збережено: $envPath" -ForegroundColor Gray
Write-Host ""
Write-Host "НАСТУПНІ КРОКИ:" -ForegroundColor Cyan
Write-Host "1. Виконайте SQL схему в Supabase (supabase-schema.sql)" -ForegroundColor White
Write-Host "2. Увімкніть Realtime для таблиць (rooms, players, events)" -ForegroundColor White
Write-Host "3. Виконайте: npm install" -ForegroundColor White
Write-Host "4. Виконайте: npm run dev" -ForegroundColor White
Write-Host "5. Відкрийте: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "Детальна інструкція: SETUP_INSTRUCTIONS.md" -ForegroundColor Gray
Write-Host ""
