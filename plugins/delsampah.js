const fs = require('fs');
const setting = require('../setting');
const { isOwner } = require('../lib/helper');

module.exports = {
  name: '.delsampah',
  command: ['.delsampah', '.clearsession'],
  execute: async (conn, sender, args, msg) => {
    // ✅ FIX LID: ambil JID pengirim dengan benar
    const author = msg.key.participant || msg.key.remoteJid;
    const reply = (text) => conn.sendMessage(sender, { text }, { quoted: msg });

    // ✅ FIX: gunakan helper isOwner yang mendukung LID
    if (!isOwner(author, setting.owner)) {
      return reply('❌ Kamu bukan owner.');
    }

    const sessionDir = './auth';

    fs.readdir(sessionDir, async (err, files) => {
      if (err) {
        console.log('❌ Unable to scan directory:', err);
        return reply('❌ Gagal scan folder auth: ' + err.message);
      }

      const filteredArray = files.filter(item =>
        item.startsWith('pre-key') ||
        item.startsWith('sender-key') ||
        item.startsWith('session-') ||
        item.startsWith('app-state')
      );

      let teks = `🧹 Ditemukan ${filteredArray.length} file sampah di folder auth/\n\n`;
      if (filteredArray.length === 0) return reply(teks + '✅ Tidak ada yang perlu dihapus.');

      filteredArray.forEach((e, i) => {
        teks += `${i + 1}. ${e}\n`;
      });

      await reply(teks);
      await new Promise(resolve => setTimeout(resolve, 2000));

      reply('♻️ Menghapus file sampah...');

      filteredArray.forEach(file => {
        try {
          fs.unlinkSync(`${sessionDir}/${file}`);
        } catch (e) {
          console.error(`❌ Gagal hapus file ${file}:`, e);
        }
      });

      reply(`✅ ${filteredArray.length} file berhasil dihapus dari auth/.`);
    });
  }
};
