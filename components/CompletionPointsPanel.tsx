"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, FileText, ImagePlus, Plus, Trash2 } from "lucide-react";
import {
  approveCompletionPoint,
  createCompletionPoint,
  deleteCompletionPoint,
  markCompletionPointReady,
  resetCompletionPoint,
  reviewCompletionPoint,
} from "@/lib/actions/completionPoints";
import { useRealtimeRefresh } from "@/lib/useRealtimeRefresh";
import { FileCaptureButtons } from "@/components/FileCaptureButtons";
import { FilePreview } from "@/components/FilePreview";
import { Lightbox } from "@/components/Lightbox";
import { processUploadedFile } from "@/lib/fileProcessing";
import { createClient } from "@/lib/supabase/client";
import { uploadWithRetry } from "@/lib/uploadWithRetry";
import type { CompletionPoint, CompletionPointStatus, Role } from "@/types/database";

const STATUS_LABEL: Record<CompletionPointStatus, string> = {
  nieuw: "Nieuw — te controleren",
  open: "Open",
  gereed: "Gereed gemeld",
  goedgekeurd: "Goedgekeurd",
};
const STATUS_CLASS: Record<CompletionPointStatus, string> = {
  nieuw: "stamp-open",
  open: "stamp-open",
  gereed: "stamp-open",
  goedgekeurd: "stamp-akkoord",
};

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
  hideAddForm,
}: {
  projectId: string;
  role: Role;
  currentTeamMemberId: string | null;
  isLocked: boolean;
  points: CompletionPointWithPhoto[];
  teamMembers: { id: string; name: string }[];
  hideAddForm?: boolean;
}) {
  const [form, setForm] = useState({ description: "", note: "", responsibleTeamMemberId: "", deadline: "" });
  const [pending, setPending] = useState<{ blob: Blob; fileType: "image" | "pdf"; fileName: string; previewUrl: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, { responsibleTeamMemberId: string; deadline: string }>>({});
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
      let filePath: string | null = null;
      let fileType: "image" | "pdf" | null = null;
      if (pending) {
        const supabase = createClient();
        const ext = pending.fileName.split(".").pop() || (pending.fileType === "pdf" ? "pdf" : "jpg");
        const path = `${projectId}/completion-points/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await uploadWithRetry(supabase, path, pending.blob, {
          contentType: pending.fileType === "pdf" ? "application/pdf" : "image/jpeg",
        });
        if (uploadError) throw new Error(uploadError.message);
        filePath = path;
        fileType = pending.fileType;
      }
      await createCompletionPoint(projectId, {
        description: form.description,
        note: form.note || null,
        responsibleTeamMemberId: role === "eigenaar" ? form.responsibleTeamMemberId || null : null,
        deadline: role === "eigenaar" ? form.deadline || null : null,
        filePath,
        fileType,
      });
      setForm({ description: "", note: "", responsibleTeamMemberId: "", deadline: "" });
      setPending(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Toevoegen mislukt.");
    } finally {
      setBusy(false);
    }
  };

  const run = (fn: () => Promise<void>) => startTransition(() => fn().catch((err) => alert(err instanceof Error ? err.message : "Actie mislukt.")));

  const draftFor = (id: string) => reviewDrafts[id] || { responsibleTeamMemberId: "", deadline: "" };
  const setDraft = (id: string, patch: Partial<{ responsibleTeamMemberId: string; deadline: string }>) =>
    setReviewDrafts((prev) => ({ ...prev, [id]: { ...draftFor(id), ...patch } }));

  const canCreate = (role === "eigenaar" || role === "klant") && !isLocked && !hideAddForm;

  return (
    <div className="panel">
      <Lightbox src={preview} onClose={() => setPreview(null)} />
      {role === "klant" && (
        <div className="hint-bar">
          Zodra een punt &ldquo;gereed gemeld&rdquo; is, kun jij het hier goedkeuren. Meld je zelf een nieuw punt, dan controleert de
          eigenaar dat eerst voordat er iemand aan gekoppeld wordt.
        </div>
      )}
      {points.length === 0 && <div className="empty-hint">Nog geen opleverpunten.</div>}
      <div className="work-list">
        {points.map((p) => {
          const canMarkReady =
            !isLocked && p.status === "open" && (role === "eigenaar" || (role === "team" && p.responsible_team_member_id === currentTeamMemberId));
          const canApprove = !isLocked && p.status === "gereed" && (role === "eigenaar" || role === "klant");
          const canReview = !isLocked && p.status === "nieuw" && role === "eigenaar";
          const draft = draftFor(p.id);
          return (
            <div key={p.id} className="list-row">
              {p.photoUrl && p.file_type === "pdf" ? (
                <a href={p.photoUrl} target="_blank" rel="noreferrer" className="cp-thumb-btn cp-thumb-pdf" title="Bestand openen">
                  <FileText size={20} />
                </a>
              ) : (
                p.photoUrl && (
                  <button type="button" className="thumb-btn cp-thumb-btn" onClick={() => setPreview(p.photoUrl)} title="Foto vergroten">
                    <img src={p.photoUrl} alt="" className="cp-thumb" />
                  </button>
                )
              )}
              <div className="list-row-body">
                <div className="list-row-title">{p.description}</div>
                {p.note && <div className="list-row-sub">{p.note}</div>}
                <div className="list-row-sub">
                  {p.responsible_name && <span>Verantwoordelijke: {p.responsible_name}</span>}
                  {p.deadline && <span className="mono">{p.deadline}</span>}
                </div>
              </div>
              <span className={"stamp " + STATUS_CLASS[p.status]}>{STATUS_LABEL[p.status]}</span>
              {canReview && (
                <div className="cp-review">
                  <div className="cp-review-hint">Controleer dit punt en wijs de juiste persoon toe:</div>
                  <select
                    value={draft.responsibleTeamMemberId}
                    onChange={(e) => setDraft(p.id, { responsibleTeamMemberId: e.target.value })}
                  >
                    <option value="">Verantwoordelijke kiezen</option>
                    {teamMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                  <input type="date" value={draft.deadline} onChange={(e) => setDraft(p.id, { deadline: e.target.value })} />
                  <button
                    className="btn-primary"
                    disabled={!draft.responsibleTeamMemberId}
                    onClick={() =>
                      run(() =>
                        reviewCompletionPoint(projectId, p.id, {
                          responsibleTeamMemberId: draft.responsibleTeamMemberId,
                          deadline: draft.deadline || null,
                        })
                      )
                    }
                  >
                    Bevestigen
                  </button>
                </div>
              )}
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
              {role === "eigenaar" && !isLocked && p.status !== "open" && p.status !== "nieuw" && (
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
      {canCreate && (
        <div className="add-form">
          <div className="add-form-title">Opleverpunt toevoegen</div>
          <div className="hint-bar small">
            <ImagePlus size={13} style={{ display: "inline", marginRight: 4, verticalAlign: -2 }} />
            Voeg een foto of bestand toe om nog duidelijker te maken wat er moet gebeuren.
          </div>
          <FileCaptureButtons accept="image/*,application/pdf" onPicked={handlePicked} busy={busy} />
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
            <textarea
              rows={2}
              placeholder="Opmerking (optioneel)"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
            {role === "eigenaar" && (
              <>
                <select value={form.responsibleTeamMemberId} onChange={(e) => setForm({ ...form, responsibleTeamMemberId: e.target.value })}>
                  <option value="">Verantwoordelijke kiezen</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
              </>
            )}
            <button className="btn-primary" onClick={add} disabled={busy}>
              <Plus size={14} /> Toevoegen
            </button>
          </div>
          {role === "klant" && (
            <div className="hint-bar small">De eigenaar controleert dit punt en wijst er iemand aan toe voordat het wordt opgepakt.</div>
          )}
        </div>
      )}
    </div>
  );
}
