// Dashboard
'use strict';

// ---- Dashboard ----
// Texto de cada opción de periodo según se agrupe por mes calendario o por ciclo
const TEXTOS_PERIODO = {
  mes: ['Este mes', 'Ciclo actual'],
  '3m': ['Últimos 3 meses', 'Últimos 3 ciclos'],
  anio: ['Este año', 'Ciclos de este año'],
  todo: ['Todo', 'Todo'],
};

// Opciones: mes calendario o el ciclo de cada tarjeta configurada. Devuelve la tarjeta elegida
// (null = mes calendario); si no hay selección válida usa la primera tarjeta configurada.
function baseDashboard() {
  const sel = $('dash-base');
  const antes = sel.value;
  const conCiclo = tarjetas.filter(configurada);
  sel.replaceChildren(
    new Option('Por mes', 'mes'),
    ...conCiclo.map((t) => new Option(`Por ciclo de ${t.nombre}`, t.id)),
  );
  sel.classList.toggle('hidden', !conCiclo.length);
  sel.value = [...sel.options].some((o) => o.value === antes) ? antes : sel.options[0].value;
  const t = tarjetaDe(sel.value) || null;
  for (const o of $('dash-periodo').options) o.textContent = TEXTOS_PERIODO[o.value][t ? 1 : 0];
  return t;
}

// Índice (año * 12 + mes) del periodo al que pertenece la fecha; t = tarjeta o null (mes)
function indiceDash(t, iso) {
  if (t) return indiceCiclo(iso, t.corte);
  const [a, m] = iso.split('-').map(Number);
  return a * 12 + m - 1;
}

// Periodo de índice n: el mes calendario n o el ciclo de la tarjeta que cierra en el mes n
function periodoDash(t, n) {
  const a = Math.floor(n / 12), m0 = n % 12;
  const mes = new Date(a, m0, 1);
  const etiqueta = mes.toLocaleDateString('es-ES', { month: 'short' });
  if (t) {
    const c = cicloDe(n, t.corte, t.pago);
    return { desde: c.desde, hasta: c.hasta, etiqueta, titulo: `Ciclo ${fechaCorta(c.desde)} – ${formatearFecha(c.hasta)}` };
  }
  return {
    desde: isoDia(mes),
    hasta: isoDia(new Date(a, m0 + 1, 0)),
    etiqueta,
    titulo: mes.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
  };
}

// Periodos del filtro elegido, del más antiguo al actual
function periodosDash(t, p) {
  const actual = indiceDash(t, hoyISO());
  let primero = actual;
  if (p === '3m') primero = actual - 2;
  if (p === 'anio') primero = Number(hoyISO().slice(0, 4)) * 12;
  if (p === 'todo') for (const g of personales(gastos)) primero = Math.min(primero, indiceDash(t, g.fecha));
  const lista = [];
  for (let n = primero; n <= actual; n++) lista.push(periodoDash(t, n));
  return lista;
}

function renderDashboard() {
  const base = baseDashboard();
  const periodos = periodosDash(base, $('dash-periodo').value);
  const medio = $('dash-medio').value;
  const desde = periodos[0].desde, hasta = periodos[periodos.length - 1].hasta;
  const delMedio = personales(gastos).filter((g) => !medio || g.medio === medio);
  const lista = delMedio.filter((g) => g.fecha >= desde && g.fecha <= hasta);
  const total = sumar(lista);
  const hoy = hoyISO();
  const n = periodos.length;
  const unidad = base ? 'ciclo' : 'mes';

  $('dash-total').textContent = soles.format(total);
  $('dash-total-sub').textContent = `${lista.length} ${lista.length === 1 ? 'registro' : 'registros'}`;
  if (n === 1) {
    // Periodo actual: se compara con el anterior hasta el mismo día transcurrido
    const anterior = periodoDash(base, indiceDash(base, hoy) - 1);
    const tope = sumarDias(anterior.desde, -diasHasta(periodos[0].desde));
    const previo = sumar(delMedio.filter((g) => g.fecha >= anterior.desde && g.fecha <= tope && g.fecha <= anterior.hasta));
    $('dash-promedio-label').textContent = `${unidad === 'ciclo' ? 'Ciclo' : 'Mes'} anterior a la misma fecha`;
    $('dash-promedio').textContent = soles.format(previo);
    delta($('dash-promedio-sub'), sumar(lista.filter((g) => g.fecha <= hoy)) - previo, true, `el ${unidad} anterior`);
  } else {
    $('dash-promedio-label').textContent = unidad === 'ciclo' ? 'Promedio por ciclo' : 'Promedio mensual';
    $('dash-promedio').textContent = soles.format(total / n);
    $('dash-promedio-sub').className = 'sub';
    $('dash-promedio-sub').textContent = `en ${n} ${unidad === 'ciclo' ? 'ciclos' : 'meses'}`;
  }

  const mayor = lista.reduce((a, g) => (!a || enSoles(g) > enSoles(a) ? g : a), null);
  $('dash-mayor').textContent = mayor ? dinero(mayor.importe, mayor.moneda) : '—';
  $('dash-mayor-sub').textContent = mayor ? `${mayor.descripcion} · ${formatearFecha(mayor.fecha)}` : 'Sin gastos en este periodo';

  // Por categoría
  const porCat = {};
  for (const g of lista) porCat[g.categoria] = (porCat[g.categoria] || 0) + enSoles(g);
  const filas = Object.entries(porCat).sort((a, b) => b[1] - a[1]);
  const pct = (v) => Math.round((v / total) * 100) + ' %';

  $('dash-cat').textContent = filas.length ? filas[0][0] : '—';
  $('dash-cat-sub').textContent = filas.length ? `${soles.format(filas[0][1])} · ${pct(filas[0][1])} del total` : '';

  const cont = $('dash-categorias');
  cont.replaceChildren();
  if (!filas.length) {
    const v = document.createElement('div');
    v.className = 'vacio';
    v.textContent = 'No hay gastos en este periodo.';
    cont.append(v);
  }
  for (const [c, v] of filas) {
    const fila = document.createElement('div');
    fila.className = 'cat-fila';
    fila.tabIndex = 0;
    const pista = document.createElement('div');
    const barra = document.createElement('div');
    barra.className = 'cat-barra';
    barra.style.width = (v / filas[0][1]) * 100 + '%';
    pista.append(barra);
    const valor = document.createElement('span');
    valor.className = 'cat-valor';
    valor.textContent = soles.format(v);
    const porc = document.createElement('span');
    porc.className = 'cat-pct';
    porc.textContent = pct(v);
    fila.append(etiquetaCategoria(c), pista, valor, porc);
    conTooltip(fila, c, [{ valor: soles.format(v), texto: `· ${pct(v)} del total` }]);
    cont.append(fila);
  }

  // Evolución: diaria en el periodo actual (hasta hoy), por mes o ciclo en el resto
  const datos = [];
  if (n === 1) {
    $('dash-evol-titulo').textContent = 'Evolución diaria';
    const porDia = {};
    for (const g of lista) porDia[g.fecha] = (porDia[g.fecha] || 0) + enSoles(g);
    for (let f = periodos[0].desde; f <= hoy; f = sumarDias(f, 1)) {
      datos.push({ etiqueta: String(Number(f.slice(8))), titulo: formatearFecha(f), valor: porDia[f] || 0, destacar: f === hoy });
    }
  } else {
    $('dash-evol-titulo').textContent = unidad === 'ciclo' ? 'Evolución por ciclo de facturación' : 'Evolución mensual';
    periodos.forEach((p, i) => {
      datos.push({
        etiqueta: p.etiqueta,
        titulo: p.titulo,
        valor: sumar(lista.filter((g) => g.fecha >= p.desde && g.fecha <= p.hasta)),
        destacar: i === n - 1,
      });
    });
  }
  graficoBarras($('dash-evolucion'), datos);
}
