const fs = require('fs');
const path = require('path');
const settingPath = path.join(__dirname, '../database/onlyprivate.json');
fs.mkdirSync(path.dirname(settingPath), { recursive: true });
if (!fs.existsSync(settingPath)) fs.writeFileSync(settingPath, '{}');

let onlyPrivateData = JSON.parse(fs.readFileSync(settingPath));

module.exports = {
  name: '.onlyprivate',
  command: ['.onlyprivate'],

  async execute(conn, sender, args, msg) {
    if (!args[0]) {
      const status = onlyPrivateData.status ? 'AKTIF' : 'NONAKTIF';
      return conn.sendMessage(sender, { text: `🔒 Mode Only Private: *${status}*\n\nKetik *.onlyprivate on* atau *.onlyprivate off*` }, { quoted: msg });
    }

    const input = args[0].toLowerCase();
    if (input === 'on') {
      onlyPrivateData.status = true;
    } else if (input === 'off') {
      onlyPrivateData.status = false;
    } else {
      return conn.sendMessage(sender, { text: '❌ Gunakan: .onlyprivate on/off' }, { quoted: msg });
    }

    fs.writeFileSync(settingPath, JSON.stringify(onlyPrivateData, null, 2));
    conn.sendMessage(sender, { text: `✅ Only Private *${input.toUpperCase()}*` }, { quoted: msg });
  },

  getMode() {
    return onlyPrivateData.status ? 'private' : 'off';
  }
};