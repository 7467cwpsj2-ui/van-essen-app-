"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, ArrowRight, Check, Pencil, Plus, RotateCcw, Trash2, X } from "lucide-react";
import {
  convertLeadToProject,
  createLead,
  deleteLead,
  updateLead,
  updateLeadStatus,
  type LeadInput,
} from "@/lib/actions/leads";
import { LEAD_STATUS_LABEL, type Lead, type LeadStatus } from "@/types/database";

const fmtDate = (iso: string) => new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso + "T00:00:00Z"));

const EMPTY_FORM: LeadInput = { clientName: "", address: "", phone: "", email: "", description: "", visitDate: "" };

const FILTERS: (LeadStatus | "alle")[] = ["open", "offerte_verzonden", "gewonnen", "verloren", "alle"];
const FILTER_LABEL: Record<LeadStatus | "alle", string> = { ...LEAD_STATUS_LABEL, alle: "Alles" };

export function LeadsPanel({ leads, reminderDays }: { leads: Lead[]; reminderDays: number }) {
  const [filter, setFilter] = useState<LeadStatus | "alle">("open");
  const [form, setForm] = useState<LeadInput>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<LeadInput>(EMPTY_FORM);
  const [showAdd, setShowAdd] = useState(false);
  const [, startTransition] = useTransition();

  const todayIso = new Date().toISOString().slice(0, 10);
  const cutoffIso = new Date(Date.now() - reminderDays * 86400000).toISOString().slice(0, 10);
  const isOverdue = (l: Lead) => l.status === "open" && !!l.visit_date && l.visit_date <= cutoffIso;

  const visible = filter === "alle" ? leads : leads.filter((l) => l.status === filter);

  const closeAdd = () => {
    setForm(EMPTY_FORM);
    setShowAdd(false);
  };

  const addLead = () => {
    if (!form.clientName.trim()) return;
    startTransition(() => {
      createLead(form).catch((err) => alert(err instanceof Error ? err.message : "Toevoegen mislukt."));
    });
    closeAdd();
  };

  const startEdit = (l: Lead) => {
    setEditingId(l.id);
    setEditForm({
      clientName: l.client_name,
      address: l.address ?? "",
      phone: l.phone ?? "",
      email: l.email ?? "",
      description: l.description ?? "",
      visitDate: l.visit_date ?? "",
    });
  };

  const saveEdit = (id: string) => {
    if (!editForm.clientName.trim()) return;
    startTransition(() => {
      updateLead(id, editForm).catch((err) => alert(err instanceof Error ? err.message : "Opslaan mislukt."));
    });
    setEditingId(null);
  };

  const setStatus = (id: string, status: LeadStatus) => {
    startTransition(() => {
      updateLeadStatus(id, status).catch((err) => alert(err instanceof Error ? err.message : "Bijwerken mislukt."));
    });
  };

  const remove = (id: string) => {
    if (!confirm("Deze aanvraag verwijderen?")) return;
    startTransition(() => {
      deleteLead(id).catch((err) => alert(err instanceof Error ? err.message : "Verwijderen mislukt."));
    });
  };

  return (
    <div className="panel">
      <div className="hint-bar">
        Houd hier offerteaanvragen en locatiebezoeken bij. Staat een aanvraag na {reminderDays} dagen nog op &quot;Open&quot;, dan
        krijg je automatisch een herinnering.
      </div>

      <div className="mode-toggle">
        {FILTERS.map((f) => (
          <button key={f} type="button" className={filter === f ? "active" : ""} onClick={() => setFilter(f)}>
            {FILTER_LABEL[f]}
          </button>
        ))}
      </div>

      <button type="button" className="btn-primary" onClick={() => setShowAdd(true)} style={{ alignSelf: "flex-start" }}>
        <Plus size={14} /> Aanvraag toevoegen
      </button>

      {visible.length === 0 ? (
        <div className="empty-hint">Niets gevonden.</div>
      ) : (
        <div className="task-list">
          {visible.map((l) =>
            editingId === l.id ? (
              <div key={l.id} className="add-form">
                <div className="add-form-grid">
                  <input
                    placeholder="Naam"
                    value={editForm.clientName}
                    onChange={(e) => setEditForm({ ...editForm, clientName: e.target.value })}
                  />
                  <input
                    placeholder="Adres"
                    value={editForm.address ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  />
                  <input
                    placeholder="Telefoon"
                    value={editForm.phone ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                  <input
                    placeholder="E-mail"
                    value={editForm.email ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  />
                  <input
                    type="date"
                    value={editForm.visitDate ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, visitDate: e.target.value })}
                    title="Bezoekdatum"
                  />
                </div>
                <textarea
                  rows={2}
                  placeholder="Omschrijving"
                  value={editForm.description ?? ""}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                />
                <div className="dossier-status-actions">
                  <button className="btn-primary" onClick={() => saveEdit(l.id)}>
                    <Check size={14} /> Opslaan
                  </button>
                  <button className="btn-ghost" onClick={() => setEditingId(null)}>
                    <X size={14} /> Annuleren
                  </button>
                </div>
              </div>
            ) : (
              <div key={l.id} className={"task-row" + (isOverdue(l) ? " overdue" : "")}>
                <div className="task-body">
                  <div className="task-title">
                    {l.client_name}
                    {isOverdue(l) && (
                      <span className="gantt-conflict-icon" title={`Nog geen offerte verstuurd sinds het bezoek op ${l.visit_date}.`}>
                        <AlertTriangle size={12} />
                      </span>
                    )}
                  </div>
                  <div className="task-meta">
                    {l.address && <span>{l.address}</span>}
                    {l.phone && <span>{l.phone}</span>}
                    {l.visit_date && <span className="mono">Bezoek: {fmtDate(l.visit_date)}</span>}
                    <span className={"stamp " + (l.status === "gewonnen" ? "stamp-akkoord" : l.status === "verloren" ? "stamp-afgewezen" : "stamp-open")}>
                      {LEAD_STATUS_LABEL[l.status]}
                    </span>
                  </div>
                  {l.description && <div className="task-meta">{l.description}</div>}
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  {l.status === "open" && (
                    <button className="btn-ghost" onClick={() => setStatus(l.id, "offerte_verzonden")}>
                      Offerte verzonden
                    </button>
                  )}
                  {l.status === "offerte_verzonden" && (
                    <>
                      <button className="btn-ghost" onClick={() => setStatus(l.id, "gewonnen")}>
                        Gewonnen
                      </button>
                      <button className="btn-ghost" onClick={() => setStatus(l.id, "verloren")}>
                        Verloren
                      </button>
                    </>
                  )}
                  {l.status === "gewonnen" &&
                    (l.converted_project_id ? (
                      <a href={`/projects/${l.converted_project_id}/planning`} className="btn-ghost">
                        Bekijk project
                      </a>
                    ) : (
                      <form action={convertLeadToProject.bind(null, l.id)}>
                        <button className="btn-primary" type="submit">
                          <ArrowRight size={13} /> Zet om in project
                        </button>
                      </form>
                    ))}
                  {l.status === "verloren" && (
                    <button className="btn-ghost" onClick={() => setStatus(l.id, "open")}>
                      <RotateCcw size={13} /> Heropenen
                    </button>
                  )}
                  <button className="icon-btn ghost" onClick={() => startEdit(l)} title="Bewerken">
                    <Pencil size={14} />
                  </button>
                  <button className="icon-btn danger ghost" onClick={() => remove(l.id)} title="Verwijderen">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {showAdd && (
        <div className="sig-overlay" onClick={closeAdd}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxHeight: "85vh", overflowY: "auto" }}>
            <div className="modal-title">Nieuwe aanvraag / locatiebezoek</div>
            <div className="add-form-grid">
              <input placeholder="Naam" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} />
              <input placeholder="Adres" value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              <input placeholder="Telefoon" value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <input placeholder="E-mail" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <input
                type="date"
                value={form.visitDate ?? ""}
                onChange={(e) => setForm({ ...form, visitDate: e.target.value })}
                title="Bezoekdatum"
                max={todayIso}
              />
            </div>
            <textarea
              rows={2}
              placeholder="Omschrijving (bv. wat wil de klant)"
              value={form.description ?? ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <div className="modal-actions">
              <button type="button" className="btn-ghost" onClick={closeAdd}>
                Annuleren
              </button>
              <button type="button" className="btn-primary" onClick={addLead}>
                <Plus size={14} /> Toevoegen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
