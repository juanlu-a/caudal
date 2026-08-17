-- Saldo con el que arranca una cuenta.
--
-- Hasta ahora el saldo de una cuenta era la suma de los movimientos importados,
-- así que arrancaba de cero en el primer extracto que se cargara e ignoraba todo
-- lo anterior: nunca coincidía con el saldo real del banco.
--
-- El extracto trae ese dato — el saldo de apertura del período — y en el del mes
-- en curso se deduce del saldo corriente de la primera fila. Se guarda en la
-- cuenta y no como un movimiento inventado: no es plata que entró, es plata que
-- ya estaba, y como movimiento ensuciaría los ingresos del mes.

alter table public.accounts
  add column opening_balance numeric(14, 2) not null default 0,
  add column opening_on date;

comment on column public.accounts.opening_balance is
  'Saldo anterior al primer movimiento cargado. Sale del extracto.';

drop view if exists public.account_balances;

create view public.account_balances with (security_invoker = on) as
select
  a.user_id,
  a.id as account_id,
  a.name,
  a.kind,
  a.currency,
  a.opening_balance,
  (a.opening_balance + coalesce(sum(t.amount), 0))::numeric(14, 2) as saldo,
  count(t.id)::int as movimientos,
  max(t.occurred_on) as ultimo_movimiento
from public.accounts a
left join public.transactions t on t.account_id = a.id
where not a.archived
group by a.user_id, a.id, a.name, a.kind, a.currency, a.opening_balance;
