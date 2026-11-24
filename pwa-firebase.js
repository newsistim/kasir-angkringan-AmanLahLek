/* ==========================================================================
   AMANLAHLEK PWA INSTALLER & FIREBASE WEB PUSH CLIENT (PURE ES5)
   Aman di iPad/iOS versi lama (iOS 9.3.5+) karena menggunakan feature-detection
   dan lazy-loading SDK Firebase hanya pada browser yang mendukung Web Push.
   ========================================================================== */

(function () {
  var PWA_TOKEN_STORAGE_KEY = "amanlahlek_fcm_token_v1";
  var deferredInstallPrompt = null;
  var swRegistrationRef = null;
  var firebaseSdkLoaded = false;
  var firebaseMessagingInstance = null;
  var pwaOptions = {
    role: "pelanggan",
    installBtnId: "pwa-install-btn",
    pushBtnId: "pwa-push-btn",
    iosModalId: "ios-install-modal",
    getNama: function () { return ""; },
    getIdentifier: function () { return ""; },
    onForegroundPush: null
  };

  function isIOSDevice() {
    var ua = navigator.userAgent || "";
    return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }

  function isStandaloneMode() {
    if (window.navigator && window.navigator.standalone === true) return true;
    if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) return true;
    return false;
  }

  function supportsWebPush() {
    return (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window &&
      typeof Promise === "function"
    );
  }

  function showToastMsg(msg) {
    if (typeof window.tampilkanToast === "function") {
      window.tampilkanToast(msg);
    } else {
      try { alert(msg); } catch (e) {}
    }
  }

  function updateInstallButtonUI() {
    var btn = document.getElementById(pwaOptions.installBtnId);
    if (!btn) return;
    if (isStandaloneMode()) {
      btn.style.display = "none";
      return;
    }
    if (deferredInstallPrompt || isIOSDevice()) {
      btn.style.display = "inline-flex";
    }
  }

  function updatePushButtonUI(statusText, isActive) {
    var btn = document.getElementById(pwaOptions.pushBtnId);
    if (!btn) return;
    if (!supportsWebPush()) {
      btn.style.display = "none";
      return;
    }
    btn.style.display = "inline-flex";
    if (statusText) {
      btn.innerText = statusText;
    }
    if (isActive) {
      btn.classList.add("push-active");
      btn.classList.remove("muted");
    } else {
      btn.classList.remove("push-active");
    }
  }

  function loadScriptOnce(src, onLoad, onError) {
    var s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = onLoad;
    s.onerror = onError;
    document.head.appendChild(s);
  }

  function ensureFirebaseSdk(callback) {
    if (firebaseSdkLoaded && window.firebase && firebase.messaging) {
      callback(true);
      return;
    }
    loadScriptOnce(
      "https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js",
      function () {
        loadScriptOnce(
          "https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js",
          function () {
            firebaseSdkLoaded = true;
            callback(true);
          },
          function () { callback(false); }
        );
      },
      function () { callback(false); }
    );
  }

  function registerServiceWorker(callback) {
    if (!("serviceWorker" in navigator)) {
      if (callback) callback(null);
      return;
    }
    if (swRegistrationRef) {
      if (callback) callback(swRegistrationRef);
      return;
    }
    navigator.serviceWorker
      .register("./sw.js", { scope: "./" })
      .then(function (reg) {
        swRegistrationRef = reg;
        if (callback) callback(reg);
      })
      .catch(function () {
        if (callback) callback(null);
      });
  }

  function getDeviceLabel() {
    var ua = navigator.userAgent || "";
    var os = isIOSDevice() ? "iOS" : /Android/i.test(ua) ? "Android" : "Desktop";
    var mode = isStandaloneMode() ? "PWA" : "Browser";
    return os + " (" + mode + ")";
  }

  function saveTokenToServer(token, silent) {
    if (!token || typeof window.API_URL === "undefined") return;
    try { localStorage.setItem(PWA_TOKEN_STORAGE_KEY, token); } catch (e) {}
    var nama = typeof pwaOptions.getNama === "function" ? pwaOptions.getNama() : "";
    var identifier = typeof pwaOptions.getIdentifier === "function" ? pwaOptions.getIdentifier() : "";
    fetch(window.API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "simpanFcmToken",
        token: token,
        role: pwaOptions.role,
        nama: nama || (pwaOptions.role === "kasir" ? "Kasir" : "Pelanggan"),
        identifier: identifier || "",
        device: getDeviceLabel()
      })
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!silent && data && data.success) {
          showToastMsg("🔔 Push Notification aktif! Notifikasi akan masuk meski layar terkunci.");
        }
      })
      .catch(function () {});
  }

  function initFirebaseMessagingAndToken(silent) {
    if (!supportsWebPush()) return;
    if (typeof window.isAmanLahLekFirebaseConfigured !== "function" || !window.isAmanLahLekFirebaseConfigured()) {
      if (!silent) {
        showToastMsg("⚙️ Konfigurasi Firebase belum diisi di file firebase-config.js.");
      }
      updatePushButtonUI(pwaOptions.role === "kasir" ? "🔔 Push: Setup" : "🔔 Notif", false);
      return;
    }
    ensureFirebaseSdk(function (ok) {
      if (!ok) {
        if (!silent) showToastMsg("⚠️ Gagal memuat Firebase SDK. Cek koneksi internet.");
        return;
      }
      registerServiceWorker(function (reg) {
        if (!reg) {
          if (!silent) showToastMsg("⚠️ Service Worker belum siap. Pastikan dibuka lewat HTTPS.");
          return;
        }
        try {
          if (!firebase.apps || firebase.apps.length === 0) {
            firebase.initializeApp(window.AMANLAHLEK_FIREBASE_CONFIG);
          }
          if (!firebaseMessagingInstance) {
            firebaseMessagingInstance = firebase.messaging();
            firebaseMessagingInstance.onMessage(function (payload) {
              var notif = (payload && payload.notification) || {};
              var data = (payload && payload.data) || {};
              if (typeof pwaOptions.onForegroundPush === "function") {
                pwaOptions.onForegroundPush(payload, notif, data);
              } else if (notif.title || notif.body) {
                showToastMsg((notif.title ? notif.title + ": " : "") + (notif.body || ""));
              }
            });
          }

          firebaseMessagingInstance
            .getToken({
              vapidKey: window.AMANLAHLEK_VAPID_KEY,
              serviceWorkerRegistration: reg
            })
            .then(function (token) {
              if (token) {
                updatePushButtonUI(pwaOptions.role === "kasir" ? "🔔 Push: Aktif" : "🔔 Notif Aktif", true);
                saveTokenToServer(token, silent);
              } else {
                updatePushButtonUI(pwaOptions.role === "kasir" ? "🔔 Push: Mati" : "🔔 Aktifkan Notif", false);
              }
            })
            .catch(function () {
              if (!silent) showToastMsg("⚠️ Gagal mengambil token Firebase. Cek VAPID Key & HTTPS.");
              updatePushButtonUI(pwaOptions.role === "kasir" ? "🔔 Push: Mati" : "🔔 Aktifkan Notif", false);
            });
        } catch (err) {
          if (!silent) showToastMsg("⚠️ Error Firebase Messaging: " + err.message);
        }
      });
    });
  }

  window.initAmanLahLekPWA = function (opts) {
    if (opts) {
      for (var k in opts) {
        if (Object.prototype.hasOwnProperty.call(opts, k)) {
          pwaOptions[k] = opts[k];
        }
      }
    }

    // Daftarkan Service Worker untuk caching PWA (Android & iOS modern)
    registerServiceWorker(function () {});

    // Dengarkan pesan dari Service Worker saat user klik notifikasi
    if ("serviceWorker" in navigator && navigator.serviceWorker.addEventListener) {
      navigator.serviceWorker.addEventListener("message", function (event) {
        var msg = event && event.data;
        if (msg && msg.source === "amanlahlek-push") {
          if (msg.type === "chat" && typeof window.bukaModalLiveChat === "function") {
            window.bukaModalLiveChat(msg.sessionId || "");
          } else if (msg.type === "order" && typeof window.scrollKeBagian === "function") {
            window.scrollKeBagian("riwayat");
            if (typeof window.sinkronPesananDariServer === "function") {
              window.sinkronPesananDariServer();
            }
          }
        }
      });
    }

    // Tangkap event install PWA di Android / Chrome / Edge
    window.addEventListener("beforeinstallprompt", function (e) {
      e.preventDefault();
      deferredInstallPrompt = e;
      updateInstallButtonUI();
    });

    window.addEventListener("appinstalled", function () {
      deferredInstallPrompt = null;
      updateInstallButtonUI();
      showToastMsg("✅ Aplikasi AmanLahLek berhasil dipasang di layar utama!");
    });

    updateInstallButtonUI();

    if (supportsWebPush()) {
      if (Notification.permission === "granted") {
        updatePushButtonUI(pwaOptions.role === "kasir" ? "🔔 Push: Aktif" : "🔔 Notif Aktif", true);
        initFirebaseMessagingAndToken(true);
      } else {
        updatePushButtonUI(pwaOptions.role === "kasir" ? "🔔 Push: Mati" : "🔔 Aktifkan Notif", false);
      }
    } else {
      updatePushButtonUI("", false);
    }
  };

  window.triggerInstallPWA = function () {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      deferredInstallPrompt.userChoice.then(function () {
        deferredInstallPrompt = null;
        updateInstallButtonUI();
      });
      return;
    }
    if (isIOSDevice()) {
      var modal = document.getElementById(pwaOptions.iosModalId);
      if (modal) {
        modal.classList.add("show");
      } else {
        showToastMsg("Di Safari iOS: ketuk ikon Share (↑) lalu pilih 'Add to Home Screen'.");
      }
      return;
    }
    showToastMsg("Buka menu browser (⋮) lalu pilih 'Install app' / 'Tambahkan ke layar utama'.");
  };

  window.tutupModalInstallIOS = function () {
    var modal = document.getElementById(pwaOptions.iosModalId);
    if (modal) modal.classList.remove("show");
  };

  window.aktifkanPushNotifikasi = function () {
    if (!supportsWebPush()) {
      if (isIOSDevice() && !isStandaloneMode()) {
        showToastMsg("📱 Di iPhone/iPad (iOS 16.4+), pasang aplikasi ke Layar Utama dulu lewat Safari untuk mengaktifkan Push Notification.");
        window.triggerInstallPWA();
      } else {
        showToastMsg("Browser ini belum mendukung Web Push Notification.");
      }
      return;
    }
    if (typeof window.isAmanLahLekFirebaseConfigured !== "function" || !window.isAmanLahLekFirebaseConfigured()) {
      showToastMsg("⚙️ Isi konfigurasi Firebase terlebih dahulu di file firebase-config.js.");
      return;
    }
    Notification.requestPermission().then(function (permission) {
      if (permission === "granted") {
        initFirebaseMessagingAndToken(false);
      } else if (permission === "denied") {
        showToastMsg("🔕 Izin notifikasi diblokir. Aktifkan di Pengaturan Browser/HP Anda.");
        updatePushButtonUI(pwaOptions.role === "kasir" ? "🔕 Push: Diblokir" : "🔕 Diblokir", false);
      }
    });
  };

  window.sinkronTokenPushSekarang = function () {
    if (supportsWebPush() && Notification.permission === "granted") {
      initFirebaseMessagingAndToken(true);
    }
  };

  window.hapusTokenPushSaatLogout = function () {
    try {
      var token = localStorage.getItem(PWA_TOKEN_STORAGE_KEY);
      if (token && typeof window.API_URL !== "undefined") {
        fetch(window.API_URL, {
          method: "POST",
          body: JSON.stringify({ action: "hapusFcmToken", token: token })
        }).catch(function () {});
      }
    } catch (e) {}
  };
})();
