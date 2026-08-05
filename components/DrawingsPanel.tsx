"use client";

import { useState } from "react";
import { FileText, Plus, Trash2 } from "lucide-react";
import { FileCaptureButtons } from "@/components/FileCaptureButtons";
import { FilePreview } from "@/components/FilePreview";
import { Lightbox } from "@/components/Lightbox";
import { VisibilityReview } from "@/components/VisibilityReview";
import { processUploadedFile } from "@/lib/fileProcessing";
import { createClient } from "@/lib/supabase/client";
import { createDrawing, deleteDrawing, setDrawingVisibility } from "@/lib/actions/documents";
import type { Drawing, Role } from "@/types/database";

export interface DrawingWithUrl extends Drawing {
  signedUrl: string | null;
}

export function DrawingsPanel({
  projectId,
  role,
  currentUserId,
  drawings,
}: {
  projectId: string;
  role: Role;
  currentUserId: string;
  drawings: DrawingWithUrl[];
}) {
  const [form, setForm] = useState({ title: "", note: "", shareWithClient: false });
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

  const addDrawing = async () => {
    if (!form.title.trim() || !pending) return;
    setBusy(true);
    try {
      const supabase = createClient();
      const ext = pending.fileName.split(".").pop() || (pending.fileType === "pdf" ? "pdf" : "jpg");
      const path = `${projectId}/drawings/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("project-files").upload(path, pending.blob, {
        contentType: pending.fileType === "pdf" ? "application/pdf" : "image/jpeg",
      });
      if (uploadError) throw new Error(uploadError.message);
      await createDrawing(projectId, {
        title: form.title,
        note: form.note || null,
        filePath: path,
        fileType: pending.fileType,
        shareWithClient: form.shareWithClient,
      });
      setForm({ title: "", note: "", shareWithClient: false });
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
      {drawings.length === 0 && <div className="empty-hint">Nog geen tekeningen.</div>}
      <div className="drawing-grid">
        {drawings.map((d) => (
          <div key={d.id} className="drawing-card">
            {d.file_type === "pdf" ? (
              <div className="drawing-icon">
                <FileText size={20} />
              </div>
            ) : d.signedUrl ? (
              <button type="button" className="thumb-btn" onClick={() => setPreview(d.signedUrl)}>
                <img src={d.signedUrl} alt="" className="drawing-thumb" />
              </button>
            ) : null}
            <div className="drawing-body">
              <div className="drawing-title">{d.title}</div>
              {d.note && <div className="drawing-note">{d.note}</div>}
              <div className="drawing-note mono">
                {d.uploaded_by} · {new Date(d.created_at).toLocaleDateString("nl-NL")}
              </div>
              <VisibilityReview
                role={role}
                reviewed={d.reviewed}
                teamVisible={d.team_visible}
                clientVisible={d.client_visible}
                onSet={(patch) => setDrawingVisibility(projectId, d.id, patch).catch((e) => alert(e.message))}
              />
            </div>
            {(role === "eigenaar" || d.uploader_id === currentUserId) && (
              <button
                className="icon-btn danger ghost"
                onClick={() => {
                  if (confirm("Deze tekening verwijderen?")) deleteDrawing(projectId, d.id, d.file_path).catch((e) => alert(e.message));
                }}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="add-form">
        <div className="add-form-title">Tekening toevoegen</div>
        <FileCaptureButtons accept="image/*,application/pdf" onPicked={handlePicked} busy={busy} />
        <FilePreview
          previewUrl={pending?.previewUrl ?? null}
          fileType={pending?.fileType ?? null}
          fileName={pending?.fileName ?? null}
          onClear={() => setPending(null)}
        />
        <div className="add-form-grid">
          <input placeholder="Titel" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input placeholder="Toelichting" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
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
          <button className="btn-primary" onClick={addDrawing} disabled={busy || !pending}>
            <Plus size={14} /> Toevoegen
          </button>
        </div>
      </div>
    </div>
  );
}
