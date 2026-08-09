"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

const CURRENT_BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID;
const CHECK_INTERVAL_MS = 5 * 60 * 1000;

// Vooral bedoeld voor de op het beginscherm geïnstalleerde app: die blijft
// vaak dagenlang open (geen echte paginaherlading) en iOS herstelt een
// standalone app soms uit een eigen snapshot i.p.v. een verse laadbeurt.
// Zonder dit zou iemand nooit merken dat er een update is, en moest de app
// verwijderd en opnieuw geïnstalleerd worden om iets nieuws te zien.
export function UpdateChecker() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (!CURRENT_BUILD_ID) return;

    let cancelled = false;

    const check = async () => {
      try {
        const res = await fetch(`/api/version?t=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.buildId && data.buildId !== CURRENT_BUILD_ID) {
          setUpdateAvailable(true);
        }
      } catch {
        // Geen netwerk of tijdelijk offline — gewoon later opnieuw proberen.
      }
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistration().then((reg) => reg?.update()).catch(() => {});
      }
    };

    check();
    const interval = setInterval(check, CHECK_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, []);

  if (!updateAvailable) return null;

  return (
    <div className="push-prompt">
      <div className="push-prompt-icon">
        <RefreshCw size={16} />
      </div>
      <div className="push-prompt-body">
        <div className="push-prompt-title">Nieuwe versie beschikbaar</div>
        <div className="push-prompt-sub">Ververs de app om de laatste wijzigingen te zien.</div>
      </div>
      <div className="push-prompt-actions">
        <button className="btn-primary" onClick={() => window.location.reload()}>
          Verversen
        </button>
      </div>
    </div>
  );
}
