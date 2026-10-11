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

-- Local/demo marketplace identities. These are deliberately deterministic so
-- `supabase db reset` produces a complete public directory every time. Replace
-- them with real authenticated users before using the seed for a live project.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'admin@tulia.example', crypt('tulia-demo-admin', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Tulia Admin"}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000011', 'authenticated', 'authenticated', 'amina.kimani@tulia.example', crypt('tulia-demo-therapist', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Amina Kimani"}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000012', 'authenticated', 'authenticated', 'zawadi.mwangi@tulia.example', crypt('tulia-demo-therapist', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Zawadi Mwangi"}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000013', 'authenticated', 'authenticated', 'neema.otieno@tulia.example', crypt('tulia-demo-therapist', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Neema Otieno"}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000021', 'authenticated', 'authenticated', 'client@tulia.example', crypt('tulia-demo-client', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Maya Hassan"}'::jsonb, now(), now())
on conflict (id) do nothing;

update public.profiles set role = 'admin', full_name = 'Tulia Admin'
where id = '00000000-0000-0000-0000-000000000001';

insert into public.therapists (
  id, display_name, bio, gender, home_zone, serves_studio, serves_home,
  serves_hotel, is_active, vetted_at
) values
  ('00000000-0000-0000-0000-000000000011', 'Amina Kimani', 'A restorative practitioner known for warm, unhurried full-body work and thoughtful pressure.', 'female', 'nyali', true, true, true, true, now()),
  ('00000000-0000-0000-0000-000000000012', 'Zawadi Mwangi', 'A precise deep-tissue therapist helping shoulders, backs, and busy travel days feel lighter.', 'female', 'bamburi', true, true, false, true, now()),
  ('00000000-0000-0000-0000-000000000013', 'Neema Otieno', 'A calming bodywork specialist creating quiet, grounding sessions for guests and local regulars.', 'female', 'shanzu', true, false, true, true, now())
on conflict (id) do update set
  display_name = excluded.display_name,
  bio = excluded.bio,
  gender = excluded.gender,
  home_zone = excluded.home_zone,
  serves_studio = excluded.serves_studio,
  serves_home = excluded.serves_home,
  serves_hotel = excluded.serves_hotel,
  is_active = true,
  vetted_at = coalesce(therapists.vetted_at, now());

insert into public.therapist_credentials (therapist_id, kind, issuer, reference_no, expires_on, verified_by, verified_at) values
  ('00000000-0000-0000-0000-000000000011', 'tvet_cdacc', 'TVETA', 'TULIA-AMINA-TVET', current_date + 365, '00000000-0000-0000-0000-000000000001', now()),
  ('00000000-0000-0000-0000-000000000011', 'good_conduct', 'DCI Kenya', 'TULIA-AMINA-GC', current_date + 365, '00000000-0000-0000-0000-000000000001', now()),
  ('00000000-0000-0000-0000-000000000011', 'insurance', 'Tulia Wellness', 'TULIA-AMINA-INS', current_date + 365, '00000000-0000-0000-0000-000000000001', now()),
  ('00000000-0000-0000-0000-000000000012', 'tvet_cdacc', 'TVETA', 'TULIA-ZAWADI-TVET', current_date + 365, '00000000-0000-0000-0000-000000000001', now()),
  ('00000000-0000-0000-0000-000000000012', 'good_conduct', 'DCI Kenya', 'TULIA-ZAWADI-GC', current_date + 365, '00000000-0000-0000-0000-000000000001', now()),
  ('00000000-0000-0000-0000-000000000012', 'insurance', 'Tulia Wellness', 'TULIA-ZAWADI-INS', current_date + 365, '00000000-0000-0000-0000-000000000001', now()),
  ('00000000-0000-0000-0000-000000000013', 'tvet_cdacc', 'TVETA', 'TULIA-NEEMA-TVET', current_date + 365, '00000000-0000-0000-0000-000000000001', now()),
  ('00000000-0000-0000-0000-000000000013', 'good_conduct', 'DCI Kenya', 'TULIA-NEEMA-GC', current_date + 365, '00000000-0000-0000-0000-000000000001', now()),
  ('00000000-0000-0000-0000-000000000013', 'insurance', 'Tulia Wellness', 'TULIA-NEEMA-INS', current_date + 365, '00000000-0000-0000-0000-000000000001', now())
on conflict (therapist_id, kind, reference_no) do update set
  issuer = excluded.issuer, expires_on = excluded.expires_on,
  verified_by = excluded.verified_by, verified_at = excluded.verified_at;

insert into public.therapist_skills (therapist_id, skill) values
  ('00000000-0000-0000-0000-000000000011', 'relaxation'),
  ('00000000-0000-0000-0000-000000000011', 'prenatal'),
  ('00000000-0000-0000-0000-000000000012', 'deep_tissue'),
  ('00000000-0000-0000-0000-000000000013', 'relaxation')
on conflict (therapist_id, skill) do nothing;

delete from public.availability_windows
where therapist_id in (
  '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000012',
  '00000000-0000-0000-0000-000000000013'
);

insert into public.availability_windows (therapist_id, time_window, note)
select therapist_id,
  tstzrange(
    ((current_date + day_offset + start_time) at time zone 'Africa/Nairobi'),
    ((current_date + day_offset + end_time) at time zone 'Africa/Nairobi'),
    '[)'
  ),
  'Tulia demo availability'
from (values
  ('00000000-0000-0000-0000-000000000011'::uuid, 1, time '09:00', time '17:00'),
  ('00000000-0000-0000-0000-000000000011'::uuid, 2, time '09:00', time '17:00'),
  ('00000000-0000-0000-0000-000000000012'::uuid, 1, time '10:00', time '18:00'),
  ('00000000-0000-0000-0000-000000000012'::uuid, 3, time '10:00', time '18:00'),
  ('00000000-0000-0000-0000-000000000013'::uuid, 1, time '12:00', time '20:00'),
  ('00000000-0000-0000-0000-000000000013'::uuid, 4, time '12:00', time '20:00')
) as schedule(therapist_id, day_offset, start_time, end_time);
