/**
 * .jadibot — Buat bot clone WhatsApp dengan pairing code
 * Alur: owner ketik .jadibot → bot tanya nomor HP → kirim pairing code via chat
 */
const makeWASocket = require('@whiskeysockets/baileys').default;
const { useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = require('@whiskeysockets/baileys');
const P = require('pino');
const fs = require('fs');
const path = require('path');
const setting = require('../setting');
const { isOwner } = require('../lib/helper');

// Simpan sesi clone yang aktif agar tidak duplikat
const activeClones = {};

module.exports = {
  name: '.jadibot',
  command: ['.jadibot', '.stopbot'],

  execute: async (conn, sender, args, msg) => {
    const author = msg.key.participant || msg.key.remoteJid;

    if (!isOwner(author, setting.owner)) {
      return conn.sendMessage(sender, {
        text: '❌ Hanya *owner* yang bisa menggunakan perintah ini.'
      }, { quoted: msg });
    }

    const command = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || '').trim().split(' ')[0].toLowerCase();

    // Perintah stopbot — matikan semua clone aktif
    if (command === '.stopbot') {
      const keys = Object.keys(activeClones);
      if (keys.length === 0) {
        return conn.sendMessage(sender, { text: '⚠️ Tidak ada bot clone yang aktif.' }, { quoted: msg });
      }
      for (const k of keys) {
        try { activeClones[k].sock.end(); } catch (e) {}
        try { fs.rmSync(activeClones[k].sessionPath, { recursive: true, force: true }); } catch (e) {}
        delete activeClones[k];
      }
      return conn.sendMessage(sender, { text: `✅ ${keys.length} bot clone telah dihentikan dan sesi dihapus.` }, { quoted: msg });
    }

    // Cek apakah sudah ada sesi pending untuk sender ini
    if (global.userState[sender]?.status === '.jadibot') {
      return conn.sendMessage(sender, {
        text: '⚠️ Kamu sudah punya proses jadibot yang aktif.\nKirim nomor HP untuk lanjutkan, atau tunggu hingga selesai.'
      }, { quoted: msg });
    }

    await conn.sendMessage(sender, {
      text: '🤖 *Setup Bot Clone (Pairing Code)*\n\n' +
            '📱 Kirimkan nomor HP yang mau dijadikan bot.\n' +
            'Format: `628xxxxxxxxxx` (tanpa +, tanpa spasi)\n\n' +
            '⚠️ Pastikan HP tersebut *tidak sedang login* di tempat lain.'
    }, { quoted: msg });

    // Set state menunggu nomor HP
    global.userState[sender] = { status: '.jadibot', step: 'awaiting_number' };
  },

  handleSession: async (conn, sender, text, msg) => {
    const state = global.userState[sender];
    if (!state || state.status !== '.jadibot') return;

    if (state.step === 'awaiting_number') {
      const nomor = text.trim().replace(/[^0-9]/g, '');

      if (!nomor || nomor.length < 10) {
        return conn.sendMessage(sender, {
          text: '❌ Nomor tidak valid. Coba lagi.\nContoh: `628512345678`'
        }, { quoted: msg });
      }

      // Hapus state lebih dulu sebelum proses async panjang
      delete global.userState[sender];

      await conn.sendMessage(sender, {
        text: `⏳ Membuat pairing code untuk nomor *${nomor}*...\nMohon tunggu beberapa detik.`
      }, { quoted: msg });

      const sessionId = `clone-${nomor}-${Date.now()}`;
      const sessionPath = path.resolve(__dirname, '..', sessionId);

      try {
        const { state: authState, saveCreds } = await useMultiFileAuthState(sessionPath);
        const { version } = await fetchLatestBaileysVersion();

        const clone = makeWASocket({
          auth: authState,
          version,
          logger: P({ level: 'silent' }),
          printQRInTerminal: false,
          browser: ['BotClone', 'Desktop', '1.0']
        });

        clone.ev.on('creds.update', saveCreds);

        // Simpan referensi clone
        activeClones[sessionId] = { sock: clone, sessionPath };

        // Minta pairing code
        if (!authState.creds.registered) {
          try {
            const code = await clone.requestPairingCode(nomor);
            const formatted = code.match(/.{1,4}/g).join('-');

            await conn.sendMessage(sender, {
              text: `✅ *Pairing Code Bot Clone*\n\n` +
                    `🔑 Kode: *${formatted}*\n\n` +
                    `📋 *Cara pakai:*\n` +
                    `1. Buka WhatsApp di HP nomor *${nomor}*\n` +
                    `2. Ketuk titik 3 → *Linked Devices*\n` +
                    `3. Ketuk *Link a Device*\n` +
                    `4. Pilih *"Link with phone number instead"*\n` +
                    `5. Masukkan kode: *${formatted}*\n\n` +
                    `⏰ Kode berlaku sekitar 2 menit.`
            }, { quoted: msg });
          } catch (err) {
            delete activeClones[sessionId];
            try { fs.rmSync(sessionPath, { recursive: true, force: true }); } catch (e) {}
            return conn.sendMessage(sender, {
              text: `❌ Gagal membuat pairing code:\n${err.message}\n\nPastikan nomor valid dan belum login di perangkat lain.`
            }, { quoted: msg });
          }
        } else {
          await conn.sendMessage(sender, {
            text: '✅ Sesi clone sudah aktif, tidak perlu pairing ulang.'
          }, { quoted: msg });
        }

        // Handler koneksi clone
        clone.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
          if (connection === 'open') {
            await conn.sendMessage(sender, {
              text: `🎉 *Bot clone berhasil terhubung!*\n👤 Nomor: ${nomor}\nBot clone aktif dan siap digunakan.`
            }, { quoted: msg });
          }

          if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            if (reason === DisconnectReason.loggedOut) {
              delete activeClones[sessionId];
              try { fs.rmSync(sessionPath, { recursive: true, force: true }); } catch (e) {}
              await conn.sendMessage(sender, {
                text: `⚠️ Bot clone *${nomor}* telah logout. Sesi dihapus.`
              }).catch(() => {});
            }
          }
        });

        // Load plugin untuk clone
        const pluginDir = path.join(__dirname);
        const clonePlugins = fs.readdirSync(pluginDir)
          .filter(f => f.endsWith('.js') && f !== 'jadibot.js')
          .map(f => require(path.join(pluginDir, f)));

        clone.ev.on('messages.upsert', async ({ messages }) => {
          const m = messages[0];
          if (!m?.message || m.key.remoteJid === 'status@broadcast') return;
          if (m.key.fromMe) return;

          const from = m.key.remoteJid;
          const txt = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
          if (!txt) return;

          const ses = global.userState?.[from];
          if (ses) {
            const p = clonePlugins.find(x => x.name === ses.status);
            if (p?.handleSession) { await p.handleSession(clone, from, txt, m); return; }
          }

          const [cmd, ...cargs] = txt.trim().split(' ');
          const p = clonePlugins.find(x =>
            x.name === cmd.toLowerCase() ||
            (Array.isArray(x.command) && x.command.includes(cmd.toLowerCase()))
          );

          if (p && typeof p.execute === 'function') {
            try {
              await p.execute(clone, from, cargs, m);
            } catch (err) {
              await clone.sendMessage(from, { text: '⚠️ Gagal menjalankan perintah.' }, { quoted: m });
            }
          }
        });

      } catch (err) {
        delete activeClones[sessionId];
        try { fs.rmSync(sessionPath, { recursive: true, force: true }); } catch (e) {}
        await conn.sendMessage(sender, {
          text: `❌ Error membuat bot clone:\n${err.message}`
        }, { quoted: msg });
      }
    }
  }
};
