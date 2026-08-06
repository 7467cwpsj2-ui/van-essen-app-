"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { EmailOtpType } from "@supabase/supabase-js";

// Vangt de redirect op na een uitnodigings-/magic link/reset e-mail van
// Supabase Auth. Draait client-side omdat Supabase's standaard
// e-mailsjablonen de sessie soms als URL-fragment (#access_token=...)
// meesturen i.p.v. als query-param — dat kan alleen de browser lezen,
// nooit een server route. Ondersteunt daarnaast ook het PKCE-`code`-
// en het `token_hash`+`type`-formaat, zodat dit werkt ongeacht hoe het
// Supabase-project de e-mailsjablonen heeft ingesteld.
function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const run = async () => {
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
          router.replace(
            "/login?error=" + encodeURIComponent("Deze link is verlopen of al gebruikt. Vraag een nieuwe uitnodiging aan.")
          );
        }
      } catch (err) {
        router.replace(
          "/login?error=" + encodeURIComponent(err instanceof Error ? err.message : "Inloggen via deze link is mislukt.")
        );
      }
    };

    run();
  }, [router, searchParams]);

  return (
    <div className="app-loading">
      <Loader2 className="spin" size={16} /> Bezig met inloggen…
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="app-loading">
          <Loader2 className="spin" size={16} /> Bezig met inloggen…
        </div>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  );
}
