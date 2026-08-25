import type { SupabaseClient } from "@supabase/supabase-js";

// Meerdere bestanden in één keer laten ondertekenen i.p.v. één
// opslag-aanroep per bestand — voorkomt tientallen losse netwerk-
// round-trips op pagina's met veel foto's/tekeningen/bijlagen (bv. een
// project met 30 foto's deed voorheen 30 losse createSignedUrl-calls).
export async function signedUrlMap(
  supabase: SupabaseClient,
  bucket: string,
  paths: (string | null)[],
  expiresIn = 3600
): Promise<Map<string, string | null>> {
  const unique = Array.from(new Set(paths.filter((p): p is string => !!p)));
  if (unique.length === 0) return new Map();
  const { data } = await supabase.storage.from(bucket).createSignedUrls(unique, expiresIn);
  return new Map(unique.map((path, i) => [path, data?.[i]?.signedUrl ?? null]));
}
