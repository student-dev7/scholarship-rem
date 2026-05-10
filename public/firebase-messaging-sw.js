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
      const title = (payload.notification && payload.notification.title) || "奨学金リマインダー";
      const options = {
        body: (payload.notification && payload.notification.body) || "",
        icon: "/icons/icon-192x192.png",
        data: payload.data,
      };
      return self.registration.showNotification(title, options);
    });
  })
  .catch(() => {
    // ignore initialization failure in SW
  });
