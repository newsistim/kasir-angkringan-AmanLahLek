/* ==========================================================================
   KONFIGURASI FIREBASE AMANLAHLEK (ISI SEKALI UNTUK SEMUA HALAMAN & SW)
   ==========================================================================
   Cara mendapatkan nilai di bawah:
   1. Buka https://console.firebase.google.com/ -> Project Settings -> General -> Your apps (Web App).
   2. Salin apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId.
   3. Buka tab Cloud Messaging -> Web Push certificates -> Generate key pair -> salin ke VAPID_KEY.
   ========================================================================== */

self.AMANLAHLEK_FIREBASE_CONFIG = {
  apiKey: "ISI_API_KEY_FIREBASE_ANDA",
  authDomain: "ISI_PROJECT_ID.firebaseapp.com",
  projectId: "ISI_PROJECT_ID",
  storageBucket: "ISI_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "ISI_MESSAGING_SENDER_ID",
  appId: "ISI_APP_ID"
};

self.AMANLAHLEK_VAPID_KEY = "ISI_WEB_PUSH_VAPID_KEY_ANDA";

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
