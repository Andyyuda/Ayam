const { exec } = require('child_process');

module.exports = {
  name: '.trialvl',
  command: ['.trialvl'],
  async execute(conn, sender, args, msg) {
    const cmd = `printf "%s\\n" "60" | trialvless`;

    exec(cmd, async (err, stdout) => {
      if (err) {
        console.error('❌ CMD error:', err);
        return conn.sendMessage(sender, {
          text: '❌ Gagal membuat akun Trial VLESS.'
        }, { quoted: msg });
      }

      const cleanOutput = stdout.replace(/\x1b\[[0-9;]*m/g, '').trim();
      const reply = `✅ *Trial VLESS berhasil dibuat!*\n\n📄 Output:\n\`\`\`\n${cleanOutput}\n\`\`\``;

      await conn.sendMessage(sender, { text: reply }, { quoted: msg });
    });
  }
};
