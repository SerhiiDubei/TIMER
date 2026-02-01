const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

// Supabase Postgres connection string
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const projectRef = supabaseUrl.replace('https://', '').split('.')[0];

const connectionString = `postgresql://postgres.${projectRef}:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`;

// Альтернативно, використаємо direct connection
const client = new Client({
  host: `aws-0-eu-central-1.pooler.supabase.com`,
  port: 6543,
  database: 'postgres',
  user: 'postgres',
  password: process.env.SUPABASE_SERVICE_ROLE_KEY, // спробуємо service role key як пароль
  ssl: { rejectUnauthorized: false }
});

async function executeSQL() {
  console.log('\n🚀 Підключаюсь до Postgres напряму...\n');
  console.log('Project Ref:', projectRef);
  
  try {
    await client.connect();
    console.log('✅ Підключено!\n');

    // Читаємо SQL
    const sql = fs.readFileSync('fix-auto-eliminate.sql', 'utf8');
    
    console.log('📝 Виконую SQL...\n');
    
    // Виконуємо весь SQL за один раз
    const result = await client.query(sql);
    
    console.log('✅ УСПІХ!');
    console.log('📊 Результат:', JSON.stringify(result.rows, null, 2));
    
  } catch (error) {
    if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      console.log('❌ Не можу підключитись до Postgres напряму.');
      console.log('   Причина: потрібен Database Password з Supabase Dashboard.\n');
      
      console.log('📋 АЛЬТЕРНАТИВА: Виконай SQL вручну:');
      console.log('='.repeat(80));
      const sql = fs.readFileSync('fix-auto-eliminate.sql', 'utf8');
      console.log(sql);
      console.log('='.repeat(80));
      console.log('\n🔗 https://supabase.com/dashboard/project/ffnmlfnzufddmecfpive/sql/new\n');
    } else {
      console.log('❌ Помилка:', error.message);
      console.log('   Код:', error.code);
      
      if (error.message.includes('password')) {
        console.log('\n⚠️  Потрібен Database Password.');
        console.log('   Service Role Key не працює для прямого підключення.\n');
        
        console.log('📋 ВИКОНАЙ SQL ВРУЧНУ В SUPABASE:');
        console.log('='.repeat(80));
        const sql = fs.readFileSync('fix-auto-eliminate.sql', 'utf8');
        console.log(sql);
        console.log('='.repeat(80));
        console.log('\n🔗 https://supabase.com/dashboard/project/ffnmlfnzufddmecfpive/sql/new\n');
      }
    }
  } finally {
    await client.end();
  }
}

executeSQL();
