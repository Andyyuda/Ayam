module.exports = {
  name: '.addproduk',
  command: ['.addproduk'],
  execute: async (conn, sender, args, msg, text) => {
    global.userState[sender] = {
      status: '.addproduk',
      step: 'nama'
    };
    await conn.sendMessage(sender, { text: '🛒 Masukkan *nama produk*:' }, { quoted: msg });
  },

  handleSession: async (conn, sender, text, msg) => {
    const session = global.userState[sender];

    if (session.status !== '.addproduk') return;

    if (session.step === 'nama') {
      session.nama = text;
      session.step = 'harga';
      return await conn.sendMessage(sender, { text: '💰 Masukkan *harga produk* (angka saja):' }, { quoted: msg });
    }

    if (session.step === 'harga') {
      const harga = parseInt(text);
      if (isNaN(harga)) {
        return await conn.sendMessage(sender, { text: '⚠️ Harga tidak valid. Masukkan angka saja.' }, { quoted: msg });
      }
      session.harga = harga;
      session.step = 'stok';
      return await conn.sendMessage(sender, { text: '📦 Masukkan *stok produk* (jumlah angka):' }, { quoted: msg });
    }

    if (session.step === 'stok') {
      const stok = parseInt(text);
      if (isNaN(stok)) {
        return await conn.sendMessage(sender, { text: '⚠️ Stok tidak valid. Masukkan angka saja.' }, { quoted: msg });
      }

      session.stok = stok;

      // Simpan hasil
      const produk = {
        nama: session.nama,
        harga: session.harga,
        stok: session.stok
      };

      // Simpan ke file (opsional)
      const fs = require('fs');
      const path = './data_produk.json';
      let data = [];
      if (fs.existsSync(path)) {
        data = JSON.parse(fs.readFileSync(path));
      }
      data.push(produk);
      fs.writeFileSync(path, JSON.stringify(data, null, 2));

      await conn.sendMessage(sender, {
        text: `✅ Produk berhasil ditambahkan:\n\n📦 *${produk.nama}*\n💰 Harga: Rp${produk.harga}\n📦 Stok: ${produk.stok}`
      }, { quoted: msg });

      delete global.userState[sender];
    }
  }
};