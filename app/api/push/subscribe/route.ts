import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Losse API-route (i.p.v. de bestaande subscribeToPush server action)
// omdat dit ook aangeroepen wordt vanuit de service worker zelf, bij
// een automatische pushsubscriptionchange — daar is geen React-context
// voor een server action, wel een gewone same-origin fetch met cookies.
export async function POST(request: Request) {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  let body: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }
  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json({ error: "Abonnement mist verplichte velden" }, { status: 400 });
  }

  const supabase = createClient();
  const { error } = await supabase.from("push_subscriptions").upsert(
    { user_id: current.id, endpoint: body.endpoint, p256dh: body.keys.p256dh, auth_key: body.keys.auth },
    { onConflict: "endpoint" }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
