/**
 * .truth — Dapat pertanyaan truth acak
 * .dare  — Dapat tantangan dare acak
 * .tod   — Truth or Dare acak
 */

const TRUTH = [
  'Siapa orang yang paling sering kamu pikirin akhir-akhir ini?',
  'Apa kebohongan terbesar yang pernah kamu katakan ke orang tua?',
  'Pernah punya crush sama teman sendiri? Siapa?',
  'Apa hal yang paling memalukan yang pernah kamu lakukan?',
  'Kalau bisa jujur, apa yang paling tidak kamu suka dari dirimu sendiri?',
  'Pernahkah kamu nangis karena seseorang? Karena apa?',
  'Apa rahasia yang belum pernah kamu ceritakan ke siapapun?',
  'Pernah khianati kepercayaan orang lain? Ceritakan.',
  'Kalau bisa pilih siapapun di grup ini jadi pacar, siapa?',
  'Hal apa yang paling kamu sesali dalam hidupmu?',
  'Pernah stalk mantan di medsos? Berapa kali?',
  'Apa aplikasi yang paling sering kamu pakai dan tidak mau diketahui orang?',
  'Pernah pura-pura sakit biar tidak masuk kerja/sekolah?',
  'Kalau hidupmu jadi film, judulnya apa?',
  'Siapa yang pertama kali kamu hubungi kalau ada masalah?',
];

const DARE = [
  'Kirim selfie dengan ekspresi paling aneh ke grup ini!',
  'Ganti nama kontak seseorang di HP kamu jadi nama artis selama 1 jam.',
  'Kirim voice note nyanyi 1 bait lagu favoritmu sekarang!',
  'Screenshot chat terakhir kamu dan kirim di sini (tanpa nama kontaknya).',
  'Ketik "Aku suka banget sama grup ini 💕" di status WA selama 10 menit.',
  'Kirim emoji yang paling sering kamu pakai 50 kali berturut-turut.',
  'Jawab pertanyaan apapun yang ditanyakan grup selama 5 menit tanpa bohong.',
  'Ganti foto profil WA jadi foto yang dipilihkan orang lain di grup selama 1 jam.',
  'Ceritakan mimpi paling aneh yang pernah kamu alami.',
  'Kirim pesan ke kontak acak di HP kamu: "Hey, aku kangen kamu 😊"',
  'Lakukan push-up 10 kali dan kirim buktinya ke grup!',
  'Tulis puisi 4 baris tentang seseorang di grup ini (tanpa sebut nama).',
  'Kirim voice note ngomong "Aku ganteng/cantik banget hari ini!" dengan percaya diri.',
  'Tag 3 orang dan bilang hal baik tentang mereka.',
  'Ceritakan hal paling awkward yang pernah terjadi saat kencan/jalan bareng.',
];

module.exports = {
  name: '.truth',
  command: ['.truth', '.dare', '.tod'],

  async execute(conn, sender, args, msg) {
    const cmd = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || '').trim().split(' ')[0].toLowerCase();

    if (cmd === '.truth') {
      const q = TRUTH[Math.floor(Math.random() * TRUTH.length)];
      return conn.sendMessage(sender, {
        text: `💭 *TRUTH*\n\n"${q}"\n\n_Jawab dengan jujur ya! 😏_`
      }, { quoted: msg });
    }

    if (cmd === '.dare') {
      const d = DARE[Math.floor(Math.random() * DARE.length)];
      return conn.sendMessage(sender, {
        text: `🔥 *DARE*\n\n"${d}"\n\n_Harus dilakukan ya, no skip! 😈_`
      }, { quoted: msg });
    }

    // .tod — acak Truth atau Dare
    const isT = Math.random() < 0.5;
    const content = isT
      ? `💭 *TRUTH*\n\n"${TRUTH[Math.floor(Math.random() * TRUTH.length)]}"\n\n_Jawab jujur!_ 😏`
      : `🔥 *DARE*\n\n"${DARE[Math.floor(Math.random() * DARE.length)]}"\n\n_No skip!_ 😈`;

    await conn.sendMessage(sender, {
      text: `🎲 *TRUTH OR DARE* — Dapat: *${isT ? 'TRUTH' : 'DARE'}*\n\n${content}\n\n_Main lagi: .tod | .truth | .dare_`
    }, { quoted: msg });
  }
};
