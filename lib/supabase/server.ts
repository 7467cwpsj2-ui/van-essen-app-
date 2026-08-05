import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server client voor gebruik in Server Components, Server Actions en
// Route Handlers. Respecteert RLS als de ingelogde gebruiker.
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Genegeerd: kan gebeuren wanneer setAll vanuit een Server
            // Component wordt aangeroepen terwijl middleware de sessie
            // al ververst. Middleware handelt de refresh af.
          }
        },
      },
    }
  );
}
