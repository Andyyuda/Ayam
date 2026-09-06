/**
 * .setmenu — Ganti versi tampilan menu
 * .setmenu v1  → Menu teks biasa (tanpa button)
 * .setmenu v2  → Menu full button interaktif (default)
 */

const fs   = require('fs');
const path = require('path');
const { isOwner } = require('../lib/helper');
const setting = require('../setting');

const DB = path.join(__dirname, '../database/menuver.json');

function getVer() {
  try { return JSON.parse(fs.readFileSync(DB, 'utf8')).version || 'v2'; } catch { return 'v2'; }
}
function setVer(v) {
  fs.writeFileSync(DB, JSON.stringify({ version: v }));
}

module.exports = {
  name: '.setmenu',
  command: ['.setmenu', '.menuset', '.menuver'],

  async execute(conn, sender, args, msg) {
    const fromJid = msg.key.participant || msg.key.remoteJid;
    if (!isOwner(fromJid, setting.owner)) {
      return conn.sendMessage(sender, {
        text: '⛔ Hanya owner yang bisa ganti tampilan menu.'
      }, { quoted: msg });
    }

    const ver = (args[0] || '').toLowerCase().trim();
    const cur = getVer();

    if (!ver) {
      return conn.sendMessage(sender, {
        text: `🎨 *SET MENU*\n\nVersi aktif: *${cur.toUpperCase()}*\n\n• _.setmenu v1_ → Teks biasa (tanpa button)\n• _.setmenu v2_ → Full button interaktif\n\nKetik _.menu_ untuk preview.`
      }, { quoted: msg });
    }

    if (!['v1', 'v2'].includes(ver)) {
      return conn.sendMessage(sender, {
        text: `⚠️ Versi tidak valid.\nGunakan: _.setmenu v1_ atau _.setmenu v2_`
      }, { quoted: msg });
    }

    if (ver === cur) {
      return conn.sendMessage(sender, {
        text: `ℹ️ Menu sudah menggunakan *${ver.toUpperCase()}*.`
      }, { quoted: msg });
    }

    setVer(ver);
    const desc = ver === 'v1'
      ? '📄 Mode teks biasa — kompatibel semua WhatsApp'
      : '🎛️ Mode full button — tampilan interaktif modern';

    await conn.sendMessage(sender, {
      text: `✅ *Menu berhasil diganti ke ${ver.toUpperCase()}!*\n\n${desc}\n\nKetik _.menu_ untuk lihat hasilnya.`
    }, { quoted: msg });
  }
};
