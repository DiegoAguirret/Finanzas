// Ajustes por secciones
'use strict';

// ---- Ajustes por secciones ----
let ajusteActual = 'cuenta';
function abrirAjuste(nombre) {
  ajusteActual = nombre;
  renderAjustes();
}

// Qué pasaría con una compra de hoy en cada tarjeta del usuario, con sus propias fechas
function pintarEjemplosCompras() {
  const hay = tarjetas.length > 0;
  $('aj-ej-vence').textContent = hay ? 'Si compras hoy, se resta:' : 'Se resta en la fecha en que debes pagarla.';
  $('aj-ej-compra').textContent = hay ? 'Si compras hoy, se resta hoy.' : 'Se resta en la fecha en que la haces.';
  $('aj-ej-tarjetas').replaceChildren(...tarjetas.map((t) => {
    const fila = document.createElement('span');
    const nombre = document.createElement('span');
    nombre.textContent = t.nombre;
    const fecha = document.createElement('span');
    fecha.textContent = configurada(t) ? fechaCorta(vencimientoCompra(hoyISO(), t)) : 'Falta corte o pago: se resta el día de la compra';
    fila.append(nombre, fecha);
    return fila;
  }));
}

function renderAjustes() {
  for (const b of document.querySelectorAll('.ajustes-menu button')) {
    if (b.dataset.ajuste === ajusteActual) b.setAttribute('aria-current', 'true');
    else b.removeAttribute('aria-current');
  }
  for (const r of document.querySelectorAll('input[name="aj-compras"]')) r.checked = r.value === ajustes.compras;
  if (document.activeElement !== $('aj-saldo')) $('aj-saldo').value = ajustes.saldoInicial || '';
  if (document.activeElement !== $('aj-limite')) $('aj-limite').value = ajustes.limite || '';
  pintarEjemplosCompras();
  for (const nombre of ['cuenta', 'apariencia', 'preferencias', 'categorias', 'datos']) $('aj-' + nombre).classList.toggle('activo', nombre === ajusteActual);
  if (ajusteActual === 'categorias') renderCategorias();
}

async function guardarNombreCuenta(e) {
  e.preventDefault();
  const nombre = $('aj-nombre').value.trim();
  if (!sesion || !nombre) return;
  const listo = botonOcupado($('aj-nombre-guardar'), 'Guardando…');
  try {
    const usuario = await api('/auth/v1/user', { metodo: 'PUT', cuerpo: { data: { full_name: nombre } } });
    sesion.usuario.nombre = nombreDe(usuario) || nombre;
    escribirJSON(CLAVE_SESION, sesion);
    $('aj-nombre').blur();
    pintarCuenta();
    mensajeDatos('Nombre actualizado.');
  } catch (err) {
    mensajeDatos(ERRORES_ACCESO[err.codigo] || err.message, true);
  } finally {
    listo();
  }
}
