import { createAdminClient } from "@/lib/supabase/admin";

// Geen sessie nodig — een agenda-app (Google/Apple/Outlook) haalt deze
// feed periodiek zelf op, zonder in te loggen. Autorisatie loopt via
// het niet-raadbare token zelf, zelfde patroon als de opleverdossier-
// deel-link (/d/[token]).
export const dynamic = "force-dynamic";

function icsEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function dateStamp(iso: string): string {
  return iso.replace(/-/g, "");
}

// DTEND is exclusief bij een heledag-event — de einddatum moet dus één
// dag na de laatste werkdag liggen, anders mist de agenda-app de
// laatste dag van de klus.
function nextDay(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return new Date(d.getTime() + 86400000).toISOString().slice(0, 10);
}

export async function GET(request: Request, { params }: { params: { token: string } }) {
  const admin = createAdminClient();
  const { data: member } = await admin.from("team_members").select("id,name").eq("calendar_token", params.token).maybeSingle();
  if (!member) return new Response("Not found", { status: 404 });

  const memberId = member.id as string;
  const [{ data: phases }, { data: jobs }] = await Promise.all([
    admin
      .from("schedule_phases")
      .select("id,title,start_date,end_date,projects(name,address)")
      .contains("assignee_team_member_ids", [memberId]),
    admin
      .from("quick_jobs")
      .select("id,title,start_date,end_date,address,kind")
      .contains("assignee_team_member_ids", [memberId]),
  ]);

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Van Essen Bouw & Onderhoud//Planning//NL",
    "CALSCALE:GREGORIAN",
    "X-WR-CALNAME:Van Essen — planning",
    "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
  ];

  for (const p of (phases ?? []) as unknown as {
    id: string;
    title: string;
    start_date: string;
    end_date: string;
    projects: { name: string; address: string | null } | null;
  }[]) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:phase-${p.id}@vanessenbouwenonderhoud`,
      `DTSTART;VALUE=DATE:${dateStamp(p.start_date)}`,
      `DTEND;VALUE=DATE:${dateStamp(nextDay(p.end_date))}`,
      `SUMMARY:${icsEscape(`${p.projects?.name ?? "Project"} — ${p.title}`)}`,
      ...(p.projects?.address ? [`LOCATION:${icsEscape(p.projects.address)}`] : []),
      "END:VEVENT"
    );
  }

  for (const j of (jobs ?? []) as unknown as {
    id: string;
    title: string;
    start_date: string;
    end_date: string;
    address: string | null;
    kind: "klus" | "kantoor";
  }[]) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:job-${j.id}@vanessenbouwenonderhoud`,
      `DTSTART;VALUE=DATE:${dateStamp(j.start_date)}`,
      `DTEND;VALUE=DATE:${dateStamp(nextDay(j.end_date))}`,
      `SUMMARY:${icsEscape(j.kind === "kantoor" ? "Kantoor" : j.title)}`,
      ...(j.address ? [`LOCATION:${icsEscape(j.address)}`] : []),
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");

  return new Response(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="planning.ics"',
      "Cache-Control": "no-store",
    },
  });
}
