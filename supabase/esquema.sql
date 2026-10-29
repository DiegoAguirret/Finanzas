-- =====================================================================
-- Finanzas personales · esquema de la base de datos (Supabase / PostgreSQL)
--
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar todo → Run.
-- Se puede volver a ejecutar sin perder datos (crea solo lo que falta).
--
-- Seguridad: todas las tablas tienen Row Level Security; cada usuario
-- solo puede leer y escribir sus propias filas. El tipo de cambio oficial
-- del BCRP es público (solo lectura).
-- =====================================================================

create extension if not exists http with schema extensions;
create extension if not exists pg_cron;

-- ---------------------------------------------------------------------
-- Tablas del usuario
-- ---------------------------------------------------------------------

create table if not exists public.tarjetas (
  id uuid primary key default gen_random_uuid(),
  usuario uuid not null default auth.uid() references auth.users on delete cascade,
  nombre text not null check (char_length(nombre) between 1 and 40),
  banco text not null default 'otro' check (banco in ('bcp', 'interbank', 'otro')),
  corte smallint check (corte between 1 and 31),
  pago smallint check (pago between 1 and 31),
  linea numeric(12, 2) not null default 0 check (linea >= 0),   -- línea de crédito en soles (0 = sin indicar)
  creado timestamptz not null default now()
);

create table if not exists public.gastos (
  id uuid primary key default gen_random_uuid(),
  usuario uuid not null default auth.uid() references auth.users on delete cascade,
  descripcion text not null check (char_length(descripcion) between 1 and 100),
  importe numeric(12, 2) not null check (importe > 0),
  moneda text not null default 'PEN' check (moneda in ('PEN', 'USD')),
  categoria text not null,
  -- efectivo | debito | credito (otra tarjeta sin registrar) | tarjeta (una de public.tarjetas)
  medio text not null default 'efectivo' check (medio in ('efectivo', 'debito', 'credito', 'tarjeta')),
  tarjeta uuid references public.tarjetas on delete set null,
  fecha date not null,
  creado timestamptz not null default now()
);

create table if not exists public.ingresos (
  id uuid primary key default gen_random_uuid(),
  usuario uuid not null default auth.uid() references auth.users on delete cascade,
  descripcion text not null check (char_length(descripcion) between 1 and 100),
  importe numeric(12, 2) not null check (importe > 0),
  moneda text not null default 'PEN' check (moneda in ('PEN', 'USD')),
  fecha date not null,
  creado timestamptz not null default now()
);

-- Pago a una tarjeta: baja la deuda en `moneda` por `importe`; de tu dinero sale
-- `pagado` en `pagado_moneda`. Si las monedas difieren, `tipo_cambio` = S/ por US$
-- que aplicó el banco (p. ej. pagas en soles tu deuda en dólares).
create table if not exists public.pagos (
  id uuid primary key default gen_random_uuid(),
  usuario uuid not null default auth.uid() references auth.users on delete cascade,
  tarjeta uuid not null references public.tarjetas on delete cascade,
  fecha date not null,
  moneda text not null default 'PEN' check (moneda in ('PEN', 'USD')),
  importe numeric(12, 2) not null check (importe > 0),
  pagado_moneda text not null default 'PEN' check (pagado_moneda in ('PEN', 'USD')),
  pagado numeric(12, 2) not null check (pagado > 0),
  tipo_cambio numeric(8, 4) check (tipo_cambio > 0),
  creado timestamptz not null default now(),
  check (moneda = pagado_moneda or tipo_cambio is not null)
);

-- Tipo de cambio de cada banco que registra el usuario (S/ por US$)
create table if not exists public.tipos_cambio (
  usuario uuid not null default auth.uid() references auth.users on delete cascade,
  banco text not null check (banco in ('bcp', 'interbank')),
  fecha date not null,
  compra numeric(8, 4) not null check (compra > 0),
  venta numeric(8, 4) not null check (venta > 0),
  actualizado timestamptz not null default now(),
  primary key (usuario, banco, fecha)
);

-- Preferencias sincronizadas (parámetros del simulador, etc.)
create table if not exists public.preferencias (
  usuario uuid primary key default auth.uid() references auth.users on delete cascade,
  simulacion jsonb not null default '{}'::jsonb,
  actualizado timestamptz not null default now()
);

-- Tipo de cambio oficial del sistema bancario (BCRP), común a todos
create table if not exists public.tipos_cambio_bcrp (
  fecha date primary key,
  compra numeric(8, 4) not null,
  venta numeric(8, 4) not null,
  actualizado timestamptz not null default now()
);

create index if not exists gastos_usuario_fecha on public.gastos (usuario, fecha);
create index if not exists ingresos_usuario_fecha on public.ingresos (usuario, fecha);
create index if not exists pagos_usuario_fecha on public.pagos (usuario, fecha);
create index if not exists pagos_tarjeta on public.pagos (tarjeta);
create index if not exists gastos_tarjeta on public.gastos (tarjeta);

-- ---------------------------------------------------------------------
-- Seguridad (Row Level Security)
-- ---------------------------------------------------------------------

alter table public.tarjetas enable row level security;
alter table public.gastos enable row level security;
alter table public.ingresos enable row level security;
alter table public.pagos enable row level security;
alter table public.tipos_cambio enable row level security;
alter table public.preferencias enable row level security;
alter table public.tipos_cambio_bcrp enable row level security;

-- La tarjeta indicada (si hay) debe ser del mismo usuario
create or replace function public.tarjeta_propia(t uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select t is null or exists (select 1 from public.tarjetas where id = t and usuario = (select auth.uid()));
$$;

drop policy if exists "propias" on public.tarjetas;
create policy "propias" on public.tarjetas for all to authenticated
  using (usuario = (select auth.uid())) with check (usuario = (select auth.uid()));

drop policy if exists "propios" on public.gastos;
create policy "propios" on public.gastos for all to authenticated
  using (usuario = (select auth.uid()))
  with check (usuario = (select auth.uid()) and public.tarjeta_propia(tarjeta));

drop policy if exists "propios" on public.ingresos;
create policy "propios" on public.ingresos for all to authenticated
  using (usuario = (select auth.uid())) with check (usuario = (select auth.uid()));

drop policy if exists "propios" on public.pagos;
create policy "propios" on public.pagos for all to authenticated
  using (usuario = (select auth.uid()))
  with check (usuario = (select auth.uid()) and public.tarjeta_propia(tarjeta));

drop policy if exists "propios" on public.tipos_cambio;
create policy "propios" on public.tipos_cambio for all to authenticated
  using (usuario = (select auth.uid())) with check (usuario = (select auth.uid()));

drop policy if exists "propias" on public.preferencias;
create policy "propias" on public.preferencias for all to authenticated
  using (usuario = (select auth.uid())) with check (usuario = (select auth.uid()));

drop policy if exists "lectura publica" on public.tipos_cambio_bcrp;
create policy "lectura publica" on public.tipos_cambio_bcrp for select to anon, authenticated
  using (true);

revoke all on public.tarjetas, public.gastos, public.ingresos, public.pagos,
  public.tipos_cambio, public.preferencias, public.tipos_cambio_bcrp from anon;
grant select, insert, update, delete on public.tarjetas, public.gastos, public.ingresos,
  public.pagos, public.tipos_cambio, public.preferencias to authenticated;
grant select on public.tipos_cambio_bcrp to anon, authenticated;

-- ---------------------------------------------------------------------
-- Tipo de cambio del BCRP (serie "TC Sistema bancario SBS", S/ por US$)
-- ---------------------------------------------------------------------

-- Trae los últimos 15 días del BCRP y los guarda. Devuelve cuántos días guardó.
-- Como mucho consulta al BCRP una vez por hora, así que la web puede llamarla al abrir.
create or replace function public.actualizar_tipo_cambio_bcrp()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  meses constant text[] := array['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];
  respuesta extensions.http_response;
  periodo jsonb;
  partes text[];
  dia date;
  guardados integer := 0;
begin
  if exists (select 1 from public.tipos_cambio_bcrp where actualizado > now() - interval '1 hour') then
    return 0;
  end if;

  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT', '15');
  respuesta := extensions.http_get(format(
    'https://estadisticas.bcrp.gob.pe/estadisticas/series/api/PD04639PD-PD04640PD/json/%s/%s',
    to_char(current_date - 15, 'YYYY-MM-DD'), to_char(current_date, 'YYYY-MM-DD')));
  if respuesta.status <> 200 then
    return 0;
  end if;

  for periodo in select * from jsonb_array_elements(respuesta.content::jsonb -> 'periods') loop
    -- Fechas como '01.Oct.26'; los días sin dato vienen como 'n.d.'
    partes := string_to_array(periodo ->> 'name', '.');
    continue when array_length(partes, 1) <> 3 or array_position(meses, partes[2]) is null;
    continue when (periodo -> 'values' ->> 0) !~ '^[0-9]+(\.[0-9]+)?$'
               or (periodo -> 'values' ->> 1) !~ '^[0-9]+(\.[0-9]+)?$';
    dia := make_date(2000 + partes[3]::int, array_position(meses, partes[2]), partes[1]::int);
    insert into public.tipos_cambio_bcrp (fecha, compra, venta, actualizado)
    values (dia, (periodo -> 'values' ->> 0)::numeric, (periodo -> 'values' ->> 1)::numeric, now())
    on conflict (fecha) do update
      set compra = excluded.compra, venta = excluded.venta, actualizado = now();
    guardados := guardados + 1;
  end loop;
  return guardados;
end;
$$;

revoke all on function public.actualizar_tipo_cambio_bcrp() from public;
grant execute on function public.actualizar_tipo_cambio_bcrp() to anon, authenticated;

-- Actualización automática de lunes a viernes a las 9:00 y 17:00 (hora de Lima = UTC-5)
select cron.schedule('tipo-cambio-bcrp', '0 14,22 * * 1-5', 'select public.actualizar_tipo_cambio_bcrp()');

-- Primera carga
select public.actualizar_tipo_cambio_bcrp();
