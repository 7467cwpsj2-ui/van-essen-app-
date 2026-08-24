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

// Bewaart het navigatiedoel van een pushmelding in IndexedDB (gedeeld
// tussen deze service worker en de pagina zelf) — nodig omdat op
// sommige toestellen (vooral de op het beginscherm geïnstalleerde app
// op iOS, als die niet al open was) clients.openWindow(url) het
// opgegeven pad negeert en gewoon de start-pagina opent. De app leest
// dit bij het laden zelf uit en navigeert dan alsnog naar de juiste
// plek. Zie components/PendingPushNavigator.tsx voor de andere kant.
function rememberPendingNav(url) {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open("van-essen-push-nav", 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore("pending");
      };
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction("pending", "readwrite");
        tx.objectStore("pending").put({ url, at: Date.now() }, "target");
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          resolve();
        };
      };
      req.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/dashboard";

  event.waitUntil(
    (async () => {
      await rememberPendingNav(url);
      const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          try {
            await client.navigate(url);
          } catch {
            // WindowClient.navigate() wordt niet overal ondersteund —
            // de bewaarde pending-navigatie hierboven vangt dit op
            // zodra de pagina zelf weer aandacht krijgt.
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })()
  );
});
