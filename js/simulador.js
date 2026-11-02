// Simulador
'use strict';

// ---- Simulador ----
let sim = { ingreso: '', extra: '', meta: '', horizonte: '12', ajustes: {}, bases: {} };
let basesCalculadas = {};
const simFilas = {};

function cargarSim() {
  try {
    const datos = JSON.parse(localStorage.getItem(CLAVE_SIM));
    if (datos && typeof datos === 'object') sim = { ...sim, ...datos };
  } catch {}
}

function guardarSim() {
  escribirJSON(CLAVE_SIM, sim);
  programarSync();
}

// Promedio mensual por categoría de los últimos 3 meses (solo meses con registros)
function basesDesdeRegistros() {
  const [a, m] = hoyISO().split('-').map(Number);
  const ultimos = [0, 1, 2].map((i) => isoMes(new Date(a, m - 1 - i, 1)));
  const suma = {};
  const conDatos = new Set();
  for (const g of gastos) {
    const mes = g.fecha.slice(0, 7);
    if (!ultimos.includes(mes)) continue;
    suma[g.categoria] = (suma[g.categoria] || 0) + enSoles(g);
    conDatos.add(mes);
  }
  const n = Math.max(1, conDatos.size);
  return Object.fromEntries(nombresCategorias().map((c) => [c, Math.round(((suma[c] || 0) / n) * 100) / 100]));
}

function baseDe(c) {
  return Object.hasOwn(sim.bases, c) ? sim.bases[c] : basesCalculadas[c];
}

function textoPct(v) {
  return (v > 0 ? '+' : '') + v + ' %';
}

function crearFilasSim() {
  $('sim-filas').replaceChildren();
  for (const c of Object.keys(simFilas)) delete simFilas[c];
  for (const c of nombresCategorias()) {
    const fila = document.createElement('div');
    fila.className = 'sim-fila';

    const base = document.createElement('input');
    base.type = 'number';
    base.min = '0';
    base.step = '0.01';
    base.placeholder = '0.00';
    base.setAttribute('aria-label', `Base mensual de ${c} (S/)`);
    base.addEventListener('input', () => {
      if (base.value === '') delete sim.bases[c];
      else sim.bases[c] = numero(base.value);
      guardarSim();
      calcularSim();
    });

    const ajuste = document.createElement('div');
    ajuste.className = 'sim-ajuste';
    const rango = document.createElement('input');
    rango.type = 'range';
    rango.min = '-100';
    rango.max = '100';
    rango.step = '5';
    rango.setAttribute('aria-label', `Ajuste de ${c} en porcentaje`);
    const pct = document.createElement('span');
    pct.className = 'sim-pct';
    rango.addEventListener('input', () => {
      sim.ajustes[c] = Number(rango.value);
      pct.textContent = textoPct(sim.ajustes[c]);
      guardarSim();
      calcularSim();
    });
    ajuste.append(rango, pct);

    const resultado = document.createElement('span');
    resultado.className = 'sim-resultado';

    fila.append(etiquetaCategoria(c), base, ajuste, resultado);
    $('sim-filas').append(fila);
    simFilas[c] = { base, rango, pct, resultado };
  }
}

function renderSimulador() {
  basesCalculadas = basesDesdeRegistros();
  $('sim-ingreso').value = sim.ingreso;
  $('sim-extra').value = sim.extra;
  $('sim-meta').value = sim.meta;
  $('sim-horizonte').value = sim.horizonte;
  for (const c of nombresCategorias()) {
    const f = simFilas[c];
    if (document.activeElement !== f.base) {
      const b = baseDe(c);
      f.base.value = b ? b : '';
    }
    const aj = sim.ajustes[c] || 0;
    f.rango.value = aj;
    f.pct.textContent = textoPct(aj);
  }
  calcularSim();
}

function delta(el, diferencia, menosEsBueno, sufijo) {
  if (Math.abs(diferencia) < 0.005) {
    el.className = 'sub';
    el.textContent = 'Igual que ' + sufijo;
    return;
  }
  const sube = diferencia > 0;
  el.className = 'sub ' + (sube === menosEsBueno ? 'mal' : 'ok');
  el.textContent = `${sube ? '+' : '−'}${soles.format(Math.abs(diferencia))} vs. ${sufijo}`;
}

function calcularSim() {
  let actual = 0, simulado = numero(sim.extra);
  for (const c of nombresCategorias()) {
    const b = baseDe(c) || 0;
    const v = b * (1 + (sim.ajustes[c] || 0) / 100);
    actual += b;
    simulado += v;
    simFilas[c].resultado.textContent = soles.format(v);
  }

  const ingreso = numero(sim.ingreso);
  const meta = numero(sim.meta);
  const N = Number(sim.horizonte) || 12;
  const ahorroAct = ingreso - actual;
  const ahorroSim = ingreso - simulado;

  $('sim-gasto').textContent = soles.format(simulado);
  delta($('sim-gasto-sub'), simulado - actual, true, 'actual');

  if (ingreso) {
    $('sim-ahorro').textContent = soles.format(ahorroSim);
    delta($('sim-ahorro-sub'), ahorroSim - ahorroAct, false, 'actual');
  } else {
    $('sim-ahorro').textContent = '—';
    $('sim-ahorro-sub').className = 'sub';
    $('sim-ahorro-sub').textContent = 'Indica tu ingreso mensual';
  }

  $('sim-acum-label').textContent = ingreso ? `Ahorro en ${N} meses` : `Gasto en ${N} meses`;
  if (ingreso) {
    $('sim-acum').textContent = soles.format(ahorroSim * N);
    delta($('sim-acum-sub'), (ahorroSim - ahorroAct) * N, false, 'ritmo actual');
  } else {
    $('sim-acum').textContent = soles.format(simulado * N);
    delta($('sim-acum-sub'), (simulado - actual) * N, true, 'ritmo actual');
  }

  const metaSub = $('sim-meta-sub');
  metaSub.className = 'sub';
  if (!ingreso || !meta) {
    $('sim-meta-res').textContent = '—';
    metaSub.textContent = 'Indica tu ingreso y una meta';
  } else {
    const mesesPara = (ahorro) => (ahorro > 0 ? Math.ceil(meta / ahorro) : null);
    const mSim = mesesPara(ahorroSim), mAct = mesesPara(ahorroAct);
    $('sim-meta-res').textContent = mSim ? `${mSim} ${mSim === 1 ? 'mes' : 'meses'}` : 'No se alcanza';
    metaSub.textContent = mAct ? `Con el ritmo actual: ${mAct} ${mAct === 1 ? 'mes' : 'meses'}` : 'Con el ritmo actual no se alcanza';
  }

  // Proyección acumulada
  const etiquetas = Array.from({ length: N + 1 }, (_, k) => (k === 0 ? 'Hoy' : k + 'm'));
  const porMes = ingreso ? [ahorroAct, ahorroSim] : [actual, simulado];
  $('sim-graf-titulo').textContent = ingreso ? 'Ahorro acumulado proyectado' : 'Gasto acumulado proyectado';
  graficoLineas($('sim-grafico'), etiquetas, [
    { nombre: 'Ritmo actual', n: 1, valores: etiquetas.map((_, k) => porMes[0] * k) },
    { nombre: 'Simulación', n: 2, valores: etiquetas.map((_, k) => porMes[1] * k) },
  ], ingreso && meta ? meta : null);
}
