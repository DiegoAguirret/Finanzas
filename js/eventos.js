// Eventos de la página
'use strict';

// ---- Eventos ----
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const datos = leerFormulario();
  if (!datos.descripcion || !(datos.importe > 0) || !datos.fecha || datos.fecha > hoyISO()) return;
  if (editandoId) actualizar(editandoId, datos);
  else crear(datos);
  try { localStorage.setItem(CLAVE_ULTIMO_MEDIO, datos.medio); } catch {}
  guardar();
  salirEdicion();
  render();
  alertarSiSuperaLimite();
  $('importe').focus();
});

$('btn-cancelar').addEventListener('click', () => { salirEdicion(); render(); });
const alFiltrarGastos = () => {
  limiteLista = TAM_LISTA;
  renderListaGastos();
};
$('buscar').addEventListener('input', alFiltrarGastos);
$('ver-mas').addEventListener('click', () => {
  limiteLista += TAM_LISTA;
  renderListaGastos();
});
$('filtro-categoria').addEventListener('change', alFiltrarGastos);
$('filtro-medio').addEventListener('change', alFiltrarGastos);
$('orden').addEventListener('change', alFiltrarGastos);
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
    descripcion: $('ing-descripcion').value.trim() || 'Ingreso',
    importe: $('ing-importe').value,
    moneda: $('ing-moneda').value,
    fecha: $('ing-fecha').value,
  });
  if (!datos || datos.fecha > hoyISO()) return;
  const existente = ingresos.find((x) => x.id === ingEditandoId);
  if (existente) Object.assign(existente, datos);
  else ingresos.push(datos);
  const { desde, hasta } = rangoBalance();
  mensajeBalance(datos.fecha < desde || datos.fecha > hasta
    ? `Ingreso guardado el ${formatearFecha(datos.fecha)}, fuera del periodo que estás viendo.`
    : '');
  salirEdicionIngreso();
  ingresosCambiados();
  $('ing-importe').focus();
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
    (p.tipoCambio ? ` (tu deuda baja ${dinero(p.importe, 'USD')}).` : '.'));
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
$('btn-cuenta').addEventListener('click', () => mostrarAcceso());
// Menú del usuario: se abre sobre su fila de la barra lateral
$('menu-usuario').addEventListener('beforetoggle', (e) => {
  if (e.newState !== 'open') return;
  const fila = $('btn-usuario').getBoundingClientRect();
  $('menu-usuario').style.left = `${Math.max(8, fila.left)}px`;
  $('menu-usuario').style.bottom = `${innerHeight - fila.top + 8}px`;
});
$('btn-salir').addEventListener('click', () => {
  $('menu-usuario').hidePopover();
  $('btn-usuario').focus(); // al cancelar, el foco vuelve aquí
  cerrarSesion();
});
$('dialogo').addEventListener('click', (e) => { if (e.target === $('dialogo')) $('dialogo').close(); });
$('sync-reintentar').addEventListener('click', () => {
  if (!sesion) return mostrarAcceso();
  if (nubeLista) sincronizar();
  else iniciarNube();
});
$('acceso-google').addEventListener('click', async () => {
  pintarAcceso();
  soltarGoogle = botonOcupado($('acceso-google'), 'Conectando con Google…', $('acceso-google-texto'));
  try {
    await entrarConGoogle(); // si todo va bien, la página se va a Google
  } catch (err) {
    pintarAcceso(ERRORES_ACCESO[err.codigo] || err.message);
    soltarGoogle();
  }
});
// Al volver atrás desde Google, el navegador restaura la página tal como quedó
let soltarGoogle = () => {};
addEventListener('pageshow', (e) => { if (e.persisted) soltarGoogle(); });
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
  pintarAcceso();
  const listo = botonOcupado($('acceso-entrar'), { entrar: 'Entrando…', registro: 'Creando cuenta…', recuperar: 'Enviando…', 'nueva-clave': 'Guardando…' }[accesoModo]);
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
    listo();
  }
});
addEventListener('online', () => {
  if (!sesion) return;
  if (nubeLista) sincronizar();
  else iniciarNube();
});

$('btn-menu').addEventListener('click', () => alternarMenu(true));
$('tab-mas').addEventListener('click', () => alternarMenu(true));
for (const [boton, extra] of [['btn-filtros', 'filtros-extra'], ['dash-filtros', 'dash-extra']]) {
  $(boton).addEventListener('click', () => {
    const abierto = $(extra).classList.toggle('abierto');
    $(boton).setAttribute('aria-expanded', String(abierto));
  });
}
$('fab').addEventListener('click', () => abrirHoja());
$('hoja-fondo').addEventListener('click', pedirCerrarHoja);
for (const [vista, [idForm]] of Object.entries(HOJAS)) {
  const hoja = $(idForm).closest('.hoja');
  const cerrar = document.createElement('button');
  cerrar.type = 'button';
  cerrar.className = 'hoja-cerrar';
  cerrar.setAttribute('aria-label', 'Cerrar');
  cerrar.title = 'Cerrar';
  cerrar.append(icono('cerrar'));
  cerrar.addEventListener('click', pedirCerrarHoja);
  hoja.prepend(cerrar);
  hoja.querySelector('.acciones-form .btn-secondary').addEventListener('click', () => cerrarHoja());
  $(idForm).addEventListener('submit', () => { if (vista === vistaActual) setTimeout(cerrarHoja); });
}
const pintarBotonOcultar = () => {
  const texto = pantallaMovil.matches ? 'Cerrar' : 'Ocultar';
  $('btn-ocultar').setAttribute('aria-label', texto);
  $('btn-ocultar').title = texto;
};
pintarBotonOcultar();
$('btn-ocultar').addEventListener('click', () => alternarMenu(false));
$('menu-fondo').addEventListener('click', cerrarMenuMovil);
document.querySelector('.barra-nav').addEventListener('click', cerrarMenuMovil);
addEventListener('keydown', (e) => {
  // Con el menú del usuario o una ventana abiertos, Escape solo cierra eso
  if (e.key !== 'Escape' || $('dialogo').open || $('menu-usuario').matches(':popover-open')) return;
  if (hojaAbierta) return pedirCerrarHoja();
  cerrarMenuMovil();
});
pantallaMovil.addEventListener('change', () => {
  cerrarHoja(false);
  pintarBotonOcultar();
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
  if (e.key === 'finanzas.tema') {
    aplicarTema(temaGuardado());
    renderVista();
  }
  if (e.key === 'finanzas.fondo') {
    document.documentElement.dataset.fondo = Object.hasOwn(FONDOS, e.newValue ?? '') ? e.newValue : 'liso';
    for (const r of document.querySelectorAll('input[name="fondo"]')) r.checked = r.value === document.documentElement.dataset.fondo;
  }
  if (e.key === 'finanzas.paleta') {
    document.documentElement.dataset.paleta = Object.hasOwn(PALETAS, e.newValue ?? '') ? e.newValue : 'esmeralda';
    for (const r of document.querySelectorAll('input[name="paleta"]')) r.checked = r.value === document.documentElement.dataset.paleta;
    pintarColorNavegador();
    renderVista();
  }
  if (![CLAVE, CLAVE_INGRESOS, CLAVE_TARJETAS, CLAVE_PAGOS, CLAVE_TC, CLAVE_SIM, CLAVE_CATEGORIAS, CLAVE_AJUSTES, CLAVE_DEUDAS, CLAVE_ABONOS, CLAVE_SALDOS, CLAVE_METAS, CLAVE_APORTES, CLAVE_NEGOCIO, CLAVE_SINCRONIZADO].includes(e.key)) return;
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
$('sal-cancelar').addEventListener('click', () => { salirEdicionSaldo(); renderTarjeta(); });
$('sal-tarjeta').addEventListener('change', () => {
  if (salEditandoIds.length) salirEdicionSaldo();
  tarSeleccion = $('sal-tarjeta').value;
  pagoSugerido = null;
  $('pago-tc').value = '';
  renderTarjeta();
});
$('sal-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const t = tarjetaDe(tarSeleccion);
  const cuotas = Math.min(60, Math.max(1, Math.trunc(numero($('sal-cuotas').value))));
  if (!t || !configurada(t)) return;
  // Con varias cuotas, un pago en cada ciclo a partir del elegido; al editar se reemplaza el grupo
  const ids = salEditandoIds;
  const primero = indiceCiclo($('sal-vence').value, t.corte);
  const nuevos = Array.from({ length: cuotas }, (_, i) => saldoValido({
    id: ids[i] || nuevoId(), tarjeta: t.id, fecha: cicloDe(primero + i, t).hasta, moneda: $('sal-moneda').value, importe: $('sal-importe').value,
    negocio: $('sal-negocio').checked,
  }));
  if (nuevos.some((s) => !s)) return;
  saldos = saldos.filter((x) => !ids.includes(x.id)).concat(nuevos);
  salirEdicionSaldo();
  saldosCambiados();
});
$('tar-modo-pago').addEventListener('change', () => {
  $('tar-pago').value = '';
  pintarModoPago();
});
for (const id of ['tar-corte', 'tar-pago']) $(id).addEventListener('input', pintarModoPago);
// El banco se deduce del nombre hasta que el usuario lo elija
$('tar-nombre').addEventListener('input', () => {
  if (!bancoElegido) $('tar-banco').value = bancoDeNombre($('tar-nombre').value);
});
$('tar-banco').addEventListener('change', () => { bancoElegido = true; });
for (const id of ['medio', 'fecha']) $(id).addEventListener('change', pintarNotaMedio);
for (const r of document.querySelectorAll('input[name="aj-compras"]')) {
  r.addEventListener('change', () => {
    ajustes = ajustesValidos({ ...ajustes, compras: r.value });
    guardarAjustes();
    render();
  });
}
$('plan-base').addEventListener('change', () => cambiarPlan({ base: $('plan-base').value }));
$('plan-regla').addEventListener('change', () => cambiarPlan({ regla: $('plan-regla').value }));
$('plan-meses').addEventListener('change', () => cambiarPlan({ meses: $('plan-meses').value }));
$('plan-fondo').addEventListener('change', () => cambiarPlan({ fondo: $('plan-fondo').value || null }));
for (const id of ['plan-n', 'plan-g', 'plan-a']) {
  $(id).addEventListener('input', () => {
    const pct = ['plan-n', 'plan-g', 'plan-a'].map((x) => Math.round(numero($(x).value)));
    const suma = pct[0] + pct[1] + pct[2];
    $('plan-suma').textContent = suma === 100 ? '' : `Suman ${suma} %: deben sumar 100 %.`;
    if (suma === 100 && pct.every((n) => n >= 0)) cambiarPlan({ pct });
  });
}
$('plan-crear-fondo').addEventListener('click', () => {
  const objetivo = redondear(cifrasPlan().necesidades * ajustes.plan.meses);
  const meta = metaValida({ id: nuevoId(), nombre: 'Fondo de emergencia', icono: 'escudo', color: 'verde', moneda: 'PEN', objetivo });
  if (!meta) return;
  metas.push(meta);
  guardarMetas();
  cambiarPlan({ fondo: meta.id });
});
$('aj-saldo').addEventListener('change', () => {
  ajustes = ajustesValidos({ ...ajustes, saldoInicial: $('aj-saldo').value });
  guardarAjustes();
  render();
});
$('aj-limite').addEventListener('change', () => {
  ajustes = ajustesValidos({ ...ajustes, limite: $('aj-limite').value });
  guardarAjustes();
  render();
});
$('alerta-limite-cerrar').addEventListener('click', cerrarAlertaLimite);
$('alerta-limite-tiempo').addEventListener('animationend', cerrarAlertaLimite);
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

addEventListener('hashchange', alCambiarHash);
// Recargar o cerrar la pestaña con cambios sin guardar: el navegador pide confirmar
addEventListener('beforeunload', (e) => {
  if (sucios.size || repartoSinTerminar()) e.preventDefault();
});
let esperaResize;
addEventListener('resize', () => {
  clearTimeout(esperaResize);
  esperaResize = setTimeout(renderVista, 150);
});
addEventListener('scroll', ocultarTip, { passive: true });

// Fecha de hoy en la barra superior: «Domingo, 1 de noviembre» (en móvil, «Dom, 1 nov»)
function pintarFecha() {
  const texto = (opciones) => new Date().toLocaleDateString('es-PE', opciones).replace(/^./, (l) => l.toUpperCase());
  $('hoy-larga').textContent = texto({ weekday: 'long', day: 'numeric', month: 'long' });
  $('hoy-corta').textContent = texto({ weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '').replace(' de ', ' ');
  $('hoy').dateTime = hoyISO();
  // Un gasto o un ingreso no puede tener fecha futura
  $('fecha').max = hoyISO();
  $('ing-fecha').max = hoyISO();
  $('neg-fecha').max = hoyISO();
}
