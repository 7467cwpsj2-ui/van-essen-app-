// Herbruikbare shimmer-placeholder voor loading.tsx-bestanden — de meeste
// pagina's zijn een panel met een titelregel en een paar rijen, dus dit
// dekt de meerderheid zonder dat elke pagina zijn eigen skeleton hoeft
// te schrijven. `.skeleton` (met de shimmer-animatie) staat in globals.css.
export function SkeletonPanel({ rows = 4 }: { rows?: number }) {
  return (
    <div className="panel" style={{ animation: "none" }}>
      <div className="skeleton" style={{ width: "60%", height: 11 }} />
      <div className="task-list">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="task-row" style={{ boxShadow: "none" }}>
            <div className="task-body" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div className="skeleton" style={{ width: `${45 - (i % 3) * 5}%`, height: 13 }} />
              <div className="skeleton" style={{ width: `${70 - (i % 3) * 8}%`, height: 11 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
