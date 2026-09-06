/**
 * Helper untuk normalisasi JID WhatsApp
 * Mendukung format lama (@s.whatsapp.net) dan format baru LID (@lid)
 */

/**
 * Ambil nomor telepon dari JID dalam format apapun
 * Contoh:
 *   628xxx:5@lid          -> 628xxx
 *   628xxx@s.whatsapp.net -> 628xxx
 *   628xxx:0@s.whatsapp.net -> 628xxx
 *   628xxx                -> 628xxx
 */
function getPhoneNumber(jid = '') {
  return jid.split(':')[0].split('@')[0];
}

/**
 * Normalisasi JID ke format standar @s.whatsapp.net
 */
function normalizeJid(jid = '') {
  if (!jid) return '';
  const num = jid.split(':')[0].split('@')[0];
  return num + '@s.whatsapp.net';
}

/**
 * Cek apakah JID termasuk owner
 */
function isOwner(jid, ownerList) {
  const num = getPhoneNumber(jid);
  return ownerList.some(o => getPhoneNumber(o) === num);
}

/**
 * Cek apakah JID adalah JID grup
 */
function isGroup(jid = '') {
  return jid.endsWith('@g.us');
}

/**
 * Ambil JID pengirim dari pesan (mendukung LID dan s.whatsapp.net)
 */
function getSenderJid(msg) {
  return msg.key?.participant || msg.key?.remoteJid || '';
}

/**
 * Kumpulkan semua kemungkinan identifikasi bot (phone number + LID)
 * @param {object} sock - instance socket Baileys
 * @returns {string[]} array nomor (tanpa domain) yang bisa jadi identitas bot
 */
function getBotIdentifiers(sock) {
  const ids = new Set();

  // Dari sock.user.id: bisa "628xxx:0@s.whatsapp.net" atau "628xxx@s.whatsapp.net"
  if (sock?.user?.id) ids.add(getPhoneNumber(sock.user.id));

  // Dari credentials LID: bisa "12345678:0@lid"
  const lid = sock?.authState?.creds?.me?.lid;
  if (lid) ids.add(getPhoneNumber(lid));

  // Nama user kadang bisa juga menyimpan JID asli
  const meJid = sock?.authState?.creds?.me?.id;
  if (meJid) ids.add(getPhoneNumber(meJid));

  return [...ids].filter(Boolean);
}

/**
 * Cek apakah BOT adalah admin di grup
 * Handle semua format: @s.whatsapp.net, @lid, device suffix (:0, :5, dll)
 * @param {object} sock - instance socket Baileys
 * @param {Array}  participants - array participants dari groupMetadata
 * @returns {boolean}
 */
function isBotAdmin(sock, participants) {
  const adminIds = participants.filter(p => p.admin).map(p => getPhoneNumber(p.id));
  const botIds = getBotIdentifiers(sock);
  return botIds.some(bid => adminIds.includes(bid));
}

/**
 * Cek apakah PENGIRIM adalah admin di grup
 * @param {string} senderJid - JID pengirim
 * @param {Array}  participants - array participants dari groupMetadata
 * @returns {boolean}
 */
function isSenderAdmin(senderJid, participants) {
  const senderPhone = getPhoneNumber(senderJid);
  return participants
    .filter(p => p.admin)
    .some(p => getPhoneNumber(p.id) === senderPhone);
}

module.exports = {
  getPhoneNumber,
  normalizeJid,
  isOwner,
  isGroup,
  getSenderJid,
  getBotIdentifiers,
  isBotAdmin,
  isSenderAdmin
};
