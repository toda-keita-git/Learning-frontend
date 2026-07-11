// 復習リマインド通知のクリック処理。
// generateSW(workbox)が自動生成するservice workerに importScripts で読み込ませる。
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = "/LearningContent?review=1";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.focus();
            if ("navigate" in client) {
              client.navigate(targetUrl);
            }
            return;
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
