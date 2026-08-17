-- El número con el que el banco identifica la cuenta.
--
-- Hace falta para reconocer las transferencias entre cuentas propias: en el
-- extracto aparecen como «TRASPASO DE 3650979», y ese número es otra de las
-- cuentas de la misma persona. Esa plata no es ingreso ni gasto, solo cambia de
-- lugar. Una transferencia a un tercero, en cambio, sí es un gasto de verdad.

alter table public.accounts
  add column external_number text;

comment on column public.accounts.external_number is
  'Número de cuenta o de tarjeta según el banco. Sirve para reconocer las transferencias entre cuentas propias.';

create index accounts_external_number_idx
  on public.accounts (user_id, external_number)
  where external_number is not null;
