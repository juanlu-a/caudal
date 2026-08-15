-- Caudal · cuentas, transferencias e importaciones
--
-- El problema que resuelve: si se carga el estado de cuenta del banco y ademas
-- el resumen de la tarjeta, la misma plata aparece dos veces. Una vez como el
-- pago de la tarjeta en la cuenta, y otra vez como las compras que lo componen.
--
-- La solucion es que cada movimiento pertenezca a una cuenta y que el pago de la
-- tarjeta sea una transferencia entre dos cuentas, no un gasto:
--
--   saldo de una cuenta = todos sus movimientos, transferencias incluidas
--   gasto del mes       = movimientos negativos que NO son transferencia
--
-- Asi el saldo del banco baja cuando se paga la tarjeta, el gasto real queda en
-- el mes en que se compro, y ninguna cifra se cuenta dos veces.

create type public.account_kind as enum ('bank', 'card', 'cash');

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  kind public.account_kind not null default 'bank',
  currency text not null default 'UYU',
  -- ultimos digitos, para reconocer la cuenta o la tarjeta en el archivo importado
  last4 text check (last4 is null or last4 ~ '^[0-9]{4}$'),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create index accounts_user_idx on public.accounts (user_id) where not archived;

alter table public.accounts enable row level security;

create policy "accounts_select_own" on public.accounts
  for select using (auth.uid() = user_id);
create policy "accounts_insert_own" on public.accounts
  for insert with check (auth.uid() = user_id);
create policy "accounts_update_own" on public.accounts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "accounts_delete_own" on public.accounts
  for delete using (auth.uid() = user_id);

-- ----------------------------------------------------------- importaciones

create table public.imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid references public.accounts (id) on delete set null,
  -- de donde salio: 'itau-cuenta', 'itau-tarjeta', 'manual'
  source text not null,
  file_name text not null default '',
  period_start date,
  period_end date,
  rows_total int not null default 0,
  rows_imported int not null default 0,
  rows_skipped int not null default 0,
  created_at timestamptz not null default now()
);

create index imports_user_idx on public.imports (user_id, created_at desc);

alter table public.imports enable row level security;

create policy "imports_select_own" on public.imports
  for select using (auth.uid() = user_id);
create policy "imports_insert_own" on public.imports
  for insert with check (auth.uid() = user_id);
create policy "imports_delete_own" on public.imports
  for delete using (auth.uid() = user_id);

-- ------------------------------------------------------------ movimientos

alter table public.transactions
  add column account_id uuid references public.accounts (id) on delete cascade,
  -- Marca la plata que solo cambia de lugar: el pago de la tarjeta en la cuenta
  -- y el «pago recibido» en el resumen. Cada pata sale de una fila real de un
  -- archivo, no se inventa la contrapartida: si se inventara, al importar el
  -- resumen de la tarjeta el mismo pago entraria dos veces.
  add column is_transfer boolean not null default false,
  add column import_id uuid references public.imports (id) on delete set null,
  -- clave de la fila del archivo: misma fila importada dos veces, un solo movimiento
  add column external_key text;

create index transactions_account_idx
  on public.transactions (user_id, account_id, occurred_on desc);
create index transactions_transfer_idx
  on public.transactions (user_id, is_transfer) where is_transfer;

-- La dedupe vive en la base y no en la app: es la unica garantia real cuando se
-- importa el mismo archivo dos veces desde dos dispositivos.
-- El indice no lleva WHERE a proposito: en Postgres dos NULL no son iguales, asi
-- que los movimientos cargados a mano conviven sin chocar, y un indice total es
-- el unico que sirve para el ON CONFLICT del upsert.
create unique index transactions_external_key_idx
  on public.transactions (user_id, external_key);

-- ------------------------------------------------------------------ vistas

drop view if exists public.monthly_totals;

-- Los totales del mes ignoran las transferencias: mover plata de una cuenta a
-- otra no es ni ingreso ni gasto.
create view public.monthly_totals with (security_invoker = on) as
select
  t.user_id,
  date_trunc('month', t.occurred_on)::date as month,
  coalesce(sum(t.amount) filter (where t.amount > 0), 0)::numeric(14, 2) as ingresos,
  coalesce(-sum(t.amount) filter (where t.amount < 0), 0)::numeric(14, 2) as gastos,
  coalesce(sum(t.amount), 0)::numeric(14, 2) as saldo,
  count(*)::int as movimientos
from public.transactions t
where not t.is_transfer
group by t.user_id, date_trunc('month', t.occurred_on);

-- Saldo por cuenta: aca si entran las transferencias, porque la plata
-- efectivamente se movio.
create view public.account_balances with (security_invoker = on) as
select
  a.user_id,
  a.id as account_id,
  a.name,
  a.kind,
  a.currency,
  coalesce(sum(t.amount), 0)::numeric(14, 2) as saldo,
  count(t.id)::int as movimientos,
  max(t.occurred_on) as ultimo_movimiento
from public.accounts a
left join public.transactions t on t.account_id = a.id
where not a.archived
group by a.user_id, a.id, a.name, a.kind, a.currency;

-- ---------------------------------------------- cuenta por defecto al alta

-- Al crear la cuenta ya existe una cuenta bancaria: sin eso, el primer
-- movimiento no tendria donde vivir.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'display_name', ''));

  insert into public.accounts (user_id, name, kind)
  values (new.id, 'Cuenta', 'bank');

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
