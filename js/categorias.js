// Categorías
'use strict';

// ---- Categorías ----
function categoriaValida(x) {
  const nombre = typeof x?.nombre === 'string' ? x.nombre.trim().slice(0, 30) : '';
  if (!nombre || nombre in Object.prototype) return null;
  return { nombre, icono: Object.hasOwn(ICONOS, x.icono) ? x.icono : 'otros', color: COLORES.includes(x.color) ? x.color : 'gris' };
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
      moverCategoriaEnPlan(catEditando, nueva.nombre);
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
  categorias = categorias.filter((x) => x.nombre !== c.nombre);
  let n = 0;
  for (const g of gastos) if (g.categoria === c.nombre) { g.categoria = CATEGORIA_FIJA; n++; }
  moverCategoriaEnSim(c.nombre, null);
  moverCategoriaEnPlan(c.nombre, null);
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
