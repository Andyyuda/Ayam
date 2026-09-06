const fs = require('fs');
const path = require('path');
const settingPath = path.join(__dirname, '../database/onlygc.json');
fs.mkdirSync(path.dirname(settingPath), { recursive: true });
if (!fs.existsSync(settingPath)) fs.writeFileSync(settingPath, '{}');

let onlyGroupData = JSON.parse(fs.readFileSync(settingPath));

module.exports = {
  name: '.onlygc',
  command: ['.onlygc'],

  async execute(conn, sender, args, msg) {
    if (!args[0]) {
      const status = onlyGroupData.status ? 'AKTIF' : 'NONAKTIF';
      return conn.sendMessage(sender, { text: `🔒 Mode Only Group: *${status}*\n\nKetik *.onlygc on* atau *.onlygc off*` }, { quoted: msg });
    }

    const input = args[0].toLowerCase();
    if (input === 'on') {
      onlyGroupData.status = true;
    } else if (input === 'off') {
      onlyGroupData.status = false;
    } else {
      return conn.sendMessage(sender, { text: '❌ Gunakan: .onlygc on/off' }, { quoted: msg });
    }

    fs.writeFileSync(settingPath, JSON.stringify(onlyGroupData, null, 2));
    conn.sendMessage(sender, { text: `✅ Only Group *${input.toUpperCase()}*` }, { quoted: msg });
  },

  getMode() {
    return onlyGroupData.status ? 'group' : 'off';
  }
};