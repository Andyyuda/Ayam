const fs = require('fs');
const path = require('path');
const muteFile = path.join(__dirname, '../mute.json');
const { isOwner, isSenderAdmin } = require('../lib/helper');
const setting = require('../setting');

module.exports = {
  name: '.unmute',
  command: ['.unmute'],
  tags: ['admin'],
  async execute(sock, sender, args, msg) {
    const groupId = msg.key.remoteJid;

    if (!groupId.endsWith('@g.us')) {
      return await sock.sendMessage(sender, { text: '❌ Perintah ini hanya bisa digunakan di dalam grup.' }, { quoted: msg });
    }

    const pengirim = msg.key.participant || msg.key.remoteJid;

    if (!isOwner(pengirim, setting.owner)) {
      let isAdmin = false;
      try {
        const meta = await sock.groupMetadata(groupId);
        isAdmin = isSenderAdmin(pengirim, meta.participants);
      } catch (e) {}
      if (!isAdmin) {
        return await sock.sendMessage(sender, { text: '❌ Hanya *admin grup* atau *owner* yang bisa unmute member.' }, { quoted: msg });
      }
    }

    if (!msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
      return await sock.sendMessage(sender, { text: '❌ Tag member yang ingin diunmute.' }, { quoted: msg });
    }

    const mentioned = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
    let db = fs.existsSync(muteFile) ? JSON.parse(fs.readFileSync(muteFile)) : {};

    if (db[groupId]?.[mentioned]) {
      delete db[groupId][mentioned];
      fs.writeFileSync(muteFile, JSON.stringify(db, null, 2));
      await sock.sendMessage(sender, { text: `🔊 *${mentioned.split(':')[0].split('@')[0]}* telah diunmute.` }, { quoted: msg });
    } else {
      await sock.sendMessage(sender, { text: '⚠️ User tersebut tidak dalam kondisi mute.' }, { quoted: msg });
    }
  }
};
