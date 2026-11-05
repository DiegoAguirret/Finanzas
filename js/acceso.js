// Acceso: inicio de sesión, cuenta y estado de la nube
'use strict';

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
  saldos = [];
  metas = [];
  aportes = [];
  negocio = [];
  sincronizado = {};
  tarSeleccion = null;
  deuSeleccion = null;
  metSeleccion = null;
  for (const clave of [CLAVE, CLAVE_INGRESOS, CLAVE_TARJETAS, CLAVE_PAGOS, CLAVE_CATEGORIAS, CLAVE_AJUSTES, CLAVE_DEUDAS, CLAVE_ABONOS, CLAVE_SALDOS, CLAVE_METAS, CLAVE_APORTES, CLAVE_NEGOCIO, CLAVE_SINCRONIZADO, CLAVE_DUENO, CLAVE_ULTIMO_MEDIO]) {
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
    const borrar = Object.keys(sincronizado[t] || {}).filter((id) => esUUID(id) && !Object.hasOwn(actuales[t], id));
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
  cargaInicial(dueno !== id);
  try {
    if (dueno && dueno !== id) {
      borrarCopiaLocal(); // la copia local es de otra cuenta
    } else if (dueno === id && hayCambiosSinSubir()) {
      nubeLista = true; // cambios hechos sin conexión: se suben antes de descargar
      await sincronizar();
      if (errorSync) throw errorSync;
    }
    let unir = false;
    let nubeVacia = false;
    await conCandado(CANDADO_SYNC, async () => {
      const nube = await descargarDeLaNube();
      nubeVacia = ORDEN_TABLAS.every((t) => !nube[t].length);
      if (dueno === id) {
        // Se guardó algo mientras se descargaba: se sube primero y no se pisa
        recargarDeLocal();
        if (hayCambiosSinSubir()) { nubeLista = true; return; }
      }
      // Se mira después de descargar: lo registrado durante la espera también se une
      unir = dueno !== id && [tarjetas, gastos, ingresos, pagos, deudas, metas, negocio].some((l) => l.length);
      aplicarNube(nube, unir);
      escribirJSON(CLAVE_DUENO, id);
      escribirJSON(CLAVE_SINCRONIZADO, sincronizado);
      nubeLista = true;
      guardarCopiaLocal();
    });
    ultimaDescarga = Date.now();
    actualizarPerfil();
    refrescarTodo();
    if (unir || hayCambiosSinSubir()) {
      await sincronizar();
      if (unir && !errorSync) {
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
  cargaInicial(false);
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
  guardarSaldos();
  guardarMetas();
  guardarNegocio();
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
  normalizarGastos();
  cargarPagos();
  cargarSim();
  cargarObjetivos();
  sincronizado = leerJSON(CLAVE_SINCRONIZADO, {});
}

function refrescarTodo() {
  normalizarGastos();
  // Lo que se estaba editando pudo eliminarse en otra pestaña
  if (editandoId && !gastos.some((x) => x.id === editandoId)) salirEdicion();
  if (ingEditandoId && !ingresos.some((x) => x.id === ingEditandoId)) salirEdicionIngreso();
  if (tarEditandoId && !tarjetaDe(tarEditandoId)) salirEdicionTarjeta();
  if (salEditandoIds.length && !saldos.some((x) => salEditandoIds.includes(x.id))) salirEdicionSaldo();
  if (deuEditandoId && !deudaDe(deuEditandoId)) salirEdicionDeuda();
  if (metEditandoId && !metaDe(metEditandoId)) salirEdicionMeta();
  if (negEditandoId && !negocio.some((x) => x.id === negEditandoId)) salirEdicionNegocio();
  poblarMedios();
  poblarCategorias();
  render();
  renderVista();
}

// Ventana de confirmación; resuelve true si se acepta (Escape o clic fuera = cancelar)
function confirmar({ titulo, texto, accion, peligro = false }) {
  const d = $('dialogo');
  if (d.open) return Promise.resolve(false);
  $('dialogo-titulo').textContent = titulo;
  $('dialogo-texto').textContent = texto;
  $('dialogo-si').textContent = accion;
  $('dialogo-si').className = peligro ? 'btn-danger' : 'btn-primary';
  d.returnValue = 'no';
  d.showModal();
  // La respuesta se toma al pulsar el botón: el evento `close` llega después y, si se retrasa,
  // podría confundirse con la siguiente ventana. Escape o clic fuera solo disparan `close`.
  const formulario = d.querySelector('form');
  return new Promise((resolver) => {
    const responder = (valor) => {
      formulario.removeEventListener('submit', alEnviar);
      d.removeEventListener('close', alCerrar);
      resolver(valor);
    };
    const alEnviar = (e) => responder(e.submitter?.value === 'si');
    // Con la ventana abierta, este `close` es el atrasado de la ventana anterior: se ignora
    const alCerrar = () => { if (!d.open) responder(false); };
    formulario.addEventListener('submit', alEnviar);
    d.addEventListener('close', alCerrar);
  });
}

let saliendo = false;
async function cerrarSesion() {
  if (saliendo || !sesion) return;
  // Lo escrito en un formulario o lo que aún no llegó a la nube
  const sinGuardar = hayCambiosSinSubir() || sucios.size || repartoSinTerminar();
  const ok = await confirmar(sinGuardar
    ? { titulo: 'Tienes cambios sin guardar', texto: 'Si cierras sesión, se perderá lo que no guardaste.', accion: 'Salir sin guardar', peligro: true }
    : { titulo: '¿Cerrar sesión?', texto: 'Tus datos seguirán en tu cuenta. Podrás volver a entrar cuando quieras.', accion: 'Cerrar sesión' });
  if (!ok || !sesion) return;
  descartarEn(document.body);
  saliendo = true;
  avisoGuardado('Cerrando sesión…');
  try { await api('/auth/v1/logout', { metodo: 'POST' }); } catch {}
  saliendo = false;
  cerrarMenuMovil();
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
  $('menu-nombre').textContent = nombre || 'Sin cuenta';
  $('menu-correo').textContent = sesion ? sesion.usuario.correo : 'Tus datos solo están en este navegador.';
  $('saludo').textContent = sesion?.usuario.nombre ? `Hola, ${sesion.usuario.nombre.trim().split(/\s+/)[0]}` : 'Hola';
  $('avatar').textContent = nombre ? iniciales(nombre) : '';
  $('avatar').classList.toggle('hidden', !nombre);
  $('cuenta-correo').textContent = sesion ? sesion.usuario.correo : '';
  $('btn-cuenta').classList.toggle('hidden', !!sesion);
  $('btn-salir').classList.toggle('hidden', !sesion);
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
  $('menu-usuario').hidePopover();
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
  const texto = mostrar ? 'Ocultar contraseña' : 'Mostrar contraseña';
  b.replaceChildren(icono(mostrar ? 'no-ver' : 'ver'));
  b.setAttribute('aria-label', texto);
  b.title = texto;
  b.setAttribute('aria-pressed', String(mostrar));
}
