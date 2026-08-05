"use client";

import { useState } from "react";

export function AssigneeInput({
  value,
  onChange,
  teamMembers,
}: {
  value: string;
  onChange: (value: string) => void;
  teamMembers: { id: string; name: string; trade: string | null }[];
}) {
  const names = teamMembers.map((m) => m.name);
  const [customMode, setCustomMode] = useState(!!value && !names.includes(value));

  if (customMode) {
    return (
      <div className="assignee-custom">
        <input placeholder="Naam / bedrijf" value={value} onChange={(e) => onChange(e.target.value)} />
        {teamMembers.length > 0 && (
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              setCustomMode(false);
              onChange("");
            }}
          >
            Kies uit team
          </button>
        )}
      </div>
    );
  }

  return (
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
      {teamMembers.map((m) => (
        <option key={m.id} value={m.name}>
          {m.name}
          {m.trade ? ` — ${m.trade}` : ""}
        </option>
      ))}
      <option value="__custom__">Anders / extern…</option>
    </select>
  );
}
