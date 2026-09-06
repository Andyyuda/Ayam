const fs = require('fs');
const path = require('path');
const settingPath = path.resolve(__dirname, '../setting.js');
const setting = require(settingPath);
const { getPhoneNumber, isOwner } = require('../lib/helper');

module.exports = {
  name: '.delowner',
  command: ['.delowner'],
  async execute(conn, sender, args, msg) {
    // ✅ FIX LID: ambil JID pengirim dengan benar
    const pengirim = msg.key.participant || msg.key.remoteJid;

    // ✅ FIX: gunakan helper isOwner yang mendukung LID
    if (!isOwner(pengirim, setting.owner)) {
      return conn.sendMessage(sender, {
        text: '❌ Hanya *Owner* yang dapat menghapus owner.'
      }, { quoted: msg });
    }

    // ✅ FIX: ambil nomor target (hanya digit)
    const target = args[0]?.replace(/[^0-9]/g, '');
    if (!target) {
      return conn.sendMessage(sender, {
        text: '⚠️ Masukkan nomor yang ingin dihapus dari owner.\nContoh: .delowner 628xxxx'
      }, { quoted: msg });
    }

    // ✅ FIX: bandingkan pakai getPhoneNumber agar cocok dengan format lama maupun baru
    const found = setting.owner.some(o => getPhoneNumber(o) === target);
    if (!found) {
      return conn.sendMessage(sender, {
        text: `❌ Nomor ${target} bukan owner.`
      }, { quoted: msg });
    }

    // ✅ FIX: hapus dengan normalisasi nomor
    const updatedOwners = setting.owner.filter(o => getPhoneNumber(o) !== target);
    setting.owner.length = 0;
    updatedOwners.forEach(o => setting.owner.push(o));

    const content = fs.readFileSync(settingPath, 'utf-8');
    const updated = content.replace(
      /owner:\s*\[([^\]]*)\]/,
      `owner: [${updatedOwners.map(o => `'${getPhoneNumber(o)}'`).join(', ')}]`
    );

    fs.writeFileSync(settingPath, updated);
    return conn.sendMessage(sender, {
      text: `✅ Nomor *${target}* berhasil dihapus dari *owner*.`
    }, { quoted: msg });
  }
};
