// Negocio: ventas, inversión y gastos de un negocio, separados de las finanzas personales
'use strict';

// ---- Negocio ----
// Tipos al estilo de las apps para pequeños negocios: lo que entra (ventas), lo que se invierte
// para arrancar o crecer (equipos, local, primer stock) y los gastos de cada mes.
// La ganancia = entradas − gastos; la inversión se recupera con la ganancia acumulada.
const TIPOS_NEGOCIO = {
  venta: { nombre: 'Venta', grupo: 'entrada', icono: 'dinero', color: 'verde' },
  inversion: { nombre: 'Inversión', grupo: 'inversion', icono: 'crecer', color: 'indigo' },
  mercaderia: { nombre: 'Mercadería', grupo: 'gasto', icono: 'compras', color: 'ambar' },
  publicidad: { nombre: 'Publicidad', grupo: 'gasto', icono: 'megafono', color: 'rosa' },
  personal: { nombre: 'Personal', grupo: 'gasto', icono: 'persona', color: 'violeta' },
  alquiler: { nombre: 'Alquiler', grupo: 'gasto', icono: 'casa', color: 'azul' },
  servicios: { nombre: 'Servicios', grupo: 'gasto', icono: 'luz', color: 'naranja' },
  transporte: { nombre: 'Envíos', grupo: 'gasto', icono: 'camion', color: 'cian' },
  comisiones: { nombre: 'Comisiones', grupo: 'gasto', icono: 'banco', color: 'gris' },
  impuestos: { nombre: 'Impuestos', grupo: 'gasto', icono: 'documento', color: 'rojo' },
  otro_gasto: { nombre: 'Otro gasto', grupo: 'gasto', icono: 'otros', color: 'gris' },
  otro_ingreso: { nombre: 'Otro ingreso', grupo: 'entrada', icono: 'regalo', color: 'verde' },
};
let negEditandoId = null, limiteNegocio = TAM_LISTA;

function movimientoNegocioValido(m) {
  const importe = redondear(Number(m?.importe));
  if (!Object.hasOwn(TIPOS_NEGOCIO, m?.tipo) || !(importe > 0) || !fechaValida(m.fecha)) return null;
  const descripcion = (typeof m.descripcion === 'string' ? m.descripcion.trim().slice(0, 100) : '') || TIPOS_NEGOCIO[m.tipo].nombre;
  return { id: idValido(m), tipo: m.tipo, descripcion, importe, moneda: m.moneda === 'USD' ? 'USD' : 'PEN', fecha: m.fecha };
}

function cargarNegocio() {
  const datos = leerJSON(CLAVE_NEGOCIO, []);
  negocio = Array.isArray(datos) ? datos.map(movimientoNegocioValido).filter(Boolean) : [];
}

function guardarNegocio() {
  escribirJSON(CLAVE_NEGOCIO, negocio);
  programarSync();
}

// Lo que entra vale a la compra del dólar; lo que sale cuesta a la venta
function negocioEnSoles(m) {
  return aSoles(m.importe, m.moneda, m.fecha, TIPOS_NEGOCIO[m.tipo].grupo === 'entrada' ? 'compra' : 'venta');
}

function cifrasNegocio(lista) {
  const c = { ventas: 0, gastos: 0, inversion: 0, porTipo: {} };
  for (const m of lista) {
    const s = negocioEnSoles(m);
    const grupo = TIPOS_NEGOCIO[m.tipo].grupo;
    if (grupo === 'entrada') c.ventas += s;
    else if (grupo === 'inversion') c.inversion += s;
    else {
      c.gastos += s;
      c.porTipo[m.tipo] = (c.porTipo[m.tipo] || 0) + s;
    }
  }
  c.ventas = redondear(c.ventas);
  c.gastos = redondear(c.gastos);
  c.inversion = redondear(c.inversion);
  c.ganancia = redondear(c.ventas - c.gastos);
  return c;
}

function rangoNegocio() {
  const hoy = hoyISO();
  const [a, m] = hoy.split('-').map(Number);
  const p = $('neg-periodo').value;
  if (p === 'mes-ant') return { desde: isoDia(new Date(a, m - 2, 1)), hasta: isoDia(new Date(a, m - 1, 0)) };
  if (p === 'anio') return { desde: `${a}-01-01`, hasta: `${a}-12-31` };
  if (p === 'todo') return { desde: '0000-01-01', hasta: '9999-12-31' };
  return { desde: hoy.slice(0, 8) + '01', hasta: isoDia(new Date(a, m, 0)) };
}

// Selector visual del tipo, como el de categorías del gasto
function crearTiposNegocio() {
  $('neg-tipo').replaceChildren(...Object.entries(TIPOS_NEGOCIO).map(([clave, t]) => {
    const label = document.createElement('label');
    const r = document.createElement('input');
    r.type = 'radio';
    r.name = 'neg-tipo';
    r.value = clave;
    const caja = document.createElement('span');
    caja.className = 'opcion-cat';
    const texto = document.createElement('span');
    texto.textContent = t.nombre;
    caja.append(iconoCategoria(t.icono, t.color), texto);
    label.append(r, caja);
    return label;
  }));
}

function tipoNegocioElegido() {
  return document.querySelector('input[name="neg-tipo"]:checked')?.value || 'venta';
}

function fijarTipoNegocio(tipo) {
  const r = [...document.querySelectorAll('input[name="neg-tipo"]')].find((x) => x.value === tipo);
  if (r) r.checked = true;
}

function etiquetaTipoNegocio(tipo) {
  const t = TIPOS_NEGOCIO[tipo];
  const chip = document.createElement('span');
  chip.className = 'cat-chip';
  const texto = document.createElement('span');
  texto.textContent = t.nombre;
  chip.append(iconoCategoria(t.icono, t.color, 'chico'), texto);
  return chip;
}

// El tipo elegido se mantiene para el siguiente: se suelen registrar varios iguales seguidos
function salirEdicionNegocio() {
  const tipo = negEditandoId ? 'venta' : tipoNegocioElegido();
  negEditandoId = null;
  $('neg-form').reset();
  fijarTipoNegocio(tipo);
  $('neg-fecha').value = hoyISO();
  $('neg-form-titulo').textContent = 'Nuevo movimiento';
  $('neg-guardar').textContent = 'Añadir movimiento';
  $('neg-cancelar').classList.add('hidden');
}

function editarNegocio(m) {
  negEditandoId = m.id;
  $('neg-importe').value = m.importe;
  $('neg-moneda').value = m.moneda;
  fijarTipoNegocio(m.tipo);
  $('neg-descripcion').value = m.descripcion === TIPOS_NEGOCIO[m.tipo].nombre ? '' : m.descripcion;
  $('neg-fecha').value = m.fecha;
  $('neg-form-titulo').textContent = 'Editar movimiento';
  $('neg-guardar').textContent = 'Guardar cambios';
  $('neg-cancelar').classList.remove('hidden');
  renderNegocio();
  abrirHoja('negocio');
  $('neg-form').scrollIntoView({ behavior: desplazamiento(), block: 'center' });
}

function renderNegocio() {
  const { desde, hasta } = rangoNegocio();
  const delPeriodo = entre(negocio, desde, hasta);
  const c = cifrasNegocio(delPeriodo);
  const total = cifrasNegocio(negocio);
  const sinTasa = delPeriodo.some((m) => m.moneda === 'USD' && !negocioEnSoles(m));

  $('neg-ventas').textContent = soles.format(c.ventas);
  $('neg-gastos').textContent = soles.format(c.gastos);
  const ganancia = $('neg-ganancia');
  ganancia.textContent = conSigno(c.ganancia);
  ganancia.classList.toggle('ok', c.ganancia > 0);
  ganancia.classList.toggle('mal', c.ganancia < 0);
  $('neg-ganancia-sub').textContent = sinTasa ? 'Sin tipo de cambio: faltan los dólares'
    : c.ventas > 0 ? `${Math.round((c.ganancia / c.ventas) * 100)}% de lo que vendes` : '';

  // La inversión se mira desde el inicio: se recupera con la ganancia de todos los meses
  $('neg-inversion').textContent = soles.format(total.inversion);
  const barra = $('neg-recupero');
  barra.classList.toggle('hidden', !total.inversion);
  if (total.inversion) {
    const fraccion = Math.max(0, total.ganancia) / total.inversion;
    $('neg-inversion-sub').textContent = fraccion >= 1 ? 'Ya la recuperaste'
      : `Recuperaste ${soles.format(Math.max(0, total.ganancia))} (${Math.floor(fraccion * 100)}%)`;
    barra.firstElementChild.style.width = Math.min(100, fraccion * 100) + '%';
    barra.firstElementChild.classList.toggle('ok', fraccion >= 1);
  } else {
    $('neg-inversion-sub').textContent = 'Sin inversión registrada';
  }

  // Movimientos del periodo, los más recientes primero (el mismo día, el último registrado arriba)
  const lista = [...delPeriodo].reverse().sort(porFechaDesc);
  const tbody = $('neg-lista');
  tbody.replaceChildren();
  for (const m of lista.slice(0, limiteNegocio)) {
    const tr = document.createElement('tr');
    if (m.id === negEditandoId) tr.classList.add('editando');
    celda(tr, 'Fecha', formatearFecha(m.fecha), 'fecha');
    celda(tr, 'Descripción', m.descripcion);
    celda(tr, 'Tipo', etiquetaTipoNegocio(m.tipo));
    const entra = TIPOS_NEGOCIO[m.tipo].grupo === 'entrada';
    celda(tr, 'Monto', entra ? montoConSigno(m.importe, true, m.moneda) : conSigno(-m.importe, m.moneda), 'num');
    const acciones = celda(tr, '', '', 'acciones');
    acciones.append(
      boton('Editar', 'Editar movimiento', () => editarNegocio(m)),
      botonEliminar('Eliminar movimiento', () => {
        negocio = negocio.filter((x) => x.id !== m.id);
        if (negEditandoId === m.id) salirEdicionNegocio();
        guardarNegocio();
        renderNegocio();
      }),
    );
    tbody.append(tr);
  }
  const restantes = lista.length - limiteNegocio;
  $('neg-ver-mas').classList.toggle('hidden', restantes <= 0);
  $('neg-ver-mas').textContent = `Ver más (${restantes})`;
  $('neg-tabla').classList.toggle('hidden', !lista.length);
  $('neg-vacio').classList.toggle('hidden', lista.length > 0);

  // En qué se va el dinero del periodo, de mayor a menor
  const tipos = Object.entries(c.porTipo).sort((a, b) => b[1] - a[1]);
  const cuerpoTipos = $('neg-tipos');
  cuerpoTipos.replaceChildren();
  for (const [tipo, monto] of tipos) {
    const tr = document.createElement('tr');
    celda(tr, 'Tipo', etiquetaTipoNegocio(tipo));
    celda(tr, 'Monto', soles.format(monto), 'num');
    celda(tr, 'Parte', c.gastos ? Math.round((monto / c.gastos) * 100) + '%' : '', 'num');
    cuerpoTipos.append(tr);
  }
  $('neg-tabla-tipos').classList.toggle('hidden', !tipos.length);
  $('neg-tipos-vacio').classList.toggle('hidden', tipos.length > 0);

  // Últimos 12 meses con movimientos
  const meses = [...new Set(negocio.map((m) => m.fecha.slice(0, 7)))].sort().reverse().slice(0, 12);
  const cuerpoMeses = $('neg-meses');
  cuerpoMeses.replaceChildren();
  for (const mes of meses) {
    const h = cifrasNegocio(negocio.filter((m) => m.fecha.startsWith(mes)));
    const tr = document.createElement('tr');
    celda(tr, 'Mes', nombreMes(mes));
    celda(tr, 'Ventas', soles.format(h.ventas), 'num');
    celda(tr, 'Gastos', soles.format(h.gastos), 'num');
    celda(tr, 'Ganancia', montoConSigno(h.ganancia, true), 'num');
    celda(tr, 'Inversión', soles.format(h.inversion), 'num');
    cuerpoMeses.append(tr);
  }
  if (!meses.length) {
    const tr = document.createElement('tr');
    const td = celda(tr, '', 'Aún no hay movimientos.');
    td.colSpan = 5;
    cuerpoMeses.append(tr);
  }
}

crearTiposNegocio();

$('neg-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const fecha = $('neg-fecha').value || hoyISO();
  if (fecha > hoyISO()) return avisar('neg-msg', 'La fecha no puede ser futura.', true);
  const m = movimientoNegocioValido({
    id: negEditandoId || nuevoId(), tipo: tipoNegocioElegido(), descripcion: $('neg-descripcion').value,
    importe: $('neg-importe').value, moneda: $('neg-moneda').value, fecha,
  });
  if (!m) return avisar('neg-msg', 'Revisa el monto y la fecha.', true);
  const actual = negocio.find((x) => x.id === negEditandoId);
  if (actual) Object.assign(actual, m);
  else negocio.push(m);
  avisar('neg-msg', '');
  salirEdicionNegocio();
  guardarNegocio();
  renderNegocio();
});
$('neg-cancelar').addEventListener('click', () => {
  salirEdicionNegocio();
  renderNegocio();
});
$('neg-periodo').addEventListener('change', () => {
  limiteNegocio = TAM_LISTA;
  renderNegocio();
});
$('neg-ver-mas').addEventListener('click', () => {
  limiteNegocio += TAM_LISTA;
  renderNegocio();
});
