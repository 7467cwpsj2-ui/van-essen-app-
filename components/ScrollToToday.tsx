"use client";

import { useEffect, useRef } from "react";

export function ScrollToToday({
  todayIdx,
  dayWidth = 30,
  leadDays = 3,
  children,
}: {
  todayIdx: number;
  dayWidth?: number;
  leadDays?: number;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && todayIdx >= 0) ref.current.scrollLeft = Math.max(0, (todayIdx - leadDays) * dayWidth);
  }, [todayIdx, dayWidth, leadDays]);

  return (
    <div className="gantt-scroll" ref={ref}>
      {children}
    </div>
  );
}
