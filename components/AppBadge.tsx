"use client";

import { useEffect } from "react";

// Zet het rode telcijfer op het app-icoon zelf (zoals WhatsApp dat doet)
// zodra er ongelezen berichten zijn — dit is precies het signaal dat nu
// ontbreekt t.o.v. WhatsApp: je hoeft de app niet eens open te maken om
// te zien dat er iets wacht. Werkt alleen op toestellen/browsers die de
// Badging API ondersteunen (o.a. iOS 16.4+ en Android Chrome, als PWA
// geïnstalleerd) — op andere toestellen gebeurt er gewoon niets, zonder
// fout.
export function AppBadge({ count }: { count: number }) {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("setAppBadge" in navigator)) return;
    try {
      if (count > 0) {
        (navigator as Navigator & { setAppBadge: (n?: number) => Promise<void> }).setAppBadge(count).catch(() => {});
      } else {
        (navigator as Navigator & { clearAppBadge: () => Promise<void> }).clearAppBadge().catch(() => {});
      }
    } catch {
      // Best-effort — mag de rest van de app nooit blokkeren.
    }
  }, [count]);

  return null;
}
