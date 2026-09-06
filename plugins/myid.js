/**
 * .myid — Tampilkan JID/LID pengirim
 * Berguna untuk tahu LID kamu agar bisa didaftarkan sebagai owner di setting.js
 */
module.exports = {
  name: '.myid',
  command: ['.myid', '.lihatid', '.id'],
  async execute(conn, sender, args, msg) {
    const jid = msg.key.participant || msg.key.remoteJid;
    const bareId = jid.split(':')[0].split('@')[0];
    const type = jid.includes('@lid') ? 'LID (format baru WA)' : 'JID (format lama WA)';

    const teks = `🆔 *ID Kamu*\n\n` +
      `📋 *Full JID:* \`${jid}\`\n` +
      `🔢 *Nomor/ID:* \`${bareId}\`\n` +
      `📌 *Tipe:* ${type}\n\n` +
      `💡 Untuk jadi *owner*, minta admin tambahkan ID: *${bareId}* ke setting.js\n` +
      `Atau gunakan *.regowner <pin>* jika kamu tahu PIN bot.`;

    await conn.sendMessage(sender, { text: teks }, { quoted: msg });
  }
};
