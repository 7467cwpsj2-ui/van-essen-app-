"use client";

import { useTransition } from "react";
import { updateProjectStatus } from "@/lib/actions/projects";
import type { ProjectStatus } from "@/types/database";

const STATUS_LABEL: Record<ProjectStatus, string> = {
  gepland: "Gepland",
  lopend: "Lopend",
  afgerond: "Afgerond",
};

export function StatusSelect({ projectId, status }: { projectId: string; status: ProjectStatus }) {
  const [pending, startTransition] = useTransition();
  return (
    <select
      className="status-select"
      defaultValue={status}
      disabled={pending}
      onChange={(e) => {
        const value = e.target.value as ProjectStatus;
        startTransition(() => {
          updateProjectStatus(projectId, value).catch((err) => alert(err instanceof Error ? err.message : "Bijwerken mislukt."));
        });
      }}
    >
      {Object.entries(STATUS_LABEL).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}
