/**
 * .dehc — Decrypt file .hc (HTTP Custom) / EVA.txt
 *
 * Cara pakai:
 *   • Kirim file .hc → caption: .dehc
 *   • Atau: reply/quote file → ketik .dehc
 *
 * Format yang didukung:
 *   1. Plain JSON   (.hc paling umum)
 *   2. Base64 JSON  (.hc beberapa versi)
 *   3. ZIP → JSON   (.hc versi lama)
 *   4. Raw binary   (EVA.txt export dari Lua GameGuardian)
 */

const AdmZip = require('adm-zip');
const { downloadContentFromMessage, downloadMediaMessage } = require('@whiskeysockets/baileys');

// ══════════════════════════════════════════════════════
//  HELPER UMUM
// ══════════════════════════════════════════════════════

function hexdecode(hex) {
  return hex.replace(/[0-9a-fA-F]{2}/g, m => String.fromCharCode(parseInt(m, 16)));
}

function strip(s) { return s.replace(/^\s+|\s+$/g, ''); }
function keepPrintable(s) { return s.replace(/[^\x20-\x7e]/g, ''); }

// ══════════════════════════════════════════════════════
//  FORMAT 1 — PLAIN JSON
// ══════════════════════════════════════════════════════

function tryJson(buf) {
  let json = null;
  try { json = JSON.parse(buf.toString('utf8')); } catch (_) {}

  if (!json) {
    try {
      const decoded = Buffer.from(buf.toString('utf8').trim(), 'base64').toString('utf8');
      json = JSON.parse(decoded);
    } catch (_) {}
  }

  if (!json) {
    try {
      const cleaned = buf.toString('utf8').replace(/^\uFEFF/, '').trim();
      json = JSON.parse(cleaned);
    } catch (_) {}
  }

  if (!json || typeof json !== 'object') return null;
  return formatJson(json);
}

function first(obj, ...keys) {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '')
      return String(obj[k]);
  }
  return null;
}

function formatJson(cfg) {
  const name = first(cfg,
    'name', 'Name', 'ConfigName', 'configName', 'config_name', 'title'
  ) || '(tanpa nama)';

  const expired = first(cfg,
    'expired', 'expiry', 'expire', 'expire_date', 'expireDate',
    'lifeTime', 'lifetime', 'valid_until', 'validUntil'
  );

  const payload = first(cfg,
    'payload', 'Payload', 'request', 'Request',
    'http_payload', 'httpPayload', 'inject'
  );

  const proxyHost = first(cfg,
    'proxy', 'proxy_ip', 'proxyIp', 'ProxyIP', 'proxyHost', 'proxy_host',
    'remote_proxy', 'remoteProxy', 'server', 'Server'
  );
  const proxyPort = first(cfg,
    'proxy_port', 'proxyPort', 'ProxyPort', 'remote_proxy_port', 'port'
  );

  const sshObj  = cfg.ssh || cfg.SSH || cfg.sshConfig || {};
  const sshHost = first(cfg, 'ssh_host', 'sshHost', 'SSHHost', 'host', 'Host') ||
                  first(sshObj, 'host', 'Host', 'hostname');
  const sshPort = first(cfg, 'ssh_port', 'sshPort', 'SSHPort') ||
                  first(sshObj, 'port', 'Port') || '22';
  const sshUser = first(cfg, 'ssh_user', 'sshUser', 'SSHUser', 'username', 'user') ||
                  first(sshObj, 'username', 'user', 'User');
  const sshPass = first(cfg, 'ssh_pass', 'sshPass', 'SSHPass', 'password', 'pass') ||
                  first(sshObj, 'password', 'pass', 'Pass');

  const sni = first(cfg,
    'sni', 'SNI', 'sniHostname', 'sni_hostname',
    'ssl_sni', 'tls_sni', 'server_name', 'serverName', 'hostname'
  ) || first(sshObj, 'sni', 'SNI');

  const mode = first(cfg,
    'connection_mode', 'connectionMode', 'tunnel', 'tunnelType',
    'mode', 'type', 'protocol'
  );

  const L = [
    '╔══════════════════════════╗',
    '║  🔓  HASIL DECRYPT .HC      ║',
    '╚══════════════════════════╝',
    '',
    `📛 Nama    : ${name}`,
  ];

  if (mode)    L.push(`🔗 Tunnel  : ${mode}`);
  if (expired) L.push(`📅 Expired : ${expired}`);

  if (payload) {
    L.push('');
    L.push('📦 *Payload*');
    L.push('```');
    L.push(payload.replace(/\\r\\n/g, '\r\n').replace(/\\n/g, '\n'));
    L.push('```');
  }

  if (proxyHost) {
    L.push('');
    L.push('🌐 *Proxy*');
    L.push(`  Host : \`${proxyHost}\``);
    if (proxyPort) L.push(`  Port : \`${proxyPort}\``);
  }

  if (sshHost || sshUser) {
    L.push('');
    L.push('🔒 *SSH*');
    if (sshHost) L.push(`  Host : \`${sshHost}\``);
    if (sshPort) L.push(`  Port : \`${sshPort}\``);
    if (sshUser) L.push(`  User : \`${sshUser}\``);
    if (sshPass) L.push(`  Pass : \`${sshPass}\``);
  }

  if (sni) {
    L.push('');
    L.push(`🛡️ *SNI*    : \`${sni}\``);
  }

  L.push('');
  L.push('━━━━━━━━━━━━━━━━━━━━━━━━━━');
  L.push('✅ Decrypted successfully');
  return L.join('\n');
}

// ══════════════════════════════════════════════════════
//  FORMAT 2 — ZIP → JSON
// ══════════════════════════════════════════════════════

function tryZip(buf) {
  try {
    const zip = new AdmZip(buf);
    for (const e of zip.getEntries()) {
      if (e.entryName.endsWith('.json') || e.entryName === 'config' || e.entryName === 'setting') {
        try {
          const json = JSON.parse(e.getData().toString('utf8'));
          return formatJson(json);
        } catch (_) {}
      }
    }
    for (const e of zip.getEntries()) {
      try {
        const json = JSON.parse(e.getData().toString('utf8'));
        if (typeof json === 'object' && json !== null) return formatJson(json);
      } catch (_) {}
    }
  } catch (_) {}
  return null;
}

// ══════════════════════════════════════════════════════
//  FORMAT 3 — RAW BINARY / EVA.txt (port Lua)
// ══════════════════════════════════════════════════════

function hexencodeSpasi(buf) {
  let out = '';
  for (let i = 0; i < buf.length; i++)
    out += buf[i].toString(16).padStart(2, '0') + ' ';
  return out;
}

function splitString(str, separator) {
  const tbl = [];
  let idx = str.indexOf(separator);
  if (idx === -1) return tbl;
  let rest = str.slice(idx + separator.length);
  let count = 0;
  while (count < 200) {
    const next  = rest.indexOf(separator);
    const chunk = next === -1 ? rest : rest.slice(0, next);
    const cleaned = keepPrintable(strip(hexdecode(chunk)));
    tbl.push(/[^\x20]/.test(cleaned) ? cleaned : 'false');
    if (next === -1) break;
    rest = rest.slice(next + separator.length);
    count++;
  }
  return tbl;
}

function findExpDate(tbl) {
  let result = -1;
  for (let i = 0; i < tbl.length; i++)
    if (/\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(tbl[i]) || /lifeTime/i.test(tbl[i]))
      result = i;
  return result;
}

function prosesData(rawBuf) {
  let data = hexencodeSpasi(rawBuf);
  data = data.split('00').join('20');
  data = data.split('20').join('z');
  data = data.replace(/66 61 6c 73 65/g, 'F A L S E');
  data = data.replace(/66616c7365/g, 'F A L S E');
  data = data.replace(/ /g, '').replace(/\n/g, '');

  const sepMatch = data.match(/FALSE[z]+([^z]+)[z]+/);
  if (!sepMatch) return [];

  const MARKER = '0a56616c647947616e74656e67';
  data = data.split(sepMatch[1]).join(MARKER);
  data = data.split('z').join('20');
  data = data.split('FALSE').join('66616c7365');

  const result = splitString(data, MARKER);
  const expIdx = findExpDate(result);
  if (expIdx < 0) return result;

  const begin = expIdx - 4;
  const out   = [];
  for (let i = begin; i <= begin + 31; i++) out.push(result[i] || 'false');
  return out;
}

const CFG_REGEX = {
  0:  { name: '📦 Payload',     re: /[a-zA-Z]+ .*\[crlf\]+/            },
  1:  { name: '🌐 Proxy',       re: /[\w.]+:\d+/                        },
  4:  { name: '📅 Expired',     re: /.+/                                },
  7:  { name: '🔒 Host SSH',    re: /[0-9a-zA-Z.\-]+:\d+@[\w.\-]+:\w+/ },
  11: { name: '🛡️ SNI (raw)',   re: /.+/                                },
  12: { name: '🛡️ SNI',        re: /[\w.\-]+\.[\w]+/                   },
  27: { name: '📱 Version App', re: /.+/                                },
};

function tryMemoryDump(buf) {
  const fields = prosesData(buf);
  if (fields.length === 0) return null;

  const lines = [
    '╔══════════════════════════╗',
    '║  🔓  HASIL DECRYPT .HC      ║',
    '╚══════════════════════════╝',
    '',
  ];
  for (const [idx, { name, re }] of Object.entries(CFG_REGEX)) {
    const val = tbl[Number(idx)];
    if (val && val !== 'false') {
      const m = val.match(re);
      if (m) lines.push(`${name} : \`${m[0]}\``);
    }
  }
  if (!(fields[7] && CFG_REGEX[7].re.test(fields[7]))) {
    for (let i = 0; i < fields.length; i++) {
      if (i === 7) continue;
      if (fields[i] && /[0-9a-zA-Z.\-]+:\d+@[\w.\-]+:\w+/.test(fields[i])) {
        lines.push(`🔒 SSH (alt) : \`${fields[i].match(/[0-9a-zA-Z.\-]+:\d+@[\w.\-]+:\w+/)[0]}\``);
        break;
      }
    }
  }
  lines.push('', '━━━━━━━━━━━━━━━━━━━━━━━━━━', '✅ Decrypted by bot');
  return lines.join('\n');
}

// ══════════════════════════════════════════════════════
//  MAIN PARSER
// ══════════════════════════════════════════════════════

function parseHc(buf) {
  const jsonResult = tryJson(buf);
  if (jsonResult) return jsonResult;

  const zipResult = tryZip(buf);
  if (zipResult) return zipResult;

  const memResult = tryMemoryDump(buf);
  if (memResult) return memResult;

  const preview = buf.slice(0, 32).toString('hex');
  const text    = buf.slice(0, 64).toString('utf8').replace(/[^\x20-\x7e]/g, '·');
  throw new Error(
    'Format file tidak dikenali.\n\n' +
    `🔍 *Header hex* : \`${preview}\`\n` +
    `🔍 *Header text*: \`${text}\`\n\n` +
    '💡 Kirim screenshot isi file ini ke developer untuk analisis.'
  );
}

// ══════════════════════════════════════════════════════
//  DOWNLOAD HELPER
// ══════════════════════════════════════════════════════

async function downloadDoc(sock, fullMsg, docMsg) {
  const wrappedMsg = { key: fullMsg.key, message: { documentMessage: docMsg } };
  if (typeof downloadMediaMessage === 'function')
    return downloadMediaMessage(wrappedMsg, 'buffer', {},
      { logger: console, reuploadRequest: sock.updateMediaMessage });
  const stream = await downloadContentFromMessage(docMsg, 'document');
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function getFileBuffer(sock, msg) {
  let docMsg = null;

  if (msg?.message?.documentMessage)
    docMsg = msg.message.documentMessage;

  if (!docMsg) {
    const ctx = msg?.message?.extendedTextMessage?.contextInfo
             || msg?.message?.documentMessage?.contextInfo;
    if (ctx?.quotedMessage?.documentMessage)
      docMsg = ctx.quotedMessage.documentMessage;
  }

  if (!docMsg) return null;

  try {
    const buffer = await downloadDoc(sock, msg, docMsg);
    if (!buffer || buffer.length < 4)
      throw new Error('Buffer terlalu kecil setelah download');
    return { buffer, fileName: docMsg.fileName || 'file' };
  } catch (err) {
    return { error: `❌ Gagal download: ${err.message}` };
  }
}

// ══════════════════════════════════════════════════════
//  EXPORT PLUGIN
// ══════════════════════════════════════════════════════

module.exports = {
  name   : '.dehc',
  command: ['.dehc'],

  execute: async (sock, sender, args, msg) => {
    await sock.sendMessage(sender, { text: '🔓 Membaca file .hc...' }, { quoted: msg });

    try {
      const file = await getFileBuffer(sock, msg);

      if (!file) {
        return sock.sendMessage(sender, {
          text:
            '❌ File tidak ditemukan.\n\n' +
            '*Cara pakai:*\n' +
            '① Kirim file *.hc* dengan caption *.dehc*\n' +
            '② Atau reply/quote file → ketik *.dehc*'
        }, { quoted: msg });
      }

      if (file.error)
        return sock.sendMessage(sender, { text: file.error }, { quoted: msg });

      const result = parseHc(file.buffer);
      return sock.sendMessage(sender, { text: result }, { quoted: msg });

    } catch (err) {
      console.error('[dehc]', err);
      return sock.sendMessage(sender, {
        text: `❌ Gagal decrypt:\n${err.message}`
      }, { quoted: msg });
    }
  }
};