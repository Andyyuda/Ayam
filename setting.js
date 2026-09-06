/**
 * CARA ISI OWNER:
 * - Simpan ID TANPA @domain (bukan @s.whatsapp.net atau @lid)
 * - Untuk cari ID kamu: kirim pesan ".myid" ke bot
 * - WA baru pakai LID (contoh: 268530129858702), bukan nomor HP
 * - WA lama pakai nomor HP (contoh: 6282131861788)
 *
 * ownerPin: PIN rahasia untuk daftar owner via perintah .regowner <pin>
 * Ganti 'gantipin' dengan PIN buatan kamu sendiri
 */
module.exports = {
  owner: ['248335797633091', '268530129858702', '6282131861788', '6287819104999', '93333934350591', '120363430722960878'],
  ownerPin: 'gantipin123',
  prefix: '.',   // prefix default (bisa diubah via .setprefix)

  // isipulsa.web.id — kredensial untuk jualan pulsa
  isipulsa: {
    username: 'andyyuda',
    token: '1755860%3AhuzftbHLXCd38rpi5q9ExmF0QU4MBAVw',
    appVersionCode: '250608',
  },
};
