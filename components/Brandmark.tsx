export function Brandmark({ size = "normal" }: { size?: "normal" | "large" }) {
  return (
    <div className={"brandmark " + size}>
      <div className="brandmark-name">
        <span className="bm-van">VAN</span> <span className="bm-essen">ESSEN</span>
      </div>
      <div className="bm-sub">BOUW &amp; ONDERHOUD</div>
    </div>
  );
}
