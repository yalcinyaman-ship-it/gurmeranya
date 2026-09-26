// Vercel fonksiyonu: maps.app.goo.gl kısa linkini uzun Google Maps linkine çevirir.
export default async function handler(req, res) {
  let u = (req.query && req.query.u) || '';
  try {
    for (let i = 0; i < 5; i++) {
      const host = new URL(u).hostname;
      if (!/(^|\.)goo\.gl$|(^|\.)google\.[a-z.]+$/.test(host)) return res.status(400).json({ error: 'izinsiz adres' });
      if (!/goo\.gl$/.test(host) && /\/maps\/(place|search|dir)|[?&]q=/.test(u)) break;
      const r = await fetch(u, { redirect: 'manual', headers: { 'User-Agent': 'Mozilla/5.0' } });
      const loc = r.headers.get('location');
      if (!loc) break;
      u = new URL(loc, u).href;
    }
    res.setHeader('Cache-Control', 's-maxage=86400');
    return res.status(200).json({ url: u });
  } catch (e) {
    return res.status(400).json({ error: String(e.message || e) });
  }
}
