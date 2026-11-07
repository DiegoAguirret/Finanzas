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
  -- efectivo | debito | yape | plin | credito (otro medio de pago; nombre histórico) | tarjeta (una de public.tarjetas)
  medio text not null default 'efectivo' constraint gastos_medio_check check (medio in ('efectivo', 'debito', 'yape', 'plin', 'credito', 'tarjeta')),
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

-- Deuda anterior de una tarjeta: lo que ya se debía al empezar a registrar.
-- `fecha` es el corte del ciclo en que se paga.
create table if not exists public.saldos (
  id uuid primary key default gen_random_uuid(),
  usuario uuid not null default auth.uid() references auth.users on delete cascade,
  tarjeta uuid not null references public.tarjetas on delete cascade,
  fecha date not null,
  moneda text not null default 'PEN' check (moneda in ('PEN', 'USD')),
  importe numeric(12, 2) not null check (importe > 0),
  creado timestamptz not null default now()
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

-- Medios de pago: en bases ya creadas, la lista se amplía aquí
alter table public.gastos drop constraint if exists gastos_medio_check;
alter table public.gastos add constraint gastos_medio_check
  check (medio in ('efectivo', 'debito', 'yape', 'plin', 'credito', 'tarjeta'));

-- Días para pagar tras el corte, en tarjetas sin un día fijo de pago (entonces `pago` queda vacío)
alter table public.tarjetas add column if not exists plazo smallint check (plazo between 1 and 90);

-- Preferencias de cálculo: { compras: 'vence' | 'compra', saldoInicial: número }
alter table public.preferencias add column if not exists ajustes jsonb;

-- Categorías propias: [{ nombre, icono, color }]. Null = las de siempre. gastos.categoria guarda el nombre.
alter table public.preferencias add column if not exists categorias jsonb;

-- Otras deudas (préstamos, personas): `monto` es lo que debías al registrarla
create table if not exists public.deudas (
  id uuid primary key default gen_random_uuid(),
  usuario uuid not null default auth.uid() references auth.users on delete cascade,
  nombre text not null check (char_length(nombre) between 1 and 40),
  tipo text not null default 'otro' check (tipo in ('prestamo', 'persona', 'otro')),
  moneda text not null default 'PEN' check (moneda in ('PEN', 'USD')),
  monto numeric(12, 2) not null check (monto > 0),
  fecha date not null,
  creado timestamptz not null default now()
);

create table if not exists public.abonos (
  id uuid primary key default gen_random_uuid(),
  usuario uuid not null default auth.uid() references auth.users on delete cascade,
  deuda uuid not null references public.deudas on delete cascade,
  fecha date not null,
  importe numeric(12, 2) not null check (importe > 0),
  creado timestamptz not null default now()
);

-- Metas de ahorro. Un aporte con importe negativo es un retiro.
create table if not exists public.metas (
  id uuid primary key default gen_random_uuid(),
  usuario uuid not null default auth.uid() references auth.users on delete cascade,
  nombre text not null check (char_length(nombre) between 1 and 40),
  icono text not null,
  color text not null,
  moneda text not null default 'PEN' check (moneda in ('PEN', 'USD')),
  objetivo numeric(12, 2) not null check (objetivo > 0),
  limite date,
  creado timestamptz not null default now()
);

create table if not exists public.aportes (
  id uuid primary key default gen_random_uuid(),
  usuario uuid not null default auth.uid() references auth.users on delete cascade,
  meta uuid not null references public.metas on delete cascade,
  fecha date not null,
  importe numeric(12, 2) not null check (importe <> 0),
  creado timestamptz not null default now()
);

-- Negocio: ventas y gastos del negocio, separados de las finanzas personales
create table if not exists public.negocio (
  id uuid primary key default gen_random_uuid(),
  usuario uuid not null default auth.uid() references auth.users on delete cascade,
  tipo text not null check (tipo in ('venta', 'otro_ingreso', 'inversion', 'mercaderia', 'publicidad', 'personal',
    'alquiler', 'servicios', 'transporte', 'comisiones', 'impuestos', 'otro_gasto')),
  descripcion text not null check (char_length(descripcion) between 1 and 100),
  importe numeric(12, 2) not null check (importe > 0),
  moneda text not null default 'PEN' check (moneda in ('PEN', 'USD')),
  fecha date not null,
  creado timestamptz not null default now()
);

-- Tipo de cambio oficial del sistema bancario (BCRP), común a todos
create table if not exists public.tipos_cambio_bcrp (
  fecha date primary key,
  compra numeric(8, 4) not null,
  venta numeric(8, 4) not null,
  actualizado timestamptz not null default now()
);

create index if not exists tarjetas_usuario on public.tarjetas (usuario);
create index if not exists gastos_usuario_fecha on public.gastos (usuario, fecha);
create index if not exists ingresos_usuario_fecha on public.ingresos (usuario, fecha);
create index if not exists pagos_usuario_fecha on public.pagos (usuario, fecha);
create index if not exists pagos_tarjeta on public.pagos (tarjeta);
create index if not exists saldos_usuario on public.saldos (usuario);
create index if not exists saldos_tarjeta on public.saldos (tarjeta);
create index if not exists gastos_tarjeta on public.gastos (tarjeta);
create index if not exists deudas_usuario on public.deudas (usuario);
create index if not exists abonos_usuario_fecha on public.abonos (usuario, fecha);
create index if not exists abonos_deuda on public.abonos (deuda);
create index if not exists metas_usuario on public.metas (usuario);
create index if not exists aportes_usuario_fecha on public.aportes (usuario, fecha);
create index if not exists aportes_meta on public.aportes (meta);
create index if not exists negocio_usuario_fecha on public.negocio (usuario, fecha);

-- «Para mi negocio»: gastos y deuda anterior que pagaste tú pero son del negocio (no son gasto personal)
alter table public.gastos add column if not exists negocio boolean not null default false;
alter table public.saldos add column if not exists negocio boolean not null default false;

-- Dónde se hizo una venta (vacío en los demás tipos)
alter table public.negocio add column if not exists canal text;
alter table public.negocio drop constraint if exists negocio_canal_check;
alter table public.negocio add constraint negocio_canal_check
  check (canal in ('mercadolibre', 'marketplace', 'instagram', 'web', 'tiktok', 'otro'));
-- Unidades de un producto compradas (mercadería) o vendidas (venta): llevan el stock
alter table public.negocio add column if not exists cantidad integer check (cantidad between 1 and 99999);

-- ---------------------------------------------------------------------
-- Seguridad (Row Level Security)
-- ---------------------------------------------------------------------

alter table public.tarjetas enable row level security;
alter table public.gastos enable row level security;
alter table public.ingresos enable row level security;
alter table public.pagos enable row level security;
alter table public.saldos enable row level security;
alter table public.tipos_cambio enable row level security;
alter table public.preferencias enable row level security;
alter table public.tipos_cambio_bcrp enable row level security;
alter table public.deudas enable row level security;
alter table public.abonos enable row level security;
alter table public.metas enable row level security;
alter table public.aportes enable row level security;
alter table public.negocio enable row level security;

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

-- Solo la usan las políticas (que se evalúan como el usuario con sesión)
revoke all on function public.tarjeta_propia(uuid) from public, anon;
grant execute on function public.tarjeta_propia(uuid) to authenticated;

-- La deuda o la meta de un movimiento deben ser del mismo usuario
create or replace function public.deuda_propia(d uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (select 1 from public.deudas where id = d and usuario = (select auth.uid()));
$$;

create or replace function public.meta_propia(m uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (select 1 from public.metas where id = m and usuario = (select auth.uid()));
$$;

revoke all on function public.deuda_propia(uuid) from public, anon;
revoke all on function public.meta_propia(uuid) from public, anon;
grant execute on function public.deuda_propia(uuid) to authenticated;
grant execute on function public.meta_propia(uuid) to authenticated;

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

drop policy if exists "propios" on public.saldos;
create policy "propios" on public.saldos for all to authenticated
  using (usuario = (select auth.uid()))
  with check (usuario = (select auth.uid()) and tarjeta is not null and public.tarjeta_propia(tarjeta));

drop policy if exists "propios" on public.tipos_cambio;
create policy "propios" on public.tipos_cambio for all to authenticated
  using (usuario = (select auth.uid())) with check (usuario = (select auth.uid()));

drop policy if exists "propias" on public.preferencias;
create policy "propias" on public.preferencias for all to authenticated
  using (usuario = (select auth.uid())) with check (usuario = (select auth.uid()));

drop policy if exists "propias" on public.deudas;
create policy "propias" on public.deudas for all to authenticated
  using (usuario = (select auth.uid())) with check (usuario = (select auth.uid()));

drop policy if exists "propios" on public.abonos;
create policy "propios" on public.abonos for all to authenticated
  using (usuario = (select auth.uid()))
  with check (usuario = (select auth.uid()) and public.deuda_propia(deuda));

drop policy if exists "propias" on public.metas;
create policy "propias" on public.metas for all to authenticated
  using (usuario = (select auth.uid())) with check (usuario = (select auth.uid()));

drop policy if exists "propios" on public.aportes;
create policy "propios" on public.aportes for all to authenticated
  using (usuario = (select auth.uid()))
  with check (usuario = (select auth.uid()) and public.meta_propia(meta));

drop policy if exists "propios" on public.negocio;
create policy "propios" on public.negocio for all to authenticated
  using (usuario = (select auth.uid())) with check (usuario = (select auth.uid()));

drop policy if exists "lectura publica" on public.tipos_cambio_bcrp;
create policy "lectura publica" on public.tipos_cambio_bcrp for select to anon, authenticated
  using (true);

revoke all on public.tarjetas, public.gastos, public.ingresos, public.pagos, public.saldos,
  public.deudas, public.abonos, public.metas, public.aportes, public.negocio,
  public.tipos_cambio, public.preferencias, public.tipos_cambio_bcrp from anon;
grant select, insert, update, delete on public.tarjetas, public.gastos, public.ingresos,
  public.pagos, public.saldos, public.deudas, public.abonos, public.metas, public.aportes,
  public.negocio, public.tipos_cambio, public.preferencias to authenticated;
grant select on public.tipos_cambio_bcrp to anon, authenticated;

-- ---------------------------------------------------------------------
-- Limpieza: la alerta por correo se descartó; esto la retira si llegó a instalarse
-- ---------------------------------------------------------------------

drop trigger if exists alerta_limite on public.gastos;
drop function if exists public.avisar_limite_superado();
drop function if exists public.enviar_alerta_limite(uuid, date, date);
drop function if exists public.gastado_en_mes(uuid, date);
drop table if exists public.alertas_limite;

-- ---------------------------------------------------------------------
-- Tipo de cambio del BCRP (serie "TC Sistema bancario SBS", S/ por US$)
-- ---------------------------------------------------------------------

-- Trae los últimos 15 días del BCRP y los guarda. Devuelve cuántos días guardó.
-- Solo la ejecuta pg_cron (ni la web ni usuarios anónimos pueden llamarla), y como mucho
-- consulta al BCRP una vez cada 30 minutos. Nunca falla: si el BCRP no responde con los datos
-- esperados (caída, página de protección anti-bots, formato distinto), no guarda nada y devuelve 0,
-- y la web sigue usando los últimos tipos de cambio guardados.
create or replace function public.actualizar_tipo_cambio_bcrp()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  meses constant text[] := array['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];
  respuesta extensions.http_response;
  datos jsonb;
  periodo jsonb;
  partes text[];
  dia date;
  guardados integer := 0;
begin
  if exists (select 1 from public.tipos_cambio_bcrp where actualizado > now() - interval '30 minutes') then
    return 0;
  end if;

  begin
    perform extensions.http_set_curlopt('CURLOPT_TIMEOUT', '15');
    respuesta := extensions.http_get(format(
      'https://estadisticas.bcrp.gob.pe/estadisticas/series/api/PD04639PD-PD04640PD/json/%s/%s',
      to_char(current_date - 15, 'YYYY-MM-DD'), to_char(current_date, 'YYYY-MM-DD')));
    if respuesta.status <> 200 or left(ltrim(respuesta.content), 1) <> '{' then
      raise log 'tipo de cambio BCRP: respuesta inesperada (estado %)', respuesta.status;
      return 0;
    end if;
    datos := respuesta.content::jsonb;
  exception when others then
    raise log 'tipo de cambio BCRP: no se pudo leer (%)', sqlerrm;
    return 0;
  end;
  if jsonb_typeof(datos -> 'periods') <> 'array' then
    return 0;
  end if;

  for periodo in select * from jsonb_array_elements(datos -> 'periods') loop
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

revoke all on function public.actualizar_tipo_cambio_bcrp() from public, anon, authenticated;

-- Actualización automática cada hora de lunes a viernes, de 8:05 a 18:05 (hora de Lima = UTC-5)
select cron.schedule('tipo-cambio-bcrp', '5 13-23 * * 1-5', 'select public.actualizar_tipo_cambio_bcrp()');
