-- Controlled access views and idempotent payment settlement.

create or replace view public.therapist_booking_view
with (security_invoker = false, security_barrier = true) as
select
  b.id,
  b.reference,
  b.mode,
  b.status,
  lower(b.service_range) as service_start,
  upper(b.service_range) as service_end,
  split_part(p.full_name, ' ', 1) as client_first_name,
  case when b.mode = 'home' then b.address_line end as address_line,
  case when b.mode = 'home' then b.address_notes end as address_notes,
  case when b.mode = 'hotel' then b.hotel_name end as hotel_name,
  case when b.mode = 'hotel' then b.hotel_room_no end as hotel_room_no,
  t.name as treatment_name,
  t.duration_min
from public.bookings b
join public.profiles p on p.id = b.client_id
join public.treatments t on t.id = b.treatment_id
where b.therapist_id = auth.uid()
  and b.status in ('confirmed', 'in_progress', 'completed')
  and lower(b.service_range) between now() - interval '24 hours' and now() + interval '24 hours';

revoke all on public.therapist_booking_view from public;
grant select on public.therapist_booking_view to authenticated;

create or replace function public.process_payment_callback(
  p_provider text,
  p_provider_ref text,
  p_booking_id uuid,
  p_status public.payment_status,
  p_method text,
  p_amount_kes integer,
  p_receipt text default null,
  p_raw_callback jsonb default '{}'::jsonb
)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_booking public.bookings%rowtype;
begin
  if p_provider not in ('pesapal', 'intasend', 'dpo', 'daraja') then
    raise exception 'UNSUPPORTED_PROVIDER';
  end if;
  if p_method not in ('mpesa', 'card') then
    raise exception 'UNSUPPORTED_PAYMENT_METHOD';
  end if;
  if nullif(trim(p_provider_ref), '') is null then
    raise exception 'PROVIDER_REFERENCE_REQUIRED';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
  if p_amount_kes <> v_booking.price_kes then raise exception 'AMOUNT_MISMATCH'; end if;

  insert into public.payments (
    booking_id, provider, method, amount_kes, status, provider_ref, provider_receipt, raw_callback, settled_at
  ) values (
    p_booking_id, p_provider, p_method, p_amount_kes, p_status, p_provider_ref, p_receipt, p_raw_callback,
    case when p_status in ('succeeded', 'failed', 'refunded') then now() else null end
  ) on conflict (provider, provider_ref) do update set
    status = case
      when public.payments.status = 'succeeded' then 'succeeded'::public.payment_status
      when public.payments.status = 'refunded' then 'refunded'::public.payment_status
      else excluded.status
    end,
    provider_receipt = coalesce(excluded.provider_receipt, public.payments.provider_receipt),
    raw_callback = excluded.raw_callback,
    settled_at = coalesce(excluded.settled_at, public.payments.settled_at);

  if p_status <> 'succeeded' then return p_status::text; end if;
  if v_booking.status in ('confirmed', 'in_progress', 'completed') then return 'already_confirmed'; end if;
  if v_booking.status = 'cancelled' then return 'refund_required'; end if;

  begin
    update public.bookings set status = 'confirmed', confirmed_at = now() where id = p_booking_id;
  exception when exclusion_violation then
    update public.bookings
      set status = 'cancelled', cancelled_at = now(), cancellation_fee_kes = 0
      where id = p_booking_id;
    return 'refund_required';
  end;

  insert into public.notifications (booking_id, recipient_profile_id, channel, template, payload)
  values (
    p_booking_id, v_booking.client_id, 'whatsapp', 'booking_confirmed',
    jsonb_build_object('reference', v_booking.reference)
  ) on conflict do nothing;
  return 'confirmed';
end;
$$;

revoke all on function public.process_payment_callback(text, text, uuid, public.payment_status, text, integer, text, jsonb) from public;
grant execute on function public.process_payment_callback(text, text, uuid, public.payment_status, text, integer, text, jsonb) to service_role;

create or replace function public.log_staff_action(
  p_action text, p_entity_type text, p_entity_id uuid default null, p_metadata jsonb default '{}'::jsonb
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'STAFF_REQUIRED'; end if;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, p_metadata);
end;
$$;

revoke all on function public.log_staff_action(text, text, uuid, jsonb) from public;
grant execute on function public.log_staff_action(text, text, uuid, jsonb) to authenticated;
