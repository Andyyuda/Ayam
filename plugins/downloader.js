const fetch  = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
const ytdl   = require('@distube/ytdl-core');

// ─────────────────────────────────────────────────────────────────────────────
// 🔧 Utility
// ─────────────────────────────────────────────────────────────────────────────
function detectPlatform(url) {
  if (/youtube\.com|youtu\.be/.test(url)) return 'youtube';
  if (/tiktok\.com/.test(url))            return 'tiktok';
  if (/instagram\.com/.test(url))         return 'instagram';
  return null;
}

function extractUrl(text) {
  const match = text.match(/https?:\/\/[^\s]+/);
  return match ? match[0] : null;
}

function formatAngka(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function formatDurasi(detik) {
  const m = Math.floor(detik / 60);
  const s = detik % 60;
  return m + ':' + String(s).padStart(2, '0');
}

// ─────────────────────────────────────────────────────────────────────────────
// 📥 YouTube — @distube/ytdl-core (langsung, tanpa API pihak ketiga)
// ─────────────────────────────────────────────────────────────────────────────
async function downloadYouTube(url, mode = 'video') {
  if (!ytdl.validateURL(url)) throw new Error('URL YouTube tidak valid');

  const info    = await ytdl.getInfo(url);
  const title   = info.videoDetails.title;
  const durasi  = parseInt(info.videoDetails.lengthSeconds || 0);
  const channel = info.videoDetails.author?.name || '-';
  const views   = parseInt(info.videoDetails.viewCount || 0);

  if (mode === 'audio') {
    const format = ytdl.chooseFormat(info.formats, {
      quality: 'highestaudio',
      filter : 'audioonly'
    });
    return new Promise((resolve, reject) => {
      const chunks = [];
      const stream = ytdl.downloadFromInfo(info, { format });
      stream.on('data',  c => chunks.push(c));
      stream.on('end',   () => resolve({ buffer: Buffer.concat(chunks), title, durasi, channel, ext: 'mp3' }));
      stream.on('error', e => reject(e));
    });
  }

  // Mode video — cari format yang ada video+audio, 720p → 480p → 360p
  let format = null;
  for (const q of ['720', '480', '360', '240']) {
    try {
      format = ytdl.chooseFormat(info.formats, {
        filter: f => f.hasVideo && f.hasAudio && (f.qualityLabel || '').startsWith(q)
      });
      if (format) break;
    } catch (_) {}
  }
  if (!format) {
    format = ytdl.chooseFormat(info.formats, { filter: 'videoandaudio' });
  }

  const quality = format?.qualityLabel || '?';

  return new Promise((resolve, reject) => {
    const chunks = [];
    const stream = ytdl.downloadFromInfo(info, { format });
    stream.on('data',  c => chunks.push(c));
    stream.on('end',   () => resolve({ buffer: Buffer.concat(chunks), title, quality, durasi, channel, views, ext: 'mp4' }));
    stream.on('error', e => reject(e));
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 📥 TikTok — tikwm.com (tanpa watermark)
// ─────────────────────────────────────────────────────────────────────────────
async function downloadTikTok(url) {
  const res = await fetch('https://www.tikwm.com/api/', {
    method : 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body   : 'url=' + encodeURIComponent(url) + '&hd=1',
    timeout: 20000
  });
  if (!res.ok) throw new Error('TikWM error: ' + res.status);
  const data = await res.json();
  if (data.code !== 0) throw new Error(data.msg || 'Gagal ambil data TikTok');
  const d = data.data;
  return {
    title      : d.title || 'TikTok Video',
    author     : d.author?.nickname || '-',
    downloadUrl: d.hdplay || d.play,
    duration   : d.duration || 0,
    likes      : d.digg_count || 0,
    views      : d.play_count || 0
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 📥 Instagram — cobalt.tools
// ─────────────────────────────────────────────────────────────────────────────
async function downloadInstagram(url) {
  const res = await fetch('https://api.cobalt.tools/', {
    method : 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body   : JSON.stringify({ url, downloadMode: 'auto' }),
    timeout: 20000
  });
  if (!res.ok) throw new Error('Cobalt error: ' + res.status);
  const data = await res.json();
  if (data.status === 'error') throw new Error(data.error?.code || 'Gagal');
  if (!data.url) throw new Error('URL tidak ditemukan');
  return { title: 'Instagram Video', downloadUrl: data.url };
}

// ─────────────────────────────────────────────────────────────────────────────
// 🔄 Download buffer dari URL (TikTok / IG)
// ─────────────────────────────────────────────────────────────────────────────
async function getBuffer(url) {
  const res = await fetch(url, {
    timeout: 120000,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36' }
  });
  if (!res.ok) throw new Error('Gagal download file: ' + res.status);
  const size = parseInt(res.headers.get('content-length') || '0');
  if (size > 64 * 1024 * 1024) throw new Error('File terlalu besar (>64MB) untuk WA');
  return res.buffer();
}

// ─────────────────────────────────────────────────────────────────────────────
// 📦 Export Plugin
// ─────────────────────────────────────────────────────────────────────────────
module.exports = {
  name   : '.dl',
  command: ['.dl', '.download', '.yt', '.ytmp3', '.ytmp4', '.tt', '.tiktok', '.ig'],

  async execute(sock, sender, args, msg, text) {
    const cmd     = text.trim().split(' ')[0].toLowerCase();
    const rawArgs = args.join(' ').trim();

    // Ambil URL dari args atau pesan yang di-reply
    let url = extractUrl(rawArgs);
    if (!url && msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
      const q =
        msg.message.extendedTextMessage.contextInfo.quotedMessage?.conversation ||
        msg.message.extendedTextMessage.contextInfo.quotedMessage?.extendedTextMessage?.text || '';
      url = extractUrl(q);
    }

    if (!url) {
      return await sock.sendMessage(sender, {
        text:
          '📥 *DOWNLOADER*\n' +
          '━━━━━━━━━━━━━━━━━━━━\n\n' +
          '📋 *Cara pakai:*\n' +
          '• *.dl [url]* — auto detect platform\n' +
          '• *.yt [url]* — YouTube video (720p)\n' +
          '• *.ytmp3 [url]* — YouTube audio MP3\n' +
          '• *.tt [url]* — TikTok tanpa watermark\n' +
          '• *.ig [url]* — Instagram Reels/Post\n\n' +
          '💡 Bisa juga reply pesan yang berisi link!'
      }, { quoted: msg });
    }

    let platform = detectPlatform(url);
    let mode     = 'video';

    if (cmd === '.ytmp3')                   { platform = 'youtube'; mode = 'audio'; }
    if (cmd === '.ytmp4' || cmd === '.yt')  { platform = 'youtube'; }
    if (cmd === '.tt' || cmd === '.tiktok') { platform = 'tiktok'; }
    if (cmd === '.ig')                      { platform = 'instagram'; }

    if (!platform) {
      return await sock.sendMessage(sender, {
        text: '❌ Link tidak dikenali. Pastikan URL dari YouTube, TikTok, atau Instagram.'
      }, { quoted: msg });
    }

    const loadingText = {
      youtube  : mode === 'audio' ? '🎵 Mengunduh audio YouTube (MP3)...' : '🎬 Mengunduh video YouTube (720p)...',
      tiktok   : '🎵 Mengunduh TikTok tanpa watermark...',
      instagram: '📸 Mengunduh video Instagram...'
    }[platform];

    await sock.sendMessage(sender, { text: loadingText }, { quoted: msg });

    try {
      // ── YouTube ─────────────────────────────────────────────────────────────
      if (platform === 'youtube') {
        const info = await downloadYouTube(url, mode);

        if (info.buffer.length > 64 * 1024 * 1024) {
          throw new Error('Video terlalu besar (>64MB) untuk dikirim via WhatsApp');
        }

        if (mode === 'audio') {
          await sock.sendMessage(sender, {
            audio   : info.buffer,
            mimetype: 'audio/mpeg',
            fileName: info.title + '.mp3',
            ptt     : false
          }, { quoted: msg });
        } else {
          await sock.sendMessage(sender, {
            video  : info.buffer,
            caption:
              '🎬 *' + info.title + '*\n' +
              '👤 ' + info.channel + '\n' +
              '📺 Kualitas: ' + info.quality + '\n' +
              '⏱️ ' + formatDurasi(info.durasi) + '\n' +
              '👁️ ' + formatAngka(info.views) + ' views'
          }, { quoted: msg });
        }
        return;
      }

      // ── TikTok ──────────────────────────────────────────────────────────────
      if (platform === 'tiktok') {
        const info   = await downloadTikTok(url);
        const buffer = await getBuffer(info.downloadUrl);
        await sock.sendMessage(sender, {
          video  : buffer,
          caption:
            '🎵 *' + info.title + '*\n' +
            '👤 ' + info.author + '\n' +
            '❤️ ' + formatAngka(info.likes) + '  👁️ ' + formatAngka(info.views) + '\n' +
            '⏱️ ' + formatDurasi(info.duration) + '\n\n' +
            '✅ Tanpa watermark'
        }, { quoted: msg });
        return;
      }

      // ── Instagram ────────────────────────────────────────────────────────────
      if (platform === 'instagram') {
        const info   = await downloadInstagram(url);
        const buffer = await getBuffer(info.downloadUrl);
        await sock.sendMessage(sender, {
          video  : buffer,
          caption: '📸 *' + info.title + '*'
        }, { quoted: msg });
        return;
      }

    } catch (err) {
      await sock.sendMessage(sender, {
        text:
          '❌ *Gagal download!*\n\n' +
          '📋 Alasan: ' + err.message + '\n\n' +
          '💡 *Tips:*\n' +
          '• Pastikan video tidak private\n' +
          '• Untuk YT, coba link youtu.be/xxx\n' +
          '• Coba lagi beberapa saat'
      }, { quoted: msg });
    }
  }
};
