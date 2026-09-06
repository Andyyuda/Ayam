const fs = require('fs');
const path = require('path');
const { isOwner } = require('../lib/helper');
const settingPath = path.join(__dirname, '../database/onlyowner.json');

fs.mkdirSync(path.dirname(settingPath), { recursive: true });
if (!fs.existsSync(settingPath)) fs.writeFileSync(settingPath, '{}');

let onlyOwnerData = JSON.parse(fs.readFileSync(settingPath));
const setting = require('../setting');

module.exports = {
  name: '.onlyowner',
  command: ['.onlyowner'],

  async execute(conn, sender, args, msg) {
    // ✅ FIX LID: ambil JID pengirim dengan benar
    const jid = msg.key.participant || msg.key.remoteJid;

    // ✅ FIX: gunakan helper isOwner yang mendukung LID
    if (!isOwner(jid, setting.owner)) {
      return conn.sendMessage(sender, {
        text: '❌ Hanya *owner* yang bisa mengatur fitur ini.'
      }, { quoted: msg });
    }

    if (!args[0]) {
      const status = onlyOwnerData.status ? 'AKTIF' : 'NONAKTIF';
      return conn.sendMessage(sender, {
        text: `🔒 Mode Only Owner: *${status}*\n\nKetik *.onlyowner on* atau *.onlyowner off*`
      }, { quoted: msg });
    }

    const input = args[0].toLowerCase();
    if (input === 'on') {
      onlyOwnerData.status = true;
    } else if (input === 'off') {
      onlyOwnerData.status = false;
    } else {
      return conn.sendMessage(sender, {
        text: '❌ Gunakan: .onlyowner on/off'
      }, { quoted: msg });
    }

    fs.writeFileSync(settingPath, JSON.stringify(onlyOwnerData, null, 2));
    conn.sendMessage(sender, {
      text: `✅ Mode Only Owner telah *${input === 'on' ? 'diaktifkan' : 'dinonaktifkan'}*.`
    }, { quoted: msg });
  },

  getMode() {
    return onlyOwnerData.status ? 'owner' : 'off';
  }
};
