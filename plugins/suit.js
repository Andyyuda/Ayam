/**
 * .suit — Rock Paper Scissors (Batu Gunting Kertas)
 */

const PILIHAN = ['batu', 'gunting', 'kertas'];
const EMOJI   = { batu: '🪨', gunting: '✂️', kertas: '📄' };
const MENANG  = { batu: 'gunting', gunting: 'kertas', kertas: 'batu' };

if (!global.suitScore) global.suitScore = new Map();

module.exports = {
  name: '.suit',
  command: ['.suit', '.bkg', '.rps'],

  async execute(conn, sender, args, msg) {
    const senderJid = msg.key.participant || msg.key.remoteJid;

    if (!args[0]) {
      const score = global.suitScore.get(senderJid) || { menang: 0, kalah: 0, seri: 0 };
      return conn.sendMessage(sender, {
        text: `✂️ *SUIT (Batu Gunting Kertas)*\n\nPilih: _.suit batu_ / _.suit gunting_ / _.suit kertas_\n\n📊 *Skormu:*\n🏆 Menang: ${score.menang}\n💀 Kalah: ${score.kalah}\n🤝 Seri: ${score.seri}\n\nKetik _.resetskor_ untuk reset skor`
      }, { quoted: msg });
    }

    const pilihanUser = args[0].toLowerCase();
    if (!PILIHAN.includes(pilihanUser)) {
      return conn.sendMessage(sender, {
        text: `⚠️ Pilih salah satu:\n• _.suit batu_\n• _.suit gunting_\n• _.suit kertas_`
      }, { quoted: msg });
    }

    const pilihanBot = PILIHAN[Math.floor(Math.random() * 3)];
    const score = global.suitScore.get(senderJid) || { menang: 0, kalah: 0, seri: 0 };

    let hasil, emoji;
    if (pilihanUser === pilihanBot) {
      hasil = '🤝 *SERI!*'; score.seri++;
    } else if (MENANG[pilihanUser] === pilihanBot) {
      hasil = '🏆 *KAMU MENANG!*'; score.menang++;
    } else {
      hasil = '💀 *KAMU KALAH!*'; score.kalah++;
    }

    global.suitScore.set(senderJid, score);

    await conn.sendMessage(sender, {
      text: `✂️ *SUIT*\n\n👤 Kamu  : ${EMOJI[pilihanUser]} ${pilihanUser.toUpperCase()}\n🤖 Bot   : ${EMOJI[pilihanBot]} ${pilihanBot.toUpperCase()}\n\n${hasil}\n\n📊 Skor — Menang: ${score.menang} | Kalah: ${score.kalah} | Seri: ${score.seri}`
    }, { quoted: msg });
  }
};
