"use client";

import { useRef, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { inviteClient } from "@/lib/actions/clients";

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
        <button type="submit" className="btn-primary" disabled={pending}>
          <Plus size={14} /> {pending ? "Bezig…" : "Uitnodigen"}
        </button>
      </div>
      {error && <div className="login-error">{error}</div>}
    </form>
  );
}
