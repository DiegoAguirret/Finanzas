// Worker de Cloudflare: sirve la web (carpeta public/, que genera construir.py) con sus cabeceras de
// seguridad y hace de intermediario /api/* → Supabase (ver intermediario.js).
import { CABECERAS_SEGURIDAD } from './cabeceras.js'; // lo genera construir.py en cada publicación
import { intermediario } from './intermediario.js';

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname.startsWith('/api/')) return intermediario(request, env, pathname.slice('/api/'.length));

    const respuesta = await env.ASSETS.fetch(request);
    const cabeceras = new Headers(respuesta.headers);
    for (const [nombre, valor] of Object.entries(CABECERAS_SEGURIDAD)) cabeceras.set(nombre, valor);
    return new Response(respuesta.body, { status: respuesta.status, statusText: respuesta.statusText, headers: cabeceras });
  },
};
