/**
 * lib/button.js — Semua jenis tombol interaktif untuk dgxeon-soket v7
 *
 * Prioritas (paling → kurang kompatibel di WA personal):
 *   sendInteractive()  → interactiveMessage + NativeFlowButton (proto langsung)
 *   sendList()         → ListMessage via proto
 *   sendLegacyButtons()→ buttonsMessage lama
 */

const { generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');

const IM  = proto.Message.InteractiveMessage;
const NFB = IM.NativeFlowMessage.NativeFlowButton;

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: buat NativeFlowButton proto
// ─────────────────────────────────────────────────────────────────────────────

/** Tombol balas cepat — user klik → diterima bot sebagai text */
function quickReply(label, id) {
  return NFB.create({
    name           : 'quick_reply',
    buttonParamsJson: JSON.stringify({ display_text: label, id: id ?? label })
  });
}

/** Tombol salin teks ke clipboard */
function ctaCopy(label, copyText) {
  return NFB.create({
    name           : 'cta_copy',
    buttonParamsJson: JSON.stringify({ display_text: label, id: label, copy_code: String(copyText) })
  });
}

/** Tombol buka URL */
function ctaUrl(label, url) {
  return NFB.create({
    name           : 'cta_url',
    buttonParamsJson: JSON.stringify({ display_text: label, url, merchant_url: url })
  });
}

/** Tombol telepon */
function ctaCall(label, phoneNumber) {
  return NFB.create({
    name           : 'cta_call',
    buttonParamsJson: JSON.stringify({ display_text: label, phone_number: String(phoneNumber) })
  });
}

/**
 * Tombol dropdown list (single_select) — satu tombol yang buka popup list.
 * @param {string} btnLabel  - Label tombol, misal "📋 Pilih Menu"
 * @param {Array}  sections  - [{ title, rows: [{ title, id, description }] }]
 */
function singleSelect(btnLabel, sections) {
  return NFB.create({
    name           : 'single_select',
    buttonParamsJson: JSON.stringify({
      title   : btnLabel,
      sections: sections.map(s => ({
        title: s.title ?? '',
        rows : (s.rows ?? []).map(r => ({
          header     : r.header ?? '',
          title      : r.title ?? '',
          description: r.description ?? '',
          id         : r.id ?? r.rowId ?? r.title ?? ''
        }))
      }))
    })
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// METODE UTAMA: INTERACTIVE MESSAGE (proto NativeFlowButton)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Kirim interactiveMessage dengan NativeFlowButton via proto langsung.
 * Ini format paling modern di dgxeon-soket v7.
 *
 * @param {object} sock
 * @param {string} jid
 * @param {object} opts
 *   @param {string}  opts.body     - Teks isi pesan
 *   @param {string}  [opts.title]  - Judul header
 *   @param {string}  [opts.footer] - Teks footer
 *   @param {Array}   opts.buttons  - Array dari quickReply/ctaUrl/singleSelect/etc
 *   @param {Buffer}  [opts.image]  - Gambar header (opsional)
 * @param {object} [quoted]
 */
async function sendInteractive(sock, jid, opts, quoted) {
  const { body = '', title = '', footer = '', buttons = [], image } = opts;

  const header = IM.Header.create({ hasMediaAttachment: !!image });
  if (title && !image) header.title = title;
  if (image) {
    header.imageMessage = proto.Message.ImageMessage.create({
      jpegThumbnail: image,
      mimetype     : 'image/png'
    });
    header.hasMediaAttachment = true;
  }

  const interactiveMessage = IM.create({
    header,
    body             : IM.Body.create({ text: body }),
    footer           : IM.Footer.create({ text: footer }),
    nativeFlowMessage: IM.NativeFlowMessage.create({ buttons })
  });

  const generated = await generateWAMessageFromContent(
    jid,
    { interactiveMessage },
    { quoted, userJid: sock.user?.id }
  );
  await sock.relayMessage(jid, generated.message, { messageId: generated.key.id });
  return generated;
}

// ─────────────────────────────────────────────────────────────────────────────
// METODE FALLBACK: LIST MESSAGE via proto
// ─────────────────────────────────────────────────────────────────────────────

async function sendList(sock, jid, opts, quoted) {
  const { body = '', footer = '', title = '', btnLabel = '📋 Pilih', sections = [] } = opts;
  const LM = proto.Message.ListMessage;
  const listMessage = LM.create({
    title      : title,
    description: body,
    footerText : footer,
    buttonText : btnLabel,
    listType   : LM.ListType.SINGLE_SELECT,
    sections   : sections.map(s => LM.Section.create({
      title: s.title ?? '',
      rows : (s.rows ?? []).map(r => LM.Row.create({
        title      : r.title ?? '',
        description: r.description ?? '',
        rowId      : r.rowId ?? r.id ?? r.title ?? ''
      }))
    }))
  });
  const generated = await generateWAMessageFromContent(
    jid,
    { listMessage },
    { quoted, userJid: sock.user?.id }
  );
  await sock.relayMessage(jid, generated.message, { messageId: generated.key.id });
  return generated;
}

// ─────────────────────────────────────────────────────────────────────────────
// METODE FALLBACK: LEGACY BUTTONS (buttonsMessage)
// ─────────────────────────────────────────────────────────────────────────────

async function sendLegacyButtons(sock, jid, opts, quoted) {
  const { body = '', footer = '', buttons = [] } = opts;
  await sock.sendMessage(jid, {
    text      : body,
    footer,
    buttons   : buttons.slice(0, 3).map((b, i) => ({
      buttonId  : b.id ?? String(i + 1),
      buttonText: { displayText: b.label ?? b.id ?? `Tombol ${i + 1}` },
      type      : 1
    })),
    headerType: 1
  }, { quoted });
}

module.exports = {
  sendInteractive,
  sendList,
  sendLegacyButtons,
  quickReply, ctaCopy, ctaUrl, ctaCall, singleSelect
};
