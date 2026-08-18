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

// Browsers verversen een pushabonnement af en toe automatisch (bv. na
// een systeemupdate of na een paar maanden) — zonder dit stopt een
// toestel dan stil met meldingen ontvangen, zonder dat iemand het
// merkt totdat ze toevallig iets missen. We melden het nieuwe
// abonnement meteen opnieuw aan bij de server, zonder dat de gebruiker
// er iets van hoeft te merken of opnieuw toestemming hoeft te geven.
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      try {
        let subscription = event.newSubscription;
        if (!subscription) {
          const applicationServerKey = event.oldSubscription && event.oldSubscription.options.applicationServerKey;
          subscription = await self.registration.pushManager.subscribe(
            applicationServerKey ? { userVisibleOnly: true, applicationServerKey } : { userVisibleOnly: true }
          );
        }
        const json = subscription.toJSON();
        if (json.endpoint && json.keys && json.keys.p256dh && json.keys.auth) {
          await fetch("/api/push/subscribe", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
          });
        }
      } catch {
        // Kan hier niets meer aan doen zonder gebruikersinteractie — bij
        // het volgende bezoek pikt de gewone aanmeldflow het weer op.
      }
    })()
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
