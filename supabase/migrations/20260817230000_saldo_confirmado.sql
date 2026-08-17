-- Anclar el saldo de la cuenta al último que confirmó el banco.
--
-- La versión anterior guardaba el saldo de apertura, o sea el más viejo, y
-- sumaba todos los movimientos encima. Eso funciona solo si los extractos
-- cubren el período entero sin huecos, y no es el caso real: el estado mensual
-- termina el 31 de julio y la consulta del mes en curso arranca el 14 de agosto.
-- Lo del medio no está en ningún archivo, y ese faltante se arrastra para
-- siempre.
--
-- Anclando al saldo más reciente el problema desaparece: ese número ya incluye
-- todo lo anterior, lo sepamos o no. Con importar el extracto del mes en curso
-- alcanza para que el saldo dé exacto.

-- La vista usa las columnas viejas, así que se tira primero.
drop view if exists public.account_balances;

alter table public.accounts
  drop column if exists opening_balance,
  drop column if exists opening_on;

alter table public.accounts
  -- Saldo que informó el banco al cerrar el último extracto cargado.
  add column confirmed_balance numeric(14, 2),
  add column confirmed_on date;

comment on column public.accounts.confirmed_balance is
  'Último saldo confirmado por el banco. El saldo actual es este más los movimientos posteriores a confirmed_on.';

create view public.account_balances with (security_invoker = on) as
select
  a.user_id,
  a.id as account_id,
  a.name,
  a.kind,
  a.currency,
  a.confirmed_balance,
  a.confirmed_on,
  (
    coalesce(a.confirmed_balance, 0)
    + coalesce(
        sum(t.amount) filter (
          where a.confirmed_on is null or t.occurred_on > a.confirmed_on
        ),
        0
      )
  )::numeric(14, 2) as saldo,
  count(t.id)::int as movimientos,
  max(t.occurred_on) as ultimo_movimiento
from public.accounts a
left join public.transactions t on t.account_id = a.id
where not a.archived
group by a.user_id, a.id, a.name, a.kind, a.currency, a.confirmed_balance, a.confirmed_on;
