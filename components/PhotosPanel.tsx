"use client";

import { useState } from "react";
import { Camera, Plus, Trash2 } from "lucide-react";
import { FileCaptureButtons } from "@/components/FileCaptureButtons";
import { FilePreview } from "@/components/FilePreview";
import { Lightbox } from "@/components/Lightbox";
import { VisibilityReview } from "@/components/VisibilityReview";
import { processUploadedFile } from "@/lib/fileProcessing";
import { createClient } from "@/lib/supabase/client";
import { createPhoto, deletePhoto, setPhotoVisibility } from "@/lib/actions/documents";
import type { Photo, PhotoCategory, Role } from "@/types/database";

export interface PhotoWithUrl extends Photo {
  signedUrl: string | null;
}

const CATS: Record<PhotoCategory, string> = {
  voor: "Voor uitvoering",
  tijdens: "Tijdens uitvoering",
  na: "Na uitvoering",
  oplevering: "Oplevering",
};

export function PhotosPanel({
  projectId,
  role,
  currentUserId,
  photos,
}: {
  projectId: string;
  role: Role;
  currentUserId: string;
  photos: PhotoWithUrl[];
}) {
  const [form, setForm] = useState<{ title: string; category: PhotoCategory; note: string; shareWithClient: boolean }>({
    title: "",
    category: "tijdens",
    note: "",
    shareWithClient: false,
  });
  const [pending, setPending] = useState<{ blob: Blob; fileType: "image" | "pdf"; fileName: string; previewUrl: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handlePicked = async (file: File) => {
    setBusy(true);
    try {
      const result = await processUploadedFile(file);
      setPending(result);
      setForm((f) => ({ ...f, title: f.title || file.name.replace(/\.[^.]+$/, "") }));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Verwerken mislukt.");
    } finally {
      setBusy(false);
    }
  };

  const addPhoto = async () => {
    if (!form.title.trim() || !pending) return;
    setBusy(true);
    try {
      const supabase = createClient();
      const ext = pending.fileName.split(".").pop() || "jpg";
      const path = `${projectId}/photos/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("project-files").upload(path, pending.blob, {
        contentType: "image/jpeg",
      });
      if (uploadError) throw new Error(uploadError.message);
      await createPhoto(projectId, {
        title: form.title,
        category: form.category,
        note: form.note || null,
        filePath: path,
        fileType: pending.fileType,
        shareWithClient: form.shareWithClient,
      });
      setForm({ title: "", category: "tijdens", note: "", shareWithClient: false });
      setPending(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Uploaden mislukt.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel">
      <Lightbox src={preview} onClose={() => setPreview(null)} />
      {role !== "eigenaar" && <div className="hint-bar">Wat jij hier toevoegt, deelt de eigenaar pas verder nadat het is bekeken.</div>}
      {photos.length === 0 && <div className="empty-hint">Nog geen foto&apos;s.</div>}
      <div className="drawing-grid">
        {photos.map((ph) => (
          <div key={ph.id} className="drawing-card">
            {ph.signedUrl ? (
              <button type="button" className="thumb-btn" onClick={() => setPreview(ph.signedUrl)}>
                <img src={ph.signedUrl} alt="" className="drawing-thumb" />
              </button>
            ) : (
              <div className="drawing-icon">
                <Camera size={20} />
              </div>
            )}
            <div className="drawing-body">
              <div className="drawing-title">
                {ph.title} <span className="vis-pill vis-public">{CATS[ph.category]}</span>
              </div>
              {ph.note && <div className="drawing-note">{ph.note}</div>}
              <div className="drawing-note mono">
                {ph.uploaded_by} · {new Date(ph.created_at).toLocaleDateString("nl-NL")}
              </div>
              <VisibilityReview
                role={role}
                reviewed={ph.reviewed}
                teamVisible={ph.team_visible}
                clientVisible={ph.client_visible}
                onSet={(patch) => setPhotoVisibility(projectId, ph.id, patch).catch((e) => alert(e.message))}
              />
            </div>
            {(role === "eigenaar" || ph.uploader_id === currentUserId) && (
              <button
                className="icon-btn danger ghost"
                onClick={() => {
                  if (confirm("Deze foto verwijderen?")) deletePhoto(projectId, ph.id, ph.file_path).catch((e) => alert(e.message));
                }}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="add-form">
        <div className="add-form-title">Foto toevoegen</div>
        <FileCaptureButtons accept="image/*" onPicked={handlePicked} busy={busy} />
        <FilePreview
          previewUrl={pending?.previewUrl ?? null}
          fileType={pending?.fileType ?? null}
          fileName={pending?.fileName ?? null}
          onClear={() => setPending(null)}
        />
        <div className="add-form-grid">
          <input placeholder="Titel / omschrijving" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as PhotoCategory })}>
            {Object.entries(CATS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <input placeholder="Opmerking" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          {role === "eigenaar" && (
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={form.shareWithClient}
                onChange={(e) => setForm({ ...form, shareWithClient: e.target.checked })}
              />
              Ook zichtbaar voor klant
            </label>
          )}
          <button className="btn-primary" onClick={addPhoto} disabled={busy || !pending}>
            <Plus size={14} /> Toevoegen
          </button>
        </div>
      </div>
    </div>
  );
}
