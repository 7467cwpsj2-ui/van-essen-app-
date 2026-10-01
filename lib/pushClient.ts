"use client";

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

// Gedeeld door de eerste-keer-banner (PushPrompt) en het statusblok op
// de accountpagina — beide moeten op exact dezelfde manier abonneren,
// anders raken ze op den duur uit sync.
export async function enablePushOnThisDevice(): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!VAPID_PUBLIC_KEY) return { ok: false, error: "Pushmeldingen zijn niet geconfigureerd voor deze app." };
  if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
    return { ok: false, error: "Deze browser ondersteunt geen pushmeldingen." };
  }
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return { ok: false, error: "Toestemming voor meldingen niet gegeven." };
    await navigator.serviceWorker.register("/sw.js");
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      return { ok: false, error: "Onvolledig abonnement ontvangen van de browser." };
    }
    await subscribeToPush({ endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Onbekende fout bij aanzetten." };
  }
}
