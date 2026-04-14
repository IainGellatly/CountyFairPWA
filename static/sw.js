
const CACHE='v3-cache';

self.addEventListener('install',e=>{
 e.waitUntil(caches.open(CACHE).then(c=>c.addAll(['/','/static/app.js','/static/styles.css'])));
});

self.addEventListener('fetch',e=>{
 e.respondWith(
  caches.match(e.request).then(res=>{
    return res || fetch(e.request).then(net=>{
      return caches.open(CACHE).then(c=>{
        c.put(e.request, net.clone());
        return net;
      });
    });
  })
 );
});
