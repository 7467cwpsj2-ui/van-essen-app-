import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client — omzeilt RLS volledig. Alleen gebruiken in
// server-only code (route handlers / server actions) en pas nadat de
// aanroepende gebruiker's rol handmatig is gecontroleerd (bv. is_owner
// via de normale server client). Nooit naar de browser sturen.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY of NEXT_PUBLIC_SUPABASE_URL ontbreekt — nodig voor uitnodigingen."
    );
  }
  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
