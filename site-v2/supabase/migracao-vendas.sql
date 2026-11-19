-- Maré Tur: reservas com vagas confirmadas, retenção e conferência do pagamento.
-- Aplicar depois de migracao-net.sql. Ofertas existentes passam a operar sob consulta.
begin;

alter table public.tours
  add column if not exists sales_mode text not null default 'consultation'
    check (sales_mode in ('consultation', 'booking')),
  add column if not exists departure_weekdays smallint[]
    check (departure_weekdays is null or
           (cardinality(departure_weekdays) between 1 and 7
            and array_position(departure_weekdays, null) is null
            and departure_weekdays <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]));

alter table public.bookings
  add column if not exists booking_request_id uuid,
  add column if not exists booking_request_hash text,
  add column if not exists reservation_expires_at timestamptz,
  add column if not exists payment_verified_at timestamptz,
  add column if not exists confirmed_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists attribution jsonb not null default '{}'::jsonb;

create unique index if not exists bookings_request_unique
  on public.bookings (booking_request_id) where booking_request_id is not null;
create index if not exists bookings_open_tour_day
  on public.bookings (tour_slug, tour_date) where status <> 'cancelado';

drop policy if exists pub_insert on public.bookings;

create or replace function public._booking_pix_ready(p_settings jsonb) returns boolean
language sql immutable set search_path = public as $$
  select coalesce(p_settings->'pix_payment_verified' = 'true'::jsonb, false)
     and coalesce(btrim(p_settings->>'pix_key'), '') <> ''
     and coalesce(btrim(p_settings->>'pix_name'), '') <> '';
$$;
revoke execute on function public._booking_pix_ready(jsonb) from public, anon, authenticated;

create or replace function public._booking_lock_slot(p_slug text, p_date date) returns void
language sql volatile set search_path = public as $$
  select pg_advisory_xact_lock(hashtextextended('maretur:slot:' || p_slug || ':' || (p_date - date '2000-01-01'), 0));
$$;
revoke execute on function public._booking_lock_slot(text, date) from public, anon, authenticated;

create or replace function public._booking_free_seats(p_slug text, p_date date, p_capacity int) returns int
language sql stable set search_path = public as $$
  select greatest(0, p_capacity - coalesce(sum(coalesce(x.adults, 0) + coalesce(x.children, 0) + coalesce(x.seniors, 0)), 0))::int
    from bookings x
    where x.tour_slug = p_slug and x.tour_date = p_date and x.status <> 'cancelado'
      and (x.status <> 'pendente' or x.reservation_expires_at is null or x.reservation_expires_at > now());
$$;
revoke execute on function public._booking_free_seats(text, date, int) from public, anon, authenticated;

create or replace function public._booking_public_quote(p_quote jsonb) returns jsonb
language sql immutable set search_path = public as $$
  select coalesce(jsonb_object_agg(item.key, item.value), '{}'::jsonb)
  from jsonb_each(p_quote) item
  where item.key in ('tour_slug', 'tour_name', 'tour_date', 'kind', 'adults', 'children', 'seniors',
    'people', 'pay_method', 'base', 'discount', 'buggy_cars', 'buggy', 'total', 'floor_applied',
    'deposit', 'collect_at_boarding', 'coupon', 'coupon_pct', 'seats_left');
$$;
revoke execute on function public._booking_public_quote(jsonb) from public, anon, authenticated;

create or replace function public._booking_attribution(p_booking jsonb) returns jsonb
language sql immutable set search_path = public as $$
  select coalesce(jsonb_object_agg(item.key, btrim(item.value)), '{}'::jsonb)
    from (values
      ('source', coalesce(nullif(p_booking->'attribution'->>'source', ''), nullif(p_booking->'attribution'->>'utm_source', ''), nullif(p_booking->>'utm_source', ''), p_booking->>'source')),
      ('medium', coalesce(nullif(p_booking->'attribution'->>'medium', ''), nullif(p_booking->'attribution'->>'utm_medium', ''), p_booking->>'utm_medium')),
      ('campaign', coalesce(nullif(p_booking->'attribution'->>'campaign', ''), nullif(p_booking->'attribution'->>'utm_campaign', ''), p_booking->>'utm_campaign')),
      ('content', coalesce(nullif(p_booking->'attribution'->>'content', ''), nullif(p_booking->'attribution'->>'utm_content', ''), p_booking->>'utm_content')),
      ('term', coalesce(nullif(p_booking->'attribution'->>'term', ''), nullif(p_booking->'attribution'->>'utm_term', ''), p_booking->>'utm_term'))
    ) item(key, value)
    where btrim(item.value) ~ '^[-[:alnum:]_.:/ ]{1,80}$';
$$;
revoke execute on function public._booking_attribution(jsonb) from public, anon, authenticated;

create or replace function public._price_booking(p jsonb) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  t tours;
  r tour_rates;
  c coupons;
  s jsonb := coalesce((select data from settings where id = 1), '{}'::jsonb);
  b jsonb := biz();
  adults int := greatest(0, least(30, coalesce((p->>'adults')::int, 0)));
  children int := greatest(0, least(30, coalesce((p->>'children')::int, 0)));
  seniors int := greatest(0, least(30, coalesce((p->>'seniors')::int, 0)));
  people int := adults + children + seniors;
  kind text := case when p->>'kind' = 'priv' then 'priv' else 'grupo' end;
  pay text := case when p->>'pay_method' = 'card' then 'card' else 'pix' end;
  d date := (p->>'tour_date')::date;
  unit numeric;
  base numeric;
  bprice numeric;
  cars int := 0;
  buggy numeric := 0;
  disc numeric := 0;
  total numeric;
  net numeric;
  ad numeric;
  min_margin numeric;
  floor_price numeric;
  commission_rate numeric := 0;
  card_rate numeric := 0;
  commission numeric;
  card_fee numeric;
  floor_applied boolean := false;
  dep_pct numeric;
  deposit numeric;
  free_seats int;
begin
  select * into t from tours where slug = p->>'tour_slug' and active;
  if not found then raise exception 'Passeio indisponível.'; end if;
  if t.sales_mode <> 'booking' or coalesce(t.capacity_per_day, 0) <= 0 or t.departure_weekdays is null then
    raise exception 'Confirme a disponibilidade deste passeio com nosso atendimento.';
  end if;

  select rate.* into r
    from tour_rates rate join suppliers supplier on supplier.id = rate.supplier_id
    where rate.tour_slug = t.slug and rate.preferred and rate.active and supplier.active;
  if not found then
    raise exception 'Confirme a disponibilidade deste passeio com nosso atendimento.';
  end if;
  if adults + seniors < 1 then raise exception 'A reserva precisa de pelo menos 1 adulto ou idoso.'; end if;
  if d is null or d < min_tour_date() then
    raise exception 'As saídas dessa data já fecharam. Escolha a partir de %.', to_char(min_tour_date(), 'DD/MM/YYYY');
  end if;
  if d > (now() at time zone 'America/Fortaleza')::date + 400 then raise exception 'Data muito distante.'; end if;
  if not (extract(isodow from d)::smallint = any(t.departure_weekdays)) then
    raise exception 'Este passeio não tem saída na data escolhida.';
  end if;

  free_seats := _booking_free_seats(t.slug, d, t.capacity_per_day);
  if free_seats < people then raise exception 'Restam % vagas nesta data.', free_seats; end if;

  if t.per_vehicle then kind := 'priv'; end if;
  if kind = 'priv' and t.price_private is null and not t.per_vehicle then kind := 'grupo'; end if;
  if kind = 'priv' and r.net_vehicle is null then
    raise exception 'Consulte as condições do passeio privativo com nosso atendimento.';
  end if;

  if pay = 'pix' and not _booking_pix_ready(s) then
    raise exception 'Confirme as opções de pagamento com nosso atendimento.';
  end if;
  unit := case when pay = 'pix' then t.price_pix else t.price_card end;
  base := case when t.per_vehicle then unit
    when kind = 'priv' then t.price_private * case when pay = 'pix' then 1 else t.price_card / nullif(t.price_pix, 0) end
    else (adults + seniors) * unit + children * unit * coalesce((s->>'child_factor')::numeric, 1) end;
  if base is null or base <= 0 then
    raise exception 'Consulte o valor desta opção com nosso atendimento.';
  end if;
  base := round(base, 2);

  select (e->>'price')::numeric into bprice
    from jsonb_array_elements(coalesce(t.extras, '[]'::jsonb)) e
    where coalesce((e->>'buggy')::boolean, false) and jsonb_typeof(e->'price') = 'number'
    limit 1;
  if coalesce((p->>'buggy')::boolean, false) and bprice is not null then
    cars := greatest(1, ceil(people / 4.0)::int);
    buggy := cars * bprice;
  end if;

  if coalesce(p->>'coupon', '') <> '' then
    select * into c from coupons where active and upper(code) = upper(trim(p->>'coupon'));
    if not found then raise exception 'Este cupom não está disponível.'; end if;
    if c.discount_pct not between 0 and 100 then raise exception 'Consulte este cupom com nosso atendimento.'; end if;
    disc := round(base * c.discount_pct / 100, 2);
    commission_rate := coalesce(c.commission_pct, 0);
  end if;
  if pay = 'card' then card_rate := coalesce((b->>'card_fee_pct')::numeric, 0); end if;
  if commission_rate < 0 or card_rate < 0 or commission_rate + card_rate >= 100 then
    raise exception 'Consulte o valor desta opção com nosso atendimento.';
  end if;

  net := case when kind = 'priv' then r.net_vehicle
    else (adults + seniors) * r.net_adult + children * coalesce(r.net_child, r.net_adult) end + buggy;
  ad := coalesce((b->>'ad_cost_per_pax')::numeric, 0) * people;
  min_margin := coalesce((b->>'min_margin_per_pax')::numeric, 0) * people;
  floor_price := ceil((net + ad + min_margin) / (1 - (commission_rate + card_rate) / 100));
  if floor_price > base + buggy then
    raise exception 'Consulte o valor desta opção com nosso atendimento.';
  end if;
  total := base - disc + buggy;
  if total < floor_price then
    total := floor_price;
    disc := base + buggy - total;
    floor_applied := true;
  end if;

  if pay = 'card' then
    deposit := total;
  else
    dep_pct := coalesce((s->>'deposit_pct')::numeric, 20);
    if dep_pct not between 1 and 100 then
      raise exception 'Confirme as opções de pagamento com nosso atendimento.';
    end if;
    deposit := round(total * dep_pct / 100, 2);
    if deposit <= 0 or deposit > total - net then
      raise exception 'Confirme as opções de pagamento com nosso atendimento.';
    end if;
  end if;

  commission := round(total * commission_rate / 100, 2);
  card_fee := round(total * card_rate / 100, 2);
  return jsonb_build_object(
    'tour_slug', t.slug, 'tour_name', t.name, 'tour_date', d, 'kind', kind,
    'adults', adults, 'children', children, 'seniors', seniors, 'people', people, 'pay_method', pay,
    'base', base, 'discount', disc, 'buggy_cars', cars, 'buggy', buggy, 'total', total, 'floor_applied', floor_applied,
    'deposit', deposit, 'collect_at_boarding', total - deposit, 'coupon', c.code, 'coupon_pct', c.discount_pct,
    'supplier_id', r.supplier_id, 'net_total', net, 'ad_cost', ad, 'commission', commission, 'card_fee', card_fee,
    'supplier_settlement', total - deposit - net, 'profit', total - net - ad - commission - card_fee,
    'seats_left', free_seats - people
  );
end $$;
revoke execute on function public._price_booking(jsonb) from public, anon, authenticated;

create or replace function public.quote_booking(p jsonb) returns jsonb
language sql stable security definer set search_path = public as $$
  select _booking_public_quote(_price_booking(p));
$$;
revoke execute on function public.quote_booking(jsonb) from public;
grant execute on function public.quote_booking(jsonb) to anon, authenticated;

create or replace function public.seats_left(p_slug text, p_date date) returns int
language sql stable security definer set search_path = public as $$
  select _booking_free_seats(t.slug, p_date, t.capacity_per_day)
    from tours t
    where t.slug = p_slug and t.active and t.sales_mode = 'booking' and t.capacity_per_day > 0
      and extract(isodow from p_date)::smallint = any(t.departure_weekdays)
      and p_date between min_tour_date() and (now() at time zone 'America/Fortaleza')::date + 400
      and exists (
        select 1 from tour_rates rate join suppliers supplier on supplier.id = rate.supplier_id
          where rate.tour_slug = t.slug and rate.preferred and rate.active and supplier.active
      );
$$;
revoke execute on function public.seats_left(text, date) from public;
grant execute on function public.seats_left(text, date) to anon, authenticated;

create or replace function public._booking_reply(p_row public.bookings, p_quote jsonb)
returns jsonb language sql volatile set search_path = public as $$
  with verified_receiver as (
    select jsonb_build_object('key', btrim(s.data->>'pix_key'), 'name', btrim(s.data->>'pix_name')) as details
    from settings s
    where s.id = 1 and _booking_pix_ready(s.data)
      and p_row.pay_method = 'pix' and p_row.status = 'pendente'
      and p_row.reservation_expires_at > clock_timestamp()
      and exists (
        select 1 from tours t join tour_rates rate on rate.tour_slug = t.slug
          join suppliers supplier on supplier.id = rate.supplier_id
        where t.slug = p_row.tour_slug and t.active and t.sales_mode = 'booking'
          and supplier.id = p_row.supplier_id and supplier.active and rate.active and rate.preferred
      )
  )
  select _booking_public_quote(p_quote) || jsonb_build_object(
    'id', p_row.id, 'code', p_row.code, 'status', p_row.status,
    'reservation_expires_at', p_row.reservation_expires_at,
    'payment_ready', exists (select 1 from verified_receiver)
  ) || coalesce((select jsonb_build_object('pix_details', details) from verified_receiver), '{}'::jsonb);
$$;
revoke execute on function public._booking_reply(public.bookings, jsonb) from public, anon, authenticated;

create or replace function public.create_booking(p jsonb) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  q jsonb;
  saved bookings;
  b jsonb := biz();
  s jsonb := coalesce((select data from settings where id = 1), '{}'::jsonb);
  name text := btrim(coalesce(p->>'customer_name', ''));
  phone text := regexp_replace(coalesce(p->>'phone', ''), '[^0-9]', '', 'g');
  ref uuid := coalesce(nullif(p->>'request_id', '')::uuid, gen_random_uuid());
  signature text := encode(sha256(convert_to((p - array['source', 'attribution']::text[])::text, 'UTF8')), 'hex');
  tracked jsonb := _booking_attribution(p);
  slot_date date := (p->>'tour_date')::date;
  hold_minutes int := 30;
begin
  if length(name) not between 2 and 120 then raise exception 'Informe seu nome.'; end if;
  if length(phone) not between 10 and 15 then raise exception 'Informe o WhatsApp com DDD.'; end if;

  perform pg_advisory_xact_lock(hashtextextended('maretur:request:' || ref::text, 0));
  select * into saved from bookings where booking_request_id = ref;
  if found then
    if saved.booking_request_hash is distinct from signature then
      raise exception 'Este pedido já foi utilizado. Inicie uma nova solicitação ou fale com nosso atendimento.';
    end if;
    return _booking_reply(saved, to_jsonb(saved) || jsonb_build_object(
      'people', saved.adults + saved.children + saved.seniors,
      'buggy', saved.buggy_amount,
      'seats_left', seats_left(saved.tour_slug, saved.tour_date)
    ));
  end if;

  if p->>'tour_slug' is null or slot_date is null then raise exception 'Selecione o passeio e a data.'; end if;
  perform _booking_lock_slot(p->>'tour_slug', slot_date);
  q := _price_booking(p);
  if (p->>'expected_total' is not null and (p->>'expected_total')::numeric <> (q->>'total')::numeric)
     or (p->>'expected_deposit' is not null and (p->>'expected_deposit')::numeric <> (q->>'deposit')::numeric) then
    raise exception 'A cotação mudou. Atualize os valores antes de reservar.';
  end if;
  if s->>'reservation_hold_minutes' ~ '^[0-9]{1,3}$' then
    hold_minutes := greatest(5, least(120, (s->>'reservation_hold_minutes')::int));
  end if;

  insert into bookings (
    tour_slug, tour_name, tour_date, kind, adults, children, seniors, buggy_cars, coupon, pay_method, total,
    customer_name, phone, hotel, status, supplier_id, base, buggy_amount, discount, floor_applied, net_total,
    ad_cost, commission, card_fee, deposit, collect_at_boarding, supplier_settlement, profit, partner_share,
    lang, source, attribution, booking_request_id, booking_request_hash, reservation_expires_at
  ) values (
    q->>'tour_slug', q->>'tour_name', (q->>'tour_date')::date, q->>'kind', (q->>'adults')::int,
    (q->>'children')::int, (q->>'seniors')::int, (q->>'buggy_cars')::int, q->>'coupon', q->>'pay_method', (q->>'total')::numeric,
    name, phone, nullif(left(btrim(p->>'hotel'), 200), ''), 'pendente', (q->>'supplier_id')::bigint,
    (q->>'base')::numeric, (q->>'buggy')::numeric, (q->>'discount')::numeric, (q->>'floor_applied')::boolean,
    (q->>'net_total')::numeric, (q->>'ad_cost')::numeric, (q->>'commission')::numeric, (q->>'card_fee')::numeric,
    (q->>'deposit')::numeric, (q->>'collect_at_boarding')::numeric, (q->>'supplier_settlement')::numeric,
    (q->>'profit')::numeric, round((q->>'profit')::numeric * coalesce((b->>'partner_split_pct')::numeric, 50) / 100, 2),
    case when p->>'lang' in ('pt', 'es', 'en') then p->>'lang' else 'pt' end,
    tracked->>'source', tracked, ref, signature, clock_timestamp() + make_interval(mins => hold_minutes)
  ) returning * into saved;

  update bookings set code = 'MT-' || (saved.id + 1000) where id = saved.id returning * into saved;
  perform notify_ops('Nova solicitação ' || saved.code, 'Confira o pedido pendente no painel.',
    coalesce(b->>'admin_url', '') || '#' || saved.code);
  return _booking_reply(saved, q);
end $$;
revoke execute on function public.create_booking(jsonb) from public;
grant execute on function public.create_booking(jsonb) to anon, authenticated;

create or replace function public._booking_status_transition() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.status = new.status then return new; end if;

  if old.booking_request_id is not null and new.status <> 'cancelado' then
    if not ((old.status = 'pendente' and new.status = 'pago')
         or (old.status = 'pago' and new.status = 'confirmado')
         or (old.status = 'confirmado' and new.status = 'realizado' and new.boarded_at is not null)) then
      raise exception 'Registre pagamento, confirmação e embarque antes de concluir o passeio.';
    end if;
    if new.status = 'pago' then
      perform _booking_lock_slot(old.tour_slug, old.tour_date);
      if old.reservation_expires_at <= clock_timestamp() then
        raise exception 'A retenção expirou. Concilie o pagamento e confirme novas vagas com o atendimento.';
      end if;
    end if;
  end if;

  if new.status = 'pago' then new.payment_verified_at := clock_timestamp(); end if;
  if new.status = 'confirmado' then new.confirmed_at := clock_timestamp(); end if;
  if new.status = 'realizado' then new.completed_at := clock_timestamp(); end if;
  return new;
end $$;
revoke execute on function public._booking_status_transition() from public, anon, authenticated;

drop trigger if exists booking_status_transition on public.bookings;
create trigger booking_status_transition before update of status on public.bookings
  for each row execute function public._booking_status_transition();

commit;
