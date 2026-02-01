#!/usr/bin/env node

/**
 * Автоматичне створення таблиць в Supabase
 * 
 * Використання:
 * node setup-database.js
 */

const fs = require('fs');
const path = require('path');

// Кольорові виводи в консоль
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

async function main() {
  log('\n================================', 'cyan');
  log('   DATABASE SETUP SCRIPT', 'cyan');
  log('================================\n', 'cyan');

  // Перевірка .env.local
  const envPath = path.join(__dirname, '.env.local');
  if (!fs.existsSync(envPath)) {
    log('❌ Файл .env.local не знайдено!', 'red');
    log('   Створіть файл .env.local з конфігурацією Supabase', 'yellow');
    log('   Використайте setup.ps1 для автоматичного налаштування\n', 'yellow');
    process.exit(1);
  }

  // Читання .env.local
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const env = {};
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && !key.startsWith('#')) {
      env[key.trim()] = valueParts.join('=').trim();
    }
  });

  const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    log('❌ Не знайдено SUPABASE_URL або SERVICE_ROLE_KEY в .env.local', 'red');
    process.exit(1);
  }

  log('✓ .env.local знайдено', 'green');
  log(`  URL: ${SUPABASE_URL}`, 'cyan');
  log('');

  // Читання SQL файлу
  const sqlPath = path.join(__dirname, 'supabase-schema.sql');
  if (!fs.existsSync(sqlPath)) {
    log('❌ Файл supabase-schema.sql не знайдено!', 'red');
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlPath, 'utf-8');
  log('✓ supabase-schema.sql прочитано', 'green');
  log('');

  // Виконання SQL через REST API
  log('Виконую SQL запити...', 'yellow');
  log('Це може зайняти кілька секунд...', 'yellow');
  log('');

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
      // Якщо метод exec_sql не існує, виводимо інструкцію вручну
      log('⚠️  Автоматичне виконання SQL не підтримується', 'yellow');
      log('');
      log('Виконайте SQL вручну:', 'bright');
      log('1. Відкрийте: https://supabase.com/dashboard/project/ffnmlfnzufddmecfpive/editor', 'cyan');
      log('2. Створіть New Query', 'cyan');
      log('3. Скопіюйте весь вміст файлу supabase-schema.sql', 'cyan');
      log('4. Вставте в редактор і натисніть Run', 'cyan');
      log('');
    } else {
      log('✓ SQL виконано успішно!', 'green');
      log('');
    }
  } catch (error) {
    log('⚠️  Не вдалося виконати SQL автоматично', 'yellow');
    log('');
    log('Виконайте SQL вручну:', 'bright');
    log('1. Відкрийте: https://supabase.com/dashboard/project/ffnmlfnzufddmecfpive/editor', 'cyan');
    log('2. Створіть New Query', 'cyan');
    log('3. Скопіюйте весь вміст файлу supabase-schema.sql', 'cyan');
    log('4. Вставте в редактор і натисніть Run', 'cyan');
    log('');
  }

  log('================================', 'cyan');
  log('   НАСТУПНІ КРОКИ:', 'cyan');
  log('================================\n', 'cyan');
  
  log('1. Увімкніть Realtime:', 'yellow');
  log('   https://supabase.com/dashboard/project/ffnmlfnzufddmecfpive/database/replication', 'cyan');
  log('   Увімкніть для: rooms, players, events', 'cyan');
  log('');
  
  log('2. Запустіть проект:', 'yellow');
  log('   npm run dev', 'green');
  log('');
  
  log('================================\n', 'cyan');
}

main().catch(console.error);
