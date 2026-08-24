import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createProject } from "@/lib/actions/projects";
import type { Client } from "@/types/database";

export default async function NewProjectPage() {
  await requireOwner();
  const supabase = createClient();
  const { data: clients } = await supabase.from("clients").select("*").order("name");
  const clientList = (clients ?? []) as Client[];

  return (
    <div className="panel" style={{ maxWidth: 480 }}>
      <div className="header-eyebrow">Nieuw project</div>
      <h1 className="page-title">
        Project aanmaken
      </h1>
      <form action={createProject} className="add-form">
        <div className="add-form-title">Projectgegevens</div>
        <input name="name" placeholder="Projectnaam" required />
        <input name="address" placeholder="Adres" />
        <select name="client_id" defaultValue="">
          <option value="">Geen klant gekoppeld</option>
          {clientList.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-primary">
          Project aanmaken
        </button>
      </form>
      <div className="hint-bar small">
        Sjablonen voor de bouwplanning volgen in een latere fase — de bouwplanning en planning stel je na het aanmaken zelf samen bij het project.
      </div>
    </div>
  );
}
