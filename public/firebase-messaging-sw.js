importScripts("https://www.gstatic.com/firebasejs/11.6.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging-compat.js");

async function loadFirebaseConfig() {
  const res = await fetch("/api/firebase-public-config", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load firebase public config.");
  return res.json();
}

loadFirebaseConfig()
  .then((cfg) => {
    if (!cfg || !cfg.apiKey || !cfg.projectId || !cfg.appId) return;
    firebase.initializeApp(cfg);
    const messaging = firebase.messaging();
    messaging.onBackgroundMessage((payload) => {
      // notification 付きメッセージは FCM が自動表示するため showNotification しない（二重防止）
      if (payload.notification) return;

      const data = payload.data || {};
      const title = data.title || "奨学金リマインダー";
      const body = data.body || "";
      return self.registration.showNotification(title, {
        body,
        icon: "/icons/icon-192x192.png",
        tag: "scholarship-reminder",
        data: { link: data.link || "/" },
      });
    });
  })
  .catch((e) => {
    console.error("[firebase-messaging-sw] init failed", e);
  });
