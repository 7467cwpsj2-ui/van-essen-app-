import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_ATTEMPTS = 4;
const RETRY_DELAYS_MS = [1500, 4000, 9000];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForOnline(): Promise<void> {
  if (typeof navigator === "undefined" || navigator.onLine) return Promise.resolve();
  return new Promise((resolve) => {
    const onOnline = () => {
      window.removeEventListener("online", onOnline);
      resolve();
    };
    window.addEventListener("online", onOnline);
  });
}

// Uploads vanaf de bouwplaats mislukken regelmatig door een korte
// wegval van bereik — vervelend genoeg (een foto opnieuw moeten maken/
// kiezen) om automatisch op te lossen: wacht als het apparaat op dit
// moment offline is tot de verbinding terugkomt, en probeer bij een
// mislukte upload een paar keer opnieuw met oplopende tussenpauzes
// voordat het als definitief mislukt wordt beschouwd. Zelfde
// argumenten/resultaatvorm als een gewone supabase.storage...upload()-
// aanroep, dus overal een kleine, gerichte vervanging.
export async function uploadWithRetry(
  supabase: SupabaseClient,
  path: string,
  file: Blob,
  options?: { contentType?: string }
): Promise<{ error: Error | null }> {
  await waitForOnline();

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await sleep(RETRY_DELAYS_MS[attempt - 1] ?? 9000);
      await waitForOnline();
    }
    const { error } = await supabase.storage.from("project-files").upload(path, file, options);
    if (!error) return { error: null };
    lastError = new Error(error.message);
  }
  return { error: lastError };
}
