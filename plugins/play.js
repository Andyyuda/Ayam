/**
 * .play — Cari dan kirim audio dari YouTube via y2mate.gs (API fix v2)
 * Gunakan: .play <judul lagu>
 * Stop   : .stop
 */

const ytSearch = require('yt-search');

const ENDPOINT   = 'etacloud.org';
const Y2MATE_REF = 'y2mate.gs';
const HEADERS    = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
  'Accept'    : 'application/json, */*',
  'Referer'   : 'https://y2mate.gs/',
  'Origin'    : 'https://y2mate.gs'   // WAJIB — tanpa ini init endpoint return kosong
};

// Cache key auth (~4 menit, sig cepat expire)
let keyCache     = null;
let keyCacheTime = 0;

async function getAuthKey() {
  const now = Date.now();
  if (keyCache && now - keyCacheTime < 4 * 60 * 1000) return keyCache;

  const res  = await fetch(`https://eta.${ENDPOINT}/api/v1/auth?_=${now}`, { headers: HEADERS });
  const data = await res.json();

  // Auth pakai "err" bukan "error"
  if (data.err && data.err > 0) throw new Error(`Auth error: ${data.err}`);
  if (!data.key) throw new Error('Gagal ambil auth key');

  keyCache     = data.key;
  keyCacheTime = now;
  return data.key;
}

async function getConvertUrl(key) {
  const res  = await fetch(`https://eta.${ENDPOINT}/api/v1/init?_=${Date.now()}`, {
    headers: { ...HEADERS, 'Authorization': `Bearer ${key}` }
  });
  const text = await res.text();
  if (!text || text.trim() === '') throw new Error('Init endpoint return kosong (cek Origin header)');
  const data = JSON.parse(text);
  if (data.error && String(data.error) !== '0') throw new Error(`Init error: ${data.error}`);
  if (!data.convertURL) throw new Error('Gagal ambil convertURL');
  return data.convertURL;
}

/**
 * Strip &v= dan seterusnya dari URL (sesuai logika y2mate.gs JS)
 */
function stripVideoParams(url) {
  const idx = url.indexOf('&v=');
  return idx > -1 ? url.substring(0, idx) : url;
}

async function doConvert(url, videoId, format) {
  const cleanUrl = stripVideoParams(url);
  const fullUrl  = `${cleanUrl}&v=${videoId}&f=${format}&_=${Date.now()}`;
  const res      = await fetch(fullUrl, { headers: HEADERS });
  const text     = await res.text();
  if (!text || text.trim() === '') throw new Error('Convert endpoint return kosong');
  return JSON.parse(text);
}

async function getMp3Url(videoId, isCancelled) {
  // Selalu ambil key + convertURL baru tiap lagu (sig expire cepat)
  keyCache = null;
  const key        = await getAuthKey();
  const convertUrl = await getConvertUrl(key);

  // Convert round 1
  let data = await doConvert(convertUrl, videoId, 'mp3');

  // Ikuti redirect jika ada (round 2) — redirectURL sudah ada params, strip dulu
  if (data.redirect === 1 && data.redirectURL) {
    data = await doConvert(data.redirectURL, videoId, 'mp3');
  }

  if (data.error && data.error > 0) throw new Error(`Convert error code: ${data.error}`);

  // Langsung dapat downloadURL (cache hit di server)
  if (data.downloadURL && !data.progressURL) {
    return `${stripVideoParams(data.downloadURL)}&v=${videoId}&f=mp3&r=${Y2MATE_REF}`;
  }

  const progressUrl = data.progressURL;
  if (!progressUrl) throw new Error('Tidak ada progressURL dari server');
  let downloadUrl   = data.downloadURL || null;

  // Poll progress setiap 3 detik sampai progress === 3
  const MAX_POLL = 40; // ~2 menit
  for (let i = 0; i < MAX_POLL; i++) {
    if (isCancelled()) throw new Error('CANCELLED');
    await new Promise(r => setTimeout(r, 3000));

    const pRes  = await fetch(`${progressUrl}&_=${Date.now()}`, { headers: HEADERS });
    const pText = await pRes.text();
    if (!pText || pText.trim() === '') continue; // skip kalau kosong, coba lagi
    const pData = JSON.parse(pText);

    if (pData.error && pData.error > 0) throw new Error(`Progress error: ${pData.error}`);
    if (pData.downloadURL) downloadUrl = pData.downloadURL;
    if (pData.progress === 3 && downloadUrl) {
      return `${stripVideoParams(downloadUrl)}&v=${videoId}&f=mp3&r=${Y2MATE_REF}`;
    }
  }

  throw new Error('Timeout konversi setelah 2 menit.');
}

// ── Track download aktif per sender ──────────────────────────────────────────
const activeDownloads = {};
function getActiveDownloads() { return activeDownloads; }

function extractVideoId(url) {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|live\/|shorts\/)|[?&]v=)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

module.exports = {
  name: '.play',
  command: ['.play'],
  getActiveDownloads,

  execute: async (sock, sender, args, msg) => {
    const query = args.join(' ').trim();

    if (!query) {
      return sock.sendMessage(sender, {
        text: '🎵 Cara pakai: *.play <judul lagu>*\nContoh: .play dewa 19 kangen'
      }, { quoted: msg });
    }

    if (activeDownloads[sender]) {
      return sock.sendMessage(sender, {
        text: '⏳ Masih ada download aktif. Ketik *.stop* untuk membatalkan.'
      }, { quoted: msg });
    }

    await sock.sendMessage(sender, { text: `🔍 Mencari: *${query}*...` }, { quoted: msg });

    let cancelled = false;
    activeDownloads[sender] = { cancel: () => { cancelled = true; } };

    try {
      const result = await ytSearch(query);
      const video  = result.videos?.[0];

      if (!video) {
        delete activeDownloads[sender];
        return sock.sendMessage(sender, { text: '❌ Video tidak ditemukan.' }, { quoted: msg });
      }

      if (video.seconds > 600) {
        delete activeDownloads[sender];
        return sock.sendMessage(sender, {
          text: `❌ Video terlalu panjang (*${video.timestamp}*). Maksimal 10 menit.`
        }, { quoted: msg });
      }

      const videoId = extractVideoId(video.url);
      if (!videoId) {
        delete activeDownloads[sender];
        return sock.sendMessage(sender, { text: '❌ Gagal ekstrak ID video.' }, { quoted: msg });
      }

      await sock.sendMessage(sender, {
        text:
          `🎵 *${video.title}*\n` +
          `👤 ${video.author.name}\n` +
          `⏱️ ${video.timestamp}\n\n` +
          `⬇️ Mengonversi audio, harap tunggu...`
      }, { quoted: msg });

      const mp3Url = await getMp3Url(videoId, () => cancelled);
      if (cancelled) { delete activeDownloads[sender]; return; }

      await sock.sendMessage(sender, { text: `📥 Mengunduh MP3...` }, { quoted: msg });

      const mp3Res = await fetch(mp3Url, { headers: { 'Referer': 'https://y2mate.gs/' } });
      if (!mp3Res.ok) throw new Error(`HTTP ${mp3Res.status} saat download MP3`);

      const audioBuffer = Buffer.from(await mp3Res.arrayBuffer());
      if (cancelled) { delete activeDownloads[sender]; return; }
      delete activeDownloads[sender];

      const safeTitle = video.title.replace(/[^\w\s]/gi, '').trim() || 'audio';
      await sock.sendMessage(sender, {
        audio    : audioBuffer,
        mimetype : 'audio/mpeg',
        fileName : `${safeTitle}.mp3`
      }, { quoted: msg });

    } catch (err) {
      delete activeDownloads[sender];
      if (err.message === 'CANCELLED') return;
      console.error('[play] Error:', err.message);
      await sock.sendMessage(sender, {
        text: `❌ Gagal unduh audio:\n${err.message}\n\nCoba judul lain atau beberapa saat lagi.`
      }, { quoted: msg });
    }
  }
};