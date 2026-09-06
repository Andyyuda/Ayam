const setting = require('../setting');
const { isOwner } = require('../lib/helper');

module.exports = {
  name: '.restart',
  command: ['.restart'],
  async execute(conn, sender, args, msg) {
    const fromJid = msg.key.participant || msg.key.remoteJid;

    if (!isOwner(fromJid, setting.owner)) {
      return conn.sendMessage(sender, {
        text: '⛔ Hanya owner yang bisa menggunakan perintah ini.'
      }, { quoted: msg });
    }

    await conn.sendMessage(sender, {
      text: '♻️ Bot sedang direstart...'
    }, { quoted: msg });

    setTimeout(() => {
      process.exit(0);
    }, 1000);
  }
};
