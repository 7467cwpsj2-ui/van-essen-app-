"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

export function LoginSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="spin" size={14} /> Bezig…
        </>
      ) : (
        "Inloggen"
      )}
    </button>
  );
}
