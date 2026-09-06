/**
 * .dekehi — Decrypt file .ehi (HTTP Injector)
 *
 * Cara pakai:
 *   • Kirim file .ehi → caption: .dekehi
 *   • Atau: reply/quote file .ehi → ketik .dekehi
 *
 * Alias: .decehi (supaya tidak salah ketik)
 */

const AdmZip = require('adm-zip');
const { downloadContentFromMessage, downloadMediaMessage } = require('@whiskeysockets/baileys');

// ══════════════════════════════════════════════════════
//  CORE DECRYPTION (port dari Lua GameGuardian)
// ══════════════════════════════════════════════════════

// Custom base64 decode dengan alphabet kustom
function dec(data, alphabet) {
  data = data.split('').filter(c => alphabet.includes(c) || c === '=').join('');
  let bits = '';
  for (const c of data) {
    if (c === '?') continue;
    const idx = alphabet.indexOf(c);
    if (idx === -1) continue;
    for (let i = 5; i >= 0; i--) bits += (idx >> i) & 1 ? '1' : '0';
  }
  let result = '';
  for (let i = 0; i + 8 <= bits.length; i += 8)
    result += String.fromCharCode(parseInt(bits.slice(i, i + 8), 2));
  return result;
}

// Konversi string/Buffer → array Unicode code points (UTF-8 aware, sesuai Lua)
function charCodeAt(s) {
  const buf = Buffer.isBuffer(s) ? s : Buffer.from(s, 'binary');
  const out = [];
  let i = 0;
  while (i < buf.length) {
    const b = buf[i];
    if (b >= 1 && b <= 127) {
      out.push(b); i++;
    } else if (b >= 194 && b <= 223 && i + 1 < buf.length) {
      out.push(((b & 0x1F) << 6) | (buf[i + 1] & 0x3F)); i += 2;
    } else if (b >= 224 && b <= 239 && i + 2 < buf.length) {
      out.push(((b & 0x0F) << 12) | ((buf[i + 1] & 0x3F) << 6) | (buf[i + 2] & 0x3F)); i += 3;
    } else if (b >= 240 && b <= 244 && i + 3 < buf.length) {
      const cp = ((b & 0x07) << 18) | ((buf[i + 1] & 0x3F) << 12) |
                 ((buf[i + 2] & 0x3F) << 6) | (buf[i + 3] & 0x3F);
      out.push(Math.floor((cp - 65536) / 1024) + 55296);
      out.push((cp - 65536) % 1024 + 56320);
      i += 4;
    } else {
      out.push(b); i++;
    }
  }
  return out;
}

// XOR decrypt: hex string data + key → plaintext
function ehix9(key, hexData) {
  const bytes   = Buffer.from(hexData, 'hex');
  const bitKey  = charCodeAt(Buffer.from(key, 'utf8'));
  const bitData = charCodeAt(bytes);
  let result = '', b = 0;
  for (let a = 0; a < bitData.length; a++) {
    if (b >= bitKey.length) b = 0;
    const v = bitData[a] ^ bitKey[b++];
    if (v < 256) result += String.fromCharCode(v);
  }
  return result;
}

const A_OLD = 'RkLC2QaVMPYgGJW/A4f7qzDb9e+t6Hr0Zp8OlNyjuxKcTw1o5EIimhBn3UvdSFXs?';
const A_NEW = 't6uxKcTwhBn3UvRkLC2QaVM1o5A4f7Hr0Zp8OyjqzDb9e+dSFXsEIimPYgGJW/lN?';

const decryptEhi  = (salt, data) => ehix9(salt, dec(data.split('').reverse().join(''), A_OLD));
const decryptEhil = (salt, data) => ehix9(salt, dec(data.split('').reverse().join(''), A_NEW));

// ══════════════════════════════════════════════════════
//  PARSER .ehi → config.json → decrypt semua field
// ══════════════════════════════════════════════════════

const ENCRYPTED_FIELDS = [
  'host', 'user', 'password',
  'remoteProxy', 'remoteProxyUsername', 'remoteProxyPassword',
  'sniHostname', 'payload', 'httpObfsSettings',
  'shadowsocksHost', 'shadowsocksPassword',
  'v2rMuxConcurrency', 'sslPrivateKey', 'sslCertificate',
];

function parseEhi(buf) {
  const zip   = new AdmZip(buf);
  const entry = zip.getEntry('config.json');
  if (!entry) throw new Error('config.json tidak ada di dalam file .ehi');

  const cfg   = JSON.parse(entry.getData().toString('utf8'));
  const salt  = (cfg.configSalt && cfg.configSalt !== '') ? cfg.configSalt : 'EVZJNI';
  const isNew = Number(cfg.configVersionCode) > 10000;
  const dfn   = isNew ? decryptEhil : decryptEhi;

  const decFields = {};
  for (const f of ENCRYPTED_FIELDS) {
    if (cfg[f] && typeof cfg[f] === 'string' && cfg[f].length > 0) {
      try { decFields[f] = dfn(salt, cfg[f]); }
      catch (e) { decFields[f] = `[err: ${e.message}]`; }
    }
  }

  return {
    name   : cfg.configName        || '(tanpa nama)',
    tunnel : cfg.tunnelType        || '(unknown)',
    version: cfg.configVersionCode || 0,
    salt, isNew,
    sshPort: cfg.sshPort  || cfg.port || '',
    ssPort : cfg.shadowsocksPort   || '',
    dec    : decFields,
  };
}

// ══════════════════════════════════════════════════════
//  FORMAT OUTPUT
// ══════════════════════════════════════════════════════

function format(r) {
  const d = r.dec;
  const L = [
    `╔════════════════════════════╗`,
    `║  🔓  HASIL DECRYPT .EHI       ║`,
    `╚════════════════════════════╝`,
    ``,
    `📛 Nama    : ${r.name}`,
    `🔗 Tunnel  : ${r.tunnel}`,
    `📦 Versi   : ${r.version} ${r.isNew ? '(new)' : '(old)'}`,
    `🔑 Salt    : \`${r.salt}\``,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
  ];

  if (d.host || d.user || d.password) {
    L.push(`🔒 *SSH / Server*`);
    if (d.host)     L.push(`  Host     : \`${d.host}\``);
    if (r.sshPort)  L.push(`  Port     : \`${r.sshPort}\``);
    if (d.user)     L.push(`  Username : \`${d.user}\``);
    if (d.password) L.push(`  Password : \`${d.password}\``);
    L.push('');
  }
  if (d.remoteProxy) {
    L.push(`🌐 *Proxy*`);
    L.push(`  Proxy : \`${d.remoteProxy}\``);
    if (d.remoteProxyUsername) L.push(`  User  : \`${d.remoteProxyUsername}\``);
    if (d.remoteProxyPassword) L.push(`  Pass  : \`${d.remoteProxyPassword}\``);
    L.push('');
  }
  if (d.sniHostname) { L.push(`🛡️ *SNI*    : \`${d.sniHostname}\``); L.push(''); }
  if (d.payload) {
    L.push(`📦 *Payload*`);
    L.push(`\`\`\`\n${d.payload}\n\`\`\``);
    L.push('');
  }
  if (d.shadowsocksHost) {
    L.push(`🌑 *Shadowsocks*`);
    if (d.shadowsocksHost)     L.push(`  Host : \`${d.shadowsocksHost}\``);
    if (r.ssPort)              L.push(`  Port : \`${r.ssPort}\``);
    if (d.shadowsocksPassword) L.push(`  Pass : \`${d.shadowsocksPassword}\``);
    L.push('');
  }
  if (d.httpObfsSettings) { L.push(`⚙️ *Obfs*   : \`${d.httpObfsSettings}\``); L.push(''); }

  L.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  L.push(`✅ Decrypted successfully`);
  return L.join('\n');
}

// ══════════════════════════════════════════════════════
//  DOWNLOAD HELPER — coba stream dulu, fallback buffer
// ══════════════════════════════════════════════════════

/**
 * Download document dari objek documentMessage ke Buffer.
 * Menggunakan downloadMediaMessage agar Baileys bisa resolve
 * mediaKey + directPath dengan benar (termasuk untuk quoted msg).
 *
 * @param {object} fullMsg  - pesan lengkap Baileys (bukan hanya .message)
 * @param {object} docMsg   - documentMessage yang mau di-download
 * @returns {Promise<Buffer>}
 */
async function downloadDoc(sock, fullMsg, docMsg) {
  // Susun objek pesan minimal yang dimengerti Baileys
  // (downloadMediaMessage butuh key + message wrapper)
  const wrappedMsg = {
    key    : fullMsg.key,
    message: { documentMessage: docMsg },
  };

  // downloadMediaMessage tersedia di versi @whiskeysockets/baileys ≥ 6.x
  // Ia menangani decryption + stream → Buffer secara otomatis
  if (typeof downloadMediaMessage === 'function') {
    return downloadMediaMessage(
      wrappedMsg,
      'buffer',
      {},
      { logger: console, reuploadRequest: sock.updateMediaMessage }
    );
  }

  // Fallback: pakai downloadContentFromMessage (versi lama)
  const stream = await downloadContentFromMessage(docMsg, 'document');
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

// ══════════════════════════════════════════════════════
//  DETECT FILE FROM MESSAGE
//
//  Prioritas:
//    1. Pesan itu sendiri adalah document (caption .dekehi)
//    2. Pesan adalah reply → ambil dari contextInfo.quotedMessage
// ══════════════════════════════════════════════════════

async function getFileBuffer(sock, msg) {
  let docMsg   = null;
  let isQuoted = false;

  // Kasus 1: pesan langsung berisi document
  if (msg?.message?.documentMessage) {
    docMsg = msg.message.documentMessage;
  }

  // Kasus 2: reply/quote ke document
  if (!docMsg) {
    const ctx = msg?.message?.extendedTextMessage?.contextInfo
             || msg?.message?.documentMessage?.contextInfo;
    if (ctx?.quotedMessage?.documentMessage) {
      docMsg   = ctx.quotedMessage.documentMessage;
      isQuoted = true;
    }
  }

  if (!docMsg) return null;

  const fileName = (docMsg.fileName || '').toLowerCase();
  if (!fileName.endsWith('.ehi')) {
    return { error: `❌ File *${docMsg.fileName}* bukan .ehi` };
  }

  try {
    const buffer = await downloadDoc(sock, msg, docMsg);

    // Validasi: ZIP selalu diawali dengan magic bytes PK (0x50 0x4B)
    if (!buffer || buffer.length < 4) {
      throw new Error('Buffer kosong atau terlalu kecil setelah download');
    }
    if (buffer[0] !== 0x50 || buffer[1] !== 0x4B) {
      throw new Error(
        `Buffer bukan ZIP (magic bytes: ${buffer.slice(0, 4).toString('hex')}). ` +
        (isQuoted
          ? 'Coba kirim file langsung (bukan reply) dengan caption .dekehi.'
          : 'File mungkin corrupt.')
      );
    }

    return { buffer, fileName: docMsg.fileName };
  } catch (err) {
    return { error: `❌ Gagal download: ${err.message}` };
  }
}

// ══════════════════════════════════════════════════════
//  EXPORT PLUGIN
// ══════════════════════════════════════════════════════

module.exports = {
  name   : '.dekehi',
  command: ['.dekehi', '.decehi'],   // alias supaya typo pun jalan

  execute: async (sock, sender, args, msg) => {
    // Kirim status loading
    await sock.sendMessage(sender, { text: '🔓 Membaca file .ehi...' }, { quoted: msg });

    try {
      const file = await getFileBuffer(sock, msg);

      if (!file) {
        return sock.sendMessage(sender, {
          text:
            '❌ File .ehi tidak ditemukan.\n\n' +
            '*Cara pakai:*\n' +
            '① Kirim file .ehi dengan caption *.dekehi*\n' +
            '② Atau reply/quote file .ehi → ketik *.dekehi*'
        }, { quoted: msg });
      }

      if (file.error) {
        return sock.sendMessage(sender, { text: file.error }, { quoted: msg });
      }

      const result = parseEhi(file.buffer);
      return sock.sendMessage(sender, { text: format(result) }, { quoted: msg });

    } catch (err) {
      console.error('[dekehi]', err);

      let txt = `❌ Gagal decrypt:\n${err.message}`;
      if (err.message.includes('config.json'))
        txt += '\n\n💡 File .ehi mungkin corrupt atau bukan format HTTP Injector.';
      else if (/invalid|zip/i.test(err.message))
        txt += '\n\n💡 File bukan ZIP yang valid — pastikan file tidak rusak.';

      return sock.sendMessage(sender, { text: txt }, { quoted: msg });
    }
  }
};