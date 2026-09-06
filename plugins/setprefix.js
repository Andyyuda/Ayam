/**
 * .setprefix — Ganti prefix bot secara dinamis (owner only)
 * Contoh:
 *   .setprefix !        → prefix jadi !
 *   .setprefix /        → prefix jadi /
 *   .setprefix none     → tanpa prefix
 *   .setprefix .        → kembali ke default
 */

const fs   = require('fs');
const path = require('path');
const setting = require('../setting');
const { isOwner } = require('../lib/helper');

const DB_PATH = path.join(__dirname, '../database/prefix.json');

function readPrefix() {
  try { return JSON.parse(fs.readFileSync(DB_PATH)).prefix ?? setting.prefix ?? '.'; }
  catch { return setting.prefix ?? '.'; }
}

function savePrefix(p) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify({ prefix: p }, null, 2));
}

module.exports = {
  name: '.setprefix',
  command: ['.setprefix'],

  getPrefix: readPrefix,

  execute: async (sock, sender, args, msg) => {
    const jid = msg.key.participant || msg.key.remoteJid;
    if (!isOwner(jid, setting.owner)) {
      return sock.sendMessage(sender, { text: '❌ Hanya *owner* yang bisa mengubah prefix.' }, { quoted: msg });
    }

    const input = (args[0] || '').trim();
    if (!input) {
      const cur = readPrefix();
      const displayCur = cur === '' ? '(tanpa prefix)' : `\`${cur}\``;
      return sock.sendMessage(sender, {
        text:
          `⚙️ *Prefix saat ini:* ${displayCur}\n\n` +
          `Cara ganti:\n` +
          `• \`.setprefix !\` → prefix jadi !\n` +
          `• \`.setprefix /\` → prefix jadi /\n` +
          `• \`.setprefix none\` → tanpa prefix\n` +
          `• \`.setprefix .\` → kembali ke default`
      }, { quoted: msg });
    }

    const newPrefix = input.toLowerCase() === 'none' ? '' : input;

    if (newPrefix.length > 3) {
      return sock.sendMessage(sender, { text: '❌ Prefix terlalu panjang (maks 3 karakter).' }, { quoted: msg });
    }

    savePrefix(newPrefix);
    const display = newPrefix === '' ? '*(tanpa prefix)*' : `\`${newPrefix}\``;
    await sock.sendMessage(sender, {
      text: `✅ Prefix berhasil diubah ke ${display}\n\n` +
            `Sekarang perintah ditulis: ${newPrefix}play, ${newPrefix}menu, dsb.\n` +
            `(Perintah \`$\` untuk shell tetap pakai \`$\` seperti biasa.)`
    }, { quoted: msg });
  }
};
