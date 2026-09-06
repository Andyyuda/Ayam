const { exec } = require('child_process');

module.exports = {
  name: '.trialvm',
  command: ['.trialvm'],
  async execute(conn, sender, args, msg) {
    const cmd = `printf "%s\\n" "60" | trialws`;

    exec(cmd, async (err, stdout) => {
      if (err) {
        console.error('❌ CMD error:', err);
        return conn.sendMessage(sender, {
          text: '❌ Gagal membuat akun Trial VMess.'
        }, { quoted: msg });
      }

      const cleanOutput = stdout.replace(/\x1b\[[0-9;]*m/g, '').trim();
      const reply = `✅ *Trial VMess berhasil dibuat!*\n\n📄 Output:\n\`\`\`\n${cleanOutput}\n\`\`\``;

      await conn.sendMessage(sender, { text: reply }, { quoted: msg });
    });
  }
};
