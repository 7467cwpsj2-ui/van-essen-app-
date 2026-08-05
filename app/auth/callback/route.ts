import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";

// Vangt de redirect op na een uitnodigings-/magic link/reset e-mail van
// Supabase Auth, wisselt die om voor een sessie, en stuurt door naar
// het dashboard. Supabase's standaard e-mailsjablonen linken met
// ?token_hash=&type=; het PKCE-`code`-formaat wordt ook ondersteund
// mocht je de sjablonen daarop instellen.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const next = searchParams.get("next") ?? "/dashboard";
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const supabase = createClient();

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  } else if (tokenHash && type) {
    await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  }

  return NextResponse.redirect(`${origin}${next}`);
}
