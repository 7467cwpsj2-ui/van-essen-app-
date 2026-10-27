import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { markAllNotificationsRead } from "@/lib/actions/notifications";
import { timeAgo } from "@/lib/timeAgo";
import type { AppNotification } from "@/types/database";

// Dagafbakening op basis van de Nederlandse kalenderdag (niet de
// UTC-dag van de server), zelfde reden als de tijdzone-instelling bij
// de dashboard-groet.
function amsterdamDateKey(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam" }).format(new Date(iso));
}

export default async function MeldingenPage() {
  await requireUser();
  const supabase = createClient();
  const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(100);
  const items = (data ?? []) as AppNotification[];
  const hasUnread = items.some((n) => !n.read);

  const todayKey = amsterdamDateKey(new Date().toISOString());
  const yesterdayKey = amsterdamDateKey(new Date(Date.now() - 86400000).toISOString());
  const groups: { label: string; items: AppNotification[] }[] = [
    { label: "Vandaag", items: [] },
    { label: "Gisteren", items: [] },
    { label: "Eerder", items: [] },
  ];
  for (const n of items) {
    const key = amsterdamDateKey(n.created_at);
    const group = key === todayKey ? groups[0] : key === yesterdayKey ? groups[1] : groups[2];
    group.items.push(n);
  }

  return (
    <div className="panel">
      <div className="header-eyebrow">Overzicht</div>
      <h1 className="page-title">Meldingen</h1>
      <div className="hint-bar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <span>Alle meldingen die je hebt ontvangen, ook als een pushmelding een keer niet aankwam.</span>
        {hasUnread && (
          <form action={markAllNotificationsRead}>
            <button className="link-btn" type="submit">
              Alles als gelezen
            </button>
          </form>
        )}
      </div>
      {items.length === 0 ? (
        <div className="empty-hint">Nog geen meldingen.</div>
      ) : (
        groups
          .filter((g) => g.items.length > 0)
          .map((g) => (
            <div key={g.label} className="notif-group">
              <div className="notif-group-label">{g.label}</div>
              <div className="task-list">
                {g.items.map((n) => {
                  const row = (
                    <div className="task-body">
                      <div className="task-title">{n.title}</div>
                      {n.body && <div className="task-meta">{n.body}</div>}
                      <div className="task-meta mono">{timeAgo(n.created_at)}</div>
                    </div>
                  );
                  const rowClass = "task-row" + (n.read ? "" : " unread");
                  return n.url ? (
                    <Link key={n.id} href={n.url} className={rowClass}>
                      {row}
                    </Link>
                  ) : (
                    <div key={n.id} className={rowClass}>
                      {row}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
      )}
    </div>
  );
}
