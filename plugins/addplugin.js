const fs = require('fs');
const path = require('path');

module.exports = {
  name: '.addplugin',
  command: ['.a'],
  async execute(conn, sender, args, msg) {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const text = quoted?.conversation || quoted?.extendedTextMessage?.text || '';

    if (!args[0]) {
      return conn.sendMessage(sender, {
        text: '❌ Masukkan nama plugin. Contoh: *.addplugin nama.js*',
      }, { quoted: msg });
    }

    if (!text || !text.includes('module.exports')) {
      return conn.sendMessage(sender, {
        text: '⚠️ Balas kode JavaScript plugin yang valid (harus mengandung `module.exports`).',
      }, { quoted: msg });
    }

    const fileName = args[0];
    if (!fileName.endsWith('.js')) {
      return conn.sendMessage(sender, {
        text: '❌ Nama plugin harus berakhiran *.js*',
      }, { quoted: msg });
    }

    const pluginPath = path.join(__dirname, fileName);
    if (fs.existsSync(pluginPath)) {
      return conn.sendMessage(sender, {
        text: `⚠️ Plugin *${fileName}* sudah ada.`,
      }, { quoted: msg });
    }

    try {
      fs.writeFileSync(pluginPath, text);
      conn.sendMessage(sender, {
        text: `✅ Plugin *${fileName}* berhasil ditambahkan!\nSilakan restart bot untuk memuat ulang.`,
      }, { quoted: msg });
    } catch (err) {
      conn.sendMessage(sender, {
        text: `❌ Gagal menulis file plugin:\n${err.message}`,
      }, { quoted: msg });
    }
  }
};
