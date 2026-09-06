# XL Checker — Cloudflare Worker

Proxy untuk cek paket XL/AXIS via xl-ku.my.id

## Deploy

### Via Dashboard (paling mudah)
1. Buka https://dash.cloudflare.com → Workers & Pages → Create Worker
2. Copy isi `worker.js` ke editor
3. Klik Deploy
4. Catat URL worker-mu: `https://xl-checker.<username>.workers.dev`

### Via Wrangler CLI
```bash
npm install -g wrangler
wrangler login
wrangler deploy
```

## Endpoint

### Cek Paket
```
GET https://<worker-url>/cek?number=087812345678
GET https://<worker-url>/cek?number=6287812345678
```

### Response
```json
{
  "success": true,
  "data": {
    "subs_info": {
      "msisdn": "6287812345678",
      "operator": "XL",
      "id_verified": "Sudah",
      "net_type": "4G",
      "tenure": "3 Tahun 2 Bulan",
      "exp_date": "17-05-2026",
      "grace_until": "16-06-2026",
      "volte": { "device": true, "area": false, "simcard": true }
    },
    "package_info": {
      "packages": [
        {
          "name": "Paket Akrab",
          "expiry": "17-05-2026",
          "quotas": [
            { "name": "24jam di semua jaringan", "percent": 44.54, "total": "160GB", "remaining": "71.3GB" }
          ]
        }
      ]
    }
  }
}
```

## Update URL di bot

Setelah deploy, update `botwa/plugins/dompul.js`:
```js
const API_URL = 'https://xl-checker.<username>.workers.dev/cek';
```

Dan ubah cara fetch-nya:
```js
const url = `${API_URL}?number=${nomor}`;
const res = await fetch(url);
```
