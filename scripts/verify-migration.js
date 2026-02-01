const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyMigration() {
  console.log('\n🔍 ========== ПЕРЕВІРКА МІГРАЦІЇ ==========\n');

  // 1. Перевіряємо структуру таблиці players
  console.log('📋 1. СТРУКТУРА ТАБЛИЦІ PLAYERS:');
  const { data: columns, error: colError } = await supabase
    .rpc('exec_sql', {
      query: `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'players'
        ORDER BY ordinal_position;
      `
    });

  if (colError) {
    console.log('❌ Не можу отримати структуру через RPC, спробую інакше...\n');
    
    // Альтернативний спосіб - просто отримати дані
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('*')
      .limit(1)
      .single();
    
    if (!playerError && player) {
      console.log('✅ Колонки в таблиці players:');
      console.log(Object.keys(player).join(', '));
      console.log('\n🔍 Чи є is_alive?', 'is_alive' in player ? '✅ ТАК' : '❌ НІ');
      console.log('🔍 Чи є eliminated_at?', 'eliminated_at' in player ? '✅ ТАК' : '❌ НІ');
      console.log('🔍 Чи є should_eliminate_at?', 'should_eliminate_at' in player ? '✅ ТАК' : '❌ НІ');
    }
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // 2. Перевіряємо чи існують функції
  console.log('📋 2. ФУНКЦІЇ В БАЗІ:');
  
  const functions = [
    'calculate_elimination_time',
    'update_player_elimination_time',
    'update_all_players_elimination_time',
    'auto_eliminate_players'
  ];

  for (const funcName of functions) {
    try {
      // Спробуємо викликати метаінформацію
      const { data, error } = await supabase
        .from('pg_proc')
        .select('proname')
        .eq('proname', funcName)
        .single();
      
      if (error) {
        console.log(`❌ ${funcName}: НЕ ЗНАЙДЕНО`);
      } else {
        console.log(`✅ ${funcName}: ІСНУЄ`);
      }
    } catch (e) {
      console.log(`⚠️  ${funcName}: НЕ МОЖУ ПЕРЕВІРИТИ (${e.message})`);
    }
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // 3. Тестуємо auto_eliminate_players
  console.log('📋 3. ТЕСТ ФУНКЦІЇ auto_eliminate_players():');
  const { data: eliminated, error: elimError } = await supabase
    .rpc('auto_eliminate_players');

  if (elimError) {
    console.log('❌ ПОМИЛКА:', elimError.message);
    console.log('   Код:', elimError.code);
    console.log('   Деталі:', elimError.details);
  } else {
    console.log('✅ ФУНКЦІЯ ПРАЦЮЄ!');
    console.log('   Результат:', JSON.stringify(eliminated, null, 2));
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // 4. Перевіряємо останню кімнату
  console.log('📋 4. ДАНІ ОСТАННЬОЇ КІМНАТИ:');
  const { data: room } = await supabase
    .from('rooms')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  console.log('Room ID:', room.id);
  console.log('Status:', room.status);
  console.log('Winner:', room.winner_player_id || 'Немає');

  // 5. Гравці
  const { data: players } = await supabase
    .from('players')
    .select('id, name, eliminated_at, should_eliminate_at')
    .eq('room_id', room.id);

  console.log('\n📋 ГРАВЦІ:');
  for (const p of players) {
    const now = new Date();
    const shouldElim = p.should_eliminate_at ? new Date(p.should_eliminate_at) : null;
    const isPast = shouldElim && shouldElim < now;
    
    console.log(`\n  ${p.name} (${p.id.slice(0, 8)}...):`);
    console.log(`    eliminated_at: ${p.eliminated_at || 'null'}`);
    console.log(`    should_eliminate_at: ${p.should_eliminate_at || 'null'}`);
    if (shouldElim) {
      console.log(`    Час минув? ${isPast ? '🚨 ТАК (має бути елімінований!)' : '⏳ Ні (ще живий)'}`);
    }
  }

  console.log('\n🔍 ========== ЗАВЕРШЕНО ==========\n');
}

verifyMigration().catch(console.error);
