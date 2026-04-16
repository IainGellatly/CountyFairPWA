// ✅ ADD THESE LINES AT THE VERY TOP
self.addEventListener('install', event => {
  console.log("SW installing");
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log("SW activating");
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch',e=>{})

self.addEventListener('push', function(event) {
  const data = event.data.json();

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/static/logo.png'
    })
  );
});

