// Intermediario /api/* → Supabase. La web nunca conoce la URL ni la clave del proyecto: viven en
// variables de Cloudflare (Worker → Settings → Variables and Secrets): SUPABASE_URL y SUPABASE_CLAVE
// (clave publishable). Solo se reenvían las rutas y cabeceras que usa la web; el resto responde 404.
// Las mismas reglas están en pruebas/proxy_local.py: si se añade una ruta, añadirla en los dos.

const RUTAS = [
  /^auth\/v1\/(signup|token|logout|user|settings|authorize|recover)$/,
  /^rest\/v1\/(tarjetas|gastos|ingresos|pagos|saldos|deudas|abonos|metas|aportes|tipos_cambio|preferencias|tipos_cambio_bcrp)$/,
];
const METODOS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const CABECERAS_ENTRADA = ['authorization', 'content-type', 'prefer', 'range', 'accept'];
const CABECERAS_SALIDA = ['content-type', 'content-range', 'location', 'preference-applied'];

function respuestaJSON(estado, datos) {
  return new Response(JSON.stringify(datos), {
    status: estado,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}

// `ruta` es lo que va después de /api/ (por ejemplo 'rest/v1/gastos')
export async function intermediario(request, env, ruta) {
  if (!env.SUPABASE_URL || !env.SUPABASE_CLAVE) {
    return respuestaJSON(500, { message: 'Falta configurar SUPABASE_URL y SUPABASE_CLAVE en Cloudflare.' });
  }
  if (!METODOS.includes(request.method)) return respuestaJSON(405, { message: 'Método no permitido' });
  if (!RUTAS.some((r) => r.test(ruta))) return respuestaJSON(404, { message: 'Ruta no permitida' });

  // Desde el navegador, solo la propia web (o una navegación directa) puede usar el intermediario
  const sitio = request.headers.get('Sec-Fetch-Site');
  if (sitio && sitio !== 'same-origin' && sitio !== 'none') return respuestaJSON(403, { message: 'Origen no permitido' });

  const cabeceras = new Headers({ apikey: env.SUPABASE_CLAVE });
  for (const nombre of CABECERAS_ENTRADA) {
    const valor = request.headers.get(nombre);
    if (valor) cabeceras.set(nombre, valor);
  }
  // Para que los límites de intentos de Supabase cuenten por usuario y no por Cloudflare
  const ip = request.headers.get('CF-Connecting-IP');
  if (ip) cabeceras.set('X-Forwarded-For', ip);

  const destino = env.SUPABASE_URL.trim().replace(/\/+$/, '') + '/' + ruta + new URL(request.url).search;
  let respuesta;
  try {
    respuesta = await fetch(destino, {
      method: request.method,
      headers: cabeceras,
      body: request.method === 'GET' ? undefined : await request.arrayBuffer(),
      redirect: 'manual', // /authorize responde con una redirección a Google que debe llegar al navegador
    });
  } catch {
    return respuestaJSON(502, { message: 'No se pudo contactar con la base de datos.' });
  }

  const salida = new Headers({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  for (const nombre of CABECERAS_SALIDA) {
    const valor = respuesta.headers.get(nombre);
    if (valor) salida.set(nombre, valor);
  }
  return new Response(respuesta.body, { status: respuesta.status, headers: salida });
}
