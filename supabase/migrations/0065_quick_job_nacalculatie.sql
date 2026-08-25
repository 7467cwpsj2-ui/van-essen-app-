-- Nacalculatie ook mogelijk maken voor losse klussen, niet alleen voor
-- projecten: een prijs (het afgesproken/gefactureerde bedrag) op de
-- klus zelf, en kostenposten die nu ook aan een klus kunnen hangen
-- i.p.v. alleen aan een project — zelfde patroon als al eerder bij
-- uren toegepast (migratie 0056): project_id wordt optioneel, met een
-- nieuwe quick_job_id ernaast, nooit allebei tegelijk.

alter table quick_jobs add column price numeric(10, 2) not null default 0;
alter table quick_jobs add column price_vat_type text not null default 'excl' check (price_vat_type in ('excl', 'incl'));

alter table cost_items alter column project_id drop not null;
alter table cost_items add column quick_job_id uuid references quick_jobs(id) on delete cascade;
alter table cost_items add constraint cost_items_target_check check (
  (project_id is not null and quick_job_id is null) or (project_id is null and quick_job_id is not null)
);

-- Zelfde harde regel als voorheen (alleen eigenaar, geen team/klant) —
-- nu met een extra branch voor de quick_job_id-kant. Een losse klus
-- kent geen "vergrendeld na oplevering"-status zoals een project, dus
-- daar is geen is_project_locked-check nodig.
drop policy if exists cost_items_select on cost_items;
create policy cost_items_select on cost_items for select
  using (
    is_owner() and (
      (project_id is not null and has_project_access(project_id))
      or quick_job_id is not null
    )
  );

drop policy if exists cost_items_write on cost_items;
create policy cost_items_write on cost_items for all
  using (
    is_owner() and (
      (project_id is not null and has_project_access(project_id) and not is_project_locked(project_id))
      or quick_job_id is not null
    )
  )
  with check (
    is_owner() and (
      (project_id is not null and has_project_access(project_id) and not is_project_locked(project_id))
      or quick_job_id is not null
    )
  );
