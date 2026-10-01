"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { enablePushOnThisDevice } from "@/lib/pushClient";
import { sendTestPush } from "@/lib/actions/push";

type Status = "checking" | "unsupported" | "denied" | "needs-enable" | "active";

export function PushStatusCard() {
  const [status, setStatus] = useState<Status>("checking");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testSent, setTestSent] = useState(false);

  const check = async () => {
    if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    if (Notification.permission === "granted") {
      try {
        const registration = await navigator.serviceWorker.ready;
        const sub = await registration.pushManager.getSubscription();
        setStatus(sub ? "active" : "needs-enable");
      } catch {
        setStatus("needs-enable");
      }
      return;
    }
    setStatus("needs-enable");
  };

  useEffect(() => {
    check();
  }, []);

  const enable = async () => {
    setBusy(true);
    setError(null);
    const result = await enablePushOnThisDevice();
    if (!result.ok) setError(result.error);
    await check();
    setBusy(false);
  };

  const test = async () => {
    setBusy(true);
    setError(null);
    setTestSent(false);
    try {
      await sendTestPush();
      setTestSent(true);
      setTimeout(() => setTestSent(false), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Versturen mislukt.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dash-panel">
      <div className="dash-panel-head">
        <span>Pushmeldingen</span>
      </div>

      {status === "checking" && <div className="empty-hint small">Bezig met controleren…</div>}

      {status === "unsupported" && (
        <div className="empty-hint small empty-hint-row">
          <span className="empty-hint-icon-chip">
            <BellOff size={13} />
          </span>
          Deze browser ondersteunt geen pushmeldingen.
        </div>
      )}

      {status === "denied" && (
        <div className="hint-bar small">
          Je hebt meldingen eerder geblokkeerd voor deze app op dit toestel — de app kan daar niet opnieuw om vragen. Zet ze handmatig
          weer aan via de meldingeninstellingen van je toestel of browser voor &ldquo;Van Essen&rdquo;, en kom daarna terug naar deze
          pagina.
        </div>
      )}

      {status === "needs-enable" && (
        <>
          <div className="empty-hint small empty-hint-row">
            <span className="empty-hint-icon-chip">
              <Bell size={13} />
            </span>
            Pushmeldingen staan nog niet aan op dit toestel.
          </div>
          <button type="button" className="btn-primary" disabled={busy} onClick={enable} style={{ alignSelf: "flex-start" }}>
            {busy ? "Bezig…" : "Pushmeldingen aanzetten"}
          </button>
        </>
      )}

      {status === "active" && (
        <>
          <div className="empty-hint small empty-hint-row">
            <span className="empty-hint-icon-chip">
              <BellRing size={13} />
            </span>
            Pushmeldingen staan aan op dit toestel.
          </div>
          <button type="button" className="btn-ghost" disabled={busy} onClick={test} style={{ alignSelf: "flex-start" }}>
            {busy ? "Bezig…" : testSent ? "Verstuurd — kijk op je toestel" : "Stuur mezelf een testmelding"}
          </button>
        </>
      )}

      {error && (
        <div className="hint-bar small" style={{ color: "var(--danger)" }}>
          {error}
        </div>
      )}
    </div>
  );
}
