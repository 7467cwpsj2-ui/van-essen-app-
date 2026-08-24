"use client";

import { useTransition } from "react";
import { UserPlus } from "lucide-react";
import { addSelfAsStaff } from "@/lib/actions/team";

export function AddSelfAsStaffButton() {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="btn-primary"
      disabled={pending}
      onClick={() => startTransition(() => addSelfAsStaff().catch((err) => alert(err instanceof Error ? err.message : "Toevoegen mislukt.")))}
    >
      <UserPlus size={14} /> Mezelf toevoegen als eigen personeel
    </button>
  );
}
