const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers,
  DisconnectReason,
  decryptPollVote
} = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const readline = require('readline');
const setting = require('./setting');
const { getPhoneNumber, isOwner } = require('./lib/helper');
const tg = require('./lib/telegram');

const PLUGIN_DIR = './plugins';
global.userState = {};

// ── Ambil prefix aktif (dari database/prefix.json atau setting.prefix) ────────
function getPrefix() {
  try {
    const db = JSON.parse(fs.readFileSync(path.join(__dirname, 'database/prefix.json')));
    return typeof db.prefix === 'string' ? db.prefix : (setting.prefix ?? '.');
  } catch {
    return setting.prefix ?? '.';
  }
}

// 🔌 Load semua plugin
let plugins = [];
fs.readdirSync(PLUGIN_DIR).forEach(file => {
  if (file.endsWith('.js')) {
    const plugin = require(path.join(__dirname, PLUGIN_DIR, file));
    plugins.push(plugin);
    console.log(chalk.green(`✅ Plugin loaded: ${plugin.name}`));
  }
});
global.plugins = plugins;

// 📟 Tanya input via terminal
function tanyaInput(prompt) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(prompt, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth');
  const { version } = await fetchLatestBaileysVersion();

  let modeLogin = null;
  let nomorTarget = null;

  // Sudah login jika ada info akun (me) atau registered flag — skip prompt login
  const isAlreadyLoggedIn = !!(state.creds.me || state.creds.registered);

  if (!isAlreadyLoggedIn) {
    if (tg.isConfigured) {
      // ─── LOGIN VIA TELEGRAM ───────────────────────────────────────
      console.log(chalk.cyan('📲 Bot belum terdaftar. Mengirim pilihan login ke Telegram...'));
      await tg.sendMessage(
        '🤖 <b>BotWA siap login!</b>\n\n' +
        'Pilih mode login:\n' +
        '1️⃣ <b>QR Code</b> — scan QR dari WhatsApp\n' +
        '2️⃣ <b>Pairing Code</b> — masukkan kode di Linked Devices\n\n' +
        'Balas <b>1</b> untuk QR atau <b>2</b> untuk Pairing Code'
      );

      const input = await tg.waitReply(120000);
      const inputBersih = (input || '').trim();

      if (inputBersih === '2' || inputBersih.toLowerCase() === 'pairing') {
        modeLogin = 'pairing';
        await tg.sendMessage('📱 Masukkan nomor HP:\n<code>628xxxxxxxxxx</code>\n(tanpa + atau spasi)');
        const nomInput = await tg.waitReply(120000);
        nomorTarget = (nomInput || '').replace(/[^0-9]/g, '');
        if (!nomorTarget || nomorTarget.length < 10) {
          await tg.sendMessage('❌ Nomor tidak valid. Restart bot dan coba lagi.');
          return;
        }
        await tg.sendMessage(`⏳ Nomor diterima: <code>${nomorTarget}</code>\nMeminta pairing code...`);
      } else {
        modeLogin = 'qr';
        await tg.sendMessage('✅ Mode QR aktif. QR akan dikirim sebentar...');
      }
      // ─────────────────────────────────────────────────────────────
    } else {
      // ─── LOGIN VIA TERMINAL ───────────────────────────────────────
      console.log(chalk.bgCyan.black('\n╔══════════════════════════════════╗'));
      console.log(chalk.bgCyan.black('   🤖  BOTWA — LOGIN WHATSAPP BOT   '));
      console.log(chalk.bgCyan.black('╚══════════════════════════════════╝\n'));
      console.log(chalk.white('  [1] QR Code    ') + chalk.gray('(scan QR dari WhatsApp)'));
      console.log(chalk.white('  [2] Pairing Code') + chalk.gray('(masukkan kode di WA → Linked Devices)\n'));

      const input = await tanyaInput(chalk.cyan('Pilih mode login (1/2): '));
      const pil = input.trim();

      if (pil === '2' || pil.toLowerCase() === 'p' || pil.toLowerCase() === 'pairing') {
        modeLogin = 'pairing';
        nomorTarget = (await tanyaInput(chalk.cyan('📱 Masukkan nomor HP (contoh: 628xxxxxxxxxx): ')))
          .replace(/[^0-9]/g, '');
        if (!nomorTarget || nomorTarget.length < 10) {
          console.log(chalk.red('❌ Nomor tidak valid. Coba lagi.'));
          return start();
        }
      } else {
        modeLogin = 'qr';
        console.log(chalk.green('\n✅ Mode QR dipilih. QR akan muncul di bawah...\n'));
      }
      // ─────────────────────────────────────────────────────────────
    }
  }

  // Filter log Baileys yang tidak perlu (noise)
  const SKIP_ERRORS = ['failed to decrypt message', 'init queries'];
  const baileysLogger = {
    level: 'silent',
    trace: () => {}, debug: () => {}, info: () => {},
    warn: (o, m) => {
      if (SKIP_ERRORS.some(s => (m ?? '').includes(s))) return;
      console.log(chalk.yellow(`[WA] ${m ?? ''}`));
    },
    error: (o, m) => {
      if (SKIP_ERRORS.some(s => (m ?? '').includes(s))) return;
      console.log(chalk.red(`[WA ERROR] ${m ?? ''}`), JSON.stringify(o ?? {}));
    },
    fatal: (o, m) => console.log(chalk.bgRed.white(`[WA FATAL] ${m ?? ''}`)),
    child: function() { return this; }
  };

  // Cache pesan masuk agar retry request dari WA bisa dipenuhi
  const msgStore = new Map();
  const MAX_STORE = 500;

  const sock = makeWASocket({
    version,
    logger: baileysLogger,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, baileysLogger)
    },
    printQRInTerminal: false,
    browser: Browsers.ubuntu('Chrome'),
    syncFullHistory: false,
    markOnlineOnConnect: false,
    generateHighQualityLinkPreview: false,
    retryRequestDelayMs: 250,
    maxMsgRetryCount: 5,
    // Wajib agar "could not send message again" tidak muncul
    getMessage: async (key) => {
      const id = key.id;
      if (msgStore.has(id)) return msgStore.get(id);
      return { conversation: '' };
    }
  });

  sock.ev.on('creds.update', saveCreds);

  let sudahLogin = false;

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    // ── QR / Pairing Code ────────────────────────────────────────────
    if (qr && !state.creds.registered && !sudahLogin) {

      // Mode Pairing Code
      if (modeLogin === 'pairing' && nomorTarget) {
        sudahLogin = true;
        try {
          console.log(chalk.cyan('⏳ Meminta pairing code ke WhatsApp...'));
          const code = await sock.requestPairingCode(nomorTarget);
          const fmt = code.match(/.{1,4}/g).join('-');

          if (tg.isConfigured) {
            await tg.sendMessage(
              '🔑 <b>PAIRING CODE BOT WHATSAPP</b>\n\n' +
              `Kode: <code>${fmt}</code>\n` +
              `Nomor: <code>${nomorTarget}</code>\n\n` +
              '📋 Cara pakai:\n' +
              '1. Buka WhatsApp di HP\n' +
              '2. ⋮ → Perangkat Tertaut → Tautkan Perangkat\n' +
              '3. Tautkan dengan nomor telepon\n' +
              `4. Ketik kode: <b>${fmt}</b>\n\n` +
              '⚠️ Berlaku ±60 detik — masukkan SEGERA!'
            );
          } else {
            console.log(chalk.bgGreen.black('\n╔══════════════════════════════╗'));
            console.log(chalk.bgGreen.black('  🔑 PAIRING CODE BOT WHATSAPP  '));
            console.log(chalk.bgGreen.black('╚══════════════════════════════╝'));
            console.log(chalk.yellow('\n  Kode : ') + chalk.bold.white(fmt));
            console.log(chalk.cyan(`  Nomor: ${nomorTarget}\n`));
            console.log(chalk.gray('  1. Buka WhatsApp di HP'));
            console.log(chalk.gray('  2. ⋮ → Perangkat Tertaut → Tautkan Perangkat'));
            console.log(chalk.gray('  3. Tautkan dengan nomor telepon'));
            console.log(chalk.gray(`  4. Ketik kode: ${chalk.bold(fmt)}`));
            console.log(chalk.red('\n  ⚠️  Berlaku ±60 detik — masukkan SEGERA!\n'));
          }
        } catch (err) {
          const errMsg = `❌ Gagal dapat pairing code: ${err.message}\n💡 Coba rm -rf auth/ lalu restart.`;
          if (tg.isConfigured) await tg.sendMessage(errMsg);
          else console.log(chalk.red(errMsg));
          sudahLogin = false;
        }
      }

      // Mode QR
      if (modeLogin === 'qr') {
        if (tg.isConfigured) {
          try {
            const qrcode = require('qrcode');
            const buf = await qrcode.toBuffer(qr, { type: 'png', scale: 6, margin: 2 });
            await tg.sendPhoto(buf, '📷 <b>Scan QR ini dengan WhatsApp</b>\n⏰ Berlaku ~30 detik\n\nJika expired, QR baru akan dikirim otomatis.');
          } catch (e) {
            await tg.sendMessage(`❌ Gagal kirim QR: ${e.message}`);
          }
        } else {
          try {
            const qrTerminal = require('qrcode-terminal');
            console.log(chalk.cyan('\n📷 Scan QR berikut dengan WhatsApp:\n'));
            qrTerminal.generate(qr, { small: true });
            console.log(chalk.gray('  QR refresh otomatis tiap ~30 detik.\n'));
          } catch {
            console.log(chalk.red('❌ qrcode-terminal tidak tersedia.'));
          }
        }
      }
    }

    // ── Terhubung ────────────────────────────────────────────────────
    if (connection === 'open') {
      const info = `✅ <b>Bot WhatsApp terhubung!</b>\n👤 ${sock.user?.id}\n📛 ${sock.user?.name ?? '-'}`;
      console.log(chalk.green('\n✅ Terhubung ke WhatsApp!'));
      console.log(chalk.cyan(`👤 Bot : ${sock.user?.id}`));
      console.log(chalk.cyan(`📛 Nama: ${sock.user?.name ?? '-'}`));
      if (tg.isConfigured) await tg.sendMessage(info);
      // Panggil onReady untuk setiap plugin (misal: scheduler sholat)
      for (const plugin of plugins) {
        if (typeof plugin.onReady === 'function') {
          try { plugin.onReady(sock); } catch (e) { console.error('onReady error:', e.message); }
        }
      }
    }

    // ── Koneksi terputus ─────────────────────────────────────────────
    if (connection === 'close') {
      const reasonCode = lastDisconnect?.error?.output?.statusCode;

      if (reasonCode === DisconnectReason.loggedOut) {
        const msg = '❌ Logout permanen. Hapus folder auth/ untuk login ulang.';
        console.log(chalk.red(msg));
        if (tg.isConfigured) await tg.sendMessage(msg);
        fs.rmSync('./auth', { recursive: true, force: true });
        start();
      } else if (reasonCode === DisconnectReason.badSession) {
        const msg = '❌ Sesi rusak. Menghapus auth/ dan restart...';
        console.log(chalk.red(msg));
        if (tg.isConfigured) await tg.sendMessage(msg);
        fs.rmSync('./auth', { recursive: true, force: true });
        start();
      } else {
        console.log(chalk.yellow(`🔄 Koneksi terputus (${reasonCode ?? 'unknown'}), reconnect dalam 5 detik...`));
        setTimeout(start, 5000);
      }
    }
  });

  // 🧑‍🤝‍🧑 Handler join/leave grup
  sock.ev.on('group-participants.update', async (update) => {
    for (const plugin of plugins) {
      if (typeof plugin.handleParticipantUpdate === 'function') {
        try {
          await plugin.handleParticipantUpdate(sock, update);
        } catch (err) {
          console.error('❌ Plugin group error:', err);
        }
      }
    }
  });

  // 🔧 Helper: jalankan command dari poll response
  async function runCommand(sock, jid, senderJid, commandText, quotedMsg) {
    const prefix = getPrefix();
    const commandLow = commandText.trim().toLowerCase();

    let plugin = plugins.find(p =>
      p.name === commandLow ||
      (Array.isArray(p.command) && p.command.includes(commandLow))
    );

    if (!plugin) {
      let base = null;
      if (prefix !== '' && commandText.startsWith(prefix)) {
        base = commandText.substring(prefix.length).toLowerCase();
      } else if (prefix === '') {
        base = commandLow;
      }
      if (base !== null) {
        const dotCmd = '.' + base;
        plugin = plugins.find(p =>
          p.name === dotCmd ||
          (Array.isArray(p.command) && p.command.includes(dotCmd))
        );
      }
    }

    if (plugin && typeof plugin.execute === 'function') {
      await plugin.execute(sock, jid, [], quotedMsg, commandText);
    }
  }

  // 📊 Handler poll vote — eksekusi command saat user pilih opsi poll
  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages) {
      if (!msg?.message?.pollUpdateMessage) continue;
      if (msg.key.remoteJid === 'status@broadcast') continue;

      const pollUpdate = msg.message.pollUpdateMessage;
      const pollId     = pollUpdate.pollCreationMessageKey?.id;
      const poll       = global.pollRegistry?.[pollId];
      if (!poll) continue;

      const jid       = msg.key.remoteJid;
      const senderJid = msg.key.participant || jid;

      try {
        // Coba decrypt vote dengan creds bot
        const creds = state.creds;
        const privKey = creds.signedIdentityKey?.private
                     || creds.pairingKey
                     || creds.identityKeyPair?.private;

        if (privKey && pollUpdate.vote) {
          const decrypted = await decryptPollVote(pollUpdate.vote, {
            msgKey   : pollUpdate.pollCreationMessageKey,
            privateKey: typeof privKey === 'string'
              ? Buffer.from(privKey, 'base64')
              : Buffer.from(privKey)
          });
          const selected = decrypted?.selectedOptions ?? [];
          for (const opt of poll.options) {
            for (const sel of selected) {
              const selHex  = Buffer.from(sel).toString('hex');
              const optHash = require('crypto').createHash('sha256')
                                .update(opt.label, 'utf8').digest('hex');
              if (selHex === optHash) {
                console.log(chalk.green(`[POLL] ${senderJid} pilih: ${opt.label} → ${opt.command}`));
                await runCommand(sock, jid, senderJid, opt.command, msg);
                break;
              }
            }
          }
        }
      } catch (e) {
        // Fallback: balas dengan teks perintah
        const optList = poll.options.map((o, i) => `${i + 1}. ${o.label} → ${o.command}`).join('\n');
        console.log(chalk.yellow(`[POLL] decrypt gagal, fallback teks`));
        await sock.sendMessage(jid, {
          text: `Ketik perintah langsung:\n${optList}`
        }, { quoted: msg });
      }
    }
  });

  // 📩 Handler pesan masuk
  // 👁️ messages.update — tangkap view once yang datang via update event
  sock.ev.on('messages.update', async (updates) => {
    for (const update of updates) {
      const jid = update.key?.remoteJid;
      if (!jid || jid === 'status@broadcast') return;
      console.log(chalk.magenta(`[UPDATE] jid=${jid} id=${update.key?.id} update_keys=${Object.keys(update.update || {}).join(',')}`));
      for (const plugin of plugins) {
        if (typeof plugin.handleUpdate === 'function') {
          try { await plugin.handleUpdate(sock, update); } catch (e) {
            console.error(`[handleUpdate] ${plugin.name}:`, e.message);
          }
        }
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    const msg = messages[0];

    // 👁️ Cek view once "unavailable" — WA kirim stub tanpa konten ke bot
    if (msg && !msg.message && msg.messageStubParameters?.[1]) {
      try {
        const rawNode = JSON.parse(msg.messageStubParameters[1]);
        const unavail = Array.isArray(rawNode.content)
          ? rawNode.content.find(c => c.tag === 'unavailable')
          : null;
        if (unavail?.attrs?.type === 'view_once' && msg.key.remoteJid !== 'status@broadcast') {
          for (const plugin of plugins) {
            if (typeof plugin.handleViewOnce === 'function') {
              try { await plugin.handleViewOnce(sock, msg, rawNode); } catch (e) {
                console.error(`[handleViewOnce] ${plugin.name}:`, e.message);
              }
            }
          }
        }
      } catch (_) {}
    }

    if (!msg?.message || msg.key.remoteJid === 'status@broadcast') return;

    // Simpan ke msgStore untuk retry WA
    if (msg.key.id && msg.message) {
      msgStore.set(msg.key.id, msg.message);
      if (msgStore.size > MAX_STORE) {
        const oldest = msgStore.keys().next().value;
        msgStore.delete(oldest);
      }
    }

    if (msg.key.fromMe) return;

    const remoteJid = msg.key.remoteJid;
    const sender = remoteJid;
    const senderJid = msg.key.participant || remoteJid;
    const senderNumber = getPhoneNumber(senderJid);
    const isGroupMsg = remoteJid.endsWith('@g.us');
    const isPrivate = !isGroupMsg;
    const ownerCheck = isOwner(senderJid, setting.owner);

    let text = msg.message?.conversation ||
               msg.message?.extendedTextMessage?.text ||
               msg.message?.imageMessage?.caption ||
               msg.message?.videoMessage?.caption ||
               msg.message?.documentMessage?.caption ||
               msg.message?.buttonsResponseMessage?.selectedButtonId ||
               msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId || '';

    if (msg.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson) {
      try {
        const params = JSON.parse(msg.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson);
        text = params.id;
      } catch (e) {}
    }

    // 📨 handleMessage dipanggil untuk SEMUA pesan (termasuk view once, media, dll)
    for (const plugin of plugins) {
      if (typeof plugin.handleMessage === 'function') {
        try { await plugin.handleMessage(sock, msg); } catch (e) {
          console.error(`[handleMessage] plugin ${plugin.name} error:`, e.message);
        }
      }
    }

    if (!text) return;
    console.log(chalk.blue(`[IN] ${senderJid} -> ${remoteJid}: ${text}`));

    // ⛔ Cek mode akses
    let mode = 'off';
    for (const name of ['.onlyprivate', '.onlygc', '.onlyowner']) {
      const p = plugins.find(x => x.name === name);
      if (p && typeof p.getMode === 'function') {
        const result = p.getMode();
        if (result !== 'off') { mode = result; break; }
      }
    }

    if (
      (mode === 'private' && !isPrivate) ||
      (mode === 'group' && !isGroupMsg) ||
      (mode === 'owner' && !ownerCheck)
    ) return;

    // 🔒 Cek & hapus pesan jika user dimute (hanya di grup)
    if (isGroupMsg && msg.key.participant) {
      try {
        const muteDB = JSON.parse(fs.readFileSync('./mute.json'));
        if (muteDB[remoteJid]?.[senderJid] === true) {
          await sock.sendMessage(remoteJid, { delete: msg.key });
          return;
        }
      } catch (e) {}
    }

    // 🔄 Cek sesi
    const session = global.userState[sender];
    if (session) {
      const plugin = plugins.find(p => p.name === session.status);
      if (plugin && typeof plugin.handleSession === 'function') {
        return await plugin.handleSession(sock, sender, text, msg);
      }
    }

    // ⚙️ Eksekusi plugin dengan prefix dinamis
    const prefix = getPrefix();
    const textTrimmed = text.trim();
    const spaceIdx = textTrimmed.indexOf(' ');
    const commandRaw = spaceIdx === -1 ? textTrimmed : textTrimmed.substring(0, spaceIdx);
    const args = spaceIdx === -1 ? [] : textTrimmed.substring(spaceIdx + 1).trim().split(' ');
    const commandLow = commandRaw.toLowerCase();

    // Cari plugin: coba exact match dulu (untuk $ dan plugin non-prefix)
    let plugin = plugins.find(p =>
      p.name === commandLow ||
      (Array.isArray(p.command) && p.command.includes(commandLow))
    );

    // Kalau belum ketemu, coba strip prefix lalu tambah '.' di depan
    if (!plugin) {
      let base = null;
      if (prefix !== '' && commandRaw.startsWith(prefix)) {
        base = commandRaw.substring(prefix.length).toLowerCase();
      } else if (prefix === '') {
        base = commandLow;
      }
      if (base !== null) {
        const dotCmd = '.' + base;
        plugin = plugins.find(p =>
          p.name === dotCmd ||
          (Array.isArray(p.command) && p.command.includes(dotCmd))
        );
      }
    }

    if (plugin && typeof plugin.execute === 'function') {
      try {
        await plugin.execute(sock, sender, args, msg, text);
      } catch (err) {
        console.error('❌ Plugin error:', err);
        await sock.sendMessage(sender, { text: '⚠️ Terjadi error saat menjalankan perintah.' }, { quoted: msg });
      }
    }
  });
}
const express = require('express')
const app = express()

const PORT = process.env.PORT || 3000

app.get('/', (req, res) => {
  res.send('Bot aktif ✅')
})

app.get('/ping', (req, res) => {
  res.send('PONG')
})

app.listen(PORT, () => {
  console.log(chalk.green(`🌐 Web server running on port ${PORT}`))
})

start();
