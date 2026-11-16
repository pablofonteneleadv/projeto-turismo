-- Projeto Turismo · banco de dados do site 2.0 (Supabase / Postgres)
-- Público lê passeios, avaliações, perguntas e configurações; envia reservas, contatos e pedidos de parceria.
-- Só administradores (e-mails na tabela admin_emails) alteram dados.

create table if not exists admin_emails (email text primary key);

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admin_emails a where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;

grant execute on function is_admin() to anon, authenticated;

-- Confirma automaticamente o cadastro de quem é administrador (dispensa e-mail de confirmação)
create or replace function auto_confirm_admin() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.admin_emails a where lower(a.email) = lower(new.email)) then
    new.email_confirmed_at := coalesce(new.email_confirmed_at, now());
  end if;
  return new;
end $$;
drop trigger if exists trg_auto_confirm_admin on auth.users;
create trigger trg_auto_confirm_admin before insert on auth.users for each row execute function auto_confirm_admin();

create table if not exists settings (
  id int primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists tours (
  slug text primary key,
  name text not null,
  category text not null default 'passeios',
  location text default '',
  times text default '',
  duration text default '',
  price_card numeric(10,2) not null default 0,
  price_pix numeric(10,2) not null default 0,
  price_private numeric(10,2),
  per_vehicle boolean default false,
  rating numeric(2,1) default 5.0,
  featured boolean default false,
  active boolean default true,
  sort int default 100,
  summary text default '',
  description text default '',
  includes jsonb default '[]'::jsonb,
  extras jsonb default '[]'::jsonb,
  itinerary jsonb default '[]'::jsonb,
  photos jsonb default '[]'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists coupons (
  code text primary key,
  agent_name text not null,
  discount_pct numeric(4,1) not null default 5,
  commission_pct numeric(4,1) not null default 8,
  leader text,
  leader_pct numeric(4,1) default 0,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists bookings (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  tour_slug text,
  tour_name text,
  tour_date date,
  kind text default 'grupo',
  adults int default 1, children int default 0, seniors int default 0,
  buggy_cars int default 0,
  coupon text,
  pay_method text default 'pix',
  total numeric(10,2),
  customer_name text not null,
  phone text not null,
  hotel text,
  notes text,
  status text not null default 'pendente' check (status in ('pendente','pago','confirmado','realizado','cancelado'))
);

create table if not exists reviews (
  id bigint generated always as identity primary key,
  name text not null, origin text default '', tour text default '', text text not null,
  month text default '', published boolean default true, sort int default 100
);

create table if not exists faqs (
  id bigint generated always as identity primary key,
  question text not null, answer text not null, sort int default 100, published boolean default true
);

create table if not exists leads (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(), phone text not null, source text default 'promocoes'
);

create table if not exists partner_requests (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(), name text not null, phone text not null, role text default '', status text default 'novo'
);

-- Valida cupom sem expor a lista
create or replace function check_coupon(p_code text) returns table(code text, agent_name text, discount_pct numeric)
language sql stable security definer set search_path = public as $$
  select c.code, c.agent_name, c.discount_pct from coupons c where c.active and upper(c.code) = upper(trim(p_code));
$$;
grant execute on function check_coupon(text) to anon, authenticated;

-- Segurança por linha
alter table admin_emails enable row level security;
alter table settings enable row level security;
alter table tours enable row level security;
alter table coupons enable row level security;
alter table bookings enable row level security;
alter table reviews enable row level security;
alter table faqs enable row level security;
alter table leads enable row level security;
alter table partner_requests enable row level security;

drop policy if exists admin_all on admin_emails; create policy admin_all on admin_emails for all using (is_admin()) with check (is_admin());

drop policy if exists pub_read on settings; create policy pub_read on settings for select using (true);
drop policy if exists admin_all on settings; create policy admin_all on settings for all using (is_admin()) with check (is_admin());

drop policy if exists pub_read on tours; create policy pub_read on tours for select using (active or is_admin());
drop policy if exists admin_all on tours; create policy admin_all on tours for all using (is_admin()) with check (is_admin());

drop policy if exists admin_all on coupons; create policy admin_all on coupons for all using (is_admin()) with check (is_admin());

drop policy if exists pub_insert on bookings; create policy pub_insert on bookings for insert with check (status = 'pendente' and length(customer_name) between 2 and 120 and length(phone) between 8 and 30);
drop policy if exists admin_all on bookings; create policy admin_all on bookings for all using (is_admin()) with check (is_admin());

drop policy if exists pub_read on reviews; create policy pub_read on reviews for select using (published or is_admin());
drop policy if exists admin_all on reviews; create policy admin_all on reviews for all using (is_admin()) with check (is_admin());

drop policy if exists pub_read on faqs; create policy pub_read on faqs for select using (published or is_admin());
drop policy if exists admin_all on faqs; create policy admin_all on faqs for all using (is_admin()) with check (is_admin());

drop policy if exists pub_insert on leads; create policy pub_insert on leads for insert with check (length(phone) between 8 and 30);
drop policy if exists admin_all on leads; create policy admin_all on leads for all using (is_admin()) with check (is_admin());

drop policy if exists pub_insert on partner_requests; create policy pub_insert on partner_requests for insert with check (length(name) between 2 and 120 and length(phone) between 8 and 30 and status = 'novo');
drop policy if exists admin_all on partner_requests; create policy admin_all on partner_requests for all using (is_admin()) with check (is_admin());

-- Fotos enviadas pelo painel
insert into storage.buckets (id, name, public) values ('fotos', 'fotos', true) on conflict (id) do nothing;
drop policy if exists fotos_pub_read on storage.objects; create policy fotos_pub_read on storage.objects for select using (bucket_id = 'fotos');
drop policy if exists fotos_admin_write on storage.objects; create policy fotos_admin_write on storage.objects for insert with check (bucket_id = 'fotos' and is_admin());
drop policy if exists fotos_admin_update on storage.objects; create policy fotos_admin_update on storage.objects for update using (bucket_id = 'fotos' and is_admin());
drop policy if exists fotos_admin_delete on storage.objects; create policy fotos_admin_delete on storage.objects for delete using (bucket_id = 'fotos' and is_admin());
