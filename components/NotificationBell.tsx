"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/actions/notifications";
import { timeAgo } from "@/lib/timeAgo";
import type { AppNotification } from "@/types/database";

export function NotificationBell({ items, unreadCount }: { items: AppNotification[]; unreadCount: number }) {
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const handleClick = (n: AppNotification) => {
    setOpen(false);
    if (!n.read) startTransition(() => markNotificationRead(n.id).catch(() => {}));
    if (n.url) router.push(n.url);
  };

  const markAll = () => {
    startTransition(() => markAllNotificationsRead().catch(() => {}));
  };

  return (
    <div className="notif-bell" ref={ref}>
      <button type="button" className="icon-btn ghost" onClick={() => setOpen((v) => !v)} title="Meldingen">
        <Bell size={14} />
        {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </button>
      {open && (
        <div className="notif-panel">
          <div className="notif-panel-head">
            <span>Meldingen</span>
            {unreadCount > 0 && (
              <button type="button" className="link-btn" onClick={markAll}>
                Alles als gelezen
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <div className="empty-hint small">Nog geen meldingen.</div>
          ) : (
            <div className="notif-list">
              {items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={"notif-row" + (n.read ? "" : " unread")}
                  onClick={() => handleClick(n)}
                >
                  {!n.read && <span className="notif-dot" />}
                  <span className="notif-row-body">
                    <span className="notif-row-title">{n.title}</span>
                    {n.body && <span className="notif-row-text">{n.body}</span>}
                    <span className="notif-row-time">{timeAgo(n.created_at)}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
          <Link href="/meldingen" className="notif-panel-foot" onClick={() => setOpen(false)}>
            Alle meldingen bekijken
          </Link>
        </div>
      )}
    </div>
  );
}
