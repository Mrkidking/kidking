var CACHE = "mood-diary-v2";
var STATIC = ["/","/static/style.css","/static/app.js","/static/manifest.json"];

self.addEventListener("install", function(e) {
    e.waitUntil(caches.open(CACHE).then(function(c) { return c.addAll(STATIC); }));
    self.skipWaiting();
});

self.addEventListener("activate", function(e) {
    e.waitUntil(caches.keys().then(function(keys) {
        return Promise.all(keys.filter(function(k) { return k !== CACHE; }).map(function(k) { return caches.delete(k); }));
    }));
    self.clients.claim();
});

self.addEventListener("fetch", function(e) {
    if (e.request.method !== "GET") return;
    // API calls: network first, no cache
    if (e.request.url.includes("/api/")) {
        e.respondWith(fetch(e.request).catch(function() {
            return new Response(JSON.stringify({error:"离线状态"}), {status:503,headers:{"Content-Type":"application/json"}});
        }));
        return;
    }
    // Static assets: cache first, then network
    e.respondWith(
        caches.match(e.request).then(function(r) {
            return r || fetch(e.request).then(function(res) {
                if (res.ok && e.request.url.startsWith(self.location.origin)) {
                    var clone = res.clone();
                    caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
                }
                return res;
            });
        })
    );
});
