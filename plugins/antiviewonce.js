/**
 * .antiviewonce — Deteksi & buka pesan sekali lihat
 *
 * Cara kerja:
 *  1. WhatsApp kirim stub "unavailable" ke bot saat ada view once → bot kirim notifikasi ke grup
 *  2. Baileys request resend konten dari HP asli → jika HP respons, bot forward media ke grup
 *
 * Perintah:
 *   .antiviewonce on   — Aktifkan di grup/chat ini
 *   .antiviewonce off  — Matikan
 */

const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs   = require('fs');
const path = require('path');
const { isOwner } = require('../lib/helper');
const setting = require('../setting');

const DB_PATH = path.join(__dirname, '../database/antiviewonce.json');

function loadDB() {
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); } catch { return {}; }
}
function saveDB(data) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// Map untuk track view once yang sedang menunggu konten dari HP
// key: messageId, value: { jid, senderPhone, timestamp, sent }
const pendingVO = new Map();

// Bersihkan pending yang sudah lebih dari 60 detik
setInterval(() => {
  const now = Date.now();
  for (const [id, data] of pendingVO) {
    if (now - data.timestamp > 60000) pendingVO.delete(id);
  }
}, 30000);

/** Cari media view once di dalam msg.message */
function findViewOnceMedia(rawMsg) {
  if (!rawMsg) return null;
  const WRAPPERS = ['viewOnceMessage', 'viewOnceMessageV2', 'viewOnceMessageV2Extension'];

  function dig(obj, depth = 0) {
    if (!obj || typeof obj !== 'object' || depth > 6) return null;
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (WRAPPERS.includes(key)) {
        const inner = val?.message || val;
        if (inner?.imageMessage) return { innerMsg: inner.imageMessage, mediaType: 'image' };
        if (inner?.videoMessage) return { innerMsg: inner.videoMessage, mediaType: 'video' };
      }
      if ((key === 'imageMessage' || key === 'videoMessage') && val?.viewOnce === true) {
        return { innerMsg: val, mediaType: key === 'imageMessage' ? 'image' : 'video' };
      }
      const sub = dig(val, depth + 1);
      if (sub) return sub;
    }
    return null;
  }
  return dig(rawMsg);
}

module.exports = {
  name   : '.antiviewonce',
  command: ['.antiviewonce', '.avo', '.antivo'],

  // ── Dipanggil dari main.js saat menerima stub "unavailable" view_once ──────
  async handleViewOnce(conn, msg, rawNode) {
    const jid = msg.key.remoteJid;
    if (!jid || jid === 'status@broadcast') return;

    const db = loadDB();
    if (!db[jid]) return;

    const msgId     = msg.key.id;
    const senderPn  = rawNode?.attrs?.participant_pn || rawNode?.attrs?.from || '';
    const senderPhone = senderPn.replace(/@s\.whatsapp\.net|@lid/g, '');
    const mediaType = rawNode?.attrs?.type === 'media' ? 'foto/video' : 'media';

    console.log(`[antiviewonce] 👁️ View once dari ${senderPn} di ${jid} (id=${msgId})`);

    // Simpan ke pending map
    pendingVO.set(msgId, { jid, senderPhone, senderPn, timestamp: Date.now(), sent: false });

    const mention = senderPn.includes('@') ? [senderPn] : [];

    await conn.sendMessage(jid, {
      text:
        `👁️ *[Anti View Once]*\n` +
        `@${senderPhone} mengirim *${mediaType} sekali lihat*.\n\n` +
        `⏳ _Bot sedang meminta konten dari HP..._`
    }, { mentions: mention });
  },

  // ── Dipanggil untuk semua pesan — tangkap konten view once jika HP merespons ─
  async handleMessage(conn, msg) {
    const jid = msg.key.remoteJid;
    if (!jid || jid === 'status@broadcast') return;
    if (!msg.message) return;

    const db = loadDB();
    if (!db[jid]) return;

    const found = findViewOnceMedia(msg.message);
    if (!found) return;

    const msgId   = msg.key.id;
    const pending = pendingVO.get(msgId);

    // Hindari kirim ulang (bisa terpicu lebih dari sekali)
    if (pending?.sent) return;
    if (pending) pending.sent = true;

    const senderJid = msg.key.participant || msg.key.remoteJid;
    const senderPhone = senderJid.replace(/@s\.whatsapp\.net|@lid/g, '');

    console.log(`[antiviewonce] ⬇️ Konten view once diterima dari HP! Download ${found.mediaType}...`);

    try {
      const stream = await downloadContentFromMessage(found.innerMsg, found.mediaType);
      let buffer = Buffer.from([]);
      for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

      if (buffer.length === 0) throw new Error('Buffer kosong');

      const caption =
        (found.innerMsg.caption ? found.innerMsg.caption + '\n\n' : '') +
        `*[👁️ Anti View Once]* — @${senderPhone}`;

      const mention = senderJid.includes('@') ? [senderJid] : [];

      if (found.mediaType === 'image') {
        await conn.sendMessage(jid, { image: buffer, caption }, { mentions: mention });
      } else {
        await conn.sendMessage(jid, { video: buffer, caption }, { mentions: mention });
      }

      console.log(`[antiviewonce] ✅ Berhasil forward ${found.mediaType} (${(buffer.length / 1024).toFixed(1)} KB)`);

    } catch (err) {
      console.error('[antiviewonce] ❌ Download error:', err.message);
      await conn.sendMessage(jid, {
        text: `⚠️ _Konten view once tidak berhasil diambil dari HP._\n\`${err.message}\``
      });
    }
  },

  // ── Command ────────────────────────────────────────────────────────────────
  async execute(conn, sender, args, msg) {
    const senderJid  = msg.key.participant || msg.key.remoteJid;
    const ownerCheck = isOwner(senderJid, setting.owner);

    if (!ownerCheck) {
      return conn.sendMessage(sender, {
        text: '⛔ Hanya owner yang bisa mengatur fitur ini.'
      }, { quoted: msg });
    }

    const db  = loadDB();
    const sub = (args[0] || '').toLowerCase().trim();

    if (!sub) {
      const aktif = db[sender] ? '✅ Aktif' : '❌ Nonaktif';
      return conn.sendMessage(sender, {
        text:
          `👁️ *ANTI VIEW ONCE*\n\n` +
          `Status di sini: ${aktif}\n\n` +
          `• _.antiviewonce on_  — Aktifkan\n` +
          `• _.antiviewonce off_ — Matikan\n\n` +
          `_Bot akan notifikasi saat ada view once dikirim, ` +
          `dan otomatis forward isinya jika HP merespons._`
      }, { quoted: msg });
    }

    if (sub === 'on') {
      db[sender] = true;
      saveDB(db);
      return conn.sendMessage(sender, {
        text:
          `✅ *Anti View Once ON*\n\n` +
          `Bot akan:\n` +
          `1️⃣ Notifikasi grup saat ada view once masuk\n` +
          `2️⃣ Forward foto/video jika konten berhasil didapat dari HP\n\n` +
          `_Kirim foto sekali lihat untuk tes._`
      }, { quoted: msg });
    }

    if (sub === 'off') {
      delete db[sender];
      saveDB(db);
      return conn.sendMessage(sender, { text: `🔕 *Anti View Once OFF.*` }, { quoted: msg });
    }

    await conn.sendMessage(sender, {
      text: `⚠️ Gunakan: _.antiviewonce on_ atau _.antiviewonce off_`
    }, { quoted: msg });
  }
};
