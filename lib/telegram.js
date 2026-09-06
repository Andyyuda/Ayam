/**
 * Helper Telegram untuk interaksi login bot via Telegram
 * Mendukung: kirim pesan teks, kirim foto (QR), tunggu balasan user
 */

const fs = require('fs');
const path = require('path');

let config = null;
try {
  const raw = fs.readFileSync(path.join(__dirname, '../.telegram.json'), 'utf8');
  const parsed = JSON.parse(raw);
  if (parsed.token && parsed.chatId) config = parsed;
} catch (e) {}

const BASE = config ? `https://api.telegram.org/bot${config.token}` : null;
let lastUpdateId = -1; // -1 = belum diinisialisasi

async function apiPost(method, body) {
  if (!BASE) return null;
  const res = await fetch(`${BASE}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json();
}

/**
 * Kirim pesan teks ke chat owner
 */
async function sendMessage(text) {
  return apiPost('sendMessage', {
    chat_id: config.chatId,
    text,
    parse_mode: 'HTML'
  });
}

/**
 * Kirim gambar (Buffer PNG) ke chat owner
 * Menggunakan multipart/form-data manual — tidak bergantung pada FormData/Blob
 */
async function sendPhoto(imageBuffer, caption = '') {
  if (!BASE) return null;

  const boundary = 'BotWA' + Date.now().toString(16);
  const CRLF = '\r\n';

  // Helper: buat bagian field teks
  const textPart = (name, value) =>
    `--${boundary}${CRLF}` +
    `Content-Disposition: form-data; name="${name}"${CRLF}${CRLF}` +
    `${value}${CRLF}`;

  // Bagian teks
  let textBody = textPart('chat_id', config.chatId.toString());
  if (caption) {
    textBody += textPart('caption', caption);
    textBody += textPart('parse_mode', 'HTML');
  }

  // Bagian file (binary)
  const fileHeader = Buffer.from(
    `--${boundary}${CRLF}` +
    `Content-Disposition: form-data; name="photo"; filename="qr.png"${CRLF}` +
    `Content-Type: image/png${CRLF}${CRLF}`
  );
  const fileFooter = Buffer.from(`${CRLF}--${boundary}--${CRLF}`);

  const body = Buffer.concat([
    Buffer.from(textBody),
    fileHeader,
    Buffer.isBuffer(imageBuffer) ? imageBuffer : Buffer.from(imageBuffer),
    fileFooter
  ]);

  const res = await fetch(`${BASE}/sendPhoto`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body
  });
  return res.json();
}

/**
 * Bersihkan semua update lama — panggil sebelum waitReply agar
 * pesan lama tidak terbaca sebagai balasan baru.
 */
async function flushUpdates() {
  if (!BASE) return;
  try {
    const res = await fetch(`${BASE}/getUpdates?offset=-1&timeout=0`);
    const data = await res.json();
    const results = data.result || [];
    if (results.length > 0) {
      lastUpdateId = results[results.length - 1].update_id;
    } else {
      lastUpdateId = 0;
    }
  } catch (e) {
    lastUpdateId = 0;
  }
}

/**
 * Tunggu balasan teks dari owner via long polling
 * @param {number} timeoutMs - batas waktu tunggu (ms)
 * @returns {string|null} teks balasan atau null jika timeout
 */
async function waitReply(timeoutMs = 120000) {
  if (!BASE) return null;

  // Inisialisasi: buang semua pesan lama sebelum mulai menunggu
  if (lastUpdateId === -1) await flushUpdates();

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const sisa = Math.min(30, Math.ceil((deadline - Date.now()) / 1000));
    if (sisa <= 0) break;
    try {
      const res = await fetch(
        `${BASE}/getUpdates?offset=${lastUpdateId + 1}&timeout=${sisa}&allowed_updates=message`
      );
      const data = await res.json();
      for (const update of data.result || []) {
        lastUpdateId = update.update_id;
        if (String(update.message?.chat?.id) === String(config.chatId)) {
          return update.message.text?.trim() || null;
        }
      }
    } catch (e) {}
  }
  return null;
}

module.exports = {
  isConfigured: !!BASE,
  sendMessage,
  sendPhoto,
  waitReply
};
