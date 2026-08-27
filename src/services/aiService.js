const OpenAI = require("openai");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const supabase = require("./supabaseClient");

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
- FITUR PAP FOTO: Jika user meminta foto/pap dari Anda (baobao), tambahkan satu tag berikut di baris paling bawah sendiri:
  * [SEND_IMAGE: sleep] jika meminta pap waktu malam atau mau tidur.
  * [SEND_IMAGE: eat] jika membahas tentang makanan/makan.
  * [SEND_IMAGE: walk] jika membahas jalan-jalan atau di luar rumah.
  * [SEND_IMAGE: default] jika meminta pap foto biasa tanpa konteks khusus.
  JANGAN gunakan tag ini jika user tidak meminta foto/pap diri Anda.
`;

async function extractAndSaveMemory(userId, message) {
  if (!message || message.trim().length < 5 || !userId) return;
  try {
    const prompt = `Ekstrak fakta penting tentang pengguna dari pesan berikut yang penting/berguna untuk diingat oleh pacar virtualnya di masa depan.
Fakta penting meliputi: nama panggilan, kesukaan/hobi, makanan favorit, tanggal lahir/ulang tahun, detail keluarga/teman, hewan peliharaan, pekerjaan, atau ketakutan/alergi.

Pesan: "${message}"

Aturan:
- Jika pesan tidak mengandung informasi personal baru tentang pengguna, balas hanya dengan kata "NONE".
- Jika ada informasi baru, tuliskan fakta tersebut dalam 1 kalimat singkat Bahasa Indonesia (maksimal 10 kata). Contoh: "Sangat suka makan sempolan goreng." atau "Ulang tahunnya tanggal 10 Oktober."
- Jangan berikan penjelasan lain. Balas dengan "NONE" jika ragu.`;

    const response = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 50
    });

    const result = response.choices[0].message.content.trim();
    if (result && result.toUpperCase() !== "NONE" && !result.includes("NONE")) {
      await supabase.from('user_memories').insert({
        user_id: userId,
        fact: result
      });
      console.log(`Saved new memory for user ${userId}: ${result}`);
    }
  } catch (err) {
    console.error("Failed to extract memory:", err);
  }
}

async function generateAIResponse(userId, history, message, imageBase64, mimeType, steps, distance) {
  try {
    const now = new Date();
    const timeString = now.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
    
    let enrichedMessage = message || "Halo";
    enrichedMessage += `\n\n[SYSTEM INFO: Waktu saat ini adalah ${timeString} WIB. Kamu harus sadar waktu (jangan billing selamat pagi kalau ini malam).]`;
    
    // Get hour in Asia/Jakarta timezone, NOT server UTC
    const hourString = now.toLocaleString("en-US", { timeZone: "Asia/Jakarta", hour: 'numeric', hour12: false });
    const localHour = parseInt(hourString, 10);
    
    // Only send sensor data to AI at night (after 18:00 or before 05:00) OR if user says sleep keywords
    const isNight = localHour >= 18 || localHour < 5;
    const isSleepy = message && message.toLowerCase().match(/(tidur|sleep|bobo|ngantuk|pamit|bye)/);
    
    if (steps !== undefined && distance !== undefined && (isNight || isSleepy)) {
      enrichedMessage += `\n[SYSTEM SENSOR DATA: User Steps Today: ${steps}. Distance from home: ${Math.round(distance)} meters.]`;
    }

    // Fetch user memories
    let memoriesText = "";
    if (userId) {
      try {
        const { data: memories, error } = await supabase
          .from('user_memories')
          .select('fact')
          .eq('user_id', userId);
        
        if (!error && memories && memories.length > 0) {
          memoriesText = "\n\nFakta penting tentang pacarmu saat ini yang harus kamu ingat:\n" + 
            memories.map(m => `- ${m.fact}`).join("\n");
        }
      } catch (err) {
        console.error("Error fetching memories:", err);
      }
    }

    const dynamicSystemInstruction = SYSTEM_INSTRUCTION + memoriesText;

    if (imageBase64) {
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", systemInstruction: dynamicSystemInstruction });
        
        const imagePart = {
          inlineData: {
            data: imageBase64,
            mimeType: mimeType || "image/jpeg"
          }
        };

        const result = await model.generateContent([enrichedMessage, imagePart]);
        const responseText = result.response.text();
        
        // Trigger background memory extraction
        if (userId && message) {
          extractAndSaveMemory(userId, message).catch(err => console.error(err));
        }

        return responseText;
      } catch (visionError) {
        console.error("Gemini Vision Error:", visionError);
        return "Sayankk, maaf bgt mata aku (AI Vision) lagi error nih, gak bisa liat fotonya. 😭 Coba ceritain aja itu foto apa!";
      }
    }

    const messages = [
      { role: "system", content: dynamicSystemInstruction }
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

    // Trigger background memory extraction asynchronously
    if (userId && message) {
      extractAndSaveMemory(userId, message).catch(err => console.error(err));
    }

    // Add a small artificial delay so the bot doesn't reply too fast (feels more natural)
    await new Promise(resolve => setTimeout(resolve, 1500));

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Groq AI Error:", error);
    throw error;
  }
}

module.exports = { generateAIResponse };
