"use client";

import { X } from "lucide-react";

export function Lightbox({ src, onClose }: { src: string | null; onClose: () => void }) {
  if (!src) return null;
  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <img src={src} alt="" className="lightbox-img" onClick={(e) => e.stopPropagation()} />
      <button className="lightbox-close" onClick={onClose}>
        <X size={18} />
      </button>
    </div>
  );
}
