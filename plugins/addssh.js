const { exec } = require('child_process');

module.exports = {
  name: '.buatssh',
  command: ['.buatssh'],
  async execute(conn, sender, args, msg) {
    if (args.length < 3) {
      return await conn.sendMessage(sender, {
        text: '❗ Format salah!\n\nGunakan:\n`.buatssh <username> <password> <expired>`\nContoh:\n`.buatssh andy pass123 2`'
      }, { quoted: msg });
    }

    const [username, password, expired] = args;
    const cmd = `printf "%s\\n" "${username}" "${password}" "2" "${expired}" | addssh`;

    await conn.sendMessage(sender, { text: '⏳ Membuat akun SSH...' }, { quoted: msg });

    exec(cmd, (err, stdout) => {
      if (err) {
        console.error('❌ Error:', err);
        return conn.sendMessage(sender, { text: '❌ Gagal membuat akun SSH.' }, { quoted: msg });
      }

      // Hilangkan karakter escape ANSI (warna terminal)
      const cleaned = stdout.replace(
        /\x1b\[[0-9;]*m/g, ''
      ).trim();

      conn.sendMessage(sender, {
        text: `✅ *Akun SSH berhasil dibuat!*\n\n\`\`\`\n${cleaned}\n\`\`\``
      }, { quoted: msg });
    });
  }
};