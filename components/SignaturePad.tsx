"use client";

import { useEffect, useRef, useState } from "react";

export function SignaturePad({
  title,
  onSave,
  onCancel,
}: {
  title?: string;
  onSave: (blob: Blob) => void | Promise<void>;
  onCancel: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const [hasDrawn, setHasDrawn] = useState(false);
  const [saving, setSaving] = useState(false);

  const fillWhite = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  useEffect(() => {
    fillWhite();
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const point = "touches" in e ? e.touches[0] : e;
    return { x: point.clientX - rect.left, y: point.clientY - rect.top };
  };

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    drawingRef.current = true;
    lastPos.current = getPos(e);
  };
  const move = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current!.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.strokeStyle = "#111318";
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
    if (!hasDrawn) setHasDrawn(true);
  };
  const end = () => {
    drawingRef.current = false;
  };
  const clear = () => {
    fillWhite();
    setHasDrawn(false);
  };
  const save = () => {
    if (!hasDrawn || !canvasRef.current || saving) return;
    setSaving(true);
    canvasRef.current.toBlob(async (blob) => {
      if (!blob) {
        setSaving(false);
        return;
      }
      try {
        await onSave(blob);
      } finally {
        setSaving(false);
      }
    }, "image/png");
  };

  return (
    <div className="sig-overlay" onClick={onCancel}>
      <div className="sig-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sig-title">{title || "Onderteken om te bevestigen"}</div>
        <canvas
          ref={canvasRef}
          width={360}
          height={160}
          className="sig-canvas"
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={end}
          onMouseLeave={end}
          onTouchStart={start}
          onTouchMove={move}
          onTouchEnd={end}
        />
        <div className="sig-hint">Teken met muis of vinger</div>
        <div className="sig-actions">
          <button type="button" className="btn-ghost" onClick={clear} disabled={saving}>
            Wissen
          </button>
          <button type="button" className="btn-ghost" onClick={onCancel} disabled={saving}>
            Annuleren
          </button>
          <button type="button" className="btn-primary" onClick={save} disabled={!hasDrawn || saving}>
            {saving ? "Bezig…" : "Bevestigen"}
          </button>
        </div>
      </div>
    </div>
  );
}
