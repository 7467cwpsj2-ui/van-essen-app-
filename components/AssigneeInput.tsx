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
  value,
  onChange,
  teamMembers,
}: {
  value: string;
  onChange: (value: string) => void;
  teamMembers: AssigneeTeamMember[];
}) {
  const ownStaff = teamMembers.filter((m) => m.member_type === "personeel");
  const contractors = teamMembers.filter((m) => m.member_type !== "personeel");
  const contractorNames = contractors.map((m) => m.name);

  const [category, setCategory] = useState<"onderaannemer" | "personeel">(
    ownStaff.some((m) => m.name === value) ? "personeel" : "onderaannemer"
  );
  const [customMode, setCustomMode] = useState(!!value && category === "onderaannemer" && !contractorNames.includes(value));

  const switchCategory = (next: "onderaannemer" | "personeel") => {
    if (next === category) return;
    setCategory(next);
    setCustomMode(false);
    onChange("");
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
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">Niet toegewezen</option>
          {ownStaff.map((m) => (
            <option key={m.id} value={m.name}>
              {m.name}
              {m.trade ? ` — ${m.trade}` : ""}
            </option>
          ))}
        </select>
      ) : customMode ? (
        <div className="assignee-custom">
          <input placeholder="Naam / bedrijf" value={value} onChange={(e) => onChange(e.target.value)} />
          {contractors.length > 0 && (
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                setCustomMode(false);
                onChange("");
              }}
            >
              Kies uit lijst
            </button>
          )}
        </div>
      ) : (
        <select
          value={value}
          onChange={(e) => {
            if (e.target.value === "__custom__") {
              setCustomMode(true);
              onChange("");
            } else {
              onChange(e.target.value);
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
