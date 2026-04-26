/* FCM 受信: 本番は Firebase コンソールの値に合わせて書き換えてください。
 * モジュラー SDK 側 (lib/firebase.ts) の projectId 等と一致させる必要があります。 */
importScripts("https://www.gstatic.com/firebasejs/11.6.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
});

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
