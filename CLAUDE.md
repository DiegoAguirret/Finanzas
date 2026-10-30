# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Web de finanzas personales de **Diego Aguirre**: `finanzas.html` (HTML + CSS + JS vanilla en un solo archivo) con los datos en **Supabase** (PostgreSQL; esquema en `supabase/esquema.sql`). Sin dependencias, sin build, sin tests ni linter. El usuario escribe en español: la interfaz, los identificadores y los comentarios del código también están en español; mantenlo así.

Restricciones que el usuario pidió explícitamente:
- La web es para **muchos usuarios** y debe poder escalar.
- **Ninguna credencial en el front**: ni la URL ni la clave de Supabase están en `finanzas.html`. La web llama a `/api/…` de su propio dominio y `functions/api/[[ruta]].js` (Cloudflare Pages Functions) reenvía a Supabase añadiendo la clave desde variables de entorno (`SUPABASE_URL`, `SUPABASE_CLAVE`).
- La web sigue en **un solo archivo HTML** sin librerías ni CDNs (REST y Auth con `fetch`, sin `supabase-js`).
- Monedas: **soles** (`S/ 1,250.00`, `Intl.NumberFormat('es-PE', { currency: 'PEN' })`) y **dólares** (`US$ 80.00`, formateado a mano en `dinero()` porque es-PE escribe `USD`).
- El tipo de cambio debe ser **el de cada banco** (BCP e Interbank tienen tasas distintas). No publican una fuente abierta: los registra el usuario; el del BCRP se trae solo y es el respaldo. No raspar las webs de los bancos.
- Estilo limpio y moderno, con modo claro/oscuro y diseño responsive (móvil a 375 px sin scroll horizontal).
- Aprovechar el ancho de pantalla: contenido hasta 1800 px; en ≥1400 px los pares formulario + lista van en columnas (`.columnas.lateral-izq` / `.lateral-der`, la sección estrecha con `.estrecha`, fija al hacer scroll). Las tablas que no caben se desplazan dentro de su tarjeta (`.card:has(table)`), nunca la página.

## Supabase

- Proyecto `https://incynxtdufsfjewjqffe.supabase.co`. La clave **publishable** vive solo en las variables de Cloudflare y en `.dev.vars` (local, ignorado por git). Nunca pedir ni usar la `service_role` / secret.
- El intermediario solo permite las rutas que usa la web (lista `RUTAS`, igual en `pruebas/proxy_local.py`): `auth/v1/{signup,token,logout,user,settings,authorize,recover}` y las tablas. Responde 403 a peticiones de otros sitios (`Sec-Fetch-Site`), no guarda en caché y pasa `CF-Connecting-IP` como `X-Forwarded-For`. Una ruta nueva en la web = añadirla en los dos sitios.
- `supabase/esquema.sql` crea tablas, Row Level Security (cada usuario solo ve sus filas), la función `actualizar_tipo_cambio_bcrp()` (extensión `http`; solo la ejecuta `pg_cron` cada hora en días hábiles, sin permiso para `anon`/`authenticated`; nunca lanza error: si el BCRP no devuelve el JSON esperado, devuelve 0) y el trabajo de `pg_cron`. El script no debe terminar con llamadas que dependan de servicios externos: si fallan, el editor de Supabase deshace todo el script. Desde octubre de 2026 el BCRP a veces responde con una página anti-bots («Pardon Our Interruption»): no intentar esquivarla. Es idempotente: el usuario lo pega en **SQL Editor → Run**. Cambios de esquema = editar ese archivo y pedir al usuario que lo vuelva a ejecutar.
- Tablas: `tarjetas`, `gastos` (`medio` = efectivo | debito | credito | tarjeta + columna `tarjeta`), `ingresos`, `pagos`, `tipos_cambio` (por usuario: bcp/interbank), `preferencias` (simulador) y `tipos_cambio_bcrp` (pública, solo lectura).
- Acceso (pantalla `#acceso`, modos `accesoModo` = entrar | registro | recuperar | nueva-clave): correo + contraseña (mínimo 8), **confirmación por correo** activada en Supabase, recuperación de contraseña y **Google**. Google, la confirmación y la nueva contraseña usan **PKCE**: `nuevoPKCE(tipo)` guarda el verificador en `localStorage` (24 h, para que el enlace del correo funcione en otra pestaña), Supabase vuelve con `?code=…` y `completarAcceso()` lo canjea en `/auth/v1/token?grant_type=pkce`; si el tipo era `recuperar`, se pide la nueva contraseña (`PUT /auth/v1/user`). La dirección de vuelta (`urlDeVuelta()`) debe estar en **Authentication → URL Configuration → Redirect URLs**.
- Abierta con doble clic (`file://`) la web no puede usar `/api`: solo funciona «Usar sin cuenta».
- Descargas siempre paginadas (`traerTodo()`, páginas de 1000 ordenadas), porque Supabase devuelve como mucho 1000 filas por consulta.
- No crear cuentas ni iniciar sesión en el Supabase real para probar. Desde fuera solo se puede comprobar lo público (p. ej. que `tipos_cambio_bcrp` responda y que `gastos` sin sesión devuelva vacío/401).

## Cómo ejecutarlo y probarlo

Se abre con doble clic, pero la extensión de Chrome no puede abrir `file://`, así que para pruebas automatizadas se sirve en local. No hay Node (no se puede usar `node --check`); Python 3 sí.

- **Contra Supabase real (uso local)**: `python -I pruebas/proxy_local.py` → `http://localhost:8765/` (lee `.dev.vars`). No usarlo para crear cuentas de prueba.
- **Con nube simulada**: `python -I construir.py` y luego `python -I pruebas/supabase_falso.py public/index.html 8766` → `http://127.0.0.1:8766/`. Imita el intermediario `/api` + Supabase y aplica las cabeceras de `public/_headers` (CSP incluida). Simula Auth (Google aprueba al instante como `google@ejemplo.test`; `/__confirmar?activo=1` exige confirmar por correo y `/__correo` da el último enlace de confirmación o de nueva contraseña), las tablas (filtradas por usuario, límite de 1000 filas por consulta) y el BCRP; `/__estado` vuelca las tablas y `/__caida?activa=1` simula una caída. Se pueden encadenar: `proxy_local.py` con `SUPABASE_URL=http://127.0.0.1:8766/api` prueba las reglas del intermediario. Ahí sí se pueden crear cuentas de prueba (`@ejemplo.test`).

Verificación en el navegador: cargar datos de prueba en `localStorage`, recorrer las vistas, revisar la consola y comprobar anchos de 375 a 1920 px. Al terminar, borrar el `localStorage` de esos orígenes, parar los servidores y borrar `pruebas/supabase_falso_estado.json`. No tocar los datos del origen `file://` del usuario.

## Publicación

Repositorio git **privado** en GitHub (`DiegoAguirret/Finanzas`), publicado con **Cloudflare Pages** (se despliega solo con cada `git push` a `main`). Comando de compilación: `python3 construir.py`; directorio de salida: `public`. `construir.py` copia la web a `public/index.html` (normalizando los saltos de línea a LF, como hace el navegador antes de calcular el hash: en Windows el archivo tiene CRLF) y escribe `public/_headers` con cabeceras de seguridad y una **Content-Security-Policy** que solo permite los `<script>` de la página por su hash SHA-256 y conexiones a su mismo dominio: no añadir scripts externos ni manejadores `on…` en el HTML, y no conectar a otros dominios desde la web. `functions/` se despliega como el intermediario `/api`. No se publican `supabase/`, `pruebas/` ni este archivo. La dirección publicada debe estar en Supabase → Authentication → URL Configuration (Site URL y Redirect URLs con `/**`) para que funcione el acceso con Google. Hacer commit y push solo cuando el usuario lo pida.

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

**Moneda y tipo de cambio**: todos los totales son en soles; `sumar()` usa `enSoles(x)`. Gastos en dólares → **venta** del banco de la tarjeta con que se pagó (`tasaPara(banco, fecha, lado)`; si el banco no tiene tasa, BCRP); ingresos en dólares → **compra**. `tasa()` toma el último tipo de cambio hasta esa fecha. Sin ningún tipo de cambio, los dólares no suman y `#aviso-tc` lo avisa. `cargarBCRP()` solo lee `tipos_cambio_bcrp` (público, también sin sesión); la actualiza `pg_cron`.

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
