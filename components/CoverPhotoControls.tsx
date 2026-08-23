"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { processUploadedFile } from "@/lib/fileProcessing";
import { createClient } from "@/lib/supabase/client";
import { uploadWithRetry } from "@/lib/uploadWithRetry";
import { setCoverPhoto, removeCoverPhoto } from "@/lib/actions/projects";

export function CoverPhotoControls({ projectId, hasPhoto }: { projectId: string; hasPhoto: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File) => {
    setBusy(true);
    try {
      const { blob, fileName } = await processUploadedFile(file);
      const supabase = createClient();
      const ext = fileName.split(".").pop() || "jpg";
      const path = `${projectId}/cover/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await uploadWithRetry(supabase, path, blob, {
        contentType: "image/jpeg",
      });
      if (uploadError) throw new Error(uploadError.message);
      await setCoverPhoto(projectId, path);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Uploaden mislukt.");
    } finally {
      setBusy(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) handleFile(file);
  };

  const handleRemove = () => {
    if (!confirm("Omslagfoto verwijderen?")) return;
    setBusy(true);
    removeCoverPhoto(projectId)
      .catch((err) => alert(err instanceof Error ? err.message : "Verwijderen mislukt."))
      .finally(() => setBusy(false));
  };

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleChange} />
      <button type="button" className="btn-ghost" onClick={() => inputRef.current?.click()} disabled={busy}>
        {busy ? <Loader2 className="spin" size={13} /> : <ImagePlus size={13} />} {hasPhoto ? "Wijzigen" : "Omslagfoto"}
      </button>
      {hasPhoto && (
        <button type="button" className="icon-btn ghost" onClick={handleRemove} disabled={busy} title="Omslagfoto verwijderen">
          <Trash2 size={14} />
        </button>
      )}
    </>
  );
}
