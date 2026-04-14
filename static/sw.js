
self.addEventListener('install',e=>{
 e.waitUntil(caches.open('v2').then(c=>c.addAll(['/','/static/styles.css','/static/app.js'])));
});
self.addEventListener('fetch',e=>{
 e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});
