// Service worker del Localitzador Solsó.
// Xarxa primer (sempre l'última versió); si no hi ha cobertura o triga més de 4 s, còpia desada.
const CACHE = 'solso-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

function xarxaPrimer(req) {
  return new Promise(resolve => {
    let fet = false;
    const acaba = r => { if (!fet) { fet = true; resolve(r); } };
    const deCache = () => caches.match(req).then(c => { if (c) acaba(c); return c; });
    const t = setTimeout(deCache, 4000);
    fetch(req).then(res => {
      clearTimeout(t);
      if (res && (res.ok || res.type === 'opaque')) {
        const copia = res.clone();
        caches.open(CACHE).then(c => c.put(req, copia));
      }
      acaba(res);
    }).catch(() => {
      clearTimeout(t);
      deCache().then(c => { if (!c) acaba(Response.error()); });
    });
  });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  // Només la pròpia pàgina, el SDK de Firebase i les fonts. La base de dades no es toca.
  const propi = u.origin === self.location.origin;
  const extern = u.hostname === 'www.gstatic.com' || u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com';
  // La foto aèria pesa i no canvia: es serveix de la còpia desada si n'hi ha
  if (propi && /\.(jpg|png)$/.test(u.pathname)) {
    e.respondWith(caches.match(req).then(c => c || xarxaPrimer(req)));
    return;
  }
  if (propi || extern) e.respondWith(xarxaPrimer(req));
});
