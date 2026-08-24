export default function ProjectLoading() {
  return (
    <div>
      <div className="project-header" style={{ boxShadow: "none" }}>
        <div className="skeleton" style={{ width: 90, height: 10 }} />
        <div className="skeleton" style={{ width: 240, height: 26, marginTop: 8 }} />
        <div className="skeleton" style={{ width: 140, height: 11, marginTop: 8 }} />
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ width: 90, height: 30, borderRadius: 8 }} />
        ))}
      </div>
      <div className="panel" style={{ animation: "none" }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ width: "100%", height: 56 }} />
        ))}
      </div>
    </div>
  );
}
