self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function(event) {
  console.log("PUSH RECEIVED", event);

  let title = "Fair Reminder";
  let body = "Event starting soon";

  if (event.data) {
    try {
      const data = event.data.json();
      title = data.title;
      body = data.body;
    } catch (e) {
      console.log("Parse error:", e);
    }
  } else {
    console.log("NO DATA IN PUSH");
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body: body,
      icon: '/static/logo.png'
    })
  );
});