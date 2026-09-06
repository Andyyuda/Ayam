/**
 * .dompul2 <nomor> — Cek paket & kuota XL/AXIS 
 * Contoh: .dompul2 087812345678
 * Source: panel.zidstore.net/cek-kuota
 */

const API_BASE   = 'https://apigw.kmsp-store.com/sidompul/v4/cek_kuota';
const API_AUTH   = 'Basic c2lkb21wdWxhcGk6YXBpZ3drbXNw';
const API_KEY    = '60ef29aa-a648-4668-90ae-20951ef90c55';
const API_VER    = '4.0.0';

const CACHE_TTL  = 30 * 60 * 1000; // cache 30 menit
const cache      = new Map(); // nomor → { teks, time }

function fmtSisa(ms) {
  const jam = Math.floor(ms / 3600000);
  const mnt = Math.floor((ms % 3600000) / 60000);
  return jam > 0 ? `${jam} jam ${mnt} menit` : `${mnt} menit`;
}

// Hapus tag HTML dan decode entity HTML dasar
function stripHtml(html) {
  return (html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(b|strong)>/gi, '*')
    .replace(/<\/?(i|em)>/gi, '_')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

module.exports = {
  name: '.dompul2',
  command: ['.dompul2', '.cekpaket2', '.sidompul2'],

  async execute(conn, sender, args, msg) {
    const reply = (text) => conn.sendMessage(sender, { text }, { quoted: msg });

    if (!args[0]) {
      return reply(
        '📲 *CEK PAKET XL / AXIS (v2)*\n\n' +
        'Masukkan nomor setelah perintah.\n' +
        'Contoh:\n' +
        '*.dompul2 087812345678*\n' +
        '*.dompul2 62878xxxx*'
      );
    }

    // Normalisasi nomor
    let nomor = args[0].replace(/[\s\-]/g, '');
    if (nomor.startsWith('0')) nomor = '62' + nomor.slice(1);

    // Cek cache
    const cached = cache.get(nomor);
    if (cached) {
      const sisaTTL = CACHE_TTL - (Date.now() - cached.time);
      if (sisaTTL > 0) {
        return reply(
          cached.teks +
          `\n_📦 Data cache · diperbarui ${fmtSisa(Date.now() - cached.time)} lalu_\n` +
          `_🔄 Refresh dalam ${fmtSisa(sisaTTL)}_`
        );
      }
      cache.delete(nomor);
    }

    await reply(`🔍 Mengecek nomor *${nomor}*...\nHarap tunggu sebentar.`);

    try {
      const url = `${API_BASE}?msisdn=${encodeURIComponent(nomor)}&isJSON=true`;
      const res  = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization':  API_AUTH,
          'X-API-Key':      API_KEY,
          'X-App-Version':  API_VER,
        }
      });

      // Baca sebagai teks dulu, cegah crash jika bukan JSON
      const raw = await res.text();
      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        return reply(`❌ Respon tidak valid dari server.\nStatus: ${res.status}`);
      }

      if (data.status === false) {
        const errMsg = data.data?.keteranganError || data.message || 'Gagal mengecek paket.';
        return reply(`❌ ${errMsg}`);
      }

      if (data.status !== true) {
        return reply(`❌ ${data.message || 'Gagal mengecek paket, coba lagi nanti.'}`);
      }

      // data.data.hasil berisi hasil dalam format HTML → strip ke teks
      const hasilHtml = data.data?.hasil || '';
      const teks = stripHtml(hasilHtml) || '(Tidak ada data kuota)';

      cache.set(nomor, { teks, time: Date.now() });
      await reply(teks);

    } catch (e) {
      await reply(`❌ Terjadi kesalahan:\n${e.message}`);
    }
  }
};