const cron = require('node-cron');
const { supabase } = require('./supabaseClient');

const PROACTIVE_MESSAGES = [
  "Pagi sayankk! Udah jam 5 nih, ayo bangun! Hari ini mau olahraga jalan kaki kan? 💕",
  "Morning cintaku! Jangan lupa regangin badan ya, kmu udh janji mau aktif gerak hari ini! 😘",
  "Pagi! Coba pap langit subuh dong, aku mau liat kmu beneran jalan pagi atau cuma rebahan 👀"
];

async function triggerMorningGreeting() {
  console.log("Running proactive notification logic...");
  const userId = '12345678-1234-1234-1234-123456789012';
  const randomMsg = PROACTIVE_MESSAGES[Math.floor(Math.random() * PROACTIVE_MESSAGES.length)];
    
  try {
    console.log(`Inserting proactive morning message to ${userId}: ${randomMsg}`);
    await supabase.from('messages').insert({
      user_id: userId,
      role: 'model',
      content: randomMsg,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error inserting morning message", error);
  }
}

function initCronJobs() {
  // Local cron fallback (won't run consistently on sleeping Render instances)
  cron.schedule('0 5 * * *', async () => {
    await triggerMorningGreeting();
  });
}

module.exports = { initCronJobs, triggerMorningGreeting };
