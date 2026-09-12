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
const setting = require('./setting');
const { getPhoneNumber, isOwner } = require('./lib/helper');
const tg = require('./lib/telegram');

const PLUGIN_DIR = './plugins';
global.userState = {};

// ─────────────────────────────────────────────────────────────────────────────
// 🛡️ Global error handler — bot tidak mati walau ada yang crash
// ─────────────────────────────────────────────────────────────────────────────
process.on('uncaughtException', (err) => {
  console.error(chalk.red(`[CRASH DICEGAH] uncaughtException: ${err.message}`));
  console.error(err.stack);
});

process.on('unhandledRejection', (reason) => {
  console.error(chalk.red(`[CRASH DICEGAH] unhandledRejection: ${reason}`));
});

// ─────────────────────────────────────────────────────────────────────────────
// 🛡️ Safe runner — isolasi error tiap plugin agar tidak mematikan bot
// ─────────────────────────────────────────────────────────────────────────────
async function safeRun(pluginName, fn, sock, sender, msg) {
  try {
    await fn();
  } catch (err) {
    console.error(chalk.red(`❌ [${pluginName}] crash: ${err.message}`));
    console.error(err.stack);
    if (sock && sender) {
      try {
        await sock.sendMessage(sender, {
          text: `⚠️ Perintah *${pluginName}* error: ${err.message}`
        }, msg ? { quoted: msg } : {});
      } catch (_) {}
    }
  }
}

// ── Ambil prefix aktif (dari database/prefix.json atau setting.prefix) ────────
function getPrefix() {
  try {
    const db = JSON.parse(fs.readFileSync(path.join(__dirname, 'database/prefix.json')));
    return typeof db.prefix === 'string' ? db.prefix : (setting.prefix ?? '.');
  } catch {
    return setting.prefix ?? '.';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 🔌 Load plugin (dengan tracking nama file untuk hot-reload)
// ─────────────────────────────────────────────────────────────────────────────
let plugins = [];
global.plugins = plugins;

// Map: filename → plugin.name (untuk unload saat file dihapus)
const pluginFileMap = new Map();

function loadPlugin(filename) {
  const fullPath = path.resolve(__dirname, PLUGIN_DIR, filename);

  // Hapus cache Node.js agar perubahan file langsung terbaca
  delete require.cache[fullPath];

  try {
    const plugin = require(fullPath);

    const existingIdx = plugins.findIndex(p => p.name === plugin.name);
    if (existingIdx !== -1) {
      plugins[existingIdx] = plugin;
      console.log(chalk.yellow(`🔄 Plugin reloaded: ${plugin.name}`));
    } else {
      plugins.push(plugin);
      console.log(chalk.green(`✅ Plugin loaded: ${plugin.name}`));
    }

    pluginFileMap.set(filename, plugin.name);
    global.plugins = plugins;
  } catch (err) {
    console.error(chalk.red(`❌ Gagal load plugin ${filename}: ${err.message}`));
  }
}

function unloadPlugin(filename) {
  const fullPath = path.resolve(__dirname, PLUGIN_DIR, filename);
  delete require.cache[fullPath];

  const pluginName = pluginFileMap.get(filename);
  if (pluginName) {
    const idx = plugins.findIndex(p => p.name === pluginName);
    if (idx !== -1) {
      plugins.splice(idx, 1);
      global.plugins = plugins;
      console.log(chalk.red(`🗑️  Plugin unloaded: ${pluginName}`));
    }
    pluginFileMap.delete(filename);
  }
}

// Load semua plugin awal
fs.readdirSync(PLUGIN_DIR).forEach(file => {
  if (file.endsWith('.js')) loadPlugin(file);
});

// ─────────────────────────────────────────────────────────────────────────────
// 👁️ Watcher — auto-reload saat file ditambah, diubah, atau dihapus
// ─────────────────────────────────────────────────────────────────────────────
const debounceMap = new Map();

fs.watch(PLUGIN_DIR, (eventType, filename) => {
  if (!filename || !filename.endsWith('.js')) return;

  if (debounceMap.has(filename)) clearTimeout(debounceMap.get(filename));

  debounceMap.set(filename, setTimeout(() => {
    debounceMap.delete(filename);
    const fullPath = path.join(__dirname, PLUGIN_DIR, filename);

    if (fs.existsSync(fullPath)) {
      loadPlugin(filename);
    } else {
      unloadPlugin(filename);
    }
  }, 300));
});

console.log(chalk.cyan(`👁️  Watching plugins di: ${PLUGIN_DIR}`));

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth');
  const { version } = await fetchLatestBaileysVersion();

  const isAlreadyLoggedIn = !!(state.creds.me || state.creds.registered);

  if (!isAlreadyLoggedIn) {
    if (tg.isConfigured) {
      console.log(chalk.cyan('📲 Bot belum terdaftar. QR akan dikirim langsung ke Telegram...'));
      await tg.sendMessage(
        '🤖 <b>BotWA siap login.</b>\n' +
        '📷 QR Code akan dikirim langsung ke Telegram...'
      );
    } else {
      console.log(chalk.green('\n✅ Mode QR aktif. QR akan muncul di Telegram atau terminal...\n'));
    }
  }

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
    getMessage: async (key) => {
      const id = key.id;
      if (msgStore.has(id)) return msgStore.get(id);
      return { conversation: '' };
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    // Tidak ada lagi pilihan login. Setiap QR dari WhatsApp langsung dikirim
    // ke Telegram melalui helper lib/telegram.js.
    if (qr && !state.creds.registered) {
      if (tg.isConfigured) {
        try {
          const qrcode = require('qrcode');
          const buf = await qrcode.toBuffer(qr, { type: 'png', scale: 6, margin: 2 });
          const result = await tg.sendPhoto(
            buf,
            '📷 <b>Scan QR ini dengan WhatsApp</b>\n' +
            '⏰ Berlaku sekitar 30 detik\n\n' +
            'Jika kedaluwarsa, QR baru akan dikirim otomatis.'
          );
          if (!result?.ok) {
            console.error(chalk.red(`❌ Telegram gagal mengirim QR: ${result?.description ?? 'respons tidak valid'}`));
          }
        } catch (e) {
          console.error(chalk.red(`❌ Gagal kirim QR ke Telegram: ${e.message}`));
          try {
            await tg.sendMessage(`❌ Gagal kirim QR ke Telegram: ${e.message}`);
          } catch (_) {}
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

    if (connection === 'open') {
      const info = `✅ <b>Bot WhatsApp terhubung!</b>\n👤 ${sock.user?.id}\n📛 ${sock.user?.name ?? '-'}`;
      console.log(chalk.green('\n✅ Terhubung ke WhatsApp!'));
      console.log(chalk.cyan(`👤 Bot : ${sock.user?.id}`));
      console.log(chalk.cyan(`📛 Nama: ${sock.user?.name ?? '-'}`));
      if (tg.isConfigured) await tg.sendMessage(info);

      for (const plugin of plugins) {
        if (typeof plugin.onReady === 'function') {
          await safeRun(plugin.name, () => plugin.onReady(sock));
        }
      }
    }

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
        await safeRun(plugin.name, () => plugin.handleParticipantUpdate(sock, update));
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
      await safeRun(plugin.name, () => plugin.execute(sock, jid, [], quotedMsg, commandText), sock, jid, quotedMsg);
    }
  }

  // 📊 Handler poll vote
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
        const optList = poll.options.map((o, i) => `${i + 1}. ${o.label} → ${o.command}`).join('\n');
        console.log(chalk.yellow(`[POLL] decrypt gagal, fallback teks`));
        await sock.sendMessage(jid, {
          text: `Ketik perintah langsung:\n${optList}`
        }, { quoted: msg });
      }
    }
  });

  // 👁️ messages.update
  sock.ev.on('messages.update', async (updates) => {
    for (const update of updates) {
      const jid = update.key?.remoteJid;
      if (!jid || jid === 'status@broadcast') return;
  //    console.log(chalk.magenta(`[UPDATE] jid=${jid} id=${update.key?.id} update_keys=${Object.keys(update.update || {}).join(',')}`));
      for (const plugin of plugins) {
        if (typeof plugin.handleUpdate === 'function') {
          await safeRun(plugin.name, () => plugin.handleUpdate(sock, update));
        }
      }
    }
  });

  // 📩 Handler pesan masuk
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    const msg = messages[0];

    // 👁️ Cek view once "unavailable"
    if (msg && !msg.message && msg.messageStubParameters?.[1]) {
      try {
        const rawNode = JSON.parse(msg.messageStubParameters[1]);
        const unavail = Array.isArray(rawNode.content)
          ? rawNode.content.find(c => c.tag === 'unavailable')
          : null;
        if (unavail?.attrs?.type === 'view_once' && msg.key.remoteJid !== 'status@broadcast') {
          for (const plugin of plugins) {
            if (typeof plugin.handleViewOnce === 'function') {
              await safeRun(plugin.name, () => plugin.handleViewOnce(sock, msg, rawNode));
            }
          }
        }
      } catch (_) {}
    }

    if (!msg?.message || msg.key.remoteJid === 'status@broadcast') return;

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

    // 📨 handleMessage untuk semua pesan
    for (const plugin of plugins) {
      if (typeof plugin.handleMessage === 'function') {
        await safeRun(plugin.name, () => plugin.handleMessage(sock, msg));
      }
    }

    if (!text) return;
    // Ambil nama: pushName dari pesan, fallback ke nomor
const senderName = msg.pushName || senderNumber || senderJid;
const targetLabel = isGroupMsg
  ? chalk.magenta(`[GRUP]`)
  : chalk.cyan(`[PM]`);

console.log(
  targetLabel +
  chalk.blue(` ${senderName}`) +
  chalk.gray(` (${senderJid})`) +
  chalk.white(` → ${remoteJid}`) +
  chalk.yellow(`: ${text}`)
);

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

    // 🔒 Cek & hapus pesan jika user dimute
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
        return await safeRun(plugin.name, () => plugin.handleSession(sock, sender, text, msg), sock, sender, msg);
      }
    }

    // ⚙️ Eksekusi plugin dengan prefix dinamis
    const prefix = getPrefix();
    const textTrimmed = text.trim();
    const spaceIdx = textTrimmed.indexOf(' ');
    const commandRaw = spaceIdx === -1 ? textTrimmed : textTrimmed.substring(0, spaceIdx);
    const args = spaceIdx === -1 ? [] : textTrimmed.substring(spaceIdx + 1).trim().split(' ');
    const commandLow = commandRaw.toLowerCase();

    let plugin = plugins.find(p =>
      p.name === commandLow ||
      (Array.isArray(p.command) && p.command.includes(commandLow))
    );

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
      await safeRun(plugin.name, () => plugin.execute(sock, sender, args, msg, text), sock, sender, msg);
    }
  });
}

// 🌐 Web server keep-alive
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Bot aktif ✅'));
app.get('/ping', (req, res) => res.send('PONG'));

app.listen(PORT, () => {
  console.log(chalk.green(`🌐 Web server running on port ${PORT}`));
});

// ─────────────────────────────────────────────────────────────────────────────
// 🎨 Credit Banner
// ─────────────────────────────────────────────────────────────────────────────
console.log(chalk.bgMagenta.white.bold('\n╔══════════════════════════════════════╗'));
console.log(chalk.bgMagenta.white.bold('   ✨  BOTWA — WhatsApp Bot Engine     '));
console.log(chalk.bgMagenta.white.bold('   👤  Dev  : YourName                 '));
console.log(chalk.bgMagenta.white.bold('   📦  Ver  : 1.0.0                    '));
console.log(chalk.bgMagenta.white.bold('   🔗  Git  : github.com/yourrepo      '));
console.log(chalk.bgMagenta.white.bold('╚══════════════════════════════════════╝\n'));

start();
