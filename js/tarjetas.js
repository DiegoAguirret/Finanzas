// Tarjetas: ciclos, pagos y deuda anterior
'use strict';

// ---- Tarjetas de crédito ----
// Cada tarjeta: { id, nombre, corte, pago, linea }
// corte/pago: día del mes (1–31) o null; linea: S/ (0 = sin indicar)
// Cada pago: { id, tarjeta, importe, fecha }. Deuda = compras con la tarjeta − pagos;
// los pagos se asignan a los ciclos del más antiguo al más reciente.
let tarSeleccion = null;
let tarEditandoId = null;
let pagoSugerido = null; // lo que propuso «Pagar», por moneda
// Versión anterior: id de tarjeta → fechas de corte de los ciclos marcados como pagados
let pagadosAntiguos = {};

function diaDelMes(v) {
  const n = Number(v);
  return v !== '' && v !== null && Number.isInteger(n) && n >= 1 && n <= 31 ? n : null;
}

function configurada(t) {
  return !!(t.corte && (t.pago || t.plazo));
}

function tarjetaValida(t) {
  if (!t || typeof t !== 'object') return null;
  const nombre = typeof t.nombre === 'string' ? t.nombre.trim().slice(0, 40) : '';
  if (!nombre) return null;
  const id = typeof t.id === 'string' && t.id && !Object.hasOwn(MEDIOS_FIJOS, t.id) ? t.id : nuevoId();
  // Tarjetas de versiones anteriores sin banco: se deduce del nombre
  const banco = Object.hasOwn(BANCOS, t.banco) ? t.banco : /bcp/i.test(nombre) ? 'bcp' : /interbank/i.test(nombre) ? 'interbank' : 'otro';
  const plazo = Number.isInteger(Number(t.plazo)) && t.plazo >= 1 && t.plazo <= 90 ? Number(t.plazo) : null;
  return { id, nombre, banco, corte: diaDelMes(t.corte), pago: plazo ? null : diaDelMes(t.pago), plazo, linea: numero(t.linea) };
}

function cargarTarjetas() {
  let datos = null;
  try { datos = JSON.parse(localStorage.getItem(CLAVE_TARJETAS)); } catch {}
  if (!Array.isArray(datos)) {
    // Migración: la primera versión tenía una sola tarjeta Interbank y los gastos usaban el medio 'interbank'
    let antigua = null;
    try { antigua = JSON.parse(localStorage.getItem(CLAVE_TARJETA_ANTIGUA)); } catch {}
    datos = antigua || gastos.some((g) => g.medio === 'interbank')
      ? [{ ...(antigua || {}), id: 'interbank', nombre: 'Interbank', banco: 'interbank' }]
      : [];
    try { localStorage.removeItem(CLAVE_TARJETA_ANTIGUA); } catch {}
  }
  tarjetas = [];
  for (const original of datos) {
    const t = tarjetaValida(original);
    if (!t) continue;
    tarjetas.push(t);
    if (Array.isArray(original.pagados) && original.pagados.length) pagadosAntiguos[t.id] = original.pagados;
  }
  guardarTarjetas();
}

function guardarTarjetas() {
  escribirJSON(CLAVE_TARJETAS, tarjetas);
  programarSync();
}

// Pago a una tarjeta: abona `importe` a la deuda en `moneda`; de tu dinero sale `pagado` en
// `pagadoMoneda`. Si las monedas difieren, `tipoCambio` es el S/ por US$ que aplicó el banco.
function pagoValido(p) {
  if (!p || typeof p !== 'object' || !tarjetaDe(p.tarjeta)) return null;
  const moneda = p.moneda === 'USD' ? 'USD' : 'PEN';
  const pagadoMoneda = p.pagadoMoneda === 'USD' ? 'USD' : 'PEN';
  const importe = redondear(Number(p.importe));
  // Los pagos de versiones anteriores solo tenían { importe } en soles
  const pagado = p.pagado === undefined || p.pagado === null ? importe : redondear(Number(p.pagado));
  const tipoCambio = moneda !== pagadoMoneda && Number(p.tipoCambio) > 0 ? Number(p.tipoCambio) : null;
  if (!(importe > 0) || !(pagado > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(p.fecha)) return null;
  if (moneda !== pagadoMoneda && !tipoCambio) return null;
  return {
    id: typeof p.id === 'string' && p.id ? p.id : nuevoId(),
    tarjeta: p.tarjeta, fecha: p.fecha, moneda, importe, pagadoMoneda, pagado, tipoCambio,
  };
}

// Va después de cargar gastos y tarjetas: la migración necesita los totales de cada ciclo
function cargarPagos() {
  let datos = null;
  try { datos = JSON.parse(localStorage.getItem(CLAVE_PAGOS)); } catch {}
  pagos = Array.isArray(datos) ? datos.map(pagoValido).filter(Boolean) : [];
  // Migración: cada ciclo marcado como pagado pasa a ser un pago por su total, en su vencimiento
  const hoy = hoyISO();
  for (const [id, cortes] of Object.entries(pagadosAntiguos)) {
    const t = tarjetaDe(id);
    if (!configurada(t)) continue;
    for (const c of ciclosTarjeta(t)) {
      if (c.cerrado && c.total.PEN > 0 && cortes.includes(c.hasta)) {
        pagos.push(pagoValido({ tarjeta: id, importe: c.total.PEN, fecha: c.vence < hoy ? c.vence : hoy }));
      }
    }
  }
  if (Object.keys(pagadosAntiguos).length) {
    pagadosAntiguos = {};
    guardarPagos();
  }
}

function guardarPagos() {
  escribirJSON(CLAVE_PAGOS, pagos);
  programarSync();
}

function pagosDe(t) {
  return pagos.filter((p) => p.tarjeta === t.id);
}

// Día `dia` del mes m0 (base 0, puede desbordar), recortado al último día si el mes es más corto
function fechaEnMes(a, m0, dia) {
  const ultimo = new Date(a, m0 + 1, 0);
  return new Date(ultimo.getFullYear(), ultimo.getMonth(), Math.min(dia, ultimo.getDate()));
}

function isoDia(d) {
  return isoMes(d) + '-' + String(d.getDate()).padStart(2, '0');
}

function sumarDias(iso, n) {
  const [a, m, d] = iso.split('-').map(Number);
  return isoDia(new Date(a, m - 1, d + n));
}

// '21 oct' (sin año)
function fechaCorta(iso) {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
}

function diasHasta(iso) {
  const [a, m, d] = iso.split('-').map(Number);
  const [ha, hm, hd] = hoyISO().split('-').map(Number);
  return Math.round((new Date(a, m - 1, d) - new Date(ha, hm - 1, hd)) / 864e5);
}

function textoPago(t) {
  return t.plazo ? `pago ${t.plazo} días después` : `pago hasta el ${t.pago}`;
}

// Último día para pagar una compra hecha en esa fecha con esa tarjeta
function vencimientoCompra(fecha, t) {
  return cicloDe(indiceCiclo(fecha, t.corte), t).vence;
}

// Fecha en que un gasto cuenta para el ahorro: las compras con tarjeta, cuando vence su pago
// (salvo que el usuario prefiera el día de la compra o la tarjeta no tenga corte y pago)
function fechaDeCuenta(g) {
  const t = tarjetaDe(g.medio);
  return ajustes.compras === 'vence' && t && configurada(t) ? vencimientoCompra(g.fecha, t) : g.fecha;
}

// Deuda anterior de una tarjeta: sube la deuda desde que se registra y se reparte en el ciclo en que se paga.
// No es una compra (no sale en gastos ni en el Dashboard). Cuenta para el ahorro solo al vencer su pago;
// con «el día de la compra» no cuenta, porque se gastó antes de empezar a registrar.
function saldoValido(s) {
  const importe = redondear(Number(s?.importe));
  if (!tarjetaDe(s?.tarjeta) || !(importe > 0) || !fechaValida(s.fecha)) return null;
  return { id: idValido(s), tarjeta: s.tarjeta, fecha: s.fecha, moneda: s.moneda === 'USD' ? 'USD' : 'PEN', importe };
}

function guardarSaldos() {
  escribirJSON(CLAVE_SALDOS, saldos);
  programarSync();
}

const saldosDe = (t) => saldos.filter((s) => s.tarjeta === t.id);

function venceSaldo(s) {
  const t = tarjetaDe(s.tarjeta);
  return t && configurada(t) ? vencimientoCompra(s.fecha, t) : s.fecha;
}

// Deuda anterior que cuenta para el ahorro en el periodo, con la forma de un gasto para poder sumarla
function saldosDeCuenta(desde, hasta) {
  if (ajustes.compras !== 'vence') return [];
  return saldos
    .map((s) => ({ importe: s.importe, moneda: s.moneda, categoria: '', medio: s.tarjeta, fecha: venceSaldo(s) }))
    .filter((x) => x.fecha >= desde && x.fecha <= hasta);
}

// Saldo acumulado al cierre de la fecha: el dinero al empezar más el ahorro de todos los periodos
function acumuladoAl(fecha) {
  return redondear(ajustes.saldoInicial + cifrasPeriodo('0000-01-01', fecha).ahorro);
}

// Índice (año * 12 + mes) del corte que cierra el ciclo en que cae la fecha
function indiceCiclo(iso, corte) {
  const [a, m, d] = iso.split('-').map(Number);
  const n = a * 12 + m - 1;
  return d <= fechaEnMes(a, m - 1, corte).getDate() ? n : n + 1;
}

// Ciclo que cierra en el mes de índice n: va del día siguiente al corte anterior hasta el corte
function cicloDe(n, t) {
  const { corte, pago, plazo } = t;
  const a = Math.floor(n / 12), m0 = n % 12;
  const inicio = fechaEnMes(a, m0 - 1, corte);
  inicio.setDate(inicio.getDate() + 1);
  // Si el día de pago no es posterior al corte, el vencimiento cae el mes siguiente
  // Con plazo, el vencimiento cuenta esos días desde el corte
  const vence = plazo ? fechaEnMes(a, m0, corte) : fechaEnMes(a, m0 + (pago > corte ? 0 : 1), pago);
  if (plazo) vence.setDate(vence.getDate() + plazo);
  return { desde: isoDia(inicio), hasta: isoDia(fechaEnMes(a, m0, corte)), vence: isoDia(vence) };
}

// Ciclos de la tarjeta con consumos más el actual, de más reciente a más antiguo. Cada importe
// va por moneda ({ PEN, USD }): total, pagado, pendiente y paraSaldar (pendiente acumulado)
function ciclosTarjeta(t) {
  const hoy = hoyISO();
  const actual = indiceCiclo(hoy, t.corte);
  const porCiclo = {};
  for (const g of gastos) {
    if (g.medio !== t.id) continue;
    const n = indiceCiclo(g.fecha, t.corte);
    (porCiclo[n] ||= []).push(g);
  }
  for (const s of saldosDe(t)) (porCiclo[indiceCiclo(s.fecha, t.corte)] ||= []).push({ ...s, esSaldo: true });
  const indices = Object.keys(porCiclo).map(Number).concat(actual);
  const ciclos = [];
  for (let n = Math.max(...indices); n >= Math.min(...indices); n--) {
    const lista = porCiclo[n] || [];
    if (!lista.length && n !== actual) continue;
    const c = cicloDe(n, t);
    c.total = montos();
    for (const g of lista) c.total[g.moneda] = redondear(c.total[g.moneda] + g.importe);
    c.consumos = lista.filter((g) => !g.esSaldo).length;
    c.lista = lista;
    c.actual = n === actual;
    c.cerrado = c.hasta < hoy;
    ciclos.push(c);
  }
  // Los abonos de cada moneda se asignan del ciclo más antiguo al más reciente
  const restante = montos();
  for (const x of pagosDe(t)) restante[x.moneda] = redondear(restante[x.moneda] + x.importe);
  const acumulado = montos();
  for (const c of [...ciclos].reverse()) {
    c.pagado = montos();
    c.pendiente = montos();
    c.paraSaldar = montos();
    for (const m of MONEDAS) {
      c.pagado[m] = Math.min(c.total[m], restante[m]);
      c.pendiente[m] = redondear(c.total[m] - c.pagado[m]);
      restante[m] = redondear(restante[m] - c.pagado[m]);
      acumulado[m] = redondear(acumulado[m] + c.pendiente[m]);
      c.paraSaldar[m] = acumulado[m];
    }
  }
  return ciclos;
}

// Cifras de una tarjeta por moneda; sin corte ni pago solo se conoce la deuda (ciclos = null).
// La línea de crédito es en soles: la deuda en dólares la usa al tipo de cambio de venta del banco.
function resumenTarjeta(t) {
  const deuda = deudaDeTarjeta(t);
  const usada = Math.max(deuda.PEN, 0) + Math.max(deuda.USD, 0) * (tasaPara(t.banco, hoyISO(), 'venta') || 0);
  const base = { deuda, disponible: t.linea ? redondear(t.linea - usada) : null, ciclos: null };
  if (!configurada(t)) return base;
  const ciclos = ciclosTarjeta(t);
  // A pagar: lo que falta de los ciclos ya cerrados
  const pendientes = ciclos.filter((c) => c.cerrado && !sinMonto(c.pendiente));
  const aPagar = montos();
  for (const c of pendientes) for (const m of MONEDAS) aPagar[m] = redondear(aPagar[m] + c.pendiente[m]);
  return { ...base, ciclos, aPagar, proximo: pendientes[pendientes.length - 1] || null, actual: ciclos.find((c) => c.actual) };
}

function estadoCiclo(c) {
  if (!sinMonto(c.total) && sinMonto(c.pendiente)) return ['Pagado', 'ok'];
  if (!c.cerrado) return c.actual ? ['En curso', ''] : ['Por facturar', ''];
  if (sinMonto(c.total)) return ['Sin consumos', ''];
  const parcial = sinMonto(c.pagado) ? '' : ' (pago parcial)';
  if (c.vence < hoyISO()) return ['Vencido' + parcial, 'mal'];
  return ['Por pagar' + parcial, 'pendiente'];
}

function textoDias(n) {
  return n === 0 ? 'hoy' : n === 1 ? 'mañana' : `en ${n} días`;
}

// [texto, clase] del próximo vencimiento pendiente
function textoVencimiento(proximo) {
  if (!proximo) return ['Estás al día', 'ok'];
  const dias = diasHasta(proximo.vence);
  return dias < 0
    ? [`Venció el ${formatearFecha(proximo.vence)}`, 'mal']
    : [`Vence el ${formatearFecha(proximo.vence)} · ${textoDias(dias)}`, ''];
}

function textoCortePago(t) {
  return configurada(t) ? `Corte el ${t.corte} · ${textoPago(t)}` : 'Sin configurar';
}

function mensajeTarjeta(texto) {
  $('tar-msg').textContent = texto;
  $('tar-msg').classList.toggle('hidden', !texto);
}

// Tras crear, editar o eliminar tarjetas: guarda y refresca todo lo que depende de ellas
function tarjetasCambiadas() {
  guardarTarjetas();
  poblarMedios();
  render();
  renderTarjeta();
}

function editarTarjeta(id) {
  const t = tarjetaDe(id);
  if (!t) return;
  tarEditandoId = id;
  $('tar-nombre').value = t.nombre;
  $('tar-banco').value = t.banco;
  $('tar-corte').value = t.corte ?? '';
  $('tar-modo-pago').value = t.plazo ? 'plazo' : 'dia';
  $('tar-pago').value = t.plazo ?? t.pago ?? '';
  pintarModoPago();
  $('tar-linea').value = t.linea || '';
  $('tar-form-titulo').textContent = 'Editar tarjeta';
  $('tar-guardar').textContent = 'Guardar cambios';
  $('tar-cancelar').classList.remove('hidden');
  abrirHoja('tarjeta');
  $('tar-form').scrollIntoView({ behavior: desplazamiento(), block: 'center' });
  $('tar-nombre').focus();
  renderTarjeta();
}

function salirEdicionTarjeta() {
  tarEditandoId = null;
  $('tar-form').reset();
  pintarModoPago();
  $('tar-form-titulo').textContent = 'Nueva tarjeta';
  $('tar-guardar').textContent = 'Añadir tarjeta';
  $('tar-cancelar').classList.add('hidden');
}

// Los gastos de la tarjeta no se borran: pasan a «Otra tarjeta de crédito», que cuenta como
// dinero que sale al comprar; por eso sus pagos se eliminan (si no, se restarían dos veces)
function eliminarTarjeta(id) {
  const t = tarjetaDe(id);
  if (!t) return;
  let n = 0;
  for (const g of gastos) if (g.medio === id) { g.medio = MEDIO_OTRO; n++; }
  pagos = pagos.filter((p) => p.tarjeta !== id);
  saldos = saldos.filter((s) => s.tarjeta !== id);
  guardarSaldos();
  tarjetas = tarjetas.filter((x) => x.id !== id);
  if (tarEditandoId === id) salirEdicionTarjeta();
  if (tarSeleccion === id) tarSeleccion = null;
  guardar();
  guardarPagos();
  tarjetasCambiadas();
  mensajeTarjeta(`Tarjeta ${t.nombre} eliminada.` + (n ? ` Sus gastos pasaron a «${MEDIOS_FIJOS[MEDIO_OTRO]}».` : ''));
}

function pagosCambiados() {
  guardarPagos();
  renderTarjeta();
}

// Prepara el formulario de pago con lo pendiente de un ciclo
// Prepara el formulario de pago con lo que falta para dejar un ciclo al día ({ PEN, USD })
function prepararPago(sugerido) {
  pagoSugerido = sugerido;
  $('pago-moneda').value = sugerido.PEN > 0 ? 'PEN' : 'USD';
  $('pago-con').value = 'PEN';
  $('pago-tc').value = '';
  $('pago-fecha').value = hoyISO();
  actualizarFormPago(true);
  $('pago-form').closest('details').open = true;
  $('pago-form').scrollIntoView({ behavior: desplazamiento(), block: 'center' });
  $('pago-importe').focus();
}

// Ajusta el formulario de pago a la moneda de la deuda y a con qué se paga; con `rellenar`,
// propone el monto sugerido por «Pagar» (convertido a soles si la deuda es en dólares)
function actualizarFormPago(rellenar = false) {
  const t = tarjetaDe(tarSeleccion);
  const usd = $('pago-moneda').value === 'USD';
  if (!usd) $('pago-con').value = 'PEN';
  const conSoles = $('pago-con').value === 'PEN';
  const convertir = usd && conSoles;
  $('pago-con-campo').classList.toggle('hidden', !usd);
  $('pago-tc-campo').classList.toggle('hidden', !convertir);
  $('pago-tc').required = convertir;
  $('pago-importe-label').textContent = `Monto pagado (${conSoles ? 'S/' : 'US$'})`;
  if (convertir && !$('pago-tc').value && t) {
    const tc = tasaPara(t.banco, $('pago-fecha').value || hoyISO(), 'venta');
    if (tc) $('pago-tc').value = formatoTC(tc);
  }
  const tc = Number($('pago-tc').value);
  if (rellenar && pagoSugerido) {
    const debe = pagoSugerido[usd ? 'USD' : 'PEN'];
    $('pago-importe').value = !debe ? '' : convertir ? (tc ? redondear(debe * tc).toFixed(2) : '') : debe.toFixed(2);
  }
  const pagado = Number($('pago-importe').value);
  $('pago-preview').textContent = convertir && pagado > 0 && tc > 0
    ? `Abona ${dinero(redondear(pagado / tc), 'USD')} a tu deuda en dólares.`
    : '';
}

function renderTiposCambio() {
  const tbody = $('tc-filas');
  tbody.replaceChildren();
  for (const fuente of ['bcp', 'interbank', 'bcrp']) {
    const ultimo = tiposCambio[fuente].at(-1);
    const tr = document.createElement('tr');
    celda(tr, 'Fuente', fuente === 'bcrp' ? 'BCRP (oficial, automático)' : BANCOS[fuente]);
    celda(tr, 'Compra', ultimo ? formatoTC(ultimo.compra) : '—', 'num');
    celda(tr, 'Venta', ultimo ? formatoTC(ultimo.venta) : '—', 'num');
    const fecha = document.createElement('span');
    if (!ultimo) {
      fecha.className = 'estado';
      fecha.textContent = fuente === 'bcrp' ? 'Aún sin datos' : 'Sin registrar';
    } else {
      // El de los bancos lo registra el usuario: se avisa si tiene más de un día
      const dias = -diasHasta(ultimo.fecha);
      const viejo = fuente !== 'bcrp' && dias > 1;
      fecha.className = 'estado' + (viejo ? ' mal' : '');
      fecha.textContent = formatearFecha(ultimo.fecha) + (viejo ? ` · hace ${dias} días` : '');
    }
    celda(tr, 'Fecha', fecha);
    const acciones = celda(tr, '', '', 'acciones');
    if (WEB_BANCOS[fuente]) {
      const a = document.createElement('a');
      a.href = WEB_BANCOS[fuente];
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.className = 'enlace';
      a.textContent = 'Ver en su web';
      acciones.append(a);
    }
    tbody.append(tr);
  }
  $('tc-estado').textContent = estadoTC;
}

function renderTarjeta() {
  renderTiposCambio();
  // Lista de tarjetas
  const tbody = $('tar-lista');
  tbody.replaceChildren();
  for (const t of tarjetas) {
    const r = resumenTarjeta(t);
    const tr = document.createElement('tr');
    if (t.id === tarEditandoId) tr.classList.add('editando');
    celda(tr, 'Tarjeta', etiquetaTarjeta(t));
    celda(tr, 'Corte / pago', configurada(t) ? `Corte ${t.corte} · ${textoPago(t)}` : 'Sin configurar', 'pago');
    celda(tr, 'A pagar', r.ciclos ? textoMontos(r.aPagar) : '—', 'num');
    const [venceTexto, venceClase] = r.ciclos ? textoVencimiento(r.proximo) : ['—', ''];
    const vence = document.createElement('span');
    vence.className = 'estado ' + venceClase;
    vence.textContent = venceTexto;
    celda(tr, 'Próximo vencimiento', vence);
    celda(tr, 'Deuda', textoDeuda(r.deuda), 'num');
    celda(tr, 'Disponible', r.disponible !== null ? soles.format(r.disponible) : '—', 'num');

    const acciones = celda(tr, '', '', 'acciones');
    acciones.appendChild(boton('Ciclos', `Ver ciclos y pagos de ${t.nombre}`, () => {
      tarSeleccion = t.id;
      renderTarjeta();
      $('tar-detalle').scrollIntoView({ behavior: desplazamiento(), block: 'start' });
    }));
    acciones.appendChild(boton('Editar', `Editar ${t.nombre}`, () => editarTarjeta(t.id)));
    acciones.appendChild(botonEliminar(`Eliminar ${t.nombre}`, () => eliminarTarjeta(t.id)));
    tbody.appendChild(tr);
  }
  $('tabla-tarjetas').classList.toggle('hidden', !tarjetas.length);
  $('tar-vacio').classList.toggle('hidden', tarjetas.length > 0);
  $('tar-detalle').classList.toggle('hidden', !tarjetas.length);
  if (!tarjetas.length) return;

  // Detalle de la tarjeta seleccionada
  const t = tarjetaDe(tarSeleccion) || tarjetas[0];
  tarSeleccion = t.id;
  const sel = $('tar-sel');
  sel.replaceChildren(...tarjetas.map((x) => new Option(x.nombre, x.id)));
  sel.value = t.id;
  sel.classList.toggle('hidden', tarjetas.length < 2);
  actualizarFormPago();
  $('tar-det-titulo').textContent = t.nombre;
  $('tar-det-sub').textContent = textoCortePago(t) + (t.linea ? ` · línea de ${soles.format(t.linea)}` : '');

  // Pagos (también en tarjetas sin configurar)
  const lista = pagosDe(t).sort((x, y) => (x.fecha < y.fecha ? 1 : x.fecha > y.fecha ? -1 : 0));
  const tPagos = $('tar-pagos');
  tPagos.replaceChildren();
  for (const p of lista) {
    const tr = document.createElement('tr');
    celda(tr, 'Fecha', formatearFecha(p.fecha), 'fecha');
    celda(tr, 'Pagaste', dinero(p.pagado, p.pagadoMoneda), 'num');
    celda(tr, 'Abono a la deuda', dinero(p.importe, p.moneda) + (p.tipoCambio ? ` · TC ${formatoTC(p.tipoCambio)}` : ''), 'num');
    const acciones = celda(tr, '', '', 'acciones');
    acciones.appendChild(botonEliminar('Eliminar pago', () => {
      pagos = pagos.filter((x) => x.id !== p.id);
      pagosCambiados();
    }));
    tPagos.appendChild(tr);
  }
  $('tabla-pagos').classList.toggle('hidden', !lista.length);
  $('pagos-vacio').classList.toggle('hidden', lista.length > 0);

  renderSaldos(t);
  const r = resumenTarjeta(t);
  renderProximosPagos(r);
  $('tar-aviso').classList.toggle('hidden', !!r.ciclos);
  $('tar-ciclos-card').classList.toggle('hidden', !r.ciclos);
  if (!r.ciclos) return;

  const ciclos = $('tar-ciclos');
  ciclos.replaceChildren();
  for (const c of r.ciclos) {
    const tr = document.createElement('tr');
    celda(tr, 'Periodo', `${fechaCorta(c.desde)} – ${formatearFecha(c.hasta)}`, 'fecha');
    celda(tr, 'Vencimiento', formatearFecha(c.vence), 'fecha');
    celda(tr, 'Consumos', String(c.consumos), 'num');
    celda(tr, 'Total', textoMontos(c.total), 'num');
    celda(tr, 'Pendiente', textoMontos(c.pendiente), 'num');
    const [texto, clase] = estadoCiclo(c);
    const estado = document.createElement('span');
    estado.className = 'estado ' + clase;
    estado.textContent = texto;
    celda(tr, 'Estado', estado);
    const acciones = celda(tr, '', '', 'acciones');
    if (!sinMonto(c.pendiente)) {
      const anteriores = MONEDAS.some((m) => c.paraSaldar[m] > c.pendiente[m]);
      const titulo = `Registrar un pago de ${textoMontos(c.paraSaldar)}` + (anteriores ? ' (este ciclo y los anteriores pendientes)' : '');
      acciones.appendChild(boton('Pagar', titulo, () => prepararPago(c.paraSaldar)));
    }
    const clave = `${t.id}|${c.hasta}`;
    const abierto = ciclosAbiertos.has(clave);
    if (c.lista.length) {
      acciones.prepend(boton(abierto ? 'Ocultar' : 'Ver', `Ver lo que suma el ciclo que vence el ${formatearFecha(c.vence)}`, () => {
        if (abierto) ciclosAbiertos.delete(clave);
        else ciclosAbiertos.add(clave);
        renderTarjeta();
      }));
    }
    ciclos.appendChild(tr);
    if (abierto && c.lista.length) ciclos.appendChild(filaDetalleCiclo(c, t));
  }
}

// Deuda anterior: se elige la fecha de pago entre los ciclos cercanos de la tarjeta
// ---- Detalle de un ciclo: todo lo que suma, con su forma de corregirlo ----
const ciclosAbiertos = new Set();

function filaDetalleCiclo(c, t) {
  const tr = document.createElement('tr');
  tr.className = 'ciclo-detalle';
  const td = document.createElement('td');
  td.colSpan = 7;
  const orden = [...c.lista].sort((a, b) => (a.esSaldo === b.esSaldo ? (a.fecha < b.fecha ? 1 : -1) : a.esSaldo ? -1 : 1));
  td.append(...orden.map((x) => {
    const fila = document.createElement('div');
    fila.className = 'ciclo-item';
    const texto = document.createElement('div');
    const titulo = document.createElement('strong');
    titulo.textContent = x.esSaldo ? 'Deuda anterior' : x.descripcion;
    const sub = document.createElement('span');
    sub.className = 'sub';
    sub.textContent = x.esSaldo ? '' : `${formatearFecha(x.fecha)} · ${x.categoria}`;
    texto.append(titulo, sub);
    const monto = document.createElement('span');
    monto.className = 'num';
    monto.textContent = dinero(x.importe, x.moneda);
    const acciones = document.createElement('div');
    acciones.className = 'acciones';
    acciones.append(
      boton('Editar', x.esSaldo ? 'Editar deuda anterior' : `Editar ${x.descripcion}`, () => {
        if (!x.esSaldo) return editarCompraDeCiclo(x.id);
        const grupo = gruposSaldos(t).find((g) => g.some((s) => s.id === x.id));
        if (grupo) editarSaldo(grupo);
      }),
      botonEliminar(x.esSaldo ? 'Eliminar deuda anterior' : `Eliminar ${x.descripcion}`, () => {
        if (x.esSaldo) {
          saldos = saldos.filter((s) => s.id !== x.id);
          if (salEditandoIds.includes(x.id)) salirEdicionSaldo();
          saldosCambiados();
        } else {
          eliminar(x.id);
          renderTarjeta();
        }
      }),
    );
    fila.append(texto, monto, acciones);
    return fila;
  }));
  tr.append(td);
  return tr;
}

// Las compras se editan en Gastos: se va allí (avisando si hay algo sin guardar) y se abre el formulario
async function editarCompraDeCiclo(id) {
  if (!(await confirmarSalida($('vista-tarjeta'), 'Si vas a Gastos, se perderá lo que escribiste.'))) return;
  addEventListener('hashchange', () => editar(id), { once: true });
  location.hash = 'gastos';
}

let salEditandoIds = [];

// Pagos iguales en ciclos seguidos (las cuotas) se muestran y corrigen como un solo registro
function gruposSaldos(t) {
  const clave = (s) => `${s.moneda}|${s.importe}`;
  const orden = [...saldosDe(t)].sort((x, y) => (clave(x) < clave(y) ? -1 : clave(x) > clave(y) ? 1 : x.fecha < y.fecha ? -1 : 1));
  const grupos = [];
  for (const s of orden) {
    const ultimo = grupos.at(-1)?.at(-1);
    if (ultimo && clave(ultimo) === clave(s) && indiceCiclo(s.fecha, t.corte) === indiceCiclo(ultimo.fecha, t.corte) + 1) grupos.at(-1).push(s);
    else grupos.push([s]);
  }
  return grupos.sort((x, y) => (x[0].fecha < y[0].fecha ? -1 : x[0].fecha > y[0].fecha ? 1 : 0));
}

function editarSaldo(grupo) {
  salEditandoIds = grupo.map((s) => s.id);
  $('sal-importe').value = grupo[0].importe;
  $('sal-moneda').value = grupo[0].moneda;
  $('sal-cuotas').value = grupo.length;
  $('sal-vence').value = grupo[0].fecha;
  $('sal-guardar').textContent = 'Guardar cambios';
  $('sal-cancelar').classList.remove('hidden');
  renderSaldos(tarjetaDe(grupo[0].tarjeta));
  $('sal-form').closest('details').open = true;
  $('sal-form').scrollIntoView({ behavior: desplazamiento(), block: 'center' });
  $('sal-importe').focus();
}

function salirEdicionSaldo() {
  salEditandoIds = [];
  sucios.delete('sal-form');
  delete basesForm['sal-form'];
  $('sal-importe').value = '';
  $('sal-cuotas').value = '1';
  $('sal-guardar').textContent = 'Añadir deuda anterior';
  $('sal-cancelar').classList.add('hidden');
}

function renderSaldos(t) {
  const lista = saldosDe(t);
  // Se elige la tarjeta aquí mismo; las fechas salen del corte y el pago de la elegida
  $('sal-tarjeta').replaceChildren(...tarjetas.map((x) => new Option(x.nombre, x.id)));
  $('sal-tarjeta').value = t.id;
  $('sal-aviso').classList.toggle('hidden', configurada(t));
  $('sal-form').classList.toggle('hidden', !configurada(t));
  if (!configurada(t)) {
    $('sal-lista').replaceChildren();
    $('tabla-saldos').classList.add('hidden');
    $('sal-vacio').classList.add('hidden');
    return;
  }
  const actual = indiceCiclo(hoyISO(), t.corte);
  const ciclos = [];
  for (let n = actual - 2; n <= actual + 11; n++) ciclos.push(cicloDe(n, t));
  const sel = $('sal-vence');
  const previo = sel.dataset.tarjeta === t.id ? sel.value : '';
  sel.replaceChildren(...ciclos.map((c) => new Option(formatearFecha(c.vence), c.hasta)));
  // Una fecha ya registrada puede quedar fuera de los ciclos cercanos: también se puede elegir
  const editando = saldos.find((x) => x.id === salEditandoIds[0]);
  if (editando && !ciclos.some((c) => c.hasta === editando.fecha)) sel.add(new Option(formatearFecha(venceSaldo(editando)), editando.fecha));
  sel.dataset.tarjeta = t.id;
  sel.value = previo || (ciclos.find((c) => c.vence >= hoyISO()) || ciclos[0]).hasta;
  const tbody = $('sal-lista');
  tbody.replaceChildren();
  for (const grupo of gruposSaldos(t)) {
    const [s] = grupo;
    const n = grupo.length;
    const tr = document.createElement('tr');
    if (salEditandoIds.includes(s.id)) tr.classList.add('editando');
    celda(tr, 'Se paga hasta', n > 1 ? `${formatearFecha(venceSaldo(s))} – ${formatearFecha(venceSaldo(grupo[n - 1]))} · ${n} pagos` : formatearFecha(venceSaldo(s)), 'fecha');
    celda(tr, 'Monto', dinero(s.importe, s.moneda) + (n > 1 ? ' c/u' : ''), 'num');
    const acciones = celda(tr, '', '', 'acciones');
    const ids = grupo.map((x) => x.id);
    acciones.append(boton('Editar', 'Editar deuda anterior', () => editarSaldo(grupo)), botonEliminar('Eliminar deuda anterior', () => {
      saldos = saldos.filter((x) => !ids.includes(x.id));
      if (salEditandoIds.some((id) => ids.includes(id))) salirEdicionSaldo();
      saldosCambiados();
    }));
    tbody.appendChild(tr);
  }
  $('tabla-saldos').classList.toggle('hidden', !lista.length);
  const compras = gastos.filter((g) => g.medio === t.id).length;
  $('sal-vacio').classList.toggle('hidden', lista.length > 0);
  $('sal-vacio').textContent = compras ? 'Sin deuda anterior. Sus compras se corrigen en Ciclos.' : 'Sin deuda anterior.';
}

// Todo lo pendiente de la tarjeta por fecha de pago, de la más cercana a la más lejana
function renderProximosPagos(r) {
  const pendientes = (r.ciclos || []).filter((c) => !sinMonto(c.pendiente)).reverse();
  $('tar-proximos').classList.toggle('hidden', !pendientes.length);
  const lista = $('tar-proximos-lista');
  lista.replaceChildren();
  for (const c of pendientes) filaCuadre(lista, formatearFecha(c.vence), estadoCiclo(c)[0], textoMontos(c.pendiente));
  if (pendientes.length > 1) filaCuadre(lista, 'Deuda total', '', textoMontos(totalPendiente(pendientes)), true);
}

function totalPendiente(pendientes) {
  const total = montos();
  for (const c of pendientes) for (const m of MONEDAS) total[m] = redondear(total[m] + c.pendiente[m]);
  return total;
}

function saldosCambiados() {
  guardarSaldos();
  render();
  renderVista();
}
