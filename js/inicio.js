// Arranque de la web: va siempre al final
'use strict';

// ---- Inicio ----
aplicarTema(temaGuardado());
crearPaletas();
crearFondos();
pintarFecha();
document.addEventListener('visibilitychange', pintarFecha); // si la pestaña sigue abierta al día siguiente
$('fecha').value = hoyISO();
$('ing-fecha').value = hoyISO();
$('pago-fecha').value = hoyISO();
$('tc-fecha').value = hoyISO();
cargarTiposCambio();
cargar();
cargarIngresos();
cargarTarjetas(); // después de cargar(): la migración mira los gastos con medio 'interbank'
normalizarGastos();
cargarPagos(); // después de tarjetas y gastos: migra los ciclos marcados como pagados
normalizarIds();
poblarMedios();
cargarSim();
cargarObjetivos();
poblarCategorias();
salirEdicion();
salirEdicionDeuda();
salirEdicionMeta();
salirEdicionNegocio();
salirEdicionCategoria();
iniciarFormularios();
pintarIconos();
render();
mostrarVista();

// Nube: con sesión guardada se descargan los datos; sin ella se pide iniciar sesión
// (salvo que el usuario haya elegido usar la web sin cuenta)
sincronizado = leerJSON(CLAVE_SINCRONIZADO, {});
sesion = leerJSON(CLAVE_SESION, null);
pintarCuenta();
(async () => {
  let errorAcceso = '', tipo = null;
  // Se vuelve de Google o de un enlace del correo: mientras se canjea, se avisa que se está entrando
  if (new URLSearchParams(location.search).has('code')) cargaInicial(true);
  try {
    tipo = await completarAcceso();
    if (tipo) {
      try { localStorage.removeItem(CLAVE_MODO); } catch {}
    }
  } catch (err) {
    errorAcceso = ERRORES_ACCESO[err.codigo] || err.message;
  }
  cargaInicial(false);
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
