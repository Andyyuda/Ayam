const fs = require('fs');
const path = require('path');

module.exports = {
  name: '.getplugin',
  command: ['.getplugin'],
  async execute(conn, sender, args, msg) {
    if (!args[0]) {
      return conn.sendMessage(sender, {
        text: '❌ Masukkan nama plugin yang ingin diambil.\nContoh: *.getplugin tes.js*'
      }, { quoted: msg });
    }

    const fileName = args[0];
    if (!fileName.endsWith('.js')) {
      return conn.sendMessage(sender, {
        text: '⚠️ Nama plugin harus berakhiran *.js*'
      }, { quoted: msg });
    }

    const pluginPath = path.join(__dirname, fileName);
    if (!fs.existsSync(pluginPath)) {
      return conn.sendMessage(sender, {
        text: `❌ Plugin *${fileName}* tidak ditemukan di folder plugins.`
      }, { quoted: msg });
    }

    try {
      await conn.sendMessage(sender, {
        document: fs.readFileSync(pluginPath),
        fileName,
        mimetype: 'application/javascript'
      }, { quoted: msg });
    } catch (err) {
      conn.sendMessage(sender, {
        text: `❌ Gagal mengirim plugin:\n${err.message}`
      }, { quoted: msg });
    }
  }
};