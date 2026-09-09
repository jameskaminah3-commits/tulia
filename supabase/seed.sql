insert into public.zones (id, name) values
  ('island', 'Mombasa Island'), ('nyali', 'Nyali'), ('bamburi', 'Bamburi'),
  ('shanzu', 'Shanzu'), ('mtwapa', 'Mtwapa')
on conflict (id) do update set name = excluded.name;

insert into public.zone_travel_matrix (from_zone, to_zone, minutes) values
  ('island', 'island', 15), ('island', 'nyali', 25), ('island', 'bamburi', 40), ('island', 'shanzu', 50), ('island', 'mtwapa', 60),
  ('nyali', 'island', 25), ('nyali', 'nyali', 15), ('nyali', 'bamburi', 20), ('nyali', 'shanzu', 30), ('nyali', 'mtwapa', 40),
  ('bamburi', 'island', 40), ('bamburi', 'nyali', 20), ('bamburi', 'bamburi', 15), ('bamburi', 'shanzu', 15), ('bamburi', 'mtwapa', 25),
  ('shanzu', 'island', 50), ('shanzu', 'nyali', 30), ('shanzu', 'bamburi', 15), ('shanzu', 'shanzu', 15), ('shanzu', 'mtwapa', 15),
  ('mtwapa', 'island', 60), ('mtwapa', 'nyali', 40), ('mtwapa', 'bamburi', 25), ('mtwapa', 'shanzu', 15), ('mtwapa', 'mtwapa', 15)
on conflict (from_zone, to_zone) do update set minutes = excluded.minutes;

insert into public.rooms (name) values ('Nyali Room 1'), ('Nyali Room 2') on conflict (name) do nothing;

insert into public.treatments (slug, name, description, duration_min, turnaround_min, requires_skill, sort_order) values
  ('mombasa-reset', 'The Mombasa Reset', 'A restorative full-body session for tired travellers and long coastal days.', 90, 15, null, 1),
  ('deep-release', 'Deep Release', 'Focused pressure and mobility work for shoulders, back, and legs.', 60, 15, 'deep_tissue', 2),
  ('quiet-hour', 'Quiet Hour', 'A gentle calming session designed to settle the nervous system.', 60, 15, null, 3)
on conflict (slug) do update set name = excluded.name, description = excluded.description, duration_min = excluded.duration_min, turnaround_min = excluded.turnaround_min, requires_skill = excluded.requires_skill;

insert into public.treatment_pricing (treatment_id, mode, price_kes)
select t.id, p.mode::public.delivery_mode, p.price_kes
from public.treatments t
join (values
  ('mombasa-reset', 'studio', 7000), ('mombasa-reset', 'home', 8500), ('mombasa-reset', 'hotel', 9000),
  ('deep-release', 'studio', 5000), ('deep-release', 'home', 6500), ('deep-release', 'hotel', 7000),
  ('quiet-hour', 'studio', 4200), ('quiet-hour', 'home', 5700)
) as p(slug, mode, price_kes) on p.slug = t.slug
on conflict (treatment_id, mode) do update set price_kes = excluded.price_kes, is_available = true;
