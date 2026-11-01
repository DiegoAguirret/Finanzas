// Lógica de la web de finanzas (finanzas.html): datos locales, sincronización con la nube y vistas
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
const MEDIOS_FIJOS = { efectivo: 'Efectivo', debito: 'Débito / transferencia', credito: 'Otra tarjeta de crédito' };
const VISTAS = ['gastos', 'ingresos', 'dashboard', 'tarjeta', 'deudas', 'ahorro', 'simulador', 'datos'];
const NOMBRES_VISTAS = { gastos: 'Gastos', ingresos: 'Ingresos', dashboard: 'Dashboard', tarjeta: 'Tarjetas', deudas: 'Deudas', ahorro: 'Ahorro', simulador: 'Simulaciones', datos: 'Ajustes' };
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
let ajustes = { compras: 'vence' }; // compras con tarjeta: se restan al vencer su pago o el día de la compra
let editandoId = null;
let confirmandoId = null;
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

// Medio sin dato → efectivo; tarjeta desconocida (borrada o de otro navegador) → otra tarjeta
function medioValido(m) {
  if (Object.hasOwn(MEDIOS_FIJOS, m) || tarjetaDe(m)) return m;
  return typeof m === 'string' && m ? 'credito' : 'efectivo';
}

// Claves de todos los medios en el orden de los desplegables
function medios() {
  return ['efectivo', 'debito', ...tarjetas.map((t) => t.id), 'credito'];
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
  let elegido = null;
  for (const t of lista) {
    if (t.fecha > fecha) break;
    elegido = t;
  }
  elegido ||= lista[0];
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

// Pide a Supabase que actualice el BCRP (como mucho una vez por hora) y descarga la serie.
// Es información pública: funciona también sin iniciar sesión.
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

// ---- Nube (Supabase) ----
// La web guarda una copia en localStorage (abre al instante y funciona sin conexión). Con sesión,
// Supabase es la fuente principal: al abrir se descargan los datos y cada guardarX() programa
// sincronizar(), que compara con lo último confirmado por la nube (`sincronizado`) y sube solo lo
// que cambió. Los datos los protege Row Level Security: cada usuario solo ve sus filas.
// La web no conoce la URL ni la clave de Supabase: habla con /api de su mismo dominio, donde
// un intermediario (functions/api en Cloudflare) añade la clave guardada como variable secreta.
const API = '/api';
const TAM_PAGINA = 1000; // Supabase devuelve como mucho 1000 filas por consulta
const CLAVE_SESION = 'finanzas.sesion';
const CLAVE_MODO = 'finanzas.modo';                 // 'local' = usar sin cuenta
const CLAVE_SINCRONIZADO = 'finanzas.sincronizado'; // filas tal como las tiene la nube
const CLAVE_DUENO = 'finanzas.dueno';               // usuario dueño de la copia local

// Conversión entre los objetos de la web y las filas de cada tabla
const TABLAS = {
  tarjetas: {
    lista: () => tarjetas,
    aFila: (t) => ({ id: t.id, nombre: t.nombre, banco: t.banco, corte: t.corte, pago: t.pago, plazo: t.plazo, linea: t.linea }),
    deFila: (f) => tarjetaValida(f),
  },
  gastos: {
    lista: () => gastos,
    aFila: (g) => {
      const t = tarjetaDe(g.medio);
      return {
        id: g.id, descripcion: g.descripcion, importe: g.importe, moneda: g.moneda, categoria: g.categoria,
        medio: t ? 'tarjeta' : g.medio, tarjeta: t ? t.id : null, fecha: g.fecha,
      };
    },
    deFila: (f) => gastoValido({ ...f, medio: f.medio === 'tarjeta' ? f.tarjeta || 'credito' : f.medio }),
    poner: (l) => { gastos = l; },
  },
  ingresos: {
    lista: () => ingresos,
    aFila: (i) => ({ id: i.id, descripcion: i.descripcion, importe: i.importe, moneda: i.moneda, fecha: i.fecha }),
    deFila: (f) => ingresoValido(f),
    poner: (l) => { ingresos = l; },
  },
  pagos: {
    lista: () => pagos,
    aFila: (x) => ({
      id: x.id, tarjeta: x.tarjeta, fecha: x.fecha, moneda: x.moneda, importe: x.importe,
      pagado_moneda: x.pagadoMoneda, pagado: x.pagado, tipo_cambio: x.tipoCambio,
    }),
    deFila: (f) => pagoValido({ ...f, pagadoMoneda: f.pagado_moneda, tipoCambio: f.tipo_cambio }),
    poner: (l) => { pagos = l; },
  },
  deudas: {
    lista: () => deudas,
    aFila: (d) => ({ id: d.id, nombre: d.nombre, tipo: d.tipo, moneda: d.moneda, monto: d.monto, fecha: d.fecha }),
    deFila: (f) => deudaValida(f),
    poner: (l) => { deudas = l; },
  },
  abonos: {
    lista: () => abonos,
    aFila: (a) => ({ id: a.id, deuda: a.deuda, fecha: a.fecha, importe: a.importe }),
    deFila: (f) => abonoValido(f),
    poner: (l) => { abonos = l; },
  },
  metas: {
    lista: () => metas,
    aFila: (m) => ({ id: m.id, nombre: m.nombre, icono: m.icono, color: m.color, moneda: m.moneda, objetivo: m.objetivo, limite: m.limite }),
    deFila: (f) => metaValida(f),
    poner: (l) => { metas = l; },
  },
  aportes: {
    lista: () => aportes,
    aFila: (a) => ({ id: a.id, meta: a.meta, fecha: a.fecha, importe: a.importe }),
    deFila: (f) => aporteValido(f),
    poner: (l) => { aportes = l; },
  },
};
// Las tablas padre antes que lo que las usa
const ORDEN_TABLAS = ['tarjetas', 'gastos', 'ingresos', 'pagos', 'deudas', 'abonos', 'metas', 'aportes'];

const ERRORES_ACCESO = {
  invalid_credentials: 'Correo o contraseña incorrectos.',
  email_not_confirmed: 'Confirma tu correo para entrar.',
  confirmar: 'Te enviamos un correo de confirmación.',
  enlace_enviado: 'Si el correo está registrado, te enviamos un enlace.',
  clave_cambiada: 'Contraseña actualizada.',
  claves_distintas: 'Las contraseñas no coinciden.',
  same_password: 'Usa una contraseña distinta a la actual.',
  sin_verificador: 'Correo confirmado. Ya puedes iniciar sesión.',
  bad_code_verifier: 'Este enlace no es válido aquí. Inicia sesión o pide otro.',
  flow_state_not_found: 'El enlace ya se usó o caducó.',
  flow_state_expired: 'El enlace caducó. Pide otro.',
  otp_expired: 'El enlace caducó. Pide otro.',
  user_already_exists: 'Ese correo ya tiene una cuenta.',
  email_exists: 'Ese correo ya tiene una cuenta.',
  weak_password: 'Usa al menos 8 caracteres, con letras y números.',
  email_provider_disabled: 'El acceso con correo no está disponible.',
  signup_disabled: 'El registro no está disponible.',
  over_request_rate_limit: 'Demasiados intentos. Espera unos minutos.',
  over_email_send_rate_limit: 'Demasiados correos. Espera unos minutos.',
  validation_failed: 'Revisa el correo y la contraseña.',
  sin_conexion: 'Sin conexión.',
  archivo: 'Abre la web desde su dirección, no como archivo.',
  google_desactivado: 'Google no está disponible.',
  acceso_fallo: 'No se pudo entrar. Inténtalo de nuevo.',
};

let sesion = null;            // { token, renovar, expira (ms), usuario: { id, correo } }
let sincronizado = {};        // tabla → { id: JSON de la fila confirmada por la nube }
let nubeLista = false;        // no se sube nada hasta saber de quién es la copia local
let sincronizando = false, otraVez = false, errorSync = null, esperaSync = null, renovando = null;
let accesoModo = 'entrar'; // entrar | registro | recuperar | nueva-clave
let modoPintado = null;
let confirmandoSalida = false;
let esperaAvisoGuardado = null;
let appIniciada = false;       // lo que se guarda al arrancar (migraciones) no es un cambio del usuario
let escrituraFallida = false;  // localStorage no aceptó el último guardado: la memoria es lo más reciente
let ultimaDescarga = 0;        // cuándo se trajo la nube por última vez (ms)
const ESPERA_DESCARGA = 60000; // al volver a la pestaña se consulta la nube como mucho una vez por minuto
const CANDADO_SYNC = 'finanzas.sync', CANDADO_SESION = 'finanzas.renovar';

// Una sola pestaña a la vez en lo que hay dentro (solo hay Web Locks en https y localhost)
function conCandado(nombre, fn) {
  return navigator.locks ? navigator.locks.request(nombre, fn) : fn();
}

function leerJSON(clave, defecto) {
  try { return JSON.parse(localStorage.getItem(clave)) ?? defecto; } catch { return defecto; }
}

function escribirJSON(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
    escrituraFallida = false;
  } catch (e) {
    escrituraFallida = true;
    console.warn('No se pudo guardar en localStorage', e);
  }
}

async function api(ruta, { metodo = 'GET', cuerpo, prefer, autenticado = true } = {}) {
  const cabeceras = {};
  if (cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json';
  if (prefer) cabeceras.Prefer = prefer;
  if (autenticado) {
    await renovarSesion();
    if (!sesion) throw Object.assign(new Error('Tu sesión terminó. Vuelve a iniciar sesión.'), { codigo: 'sin_sesion' });
    cabeceras.Authorization = 'Bearer ' + sesion.token;
  }
  let r;
  try {
    r = await fetch(API + ruta, {
      method: metodo, headers: cabeceras, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      signal: AbortSignal.timeout(20000), // sin respuesta en 20 s se trata como sin conexión
    });
  } catch {
    throw Object.assign(new Error(ERRORES_ACCESO.sin_conexion), { codigo: 'sin_conexion' });
  }
  const texto = await r.text();
  let datos = null;
  try { datos = texto ? JSON.parse(texto) : null; } catch {}
  if (!r.ok) {
    throw Object.assign(new Error(datos?.msg || datos?.message || datos?.error_description || `Error ${r.status}`),
      { codigo: datos?.error_code || datos?.code || datos?.error, estado: r.status });
  }
  return datos;
}

function guardarSesion(d) {
  sesion = {
    token: d.access_token,
    renovar: d.refresh_token,
    expira: d.expires_at ? d.expires_at * 1000 : Date.now() + d.expires_in * 1000,
    usuario: { id: d.user.id, correo: d.user.email, nombre: nombreDe(d.user) },
  };
  escribirJSON(CLAVE_SESION, sesion);
}

// Google da el nombre completo: se deja el primer nombre y el primer apellido. Las partículas van
// con la palabra siguiente («de la Cruz» es un apellido). Con 3 palabras se asume nombre y dos
// apellidos; con 4 o más, el primer apellido es el penúltimo.
function nombreCorto(completo) {
  const partes = [];
  let particulas = '';
  for (const palabra of completo.split(/\s+/).filter(Boolean)) {
    if (/^(de|del|la|las|los|y)$/i.test(palabra)) particulas += palabra + ' ';
    else { partes.push(particulas + palabra); particulas = ''; }
  }
  if (partes.length <= 2) return completo;
  return partes[0] + ' ' + (partes.length === 3 ? partes[1] : partes.at(-2));
}

// Nombre del usuario: el de su cuenta de Google (acortado) o el que escribió al registrarse
function nombreDe(usuario) {
  const meta = usuario?.user_metadata || {};
  const nombre = String(meta.full_name || meta.name || '').trim();
  const conGoogle = usuario?.app_metadata?.provider === 'google' || usuario?.identities?.some((i) => i.provider === 'google');
  return (conGoogle ? nombreCorto(nombre) : nombre).slice(0, 60);
}

// Actualiza el nombre guardado en la sesión (por ejemplo, sesiones de antes de mostrar el nombre)
async function actualizarPerfil() {
  try {
    const usuario = await api('/auth/v1/user');
    if (!sesion) return;
    sesion.usuario.nombre = nombreDe(usuario);
    escribirJSON(CLAVE_SESION, sesion);
    pintarCuenta();
  } catch {} // sin nombre se muestra el correo
}

// Renueva el token si vence en menos de un minuto (una sola renovación a la vez)
async function renovarSesion() {
  if (!sesion || sesion.expira - Date.now() > 60000) return;
  renovando ||= conCandado(CANDADO_SESION, async () => {
    try {
      // Mientras se esperaba el candado, otra pestaña pudo haberla renovado
      const guardada = leerJSON(CLAVE_SESION, null);
      if (guardada?.usuario?.id === sesion?.usuario.id && guardada.expira - Date.now() > 60000) {
        sesion = guardada;
        return;
      }
      if (!sesion) return;
      const d = await api('/auth/v1/token?grant_type=refresh_token', {
        metodo: 'POST', cuerpo: { refresh_token: sesion.renovar }, autenticado: false,
      });
      guardarSesion(d);
    } catch (e) {
      if (e.codigo !== 'sin_conexion') cerrarSesionLocal(); // token inválido: hay que volver a entrar
    } finally {
      renovando = null;
    }
  });
  await renovando;
}

// Dirección a la que vuelven Google y los enlaces de correo (debe estar en Redirect URLs de Supabase)
function urlDeVuelta() {
  return location.origin + location.pathname;
}

async function autenticar(modo, correo, clave, nombre = '') {
  if (location.protocol === 'file:') throw Object.assign(new Error(ERRORES_ACCESO.archivo), { codigo: 'archivo' });
  if (modo === 'registro') {
    // Con «Confirm email» activo no hay sesión hasta abrir el enlace del correo, que vuelve con ?code=…
    // Si no se envía correo (cuenta existente o error), se restaura el verificador anterior para que
    // un enlace de confirmación pendiente siga sirviendo.
    const anterior = leerJSON(CLAVE_PKCE, null);
    const restaurar = () => (anterior ? escribirJSON(CLAVE_PKCE, anterior) : localStorage.removeItem(CLAVE_PKCE));
    const reto = await nuevoPKCE('registro');
    let d;
    try {
      d = await api(`/auth/v1/signup?redirect_to=${encodeURIComponent(urlDeVuelta())}`, {
        metodo: 'POST', autenticado: false,
        cuerpo: {
          email: correo, password: clave, data: { full_name: nombre.trim().slice(0, 60) },
          code_challenge: reto, code_challenge_method: 's256',
        },
      });
    } catch (e) {
      restaurar();
      throw e;
    }
    // Si el correo ya tiene cuenta, Supabase no la crea ni envía correo: responde con un usuario sin
    // ninguna forma de acceso (identities vacío). Se avisa en vez de esperar un correo que no llegará.
    if (!d?.access_token && Array.isArray(d?.identities) && d.identities.length === 0) {
      restaurar();
      throw Object.assign(new Error(ERRORES_ACCESO.user_already_exists), { codigo: 'user_already_exists' });
    }
    if (!d?.access_token) throw Object.assign(new Error(ERRORES_ACCESO.confirmar), { codigo: 'confirmar' });
    guardarSesion(d);
    return;
  }
  guardarSesion(await api('/auth/v1/token?grant_type=password', {
    metodo: 'POST', cuerpo: { email: correo, password: clave }, autenticado: false,
  }));
}

// Envía el enlace para elegir una nueva contraseña (la respuesta es la misma exista o no la cuenta)
async function recuperarClave(correo) {
  if (location.protocol === 'file:') throw Object.assign(new Error(ERRORES_ACCESO.archivo), { codigo: 'archivo' });
  const reto = await nuevoPKCE('recuperar');
  await api(`/auth/v1/recover?redirect_to=${encodeURIComponent(urlDeVuelta())}`, {
    metodo: 'POST', autenticado: false, cuerpo: { email: correo, code_challenge: reto, code_challenge_method: 's256' },
  });
}

async function cambiarClave(nueva) {
  await api('/auth/v1/user', { metodo: 'PUT', cuerpo: { password: nueva } });
}

// ---- Acceso con PKCE (Google y enlaces de correo) ----
// Google y los enlaces de confirmación y de nueva contraseña vuelven a esta página con ?code=…,
// que solo sirve junto con el verificador guardado aquí: los tokens nunca viajan en la URL y un
// código ajeno no permite entrar. Se guarda en localStorage para que el enlace del correo funcione
// aunque se abra en otra pestaña del mismo navegador; caduca a las 24 h.
const CLAVE_PKCE = 'finanzas.pkce';
const VIDA_PKCE = 24 * 60 * 60 * 1000;

function base64url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Crea y guarda un verificador nuevo; devuelve el reto (su SHA-256) que se envía a Supabase
async function nuevoPKCE(tipo) {
  const verificador = base64url(crypto.getRandomValues(new Uint8Array(32)));
  escribirJSON(CLAVE_PKCE, { verificador, tipo, creado: Date.now() });
  return base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verificador))));
}

async function entrarConGoogle() {
  if (location.protocol === 'file:') throw Object.assign(new Error(ERRORES_ACCESO.archivo), { codigo: 'archivo' });
  const ajustes = await api('/auth/v1/settings', { autenticado: false });
  if (!ajustes?.external?.google) throw Object.assign(new Error(ERRORES_ACCESO.google_desactivado), { codigo: 'google_desactivado' });
  const parametros = new URLSearchParams({
    provider: 'google',
    redirect_to: urlDeVuelta(),
    code_challenge: await nuevoPKCE('google'),
    code_challenge_method: 's256',
  });
  location.assign(`${API}/auth/v1/authorize?${parametros}`);
}

// Al volver de Google: canjea el código por la sesión y limpia la URL. Devuelve true si entró.
// Al volver con ?code=… (Google o enlace de correo): canjea el código por la sesión y limpia la URL.
// Devuelve el tipo de acceso ('google' | 'registro' | 'recuperar') o null si no se volvía de ahí.
async function completarAcceso() {
  const consulta = new URLSearchParams(location.search);
  const fragmento = new URLSearchParams(location.hash.startsWith('#error') ? location.hash.slice(1) : '');
  const codigo = consulta.get('code');
  const error = consulta.get('error_description') || consulta.get('error') ||
    fragmento.get('error_description') || fragmento.get('error');
  if (!codigo && !error) return null;
  history.replaceState(null, '', location.pathname + (location.hash.startsWith('#error') ? '' : location.hash));
  const pkce = leerJSON(CLAVE_PKCE, null);
  if (error) throw Object.assign(new Error(`${ERRORES_ACCESO.acceso_fallo} (${error})`), { codigo: 'acceso_fallo_detalle' });
  if (!pkce?.verificador || Date.now() - pkce.creado > VIDA_PKCE) {
    try { localStorage.removeItem(CLAVE_PKCE); } catch {}
    throw Object.assign(new Error(ERRORES_ACCESO.sin_verificador), { codigo: 'sin_verificador' });
  }
  // El verificador se borra solo si el canje sale bien: si se abrió un enlace viejo, todavía
  // tiene que servir para el último enlace enviado
  guardarSesion(await api('/auth/v1/token?grant_type=pkce', {
    metodo: 'POST', cuerpo: { auth_code: codigo, code_verifier: pkce.verificador }, autenticado: false,
  }));
  try { localStorage.removeItem(CLAVE_PKCE); } catch {}
  return pkce.tipo;
}

function cerrarSesionLocal() {
  sesion = null;
  nubeLista = false;
  try { localStorage.removeItem(CLAVE_SESION); } catch {}
  pintarCuenta();
}

// Borra la copia local (al cerrar sesión o si pertenece a otra cuenta)
function borrarCopiaLocal() {
  gastos = [];
  ingresos = [];
  tarjetas = [];
  pagos = [];
  tiposCambio.bcp = [];
  tiposCambio.interbank = [];
  categorias = CATEGORIAS_BASE.map((x) => ({ ...x }));
  ajustes = ajustesValidos(null);
  deudas = [];
  abonos = [];
  metas = [];
  aportes = [];
  sincronizado = {};
  tarSeleccion = null;
  deuSeleccion = null;
  metSeleccion = null;
  for (const clave of [CLAVE, CLAVE_INGRESOS, CLAVE_TARJETAS, CLAVE_PAGOS, CLAVE_CATEGORIAS, CLAVE_AJUSTES, CLAVE_DEUDAS, CLAVE_ABONOS, CLAVE_METAS, CLAVE_APORTES, CLAVE_SINCRONIZADO, CLAVE_DUENO]) {
    try { localStorage.removeItem(clave); } catch {}
  }
  escribirJSON(CLAVE_TC, tiposCambio);
}

// Filas actuales de una tabla tal como se envían a la nube
function filasDe(tabla) {
  const def = TABLAS[tabla];
  return Object.fromEntries(def.lista().map((x) => {
    const f = def.aFila(x);
    return [f.id, JSON.stringify(f)];
  }));
}

function filasTiposCambio() {
  const filas = {};
  for (const banco of ['bcp', 'interbank']) {
    for (const t of tiposCambio[banco]) filas[banco + '|' + t.fecha] = JSON.stringify({ banco, ...t });
  }
  return filas;
}

function hayCambiosSinSubir() {
  const actuales = { ...Object.fromEntries(ORDEN_TABLAS.map((t) => [t, filasDe(t)])), tipos_cambio: filasTiposCambio() };
  const prefs = sincronizado.preferencias || {};
  if (prefs.sim !== JSON.stringify(sim) || prefs.cats !== JSON.stringify(categorias) || prefs.aj !== JSON.stringify(ajustes)) return true;
  return Object.entries(actuales).some(([t, filas]) => {
    const previas = sincronizado[t] || {};
    return Object.keys(filas).some((id) => previas[id] !== filas[id]) ||
      (t !== 'tipos_cambio' && Object.keys(previas).some((id) => !(id in filas)));
  });
}

function programarSync() {
  if (!sesion) recordarCuenta();
  if (!sesion || !nubeLista) return;
  otraVez = true;
  pintarCuenta();
  clearTimeout(esperaSync);
  esperaSync = setTimeout(sincronizar, 400);
}

// Sube lo que difiere de lo confirmado por la nube. Parte de lo guardado en este navegador: otra
// pestaña pudo haberlo cambiado hace un instante y, con datos viejos, se borrarían sus filas nuevas.
async function subirCambios() {
  recargarDeLocal();
  const hayCambios = hayCambiosSinSubir();
  if (hayCambios) avisoGuardado('Guardando…');
  const actuales = Object.fromEntries(ORDEN_TABLAS.map((t) => [t, filasDe(t)]));
  for (const t of ORDEN_TABLAS) {
    const previas = sincronizado[t] || {};
    const subir = Object.entries(actuales[t]).filter(([id, j]) => previas[id] !== j).map(([, j]) => JSON.parse(j));
    if (subir.length) {
      await api(`/rest/v1/${t}?on_conflict=id`, { metodo: 'POST', cuerpo: subir, prefer: 'resolution=merge-duplicates,return=minimal' });
    }
  }
  // Se borra en orden inverso: primero lo que usa las tarjetas
  for (const t of [...ORDEN_TABLAS].reverse()) {
    const borrar = Object.keys(sincronizado[t] || {}).filter((id) => !(id in actuales[t]));
    if (borrar.length) await api(`/rest/v1/${t}?id=in.(${borrar.join(',')})`, { metodo: 'DELETE', prefer: 'return=minimal' });
  }
  const tcs = filasTiposCambio();
  const tcNuevos = Object.entries(tcs).filter(([k, j]) => (sincronizado.tipos_cambio || {})[k] !== j).map(([, j]) => JSON.parse(j));
  if (tcNuevos.length) {
    await api('/rest/v1/tipos_cambio?on_conflict=usuario,banco,fecha', { metodo: 'POST', cuerpo: tcNuevos, prefer: 'resolution=merge-duplicates,return=minimal' });
  }
  const preferencias = { sim: JSON.stringify(sim), cats: JSON.stringify(categorias), aj: JSON.stringify(ajustes) };
  const previas = sincronizado.preferencias || {};
  if (previas.sim !== preferencias.sim || previas.cats !== preferencias.cats || previas.aj !== preferencias.aj) {
    await api('/rest/v1/preferencias?on_conflict=usuario', { metodo: 'POST', cuerpo: { simulacion: sim, categorias, ajustes }, prefer: 'resolution=merge-duplicates,return=minimal' });
  }
  sincronizado = { ...actuales, tipos_cambio: tcs, preferencias };
  escribirJSON(CLAVE_SINCRONIZADO, sincronizado);
  if (hayCambios) avisoGuardado('Guardado', 2500);
}

async function sincronizar() {
  if (!sesion || !nubeLista) return;
  if (sincronizando) { otraVez = true; return; }
  sincronizando = true;
  otraVez = false;
  errorSync = null;
  pintarCuenta();
  try {
    await conCandado(CANDADO_SYNC, subirCambios);
  } catch (e) {
    errorSync = e;
    if (e.codigo === 'sin_sesion' || e.estado === 401) {
      cerrarSesionLocal();
      mostrarAcceso();
    } else if (e.codigo === 'sin_conexion') {
      setTimeout(sincronizar, 30000);
    }
  } finally {
    sincronizando = false;
    pintarCuenta();
    if (otraVez && !errorSync) sincronizar();
  }
}

// Trae todas las filas de una consulta en páginas de TAM_PAGINA (ordenadas para que no se repitan)
async function traerTodo(ruta, orden) {
  const filas = [];
  for (let desde = 0; ; desde += TAM_PAGINA) {
    const pagina = await api(`${ruta}&order=${orden}&limit=${TAM_PAGINA}&offset=${desde}`);
    filas.push(...pagina);
    if (pagina.length < TAM_PAGINA) return filas;
  }
}

async function descargarDeLaNube() {
  const [filas, tcs, prefs] = await Promise.all([
    Promise.all(ORDEN_TABLAS.map((t) => traerTodo(`/rest/v1/${t}?select=*`, 'id'))),
    traerTodo('/rest/v1/tipos_cambio?select=banco,fecha,compra,venta', 'banco,fecha'),
    api('/rest/v1/preferencias?select=simulacion,categorias,ajustes'),
  ]);
  return { ...Object.fromEntries(ORDEN_TABLAS.map((t, i) => [t, filas[i]])), tipos_cambio: tcs, preferencias: prefs };
}

// Pone en la web los datos de la nube; con `unir`, conserva además los locales que la nube no tiene
function aplicarNube(nube, unir) {
  const locales = { ...Object.fromEntries(ORDEN_TABLAS.map((t) => [t, TABLAS[t].lista()])), bcp: tiposCambio.bcp, interbank: tiposCambio.interbank };
  // Primero las tarjetas: los gastos y pagos las necesitan para validarse
  const tarjetasNube = nube.tarjetas.map(TABLAS.tarjetas.deFila).filter(Boolean);
  tarjetas = tarjetasNube;
  if (unir) tarjetas = tarjetas.concat(locales.tarjetas.filter((t) => !tarjetaDe(t.id)));
  const deNube = { tarjetas: tarjetasNube };
  for (const t of ORDEN_TABLAS.slice(1)) { // en orden: abonos y aportes se validan contra sus padres
    deNube[t] = nube[t].map(TABLAS[t].deFila).filter(Boolean);
    const ids = new Set(deNube[t].map((x) => x.id));
    TABLAS[t].poner(unir ? deNube[t].concat(locales[t].filter((x) => !ids.has(x.id))) : deNube[t]);
  }
  const tcNube = {};
  for (const banco of ['bcp', 'interbank']) {
    tcNube[banco] = nube.tipos_cambio.filter((f) => f.banco === banco).map(tcValido).filter(Boolean);
    const fechas = new Set(tcNube[banco].map((x) => x.fecha));
    tiposCambio[banco] = (unir ? tcNube[banco].concat(locales[banco].filter((x) => !fechas.has(x.fecha))) : tcNube[banco]).sort(porFecha);
  }
  const simNube = nube.preferencias[0]?.simulacion;
  if (simNube && Object.keys(simNube).length) sim = { ...sim, ...simNube };
  const catsNube = nube.preferencias[0]?.categorias;
  let catsConfirmadas;
  if (Array.isArray(catsNube) && catsNube.length) {
    const locales = categorias;
    categorias = normalizarCategorias(catsNube);
    catsConfirmadas = JSON.stringify(categorias);
    if (unir) categorias = normalizarCategorias(categorias.concat(locales));
  }

  const ajustesNube = nube.preferencias[0]?.ajustes;
  if (ajustesNube) ajustes = ajustesValidos(ajustesNube);

  // Lo que la nube tiene es lo ya sincronizado; lo local que se unió se subirá en la próxima sincronización
  const filas = (t, lista) => Object.fromEntries(lista.map((x) => {
    const f = TABLAS[t].aFila(x);
    return [f.id, JSON.stringify(f)];
  }));
  sincronizado = {
    ...Object.fromEntries(ORDEN_TABLAS.map((t) => [t, filas(t, deNube[t])])),
    tipos_cambio: Object.fromEntries(['bcp', 'interbank'].flatMap((banco) =>
      tcNube[banco].map((t) => [banco + '|' + t.fecha, JSON.stringify({ banco, ...t })]))),
    preferencias: { ...(simNube ? { sim: JSON.stringify(sim) } : {}), ...(catsConfirmadas ? { cats: catsConfirmadas } : {}), ...(ajustesNube ? { aj: JSON.stringify(ajustes) } : {}) },
  };
}

// Al abrir con sesión (o al iniciarla): decide qué hacer con la copia local y descarga la nube
async function iniciarNube() {
  const id = sesion.usuario.id;
  const dueno = leerJSON(CLAVE_DUENO, null);
  errorSync = null;
  pintarCuenta();
  try {
    if (dueno && dueno !== id) {
      borrarCopiaLocal(); // la copia local es de otra cuenta
    } else if (dueno === id && hayCambiosSinSubir()) {
      nubeLista = true; // cambios hechos sin conexión: se suben antes de descargar
      await sincronizar();
      if (errorSync) throw errorSync;
    }
    const unir = !dueno && [tarjetas, gastos, ingresos, pagos, deudas, metas].some((l) => l.length);
    let nubeVacia = false;
    await conCandado(CANDADO_SYNC, async () => {
      const nube = await descargarDeLaNube();
      nubeVacia = ORDEN_TABLAS.every((t) => !nube[t].length);
      if (dueno === id) {
        // Otra pestaña guardó mientras se descargaba: lo suyo se sube primero y no se pisa
        recargarDeLocal();
        if (hayCambiosSinSubir()) { nubeLista = true; return; }
      }
      aplicarNube(nube, unir);
      escribirJSON(CLAVE_DUENO, id);
      escribirJSON(CLAVE_SINCRONIZADO, sincronizado);
      nubeLista = true;
      guardarCopiaLocal();
    });
    ultimaDescarga = Date.now();
    actualizarPerfil();
    refrescarTodo();
    if (unir) {
      await sincronizar();
      if (!errorSync) {
        avisoNube(nubeVacia
          ? 'Tus datos de este navegador se subieron a tu cuenta.'
          : 'Tus datos de este navegador se unieron a tu cuenta.');
      }
    }
  } catch (e) {
    errorSync = e;
    if (e.codigo === 'sin_sesion' || e.estado === 401) {
      cerrarSesionLocal();
      mostrarAcceso();
    }
  }
  pintarCuenta();
}

// Guarda la copia local de todo (y programa la sincronización si hay cambios)
function guardarCopiaLocal() {
  guardar();
  guardarIngresos();
  guardarTarjetas();
  guardarPagos();
  escribirJSON(CLAVE_TC, tiposCambio);
  guardarSim();
  guardarCategorias();
  guardarAjustes();
  guardarDeudas();
  guardarMetas();
}

// Trae lo que cambió en otro dispositivo (al volver a la pestaña, como mucho una vez por minuto)
async function actualizarDesdeNube() {
  if (!sesion || !nubeLista || document.hidden || Date.now() - ultimaDescarga < ESPERA_DESCARGA) return;
  ultimaDescarga = Date.now();
  if (hayCambiosSinSubir()) {
    await sincronizar();
    if (errorSync) return;
  }
  // Solo para comparar: la nube no devuelve las filas en el mismo orden
  const huella = (o) => JSON.stringify(Object.keys(o).sort().map((t) => [t, Object.entries(o[t]).sort()]));
  try {
    const cambio = await conCandado(CANDADO_SYNC, async () => {
      const nube = await descargarDeLaNube();
      recargarDeLocal();
      if (!sesion || hayCambiosSinSubir()) return false; // se guardó algo mientras tanto: no se pisa
      const antes = huella(sincronizado);
      aplicarNube(nube, false);
      if (huella(sincronizado) === antes) return false;
      escribirJSON(CLAVE_SINCRONIZADO, sincronizado);
      guardarCopiaLocal();
      return true;
    });
    if (cambio) refrescarTodo();
  } catch (e) {
    if (e.codigo === 'sin_sesion' || e.estado === 401) {
      cerrarSesionLocal();
      mostrarAcceso();
    }
  }
}

// Vuelve a leer lo guardado en este navegador (lo pudo cambiar otra pestaña). No escribe nada.
function recargarDeLocal() {
  if (escrituraFallida) return;
  cargarTiposCambio();
  cargar();
  cargarIngresos();
  const guardadas = leerJSON(CLAVE_TARJETAS, []);
  tarjetas = Array.isArray(guardadas) ? guardadas.map(tarjetaValida).filter(Boolean) : [];
  for (const g of gastos) {
    g.medio = medioValido(g.medio);
    g.moneda = g.moneda === 'USD' ? 'USD' : 'PEN';
  }
  cargarPagos();
  cargarSim();
  cargarObjetivos();
  sincronizado = leerJSON(CLAVE_SINCRONIZADO, {});
}

function refrescarTodo() {
  for (const g of gastos) g.medio = medioValido(g.medio);
  // Lo que se estaba editando pudo eliminarse en otra pestaña
  if (editandoId && !gastos.some((x) => x.id === editandoId)) salirEdicion();
  if (ingEditandoId && !ingresos.some((x) => x.id === ingEditandoId)) salirEdicionIngreso();
  if (tarEditandoId && !tarjetaDe(tarEditandoId)) salirEdicionTarjeta();
  if (deuEditandoId && !deudaDe(deuEditandoId)) salirEdicionDeuda();
  if (metEditandoId && !metaDe(metEditandoId)) salirEdicionMeta();
  poblarMedios();
  poblarCategorias();
  render();
  renderVista();
}

async function cerrarSesion() {
  if (!confirmandoSalida) {
    confirmandoSalida = true;
    $('btn-cuenta').textContent = hayCambiosSinSubir() ? '¿Salir sin guardar? Pulsa otra vez' : '¿Cerrar sesión? Pulsa otra vez';
    setTimeout(() => { confirmandoSalida = false; pintarCuenta(); }, 3000);
    return;
  }
  confirmandoSalida = false;
  try { await api('/auth/v1/logout', { metodo: 'POST' }); } catch {}
  cerrarSesionLocal();
  borrarCopiaLocal();
  refrescarTodo();
  mostrarAcceso();
}

// Aviso breve arriba del contenido (se oculta solo a los 10 s)
function avisoNube(texto) {
  $('aviso-nube').textContent = texto;
  $('aviso-nube').classList.remove('hidden');
  setTimeout(() => $('aviso-nube').classList.add('hidden'), 10000);
}

// 'Ana María Pérez' → 'AP'
function iniciales(texto) {
  const palabras = texto.trim().split(/\s+/).filter(Boolean);
  return ((palabras[0]?.[0] || '') + (palabras.length > 1 ? palabras.at(-1)[0] : '')).toUpperCase();
}

// Aviso breve de guardado; con `ocultar` (ms) se va solo
function avisoGuardado(texto, ocultar = 0) {
  const caja = $('sync-estado');
  clearTimeout(esperaAvisoGuardado);
  caja.classList.remove('hidden', 'error', 'recordatorio');
  caja.removeAttribute('title');
  $('sync-reintentar').classList.add('hidden');
  $('sync-texto').textContent = texto;
  if (ocultar) esperaAvisoGuardado = setTimeout(() => caja.classList.add('hidden'), ocultar);
}

// Sin cuenta, cada cambio recuerda que solo queda en este navegador (desde un archivo no se puede entrar)
function recordarCuenta() {
  if (!appIniciada || location.protocol === 'file:') return;
  avisoGuardado('Inicia sesión para guardar tus cambios en tu cuenta.', 6000);
  $('sync-estado').classList.add('recordatorio');
  $('sync-reintentar').textContent = 'Iniciar sesión';
  $('sync-reintentar').classList.remove('hidden');
}

function pintarSync() {
  const caja = $('sync-estado');
  const recordatorio = caja.classList.contains('recordatorio');
  if (!sesion && recordatorio) return;
  if (sesion && errorSync) {
    avisoGuardado('Sin guardar');
    caja.classList.add('error');
    caja.title = errorSync.message;
    $('sync-reintentar').textContent = 'Reintentar';
    $('sync-reintentar').classList.remove('hidden');
  } else if (!sesion || recordatorio || caja.classList.contains('error')) {
    caja.classList.add('hidden');
    caja.classList.remove('error', 'recordatorio');
  }
}

function pintarCuenta() {
  // En la barra lateral, el nombre del usuario (o la parte de su correo antes de la @)
  const nombre = sesion ? sesion.usuario.nombre || sesion.usuario.correo.split('@')[0] : '';
  $('cuenta-nombre').textContent = nombre || 'Sin cuenta';
  $('avatar').textContent = nombre ? iniciales(nombre) : '';
  $('avatar').classList.toggle('hidden', !nombre);
  $('cuenta-correo').textContent = sesion ? sesion.usuario.correo : '';
  if (!confirmandoSalida) $('btn-cuenta').textContent = sesion ? 'Cerrar sesión' : 'Iniciar sesión';
  $('btn-cuenta').classList.toggle('principal', !sesion);
  pintarSync();
  $('cuenta-form').classList.toggle('hidden', !sesion);
  $('cuenta-sin').classList.toggle('hidden', !!sesion);
  if (sesion) {
    if (document.activeElement !== $('aj-nombre')) $('aj-nombre').value = sesion.usuario.nombre;
    $('aj-correo').textContent = sesion.usuario.correo;
  }
}

function mostrarAcceso(modo = 'entrar') {
  accesoModo = modo;
  pintarAcceso();
  $('sync-estado').classList.add('hidden');
  $('acceso').classList.remove('hidden');
  // Mientras está abierta, el resto de la página no recibe foco ni clics
  for (const el of document.querySelectorAll('.app')) el.inert = true;
  $('acceso-correo').focus();
}

function ocultarAcceso() {
  $('acceso').classList.add('hidden');
  for (const el of document.querySelectorAll('.app')) el.inert = false;
}

// Pinta la pantalla de acceso según accesoModo; `ok` muestra el mensaje como aviso y no como error
function pintarAcceso(mensaje = '', ok = false) {
  const m = accesoModo;
  const textos = {
    entrar: ['Inicia sesión', 'Tus finanzas, en cualquier dispositivo.', 'Entrar'],
    registro: ['Crea tu cuenta', 'Te enviaremos un correo para confirmarla.', 'Crear cuenta'],
    recuperar: ['Recupera tu contraseña', 'Te enviaremos un enlace para cambiarla.', 'Enviar enlace'],
    'nueva-clave': ['Nueva contraseña', 'Mínimo 8 caracteres.', 'Guardar'],
  }[m];
  $('acceso-titulo').textContent = textos[0];
  $('acceso-texto').textContent = textos[1];
  $('acceso-entrar').textContent = textos[2];
  const conCorreo = m !== 'nueva-clave', conClave = m !== 'recuperar';
  $('acceso-nombre-campo').classList.toggle('hidden', m !== 'registro');
  $('acceso-nombre').required = m === 'registro';
  $('acceso-correo-campo').classList.toggle('hidden', !conCorreo);
  $('acceso-correo').required = conCorreo;
  $('acceso-clave-campo').classList.toggle('hidden', !conClave);
  $('acceso-clave').required = conClave;
  $('acceso-clave-label').textContent = m === 'nueva-clave' ? 'Nueva contraseña' : 'Contraseña';
  const repetir = m === 'registro' || m === 'nueva-clave';
  $('acceso-clave2-campo').classList.toggle('hidden', !repetir);
  $('acceso-clave2').required = repetir;
  // Al cambiar de pantalla la contraseña vuelve a ocultarse (no al mostrar un mensaje o un error)
  if (m !== modoPintado) verClave(false);
  modoPintado = m;
  $('acceso-clave').autocomplete = m === 'entrar' ? 'current-password' : 'new-password';
  // En «entrar» no se exige el mínimo: las cuentas antiguas pueden tener contraseñas más cortas
  $('acceso-clave').minLength = m === 'entrar' ? 1 : 8;
  const otros = m === 'entrar' || m === 'registro';
  for (const id of ['acceso-separador', 'acceso-google']) $(id).classList.toggle('hidden', !otros);
  $('acceso-olvido').classList.toggle('hidden', m !== 'entrar');
  $('acceso-local').classList.toggle('hidden', m === 'nueva-clave');
  $('acceso-pie').classList.toggle('hidden', m === 'nueva-clave');
  $('acceso-alternar-texto').textContent = m === 'entrar' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?';
  $('acceso-alternar').textContent = m === 'entrar' ? 'Crear cuenta' : 'Inicia sesión';
  $('acceso-msg').textContent = mensaje;
  $('acceso-msg').classList.toggle('error', !ok);
  $('acceso-msg').classList.toggle('hidden', !mensaje);
}

// Muestra u oculta lo escrito en los campos de contraseña de la pantalla de acceso
function verClave(mostrar) {
  for (const id of ['acceso-clave', 'acceso-clave2']) $(id).type = mostrar ? 'text' : 'password';
  const b = $('ver-clave');
  b.textContent = mostrar ? 'Ocultar' : 'Ver';
  b.setAttribute('aria-label', mostrar ? 'Ocultar contraseña' : 'Mostrar contraseña');
  b.setAttribute('aria-pressed', String(mostrar));
}

// ---- Persistencia ----
function cargar() {
  try {
    const datos = JSON.parse(localStorage.getItem(CLAVE));
    gastos = Array.isArray(datos) ? datos : [];
  } catch {
    gastos = [];
  }
}

function guardar() {
  escribirJSON(CLAVE, gastos);
  programarSync();
}

// ---- CRUD ----
function leerFormulario() {
  return {
    descripcion: $('descripcion').value.trim(),
    importe: redondear(parseFloat($('importe').value)),
    moneda: $('moneda').value === 'USD' ? 'USD' : 'PEN',
    categoria: categoriaElegida(),
    medio: medioValido($('medio').value),
    fecha: $('fecha').value,
  };
}

function crear(datos) {
  gastos.push({ id: nuevoId(), ...datos });
}

function actualizar(id, datos) {
  const g = gastos.find((x) => x.id === id);
  if (g) Object.assign(g, datos);
}

function eliminar(id) {
  gastos = gastos.filter((x) => x.id !== id);
  if (editandoId === id) salirEdicion();
  guardar();
  render();
}

function editar(id) {
  const g = gastos.find((x) => x.id === id);
  if (!g) return;
  editandoId = id;
  $('descripcion').value = g.descripcion;
  $('importe').value = g.importe;
  $('moneda').value = g.moneda;
  fijarCategoria(g.categoria);
  $('medio').value = g.medio;
  $('fecha').value = g.fecha;
  $('form-titulo').textContent = 'Editar gasto';
  $('btn-guardar').textContent = 'Guardar cambios';
  $('btn-cancelar').classList.remove('hidden');
  form.scrollIntoView({ behavior: desplazamiento(), block: 'center' });
  $('descripcion').focus();
  render();
}

function salirEdicion() {
  editandoId = null;
  form.reset();
  fijarCategoria();
  $('fecha').value = hoyISO();
  $('form-titulo').textContent = 'Nuevo gasto';
  $('btn-guardar').textContent = 'Añadir gasto';
  $('btn-cancelar').classList.add('hidden');
}

// ---- Render de la lista ----
function celda(fila, etiqueta, contenido, clase) {
  const td = document.createElement('td');
  td.dataset.label = etiqueta;
  if (clase) td.className = clase;
  if (contenido instanceof Node) td.appendChild(contenido);
  else td.textContent = contenido;
  fila.appendChild(td);
  return td;
}

function boton(texto, titulo, onClick, clase = '') {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'icon-btn ' + clase;
  b.textContent = texto;
  b.title = titulo;
  b.setAttribute('aria-label', titulo);
  b.addEventListener('click', onClick);
  return b;
}

// Círculo de color con el ícono; `clase` = chico | grande
function iconoCategoria(icono, color, clase = '') {
  const caja = document.createElement('span');
  caja.className = `icono-cat c-${color} ${clase}`;
  const s = svgEl('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true' });
  s.append(svgEl('path', { d: ICONOS[icono] || ICONOS.otros }));
  caja.append(s);
  return caja;
}

function categoriaDe(nombre) {
  return categorias.find((x) => x.nombre === nombre) || { nombre, icono: 'otros', color: 'gris' };
}

function etiquetaCategoria(nombre) {
  const c = categoriaDe(nombre);
  const chip = document.createElement('span');
  chip.className = 'cat-chip';
  const texto = document.createElement('span');
  texto.textContent = c.nombre;
  chip.append(iconoCategoria(c.icono, c.color, 'chico'), texto);
  return chip;
}

// Las tarjetas registradas se resaltan con etiqueta; el resto de medios va como texto
function etiquetaMedio(m) {
  const t = tarjetaDe(m);
  if (!t) return MEDIOS_FIJOS[m];
  return etiquetaTarjeta(t);
}

function etiquetaTarjeta(t) {
  const tag = document.createElement('span');
  tag.className = 'tag tag-tarjeta';
  tag.textContent = t.nombre;
  return tag;
}

function render() {
  pintarNotaMedio();
  // Resumen
  const mesActual = hoyISO().slice(0, 7);
  const total = sumar(gastos);
  const delMes = sumar(gastos.filter((g) => g.fecha.startsWith(mesActual)));
  $('total').textContent = soles.format(total);
  $('mes').textContent = soles.format(delMes);
  $('side-mes').textContent = soles.format(delMes);
  $('registros').textContent = gastos.length;

  // Balance del mes en la barra lateral (solo si el usuario registra ingresos)
  const [anioHoy, mesHoy] = mesActual.split('-').map(Number);
  const balance = cifrasPeriodo(mesActual + '-01', isoDia(new Date(anioHoy, mesHoy, 0))).ahorro;
  $('side-balance-caja').classList.toggle('hidden', !ingresos.length);
  $('side-balance').textContent = soles.format(balance);
  $('side-balance').className = balance >= 0 ? 'ok' : 'mal';

  // Sin ningún tipo de cambio, los importes en dólares no se pueden sumar en soles
  const hayDolares = gastos.some((g) => g.moneda === 'USD') || ingresos.some((i) => i.moneda === 'USD');
  const sinTC = !tiposCambio.bcrp.length && !tiposCambio.bcp.length && !tiposCambio.interbank.length;
  $('aviso-tc').classList.toggle('hidden', !(hayDolares && sinTC));
  $('aviso-tc').textContent = 'Hay importes en dólares sin tipo de cambio. Regístralo en Tarjetas.';

  // Filtro y orden
  const texto = $('buscar').value.trim().toLowerCase();
  const cat = $('filtro-categoria').value;
  const medio = $('filtro-medio').value;
  const [campo, dir] = $('orden').value.split('-');
  const signo = dir === 'asc' ? 1 : -1;

  const lista = gastos
    .filter((g) => (!cat || g.categoria === cat) && (!medio || g.medio === medio) && g.descripcion.toLowerCase().includes(texto))
    .sort((a, b) => {
      // El importe se compara en soles para ordenar juntos soles y dólares
      const va = campo === 'importe' ? enSoles(a) : a[campo];
      const vb = campo === 'importe' ? enSoles(b) : b[campo];
      return (va < vb ? -1 : va > vb ? 1 : 0) * signo;
    });

  // Tabla
  const tbody = $('tabla');
  tbody.replaceChildren();
  for (const g of lista) {
    const tr = document.createElement('tr');
    if (g.id === editandoId) tr.classList.add('editando');

    celda(tr, 'Fecha', formatearFecha(g.fecha), 'fecha');
    celda(tr, 'Descripción', g.descripcion);
    celda(tr, 'Categoría', etiquetaCategoria(g.categoria));
    celda(tr, 'Pago', etiquetaMedio(g.medio), 'pago');
    celda(tr, 'Importe', dinero(g.importe, g.moneda), 'num');

    const acciones = celda(tr, '', '', 'acciones');
    acciones.appendChild(boton('Editar', 'Editar gasto', () => editar(g.id)));
    if (confirmandoId === g.id) {
      acciones.appendChild(boton('¿Eliminar?', 'Confirmar eliminación', () => { confirmandoId = null; eliminar(g.id); }, 'confirmar'));
    } else {
      acciones.appendChild(boton('Eliminar', 'Eliminar gasto', () => {
        confirmandoId = g.id;
        render();
        // Cancela la confirmación si no se pulsa en 3 segundos
        setTimeout(() => { if (confirmandoId === g.id) { confirmandoId = null; render(); } }, 3000);
      }));
    }
    tbody.appendChild(tr);
  }

  // Estado vacío
  const sinResultados = lista.length === 0;
  $('vacio').classList.toggle('hidden', !sinResultados);
  $('tabla-gastos').classList.toggle('hidden', sinResultados);
  $('vacio-texto').textContent = gastos.length === 0
    ? 'Aún no hay gastos. ¡Añade el primero!'
    : 'No hay gastos que coincidan con la búsqueda.';
}

// ---- Tooltip compartido ----
const tip = $('tooltip');

// lineas: [{ valor, texto, clave }] — valor en negrita, texto secundario, clave = clase de color
function mostrarTip(x, y, titulo, lineas) {
  const nodos = [];
  const t = document.createElement('div');
  t.textContent = titulo;
  nodos.push(t);
  for (const l of lineas) {
    const d = document.createElement('div');
    if (l.clave) {
      const k = document.createElement('span');
      k.className = 'clave ' + l.clave;
      d.appendChild(k);
    }
    const v = document.createElement('strong');
    v.textContent = l.valor;
    d.appendChild(v);
    if (l.texto) d.appendChild(document.createTextNode(' ' + l.texto));
    nodos.push(d);
  }
  tip.replaceChildren(...nodos);
  tip.classList.remove('hidden');
  const r = tip.getBoundingClientRect();
  let left = x + 14, top = y + 14;
  if (left + r.width > innerWidth - 8) left = x - r.width - 14;
  if (top + r.height > innerHeight - 8) top = y - r.height - 14;
  tip.style.left = Math.max(8, left) + 'px';
  tip.style.top = Math.max(8, top) + 'px';
}

function ocultarTip() {
  tip.classList.add('hidden');
}

// Conecta hover y foco de teclado de un elemento a un tooltip
function conTooltip(el, titulo, lineas, alActivar) {
  el.addEventListener('pointermove', (e) => { alActivar?.(true); mostrarTip(e.clientX, e.clientY, titulo, lineas); });
  el.addEventListener('pointerleave', () => { alActivar?.(false); ocultarTip(); });
  el.addEventListener('focus', () => {
    const r = el.getBoundingClientRect();
    alActivar?.(true);
    mostrarTip(r.left + r.width / 2, r.top, titulo, lineas);
  });
  el.addEventListener('blur', () => { alActivar?.(false); ocultarTip(); });
}

// ---- Gráficos SVG ----
const SVG_NS = 'http://www.w3.org/2000/svg';
function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

function svgTexto(x, y, contenido, clase, ancla = 'start') {
  const t = svgEl('text', { x, y, class: clase, 'text-anchor': ancla });
  t.textContent = contenido;
  return t;
}

// Escala con marcas "redondas" entre min y max
function escala(min, max, marcas = 4) {
  if (max - min < 1e-9) max = min + 1;
  const bruto = (max - min) / marcas;
  const mag = 10 ** Math.floor(Math.log10(bruto));
  const f = bruto / mag;
  const paso = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag;
  const lo = Math.floor(min / paso) * paso;
  const hi = Math.ceil(max / paso) * paso;
  const ticks = [];
  for (let v = lo; v <= hi + paso / 2; v += paso) ticks.push(Math.round(v * 1e6) / 1e6);
  return { lo, hi, ticks };
}

// Barra con extremo superior redondeado (4px) y base recta
function barraPath(x, y, w, h, r = 4) {
  r = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

// datos: [{ etiqueta, titulo, valor, destacar }]
function graficoBarras(cont, datos) {
  cont.replaceChildren();
  const W = cont.clientWidth;
  if (!W) return;
  const H = 240, m = { t: 22, r: 8, b: 28, l: 62 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const max = Math.max(0, ...datos.map((d) => d.valor));
  const { hi, ticks } = escala(0, max);
  const y = (v) => m.t + ih - (v / hi) * ih;

  const s = svgEl('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Gráfico de barras de gastos' });
  for (const t of ticks) {
    if (t > 0) s.append(svgEl('line', { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), class: 'g-grid' }));
    s.append(svgTexto(m.l - 8, y(t) + 4, compacto.format(t), 'g-texto', 'end'));
  }

  const banda = iw / datos.length;
  const bw = Math.max(2, Math.min(36, banda - 2, banda * 0.65));
  // Etiquetas del eje X sin solaparse
  const cada = Math.ceil(datos.length / Math.max(1, Math.floor(iw / 44)));

  datos.forEach((d, i) => {
    const cx = m.l + banda * i + banda / 2;
    const h = y(0) - y(d.valor);
    let barra = null;
    if (h > 0.5) {
      barra = svgEl('path', { d: barraPath(cx - bw / 2, y(d.valor), bw, h), class: 'g-barra' });
      s.append(barra);
    }
    if (i % cada === 0 || d.destacar) s.append(svgTexto(cx, H - 8, d.etiqueta, 'g-texto', 'middle'));
    if (d.destacar && d.valor > 0) s.append(svgTexto(cx, y(d.valor) - 7, compacto.format(d.valor), 'g-etiqueta', 'middle'));

    const hit = svgEl('rect', { x: m.l + banda * i, y: m.t, width: banda, height: ih, class: 'g-hit', tabindex: 0 });
    hit.setAttribute('aria-label', `${d.titulo}: ${soles.format(d.valor)}`);
    conTooltip(hit, d.titulo, [{ valor: soles.format(d.valor) }], (on) => barra?.classList.toggle('activa', on));
    s.append(hit);
  });
  s.append(svgEl('line', { x1: m.l, x2: W - m.r, y1: y(0), y2: y(0), class: 'g-base' }));
  cont.append(s);
}

// series: [{ nombre, n (1|2), valores[] }], etiquetas: textos del eje X, meta opcional
function graficoLineas(cont, etiquetas, series, meta) {
  cont.replaceChildren();
  const W = cont.clientWidth;
  if (!W) return;
  const H = 260, m = { t: 16, r: 84, b: 28, l: 62 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const n = etiquetas.length - 1;
  const todos = series.flatMap((s) => s.valores).concat(meta ? [meta] : []);
  const { lo, hi, ticks } = escala(Math.min(0, ...todos), Math.max(0, ...todos));
  const x = (k) => m.l + (n ? (k / n) * iw : 0);
  const y = (v) => m.t + ih - ((v - lo) / (hi - lo)) * ih;

  const s = svgEl('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Gráfico de proyección' });
  for (const t of ticks) {
    if (t !== 0) s.append(svgEl('line', { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), class: 'g-grid' }));
    s.append(svgTexto(m.l - 8, y(t) + 4, compacto.format(t), 'g-texto', 'end'));
  }
  s.append(svgEl('line', { x1: m.l, x2: W - m.r, y1: y(0), y2: y(0), class: 'g-base' }));

  const cada = Math.ceil(etiquetas.length / Math.max(1, Math.floor(iw / 44)));
  etiquetas.forEach((e, k) => {
    if (k % cada === 0 || k === n) s.append(svgTexto(x(k), H - 8, e, 'g-texto', 'middle'));
  });

  if (meta) {
    s.append(svgEl('line', { x1: m.l, x2: W - m.r, y1: y(meta), y2: y(meta), class: 'g-meta' }));
    s.append(svgTexto(m.l + 4, y(meta) - 6, 'Meta ' + compacto.format(meta), 'g-texto'));
  }

  for (const serie of series) {
    const d = serie.valores.map((v, k) => (k ? 'L' : 'M') + x(k) + ',' + y(v)).join('');
    s.append(svgEl('path', { d, class: 'g-linea c' + serie.n }));
  }

  // Etiquetas directas al final de cada línea, separadas si chocan
  const finales = series.map((serie) => ({ serie, y: y(serie.valores[n]) }));
  if (finales.length === 2 && Math.abs(finales[0].y - finales[1].y) < 16) {
    const medio = (finales[0].y + finales[1].y) / 2;
    const [arriba, abajo] = finales[0].y <= finales[1].y ? finales : [finales[1], finales[0]];
    arriba.y = medio - 8;
    abajo.y = medio + 8;
  }
  for (const f of finales) s.append(svgTexto(x(n) + 8, f.y + 4, f.serie.nombre, 'g-etiqueta'));

  // Cruceta + puntos que siguen al puntero
  const cruz = svgEl('line', { y1: m.t, y2: m.t + ih, class: 'g-cruz', visibility: 'hidden' });
  const puntos = series.map((serie) => svgEl('circle', { r: 4, class: 'g-punto f' + serie.n, visibility: 'hidden' }));
  s.append(cruz, ...puntos);

  const capa = svgEl('rect', { x: m.l, y: m.t, width: iw, height: ih, class: 'g-hit' });
  capa.addEventListener('pointermove', (e) => {
    const r = s.getBoundingClientRect();
    const k = Math.max(0, Math.min(n, Math.round(((e.clientX - r.left - m.l) / iw) * n)));
    cruz.setAttribute('x1', x(k));
    cruz.setAttribute('x2', x(k));
    cruz.setAttribute('visibility', 'visible');
    series.forEach((serie, i) => {
      puntos[i].setAttribute('cx', x(k));
      puntos[i].setAttribute('cy', y(serie.valores[k]));
      puntos[i].setAttribute('visibility', 'visible');
    });
    mostrarTip(e.clientX, e.clientY, k === 0 ? 'Hoy' : `Dentro de ${k} ${k === 1 ? 'mes' : 'meses'}`,
      series.map((serie) => ({ valor: soles.format(serie.valores[k]), texto: serie.nombre, clave: 'b' + serie.n })));
  });
  capa.addEventListener('pointerleave', () => {
    cruz.setAttribute('visibility', 'hidden');
    puntos.forEach((p) => p.setAttribute('visibility', 'hidden'));
    ocultarTip();
  });
  s.append(capa);
  cont.append(s);
}

// ---- Ingresos y balance ----
// Cada ingreso: { id, descripcion, importe, fecha }. El balance se calcula sobre un rango de fechas:
//   ahorro            = ingresos − todos los gastos (también los hechos con tarjeta)
//   cambio de dinero  = ingresos − gastos que no son con tarjeta − pagos de tarjeta
// La diferencia entre ambos es lo que subió o bajó la deuda de tarjetas en el periodo.
let ingEditandoId = null;
let ingConfirmandoId = null;

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
  const gas = gastosDeCuenta(desde, hasta);
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

// Deuda de todas las tarjetas al cierre de la fecha: compras − pagos (negativa = saldo a favor)
// Deuda de todas las tarjetas al cierre de la fecha, por moneda: compras − abonos (negativa = a favor)
function deudaAl(fecha) {
  const d = montos();
  for (const g of gastos) if (g.fecha <= fecha && tarjetaDe(g.medio)) d[g.moneda] += g.importe;
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
  $('ing-form').scrollIntoView({ behavior: desplazamiento(), block: 'center' });
  $('ing-descripcion').focus();
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

// Monto con signo, en verde si suma y en rojo si resta (solo en los totales)
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
  $('bal-ingresos-sub').textContent = ingPeriodo.length
    ? `${ingPeriodo.length} ${ingPeriodo.length === 1 ? 'registro' : 'registros'}`
    : 'Sin ingresos registrados';

  $('bal-gastos').textContent = soles.format(c.gastos);
  const subGastos = [];
  if (c.ingresos && c.gastos) subGastos.push(`${pct(c.gastos)} de tus ingresos`);
  if (c.conTarjeta) subGastos.push(`${soles.format(c.conTarjeta)} con tarjeta`);
  if (c.porVencer) subGastos.push(`${soles.format(c.porVencer)} se pagan después`);
  $('bal-gastos-sub').textContent = subGastos.join(' · ') ||
    (gasPeriodo.length ? `${gasPeriodo.length} registros` : 'Sin gastos');

  // Días que quedan del periodo contando hoy (0 si el periodo ya terminó o no ha empezado)
  const quedan = hoy >= desde && hoy <= hasta ? diasHasta(hasta) + 1 : 0;
  const res = $('bal-res'), resSub = $('bal-res-sub');
  res.textContent = soles.format(c.ahorro);
  res.className = 'valor' + (c.ingresos ? (c.ahorro >= 0 ? ' ok' : ' mal') : '');
  resSub.className = 'sub';
  if (!c.ingresos) {
    $('bal-res-label').textContent = 'Ahorro';
    resSub.textContent = c.gastos ? 'Registra tus ingresos para ver si estás en pérdida' : 'Sin movimientos';
  } else if (c.ahorro >= 0) {
    $('bal-res-label').textContent = quedan ? 'Te queda' : 'Ahorraste';
    resSub.textContent = quedan > 1
      ? `≈ ${soles.format(c.ahorro / quedan)} por día hasta el ${fechaCorta(hasta)}`
      : `El ${pct(c.ahorro)} de tus ingresos`;
  } else {
    $('bal-res-label').textContent = quedan ? 'Vas en pérdida' : 'Pérdida';
    resSub.className = 'sub mal';
    resSub.textContent = `Gastas ${soles.format(-c.ahorro)} más de lo que ingresas`;
  }

  const caja = $('bal-caja');
  const hayMovimientos = ingPeriodo.length || gasPeriodo.length || pagPeriodo.length;
  caja.textContent = conSigno(c.dinero);
  caja.className = 'valor' + (hayMovimientos && c.dinero ? (c.dinero > 0 ? ' ok' : ' mal') : '');
  $('bal-caja-sub').textContent = c.hayDolares
    ? `En soles ${conSigno(c.dineroPor.PEN)} · en dólares ${conSigno(c.dineroPor.USD, 'USD')}`
    : c.pagos ? `Incluye ${soles.format(c.pagos)} en pagos de tarjeta` : 'Lo que entró menos lo que salió de tus cuentas';

  // Cuadre: del cambio en tu dinero al ahorro, pasando por la deuda de tarjetas
  $('bal-rango').textContent = `Del ${formatearFecha(desde)} al ${formatearFecha(hasta)}` +
    (c.hayDolares ? ' · dólares convertidos a soles' : '');
  $('bal-nota').textContent = ajustes.compras === 'vence'
    ? 'Las compras con tarjeta cuentan cuando vence su pago; tu dinero sale al pagarlas.'
    : 'Las compras con tarjeta son gasto al comprar; tu dinero sale al pagar la tarjeta.';
  const cuadre = $('bal-cuadre'), cuadre2 = $('bal-cuadre-2');
  cuadre.replaceChildren();
  cuadre2.replaceChildren();
  const hayTarjetas = tarjetas.length > 0 || c.pagos > 0;
  filaCuadre(cuadre, 'Ingresos', '', conSigno(c.ingresos));
  filaCuadre(cuadre, 'Gastos pagados al momento', hayTarjetas ? 'Efectivo o débito' : '', conSigno(-c.sinTarjeta));
  if (hayTarjetas) filaCuadre(cuadre, 'Pagos de tarjetas', '', conSigno(-c.pagos));
  if (c.abonos) filaCuadre(cuadre, 'Abonos a otras deudas', '', conSigno(-c.abonos));
  filaCuadre(cuadre, 'Cambio en tu dinero', '', montoConSigno(c.dinero, true), true);
  if (hayTarjetas) {
    filaCuadre(cuadre2, 'Cambio en tu dinero', '', conSigno(c.dinero));
    filaCuadre(cuadre2, ajustes.compras === 'vence' ? 'Compras que vencen en el periodo' : 'Compras con tus tarjetas',
      ajustes.compras === 'vence' ? 'Las hiciste antes o en el periodo' : 'Suben tu deuda', conSigno(-c.conTarjeta));
    filaCuadre(cuadre2, 'Pagos de tarjetas', 'Bajan tu deuda; no son gasto', conSigno(c.pagos));
    if (c.abonos) filaCuadre(cuadre2, 'Abonos a otras deudas', 'No son gasto', conSigno(c.abonos));
  } else {
    filaCuadre(cuadre2, 'Ingresos', '', conSigno(c.ingresos));
    filaCuadre(cuadre2, 'Gastos', '', conSigno(-c.gastos));
  }
  filaCuadre(cuadre2, 'Ahorro del periodo', '', montoConSigno(c.ahorro, true), true);
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
      fecha: i.fecha, descripcion: i.descripcion, tipo: 'Ingreso', importe: i.importe, moneda: i.moneda, efecto: i.importe, ingreso: i,
    })),
    ...gasPeriodo.map((g) => ({
      fecha: fechaDeCuenta(g),
      descripcion: g.descripcion + (fechaDeCuenta(g) !== g.fecha ? ` (compra del ${fechaCorta(g.fecha)})` : ''),
      tipo: 'Gasto · ' + nombreMedio(g.medio), importe: g.importe, moneda: g.moneda,
      efecto: tarjetaDe(g.medio) ? null : -g.importe,
    })),
    ...pagPeriodo.map((x) => ({
      fecha: x.fecha,
      descripcion: 'Pago a ' + tarjetaDe(x.tarjeta).nombre + (x.moneda !== x.pagadoMoneda ? ` (abona ${dinero(x.importe, x.moneda)})` : ''),
      tipo: x.moneda === 'USD' ? 'Pago de tarjeta · deuda en dólares' : 'Pago de tarjeta',
      importe: x.pagado, moneda: x.pagadoMoneda, efecto: -x.pagado,
    })),
    ...entre(abonos, desde, hasta).map((x) => {
      const d = deudaDe(x.deuda);
      return { fecha: x.fecha, descripcion: 'Abono a ' + d.nombre, tipo: 'Abono a deuda', importe: x.importe, moneda: d.moneda, efecto: -x.importe };
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
    let efecto;
    if (mov.efecto === null) {
      efecto = document.createElement('span');
      efecto.className = 'estado';
      efecto.textContent = 'A tu deuda';
    } else {
      efecto = montoConSigno(mov.efecto, mov.efecto > 0, mov.moneda);
    }
    celda(tr, 'En tu dinero', efecto, 'num');
    const acciones = celda(tr, '', '', 'acciones');
    const i = mov.ingreso;
    if (i) {
      acciones.appendChild(boton('Editar', 'Editar ingreso', () => editarIngreso(i.id)));
      if (ingConfirmandoId === i.id) {
        acciones.appendChild(boton('¿Eliminar?', 'Confirmar eliminación', () => { ingConfirmandoId = null; eliminarIngreso(i.id); }, 'confirmar'));
      } else {
        acciones.appendChild(boton('Eliminar', 'Eliminar ingreso', () => {
          ingConfirmandoId = i.id;
          renderBalance();
          // Cancela la confirmación si no se pulsa en 3 segundos
          setTimeout(() => { if (ingConfirmandoId === i.id) { ingConfirmandoId = null; renderBalance(); } }, 3000);
        }));
      }
    }
    tbody.appendChild(tr);
  }
  $('tabla-movs').classList.toggle('hidden', !movs.length);
  $('movs-vacio').classList.toggle('hidden', movs.length > 0);

  // Historial: últimos 12 meses
  const hist = $('bal-historial');
  hist.replaceChildren();
  for (const mes of mesesBalance().slice(0, 12)) {
    const [a, m] = mes.split('-').map(Number);
    const h = cifrasPeriodo(mes + '-01', isoDia(new Date(a, m, 0)));
    const tr = document.createElement('tr');
    celda(tr, 'Mes', nombreMes(mes));
    celda(tr, 'Ingresos', soles.format(h.ingresos), 'num');
    celda(tr, 'Gastos', soles.format(h.gastos), 'num');
    celda(tr, 'Pagos de tarjetas', soles.format(h.pagos), 'num');
    celda(tr, 'Ahorro', montoConSigno(h.ahorro, h.ingresos > 0), 'num');
    celda(tr, 'Cambio en tu dinero', montoConSigno(h.dinero, true), 'num');
    hist.appendChild(tr);
  }
}

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
    ...conCiclo.map((t) => new Option(`Por ciclo de ${t.nombre}`, t.id)),
    new Option('Por mes calendario', 'mes'),
  );
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
  if (p === 'todo') for (const g of gastos) primero = Math.min(primero, indiceDash(t, g.fecha));
  const lista = [];
  for (let n = primero; n <= actual; n++) lista.push(periodoDash(t, n));
  return lista;
}

function renderDashboard() {
  const base = baseDashboard();
  const periodos = periodosDash(base, $('dash-periodo').value);
  const medio = $('dash-medio').value;
  const desde = periodos[0].desde, hasta = periodos[periodos.length - 1].hasta;
  const delMedio = gastos.filter((g) => !medio || g.medio === medio);
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
  return c in sim.bases ? sim.bases[c] : basesCalculadas[c];
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

// ---- Tarjetas de crédito ----
// Cada tarjeta: { id, nombre, corte, pago, linea }
// corte/pago: día del mes (1–31) o null; linea: S/ (0 = sin indicar)
// Cada pago: { id, tarjeta, importe, fecha }. Deuda = compras con la tarjeta − pagos;
// los pagos se asignan a los ciclos del más antiguo al más reciente.
let tarSeleccion = null;
let tarEditandoId = null;
let tarConfirmandoId = null;
let pagoConfirmandoId = null;
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
  const banco = BANCOS[t.banco] ? t.banco : /bcp/i.test(nombre) ? 'bcp' : /interbank/i.test(nombre) ? 'interbank' : 'otro';
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

// Ciclos de la tarjeta con consumos más el actual, de más reciente a más antiguo,
// con lo pagado y lo pendiente de cada uno
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
  const indices = Object.keys(porCiclo).map(Number).concat(actual);
  const ciclos = [];
  for (let n = Math.max(...indices); n >= Math.min(...indices); n--) {
    const lista = porCiclo[n] || [];
    if (!lista.length && n !== actual) continue;
    const c = cicloDe(n, t);
    c.total = montos();
    for (const g of lista) c.total[g.moneda] = redondear(c.total[g.moneda] + g.importe);
    c.consumos = lista.length;
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

// Cifras de una tarjeta; sin corte ni pago solo se conoce la deuda (ciclos = null)
// Cifras de una tarjeta por moneda; sin corte ni pago solo se conoce la deuda (ciclos = null).
// La línea de crédito es en soles: la deuda en dólares la usa al tipo de cambio de venta del banco.
function resumenTarjeta(t) {
  const deuda = montos();
  for (const g of gastos) if (g.medio === t.id) deuda[g.moneda] += g.importe;
  for (const x of pagosDe(t)) deuda[x.moneda] -= x.importe;
  deuda.PEN = redondear(deuda.PEN);
  deuda.USD = redondear(deuda.USD);
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
  for (const g of gastos) if (g.medio === id) { g.medio = 'credito'; n++; }
  pagos = pagos.filter((p) => p.tarjeta !== id);
  tarjetas = tarjetas.filter((x) => x.id !== id);
  if (tarEditandoId === id) salirEdicionTarjeta();
  if (tarSeleccion === id) tarSeleccion = null;
  guardar();
  guardarPagos();
  tarjetasCambiadas();
  mensajeTarjeta(`Tarjeta ${t.nombre} eliminada.` + (n ? ` Sus gastos pasaron a «${MEDIOS_FIJOS.credito}».` : ''));
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
    if (tarConfirmandoId === t.id) {
      acciones.appendChild(boton('¿Eliminar?', `Confirmar: eliminar ${t.nombre}`, () => {
        tarConfirmandoId = null;
        eliminarTarjeta(t.id);
      }, 'confirmar'));
    } else {
      acciones.appendChild(boton('Eliminar', `Eliminar ${t.nombre}`, () => {
        tarConfirmandoId = t.id;
        renderTarjeta();
        // Cancela la confirmación si no se pulsa en 3 segundos
        setTimeout(() => { if (tarConfirmandoId === t.id) { tarConfirmandoId = null; renderTarjeta(); } }, 3000);
      }));
    }
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
  $('tar-det-titulo').textContent = `Ciclos y pagos de ${t.nombre}`;
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
    if (pagoConfirmandoId === p.id) {
      acciones.appendChild(boton('¿Eliminar?', 'Confirmar eliminación del pago', () => {
        pagoConfirmandoId = null;
        pagos = pagos.filter((x) => x.id !== p.id);
        pagosCambiados();
      }, 'confirmar'));
    } else {
      acciones.appendChild(boton('Eliminar', 'Eliminar pago', () => {
        pagoConfirmandoId = p.id;
        renderTarjeta();
        setTimeout(() => { if (pagoConfirmandoId === p.id) { pagoConfirmandoId = null; renderTarjeta(); } }, 3000);
      }));
    }
    tPagos.appendChild(tr);
  }
  $('tabla-pagos').classList.toggle('hidden', !lista.length);
  $('pagos-vacio').classList.toggle('hidden', lista.length > 0);

  const r = resumenTarjeta(t);
  $('tar-aviso').classList.toggle('hidden', !!r.ciclos);
  $('tar-resumen').classList.toggle('hidden', !r.ciclos);
  $('tar-ciclos-card').classList.toggle('hidden', !r.ciclos);
  if (!r.ciclos) return;

  $('tar-apagar').textContent = textoMontos(r.aPagar);
  const [venceTexto, venceClase] = textoVencimiento(r.proximo);
  $('tar-apagar-sub').className = 'sub ' + venceClase;
  $('tar-apagar-sub').textContent = venceTexto;

  $('tar-curso').textContent = textoMontos(r.actual.total);
  $('tar-curso-sub').textContent = `Cierra el ${formatearFecha(r.actual.hasta)} · se paga hasta el ${formatearFecha(r.actual.vence)}`;

  $('tar-deuda').textContent = textoMontos({ PEN: Math.max(r.deuda.PEN, 0), USD: Math.max(r.deuda.USD, 0) });
  const subDeuda = $('tar-deuda-sub');
  subDeuda.className = 'sub';
  const favor = { PEN: Math.max(-r.deuda.PEN, 0), USD: Math.max(-r.deuda.USD, 0) };
  if (!sinMonto(favor)) {
    subDeuda.className = 'sub ok';
    subDeuda.textContent = `Tienes ${textoMontos(favor)} a favor`;
  } else if (r.disponible !== null) {
    subDeuda.className = 'sub' + (r.disponible < 0 ? ' mal' : '');
    subDeuda.textContent = `Disponible ${soles.format(r.disponible)} de ${soles.format(t.linea)}`;
  } else {
    subDeuda.textContent = 'Compras con la tarjeta menos tus pagos';
  }

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
    ciclos.appendChild(tr);
  }
}

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
  if (/^[=+\-@]/.test(s)) s = "'" + s; // evita fórmulas al abrir en Excel
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
    categoria: (typeof g.categoria === 'string' && g.categoria.trim().slice(0, 30)) || CATEGORIA_FIJA,
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
  if (cambio) {
    guardar();
    guardarIngresos();
    guardarTarjetas();
    guardarPagos();
  }
}

$('exp-json').addEventListener('click', () => {
  descargar(`finanzas-${hoyISO()}.json`, JSON.stringify({ gastos, ingresos, tarjetas, pagos, categorias, ajustes, deudas, abonos, metas, aportes, tiposCambio: { bcp: tiposCambio.bcp, interbank: tiposCambio.interbank } }, null, 2), 'application/json');
  mensajeDatos(`Exportados ${gastos.length} gastos, ${ingresos.length} ingresos, ${tarjetas.length} tarjetas y ${pagos.length} pagos de tarjeta en JSON.`);
});

$('exp-csv').addEventListener('click', () => {
  const filas = [['fecha', 'descripcion', 'categoria', 'medio de pago', 'moneda', 'importe']]
    .concat(gastos.map((g) => [g.fecha, g.descripcion, g.categoria, nombreMedio(g.medio), g.moneda, g.importe.toFixed(2)]));
  descargar(`finanzas-${hoyISO()}.csv`, '﻿' + filas.map((f) => f.map(campoCSV).join(',')).join('\r\n'), 'text/csv;charset=utf-8');
  mensajeDatos(`Exportados ${gastos.length} gastos en CSV.`);
});

$('imp-json').addEventListener('click', () => $('imp-archivo').click());
$('imp-archivo').addEventListener('change', async (e) => {
  const archivo = e.target.files[0];
  e.target.value = '';
  if (!archivo) return;
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
    for (const t of ['deudas', 'abonos', 'metas', 'aportes']) {
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
      guardarDeudas();
      guardarMetas();
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
      nuevosObjetivos && contar(nuevosObjetivos, 'registro de deudas y metas', 'registros de deudas y metas'),
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
  aportes = [];
  salirEdicion();
  salirEdicionIngreso();
  guardar();
  guardarIngresos();
  guardarPagos();
  guardarDeudas();
  guardarMetas();
  render();
  mensajeDatos(`Se eliminaron ${n[0]} gastos, ${n[1]} ingresos y ${n[2]} pagos de tarjeta.`);
});

// ---- Navegación entre vistas ----
function renderVista() {
  if (vistaActual === 'ingresos') renderBalance();
  if (vistaActual === 'dashboard') renderDashboard();
  if (vistaActual === 'tarjeta') renderTarjeta();
  if (vistaActual === 'simulador') renderSimulador();
  if (vistaActual === 'deudas') renderDeudas();
  if (vistaActual === 'ahorro') renderAhorro();
  if (vistaActual === 'datos') renderAjustes();
}

function mostrarVista() {
  const nombre = location.hash.slice(1);
  let inicio = null;
  try { inicio = localStorage.getItem(CLAVE_INICIO); } catch {}
  vistaActual = VISTAS.includes(nombre) ? nombre : VISTAS.includes(inicio) ? inicio : 'gastos';
  for (const v of VISTAS) $('vista-' + v).classList.toggle('hidden', v !== vistaActual);
  document.querySelectorAll('.nav-item').forEach((a) => {
    if (a.dataset.vista === vistaActual) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  if (vistaActual !== 'datos') $('datos-msg').classList.add('hidden');
  if (vistaActual !== 'tarjeta') mensajeTarjeta('');
  if (vistaActual !== 'ingresos') mensajeBalance('');
  if (vistaActual !== 'deudas') avisar('deu-msg', '');
  if (vistaActual !== 'ahorro') avisar('aho-msg', '');
  ocultarTip();
  renderVista();
  cerrarMenuMovil();
}

// ---- Barra lateral: se oculta en pantallas anchas (se recuerda) y es un panel en móvil ----
const pantallaMovil = matchMedia('(max-width: 860px)');

function menuAbierto() {
  return pantallaMovil.matches ? document.body.classList.contains('menu-abierto') : document.documentElement.dataset.menu !== 'oculto';
}

function alternarMenu(abrir) {
  if (pantallaMovil.matches) {
    document.body.classList.toggle('menu-abierto', abrir);
    $('contenido').inert = abrir;
  } else {
    if (abrir) delete document.documentElement.dataset.menu;
    else document.documentElement.dataset.menu = 'oculto';
    try { localStorage.setItem('finanzas.menu', abrir ? 'visible' : 'oculto'); } catch {}
    renderVista(); // los gráficos miden el ancho nuevo
  }
  $('btn-menu').setAttribute('aria-expanded', String(abrir));
  (abrir ? $('btn-ocultar') : $('btn-menu')).focus();
}

function cerrarMenuMovil() {
  if (pantallaMovil.matches && menuAbierto()) alternarMenu(false);
}

// ---- Categorías ----
function categoriaValida(x) {
  const nombre = typeof x?.nombre === 'string' ? x.nombre.trim().slice(0, 30) : '';
  if (!nombre) return null;
  return { nombre, icono: x.icono in ICONOS ? x.icono : 'otros', color: COLORES.includes(x.color) ? x.color : 'gris' };
}

// Sin repetidos (sin distinguir mayúsculas) y siempre con «Otros», que va al final
function normalizarCategorias(lista) {
  const vistos = new Set();
  const salida = [];
  for (const item of Array.isArray(lista) ? lista : []) {
    const x = categoriaValida(item);
    if (!x || vistos.has(x.nombre.toLowerCase())) continue;
    vistos.add(x.nombre.toLowerCase());
    salida.push(x);
  }
  if (!salida.length) return CATEGORIAS_BASE.map((x) => ({ ...x }));
  const fija = salida.find((x) => x.nombre.toLowerCase() === CATEGORIA_FIJA.toLowerCase()) || CATEGORIAS_BASE.at(-1);
  return [...salida.filter((x) => x !== fija), fija];
}

function nombresCategorias() {
  return categorias.map((x) => x.nombre);
}

function guardarCategorias() {
  escribirJSON(CLAVE_CATEGORIAS, categorias);
  programarSync();
}

function categoriaElegida() {
  return document.querySelector('input[name="categoria"]:checked')?.value || CATEGORIA_FIJA;
}

// Sin nombre (o si ya no existe), la primera
function fijarCategoria(nombre) {
  const radios = [...document.querySelectorAll('input[name="categoria"]')];
  const r = radios.find((x) => x.value === nombre) || radios[0];
  if (r) r.checked = true;
}

// Rehace lo que depende de la lista, solo si cambió (no se pierde lo que se esté escribiendo)
let categoriasPintadas = null;
function poblarCategorias() {
  const firma = JSON.stringify(categorias);
  if (firma === categoriasPintadas) return;
  categoriasPintadas = firma;
  const elegida = categoriaElegida();
  $('categoria').replaceChildren(...categorias.map((c) => {
    const label = document.createElement('label');
    const r = document.createElement('input');
    r.type = 'radio';
    r.name = 'categoria';
    r.value = c.nombre;
    const caja = document.createElement('span');
    caja.className = 'opcion-cat';
    const texto = document.createElement('span');
    texto.textContent = c.nombre;
    caja.append(iconoCategoria(c.icono, c.color), texto);
    label.append(r, caja);
    return label;
  }));
  fijarCategoria(elegida);
  const filtro = $('filtro-categoria');
  const antes = filtro.value;
  filtro.replaceChildren(filtro.options[0], ...nombresCategorias().map((c) => new Option(c, c)));
  filtro.value = [...filtro.options].some((o) => o.value === antes) ? antes : '';
  crearFilasSim();
}

// Selectores visuales de ícono y color (formularios de categoría y de meta)
function crearSelectores(prefijo) {
  const radio = (grupo, valor, titulo, visual) => {
    const label = document.createElement('label');
    const r = document.createElement('input');
    r.type = 'radio';
    r.name = `${prefijo}-${grupo}`;
    r.value = valor;
    r.setAttribute('aria-label', titulo);
    label.append(r, visual);
    return label;
  };
  $(`${prefijo}-iconos`).replaceChildren(...Object.keys(ICONOS).map((k) => radio('icono', k, 'Ícono ' + k, iconoCategoria(k, 'gris'))));
  $(`${prefijo}-colores`).replaceChildren(...COLORES.map((k) => {
    const m = document.createElement('span');
    m.className = `muestra-color c-${k}`;
    return radio('color', k, 'Color ' + k, m);
  }));
  for (const grupo of ['iconos', 'colores']) $(`${prefijo}-${grupo}`).addEventListener('change', () => pintarSelectores(prefijo));
}

function valorSelector(prefijo, grupo) {
  return document.querySelector(`input[name="${prefijo}-${grupo}"]:checked`)?.value;
}

function fijarSelectores(prefijo, icono, color) {
  for (const r of document.querySelectorAll(`input[name="${prefijo}-icono"]`)) r.checked = r.value === icono;
  for (const r of document.querySelectorAll(`input[name="${prefijo}-color"]`)) r.checked = r.value === color;
  pintarSelectores(prefijo);
}

// El ícono elegido y la vista previa llevan el color elegido
function pintarSelectores(prefijo) {
  const color = valorSelector(prefijo, 'color'), icono = valorSelector(prefijo, 'icono');
  for (const caja of $(`${prefijo}-iconos`).querySelectorAll('.icono-cat')) caja.className = `icono-cat c-${color}`;
  $(`${prefijo}-previa`).replaceChildren(iconoCategoria(icono, color));
}

let catEditando = null; // nombre de la categoría que se edita
function salirEdicionCategoria() {
  catEditando = null;
  $('cat-form').reset();
  $('cat-nombre').disabled = false;
  fijarSelectores('cat', 'compras', 'azul');
  $('cat-form-titulo').textContent = 'Nueva categoría';
  $('cat-guardar').textContent = 'Crear categoría';
  $('cat-cancelar').classList.add('hidden');
}

function editarCategoria(c) {
  catEditando = c.nombre;
  $('cat-nombre').value = c.nombre;
  $('cat-nombre').disabled = c.nombre === CATEGORIA_FIJA;
  fijarSelectores('cat', c.icono, c.color);
  $('cat-form-titulo').textContent = 'Editar categoría';
  $('cat-guardar').textContent = 'Guardar cambios';
  $('cat-cancelar').classList.remove('hidden');
  $('cat-form').scrollIntoView({ behavior: desplazamiento(), block: 'center' });
}

function categoriasCambiadas() {
  guardarCategorias();
  poblarCategorias();
  render();
  renderVista();
}

function moverCategoriaEnSim(de, a) {
  for (const mapa of [sim.ajustes, sim.bases]) {
    if (a && de in mapa) mapa[a] = mapa[de];
    delete mapa[de];
  }
  guardarSim();
}

function guardarCategoriaForm(e) {
  e.preventDefault();
  const nueva = categoriaValida({ nombre: $('cat-nombre').value, icono: valorSelector('cat', 'icono'), color: valorSelector('cat', 'color') });
  if (!nueva) return;
  if (categorias.some((x) => x.nombre !== catEditando && x.nombre.toLowerCase() === nueva.nombre.toLowerCase())) {
    mensajeDatos('Ya tienes una categoría con ese nombre.', true);
    return;
  }
  if (catEditando) {
    Object.assign(categorias.find((x) => x.nombre === catEditando), nueva);
    if (nueva.nombre !== catEditando) {
      for (const g of gastos) if (g.categoria === catEditando) g.categoria = nueva.nombre;
      moverCategoriaEnSim(catEditando, nueva.nombre);
      guardar();
    }
    mensajeDatos('Categoría actualizada.');
  } else {
    categorias = normalizarCategorias([...categorias, nueva]);
    mensajeDatos(`Categoría ${nueva.nombre} creada.`);
  }
  salirEdicionCategoria();
  categoriasCambiadas();
}

function eliminarCategoria(c) {
  categorias = categorias.filter((x) => x !== c);
  let n = 0;
  for (const g of gastos) if (g.categoria === c.nombre) { g.categoria = CATEGORIA_FIJA; n++; }
  moverCategoriaEnSim(c.nombre, null);
  if (n) guardar();
  if (catEditando === c.nombre) salirEdicionCategoria();
  mensajeDatos(`Categoría ${c.nombre} eliminada.` + (n ? ` Sus gastos pasaron a ${CATEGORIA_FIJA}.` : ''));
  categoriasCambiadas();
}

function renderCategorias() {
  $('cat-lista').replaceChildren(...categorias.map((c) => {
    const fila = document.createElement('div');
    fila.className = 'fila-categoria';
    const acciones = document.createElement('div');
    acciones.append(boton('Editar', `Editar ${c.nombre}`, () => editarCategoria(c)));
    if (c.nombre !== CATEGORIA_FIJA) acciones.append(botonEliminar(`Eliminar ${c.nombre}`, () => eliminarCategoria(c)));
    const chip = etiquetaCategoria(c.nombre);
    fila.append(chip, acciones);
    return fila;
  }));
}

// ---- Preferencias de cálculo ----
function ajustesValidos(x) {
  return { compras: x?.compras === 'compra' ? 'compra' : 'vence' };
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

// ---- Ajustes por secciones ----
let ajusteActual = 'cuenta';
function abrirAjuste(nombre) {
  ajusteActual = nombre;
  renderAjustes();
}

function renderAjustes() {
  for (const b of document.querySelectorAll('.ajustes-menu button')) {
    if (b.dataset.ajuste === ajusteActual) b.setAttribute('aria-current', 'true');
    else b.removeAttribute('aria-current');
  }
  $('aj-compras').value = ajustes.compras;
  for (const nombre of ['cuenta', 'apariencia', 'calculos', 'categorias', 'datos']) $('aj-' + nombre).classList.toggle('activo', nombre === ajusteActual);
  if (ajusteActual === 'categorias') renderCategorias();
}

async function guardarNombreCuenta(e) {
  e.preventDefault();
  const nombre = $('aj-nombre').value.trim();
  if (!sesion || !nombre) return;
  try {
    const usuario = await api('/auth/v1/user', { metodo: 'PUT', cuerpo: { data: { full_name: nombre } } });
    sesion.usuario.nombre = nombreDe(usuario) || nombre;
    escribirJSON(CLAVE_SESION, sesion);
    $('aj-nombre').blur();
    pintarCuenta();
    mensajeDatos('Nombre actualizado.');
  } catch (err) {
    mensajeDatos(ERRORES_ACCESO[err.codigo] || err.message, true);
  }
}

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
  return { id: idValido(d), nombre, tipo: d.tipo in TIPOS_DEUDA ? d.tipo : 'otro', moneda: d.moneda === 'USD' ? 'USD' : 'PEN', monto, fecha: d.fecha };
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
    id: idValido(m), nombre, icono: m.icono in ICONOS ? m.icono : 'meta', color: COLORES.includes(m.color) ? m.color : 'azul',
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
    b.textContent = '¿Eliminar?';
    setTimeout(() => {
      b.classList.remove('confirmar');
      b.textContent = 'Eliminar';
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
  for (const p of pagosDe(t)) d[p.moneda] -= p.importe;
  return { PEN: redondear(d.PEN), USD: redondear(d.USD) };
}

function salirEdicionDeuda() {
  deuEditandoId = null;
  $('deu-form').reset();
  $('deu-fecha').value = hoyISO();
  $('deu-form-titulo').textContent = 'Nueva deuda';
  $('deu-guardar').textContent = 'Añadir deuda';
  $('deu-cancelar').classList.add('hidden');
}

function editarDeuda(d) {
  deuEditandoId = d.id;
  $('deu-nombre').value = d.nombre;
  $('deu-tipo').value = d.tipo;
  $('deu-monto').value = d.monto;
  $('deu-moneda').value = d.moneda;
  $('deu-fecha').value = d.fecha;
  $('deu-form-titulo').textContent = 'Editar deuda';
  $('deu-guardar').textContent = 'Guardar cambios';
  $('deu-cancelar').classList.remove('hidden');
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
          deudas = deudas.filter((x) => x !== d);
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
  $('deu-det-titulo').textContent = `Abonos a ${elegida.nombre}`;
  $('abo-etiqueta').textContent = `Abono (${elegida.moneda === 'USD' ? 'US$' : 'S/'}, quedan ${dinero(pendiente, elegida.moneda)})`;
  if (!$('abo-fecha').value) $('abo-fecha').value = hoy;
  const tbody = $('abo-lista');
  tbody.replaceChildren();
  for (const a of abonosDe(elegida).sort(porFechaDesc)) {
    const tr = document.createElement('tr');
    celda(tr, 'Fecha', formatearFecha(a.fecha), 'fecha');
    celda(tr, 'Abono', dinero(a.importe, elegida.moneda), 'num');
    celda(tr, '', botonEliminar('Eliminar abono', () => {
      abonos = abonos.filter((x) => x !== a);
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
  $('met-form').reset();
  fijarSelectores('met', 'meta', 'azul');
  $('met-form-titulo').textContent = 'Nueva meta';
  $('met-guardar').textContent = 'Añadir meta';
  $('met-cancelar').classList.add('hidden');
}

function editarMeta(m) {
  metEditandoId = m.id;
  $('met-nombre').value = m.nombre;
  $('met-objetivo').value = m.objetivo;
  $('met-moneda').value = m.moneda;
  $('met-limite').value = m.limite || '';
  fijarSelectores('met', m.icono, m.color);
  $('met-form-titulo').textContent = 'Editar meta';
  $('met-guardar').textContent = 'Guardar cambios';
  $('met-cancelar').classList.remove('hidden');
  $('met-form').scrollIntoView({ behavior: desplazamiento(), block: 'center' });
}

function renderAhorro() {
  const hoy = hoyISO();
  const [anioHoy, mesHoy] = hoy.split('-').map(Number);
  const finMes = isoDia(new Date(anioHoy, mesHoy, 0)); // incluye lo que vence más adelante en el mes
  const mes = cifrasPeriodo(hoy.slice(0, 8) + '01', finMes).ahorro;
  const acumulado = cifrasPeriodo('0000-01-01', finMes).ahorro;
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
          metas = metas.filter((x) => x !== m);
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
  $('apo-etiqueta').textContent = `Importe (${elegida.moneda === 'USD' ? 'US$' : 'S/'})`;
  if (!$('apo-fecha').value) $('apo-fecha').value = hoy;
  const tbody = $('apo-lista');
  tbody.replaceChildren();
  for (const a of aportesDe(elegida).sort(porFechaDesc)) {
    const tr = document.createElement('tr');
    celda(tr, 'Fecha', formatearFecha(a.fecha), 'fecha');
    celda(tr, 'Movimiento', a.importe > 0 ? 'Aporte' : 'Retiro');
    celda(tr, 'Importe', dinero(Math.abs(a.importe), elegida.moneda), 'num');
    celda(tr, '', botonEliminar('Eliminar movimiento', () => {
      aportes = aportes.filter((x) => x !== a);
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
    moneda: $('deu-moneda').value, monto: $('deu-monto').value, fecha: $('deu-fecha').value,
  });
  if (!d) return avisar('deu-msg', 'Revisa los datos de la deuda.', true);
  const actual = deudaDe(deuEditandoId);
  if (actual) {
    const abonado = redondear(actual.monto - pendienteDeuda(actual));
    if (d.monto < abonado) return avisar('deu-msg', `Ya abonaste ${dinero(abonado, actual.moneda)}: el monto no puede ser menor.`, true);
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
  if (!d || !a) return avisar('deu-msg', 'Revisa la fecha y el importe.', true);
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
  if (!m || !a || !(importe > 0)) return avisar('aho-msg', 'Revisa la fecha y el importe.', true);
  const guardado = guardadoEnMeta(m);
  if (retiro && importe > guardado) return avisar('aho-msg', `Solo tienes ${dinero(guardado, m.moneda)} en esta meta.`, true);
  aportes.push(a);
  avisar('aho-msg', '');
  $('apo-importe').value = '';
  guardarMetas();
  renderAhorro();
});

// Ajustes
for (const b of document.querySelectorAll('.ajustes-menu button')) b.addEventListener('click', () => abrirAjuste(b.dataset.ajuste));
$('ir-categorias').addEventListener('click', () => { ajusteActual = 'categorias'; });
$('cat-form').addEventListener('submit', guardarCategoriaForm);
$('cat-cancelar').addEventListener('click', salirEdicionCategoria);
$('cuenta-form').addEventListener('submit', guardarNombreCuenta);
$('aj-entrar').addEventListener('click', () => mostrarAcceso());
$('aj-inicio').replaceChildren(...VISTAS.map((v) => new Option(NOMBRES_VISTAS[v], v)));
try { $('aj-inicio').value = VISTAS.includes(localStorage.getItem(CLAVE_INICIO)) ? localStorage.getItem(CLAVE_INICIO) : 'gastos'; } catch {}
$('aj-inicio').addEventListener('change', () => {
  try { localStorage.setItem(CLAVE_INICIO, $('aj-inicio').value); } catch {}
});
crearSelectores('cat');
crearSelectores('met');

// ---- Eventos ----
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const datos = leerFormulario();
  if (!datos.descripcion || !(datos.importe > 0) || !datos.fecha) return;
  if (editandoId) actualizar(editandoId, datos);
  else crear(datos);
  guardar();
  salirEdicion();
  render();
  $('descripcion').focus();
});

$('btn-cancelar').addEventListener('click', () => { salirEdicion(); render(); });
$('buscar').addEventListener('input', render);
$('filtro-categoria').addEventListener('change', render);
$('filtro-medio').addEventListener('change', render);
$('orden').addEventListener('change', render);
$('dash-base').addEventListener('change', renderDashboard);
$('dash-periodo').addEventListener('change', renderDashboard);
$('dash-medio').addEventListener('change', renderDashboard);

for (const [id, campo] of [['sim-ingreso', 'ingreso'], ['sim-extra', 'extra'], ['sim-meta', 'meta'], ['sim-horizonte', 'horizonte']]) {
  $(id).addEventListener('input', () => { sim[campo] = $(id).value; guardarSim(); calcularSim(); });
}
$('ing-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const datos = ingresoValido({
    id: ingEditandoId || nuevoId(),
    descripcion: $('ing-descripcion').value,
    importe: $('ing-importe').value,
    moneda: $('ing-moneda').value,
    fecha: $('ing-fecha').value,
  });
  if (!datos) return;
  const existente = ingresos.find((x) => x.id === ingEditandoId);
  if (existente) Object.assign(existente, datos);
  else ingresos.push(datos);
  const { desde, hasta } = rangoBalance();
  mensajeBalance(datos.fecha < desde || datos.fecha > hasta
    ? `Ingreso guardado el ${formatearFecha(datos.fecha)}, fuera del periodo que estás viendo.`
    : '');
  salirEdicionIngreso();
  ingresosCambiados();
  $('ing-descripcion').focus();
});
$('ing-cancelar').addEventListener('click', () => { salirEdicionIngreso(); renderBalance(); });
$('bal-periodo').addEventListener('change', () => {
  const rango = $('bal-periodo').value === 'rango';
  if (rango && !$('bal-desde').value) {
    // Al elegir fechas, empieza con el mes actual hasta hoy
    $('bal-desde').value = hoyISO().slice(0, 8) + '01';
    $('bal-hasta').value = hoyISO();
  }
  $('bal-desde').classList.toggle('hidden', !rango);
  $('bal-hasta').classList.toggle('hidden', !rango);
  mensajeBalance('');
  renderBalance();
});
$('bal-desde').addEventListener('change', renderBalance);
$('bal-hasta').addEventListener('change', renderBalance);

$('pago-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const moneda = $('pago-moneda').value;
  const pagadoMoneda = moneda === 'USD' ? $('pago-con').value : 'PEN';
  const pagado = redondear(Number($('pago-importe').value));
  const tc = moneda !== pagadoMoneda ? Number($('pago-tc').value) : null;
  const p = pagoValido({
    tarjeta: tarSeleccion, fecha: $('pago-fecha').value, moneda, pagadoMoneda, pagado,
    importe: tc ? redondear(pagado / tc) : pagado, tipoCambio: tc,
  });
  if (!p) return;
  pagos.push(p);
  pagoSugerido = null;
  $('pago-form').reset();
  $('pago-fecha').value = hoyISO();
  mensajeTarjeta(`Pago de ${dinero(p.pagado, p.pagadoMoneda)} registrado` +
    (p.tipoCambio ? ` (abona ${dinero(p.importe, 'USD')}).` : '.'));
  pagosCambiados();
});
$('pago-moneda').addEventListener('change', () => actualizarFormPago(true));
$('pago-con').addEventListener('change', () => actualizarFormPago(true));
$('pago-importe').addEventListener('input', () => actualizarFormPago());
$('pago-tc').addEventListener('input', () => actualizarFormPago());

$('tc-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const banco = $('tc-banco').value;
  const t = tcValido({ fecha: $('tc-fecha').value, compra: $('tc-compra').value, venta: $('tc-venta').value });
  if (!t || !BANCOS[banco] || banco === 'otro') return;
  if (t.compra > t.venta) {
    mensajeTarjeta('La compra no puede superar a la venta.');
    return;
  }
  guardarTasaBanco(banco, t);
  $('tc-compra').value = '';
  $('tc-venta').value = '';
  mensajeTarjeta(`Tipo de cambio de ${BANCOS[banco]} guardado.`);
  render();
  renderTarjeta();
});

// Cuenta: iniciar / cerrar sesión, reintentar la sincronización
$('btn-cuenta').addEventListener('click', () => (sesion ? cerrarSesion() : mostrarAcceso()));
$('sync-reintentar').addEventListener('click', () => {
  if (!sesion) return mostrarAcceso();
  if (nubeLista) sincronizar();
  else iniciarNube();
});
$('acceso-google').addEventListener('click', async () => {
  const boton = $('acceso-google');
  boton.disabled = true;
  pintarAcceso();
  try {
    await entrarConGoogle(); // si todo va bien, la página se va a Google
  } catch (err) {
    pintarAcceso(ERRORES_ACCESO[err.codigo] || err.message);
    boton.disabled = false;
  }
});
$('acceso-alternar').addEventListener('click', () => {
  accesoModo = accesoModo === 'entrar' ? 'registro' : 'entrar';
  pintarAcceso();
});
$('ver-clave').addEventListener('click', () => verClave($('acceso-clave').type === 'password'));
$('acceso-olvido').addEventListener('click', () => {
  accesoModo = 'recuperar';
  pintarAcceso();
  $('acceso-correo').focus();
});
$('acceso-local').addEventListener('click', () => {
  try { localStorage.setItem(CLAVE_MODO, 'local'); } catch {}
  ocultarAcceso();
  pintarCuenta();
});
$('acceso-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const boton = $('acceso-entrar');
  boton.disabled = true;
  pintarAcceso();
  try {
    const correo = $('acceso-correo').value.trim(), clave = $('acceso-clave').value;
    if ((accesoModo === 'registro' || accesoModo === 'nueva-clave') && clave !== $('acceso-clave2').value) {
      pintarAcceso(ERRORES_ACCESO.claves_distintas);
      $('acceso-clave2').focus();
      return;
    }
    if (accesoModo === 'recuperar') {
      await recuperarClave(correo);
      pintarAcceso(ERRORES_ACCESO.enlace_enviado, true);
      return;
    }
    if (accesoModo === 'nueva-clave') {
      await cambiarClave(clave);
      avisoNube(ERRORES_ACCESO.clave_cambiada);
    } else {
      await autenticar(accesoModo, correo, clave, $('acceso-nombre').value);
    }
    try { localStorage.removeItem(CLAVE_MODO); } catch {}
    $('acceso-clave').value = '';
    $('acceso-clave2').value = '';
    accesoModo = 'entrar';
    ocultarAcceso();
    await iniciarNube();
  } catch (err) {
    pintarAcceso(ERRORES_ACCESO[err.codigo] || err.message, err.codigo === 'confirmar');
  } finally {
    boton.disabled = false;
  }
});
addEventListener('online', () => {
  if (!sesion) return;
  if (nubeLista) sincronizar();
  else iniciarNube();
});

$('btn-menu').addEventListener('click', () => alternarMenu(true));
$('btn-ocultar').addEventListener('click', () => alternarMenu(false));
$('menu-fondo').addEventListener('click', cerrarMenuMovil);
document.querySelector('.barra-nav').addEventListener('click', cerrarMenuMovil);
addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarMenuMovil(); });
pantallaMovil.addEventListener('change', () => {
  document.body.classList.remove('menu-abierto');
  $('contenido').inert = false;
  $('btn-menu').setAttribute('aria-expanded', 'false');
});

// Al volver a la pestaña o a la ventana se trae lo cambiado en otros dispositivos
document.addEventListener('visibilitychange', actualizarDesdeNube);
addEventListener('focus', actualizarDesdeNube);

// Otra pestaña cambió algo en localStorage (este evento no llega a la que hizo el cambio)
let esperaPestana;
addEventListener('storage', (e) => {
  if (e.key === null) return location.reload(); // se borró todo
  if (e.key === CLAVE_SESION) {
    // Entrar o salir en una pestaña vale para todas; si solo se renovó el token, se sigue igual
    const nueva = leerJSON(CLAVE_SESION, null);
    if (nueva?.usuario?.id !== sesion?.usuario.id) return location.reload();
    sesion = nueva;
    return;
  }
  if (e.key === 'finanzas.tema' && (e.newValue === 'light' || e.newValue === 'dark')) {
    document.documentElement.dataset.theme = e.newValue;
    pintarBotonTema();
    renderVista();
  }
  if (e.key === 'finanzas.paleta') {
    if (!e.newValue || e.newValue === 'azul') delete document.documentElement.dataset.paleta;
    else document.documentElement.dataset.paleta = e.newValue;
    for (const r of document.querySelectorAll('input[name="paleta"]')) r.checked = r.value === (e.newValue || 'azul');
    renderVista();
  }
  if (![CLAVE, CLAVE_INGRESOS, CLAVE_TARJETAS, CLAVE_PAGOS, CLAVE_TC, CLAVE_SIM, CLAVE_CATEGORIAS, CLAVE_AJUSTES, CLAVE_DEUDAS, CLAVE_ABONOS, CLAVE_METAS, CLAVE_APORTES, CLAVE_SINCRONIZADO].includes(e.key)) return;
  // Un guardado puede tocar varias claves seguidas: se repinta una sola vez
  clearTimeout(esperaPestana);
  esperaPestana = setTimeout(() => {
    recargarDeLocal();
    refrescarTodo();
    // Si la otra pestaña se cerró antes de subirlo, lo sube esta (el candado evita hacerlo dos veces)
    if (sesion && nubeLista && hayCambiosSinSubir()) programarSync();
    pintarCuenta();
  }, 50);
});

$('tar-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const datos = {
    nombre: $('tar-nombre').value.trim().slice(0, 40),
    corte: diaDelMes($('tar-corte').value),
    ...leerPagoTarjeta(),
    linea: Math.round(numero($('tar-linea').value) * 100) / 100,
    banco: BANCOS[$('tar-banco').value] ? $('tar-banco').value : 'otro',
  };
  if (!datos.nombre || !datos.corte || !(datos.pago || datos.plazo)) return;
  const editada = tarjetaDe(tarEditandoId);
  if (editada) {
    Object.assign(editada, datos);
    mensajeTarjeta('Cambios guardados.');
  } else {
    const t = { id: nuevoId(), ...datos };
    tarjetas.push(t);
    tarSeleccion = t.id;
    mensajeTarjeta(`Tarjeta ${datos.nombre} añadida.`);
  }
  salirEdicionTarjeta();
  tarjetasCambiadas();
});
$('tar-cancelar').addEventListener('click', () => { salirEdicionTarjeta(); renderTarjeta(); });
$('tar-modo-pago').addEventListener('change', () => {
  $('tar-pago').value = '';
  pintarModoPago();
});
for (const id of ['tar-corte', 'tar-pago']) $(id).addEventListener('input', pintarModoPago);
for (const id of ['medio', 'fecha']) $(id).addEventListener('change', pintarNotaMedio);
$('aj-compras').addEventListener('change', () => {
  ajustes = ajustesValidos({ compras: $('aj-compras').value });
  guardarAjustes();
  render();
  mensajeDatos(ajustes.compras === 'vence' ? 'Las compras con tarjeta se restan cuando vence su pago.' : 'Las compras con tarjeta se restan el día de la compra.');
});
$('tar-sel').addEventListener('change', () => {
  tarSeleccion = $('tar-sel').value;
  pagoSugerido = null;
  $('pago-tc').value = '';
  renderTarjeta();
});

$('sim-reiniciar').addEventListener('click', () => {
  sim.ajustes = {};
  sim.bases = {};
  sim.extra = '';
  guardarSim();
  renderSimulador();
});

addEventListener('hashchange', mostrarVista);
let esperaResize;
addEventListener('resize', () => {
  clearTimeout(esperaResize);
  esperaResize = setTimeout(renderVista, 150);
});
addEventListener('scroll', ocultarTip, { passive: true });

// ---- Tema claro / oscuro ----
function pintarBotonTema() {
  const oscuro = document.documentElement.dataset.theme === 'dark';
  const b = $('btn-tema');
  b.textContent = oscuro ? 'Modo claro' : 'Modo oscuro';
  b.title = oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
  b.setAttribute('aria-label', b.title);
  for (const r of document.querySelectorAll('input[name="tema"]')) r.checked = r.value === (oscuro ? 'dark' : 'light');
}

function aplicarTema(tema) {
  document.documentElement.dataset.theme = tema;
  try { localStorage.setItem('finanzas.tema', tema); } catch {}
  pintarBotonTema();
}

// Paleta de color (se guarda en este navegador); «azul» es la de por defecto
function aplicarPaleta(paleta) {
  if (paleta === 'azul') delete document.documentElement.dataset.paleta;
  else document.documentElement.dataset.paleta = paleta;
  try { localStorage.setItem('finanzas.paleta', paleta); } catch {}
  renderVista(); // los gráficos se repintan con los colores nuevos
}

$('btn-tema').addEventListener('click', () => aplicarTema(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
for (const r of document.querySelectorAll('input[name="tema"]')) r.addEventListener('change', () => aplicarTema(r.value));
for (const r of document.querySelectorAll('input[name="paleta"]')) r.addEventListener('change', () => aplicarPaleta(r.value));

// ---- Inicio ----
pintarBotonTema();
for (const r of document.querySelectorAll('input[name="paleta"]')) {
  r.checked = r.value === (document.documentElement.dataset.paleta || 'azul');
}
const fechaHoy = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
$('hoy').textContent = fechaHoy.charAt(0).toUpperCase() + fechaHoy.slice(1);
$('fecha').value = hoyISO();
$('ing-fecha').value = hoyISO();
$('pago-fecha').value = hoyISO();
$('tc-fecha').value = hoyISO();
cargarTiposCambio();
cargar();
cargarIngresos();
cargarTarjetas(); // después de cargar(): la migración mira los gastos con medio 'interbank'
for (const g of gastos) {
  g.medio = medioValido(g.medio);
  g.moneda = g.moneda === 'USD' ? 'USD' : 'PEN';
}
cargarPagos(); // después de tarjetas y gastos: migra los ciclos marcados como pagados
normalizarIds();
poblarMedios();
cargarSim();
cargarObjetivos();
poblarCategorias();
salirEdicion();
salirEdicionDeuda();
salirEdicionMeta();
salirEdicionCategoria();
render();
mostrarVista();

// Nube: con sesión guardada se descargan los datos; sin ella se pide iniciar sesión
// (salvo que el usuario haya elegido usar la web sin cuenta)
sincronizado = leerJSON(CLAVE_SINCRONIZADO, {});
sesion = leerJSON(CLAVE_SESION, null);
pintarCuenta();
(async () => {
  let errorAcceso = '', tipo = null;
  try {
    tipo = await completarAcceso();
    if (tipo) {
      try { localStorage.removeItem(CLAVE_MODO); } catch {}
    }
  } catch (err) {
    errorAcceso = ERRORES_ACCESO[err.codigo] || err.message;
  }
  pintarCuenta();
  if (tipo === 'recuperar') {
    // Se volvió del enlace de nueva contraseña: primero se elige la contraseña
    mostrarAcceso('nueva-clave');
    $('acceso-clave').focus();
  } else if (sesion) {
    iniciarNube();
  } else if (errorAcceso || localStorage.getItem(CLAVE_MODO) !== 'local') {
    mostrarAcceso();
    if (errorAcceso) pintarAcceso(errorAcceso, false);
  }
  if (location.protocol === 'file:') avisoNube(ERRORES_ACCESO.archivo);
})();
cargarBCRP();
appIniciada = true;
