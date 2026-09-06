const { exec } = require('child_process');

module.exports = {
  name: '.addvl',
  command: ['.addvl'],
  async execute(conn, sender, args, msg) {
    if (args.length < 2) {
      return conn.sendMessage(sender, {
        text: '⚠️ Format salah.\n\nContoh:\n.addvl andy 2d'
      }, { quoted: msg });
    }

    const username = args[0];
    const expired = args[1];

    const cmd = `printf "%s\\n" "${username}" "${expired}" "200" "2" | addvless`;

    exec(cmd, async (err, stdout) => {
      if (err) {
        console.error('❌ CMD error:', err);
        return conn.sendMessage(sender, {
          text: '❌ Gagal membuat akun VLESS.'
        }, { quoted: msg });
      }

      // Hilangkan karakter warna ANSI dari output
      const cleanOutput = stdout.replace(/\x1b\[[0-9;]*m/g, '').trim();

      const reply = `✅ *Akun VLESS berhasil dibuat!*\n\n📄 Output:\n\`\`\`\n${cleanOutput}\n\`\`\``;
      await conn.sendMessage(sender, { text: reply }, { quoted: msg });
    });
  }
};