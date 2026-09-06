const { exec } = require('child_process');

module.exports = {
  name: '.trialssh',
  command: ['.trialssh'],
  async execute(conn, sender, args, msg) {
    await conn.sendMessage(sender, {
      text: '⏳ Membuat akun SSH trial, mohon tunggu...',
    }, { quoted: msg });

    exec(`printf "%s\\n" "60" | trial`, (err, stdout, stderr) => {
      if (err) {
        console.error('❌ Error trialssh:', err.message);
        return conn.sendMessage(sender, {
          text: '❌ Gagal membuat akun trial SSH.',
        }, { quoted: msg });
      }

      let output = stdout || stderr || 'Tidak ada respon dari command.';
      
      // Hapus kode warna ANSI seperti \x1b[1;93m dan \x1b[0m
      output = output.replace(/\x1b\[[0-9;]*m/g, '').trim();

      // Kirim dalam format rapi ke WhatsApp
      const pesan = `✅ *Trial SSH berhasil dibuat!*\n\n📄 Output:\n\`\`\`\n${output}\n\`\`\``;

      conn.sendMessage(sender, { text: pesan }, { quoted: msg });
    });
  }
};