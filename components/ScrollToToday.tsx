"use client";

import { useEffect, useRef } from "react";

export function ScrollToToday({ todayIdx, children }: { todayIdx: number; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && todayIdx >= 0) {
      const leadDays = 3;
      const dayWidth = 30;
      ref.current.scrollLeft = Math.max(0, (todayIdx - leadDays) * dayWidth);
    }
  }, [todayIdx]);

  return (
    <div className="gantt-scroll" ref={ref}>
      {children}
    </div>
  );
}
