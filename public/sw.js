self.addEventListener('push', function (event) {
  if (event.data) {
    try {
      const payload = event.data.json();
      const title = payload.title || 'Daily Log Reminder 📝';
      const options = {
        body: payload.body || 'Take a minute to complete your habit tracker!',
        icon: payload.icon || '/app_icon.jpg',
        badge: payload.badge || '/app_icon.jpg',
        data: {
          url: payload.url || '/'
        },
        tag: 'daily-reminder',
        renotify: true,
        // Actionable notification buttons for quick lockscreen interaction
        actions: [
          { action: 'open_tracker', title: 'Open Tracker 📝' },
          { action: 'view_history', title: 'View History 📅' }
        ]
      };
      
      event.waitUntil(
        self.registration.showNotification(title, options)
      );
    } catch (e) {
      const text = event.data.text();
      event.waitUntil(
        self.registration.showNotification('Daily Log Reminder 📝', {
          body: text || 'Take a minute to complete your habit tracker!',
          icon: '/app_icon.jpg',
          badge: '/app_icon.jpg',
          data: { url: '/' },
          actions: [
            { action: 'open_tracker', title: 'Open Tracker 📝' }
          ]
        })
      );
    }
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  
  let targetPath = '/';
  if (event.action === 'view_history') {
    targetPath = '/history';
  }

  const urlToOpen = new URL(targetPath, self.location.origin).href;
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function (windowClients) {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
