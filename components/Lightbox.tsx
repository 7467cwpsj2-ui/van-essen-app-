"use client";

import { Download, X } from "lucide-react";

export function Lightbox({ src, onClose }: { src: string | null; onClose: () => void }) {
  if (!src) return null;
  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <img src={src} alt="" className="lightbox-img" onClick={(e) => e.stopPropagation()} />
      <a
        href={src}
        target="_blank"
        rel="noreferrer"
        download
        className="lightbox-download"
        onClick={(e) => e.stopPropagation()}
        title="Downloaden"
      >
        <Download size={18} />
      </a>
      <button className="lightbox-close" onClick={onClose}>
        <X size={18} />
      </button>
    </div>
  );
}
