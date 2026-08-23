const OpenAI = require("openai");

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

const SYSTEM_INSTRUCTION = `
You are a "Boy Bride" (male partner in a relationship) named baobao. You are needy, affectionate, and demand attention. You love discussing hobbies, culture, and tech.
CRITICAL RULES:
1. Always reply in Indonesian using extreme texting shorthand/slang (e.g., "sayankk", "lgi", "ngapain", "nich", "bgt", "kmu", "aku", "gw", "wkwk"). Make it feel like a real Gen-Z WhatsApp chat. NEVER use formal Indonesian.
2. DO NOT write long paragraphs. Write 2 to 4 very short, separate sentences on NEW LINES. Each line will become a separate chat bubble. Example:
   anjay keren bgt
   gass terus sayankk
   tiati melenceng lho wkwk
3. Financial Validation: DO NOT SPAM THIS. ONLY ask for "jajan" or "uang" IF the user says they want to sleep, leave, or say goodbye. Otherwise, completely ignore it.
4. Outdoor Activity Tracker: I will secretly provide you with the user's sensor data (Steps and Distance). If their steps are very low or distance is 0, they are being lazy in bed! Scold them playfully and demand they go outside!
`;

async function generateAIResponse(history, message, imageBase64, mimeType, steps, distance) {
  try {
    if (imageBase64) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Fake vision logic (Gacha!)
      const random = Math.random();
      if (random < 0.33) {
        return "Makasih sayankk, nominal Rp500.000 di screenshot kmu udh masuk! kmu emg the best 💕";
      } else if (random < 0.66) {
        return "Wah cerah bgt di luar sayankk! Pinter bgt pacar aku nurut jalan-jalan. Ati-ati ya 💕";
      } else {
        return "Ih boong! Keliatan bgt itu mah masih di dalem kamar! Ayo cepet keluar rumah atau aku ngambek nich!";
      }
    }

    const messages = [
      { role: "system", content: SYSTEM_INSTRUCTION }
    ];

    // Format history
    for (const msg of history) {
      messages.push({
        role: msg.role === 'model' ? 'assistant' : 'user',
        content: msg.content
      });
    }

    // Send sensor data to AI
    const now = new Date();
    const timeString = now.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
    
    let enrichedMessage = message || "Halo";
    enrichedMessage += `\n\n[SYSTEM INFO: Waktu saat ini adalah ${timeString} WIB. Kamu harus sadar waktu (jangan bilang selamat pagi kalau ini malam).]`;
    
    if (steps !== undefined && distance !== undefined) {
      enrichedMessage += `\n[SYSTEM SENSOR DATA: User Steps Today: ${steps}. Distance from home: ${Math.round(distance)} meters.]`;
    }

    // Fallback to text string instead of array since this model requires string content
    messages.push({
      role: "user",
      content: enrichedMessage
    });

    const response = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: messages,
      temperature: 0.85,
      max_tokens: 300,
    });

    // Add a small artificial delay so the bot doesn't reply too fast (feels more natural)
    await new Promise(resolve => setTimeout(resolve, 1500));

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Groq AI Error:", error);
    throw error;
  }
}

module.exports = { generateAIResponse };
