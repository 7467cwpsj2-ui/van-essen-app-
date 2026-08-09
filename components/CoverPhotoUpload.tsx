"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { processUploadedFile } from "@/lib/fileProcessing";
import { createClient } from "@/lib/supabase/client";
import { setCoverPhoto, removeCoverPhoto } from "@/lib/actions/projects";

export function CoverPhotoUpload({
  projectId,
  coverPhotoUrl,
  editable,
}: {
  projectId: string;
  coverPhotoUrl: string | null;
  editable: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  if (!editable && !coverPhotoUrl) return null;

  const handleFile = async (file: File) => {
    setBusy(true);
    try {
      const { blob, fileName } = await processUploadedFile(file);
      const supabase = createClient();
      const ext = fileName.split(".").pop() || "jpg";
      const path = `${projectId}/cover/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("project-files").upload(path, blob, {
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
    <div className={"project-cover" + (coverPhotoUrl ? "" : " empty")}>
      {editable && <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleChange} />}
      {coverPhotoUrl ? (
        <>
          <img src={coverPhotoUrl} alt="" />
          {editable && (
            <div className="project-cover-actions">
              <button type="button" className="btn-ghost" onClick={() => inputRef.current?.click()} disabled={busy}>
                {busy ? <Loader2 className="spin" size={13} /> : <ImagePlus size={13} />} Wijzigen
              </button>
              <button type="button" className="icon-btn danger ghost" onClick={handleRemove} disabled={busy}>
                <Trash2 size={13} />
              </button>
            </div>
          )}
        </>
      ) : (
        <button type="button" className="project-cover-add" onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? <Loader2 className="spin" size={16} /> : <ImagePlus size={16} />}
          {busy ? "Bezig…" : "Omslagfoto toevoegen"}
        </button>
      )}
    </div>
  );
}
