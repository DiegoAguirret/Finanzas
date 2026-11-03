// Gastos: datos, formulario y lista
'use strict';

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
    descripcion: $('descripcion').value.trim() || categoriaElegida(), // sin descripción, la categoría
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
  abrirHoja('gastos');
  form.scrollIntoView({ behavior: desplazamiento(), block: 'center' });
  $('importe').focus();
  render();
}

function salirEdicion() {
  editandoId = null;
  form.reset();
  fijarCategoria();
  $('medio').value = ultimoMedio();
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

function icono(nombre) {
  const s = svgEl('svg', { viewBox: '0 0 24 24', class: 'ico', 'aria-hidden': 'true' });
  s.append(svgEl('path', { d: ICONOS_UI[nombre] }));
  return s;
}

// Coloca los íconos fijos de la página
function pintarIconos() {
  for (const a of document.querySelectorAll('.nav-item, .tab[data-vista]')) a.prepend(icono(a.dataset.vista));
  for (const el of document.querySelectorAll('[data-ico]')) el.prepend(icono(el.dataset.ico));
  $('fab').append(icono('anadir'));
  $('btn-menu').append(icono('menu'));
  $('btn-ocultar').append(icono('cerrar'));
  $('btn-filtros').append(icono('filtro'));
  $('dash-filtros').append(icono('filtro'));
  verClave($('acceso-clave').type !== 'password');
  // Lo secundario se abre solo en pantallas grandes; en el celular, al pulsarlo
  if (!pantallaMovil.matches) for (const d of document.querySelectorAll('details[data-escritorio]')) d.open = true;
}

function boton(texto, titulo, onClick, clase = '') {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'icon-btn ' + clase;
  if (ACCIONES_ICONO[texto]) {
    b.classList.add('solo-ico');
    b.append(icono(ACCIONES_ICONO[texto]));
  } else b.textContent = texto;
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

// Gastos del mes frente a los ingresos del mes
function pintarResumenMes(delMes, mesActual) {
  const limite = ajustes.limite;
  // La barra se mide contra el límite si el usuario eligió uno; si no, contra los ingresos del mes
  const tope = limite > 0 ? limite : sumar(ingresos.filter((i) => i.fecha.startsWith(mesActual)));
  $('mes').textContent = soles.format(delMes);
  const pct = tope > 0 ? Math.round(delMes / tope * 100) : 0;
  $('mes-detalle').classList.toggle('hidden', !(tope > 0));
  $('mes-barra').style.width = `${Math.min(pct, 100)}%`;
  $('mes-de').textContent = `${limite > 0 ? 'Límite' : 'De'} ${soles.format(tope)}`;
  $('mes-pct').textContent = `${pct} %`;
  $('mes-detalle').classList.toggle('excedido', pct > 100);
  pintarAvisoLimite(delMes, mesActual);
}

// Aviso emergente al superar el límite: sale al guardar un gasto que lo deja superado y,
// al abrir la web, una vez por sesión para ese mes y ese límite. Se cierra solo a los 5 s.
function gastadoEsteMes() {
  const mes = hoyISO().slice(0, 7);
  return sumar(gastos.filter((g) => g.fecha.startsWith(mes)));
}

function pintarAvisoLimite(delMes, mesActual) {
  const exceso = ajustes.limite > 0 ? redondear(delMes - ajustes.limite) : 0;
  if (exceso <= 0) { cerrarAlertaLimite(); return; }
  // Ni sobre la pantalla de acceso ni mientras llegan los datos de la nube
  if (!$('acceso').classList.contains('hidden') || document.documentElement.classList.contains('cargando-datos')) return;
  const clave = `${mesActual}|${ajustes.limite}`;
  let vista = null;
  try { vista = sessionStorage.getItem(CLAVE_ALERTA_LIMITE); } catch {}
  if (vista === clave) return;
  try { sessionStorage.setItem(CLAVE_ALERTA_LIMITE, clave); } catch {}
  mostrarAlertaLimite(delMes, exceso);
}

// Tras guardar un gasto: si el mes queda por encima del límite, avisa siempre
function alertarSiSuperaLimite() {
  const gastado = gastadoEsteMes();
  const exceso = ajustes.limite > 0 ? redondear(gastado - ajustes.limite) : 0;
  if (exceso > 0) mostrarAlertaLimite(gastado, exceso);
}

function mostrarAlertaLimite(gastado, exceso) {
  $('alerta-limite-texto').textContent = `Llevas ${soles.format(gastado)} este mes, ${soles.format(exceso)} más que tu límite.`;
  $('alerta-limite').classList.remove('hidden');
  // La barra cuenta los 5 s; al terminar cierra el aviso (se pausa con el ratón encima o con foco)
  const tiempo = $('alerta-limite-tiempo');
  tiempo.classList.remove('corre');
  void tiempo.offsetWidth;
  tiempo.classList.add('corre');
}

function cerrarAlertaLimite() {
  $('alerta-limite').classList.add('hidden');
  $('alerta-limite-tiempo').classList.remove('corre');
}

function render() {
  pintarNotaMedio();
  const mesActual = hoyISO().slice(0, 7);
  pintarResumenMes(sumar(gastos.filter((g) => g.fecha.startsWith(mesActual))), mesActual);

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

  renderListaGastos();
}

// Solo se pinta una parte de la lista: con años de registros, miles de filas harían lenta la web
const TAM_LISTA = 100;
let limiteLista = TAM_LISTA;

function etiquetaDia(fecha) {
  const hoy = hoyISO();
  return fecha === hoy ? 'Hoy' : fecha === sumarDias(hoy, -1) ? 'Ayer' : formatearFecha(fecha);
}

function renderListaGastos() {
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

  // Ordenados por fecha se agrupan por día, como en un estado de cuenta
  const agrupar = campo === 'fecha';
  $('tabla-gastos').classList.toggle('agrupada', agrupar);
  const porDia = new Map();
  if (agrupar) for (const g of lista) porDia.set(g.fecha, (porDia.get(g.fecha) || 0) + enSoles(g));

  const tbody = $('tabla');
  tbody.replaceChildren();
  let dia = null;
  for (const g of lista.slice(0, limiteLista)) {
    if (agrupar && g.fecha !== dia) {
      dia = g.fecha;
      const fila = document.createElement('tr');
      fila.className = 'fila-dia';
      const td = document.createElement('td');
      td.colSpan = 6;
      const nombre = document.createElement('span');
      nombre.textContent = etiquetaDia(dia);
      const total = document.createElement('span');
      total.textContent = soles.format(porDia.get(dia));
      td.append(nombre, total);
      fila.append(td);
      tbody.appendChild(fila);
    }
    const tr = document.createElement('tr');
    if (g.id === editandoId) tr.classList.add('editando');
    celda(tr, 'Fecha', formatearFecha(g.fecha), 'fecha');
    celda(tr, 'Descripción', g.descripcion);
    celda(tr, 'Categoría', etiquetaCategoria(g.categoria));
    celda(tr, 'Pago', etiquetaMedio(g.medio), 'pago');
    celda(tr, 'Importe', dinero(g.importe, g.moneda), 'num');
    const acciones = celda(tr, '', '', 'acciones');
    acciones.appendChild(boton('Editar', 'Editar gasto', () => editar(g.id)));
    acciones.appendChild(botonEliminar('Eliminar gasto', () => eliminar(g.id)));
    tbody.appendChild(tr);
  }
  const restantes = lista.length - limiteLista;
  $('ver-mas').classList.toggle('hidden', restantes <= 0);
  $('ver-mas').textContent = `Ver más (${restantes})`;

  // Estado vacío
  const sinResultados = lista.length === 0;
  $('vacio').classList.toggle('hidden', !sinResultados);
  $('tabla-gastos').classList.toggle('hidden', sinResultados);
  $('vacio-texto').textContent = gastos.length === 0
    ? 'Aún no hay gastos. ¡Añade el primero!'
    : 'No hay gastos que coincidan con la búsqueda.';
}
