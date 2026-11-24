/* ==========================================================================
   KONFIGURASI FIREBASE AMANLAHLEK (ISI SEKALI UNTUK SEMUA HALAMAN & SW)
   ==========================================================================
   Cara mendapatkan nilai di bawah:
   1. Buka https://console.firebase.google.com/ -> Project Settings -> General -> Your apps (Web App).
   2. Salin apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId.
   3. Buka tab Cloud Messaging -> Web Push certificates -> Generate key pair -> salin ke VAPID_KEY.
   ========================================================================== */

self.AMANLAHLEK_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDqp1jMK4loO_FXtNAJEbOP_XwgRZOQXFQ",
  authDomain: "amanlahlekapp.firebaseapp.com",
  projectId: "amanlahlekapp",
  storageBucket: "amanlahlekapp.firebasestorage.app",
  messagingSenderId: "1038963867214",
  appId: "1:1038963867214:web:57fba9d6081798c5038d1f"
};

self.AMANLAHLEK_VAPID_KEY = "BDr8vgF_0g_RyFa3Hnt3v4NKXn_C3n3QmGTH0SRvU6UXowQAlUOJwP2FIrCi7QgWqtf0ypRH_1UyNUq0zWZbWow";

self.isAmanLahLekFirebaseConfigured = function () {
  var cfg = self.AMANLAHLEK_FIREBASE_CONFIG || {};
  var vapid = String(self.AMANLAHLEK_VAPID_KEY || "");
  if (!cfg.apiKey || cfg.apiKey.indexOf("ISI_") === 0) return false;
  if (!cfg.projectId || cfg.projectId.indexOf("ISI_") === 0) return false;
  if (!cfg.messagingSenderId || cfg.messagingSenderId.indexOf("ISI_") === 0) return false;
  if (!cfg.appId || cfg.appId.indexOf("ISI_") === 0) return false;
  if (!vapid || vapid.indexOf("ISI_") === 0) return false;
  return true;
};
