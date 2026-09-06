const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const setting = require('../setting');
const { isOwner } = require('../lib/helper');

if (!process.env.HOME) process.env.HOME = '/root';

module.exports = {
  name: '.bersihkanip',
  command: ['.bersihkanip'],
  async execute(conn, sender, args, msg) {
    // ✅ FIX LID: ambil JID pengirim dengan benar
    const senderJid = msg.key.participant || msg.key.remoteJid;

    // ✅ FIX: gunakan helper isOwner yang mendukung LID
    if (!isOwner(senderJid, setting.owner)) {
      return conn.sendMessage(sender, { text: '❌ Hanya owner yang bisa membersihkan IP expired.' }, { quoted: msg });
    }

    const repo = 'https://github.com/Andyyuda/izin.git';
    const localPath = '/tmp/ipvps-clean';
    const token = process.env.GITHUB_TOKEN || '';
    const email = 'andyyuda51@gmail.com';
    const user = 'Andyyuda';

    if (!token) {
      return conn.sendMessage(sender, { text: '❌ GITHUB_TOKEN belum diset di environment.' }, { quoted: msg });
    }

    try {
      if (fs.existsSync(localPath)) fs.rmSync(localPath, { recursive: true });

      execSync(`git clone ${repo} ${localPath}`);

      const ipFile = path.join(localPath, 'ip');
      if (!fs.existsSync(ipFile)) {
        return conn.sendMessage(sender, { text: '⚠️ File daftar IP tidak ditemukan di repo.' }, { quoted: msg });
      }

      const lines = fs.readFileSync(ipFile, 'utf-8').trim().split('\n');
      const today = new Date();

      const validLines = lines.filter(line => {
        const match = line.match(/###\s+(\S+)\s+(\d{4}-\d{2}-\d{2})\s+(\S+)/);
        if (!match) return true;
        const exp = new Date(match[2]);
        return !isNaN(exp.getTime()) && exp >= today;
      });

      const cleaned = validLines.join('\n') + '\n';
      fs.writeFileSync(ipFile, cleaned);

      execSync(`git config --global user.email "${email}"`, { cwd: localPath });
      execSync(`git config --global user.name "${user}"`, { cwd: localPath });
      execSync(`git add .`, { cwd: localPath });
      execSync(`git commit -m "hapus expired ip"`, { cwd: localPath });
      execSync(`git push -f https://${token}@github.com/Andyyuda/izin.git`, { cwd: localPath });

      conn.sendMessage(sender, {
        text: '🧹 Berhasil membersihkan IP yang sudah expired dan update ke GitHub.'
      }, { quoted: msg });

    } catch (err) {
      conn.sendMessage(sender, {
        text: `❌ Gagal membersihkan IP:\n${err.message}`
      }, { quoted: msg });
    }
  }
};
