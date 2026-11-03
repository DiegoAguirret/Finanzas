// Deudas y metas
'use strict';

// ---- Deudas y metas ----
const TIPOS_DEUDA = { prestamo: 'Préstamo', persona: 'A una persona', otro: 'Otra' };
const ICONOS_DEUDA = { prestamo: 'banco', persona: 'persona', otro: 'otros' };
let deuEditandoId = null, deuSeleccion = null, metEditandoId = null, metSeleccion = null;

const idValido = (x) => (esUUID(x?.id) ? x.id : nuevoId());
const fechaValida = (f) => /^\d{4}-\d{2}-\d{2}$/.test(f);
const deudaDe = (id) => deudas.find((x) => x.id === id);
const metaDe = (id) => metas.find((x) => x.id === id);

function deudaValida(d) {
  const nombre = typeof d?.nombre === 'string' ? d.nombre.trim().slice(0, 40) : '';
  const monto = redondear(Number(d?.monto));
  if (!nombre || !(monto > 0) || !fechaValida(d.fecha)) return null;
  return { id: idValido(d), nombre, tipo: Object.hasOwn(TIPOS_DEUDA, d.tipo) ? d.tipo : 'otro', moneda: d.moneda === 'USD' ? 'USD' : 'PEN', monto, fecha: d.fecha };
}

function abonoValido(a) {
  const importe = redondear(Number(a?.importe));
  if (!deudaDe(a?.deuda) || !(importe > 0) || !fechaValida(a.fecha)) return null;
  return { id: idValido(a), deuda: a.deuda, fecha: a.fecha, importe };
}

function metaValida(m) {
  const nombre = typeof m?.nombre === 'string' ? m.nombre.trim().slice(0, 40) : '';
  const objetivo = redondear(Number(m?.objetivo));
  if (!nombre || !(objetivo > 0)) return null;
  return {
    id: idValido(m), nombre, icono: Object.hasOwn(ICONOS, m.icono) ? m.icono : 'meta', color: COLORES.includes(m.color) ? m.color : 'azul',
    moneda: m.moneda === 'USD' ? 'USD' : 'PEN', objetivo, limite: fechaValida(m.limite) ? m.limite : null,
  };
}

function aporteValido(a) {
  const importe = redondear(Number(a?.importe));
  if (!metaDe(a?.meta) || !importe || !fechaValida(a.fecha)) return null;
  return { id: idValido(a), meta: a.meta, fecha: a.fecha, importe };
}

// Va después de cargar el resto: las listas guardadas se validan en orden, padres primero
function cargarObjetivos() {
  const lista = (clave, valida) => {
    const datos = leerJSON(clave, []);
    return Array.isArray(datos) ? datos.map(valida).filter(Boolean) : [];
  };
  categorias = normalizarCategorias(leerJSON(CLAVE_CATEGORIAS, null));
  ajustes = ajustesValidos(leerJSON(CLAVE_AJUSTES, null));
  deudas = lista(CLAVE_DEUDAS, deudaValida);
  abonos = lista(CLAVE_ABONOS, abonoValido);
  saldos = lista(CLAVE_SALDOS, saldoValido);
  metas = lista(CLAVE_METAS, metaValida);
  aportes = lista(CLAVE_APORTES, aporteValido);
}

function guardarDeudas() {
  escribirJSON(CLAVE_DEUDAS, deudas);
  escribirJSON(CLAVE_ABONOS, abonos);
  programarSync();
}

function guardarMetas() {
  escribirJSON(CLAVE_METAS, metas);
  escribirJSON(CLAVE_APORTES, aportes);
  programarSync();
}

function avisar(id, texto, error = false) {
  const el = $(id);
  el.textContent = texto;
  el.classList.toggle('error', error);
  el.classList.toggle('hidden', !texto);
}

// Eliminar en dos clics: se cancela solo a los 3 s
function botonEliminar(titulo, alConfirmar) {
  const b = boton('Eliminar', titulo, () => {
    if (b.classList.contains('confirmar')) return alConfirmar();
    b.classList.add('confirmar');
    b.classList.remove('solo-ico');
    b.textContent = '¿Eliminar?';
    setTimeout(() => {
      b.classList.remove('confirmar');
      b.classList.add('solo-ico');
      b.replaceChildren(icono('eliminar'));
    }, 3000);
  });
  return b;
}

// Dólares a soles: la deuda a la venta (lo que cuesta pagarla), lo ahorrado a la compra (lo que vale)
function aSoles(importe, moneda, fecha, lado) {
  if (moneda !== 'USD') return importe;
  const tc = tasaPara(null, fecha, lado);
  return tc ? importe * tc : 0;
}

function abonoEnSoles(a) {
  return aSoles(a.importe, deudaDe(a.deuda)?.moneda, a.fecha, 'venta');
}

function barraProgreso(fraccion) {
  const pista = document.createElement('div');
  pista.className = 'progreso';
  const barra = document.createElement('div');
  barra.style.width = Math.min(100, Math.max(0, fraccion * 100)) + '%';
  pista.append(barra);
  return pista;
}

function filaObjetivo({ icono, nombre, sub, monto, fraccion, acciones, elegido }) {
  const fila = document.createElement('div');
  fila.className = 'objetivo' + (elegido ? ' elegido' : '');
  const textos = document.createElement('div');
  const n = document.createElement('div');
  n.className = 'objetivo-nombre';
  n.textContent = nombre;
  const s = document.createElement('div');
  s.className = 'objetivo-sub';
  s.textContent = sub;
  textos.append(n, s);
  const m = document.createElement('div');
  m.className = 'objetivo-monto';
  m.textContent = monto;
  fila.append(icono, textos, m);
  if (fraccion !== null) fila.append(barraProgreso(fraccion));
  const caja = document.createElement('div');
  caja.className = 'objetivo-acciones';
  caja.append(...acciones);
  fila.append(caja);
  return fila;
}

function vacio(texto) {
  const v = document.createElement('div');
  v.className = 'vacio';
  v.textContent = texto;
  return v;
}

const porFechaDesc = (a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0);

// Deudas
function abonosDe(d) {
  return abonos.filter((a) => a.deuda === d.id);
}

function pendienteDeuda(d) {
  return redondear(d.monto - abonosDe(d).reduce((s, a) => s + a.importe, 0));
}

function deudaDeTarjeta(t) {
  const d = montos();
  for (const g of gastos) if (g.medio === t.id) d[g.moneda] += g.importe;
  for (const s of saldosDe(t)) d[s.moneda] += s.importe;
  for (const p of pagosDe(t)) d[p.moneda] -= p.importe;
  return { PEN: redondear(d.PEN), USD: redondear(d.USD) };
}

function salirEdicionDeuda() {
  deuEditandoId = null;
  $('deu-mas').open = false;
  $('deu-form').reset();
  $('deu-fecha').value = hoyISO();
  $('deu-form-titulo').textContent = 'Nueva deuda';
  $('deu-guardar').textContent = 'Añadir deuda';
  $('deu-cancelar').classList.add('hidden');
}

function editarDeuda(d) {
  deuEditandoId = d.id;
  $('deu-mas').open = true;
  $('deu-nombre').value = d.nombre;
  $('deu-tipo').value = d.tipo;
  $('deu-monto').value = d.monto;
  $('deu-moneda').value = d.moneda;
  $('deu-fecha').value = d.fecha;
  $('deu-form-titulo').textContent = 'Editar deuda';
  $('deu-guardar').textContent = 'Guardar cambios';
  $('deu-cancelar').classList.remove('hidden');
  abrirHoja('deudas');
  $('deu-form').scrollIntoView({ behavior: desplazamiento(), block: 'center' });
}

function renderDeudas() {
  const hoy = hoyISO();
  let enTarjetas = 0, enOtras = 0, sinTasa = false;
  const lista = $('deu-lista');
  lista.replaceChildren();

  for (const t of tarjetas) {
    const d = deudaDeTarjeta(t);
    if (d.PEN <= 0 && d.USD <= 0) continue;
    const tc = tasaPara(t.banco, hoy, 'venta');
    if (d.USD > 0 && !tc) sinTasa = true;
    enTarjetas += Math.max(0, d.PEN) + Math.max(0, d.USD) * (tc || 0);
    const ver = boton('Ver tarjeta', `Ver ${t.nombre}`, () => {
      tarSeleccion = t.id;
      location.hash = 'tarjeta';
    });
    lista.append(filaObjetivo({ icono: iconoCategoria('tarjeta', 'azul'), nombre: t.nombre, sub: 'Tarjeta', monto: textoDeuda(d), fraccion: null, acciones: [ver] }));
  }

  for (const d of deudas) {
    const pendiente = pendienteDeuda(d);
    if (d.moneda === 'USD' && pendiente > 0 && !tasaPara(null, hoy, 'venta')) sinTasa = true;
    enOtras += aSoles(Math.max(0, pendiente), d.moneda, hoy, 'venta');
    lista.append(filaObjetivo({
      icono: iconoCategoria(ICONOS_DEUDA[d.tipo], pendiente > 0 ? 'naranja' : 'verde'),
      nombre: d.nombre,
      sub: `${TIPOS_DEUDA[d.tipo]} · de ${dinero(d.monto, d.moneda)}`,
      monto: pendiente > 0 ? dinero(pendiente, d.moneda) : 'Pagada',
      fraccion: 1 - pendiente / d.monto,
      elegido: deuSeleccion === d.id,
      acciones: [
        boton('Abonar', `Abonar a ${d.nombre}`, () => {
          deuSeleccion = d.id;
          renderDeudas();
          $('deu-detalle').scrollIntoView({ behavior: desplazamiento(), block: 'center' });
          $('abo-importe').focus();
        }),
        boton('Editar', `Editar ${d.nombre}`, () => editarDeuda(d)),
        botonEliminar(`Eliminar ${d.nombre}`, () => {
          deudas = deudas.filter((x) => x.id !== d.id);
          abonos = abonos.filter((a) => a.deuda !== d.id);
          if (deuEditandoId === d.id) salirEdicionDeuda();
          guardarDeudas();
          render();
          renderDeudas();
        }),
      ],
    }));
  }
  if (!lista.children.length) lista.append(vacio('No tienes deudas registradas.'));

  $('deu-total').textContent = soles.format(enTarjetas + enOtras);
  $('deu-total-sub').textContent = sinTasa ? 'Sin tipo de cambio: faltan los dólares' : 'Dólares a la venta de hoy';
  $('deu-tarjetas').textContent = soles.format(enTarjetas);
  $('deu-otras').textContent = soles.format(enOtras);

  const elegida = deudaDe(deuSeleccion);
  $('deu-detalle').classList.toggle('hidden', !elegida);
  if (!elegida) return;
  const pendiente = pendienteDeuda(elegida);
  $('deu-det-titulo').textContent = `Pagos a ${elegida.nombre}`;
  $('abo-etiqueta').textContent = `Pago (${elegida.moneda === 'USD' ? 'US$' : 'S/'}, quedan ${dinero(pendiente, elegida.moneda)})`;
  if (!$('abo-fecha').value) $('abo-fecha').value = hoy;
  const tbody = $('abo-lista');
  tbody.replaceChildren();
  for (const a of abonosDe(elegida).sort(porFechaDesc)) {
    const tr = document.createElement('tr');
    celda(tr, 'Fecha', formatearFecha(a.fecha), 'fecha');
    celda(tr, 'Pago', dinero(a.importe, elegida.moneda), 'num');
    celda(tr, '', botonEliminar('Eliminar pago', () => {
      abonos = abonos.filter((x) => x.id !== a.id);
      guardarDeudas();
      render();
      renderDeudas();
    }), 'acciones');
    tbody.append(tr);
  }
}

// Metas
function aportesDe(m) {
  return aportes.filter((a) => a.meta === m.id);
}

function guardadoEnMeta(m) {
  return redondear(aportesDe(m).reduce((s, a) => s + a.importe, 0));
}

function salirEdicionMeta() {
  metEditandoId = null;
  $('met-mas').open = false;
  $('met-form').reset();
  fijarSelectores('met', 'meta', 'azul');
  $('met-form-titulo').textContent = 'Nueva meta';
  $('met-guardar').textContent = 'Añadir meta';
  $('met-cancelar').classList.add('hidden');
}

function editarMeta(m) {
  metEditandoId = m.id;
  $('met-mas').open = true;
  $('met-nombre').value = m.nombre;
  $('met-objetivo').value = m.objetivo;
  $('met-moneda').value = m.moneda;
  $('met-limite').value = m.limite || '';
  fijarSelectores('met', m.icono, m.color);
  $('met-form-titulo').textContent = 'Editar meta';
  $('met-guardar').textContent = 'Guardar cambios';
  $('met-cancelar').classList.remove('hidden');
  abrirHoja('ahorro');
  $('met-form').scrollIntoView({ behavior: desplazamiento(), block: 'center' });
}

function renderAhorro() {
  const hoy = hoyISO();
  const [anioHoy, mesHoy] = hoy.split('-').map(Number);
  const finMes = isoDia(new Date(anioHoy, mesHoy, 0)); // incluye lo que vence más adelante en el mes
  const mes = cifrasPeriodo(hoy.slice(0, 8) + '01', finMes).ahorro;
  const acumulado = acumuladoAl(finMes);
  let enMetas = 0;
  const lista = $('met-lista');
  lista.replaceChildren();
  for (const m of metas) {
    const guardado = guardadoEnMeta(m);
    enMetas += aSoles(guardado, m.moneda, hoy, 'compra');
    const falta = redondear(m.objetivo - guardado);
    let sub = falta > 0 ? `Faltan ${dinero(falta, m.moneda)}` : 'Meta cumplida';
    if (falta > 0 && m.limite) {
      const dias = diasHasta(m.limite);
      sub += dias < 0 ? ` · venció el ${fechaCorta(m.limite)}`
        : ` · ${dinero(falta / Math.max(1, Math.ceil(dias / 30.44)), m.moneda)} al mes hasta el ${fechaCorta(m.limite)}`;
    }
    lista.append(filaObjetivo({
      icono: iconoCategoria(m.icono, m.color),
      nombre: m.nombre,
      sub,
      monto: `${dinero(guardado, m.moneda)} de ${dinero(m.objetivo, m.moneda)}`,
      fraccion: guardado / m.objetivo,
      elegido: metSeleccion === m.id,
      acciones: [
        boton('Aportar', `Aportar a ${m.nombre}`, () => {
          metSeleccion = m.id;
          renderAhorro();
          $('met-detalle').scrollIntoView({ behavior: desplazamiento(), block: 'center' });
          $('apo-importe').focus();
        }),
        boton('Editar', `Editar ${m.nombre}`, () => editarMeta(m)),
        botonEliminar(`Eliminar ${m.nombre}`, () => {
          metas = metas.filter((x) => x.id !== m.id);
          aportes = aportes.filter((a) => a.meta !== m.id);
          if (metEditandoId === m.id) salirEdicionMeta();
          guardarMetas();
          renderAhorro();
        }),
      ],
    }));
  }
  if (!metas.length) lista.append(vacio('Crea tu primera meta de ahorro.'));

  const libre = redondear(acumulado - enMetas);
  $('aho-mes').textContent = soles.format(mes);
  $('aho-metas').textContent = soles.format(enMetas);
  $('aho-metas-sub').textContent = `${metas.length} ${metas.length === 1 ? 'meta' : 'metas'}`;
  $('aho-libre').textContent = soles.format(libre);
  $('aho-libre-sub').textContent = libre < 0 ? 'Separaste más de lo que has ahorrado' : `Ahorro total: ${soles.format(acumulado)}`;

  const elegida = metaDe(metSeleccion);
  $('met-detalle').classList.toggle('hidden', !elegida);
  if (!elegida) return;
  $('met-det-titulo').textContent = `Movimientos de ${elegida.nombre}`;
  $('apo-etiqueta').textContent = `Monto (${elegida.moneda === 'USD' ? 'US$' : 'S/'})`;
  if (!$('apo-fecha').value) $('apo-fecha').value = hoy;
  const tbody = $('apo-lista');
  tbody.replaceChildren();
  for (const a of aportesDe(elegida).sort(porFechaDesc)) {
    const tr = document.createElement('tr');
    celda(tr, 'Fecha', formatearFecha(a.fecha), 'fecha');
    celda(tr, 'Movimiento', a.importe > 0 ? 'Guardaste' : 'Sacaste');
    celda(tr, 'Monto', dinero(Math.abs(a.importe), elegida.moneda), 'num');
    celda(tr, '', botonEliminar('Eliminar movimiento', () => {
      aportes = aportes.filter((x) => x.id !== a.id);
      guardarMetas();
      renderAhorro();
    }), 'acciones');
    tbody.append(tr);
  }
}

$('deu-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const d = deudaValida({
    id: deuEditandoId || nuevoId(), nombre: $('deu-nombre').value, tipo: $('deu-tipo').value,
    moneda: $('deu-moneda').value, monto: $('deu-monto').value, fecha: $('deu-fecha').value || hoyISO(),
  });
  if (!d) return avisar('deu-msg', 'Revisa los datos de la deuda.', true);
  const actual = deudaDe(deuEditandoId);
  if (actual) {
    const abonado = redondear(actual.monto - pendienteDeuda(actual));
    if (d.monto < abonado) return avisar('deu-msg', `Ya pagaste ${dinero(abonado, actual.moneda)}: el monto no puede ser menor.`, true);
    Object.assign(actual, d);
  } else {
    deudas.push(d);
  }
  avisar('deu-msg', '');
  salirEdicionDeuda();
  guardarDeudas();
  render();
  renderDeudas();
});
$('deu-cancelar').addEventListener('click', salirEdicionDeuda);

$('abo-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const d = deudaDe(deuSeleccion);
  const a = abonoValido({ id: nuevoId(), deuda: deuSeleccion, fecha: $('abo-fecha').value, importe: $('abo-importe').value });
  if (!d || !a) return avisar('deu-msg', 'Revisa la fecha y el monto.', true);
  const pendiente = pendienteDeuda(d);
  if (a.importe > pendiente) return avisar('deu-msg', `Solo quedan ${dinero(pendiente, d.moneda)} por pagar.`, true);
  abonos.push(a);
  avisar('deu-msg', '');
  $('abo-importe').value = '';
  guardarDeudas();
  render();
  renderDeudas();
});

$('met-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const m = metaValida({
    id: metEditandoId || nuevoId(), nombre: $('met-nombre').value, icono: valorSelector('met', 'icono'), color: valorSelector('met', 'color'),
    moneda: $('met-moneda').value, objetivo: $('met-objetivo').value, limite: $('met-limite').value,
  });
  if (!m) return avisar('aho-msg', 'Revisa los datos de la meta.', true);
  const actual = metaDe(metEditandoId);
  if (actual) Object.assign(actual, m);
  else metas.push(m);
  avisar('aho-msg', '');
  salirEdicionMeta();
  guardarMetas();
  renderAhorro();
});
$('met-cancelar').addEventListener('click', salirEdicionMeta);

$('apo-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const m = metaDe(metSeleccion);
  const retiro = $('apo-tipo').value === 'retiro';
  const importe = redondear(parseFloat($('apo-importe').value));
  const a = aporteValido({ id: nuevoId(), meta: metSeleccion, fecha: $('apo-fecha').value, importe: retiro ? -importe : importe });
  if (!m || !a || !(importe > 0)) return avisar('aho-msg', 'Revisa la fecha y el monto.', true);
  const guardado = guardadoEnMeta(m);
  if (retiro && importe > guardado) return avisar('aho-msg', `Solo tienes ${dinero(guardado, m.moneda)} en esta meta.`, true);
  aportes.push(a);
  avisar('aho-msg', '');
  $('apo-importe').value = '';
  guardarMetas();
  renderAhorro();
});

// Ajustes
for (const b of document.querySelectorAll('.ajustes-menu button')) {
  b.addEventListener('click', async () => {
    if (await confirmarSalida($('aj-' + ajusteActual), 'Si cambias de sección, se perderá lo que escribiste.')) abrirAjuste(b.dataset.ajuste);
  });
}
$('ir-categorias').addEventListener('click', () => { ajusteActual = 'categorias'; });
$('cat-form').addEventListener('submit', guardarCategoriaForm);
$('cat-cancelar').addEventListener('click', salirEdicionCategoria);
$('cuenta-form').addEventListener('submit', guardarNombreCuenta);
$('aj-entrar').addEventListener('click', () => mostrarAcceso());
$('aj-salir').addEventListener('click', cerrarSesion);
$('aj-inicio').replaceChildren(...VISTAS.map((v) => new Option(NOMBRES_VISTAS[v], v)));
try { $('aj-inicio').value = VISTAS.includes(localStorage.getItem(CLAVE_INICIO)) ? localStorage.getItem(CLAVE_INICIO) : 'gastos'; } catch {}
$('aj-inicio').addEventListener('change', () => {
  try { localStorage.setItem(CLAVE_INICIO, $('aj-inicio').value); } catch {}
});
crearSelectores('cat');
crearSelectores('met');
