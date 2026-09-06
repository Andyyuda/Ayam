/**
 * .tebakangka — Game tebak angka 1-100
 * Setelah mulai, langsung ketik angka (tanpa prefix)
 */

if (!global.tebakGame) global.tebakGame = new Map();

module.exports = {
  name: '.tebakangka',
  command: ['.tebakangka', '.ta'],

  async execute(conn, sender, args, msg) {
    const jid = msg.key.remoteJid;
    const angka = Math.floor(Math.random() * 100) + 1;
    global.tebakGame.set(jid, { angka, coba: 0, max: 7 });
    return conn.sendMessage(sender, {
      text: `🎮 *TEBAK ANGKA*\n\nAku sudah pilih angka antara *1 - 100*!\nKamu punya *7 kesempatan* untuk menebak.\n\n💬 Langsung ketik angkanya saja!\nContoh: *50*\n\n🕐 Game dimulai! Good luck!`
    }, { quoted: msg });
  },

  async handleMessage(conn, msg) {
    const jid = msg.key.remoteJid;
    if (!global.tebakGame?.has(jid)) return;
    if (msg.key.fromMe) return;

    const text = (
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text || ''
    ).trim();

    // Cek apakah pesan adalah angka murni
    if (!/^\d+$/.test(text)) return;

    const game = global.tebakGame.get(jid);
    const tebakan = parseInt(text);

    if (tebakan < 1 || tebakan > 100) {
      return conn.sendMessage(jid, {
        text: `⚠️ Angka harus antara *1 - 100*!`
      }, { quoted: msg });
    }

    game.coba++;
    const sisa = game.max - game.coba;

    if (tebakan === game.angka) {
      global.tebakGame.delete(jid);
      const emoji = game.coba <= 3 ? '🏆' : game.coba <= 5 ? '🎉' : '😅';
      return conn.sendMessage(jid, {
        text: `${emoji} *BENAR!*\n\nAngkanya adalah *${game.angka}*!\nKamu berhasil dalam *${game.coba} percobaan*!\n\n${game.coba === 1 ? '🤯 LUAR BIASA! Tebakan pertama!' : game.coba <= 3 ? '⭐ Bagus sekali!' : '✅ Selamat!'}\n\nMain lagi? Ketik _.tebakangka_`
      }, { quoted: msg });
    }

    if (game.coba >= game.max) {
      global.tebakGame.delete(jid);
      return conn.sendMessage(jid, {
        text: `💀 *GAME OVER!*\n\nAngkanya adalah *${game.angka}*.\nSayang sekali, kamu kehabisan kesempatan!\n\nCoba lagi? Ketik _.tebakangka_`
      }, { quoted: msg });
    }

    const hint = tebakan < game.angka
      ? `📈 Terlalu *KECIL*! Coba yang lebih besar.`
      : `📉 Terlalu *BESAR*! Coba yang lebih kecil.`;

    global.tebakGame.set(jid, game);
    return conn.sendMessage(jid, {
      text: `${hint}\n\n🎯 Tebakan: *${tebakan}*\n⏳ Sisa kesempatan: *${sisa}*\n\nKetik angka lagi:`
    }, { quoted: msg });
  }
};
