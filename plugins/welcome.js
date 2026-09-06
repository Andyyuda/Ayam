const fs = require('fs');
const path = require('path');
const { getPhoneNumber } = require('../lib/helper');
const settingPath = path.join(__dirname, '../database/welcome.json');

fs.mkdirSync(path.dirname(settingPath), { recursive: true });
if (!fs.existsSync(settingPath)) fs.writeFileSync(settingPath, '{}');

let welcomeData = JSON.parse(fs.readFileSync(settingPath));

if (!global.recentWelcomes) global.recentWelcomes = {};

module.exports = {
  name: '.welcome',
  command: ['.welcome'],

  async execute(conn, sender, args, msg) {
    const isGroup = msg.key.remoteJid.endsWith('@g.us');
    const groupId = msg.key.remoteJid;

    if (!isGroup) {
      return conn.sendMessage(sender, {
        text: '❌ Perintah ini hanya bisa digunakan di dalam grup.'
      }, { quoted: msg });
    }

    if (!welcomeData[groupId]) welcomeData[groupId] = false;

    if (!args[0]) {
      const status = welcomeData[groupId] ? '✅ AKTIF' : '❌ NONAKTIF';
      return conn.sendMessage(sender, {
        text: `👋 *Status Welcome*: ${status}\n\nGunakan *.welcome on* atau *.welcome off*`
      }, { quoted: msg });
    }

    const arg = args[0].toLowerCase();
    if (arg === 'on') {
      welcomeData[groupId] = true;
      fs.writeFileSync(settingPath, JSON.stringify(welcomeData, null, 2));
      return conn.sendMessage(sender, { text: '✅ Fitur *welcome* berhasil *diaktifkan*.' }, { quoted: msg });
    } else if (arg === 'off') {
      welcomeData[groupId] = false;
      fs.writeFileSync(settingPath, JSON.stringify(welcomeData, null, 2));
      return conn.sendMessage(sender, { text: '✅ Fitur *welcome* berhasil *dinonaktifkan*.' }, { quoted: msg });
    } else {
      return conn.sendMessage(sender, { text: '❌ Gunakan format: .welcome on/off' }, { quoted: msg });
    }
  },

  async handleParticipantUpdate(conn, update) {
    const groupId = update.id;
    const participants = update.participants || [];

    if (!welcomeData[groupId] || update.action !== 'add') return;

    for (const user of participants) {
      if (getPhoneNumber(user) === getPhoneNumber(conn.user.id)) continue;

      const key = `${groupId}_${user}`;
      if (global.recentWelcomes[key] && Date.now() - global.recentWelcomes[key] < 30_000) continue;
      global.recentWelcomes[key] = Date.now();

      // ✅ FIX LID: ambil nomor telepon dari JID (bisa @lid atau @s.whatsapp.net)
      const name = getPhoneNumber(user);
      const teks = `👋 Selamat datang @${name} di grup ini!\nSemoga betah ya 🙌`;

      // ✅ FIX LID: normalisasi ke @s.whatsapp.net untuk mention
      const mentionJid = user.includes('@') ? user : user + '@s.whatsapp.net';

      try {
        const pfp = await conn.profilePictureUrl(user, 'image');
        await conn.sendMessage(groupId, {
          image: { url: pfp },
          caption: teks,
          mentions: [mentionJid]
        });
      } catch {
        await conn.sendMessage(groupId, {
          text: teks,
          mentions: [mentionJid]
        });
      }
    }
  }
};
