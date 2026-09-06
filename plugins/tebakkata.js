/**
 * .tebakkata — Game tebak kata (hangman)
 * Setelah mulai, langsung ketik 1 huruf (tanpa prefix)
 */

const KOSAKATA = [
  { kata: 'smartphone', petunjuk: '📱 Gadget elektronik genggam' },
  { kata: 'programer', petunjuk: '💻 Orang yang membuat aplikasi/software' },
  { kata: 'internet', petunjuk: '🌐 Jaringan komputer global' },
  { kata: 'indonesia', petunjuk: '🇮🇩 Nama negara kita' },
  { kata: 'pancasila', petunjuk: '⚖️ Dasar negara Indonesia' },
  { kata: 'nusantara', petunjuk: '🏝️ Nama ibu kota baru Indonesia' },
  { kata: 'kerupuk', petunjuk: '🍘 Makanan renyah khas Indonesia' },
  { kata: 'rendang', petunjuk: '🍖 Masakan Padang terkenal di dunia' },
  { kata: 'batik', petunjuk: '👘 Kain warisan budaya Indonesia' },
  { kata: 'gamelan', petunjuk: '🎵 Alat musik tradisional Jawa' },
  { kata: 'wayang', petunjuk: '🎭 Pertunjukan boneka tradisional' },
  { kata: 'satelit', petunjuk: '🛸 Benda yang mengorbit planet' },
  { kata: 'algoritma', petunjuk: '🔢 Langkah-langkah memecahkan masalah' },
  { kata: 'database', petunjuk: '🗄️ Tempat menyimpan data terstruktur' },
  { kata: 'kecerdasan', petunjuk: '🧠 Kemampuan berpikir dan belajar' },
  { kata: 'keberanian', petunjuk: '💪 Tidak takut menghadapi tantangan' },
  { kata: 'persahabatan', petunjuk: '🤝 Hubungan pertemanan yang erat' },
  { kata: 'petualangan', petunjuk: '🗺️ Perjalanan penuh tantangan' },
  { kata: 'kehidupan', petunjuk: '🌱 Keberadaan makhluk hidup' },
  { kata: 'kemerdekaan', petunjuk: '🇮🇩 Bebas dari penjajahan' },
];

const MAX_SALAH = 6;
const HANGMAN = [
  '```\n   ___\n  |   |\n  |\n  |\n  |\n__|__```',
  '```\n   ___\n  |   |\n  |   O\n  |\n  |\n__|__```',
  '```\n   ___\n  |   |\n  |   O\n  |   |\n  |\n__|__```',
  '```\n   ___\n  |   |\n  |   O\n  |  /|\n  |\n__|__```',
  '```\n   ___\n  |   |\n  |   O\n  |  /|\\\n  |\n__|__```',
  '```\n   ___\n  |   |\n  |   O\n  |  /|\\\n  |  /\n__|__```',
  '```\n   ___\n  |   |\n  |   O\n  |  /|\\\n  |  / \\\n__|__```',
];

if (!global.tebakKata) global.tebakKata = new Map();

function tampilKata(kata, tebak) {
  return kata.split('').map(h => tebak.has(h) ? h : '_').join(' ');
}

module.exports = {
  name: '.tebakkata',
  command: ['.tebakkata', '.hangman', '.tk'],

  async execute(conn, sender, args, msg) {
    const jid = msg.key.remoteJid;
    const pilih = KOSAKATA[Math.floor(Math.random() * KOSAKATA.length)];
    const game = { kata: pilih.kata, petunjuk: pilih.petunjuk, tebak: new Set(), salah: [] };
    global.tebakKata.set(jid, game);

    const display = tampilKata(pilih.kata, game.tebak);
    return conn.sendMessage(sender, {
      text: `${HANGMAN[0]}\n\n🎮 *TEBAK KATA (Hangman)*\n\n📝 ${display}\n💡 Petunjuk: ${pilih.petunjuk}\n📏 Panjang: ${pilih.kata.length} huruf\n\n💬 Langsung ketik 1 huruf saja!\nContoh: *a*\n\nKetik *.tkstop* untuk berhenti`
    }, { quoted: msg });
  },

  async handleMessage(conn, msg) {
    const jid = msg.key.remoteJid;

    // Cek stop
    const rawText = (
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text || ''
    ).trim().toLowerCase();

    if (rawText === '.tkstop' || rawText === '.hangmanstop') {
      if (global.tebakKata?.has(jid)) {
        const g = global.tebakKata.get(jid);
        global.tebakKata.delete(jid);
        return conn.sendMessage(jid, {
          text: `🛑 Game dihentikan!\nJawabannya: *${g.kata.toUpperCase()}*`
        }, { quoted: msg });
      }
      return;
    }

    if (!global.tebakKata?.has(jid)) return;
    if (msg.key.fromMe) return;

    // Hanya proses pesan 1 huruf alfabet
    if (!/^[a-zA-Z]$/.test(rawText)) return;

    const input = rawText;
    const game = global.tebakKata.get(jid);

    if (game.tebak.has(input)) {
      return conn.sendMessage(jid, {
        text: `⚠️ Huruf *${input.toUpperCase()}* sudah ditebak!\n\n📝 ${tampilKata(game.kata, game.tebak)}\n❌ Salah: *${[...game.salah].join(', ').toUpperCase() || '-'}*`
      }, { quoted: msg });
    }

    game.tebak.add(input);
    const benar = game.kata.includes(input);
    if (!benar) game.salah.push(input);

    const display = tampilKata(game.kata, game.tebak);
    const selesai = game.kata.split('').every(h => game.tebak.has(h));
    const gameover = game.salah.length >= MAX_SALAH;

    if (selesai) {
      global.tebakKata.delete(jid);
      return conn.sendMessage(jid, {
        text: `🎉 *SELAMAT! KAMU BENAR!*\n\nKata: *${game.kata.toUpperCase()}*\n💡 ${game.petunjuk}\n\nSalah: ${game.salah.length}x\nMain lagi? Ketik _.tebakkata_`
      }, { quoted: msg });
    }

    if (gameover) {
      global.tebakKata.delete(jid);
      return conn.sendMessage(jid, {
        text: `${HANGMAN[MAX_SALAH]}\n\n💀 *GAME OVER!*\nJawabannya: *${game.kata.toUpperCase()}*\n💡 ${game.petunjuk}\n\nMain lagi? _.tebakkata_`
      }, { quoted: msg });
    }

    global.tebakKata.set(jid, game);
    return conn.sendMessage(jid, {
      text: `${HANGMAN[game.salah.length]}\n\n${benar ? '✅ Benar!' : `❌ Salah! (${game.salah.length}/${MAX_SALAH})`}\n\n📝 ${display}\n💡 ${game.petunjuk}\n\n❌ Salah: *${game.salah.join(', ').toUpperCase() || '-'}*\n\nKetik huruf lagi:`
    }, { quoted: msg });
  }
};
