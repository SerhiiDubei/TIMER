const https = require('https');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

// Читаємо SQL
const sql = fs.readFileSync('fix-auto-eliminate.sql', 'utf8');

// Supabase Management API для виконання SQL
const url = process.env.NEXT_PUBLIC_SUPABASE_URL.replace('https://', '');
const projectRef = url.split('.')[0];

console.log('\n🚀 Виконую SQL через Supabase Management API...\n');

// Спочатку DROP
const dropSql = 'DROP FUNCTION IF EXISTS auto_eliminate_players();';
const createSql = sql.split('DROP FUNCTION IF EXISTS auto_eliminate_players();')[1].trim();

console.log('📝 1. Видаляю стару функцію...\n');

// Використовуємо SQL Editor API
const options = {
  hostname: url,
  port: 443,
  path: '/rest/v1/rpc/query',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Prefer': 'return=representation'
  }
};

// Простіше - використаємо supabase-js напряму
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function executeSQL() {
  try {
    // Спочатку просто викликаємо функцію - якщо працює, значить вже виправлена
    console.log('🔍 Перевіряю чи функція вже виправлена...\n');
    
    const { data: testData, error: testError } = await supabase.rpc('auto_eliminate_players');
    
    if (!testError) {
      console.log('✅ Функція вже працює правильно!');
      console.log('📊 Результат:', JSON.stringify(testData, null, 2));
      return;
    }
    
    if (testError.code === '42883') {
      console.log('⚠️  Функція не існує - потрібно створити.\n');
      console.log('❌ Не можу створити функцію через API - потрібен доступ до SQL Editor.');
      console.log('\n📋 ВИКОНАЙ ЦЕЙ SQL В SUPABASE SQL EDITOR:');
      console.log('=' .repeat(80));
      console.log(sql);
      console.log('='.repeat(80));
      console.log('\n🔗 https://supabase.com/dashboard/project/ffnmlfnzufddmecfpive/sql/new\n');
    } else if (testError.code === '42702') {
      console.log('⚠️  Функція існує але має помилку (ambiguous column).\n');
      console.log('❌ Не можу DROP/CREATE через API - потрібен доступ до SQL Editor.');
      console.log('\n📋 ВИКОНАЙ ЦЕЙ SQL В SUPABASE SQL EDITOR:');
      console.log('='.repeat(80));
      console.log(sql);
      console.log('='.repeat(80));
      console.log('\n🔗 https://supabase.com/dashboard/project/ffnmlfnzufddmecfpive/sql/new\n');
    } else {
      console.log('❌ Інша помилка:', testError);
    }
    
  } catch (e) {
    console.error('❌ Помилка:', e.message);
  }
}

executeSQL();
