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

// Binnen dit venster na het laatst bewaren van een pagina wordt die
// direct getoond (voelt instant aan bij snel wisselen tussen
// pagina's), met een ververs-poging op de achtergrond voor de
// volgende keer. Ouder dan dit venster — bijv. de app was een tijdje
// dicht of stond op de achtergrond — wordt altijd een verse versie
// opgehaald vóór er iets getoond wordt. Dat laatste is precies het
// moment waarop een verouderde pagina eerder op iOS bleef hangen, dus
// dat gedrag (altijd vers na een pauze) blijft ongewijzigd; alleen
// snel-achter-elkaar navigeren binnen dit korte venster profiteert nu
// van een lokale kopie i.p.v. altijd op het netwerk te wachten.
const NAV_CACHE = "van-essen-nav-v1";
// Aparte, "onzichtbare" cache puur voor het bijhouden van het moment
// van bewaren — de echte pagina in NAV_CACHE blijft daardoor een
// letterlijke, ongewijzigde kopie van wat de server terugstuurde.
// (Eerder werd hiervoor een nieuwe Response met handmatig
// gekopieerde headers gemaakt over een losse .blob() van de body —
// dat kan de gecomprimeerde inhoud die Vercel terugstuurt corrupt
// laten weergeven bij het teruglezen uit de cache. clone() voorkomt
// dat probleem, dus de tijdstempel gaat nu apart.)
const NAV_META_CACHE = "van-essen-nav-meta-v1";
const FRESH_WINDOW_MS = 15000;

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  if (event.request.method !== "GET") {
    // Geen cache-logica voor bv. een formulier-POST zonder JS —
    // gewoon altijd naar het netwerk, zoals voorheen.
    event.respondWith(fetch(event.request, { cache: "no-store" }));
    return;
  }
  event.respondWith(handleNavigate(event));
});

function metaRequestFor(url) {
  return new Request("https://sw-meta.invalid/nav-cached-at?u=" + encodeURIComponent(url));
}

async function getCachedAt(metaCache, url) {
  const res = await metaCache.match(metaRequestFor(url));
  if (!res) return 0;
  return Number(await res.text()) || 0;
}

async function handleNavigate(event) {
  const request = event.request;
  const cache = await caches.open(NAV_CACHE);
  const metaCache = await caches.open(NAV_META_CACHE);
  const cached = await cache.match(request);
  const cachedAt = cached ? await getCachedAt(metaCache, request.url) : 0;
  const isFresh = cached && Date.now() - cachedAt < FRESH_WINDOW_MS;

  if (isFresh) {
    event.waitUntil(refreshInBackground(request, cache, metaCache));
    return cached;
  }

  try {
    const fresh = await fetch(request, { cache: "no-store" });
    event.waitUntil(storeInCache(cache, metaCache, request, fresh.clone()));
    return fresh;
  } catch (err) {
    // Geen netwerk (bv. offline) — beter een oudere versie tonen dan
    // helemaal niets, mocht die er nog liggen.
    if (cached) return cached;
    throw err;
  }
}

async function refreshInBackground(request, cache, metaCache) {
  try {
    const fresh = await fetch(request, { cache: "no-store" });
    await storeInCache(cache, metaCache, request, fresh);
  } catch {
    // Achtergrond-ververs mislukt — de al bewaarde versie blijft
    // gewoon staan tot de volgende poging.
  }
}

async function storeInCache(cache, metaCache, request, response) {
  // Nooit een respons bewaren die via een redirect tot stand kwam (bv.
  // een verlopen sessie die naar /login doorstuurt) — anders zou de
  // inhoud van /login onder de URL van de oorspronkelijke pagina
  // bewaard kunnen blijven staan.
  if (!response.ok || response.redirected) return;
  await cache.put(request, response);
  await metaCache.put(metaRequestFor(request.url), new Response(String(Date.now())));
}

// De pagina zelf vraagt hierom bij het uitloggen (voorkomt dat een
// volgende gebruiker op hetzelfde toestel nog heel even een bewaarde
// pagina van de vorige, uitgelogde gebruiker te zien krijgt) en bij
// "Verversen" na een update-melding (zodat dat ook echt de nieuwste
// versie ophaalt, niet een net daarvoor bewaarde oudere kopie).
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "CLEAR_NAV_CACHE") {
    event.waitUntil(Promise.all([caches.delete(NAV_CACHE), caches.delete(NAV_META_CACHE)]));
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
