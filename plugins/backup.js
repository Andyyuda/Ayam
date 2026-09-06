const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

module.exports = {
  name: '.backup',
  command: ['.backup'],

  async execute(conn, sender, args, msg) {
    try {
      const rootDir = process.cwd();
      const zipName = `backup-${Date.now()}.zip`;
      const zipPath = path.join(rootDir, zipName);

      await conn.sendMessage(sender, {
        text: '⏳ Sedang membuat backup bot...'
      }, { quoted: msg });

      const cmd = `
        cd "${rootDir}" &&
        zip -r "${zipName}" . \
        -x "node_modules/*" \
        -x "auth/*" \
        -x "session/*" \
        -x "sessions/*" \
        -x ".git/*" \
        -x "*.zip"
      `;

      exec(cmd, async (err) => {
        if (err) {
          return conn.sendMessage(sender, {
            text: `❌ Gagal membuat backup:\n${err.message}`
          }, { quoted: msg });
        }

        if (!fs.existsSync(zipPath)) {
          return conn.sendMessage(sender, {
            text: '❌ File zip tidak ditemukan.'
          }, { quoted: msg });
        }

        await conn.sendMessage(sender, {
          document: fs.readFileSync(zipPath),
          fileName: zipName,
          mimetype: 'application/zip',
          caption: '✅ Backup berhasil dibuat tanpa node_modules & auth'
        }, { quoted: msg });

        // Hapus file zip setelah terkirim
        fs.unlinkSync(zipPath);
      });

    } catch (e) {
      conn.sendMessage(sender, {
        text: `❌ Error:\n${e.message}`
      }, { quoted: msg });
    }
  }
};