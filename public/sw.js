// Nieuwe versies van dit bestand direct actief maken i.p.v. te
// wachten tot alle open tabbladen/de geïnstalleerde app gesloten zijn
// — anders blijft een oudere service worker (en daarmee mogelijk een
// verouderde weergave van de app) actief tot een handmatige herstart.
self.addEventListener("install", () => {
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Deze service worker cachet zelf niets — maar de standaard navigatie
// van een op het beginscherm geïnstalleerde app (standalone-modus) blijkt
// op iOS soms een oude, lokaal bewaarde versie van de pagina te tonen,
// zelfs met "no-store"-headers op de server. Door zelf expliciet met
// cache: "no-store" opnieuw te fetchen bij elke paginanavigatie, omzeilen
// we die verouderde cache en krijgt de geïnstalleerde app altijd de
// actuele pagina — net als een gewoon Safari-tabblad al deed.
self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request, { cache: "no-store" }));
  }
});

self.addEventListener("push", (event) => {
  let payload = { title: "Van Essen", body: "" };
  try {
    if (event.data) payload = event.data.json();
  } catch {
    payload = { title: "Van Essen", body: event.data ? event.data.text() : "" };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "Van Essen", {
      body: payload.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: payload.url || "/dashboard" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/dashboard";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
