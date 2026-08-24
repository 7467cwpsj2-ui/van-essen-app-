// Loading-placeholder die het fotorooster (.photo-grid/.photo-card)
// nabootst i.p.v. de generieke rijenlijst-skeleton — anders "springt"
// de pagina zichtbaar van rijen naar een rooster zodra de foto's laden.
export function SkeletonPhotoGrid({ tiles = 6 }: { tiles?: number }) {
  return (
    <div className="panel" style={{ animation: "none" }}>
      <div className="skeleton" style={{ width: "40%", height: 11 }} />
      <div className="photo-grid">
        {Array.from({ length: tiles }).map((_, i) => (
          <div key={i} className="photo-card" style={{ boxShadow: "none" }}>
            <div className="skeleton" style={{ aspectRatio: "1", borderRadius: 0 }} />
            <div className="photo-card-body">
              <div className="skeleton" style={{ width: "50%", height: 10 }} />
              <div className="skeleton" style={{ width: "80%", height: 12 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
