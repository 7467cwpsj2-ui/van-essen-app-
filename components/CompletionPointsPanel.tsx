"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, ImagePlus, Plus, Trash2 } from "lucide-react";
import {
  approveCompletionPoint,
  createCompletionPoint,
  deleteCompletionPoint,
  markCompletionPointReady,
  resetCompletionPoint,
} from "@/lib/actions/completionPoints";
import { useRealtimeRefresh } from "@/lib/useRealtimeRefresh";
import { FileCaptureButtons } from "@/components/FileCaptureButtons";
import { FilePreview } from "@/components/FilePreview";
import { Lightbox } from "@/components/Lightbox";
import { processUploadedFile } from "@/lib/fileProcessing";
import { createClient } from "@/lib/supabase/client";
import type { CompletionPoint, CompletionPointStatus, Role } from "@/types/database";

const STATUS_LABEL: Record<CompletionPointStatus, string> = { open: "Open", gereed: "Gereed gemeld", goedgekeurd: "Goedgekeurd" };
const STATUS_CLASS: Record<CompletionPointStatus, string> = { open: "stamp-open", gereed: "stamp-open", goedgekeurd: "stamp-akkoord" };

export interface CompletionPointWithPhoto extends CompletionPoint {
  photoUrl: string | null;
}

export function CompletionPointsPanel({
  projectId,
  role,
  currentTeamMemberId,
  isLocked,
  points,
  teamMembers,
}: {
  projectId: string;
  role: Role;
  currentTeamMemberId: string | null;
  isLocked: boolean;
  points: CompletionPointWithPhoto[];
  teamMembers: { id: string; name: string }[];
}) {
  const [form, setForm] = useState({ description: "", responsibleTeamMemberId: "", deadline: "" });
  const [pending, setPending] = useState<{ blob: Blob; fileType: "image" | "pdf"; fileName: string; previewUrl: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useRealtimeRefresh("completion_points", projectId);

  const handlePicked = async (file: File) => {
    setBusy(true);
    try {
      const result = await processUploadedFile(file);
      setPending(result);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Verwerken mislukt.");
    } finally {
      setBusy(false);
    }
  };

  const add = async () => {
    if (!form.description.trim()) return;
    setBusy(true);
    try {
      let photoPath: string | null = null;
      if (pending) {
        const supabase = createClient();
        const ext = pending.fileName.split(".").pop() || "jpg";
        const path = `${projectId}/completion-points/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("project-files").upload(path, pending.blob, {
          contentType: "image/jpeg",
        });
        if (uploadError) throw new Error(uploadError.message);
        photoPath = path;
      }
      await createCompletionPoint(projectId, {
        description: form.description,
        responsibleTeamMemberId: form.responsibleTeamMemberId || null,
        deadline: form.deadline || null,
        photoPath,
      });
      setForm({ description: "", responsibleTeamMemberId: "", deadline: "" });
      setPending(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Toevoegen mislukt.");
    } finally {
      setBusy(false);
    }
  };

  const run = (fn: () => Promise<void>) => startTransition(() => fn().catch((err) => alert(err instanceof Error ? err.message : "Actie mislukt.")));

  return (
    <div className="panel">
      <Lightbox src={preview} onClose={() => setPreview(null)} />
      {role === "klant" && <div className="hint-bar">Zodra een punt &ldquo;gereed gemeld&rdquo; is, kun jij het hier goedkeuren.</div>}
      {points.length === 0 && <div className="empty-hint">Nog geen opleverpunten.</div>}
      <div className="work-list">
        {points.map((p) => {
          const canMarkReady =
            !isLocked && p.status === "open" && (role === "eigenaar" || (role === "team" && p.responsible_team_member_id === currentTeamMemberId));
          const canApprove = !isLocked && p.status === "gereed" && (role === "eigenaar" || role === "klant");
          return (
            <div key={p.id} className="list-row">
              {p.photoUrl && (
                <button type="button" className="thumb-btn cp-thumb-btn" onClick={() => setPreview(p.photoUrl)} title="Foto vergroten">
                  <img src={p.photoUrl} alt="" className="cp-thumb" />
                </button>
              )}
              <div className="list-row-body">
                <div className="list-row-title">{p.description}</div>
                <div className="list-row-sub">
                  {p.responsible_name && <span>Verantwoordelijke: {p.responsible_name}</span>}
                  {p.deadline && <span className="mono">{p.deadline}</span>}
                </div>
              </div>
              <span className={"stamp " + STATUS_CLASS[p.status]}>{STATUS_LABEL[p.status]}</span>
              {canMarkReady && (
                <button className="btn-primary" onClick={() => run(() => markCompletionPointReady(projectId, p.id))}>
                  <CheckCircle2 size={14} /> Gereed melden
                </button>
              )}
              {canApprove && (
                <button className="btn-primary" onClick={() => run(() => approveCompletionPoint(projectId, p.id))}>
                  Goedkeuren
                </button>
              )}
              {role === "eigenaar" && !isLocked && p.status !== "open" && (
                <button className="btn-ghost" onClick={() => run(() => resetCompletionPoint(projectId, p.id))}>
                  Terugzetten
                </button>
              )}
              {role === "eigenaar" && !isLocked && (
                <button className="icon-btn danger ghost" onClick={() => run(() => deleteCompletionPoint(projectId, p.id))}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          );
        })}
      </div>
      {role === "eigenaar" && !isLocked && (
        <div className="add-form">
          <div className="add-form-title">Opleverpunt toevoegen</div>
          <div className="hint-bar small">
            <ImagePlus size={13} style={{ display: "inline", marginRight: 4, verticalAlign: -2 }} />
            Voeg een foto toe om nog duidelijker te maken wat er moet gebeuren.
          </div>
          <FileCaptureButtons accept="image/*" onPicked={handlePicked} busy={busy} />
          <FilePreview
            previewUrl={pending?.previewUrl ?? null}
            fileType={pending?.fileType ?? null}
            fileName={pending?.fileName ?? null}
            onClear={() => setPending(null)}
          />
          <div className="add-form-grid">
            <input
              placeholder="Omschrijving"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <select value={form.responsibleTeamMemberId} onChange={(e) => setForm({ ...form, responsibleTeamMemberId: e.target.value })}>
              <option value="">Verantwoordelijke kiezen</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
            <button className="btn-primary" onClick={add} disabled={busy}>
              <Plus size={14} /> Toevoegen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
