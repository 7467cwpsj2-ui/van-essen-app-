import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// /api/cron/* heeft geen gebruikerssessie (Vercel Cron roept dit aan
// zonder cookies) — die route bewaakt zichzelf met een eigen
// CRON_SECRET-check, dus hier alleen de login-redirect overslaan.
// /d/* is het gedeelde, leesalleen opleverdossier — bewaakt door een
// eigen niet-raadbare token in de URL, niet door een sessie.
const PUBLIC_PATHS = ["/login", "/wachtwoord-vergeten", "/auth/callback", "/manifest.webmanifest", "/api/cron/", "/api/review", "/d/"];

// Als Supabase zelf een keer traag reageert, moet de hele app niet
// onbeperkt blijven hangen tot Vercel de aanvraag hardhandig afbreekt
// (een kale 504 Gateway Timeout-pagina) — na dit aantal seconden wordt
// de gebruiker in plaats daarvan gewoon (opnieuw) naar het inlogscherm
// gestuurd, een veel vriendelijker resultaat voor exact hetzelfde
// onderliggende probleem.
const AUTH_CHECK_TIMEOUT_MS = 8000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([promise, new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))]);
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const result = await withTimeout(supabase.auth.getUser(), AUTH_CHECK_TIMEOUT_MS);
  const user = result?.data.user ?? null;

  const isPublic = PUBLIC_PATHS.some((path) => request.nextUrl.pathname.startsWith(path));

  if (!user && !isPublic) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && request.nextUrl.pathname === "/login") {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    dashboardUrl.search = "";
    return NextResponse.redirect(dashboardUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest\\.webmanifest|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
