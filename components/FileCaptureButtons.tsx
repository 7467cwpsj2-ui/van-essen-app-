"use client";

import { useRef } from "react";
import { Camera, Loader2, Paperclip, Upload } from "lucide-react";

export function FileCaptureButtons({
  accept,
  onPicked,
  busy,
  multiple,
  variant = "default",
}: {
  accept: string;
  onPicked: (file: File) => void;
  busy: boolean;
  multiple?: boolean;
  variant?: "default" | "icon";
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    files.forEach(onPicked);
  };

  if (variant === "icon") {
    return (
      <>
        <input ref={uploadRef} type="file" accept={accept} multiple={multiple} style={{ display: "none" }} onChange={handleChange} />
        <button type="button" className="icon-btn ghost" onClick={() => uploadRef.current?.click()} disabled={busy} title="Foto of bestand toevoegen">
          {busy ? <Loader2 className="spin" size={16} /> : <Paperclip size={16} />}
        </button>
      </>
    );
  }

  return (
    <div className="file-capture-row">
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handleChange} />
      <input ref={uploadRef} type="file" accept={accept} multiple={multiple} style={{ display: "none" }} onChange={handleChange} />
      <button type="button" className="btn-ghost" onClick={() => cameraRef.current?.click()} disabled={busy}>
        <Camera size={14} /> Foto maken
      </button>
      <button type="button" className="btn-ghost" onClick={() => uploadRef.current?.click()} disabled={busy}>
        <Upload size={14} /> Bestand uploaden
      </button>
      {busy && (
        <span className="mono file-busy">
          <Loader2 className="spin" size={12} /> verwerken…
        </span>
      )}
    </div>
  );
}
