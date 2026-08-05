"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Abonneert op wijzigingen op `table` voor dit project en ververst de
// server-gerenderde data zodra er iets binnenkomt — zo lopen chat,
// meerwerk-beslissingen en opleverpunten live mee zonder handmatig
// verversen. Realtime respecteert dezelfde RLS als een gewone query,
// dus dit lekt nooit rijen die de gebruiker toch al niet mag zien.
export function useRealtimeRefresh(table: string, projectId: string) {
  const router = useRouter();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`${table}-${projectId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `project_id=eq.${projectId}` },
        () => {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => router.refresh(), 250);
        }
      )
      .subscribe();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [table, projectId, router]);
}
