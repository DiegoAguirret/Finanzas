// Ingresos y balance
'use strict';

// ---- Ingresos y balance ----
// Cada ingreso: { id, descripcion, importe, fecha }. El balance se calcula sobre un rango de fechas:
//   ahorro            = ingresos − todos los gastos (también los hechos con tarjeta)
//   cambio de dinero  = ingresos − gastos que no son con tarjeta − pagos de tarjeta
// La diferencia entre ambos es lo que subió o bajó la deuda de tarjetas en el periodo.
let ingEditandoId = null;

function ingresoValido(i) {
  if (!i || typeof i !== 'object') return null;
  const descripcion = typeof i.descripcion === 'string' ? i.descripcion.trim().slice(0, 100) : '';
  const importe = redondear(Number(i.importe));
  if (!descripcion || !(importe > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(i.fecha)) return null;
  return {
    id: typeof i.id === 'string' && i.id ? i.id : nuevoId(),
    descripcion,
    importe,
    moneda: i.moneda === 'USD' ? 'USD' : 'PEN',
    fecha: i.fecha,
  };
}

function cargarIngresos() {
  try {
    const datos = JSON.parse(localStorage.getItem(CLAVE_INGRESOS));
    ingresos = Array.isArray(datos) ? datos.map(ingresoValido).filter(Boolean) : [];
  } catch {
    ingresos = [];
  }
}

function guardarIngresos() {
  escribirJSON(CLAVE_INGRESOS, ingresos);
  programarSync();
}

// Registros (gastos, ingresos o pagos) con fecha entre desde y hasta, ambos incluidos
function entre(lista, desde, hasta) {
  return lista.filter((x) => x.fecha >= desde && x.fecha <= hasta);
}

// 'Octubre de 2026'
function nombreMes(mes) {
  const [a, m] = mes.split('-').map(Number);
  const t = new Date(a, m - 1, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// Meses con algún movimiento más el actual, del más reciente al más antiguo
function mesesBalance() {
  const meses = new Set([hoyISO().slice(0, 7)]);
  for (const lista of [gastos, ingresos, pagos]) for (const x of lista) meses.add(x.fecha.slice(0, 7));
  for (const g of gastos) meses.add(fechaDeCuenta(g).slice(0, 7));
  for (const x of saldosDeCuenta('0000-01-01', '9999-12-31')) meses.add(x.fecha.slice(0, 7));
  return [...meses].sort().reverse();
}

// Rango del periodo elegido en la vista
function rangoBalance() {
  const hoy = hoyISO();
  const [a, m] = hoy.split('-').map(Number);
  const p = $('bal-periodo').value;
  if (p === 'mes-ant') return { desde: isoDia(new Date(a, m - 2, 1)), hasta: isoDia(new Date(a, m - 1, 0)) };
  if (p === '30d') return { desde: sumarDias(hoy, -29), hasta: hoy };
  if (p === 'anio') return { desde: `${a}-01-01`, hasta: `${a}-12-31` };
  if (p === 'rango') {
    const d = $('bal-desde').value || hoy.slice(0, 8) + '01';
    const h = $('bal-hasta').value || hoy;
    return d <= h ? { desde: d, hasta: h } : { desde: h, hasta: d };
  }
  return { desde: hoy.slice(0, 8) + '01', hasta: isoDia(new Date(a, m, 0)) };
}

// Cifras en soles (los dólares, con el tipo de cambio de su fecha) y el cambio real de tu dinero
// y de tu deuda de tarjetas en cada moneda
function gastosDeCuenta(desde, hasta) {
  return gastos.filter((g) => {
    const f = fechaDeCuenta(g);
    return f >= desde && f <= hasta;
  });
}

function cifrasPeriodo(desde, hasta) {
  const gas = gastosDeCuenta(desde, hasta).concat(saldosDeCuenta(desde, hasta));
  // La deuda sube el día de la compra, sea cual sea el criterio del ahorro
  const comprasTarjeta = entre(gastos, desde, hasta).filter((g) => tarjetaDe(g.medio));
  const ing = entre(ingresos, desde, hasta);
  const pag = entre(pagos, desde, hasta);
  const abo = entre(abonos, desde, hasta);
  const conT = gas.filter((g) => tarjetaDe(g.medio));
  const sinT = gas.filter((g) => !tarjetaDe(g.medio));
  const en = (lista, m) => lista.reduce((s, x) => s + (x.moneda === m ? x.importe : 0), 0);
  const pagadoEn = (m) => pag.reduce((s, x) => s + (x.pagadoMoneda === m ? x.pagado : 0), 0);
  const c = {
    ingresos: redondear(sumar(ing)),
    gastos: redondear(sumar(gas)),
    conTarjeta: redondear(sumar(conT)),
    porVencer: redondear(sumar(comprasTarjeta.filter((g) => fechaDeCuenta(g) > hasta))),
    sinTarjeta: redondear(sumar(sinT)),
    pagos: redondear(pag.reduce((s, x) => s + pagoEnSoles(x), 0)),
    abonos: redondear(abo.reduce((s, x) => s + abonoEnSoles(x), 0)),
    dineroPor: montos(),
    deudaPor: montos(),
    hayDolares: [...gas, ...ing].some((x) => x.moneda === 'USD') || pag.some((x) => x.moneda === 'USD' || x.pagadoMoneda === 'USD') ||
      abo.some((x) => deudaDe(x.deuda)?.moneda === 'USD'),
  };
  for (const m of MONEDAS) {
    const abonadoEn = abo.reduce((s, x) => s + (deudaDe(x.deuda)?.moneda === m ? x.importe : 0), 0);
    c.dineroPor[m] = redondear(en(ing, m) - en(sinT, m) - pagadoEn(m) - abonadoEn);
    c.deudaPor[m] = redondear(en(comprasTarjeta, m) - en(pag, m)); // compras con tarjeta − abonos
  }
  c.ahorro = redondear(c.ingresos - c.gastos);
  c.dinero = redondear(c.ingresos - c.sinTarjeta - c.pagos - c.abonos);
  return c;
}

// Deuda de todas las tarjetas al cierre de la fecha, por moneda: compras − abonos (negativa = a favor)
function deudaAl(fecha) {
  const d = montos();
  for (const g of gastos) if (g.fecha <= fecha && tarjetaDe(g.medio)) d[g.moneda] += g.importe;
  for (const s of saldos) d[s.moneda] += s.importe;
  for (const x of pagos) if (x.fecha <= fecha) d[x.moneda] -= x.importe;
  return { PEN: redondear(d.PEN), USD: redondear(d.USD) };
}

function editarIngreso(id) {
  const i = ingresos.find((x) => x.id === id);
  if (!i) return;
  ingEditandoId = id;
  $('ing-descripcion').value = i.descripcion;
  $('ing-importe').value = i.importe;
  $('ing-moneda').value = i.moneda;
  $('ing-fecha').value = i.fecha;
  $('ing-form-titulo').textContent = 'Editar ingreso';
  $('ing-guardar').textContent = 'Guardar cambios';
  $('ing-cancelar').classList.remove('hidden');
  abrirHoja('ingresos');
  $('ing-form').scrollIntoView({ behavior: desplazamiento(), block: 'center' });
  $('ing-importe').focus();
  renderBalance();
}

function salirEdicionIngreso() {
  ingEditandoId = null;
  $('ing-form').reset();
  $('ing-fecha').value = hoyISO();
  $('ing-form-titulo').textContent = 'Nuevo ingreso';
  $('ing-guardar').textContent = 'Añadir ingreso';
  $('ing-cancelar').classList.add('hidden');
}

function mensajeBalance(texto) {
  $('bal-msg').textContent = texto;
  $('bal-msg').classList.toggle('hidden', !texto);
}

function ingresosCambiados() {
  guardarIngresos();
  render();
  renderBalance();
}

function eliminarIngreso(id) {
  ingresos = ingresos.filter((x) => x.id !== id);
  if (ingEditandoId === id) salirEdicionIngreso();
  ingresosCambiados();
}

// Monto con signo, en verde si suma y en rojo si resta (solo cuando se pide color)
function montoConSigno(n, colorear, moneda = 'PEN') {
  const s = document.createElement('span');
  s.className = 'estado' + (colorear && n ? (n > 0 ? ' ok' : ' mal') : '');
  s.textContent = conSigno(n, moneda);
  return s;
}

function filaCuadre(cont, texto, detalle, monto, total = false) {
  const etiqueta = document.createElement('div');
  etiqueta.textContent = texto;
  if (detalle) {
    const d = document.createElement('span');
    d.className = 'detalle';
    d.textContent = detalle;
    etiqueta.append(d);
  }
  const valor = document.createElement('div');
  valor.className = 'monto';
  if (monto instanceof Node) valor.append(monto);
  else valor.textContent = monto;
  if (total) {
    etiqueta.classList.add('total');
    valor.classList.add('total');
  }
  cont.append(etiqueta, valor);
}

function renderBalance() {
  const hoy = hoyISO();
  const { desde, hasta } = rangoBalance();
  const c = cifrasPeriodo(desde, hasta);
  const ingPeriodo = entre(ingresos, desde, hasta);
  const gasPeriodo = gastosDeCuenta(desde, hasta);
  const pagPeriodo = entre(pagos, desde, hasta);
  const pct = (n) => Math.round((n / c.ingresos) * 100) + ' %';

  // Tarjetas de resumen
  $('bal-ingresos').textContent = soles.format(c.ingresos);

  $('bal-gastos').textContent = soles.format(c.gastos);
  $('bal-gastos-sub').textContent = c.porVencer ? `${soles.format(c.porVencer)} se pagan después` : '';

  // Días que quedan del periodo contando hoy (0 si el periodo ya terminó o no ha empezado)
  const quedan = hoy >= desde && hoy <= hasta ? diasHasta(hasta) + 1 : 0;
  const res = $('bal-res'), resSub = $('bal-res-sub');
  res.textContent = soles.format(c.ahorro);
  res.className = 'valor' + (c.ingresos ? (c.ahorro >= 0 ? ' ok' : ' mal') : '');
  resSub.className = 'sub';
  if (!c.ingresos) {
    $('bal-res-label').textContent = 'Ahorro';
    resSub.textContent = '';
  } else if (c.ahorro >= 0) {
    $('bal-res-label').textContent = quedan ? 'Te queda' : 'Ahorraste';
    resSub.textContent = quedan > 1
      ? `≈ ${soles.format(c.ahorro / quedan)} por día hasta el ${fechaCorta(hasta)}`
      : `El ${pct(c.ahorro)} de tus ingresos`;
  } else {
    $('bal-res-label').textContent = quedan ? 'Vas en pérdida' : 'Pérdida';
    resSub.className = 'sub mal';
    resSub.textContent = '';
  }


  // Lo que viene de antes: un mes nuevo no empieza de cero
  const antes = redondear(ajustes.saldoInicial + cifrasPeriodo('0000-01-01', sumarDias(desde, -1)).ahorro);
  const acumulado = redondear(antes + c.ahorro);
  $('bal-acum').textContent = soles.format(acumulado);
  $('bal-acum').className = 'valor' + (acumulado ? (acumulado > 0 ? ' ok' : ' mal') : '');
  $('bal-acum-sub').textContent = `Antes: ${soles.format(antes)}`;

  // Cuadre: del cambio en tu dinero al ahorro, pasando por la deuda de tarjetas
  $('bal-rango').textContent = `Del ${formatearFecha(desde)} al ${formatearFecha(hasta)}` +
    (c.hayDolares ? ' · dólares convertidos a soles' : '');
  const cuadre = $('bal-cuadre'), cuadre2 = $('bal-cuadre-2');
  cuadre.replaceChildren();
  cuadre2.replaceChildren();
  const hayTarjetas = tarjetas.length > 0 || c.pagos > 0;
  filaCuadre(cuadre, 'Ingresos', '', conSigno(c.ingresos));
  filaCuadre(cuadre, 'Gastos pagados al momento', hayTarjetas ? 'Efectivo o débito' : '', conSigno(-c.sinTarjeta));
  if (hayTarjetas) filaCuadre(cuadre, 'Pagos de tarjetas', '', conSigno(-c.pagos));
  if (c.abonos) filaCuadre(cuadre, 'Pagos a otras deudas', '', conSigno(-c.abonos));
  filaCuadre(cuadre, 'Cambio en tu dinero', '', montoConSigno(c.dinero, true), true);
  if (hayTarjetas) {
    filaCuadre(cuadre2, 'Cambio en tu dinero', '', conSigno(c.dinero));
    filaCuadre(cuadre2, ajustes.compras === 'vence' ? 'Compras que vencen en el periodo' : 'Compras con tus tarjetas',
      ajustes.compras === 'vence' ? 'Las hiciste antes o en el periodo' : 'Suben tu deuda', conSigno(-c.conTarjeta));
    filaCuadre(cuadre2, 'Pagos de tarjetas', 'Bajan tu deuda; no son gasto', conSigno(c.pagos));
    if (c.abonos) filaCuadre(cuadre2, 'Pagos a otras deudas', 'No son gasto', conSigno(c.abonos));
  } else {
    filaCuadre(cuadre2, 'Ingresos', '', conSigno(c.ingresos));
    filaCuadre(cuadre2, 'Gastos', '', conSigno(-c.gastos));
  }
  filaCuadre(cuadre2, 'Ahorro del periodo', '', montoConSigno(c.ahorro, true), true);
  filaCuadre(cuadre2, 'Venía de antes', '', conSigno(antes));
  filaCuadre(cuadre2, 'Saldo acumulado', '', montoConSigno(acumulado, true), true);
  if (hayTarjetas) {
    const cambios = MONEDAS.filter((m) => c.deudaPor[m])
      .map((m) => `${c.deudaPor[m] > 0 ? 'subió' : 'bajó'} ${dinero(Math.abs(c.deudaPor[m]), m)}`);
    const texto = cambios.length ? cambios.join(' · ') + ' en el periodo' : 'sin cambios en el periodo';
    filaCuadre(cuadre2, `Deuda de tarjetas al ${formatearFecha(hasta)}`,
      texto.charAt(0).toUpperCase() + texto.slice(1), textoDeuda(deudaAl(hasta)));
  }

  // Movimientos del periodo: ingresos, gastos y pagos de tarjeta juntos
  const movs = [
    ...ingPeriodo.map((i) => ({
      fecha: i.fecha, descripcion: i.descripcion, tipo: 'Ingreso', importe: i.importe, moneda: i.moneda, ingreso: i,
    })),
    ...gasPeriodo.map((g) => ({
      fecha: fechaDeCuenta(g),
      descripcion: g.descripcion + (fechaDeCuenta(g) !== g.fecha ? ` (compra del ${fechaCorta(g.fecha)})` : ''),
      tipo: 'Gasto · ' + nombreMedio(g.medio), importe: g.importe, moneda: g.moneda,
    })),
    ...saldos.filter(() => ajustes.compras === 'vence').map((s) => ({ s, fecha: venceSaldo(s) }))
      .filter(({ fecha }) => fecha >= desde && fecha <= hasta).map(({ s, fecha }) => ({
        fecha, descripcion: 'Deuda anterior de ' + tarjetaDe(s.tarjeta).nombre, tipo: 'Deuda anterior', importe: s.importe, moneda: s.moneda,
      })),
    ...pagPeriodo.map((x) => ({
      fecha: x.fecha,
      descripcion: 'Pago a ' + tarjetaDe(x.tarjeta).nombre + (x.moneda !== x.pagadoMoneda ? ` (tu deuda baja ${dinero(x.importe, x.moneda)})` : ''),
      tipo: x.moneda === 'USD' ? 'Pago de tarjeta · deuda en dólares' : 'Pago de tarjeta',
      importe: x.pagado, moneda: x.pagadoMoneda,
    })),
    ...entre(abonos, desde, hasta).map((x) => {
      const d = deudaDe(x.deuda);
      return { fecha: x.fecha, descripcion: 'Pago a ' + d.nombre, tipo: 'Pago de deuda', importe: x.importe, moneda: d.moneda };
    }),
  ].sort((x, y) => (x.fecha < y.fecha ? 1 : x.fecha > y.fecha ? -1 : 0));
  const tbody = $('bal-movs');
  tbody.replaceChildren();
  for (const mov of movs) {
    const tr = document.createElement('tr');
    if (mov.ingreso && mov.ingreso.id === ingEditandoId) tr.classList.add('editando');
    celda(tr, 'Fecha', formatearFecha(mov.fecha), 'fecha');
    celda(tr, 'Descripción', mov.descripcion);
    celda(tr, 'Tipo', mov.tipo, 'tipo');
    celda(tr, 'Importe', dinero(mov.importe, mov.moneda), 'num');
    const acciones = celda(tr, '', '', 'acciones');
    const i = mov.ingreso;
    if (i) {
      acciones.appendChild(boton('Editar', 'Editar ingreso', () => editarIngreso(i.id)));
      acciones.appendChild(botonEliminar('Eliminar ingreso', () => eliminarIngreso(i.id)));
    }
    tbody.appendChild(tr);
  }
  $('tabla-movs').classList.toggle('hidden', !movs.length);
  $('movs-vacio').classList.toggle('hidden', movs.length > 0);

  // Historial: últimos 12 meses
  const hist = $('bal-historial');
  hist.replaceChildren();
  const mesesHist = mesesBalance().slice(0, 12);
  // Del mes más reciente hacia atrás: cada acumulado sale del siguiente, sin volver a sumar todo
  let acumuladoHist = null;
  for (const mes of mesesHist) {
    const [a, m] = mes.split('-').map(Number);
    acumuladoHist ??= acumuladoAl(isoDia(new Date(a, m, 0)));
    const h = cifrasPeriodo(mes + '-01', isoDia(new Date(a, m, 0)));
    const tr = document.createElement('tr');
    celda(tr, 'Mes', nombreMes(mes));
    celda(tr, 'Ingresos', soles.format(h.ingresos), 'num');
    celda(tr, 'Gastos', soles.format(h.gastos), 'num');
    celda(tr, 'Ahorro', montoConSigno(h.ahorro, h.ingresos > 0), 'num');
    celda(tr, 'Acumulado', montoConSigno(acumuladoHist, true), 'num');
    acumuladoHist = redondear(acumuladoHist - h.ahorro);
    hist.appendChild(tr);
  }
}
