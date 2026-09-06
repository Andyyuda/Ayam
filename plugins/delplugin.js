const fs = require('fs');
const path = require('path');

module.exports = {
  name: '.delplugin',
  command: ['.d'],
  async execute(conn, sender, args, msg) {
    if (!args[0]) {
      return conn.sendMessage(sender, {
        text: '❌ Masukkan nama plugin yang ingin dihapus.\nContoh: *.delplugin tes.js*'
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
        text: `❌ Plugin *${fileName}* tidak ditemukan.`
      }, { quoted: msg });
    }

    try {
      fs.unlinkSync(pluginPath);
      conn.sendMessage(sender, {
        text: `✅ Plugin *${fileName}* berhasil dihapus.\nSilakan restart bot untuk menyegarkan plugin.`
      }, { quoted: msg });
    } catch (err) {
      conn.sendMessage(sender, {
        text: `❌ Gagal menghapus plugin:\n${err.message}`
      }, { quoted: msg });
    }
  }
};
