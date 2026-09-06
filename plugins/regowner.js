/**
 * .regowner <pin> — Daftarkan diri sendiri sebagai owner menggunakan PIN
 * Berguna saat LID berubah atau owner belum terdaftar
 * PIN diatur di setting.js -> ownerPin
 */
const fs = require('fs');
const path = require('path');
const settingPath = path.resolve(__dirname, '../setting.js');
const setting = require(settingPath);
const { getPhoneNumber, isOwner } = require('../lib/helper');

module.exports = {
  name: '.regowner',
  command: ['.regowner'],
  async execute(conn, sender, args, msg) {
    const jid = msg.key.participant || msg.key.remoteJid;
    const bareId = getPhoneNumber(jid);

    // Cek PIN
    const inputPin = args[0];
    if (!inputPin || inputPin !== setting.ownerPin) {
      return conn.sendMessage(sender, {
        text: '❌ PIN salah atau tidak dimasukkan.\nGunakan: `.regowner <pin>`'
      }, { quoted: msg });
    }

    // Cek apakah sudah owner
    if (isOwner(jid, setting.owner)) {
      return conn.sendMessage(sender, {
        text: `⚠️ Kamu sudah terdaftar sebagai owner.`
      }, { quoted: msg });
    }

    // Tambahkan ke daftar owner
    setting.owner.push(bareId);

    try {
      const content = fs.readFileSync(settingPath, 'utf-8');
      const newOwnerList = setting.owner.map(o => `'${getPhoneNumber(o)}'`).join(', ');
      const updated = content.replace(/owner:\s*\[.*?\]/, `owner: [${newOwnerList}]`);
      fs.writeFileSync(settingPath, updated);

      await conn.sendMessage(sender, {
        text: `✅ *Berhasil didaftarkan sebagai owner!*\n\n🔢 ID kamu: \`${bareId}\`\n\nSekarang kamu bisa pakai semua perintah owner.`
      }, { quoted: msg });
    } catch (err) {
      await conn.sendMessage(sender, {
        text: `❌ Gagal menyimpan:\n${err.message}`
      }, { quoted: msg });
    }
  }
};
