/**
 * .ai / .chat — Chat dengan Google Gemini Flash
 */
const fetch = require('node-fetch');

const API_KEY = 'AQ.Ab8RN6IgGVE4OVgqsjPxe3remYXyJ1yL5oTTdVKe_W66ADntxw';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${API_KEY}`;

const SYSTEM = `Kamu adalah AndyBot AI, asisten WhatsApp yang ramah, cerdas, dan seru.
Jawab dalam bahasa Indonesia yang santai.
Jawaban singkat, jelas, dan mudah dipahami.`;

const history = new Map();

module.exports = {
  name: '.ai',
  command: ['.ai', '.chat', '.tanya', '.andy'],

  async execute(conn, sender, args, msg) {
    const prompt = args.join(' ').trim();

    if (!prompt) {
      return conn.sendMessage(sender, {
        text: `🤖 *AndyBot AI (Gemini)*

Gunakan:
.ai <pertanyaan>

Contoh:
• .ai siapa presiden Indonesia?
• .ai buatkan puisi tentang hujan
• .ai jelaskan cara kerja VPN

📝 Ketik *.resetai* untuk menghapus riwayat chat.`
      }, { quoted: msg });
    }

    const jid = msg.key.remoteJid;

    if (!history.has(jid)) history.set(jid, []);
    const hist = history.get(jid);

    hist.push({
      role: 'user',
      parts: [{ text: prompt }]
    });

    if (hist.length > 10) hist.splice(0, hist.length - 10);

    await conn.sendMessage(sender, {
      react: {
        text: '🤔',
        key: msg.key
      }
    });

    try {
      const contents = [
        {
          role: 'user',
          parts: [{ text: SYSTEM }]
        },
        ...hist
      ];

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents
        }),
        timeout: 30000
      });

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      const text =
        data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      if (!text) {
        throw new Error('Respon kosong dari Gemini.');
      }

      hist.push({
        role: 'model',
        parts: [{ text }]
      });

      history.set(jid, hist);

      await conn.sendMessage(sender, {
        react: {
          text: '✅',
          key: msg.key
        }
      });

      await conn.sendMessage(sender, {
        text: `🤖 *AndyBot AI (Gemini)*

${text}

_Tanya lagi: .ai <pertanyaan>_`
      }, { quoted: msg });

    } catch (e) {
      await conn.sendMessage(sender, {
        react: {
          text: '❌',
          key: msg.key
        }
      });

      await conn.sendMessage(sender, {
        text: `❌ Gagal mendapatkan respon dari Gemini.

_Error: ${e.message}_`
      }, { quoted: msg });
    }
  }
};