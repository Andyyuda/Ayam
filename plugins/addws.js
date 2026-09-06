const { exec } = require('child_process');

module.exports = {
  name: '.addws',
  command: ['.addws'],
  async execute(conn, sender, args, msg) {
    if (args.length < 2) {
      return conn.sendMessage(sender, {
        text: '⚠️ Format salah.\n\nContoh:\n.addvm andy 2d'
      }, { quoted: msg });
    }

    const username = args[0];
    const expired = args[1];

    const cmd = `printf "%s\\n" "${username}" "${expired}" "200" "2" | addws`;

    exec(cmd, async (err, stdout) => {
      if (err) {
        console.error('❌ CMD error:', err);
        return conn.sendMessage(sender, {
          text: '❌ Gagal membuat akun VMess.'
        }, { quoted: msg });
      }

      // Hilangkan karakter escape ANSI
      const cleanOutput = stdout.replace(/\x1b\[[0-9;]*m/g, '').trim();

      const reply = `✅ *Akun VMess berhasil dibuat!*\n\n📄 Output:\n\`\`\`\n${cleanOutput}\n\`\`\``;
      await conn.sendMessage(sender, { text: reply }, { quoted: msg });
    });
  }
};