/**
 * .kata / .quote — Kata-kata motivasi & bijak
 * .katacinta    — Kata-kata cinta/romantis
 * .katafunny    — Kata-kata lucu/meme
 */

const MOTIVASI = [
  '"Jangan pernah menyerah. Hari ini berat, besok akan lebih baik." — Jack Ma',
  '"Kesuksesan adalah hasil dari persiapan, kerja keras, dan belajar dari kegagalan." — Colin Powell',
  '"Mimpi itu gratis. Perjuangkan mimpimu." — Anonim',
  '"Jangan menunggu. Waktu tidak pernah tepat." — Napoleon Hill',
  '"Orang sukses melakukan apa yang gagal dilakukan orang lain." — Thomas Edison',
  '"Satu-satunya cara untuk melakukan pekerjaan hebat adalah mencintai apa yang kamu lakukan." — Steve Jobs',
  '"Setiap pagi kita diberi 86.400 detik. Gunakan dengan bijak." — Anonim',
  '"Bukan tentang seberapa keras kamu jatuh, tapi seberapa cepat kamu bangkit." — Anonim',
  '"Percayalah pada prosesnya. Hasil tidak datang dalam semalam." — Anonim',
  '"Jadilah perubahan yang ingin kamu lihat di dunia." — Mahatma Gandhi',
  '"Sukses dimulai dari keberanian untuk memulai." — Mark Twain',
  '"Tidak ada yang mustahil jika kamu percaya." — Anonim',
  '"Hidup terlalu singkat untuk dihabiskan dengan menyesal." — Anonim',
  '"Belajarlah dari kemarin, hiduplah untuk hari ini, berharaplah untuk esok." — Albert Einstein',
  '"Keberhasilan bukan milik orang yang pintar. Keberhasilan milik orang yang gigih." — BJ Habibie',
];

const CINTA = [
  '"Cinta bukan tentang melihat satu sama lain, tapi tentang melihat ke arah yang sama bersama." — Antoine de Saint-Exupéry',
  '"Kamu tidak membutuhkan seseorang yang sempurna. Kamu butuh seseorang yang membuatmu merasa sempurna." — Anonim',
  '"Cinta sejati tidak berakhir dengan perpisahan." — Anonim',
  '"Ketika aku bersamamu, detik terasa seperti tahun yang ingin kuulang lagi." — Anonim',
  '"Cinta itu bukan soal kata-kata indah, tapi tentang kesetiaan di saat-saat tersulit." — Anonim',
  '"Kamu adalah alasan mengapa aku percaya bahwa sesuatu yang baik masih ada di dunia ini." — Anonim',
  '"Ada orang yang hadir sebentar tapi meninggalkan jejak yang lama." — Anonim',
  '"Jatuh cinta bukan berarti lemah. Itu berarti kamu cukup berani untuk memilih bahagia." — Anonim',
];

const FUNNY = [
  '"Rajin pangkal pandai. Malas pangkal tidur seharian." — Netizen Indonesia 🛌',
  '"Sabar itu ada batasnya. Batas ATM gue." — Anonim 💳',
  '"Lebih baik pacar jauh di mata, dekat di hati. Dari pada pacar dekat di mata, terus minta dibeliin sesuatu." — Filosofi Warteg 🍲',
  '"Diet dimulai besok. Hari ini makan dulu buat tenaga." — Anonim 🍔',
  '"Jangan lihat siapa yang bicara, tapi lihat apa yang dibicarakan. Kalau gak paham juga, tidur aja." — Anonim 😴',
  '"Hidup itu singkat. Jangan buang waktu untuk orang yang tidak menghargaimu... kecuali dia bayar gaji." — Anonim 💰',
  '"Banyak jalan menuju Roma. Tapi Google Maps lebih dipercaya." — Gen Z Wisdom 📱',
  '"Yang penting bukan kaya atau miskin, tapi koneksi internet kencang." — Millennial Proverb 📶',
  '"Rezeki sudah diatur. Tapi kalau tidak diusahakan, rezekinya ngatur diri sendiri." — Anonim 😂',
  '"Tidur adalah solusi. Bangun adalah masalah." — Filosofi Kasur 🛏️',
];

module.exports = {
  name: '.kata',
  command: ['.kata', '.quote', '.katacinta', '.katafunny', '.motivasi'],

  async execute(conn, sender, args, msg) {
    const cmd = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || '').trim().split(' ')[0].toLowerCase();

    let list, label, emoji;
    if (cmd === '.katacinta') { list = CINTA; label = 'KATA CINTA'; emoji = '❤️'; }
    else if (cmd === '.katafunny') { list = FUNNY; label = 'KATA LUCU'; emoji = '😂'; }
    else { list = MOTIVASI; label = 'KATA MOTIVASI'; emoji = '💪'; }

    const q = list[Math.floor(Math.random() * list.length)];
    await conn.sendMessage(sender, {
      text: `${emoji} *${label}*\n\n${q}\n\n_Ketik .kata / .katacinta / .katafunny untuk quote lainnya_`
    }, { quoted: msg });
  }
};
