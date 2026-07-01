/**
 * 鼠鼠和笔笔 · Service Worker
 * 浏览器离线推送 — 切后台/锁屏也能收到通知
 * v10.0
 */
const CACHE_NAME = 'shushu-bibi-v10.0';
const API_BASE = 'https://ws.shushu-bibi.cn';

// === Install: pre-cache critical assets ===
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  self.skipWaiting();
});

// === Activate: clean old caches ===
self.addEventListener('activate', (event) => {
  console.log('[SW] Activated');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

// === Push Notification ===
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || '鼠鼠和笔笔';
    const options = {
      body: data.body || '',
      icon: data.icon || '/favicon.ico',
      badge: data.badge || '/favicon.ico',
      data: data.data || {},
      tag: data.tag || 'shushu-bibi-notification',
      requireInteraction: data.requireInteraction || false,
      vibrate: [200, 100, 200],
      actions: data.actions || [],
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (e) {
    // Plain text notification fallback
    event.waitUntil(
      self.registration.showNotification('鼠鼠和笔笔', {
        body: event.data.text(),
        icon: '/favicon.ico',
        badge: '/favicon.ico',
      })
    );
  }
});

// === Notification Click ===
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || 'https://shushu-bibi.cn';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // If a tab is already open, focus it
      for (const client of clientList) {
        if (client.url.includes('shushu-bibi') && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// === Fetch: cache strategy ===
self.addEventListener('fetch', (event) => {
  // Skip API calls and WebSocket
  if (event.request.url.includes('/api/') || event.request.url.includes('/ws')) {
    return;
  }
  if (event.request.url.includes('chrome-extension')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, clone);
          });
        }
        return response;
      });
    })
  );
});
