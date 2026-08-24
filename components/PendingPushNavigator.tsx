"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const MAX_AGE_MS = 5 * 60 * 1000;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("van-essen-push-nav", 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore("pending");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function takePendingTarget(): Promise<{ url: string; at: number } | undefined> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction("pending", "readwrite");
        const store = tx.objectStore("pending");
        const getReq = store.get("target");
        getReq.onsuccess = () => {
          const value = getReq.result as { url: string; at: number } | undefined;
          if (value) store.delete("target");
          resolve(value);
        };
        getReq.onerror = () => reject(getReq.error);
        tx.oncomplete = () => db.close();
      })
  );
}

// Tegenhanger van rememberPendingNav() in public/sw.js: op sommige
// toestellen (vooral de op het beginscherm geïnstalleerde app op iOS)
// negeert een pushmelding-tik het opgegeven pad en opent gewoon de
// dashboard-startpagina. De service worker bewaart daarom waar het
// écht naartoe moest in IndexedDB; hier lezen we dat uit zodra de app
// laadt of weer op de voorgrond komt, en navigeren we alsnog door.
export function PendingPushNavigator() {
  const router = useRouter();

  useEffect(() => {
    if (typeof indexedDB === "undefined") return;

    const consume = () => {
      takePendingTarget()
        .then((target) => {
          if (target && Date.now() - target.at < MAX_AGE_MS) {
            router.push(target.url);
          }
        })
        .catch(() => {
          // Geen IndexedDB-toegang (bv. privénavigatie) — niets aan te doen.
        });
    };

    consume();
    const onVisible = () => {
      if (document.visibilityState === "visible") consume();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [router]);

  return null;
}
