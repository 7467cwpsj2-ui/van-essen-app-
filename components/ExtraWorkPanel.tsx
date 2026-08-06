"use client";

import { useState } from "react";
import { ChevronDown, TrendingDown, TrendingUp, Trash2 } from "lucide-react";
import { SignaturePad } from "@/components/SignaturePad";
import { Lightbox } from "@/components/Lightbox";
import { createClient } from "@/lib/supabase/client";
import { approveExtraWork, createExtraWork, deleteExtraWork, rejectExtraWork, resetExtraWork } from "@/lib/actions/extraWork";
import { useRealtimeRefresh } from "@/lib/useRealtimeRefresh";
import type { ExtraWork, ExtraWorkStatus, ExtraWorkType, Role, SchedulePhase } from "@/types/database";

const STATUS_LABEL: Record<ExtraWorkStatus, string> = { open: "open", akkoord: "akkoord", afgewezen: "afgewezen" };

const fmtEuro = (n: number) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(Number(n) || 0);

export interface ExtraWorkWithSignature extends ExtraWork {
  signatureUrl: string | null;
}

export function ExtraWorkPanel({
  projectId,
  role,
  phases,
  items,
  hideAddForm,
}: {
  projectId: string;
  role: Role;
  phases: SchedulePhase[];
  items: ExtraWorkWithSignature[];
  hideAddForm?: boolean;
}) {
  const [form, setForm] = useState({
    type: "meerwerk" as ExtraWorkType,
    description: "",
    amount: "",
    extraDays: "",
    phaseId: "",
    explanation: "",
  });
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [signingId, setSigningId] = useState<string | null>(null);
  const [sigPreview, setSigPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useRealtimeRefresh("extra_work", projectId);

  const toggleExplain = (id: string) =>
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const addItem = async () => {
    if (!form.description.trim() || !form.amount) return;
    const days = form.type === "meerwerk" ? Number(form.extraDays) || 0 : 0;
    if (days > 0 && !form.phaseId) {
      alert("Kies bij welke fase deze extra dagen horen, anders wordt de bouwplanning niet aangepast.");
      return;
    }
    setBusy(true);
    try {
      await createExtraWork(projectId, {
        type: form.type,
        description: form.description,
        amount: Number(form.amount),
        explanation: form.explanation || null,
        extraDays: days || null,
        phaseId: days > 0 ? form.phaseId : null,
      });
      setForm({ type: "meerwerk", description: "", amount: "", extraDays: "", phaseId: "", explanation: "" });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Toevoegen mislukt.");
    } finally {
      setBusy(false);
    }
  };

  const handleOwnerStatusChange = async (id: string, status: ExtraWorkStatus) => {
    setBusy(true);
    try {
      if (status === "akkoord") await approveExtraWork(projectId, id, null);
      else if (status === "afgewezen") await rejectExtraWork(projectId, id);
      else await resetExtraWork(projectId, id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Bijwerken mislukt.");
    } finally {
      setBusy(false);
    }
  };

  const handleClientApprove = async (id: string, signatureBlob: Blob) => {
    setBusy(true);
    try {
      const supabase = createClient();
      const path = `${projectId}/signatures/${crypto.randomUUID()}.png`;
      const { error: uploadError } = await supabase.storage.from("project-files").upload(path, signatureBlob, {
        contentType: "image/png",
      });
      if (uploadError) throw new Error(uploadError.message);
      await approveExtraWork(projectId, id, path);
      setSigningId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Akkoord geven mislukt.");
    } finally {
      setBusy(false);
    }
  };

  const handleClientReject = async (id: string) => {
    setBusy(true);
    try {
      await rejectExtraWork(projectId, id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Afwijzen mislukt.");
    } finally {
      setBusy(false);
    }
  };

  const removeItem = async (id: string) => {
    if (!confirm("Dit item verwijderen?")) return;
    setBusy(true);
    try {
      await deleteExtraWork(projectId, id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Verwijderen mislukt.");
    } finally {
      setBusy(false);
    }
  };

  const meerwerkAkkoord = items.filter((w) => w.type === "meerwerk" && w.status === "akkoord").reduce((s, w) => s + Number(w.amount), 0);
  const minderwerkAkkoord = items
    .filter((w) => w.type === "minderwerk" && w.status === "akkoord")
    .reduce((s, w) => s + Number(w.amount), 0);
  const netto = meerwerkAkkoord - minderwerkAkkoord;

  return (
    <div className="panel">
      {signingId && (
        <SignaturePad
          title="Onderteken om akkoord te bevestigen"
          onCancel={() => setSigningId(null)}
          onSave={(blob) => handleClientApprove(signingId, blob)}
        />
      )}
      <Lightbox src={sigPreview} onClose={() => setSigPreview(null)} />
      <div className="netto-bar">
        <div className="netto-item">
          <TrendingUp size={14} /> Meerwerk (akkoord) <b>{fmtEuro(meerwerkAkkoord)}</b>
        </div>
        <div className="netto-item">
          <TrendingDown size={14} /> Minderwerk (akkoord) <b>{fmtEuro(minderwerkAkkoord)}</b>
        </div>
        <div className="netto-item netto-total">
          Netto bij te betalen <b>{fmtEuro(netto)}</b>
        </div>
      </div>
      {role === "klant" && (
        <div className="hint-bar">
          Zodra je een keuze maakt (akkoord of afwijzen), staat dit vast — alleen Van Essen Bouw &amp; Onderhoud kan het daarna nog
          aanpassen.
        </div>
      )}
      {items.length === 0 && <div className="empty-hint">Nog geen meer- of minderwerk geregistreerd.</div>}
      <div className="work-list">
        {items.map((w) => {
          const phase = w.phase_id ? phases.find((ph) => ph.id === w.phase_id) : null;
          return (
            <div key={w.id} className={"work-row work-" + w.type}>
              <div className="work-type-icon">{w.type === "meerwerk" ? <TrendingUp size={16} /> : <TrendingDown size={16} />}</div>
              <div className="work-body">
                <div className="work-desc">{w.description}</div>
                <div className="work-sub mono">
                  {w.type === "meerwerk" ? "+" : "−"} {fmtEuro(Number(w.amount))}
                </div>
                {!!w.extra_days && w.extra_days > 0 && (
                  <div className="work-sub">
                    +{w.extra_days} {w.extra_days === 1 ? "dag" : "dagen"} extra{phase ? ` bij ${phase.title}` : ""} —{" "}
                    {w.schedule_applied ? "bouwplanning aangepast" : "bouwplanning past pas aan na akkoord van de klant"}
                  </div>
                )}
                {w.status === "akkoord" && w.approved_by && (
                  <div className="work-sub sig-line">
                    Akkoord door {w.approved_by} op {w.approved_date}
                    {w.signatureUrl && (
                      <button type="button" className="sig-thumb-btn" onClick={() => setSigPreview(w.signatureUrl)} title="Handtekening bekijken">
                        <img src={w.signatureUrl} alt="Handtekening" className="sig-thumb" />
                      </button>
                    )}
                  </div>
                )}
                {w.status === "afgewezen" && w.rejected_by && (
                  <div className="work-sub">
                    Afgewezen door {w.rejected_by} op {w.rejected_date}
                  </div>
                )}
                {w.explanation && (
                  <button type="button" className="explain-toggle" onClick={() => toggleExplain(w.id)}>
                    <ChevronDown size={12} className={expandedIds.has(w.id) ? "open" : ""} /> Toelichting
                  </button>
                )}
                {w.explanation && expandedIds.has(w.id) && <div className="work-explanation">{w.explanation}</div>}
              </div>
              {role === "eigenaar" ? (
                <select
                  className="status-select"
                  value={w.status}
                  disabled={busy}
                  onChange={(e) => handleOwnerStatusChange(w.id, e.target.value as ExtraWorkStatus)}
                >
                  <option value="open">Open</option>
                  <option value="akkoord">Akkoord</option>
                  <option value="afgewezen">Afgewezen</option>
                </select>
              ) : role === "klant" && w.status === "open" ? (
                <div className="choice-btns">
                  <button className="btn-primary" disabled={busy} onClick={() => setSigningId(w.id)}>
                    Akkoord
                  </button>
                  <button className="btn-ghost" disabled={busy} onClick={() => handleClientReject(w.id)}>
                    Afwijzen
                  </button>
                </div>
              ) : (
                <span className={"stamp stamp-" + w.status}>{STATUS_LABEL[w.status]}</span>
              )}
              {role === "eigenaar" && (
                <button className="icon-btn danger ghost" onClick={() => removeItem(w.id)}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          );
        })}
      </div>
      {role !== "klant" && !hideAddForm && (
        <div className="add-form">
          <div className="add-form-title">Meer- of minderwerk toevoegen</div>
          <div className="add-form-grid">
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as ExtraWorkType })}>
              <option value="meerwerk">Meerwerk</option>
              <option value="minderwerk">Minderwerk</option>
            </select>
            <input placeholder="Omschrijving" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <input type="number" placeholder="Bedrag €" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            <textarea
              rows={2}
              placeholder="Korte toelichting voor de klant (optioneel)"
              value={form.explanation}
              onChange={(e) => setForm({ ...form, explanation: e.target.value })}
            />
            {role === "eigenaar" && form.type === "meerwerk" && phases.length > 0 && (
              <>
                <input
                  type="number"
                  min="0"
                  placeholder="Extra dagen (optioneel)"
                  value={form.extraDays}
                  onChange={(e) => setForm({ ...form, extraDays: e.target.value })}
                />
                {Number(form.extraDays) > 0 && (
                  <select value={form.phaseId} onChange={(e) => setForm({ ...form, phaseId: e.target.value })}>
                    <option value="">Bij welke fase?</option>
                    {phases.map((ph) => (
                      <option key={ph.id} value={ph.id}>
                        {ph.title}
                      </option>
                    ))}
                  </select>
                )}
              </>
            )}
            <button className="btn-primary" onClick={addItem} disabled={busy}>
              Toevoegen
            </button>
          </div>
          {role === "eigenaar" && form.type === "meerwerk" && phases.length > 0 && Number(form.extraDays) > 0 && (
            <div className="hint-bar small">
              Zodra de klant akkoord geeft, wordt de gekozen fase met {form.extraDays} dagen verlengd en schuiven latere fases
              automatisch mee. Wijst de klant af, dan verandert er niets aan de planning.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
