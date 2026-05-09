var CACHE = "mood-diary-v1";
var ASSETS = ["/", "/static/style.css", "/static/app.js"];

self.addEventListener("install", function(e) {
    e.waitUntil(caches.open(CACHE).then(function(c) { return c.addAll(ASSETS); }));
});

self.addEventListener("fetch", function(e) {
    if (e.request.method !== "GET") return;
    e.respondWith(
        caches.match(e.request).then(function(r) {
            return r || fetch(e.request).then(function(res) {
                if (res.ok) { var clone = res.clone(); caches.open(CACHE).then(function(c) { c.put(e.request, clone); }); }
                return res;
            });
        })
    );
});
