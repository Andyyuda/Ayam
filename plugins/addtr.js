const { exec } = require('child_process');

module.exports = {
  name: '.addtr',
  command: ['.addtr'],
  async execute(conn, sender, args, msg) {
    if (args.length < 2) {
      return conn.sendMessage(sender, {
        text: '⚠️ Format salah.\n\nContoh:\n.addtr andy 2d'
      }, { quoted: msg });
    }

    const username = args[0];
    const expired = args[1];

    const cmd = `printf "%s\\n" "${username}" "${expired}" "200" "2" | addtr`;

    exec(cmd, async (err, stdout) => {
      if (err) {
        console.error('❌ CMD error:', err);
        return conn.sendMessage(sender, {
          text: '❌ Gagal membuat akun Trojan.'
        }, { quoted: msg });
      }

      // Hilangkan karakter warna ANSI dari output (jika ada)
      const cleanOutput = stdout.replace(/\x1b\[[0-9;]*m/g, '').trim();

      const reply = `✅ *Akun Trojan berhasil dibuat!*\n\n📄 Output:\n\`\`\`\n${cleanOutput}\n\`\`\``;
      await conn.sendMessage(sender, { text: reply }, { quoted: msg });
    });
  }
};
