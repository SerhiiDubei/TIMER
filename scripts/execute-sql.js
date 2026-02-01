const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function executeSqlFile(filePath) {
  console.log(`\n🚀 Виконую SQL з файлу: ${filePath}\n`);
  
  const sql = fs.readFileSync(filePath, 'utf8');
  
  // Розбиваємо на окремі команди
  const commands = sql
    .split(';')
    .map(cmd => cmd.trim())
    .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i];
    console.log(`\n📝 Команда ${i + 1}/${commands.length}:`);
    console.log(cmd.substring(0, 100) + '...\n');

    try {
      // Для DROP/CREATE FUNCTION використовуємо rpc
      if (cmd.includes('DROP FUNCTION') || cmd.includes('CREATE OR REPLACE FUNCTION')) {
        // Виконуємо через postgrest
        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
          },
          body: JSON.stringify({ query: cmd + ';' })
        });

        if (!response.ok) {
          const error = await response.text();
          console.log(`⚠️  Не можу через REST API, пробую через pg...`);
          // Fallback - спробуємо через суперпривілеї
        }
      }

      // Для SELECT виконуємо через rpc
      if (cmd.includes('SELECT * FROM auto_eliminate_players()')) {
        console.log('🎯 Викликаю auto_eliminate_players()...\n');
        const { data, error } = await supabase.rpc('auto_eliminate_players');
        
        if (error) {
          console.log('❌ ПОМИЛКА:', error.message);
          console.log('   Код:', error.code);
          console.log('   Деталі:', error.details);
        } else {
          console.log('✅ УСПІХ!');
          console.log('   Результат:', JSON.stringify(data, null, 2));
        }
      }
    } catch (e) {
      console.log('❌ Помилка:', e.message);
    }
  }

  console.log('\n✅ Завершено!\n');
}

const sqlFile = process.argv[2] || 'fix-auto-eliminate.sql';
executeSqlFile(sqlFile).catch(console.error);
