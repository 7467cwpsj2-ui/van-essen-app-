import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { markAllNotificationsRead } from "@/lib/actions/notifications";
import { timeAgo } from "@/lib/timeAgo";
import type { AppNotification } from "@/types/database";

export default async function MeldingenPage() {
  await requireUser();
  const supabase = createClient();
  const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(100);
  const items = (data ?? []) as AppNotification[];
  const hasUnread = items.some((n) => !n.read);

  return (
    <div className="panel">
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
        <div className="task-list">
          {items.map((n) => {
            const row = (
              <div className="task-body">
                <div className="task-title">
                  {n.title}
                  {!n.read && <span className="notif-dot" style={{ display: "inline-block", marginLeft: 6, marginTop: 0, verticalAlign: 2 }} />}
                </div>
                {n.body && <div className="task-meta">{n.body}</div>}
                <div className="task-meta mono">{timeAgo(n.created_at)}</div>
              </div>
            );
            return n.url ? (
              <Link key={n.id} href={n.url} className="task-row">
                {row}
              </Link>
            ) : (
              <div key={n.id} className="task-row">
                {row}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
