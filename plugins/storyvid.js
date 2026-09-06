/**
 * .storyvid <topik> — Generate video cerita pendek dengan AI + suara narasi
 *
 * Deps: axios, fluent-ffmpeg, ffmpeg-static, sharp
 * Install: npm install axios fluent-ffmpeg ffmpeg-static sharp
 *
 * Gambar : Pollinations.ai  (gratis, tanpa API key)
 * Cerita : Groq API         (gratis di console.groq.com)
 * Suara  : Google Translate TTS (gratis, tanpa API key)
 */

const fs        = require('fs');
const path      = require('path');
const os        = require('os');
const axios     = require('axios');
const ffmpeg    = require('fluent-ffmpeg');
const ffmpegBin = require('ffmpeg-static');
const sharp     = require('sharp');

ffmpeg.setFfmpegPath(ffmpegBin);

// ─── KONFIGURASI ─────────────────────────────────────────────
const GROQ_API_KEY  = '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'; // console.groq.com
const SCENE_PADDING = 2.0;  // detik hening setelah suara selesai
const IMG_WIDTH     = 720;
const IMG_HEIGHT    = 1280;
// ─────────────────────────────────────────────────────────────

// ── 1. Generate cerita via Groq ───────────────────────────────
async function generateStory(topik) {
  const prompt = `Buat cerita pendek menarik bertema "${topik}" dalam Bahasa Indonesia.

Kamu bebas menentukan sendiri berapa scene yang paling cocok untuk cerita ini.
Buat cerita senatural dan seindah mungkin, tidak terpotong, punya pembuka, konflik, dan penutup yang memuaskan.

Balas HANYA JSON valid ini tanpa teks lain:
{
  "judul": "judul cerita",
  "scenes": [
    {
      "narasi": "teks narasi yang akan dibacakan, natural dan enak didengar",
      "gambar_prompt": "visual description in English, cinematic, detailed"
    }
  ]
}`;

  const res = await axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.9,
      max_tokens: 4096
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      timeout: 30000
    }
  );

  const raw = res.data?.choices?.[0]?.message?.content || '';
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Tidak ditemukan JSON dalam response');

  const story = JSON.parse(jsonMatch[0]);
  if (!story.scenes?.length) throw new Error('AI tidak menghasilkan scene');

  return story;
}

// ── 2. Download gambar via Pollinations ───────────────────────
async function downloadImage(prompt, filePath, retries = 3) {
  const encoded = encodeURIComponent(
    `${prompt}, cinematic, high quality, detailed, vertical portrait`
  );
  const url = `https://image.pollinations.ai/prompt/${encoded}?width=${IMG_WIDTH}&height=${IMG_HEIGHT}&seed=${Math.floor(Math.random() * 99999)}&nologo=true`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 90000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      fs.writeFileSync(filePath, res.data);
      return;
    } catch (e) {
      const status = e.response?.status;
      if ((status === 429 || status === 503) && attempt < retries) {
        await new Promise(r => setTimeout(r, attempt * 5000));
      } else {
        throw new Error(`[Gambar] Status ${status}: ${e.message}`);
      }
    }
  }
}

// ── 3. Generate TTS via Google Translate ─────────────────────
async function generateTTS(text, filePath, retries = 3) {
  const MAX_CHARS = 180;
  const sentences = text.match(/[^.!?,]+[.!?,]*/g) || [text];

  const chunks = [];
  let current  = '';
  for (const s of sentences) {
    if ((current + s).length <= MAX_CHARS) {
      current += s;
    } else {
      if (current.trim()) chunks.push(current.trim());
      current = s;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  const tmpFiles = [];

  for (let c = 0; c < chunks.length; c++) {
    const encoded = encodeURIComponent(chunks[c]);
    const url     = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=id&client=tw-ob`;
    const tmpFile = `${filePath}.chunk${c}.mp3`;
    tmpFiles.push(tmpFile);

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await axios.get(url, {
          responseType: 'arraybuffer',
          timeout: 30000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://translate.google.com/'
          }
        });
        fs.writeFileSync(tmpFile, res.data);
        break;
      } catch (e) {
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, attempt * 2000));
        } else {
          throw new Error(`[TTS] Status ${e.response?.status}: ${e.message}`);
        }
      }
    }
  }

  if (tmpFiles.length === 1) {
    fs.copyFileSync(tmpFiles[0], filePath);
    fs.unlinkSync(tmpFiles[0]);
    return;
  }

  await new Promise((resolve, reject) => {
    let cmd = ffmpeg();
    tmpFiles.forEach(f => cmd = cmd.input(f));
    cmd
      .complexFilter([
        `${tmpFiles.map((_, i) => `[${i}:a]`).join('')}concat=n=${tmpFiles.length}:v=0:a=1[outa]`
      ])
      .outputOptions(['-map [outa]', '-c:a libmp3lame', '-q:a 4'])
      .output(filePath)
      .on('end', () => {
        tmpFiles.forEach(f => { try { fs.unlinkSync(f); } catch {} });
        resolve();
      })
      .on('error', (e) => {
        tmpFiles.forEach(f => { try { fs.unlinkSync(f); } catch {} });
        reject(new Error(`[TTS Merge] ${e.message}`));
      })
      .run();
  });
}

// ── 4. Ukur durasi audio via ffprobe ─────────────────────────
function getAudioDuration(filePath) {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err || !metadata?.format?.duration) {
        resolve(6);
      } else {
        resolve(parseFloat(metadata.format.duration));
      }
    });
  });
}

// ── 5. Burn teks narasi ke gambar via sharp ───────────────────
async function burnTextToImage(imgPath, narasi, outPath) {
  const img  = sharp(imgPath);
  const meta = await img.metadata();
  const w    = meta.width  || IMG_WIDTH;
  const h    = meta.height || IMG_HEIGHT;

  const maxChars = 36;
  const words    = narasi.split(' ');
  const lines    = [];
  let current    = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length <= maxChars) {
      current = (current + ' ' + word).trim();
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);

  const lineHeight = 38;
  const fontSize   = 30;
  const boxH       = lines.length * lineHeight + 40;
  const boxY       = h - boxH - 20;

  const escXml = (s) => s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const tspans = lines.map((line, i) =>
    `<tspan x="${w / 2}" dy="${i === 0 ? 0 : lineHeight}">${escXml(line)}</tspan>`
  ).join('');

  const svg = `
<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="${boxY - 10}" width="${w}" height="${boxH + 20}" fill="rgba(0,0,0,0.6)"/>
  <text
    x="${w / 2}"
    y="${boxY + fontSize}"
    font-family="Arial, sans-serif"
    font-size="${fontSize}"
    fill="white"
    text-anchor="middle"
  >${tspans}</text>
</svg>`;

  await sharp(imgPath)
    .resize(w, h, { fit: 'cover' })
    .composite([{ input: Buffer.from(svg), blend: 'over' }])
    .jpeg({ quality: 90 })
    .toFile(outPath);
}

// ── 6. Buat clip per scene (gambar + audio disatukan) ─────────
function buildClip(imgPath, audioPath, clipPath) {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(imgPath)
      .inputOptions(['-loop 1'])
      .input(audioPath)
      .complexFilter([
        // Scale gambar
        `[0:v]scale=${IMG_WIDTH}:${IMG_HEIGHT}:force_original_aspect_ratio=decrease,` +
        `pad=${IMG_WIDTH}:${IMG_HEIGHT}:(ow-iw)/2:(oh-ih)/2:black[v]`,
        // Tambah silence di akhir audio = padding sebelum scene berikutnya
        `[1:a]apad=pad_dur=${SCENE_PADDING}[a]`
      ])
      .outputOptions([
        '-map [v]',
        '-map [a]',
        '-c:v libx264',
        '-preset fast',
        '-crf 23',
        '-pix_fmt yuv420p',
        '-c:a aac',
        '-b:a 128k',
        '-shortest',  // video berhenti saat audio (+ padding) selesai
      ])
      .output(clipPath)
      .on('end', resolve)
      .on('error', (e) => reject(new Error(`[Clip] ${e.message}`)))
      .run();
  });
}

// ── 7. Concat semua clip jadi 1 video final ───────────────────
function concatClips(clipPaths, outputPath) {
  return new Promise((resolve, reject) => {
    const listFile = outputPath + '.list.txt';
    fs.writeFileSync(listFile, clipPaths.map(p => `file '${p}'`).join('\n'));

    ffmpeg()
      .input(listFile)
      .inputOptions(['-f concat', '-safe 0'])
      .outputOptions(['-c copy'])
      .output(outputPath)
      .on('end', () => {
        clipPaths.forEach(p => { try { fs.unlinkSync(p); } catch {} });
        try { fs.unlinkSync(listFile); } catch {}
        resolve();
      })
      .on('error', (e) => reject(new Error(`[Concat] ${e.message}`)))
      .run();
  });
}

// ── Main ──────────────────────────────────────────────────────
module.exports = {
  name: '.storyvid',
  command: ['.storyvid', '.videostory', '.aiStory'],

  async execute(conn, sender, args, msg) {
    const reply = (text) => conn.sendMessage(sender, { text }, { quoted: msg });

    if (!args[0]) {
      return reply(
        '🎬 *GENERATE VIDEO CERITA AI*\n\n' +
        'Ketik topik cerita yang kamu inginkan.\n\n' +
        '*Contoh:*\n' +
        '.storyvid persahabatan yang mengharukan\n' +
        '.storyvid petualangan di hutan\n' +
        '.storyvid kisah cinta sedih\n\n' +
        '📊 Scene: bebas, ditentukan AI\n' +
        '⏱️ Durasi: otomatis mengikuti panjang narasi\n' +
        '🔊 Gambar berganti setelah suara selesai'
      );
    }

    const topik  = args.join(' ');
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'storyvid-'));

    await reply(
      `🎬 *Membuat video cerita: "${topik}"*\n\n` +
      `📝 Generate cerita...\n` +
      `🖼️ Generate gambar + 🔊 suara...\n` +
      `🎞️ Render video...\n\n` +
      `_Harap tunggu, durasi & jumlah scene ditentukan AI_`
    );

    try {
      // 1. Generate cerita
      let story;
      try {
        story = await generateStory(topik);
      } catch (e) {
        return reply(`❌ Gagal generate cerita:\n${e.response?.data?.error?.message || e.message}`);
      }

      const scenes    = story.scenes;
      const clipPaths = [];
      const durations = [];

      await reply(
        `✅ *Cerita siap!*\n` +
        `📊 Jumlah scene: *${scenes.length}*\n\n` +
        `⚙️ Generating gambar & suara...`
      );

      // 2. Tiap scene: gambar + TTS paralel → render clip
      for (let i = 0; i < scenes.length; i++) {
        await reply(`⚙️ *Scene ${i + 1}/${scenes.length}* — gambar & suara...`);

        const rawPath  = path.join(tmpDir, `raw_${i}.jpg`);
        const imgPath  = path.join(tmpDir, `scene_${i}.jpg`);
        const audioPath = path.join(tmpDir, `audio_${i}.mp3`);
        const clipPath  = path.join(tmpDir, `clip_${i}.mp4`);

        clipPaths.push(clipPath);

        // Download gambar & TTS secara paralel
        await Promise.all([
          downloadImage(scenes[i].gambar_prompt, rawPath),
          generateTTS(scenes[i].narasi, audioPath)
        ]);

        // Burn teks ke gambar
        await burnTextToImage(rawPath, scenes[i].narasi, imgPath);

        // Render clip (gambar + audio disatukan, -shortest menjamin sync)
        await buildClip(imgPath, audioPath, clipPath);

        // Ukur durasi clip untuk info caption
        const dur = await getAudioDuration(clipPath);
        durations.push(parseFloat(dur.toFixed(1)));

        if (i < scenes.length - 1) await new Promise(r => setTimeout(r, 1000));
      }

      const totalDurasi = durations.reduce((a, b) => a + b, 0).toFixed(1);
      await reply(
        `🎞️ *Menggabungkan ${scenes.length} scene...*\n` +
        `⏱️ Total durasi: *${totalDurasi} detik*`
      );

      // 3. Gabung semua clip jadi 1 video
      const videoPath = path.join(tmpDir, 'story.mp4');
      await concatClips(clipPaths, videoPath);

      // 4. Kirim video
      const videoBuffer = fs.readFileSync(videoPath);
      await conn.sendMessage(
        sender,
        {
          video: videoBuffer,
          caption:
            `🎬 *${story.judul}*\n\n` +
            scenes.map((s, i) =>
              `*Scene ${i + 1}* _(${durations[i]}s)_:\n${s.narasi}`
            ).join('\n\n') +
            `\n\n⏱️ Total: ${totalDurasi}s | 📊 ${scenes.length} scene\n` +
            `_Generated by AI ✨_`,
          gifPlayback: false,
        },
        { quoted: msg }
      );

    } catch (e) {
      await reply(`❌ Terjadi kesalahan:\n${e.message}`);
    } finally {
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    }
  }
};