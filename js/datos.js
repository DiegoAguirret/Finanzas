// Mis datos: exportar, importar y borrar
'use strict';

// ---- Datos: exportar / importar / borrar ----
function mensajeDatos(texto, error = false) {
  const el = $('datos-msg');
  el.textContent = texto;
  el.classList.toggle('error', error);
  el.classList.remove('hidden');
}

function descargar(nombre, contenido, tipo) {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function campoCSV(v) {
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // evita fórmulas al abrir en Excel
  return '"' + s.replace(/"/g, '""') + '"';
}

function gastoValido(g) {
  if (!g || typeof g !== 'object') return null;
  const descripcion = typeof g.descripcion === 'string' ? g.descripcion.trim().slice(0, 100) : '';
  const importe = redondear(Number(g.importe));
  if (!descripcion || !(importe > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(g.fecha)) return null;
  return {
    id: typeof g.id === 'string' && g.id ? g.id : nuevoId(),
    descripcion,
    importe,
    moneda: g.moneda === 'USD' ? 'USD' : 'PEN',
    // Se conserva el nombre aunque aún no esté en la lista: la categoría pudo crearse en otro dispositivo
    categoria: (typeof g.categoria === 'string' && !(g.categoria.trim() in Object.prototype) && g.categoria.trim().slice(0, 30)) || CATEGORIA_FIJA,
    medio: medioValido(g.medio),
    fecha: g.fecha,
  };
}

// La base usa uuid: los ids antiguos ('interbank', números) se cambian y se actualizan sus referencias
function normalizarIds() {
  const nuevos = {};
  let cambio = false;
  const renombrar = (x) => {
    if (esUUID(x.id)) return;
    nuevos[x.id] = nuevoId();
    x.id = nuevos[x.id];
    cambio = true;
  };
  tarjetas.forEach(renombrar);
  for (const g of gastos) {
    if (nuevos[g.medio]) g.medio = nuevos[g.medio];
    renombrar(g);
  }
  for (const x of pagos) {
    if (nuevos[x.tarjeta]) x.tarjeta = nuevos[x.tarjeta];
    renombrar(x);
  }
  ingresos.forEach(renombrar);
  for (const s of saldos) if (nuevos[s.tarjeta]) s.tarjeta = nuevos[s.tarjeta];
  if (cambio && saldos.length) guardarSaldos();
  if (cambio) {
    guardar();
    guardarIngresos();
    guardarTarjetas();
    guardarPagos();
  }
}

$('exp-json').addEventListener('click', () => {
  descargar(`finanzas-${hoyISO()}.json`, JSON.stringify({ gastos, ingresos, tarjetas, pagos, categorias, ajustes, saldos, deudas, abonos, metas, aportes, negocio, tiposCambio: { bcp: tiposCambio.bcp, interbank: tiposCambio.interbank } }, null, 2), 'application/json');
  mensajeDatos(`Exportados ${gastos.length} gastos, ${ingresos.length} ingresos, ${tarjetas.length} tarjetas y ${pagos.length} pagos de tarjeta en JSON.`);
});

// Libro de Excel con todos los datos: fechas y números de verdad, para poder ordenar y sumar
function hojasExcel() {
  const col = (titulo, tipo, ancho) => ({ titulo, tipo, ancho });
  const soles = (x) => redondear(enSoles(x)) || null; // sin tipo de cambio queda vacío, no en 0
  const finDeMes = (mes) => {
    const [a, m] = mes.split('-').map(Number);
    return isoDia(new Date(a, m, 0));
  };
  const orden = (lista) => [...lista].sort(porFechaDesc);
  return [
    {
      nombre: 'Resumen por mes',
      columnas: [col('Mes', 'texto', 24), col('Ingresos (S/)', 'importe', 15), col('Gastos (S/)', 'importe', 15), col('Pagos de tarjetas (S/)', 'importe', 22), col('Ahorro (S/)', 'importe', 15), col('Cambio en tu dinero (S/)', 'importe', 24), col('Acumulado (S/)', 'importe', 16)],
      filas: mesesBalance().map((mes) => {
        const c = cifrasPeriodo(mes + '-01', finDeMes(mes));
        return [nombreMes(mes), c.ingresos, c.gastos, c.pagos, c.ahorro, c.dinero, acumuladoAl(finDeMes(mes))];
      }),
    },
    {
      nombre: 'Gastos',
      columnas: [col('Fecha', 'fecha', 12), col('Descripción', 'texto', 34), col('Categoría', 'texto', 18), col('Medio de pago', 'texto', 24), col('Moneda', 'texto', 9), col('Importe', 'importe', 13), col('En soles', 'importe', 13), col('Cuenta en tu ahorro el', 'fecha', 21)],
      filas: orden(gastos).map((g) => [g.fecha, g.descripcion, g.categoria, nombreMedio(g.medio), g.moneda, g.importe, soles(g), fechaDeCuenta(g)]),
    },
    {
      nombre: 'Ingresos',
      columnas: [col('Fecha', 'fecha', 12), col('Descripción', 'texto', 34), col('Moneda', 'texto', 9), col('Importe', 'importe', 13), col('En soles', 'importe', 13)],
      filas: orden(ingresos).map((i) => [i.fecha, i.descripcion, i.moneda, i.importe, soles(i)]),
    },
    {
      nombre: 'Pagos de tarjeta',
      columnas: [col('Fecha', 'fecha', 12), col('Tarjeta', 'texto', 26), col('Moneda de la deuda', 'texto', 18), col('Abono a la deuda', 'importe', 16), col('Moneda pagada', 'texto', 15), col('Pagado', 'importe', 13), col('Tipo de cambio', 'tc', 14)],
      filas: orden(pagos).map((x) => [x.fecha, tarjetaDe(x.tarjeta)?.nombre ?? '', x.moneda, x.importe, x.pagadoMoneda, x.pagado, x.tipoCambio ?? null]),
    },
    {
      nombre: 'Deuda anterior',
      columnas: [col('Tarjeta', 'texto', 26), col('Se paga hasta', 'fecha', 14), col('Moneda', 'texto', 9), col('Monto', 'importe', 13)],
      filas: saldos.map((s) => [tarjetaDe(s.tarjeta)?.nombre ?? '', venceSaldo(s), s.moneda, s.importe]),
    },
    {
      nombre: 'Tarjetas',
      columnas: [col('Tarjeta', 'texto', 26), col('Banco', 'texto', 14), col('Día de corte', 'numero', 12), col('Día de pago', 'numero', 12), col('Días tras el corte', 'numero', 17), col('Línea de crédito (S/)', 'importe', 20)],
      filas: tarjetas.map((t) => [t.nombre, BANCOS[t.banco] ?? 'Otro banco', t.corte, t.pago, t.plazo, t.linea || null]),
    },
    {
      nombre: 'Deudas',
      columnas: [col('Deuda', 'texto', 28), col('Tipo', 'texto', 16), col('Desde', 'fecha', 12), col('Moneda', 'texto', 9), col('Monto', 'importe', 13)],
      filas: orden(deudas).map((d) => [d.nombre, TIPOS_DEUDA[d.tipo], d.fecha, d.moneda, d.monto]),
    },
    {
      nombre: 'Abonos',
      columnas: [col('Fecha', 'fecha', 12), col('Deuda', 'texto', 28), col('Moneda', 'texto', 9), col('Importe', 'importe', 13)],
      filas: orden(abonos).map((a) => [a.fecha, deudaDe(a.deuda)?.nombre ?? '', deudaDe(a.deuda)?.moneda ?? '', a.importe]),
    },
    {
      nombre: 'Metas',
      columnas: [col('Meta', 'texto', 28), col('Moneda', 'texto', 9), col('Objetivo', 'importe', 13), col('Para cuándo', 'fecha', 12)],
      filas: metas.map((m) => [m.nombre, m.moneda, m.objetivo, m.limite || null]),
    },
    {
      nombre: 'Aportes',
      columnas: [col('Fecha', 'fecha', 12), col('Meta', 'texto', 28), col('Moneda', 'texto', 9), col('Importe (negativo = retiro)', 'importe', 26)],
      filas: orden(aportes).map((a) => [a.fecha, metaDe(a.meta)?.nombre ?? '', metaDe(a.meta)?.moneda ?? '', a.importe]),
    },
    {
      nombre: 'Negocio',
      columnas: [col('Fecha', 'fecha', 12), col('Tipo', 'texto', 16), col('Descripción', 'texto', 34), col('Moneda', 'texto', 9), col('Importe', 'importe', 13), col('En soles', 'importe', 13)],
      filas: orden(negocio).map((m) => [m.fecha, TIPOS_NEGOCIO[m.tipo].nombre, m.descripcion, m.moneda, m.importe, redondear(negocioEnSoles(m)) || null]),
    },
  ];
}

$('exp-xlsx').addEventListener('click', () => {
  descargar(`mis-finanzas-${hoyISO()}.xlsx`, crearXlsx(hojasExcel()), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  mensajeDatos(`Excel descargado: ${gastos.length} gastos y ${ingresos.length} ingresos.`);
});

$('exp-csv').addEventListener('click', () => {
  const filas = [['fecha', 'descripcion', 'categoria', 'medio de pago', 'moneda', 'importe']]
    .concat(gastos.map((g) => [g.fecha, g.descripcion, g.categoria, nombreMedio(g.medio), g.moneda, g.importe.toFixed(2)]));
  descargar(`finanzas-${hoyISO()}.csv`, '﻿' + filas.map((f) => f.map(campoCSV).join(',')).join('\r\n'), 'text/csv;charset=utf-8');
  mensajeDatos(`Exportados ${gastos.length} gastos en CSV.`);
});

const MAX_IMPORTACION = 20 * 1024 * 1024; // más que suficiente para una copia; evita colgar la pestaña
$('imp-json').addEventListener('click', () => $('imp-archivo').click());
$('imp-archivo').addEventListener('change', async (e) => {
  const archivo = e.target.files[0];
  e.target.value = '';
  if (!archivo) return;
  if (archivo.size > MAX_IMPORTACION) return mensajeDatos('El archivo es demasiado grande.', true);
  try {
    const datos = JSON.parse(await archivo.text());
    const lista = Array.isArray(datos) ? datos : datos?.gastos;
    if (!Array.isArray(lista)) throw new Error('formato');
    // Primero las tarjetas, para que los gastos que las usan conserven su medio de pago
    let nuevasTarjetas = 0;
    for (const item of Array.isArray(datos?.tarjetas) ? datos.tarjetas : []) {
      const t = tarjetaValida(item);
      if (!t || tarjetaDe(t.id)) continue;
      tarjetas.push(t);
      nuevasTarjetas++;
    }
    if (nuevasTarjetas) {
      guardarTarjetas();
      poblarMedios();
    }
    const ids = new Set(gastos.map((g) => g.id));
    let nuevos = 0, omitidos = 0;
    for (const item of lista) {
      const g = gastoValido(item);
      if (!g || ids.has(g.id)) { omitidos++; continue; }
      ids.add(g.id);
      gastos.push(g);
      nuevos++;
    }
    const idsIngresos = new Set(ingresos.map((i) => i.id));
    let nuevosIngresos = 0;
    for (const item of Array.isArray(datos?.ingresos) ? datos.ingresos : []) {
      const i = ingresoValido(item);
      if (!i || idsIngresos.has(i.id)) { omitidos++; continue; }
      idsIngresos.add(i.id);
      ingresos.push(i);
      nuevosIngresos++;
    }
    const idsPagos = new Set(pagos.map((p) => p.id));
    let nuevosPagos = 0;
    for (const item of Array.isArray(datos?.pagos) ? datos.pagos : []) {
      const p = pagoValido(item);
      if (!p || idsPagos.has(p.id)) { omitidos++; continue; }
      idsPagos.add(p.id);
      pagos.push(p);
      nuevosPagos++;
    }
    if (datos?.ajustes) {
      ajustes = ajustesValidos(datos.ajustes);
      guardarAjustes();
    }
    if (Array.isArray(datos?.categorias)) {
      categorias = normalizarCategorias(categorias.concat(datos.categorias));
      guardarCategorias();
    }
    // En orden: las deudas y metas antes que sus movimientos
    let nuevosObjetivos = 0;
    for (const t of ['saldos', 'deudas', 'abonos', 'metas', 'aportes', 'negocio']) {
      const ids = new Set(TABLAS[t].lista().map((x) => x.id));
      for (const item of Array.isArray(datos?.[t]) ? datos[t] : []) {
        const x = TABLAS[t].deFila(item);
        if (!x || ids.has(x.id)) { omitidos++; continue; }
        ids.add(x.id);
        TABLAS[t].lista().push(x);
        nuevosObjetivos++;
      }
    }
    if (nuevosObjetivos) {
      guardarSaldos();
      guardarDeudas();
      guardarMetas();
      guardarNegocio();
    }
    for (const banco of ['bcp', 'interbank']) {
      for (const item of Array.isArray(datos?.tiposCambio?.[banco]) ? datos.tiposCambio[banco] : []) {
        const t = tcValido(item);
        if (t && !tiposCambio[banco].some((x) => x.fecha === t.fecha)) guardarTasaBanco(banco, t);
      }
    }
    normalizarIds();
    guardar();
    if (nuevosIngresos) guardarIngresos();
    if (nuevosPagos) guardarPagos();
    poblarCategorias();
    render();
    const contar = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
    const partes = [
      nuevos && contar(nuevos, 'gasto', 'gastos'),
      nuevosIngresos && contar(nuevosIngresos, 'ingreso', 'ingresos'),
      nuevasTarjetas && contar(nuevasTarjetas, 'tarjeta', 'tarjetas'),
      nuevosPagos && contar(nuevosPagos, 'pago de tarjeta', 'pagos de tarjeta'),
      nuevosObjetivos && contar(nuevosObjetivos, 'registro de deudas, metas o negocio', 'registros de deudas, metas o negocio'),
    ].filter(Boolean);
    mensajeDatos((partes.length
      ? 'Importados ' + (partes.length > 1 ? partes.slice(0, -1).join(', ') + ' y ' + partes.at(-1) : partes[0])
      : 'No había datos nuevos para importar') +
      (omitidos ? ` (${contar(omitidos, 'registro omitido', 'registros omitidos')} por duplicados o inválidos).` : '.'));
  } catch {
    mensajeDatos('Archivo no válido: usa un JSON exportado de esta web.', true);
  }
});

let confirmandoBorrado = false;
$('borrar-todo').addEventListener('click', () => {
  const b = $('borrar-todo');
  if (!confirmandoBorrado) {
    confirmandoBorrado = true;
    b.textContent = '¿Seguro? Pulsa otra vez';
    setTimeout(() => { confirmandoBorrado = false; b.textContent = 'Borrar todos los movimientos'; }, 3000);
    return;
  }
  confirmandoBorrado = false;
  b.textContent = 'Borrar todos los movimientos';
  const n = [gastos.length, ingresos.length, pagos.length];
  gastos = [];
  ingresos = [];
  pagos = [];
  abonos = [];
  saldos = [];
  aportes = [];
  salirEdicion();
  salirEdicionIngreso();
  guardar();
  guardarIngresos();
  guardarPagos();
  guardarSaldos();
  guardarDeudas();
  guardarMetas();
  render();
  mensajeDatos(`Se eliminaron ${n[0]} gastos, ${n[1]} ingresos y ${n[2]} pagos de tarjeta.`);
});
