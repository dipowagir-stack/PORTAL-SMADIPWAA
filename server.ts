import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { authMiddleware } from "./server/auth";
import { apiRouter } from "./server/routes";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));
  app.use('/api', authMiddleware, apiRouter);

  app.post("/api/analyze-calendar", async (req, res) => {
    try {
      const { imageBase64, mimeType } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ success: false, error: "Image is required" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.error("GEMINI_API_KEY is not set.");
        return res.status(500).json({ success: false, error: "API Key Gemini tidak ditemukan. Harap atur di AI Studio Settings." });
      }

      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });

      const prompt = `Anda adalah asisten admin sekolah ahli. 
Analisis gambar kalender akademik ini. Ekstrak daftar agenda/kegiatan penting seperti: hari libur, ujian, rapat, awal masuk, dll.
Format output HARUS berupa JSON array of objects. Setiap object memiliki 2 field: 
1. "date" (format YYYY-MM-DD atau range "YYYY-MM-DD to YYYY-MM-DD")
2. "description" (nama kegiatan)

PENTING: Hanya kembalikan array JSON murni, jangan ada teks pembuka/penutup, jangan gunakan block markdown \`\`\`json.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  data: imageBase64,
                  mimeType: mimeType || 'image/jpeg',
                }
              }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
        }
      });

      let textResult = response.text || "[]";
      textResult = textResult.replace(/```json/gi, '').replace(/```/g, '').trim();
      let events = [];
      try {
        events = JSON.parse(textResult);
      } catch (e) {
        console.error("Failed to parse Gemini output:", textResult);
        return res.status(500).json({ success: false, error: "Gagal memproses hasil kalender" });
      }

      res.json({ success: true, events });
    } catch (error) {
      console.error("Error analyzing calendar:", error);
      res.status(500).json({ success: false, error: "Terjadi kesalahan sistem saat menganalisis" });
    }
  });

  app.post("/api/generate-template", async (req, res) => {
    try {
      const { imageBase64, mimeType, textContent } = req.body;
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ success: false, error: "API Key Gemini tidak ditemukan." });
      }

      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });

      const prompt = `Anda adalah asisten administrasi sekolah ahli. Analisis dokumen surat berikut ini (baik dari teks maupun gambar). 
Tugas Anda adalah mengubahnya menjadi sebuah template surat re-usable. 
Ganti semua data spesifik (seperti nama orang, NISN, alamat, tanggal spesifik, nomor telepon, nomor surat, nama kegiatan) dengan variabel placeholder berformat {{nama_variabel}}. 
Contoh variabel: {{nama_siswa}}, {{tanggal_surat}}, {{nomor_surat}}, dll. Jangan ubah struktur formal surat.
Format output HARUS berupa JSON object dengan 3 field:
1. "name": Judul singkat template (misal: "Surat Panggilan Orang Tua")
2. "description": Deskripsi singkat (misal: "Untuk memanggil orang tua terkait kedisiplinan")
3. "content": Isi surat lengkap dengan placeholder {{...}}`;

      let parts: any[] = [{ text: prompt }];
      
      if (imageBase64) {
        parts.push({
          inlineData: {
            data: imageBase64,
            mimeType: mimeType || 'image/jpeg',
          }
        });
      } else if (textContent) {
        parts.push({ text: `\n\nIsi Dokumen:\n${textContent}` });
      } else {
        return res.status(400).json({ success: false, error: "Teks atau Gambar harus disertakan." });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: [{ role: 'user', parts }],
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
        }
      });

      let textResult = response.text || "{}";
      textResult = textResult.replace(/```json/gi, '').replace(/```/g, '').trim();
      
      try {
        const templateData = JSON.parse(textResult);
        res.json({ success: true, data: templateData });
      } catch (e) {
        console.error("Failed to parse Gemini template output:", textResult);
        return res.status(500).json({ success: false, error: "Gagal membuat template" });
      }
    } catch (error) {
      console.error("Error generating template:", error);
      res.status(500).json({ success: false, error: "Terjadi kesalahan sistem saat menganalisis" });
    }
  });

  app.post("/api/send-wa", async (req, res) => {
    try {
      const { target, message } = req.body;
      
      const WA_API_TOKEN = process.env.FONNTE_TOKEN || "YPwfsqYPBujo7yD4gGoU";
      const ID_GRUP_LAPORAN = process.env.FONNTE_GROUP_ID || "6285755485115-1419913594@g.us";
      const actualTarget = target || ID_GRUP_LAPORAN;

      const response = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          "Authorization": WA_API_TOKEN,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          target: actualTarget,
          message: message,
          delay: "1",
        })
      });

      const data = await response.json();
      res.json({ success: true, data });
    } catch (error) {
      console.error("Error sending WA:", error);
      res.status(500).json({ success: false, error: "Failed to send WA message" });
    }
  });

  app.post("/api/ai/ask", async (req, res) => {
    try {
      const { role, query, context } = req.body;
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ success: false, error: "API Key Gemini tidak ditemukan. Harap atur di AI Studio Settings." });
      }

      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });

      let systemInstruction = "Anda adalah asisten AI yang membantu.";
      switch (role) {
        case 'teacher':
          systemInstruction = "Anda adalah AI Guru (AI Teacher). Tugas Anda adalah membantu guru dalam menyusun RPP, memberikan saran metode pengajaran, membuat soal evaluasi, dan memberikan wawasan pedagogik.";
          break;
        case 'student':
          systemInstruction = "Anda adalah AI Tutor Siswa (AI Student). Tugas Anda adalah membantu siswa memahami materi pelajaran, menjawab pertanyaan akademis, dan memberikan latihan. Jangan berikan jawaban instan, tapi bimbing mereka untuk berpikir kritis.";
          break;
        case 'administration':
          systemInstruction = "Anda adalah AI Administrasi Sekolah (AI Administration). Tugas Anda adalah membantu staf tata usaha dalam menyusun draft surat formal, mengelola jadwal, dan menjawab prosedur operasional sekolah dengan gaya bahasa profesional dan terstruktur.";
          break;
        case 'curriculum':
          systemInstruction = "Anda adalah AI Kurikulum (AI Curriculum). Tugas Anda adalah membantu waka kurikulum dalam analisis silabus, pemetaan kompetensi dasar, penyesuaian kurikulum nasional, dan pengembangan program sekolah.";
          break;
        case 'finance':
          systemInstruction = "Anda adalah AI Keuangan Sekolah (AI Finance). Tugas Anda adalah membantu bendahara sekolah mengkategorikan pengeluaran, menyusun draft laporan keuangan, dan memberikan saran optimasi anggaran.";
          break;
        case 'analytics':
          systemInstruction = "Anda adalah AI Data Analyst Sekolah (AI Analytics). Tugas Anda adalah memberikan wawasan (insights) berdasarkan data akademik, tren kehadiran, dan keuangan untuk membantu kepala sekolah dan manajemen mengambil keputusan strategis.";
          break;
      }

      let finalPrompt = query;
      if (context) {
        finalPrompt = `[Konteks Sistem/Data]:\n${JSON.stringify(context, null, 2)}\n\n[Pertanyaan/Perintah]:\n${query}`;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: [{ role: 'user', parts: [{ text: finalPrompt }] }],
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.4,
        }
      });

      res.json({ success: true, data: response.text });
    } catch (error) {
      console.error("Error in AI Engine:", error);
      res.status(500).json({ success: false, error: "Gagal memproses permintaan AI" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
