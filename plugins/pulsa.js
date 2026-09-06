/**
 * Plugin Jualan Pulsa & Paket — isipulsa.web.id
 *
 * ── OWNER ────────────────────────────────────────────────
 *   .saldo              — cek saldo akun isipulsa
 *   .trx [n]            — n transaksi terakhir + Voucher ID
 *   .addpaket           — tambah paket ke katalog (multi-step)
 *   .importpaket        — import bulk paket dari JSON isipulsa app
 *   .delpaket <kode>    — hapus paket
 *   .editpaket <kode> harga <baru>
 *
 * ── SEMUA USER ───────────────────────────────────────────
 *   .loginpulsa         — daftar / login akun isipulsa sendiri
 *   .logoutpulsa        — hapus token isipulsa tersimpan
 *   .saldoku            — cek saldo akun isipulsa sendiri
 *   .listpaket [op]     — daftar paket (filter: xl/indosat/telkomsel/dll)
 *   .cekop <nomor>      — deteksi operator
 *   .beli <nomor> <kode>— beli paket (ada konfirmasi)
 *
 * Katalog  : botwa/database/pulsa_catalog.json
 * User auth: botwa/database/pulsa_users.json
 * Kredensial default: setting.js → isipulsa.username / token / appVersionCode
 */

const https   = require('https');
const zlib    = require('zlib');
const qs      = require('querystring');
const fs      = require('fs');
const path    = require('path');
const setting = require('../setting.js');
const { isOwner: _isOwner } = require('../lib/helper');

const BASE = 'isipulsa.web.id';
const cfg  = setting.isipulsa || {};
const VER  = cfg.appVersionCode || '250608';

const CATALOG_PATH = path.join(__dirname, '../database/pulsa_catalog.json');
const USERS_PATH   = path.join(__dirname, '../database/pulsa_users.json');
const VALIDATOR_TTL = 3_600_000; // 1 jam

let _validators = null;
let _validatorTs = 0;

// ─── Catalog IO ────────────────────────────────────────────
function loadCatalog() {
  try { if (fs.existsSync(CATALOG_PATH)) return JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8')); } catch {}
  return {};
}
function saveCatalog(data) {
  fs.mkdirSync(path.dirname(CATALOG_PATH), { recursive: true });
  fs.writeFileSync(CATALOG_PATH, JSON.stringify(data, null, 2));
}

// ─── User Token IO ─────────────────────────────────────────
function loadUsers() {
  try { if (fs.existsSync(USERS_PATH)) return JSON.parse(fs.readFileSync(USERS_PATH, 'utf8')); } catch {}
  return {};
}
function saveUsers(data) {
  fs.mkdirSync(path.dirname(USERS_PATH), { recursive: true });
  fs.writeFileSync(USERS_PATH, JSON.stringify(data, null, 2));
}

// Ambil auth {username, token} untuk sender — user-specific dulu, fallback ke setting.js
function getAuth(sender) {
  const users = loadUsers();
  const jidKey = sender.split('@')[0].split(':')[0];
  for (const [k, v] of Object.entries(users)) {
    if (k === jidKey || k === sender) return { username: v.username, token: v.token };
  }
  return { username: cfg.username || '', token: cfg.token || '' };
}

// ─── API Helper ────────────────────────────────────────────
function apiCall(apiPath, params, auth) {
  return new Promise((resolve, reject) => {
    const { username, token } = auth || {};
    const body = qs.stringify({
      app_version_code: VER, app_version_name: '25.06.08',
      ...(username ? { auth_username: username, auth_token: token } : {}),
      ...params,
    });
    const req = https.request({
      hostname: BASE, path: apiPath, method: 'POST',
      headers: {
        'content-type'   : 'application/x-www-form-urlencoded',
        'user-agent'     : 'okhttp/4.12.0',
        'accept-encoding': 'gzip',
        'content-length' : Buffer.byteLength(body),
      },
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const raw   = Buffer.concat(chunks);
        const parse = buf => { try { resolve(JSON.parse(buf.toString())); } catch (e) { reject(e); } };
        (res.headers['content-encoding'] || '').includes('gzip')
          ? zlib.gunzip(raw, (e, b) => e ? reject(e) : parse(b))
          : parse(raw);
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Login ke isipulsa → kembalikan { success, username, token, message }
async function doLogin(username, password) {
  const res = await apiCall('/api/v2/login', { username, password });
  if (!res.success) return { success: false, message: res.message || 'Login gagal' };
  // Coba berbagai field nama token dari response
  const token = res.auth_token || res.token || res.access_token
    || (res.user && (res.user.auth_token || res.user.token))
    || (res.data && (res.data.auth_token || res.data.token))
    || null;
  if (!token) return { success: false, message: 'Login berhasil tapi token tidak ditemukan.\nResponse: ' + JSON.stringify(res).slice(0, 200) };
  return { success: true, username: res.username || username, token };
}

const apiGet   = (p, auth) => apiCall('/api/v2/get',   { vss: 1, ...p }, auth);
const apiOrder = (p, auth) => apiCall('/api/v2/order', p, auth);

// ─── Operator detect ───────────────────────────────────────
async function getValidators() {
  if (_validators && Date.now() - _validatorTs < VALIDATOR_TTL) return _validators;
  const res = await apiGet({ 'requests[2]': 'validators' });
  if (res.validators?.success) { _validators = res.validators.results; _validatorTs = Date.now(); }
  return _validators || [];
}
function detectOp(nomor, validators) {
  let n = String(nomor).replace(/\D/g, '');
  if (n.startsWith('62')) n = '0' + n.slice(2);
  for (const v of validators) {
    if (v.regex && new RegExp(v.regex).test(n)) return v.name;
  }
  return null;
}

// ─── Utils ─────────────────────────────────────────────────
const rp      = n => `Rp ${Number(n).toLocaleString('id-ID')}`;
const isOwner = senderJid => _isOwner(senderJid, setting.owner || []);
function guessOp(nama) {
  const n = nama.toLowerCase();
  if (n.includes('telkomsel') || n.includes('simpati') || n.includes('kartu as') || n.includes('loop')) return 'Telkomsel';
  if (n.includes('xl') || n.includes('xtra')) return 'XL';
  if (n.includes('axis')) return 'Axis';
  if (n.includes('indosat') || n.includes('im3') || n.includes('ooredoo')) return 'Indosat';
  if (n.includes('three') || n.includes('tri') || n.includes(' 3 ') || n.includes('3id')) return 'Three';
  if (n.includes('smartfren')) return 'Smartfren';
  if (n.includes('pln') || n.includes('token')) return 'PLN';
  if (n.includes('byu')) return 'Byu';
  return 'Umum';
}

// ═══════════════════════════════════════════════════════════
module.exports = {
  name: 'pulsa',
  command: ['.saldo', '.saldoku', '.trx', '.addpaket', '.importpaket', '.delpaket', '.editpaket', '.listpaket', '.cekop', '.beli', '.loginpulsa', '.logoutpulsa'],

  // ─── handleSession: dipanggil main.js saat ada global.userState[sender]
  //     Signature wajib: (conn, sender, text, msg)
  async handleSession(conn, sender, text, msg) {
    const session = global.userState[sender];
    if (!session || session.status !== 'pulsa') return;

    const reply = txt => conn.sendMessage(sender, { text: txt }, { quoted: msg });
    const step  = session.step;

    // ── LOGIN PULSA STEP-BY-STEP ───────────────────────────
    if (step === 'loginpulsa_user') {
      const t = text.trim();
      if (['batal', 'cancel'].includes(t.toLowerCase())) {
        delete global.userState[sender];
        return reply('❎ Login dibatalkan.');
      }
      if (!t) return reply('⚠️ Username tidak boleh kosong. Coba lagi:');
      session.lpUser = t;
      session.step   = 'loginpulsa_pass';
      return reply(`👤 Username: *${t}*\n\n🔐 Sekarang masukkan *password* akun isipulsa:\n_Pesan ini akan dihapus dari memori setelah login_`);
    }

    if (step === 'loginpulsa_pass') {
      const t = text.trim();
      if (['batal', 'cancel'].includes(t.toLowerCase())) {
        delete global.userState[sender];
        return reply('❎ Login dibatalkan.');
      }
      if (!t) return reply('⚠️ Password tidak boleh kosong. Coba lagi:');

      delete global.userState[sender];
      await reply('⏳ Mencoba login ke isipulsa...');
      try {
        const result = await doLogin(session.lpUser, t);
        if (!result.success) return reply(`❌ *Login Gagal*\n${result.message}`);

        const users  = loadUsers();
        const jidKey = sender.split('@')[0].split(':')[0];
        users[jidKey] = { username: result.username, token: result.token, loginAt: new Date().toISOString() };
        saveUsers(users);
        return reply(
          `✅ *Login Berhasil!*\n\n` +
          `👤 Username: *${result.username}*\n` +
          `🔑 Token tersimpan\n\n` +
          `Sekarang kamu bisa:\n` +
          `• *.saldoku* — cek saldo akun kamu\n` +
          `• *.beli <nomor> <kode>* — beli paket pakai saldo kamu\n` +
          `• *.listpaket* — lihat daftar paket`
        );
      } catch (e) { return reply(`❌ Error: ${e.message}`); }
    }

    // ── KONFIRMASI BELI ────────────────────────────────────
    if (step === 'beli_konfirm') {
      const t = text.trim().toLowerCase();
      if (['tidak', 'batal', 'cancel', 'no', 'n'].includes(t)) {
        delete global.userState[sender];
        return reply('❎ Transaksi dibatalkan.');
      }
      if (!['ya', 'iya', 'y'].includes(t)) {
        return reply('Ketik *ya* untuk lanjut atau *batal* untuk membatalkan.');
      }

      delete global.userState[sender];
      await reply('⏳ Memproses transaksi...');
      try {
        const res = await apiOrder({ voucher_id: session.voucherId, phone: session.nomor, payment: 'balance' }, session.auth);
        const catalog = loadCatalog();
        const paket   = catalog[session.kode] || {};
        if (res.status) {
          return reply(
            `✅ *Transaksi Berhasil!*\n\n` +
            `📞 Nomor: *${session.nomor}*\n` +
            `📦 Paket: *${paket.nama || session.kode}*\n` +
            `💵 Harga: *${rp(paket.harga || 0)}*\n` +
            `🆔 ID: ${res.id || '-'}\n\n` +
            `Terima kasih sudah berbelanja! 🙏`
          );
        }
        return reply(`❌ *Gagal*\n${res.message || 'Coba lagi nanti.'}`);
      } catch (e) { return reply(`❌ Error: ${e.message}`); }
    }

    // ── IMPORT PAKET DARI JSON ─────────────────────────────
    if (step === 'importpaket_paste') {
      const t = text.trim();
      if (['batal', 'cancel'].includes(t.toLowerCase())) {
        delete global.userState[sender];
        return reply('❎ Import dibatalkan.');
      }
      // Parse JSON — bisa berupa array voucher atau objek dengan field vouchers/results
      let items = [];
      try {
        let parsed = JSON.parse(t);
        // berbagai kemungkinan struktur dari isipulsa app
        if (Array.isArray(parsed))                          items = parsed;
        else if (Array.isArray(parsed.results))             items = parsed.results;
        else if (Array.isArray(parsed.vouchers))            items = parsed.vouchers;
        else if (parsed.vouchers?.results)                  items = parsed.vouchers.results;
        else if (parsed.data && Array.isArray(parsed.data)) items = parsed.data;
        else {
          // coba cari array apapun di root
          const val = Object.values(parsed).find(v => Array.isArray(v));
          if (val) items = val;
        }
      } catch {
        return reply('❌ JSON tidak valid. Paste ulang JSON dari PCAPdroid, atau ketik *batal*.');
      }
      if (!items.length) {
        return reply('⚠️ Tidak ada item ditemukan di JSON ini.\nCoba struktur JSON lain, atau ketik *batal*.');
      }

      const catalog  = loadCatalog();
      let added = 0, skipped = 0;
      const lines = [];
      for (const item of items) {
        const vid  = String(item.id || item.voucher_id || '').trim();
        const nama = (item.name || item.voucher_name || item.title || '').trim();
        if (!vid || !nama) { skipped++; continue; }
        // Buat kode otomatis dari nama: huruf kecil, spasi → _, maks 12 char
        let kode = nama.toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .replace(/\s+/g, '_')
          .slice(0, 12)
          .replace(/_+$/, '');
        // Hindari duplikat kode
        let finalKode = kode;
        let i = 2;
        while (catalog[finalKode]) { finalKode = `${kode}${i++}`; }

        const harga    = parseInt(item.price || item.harga || 0) || 0;
        const operator = guessOp(nama);
        catalog[finalKode] = { voucherId: vid, harga, nama, operator, createdAt: new Date().toISOString() };
        lines.push(`✅ \`${finalKode}\` — ${nama} (ID:${vid})`);
        added++;
      }
      if (!added) {
        delete global.userState[sender];
        return reply(`⚠️ Tidak ada paket yang bisa diimport (${skipped} item skip karena data tidak lengkap).`);
      }
      saveCatalog(catalog);
      delete global.userState[sender];
      const preview = lines.slice(0, 20).join('\n');
      const more    = lines.length > 20 ? `\n_...dan ${lines.length - 20} paket lainnya_` : '';
      return reply(
        `🎉 *Import Selesai!*\n\n` +
        `📦 Berhasil: *${added}* paket\n` +
        (skipped ? `⚠️ Skip: ${skipped} item (data tidak lengkap)\n` : '') +
        `\n${preview}${more}\n\n` +
        `_Lihat semua: .listpaket_`
      );
    }

    // ── ADD PAKET STEP-BY-STEP ─────────────────────────────
    if (step === 'addpaket_kode') {
      const kode = text.trim().toLowerCase().replace(/\s+/g, '_');
      if (!kode) return reply('⚠️ Kode tidak boleh kosong.');
      const catalog = loadCatalog();
      if (catalog[kode]) {
        return reply(`⚠️ Kode *${kode}* sudah ada.\nGunakan kode lain atau hapus dulu dengan .delpaket ${kode}`);
      }
      session.kode = kode;
      session.step = 'addpaket_vid';
      return reply(`✅ Kode: *${kode}*\n\n🎫 Sekarang masukkan *Voucher ID* dari app isipulsa:\n_(angka saja, contoh: 8021)_`);
    }

    if (step === 'addpaket_vid') {
      const vid = text.trim();
      if (isNaN(parseInt(vid))) return reply('⚠️ Voucher ID harus berupa angka. Coba lagi:');
      session.voucherId = vid;
      session.step = 'addpaket_harga';
      return reply(`✅ Voucher ID: *${vid}*\n\n💰 Sekarang masukkan *harga jual* (angka saja, contoh: 75000):`);
    }

    if (step === 'addpaket_harga') {
      const harga = parseInt(text.trim().replace(/\./g, '').replace(/,/g, ''));
      if (isNaN(harga) || harga <= 0) return reply('⚠️ Harga tidak valid. Masukkan angka saja (contoh: 75000):');
      session.harga = harga;
      session.step  = 'addpaket_nama';
      return reply(`✅ Harga: *${rp(harga)}*\n\n📦 Sekarang masukkan *nama paket*:\n_(contoh: XL Flex M+ 14GB 28hr)_`);
    }

    if (step === 'addpaket_nama') {
      const nama     = text.trim();
      if (!nama) return reply('⚠️ Nama tidak boleh kosong.');
      const operator = guessOp(nama);
      const catalog  = loadCatalog();
      catalog[session.kode] = {
        voucherId: session.voucherId,
        harga    : session.harga,
        nama,
        operator,
        createdAt: new Date().toISOString(),
      };
      saveCatalog(catalog);
      delete global.userState[sender];
      return reply(
        `✅ *Paket berhasil ditambahkan!*\n\n` +
        `🔑 Kode: \`${session.kode}\`\n` +
        `📦 Nama: ${nama}\n` +
        `📡 Operator: ${operator}\n` +
        `💵 Harga: *${rp(session.harga)}*\n` +
        `🎫 Voucher ID: ${session.voucherId}\n\n` +
        `_Customer bisa pesan dengan: .beli <nomor> ${session.kode}_`
      );
    }
  },

  // ─── execute: dipanggil saat command cocok ─────────────────
  //     Signature: (conn, sender, args, msg, text)
  async execute(conn, sender, args, msg) {
    const reply      = txt => conn.sendMessage(sender, { text: txt }, { quoted: msg });
    const cmd        = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || '')
                        .trim().split(/\s+/)[0].toLowerCase();
    // sender = remoteJid (bisa group). Gunakan participant untuk cek owner & auth
    const senderJid  = msg.key?.participant || sender;
    const owner   = isOwner(senderJid);
    const auth    = getAuth(senderJid);
    const hasAuth = !!(auth.username && auth.token);

    // ── .loginpulsa ──────────────────────────────────────────
    if (cmd === '.loginpulsa') {
      global.userState[sender] = { status: 'pulsa', step: 'loginpulsa_user' };
      return reply(
        `🔐 *Login Akun isipulsa*\n\n` +
        `Masukkan *username* akun isipulsa kamu:\n` +
        `_(username yang kamu pakai untuk login di app isipulsa)_\n\n` +
        `_Ketik batal untuk membatalkan_`
      );
    }

    // ── .logoutpulsa ─────────────────────────────────────────
    if (cmd === '.logoutpulsa') {
      const users  = loadUsers();
      const jidKey = senderJid.split('@')[0].split(':')[0];
      if (!users[jidKey]) return reply('⚠️ Kamu belum login. Gunakan *.loginpulsa* dulu.');
      const uname = users[jidKey].username;
      delete users[jidKey];
      saveUsers(users);
      return reply(`✅ Token akun *${uname}* berhasil dihapus.\nGunakan *.loginpulsa* untuk login ulang.`);
    }

    // ── .saldo (owner — lihat saldo akun bot) ────────────────
    if (cmd === '.saldo') {
      if (!owner) return reply('⛔ Perintah ini khusus owner. Gunakan *.saldoku* untuk saldo akun kamu.');
      const ownerAuth = { username: cfg.username || '', token: cfg.token || '' };
      if (!ownerAuth.username || !ownerAuth.token) return reply('⚠️ Kredensial isipulsa belum diisi di setting.js');
      try {
        const res = await apiGet({ 'requests[0]': 'balance' }, ownerAuth);
        if (!res.success) return reply(`❌ ${res.message || 'Gagal ambil saldo'}`);
        const b = res.balance?.results;
        return reply(`💰 *Saldo isipulsa (Bot)*\n\n👤 ${ownerAuth.username}\n💵 *${b?.balance_str || rp(b?.balance || 0)}*`);
      } catch (e) { return reply(`❌ ${e.message}`); }
    }

    // ── .saldoku (semua user — lihat saldo akun sendiri) ─────
    if (cmd === '.saldoku') {
      if (!hasAuth) {
        return reply(
          `⚠️ Kamu belum login ke isipulsa.\n\n` +
          `Gunakan *.loginpulsa* untuk daftarkan akun isipulsa kamu,\n` +
          `atau hubungi owner untuk membeli paket.`
        );
      }
      try {
        const res = await apiGet({ 'requests[0]': 'balance' }, auth);
        if (!res.success) return reply(`❌ ${res.message || 'Gagal ambil saldo'}`);
        const b = res.balance?.results;
        return reply(`💰 *Saldo isipulsa Kamu*\n\n👤 ${auth.username}\n💵 *${b?.balance_str || rp(b?.balance || 0)}*`);
      } catch (e) { return reply(`❌ ${e.message}`); }
    }

    // ── .trx [n] ─────────────────────────────────────────────
    if (cmd === '.trx') {
      if (!owner) return reply('⛔ Perintah ini khusus owner.');
      const limit = Math.min(parseInt(args[0]) || 5, 20);
      const ownerAuth = { username: cfg.username || '', token: cfg.token || '' };
      try {
        const res = await apiGet({ 'requests[1]': 'transactions', 'requests[1][limit]': String(limit) }, ownerAuth);
        if (!res.success) return reply(`❌ ${res.message || 'Gagal'}`);
        const { total, results } = res.transactions?.results || {};
        if (!results?.length) return reply('📭 Belum ada transaksi.');
        let teks = `🧾 *${Math.min(limit, results.length)} Transaksi Terakhir (Total: ${total})*\n\n`;
        for (const t of results.slice(0, limit)) {
          const icon = t.is_success ? '✅' : t.is_in_process ? '⏳' : t.is_refund ? '↩️' : '❌';
          teks += `${icon} *${t.voucher?.name || '-'}*\n`;
          teks += `   📞 ${t.phone}  💵 ${t.price_str}\n`;
          teks += `   🎫 Voucher ID: \`${t.voucher?.id || '-'}\`\n`;
          teks += `   📅 ${t.date}\n\n`;
        }
        teks += `_Voucher ID bisa dipakai saat .addpaket_`;
        return reply(teks.trim());
      } catch (e) { return reply(`❌ ${e.message}`); }
    }

    // ── .addpaket (multi-step via session) ───────────────────
    if (cmd === '.addpaket') {
      if (!owner) return reply('⛔ Perintah ini khusus owner.');
      global.userState[sender] = { status: 'pulsa', step: 'addpaket_kode' };
      return reply(
        `🛒 *Tambah Paket Baru*\n\n` +
        `Langkah 1/4 — Masukkan *kode paket* (unik, tanpa spasi):\n` +
        `_(contoh: xl14gb, isat1gb, tsel5gb)_\n\n` +
        `_Ketik batal untuk membatalkan_`
      );
    }

    // ── .importpaket — bulk import dari JSON PCAPdroid ────────
    if (cmd === '.importpaket') {
      if (!owner) return reply('⛔ Perintah ini khusus owner.');
      global.userState[sender] = { status: 'pulsa', step: 'importpaket_paste' };
      return reply(
        `📥 *Import Paket dari JSON*\n\n` +
        `Cara mendapatkan JSON:\n` +
        `1. Buka *PCAPdroid* → mulai capture\n` +
        `2. Buka app *isipulsa* → pilih kategori paket → pilih operator\n` +
        `3. Tunggu daftar paket muncul\n` +
        `4. Stop PCAPdroid → cari request ke \`isipulsa.web.id\`\n` +
        `5. Copy *response body* (JSON) → paste di sini\n\n` +
        `_Atau ketik *batal* untuk membatalkan_`
      );
    }

    // ── .delpaket <kode> ─────────────────────────────────────
    if (cmd === '.delpaket') {
      if (!owner) return reply('⛔ Perintah ini khusus owner.');
      if (!args[0]) return reply('Usage: *.delpaket <kode>*\nContoh: .delpaket xl14gb');
      const kode    = args[0].toLowerCase();
      const catalog = loadCatalog();
      if (!catalog[kode]) return reply(`❌ Paket *${kode}* tidak ditemukan.\nLihat daftar: .listpaket`);
      const nama = catalog[kode].nama;
      delete catalog[kode];
      saveCatalog(catalog);
      return reply(`🗑️ Paket *${kode}* (${nama}) berhasil dihapus.`);
    }

    // ── .editpaket <kode> harga <baru> ───────────────────────
    if (cmd === '.editpaket') {
      if (!owner) return reply('⛔ Perintah ini khusus owner.');
      if (args.length < 3) return reply('Usage: *.editpaket <kode> harga <angka_baru>*');
      const kode    = args[0].toLowerCase();
      const field   = args[1].toLowerCase();
      const catalog = loadCatalog();
      if (!catalog[kode]) return reply(`❌ Paket *${kode}* tidak ditemukan.`);
      if (field === 'harga') {
        const baru = parseInt(args[2]);
        if (isNaN(baru)) return reply('❌ Harga harus angka.');
        const lama = catalog[kode].harga;
        catalog[kode].harga = baru;
        saveCatalog(catalog);
        return reply(`✅ Harga *${kode}* diubah: ${rp(lama)} → *${rp(baru)}*`);
      }
      return reply('Field yang bisa diedit: *harga*');
    }

    // ── .listpaket [operator] ────────────────────────────────
    if (cmd === '.listpaket') {
      const catalog  = loadCatalog();
      const entries  = Object.entries(catalog);
      if (!entries.length) {
        return reply('📭 Katalog kosong.\nOwner tambah paket dengan *.addpaket*');
      }
      const filter   = (args[0] || '').toLowerCase();
      const filtered = filter
        ? entries.filter(([, v]) => v.operator.toLowerCase().includes(filter) || v.nama.toLowerCase().includes(filter))
        : entries;
      if (!filtered.length) return reply(`❌ Tidak ada paket untuk filter *${args[0]}*`);

      const groups = {};
      for (const [kode, v] of filtered) {
        if (!groups[v.operator]) groups[v.operator] = [];
        groups[v.operator].push({ kode, ...v });
      }

      let teks = `🛒 *Daftar Paket Tersedia*\n`;
      if (filter) teks += `_(filter: ${args[0]})_\n`;
      teks += '\n';
      for (const [op, items] of Object.entries(groups)) {
        teks += `📡 *${op}*\n`;
        for (const item of items) {
          teks += `  🔑 \`${item.kode}\` — ${item.nama}\n`;
          teks += `       💵 *${rp(item.harga)}*\n\n`;
        }
      }
      teks += `_Order: .beli <nomor> <kode>_`;
      return reply(teks);
    }

    // ── .cekop <nomor> ───────────────────────────────────────
    if (cmd === '.cekop') {
      if (!args[0]) return reply('Usage: *.cekop <nomor>*\nContoh: .cekop 085212345678');
      try {
        const validators = await getValidators();
        const op = detectOp(args[0], validators);
        return reply(op
          ? `📡 Nomor *${args[0]}* → *${op}*`
          : `❓ Operator tidak dikenali untuk *${args[0]}*`
        );
      } catch (e) { return reply(`❌ ${e.message}`); }
    }

    // ── .beli <nomor> <kode> ─────────────────────────────────
    if (cmd === '.beli') {
      if (!args[0] || !args[1]) {
        const catalog = loadCatalog();
        const contoh  = Object.keys(catalog)[0] || 'xl14gb';
        return reply(
          `📲 *Cara Beli Paket*\n\n` +
          `*.beli <nomor> <kode_paket>*\n\n` +
          `Contoh:\n*.beli 085212345678 ${contoh}*\n\n` +
          `_Lihat daftar paket: .listpaket_`
        );
      }

      let nomor  = args[0].replace(/[\s\-]/g, '');
      if (nomor.startsWith('62')) nomor = '0' + nomor.slice(2);
      const kode = args[1].toLowerCase();

      const catalog = loadCatalog();
      const paket   = catalog[kode];
      if (!paket) return reply(`❌ Paket *${kode}* tidak ditemukan.\nLihat daftar: *.listpaket*`);

      let opInfo = '';
      try {
        const validators = await getValidators();
        const op = detectOp(nomor, validators);
        if (op) opInfo = `📡 Operator: *${op}*\n`;
      } catch {}

      // Set session untuk konfirmasi
      global.userState[sender] = {
        status   : 'pulsa',
        step     : 'beli_konfirm',
        nomor,
        kode,
        voucherId: paket.voucherId,
        auth,
      };

      return reply(
        `⚠️ *Konfirmasi Pembelian*\n\n` +
        `📞 Nomor: *${nomor}*\n` +
        opInfo +
        `📦 Paket: *${paket.nama}*\n` +
        `💵 Harga: *${rp(paket.harga)}*\n` +
        `💳 Bayar via: Saldo Akun\n\n` +
        `Balas *ya* untuk lanjut\nBalas *batal* untuk membatalkan`
      );
    }
  },
};
