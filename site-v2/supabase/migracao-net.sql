-- Maré Tur · empresas, net, preço mínimo, operação e acerto (17/11/2026)
-- Regra: docs/alma-do-negocio.md. O net nunca sai do banco para o público.

create extension if not exists pg_net with schema extensions;

-- Empresas que operam os passeios (Enseada etc.)
create table if not exists suppliers (
  id bigint generated always as identity primary key,
  name text not null unique,
  whatsapp text default '',
  contact_name text default '',
  pickup_notes text default '',
  msg_template text default '',
  active boolean default true,
  created_at timestamptz default now()
);

-- Net de cada passeio em cada empresa
create table if not exists tour_rates (
  id bigint generated always as identity primary key,
  tour_slug text not null references tours(slug) on update cascade on delete cascade,
  supplier_id bigint not null references suppliers(id) on delete cascade,
  net_adult numeric(10,2) not null check (net_adult >= 0),
  net_child numeric(10,2) check (net_child >= 0),
  net_vehicle numeric(10,2) check (net_vehicle >= 0),
  preferred boolean default false,
  active boolean default true,
  notes text default '',
  updated_at timestamptz default now(),
  unique (tour_slug, supplier_id)
);
create unique index if not exists tour_rates_one_preferred on tour_rates(tour_slug) where preferred and active;

-- Configurações internas (não públicas)
create table if not exists biz_settings (
  id int primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);
insert into biz_settings (id, data) values (1, jsonb_build_object(
  'ad_cost_per_pax', 5, 'min_margin_per_pax', 10, 'partner_name', 'Bruno', 'partner_split_pct', 50,
  'card_fee_pct', 5,
  'notify_topic', 'maretur-' || replace(gen_random_uuid()::text, '-', ''),
  'admin_url', 'https://maretur.onrender.com/admin.html'
)) on conflict (id) do nothing;

alter table tours add column if not exists capacity_per_day int check (capacity_per_day is null or capacity_per_day >= 0);
alter table tours add column if not exists i18n jsonb default '{}'::jsonb;

alter table bookings add column if not exists code text unique;
alter table bookings add column if not exists supplier_id bigint references suppliers(id) on delete set null;
alter table bookings add column if not exists base numeric(10,2);
alter table bookings add column if not exists buggy_amount numeric(10,2) default 0;
alter table bookings add column if not exists discount numeric(10,2) default 0;
alter table bookings add column if not exists floor_applied boolean default false;
alter table bookings add column if not exists net_total numeric(10,2);
alter table bookings add column if not exists ad_cost numeric(10,2) default 0;
alter table bookings add column if not exists commission numeric(10,2) default 0;
alter table bookings add column if not exists card_fee numeric(10,2) default 0;
alter table bookings add column if not exists deposit numeric(10,2);
alter table bookings add column if not exists collect_at_boarding numeric(10,2);
alter table bookings add column if not exists supplier_settlement numeric(10,2);
alter table bookings add column if not exists settlement_done_at timestamptz;
alter table bookings add column if not exists profit numeric(10,2);
alter table bookings add column if not exists partner_share numeric(10,2);
alter table bookings add column if not exists sent_to_supplier_at timestamptz;
alter table bookings add column if not exists boarded_at timestamptz;
alter table bookings add column if not exists no_show boolean default false;
alter table bookings add column if not exists reminder_sent_at timestamptz;
alter table bookings add column if not exists review_asked_at timestamptz;
alter table bookings add column if not exists offer_sent_at timestamptz;
alter table bookings add column if not exists lang text default 'pt';
alter table bookings add column if not exists source text;

alter table suppliers enable row level security;
alter table tour_rates enable row level security;
alter table biz_settings enable row level security;
drop policy if exists admin_all on suppliers; create policy admin_all on suppliers for all using (is_admin()) with check (is_admin());
drop policy if exists admin_all on tour_rates; create policy admin_all on tour_rates for all using (is_admin()) with check (is_admin());
drop policy if exists admin_all on biz_settings; create policy admin_all on biz_settings for all using (is_admin()) with check (is_admin());

-- Reserva só pelo servidor: o preço é recalculado aqui, nunca confiado ao navegador
drop policy if exists pub_insert on bookings;

create or replace function biz() returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce((select data from biz_settings where id = 1), '{}'::jsonb);
$$;
revoke execute on function biz() from public, anon, authenticated;

-- Data mínima: amanhã; depois do horário de corte, depois de amanhã (fuso de Fortaleza)
create or replace function min_tour_date() returns date language sql stable security definer set search_path = public as $$
  select (now() at time zone 'America/Fortaleza')::date
       + case when extract(hour from now() at time zone 'America/Fortaleza') >= coalesce(((select data from settings where id = 1)->>'cutoff_hour')::int, 20) then 2 else 1 end;
$$;
grant execute on function min_tour_date() to anon, authenticated;

-- Preço mínimo por pessoa (adulto) de um passeio, pela empresa preferida
create or replace function tour_floor(p_slug text, p_pay text default 'pix') returns numeric
language plpgsql stable security definer set search_path = public as $$
declare r tour_rates; b jsonb := biz(); f numeric;
begin
  select * into r from tour_rates where tour_slug = p_slug and active order by preferred desc, net_adult asc limit 1;
  if not found then return null; end if;
  f := r.net_adult + coalesce((b->>'ad_cost_per_pax')::numeric, 0) + coalesce((b->>'min_margin_per_pax')::numeric, 0);
  if p_pay = 'card' then f := f / (1 - coalesce((b->>'card_fee_pct')::numeric, 0) / 100); end if;
  return ceil(f);
end $$;
revoke execute on function tour_floor(text, text) from public, anon;
grant execute on function tour_floor(text, text) to authenticated;

-- Cálculo completo (interno). Devolve também o net: nunca expor direto ao público.
create or replace function _price_booking(p jsonb) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  t tours; r tour_rates; c coupons; s jsonb; b jsonb := biz();
  adults int := greatest(0, least(30, coalesce((p->>'adults')::int, 0)));
  children int := greatest(0, least(30, coalesce((p->>'children')::int, 0)));
  seniors int := greatest(0, least(30, coalesce((p->>'seniors')::int, 0)));
  people int; kind text := case when p->>'kind' = 'priv' then 'priv' else 'grupo' end;
  pay text := case when p->>'pay_method' = 'card' then 'card' else 'pix' end;
  d date := (p->>'tour_date')::date;
  unit numeric; base numeric; bprice numeric; cars int := 0; buggy numeric := 0; disc numeric := 0; total numeric;
  net numeric; ad numeric; minm numeric; comm_pct numeric := 0; fee_pct numeric := 0; flo numeric; floor_applied boolean := false;
  dep_pct numeric; deposit numeric; taken int; cap int;
begin
  select data into s from settings where id = 1; s := coalesce(s, '{}'::jsonb);
  select * into t from tours where slug = p->>'tour_slug' and active;
  if not found then raise exception 'Passeio indisponível.'; end if;
  if adults + seniors < 1 then raise exception 'A reserva precisa de pelo menos 1 adulto ou idoso.'; end if;
  if d is null or d < min_tour_date() then raise exception 'As saídas dessa data já fecharam. Escolha a partir de %.', to_char(min_tour_date(), 'DD/MM/YYYY'); end if;
  if d > (now() at time zone 'America/Fortaleza')::date + 400 then raise exception 'Data muito distante.'; end if;
  people := adults + children + seniors;
  if t.per_vehicle then kind := 'priv'; end if;
  if kind = 'priv' and t.price_private is null and not t.per_vehicle then kind := 'grupo'; end if;

  cap := t.capacity_per_day;
  if cap is not null then
    select coalesce(sum(x.adults + x.children + x.seniors), 0) into taken from bookings x where x.tour_slug = t.slug and x.tour_date = d and x.status <> 'cancelado';
    if taken + people > cap then raise exception 'Restam % vagas nesta data.', greatest(cap - taken, 0); end if;
  end if;

  unit := case when pay = 'pix' then t.price_pix else t.price_card end;
  base := case when t.per_vehicle then unit
               when kind = 'priv' then t.price_private * case when pay = 'pix' then 1 else t.price_card / nullif(t.price_pix, 0) end
               else (adults + seniors) * unit + children * unit * coalesce((s->>'child_factor')::numeric, 1) end;
  base := round(base, 2);

  select (e->>'price')::numeric into bprice from jsonb_array_elements(coalesce(t.extras, '[]'::jsonb)) e
   where coalesce((e->>'buggy')::boolean, false) and jsonb_typeof(e->'price') = 'number' limit 1;
  if coalesce((p->>'buggy')::boolean, false) and bprice is not null then cars := greatest(1, ceil(people / 4.0)::int); buggy := cars * bprice; end if;

  if coalesce(p->>'coupon', '') <> '' then select * into c from coupons where active and upper(code) = upper(trim(p->>'coupon')); end if;
  if c.code is not null then disc := round(base * c.discount_pct / 100, 2); comm_pct := coalesce(c.commission_pct, 0); end if;
  total := base - disc + buggy;

  select * into r from tour_rates where tour_slug = t.slug and active order by preferred desc, net_adult asc limit 1;
  ad := coalesce((b->>'ad_cost_per_pax')::numeric, 0) * people;
  minm := coalesce((b->>'min_margin_per_pax')::numeric, 0) * people;
  if pay = 'card' then fee_pct := coalesce((b->>'card_fee_pct')::numeric, 0); end if;
  if r.id is not null then
    net := case when kind = 'priv' then coalesce(r.net_vehicle, r.net_adult)
                else (adults + seniors) * r.net_adult + children * coalesce(r.net_child, r.net_adult) end + buggy;
    flo := ceil((net + ad + minm) / (1 - (comm_pct + fee_pct) / 100));
    if total < flo then total := flo; disc := greatest(base + buggy - total, 0); floor_applied := true; end if;
  end if;

  dep_pct := coalesce((s->>'deposit_pct')::numeric, 20);
  deposit := case when pay = 'card' then total else round(total * dep_pct / 100, 2) end;
  if pay = 'pix' and net is not null and deposit > total - net then deposit := total - net; end if;

  return jsonb_build_object(
    'tour_slug', t.slug, 'tour_name', t.name, 'tour_date', d, 'kind', kind, 'adults', adults, 'children', children, 'seniors', seniors,
    'people', people, 'pay_method', pay, 'base', base, 'discount', disc, 'buggy_cars', cars, 'buggy', buggy, 'total', total,
    'floor_applied', floor_applied, 'deposit', deposit, 'collect_at_boarding', total - deposit,
    'coupon', c.code, 'coupon_pct', c.discount_pct, 'coupon_agent', c.agent_name,
    'supplier_id', r.supplier_id, 'net_total', net, 'ad_cost', ad,
    'commission', round(total * comm_pct / 100, 2), 'card_fee', round(total * fee_pct / 100, 2),
    'supplier_settlement', case when net is null then null else (total - deposit) - net end,
    'profit', case when net is null then null else total - net - ad - round(total * comm_pct / 100, 2) - round(total * fee_pct / 100, 2) end,
    'seats_left', case when cap is null then null else cap - taken - people end
  );
end $$;
revoke execute on function _price_booking(jsonb) from public, anon, authenticated;

-- Orçamento público (sem net, sem lucro)
create or replace function quote_booking(p jsonb) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare q jsonb := _price_booking(p);
begin
  return q - 'supplier_id' - 'net_total' - 'ad_cost' - 'commission' - 'card_fee' - 'supplier_settlement' - 'profit' - 'coupon_agent';
end $$;
grant execute on function quote_booking(jsonb) to anon, authenticated;

create or replace function seats_left(p_slug text, p_date date) returns int
language sql stable security definer set search_path = public as $$
  select t.capacity_per_day - coalesce((select sum(x.adults + x.children + x.seniors) from bookings x where x.tour_slug = t.slug and x.tour_date = p_date and x.status <> 'cancelado'), 0)::int
  from tours t where t.slug = p_slug and t.capacity_per_day is not null;
$$;
grant execute on function seats_left(text, date) to anon, authenticated;

-- Aviso no celular (ntfy) sem dados pessoais do cliente
create or replace function notify_ops(p_title text, p_msg text, p_click text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare b jsonb := biz();
begin
  if coalesce(b->>'notify_topic', '') = '' then return; end if;
  perform net.http_post(url := 'https://ntfy.sh/', body := jsonb_build_object('topic', b->>'notify_topic', 'title', p_title, 'message', p_msg, 'click', p_click, 'tags', jsonb_build_array('palm_tree')));
exception when others then null;
end $$;
revoke execute on function notify_ops(text, text, text) from public, anon, authenticated;

create or replace function create_booking(p jsonb) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare q jsonb; nm text := trim(coalesce(p->>'customer_name', '')); ph text := trim(coalesce(p->>'phone', ''));
  bid bigint; cd text; sname text; b jsonb := biz(); dg text := regexp_replace(ph, '\D', '', 'g');
begin
  if length(nm) not between 2 and 120 then raise exception 'Informe seu nome.'; end if;
  if length(dg) not between 10 and 15 then raise exception 'Informe o WhatsApp com DDD.'; end if;
  q := _price_booking(p);
  insert into bookings (tour_slug, tour_name, tour_date, kind, adults, children, seniors, buggy_cars, coupon, pay_method, total,
    customer_name, phone, hotel, status, supplier_id, base, buggy_amount, discount, floor_applied, net_total, ad_cost, commission, card_fee,
    deposit, collect_at_boarding, supplier_settlement, profit, partner_share, lang, source)
  values (q->>'tour_slug', q->>'tour_name', (q->>'tour_date')::date, q->>'kind', (q->>'adults')::int, (q->>'children')::int, (q->>'seniors')::int,
    (q->>'buggy_cars')::int, q->>'coupon', q->>'pay_method', (q->>'total')::numeric, nm, ph, nullif(left(trim(coalesce(p->>'hotel', '')), 200), ''), 'pendente',
    (q->>'supplier_id')::bigint, (q->>'base')::numeric, (q->>'buggy')::numeric, (q->>'discount')::numeric, (q->>'floor_applied')::boolean, (q->>'net_total')::numeric,
    (q->>'ad_cost')::numeric, (q->>'commission')::numeric, (q->>'card_fee')::numeric, (q->>'deposit')::numeric, (q->>'collect_at_boarding')::numeric,
    (q->>'supplier_settlement')::numeric, (q->>'profit')::numeric,
    round((q->>'profit')::numeric * coalesce((b->>'partner_split_pct')::numeric, 50) / 100, 2),
    case when p->>'lang' in ('pt', 'es', 'en') then p->>'lang' else 'pt' end, left(nullif(p->>'source', ''), 80))
  returning id into bid;
  cd := 'MT-' || (bid + 1000);
  update bookings set code = cd where id = bid;
  select name into sname from suppliers where id = (q->>'supplier_id')::bigint;
  perform notify_ops('Nova reserva ' || cd,
    (q->>'tour_name') || ' · ' || to_char((q->>'tour_date')::date, 'DD/MM') || ' · ' || (q->>'people') || ' pessoa(s) · R$ ' || (q->>'total') || coalesce(' · ' || sname, ' · sem empresa definida'),
    coalesce(b->>'admin_url', '') || '#' || cd);
  return (q - 'supplier_id' - 'net_total' - 'ad_cost' - 'commission' - 'card_fee' - 'supplier_settlement' - 'profit' - 'coupon_agent')
         || jsonb_build_object('code', cd, 'id', bid);
end $$;
grant execute on function create_booking(jsonb) to anon, authenticated;

-- Trocar a empresa de uma reserva recalcula net, acerto e lucro (preço ao cliente não muda)
create or replace function assign_supplier(p_booking bigint, p_supplier bigint) returns void
language plpgsql security definer set search_path = public as $$
declare x bookings; r tour_rates; net numeric; b jsonb := biz();
begin
  if not is_admin() then raise exception 'Sem permissão.'; end if;
  select * into x from bookings where id = p_booking; if not found then raise exception 'Reserva não encontrada.'; end if;
  select * into r from tour_rates where tour_slug = x.tour_slug and supplier_id = p_supplier and active;
  if not found then raise exception 'Essa empresa não tem net cadastrado para este passeio.'; end if;
  net := case when x.kind = 'priv' then coalesce(r.net_vehicle, r.net_adult)
              else (x.adults + x.seniors) * r.net_adult + x.children * coalesce(r.net_child, r.net_adult) end
         + coalesce(x.buggy_amount, 0);
  update bookings set supplier_id = p_supplier, net_total = net,
    supplier_settlement = collect_at_boarding - net,
    profit = total - net - ad_cost - commission - card_fee,
    partner_share = round((total - net - ad_cost - commission - card_fee) * coalesce((b->>'partner_split_pct')::numeric, 50) / 100, 2)
  where id = p_booking;
end $$;
revoke execute on function assign_supplier(bigint, bigint) from public, anon;
grant execute on function assign_supplier(bigint, bigint) to authenticated;

-- Trava: preço do site nunca abaixo do mínimo (net + anúncio + margem mínima)
create or replace function guard_tour_price() returns trigger
language plpgsql security definer set search_path = public as $$
declare fp numeric; fc numeric; nm text;
begin
  if tg_table_name = 'tours' then
    if not new.active then return new; end if;
    fp := tour_floor(new.slug, 'pix'); fc := tour_floor(new.slug, 'card'); nm := new.name;
    if fp is not null and new.price_pix < fp then raise exception 'Preço no Pix de "%" abaixo do mínimo de R$ % (net + anúncio + margem).', nm, fp; end if;
    if fc is not null and new.price_card < fc then raise exception 'Preço no cartão de "%" abaixo do mínimo de R$ %.', nm, fc; end if;
  else
    select t.name, t.price_pix, t.price_card into nm, fp, fc from tours t where t.slug = new.tour_slug and t.active;
    if found and new.active then
      if fp < tour_floor(new.tour_slug, 'pix') then raise exception 'Com esse net, o preço no Pix de "%" (R$ %) fica abaixo do mínimo de R$ %. Suba o preço antes.', nm, fp, tour_floor(new.tour_slug, 'pix'); end if;
      if fc < tour_floor(new.tour_slug, 'card') then raise exception 'Com esse net, o preço no cartão de "%" (R$ %) fica abaixo do mínimo de R$ %. Suba o preço antes.', nm, fc, tour_floor(new.tour_slug, 'card'); end if;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_guard_tour_price on tours;
create trigger trg_guard_tour_price before insert or update of price_pix, price_card, active on tours for each row execute function guard_tour_price();
drop trigger if exists trg_guard_rate on tour_rates;
create constraint trigger trg_guard_rate after insert or update on tour_rates deferrable initially immediate for each row execute function guard_tour_price();

create or replace function admin_notify_test() returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Sem permissão.'; end if;
  perform notify_ops('Teste Maré Tur', 'Os avisos de reserva vão chegar assim.', coalesce(biz()->>'admin_url', ''));
end $$;
revoke execute on function admin_notify_test() from public, anon;
grant execute on function admin_notify_test() to authenticated;
