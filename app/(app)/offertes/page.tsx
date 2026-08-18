import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LeadsPanel } from "@/components/LeadsPanel";
import type { Lead } from "@/types/database";

export default async function OffertesPage() {
  await requireOwner();
  const supabase = createClient();
  const [{ data: leads }, { data: settings }] = await Promise.all([
    supabase.from("leads").select("*").order("visit_date", { ascending: true, nullsFirst: false }),
    supabase.from("app_settings").select("lead_reminder_days").eq("id", true).single(),
  ]);

  return <LeadsPanel leads={(leads ?? []) as Lead[]} reminderDays={settings?.lead_reminder_days ?? 3} />;
}
