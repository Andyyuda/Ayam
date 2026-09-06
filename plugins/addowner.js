const fs = require('fs');
const path = require('path');
const setting = require('../setting.js');
const settingFile = path.resolve(__dirname, '../setting.js');
const { getPhoneNumber, isOwner } = require('../lib/helper');

module.exports = {
  name: '.addowner',
  command: ['.addowner'],
  async execute(conn, sender, args, msg) {
    // ✅ FIX LID: ambil JID pengirim dengan benar
    const pengirim = msg.key.participant || msg.key.remoteJid;

    // ✅ FIX: gunakan helper isOwner yang mendukung LID
    if (!isOwner(pengirim, setting.owner)) {
      return conn.sendMessage(sender, {
        text: '❌ Hanya *Owner* yang dapat menambahkan owner baru.'
      }, { quoted: msg });
    }

    if (!args[0]) {
      return conn.sendMessage(sender, {
        text: '⚠️ Masukkan nomor yang ingin ditambahkan sebagai owner.\nContoh: `.addowner 628xxxxxxx`'
      }, { quoted: msg });
    }

    // ✅ FIX: simpan hanya nomor (tanpa @domain) agar kompatibel dengan LID & s.whatsapp.net
    const nomor = args[0].replace(/[^0-9]/g, '');

    if (setting.owner.some(o => getPhoneNumber(o) === nomor)) {
      return conn.sendMessage(sender, {
        text: `⚠️ Nomor ${nomor} sudah menjadi owner.`
      }, { quoted: msg });
    }

    setting.owner.push(nomor);

    try {
      const content = fs.readFileSync(settingFile, 'utf-8');
      const newOwnerList = setting.owner.map(n => `'${getPhoneNumber(n)}'`).join(', ');
      const updated = content.replace(/owner:\s*\[.*?\]/, `owner: [${newOwnerList}]`);
      fs.writeFileSync(settingFile, updated);

      conn.sendMessage(sender, {
        text: `✅ Nomor *${nomor}* berhasil ditambahkan sebagai *owner*!`
      }, { quoted: msg });
    } catch (err) {
      conn.sendMessage(sender, {
        text: `❌ Gagal menulis ke setting.js:\n${err.message}`
      }, { quoted: msg });
    }
  }
};
