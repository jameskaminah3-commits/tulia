-- Production foundation for the Mombasa Wellness booking platform.
-- Apply with `supabase db push`; never make production schema edits in the dashboard.

create extension if not exists btree_gist;
create extension if not exists pgcrypto;

create type public.user_role as enum ('client', 'therapist', 'ops', 'admin');
create type public.delivery_mode as enum ('studio', 'home', 'hotel');
create type public.booking_status as enum ('pending_payment', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show');
create type public.booking_origin as enum ('app', 'hotel_partner', 'walk_in', 'phone', 'corporate');
create type public.payment_status as enum ('pending', 'succeeded', 'failed', 'refunded', 'timed_out');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'client',
  full_name text not null check (char_length(trim(full_name)) between 2 and 120),
  phone text unique,
  created_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key references public.profiles(id) on delete cascade,
  email text,
  acquired_via text not null default 'app',
  is_pre_existing boolean not null default false,
  marketing_opt_out_at timestamptz,
  is_banned boolean not null default false,
  ban_reason text,
  notes text,
  created_at timestamptz not null default now()
);

create table public.zones (
  id text primary key check (id ~ '^[a-z0-9_-]+$'),
  name text not null,
  is_serviceable boolean not null default true
);

create table public.zone_travel_matrix (
  from_zone text not null references public.zones(id),
  to_zone text not null references public.zones(id),
  minutes integer not null check (minutes >= 0 and minutes <= 180),
  primary key (from_zone, to_zone)
);

create table public.therapists (
  id uuid primary key references public.profiles(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 2 and 120),
  bio text,
  photo_path text,
  gender text check (gender in ('female', 'male', 'non_binary', 'prefer_not_to_say')),
  home_zone text references public.zones(id),
  serves_home boolean not null default false,
  serves_hotel boolean not null default false,
  serves_studio boolean not null default true,
  commission_rate numeric(4,3) not null default 0.620 check (commission_rate between 0 and 1),
  is_active boolean not null default false,
  vetted_at timestamptz,
  masked_phone text,
  created_at timestamptz not null default now()
);

create table public.therapist_credentials (
  id uuid primary key default gen_random_uuid(),
  therapist_id uuid not null references public.therapists(id) on delete cascade,
  kind text not null check (kind in ('tvet_cdacc', 'knec', 'good_conduct', 'insurance', 'health')),
  issuer text,
  reference_no text,
  issued_on date,
  expires_on date,
  scan_path text,
  verified_by uuid references public.profiles(id),
  verified_at timestamptz,
  unique (therapist_id, kind, reference_no)
);

create table public.treatments (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null check (slug ~ '^[a-z0-9-]+$'),
  name text unique not null,
  description text not null,
  duration_min integer not null check (duration_min between 30 and 240),
  turnaround_min integer not null default 15 check (turnaround_min between 0 and 60),
  requires_skill text,
  is_active boolean not null default true,
  sort_order integer not null default 0
);

create table public.treatment_pricing (
  treatment_id uuid not null references public.treatments(id) on delete cascade,
  mode public.delivery_mode not null,
  price_kes integer not null check (price_kes > 0),
  is_available boolean not null default true,
  primary key (treatment_id, mode)
);

create table public.therapist_skills (
  therapist_id uuid not null references public.therapists(id) on delete cascade,
  skill text not null,
  primary key (therapist_id, skill)
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  is_active boolean not null default true
);

create table public.availability_windows (
  id uuid primary key default gen_random_uuid(),
  therapist_id uuid not null references public.therapists(id) on delete cascade,
  time_window tstzrange not null check (not isempty(time_window)),
  is_blocked boolean not null default false,
  note text,
  constraint no_overlapping_work_windows exclude using gist (therapist_id with =, time_window with &&)
    where (not is_blocked)
);

create table public.partners (
  id uuid primary key default gen_random_uuid(),
  code text unique not null check (code ~ '^[a-z0-9-]+$'),
  name text not null,
  kind text not null check (kind in ('hotel', 'corporate', 'influencer', 'agency')),
  commission_rate numeric(4,3) not null default 0.200 check (commission_rate between 0 and 1),
  contact_name text,
  contact_phone text,
  is_active boolean not null default true
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  reference text unique not null check (reference ~ '^MB-[A-Z0-9]{6}$'),
  client_id uuid not null references public.clients(id),
  therapist_id uuid not null references public.therapists(id),
  treatment_id uuid not null references public.treatments(id),
  mode public.delivery_mode not null,
  status public.booking_status not null default 'pending_payment',
  origin public.booking_origin not null default 'app',
  partner_id uuid references public.partners(id),
  service_range tstzrange not null check (not isempty(service_range)),
  blocked_range tstzrange not null check (blocked_range @> service_range and not isempty(blocked_range)),
  room_id uuid references public.rooms(id),
  zone_id text references public.zones(id),
  address_line text,
  address_notes text,
  hotel_name text,
  hotel_room_no text,
  price_kes integer not null check (price_kes > 0),
  therapist_share_kes integer check (therapist_share_kes >= 0),
  platform_share_kes integer check (platform_share_kes >= 0),
  attribution_source text,
  attribution_campaign text,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  cancelled_by uuid references public.profiles(id),
  cancellation_fee_kes integer not null default 0 check (cancellation_fee_kes >= 0),
  constraint studio_needs_room check (mode <> 'studio' or room_id is not null),
  constraint mobile_needs_zone check (mode = 'studio' or zone_id is not null),
  constraint home_needs_address check (mode <> 'home' or address_line is not null),
  constraint hotel_needs_name check (mode <> 'hotel' or hotel_name is not null)
);

-- The database, rather than application code, is the final authority on conflicts.
alter table public.bookings add constraint no_therapist_overlap
  exclude using gist (therapist_id with =, blocked_range with &&)
  where (status in ('confirmed', 'in_progress'));
alter table public.bookings add constraint no_room_overlap
  exclude using gist (room_id with =, blocked_range with &&)
  where (status in ('confirmed', 'in_progress') and room_id is not null);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id),
  provider text not null check (provider in ('pesapal', 'intasend', 'dpo', 'daraja')),
  method text not null check (method in ('mpesa', 'card')),
  amount_kes integer not null check (amount_kes > 0),
  currency text not null default 'KES' check (currency in ('KES', 'USD', 'EUR', 'GBP')),
  status public.payment_status not null default 'pending',
  provider_ref text,
  provider_receipt text,
  raw_callback jsonb,
  created_at timestamptz not null default now(),
  settled_at timestamptz,
  unique nulls not distinct (provider, provider_ref)
);

create table public.session_logs (
  booking_id uuid primary key references public.bookings(id) on delete cascade,
  checked_in_at timestamptz,
  check_in_lat numeric(9,6),
  check_in_lng numeric(9,6),
  checked_out_at timestamptz,
  check_out_lat numeric(9,6),
  check_out_lng numeric(9,6),
  therapist_notes text
);

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id),
  raised_by uuid not null references public.profiles(id),
  kind text not null check (kind in ('panic', 'misconduct', 'safety', 'no_show', 'complaint')),
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  description text,
  action_taken text,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete cascade,
  recipient_profile_id uuid references public.profiles(id),
  channel text not null check (channel in ('whatsapp', 'sms', 'push')),
  template text not null,
  payload jsonb not null default '{}'::jsonb,
  provider_message_id text,
  attempts integer not null default 0 check (attempts between 0 and 3),
  scheduled_for timestamptz not null default now(),
  sent_at timestamptz,
  delivered_at timestamptz,
  failed_at timestamptz,
  last_error text
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index bookings_therapist_range_idx on public.bookings using gist (therapist_id, blocked_range)
  where status in ('pending_payment', 'confirmed', 'in_progress');
create index bookings_client_idx on public.bookings (client_id, lower(service_range) desc);
create index notifications_dispatch_idx on public.notifications (scheduled_for)
  where sent_at is null and failed_at is null;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, full_name, phone)
  values (
    new.id,
    'client',
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'New client'),
    nullif(new.phone, '')
  );
  insert into public.clients (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.auth_role()
returns public.user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.auth_role() in ('ops', 'admin'), false)
$$;

create or replace function public.booking_zone(p_mode public.delivery_mode, p_zone text)
returns text language sql immutable as $$
  select case when p_mode = 'studio' then 'nyali' else p_zone end
$$;

create or replace function public.travel_minutes(p_from text, p_to text)
returns integer language sql stable as $$
  select coalesce(
    (select minutes from public.zone_travel_matrix where from_zone = p_from and to_zone = p_to),
    30
  )
$$;

create or replace function public.eligible_therapists(
  p_treatment_id uuid, p_mode public.delivery_mode, p_gender text default null
)
returns setof public.therapists language sql stable as $$
  select t.*
  from public.therapists t
  join public.treatments tr on tr.id = p_treatment_id and tr.is_active
  where t.is_active
    and t.vetted_at is not null
    and case p_mode when 'studio' then t.serves_studio when 'home' then t.serves_home else t.serves_hotel end
    and (p_gender is null or t.gender = p_gender)
    and (tr.requires_skill is null or exists (
      select 1 from public.therapist_skills s where s.therapist_id = t.id and s.skill = tr.requires_skill
    ))
    and not exists (
      select 1
      from unnest(array['tvet_cdacc', 'good_conduct', 'insurance']) required(kind)
      where not exists (
        select 1 from public.therapist_credentials c
        where c.therapist_id = t.id
          and c.kind = required.kind
          and c.verified_at is not null
          and (c.expires_on is null or c.expires_on >= current_date)
      )
    )
$$;

create or replace function public.available_slots(
  p_treatment_id uuid,
  p_date date,
  p_mode public.delivery_mode,
  p_zone text default null,
  p_gender text default null
)
returns table (start_at timestamptz, end_at timestamptz, therapist_id uuid, room_id uuid)
language sql stable security definer set search_path = public as $$
  with treatment as (
    select duration_min, turnaround_min from public.treatments where id = p_treatment_id and is_active
  ), candidates as (
    select gs as start_at, gs + make_interval(mins => tr.duration_min) as end_at, t.id as therapist_id, t.home_zone
    from public.eligible_therapists(p_treatment_id, p_mode, p_gender) t
    join public.availability_windows aw on aw.therapist_id = t.id and not aw.is_blocked
    cross join treatment tr
    cross join lateral generate_series(
      greatest(lower(aw.time_window), p_date::timestamp at time zone 'Africa/Nairobi'),
      least(upper(aw.time_window), (p_date + 1)::timestamp at time zone 'Africa/Nairobi') - make_interval(mins => tr.duration_min),
      interval '15 minutes'
    ) gs
    where not exists (
      select 1 from public.availability_windows blocked
      where blocked.therapist_id = t.id and blocked.is_blocked
        and blocked.time_window && tstzrange(gs, gs + make_interval(mins => tr.duration_min), '[)')
    )
  )
  select c.start_at, c.end_at, c.therapist_id,
    case when p_mode = 'studio' then (
      select r.id from public.rooms r
      cross join treatment tr
      where r.is_active and not exists (
        select 1 from public.bookings b
        where b.room_id = r.id and b.status in ('pending_payment', 'confirmed', 'in_progress')
          and (b.status <> 'pending_payment' or b.created_at > now() - interval '10 minutes')
          and b.blocked_range && tstzrange(c.start_at, c.end_at + make_interval(mins => tr.turnaround_min), '[)')
      ) order by r.name limit 1
    ) end as room_id
  from candidates c
  cross join treatment tr
  where c.start_at >= now() + interval '15 minutes'
    and not exists (
      select 1 from public.bookings b
      where b.therapist_id = c.therapist_id
        and b.status in ('pending_payment', 'confirmed', 'in_progress')
        and (b.status <> 'pending_payment' or b.created_at > now() - interval '10 minutes')
        and b.blocked_range && tstzrange(c.start_at, c.end_at + make_interval(mins => tr.turnaround_min), '[)')
    )
    and not exists (
      select 1 from public.bookings previous
      where previous.therapist_id = c.therapist_id
        and previous.status in ('pending_payment', 'confirmed', 'in_progress')
        and (previous.status <> 'pending_payment' or previous.created_at > now() - interval '10 minutes')
        and upper(previous.service_range) <= c.start_at
        and c.start_at < upper(previous.service_range) + make_interval(mins => tr.turnaround_min + public.travel_minutes(public.booking_zone(previous.mode, previous.zone_id), public.booking_zone(p_mode, p_zone)))
    )
    and not exists (
      select 1 from public.bookings next_booking
      where next_booking.therapist_id = c.therapist_id
        and next_booking.status in ('pending_payment', 'confirmed', 'in_progress')
        and (next_booking.status <> 'pending_payment' or next_booking.created_at > now() - interval '10 minutes')
        and lower(next_booking.service_range) >= c.end_at
        and c.end_at + make_interval(mins => tr.turnaround_min + public.travel_minutes(public.booking_zone(p_mode, p_zone), public.booking_zone(next_booking.mode, next_booking.zone_id))) > lower(next_booking.service_range)
    )
    and (p_mode <> 'studio' or exists (
      select 1 from public.rooms r
      where r.is_active and not exists (
        select 1 from public.bookings b
        where b.room_id = r.id and b.status in ('pending_payment', 'confirmed', 'in_progress')
          and (b.status <> 'pending_payment' or b.created_at > now() - interval '10 minutes')
          and b.blocked_range && tstzrange(c.start_at, c.end_at + make_interval(mins => tr.turnaround_min), '[)')
      )
    ));
$$;

create or replace function public.create_booking(
  p_treatment_id uuid, p_therapist_id uuid, p_start timestamptz,
  p_mode public.delivery_mode, p_zone text default null, p_room_id uuid default null,
  p_address text default null, p_address_notes text default null,
  p_hotel text default null, p_hotel_room_no text default null
)
returns public.bookings language plpgsql security definer set search_path = public as $$
declare
  v_treatment public.treatments%rowtype;
  v_price integer;
  v_booking public.bookings%rowtype;
  v_room uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_mode <> 'studio' and p_zone is null then raise exception 'ZONE_REQUIRED'; end if;
  if p_mode = 'home' and nullif(trim(coalesce(p_address, '')), '') is null then raise exception 'ADDRESS_REQUIRED'; end if;
  if p_mode = 'hotel' and nullif(trim(coalesce(p_hotel, '')), '') is null then raise exception 'HOTEL_REQUIRED'; end if;

  -- Serialise all same-therapist, same-day slot attempts, including payment holds.
  perform pg_advisory_xact_lock(hashtext(p_therapist_id::text || ':' || p_start::date::text));
  select * into v_treatment from public.treatments where id = p_treatment_id and is_active;
  if not found then raise exception 'TREATMENT_UNAVAILABLE'; end if;
  select price_kes into v_price from public.treatment_pricing
    where treatment_id = p_treatment_id and mode = p_mode and is_available;
  if v_price is null then raise exception 'PRICE_UNAVAILABLE'; end if;
  if exists (select 1 from public.clients where id = auth.uid() and is_banned) then
    raise exception 'CLIENT_NOT_ELIGIBLE';
  end if;
  select room_id into v_room from public.available_slots(p_treatment_id, p_start::date, p_mode, p_zone)
    where therapist_id = p_therapist_id and start_at = p_start
      and (p_mode <> 'studio' or p_room_id is null or room_id = p_room_id)
    limit 1;
  if not found then raise exception 'SLOT_TAKEN'; end if;

  insert into public.bookings (
    reference, client_id, therapist_id, treatment_id, mode, status, origin,
    service_range, blocked_range, room_id, zone_id, address_line, address_notes,
    hotel_name, hotel_room_no, price_kes
  ) values (
    'MB-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6)), auth.uid(), p_therapist_id,
    p_treatment_id, p_mode, 'pending_payment', 'app',
    tstzrange(p_start, p_start + make_interval(mins => v_treatment.duration_min), '[)'),
    tstzrange(p_start, p_start + make_interval(mins => v_treatment.duration_min + v_treatment.turnaround_min), '[)'),
    case when p_mode = 'studio' then v_room else null end, p_zone, p_address, p_address_notes,
    p_hotel, p_hotel_room_no, v_price
  ) returning * into v_booking;
  return v_booking;
exception when exclusion_violation then
  raise exception 'SLOT_TAKEN';
end;
$$;

create or replace function public.expire_pending_payment_bookings()
returns integer language plpgsql security definer set search_path = public as $$
declare v_count integer;
begin
  update public.bookings
  set status = 'cancelled', cancelled_at = now(), cancellation_fee_kes = 0
  where status = 'pending_payment' and created_at < now() - interval '10 minutes';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.zones enable row level security;
alter table public.zone_travel_matrix enable row level security;
alter table public.therapists enable row level security;
alter table public.therapist_credentials enable row level security;
alter table public.treatments enable row level security;
alter table public.treatment_pricing enable row level security;
alter table public.therapist_skills enable row level security;
alter table public.rooms enable row level security;
alter table public.availability_windows enable row level security;
alter table public.partners enable row level security;
alter table public.bookings enable row level security;
alter table public.payments enable row level security;
alter table public.session_logs enable row level security;
alter table public.incidents enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_log enable row level security;

create policy profiles_self on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_update_self on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid() and role = public.auth_role());
create policy clients_self on public.clients for select to authenticated using (id = auth.uid());
create policy clients_update_self on public.clients for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy bookings_client_read on public.bookings for select to authenticated using (client_id = auth.uid());
create policy payments_client_read on public.payments for select to authenticated using (exists (select 1 from public.bookings b where b.id = booking_id and b.client_id = auth.uid()));
create policy therapist_credentials_self on public.therapist_credentials for select to authenticated using (therapist_id = auth.uid());
create policy therapist_availability_self on public.availability_windows for all to authenticated using (therapist_id = auth.uid()) with check (therapist_id = auth.uid());
create policy therapist_incidents_insert on public.incidents for insert to authenticated with check (raised_by = auth.uid() and public.auth_role() = 'therapist');
create policy public_catalog_read on public.treatments for select using (is_active);
create policy public_pricing_read on public.treatment_pricing for select using (is_available);
create policy public_therapist_read on public.therapists for select using (is_active and vetted_at is not null);
create policy public_zone_read on public.zones for select using (is_serviceable);
create policy public_travel_read on public.zone_travel_matrix for select using (true);

create policy staff_profiles on public.profiles for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy staff_clients on public.clients for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy staff_therapists on public.therapists for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy staff_credentials on public.therapist_credentials for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy staff_catalog on public.treatments for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy staff_pricing on public.treatment_pricing for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy staff_skills on public.therapist_skills for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy staff_availability on public.availability_windows for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy staff_rooms on public.rooms for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy staff_partners on public.partners for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy staff_zones on public.zones for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy staff_travel on public.zone_travel_matrix for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy staff_bookings on public.bookings for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy staff_payments on public.payments for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy staff_sessions on public.session_logs for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy staff_incidents on public.incidents for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy staff_notifications on public.notifications for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy staff_audit on public.audit_log for select to authenticated using (public.is_staff());

-- RLS identifies the row; column grants prevent self-service privilege escalation.
revoke update on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;
revoke update on public.clients from authenticated;
grant update (email, marketing_opt_out_at) on public.clients to authenticated;

revoke all on function public.create_booking(uuid, uuid, timestamptz, public.delivery_mode, text, uuid, text, text, text, text) from public;
grant execute on function public.create_booking(uuid, uuid, timestamptz, public.delivery_mode, text, uuid, text, text, text, text) to authenticated;
revoke all on function public.available_slots(uuid, date, public.delivery_mode, text, text) from public;
grant execute on function public.available_slots(uuid, date, public.delivery_mode, text, text) to authenticated;
revoke all on function public.expire_pending_payment_bookings() from public;
grant execute on function public.expire_pending_payment_bookings() to service_role;
