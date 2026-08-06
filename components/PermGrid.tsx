"use client";

import { MODULE_KEYS, MODULE_LABELS, type Permissions } from "@/types/database";

export function PermGrid({ perm, onToggle }: { perm: Permissions; onToggle: (key: (typeof MODULE_KEYS)[number]) => void }) {
  return (
    <div className="perm-grid">
      {MODULE_KEYS.map((key) => (
        <label key={key} className="perm-checkbox">
          <input type="checkbox" checked={perm[key] !== false} onChange={() => onToggle(key)} />
          {MODULE_LABELS[key]}
        </label>
      ))}
    </div>
  );
}
