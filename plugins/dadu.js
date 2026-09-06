/**
 * .dadu [jumlah] — Lempar dadu 1-6 (bisa sampai 6 dadu sekaligus)
 * .koin — Lempar koin (heads/tails)
 */

module.exports = {
  name: '.dadu',
  command: ['.dadu', '.dice', '.koin', '.coin', '.flip'],

  async execute(conn, sender, args, msg) {
    const cmd = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || '').split(' ')[0].toLowerCase();

    // KOIN
    if (cmd === '.koin' || cmd === '.coin' || cmd === '.flip') {
      const hasil = Math.random() < 0.5 ? 'HEADS' : 'TAILS';
      const emoji  = hasil === 'HEADS' ? '🪙 (Kepala)' : '🪙 (Ekor)';
      return conn.sendMessage(sender, {
        text: `🪙 *LEMPAR KOIN*\n\n${emoji}\n*${hasil}!*`
      }, { quoted: msg });
    }

    // DADU
    const jumlah = Math.min(6, Math.max(1, parseInt(args[0]) || 1));
    const hasil  = [];
    let total    = 0;
    const EMOJI_DADU = ['', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣'];

    for (let i = 0; i < jumlah; i++) {
      const nilai = Math.floor(Math.random() * 6) + 1;
      hasil.push(nilai);
      total += nilai;
    }

    const daduStr = hasil.map(n => EMOJI_DADU[n]).join(' ');
    const totStr  = jumlah > 1 ? `\n\n📊 Total: *${total}*` : '';
    const label   = jumlah > 1 ? `${jumlah} Dadu` : '1 Dadu';

    await conn.sendMessage(sender, {
      text: `🎲 *LEMPAR ${label.toUpperCase()}*\n\n${daduStr}${totStr}\n\nAngka: *${hasil.join(', ')}*`
    }, { quoted: msg });
  }
};
