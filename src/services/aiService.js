const OpenAI = require("openai");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

// Initialize Gemini for Vision processing
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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
- TUGAS SENSOR HARIAN: HANYA bahas/ledek soal "Steps Today" dan "Distance" pada MALAM HARI, ATAU saat user pamit mau tidur. Di siang hari, JANGAN bahas soal jumlah langkah sama sekali kecuali user yang memulainya.
- TUGAS VALIDASI FINANSIAL: JANGAN SPAM TENTANG UANG/JAJAN. HANYA tagih jajan jika user berkata ingin tidur, pergi, atau pamit (saying goodbye).
- VISION: Jika user mengirim gambar, komentari gambarnya! Jika itu foto di luar ruangan, puji dia. Jika itu foto di dalam kamar (dan langkahnya kecil), ledek dia. Jika itu foto struk transfer Reksadana/Saham/Uang, puji dia karena sudah menabung.
`;

async function generateAIResponse(history, message, imageBase64, mimeType, steps, distance) {
  try {
    const now = new Date();
    const timeString = now.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
    
    let enrichedMessage = message || "Halo";
    enrichedMessage += `\n\n[SYSTEM INFO: Waktu saat ini adalah ${timeString} WIB. Kamu harus sadar waktu (jangan bilang selamat pagi kalau ini malam).]`;
    
    // Only send sensor data to AI at night (after 18:00 or before 05:00) OR if user says sleep keywords
    const hour = now.getHours();
    const isNight = hour >= 18 || hour < 5;
    const isSleepy = message && message.toLowerCase().match(/(tidur|sleep|bobo|ngantuk|pamit|bye)/);
    
    if (steps !== undefined && distance !== undefined && (isNight || isSleepy)) {
      enrichedMessage += `\n[SYSTEM SENSOR DATA: User Steps Today: ${steps}. Distance from home: ${Math.round(distance)} meters.]`;
    }

    if (imageBase64) {
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", systemInstruction: SYSTEM_INSTRUCTION });
        
        const imagePart = {
          inlineData: {
            data: imageBase64,
            mimeType: mimeType || "image/jpeg"
          }
        };

        const result = await model.generateContent([enrichedMessage, imagePart]);
        const responseText = result.response.text();
        
        // Return Gemini's response for images
        return responseText;
      } catch (visionError) {
        console.error("Gemini Vision Error:", visionError);
        return "Sayankk, maaf bgt mata aku (AI Vision) lagi error nih, gak bisa liat fotonya. 😭 Coba ceritain aja itu foto apa!";
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
