const { isOwner, isBotAdmin, isSenderAdmin } = require('../lib/helper');
const setting = require('../setting');

module.exports = {
  name: '.add',
  command: ['.add'],
  execute: async (conn, sender, args, msg) => {
    const groupId = msg.key.remoteJid;

    if (!groupId.endsWith('@g.us')) {
      return conn.sendMessage(sender, { text: '❌ Perintah ini hanya bisa digunakan di dalam grup.' }, { quoted: msg });
    }

    const pengirim = msg.key.participant || msg.key.remoteJid;

    let botIsAdmin = false;
    let senderIsAdmin = false;
    try {
      const groupMeta = await conn.groupMetadata(groupId);
      botIsAdmin = isBotAdmin(conn, groupMeta.participants);
      senderIsAdmin = isSenderAdmin(pengirim, groupMeta.participants) ||
                      isOwner(pengirim, setting.owner);
    } catch (e) {}

    if (!senderIsAdmin) {
      return conn.sendMessage(sender, { text: '❌ Hanya *admin grup* atau *owner* yang bisa menambahkan anggota.' }, { quoted: msg });
    }

    if (!botIsAdmin) {
      return conn.sendMessage(sender, { text: '❌ Bot harus menjadi *admin grup* untuk menambahkan anggota.' }, { quoted: msg });
    }

    // Cari target: dari reply pesan, dari tag @mention, atau dari nomor di argumen
    let targets = [];

    const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;
    const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
    const nomorArg = args[0]?.replace(/[^0-9]/g, '');

    if (quotedParticipant) {
      // Cara 1: Reply pesan seseorang
      const { normalizeJid } = require('../lib/helper');
      targets = [normalizeJid(quotedParticipant)];
    } else if (mentionedJid && mentionedJid.length > 0) {
      // Cara 2: Tag @mention
      targets = mentionedJid;
    } else if (nomorArg) {
      // Cara 3: Ketik nomor langsung
      targets = [nomorArg + '@s.whatsapp.net'];
    } else {
      return conn.sendMessage(sender, {
        text: '⚠️ Cara pakai:\n• Reply pesan seseorang + ketik .add\n• Tag: .add @628xxxx\n• Nomor: .add 628xxxx'
      }, { quoted: msg });
    }

    try {
      await conn.groupParticipantsUpdate(groupId, targets, 'add');
      const nomorList = targets.map(j => j.split(':')[0].split('@')[0]).join(', ');
      await conn.sendMessage(sender, {
        text: `✅ Berhasil menambahkan: ${nomorList}`,
        mentions: targets
      }, { quoted: msg });
    } catch (e) {
      await conn.sendMessage(sender, { text: '❌ Gagal menambahkan. Mungkin pengguna menolak undangan grup.' }, { quoted: msg });
    }
  }
};
