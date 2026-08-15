-- Caudal · esquema inicial
--
-- Tres tablas y una vista. Todo con RLS: cada persona ve solo lo suyo.
-- Regla de negocio que define la marca: el monto lleva signo. Negativo es gasto,
-- positivo es ingreso. Un gasto no es un error, es un signo.

-- ---------------------------------------------------------------- profiles

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  currency text not null default 'UYU',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- -------------------------------------------------------------- categories

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  -- clave de icono; la app la mapea a un SF Symbol
  icon_key text not null default 'otros',
  -- indice 0-7 en la rampa de categorias del manual (seccion 08)
  color_index smallint not null default 7 check (color_index between 0 and 7),
  sort_order smallint not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create index categories_user_idx on public.categories (user_id, sort_order);

alter table public.categories enable row level security;

create policy "categories_select_own" on public.categories
  for select using (auth.uid() = user_id);
create policy "categories_insert_own" on public.categories
  for insert with check (auth.uid() = user_id);
create policy "categories_update_own" on public.categories
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "categories_delete_own" on public.categories
  for delete using (auth.uid() = user_id);

-- ------------------------------------------------------------ transactions

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  occurred_on date not null default current_date,
  -- negativo = gasto, positivo = ingreso. Cero no significa nada.
  amount numeric(14, 2) not null check (amount <> 0),
  category_id uuid references public.categories (id) on delete set null,
  description text not null default '',
  created_at timestamptz not null default now()
);

create index transactions_user_date_idx
  on public.transactions (user_id, occurred_on desc, created_at desc);
create index transactions_category_idx
  on public.transactions (user_id, category_id);

alter table public.transactions enable row level security;

create policy "transactions_select_own" on public.transactions
  for select using (auth.uid() = user_id);
create policy "transactions_insert_own" on public.transactions
  for insert with check (auth.uid() = user_id);
create policy "transactions_update_own" on public.transactions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "transactions_delete_own" on public.transactions
  for delete using (auth.uid() = user_id);

-- ------------------------------------------------------------------- vista

-- Totales por mes. security_invoker: la vista hereda el RLS de quien consulta.
create view public.monthly_totals with (security_invoker = on) as
select
  t.user_id,
  date_trunc('month', t.occurred_on)::date as month,
  coalesce(sum(t.amount) filter (where t.amount > 0), 0)::numeric(14, 2) as ingresos,
  coalesce(-sum(t.amount) filter (where t.amount < 0), 0)::numeric(14, 2) as gastos,
  coalesce(sum(t.amount), 0)::numeric(14, 2) as saldo,
  count(*)::int as movimientos
from public.transactions t
group by t.user_id, date_trunc('month', t.occurred_on);

-- ---------------------------------------------------- alta de usuario nuevo

-- Al crear la cuenta se siembran el perfil y las ocho categorias por defecto,
-- con su color de la rampa ya asignado para que la lista no sea un arcoiris.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'display_name', ''));

  insert into public.categories (user_id, name, icon_key, color_index, sort_order)
  values
    (new.id, 'Alimentos',  'alimentos',  0, 0),
    (new.id, 'Transporte', 'transporte', 1, 1),
    (new.id, 'Vivienda',   'vivienda',   2, 2),
    (new.id, 'Compras',    'compras',    3, 3),
    (new.id, 'Salud',      'salud',      4, 4),
    (new.id, 'Ocio',       'ocio',       5, 5),
    (new.id, 'Servicios',  'servicios',  6, 6),
    (new.id, 'Otros',      'otros',      7, 7);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
