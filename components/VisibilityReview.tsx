"use client";

import type { Role } from "@/types/database";

export function VisibilityReview({
  role,
  reviewed,
  teamVisible,
  clientVisible,
  onSet,
}: {
  role: Role;
  reviewed: boolean;
  teamVisible: boolean;
  clientVisible: boolean;
  onSet: (patch: { teamVisible: boolean; clientVisible: boolean; reviewed: boolean }) => void;
}) {
  if (role !== "eigenaar") return null;
  return (
    <div className="review-controls">
      {!reviewed && <span className="vis-pill vis-review">nieuw · nog controleren</span>}
      <label className="checkbox-label small">
        <input
          type="checkbox"
          checked={teamVisible}
          onChange={(e) => onSet({ teamVisible: e.target.checked, clientVisible, reviewed: true })}
        />
        Team
      </label>
      <label className="checkbox-label small">
        <input
          type="checkbox"
          checked={clientVisible}
          onChange={(e) => onSet({ teamVisible, clientVisible: e.target.checked, reviewed: true })}
        />
        Klant
      </label>
    </div>
  );
}
