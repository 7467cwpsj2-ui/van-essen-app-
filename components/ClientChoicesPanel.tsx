"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createClientChoice, decideClientChoice, deleteClientChoice, resetClientChoice } from "@/lib/actions/clientChoices";
import type { ClientChoice, ClientChoiceStatus, Role } from "@/types/database";

const STATUS_LABEL: Record<ClientChoiceStatus, string> = { open: "Open", gekozen: "Gekozen", afgewezen: "Afgewezen" };
const STATUS_CLASS: Record<ClientChoiceStatus, string> = { open: "stamp-open", gekozen: "stamp-akkoord", afgewezen: "stamp-afgewezen" };

export function ClientChoicesPanel({
  projectId,
  role,
  isLocked,
  choices,
}: {
  projectId: string;
  role: Role;
  isLocked: boolean;
  choices: ClientChoice[];
}) {
  const [form, setForm] = useState({ category: "", description: "", deadline: "" });
  const [choiceDrafts, setChoiceDrafts] = useState<Record<string, string>>({});
  const [, startTransition] = useTransition();

  const run = (fn: () => Promise<void>) => startTransition(() => fn().catch((err) => alert(err instanceof Error ? err.message : "Actie mislukt.")));

  const add = () => {
    if (!form.category.trim()) return;
    startTransition(() => {
      createClientChoice(projectId, {
        category: form.category,
        description: form.description || null,
        deadline: form.deadline || null,
      }).catch((err) => alert(err instanceof Error ? err.message : "Toevoegen mislukt."));
    });
    setForm({ category: "", description: "", deadline: "" });
  };

  return (
    <div className="panel">
      {role === "klant" && <div className="hint-bar">Zodra je kiest of afwijst, staat dit vast — alleen de eigenaar kan het daarna nog aanpassen.</div>}
      {choices.length === 0 && <div className="empty-hint">Nog geen klantkeuzes.</div>}
      <div className="work-list">
        {choices.map((c) => (
          <div key={c.id} className="list-row">
            <div className="list-row-body">
              <div className="list-row-title">{c.category}</div>
              {c.description && <div className="list-row-sub">{c.description}</div>}
              {c.deadline && <div className="list-row-sub mono">{c.deadline}</div>}
              {c.choice_text && <div className="list-row-answer">{c.choice_text}</div>}
            </div>
            {role === "klant" && c.status === "open" ? (
              <div className="choice-respond">
                <textarea
                  rows={3}
                  placeholder="Jouw keuze / reactie — bijv. welke kleur, welk merk, opmerkingen…"
                  value={choiceDrafts[c.id] || ""}
                  onChange={(e) => setChoiceDrafts({ ...choiceDrafts, [c.id]: e.target.value })}
                />
                <div className="choice-btns">
                  <button
                    className="btn-primary"
                    onClick={() => run(() => decideClientChoice(projectId, c.id, "gekozen", choiceDrafts[c.id] || null))}
                  >
                    Kiezen
                  </button>
                  <button className="btn-ghost" onClick={() => run(() => decideClientChoice(projectId, c.id, "afgewezen", null))}>
                    Afwijzen
                  </button>
                </div>
              </div>
            ) : (
              <span className={"stamp " + STATUS_CLASS[c.status]}>{STATUS_LABEL[c.status]}</span>
            )}
            {role === "eigenaar" && !isLocked && c.status !== "open" && (
              <button className="btn-ghost" onClick={() => run(() => resetClientChoice(projectId, c.id))}>
                Terugzetten
              </button>
            )}
            {role === "eigenaar" && !isLocked && (
              <button className="icon-btn danger ghost" onClick={() => run(() => deleteClientChoice(projectId, c.id))}>
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
      {role === "eigenaar" && !isLocked && (
        <div className="add-form">
          <div className="add-form-title">Klantkeuze toevoegen</div>
          <div className="add-form-grid">
            <input placeholder="Categorie (bv. Kozijnkleur)" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <input placeholder="Toelichting / opties" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
            <button className="btn-primary" onClick={add}>
              <Plus size={14} /> Toevoegen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
