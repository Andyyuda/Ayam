const fs   = require('fs');
  const path = require('path');

  const DB_PATH = path.join(__dirname, '../database/afk.json');

  function loadDB() {
    try {
      if (fs.existsSync(DB_PATH)) return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    } catch (_) {}
    return {};
  }

  function saveDB(data) {
    try {
      fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
      fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    } catch (_) {}
  }

  let afkDB = loadDB();

  function formatDurasi(ms) {
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) return h + ' jam ' + m + ' menit';
    if (m > 0) return m + ' menit ' + s + ' detik';
    return s + ' detik';
  }

  function setAFK(jid, name, reason) {
    afkDB[jid] = { reason: reason || 'Tidak ada alasan', since: Date.now(), name };
    saveDB(afkDB);
  }

  function removeAFK(jid) {
    const data = afkDB[jid];
    delete afkDB[jid];
    saveDB(afkDB);
    return data;
  }

  function isAFK(jid) {
    return !!afkDB[jid];
  }

  module.exports = {
    name   : '.afk',
    command: ['.afk'],

    async execute(sock, sender, args, msg, text) {
      const senderJid = msg.key.participant || sender;
      const nama      = msg.pushName || senderJid.replace(/@s\.whatsapp\.net|@g\.us/, '');
      const alasan    = args.join(' ').trim() || 'Tidak ada alasan';

      setAFK(senderJid, nama, alasan);

      await sock.sendMessage(sender, {
        text:
          '😴 *' + nama + '* sekarang AFK!\n\n' +
          '📝 Alasan: ' + alasan + '\n' +
          '⏰ Sejak: ' + new Date().toLocaleString('id-ID') + '\n\n' +
          'Bot akan otomatis memberitahu jika ada yang mention atau reply kamu.'
      }, { quoted: msg });
    },

    async handleMessage(sock, msg) {
      if (!msg?.message || msg.key.fromMe) return;
      if (msg.key.remoteJid === 'status@broadcast') return;

      const remoteJid = msg.key.remoteJid;
      const senderJid = msg.key.participant || remoteJid;

      const text = (
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        msg.message?.videoMessage?.caption || ''
      ).trim();

      if (text.toLowerCase().startsWith('.afk')) return;

      if (isAFK(senderJid)) {
        const data   = removeAFK(senderJid);
        const durasi = formatDurasi(Date.now() - data.since);
        const nama   = msg.pushName || data.name || senderJid.replace(/@s\.whatsapp\.net|@g\.us/, '');

        await sock.sendMessage(remoteJid, {
          text:
            '👋 Selamat datang kembali, *' + nama + '*!\n\n' +
            '⏱️ Kamu AFK selama: *' + durasi + '*\n' +
            '📝 Alasan tadi: ' + data.reason
        }, { quoted: msg });
      }

      const ctx = msg.message?.extendedTextMessage?.contextInfo;

      if (ctx?.participant && isAFK(ctx.participant)) {
        const data   = afkDB[ctx.participant];
        const durasi = formatDurasi(Date.now() - data.since);

        await sock.sendMessage(remoteJid, {
          text:
            '😴 *' + data.name + '* sedang AFK!\n\n' +
            '📝 Alasan: ' + data.reason + '\n' +
            '⏱️ Sudah AFK selama: *' + durasi + '*'
        }, { quoted: msg });
      }

      const mentioned = ctx?.mentionedJid ?? [];
      for (const jid of mentioned) {
        if (!isAFK(jid)) continue;
        if (ctx?.participant === jid) continue;

        const data   = afkDB[jid];
        const durasi = formatDurasi(Date.now() - data.since);

        await sock.sendMessage(remoteJid, {
          text:
            '😴 *' + data.name + '* sedang AFK!\n\n' +
            '📝 Alasan: ' + data.reason + '\n' +
            '⏱️ Sudah AFK selama: *' + durasi + '*'
        }, { quoted: msg });
      }
    }
  };
  