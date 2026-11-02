// Moneda y tipo de cambio
'use strict';

// ---- Moneda y tipo de cambio ----
// Tipos de cambio en S/ por US$, ordenados por fecha. 'bcrp' (oficial del sistema bancario) llega
// solo desde Supabase; 'bcp' e 'interbank' los registra el usuario (no publican una fuente abierta).
const CLAVE_TC = 'finanzas.tipos_cambio';
const BANCOS = { bcp: 'BCP', interbank: 'Interbank', otro: 'Otro banco' };
const WEB_BANCOS = { bcp: 'https://www.viabcp.com/tipodecambio/dolares', interbank: 'https://interbank.pe/tipo-de-cambio' };
let tiposCambio = { bcrp: [], bcp: [], interbank: [] };
let estadoTC = '';

function porFecha(a, b) {
  return a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0;
}

function tcValido(t) {
  const compra = Number(t?.compra), venta = Number(t?.venta);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t?.fecha) || !(compra > 0) || !(venta > 0)) return null;
  return { fecha: t.fecha, compra, venta };
}

function cargarTiposCambio() {
  const d = leerJSON(CLAVE_TC, {});
  for (const fuente of Object.keys(tiposCambio)) {
    tiposCambio[fuente] = Array.isArray(d?.[fuente]) ? d[fuente].map(tcValido).filter(Boolean).sort(porFecha) : [];
  }
}

function guardarTiposCambio() {
  escribirJSON(CLAVE_TC, tiposCambio);
  programarSync();
}

// Guarda (o corrige) el tipo de cambio de un banco en una fecha
function guardarTasaBanco(banco, t) {
  tiposCambio[banco] = tiposCambio[banco].filter((x) => x.fecha !== t.fecha).concat(t).sort(porFecha);
  guardarTiposCambio();
}

// Tipo de cambio vigente en la fecha: el último registrado hasta ese día (o el más antiguo si no hay)
function tasa(fuente, fecha, lado) {
  const lista = tiposCambio[fuente] || [];
  // Búsqueda binaria: se llama por cada importe en dólares y la lista está ordenada por fecha
  let bajo = 0, alto = lista.length;
  while (bajo < alto) {
    const medio = (bajo + alto) >> 1;
    if (lista[medio].fecha > fecha) alto = medio;
    else bajo = medio + 1;
  }
  const elegido = lista[Math.max(bajo - 1, 0)];
  return elegido ? elegido[lado] : null;
}

// El del banco si lo hay; si no, el oficial del BCRP
function tasaPara(banco, fecha, lado) {
  return (banco === 'bcp' || banco === 'interbank' ? tasa(banco, fecha, lado) : null) || tasa('bcrp', fecha, lado);
}

// Valor en soles de un gasto o ingreso. Gastos en dólares: venta (lo que cuesta comprar esos dólares),
// con el tipo de cambio del banco de la tarjeta si se pagó con una. Ingresos en dólares: compra.
// Sin ningún tipo de cambio registrado, los dólares no suman (y se avisa en pantalla).
function enSoles(x) {
  if (x.moneda !== 'USD') return x.importe;
  const esIngreso = !('categoria' in x);
  const tc = tasaPara(esIngreso ? null : tarjetaDe(x.medio)?.banco, x.fecha, esIngreso ? 'compra' : 'venta');
  return tc ? x.importe * tc : 0;
}

// Lo que salió de tu dinero con un pago a la tarjeta, en soles
function pagoEnSoles(p) {
  if (p.pagadoMoneda === 'PEN') return p.pagado;
  const tc = tasaPara(tarjetaDe(p.tarjeta)?.banco, p.fecha, 'compra');
  return tc ? p.pagado * tc : 0;
}

function formatoTC(n) {
  return Number(n.toFixed(3)) === Number(n.toFixed(4)) ? n.toFixed(3) : n.toFixed(4);
}

// Descarga el tipo de cambio del BCRP (lo actualiza pg_cron en Supabase cada hora en días hábiles).
// Es información pública: funciona también sin iniciar sesión.
async function cargarBCRP() {
  try {
    const filas = await api('/rest/v1/tipos_cambio_bcrp?select=fecha,compra,venta&order=fecha.desc&limit=400', { autenticado: false });
    tiposCambio.bcrp = filas.map(tcValido).filter(Boolean).sort(porFecha);
    escribirJSON(CLAVE_TC, tiposCambio);
    estadoTC = '';
  } catch {
    estadoTC = 'BCRP sin actualizar: se usa el último disponible.';
  }
  render();
  renderVista();
}
