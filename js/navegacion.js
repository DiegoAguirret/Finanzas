// Navegación: vistas, barra lateral, hojas y aviso de cambios sin guardar
'use strict';

// ---- Cambios sin guardar ----
// Un formulario queda «sucio» si lo escrito difiere de cómo estaba antes de empezar a escribir.
// Salir de él (apartado, hoja, sesión, recarga) pide confirmar; si se acepta, lo escrito se pierde.
const FORMS_CONTROLADOS = ['form', 'ing-form', 'tar-form', 'tc-form', 'pago-form', 'sal-form', 'deu-form', 'abo-form', 'met-form', 'apo-form', 'neg-form', 'cat-form', 'cuenta-form'];
const sucios = new Set();
const basesForm = {};

function estadoForm(f) {
  const estado = {};
  for (const c of f.elements) {
    const nombre = c.name || c.id;
    if (!nombre || c.tagName === 'BUTTON' || c.tagName === 'FIELDSET' || c.type === 'file' || (c.type === 'radio' && !c.checked)) continue;
    estado[nombre] = c.value;
  }
  return estado;
}

function iniciarFormularios() {
  for (const id of FORMS_CONTROLADOS) {
    const f = $(id);
    const tomarBase = () => { if (!sucios.has(id)) basesForm[id] = estadoForm(f); };
    const limpiar = () => {
      sucios.delete(id);
      delete basesForm[id];
    };
    const revisar = () => {
      const base = basesForm[id];
      if (!base || JSON.stringify(estadoForm(f)) !== JSON.stringify(base)) sucios.add(id);
      else sucios.delete(id);
    };
    f.addEventListener('focusin', tomarBase);
    f.addEventListener('pointerdown', tomarBase);
    f.addEventListener('input', revisar);
    f.addEventListener('change', revisar);
    f.addEventListener('reset', limpiar);
    f.addEventListener('submit', () => setTimeout(limpiar));
  }
}

// Deja el formulario como estaba: si se editaba un registro, cancela la edición
function descartarFormulario(id) {
  const f = $(id);
  const cancelar = f.querySelector('.acciones-form .btn-secondary:not(.hidden)');
  if (cancelar) cancelar.click();
  else {
    for (const [nombre, valor] of Object.entries(basesForm[id] || {})) {
      const c = f.elements[nombre];
      if (!c) continue;
      c.value = valor;
      if (c instanceof RadioNodeList) f.querySelector(`input[name="${nombre}"]:checked`)?.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }
  sucios.delete(id);
  delete basesForm[id];
}

// Formularios con cambios dentro de un elemento (una vista, un panel, una hoja)
function suciosEn(contenedor) {
  return [...sucios].filter((id) => contenedor.contains($(id)));
}

function repartoSinTerminar() {
  return !!$('plan-suma').textContent;
}

// Descarta lo escrito dentro del contenedor y repinta lo que depende de esos campos
function descartarEn(contenedor) {
  for (const id of suciosEn(contenedor)) descartarFormulario(id);
  if (contenedor.contains($('plan-suma')) && repartoSinTerminar()) {
    $('plan-suma').textContent = '';
    renderPlan();
  }
  pintarNotaMedio();
  pintarModoPago();
  actualizarFormPago();
}

// true si no hay nada que perder o si el usuario acepta perderlo
async function confirmarSalida(contenedor, texto) {
  const hay = suciosEn(contenedor).length || (contenedor.contains($('plan-suma')) && repartoSinTerminar());
  if (!hay) return true;
  const ok = await confirmar({ titulo: '¿Salir sin guardar?', texto, accion: 'Salir sin guardar', peligro: true });
  if (ok) descartarEn(contenedor);
  return ok;
}

// Al cambiar de apartado: vuelve al actual mientras el usuario decide
async function alCambiarHash() {
  const destino = location.hash;
  const actual = $('vista-' + vistaActual);
  const hay = suciosEn(actual).length || (vistaActual === 'plan' && repartoSinTerminar());
  if (!hay) return mostrarVista();
  history.replaceState(null, '', '#' + vistaActual);
  if (await confirmarSalida(actual, 'Si cambias de apartado, se perderá lo que escribiste.')) location.hash = destino;
}

// ---- Navegación entre vistas ----
function renderVista() {
  if (vistaActual === 'ingresos') renderBalance();
  if (vistaActual === 'dashboard') renderDashboard();
  if (vistaActual === 'tarjeta') renderTarjeta();
  if (vistaActual === 'simulador') renderSimulador();
  if (vistaActual === 'deudas') renderDeudas();
  if (vistaActual === 'ahorro') renderAhorro();
  if (vistaActual === 'negocio') renderNegocio();
  if (vistaActual === 'plan') renderPlan();
  if (vistaActual === 'datos') renderAjustes();
}

function mostrarVista() {
  const nombre = location.hash.slice(1);
  let inicio = null;
  try { inicio = localStorage.getItem(CLAVE_INICIO); } catch {}
  vistaActual = VISTAS.includes(nombre) ? nombre : VISTAS.includes(inicio) ? inicio : 'gastos';
  for (const v of VISTAS) $('vista-' + v).classList.toggle('hidden', v !== vistaActual);
  cerrarHoja(false);
  // Barra superior y botón de añadir según la vista; «Más» se marca si la vista no tiene pestaña propia
  document.querySelector('.sup-marca').textContent = NOMBRES_VISTAS[vistaActual];
  $('fab').setAttribute('aria-label', HOJAS[vistaActual]?.[1] ?? '');
  $('fab').title = HOJAS[vistaActual]?.[1] ?? '';
  $('fab').classList.toggle('hidden', !HOJAS[vistaActual]);
  $('tab-mas').classList.toggle('activa', !document.querySelector(`.tab[data-vista="${vistaActual}"]`));
  if (pantallaMovil.matches) scrollTo(0, 0);
  document.querySelectorAll('.nav-item, .tab[data-vista]').forEach((a) => {
    if (a.dataset.vista === vistaActual) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  if (vistaActual !== 'datos') $('datos-msg').classList.add('hidden');
  if (vistaActual !== 'tarjeta') mensajeTarjeta('');
  if (vistaActual !== 'ingresos') mensajeBalance('');
  if (vistaActual !== 'deudas') avisar('deu-msg', '');
  if (vistaActual !== 'ahorro') avisar('aho-msg', '');
  if (vistaActual !== 'negocio') avisar('neg-msg', '');
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
  (abrir ? $('btn-ocultar') : pantallaMovil.matches ? $('tab-mas') : $('btn-menu')).focus();
}

// ---- Celular y tablet: formularios en hoja inferior ----
let hojaAbierta = null, hojaInertes = [];

function abrirHoja(vista = vistaActual) {
  if (!pantallaMovil.matches || !HOJAS[vista]) return;
  cerrarHoja(false);
  const [idForm, , idCampo] = HOJAS[vista];
  hojaAbierta = $(idForm).closest('.hoja');
  hojaAbierta.classList.add('abierta');
  document.body.classList.add('hoja-abierta');
  // Mientras está abierta, lo de atrás no recibe foco ni clics
  const atras = [...$('vista-' + vista).querySelectorAll(':scope > *, .columnas > *')].filter((el) => !el.contains(hojaAbierta));
  hojaInertes = [...atras, $('tabs'), document.querySelector('.barra-superior')];
  for (const el of hojaInertes) el.inert = true;
  $(idCampo).focus();
}

function cerrarHoja(devolverFoco = true) {
  if (!hojaAbierta) return;
  hojaAbierta.classList.remove('abierta');
  document.body.classList.remove('hoja-abierta');
  for (const el of hojaInertes) el.inert = false;
  hojaAbierta = null;
  hojaInertes = [];
  if (devolverFoco) $('fab').focus();
}

// Cerrar la hoja con «Cerrar», tocando fuera o con Escape: avisa si hay algo escrito;
// si se estaba editando, cerrar equivale a cancelar
async function pedirCerrarHoja() {
  const hoja = hojaAbierta;
  if (!hoja || !(await confirmarSalida(hoja, 'Si cierras, se perderá lo que escribiste.'))) return;
  hoja.querySelector('.acciones-form .btn-secondary:not(.hidden)')?.click();
  cerrarHoja();
}

function cerrarMenuMovil() {
  if (pantallaMovil.matches && menuAbierto()) alternarMenu(false);
}
