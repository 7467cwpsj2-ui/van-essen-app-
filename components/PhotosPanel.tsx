"use client";

import { useState } from "react";
import { Camera, Plus, Trash2 } from "lucide-react";
import { FileCaptureButtons } from "@/components/FileCaptureButtons";
import { FilePreview } from "@/components/FilePreview";
import { Lightbox } from "@/components/Lightbox";
import { VisibilityReview } from "@/components/VisibilityReview";
import { processUploadedFile } from "@/lib/fileProcessing";
import { createClient } from "@/lib/supabase/client";
import { uploadWithRetry } from "@/lib/uploadWithRetry";
import { createPhoto, deletePhoto, setPhotoVisibility } from "@/lib/actions/documents";
import type { Photo, PhotoCategory, Role } from "@/types/database";

export interface PhotoWithUrl extends Photo {
  signedUrl: string | null;
}

interface PendingFile {
  id: string;
  blob: Blob;
  fileType: "image" | "pdf";
  fileName: string;
  previewUrl: string;
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
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handlePicked = async (file: File) => {
    setBusy(true);
    try {
      const result = await processUploadedFile(file);
      setPending((prev) => [...prev, { id: crypto.randomUUID(), ...result }]);
      setForm((f) => ({ ...f, title: f.title || file.name.replace(/\.[^.]+$/, "") }));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Verwerken mislukt.");
    } finally {
      setBusy(false);
    }
  };

  const removePending = (id: string) => setPending((prev) => prev.filter((p) => p.id !== id));

  const addPhotos = async () => {
    if (pending.length === 0) return;
    if (pending.length === 1 && !form.title.trim()) return;
    setBusy(true);
    try {
      const supabase = createClient();
      await Promise.all(
        pending.map(async (p) => {
          const ext = p.fileName.split(".").pop() || "jpg";
          const path = `${projectId}/photos/${crypto.randomUUID()}.${ext}`;
          const { error: uploadError } = await uploadWithRetry(supabase, path, p.blob, {
            contentType: "image/jpeg",
          });
          if (uploadError) throw new Error(uploadError.message);
          const title = pending.length === 1 ? form.title : form.title ? `${form.title} — ${p.fileName.replace(/\.[^.]+$/, "")}` : p.fileName.replace(/\.[^.]+$/, "");
          await createPhoto(projectId, {
            title,
            category: form.category,
            note: form.note || null,
            filePath: path,
            fileType: p.fileType,
            shareWithClient: form.shareWithClient,
          });
        })
      );
      setForm({ title: "", category: "tijdens", note: "", shareWithClient: false });
      setPending([]);
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
      <div className="photo-grid">
        {photos.map((ph) => (
          <div key={ph.id} className={"photo-card" + (role === "eigenaar" && !ph.reviewed ? " needs-review" : "")}>
            {ph.signedUrl ? (
              <button type="button" className="photo-card-thumb" onClick={() => setPreview(ph.signedUrl)}>
                <img src={ph.signedUrl} alt="" />
              </button>
            ) : (
              <div className="photo-card-icon">
                <Camera size={22} />
              </div>
            )}
            {(role === "eigenaar" || ph.uploader_id === currentUserId) && (
              <button
                className="icon-btn ghost photo-card-delete"
                title="Foto verwijderen"
                onClick={() => {
                  if (confirm("Deze foto verwijderen?")) deletePhoto(projectId, ph.id, ph.file_path).catch((e) => alert(e.message));
                }}
              >
                <Trash2 size={13} />
              </button>
            )}
            <div className="photo-card-body">
              <span className="vis-pill vis-public">{CATS[ph.category]}</span>
              <div className="photo-card-title">{ph.title}</div>
              {ph.note && <div className="photo-card-note">{ph.note}</div>}
              <div className="photo-card-note mono">
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
          </div>
        ))}
      </div>
      <div className="add-form">
        <div className="add-form-title">Foto&apos;s toevoegen</div>
        <FileCaptureButtons accept="image/*" onPicked={handlePicked} busy={busy} multiple />
        {pending.length > 0 && (
          <div className="pending-file-grid">
            {pending.map((p) => (
              <FilePreview
                key={p.id}
                previewUrl={p.previewUrl}
                fileType={p.fileType}
                fileName={p.fileName}
                onClear={() => removePending(p.id)}
              />
            ))}
          </div>
        )}
        <div className="add-form-grid">
          <input
            placeholder={pending.length > 1 ? "Titel-voorvoegsel (optioneel)" : "Titel / omschrijving"}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
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
          <button className="btn-primary" onClick={addPhotos} disabled={busy || pending.length === 0 || (pending.length === 1 && !form.title.trim())}>
            <Plus size={14} /> {pending.length > 1 ? `${pending.length} foto's toevoegen` : "Toevoegen"}
          </button>
        </div>
        {pending.length > 1 && (
          <div className="hint-bar small">Elke foto krijgt zijn eigen titel op basis van de bestandsnaam{form.title ? ", met jouw tekst ervoor" : ""}.</div>
        )}
      </div>
    </div>
  );
}
