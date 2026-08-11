"use client";

import { useState } from "react";
import type { TeamMemberType } from "@/types/database";

export interface AssigneeTeamMember {
  id: string;
  name: string;
  trade: string | null;
  member_type: TeamMemberType;
}

export function AssigneeInput({
  assignee,
  assigneeTeamMemberIds,
  onChangeAssignee,
  onChangeTeamMemberIds,
  teamMembers,
}: {
  assignee: string;
  assigneeTeamMemberIds: string[];
  onChangeAssignee: (value: string) => void;
  onChangeTeamMemberIds: (ids: string[]) => void;
  teamMembers: AssigneeTeamMember[];
}) {
  const ownStaff = teamMembers.filter((m) => m.member_type === "personeel");
  const contractors = teamMembers.filter((m) => m.member_type !== "personeel");
  const contractorNames = contractors.map((m) => m.name);

  const [category, setCategory] = useState<"onderaannemer" | "personeel">(
    assigneeTeamMemberIds.length > 0 ? "personeel" : "onderaannemer"
  );
  const [customMode, setCustomMode] = useState(!!assignee && category === "onderaannemer" && !contractorNames.includes(assignee));

  const switchCategory = (next: "onderaannemer" | "personeel") => {
    if (next === category) return;
    setCategory(next);
    setCustomMode(false);
    onChangeAssignee("");
    onChangeTeamMemberIds([]);
  };

  const toggleStaff = (id: string) => {
    onChangeTeamMemberIds(
      assigneeTeamMemberIds.includes(id) ? assigneeTeamMemberIds.filter((x) => x !== id) : [...assigneeTeamMemberIds, id]
    );
  };

  return (
    <div className="assignee-input">
      <div className="mode-toggle">
        <button type="button" className={category === "onderaannemer" ? "active" : ""} onClick={() => switchCategory("onderaannemer")}>
          Onderaannemer
        </button>
        <button type="button" className={category === "personeel" ? "active" : ""} onClick={() => switchCategory("personeel")}>
          Eigen personeel
        </button>
      </div>

      {category === "personeel" ? (
        ownStaff.length === 0 ? (
          <div className="empty-hint small">Nog geen eigen personeel toegevoegd op de Personeel-pagina.</div>
        ) : (
          <div className="assignee-staff-list">
            {ownStaff.map((m) => (
              <label key={m.id} className="checkbox-label">
                <input type="checkbox" checked={assigneeTeamMemberIds.includes(m.id)} onChange={() => toggleStaff(m.id)} />
                {m.name}
                {m.trade ? ` — ${m.trade}` : ""}
              </label>
            ))}
          </div>
        )
      ) : customMode ? (
        <div className="assignee-custom">
          <input placeholder="Naam / bedrijf" value={assignee} onChange={(e) => onChangeAssignee(e.target.value)} />
          {contractors.length > 0 && (
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                setCustomMode(false);
                onChangeAssignee("");
              }}
            >
              Kies uit lijst
            </button>
          )}
        </div>
      ) : (
        <select
          value={assignee}
          onChange={(e) => {
            if (e.target.value === "__custom__") {
              setCustomMode(true);
              onChangeAssignee("");
            } else {
              onChangeAssignee(e.target.value);
            }
          }}
        >
          <option value="">Niet toegewezen</option>
          {contractors.map((m) => (
            <option key={m.id} value={m.name}>
              {m.name}
              {m.trade ? ` — ${m.trade}` : ""}
            </option>
          ))}
          <option value="__custom__">Anders / extern…</option>
        </select>
      )}
    </div>
  );
}
