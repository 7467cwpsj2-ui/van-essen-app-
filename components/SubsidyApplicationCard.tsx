"use client";

import { useState, useTransition } from "react";
import { Save } from "lucide-react";
import { saveSubsidyApplication } from "@/lib/actions/subsidies";
import { SUBSIDY_APPLICATION_STATUS_LABEL, SUBSIDY_APPLICATION_STATUS_ORDER } from "@/types/database";
import type { SubsidyApplication, SubsidyApplicationStatus } from "@/types/database";

export function SubsidyApplicationCard({ projectId, application }: { projectId: string; application: SubsidyApplication | null }) {
  const [status, setStatus] = useState<SubsidyApplicationStatus>(application?.status ?? "concept");
  const [applicationNumber, setApplicationNumber] = useState(application?.application_number ?? "");
  const [submittedAt, setSubmittedAt] = useState(application?.submitted_at ?? "");
  const [decisionAmount, setDecisionAmount] = useState(application?.decision_amount != null ? String(application.decision_amount) : "");
  const [notes, setNotes] = useState(application?.notes ?? "");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const dirty = () => setSaved(false);

  const save = () => {
    setSaved(false);
    startTransition(() => {
      saveSubsidyApplication(projectId, {
        status,
        applicationNumber: applicationNumber || null,
        submittedAt: submittedAt || null,
        decisionAmount: decisionAmount ? Number(decisionAmount) : null,
        notes: notes || null,
      })
        .then(() => setSaved(true))
        .catch((err) => alert(err instanceof Error ? err.message : "Opslaan mislukt."));
    });
  };

  return (
    <div className="add-form">
      <div className="add-form-title">Aanvraag bij RVO</div>
      <div className="hint-bar small">
        Leg hier vast wat je zelf bij RVO hebt ingediend (via eHerkenning) — de app dient niets automatisch in, dit is puur je eigen
        overzicht.
      </div>
      <div className="add-form-grid">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as SubsidyApplicationStatus);
            dirty();
          }}
        >
          {SUBSIDY_APPLICATION_STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {SUBSIDY_APPLICATION_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <input
          placeholder="Aanvraagnummer"
          value={applicationNumber}
          onChange={(e) => {
            setApplicationNumber(e.target.value);
            dirty();
          }}
        />
        <input
          type="date"
          title="Datum ingediend"
          value={submittedAt}
          onChange={(e) => {
            setSubmittedAt(e.target.value);
            dirty();
          }}
        />
        {(status === "goedgekeurd" || status === "uitbetaald") && (
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Definitief toegekend bedrag €"
            value={decisionAmount}
            onChange={(e) => {
              setDecisionAmount(e.target.value);
              dirty();
            }}
          />
        )}
      </div>
      <textarea
        rows={2}
        placeholder="Notities (optioneel)"
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value);
          dirty();
        }}
      />
      <button className="btn-primary" onClick={save} disabled={pending} style={{ alignSelf: "flex-start" }}>
        <Save size={14} /> {pending ? "Bezig…" : "Opslaan"}
      </button>
      {saved && <div className="hint-bar small">Opgeslagen.</div>}
    </div>
  );
}
