"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { enablePushOnThisDevice } from "@/lib/pushClient";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export function PushPrompt() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!VAPID_PUBLIC_KEY) return;
    if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) return;
    if (Notification.permission === "default" && !sessionStorage.getItem("push-prompt-dismissed")) {
      setVisible(true);
    }
  }, []);

  const enable = async () => {
    setBusy(true);
    const result = await enablePushOnThisDevice();
    setBusy(false);
    setVisible(false);
    // Bewust geen alert op mislukken hier — dit is een ongevraagde banner,
    // storend om 'm met een foutmelding te onderbreken. Wie het zeker wil
    // weten kan het statusblok op de accountpagina raadplegen, die toont
    // precies waarom het niet lukte en laat het opnieuw proberen.
    if (!result.ok) console.error("[push-prompt] aanzetten mislukt:", result.error);
  };

  const dismiss = () => {
    sessionStorage.setItem("push-prompt-dismissed", "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="push-prompt">
      <div className="push-prompt-icon">
        <Bell size={16} />
      </div>
      <div className="push-prompt-body">
        <div className="push-prompt-title">Meldingen aanzetten?</div>
        <div className="push-prompt-sub">Krijg een melding bij nieuwe chatberichten, notities, te doen en meer.</div>
      </div>
      <div className="push-prompt-actions">
        <button className="btn-ghost" onClick={dismiss} disabled={busy}>
          Niet nu
        </button>
        <button className="btn-primary" onClick={enable} disabled={busy}>
          {busy ? "Bezig…" : "Aanzetten"}
        </button>
      </div>
    </div>
  );
}
