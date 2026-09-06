/**
 * .resetai — Reset riwayat chat AI per grup/pribadi
 */
const aiPlugin = require('./ai.js');

module.exports = {
  name: '.resetai',
  command: ['.resetai', '.clearchat'],
  async execute(conn, sender, args, msg) {
    const jid = msg.key.remoteJid;
    // Import history dari ai.js (shared via module cache)
    try {
      delete require.cache[require.resolve('./ai.js')];
    } catch {}
    await conn.sendMessage(sender, {
      text: '🗑️ Riwayat chat AI sudah direset!\n\nMulai percakapan baru dengan _.ai <pertanyaan>_'
    }, { quoted: msg });
  }
};
