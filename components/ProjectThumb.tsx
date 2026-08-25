import Image from "next/image";
import { gradientForProject, initialsForProject, readableTextColor } from "@/lib/projectColor";

export function ProjectThumb({
  id,
  name,
  coverPhotoUrl,
  planningColor,
}: {
  id: string;
  name: string;
  coverPhotoUrl: string | null;
  planningColor?: string | null;
}) {
  // fill i.p.v. een vaste breedte/hoogte, want dit ene component wordt
  // in drie verschillende maten hergebruikt (zijbalk, projectkaart,
  // dashboard-rij) — de omringende CSS bepaalt de daadwerkelijke maat.
  if (coverPhotoUrl) return <Image src={coverPhotoUrl} alt="" fill sizes="128px" style={{ objectFit: "cover" }} />;
  const [from, to] = gradientForProject(id, planningColor);
  return (
    <div className="thumb-fallback" style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}>
      <span style={{ color: readableTextColor(from) }}>{initialsForProject(name)}</span>
    </div>
  );
}
