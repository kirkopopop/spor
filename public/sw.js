// tur service worker: keeps the app's pages and code on the phone so it opens
// without signal. Trip data itself lives in IndexedDB (lib/store.ts), not here.
const VERSION = "tur-v1";
const SHELL = `${VERSION}-shell`;
const STATIC = `${VERSION}-static`;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const cacheable = (res) => res && res.ok && res.type === "basic" && !res.redirected;

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/") || url.pathname.startsWith("/oauth/")) return;

  // Built code is fingerprinted: cache forever.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(STATIC).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (cacheable(res)) cache.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  // Pages: fresh when online, last copy when not. Every trip page shares one shell
  // (the trip comes from IndexedDB), so any cached trip page can stand in for another.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (cacheable(res)) caches.open(SHELL).then((c) => c.put(req, res.clone()));
          return res;
        })
        .catch(async () => {
          const cache = await caches.open(SHELL);
          const exact = await cache.match(req, { ignoreSearch: true });
          if (exact) return exact;
          if (url.pathname.startsWith("/trips/")) {
            const anyTrip = (await cache.keys()).find((k) => new URL(k.url).pathname.startsWith("/trips/"));
            if (anyTrip) return cache.match(anyTrip);
          }
          return (await cache.match("/")) || Response.error();
        }),
    );
    return;
  }

  // Icons, fonts, manifest: serve the copy, refresh in the background.
  event.respondWith(
    caches.open(STATIC).then(async (cache) => {
      const hit = await cache.match(req);
      const refresh = fetch(req)
        .then((res) => {
          if (cacheable(res)) cache.put(req, res.clone());
          return res;
        })
        .catch(() => hit);
      return hit || refresh;
    }),
  );
});
