-- Complete the admin workflow without exposing therapist credentials or
-- allowing browser clients to self-publish marketplace profiles.

create or replace function public.admin_update_therapist_profile(
  p_profile_id uuid,
  p_display_name text,
  p_bio text default null,
  p_photo_path text default null,
  p_gender text default null,
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
  if p_gender is not null and p_gender not in ('female', 'male', 'non_binary', 'prefer_not_to_say') then raise exception 'INVALID_GENDER'; end if;
  if not (p_serves_studio or p_serves_home or p_serves_hotel) then raise exception 'THERAPIST_NEEDS_A_SERVICE_SETTING'; end if;

  update public.profiles set role = 'therapist' where id = p_profile_id;
  insert into public.therapists (
    id, display_name, bio, photo_path, gender, home_zone,
    serves_studio, serves_home, serves_hotel
  ) values (
    p_profile_id, trim(p_display_name), nullif(trim(p_bio), ''), nullif(trim(p_photo_path), ''),
    p_gender, p_home_zone, p_serves_studio, p_serves_home, p_serves_hotel
  )
  on conflict (id) do update set
    display_name = excluded.display_name,
    bio = excluded.bio,
    photo_path = excluded.photo_path,
    gender = excluded.gender,
    home_zone = excluded.home_zone,
    serves_studio = excluded.serves_studio,
    serves_home = excluded.serves_home,
    serves_hotel = excluded.serves_hotel
  returning * into v_therapist;
  return v_therapist;
end;
$$;

create or replace function public.admin_verify_therapist_credential(
  p_therapist_id uuid,
  p_kind text,
  p_reference_no text,
  p_issuer text default null,
  p_expires_on date default null
)
returns public.therapist_credentials language plpgsql security definer set search_path = public as $$
declare
  v_credential public.therapist_credentials%rowtype;
begin
  if public.auth_role() <> 'admin' then raise exception 'ADMIN_REQUIRED'; end if;
  if not exists (select 1 from public.therapists where id = p_therapist_id) then raise exception 'THERAPIST_NOT_FOUND'; end if;
  if p_kind not in ('tvet_cdacc', 'knec', 'good_conduct', 'insurance', 'health') then raise exception 'INVALID_CREDENTIAL_KIND'; end if;
  if char_length(trim(coalesce(p_reference_no, ''))) < 2 then raise exception 'INVALID_CREDENTIAL_REFERENCE'; end if;

  insert into public.therapist_credentials (
    therapist_id, kind, issuer, reference_no, expires_on, verified_by, verified_at
  ) values (
    p_therapist_id, p_kind, nullif(trim(p_issuer), ''), trim(p_reference_no), p_expires_on, auth.uid(), now()
  )
  on conflict (therapist_id, kind, reference_no) do update set
    issuer = excluded.issuer,
    expires_on = excluded.expires_on,
    verified_by = auth.uid(),
    verified_at = now()
  returning * into v_credential;
  return v_credential;
end;
$$;

create or replace function public.admin_publish_therapist(p_therapist_id uuid)
returns public.therapists language plpgsql security definer set search_path = public as $$
declare
  v_therapist public.therapists%rowtype;
  v_missing integer;
begin
  if public.auth_role() <> 'admin' then raise exception 'ADMIN_REQUIRED'; end if;
  select count(*) into v_missing
  from unnest(array['tvet_cdacc', 'good_conduct', 'insurance']) required(kind)
  where not exists (
    select 1 from public.therapist_credentials c
    where c.therapist_id = p_therapist_id
      and c.kind = required.kind
      and c.verified_at is not null
      and (c.expires_on is null or c.expires_on >= current_date)
  );
  if v_missing > 0 then raise exception 'REQUIRED_CREDENTIALS_MISSING'; end if;

  update public.therapists
  set is_active = true, vetted_at = coalesce(vetted_at, now())
  where id = p_therapist_id
  returning * into v_therapist;
  if not found then raise exception 'THERAPIST_NOT_FOUND'; end if;
  return v_therapist;
end;
$$;

create or replace function public.admin_add_availability(
  p_therapist_id uuid,
  p_date date,
  p_start_time time,
  p_end_time time,
  p_note text default null
)
returns public.availability_windows language plpgsql security definer set search_path = public as $$
declare
  v_window public.availability_windows%rowtype;
  v_range tstzrange;
begin
  if public.auth_role() <> 'admin' then raise exception 'ADMIN_REQUIRED'; end if;
  if not exists (select 1 from public.therapists where id = p_therapist_id) then raise exception 'THERAPIST_NOT_FOUND'; end if;
  if p_date is null or p_start_time is null or p_end_time is null or p_date < current_date then raise exception 'INVALID_AVAILABILITY_DATE'; end if;
  if p_end_time <= p_start_time then raise exception 'INVALID_AVAILABILITY_RANGE'; end if;
  v_range := tstzrange(
    ((p_date + p_start_time) at time zone 'Africa/Nairobi'),
    ((p_date + p_end_time) at time zone 'Africa/Nairobi'),
    '[)'
  );
  insert into public.availability_windows (therapist_id, time_window, note)
  values (p_therapist_id, v_range, nullif(trim(p_note), ''))
  returning * into v_window;
  return v_window;
exception when exclusion_violation then
  raise exception 'AVAILABILITY_OVERLAPS_EXISTING';
end;
$$;

revoke all on function public.admin_update_therapist_profile(uuid, text, text, text, text, text, boolean, boolean, boolean) from public;
grant execute on function public.admin_update_therapist_profile(uuid, text, text, text, text, text, boolean, boolean, boolean) to authenticated;
revoke all on function public.admin_verify_therapist_credential(uuid, text, text, text, date) from public;
grant execute on function public.admin_verify_therapist_credential(uuid, text, text, text, date) to authenticated;
revoke all on function public.admin_publish_therapist(uuid) from public;
grant execute on function public.admin_publish_therapist(uuid) to authenticated;
revoke all on function public.admin_add_availability(uuid, date, time, time, text) from public;
grant execute on function public.admin_add_availability(uuid, date, time, time, text) to authenticated;
