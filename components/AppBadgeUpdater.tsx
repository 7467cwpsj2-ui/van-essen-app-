"use client";

import { useEffect } from "react";

// Badge op het geïnstalleerde app-icoon zelf (beginscherm/dock/taakbalk),
// zodat ook zonder de app te openen zichtbaar is dat er iets openstaat —
// telt ongelezen meldingen en openstaande te-doen-items samen. De
// Badging API wordt niet overal ondersteund; waar niet, doet dit gewoon
// niets, dus altijd veilig om aan te roepen.
export function AppBadgeUpdater({ count }: { count: number }) {
  useEffect(() => {
    const nav = navigator as Navigator & {
      setAppBadge?: (n?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    if (!nav.setAppBadge || !nav.clearAppBadge) return;
    if (count > 0) {
      nav.setAppBadge(count).catch(() => {});
    } else {
      nav.clearAppBadge().catch(() => {});
    }
  }, [count]);

  return null;
}
