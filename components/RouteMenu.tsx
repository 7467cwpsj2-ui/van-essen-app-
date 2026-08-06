"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export function RouteMenu({ address }: { address: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const q = encodeURIComponent(address);

  return (
    <div className="route-menu" ref={ref}>
      <button type="button" className="address-link" onClick={() => setOpen((v) => !v)}>
        Route <ChevronDown size={13} className={open ? "open" : ""} />
      </button>
      {open && (
        <div className="route-menu-panel">
          <a href={`https://maps.apple.com/?q=${q}`} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}>
            Apple Kaarten
          </a>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${q}`}
            target="_blank"
            rel="noreferrer"
            onClick={() => setOpen(false)}
          >
            Google Maps
          </a>
        </div>
      )}
    </div>
  );
}
