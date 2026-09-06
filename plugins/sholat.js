/**
 * .sholat — Notifikasi sholat 5 waktu otomatis + jadwal harian
 * API: MyQuran (api.myquran.com) — gratis, tanpa key
 * Perintah:
 *   .sholat setup <kota>  — Set kota & aktifkan notif (owner)
 *   .sholat on / off      — Toggle notifikasi (owner)
 *   .sholat info          — Lihat jadwal hari ini
 *   .sholat hapus         — Hapus pengaturan (owner)
 *   .waktu                — Alias info
 */

const fetch   = require('node-fetch');
const fs      = require('fs');
const path    = require('path');
const { isOwner } = require('../lib/helper');
const setting = require('../setting');

const DB_PATH = path.join(__dirname, '../database/sholat.json');

const WAKTU = ['Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'];
const EMOJI = { Subuh: '🌙', Dzuhur: '☀️', Ashar: '🌤️', Maghrib: '🌅', Isya: '✨' };
// mapping nama MyQuran ke key WAKTU
const KEY_MAP = { Subuh: 'subuh', Dzuhur: 'dzuhur', Ashar: 'ashar', Maghrib: 'maghrib', Isya: 'isya' };

const IMG_URL = 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Faisal_Mosque_Islamabad.jpg/1280px-Faisal_Mosque_Islamabad.jpg';
const ADZAN_URLS = [
  'https://www.islamcan.com/audio/adhan/azan1.mp3',
  'https://ia800500.us.archive.org/18/items/MadinaNobisAzaan/Madina%20Nobis%20Azaan.mp3',
];

let schedulerStarted = false;
let connRef = null;

// ── DB helpers ───────────────────────────────────────────────────────────────
function loadDB() {
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); } catch { return {}; }
}
function saveDB(data) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// ── Cari kota di MyQuran → {id, lokasi} ─────────────────────────────────────
async function cariKota(keyword) {
  const url = `https://api.myquran.com/v2/sholat/kota/cari/${encodeURIComponent(keyword)}`;
  const res  = await fetch(url, { timeout: 10000 });
  const json = await res.json();
  if (!json.status || !json.data?.length) throw new Error(`Kota "${keyword}" tidak ditemukan`);
  return json.data[0]; // {id, lokasi}
}

// ── Ambil jadwal dari MyQuran berdasarkan ID kota ────────────────────────────
async function getJadwal(kotaId) {
  const now  = new Date();
  const y    = now.getFullYear();
  const m    = String(now.getMonth() + 1).padStart(2, '0');
  const d    = String(now.getDate()).padStart(2, '0');
  const url  = `https://api.myquran.com/v2/sholat/jadwal/${kotaId}/${y}/${m}/${d}`;
  const res  = await fetch(url, { timeout: 10000 });
  const json = await res.json();
  if (!json.status) throw new Error('Gagal ambil jadwal sholat');
  return json.data; // {id, lokasi, daerah, jadwal:{tanggal,subuh,dzuhur,...}}
}

// ── Format jadwal jadi string ────────────────────────────────────────────────
function formatJadwal(jadwal, highlight = null) {
  return WAKTU.map(w => {
    const mark = w === highlight ? '▶️' : '   ';
    const jam  = jadwal[KEY_MAP[w]] || '-';
    return `${mark} ${EMOJI[w]} *${w}*\t: ${jam}`;
  }).join('\n');
}

// ── Kirim notifikasi waktu sholat ────────────────────────────────────────────
async function kirimNotif(conn, jid, waktu, lokasi, jadwal) {
  const jam  = jadwal[KEY_MAP[waktu]] || '-';

  const teks = `${EMOJI[waktu]} *WAKTU ${waktu.toUpperCase()} TELAH TIBA* ${EMOJI[waktu]}\n\n` +
    `📍 Kota  : *${lokasi}*\n` +
    `🕐 Pukul : *${jam} WIB*\n` +
    `📅 Tanggal: ${jadwal.tanggal}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📅 *Jadwal Sholat Hari Ini*\n\n${formatJadwal(jadwal, waktu)}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `🤲 _Segera tunaikan sholat, jangan ditunda._\n` +
    `✨ _"Sholat adalah tiang agama."_`;

  try {
    await conn.sendMessage(jid, { image: { url: IMG_URL }, caption: teks });
  } catch {
    await conn.sendMessage(jid, { text: teks });
  }

  for (const url of ADZAN_URLS) {
    try {
      await conn.sendMessage(jid, { audio: { url }, mimetype: 'audio/mpeg', ptt: false });
      break;
    } catch (e) {
      console.error(`[sholat] audio gagal (${url}):`, e.message);
    }
  }
}

// ── Scheduler: cek setiap menit ──────────────────────────────────────────────
function startScheduler(conn) {
  connRef = conn;
  if (schedulerStarted) return;
  schedulerStarted = true;
  console.log('[sholat] Scheduler dimulai ✅');

  setInterval(async () => {
    const db  = loadDB();
    const now = new Date();
    // Konversi ke waktu Jakarta lalu format manual HH:MM agar cocok dengan format API
    const jakarta = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const nowStr = String(jakarta.getHours()).padStart(2, '0') + ':' + String(jakarta.getMinutes()).padStart(2, '0');

    for (const [jid, cfg] of Object.entries(db)) {
      if (!cfg.aktif || !cfg.kotaId) continue;
      try {
        const data   = await getJadwal(cfg.kotaId);
        const jadwal = data.jadwal;
        for (const w of WAKTU) {
          const t = (jadwal[KEY_MAP[w]] || '').substring(0, 5);
          if (t === nowStr) {
            console.log(`[sholat] 🕌 ${w} (${t}) → ${jid}`);
            await kirimNotif(connRef, jid, w, data.lokasi, jadwal);
          }
        }
      } catch (e) {
        console.error(`[sholat] scheduler error untuk ${jid}:`, e.message);
      }
    }
  }, 60_000);
}

// ── Plugin export ────────────────────────────────────────────────────────────
module.exports = {
  name   : '.sholat',
  command: ['.sholat', '.jadwalsholat', '.waktu'],

  onReady(conn) {
    startScheduler(conn);
  },

  async execute(conn, sender, args, msg) {
    const senderJid  = msg.key.participant || msg.key.remoteJid;
    const ownerCheck = isOwner(senderJid, setting.owner);
    const db         = loadDB();
    const cfg        = db[sender] || {};
    const sub        = (args[0] || '').toLowerCase().trim();

    // ── Info / jadwal hari ini ───────────────────────────────────────────────
    if (!sub || sub === 'info' || sub === 'jadwal') {
      if (!cfg.kotaId) {
        return conn.sendMessage(sender, {
          text: `🕌 *NOTIFIKASI SHOLAT*\n\nBelum ada kota yang di-set!\n\n` +
                `Gunakan: _.sholat setup <kota>_\nContoh: _.sholat setup Jakarta_\n\n` +
                `📖 Perintah:\n` +
                `• _.sholat setup <kota>_ — Setup & aktifkan notif\n` +
                `• _.sholat on/off_ — Toggle notifikasi\n` +
                `• _.sholat info_ — Jadwal hari ini\n` +
                `• _.sholat hapus_ — Hapus pengaturan`
        }, { quoted: msg });
      }
      try {
        const data     = await getJadwal(cfg.kotaId);
        const jadwal   = data.jadwal;
        const status   = cfg.aktif ? '✅ Aktif' : '❌ Nonaktif';

        const teks = `🕌 *JADWAL SHOLAT HARI INI*\n\n` +
          `📍 Kota    : *${data.lokasi}*\n` +
          `📅 Tanggal : ${jadwal.tanggal}\n` +
          `🔔 Notifikasi: ${status}\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━\n${formatJadwal(jadwal)}\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `🤲 _Jangan lewatkan waktu sholat!_`;

        try {
          await conn.sendMessage(sender, { image: { url: IMG_URL }, caption: teks }, { quoted: msg });
        } catch {
          await conn.sendMessage(sender, { text: teks }, { quoted: msg });
        }
      } catch (e) {
        await conn.sendMessage(sender, { text: `❌ Gagal ambil jadwal: ${e.message}` }, { quoted: msg });
      }
      return;
    }

    // ── Setup ────────────────────────────────────────────────────────────────
    if (sub === 'setup' || sub === 'set') {
      if (!ownerCheck) {
        return conn.sendMessage(sender, { text: '⛔ Hanya owner yang bisa setup notifikasi sholat.' }, { quoted: msg });
      }
      const kota = args.slice(1).join(' ').trim();
      if (!kota) {
        return conn.sendMessage(sender, {
          text: '⚠️ Masukkan nama kota!\nContoh: _.sholat setup Jakarta_'
        }, { quoted: msg });
      }
      try {
        const found  = await cariKota(kota);
        const data   = await getJadwal(found.id);
        const jadwal = data.jadwal;

        db[sender] = { kotaId: found.id, lokasi: data.lokasi, aktif: true };
        saveDB(db);
        startScheduler(conn);

        await conn.sendMessage(sender, {
          text: `✅ *Notifikasi sholat berhasil di-setup!*\n\n` +
                `📍 Kota: *${data.lokasi}*\n📅 ${jadwal.tanggal}\n\n` +
                `${formatJadwal(jadwal)}\n\n` +
                `🔔 Bot akan otomatis kirim notifikasi + adzan setiap waktu sholat!`
        }, { quoted: msg });
      } catch (e) {
        await conn.sendMessage(sender, {
          text: `❌ Kota tidak ditemukan: _${kota}_\n\nCoba nama kota lain:\n• _.sholat setup Surabaya_\n• _.sholat setup Bandung_\n• _.sholat setup Medan_`
        }, { quoted: msg });
      }
      return;
    }

    // ── On ───────────────────────────────────────────────────────────────────
    if (sub === 'on') {
      if (!ownerCheck) return conn.sendMessage(sender, { text: '⛔ Hanya owner.' }, { quoted: msg });
      if (!cfg.kotaId) return conn.sendMessage(sender, { text: '❌ Setup dulu: _.sholat setup <kota>_' }, { quoted: msg });
      db[sender] = { ...cfg, aktif: true };
      saveDB(db);
      startScheduler(conn);
      return conn.sendMessage(sender, {
        text: `✅ Notifikasi sholat *diaktifkan!*\n📍 Kota: *${cfg.lokasi || cfg.kotaId}*`
      }, { quoted: msg });
    }

    // ── Off ──────────────────────────────────────────────────────────────────
    if (sub === 'off') {
      if (!ownerCheck) return conn.sendMessage(sender, { text: '⛔ Hanya owner.' }, { quoted: msg });
      db[sender] = { ...cfg, aktif: false };
      saveDB(db);
      return conn.sendMessage(sender, { text: '🔕 Notifikasi sholat *dimatikan.*' }, { quoted: msg });
    }

    // ── Hapus ────────────────────────────────────────────────────────────────
    if (sub === 'hapus' || sub === 'reset') {
      if (!ownerCheck) return conn.sendMessage(sender, { text: '⛔ Hanya owner.' }, { quoted: msg });
      delete db[sender];
      saveDB(db);
      return conn.sendMessage(sender, { text: '🗑️ Pengaturan sholat dihapus.' }, { quoted: msg });
    }

    // ── Default help ─────────────────────────────────────────────────────────
    await conn.sendMessage(sender, {
      text: `🕌 *NOTIFIKASI SHOLAT 5 WAKTU*\n\n` +
            `📖 Perintah:\n` +
            `• _.sholat setup <kota>_ — Setup kota & aktifkan notif\n` +
            `• _.sholat on_ — Aktifkan notifikasi\n` +
            `• _.sholat off_ — Matikan notifikasi\n` +
            `• _.sholat info_ — Lihat jadwal hari ini\n` +
            `• _.sholat hapus_ — Hapus semua pengaturan\n\n` +
            `Contoh: _.sholat setup Jakarta_`
    }, { quoted: msg });
  }
};
