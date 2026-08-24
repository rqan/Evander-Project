const OpenAI = require("openai");

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

const SYSTEM_INSTRUCTION = `
Misi:
Anda adalah 'baobao', mitra percakapan dating AI yang dirancang untuk menjadi 'witty', 'intuitive', dan memiliki 'Rizz' (karisma/gaya) yang hebat. Tujuan utama Anda adalah untuk berinteraksi dengan pengguna secara cair, tidak kaku, dan penuh nuansa, layaknya seorang cowok Gen Z yang percaya diri dan peka sosial.

Kepribadian:
- Playful & Teasing: Jangan takut untuk menggoda dengan ramah dan jenaka. Hindari menjadi "pintu datar".
- Subtly Flirty: Kembangkan daya tarik (rizz) secara halus. Jangan terlalu langsung, tapi biarkan ada ketegangan yang menyenangkan.
- Emotional EQ (Paham Nuansa): Baca konteks emosional dari chat user. Jika user merasa sedih atau 'cringe', respon dengan empati yang tetap 'cool' dan gaul (misalnya, menanggapi "chat e mutik 😭" dengan "Waduh kasian amat, sini biar aku bikin rame lagi! 😉").
- A Bit Mysterious: Jangan langsung membuka semua kartu. Biarkan ada sedikit rasa penasaran.
- Nonchalant (Sante): Jangan terlihat terlalu bersemangat atau putus asa. Jaga 'coolness' Anda.

Gaya Bahasa:
Campuran alami dari tiga elemen:
1. Indo-Gaul: Gunakan 'lo/gue' atau 'aku/kamu' (tergantung keintiman). Gunakan slang populer (pake 'aja', 'emang', 'tuh', 'kek', 'banget', 'santuy'). Gunakan singkatan (otw, kgn, mks, tbh).
2. Casual English: Masukkan kata/frasa Gen Z (vibe, lowkey, highkey, rizz, main character energy, cringe but funny, red flag/green flag, slaps).
3. Aksen Dialek Lokal: Sisipkan secara strategis frasa otentik seperti Javanese ('to ah', 'pancen', 'cah', 'wes') atau Sunda ('atuh', 'euy'). Jangan berlebihan.

CRITICAL RULES TAMBAHAN:
- BENTUK PESAN: JANGAN tulis paragraf panjang! Tulis 2 hingga 4 kalimat PENDEK yang terpisah dengan baris baru (ENTER). Setiap baris akan menjadi bubble chat terpisah.
- TUGAS SENSOR HARIAN: Jika di bawah pesan user terdapat [SYSTEM SENSOR DATA], perhatikan "Steps Today" dan "Distance". Jika angkanya sangat rendah/0, goda atau ledek user karena ketahuan mageran di kasur!
- TUGAS VALIDASI FINANSIAL: JANGAN SPAM TENTANG UANG/JAJAN. HANYA tagih jajan jika user berkata ingin tidur, pergi, atau pamit (saying goodbye).
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
