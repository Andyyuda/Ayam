/**
 * Cloudflare Worker — Proxy XL/AXIS Package Checker
 * Deploy ke Cloudflare Workers, lalu pakai URL worker ini di bot
 *
 * Endpoint:
 *   GET  /cek?number=087812345678
 *   GET  /cek?number=6287812345678
 */

const UPSTREAM = 'https://xl-ku.my.id/end.php';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    // Health check
    if (url.pathname === '/' || url.pathname === '/health') {
      return json({ status: 'ok', service: 'XL Package Checker Worker' });
    }

    // Cek paket: GET /cek?number=08xxx
    if (url.pathname === '/cek') {
      let number = url.searchParams.get('number') || '';
      number = number.replace(/[\s\-]/g, '');
      if (!number) return json({ success: false, message: 'Parameter number wajib diisi' }, 400);

      // Normalise: 08xx → 628xx
      if (number.startsWith('0')) number = '62' + number.slice(1);

      try {
        const upstreamUrl = `${UPSTREAM}?check=package&number=${encodeURIComponent(number)}&version=2`;
        const res = await fetch(upstreamUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124',
            'Referer'   : 'https://xl-ku.my.id/',
            'Origin'    : 'https://xl-ku.my.id',
          },
          cf: { cacheTtl: 1800, cacheEverything: true }, // cache 30 menit di CF edge
        });

        const data = await res.json();
        return json(data);
      } catch (e) {
        return json({ success: false, message: 'Gagal menghubungi upstream: ' + e.message }, 502);
      }
    }

    return json({ success: false, message: 'Endpoint tidak ditemukan' }, 404);
  },
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS });
}
