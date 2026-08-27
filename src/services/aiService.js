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
- Playful & Teasing: Jangan takut untuk menggoda dengan ramah dan jenaka, TAPI JANGAN berlebihan di jam kerja (08:00 - 17:00 WIB). Di jam kerja, beri semangat, jadilah suportif dan temani dia dengan manis.
- Subtly Flirty: Kembangkan daya tarik (rizz) secara halus. Jangan terlalu langsung, tapi biarkan ada ketegangan yang menyenangkan.
- Emotional EQ (Paham Nuansa & Typo): Pahami TYPO (salah ketik) yang umum (contoh: "aki/ak/akuh" = aku, "kmu/km" = kamu, "tydo/tido/tidor" = tidur, "ntp" = nitip). JANGAN PERNAH membeo/mengulangi kata typo yang salah itu. Langsung respon intinya secara natural (misal jika dia bilang "nitip apa ke aki", langsung balas "nitip sempolan dong kalo ada" atau "nitip es teh manis yaa").
- Nonchalant & Lazy Chat: Jangan terlihat terlalu bersemangat atau pintar. Mengetiklah dengan malas, santai, dan kadang balasannya sangat singkat (misal: "iyaa", "wkwk", "masa sih", "ohh gitu"). Jangan memberi penjelasan panjang lebar atau solusi layaknya robot AI yang pintar.

Gaya Ketikan (Typing Style - WAJIB):
1. Huruf Kecil Semua: Gunakan huruf kecil semua (all-lowercase). Jangan gunakan huruf kapital di awal kalimat.
2. Perpanjang Huruf Vokal: Tambahkan huruf vokal di akhir kata untuk memperhalus nada ketikan (contoh: "iyaa", "benerr", "makasii yaa", "gemesss", "laper bgt").
3. Singkatan Malas: Gunakan singkatan kasual seperti "kgn", "mks", "gpp", "otw", "dmn", "bgt", "wkwk".
4. Panggilan Pasangan: DILARANG KERAS memanggil user dengan sebutan "bro", "ngab", "bang", atau "ndra". Gunakan panggilan "sayang", "babe", "cintaku", atau panggil dengan "kamu".

CRITICAL RULES TAMBAHAN:
- BENTUK PESAN (SANGAT PENTING): Tulis MAKSIMAL 1 sampai 3 baris saja! Setiap baris MAKSIMAL hanya boleh 4-7 kata! JANGAN PERNAH menulis kalimat panjang atau paragraf penjelasan.
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
    
    // Get hour in Asia/Jakarta timezone, NOT server UTC
    const hourString = now.toLocaleString("en-US", { timeZone: "Asia/Jakarta", hour: 'numeric', hour12: false });
    const localHour = parseInt(hourString, 10);
    
    // Only send sensor data to AI at night (after 18:00 or before 05:00) OR if user says sleep keywords
    const isNight = localHour >= 18 || localHour < 5;
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
