"use client";

import { useRef, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { inviteClient } from "@/lib/actions/clients";
import { MODULE_KEYS, MODULE_LABELS } from "@/types/database";

export function InviteClientForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = (formData: FormData) => {
    setError("");
    startTransition(() => {
      inviteClient(formData)
        .then(() => formRef.current?.reset())
        .catch((err) => setError(err instanceof Error ? err.message : "Uitnodigen mislukt."));
    });
  };

  return (
    <form ref={formRef} action={submit} className="add-form">
      <div className="add-form-title">Klant uitnodigen</div>
      <div className="add-form-grid">
        <input name="name" placeholder="Naam" required />
        <input name="email" type="email" placeholder="E-mailadres" required />
      </div>
      <div className="hint-bar small">Kies meteen wat deze klant mag zien — je kunt dit later altijd nog aanpassen.</div>
      <div className="perm-grid">
        {MODULE_KEYS.map((key) => (
          <label key={key} className="perm-checkbox">
            <input type="checkbox" name={`perm_${key}`} defaultChecked />
            {MODULE_LABELS[key]}
          </label>
        ))}
      </div>
      <button type="submit" className="btn-primary" disabled={pending} style={{ alignSelf: "flex-start" }}>
        <Plus size={14} /> {pending ? "Bezig…" : "Uitnodigen"}
      </button>
      {error && <div className="login-error">{error}</div>}
    </form>
  );
}
