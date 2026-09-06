/**
 * .stop — Batalkan download music yang sedang berjalan
 */

module.exports = {
  name: '.stop',
  command: ['.stop'],

  execute: async (sock, sender, args, msg) => {
    let playPlugin;
    try {
      playPlugin = require('./play');
    } catch (e) {
      return sock.sendMessage(sender, {
        text: '⚠️ Plugin play tidak ditemukan.'
      }, { quoted: msg });
    }

    const activeDownloads = playPlugin.getActiveDownloads?.() || {};

    if (activeDownloads[sender]) {
      activeDownloads[sender].cancel();
      delete activeDownloads[sender];
      return sock.sendMessage(sender, {
        text: '⏹️ Download music dibatalkan.'
      }, { quoted: msg });
    }

    return sock.sendMessage(sender, {
      text: '⚠️ Tidak ada download music yang aktif saat ini.'
    }, { quoted: msg });
  }
};
