// Apariencia: tema, paletas y fondos
'use strict';

// ---- Tema claro / oscuro ----
const temaSistema = matchMedia('(prefers-color-scheme: dark)');

// 'light', 'dark' o 'sistema' (sin nada guardado sigue al dispositivo, igual que js/tema.js)
function temaGuardado() {
  try {
    const t = localStorage.getItem('finanzas.tema');
    return t === 'light' || t === 'dark' ? t : 'sistema';
  } catch { return 'sistema'; }
}

// La barra de estado del celular usa el color de fondo de la web
function pintarColorNavegador() {
  $('color-navegador').content = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
}

function aplicarTema(tema) {
  document.documentElement.dataset.theme = tema === 'sistema' ? (temaSistema.matches ? 'dark' : 'light') : tema;
  try {
    if (tema === 'sistema') localStorage.removeItem('finanzas.tema');
    else localStorage.setItem('finanzas.tema', tema);
  } catch {}
  for (const r of document.querySelectorAll('input[name="tema"], input[name="tema-menu"]')) r.checked = r.value === tema;
  pintarColorNavegador();
}

temaSistema.addEventListener('change', () => {
  if (temaGuardado() !== 'sistema') return;
  aplicarTema('sistema');
  renderVista();
});
for (const r of document.querySelectorAll('input[name="tema"], input[name="tema-menu"]')) r.addEventListener('change', () => aplicarTema(r.value));

// Paleta de color (se guarda en este navegador); «esmeralda» es la de por defecto
const PALETAS = { esmeralda: 'Esmeralda', petroleo: 'Petróleo', azul: 'Azul', indigo: 'Índigo', ciruela: 'Ciruela', rosa: 'Rosa claro', rosado: 'Rosado', amarillo: 'Amarillo', oliva: 'Oliva', terracota: 'Terracota', grafito: 'Grafito' };

function aplicarPaleta(paleta) {
  document.documentElement.dataset.paleta = paleta;
  try { localStorage.setItem('finanzas.paleta', paleta); } catch {}
  pintarColorNavegador();
  renderVista(); // los gráficos se repintan con los colores nuevos
}

const FONDOS = { liso: 'Liso', degradado: 'Degradado', navidad: 'Navidad', nochebuena: 'Nochebuena', luces: 'Luces' };

function aplicarFondo(fondo) {
  document.documentElement.dataset.fondo = fondo;
  try { localStorage.setItem('finanzas.fondo', fondo); } catch {}
}

// Una opción de apariencia: radio oculto, miniatura y nombre
function opcionApariencia(grupo, valor, nombre, marcada, muestra, alElegir) {
  const label = document.createElement('label');
  label.className = 'paleta';
  const r = document.createElement('input');
  r.type = 'radio';
  r.name = grupo;
  r.value = valor;
  r.checked = marcada;
  r.addEventListener('change', () => alElegir(valor));
  const texto = document.createElement('span');
  texto.className = 'm-nombre';
  texto.textContent = nombre;
  muestra.setAttribute('aria-hidden', 'true');
  label.append(r, muestra, texto);
  return label;
}

function crearFondos() {
  const actual = document.documentElement.dataset.fondo;
  $('fondos').append(...Object.entries(FONDOS).map(([valor, nombre]) => {
    const muestra = document.createElement('span');
    muestra.className = 'm-fondo';
    muestra.dataset.fondo = valor;
    return opcionApariencia('fondo', valor, nombre, valor === actual, muestra, aplicarFondo);
  }));
}

// Cada opción es una miniatura de la web con los colores de esa paleta
function crearPaletas() {
  const span = (clase, ...hijos) => {
    const s = document.createElement('span');
    s.className = clase;
    s.append(...hijos);
    return s;
  };
  const actual = document.documentElement.dataset.paleta;
  for (const [valor, nombre] of Object.entries(PALETAS)) {
    const muestra = span('muestra',
      span('m-barra', span('m-marca'), span('m-menu activo'), span('m-menu'), span('m-menu')),
      span('m-cuerpo', span('m-tarjeta', span('m-titulo'), span('m-graf', span('s1 a'), span('s2 b'), span('s1 c'), span('s2 d'))), span('m-boton')));
    muestra.dataset.paleta = valor;
    $('paletas').append(opcionApariencia('paleta', valor, nombre, valor === actual, muestra, aplicarPaleta));
  }
}
