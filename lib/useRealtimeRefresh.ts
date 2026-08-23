"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Abonneert op wijzigingen op `table` waar `filterColumn` gelijk is aan
// `filterValue`, en ververst de server-gerenderde data zodra er iets
// binnenkomt — zo lopen chat, meerwerk-beslissingen en opleverpunten
// live mee zonder handmatig verversen. `filterColumn` is standaard
// `project_id` (de meeste realtime-tabellen zijn projectgebonden); de
// rechtstreekse berichten tussen eigenaar en teamlid geven hier
// `team_member_id` aan mee, want die staan los van een project.
// Realtime respecteert dezelfde RLS als een gewone query, dus dit lekt
// nooit rijen die de gebruiker toch al niet mag zien.
export function useRealtimeRefresh(table: string, filterValue: string, filterColumn: string = "project_id") {
  const router = useRouter();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`${table}-${filterColumn}-${filterValue}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `${filterColumn}=eq.${filterValue}` },
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
  }, [table, filterValue, filterColumn, router]);
}
