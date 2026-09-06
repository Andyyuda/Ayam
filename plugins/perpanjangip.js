const fs = require('fs');
const { execSync } = require('child_process');
const { format } = require('date-fns');
const setting = require('../setting.js');
const { isOwner } = require('../lib/helper');

if (!process.env.HOME) process.env.HOME = '/root';

module.exports = {
  name: '.perpanjangip',
  command: ['.perpanjangip'],
  async execute(conn, sender, args, msg) {
    // ✅ FIX LID: ambil JID pengirim dengan benar
    const userJid = msg.key.participant || msg.key.remoteJid;

    // ✅ FIX: gunakan helper isOwner yang mendukung LID
    if (!isOwner(userJid, setting.owner)) {
      return conn.sendMessage(sender, {
        text: '❌ Hanya *Owner* yang bisa menggunakan perintah ini.'
      }, { quoted: msg });
    }

    if (args.length < 2) {
      return conn.sendMessage(sender, {
        text: `❌ Contoh penggunaan:\n.perpanjangip <ip> <jumlah hari>\n\nContoh:\n.perpanjangip 123.123.123.123 30`
      }, { quoted: msg });
    }

    const [ip, hari] = args;
    const extraDays = parseInt(hari);
    if (!ip || isNaN(extraDays) || extraDays <= 0) {
      return conn.sendMessage(sender, {
        text: '⚠️ Format salah. Masukkan IP dan jumlah hari (angka).'
      }, { quoted: msg });
    }

    const REPO = 'https://github.com/Andyyuda/izin.git';
    const EMAIL = 'andyyuda51@gmail.com';
    const USER = 'Andyyuda';
    const TOKEN = process.env.GITHUB_TOKEN || '';

    if (!TOKEN) {
      return conn.sendMessage(sender, { text: '❌ GITHUB_TOKEN belum diset di environment.' }, { quoted: msg });
    }

    const WORK_DIR = '/tmp/ipvps-perpanjang';

    try {
      if (fs.existsSync(WORK_DIR)) execSync(`rm -rf ${WORK_DIR}`);
      execSync(`git clone https://${TOKEN}@github.com/Andyyuda/izin.git ${WORK_DIR}`);
      const filePath = `${WORK_DIR}/ip`;

      let lines = fs.readFileSync(filePath, 'utf-8').split('\n');

      const updated = lines.map(line => {
        if (line.includes(ip)) {
          const parts = line.trim().split(' ');
          if (parts.length === 4) {
            const oldDate = new Date(parts[2]);
            if (isNaN(oldDate.getTime())) return line;
            const newExp = format(new Date(oldDate.getTime() + extraDays * 86400000), 'yyyy-MM-dd');
            return `### ${parts[1]} ${newExp} ${parts[3]}`;
          }
        }
        return line;
      });

      if (lines.join('\n') === updated.join('\n')) {
        execSync(`rm -rf ${WORK_DIR}`);
        return conn.sendMessage(sender, { text: `⚠️ IP *${ip}* tidak ditemukan.` }, { quoted: msg });
      }

      fs.writeFileSync(filePath, updated.join('\n'));

      execSync(`git config user.email "${EMAIL}"`, { cwd: WORK_DIR });
      execSync(`git config user.name "${USER}"`, { cwd: WORK_DIR });
      execSync(`git add .`, { cwd: WORK_DIR });
      execSync(`git commit -m "perpanjang ip ${ip}"`, { cwd: WORK_DIR });
      execSync(`git push`, { cwd: WORK_DIR });
      execSync(`rm -rf ${WORK_DIR}`);

      conn.sendMessage(sender, {
        text: `✅ *Perpanjangan IP Berhasil!*\n\n🌐 IP: ${ip}\n📅 Tambahan: ${extraDays} hari`
      }, { quoted: msg });
    } catch (err) {
      conn.sendMessage(sender, {
        text: `❌ Gagal memperpanjang IP:\n${err.message}`
      }, { quoted: msg });
    }
  }
};
