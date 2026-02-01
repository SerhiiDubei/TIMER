// Local script for testing periodic elimination checks
// Usage: node scripts/check-eliminations-loop.js

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET || 'dev-secret';
const INTERVAL_MS = 10000; // 10 seconds

async function checkEliminations() {
  try {
    const response = await fetch(`${APP_URL}/api/admin/check-eliminations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ secret: CRON_SECRET })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log(`[${new Date().toISOString()}] Checked ${data.checked} room(s), eliminated ${data.eliminated.length} player(s)`);
      if (data.eliminated.length > 0) {
        data.eliminated.forEach(e => {
          console.log(`  - ${e.player_name} (${e.player_id})`);
        });
      }
    } else {
      console.error(`[${new Date().toISOString()}] Error:`, data.error);
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Failed to check eliminations:`, error.message);
  }
}

console.log('Starting elimination check loop...');
console.log(`Checking every ${INTERVAL_MS / 1000} seconds`);
console.log(`Target: ${APP_URL}`);
console.log('Press Ctrl+C to stop\n');

// Run immediately
checkEliminations();

// Then run periodically
setInterval(checkEliminations, INTERVAL_MS);
