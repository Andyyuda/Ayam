/**
 * .button — Demo semua jenis tombol interaktif WhatsApp
 *
 * Cara pakai:
 *   .button list     → list/dropdown (PALING kompatibel) ✅
 *   .button legacy   → tombol lama buttonsMessage
 *   .button copy     → interactiveMessage cta_copy
 *   .button url      → interactiveMessage cta_url
 *   .button reply    → interactiveMessage quick_reply
 */

const btn     = require('../lib/button');
const setting = require('../setting');
const { isOwner } = require('../lib/helper');

module.exports = {
  name: '.button',
  command: ['.button', '.btn'],

  async execute(sock, sender, args, msg) {
    const jid = msg.key.participant || msg.key.remoteJid;
    if (!isOwner(jid, setting.owner)) {
      return sock.sendMessage(sender, {
        text: '❌ Hanya *owner* yang bisa mengakses fitur ini.'
      }, { quoted: msg });
    }

    const sub = (args[0] || '').toLowerCase();

    // ── LIST (paling kompatibel) ──────────────────────────────────────────────
    if (!sub || sub === 'list') {
      return btn.sendList(sock, sender, {
        body    : '📋 *Demo List Interaktif*\nIni adalah list dropdown — paling kompatibel di semua WA personal.',
        footer  : 'AndyStore Bot',
        title   : '🤖 Pilih Demo',
        btnLabel: '🔽 Lihat Pilihan',
        sections: [
          {
            title: '🎛️ Demo Tombol',
            rows : [
              { title: '📋 Demo List',        rowId: '.button list',   description: 'List dropdown (ini)' },
              { title: '🔘 Demo Legacy',       rowId: '.button legacy', description: 'Tombol lama buttonsMessage' },
              { title: '📑 Demo Copy',         rowId: '.button copy',   description: 'Tombol salin teks' },
              { title: '🔗 Demo URL',          rowId: '.button url',    description: 'Tombol buka link' },
              { title: '⚡ Demo Quick Reply',  rowId: '.button reply',  description: 'Tombol balas cepat' },
            ]
          },
          {
            title: '📖 Info',
            rows : [
              { title: '❓ Tentang Tombol WA', rowId: '.button info',  description: 'Penjelasan jenis tombol' },
            ]
          }
        ]
      }, msg);
    }

    // ── LEGACY BUTTONS ────────────────────────────────────────────────────────
    if (sub === 'legacy') {
      return btn.sendLegacyButtons(sock, sender, {
        body   : '🔘 *Demo Legacy Buttons*\nTombol lama (buttonsMessage), maks 3 tombol.',
        footer : 'AndyStore Bot',
        buttons: [
          { id: '.ping',  label: '🏓 Ping Bot' },
          { id: '.menu',  label: '📜 Menu' },
          { id: '.myid',  label: '👤 ID Saya' },
        ]
      }, msg);
    }

    // ── INTERACTIVE: CTA COPY ─────────────────────────────────────────────────
    if (sub === 'copy') {
      return btn.sendButtons(sock, sender, {
        body   : '📋 *Demo CTA Copy*\nKlik tombol untuk menyalin teks.',
        footer : 'AndyStore Bot',
        buttons: [
          btn.ctaCopy('📋 Salin Prefix', setting.prefix ?? '.'),
          btn.ctaCopy('📋 Salin Perintah', '.menu'),
        ]
      }, msg);
    }

    // ── INTERACTIVE: CTA URL ──────────────────────────────────────────────────
    if (sub === 'url') {
      return btn.sendButtons(sock, sender, {
        body   : '🔗 *Demo CTA URL*\nKlik tombol untuk membuka link.',
        footer : 'AndyStore Bot',
        buttons: [
          btn.ctaUrl('🌐 GitHub Bot',  'https://github.com/Andyyuda/Bot'),
          btn.ctaUrl('💬 Chat Owner', `https://wa.me/628${setting.owner[0]}`),
        ]
      }, msg);
    }

    // ── INTERACTIVE: QUICK REPLY ──────────────────────────────────────────────
    if (sub === 'reply') {
      return btn.sendButtons(sock, sender, {
        body   : '⚡ *Demo Quick Reply*\nKlik tombol untuk mengirim perintah.',
        footer : 'AndyStore Bot',
        buttons: [
          btn.quickReply('📜 Buka Menu',  '.menu'),
          btn.quickReply('🏓 Ping',       '.ping'),
          btn.quickReply('👤 ID Saya',    '.myid'),
        ]
      }, msg);
    }

    // ── INFO ──────────────────────────────────────────────────────────────────
    if (sub === 'info') {
      return sock.sendMessage(sender, {
        text:
          '📖 *Jenis Tombol WhatsApp Bot*\n\n' +
          '✅ *List Message* (`.button list`)\n' +
          '   → Paling kompatibel, muncul sebagai\n' +
          '   dropdown di SEMUA versi WA personal.\n\n' +
          '⚠️ *Legacy Buttons* (`.button legacy`)\n' +
          '   → Tombol lama, bekerja di banyak\n' +
          '   versi tapi mungkin diblok WA baru.\n\n' +
          '🔒 *Interactive/NativeFlow* (`.button copy/url/reply`)\n' +
          '   → Tombol modern, hanya render di\n' +
          '   WA Business atau penerima tertentu.\n\n' +
          '💡 *Rekomendasi*: Pakai `.button list`\n' +
          '   untuk fitur bot yang butuh pilihan.'
      }, { quoted: msg });
    }

    // Default — tampilkan pilihan
    return btn.sendList(sock, sender, {
      body    : '🎛️ *Demo Tombol*\nPilih jenis tombol yang ingin dicoba:',
      footer  : 'AndyStore Bot',
      btnLabel: '🔽 Pilih Demo',
      sections: [{
        title: 'Jenis Tombol',
        rows : [
          { title: '✅ List (Rekomendasi)',  rowId: '.button list',   description: 'Kompatibel semua WA' },
          { title: '🔘 Legacy Buttons',     rowId: '.button legacy', description: 'Tombol lama' },
          { title: '📋 CTA Copy',           rowId: '.button copy',   description: 'Salin teks' },
          { title: '🔗 CTA URL',            rowId: '.button url',    description: 'Buka link' },
          { title: '⚡ Quick Reply',        rowId: '.button reply',  description: 'Kirim perintah' },
          { title: '❓ Info',              rowId: '.button info',   description: 'Penjelasan lengkap' },
        ]
      }]
    }, msg);
  }
};
