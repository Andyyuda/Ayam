const { exec } = require('child_process');
const setting = require('../setting');
const { isOwner } = require('../lib/helper');

module.exports = {
  name: '$',
  command: [],

  async execute(conn, sender, args, msg) {
    const text =
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      msg.message?.imageMessage?.caption ||
      msg.message?.videoMessage?.caption ||
      msg.message?.documentMessage?.caption ||
      '';

    if (!text.startsWith('$')) return;

    const shellCommand = text.slice(1).trim();

    // ✅ FIX LID: ambil JID pengirim dengan benar
    const jid = msg.key.participant || msg.key.remoteJid;

    // ✅ FIX: gunakan helper isOwner yang mendukung LID dan @s.whatsapp.net
    if (!isOwner(jid, setting.owner)) {
      return conn.sendMessage(msg.key.remoteJid, {
        text: '❌ Hanya *owner* yang bisa menjalankan perintah `$`.'
      }, { quoted: msg });
    }

    if (!shellCommand) {
      return conn.sendMessage(msg.key.remoteJid, {
        text: '⚠️ Masukkan perintah setelah `$`, contoh: `$ ls -la`'
      }, { quoted: msg });
    }

    await conn.sendMessage(msg.key.remoteJid, {
      text: `💻 Menjalankan: \`${shellCommand}\``,
      mentions: [jid]
    }, { quoted: msg });

    exec(shellCommand, { timeout: 20000 }, (err, stdout, stderr) => {
      let hasil = '';
      if (err) hasil += `❌ *Error:*\n${err.message}\n\n`;
      if (stdout) hasil += `📤 *Output:*\n${stdout}`;
      if (stderr) hasil += `⚠️ *Stderr:*\n${stderr}`;

      if (!hasil.trim()) hasil = '✅ Perintah selesai tanpa output.';
      conn.sendMessage(msg.key.remoteJid, {
        text: hasil.length > 4000 ? hasil.slice(0, 4000) + '\n\n📦 Output terlalu panjang (terpotong).' : hasil,
        mentions: [jid]
      }, { quoted: msg });
    });
  }
};
