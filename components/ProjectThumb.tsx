import { gradientForProject, initialsForProject } from "@/lib/projectColor";

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
  if (coverPhotoUrl) return <img src={coverPhotoUrl} alt="" />;
  const [from, to] = gradientForProject(id, planningColor);
  return (
    <div className="thumb-fallback" style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}>
      <span>{initialsForProject(name)}</span>
    </div>
  );
}
