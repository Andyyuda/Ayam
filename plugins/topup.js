const axios = require('axios').default;
const crypto = require('crypto');

const QRIS_STATIC =
  '00020101021126610014COM.GO-JEK.WWW01189360091439528460310210G9528460310303UMI51440014ID.CO.QRIS.WWW0215ID10264958347190303UMI5204481453033605802ID5925ANDI YUDA KURNIAWAN, Puls6006BLITAR61056613662070703A0163046096';

const TOKEN =
  'eyJhbGciOiJkaXIiLCJjdHkiOiJKV1QiLCJlbmMiOiJBMTI4R0NNIiwidHlwIjoiSldUIiwiemlwIjoiREVGIn0..Xl2uWm84jbrp3m22.WSsfGKP-jRTjpWM5YyaaZXrgkP_M3n_cstNtKyZytW0LgVernZA69nNujX7R8reOmqsP76WfbQcuazyr-I4wWUViV3B3Fgl89gTL-3xsAnlO18XbJvPO19u3jEt9yhexdn1lIHdlS8puFZ9v5K7owvZ4Ys9k25t8xr-QW4SAO0wKYYitdhpmCaHytM9sVDm1CC6FcZXBGWJNyJ_1UwM8sj1d0S1uffQPU0N5e0_wpmCp3SRdXclNDHAFbmrKd9vpVoxs2_PYsNSTqsghoba6rSBGXPT9f0asmfqna5hkBaZbze8h04ZsXE5ujsxFVRQoEgAmkxfUfLElL1yvTh8bHMjNQCaweHyC0XRaN31Gpwe8OZF1j0zRxDfwccl1PmYloh5c9MfDxfbBGEdqBWDX5iWl62KbeDhWGfaFm1e1x-t6Cize23Qj2EFzM_VxX1NtnAO4nh2VZHVKfojaFR3gHiYukrJtI5Xjp9Tx64RoFwes8gdkNdW4wdR-xXYN3aRMB49flhwMjhKvHu5ODcjqRrOyJpbOuCSciMPPvO39KbkzRW0RKSiHPPBwP1ohk8qeoDYrBkmL9HqJ9BHpEmIFUoBsxNHkKcYqihuJ_m_92GktHToKbmhlAg1vwY1GKwqnRxVIMPKRTYRBz39h_i74pfsP5BluhUxODbjjpAWPSWnVGeyaLDzjKkd0yTbOoNvYbgsAAlYxyPBNOAnMxzQw4Cp9swPJH-o73FbK4nXpgo8lDAXhSussQbLvJ20QF46WmUOx55JTybKLA_IwQmdZ3nom3wZIEtnSwAvdb9YGdExOw_fhgco54pMLHqrutat1u14_qaF4eqI7BZqwLY8auKFjB-NfqAMvJ3zNkz680kHjPOVC8qcIhe-TaRtP4SJ4PgzjR3NPna-I2znYSNqo7JRp_XLX47e771TRreWIFQPVtgr9fvAW1ZkboWEPuABpywCC4s0xhDeCmLgJF6XOPVEiK7Tgotlq_WcIZJnVbVy7mFX8juhGqGCfhHP08uaEBBnnM2xFehEhSwlW40kgAj7mLVEWKgZqAxTSf2V8ZZOrZOKjRUur77UF_ww_MaVFXMQ7pc3F-AZzUvKnd8UCrmjFG6dsFsfPXWAtYI8kW-TlrCivZOgGProJ18uEA1PK9l1JwzK5JRCZgl0KDRfPm9dvoy1UfO2uViuTt7zEl-LDzao_C_EgFoErZh4zTjF3r0p-ciyz2h9EAKJjkaCV3Hm8ZRTq-vW9yyWMJTFVLnjW2z2Zg0D6JSR0_483R7hfl_v5O6ow5HQeJViy7ABhHAk-YFQQk6uebGt4nUuGoL6bOzHbYGaEIbDDnln-EdHC3kf4ue-6m9XMTPEXZ4ZSt-vc1gRDYgXg7oNIAZb05LIedPYh0JSepbwqk8zwzMjJjZ8piNiIKfyyg9NlDuD2Vt-Q2EvsyS3i5HCXr83Mm_1uafthLnutxYFosswIoH382BiV0J16np62xKUaHjYt9FXVDvzxT9TrU7X2NOEK6pFMFCko7p1SyYdYC1EXGczXcDICeSjiguA3o01cYkUmOvUhW3wSSpvqiJe83qEJQwworSwu8jrcNltx8pQIXn7TzAUP0O1LyLo3CXPVklaOAiQpuF0OKdSUKK2Fl5ap3xEimDpAEBMS9cfve4QLVW-81nbh9FuQ-uVF9L22OjhJXZ0wHMIVzTO8922JhP5nWmvadPS9Ks1FBQM9P6Dr5UlOJ0gdLH_wagt0a6IvCaA-Dvj48aIqXcTrTRaBGitJtGfVdJsVZn8JhYRH75-3rFtvvZK8OND_BsWX0RiG2onH0SSwUFllMFzvmjAv-dVZ8TU8gZ7EUTA5NHk0BLUlwpGYdh-SDw53sRVF2Q_NNIDnGJ93UwXkRtWdnuzGBxpYLn8g28ojjgMCs5gLEbJxkFa0eWotSwm4VKsbKCY_vSpNHlbvY-3qzk2LGnQk5NdKqCGMJ_0brGGuiOvMtodJ6xU1YWT59vvcj6-gk40UKa63OKasj5rb4rp8Wao1iDynIGw.LhqH4iNGtyxNE_nUA6ChsA';

const MERCHANT_ID = 'G952846031';

// =========================
// CRC16 QRIS
// =========================
function crc16(str) {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

// =========================
// GENERATE QRIS
// =========================
function generateQRIS(qris, nominal) {
  qris = qris.slice(0, -4);
  qris = qris.replace(/54(\d{2})(\d+)/, (match, len, rest) => {
    return rest.substring(parseInt(len, 10));
  });
  const nominalStr = nominal.toString();
  const amount = '54' + nominalStr.length.toString().padStart(2, '0') + nominalStr;
  qris = qris.replace('5802ID', amount + '5802ID');
  return qris + crc16(qris);
}

// =========================
// FORMAT RUPIAH
// =========================
function rupiah(n) {
  return 'Rp' + n.toLocaleString('id-ID');
}

// =========================
// RANDOM FEE (1–300)
// =========================
function feeRandom() {
  return Math.floor(Math.random() * 300) + 1;
}

// =========================
// CEK PAYMENT
// =========================
async function cekPembayaran(total) {
  try {
    const now = new Date();
    const start = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
    const end = now.toISOString();

    const response = await axios({
      method: 'GET',
      url: 'https://api.gojekapi.com/merchant-analytics/v2/merchants/transactions',
      params: {
        from: 0,
        size: 20,
        statuses: 'SETTLEMENT,CAPTURE',
        payment_types: 'QRIS',
        start_time: start,
        end_time: end,
        merchant_ids: MERCHANT_ID
      },
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Authentication-Type': 'go-id',
        'User-Agent': 'Mozilla/5.0',
        Referer: 'https://portal.gofoodmerchant.co.id/',
        Origin: 'https://portal.gofoodmerchant.co.id'
      }
    });

    const trx = response.data?.transactions || [];

    return trx.find(v => {
      const amount = Number(v.gross_amount) / 100;
      const time = new Date(v.transaction_time).getTime();
      const isRecent = Date.now() - time <= 15 * 60 * 1000;
      console.log(`[CEK] ${amount} | total=${total} | cocok=${amount === total} | recent=${isRecent}`);
      return amount === total && v.transaction_status === 'SETTLEMENT' && isRecent;
    }) || null;

  } catch (e) {
    console.log('ERROR CEK:', e.response?.data || e.message);
    return null;
  }
}

// =========================
// MAIN PLUGIN
// =========================
module.exports = {
  name: '.topup',
  command: ['.topup'],

  execute: async (conn, sender, args, msg, text) => {
    // cek kalau masih ada sesi aktif
    if (global.userState[sender]?.status === '.topup') {
      const s = global.userState[sender];
      return conn.sendMessage(sender, {
        text:
`⚠️ Kamu masih punya transaksi aktif!

🆔 TRX ID: ${s.trxid}
💵 Total: ${rupiah(s.total)}

Ketik *batal* untuk membatalkan.`
      }, { quoted: msg });
    }

    const nominal = parseInt(args[0]);
    if (isNaN(nominal) || nominal < 100) {
      return conn.sendMessage(sender, {
        text: '❌ Contoh: .topup 1000\nMinimal topup Rp100.'
      }, { quoted: msg });
    }

    const fee = feeRandom();
    const total = nominal + fee;
    const trxid = crypto.randomBytes(5).toString('hex');

    const qris = generateQRIS(QRIS_STATIC, total);
    const qrImage = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(qris)}`;

    await conn.sendMessage(sender, {
      image: { url: qrImage },
      caption:
`🧾 *TOPUP QRIS*

💰 Nominal: ${rupiah(nominal)}
🪙 Fee: ${rupiah(fee)}
💵 Total: ${rupiah(total)}

🆔 TRX ID: ${trxid}

⏳ Menunggu pembayaran...
⏱️ Expired dalam *10 menit*

Ketik *batal* untuk membatalkan`
    }, { quoted: msg });

    console.log('TOPUP CREATED:', trxid, 'total:', total);

    // simpan sesi
    global.userState[sender] = {
      status: '.topup',
      step: 'waiting',
      trxid,
      total,
      nominal,
      fee
    };

    // =========================
    // CHECK LOOP
    // =========================
    const interval = setInterval(async () => {
      const s = global.userState[sender];
      if (!s || s.status !== '.topup' || s.trxid !== trxid) {
        clearInterval(interval);
        return;
      }

      console.log('CHECKING PAYMENT:', trxid, 'total:', total);
      const ok = await cekPembayaran(total);

      if (ok) {
        clearInterval(interval);
        clearTimeout(global.userState[sender]?._timeout);
        delete global.userState[sender];

        await conn.sendMessage(sender, {
          text:
`✅ *PEMBAYARAN BERHASIL*

💵 Total: ${rupiah(total)}
🆔 TRX ID: ${trxid}`
        }, { quoted: msg });
      }
    }, 8000);

    // =========================
    // EXPIRED — 10 MENIT
    // =========================
    const timeout = setTimeout(() => {
      const s = global.userState[sender];
      if (!s || s.status !== '.topup' || s.trxid !== trxid) return;

      clearInterval(interval);
      delete global.userState[sender];

      conn.sendMessage(sender, {
        text:
`⏰ *TRANSAKSI EXPIRED*

🆔 TRX ID: ${trxid}
💵 Total: ${rupiah(total)}

Silakan buat transaksi baru.`
      }, { quoted: msg });
    }, 10 * 60 * 1000);

    // simpan referensi timer ke sesi supaya bisa dibatalkan
    global.userState[sender]._interval = interval;
    global.userState[sender]._timeout = timeout;
  },

  // =========================
  // HANDLE SESSION
  // =========================
  handleSession: async (conn, sender, text, msg) => {
    const session = global.userState[sender];
    if (!session || session.status !== '.topup') return;

    // BATAL
    if (text.trim().toLowerCase() === 'batal') {
      clearInterval(session._interval);
      clearTimeout(session._timeout);
      const { trxid, total } = session;
      delete global.userState[sender];

      return conn.sendMessage(sender, {
        text:
`🚫 *TRANSAKSI DIBATALKAN*

🆔 TRX ID: ${trxid}
💵 Total: ${rupiah(total)}`
      }, { quoted: msg });
    }

    // pesan lain saat menunggu
    return conn.sendMessage(sender, {
      text:
`⏳ Masih menunggu pembayaran...

💵 Total: ${rupiah(session.total)}
🆔 TRX ID: ${session.trxid}

Ketik *batal* untuk membatalkan.`
    }, { quoted: msg });
  }
};