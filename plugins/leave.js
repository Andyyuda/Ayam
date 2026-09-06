const fs = require('fs');
const path = require('path');
const { getPhoneNumber } = require('../lib/helper');
const settingPath = path.join(__dirname, '../database/leave.json');

fs.mkdirSync(path.dirname(settingPath), { recursive: true });
if (!fs.existsSync(settingPath)) fs.writeFileSync(settingPath, '{}');

let leaveData = JSON.parse(fs.readFileSync(settingPath));

if (!global.recentLeaves) global.recentLeaves = {};

module.exports = {
  name: '.leave',
  command: ['.leave'],

  async execute(conn, sender, args, msg) {
    const isGroup = msg.key.remoteJid.endsWith('@g.us');
    const groupId = msg.key.remoteJid;

    if (!isGroup) {
      return conn.sendMessage(sender, {
        text: '❌ Perintah ini hanya bisa digunakan di dalam grup.'
      }, { quoted: msg });
    }

    if (!leaveData[groupId]) leaveData[groupId] = false;

    if (!args[0]) {
      const status = leaveData[groupId] ? '✅ AKTIF' : '❌ NONAKTIF';
      return conn.sendMessage(sender, {
        text: `👣 *Status Leave*: ${status}\n\nGunakan *.leave on* atau *.leave off*`
      }, { quoted: msg });
    }

    const arg = args[0].toLowerCase();
    if (arg === 'on') {
      leaveData[groupId] = true;
      fs.writeFileSync(settingPath, JSON.stringify(leaveData, null, 2));
      return conn.sendMessage(sender, { text: '✅ Fitur *leave* berhasil *diaktifkan*.' }, { quoted: msg });
    } else if (arg === 'off') {
      leaveData[groupId] = false;
      fs.writeFileSync(settingPath, JSON.stringify(leaveData, null, 2));
      return conn.sendMessage(sender, { text: '✅ Fitur *leave* berhasil *dinonaktifkan*.' }, { quoted: msg });
    } else {
      return conn.sendMessage(sender, { text: '❌ Gunakan format: .leave on/off' }, { quoted: msg });
    }
  },

  async handleParticipantUpdate(conn, update) {
    const groupId = update.id;
    const participants = update.participants || [];

    if (!leaveData[groupId] || update.action !== 'remove') return;

    for (const user of participants) {
      // ✅ FIX LID: normalisasi perbandingan bot dengan peserta
      if (getPhoneNumber(user) === getPhoneNumber(conn.user.id)) continue;

      const key = `${groupId}_${user}`;
      if (global.recentLeaves[key] && Date.now() - global.recentLeaves[key] < 30_000) continue;
      global.recentLeaves[key] = Date.now();

      // ✅ FIX LID: ambil nomor dari JID apapun formatnya
      const name = getPhoneNumber(user);
      const teks = `👣 @${name} telah keluar dari grup.\nSemoga sukses selalu 👋`;

      const mentionJid = user.includes('@') ? user : user + '@s.whatsapp.net';

      await conn.sendMessage(groupId, {
        text: teks,
        mentions: [mentionJid]
      });
    }
  }
};
