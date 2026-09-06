const setting = require('../setting');
const { getPhoneNumber } = require('../lib/helper');

module.exports = {
  name: '.owner',
  command: ['.owner'],

  async execute(conn, sender, args, msg) {
    if (!setting.owner || setting.owner.length === 0) {
      return conn.sendMessage(sender, {
        text: '📂 Tidak ada owner yang terdaftar.'
      }, { quoted: msg });
    }

    for (const owner of setting.owner) {
      // ✅ FIX: getPhoneNumber mendukung semua format (nomor saja, @s.whatsapp.net, @lid)
      const nomor = getPhoneNumber(owner);

      const vcard = `BEGIN:VCARD
VERSION:3.0
FN:Owner Bot
TEL;type=CELL;type=VOICE;waid=${nomor}:+${nomor}
END:VCARD`;

      await conn.sendMessage(sender, {
        contacts: {
          displayName: 'Owner Bot',
          contacts: [{ vcard }]
        }
      }, { quoted: msg });
    }
  }
};
