/**
 * .config — Generate file HTTP Custom ePro Dev v6.9.x (.hc)
 * Gunakan:
 *   .config          → tampilkan menu
 *   .config ssh      → kirim file SSH .hc
 *   .config vmess    → kirim file VMess .hc
 *   .config all      → kirim semua sekaligus
 */

// ═══════════════════════════════════════════════════════════════
//  DATA SERVER — ganti sesuai server kamu
// ═══════════════════════════════════════════════════════════════

const SSH_SERVERS = [
  {
    name     : 'SSH SG - Telkomsel',
    // Server tunnel (bisa sama dengan SSH host atau CDN/bug)
    server   : 'sg1.example.com',      // ← ganti
    port     : 80,                     // ← port tunnel (bukan port SSH)
    // Data akun SSH
    ssh_host : 'sg1.example.com',      // ← host SSH (bisa beda dengan server tunnel)
    ssh_port : 22,
    username : 'user',                 // ← ganti
    password : 'pass',                 // ← ganti
    // Payload HTTP
    payload  : 'GET / HTTP/1.1[crlf]Host: [host][crlf]Upgrade: websocket[crlf]Connection: Upgrade[crlf][crlf]',
    bug      : 'www.instagram.com',    // ← bug host operator
    sni      : '',
    dns      : '1.1.1.1',
    udpgw    : 7300,
    expire   : '31 Des 2028',
    operator : 'Telkomsel',
  },
  {
    name     : 'SSH SG - XL/Axis',
    server   : 'sg2.example.com',
    port     : 8080,
    ssh_host : 'sg2.example.com',
    ssh_port : 22,
    username : 'user',
    password : 'pass',
    payload  : 'CONNECT [host_port] HTTP/1.1[crlf]Host: [host][crlf][crlf]',
    bug      : 'xl.axis.co.id',
    sni      : '',
    dns      : '8.8.8.8',
    udpgw    : 7300,
    expire   : '31 Des 2028',
    operator : 'XL/Axis',
  },
];

const VMESS_SERVERS = [
  {
    name     : 'VMess SG WS TLS',
    server   : 'sg1.example.com',      // ← ganti
    port     : 443,
    uuid     : 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', // ← ganti UUID
    alterId  : 0,
    security : 'auto',
    network  : 'ws',
    path     : '/vmess',               // ← ganti path WS
    host     : 'sg1.example.com',
    tls      : true,
    sni      : 'sg1.example.com',
    bug      : 'www.instagram.com',
    dns      : '1.1.1.1',
    expire   : '31 Des 2025',
    operator : 'All Operator',
  },
  {
    name     : 'VMess SG WS noTLS',
    server   : 'sg2.example.com',
    port     : 80,
    uuid     : 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    alterId  : 0,
    security : 'auto',
    network  : 'ws',
    path     : '/vmess',
    host     : 'sg2.example.com',
    tls      : false,
    sni      : '',
    bug      : 'www.instagram.com',
    dns      : '8.8.8.8',
    expire   : '31 Des 2025',
    operator : 'Telkomsel/XL',
  },
];

// ═══════════════════════════════════════════════════════════════
//  BUILD .hc — FORMAT ePro Dev HTTP Custom v6.9.x
// ═══════════════════════════════════════════════════════════════

function buildSshHc(s) {
  return {
    name        : s.name,
    remarks     : `Operator: ${s.operator} | Expire: ${s.expire}`,
    // Tunnel
    server      : s.server,
    port        : s.port,
    payload     : s.payload,
    payload_host: s.bug,
    sni         : s.sni || s.bug,
    dns         : s.dns,
    // SSH
    ssh: {
      host    : s.ssh_host,
      port    : s.ssh_port,
      username: s.username,
      password: s.password,
      udpgw   : s.udpgw,
    },
    protocol    : 0,        // 0 = SSH
    created_at  : new Date().toISOString(),
  };
}

function buildVmessHc(s) {
  return {
    name        : s.name,
    remarks     : `Operator: ${s.operator} | Expire: ${s.expire}`,
    // Tunnel
    server      : s.server,
    port        : s.port,
    payload     : '',
    payload_host: s.bug,
    sni         : s.sni || s.host,
    dns         : s.dns,
    // VMess / V2Ray
    vmess: {
      host    : s.host,
      port    : s.port,
      uuid    : s.uuid,
      alterId : s.alterId,
      security: s.security,
      network : s.network,
      path    : s.path,
      tls     : s.tls,
    },
    protocol    : 1,        // 1 = VMess
    created_at  : new Date().toISOString(),
  };
}

// Bungkus ke dalam container .hc ePro Dev
function wrapHcFile(configs) {
  return JSON.stringify({
    app        : 'HTTP Custom',
    developer  : 'ePro Dev. Team',
    version    : '6.9.20',
    total      : configs.length,
    configs,
  }, null, 2);
}

// ═══════════════════════════════════════════════════════════════
//  HELPER KIRIM FILE .hc
// ═══════════════════════════════════════════════════════════════

async function sendHcFile(sock, sender, msg, filename, content, caption) {
  await sock.sendMessage(sender, {
    document : Buffer.from(content, 'utf-8'),
    fileName : filename,
    mimetype : 'application/octet-stream',
    caption,
  }, { quoted: msg });
}

// ═══════════════════════════════════════════════════════════════
//  MENU
// ═══════════════════════════════════════════════════════════════

function menuText() {
  const date = new Date().toLocaleDateString('id-ID', {
    day: '2-digit', month: 'long', year: 'numeric'
  });

  const sshList = SSH_SERVERS.map((s, i) =>
    `  ${i + 1}. ${s.name}\n     🌐 ${s.server}:${s.port} | 📶 ${s.operator}`
  ).join('\n');

  const vmessList = VMESS_SERVERS.map((s, i) =>
    `  ${i + 1}. ${s.name}\n     🌐 ${s.server}:${s.port} | 📶 ${s.operator}`
  ).join('\n');

  return (
    `╔══════════════════════════╗\n` +
    `║  🛡️  HTTP CUSTOM CONFIG       ║\n` +
    `║  ePro Dev v6.9.20           ║\n` +
    `╚══════════════════════════╝\n` +
    `📅 ${date}\n\n` +

    `🔑 *SSH Config* (${SSH_SERVERS.length} server)\n` +
    `${sshList}\n\n` +

    `🚀 *VMess Config* (${VMESS_SERVERS.length} server)\n` +
    `${vmessList}\n\n` +

    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📥 *Perintah:*\n` +
    `  *.config ssh*   → File SSH .hc\n` +
    `  *.config vmess* → File VMess .hc\n` +
    `  *.config all*   → Semua config\n\n` +

    `📲 *Cara import:*\n` +
    `Buka HC → menu kiri → Simple Maker\n` +
    `atau tap ikon ⬇️ di pojok kanan atas\n` +
    `→ pilih file .hc yang dikirim bot`
  );
}

// ═══════════════════════════════════════════════════════════════
//  EXPORT PLUGIN
// ═══════════════════════════════════════════════════════════════

module.exports = {
  name    : '.config',
  command : ['.config'],

  execute : async (sock, sender, args, msg) => {
    const sub = (args[0] || '').toLowerCase().trim();

    if (!sub) {
      return sock.sendMessage(sender, { text: menuText() }, { quoted: msg });
    }

    const ts = Date.now();

    // ── .config ssh ──────────────────────────────────────────
    if (sub === 'ssh') {
      await sock.sendMessage(sender, { text: '⏳ Generating SSH config...' }, { quoted: msg });

      const configs  = SSH_SERVERS.map(buildSshHc);
      const content  = wrapHcFile(configs);
      const filename = `SSH-HC-${ts}.hc`;
      const caption  =
        `🔑 *SSH HTTP Custom Config*\n` +
        `📦 ${SSH_SERVERS.length} server\n` +
        `📲 Import: Simple Maker atau ikon ⬇️`;

      return sendHcFile(sock, sender, msg, filename, content, caption);
    }

    // ── .config vmess ─────────────────────────────────────────
    if (sub === 'vmess') {
      await sock.sendMessage(sender, { text: '⏳ Generating VMess config...' }, { quoted: msg });

      const configs  = VMESS_SERVERS.map(buildVmessHc);
      const content  = wrapHcFile(configs);
      const filename = `VMess-HC-${ts}.hc`;
      const caption  =
        `🚀 *VMess HTTP Custom Config*\n` +
        `📦 ${VMESS_SERVERS.length} server\n` +
        `📲 Import: Simple Maker atau ikon ⬇️`;

      return sendHcFile(sock, sender, msg, filename, content, caption);
    }

    // ── .config all ───────────────────────────────────────────
    if (sub === 'all') {
      await sock.sendMessage(sender, { text: '⏳ Generating semua config...' }, { quoted: msg });

      await sendHcFile(sock, sender, msg,
        `SSH-HC-${ts}.hc`,
        wrapHcFile(SSH_SERVERS.map(buildSshHc)),
        `🔑 *SSH Config* — ${SSH_SERVERS.length} server`
      );

      await sendHcFile(sock, sender, msg,
        `VMess-HC-${ts}.hc`,
        wrapHcFile(VMESS_SERVERS.map(buildVmessHc)),
        `🚀 *VMess Config* — ${VMESS_SERVERS.length} server`
      );

      return sock.sendMessage(sender, {
        text: `✅ Semua config terkirim!\n📲 Import lewat Simple Maker atau ikon ⬇️ di HC`
      }, { quoted: msg });
    }

    return sock.sendMessage(sender, {
      text: `❌ Perintah tidak dikenal.\nGunakan: *.config ssh* | *.config vmess* | *.config all*`
    }, { quoted: msg });
  }
};