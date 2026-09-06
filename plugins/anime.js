const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

  // ─────────────────────────────────────────────────────────────────────────────
  // 🎨 Kategori dari waifu.pics (gratis, tanpa API key)
  // ─────────────────────────────────────────────────────────────────────────────
  const KATEGORI = {
    // 🖼️ Gambar
    waifu   : { label: 'Waifu',    emoji: '👧' },
    neko    : { label: 'Neko',     emoji: '🐱' },
    shinobu : { label: 'Shinobu',  emoji: '🦋' },
    megumin : { label: 'Megumin',  emoji: '💥' },
    // 🎭 Aksi
    hug     : { label: 'Peluk',    emoji: '🤗' },
    pat     : { label: 'Usap',     emoji: '🤚' },
    kiss    : { label: 'Cium',     emoji: '💋' },
    cuddle  : { label: 'Peluk',    emoji: '🫂' },
    wave    : { label: 'Lambaian', emoji: '👋' },
    smile   : { label: 'Senyum',   emoji: '😊' },
    blush   : { label: 'Blushing', emoji: '😳' },
    dance   : { label: 'Dance',    emoji: '💃' },
    cry     : { label: 'Nangis',   emoji: '😢' },
    bonk    : { label: 'Bonk',     emoji: '🔨' },
    slap    : { label: 'Tampar',   emoji: '👋' },
    poke    : { label: 'Colok',    emoji: '👉' },
    bite    : { label: 'Gigit',    emoji: '😬' },
    nom     : { label: 'Nom',      emoji: '😋' },
  };

  const LIST_KATEGORI = Object.keys(KATEGORI);

  async function fetchAnime(kategori) {
    const res = await fetch('https://api.waifu.pics/sfw/' + kategori, { timeout: 10000 });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    return json.url;
  }

  async function fetchImageBuffer(url) {
    const res = await fetch(url, { timeout: 15000 });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const buf = await res.buffer();
    return buf;
  }

  function menuTeks() {
    const baris = LIST_KATEGORI.map(k => {
      const info = KATEGORI[k];
      return '  ' + info.emoji + ' *.anime ' + k + '*' + ' — ' + info.label;
    });
    return (
      '🎌 *RANDOM ANIME IMAGE*\n' +
      '━━━━━━━━━━━━━━━━━━━━\n\n' +
      '📋 *Daftar Kategori:*\n' +
      baris.join('\n') +
      '\n\n💡 Contoh: *.anime neko*\n' +
      '🎲 Tanpa kategori = random acak'
    );
  }

  module.exports = {
    name   : '.anime',
    command: ['.anime', '.waifu', '.neko'],

    async execute(sock, sender, args, msg, text) {
      const cmd = (text.trim().split(' ')[0] || '').toLowerCase();

      // Shortcut command langsung ke kategori
      let kategori = args[0]?.toLowerCase();
      if (cmd === '.neko')  kategori = 'neko';
      if (cmd === '.waifu') kategori = 'waifu';

      // Tanpa argumen → tampil menu atau random
      if (!kategori) {
        // Jika ketik hanya .anime → random acak
        kategori = LIST_KATEGORI[Math.floor(Math.random() * LIST_KATEGORI.length)];
      }

      // Kategori tidak valid → tampil menu
      if (!KATEGORI[kategori]) {
        return await sock.sendMessage(sender, {
          text: menuTeks() + '\n\n❌ Kategori *' + args[0] + '* tidak ditemukan.'
        }, { quoted: msg });
      }

      const info = KATEGORI[kategori];

      // Kirim loading
      await sock.sendMessage(sender, {
        text: info.emoji + ' Mengambil gambar *' + info.label + '*...'
      }, { quoted: msg });

      try {
        const imgUrl = await fetchAnime(kategori);
        const imgBuf = await fetchImageBuffer(imgUrl);

        await sock.sendMessage(sender, {
          image  : imgBuf,
          caption:
            info.emoji + ' *' + info.label + '*\n' +
            '📂 Kategori: ' + kategori + '\n' +
            '🔗 Source: waifu.pics\n\n' +
            '🎲 Ketik *.anime ' + kategori + '* untuk gambar lain\n' +
            '📋 Ketik *.anime* untuk daftar kategori'
        }, { quoted: msg });
      } catch (err) {
        await sock.sendMessage(sender, {
          text: '❌ Gagal mengambil gambar: ' + err.message + '\nCoba lagi beberapa saat.'
        }, { quoted: msg });
      }
    }
  };
  