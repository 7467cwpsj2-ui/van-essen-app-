"use server";

import { createClient } from "@/lib/supabase/server";
import { withTimeout } from "@/lib/withTimeout";
import { redirect } from "next/navigation";

// Bij een trage/tijdelijke Supabase-hapering bleef inloggen zelf ook
// onbeperkt hangen (los van de sessiecheck in middleware.ts, die al
// zo'n zelfde bescherming heeft) — na deze tijd krijgt de gebruiker een
// duidelijke "probeer het nog eens"-melding in plaats van dat de pagina
// blijft hangen tot Vercel de aanvraag zelf afbreekt.
const SIGN_IN_TIMEOUT_MS = 8000;

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/dashboard");

  if (!email || !password) {
    redirect(`/login?error=${encodeURIComponent("Vul e-mailadres en wachtwoord in.")}`);
  }

  const supabase = createClient();
  const result = await withTimeout(supabase.auth.signInWithPassword({ email, password }), SIGN_IN_TIMEOUT_MS);

  if (!result) {
    redirect(`/login?error=${encodeURIComponent("Inloggen duurt nu ongewoon lang. Probeer het over een paar seconden opnieuw.")}`);
  }

  if (result.error) {
    redirect(`/login?error=${encodeURIComponent("Inloggen mislukt. Controleer je e-mailadres en wachtwoord.")}`);
  }

  redirect(next.startsWith("/") ? next : "/dashboard");
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  if (!email) {
    redirect(`/wachtwoord-vergeten?error=${encodeURIComponent("Vul je e-mailadres in.")}`);
  }

  const supabase = createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/account/wachtwoord`,
  });

  // Altijd dezelfde uitkomst tonen, ongeacht of dit e-mailadres bestaat —
  // voorkomt dat iemand kan aftasten welke adressen geregistreerd staan.
  redirect("/wachtwoord-vergeten?sent=1");
}
