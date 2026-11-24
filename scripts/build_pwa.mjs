import fs from 'node:fs';

const unregisterWorker = `/* Self-unregistering Service Worker that purges all caches and stays inactive */
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then(clients => {
        for (const client of clients) {
          if (client.url && 'navigate' in client) {
            client.navigate(client.url);
          }
        }
      })
  );
});
`;

if (fs.existsSync('dist')) {
  fs.writeFileSync('dist/sw.js', unregisterWorker);
}
if (fs.existsSync('public')) {
  fs.writeFileSync('public/sw.js', unregisterWorker);
}
console.log('Service worker configured to self-destruct and purge caches on all client devices.');
