/*
 * NepalMBBS.in — self-unregistering service worker.
 *
 * Why this file still exists instead of being deleted:
 * an earlier root-level page (index-1.html, live late June 2026) called
 * navigator.serviceWorker.register('./sw.js'), which registered the CMC Tracker
 * worker at ROOT scope. That worker was cache-first, so every visitor who hit
 * that page still has it installed and is served stale content indefinitely.
 *
 * Deleting sw.js does NOT unregister an already-installed worker — the browser
 * keeps the last known copy. So this replacement worker takes over, purges every
 * cache it created, unregisters itself, and force-reloads open pages once.
 *
 * The current site does not register any service worker. Keep this file in place
 * until it is safe to assume returning visitors from that window have been
 * flushed; removing it earlier re-strands them on the old cached build.
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window' });
    for (const client of clients) {
      client.navigate(client.url).catch(() => {});
    }
  })());
});

// No fetch handler: requests go straight to the network while this worker is
// still alive, so nothing can be served from the old cache.
