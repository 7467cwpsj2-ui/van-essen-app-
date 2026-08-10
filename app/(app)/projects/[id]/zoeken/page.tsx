import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { canSeeModule, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

interface ResultItem {
  id: string;
  title: string;
  sub: string;
}

interface ResultSection {
  key: string;
  label: string;
  href: string;
  items: ResultItem[];
}

function mergeUnique<T extends { id: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  return rows.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
}

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short" }).format(new Date(iso));
}

export default async function ZoekenPage({ params, searchParams }: { params: { id: string }; searchParams: { q?: string } }) {
  const current = await requireUser();
  const q = (searchParams.q || "").trim();
  const supabase = createClient();
  const sections: ResultSection[] = [];

  if (q) {
    const like = `%${q}%`;

    if (canSeeModule(current, "chat")) {
      const { data } = await supabase
        .from("chat_messages")
        .select("id,text,author_name,created_at")
        .eq("project_id", params.id)
        .ilike("text", like)
        .order("created_at", { ascending: false })
        .limit(20);
      if (data?.length) {
        sections.push({
          key: "chat",
          label: "Chat",
          href: `/projects/${params.id}/chat`,
          items: data.map((m) => ({ id: m.id as string, title: m.text as string, sub: `${m.author_name || "?"} · ${fmtDate(m.created_at as string)}` })),
        });
      }
    }

    if (canSeeModule(current, "notities")) {
      const { data } = await supabase
        .from("notes")
        .select("id,text,author_name,created_at")
        .eq("project_id", params.id)
        .ilike("text", like)
        .order("created_at", { ascending: false })
        .limit(20);
      if (data?.length) {
        sections.push({
          key: "notities",
          label: "Notities",
          href: `/projects/${params.id}/notities`,
          items: data.map((n) => ({ id: n.id as string, title: n.text as string, sub: `${n.author_name || "?"} · ${fmtDate(n.created_at as string)}` })),
        });
      }
    }

    if (canSeeModule(current, "tekeningen")) {
      const [{ data: byTitle }, { data: byNote }] = await Promise.all([
        supabase.from("drawings").select("id,title,note").eq("project_id", params.id).ilike("title", like).limit(20),
        supabase.from("drawings").select("id,title,note").eq("project_id", params.id).ilike("note", like).limit(20),
      ]);
      const merged = mergeUnique([...(byTitle ?? []), ...(byNote ?? [])] as { id: string; title: string; note: string | null }[]);
      if (merged.length) {
        sections.push({
          key: "tekeningen",
          label: "Tekeningen",
          href: `/projects/${params.id}/tekeningen`,
          items: merged.map((d) => ({ id: d.id, title: d.title, sub: d.note || "" })),
        });
      }
    }

    if (canSeeModule(current, "fotos")) {
      const [{ data: byTitle }, { data: byNote }] = await Promise.all([
        supabase.from("photos").select("id,title,note").eq("project_id", params.id).ilike("title", like).limit(20),
        supabase.from("photos").select("id,title,note").eq("project_id", params.id).ilike("note", like).limit(20),
      ]);
      const merged = mergeUnique([...(byTitle ?? []), ...(byNote ?? [])] as { id: string; title: string; note: string | null }[]);
      if (merged.length) {
        sections.push({
          key: "fotos",
          label: "Foto's",
          href: `/projects/${params.id}/fotos`,
          items: merged.map((p) => ({ id: p.id, title: p.title, sub: p.note || "" })),
        });
      }
    }
  }

  return (
    <div>
      <div className="header-eyebrow">Zoeken</div>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20, margin: "0 0 14px", textTransform: "uppercase" }}>
        {q ? `Resultaten voor “${q}”` : "Zoeken"}
      </h1>
      {!q && <div className="empty-hint">Typ een zoekterm in het zoekvak hierboven.</div>}
      {q && sections.length === 0 && <div className="empty-hint">Niets gevonden voor “{q}”.</div>}
      {sections.map((s) => (
        <div key={s.key} className="overview-group">
          <Link href={s.href} className="overview-group-head">
            {s.label} <ArrowRight size={13} />
          </Link>
          <div className="task-list">
            {s.items.map((item) => (
              <div key={item.id} className="task-row">
                <div className="task-body">
                  <div className="task-title">{item.title}</div>
                  {item.sub && <div className="task-meta">{item.sub}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
