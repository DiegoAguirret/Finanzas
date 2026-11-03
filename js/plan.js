// Preferencias de cálculo y Plan
'use strict';

// ---- Preferencias de cálculo ----
function ajustesValidos(x) {
  const saldo = redondear(Number(x?.saldoInicial));
  const limite = redondear(Number(x?.limite));
  return {
    compras: x?.compras === 'compra' ? 'compra' : 'vence',
    saldoInicial: Number.isFinite(saldo) ? saldo : 0,
    limite: limite > 0 ? limite : 0, // gasto máximo al mes en soles; 0 = sin límite
    plan: planValido(x?.plan),
  };
}

// ---- Plan: reglas generales para organizar el dinero. No recomienda productos ni inversiones ----
const REGLAS_PLAN = { '50-30-20': [50, 30, 20], '60-20-20': [60, 20, 20], '70-20-10': [70, 20, 10] };
const ESENCIALES_PLAN = ['Comida', 'Transporte', 'Vivienda', 'Salud'];

function planValido(p) {
  const pct = [0, 1, 2].map((i) => Math.max(0, Math.min(100, Math.round(Number(p?.pct?.[i]))) || 0));
  const tipos = {};
  for (const [c, t] of Object.entries(p?.tipos && typeof p.tipos === 'object' ? p.tipos : {})) if (t === 'n' || t === 'g') tipos[c] = t;
  return {
    regla: Object.hasOwn(REGLAS_PLAN, p?.regla ?? '') || p?.regla === 'propia' ? p.regla : '50-30-20',
    pct: pct[0] + pct[1] + pct[2] === 100 ? pct : [...REGLAS_PLAN['50-30-20']],
    tipos,
    meses: [3, 6, 9, 12].includes(Number(p?.meses)) ? Number(p.meses) : 6,
    fondo: esUUID(p?.fondo) ? p.fondo : null,
    base: ['mes', 'mes-ant', '3m'].includes(p?.base) ? p.base : 'mes',
  };
}

function cambiarPlan(cambios) {
  ajustes = ajustesValidos({ ...ajustes, plan: { ...ajustes.plan, ...cambios } });
  guardarAjustes();
  renderPlanCifras();
}

// Un gasto es necesidad o gusto según su categoría (`tipos`, o el valor por defecto)
function tipoPlan(nombre) {
  return Object.hasOwn(ajustes.plan.tipos, nombre) ? ajustes.plan.tipos[nombre] : ESENCIALES_PLAN.includes(nombre) ? 'n' : 'g';
}

function moverCategoriaEnPlan(vieja, nueva) {
  const tipos = { ...ajustes.plan.tipos };
  if (nueva && vieja in tipos) tipos[nueva] = tipos[vieja];
  delete tipos[vieja];
  ajustes = ajustesValidos({ ...ajustes, plan: { ...ajustes.plan, tipos } });
  guardarAjustes();
}

// Cifras mensuales del periodo elegido, en soles y por el día de la compra.
// El promedio de 3 meses usa los meses cerrados con registros, igual que el simulador.
function cifrasPlan() {
  const hoy = hoyISO();
  const [a, m] = hoy.split('-').map(Number);
  const base = ajustes.plan.base;
  const desde = base === 'mes' ? hoy.slice(0, 8) + '01' : isoDia(new Date(a, m - (base === '3m' ? 4 : 2), 1));
  const hasta = base === 'mes' ? hoy : isoDia(new Date(a, m - 1, 0));
  const gas = entre(gastos, desde, hasta), ing = entre(ingresos, desde, hasta);
  const meses = base === '3m' ? Math.max(1, new Set([...gas, ...ing].map((x) => x.fecha.slice(0, 7))).size) : 1;
  const porMes = (lista) => redondear(sumar(lista) / meses);
  const necesidades = porMes(gas.filter((g) => tipoPlan(g.categoria) === 'n'));
  const gustos = porMes(gas.filter((g) => tipoPlan(g.categoria) === 'g'));
  const ingresosMes = porMes(ing);
  return { ingresos: ingresosMes, necesidades, gustos, ahorro: redondear(ingresosMes - necesidades - gustos) };
}

function pctPlan() {
  return REGLAS_PLAN[ajustes.plan.regla] || ajustes.plan.pct;
}

function filaPlan(nombre, real, porcentaje, c, esAhorro) {
  const objetivo = redondear(c.ingresos * porcentaje / 100);
  const fila = document.createElement('div');
  fila.className = 'plan-fila';
  const cabeza = document.createElement('div');
  cabeza.className = 'plan-fila-cabeza';
  const titulo = document.createElement('strong');
  titulo.textContent = nombre;
  const monto = document.createElement('span');
  monto.textContent = c.ingresos ? `${soles.format(real)} de ${soles.format(objetivo)}` : `${porcentaje} %`;
  cabeza.append(titulo, monto);
  fila.append(cabeza);
  if (!c.ingresos) return fila;
  const dif = redondear(objetivo - real);
  const bien = esAhorro ? dif <= 0 : dif >= 0;
  const barra = document.createElement('div');
  barra.className = 'progreso';
  barra.setAttribute('aria-hidden', 'true');
  const relleno = document.createElement('div');
  relleno.className = bien ? 'ok' : 'mal';
  if (esAhorro) relleno.className = bien ? 'ok' : '';
  relleno.style.width = `${objetivo > 0 ? Math.max(0, Math.min(100, real / objetivo * 100)) : 0}%`;
  barra.append(relleno);
  const nota = document.createElement('p');
  nota.className = 'sub' + (bien ? ' ok' : esAhorro ? '' : ' mal');
  nota.textContent = esAhorro
    ? (bien ? 'Objetivo cumplido' : `Faltan ${soles.format(dif)}`)
    : (dif === 0 ? 'Justo en tu objetivo' : bien ? `Te quedan ${soles.format(dif)}` : `Te pasas ${soles.format(-dif)}`);
  fila.append(barra, nota);
  return fila;
}

// Lo que se pinta de nuevo al cambiar algo; no toca la lista de categorías, para no perder el foco
function renderPlanCifras() {
  const plan = ajustes.plan;
  const c = cifrasPlan();
  const pct = pctPlan();
  $('plan-regla-texto').textContent = '';
  $('plan-propia').classList.toggle('hidden', plan.regla !== 'propia');
  $('plan-filas').replaceChildren(
    filaPlan('Necesidades', c.necesidades, pct[0], c, false),
    filaPlan('Gustos', c.gustos, pct[1], c, false),
    filaPlan('Ahorro y deudas', Math.max(c.ahorro, 0), pct[2], c, true),
  );
  $('plan-reparto-nota').textContent = c.ingresos ? '' : 'Registra tus ingresos para comparar.';

  // Fondo de emergencia
  const hoy = hoyISO();
  const objetivo = redondear(c.necesidades * plan.meses);
  const meta = metaDe(plan.fondo);
  const guardado = meta ? redondear(aSoles(guardadoEnMeta(meta), meta.moneda, hoy, 'compra')) : 0;
  $('plan-fondo').replaceChildren(new Option('Sin elegir', ''), ...metas.map((m) => new Option(m.nombre, m.id)));
  $('plan-fondo').value = meta ? meta.id : '';
  $('plan-crear-fondo').classList.toggle('hidden', !!meta);
  $('plan-crear-fondo').disabled = !(objetivo > 0);
  $('plan-fondo-valor').textContent = objetivo > 0 ? `${soles.format(guardado)} de ${soles.format(objetivo)}` : 'Aún sin calcular';
  $('plan-fondo-barra').style.width = `${objetivo > 0 ? Math.min(100, guardado / objetivo * 100) : 0}%`;
  $('plan-fondo-sub').textContent = objetivo > 0
    ? `Cubre ${decimales.format(guardado / c.necesidades)} de ${plan.meses} meses`
    : 'Registra tus gastos para calcularlo.';

  // Prioridades: «Ahora» marca el primer paso pendiente
  const porPagar = montos();
  for (const t of tarjetas) {
    const r = resumenTarjeta(t);
    if (r.aPagar) for (const m of MONEDAS) porPagar[m] = redondear(porPagar[m] + r.aPagar[m]);
  }
  const otras = deudas.filter((d) => pendienteDeuda(d) > 0);
  const metasOtras = metas.filter((m) => m.id !== plan.fondo);
  const pasos = [
    ['Paga tus tarjetas a tiempo', sinMonto(porPagar) ? 'Al día' : `Por pagar: ${textoMontos(porPagar)}`, sinMonto(porPagar)],
    ['Junta un mes de gastos esenciales', c.necesidades > 0 ? soles.format(c.necesidades) : '', c.necesidades > 0 ? guardado >= c.necesidades : null],
    ['Baja tus otras deudas', otras.length ? `${otras.length} pendiente${otras.length === 1 ? '' : 's'}: primero la de mayor interés` : 'Sin deudas', !otras.length],
    ['Completa tu fondo de emergencia', objetivo > 0 ? soles.format(objetivo) : '', objetivo > 0 ? guardado >= objetivo : null],
    ['Ahorra para tus metas', metasOtras.length ? `${metasOtras.length} meta${metasOtras.length === 1 ? '' : 's'}` : '', null],
  ];
  const primero = pasos.findIndex((x) => x[2] !== true);
  $('plan-pasos').replaceChildren(...pasos.map(([titulo, texto, listo], i) => {
    const li = document.createElement('li');
    li.className = i === primero ? 'actual' : '';
    const cuerpo = document.createElement('div');
    const t = document.createElement('strong');
    t.textContent = titulo;
    const d = document.createElement('p');
    d.className = 'sub';
    d.textContent = texto;
    cuerpo.append(t, d);
    const estado = document.createElement('span');
    estado.className = 'estado' + (listo === true ? ' ok' : i === primero ? ' pendiente' : '');
    estado.textContent = listo === true ? 'Listo' : i === primero ? 'Ahora' : 'Después';
    li.append(cuerpo, estado);
    return li;
  }));
}

function renderPlan() {
  const plan = ajustes.plan;
  $('plan-base').value = plan.base;
  $('plan-regla').value = plan.regla;
  $('plan-meses').value = String(plan.meses);
  // Si los porcentajes aún no suman 100, se conserva lo escrito
  if (!$('plan-suma').textContent) ['plan-n', 'plan-g', 'plan-a'].forEach((id, i) => { $(id).value = plan.pct[i]; });
  $('plan-categorias').replaceChildren(...nombresCategorias().map((nombre, i) => {
    const fila = document.createElement('div');
    fila.className = 'fila-categoria';
    const grupo = document.createElement('div');
    grupo.className = 'segmentado';
    grupo.setAttribute('role', 'radiogroup');
    grupo.setAttribute('aria-label', `Tipo de ${nombre}`);
    for (const [valor, texto] of [['n', 'Necesidad'], ['g', 'Gusto']]) {
      const label = document.createElement('label');
      const r = document.createElement('input');
      r.type = 'radio';
      r.name = `plan-tipo-${i}`;
      r.value = valor;
      r.checked = tipoPlan(nombre) === valor;
      r.addEventListener('change', () => cambiarPlan({ tipos: { ...ajustes.plan.tipos, [nombre]: valor } }));
      const s = document.createElement('span');
      s.textContent = texto;
      label.append(r, s);
      grupo.append(label);
    }
    fila.append(etiquetaCategoria(nombre), grupo);
    return fila;
  }));
  renderPlanCifras();
}

function guardarAjustes() {
  escribirJSON(CLAVE_AJUSTES, ajustes);
  programarSync();
}

// Formulario de tarjeta: el campo cambia según el pago sea un día fijo o días tras el corte
function leerPagoTarjeta() {
  return $('tar-modo-pago').value === 'plazo'
    ? { pago: null, plazo: Math.min(90, Math.max(0, Math.trunc(numero($('tar-pago').value)))) || null }
    : { pago: diaDelMes($('tar-pago').value), plazo: null };
}

function pintarModoPago() {
  const conPlazo = $('tar-modo-pago').value === 'plazo';
  $('tar-pago-etiqueta').textContent = conPlazo ? 'Días para pagar' : 'Último día de pago';
  $('tar-pago').max = conPlazo ? 90 : 31;
  $('tar-pago').placeholder = conPlazo ? 'Ej. 25' : 'Ej. 15';
  const t = { corte: diaDelMes($('tar-corte').value), ...leerPagoTarjeta() };
  const nota = $('tar-plazo-nota');
  nota.classList.toggle('hidden', !configurada(t));
  if (configurada(t)) nota.textContent = `Una compra de hoy se paga hasta el ${fechaCorta(vencimientoCompra(hoyISO(), t))}.`;
}

// Bajo el medio de pago: cuándo se paga esta compra
function pintarNotaMedio() {
  const t = tarjetaDe($('medio').value), fecha = $('fecha').value;
  const nota = $('medio-nota');
  const ver = !!(t && configurada(t) && fecha);
  nota.classList.toggle('hidden', !ver);
  if (ver) nota.textContent = `Se paga hasta el ${fechaCorta(vencimientoCompra(fecha, t))}`;
}
