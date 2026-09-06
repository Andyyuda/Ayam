const fs = require('fs');
const path = require('path');
const obfuscator = require('javascript-obfuscator');

module.exports = {
  name: '.enc',
  command: ['.enc', 'enc'],
  async execute(conn, sender, args, msg, text) {
    const [_, filename] = text.trim().split(' ');

    if (!filename) {
      return await conn.sendMessage(sender, { text: '⚠️ Masukkan nama file yang ingin diobfuscate, contoh: *.enc ping.js*' }, { quoted: msg });
    }

    const filePath = path.join(__dirname, filename);
    const outputPath = filePath.replace('.js', '.enc.js');

    if (!fs.existsSync(filePath)) {
      return await conn.sendMessage(sender, { text: `❌ File *${filename}* tidak ditemukan.` }, { quoted: msg });
    }

    try {
      const originalCode = fs.readFileSync(filePath, 'utf-8');
      const obfuscatedCode = obfuscator.obfuscate(originalCode, {
        compact: true,
        controlFlowFlattening: true,
        deadCodeInjection: true,
        stringArrayEncoding: ['base64'],
        renameGlobals: true,
      }).getObfuscatedCode();

      fs.writeFileSync(outputPath, obfuscatedCode);
      await conn.sendMessage(sender, { text: `✅ File berhasil diobfuscate:\n*${path.basename(outputPath)}*` }, { quoted: msg });
    } catch (err) {
      await conn.sendMessage(sender, { text: `❌ Gagal obfuscate file:\n${err.message}` }, { quoted: msg });
    }
  }
};