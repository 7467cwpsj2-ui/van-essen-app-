"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { EmailOtpType } from "@supabase/supabase-js";

// Vangt de redirect op na een uitnodigings-/magic link/reset e-mail van
// Supabase Auth. De link wordt bewust pas verwerkt bij een klik op de
// knop, niet automatisch zodra de pagina laadt — veel e-mailclients en
// beveiligingssoftware openen links automatisch om ze te scannen, wat
// een eenmalige uitnodigingslink dan al "verbruikt" voordat de
// ontvanger er zelf op klikt. Ondersteunt het PKCE-`code`-formaat, het
// `token_hash`+`type`-formaat, en een #access_token=...-URL-fragment
// (die laatste kan alleen de browser lezen, nooit een server route) —
// werkt dus ongeacht hoe het Supabase-project de e-mailsjablonen heeft
// ingesteld.
function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setStatus("working");
    const supabase = createClient();
    const next = searchParams.get("next") || "/dashboard";
    const code = searchParams.get("code");
    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type") as EmailOtpType | null;

    try {
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;
      } else if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
        if (error) throw error;
      }

      // Bij een #access_token=...-fragment heeft de client hierboven
      // die al automatisch verwerkt en opgeslagen.
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.replace(next);
      } else {
        setStatus("error");
        setError("Deze link is verlopen of al gebruikt. Vraag een nieuwe uitnodiging aan.");
      }
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Inloggen via deze link is mislukt.");
    }
  };

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="brandmark large">
          <div className="brandmark-name">
            <span className="bm-van">VAN</span> <span className="bm-essen">ESSEN</span>
          </div>
          <div className="bm-sub">BOUW &amp; ONDERHOUD</div>
        </div>
        <div className="login-title">
          <KeyRound size={13} style={{ display: "inline", marginRight: 6, verticalAlign: -2 }} />
          Uitnodiging bevestigen
        </div>
        {status === "error" ? (
          <>
            <div className="login-error">{error}</div>
            <div className="login-hint">
              <Link href="/login">Terug naar inloggen</Link>
            </div>
          </>
        ) : (
          <>
            <p className="login-copy">Klik hieronder om verder te gaan.</p>
            <button className="btn-primary" onClick={confirm} disabled={status === "working"}>
              {status === "working" ? (
                <>
                  <Loader2 className="spin" size={14} /> Bezig…
                </>
              ) : (
                "Bevestigen en verdergaan"
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="app-loading">
          <Loader2 className="spin" size={16} /> Laden…
        </div>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  );
}
