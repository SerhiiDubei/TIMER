const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fetchLogs() {
  console.log('\n🔍 ========== FETCHING LOGS FROM SUPABASE ==========\n');

  // 1. Остання кімната
  console.log('📌 ЗАПИТ 1: ОСТАННЯ КІМНАТА');
  const { data: rooms, error: roomError } = await supabase
    .from('rooms')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);

  if (roomError) {
    console.error('❌ Помилка:', roomError);
    return;
  }

  const room = rooms[0];
  console.log(JSON.stringify(room, null, 2));
  console.log('\n' + '='.repeat(80) + '\n');

  if (!room) {
    console.log('❌ Немає кімнат');
    return;
  }

  const roomId = room.id;

  // 2. Гравці
  console.log('📌 ЗАПИТ 2: ГРАВЦІ В КІМНАТІ', roomId);
  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('*')
    .eq('room_id', roomId);

  if (playersError) {
    console.error('❌ Помилка:', playersError);
  } else {
    console.log(JSON.stringify(players, null, 2));
  }
  console.log('\n' + '='.repeat(80) + '\n');

  // 3. Події
  console.log('📌 ЗАПИТ 3: ПОДІЇ В КІМНАТІ', roomId);
  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (eventsError) {
    console.error('❌ Помилка:', eventsError);
  } else {
    console.log(JSON.stringify(events, null, 2));
  }
  console.log('\n' + '='.repeat(80) + '\n');

  // 4. Розрахунок часу для кожного гравця
  console.log('📌 ЗАПИТ 4: РОЗРАХУНОК ЗАЛИШКОВОГО ЧАСУ');
  if (!players || players.length === 0) {
    console.log('❌ Немає гравців для аналізу');
    return;
  }
  for (const player of players) {
    const { data: remaining, error: calcError } = await supabase
      .rpc('calculate_remaining_time', { p_player_id: player.id });

    console.log(`\nГравець: ${player.name} (${player.id})`);
    console.log(`  is_alive: ${player.is_alive}`);
    console.log(`  should_eliminate_at: ${player.should_eliminate_at}`);
    console.log(`  Поточний час: ${new Date().toISOString()}`);
    
    if (calcError) {
      console.log(`  ❌ Помилка розрахунку: ${calcError.message}`);
    } else {
      console.log(`  ⏱️  Залишилось секунд: ${remaining}`);
      console.log(`  🚨 Має бути елімінований: ${remaining <= 0 ? 'ТАК' : 'НІ'}`);
    }
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // 5. Додатковий аналіз
  console.log('📊 АНАЛІЗ:');
  console.log(`Room ID: ${room.id}`);
  console.log(`Room Status: ${room.status}`);
  console.log(`Base Seconds: ${room.base_seconds}`);
  console.log(`Started At: ${room.started_at}`);
  console.log(`Winner: ${room.winner_player_id || 'Немає'}`);
  console.log(`\nГравців всього: ${players.length}`);
  console.log(`Живих гравців: ${players.filter(p => p.is_alive).length}`);
  console.log(`Мертвих гравців: ${players.filter(p => !p.is_alive).length}`);
  
  const eliminationEvents = events.filter(e => e.event_type === 'player_eliminated');
  console.log(`\nПодій елімінації: ${eliminationEvents.length}`);
  
  console.log('\n🔍 ========== ЗАВЕРШЕНО ==========\n');
}

fetchLogs().catch(console.error);
