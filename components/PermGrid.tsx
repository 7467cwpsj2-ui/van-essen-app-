"use client";

import { MODULE_KEYS, MODULE_LABELS, type Permissions } from "@/types/database";

export function PermGrid({
  perm,
  onToggle,
  excludeKeys,
}: {
  perm: Permissions;
  onToggle: (key: (typeof MODULE_KEYS)[number]) => void;
  excludeKeys?: (typeof MODULE_KEYS)[number][];
}) {
  const keys = excludeKeys ? MODULE_KEYS.filter((k) => !excludeKeys.includes(k)) : MODULE_KEYS;
  return (
    <div className="perm-grid">
      {keys.map((key) => (
        <label key={key} className="perm-checkbox">
          <input type="checkbox" checked={perm[key] !== false} onChange={() => onToggle(key)} />
          {MODULE_LABELS[key]}
        </label>
      ))}
    </div>
  );
}
