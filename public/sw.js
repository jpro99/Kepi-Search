self.addEventListener("push", (event) => {
  let payload = {
    title: "Kepi travel update",
    body: "You have a new travel alert.",
    url: "/travel-assistant",
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      payload = {
        ...payload,
        ...parsed,
      };
    } catch {
      // Ignore malformed payloads and use defaults.
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      data: { url: payload.url || "/travel-assistant" },
      icon: "/next.svg",
      badge: "/next.svg",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || "/travel-assistant";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const existingClient = clientList.find((client) => "focus" in client);
      if (existingClient) {
        existingClient.navigate(url);
        return existingClient.focus();
      }
      return clients.openWindow(url);
    }),
  );
});
