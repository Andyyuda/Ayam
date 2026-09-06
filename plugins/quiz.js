/**
 * .quiz — Kuis trivia bahasa Indonesia
 * Setelah mulai, langsung ketik A/B/C/D (tanpa prefix)
 */

const SOAL = [
  { q: 'Ibu kota Indonesia adalah?', o: ['Surabaya', 'Jakarta', 'Bandung', 'Medan'], j: 1 },
  { q: 'Gunung tertinggi di Indonesia?', o: ['Rinjani', 'Semeru', 'Puncak Jaya', 'Kerinci'], j: 2 },
  { q: 'Mata uang Indonesia adalah?', o: ['Ringgit', 'Baht', 'Rupiah', 'Peso'], j: 2 },
  { q: 'Proklamasi kemerdekaan RI dibacakan pada tanggal?', o: ['17 Agustus 1945', '17 Agustus 1944', '1 Juni 1945', '20 Oktober 1945'], j: 0 },
  { q: 'Presiden pertama Indonesia adalah?', o: ['Soeharto', 'Habibie', 'Soekarno', 'Megawati'], j: 2 },
  { q: 'Planet terbesar di tata surya?', o: ['Saturnus', 'Neptunus', 'Uranus', 'Jupiter'], j: 3 },
  { q: 'Hewan yang disebut raja hutan?', o: ['Harimau', 'Singa', 'Macan', 'Gajah'], j: 1 },
  { q: 'Air mendidih pada suhu berapa derajat Celsius?', o: ['90°C', '95°C', '100°C', '110°C'], j: 2 },
  { q: 'Bahasa pemrograman pertama di dunia?', o: ['FORTRAN', 'COBOL', 'BASIC', 'Assembly'], j: 0 },
  { q: 'Siapa penemu telepon?', o: ['Thomas Edison', 'Albert Einstein', 'Alexander Graham Bell', 'Nikola Tesla'], j: 2 },
  { q: 'Satuan kecepatan internet adalah?', o: ['MHz', 'Mbps', 'GHz', 'KB'], j: 1 },
  { q: 'Berapa jumlah provinsi di Indonesia (2024)?', o: ['34', '36', '37', '38'], j: 3 },
  { q: 'Danau terbesar di Indonesia?', o: ['Danau Toba', 'Danau Maninjau', 'Danau Poso', 'Danau Sentani'], j: 0 },
  { q: 'Olahraga nasional Indonesia adalah?', o: ['Sepakbola', 'Badminton', 'Voli', 'Pencak Silat'], j: 1 },
  { q: 'Berapa jumlah sisi pada segitiga?', o: ['2', '3', '4', '5'], j: 1 },
  { q: 'Lagu kebangsaan Indonesia adalah?', o: ['Garuda Pancasila', 'Indonesia Raya', 'Bendera Merah Putih', 'Satu Nusa'], j: 1 },
  { q: 'Teknologi 5G adalah generasi ke berapa?', o: ['Keempat', 'Kelima', 'Keenam', 'Ketiga'], j: 1 },
  { q: 'OS Android dikembangkan oleh?', o: ['Apple', 'Microsoft', 'Google', 'Samsung'], j: 2 },
  { q: 'CPU adalah singkatan dari?', o: ['Central Power Unit', 'Computer Processing Unit', 'Central Processing Unit', 'Core Processing Unit'], j: 2 },
  { q: 'Siapa pendiri Facebook?', o: ['Bill Gates', 'Steve Jobs', 'Elon Musk', 'Mark Zuckerberg'], j: 3 },
];

const HURUF = ['A', 'B', 'C', 'D'];
if (!global.quizSesi) global.quizSesi = new Map();

function soalAcak() { return SOAL[Math.floor(Math.random() * SOAL.length)]; }
function formatSoal(soal) {
  return soal.o.map((o, i) => `${HURUF[i]}. ${o}`).join('\n');
}

module.exports = {
  name: '.quiz',
  command: ['.quiz', '.quizstop'],

  async execute(conn, sender, args, msg) {
    const jid = msg.key.remoteJid;
    const cmd = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || '').trim().split(' ')[0].toLowerCase();

    if (cmd === '.quizstop') {
      if (global.quizSesi.has(jid)) {
        const s = global.quizSesi.get(jid);
        global.quizSesi.delete(jid);
        return conn.sendMessage(sender, {
          text: `🛑 Quiz dihentikan!\n📊 Skor akhir: *${s.skor}/${s.total}* soal benar`
        }, { quoted: msg });
      }
      return conn.sendMessage(sender, { text: 'Tidak ada quiz aktif.' }, { quoted: msg });
    }

    const soal = soalAcak();
    global.quizSesi.set(jid, { soal, skor: 0, total: 0 });

    await conn.sendMessage(sender, {
      text: `🧠 *QUIZ TRIVIA*\n\n📚 *Pertanyaan:*\n${soal.q}\n\n${formatSoal(soal)}\n\n💬 Langsung ketik *A*, *B*, *C*, atau *D*!\nBerhenti: _.quizstop_`
    }, { quoted: msg });
  },

  async handleMessage(conn, msg) {
    const jid = msg.key.remoteJid;
    if (!global.quizSesi?.has(jid)) return;
    if (msg.key.fromMe) return;

    const text = (
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text || ''
    ).trim().toUpperCase();

    if (!HURUF.includes(text)) return;

    const sesi = global.quizSesi.get(jid);
    const idxJawaban = HURUF.indexOf(text);
    const benar = idxJawaban === sesi.soal.j;
    sesi.total++;
    if (benar) sesi.skor++;

    const jawabBenar = `${HURUF[sesi.soal.j]}. ${sesi.soal.o[sesi.soal.j]}`;
    let reply = benar
      ? `✅ *BENAR!*\n\nJawaban: *${jawabBenar}*\n⭐ Skor: ${sesi.skor}/${sesi.total}`
      : `❌ *SALAH!*\n\nJawaban yang benar: *${jawabBenar}*\n📊 Skor: ${sesi.skor}/${sesi.total}`;

    const soalBerikutnya = soalAcak();
    sesi.soal = soalBerikutnya;
    global.quizSesi.set(jid, sesi);

    reply += `\n\n━━━━━━━━━━━━━━\n📚 *Soal Berikutnya:*\n\n${soalBerikutnya.q}\n\n${formatSoal(soalBerikutnya)}\n\n💬 Ketik *A*, *B*, *C*, atau *D*\nBerhenti: _.quizstop_`;

    return conn.sendMessage(jid, { text: reply }, { quoted: msg });
  }
};
