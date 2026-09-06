const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

  // ─────────────────────────────────────────────────────────────────────────────
  // 🗃️ Database soal
  // ─────────────────────────────────────────────────────────────────────────────
  const SOAL = [
    // 🐾 Hewan
    { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Cat03.jpg/1200px-Cat03.jpg', jawaban: 'kucing', hint: 'hewan peliharaan yang suka mengeong', kategori: '🐾 Hewan' },
    { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/YellowLabradorLooking_new.jpg/1200px-YellowLabradorLooking_new.jpg', jawaban: 'anjing', hint: 'sahabat setia manusia', kategori: '🐾 Hewan' },
    { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Camponotus_flavomarginatus_ant.jpg/640px-Camponotus_flavomarginatus_ant.jpg', jawaban: 'semut', hint: 'serangga kecil yang hidup berkoloni', kategori: '🐾 Hewan' },

    // 🍎 Buah
    { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Red_Apple.jpg/800px-Red_Apple.jpg', jawaban: 'apel', hint: 'buah merah atau hijau yang renyah', kategori: '🍎 Buah' },
    { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Banana-Fruit-Pieces.jpg/1024px-Banana-Fruit-Pieces.jpg', jawaban: 'pisang', hint: 'buah kuning kesukaan monyet', kategori: '🍎 Buah' },
    { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Hapus_Mango.jpg/1200px-Hapus_Mango.jpg', jawaban: 'mangga', hint: 'buah tropis yang manis dan harum', kategori: '🍎 Buah' },
    { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Jeruk_Bali_asli.JPG/1024px-Jeruk_Bali_asli.JPG', jawaban: 'jeruk', hint: 'buah yang kaya vitamin C', kategori: '🍎 Buah' },
    { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Garden_strawberries_%28Fragaria_%C3%97_ananassa%29.jpg/1200px-Garden_strawberries_%28Fragaria_%C3%97_ananassa%29.jpg', jawaban: 'stroberi', hint: 'buah merah kecil yang asam manis', kategori: '🍎 Buah' },

    // 🍕 Makanan
    { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Eq_it-na_pizza-margherita_sep2005_sml.jpg/1200px-Eq_it-na_pizza-margherita_sep2005_sml.jpg', jawaban: 'pizza', hint: 'makanan Italia berbentuk bulat dengan topping', kategori: '🍕 Makanan' },
    { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Nasi-goreng.jpg/1200px-Nasi-goreng.jpg', jawaban: 'nasi goreng', hint: 'makanan khas Indonesia yang digoreng', kategori: '🍕 Makanan' },

    // 🏔️ Alam
    { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Everest_North_Face_toward_Base_Camp_Tibet_Luca_Galuzzi_2006.jpg/1280px-Everest_North_Face_toward_Base_Camp_Tibet_Luca_Galuzzi_2006.jpg', jawaban: 'gunung', hint: 'dataran tinggi yang menjulang ke langit', kategori: '🏔️ Alam' },

    // 🏛️ Landmark
    { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Tour_Eiffel_Wikimedia_Commons.jpg/800px-Tour_Eiffel_Wikimedia_Commons.jpg', jawaban: 'menara eiffel', hint: 'menara besi terkenal di Paris, Perancis', kategori: '🏛️ Landmark' },
    { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Empire_State_Building_%28aerial_view%29.jpg/800px-Empire_State_Building_%28aerial_view%29.jpg', jawaban: 'empire state building', hint: 'gedung pencakar langit terkenal di New York', kategori: '🏛️ Landmark' },

    // 🎨 Seni
    { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/800px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg', jawaban: 'mona lisa', hint: 'lukisan terkenal karya Leonardo da Vinci', kategori: '🎨 Seni' },
  ];

  const TIMEOUT_MS  = 60_000;
  const HINT_LEVELS = 3;

  // ─────────────────────────────────────────────────────────────────────────────
  // 🔧 Helper
  // ─────────────────────────────────────────────────────────────────────────────
  function getSoalAcak(usedIndices = []) {
    const available = SOAL.map((_, i) => i).filter(i => !usedIndices.includes(i));
    if (available.length === 0) return null;
    const idx = available[Math.floor(Math.random() * available.length)];
    return { soal: SOAL[idx], idx };
  }

  function sensorJawaban(jawaban, level) {
    return jawaban.split(' ').map(k => {
      const tampil = Math.max(1, Math.floor(k.length * (level / HINT_LEVELS)));
      return k.slice(0, tampil).padEnd(k.length, '_');
    }).join(' ');
  }

  async function fetchImageBuffer(url) {
    const res = await fetch(url, { timeout: 10000 });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.buffer();
  }

  function formatSkor(skor) {
    const entries = Object.entries(skor).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) return '_Belum ada skor_';
    return entries.map(([jid, poin], i) => {
      const nomor = jid.replace(/@s\.whatsapp\.net|@g\.us/, '');
      const medal = ['🥇', '🥈', '🥉'][i] ?? (i + 1) + '.';
      return medal + ' ' + nomor + ': *' + poin + ' poin*';
    }).join('\n');
  }

  function clearTimer(sender) {
    const s = global.userState[sender];
    if (s?._timer) { clearTimeout(s._timer); s._timer = null; }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 🚀 Kirim soal baru & set sesi
  // ─────────────────────────────────────────────────────────────────────────────
  async function kirimSoal(sock, sender) {
    const prev        = global.userState[sender];
    const usedIndices = prev?.usedIndices ?? [];
    const skor        = prev?.skor ?? {};

    const result = getSoalAcak(usedIndices);

    if (!result) {
      delete global.userState[sender];
      return await sock.sendMessage(sender, {
        text: '🎉 *Semua soal sudah habis!*\n\n📊 *Skor Akhir:*\n' + formatSkor(skor) + '\n\nKetik *.tg* untuk main lagi dari awal.'
      });
    }

    const { soal, idx } = result;

    global.userState[sender] = {
      status      : '.tebakgambar',
      soal,
      hintLevel   : 0,
      usedIndices : [...usedIndices, idx],
      skor,
      _timer      : null
    };

    try {
      const imgBuf = await fetchImageBuffer(soal.url);
      await sock.sendMessage(sender, {
        image  : imgBuf,
        caption:
          '🎮 *TEBAK GAMBAR!*\n' +
          '📂 Kategori: ' + soal.kategori + '\n\n' +
          '❓ *Gambar ini apa?*\n\n' +
          'Ketik jawabanmu langsung di chat!\n' +
          '⏰ Waktu: 60 detik\n\n' +
          '💡 *.hint*   — minta petunjuk\n' +
          '⏭️ *.skip*   — lewati soal\n' +
          '🏆 *.skortg* — lihat skor\n' +
          '🛑 *.stoptg* — berhenti main'
      });
    } catch (e) {
      await sock.sendMessage(sender, { text: '❌ Gagal memuat gambar. Ketik *.tg* untuk coba lagi.' });
      delete global.userState[sender];
      return;
    }

    global.userState[sender]._timer = setTimeout(async () => {
      const s = global.userState[sender];
      if (!s || s.status !== '.tebakgambar') return;
      const jawaban = s.soal.jawaban;
      await sock.sendMessage(sender, {
        text: '⏰ *Waktu habis!*\nJawabannya: *' + jawaban + '*\n\nMemuat soal berikutnya...'
      });
      setTimeout(() => kirimSoal(sock, sender), 2000);
    }, TIMEOUT_MS);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 📦 Export Plugin
  // ─────────────────────────────────────────────────────────────────────────────
  module.exports = {
    name   : '.tebakgambar',
    command: ['.tebakgambar', '.tg'],

    async execute(sock, sender, args, msg, text) {
      const s = global.userState[sender];

      if (s?.status === '.tebakgambar') {
        return await sock.sendMessage(sender, {
          text: '⚠️ Game sedang berjalan!\nKetik jawabanmu, atau gunakan:\n💡 *.hint* | ⏭️ *.skip* | 🛑 *.stoptg*'
        }, { quoted: msg });
      }

      await sock.sendMessage(sender, {
        text: '🎮 *TEBAK GAMBAR* dimulai!\nTotal *' + SOAL.length + ' soal* dari berbagai kategori.\n\nSiap? Ini soal pertama! 🚀'
      }, { quoted: msg });

      await kirimSoal(sock, sender);
    },

    async handleSession(sock, sender, text, msg) {
      const s = global.userState[sender];
      if (!s || s.status !== '.tebakgambar') return;

      const senderJid = msg.key.participant || sender;
      const textLow   = text.trim().toLowerCase();

      if (textLow === '.hint') {
        if (s.hintLevel >= HINT_LEVELS) {
          return await sock.sendMessage(sender, {
            text: '💡 Hint sudah habis!\nKlue: _' + s.soal.hint + '_\nPola: *' + sensorJawaban(s.soal.jawaban, HINT_LEVELS) + '*'
          }, { quoted: msg });
        }
        s.hintLevel++;
        const pola = sensorJawaban(s.soal.jawaban, s.hintLevel);
        return await sock.sendMessage(sender, {
          text: '💡 *Hint ' + s.hintLevel + '/' + HINT_LEVELS + '*\n' + s.soal.hint + '\n\nPola: *' + pola + '*'
        }, { quoted: msg });
      }

      if (textLow === '.skip') {
        clearTimer(sender);
        const jawaban = s.soal.jawaban;
        await sock.sendMessage(sender, {
          text: '⏭️ Soal dilewati!\nJawabannya: *' + jawaban + '*\n\nMemuat soal berikutnya...'
        }, { quoted: msg });
        setTimeout(() => kirimSoal(sock, sender), 1500);
        return;
      }

      if (textLow === '.stoptg') {
        clearTimer(sender);
        const skor = s.skor;
        delete global.userState[sender];
        return await sock.sendMessage(sender, {
          text: '🛑 *Game dihentikan!*\n\n📊 *Skor Akhir:*\n' + formatSkor(skor) + '\n\nKetik *.tg* untuk main lagi!'
        }, { quoted: msg });
      }

      if (textLow === '.skortg') {
        return await sock.sendMessage(sender, {
          text: '📊 *Skor Saat Ini:*\n' + formatSkor(s.skor)
        }, { quoted: msg });
      }

      const normalize = (str) => str.toLowerCase().replace(/\s+/g, ' ').trim();

      if (normalize(textLow) === normalize(s.soal.jawaban)) {
        clearTimer(sender);

        const poin = Math.max(1, HINT_LEVELS + 1 - s.hintLevel);
        if (!s.skor[senderJid]) s.skor[senderJid] = 0;
        s.skor[senderJid] += poin;

        const nama      = msg.pushName || senderJid.replace(/@s\.whatsapp\.net|@g\.us/, '');
        const totalSkor = s.skor[senderJid];

        await sock.sendMessage(sender, {
          text:
            '✅ *BENAR!* 🎉\n' +
            '👤 *' + nama + '* mendapat *+' + poin + ' poin!*\n' +
            '🏆 Total skormu: *' + totalSkor + ' poin*\n\n' +
            'Memuat soal berikutnya...'
        }, { quoted: msg });

        setTimeout(() => kirimSoal(sock, sender), 2000);
      }
    }
  };
  