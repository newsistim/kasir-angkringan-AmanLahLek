/* ==========================================================================
   AMANLAHLEK UNIFIED SERVICE WORKER (PWA CACHE + FIREBASE PUSH NOTIFICATIONS)
   Support Android Chrome/Edge & iOS 16.4+ Safari PWA (Add to Home Screen)
   ========================================================================== */

var CACHE_VERSION = "amanlahlek-pwa-v1";
var CORE_ASSETS = [
  "./",
  "./index.html",
  "./kasir.html",
  "./manifest.json",
  "./manifest-kasir.json",
  "./firebase-config.js",
  "./pwa-firebase.js",
  "./logo.jpg",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png"
];
var OPTIONAL_ASSETS = [
  "./QRIS.jpg",
  "./notif.mp3",
  "./Notif%20Chat.mp3"
];

importScripts("./firebase-config.js");

if (typeof self.isAmanLahLekFirebaseConfigured === "function" && self.isAmanLahLekFirebaseConfigured()) {
  try {
    importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
    importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");
    firebase.initializeApp(self.AMANLAHLEK_FIREBASE_CONFIG);
    var messaging = firebase.messaging();

    messaging.onBackgroundMessage(function (payload) {
      var notif = (payload && payload.notification) || {};
      var data = (payload && payload.data) || {};
      var title = notif.title || data.title || "AmanLahLek Coffee Angkringan";
      var body = notif.body || data.body || "Ada pembaruan baru.";
      var targetUrl = data.url || "./kasir.html";
      var tag = data.tag || ("amanlahlek-" + Date.now());

      var options = {
        body: body,
        icon: "./icon-192.png",
        badge: "./icon-192.png",
        tag: tag,
        renotify: true,
        vibrate: [220, 100, 220],
        data: {
          url: targetUrl,
          type: data.type || "general",
          sessionId: data.sessionId || ""
        }
      };

      return self.registration.showNotification(title, options);
    });
  } catch (err) {
    // Jika SDK gagal dimuat saat offline, cache PWA tetap berjalan normal
  }
}

self.addEventListener("install", function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then(function (cache) {
      return cache.addAll(CORE_ASSETS).then(function () {
        return Promise.all(
          OPTIONAL_ASSETS.map(function (url) {
            return cache.add(url).catch(function () {});
          })
        );
      });
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (key) {
          if (key !== CACHE_VERSION) {
            return caches.delete(key);
          }
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;

  var url = req.url || "";
  // Jangan cache API Google Apps Script / Firebase / Google Fonts dinamis
  if (
    url.indexOf("script.google.com") !== -1 ||
    url.indexOf("script.googleusercontent.com") !== -1 ||
    url.indexOf("fcm.googleapis.com") !== -1 ||
    url.indexOf("firebaseinstallations.googleapis.com") !== -1
  ) {
    return;
  }

  var isSameOrigin = url.indexOf(self.location.origin) === 0;
  if (!isSameOrigin) return;

  var isStaticMedia = /\.(jpg|jpeg|png|webp|svg|mp3|ico)(\?.*)?$/i.test(url);

  if (isStaticMedia) {
    // Cache-first untuk logo, ikon, QRIS, dan audio notifikasi agar instan
    event.respondWith(
      caches.match(req).then(function (cached) {
        if (cached) return cached;
        return fetch(req).then(function (res) {
          if (res && res.status === 200) {
            var copy = res.clone();
            caches.open(CACHE_VERSION).then(function (cache) {
              cache.put(req, copy);
            });
          }
          return res;
        });
      })
    );
    return;
  }

  // Network-first dengan fallback cache untuk HTML/JS/JSON agar update selalu segar
  event.respondWith(
    fetch(req)
      .then(function (res) {
        if (res && res.status === 200) {
          var copy = res.clone();
          caches.open(CACHE_VERSION).then(function (cache) {
            cache.put(req, copy);
          });
        }
        return res;
      })
      .catch(function () {
        return caches.match(req).then(function (cached) {
          return cached || caches.match("./index.html");
        });
      })
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  var notifData = (event.notification && event.notification.data) || {};
  var targetPath = notifData.url || "./kasir.html";
  var targetUrl = new URL(targetPath, self.registration.scope).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        var samePage =
          (targetUrl.indexOf("kasir.html") !== -1 && client.url.indexOf("kasir.html") !== -1) ||
          (targetUrl.indexOf("index.html") !== -1 && client.url.indexOf("kasir.html") === -1);
        if (samePage && "focus" in client) {
          if (notifData.type) {
            client.postMessage({
              source: "amanlahlek-push",
              type: notifData.type,
              sessionId: notifData.sessionId || ""
            });
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
