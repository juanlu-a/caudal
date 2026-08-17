-- Con qué banco opera la persona.
--
-- Cada banco exporta lo suyo de una forma distinta, así que el importador se
-- acopla a este dato en vez de adivinar entre todos los formatos conocidos.
-- Hoy solo está Itaú; el resto se va sumando.

alter table public.profiles
  add column bank text not null default 'itau'
  check (bank in ('itau', 'santander', 'brou', 'prex', 'midinero'));

comment on column public.profiles.bank is
  'Banco elegido en Ajustes. Define qué lectores usa la importación.';
