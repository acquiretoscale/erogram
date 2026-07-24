/* v=6 — sale push: color wordmark icon + white badge for Android status bar */
const NOTIFICATION_ICON = '/icons/notification-icon.png?v=6';
const NOTIFICATION_BADGE = '/icons/notification-badge.png?v=6';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(names.map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title || 'Erogram', {
        body: data.body || '',
        icon: data.icon || NOTIFICATION_ICON,
        badge: data.badge || NOTIFICATION_BADGE,
        tag: data.tag || 'erogram-notification',
        data: data.data || {},
        vibrate: [200, 100, 200],
        requireInteraction: true,
      })
    );
  } catch (e) {
    console.error('[SW] Push parse error:', e);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
