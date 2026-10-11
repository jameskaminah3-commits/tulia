-- Admin-only setup actions for building the live marketplace without granting role
-- escalation or unrestricted profile updates to browser clients.

create or replace function public.admin_create_treatment(
  p_name text,
  p_description text,
  p_duration_min integer,
  p_studio_price integer,
  p_home_price integer default null,
  p_hotel_price integer default null
)
returns public.treatments language plpgsql security definer set search_path = public as $$
declare
  v_treatment public.treatments%rowtype;
  v_slug text;
begin
  if public.auth_role() not in ('admin', 'ops') then raise exception 'STAFF_REQUIRED'; end if;
  if char_length(trim(coalesce(p_name, ''))) < 2 then raise exception 'INVALID_TREATMENT_NAME'; end if;
  if char_length(trim(coalesce(p_description, ''))) < 12 then raise exception 'INVALID_TREATMENT_DESCRIPTION'; end if;
  if p_duration_min not between 30 and 240 then raise exception 'INVALID_TREATMENT_DURATION'; end if;
  if p_studio_price is null or p_studio_price <= 0 then raise exception 'INVALID_STUDIO_PRICE'; end if;
  if p_home_price is not null and p_home_price <= 0 then raise exception 'INVALID_HOME_PRICE'; end if;
  if p_hotel_price is not null and p_hotel_price <= 0 then raise exception 'INVALID_HOTEL_PRICE'; end if;

  v_slug := trim(both '-' from regexp_replace(lower(trim(p_name)), '[^a-z0-9]+', '-', 'g'));
  if v_slug = '' then raise exception 'INVALID_TREATMENT_NAME'; end if;
  if exists (select 1 from public.treatments where slug = v_slug or name = trim(p_name)) then
    raise exception 'TREATMENT_ALREADY_EXISTS';
  end if;

  insert into public.treatments (slug, name, description, duration_min, sort_order)
  values (v_slug, trim(p_name), trim(p_description), p_duration_min, coalesce((select max(sort_order) + 10 from public.treatments), 10))
  returning * into v_treatment;

  insert into public.treatment_pricing (treatment_id, mode, price_kes)
  select v_treatment.id, 'studio'::public.delivery_mode, p_studio_price
  union all select v_treatment.id, 'home'::public.delivery_mode, p_home_price where p_home_price is not null
  union all select v_treatment.id, 'hotel'::public.delivery_mode, p_hotel_price where p_hotel_price is not null;
  return v_treatment;
end;
$$;

create or replace function public.admin_create_zone(p_id text, p_name text)
returns public.zones language plpgsql security definer set search_path = public as $$
declare
  v_zone public.zones%rowtype;
begin
  if public.auth_role() not in ('admin', 'ops') then raise exception 'STAFF_REQUIRED'; end if;
  if p_id !~ '^[a-z0-9_-]+$' then raise exception 'INVALID_ZONE_ID'; end if;
  if char_length(trim(coalesce(p_name, ''))) < 2 then raise exception 'INVALID_ZONE_NAME'; end if;
  insert into public.zones (id, name, is_serviceable)
  values (p_id, trim(p_name), true)
  on conflict (id) do update set name = excluded.name, is_serviceable = true
  returning * into v_zone;
  return v_zone;
end;
$$;

create or replace function public.admin_onboard_therapist(
  p_profile_id uuid,
  p_display_name text,
  p_home_zone text default null,
  p_serves_studio boolean default true,
  p_serves_home boolean default false,
  p_serves_hotel boolean default false
)
returns public.therapists language plpgsql security definer set search_path = public as $$
declare
  v_therapist public.therapists%rowtype;
begin
  if public.auth_role() <> 'admin' then raise exception 'ADMIN_REQUIRED'; end if;
  if not exists (select 1 from public.profiles where id = p_profile_id) then raise exception 'PROFILE_NOT_FOUND'; end if;
  if char_length(trim(coalesce(p_display_name, ''))) < 2 then raise exception 'INVALID_DISPLAY_NAME'; end if;
  if not (p_serves_studio or p_serves_home or p_serves_hotel) then raise exception 'THERAPIST_NEEDS_A_SERVICE_SETTING'; end if;

  update public.profiles set role = 'therapist' where id = p_profile_id;
  insert into public.therapists (id, display_name, home_zone, serves_studio, serves_home, serves_hotel)
  values (p_profile_id, trim(p_display_name), p_home_zone, p_serves_studio, p_serves_home, p_serves_hotel)
  on conflict (id) do update set
    display_name = excluded.display_name,
    home_zone = excluded.home_zone,
    serves_studio = excluded.serves_studio,
    serves_home = excluded.serves_home,
    serves_hotel = excluded.serves_hotel
  returning * into v_therapist;
  return v_therapist;
end;
$$;

revoke all on function public.admin_create_treatment(text, text, integer, integer, integer, integer) from public;
grant execute on function public.admin_create_treatment(text, text, integer, integer, integer, integer) to authenticated;
revoke all on function public.admin_create_zone(text, text) from public;
grant execute on function public.admin_create_zone(text, text) to authenticated;
revoke all on function public.admin_onboard_therapist(uuid, text, text, boolean, boolean, boolean) from public;
grant execute on function public.admin_onboard_therapist(uuid, text, text, boolean, boolean, boolean) to authenticated;
