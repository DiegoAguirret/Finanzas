# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Web de finanzas personales de **Diego Aguirre**: `finanzas.html` (HTML + CSS + JS vanilla en un solo archivo) con los datos en **Supabase** (PostgreSQL; esquema en `supabase/esquema.sql`). Sin dependencias, sin build, sin tests ni linter. El usuario escribe en español: la interfaz, los identificadores y los comentarios del código también están en español; mantenlo así.

Restricciones que el usuario pidió explícitamente:
- La web sigue en **un solo archivo HTML** sin librerías ni CDNs: Supabase se usa con `fetch` directo (REST y Auth), sin `supabase-js`.
- Monedas: **soles** (`S/ 1,250.00`, `Intl.NumberFormat('es-PE', { currency: 'PEN' })`) y **dólares** (`US$ 80.00`, formateado a mano en `dinero()` porque es-PE escribe `USD`).
- El tipo de cambio debe ser **el de cada banco** (BCP e Interbank tienen tasas distintas). No publican una fuente abierta: los registra el usuario; el del BCRP se trae solo y es el respaldo. No raspar las webs de los bancos.
- Estilo limpio y moderno, con modo claro/oscuro y diseño responsive (móvil a 375 px sin scroll horizontal).
- Aprovechar el ancho de pantalla: contenido hasta 1800 px; en ≥1400 px los pares formulario + lista van en columnas (`.columnas.lateral-izq` / `.lateral-der`, la sección estrecha con `.estrecha`, fija al hacer scroll). Las tablas que no caben se desplazan dentro de su tarjeta (`.card:has(table)`), nunca la página.

## Supabase

- Proyecto `https://incynxtdufsfjewjqffe.supabase.co`; en la web van la URL y la clave **publishable** (pública). Nunca pedir ni usar la `service_role` / secret.
- `supabase/esquema.sql` crea tablas, Row Level Security (cada usuario solo ve sus filas), la función `actualizar_tipo_cambio_bcrp()` (extensión `http`, consulta al BCRP como mucho una vez por hora) y un trabajo de `pg_cron`. Es idempotente: el usuario lo pega en **SQL Editor → Run**. Cambios de esquema = editar ese archivo y pedir al usuario que lo vuelva a ejecutar.
- Tablas: `tarjetas`, `gastos` (`medio` = efectivo | debito | credito | tarjeta + columna `tarjeta`), `ingresos`, `pagos`, `tipos_cambio` (por usuario: bcp/interbank), `preferencias` (simulador) y `tipos_cambio_bcrp` (pública, solo lectura).
- Acceso: correo + contraseña y **Google** (OAuth con PKCE: `entrarConGoogle()` va a `/auth/v1/authorize`, vuelve con `?code=…` y `completarGoogle()` lo canjea en `/auth/v1/token?grant_type=pkce` con el verificador de `sessionStorage`). Google no funciona abriendo el archivo con doble clic (`file://`): la web debe abrirse desde una dirección `http(s)` que esté en **Authentication → URL Configuration → Redirect URLs**. Antes de redirigir se lee `/auth/v1/settings` para avisar si Google está desactivado.
- No crear cuentas ni iniciar sesión en el Supabase real para probar. Desde fuera solo se puede comprobar lo público (p. ej. que `tipos_cambio_bcrp` responda y que `gastos` sin sesión devuelva vacío/401).

## Cómo ejecutarlo y probarlo

Se abre con doble clic, pero la extensión de Chrome no puede abrir `file://`, así que para pruebas automatizadas se sirve en local. No hay Node (no se puede usar `node --check`); Python 3 sí.

- **Interfaz sin nube**: `python -m http.server 8765 --bind 127.0.0.1` → `http://127.0.0.1:8765/finanzas.html` y elegir «Usar sin cuenta».
- **Con nube simulada**: `python -I pruebas/supabase_falso.py finanzas.html 8766` → `http://127.0.0.1:8766/finanzas.html`. Imita Auth (también Google: `/auth/v1/authorize` aprueba al instante como `google@ejemplo.test`), las tablas (filtradas por usuario, como RLS) y el tipo de cambio del BCRP; `/__estado` vuelca las tablas y `/__caida?activa=1` simula que el servidor no responde. Lee el HTML al arrancar: reiniciarlo tras editar la web. Ahí sí se pueden crear cuentas de prueba (`@ejemplo.test`).

Verificación en el navegador: cargar datos de prueba en `localStorage`, recorrer las vistas, revisar la consola y comprobar anchos de 375 a 1920 px. Al terminar, borrar el `localStorage` de esos orígenes, parar los servidores y borrar `pruebas/supabase_falso_estado.json`. No tocar los datos del origen `file://` del usuario.

## Arquitectura

**Estado local** (`localStorage`, siempre con `leerJSON`/`escribirJSON` o try/catch). Es la copia que permite abrir al instante y trabajar sin conexión:
- `finanzas.gastos` — `{ id, descripcion, importe, moneda, categoria, medio, fecha }` (`fecha` ISO `YYYY-MM-DD`; `importe` a 2 decimales en su `moneda` `PEN` | `USD`; `medio` = `efectivo` | `debito` | `credito` (claves de `MEDIOS_FIJOS`) o el `id` de una tarjeta. `medioValido()`: sin medio → `efectivo`; tarjeta desconocida → `credito`).
- `finanzas.ingresos` — `{ id, descripcion, importe, moneda, fecha }` (`ingresoValido()`).
- `finanzas.tarjetas` — `{ id, nombre, banco, corte, pago, linea }` (`banco` = bcp | interbank | otro; corte/pago 1–31 o `null`; `linea` en soles, 0 = sin indicar; `tarjetaValida()`, que deduce el banco del nombre en tarjetas antiguas).
- `finanzas.pagos` — `{ id, tarjeta, fecha, moneda, importe, pagadoMoneda, pagado, tipoCambio }`: abona `importe` a la deuda en `moneda`; de tu dinero sale `pagado` en `pagadoMoneda`; si difieren, `tipoCambio` es el S/ por US$ que aplicó el banco (`pagoValido()`; los pagos antiguos `{ importe }` se leen como soles).
- `finanzas.tipos_cambio` — `{ bcrp, bcp, interbank }`, listas `{ fecha, compra, venta }` ordenadas por fecha.
- `finanzas.simulacion`, `finanzas.tema` (aplicado en `<head>` antes de pintar).
- Nube: `finanzas.sesion` (token, renovación, usuario), `finanzas.modo` (`'local'` = usar sin cuenta), `finanzas.sincronizado` (filas tal como las confirmó la nube) y `finanzas.dueno` (usuario dueño de la copia local).
- Migraciones al cargar: `finanzas.tarjeta` (una sola tarjeta antigua → tarjeta Interbank), `pagados` en tarjetas (→ pagos por el total del ciclo, vía `pagadosAntiguos` y `cargarPagos()`), y `normalizarIds()` cambia ids que no son uuid y actualiza referencias. Orden de carga: `cargarTiposCambio()` → `cargar()` → `cargarIngresos()` → `cargarTarjetas()` → normalizar medio/moneda de gastos → `cargarPagos()` → `normalizarIds()`.

**Sincronización** (sección «Nube»): `api()` hace las llamadas (renueva el token con `renovarSesion()`). Cada `guardarX()` escribe la copia local y llama a `programarSync()`; `sincronizar()` compara `filasDe(tabla)` (vía `TABLAS[t].aFila`) con `sincronizado` y sube con upsert (`on_conflict=id`) solo lo cambiado, en el orden de `ORDEN_TABLAS` (tarjetas primero) y borra en orden inverso. `nubeLista` impide subir nada hasta que `iniciarNube()` decide qué hacer con la copia local:
  - copia de otra cuenta → se borra; misma cuenta con cambios sin subir → se suben primero;
  - copia sin dueño (datos de antes o del modo sin cuenta) → se **unen** con la nube y se suben;
  - luego descarga todo (`descargarDeLaNube()` / `aplicarNube()`).
  Cerrar sesión borra la copia local (`borrarCopiaLocal()`). Sin conexión, el estado muestra «⚠️ Sin guardar · reintentar» y se reintenta solo (`online` y cada 30 s).

**Moneda y tipo de cambio**: todos los totales son en soles; `sumar()` usa `enSoles(x)`. Gastos en dólares → **venta** del banco de la tarjeta con que se pagó (`tasaPara(banco, fecha, lado)`; si el banco no tiene tasa, BCRP); ingresos en dólares → **compra**. `tasa()` toma el último tipo de cambio hasta esa fecha. Sin ningún tipo de cambio, los dólares no suman y `#aviso-tc` lo avisa. `actualizarBCRP()` llama a la función de Supabase y descarga `tipos_cambio_bcrp` (público, también sin sesión).

`CATEGORIAS` es la lista fija de categorías; cada una tiene clases `.tag-<Categoria>` (claro y oscuro) en el CSS, así que añadir una categoría implica añadir también sus estilos.

**Vistas y navegación**: barra lateral con enlaces por hash (`#gastos`, `#ingresos`, `#dashboard`, `#tarjeta`, `#simulador`, `#datos`). Cada vista es un `<div class="vista" id="vista-…">`; `mostrarVista()` (en `hashchange`) oculta las demás con `.hidden` y llama a `renderVista()`. En ≤860 px la barra lateral se convierte en una fila de pestañas horizontal. La cabecera muestra la cuenta y el estado de la sincronización; `#acceso` es la pantalla de inicio de sesión / registro.

**Flujo de render**:
- `render()` actualiza la vista Gastos (resumen, tabla con filtro/orden; el orden por importe compara en soles), el pie de la barra lateral y el aviso de tipo de cambio. Se llama tras cualquier cambio en `gastos` o `ingresos`.
- `renderDashboard()` y `renderSimulador()` solo se ejecutan cuando su vista está activa (al cambiar de vista, al cambiar sus controles y en `resize` con debounce), porque los gráficos miden el ancho real del contenedor (`clientWidth`) y una vista oculta mide 0.

**Gráficos**: SVG generado a mano (`svgEl`, `escala`, `graficoBarras`, `graficoLineas`) con un único tooltip compartido (`mostrarTip`/`conTooltip`, también accesible con foco de teclado). Colores de series en variables CSS `--serie-1`/`--serie-2` (con valores propios para modo oscuro); el texto de los gráficos usa los tokens de texto, nunca el color de la serie.

**Tarjetas**: alta/edición con el mismo patrón que los gastos (`tarEditandoId`), lista con resumen por tarjeta, sección de tipo de cambio (`renderTiposCambio()`, formulario `tc-form` → `guardarTasaBanco()`) y detalle de la seleccionada (`tarSeleccion`). Eliminar una tarjeta (dos clics) no borra sus gastos: pasan a `credito`, que cuenta como dinero que sale al comprar; por eso también se eliminan sus pagos. `ciclosTarjeta(t)`/`resumenTarjeta(t)` agrupan los gastos con `medio === t.id` por ciclo de facturación (del día siguiente al corte anterior hasta el corte; días recortados al último del mes; si el día de pago no es posterior al corte, el vencimiento cae el mes siguiente). Todo importe de tarjeta va **por moneda** (`montos()` = `{ PEN, USD }`, `textoMontos()`, `textoDeuda()`): deuda = compras − abonos en cada moneda; los abonos se asignan a los ciclos del más antiguo al más reciente (`c.pagado`, `c.pendiente`, `c.paraSaldar`). La línea de crédito es en soles y la deuda en dólares la usa a la venta del banco. El formulario de pago (`actualizarFormPago()`) pide en qué deuda, con qué se paga y, si pagas en soles una deuda en dólares, el tipo de cambio aplicado (propone la venta del banco).

**Dashboard**: `baseDashboard()` rehace el desplegable `dash-base` con «Por ciclo de <tarjeta>» para cada tarjeta configurada más «Por mes calendario», y devuelve la tarjeta elegida (`null` = mes; por defecto la primera tarjeta). Los periodos se indexan como `año * 12 + mes` (`indiceDash`/`periodoDash`; en modo ciclo el mes es el del corte). Con un solo periodo (el actual) muestra evolución diaria hasta hoy y lo compara con el periodo anterior hasta el mismo día transcurrido; con varios, promedio por periodo y barras por periodo. Filtro opcional por medio de pago. Importes en soles (`enSoles`).

**Ingresos y balance** (`renderBalance()`): trabaja sobre un rango de fechas (`rangoBalance()`). `cifrasPeriodo(desde, hasta)` calcula en soles:
  - **Ahorro** = ingresos − todos los gastos (los de tarjeta cuentan el día de la compra).
  - **Cambio en tu dinero** = ingresos − gastos que no son con tarjeta − pagos de tarjeta (`pagoEnSoles`).
  - Ahorro = cambio en tu dinero − (compras con tarjeta − pagos): la cadena de «Cómo cuadran tus cuentas» siempre cuadra. Aparte, `dineroPor` y `deudaPor` dan el cambio real en cada moneda, y `deudaAl(fecha)` la deuda por moneda.
  Si el periodo incluye hoy y hay saldo, sugiere cuánto gastar por día. «Movimientos del periodo» junta ingresos (editables aquí), gastos y pagos con su moneda. Historial de los últimos 12 meses.

**Simulador**: la base mensual por categoría = promedio de los últimos 3 meses naturales (en soles), dividido entre los meses que tienen registros (mínimo 1). Si el usuario edita una base, se guarda en `sim.bases` y prevalece sobre la calculada; "Restablecer" borra ajustes, bases editadas y el gasto extra. Se sincroniza en `preferencias`.

## Convenciones

- **Nunca `innerHTML` con datos del usuario**: todo el texto se inserta con `textContent`/`createElement` (también en tooltips y SVG).
- Sin `alert`/`confirm`: las acciones destructivas usan confirmación en dos clics que se cancela sola a los 3 s (eliminar gasto, ingreso, tarjeta o pago, borrar todo, cerrar sesión con cambios sin subir). «Borrar todo» elimina gastos, ingresos y pagos, pero conserva las tarjetas.
- Colores siempre como variables CSS en `:root` con su redefinición en `:root[data-theme="dark"]`.
- Ids siempre uuid (`nuevoId()`), porque la base usa `uuid` como clave.
- La exportación JSON es `{ gastos, ingresos, tarjetas, pagos, tiposCambio }`; la importación acepta ese formato o un array de gastos (formato antiguo), añade primero las tarjetas nuevas (`tarjetaValida`), luego valida cada gasto, ingreso y pago, omite ids duplicados y llama a `normalizarIds()`. La exportación CSV (solo gastos, con moneda) antepone `'` a valores que empiezan por `= + - @` para evitar fórmulas en Excel.
