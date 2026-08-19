import type { SupabaseClient } from "@supabase/supabase-js";

// Een project kan aan meerdere klanten gekoppeld zijn (de primaire klant
// via projects.client_id, plus eventuele extra's via
// project_client_access). Deze twee helpers zetten dat om naar één
// weergavestring, bv. "Jansen" of "Jansen & De Vries" — gebruikt op de
// projectkaarten, de projectheader en het opleverdossier, zodat die
// drie nooit uit de pas lopen.

export async function getProjectClientName(
  supabase: SupabaseClient,
  projectId: string,
  primaryClientId: string | null
): Promise<string | null> {
  const [{ data: primary }, { data: extra }] = await Promise.all([
    primaryClientId
      ? supabase.from("clients").select("name").eq("id", primaryClientId).single()
      : Promise.resolve({ data: null as { name: string } | null }),
    supabase.from("project_client_access").select("clients(name)").eq("project_id", projectId),
  ]);
  const names: string[] = [];
  if (primary?.name) names.push(primary.name as string);
  for (const row of (extra ?? []) as unknown as { clients: { name: string } | null }[]) {
    if (row.clients?.name) names.push(row.clients.name);
  }
  return names.length ? names.join(" & ") : null;
}

export async function getProjectClientNamesMap(
  supabase: SupabaseClient,
  projects: { id: string; client_id: string | null }[]
): Promise<Record<string, string>> {
  const projectIds = projects.map((p) => p.id);
  const { data: extraRows } = projectIds.length
    ? await supabase.from("project_client_access").select("project_id,client_id").in("project_id", projectIds)
    : { data: [] as { project_id: string; client_id: string }[] };

  const extraByProject: Record<string, string[]> = {};
  (extraRows ?? []).forEach((r) => {
    const pid = r.project_id as string;
    (extraByProject[pid] ??= []).push(r.client_id as string);
  });

  const allClientIds = Array.from(
    new Set([...projects.map((p) => p.client_id).filter(Boolean), ...Object.values(extraByProject).flat()])
  ) as string[];

  const clientNameById: Record<string, string> = {};
  if (allClientIds.length) {
    const { data: clients } = await supabase.from("clients").select("id,name").in("id", allClientIds);
    (clients ?? []).forEach((c) => {
      clientNameById[c.id as string] = c.name as string;
    });
  }

  const result: Record<string, string> = {};
  for (const p of projects) {
    const ids = [...(p.client_id ? [p.client_id] : []), ...(extraByProject[p.id] ?? [])];
    const names = ids.map((id) => clientNameById[id]).filter(Boolean) as string[];
    if (names.length) result[p.id] = names.join(" & ");
  }
  return result;
}
