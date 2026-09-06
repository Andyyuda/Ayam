const fs = require('fs');
const path = require('path');
const obfuscator = require('javascript-obfuscator');

module.exports = {
  name: '.encall',
  command: ['.encall'],
  async execute(conn, sender, args, msg) {
    const PLUGIN_DIR = __dirname;

    try {
      const files = fs.readdirSync(PLUGIN_DIR).filter(file => file.endsWith('.js'));

      if (files.length === 0) {
        return conn.sendMessage(sender, { text: '❌ Tidak ada file plugin .js ditemukan di folder ./plugins.' }, { quoted: msg });
      }

      let hasil = [];

      for (const file of files) {
        const filePath = path.join(PLUGIN_DIR, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        const obfuscated = obfuscator.obfuscate(content, {
          compact: true,
          controlFlowFlattening: true,
          deadCodeInjection: true,
          stringArray: true,
          stringArrayEncoding: ['rc4'],
          selfDefending: true
        }).getObfuscatedCode();

        fs.writeFileSync(filePath, obfuscated);
        hasil.push(`✔️ ${file}`);
      }

      const reply = `✅ *Obfuscasi plugin selesai!*\n\nPlugin yang dienkripsi:\n${hasil.join('\n')}`;
      await conn.sendMessage(sender, { text: reply }, { quoted: msg });
    } catch (err) {
      console.error('❌ Obfuscasi gagal:', err.message);
      await conn.sendMessage(sender, { text: '❌ Gagal mengenkripsi plugin.' }, { quoted: msg });
    }
  }
};