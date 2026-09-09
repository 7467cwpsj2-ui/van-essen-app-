"use client";

import { useEffect } from "react";

const DISMISS_THRESHOLD_PX = 90;
// Alleen slepen vanaf het bovenste stukje (greepje + titel) van de
// sheet — sleep je vanuit de rest van de inhoud, dan zou dat een lange
// lijst binnenin de sheet onbedoeld laten meebewegen i.p.v. laten
// scrollen.
const HANDLE_ZONE_PX = 70;

// Op mobiel worden pop-ups (.modal-card) getoond als een "sheet" die
// van onderen opschuift (zie styles/globals.css) — net als bij bijna
// elke native app hoort daar een naar-beneden-vegen-om-te-sluiten
// gebaar bij. Dit is bewust één generieke, gedelegeerde handler i.p.v.
// iets dat elke los aanroepende plek (tientallen formulieren door de
// hele app heen) zelf zou moeten inbouwen: elke sheet sluit nu al door
// op de achtergrond (.sig-overlay) te klikken, dus deze handler hoeft
// alleen ver genoeg omlaag geveegd te herkennen en simuleert daarna
// gewoon een klik op die achtergrond — de eigen sluit-logica van de
// aanroepende component blijft ongewijzigd.
export function BottomSheetSwipeHandler() {
  useEffect(() => {
    let card: HTMLElement | null = null;
    let overlay: HTMLElement | null = null;
    let startY = 0;
    let currentY = 0;
    let dragging = false;

    const onTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      const foundCard = target.closest(".modal-card") as HTMLElement | null;
      if (!foundCard) return;
      const rect = foundCard.getBoundingClientRect();
      if (e.touches[0].clientY - rect.top > HANDLE_ZONE_PX) return;
      card = foundCard;
      overlay = card.closest(".sig-overlay") as HTMLElement | null;
      startY = e.touches[0].clientY;
      currentY = startY;
      dragging = true;
      card.style.transition = "none";
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!dragging || !card) return;
      // Voorkomt dat de pagina áchter de sheet meebeweegt/stuitert
      // (iOS' eigen "rubber band"-gedrag) zolang er gesleept wordt —
      // vereist een niet-passieve listener, anders wordt preventDefault
      // genegeerd.
      e.preventDefault();
      currentY = e.touches[0].clientY;
      const delta = Math.max(0, currentY - startY);
      card.style.transform = `translateY(${delta}px)`;
    };

    const reset = () => {
      if (card) {
        card.style.transition = "";
        card.style.transform = "";
      }
      dragging = false;
      card = null;
      overlay = null;
    };

    const onTouchEnd = () => {
      if (!dragging || !card) return;
      const delta = currentY - startY;
      const shouldDismiss = delta > DISMISS_THRESHOLD_PX;
      const target = overlay;
      reset();
      if (shouldDismiss) target?.click();
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd);
    document.addEventListener("touchcancel", reset);
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", reset);
    };
  }, []);

  return null;
}
