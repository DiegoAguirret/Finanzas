// Constantes, estado compartido y utilidades
'use strict';

const CLAVE = 'finanzas.gastos';
const CLAVE_SIM = 'finanzas.simulacion';
const CLAVE_INGRESOS = 'finanzas.ingresos';
const CLAVE_TARJETAS = 'finanzas.tarjetas';
const CLAVE_PAGOS = 'finanzas.pagos';
const CLAVE_TARJETA_ANTIGUA = 'finanzas.tarjeta'; // una sola tarjeta Interbank (versión anterior)
const CLAVE_CATEGORIAS = 'finanzas.categorias';
const CLAVE_DEUDAS = 'finanzas.deudas';
const CLAVE_ABONOS = 'finanzas.abonos';
const CLAVE_METAS = 'finanzas.metas';
const CLAVE_APORTES = 'finanzas.aportes';
const CLAVE_SALDOS = 'finanzas.saldos';
const CLAVE_AVISO_LIMITE = 'finanzas.aviso_limite';
const CLAVE_INICIO = 'finanzas.inicio';
const CLAVE_AJUSTES = 'finanzas.ajustes';
// Trazos propios en una cuadrícula de 24 × 24 (ver .icono-cat en el CSS)
const circulo = (x, y, r) => `M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
const ICONOS = {
  comida: 'M6 3v6a3 3 0 0 0 6 0V3M9 3v18M17 21V3c-2 1-3 4-3 8h3',
  cafe: 'M5 9h12v6a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5zM17 10h1.5a2.5 2.5 0 0 1 0 5H17M8 3v3M12 3v3',
  compras: 'M6 8h12l1 13H5zM9 8V6a3 3 0 0 1 6 0v2',
  mercado: 'M3 4h2l2.5 11h10l2-8H6' + circulo(9, 20, 1) + circulo(17, 20, 1),
  bus: 'M6 4h12a2 2 0 0 1 2 2v11H4V6a2 2 0 0 1 2-2zM4 11h16M7 17v3M17 17v3M8 14h.01M16 14h.01',
  auto: 'M4 16v-3l2-5a2 2 0 0 1 2-1h8a2 2 0 0 1 2 1l2 5v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM4.5 12h15M7 17v2M17 17v2',
  casa: 'M4 11l8-7 8 7M6 9.5V20h12V9.5M10 20v-6h4v6',
  ticket: 'M4 7h16v3.5a1.5 1.5 0 0 0 0 3V17H4v-3.5a1.5 1.5 0 0 0 0-3zM14 7v2M14 11v2M14 15v2',
  salud: 'M12 20C6 15.5 4 12.5 4 9.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5c0 3-2 6-8 10.5z',
  viaje: 'M3 12l18-8-6 17-3-7zM12 14l9-10',
  libro: 'M5 5a2 2 0 0 1 2-2h12v15H7a2 2 0 0 0-2 2zM5 20a2 2 0 0 0 2 1h12v-3',
  ropa: 'M8 4l4 2 4-2 5 4-3 3-1-1v10H7V10l-1 1-3-3z',
  mascota: 'M12 12c-3 0-5 3-5 5.5C7 19 8 20 9.5 20c1 0 1.6-.5 2.5-.5s1.5.5 2.5.5c1.5 0 2.5-1 2.5-2.5 0-2.5-2-5.5-5-5.5z' +
    circulo(5.5, 11, 1.4) + circulo(9, 7, 1.4) + circulo(15, 7, 1.4) + circulo(18.5, 11, 1.4),
  regalo: 'M4 11h16v9H4zM3 7h18v4H3zM12 7v13M12 7C10 3 6 3 7 6c.4 1 3 1 5 1M12 7c2-4 6-4 5-1-.4 1-3 1-5 1',
  luz: 'M13 3L5 14h6l-1 7 8-11h-6z',
  telefono: 'M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM11 18h2',
  internet: 'M3 9a13 13 0 0 1 18 0M6.5 13a8 8 0 0 1 11 0M10 16.5a3 3 0 0 1 4 0M12 20h.01',
  pesas: 'M6 8v8M3 10v4M18 8v8M21 10v4M6 12h12',
  video: 'M4 5h16v14H4zM10 9l5 3-5 3z',
  trabajo: 'M4 8h16v11H4zM9 8V5h6v3M4 13h16',
  dinero: circulo(12, 12, 9) + 'M15 9c-.5-1-1.5-1.5-3-1.5-2 0-3 1-3 2.25S10 12 12 12s3 .75 3 2.25-1 2.25-3 2.25c-1.5 0-2.5-.5-3-1.5M12 6v12',
  meta: circulo(12, 12, 9) + circulo(12, 12, 4.5) + circulo(12, 12, 1),
  escudo: 'M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z',
  tarjeta: 'M3 6h18v12H3zM3 10h18M7 15h3',
  banco: 'M3 10l9-6 9 6M5 10v8M10 10v8M14 10v8M19 10v8M3 20h18',
  persona: circulo(12, 8, 4) + 'M5 20c1-4 4-6 7-6s6 2 7 6',
  otros: circulo(5, 12, 1.5) + circulo(12, 12, 1.5) + circulo(19, 12, 1.5),
};
// Íconos de la interfaz (navegación y acciones); los de categorías, metas y deudas están en ICONOS
const ICONOS_UI = {
  gastos: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6',
  ingresos: 'M12 3v12M7 10l5 5 5-5M4 20h16',
  dashboard: 'M5 20V11M12 20V4M19 20v-6M2 20h20',
  tarjeta: ICONOS.tarjeta,
  deudas: ICONOS.banco,
  ahorro: 'M4 7c0-2.5 16-2.5 16 0s-16 2.5-16 0zM4 7v5c0 2.5 16 2.5 16 0V7M4 12v5c0 2.5 16 2.5 16 0v-5',
  plan: circulo(12, 12, 9) + circulo(12, 12, 5) + circulo(12, 12, 1),
  simulador: 'M4 7h10M18 7h2M4 17h2M10 17h10M14 5h4v4h-4zM6 15h4v4H6z',
  datos: circulo(12, 12, 3) + 'M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1',
  mas: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  anadir: 'M12 5v14M5 12h14',
  cerrar: 'M6 6l12 12M18 6L6 18',
  menu: 'M4 7h16M4 12h16M4 17h16',
  editar: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  eliminar: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5',
  ver: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z' + circulo(12, 12, 3),
  ocultar: 'M6 15l6-6 6 6',
  'no-ver': 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7zM4 4l16 16' + circulo(12, 12, 3),
  filtro: 'M4 5h16l-6 8v6l-4-2v-4z',
  salir: 'M10 5H5v14h5M14 8l4 4-4 4M18 12H9',
  sol: circulo(12, 12, 4) + 'M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5',
  luna: 'M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z',
  sistema: 'M4 5h16v11H4zM9 20h6M12 16v4',
};
// Acciones de las listas que se entienden con un símbolo
const ACCIONES_ICONO = { Editar: 'editar', Eliminar: 'eliminar', Ver: 'ver', Ocultar: 'ocultar', Ciclos: 'ver', 'Ver tarjeta': 'ver' };
const COLORES = ['ambar', 'naranja', 'rojo', 'rosa', 'violeta', 'indigo', 'azul', 'cian', 'verde', 'gris'];
const CATEGORIAS_BASE = [
  { nombre: 'Comida', icono: 'comida', color: 'ambar' },
  { nombre: 'Transporte', icono: 'bus', color: 'azul' },
  { nombre: 'Vivienda', icono: 'casa', color: 'violeta' },
  { nombre: 'Ocio', icono: 'ticket', color: 'rosa' },
  { nombre: 'Salud', icono: 'salud', color: 'verde' },
  { nombre: 'Suscripciones', icono: 'video', color: 'indigo' },
  { nombre: 'Otros', icono: 'otros', color: 'gris' },
];
const CATEGORIA_FIJA = 'Otros'; // recibe los gastos de las categorías eliminadas: no se borra ni se renombra
// Medios de pago fijos; además, cada tarjeta es un medio cuya clave es el id de la tarjeta
const MEDIOS_FIJOS = { efectivo: 'Efectivo', debito: 'Débito / transferencia', yape: 'Yape', plin: 'Plin', credito: 'Otro medio de pago' };
const MEDIO_OTRO = 'credito'; // clave histórica: así está guardado en la base; siempre va al final de la lista
const VISTAS = ['gastos', 'ingresos', 'dashboard', 'tarjeta', 'deudas', 'ahorro', 'plan', 'simulador', 'datos'];
const NOMBRES_VISTAS = { gastos: 'Gastos', ingresos: 'Ingresos', dashboard: 'Dashboard', tarjeta: 'Tarjetas', deudas: 'Deudas', ahorro: 'Ahorro', plan: 'Plan', simulador: 'Simulaciones', datos: 'Ajustes' };
// Vistas con un formulario que en celular se abre como hoja: [formulario, texto del botón, primer campo]
const HOJAS = {
  gastos: ['form', 'Añadir gasto', 'descripcion'],
  ingresos: ['ing-form', 'Añadir ingreso', 'ing-descripcion'],
  tarjeta: ['tar-form', 'Añadir tarjeta', 'tar-nombre'],
  deudas: ['deu-form', 'Añadir deuda', 'deu-nombre'],
  ahorro: ['met-form', 'Añadir meta', 'met-nombre'],
};
const soles = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });
const decimales = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const MONEDAS = ['PEN', 'USD'];
const compacto = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', notation: 'compact', maximumFractionDigits: 1 });

const $ = (id) => document.getElementById(id);
const form = $('form');

let gastos = [];
let tarjetas = [];
let ingresos = [];
let pagos = [];
let categorias = CATEGORIAS_BASE.map((x) => ({ ...x }));
let deudas = [];
let abonos = [];
let metas = [];
let aportes = [];
let saldos = []; // Deuda anterior de tarjetas: { id, tarjeta, fecha (corte del ciclo en que se paga), moneda, importe }
let ajustes = { compras: 'vence' }; // compras con tarjeta: se restan al vencer su pago o el día de la compra
let editandoId = null;
let vistaActual = 'gastos';

// ---- Utilidades ----
// Desplazamiento suave salvo que el sistema pida reducir el movimiento
function desplazamiento() {
  return matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

function hoyISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

// 'YYYY-MM' de una fecha local
function isoMes(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

// UUID v4: la base de datos usa uuid como clave
function nuevoId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function esUUID(v) {
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

function formatearFecha(iso) {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

function numero(valor) {
  const n = parseFloat(valor);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

// Suma en soles: los importes en dólares se convierten con el tipo de cambio de su fecha (enSoles)
function sumar(lista) {
  return lista.reduce((s, x) => s + enSoles(x), 0);
}

// 'S/ 1,250.00' o 'US$ 80.00'
function dinero(n, moneda = 'PEN') {
  n = n || 0; // evita '-S/ 0.00'
  // es-PE escribe los dólares como 'USD 80.00'; en Perú se usa 'US$ 80.00'
  return moneda === 'USD' ? (n < 0 ? '-' : '') + 'US$ ' + decimales.format(Math.abs(n)) : soles.format(n);
}

// Importes separados por moneda: { PEN, USD }
function montos() {
  return { PEN: 0, USD: 0 };
}

function sinMonto(m) {
  return !m.PEN && !m.USD;
}

// 'S/ 25.00', 'US$ 12.00' o 'S/ 25.00 + US$ 12.00'
function textoMontos(m) {
  const partes = [];
  if (m.PEN || !m.USD) partes.push(dinero(m.PEN, 'PEN'));
  if (m.USD) partes.push(dinero(m.USD, 'USD'));
  return partes.join(' + ');
}

// Deuda por moneda; lo negativo es saldo a favor
function textoDeuda(m) {
  const debe = { PEN: Math.max(m.PEN, 0), USD: Math.max(m.USD, 0) };
  const favor = { PEN: Math.max(-m.PEN, 0), USD: Math.max(-m.USD, 0) };
  return textoMontos(debe) + (sinMonto(favor) ? '' : ` · a favor ${textoMontos(favor)}`);
}

// Redondea a céntimos (evita restos como 0.0000001 al restar importes)
function redondear(n) {
  return Math.round(n * 100) / 100;
}

// '+S/ 1,250.00' / '-S/ 80.00'
// '+S/ 1,250.00' / '-US$ 80.00'
function conSigno(n, moneda = 'PEN') {
  return (n > 0 ? '+' : '') + dinero(n, moneda);
}

function tarjetaDe(id) {
  return tarjetas.find((t) => t.id === id);
}

// Medio sin dato → efectivo; desconocido (tarjeta borrada o de otro navegador) → otro medio
function medioValido(m) {
  if (Object.hasOwn(MEDIOS_FIJOS, m) || tarjetaDe(m)) return m;
  return typeof m === 'string' && m ? MEDIO_OTRO : 'efectivo';
}

function normalizarGastos() {
  for (const g of gastos) {
    g.medio = medioValido(g.medio);
    g.moneda = g.moneda === 'USD' ? 'USD' : 'PEN';
  }
}

// Claves de todos los medios en el orden de los desplegables
function medios() {
  return [...Object.keys(MEDIOS_FIJOS).filter((m) => m !== MEDIO_OTRO), ...tarjetas.map((t) => t.id), MEDIO_OTRO];
}

function nombreMedio(m) {
  return MEDIOS_FIJOS[m] || 'Tarjeta ' + tarjetaDe(m).nombre;
}

// Rellena los desplegables de medio de pago conservando la selección si sigue existiendo
function poblarMedios() {
  for (const [id, todos] of [['medio', false], ['filtro-medio', true], ['dash-medio', true]]) {
    const sel = $(id);
    const antes = sel.value;
    const opciones = medios().map((m) => new Option(nombreMedio(m), m));
    if (todos) opciones.unshift(new Option('Todos los medios', ''));
    sel.replaceChildren(...opciones);
    if ([...sel.options].some((o) => o.value === antes)) sel.value = antes;
  }
}
