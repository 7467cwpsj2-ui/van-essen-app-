"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { subscribeToPush } from "@/lib/actions/push";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

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
    if (!VAPID_PUBLIC_KEY) return;
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setVisible(false);
        return;
      }
      await navigator.serviceWorker.register("/sw.js");
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      const json = subscription.toJSON();
      if (json.endpoint && json.keys?.p256dh && json.keys?.auth) {
        await subscribeToPush({ endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } });
      }
      setVisible(false);
    } catch {
      setVisible(false);
    } finally {
      setBusy(false);
    }
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
