// Nube: llamadas a /api y sincronización con Supabase
'use strict';

// ---- Nube (Supabase) ----
// La web guarda una copia en localStorage (abre al instante y funciona sin conexión). Con sesión,
// Supabase es la fuente principal: al abrir se descargan los datos y cada guardarX() programa
// sincronizar(), que compara con lo último confirmado por la nube (`sincronizado`) y sube solo lo
// que cambió. Los datos los protege Row Level Security: cada usuario solo ve sus filas.
// La web no conoce la URL ni la clave de Supabase: habla con /api de su mismo dominio, donde
// un intermediario (el Worker de Cloudflare) añade la clave guardada como variable secreta.
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
        medio: t ? 'tarjeta' : g.medio, tarjeta: t ? t.id : null, fecha: g.fecha, negocio: !!g.negocio,
      };
    },
    deFila: (f) => gastoValido({ ...f, medio: f.medio === 'tarjeta' ? f.tarjeta || MEDIO_OTRO : f.medio }),
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
  saldos: {
    lista: () => saldos,
    aFila: (s) => ({ id: s.id, tarjeta: s.tarjeta, fecha: s.fecha, moneda: s.moneda, importe: s.importe, negocio: !!s.negocio }),
    deFila: (f) => saldoValido(f),
    poner: (l) => { saldos = l; },
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
  negocio: {
    lista: () => negocio,
    aFila: (m) => ({ id: m.id, tipo: m.tipo, canal: m.canal, descripcion: m.descripcion, importe: m.importe, moneda: m.moneda, fecha: m.fecha }),
    deFila: (f) => movimientoNegocioValido(f),
    poner: (l) => { negocio = l; },
  },
};
// Las tablas padre antes que lo que las usa
const ORDEN_TABLAS = ['tarjetas', 'gastos', 'ingresos', 'pagos', 'saldos', 'deudas', 'abonos', 'metas', 'aportes', 'negocio'];

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

// Barra fina arriba mientras haya llamadas en curso; solo aparece si tardan más de 300 ms
let cargasActivas = 0, esperaBarraCarga = null;
function marcarCarga(cambio) {
  cargasActivas += cambio;
  if (cargasActivas > 0) {
    esperaBarraCarga ??= setTimeout(() => $('barra-carga').classList.remove('hidden'), 300);
    return;
  }
  clearTimeout(esperaBarraCarga);
  esperaBarraCarga = null;
  $('barra-carga').classList.add('hidden');
}

// Primera descarga de una cuenta: aviso y cifras en espera, para no enseñar «S/ 0.00» ni «Aún no hay gastos»
function cargaInicial(activa) {
  document.documentElement.classList.toggle('cargando-datos', activa);
  $('aviso-carga').classList.toggle('hidden', !activa);
}

// Mientras un botón espera: se desactiva y dice qué está haciendo; devuelve cómo restaurarlo
function botonOcupado(boton, texto, destino = boton) {
  const original = destino.textContent;
  boton.disabled = true;
  boton.setAttribute('aria-busy', 'true');
  destino.textContent = texto;
  return () => {
    boton.disabled = false;
    boton.removeAttribute('aria-busy');
    destino.textContent = original;
  };
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
  let r, texto;
  marcarCarga(1);
  try {
    r = await fetch(API + ruta, {
      method: metodo, headers: cabeceras, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      signal: AbortSignal.timeout(20000), // sin respuesta en 20 s se trata como sin conexión
    });
    texto = await r.text();
  } catch {
    throw Object.assign(new Error(ERRORES_ACCESO.sin_conexion), { codigo: 'sin_conexion' });
  } finally {
    marcarCarga(-1);
  }
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
