#!/usr/bin/env node

/**
 * Автоматичне виконання SQL схеми в Supabase
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Читання .env.local
const envPath = path.join(__dirname, '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('❌ Файл .env.local не знайдено!');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && !key.startsWith('#') && key.trim()) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Не знайдено SUPABASE_URL або SERVICE_ROLE_KEY');
  process.exit(1);
}

console.log('✓ .env.local прочитано');
console.log(`  URL: ${SUPABASE_URL}`);
console.log('');

// Створення Supabase client
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Читання SQL файлу
const sqlPath = path.join(__dirname, 'supabase-schema.sql');
if (!fs.existsSync(sqlPath)) {
  console.error('❌ Файл supabase-schema.sql не знайдено!');
  process.exit(1);
}

const sql = fs.readFileSync(sqlPath, 'utf-8');

console.log('✓ supabase-schema.sql прочитано');
console.log('');
console.log('Виконую SQL запити...');
console.log('Це може зайняти 10-30 секунд...');
console.log('');

// Виконання SQL
async function runSQL() {
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // exec_sql може не існувати, тому виконаємо по частинах
      console.log('⚠️  exec_sql не доступний, виконую по частинах...');
      
      // Розділимо SQL на окремі statements
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
      
      let success = 0;
      let failed = 0;
      
      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        if (stmt) {
          try {
            // Виконуємо через REST API
            const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
              },
              body: JSON.stringify({ query: stmt + ';' })
            });
            
            if (response.ok) {
              success++;
              process.stdout.write(`✓ [${i + 1}/${statements.length}]\r`);
            } else {
              failed++;
              console.log(`\n⚠️  Пропущено statement ${i + 1}: ${stmt.substring(0, 50)}...`);
            }
          } catch (err) {
            failed++;
          }
        }
      }
      
      console.log('');
      console.log(`✓ Виконано: ${success} statements`);
      if (failed > 0) {
        console.log(`⚠️  Пропущено: ${failed} statements`);
      }
      console.log('');
      console.log('⚠️  УВАГА: Автоматичне виконання може бути неповним!');
      console.log('');
      console.log('Рекомендується виконати SQL вручну:');
      console.log('1. Відкрийте: https://supabase.com/dashboard/project/ffnmlfnzufddmecfpive/editor');
      console.log('2. Створіть New Query');
      console.log('3. Скопіюйте весь вміст файлу supabase-schema.sql');
      console.log('4. Вставте і натисніть Run');
      console.log('');
    } else {
      console.log('✓ SQL виконано успішно!');
      console.log('');
    }
  } catch (error) {
    console.error('❌ Помилка:', error.message);
    console.log('');
    console.log('Виконайте SQL вручну:');
    console.log('1. Відкрийте: https://supabase.com/dashboard/project/ffnmlfnzufddmecfpive/editor');
    console.log('2. Створіть New Query');
    console.log('3. Скопіюйте весь вміст файлу supabase-schema.sql');
    console.log('4. Вставте і натисніть Run');
    console.log('');
    process.exit(1);
  }
}

runSQL().then(() => {
  console.log('================================');
  console.log('   НАСТУПНІ КРОКИ:');
  console.log('================================');
  console.log('');
  console.log('1. Увімкніть Realtime:');
  console.log('   https://supabase.com/dashboard/project/ffnmlfnzufddmecfpive/database/replication');
  console.log('   Увімкніть для: rooms, players, events');
  console.log('');
  console.log('2. Запустіть проект:');
  console.log('   npm run dev');
  console.log('');
  console.log('================================');
  console.log('');
});
