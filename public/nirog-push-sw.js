/* Nirog browser-push foundation: no clinical payload is stored or interpreted in the worker. */
self.addEventListener('push', (event) => {
  const notification = {
    body: 'A care notification is ready in Nirog.',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: { url: '/care-plan' },
  };
  event.waitUntil(self.registration.showNotification('Nirog reminder', notification));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || '/care-plan'));
});
