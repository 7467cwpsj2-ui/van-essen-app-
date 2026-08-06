export default function DashboardLoading() {
  return (
    <div className="dashboard">
      <div className="skeleton" style={{ width: 160, height: 12 }} />
      <div className="skeleton" style={{ width: 220, height: 24, marginTop: 6 }} />

      <div className="dash-cards">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="dash-card" style={{ boxShadow: "none" }}>
            <div className="skeleton" style={{ width: 30, height: 30, borderRadius: 9 }} />
            <div className="skeleton" style={{ width: "60%", height: 22, marginTop: 6 }} />
            <div className="skeleton" style={{ width: "80%", height: 11 }} />
          </div>
        ))}
      </div>

      <div className="dash-panels">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="dash-panel" style={{ boxShadow: "none" }}>
            <div className="skeleton" style={{ width: "50%", height: 13 }} />
            <div className="dash-panel-list">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 6px" }}>
                  <div className="skeleton" style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0 }} />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                    <div className="skeleton" style={{ width: "70%", height: 11 }} />
                    <div className="skeleton" style={{ width: "45%", height: 10 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="skeleton" style={{ width: 120, height: 11 }} />
      <div className="proj-card-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="proj-card" style={{ boxShadow: "none", cursor: "default" }}>
            <div className="skeleton" style={{ height: 100, borderRadius: 0 }} />
            <div className="proj-card-body">
              <div className="skeleton" style={{ width: "70%", height: 13 }} />
              <div className="skeleton" style={{ width: "40%", height: 11 }} />
              <div className="skeleton" style={{ width: "100%", height: 6, borderRadius: 4 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
