"use server";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { sendPushToUsers } from "@/lib/push";

// Zelf-diagnose: stuur een melding naar je eigen toestel, zodat je
// zonder te wachten op een echte gebeurtenis (chatbericht, foto, …)
// meteen weet of pushen op dit toestel daadwerkelijk aankomt — én of
// een tik erop naar de juiste pagina stuurt (vandaar een concreet,
// herkenbaar doel i.p.v. de standaard dashboard-pagina).
export async function sendTestPush() {
  const current = await requireUser();
  await sendPushToUsers([current.id], {
    title: "Testmelding",
    body: "Tik hierop — je hoort nu bij 'Mijn account' uit te komen.",
    url: "/account",
  });
}

export async function subscribeToPush(subscription: { endpoint: string; keys: { p256dh: string; auth: string } }) {
  const current = await requireUser();
  const supabase = createClient();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: current.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth_key: subscription.keys.auth,
    },
    { onConflict: "endpoint" }
  );
  if (error) throw new Error(error.message);
}

export async function unsubscribeFromPush(endpoint: string) {
  await requireUser();
  const supabase = createClient();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) throw new Error(error.message);
}
