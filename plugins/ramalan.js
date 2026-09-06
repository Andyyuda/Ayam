/**
 * .ramalan — Ramalan harian / nasib acak
 * .horoscope <zodiak> — horoskop zodiak
 * .angkahoki — angka hoki hari ini
 */

const RAMALAN = [
  '⭐ Hari ini adalah hari yang penuh peluang. Jangan ragu untuk mengambil risiko yang sudah kamu pertimbangkan!',
  '🌈 Keberuntungan ada di pihakmu. Seseorang akan membawa kabar baik untukmu hari ini.',
  '💪 Tantangan yang kamu hadapi hari ini akan menjadi batu loncatan kesuksesanmu.',
  '❤️ Hubungan interpersonalmu akan semakin erat. Jaga komunikasi dengan orang-orang terkasih.',
  '💰 Rezeki datang dari arah yang tidak terduga. Buka matamu dan perhatikan sekitarmu.',
  '🧘 Hari ini butuh kesabaran ekstra. Tenangkan pikiran dan jangan terburu-buru mengambil keputusan.',
  '🌟 Bakat tersembunyi siap muncul! Ini saatnya menunjukkan kemampuan terbaikmu.',
  '🤝 Pertemuan dengan seseorang hari ini bisa mengubah hidupmu. Perhatikan siapa yang hadir.',
  '📚 Ilmu baru akan membuka pintu yang selama ini tertutup. Teruslah belajar!',
  '🌙 Mimpi yang kamu impikan sudah dekat dengan kenyataan. Terus berusaha dan berdoa.',
  '⚡ Energimu sedang tinggi! Manfaatkan momentum ini untuk menyelesaikan pekerjaan tertunda.',
  '🎯 Fokus pada satu tujuan hari ini. Jangan biarkan gangguan mengalihkan perhatianmu.',
  '🌺 Keindahan ada di hal-hal kecil. Luangkan waktu untuk bersyukur atas apa yang kamu miliki.',
  '🔮 Perubahan besar sedang mendekatimu. Sambut dengan hati terbuka dan penuh keyakinan.',
  '💡 Ide brilian akan muncul saat kamu least expect it. Siapkan catatan!',
];

const ZODIAK = {
  aries: { emoji: '♈', periode: '21 Mar - 19 Apr' },
  taurus: { emoji: '♉', periode: '20 Apr - 20 Mei' },
  gemini: { emoji: '♊', periode: '21 Mei - 20 Jun' },
  cancer: { emoji: '♋', periode: '21 Jun - 22 Jul' },
  leo: { emoji: '♌', periode: '23 Jul - 22 Agu' },
  virgo: { emoji: '♍', periode: '23 Agu - 22 Sep' },
  libra: { emoji: '♎', periode: '23 Sep - 22 Okt' },
  scorpio: { emoji: '♏', periode: '23 Okt - 21 Nov' },
  sagitarius: { emoji: '♐', periode: '22 Nov - 21 Des' },
  capricorn: { emoji: '♑', periode: '22 Des - 19 Jan' },
  aquarius: { emoji: '♒', periode: '20 Jan - 18 Feb' },
  pisces: { emoji: '♓', periode: '19 Feb - 20 Mar' },
};

const ASPEK = ['❤️ Cinta', '💼 Karir', '💰 Keuangan', '🏥 Kesehatan'];
const BINTANG = ['⭐', '⭐⭐', '⭐⭐⭐', '⭐⭐⭐⭐', '⭐⭐⭐⭐⭐'];
const WARNA_HOKI = ['🔴 Merah', '🟡 Kuning', '🔵 Biru', '🟢 Hijau', '🟣 Ungu', '🟠 Oranye', '⚪ Putih', '⚫ Hitam'];

function angkaHoki(seed) {
  const r = (n) => Math.floor(((seed * 9301 + 49297) % 233280) / 233280 * n);
  const angka = [];
  while (angka.length < 4) {
    const n = (r(99) + 1) * (angka.length + 1) % 100;
    if (!angka.includes(n)) angka.push(n);
    seed = seed * 1103515245 + 12345;
  }
  return angka;
}

module.exports = {
  name: '.ramalan',
  command: ['.ramalan', '.horoscope', '.zodiak', '.angkahoki'],

  async execute(conn, sender, args, msg) {
    const cmd = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || '').trim().split(' ')[0].toLowerCase();
    const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
    const seed  = new Date().toDateString().split('').reduce((a, c) => a + c.charCodeAt(0), 0);

    // Angka hoki
    if (cmd === '.angkahoki') {
      const jid   = msg.key.remoteJid;
      const angka = angkaHoki(seed + jid.split('').reduce((a, c) => a + c.charCodeAt(0), 0));
      const warna = WARNA_HOKI[seed % WARNA_HOKI.length];
      return conn.sendMessage(sender, {
        text: `🔮 *ANGKA HOKI HARI INI*\n📅 ${today}\n\n🎲 Angka hoki: *${angka.join(' - ')}*\n🎨 Warna hoki: *${warna}*\n\n_Gunakan angka ini dengan bijak!_`
      }, { quoted: msg });
    }

    // Horoskop zodiak
    if (cmd === '.horoscope' || cmd === '.zodiak') {
      const nama = (args[0] || '').toLowerCase();
      if (!nama || !ZODIAK[nama]) {
        const list = Object.entries(ZODIAK).map(([k, v]) => `${v.emoji} ${k} (${v.periode})`).join('\n');
        return conn.sendMessage(sender, {
          text: `🔮 *HOROSKOP*\n\nGunakan: _.horoscope <zodiak>_\nContoh: _.horoscope leo_\n\n*Daftar zodiak:*\n${list}`
        }, { quoted: msg });
      }

      const z = ZODIAK[nama];
      const horosArr = ASPEK.map(a => `${a}: ${BINTANG[seed % BINTANG.length]}`);
      const ramalan  = RAMALAN[(seed + nama.length) % RAMALAN.length];

      return conn.sendMessage(sender, {
        text: `${z.emoji} *${nama.toUpperCase()}* (${z.periode})\n📅 ${today}\n\n${horosArr.join('\n')}\n\n🔮 *Ramalan:*\n${ramalan}\n\n🍀 Angka beruntung: *${(seed % 9) + 1}*\n🎨 Warna beruntung: *${WARNA_HOKI[seed % WARNA_HOKI.length]}*`
      }, { quoted: msg });
    }

    // Ramalan umum
    const r = RAMALAN[Math.floor(Math.random() * RAMALAN.length)];
    await conn.sendMessage(sender, {
      text: `🔮 *RAMALAN HARI INI*\n📅 ${today}\n\n${r}\n\n🍀 Angka keberuntungan: *${Math.floor(Math.random() * 99) + 1}*\n🎨 Warna hoki: *${WARNA_HOKI[Math.floor(Math.random() * WARNA_HOKI.length)]}*\n\n_Semua kembali kepada usaha dan doa ya!_ 🙏`
    }, { quoted: msg });
  }
};
