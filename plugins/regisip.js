const fs = require('fs');
const { execSync } = require('child_process');
const setting = require('../setting.js');
const { isOwner } = require('../lib/helper');

if (!process.env.HOME) {
  process.env.HOME = '/root';
}

module.exports = {
  name: '.regisip',
  command: ['.regisip'],
  async execute(conn, sender, args, msg) {
    // ✅ FIX LID: ambil JID pengirim dengan benar (mendukung @lid dan @s.whatsapp.net)
    const userJid = msg.key.participant || msg.key.remoteJid;

    // ✅ FIX: gunakan helper isOwner yang mendukung LID
    if (!isOwner(userJid, setting.owner)) {
      return conn.sendMessage(sender, {
        text: '❌ Hanya *Owner* yang bisa menggunakan perintah ini.'
      }, { quoted: msg });
    }

    if (args.length < 3) {
      return conn.sendMessage(sender, {
        text: `❌ Contoh penggunaan:\n.regisip <ip> <nama> <masa aktif>\n\nContoh:\n.regisip 123.123.123.123 Andy 30`
      }, { quoted: msg });
    }

    const [ip, ...rest] = args;
    const name = rest.slice(0, -1).join(' ');
    const expInput = rest[rest.length - 1];
    const exp = parseInt(expInput);

    if (!ip || !name || isNaN(exp)) {
      return conn.sendMessage(sender, {
        text: '⚠️ Format salah. Pastikan IP, nama, dan masa aktif (angka hari) valid.'
      }, { quoted: msg });
    }

    const REPO = 'https://github.com/Andyyuda/izinbot.git';
    const EMAIL = 'andyyuda51@gmail.com';
    const USER = 'Andyyuda';
    const TOKEN = process.env.GITHUB_TOKEN || '';

    if (!TOKEN) {
      return conn.sendMessage(sender, { text: '❌ GITHUB_TOKEN belum diset di environment.' }, { quoted: msg });
    }

    const WORK_DIR = '/tmp/ipvps-regis';

    try {
      if (fs.existsSync(WORK_DIR)) execSync(`rm -rf ${WORK_DIR}`);
      execSync(`git clone https://${TOKEN}@github.com/Andyyuda/izinbot.git ${WORK_DIR}`);
      const filePath = `${WORK_DIR}/ip`;
      const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';

      if (existing.includes(ip)) {
        execSync(`rm -rf ${WORK_DIR}`);
        return conn.sendMessage(sender, { text: '❌ IP sudah terdaftar.' }, { quoted: msg });
      }

      const expDate = new Date();
      expDate.setDate(expDate.getDate() + exp);
      const expString = expDate.toISOString().split('T')[0];

      fs.appendFileSync(filePath, `### ${name} ${expString} ${ip}\n`);

      execSync(`git config user.email "${EMAIL}"`, { cwd: WORK_DIR });
      execSync(`git config user.name "${USER}"`, { cwd: WORK_DIR });
      execSync(`git add .`, { cwd: WORK_DIR });
      execSync(`git commit -m "add ip ${ip}"`, { cwd: WORK_DIR });
      execSync(`git push`, { cwd: WORK_DIR });
      execSync(`rm -rf ${WORK_DIR}`);

      conn.sendMessage(sender, {
        text: `✅ *Registrasi IP Berhasil!*\n\n🌐 IP: ${ip}\n👤 Nama: ${name}\n📅 Expired: ${expString}`
      }, { quoted: msg });
    } catch (err) {
      conn.sendMessage(sender, {
        text: `❌ Gagal push ke GitHub:\n${err.message}`
      }, { quoted: msg });
    }
  }
};
