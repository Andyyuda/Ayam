/**
 * .menu — AndyStore Bot menu
 * V1 — Teks biasa tanpa button
 * V2 — Satu pesan, satu dropdown berisi semua kategori + quick reply
 * Ganti versi: .setmenu v1 / .setmenu v2
 */

const fs   = require('fs');
const path = require('path');
const setting = require('../setting');
const { sendInteractive, quickReply, singleSelect } = require('../lib/button');

const LOGO_PATH = path.join(__dirname, '../assets/logo.png');
const VER_DB    = path.join(__dirname, '../database/menuver.json');

function getPrefix() {
  let prefix = setting.prefix ?? '.';
  try {
    const db = JSON.parse(fs.readFileSync(path.join(__dirname, '../database/prefix.json')));
    if (typeof db.prefix === 'string') prefix = db.prefix;
  } catch {}
  return prefix;
}

function getMenuVer() {
  try { return JSON.parse(fs.readFileSync(VER_DB, 'utf8')).version || 'v2'; } catch { return 'v2'; }
}

// ─────────────────────────────────────────────────────────────────────────────
// V1 — Teks biasa, tanpa button
// ─────────────────────────────────────────────────────────────────────────────
async function menuV1(conn, sender, msg, p, jam, tgl) {
  const text = `╔══════════════════════╗
║   🤖  *ANDYSTORE BOT*   ║
╚══════════════════════╝

🕐 *${jam} WIB*  •  📅 *${tgl}*
━━━━━━━━━━━━━━━━━━━━━━━━

👑 *[ OWNER & SETUP ]*
│ ${p}myid         → ID kamu
│ ${p}regowner     → Daftar owner (PIN)
│ ${p}addowner     → Tambah owner
│ ${p}delowner     → Hapus owner
│ ${p}setprefix    → Ganti prefix
│ ${p}setmenu v1/v2→ Ganti tampilan menu

⚙️ *[ MANAJEMEN BOT ]*
│ ${p}restart      → Restart bot
│ ${p}addplugin    → Upload plugin
│ ${p}delplugin    → Hapus plugin
│ ${p}getplugin    → Lihat plugin
│ $ <cmd>          → Jalankan shell

👥 *[ GRUP TOOLS ]*
│ ${p}add   → Tambah member
│ ${p}kick  → Keluarkan member
│ ${p}mute  → Bisukan member
│ ${p}unmute→ Bunyikan member
│ ${p}welcome      → Pesan sambutan
│ ${p}leave        → Bot keluar grup

🔐 *[ AKUN VPN ]*
│ ${p}buatssh  ${p}trialssh
│ ${p}addtr    ${p}trialtr
│ ${p}addvl    ${p}trialvl
│ ${p}addvm    ${p}trialvm

🤖 *[ AI & PINTAR ]*
│ ${p}ai <tanya>   → Chat AI
│ ${p}resetai      → Reset riwayat AI

🎮 *[ PERMAINAN ]*
│ ${p}tebakangka   → Tebak angka 1-100
│ ${p}tebakkata    → Hangman tebak kata
│ ${p}suit         → Batu Gunting Kertas
│ ${p}dadu [N]     → Lempar dadu
│ ${p}koin         → Lempar koin
│ ${p}quiz         → Kuis trivia
│ ${p}truth / ${p}dare / ${p}tod

✨ *[ SERU-SERUAN ]*
│ ${p}ramalan      → Ramalan harian
│ ${p}horoscope    → Horoskop zodiak
│ ${p}angkahoki    → Angka keberuntungan
│ ${p}kata / ${p}katacinta / ${p}katafunny

🎵 *[ MUSIK ]*
│ ${p}play <judul> → Putar audio YT
│ ${p}dompul       → Download MP3

🛡️ *[ SERVER VPS ]*
│ ${p}installsc  ${p}regisip
│ ${p}perpanjangip ${p}bersihkanip

━━━━━━━━━━━━━━━━━━━━━━━━
✨ *AndyStore Bot* — v1 Menu
🔧 Ganti tampilan: _.setmenu v2_`;

  if (fs.existsSync(LOGO_PATH)) {
    await conn.sendMessage(sender, {
      image: fs.readFileSync(LOGO_PATH), caption: text, mimetype: 'image/png'
    }, { quoted: msg });
  } else {
    await conn.sendMessage(sender, { text }, { quoted: msg });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// V2 — SATU pesan, SATU dropdown semua kategori + 3 quick reply
// ─────────────────────────────────────────────────────────────────────────────
async function menuV2(conn, sender, msg, p, jam, tgl) {
  const caption = `╔══════════════════════╗
║   🤖  *ANDYSTORE BOT*   ║
╚══════════════════════╝

🕐 *${jam} WIB*  •  📅 *${tgl}*
━━━━━━━━━━━━━━━━━━━━━━━━
Pilih perintah dari menu di bawah 👇`;

  // Kirim logo dulu
  if (fs.existsSync(LOGO_PATH)) {
    await conn.sendMessage(sender, {
      image: fs.readFileSync(LOGO_PATH), caption, mimetype: 'image/png'
    }, { quoted: msg });
  } else {
    await conn.sendMessage(sender, { text: caption }, { quoted: msg });
  }

  // Satu sendInteractive dengan semua kategori dalam satu singleSelect
  await sendInteractive(conn, sender, {
    title : '🤖 AndyStore Bot',
    body  : `⚡ Prefix aktif: *${p || 'none'}*\nPilih kategori & perintah:`,
    footer: 'AndyStore Bot • @andyyuda28',
    buttons: [
      singleSelect('📋 Pilih Menu', [
        {
          title: '👑 Owner & Bot',
          rows: [
            { title: `${p}myid`,       description: 'Lihat ID / nomor kamu',            id: `${p}myid` },
            { title: `${p}regowner`,   description: 'Daftar jadi owner via PIN',         id: `${p}regowner` },
            { title: `${p}addowner`,   description: 'Tambah owner baru',                 id: `${p}addowner` },
            { title: `${p}setprefix`,  description: 'Ganti prefix perintah bot',         id: `${p}setprefix` },
            { title: `${p}setmenu`,    description: 'Ganti tampilan menu (v1/v2)',        id: `${p}setmenu` },
            { title: `${p}restart`,    description: 'Restart ulang bot',                 id: `${p}restart` },
            { title: `${p}addplugin`,  description: 'Upload plugin baru',                id: `${p}addplugin` },
            { title: `${p}delplugin`,  description: 'Hapus plugin',                      id: `${p}delplugin` },
          ]
        },
        {
          title: '👥 Grup Tools',
          rows: [
            { title: `${p}add`,        description: 'Tambah member ke grup',             id: `${p}add` },
            { title: `${p}kick`,       description: 'Keluarkan member dari grup',        id: `${p}kick` },
            { title: `${p}mute`,       description: 'Bisukan member',                    id: `${p}mute` },
            { title: `${p}unmute`,     description: 'Bunyikan kembali member',           id: `${p}unmute` },
            { title: `${p}welcome`,    description: 'Set pesan sambutan grup',           id: `${p}welcome` },
            { title: `${p}leave`,      description: 'Bot keluar dari grup',              id: `${p}leave` },
          ]
        },
        {
          title: '🔐 Akun VPN',
          rows: [
            { title: `${p}buatssh`,    description: 'Buat akun SSH baru',               id: `${p}buatssh` },
            { title: `${p}trialssh`,   description: 'Akun SSH trial',                   id: `${p}trialssh` },
            { title: `${p}addtr`,      description: 'Buat akun Trojan',                 id: `${p}addtr` },
            { title: `${p}trialtr`,    description: 'Trial Trojan',                     id: `${p}trialtr` },
            { title: `${p}addvl`,      description: 'Buat akun VLESS',                  id: `${p}addvl` },
            { title: `${p}trialvl`,    description: 'Trial VLESS',                      id: `${p}trialvl` },
            { title: `${p}addvm`,      description: 'Buat akun VMess',                  id: `${p}addvm` },
            { title: `${p}trialvm`,    description: 'Trial VMess',                      id: `${p}trialvm` },
          ]
        },
        {
          title: '🤖 AI & Pintar',
          rows: [
            { title: `${p}ai`,         description: 'Chat dengan AI (tulis pertanyaan)', id: `${p}ai` },
            { title: `${p}resetai`,    description: 'Reset riwayat chat AI',             id: `${p}resetai` },
          ]
        },
        {
          title: '🎮 Permainan',
          rows: [
            { title: `${p}tebakangka`, description: 'Tebak angka 1-100, 7 kesempatan',  id: `${p}tebakangka` },
            { title: `${p}tebakkata`,  description: 'Hangman tebak kata Indonesia',     id: `${p}tebakkata` },
            { title: `${p}suit`,       description: 'Batu Gunting Kertas vs Bot',       id: `${p}suit` },
            { title: `${p}dadu`,       description: 'Lempar dadu 1-6',                  id: `${p}dadu` },
            { title: `${p}koin`,       description: 'Lempar koin heads/tails',          id: `${p}koin` },
            { title: `${p}quiz`,       description: 'Kuis trivia 20+ soal',             id: `${p}quiz` },
            { title: `${p}truth`,      description: 'Pertanyaan truth acak',            id: `${p}truth` },
            { title: `${p}dare`,       description: 'Tantangan dare acak',              id: `${p}dare` },
            { title: `${p}tod`,        description: 'Truth atau Dare acak',             id: `${p}tod` },
          ]
        },
        {
          title: '✨ Seru-Seruan',
          rows: [
            { title: `${p}ramalan`,    description: 'Ramalan harian acak',              id: `${p}ramalan` },
            { title: `${p}horoscope`,  description: 'Horoskop zodiak (+ nama zodiak)',  id: `${p}horoscope` },
            { title: `${p}angkahoki`,  description: 'Angka keberuntungan hari ini',     id: `${p}angkahoki` },
            { title: `${p}kata`,       description: 'Quote motivasi',                   id: `${p}kata` },
            { title: `${p}katacinta`,  description: 'Kata-kata romantis',               id: `${p}katacinta` },
            { title: `${p}katafunny`,  description: 'Humor & meme',                    id: `${p}katafunny` },
          ]
        },
        {
          title: '🎵 Musik & Lainnya',
          rows: [
            { title: `${p}play`,       description: 'Putar audio YouTube',              id: `${p}play` },
            { title: `${p}dompul`,     description: 'Download MP3',                     id: `${p}dompul` },
            { title: `${p}ping`,       description: 'Tes kecepatan respon bot',         id: `${p}ping` },
          ]
        },
      ]),
      quickReply('🤖 AI',  `${p}ai`),
      quickReply('🎮 Game', `${p}tebakangka`),
    ]
  }, msg);
}

// ─────────────────────────────────────────────────────────────────────────────
module.exports = {
  name   : '.menu',
  command: ['.menu', '.help', '.start'],

  async execute(conn, sender, args, msg) {
    const p   = getPrefix();
    const ver = getMenuVer();
    const now = new Date();
    const jam = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
    const tgl = now.toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });

    if (ver === 'v1') {
      await menuV1(conn, sender, msg, p, jam, tgl);
    } else {
      try {
        await menuV2(conn, sender, msg, p, jam, tgl);
      } catch (e) {
        console.error('[menu-v2] error, fallback v1:', e.message);
        await menuV1(conn, sender, msg, p, jam, tgl);
      }
    }
  }
};
