"""Servidor local para usar la web en tu PC contra Supabase real, igual que en Cloudflare.

Sirve finanzas.html en http://localhost:8765/ y reenvía /api/* a Supabase añadiendo la clave, con las
mismas rutas permitidas que functions/api/[[ruta]].js. La URL y la clave se leen de .dev.vars (en la
raíz del proyecto, ignorado por git) o de las variables de entorno SUPABASE_URL y SUPABASE_CLAVE:

    SUPABASE_URL=https://xxxx.supabase.co
    SUPABASE_CLAVE=sb_publishable_...

Uso: python -I pruebas/proxy_local.py   →   http://localhost:8765/
Para entrar con Google, http://localhost:8765/** debe estar en Redirect URLs de Supabase.
"""
import os
import pathlib
import re
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

RAIZ = pathlib.Path(__file__).resolve().parent.parent
PUERTO = 8765
RUTAS = [
    re.compile(r'^auth/v1/(signup|token|logout|user|settings|authorize|recover)$'),
    re.compile(r'^rest/v1/(tarjetas|gastos|ingresos|pagos|tipos_cambio|preferencias|tipos_cambio_bcrp)$'),
]
CABECERAS_ENTRADA = ['authorization', 'content-type', 'prefer', 'range', 'accept']
CABECERAS_SALIDA = ['content-type', 'content-range', 'location', 'preference-applied']


def leer_config():
    config = {k: os.environ.get(k, '') for k in ('SUPABASE_URL', 'SUPABASE_CLAVE')}
    archivo = RAIZ / '.dev.vars'
    if archivo.exists():
        for linea in archivo.read_text(encoding='utf-8').splitlines():
            clave, _, valor = linea.partition('=')
            if clave.strip() in config and not config[clave.strip()]:
                config[clave.strip()] = valor.strip().strip('"')
    faltan = [k for k, v in config.items() if not v]
    if faltan:
        raise SystemExit(f'Faltan {", ".join(faltan)} en .dev.vars o en el entorno.')
    return config


CONFIG = leer_config()


class SinRedirecciones(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None  # /authorize responde con una redirección que debe llegar al navegador


abridor = urllib.request.build_opener(SinRedirecciones)


class Manejador(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def responder(self, estado, cuerpo=b'', cabeceras=()):
        self.send_response(estado)
        for nombre, valor in cabeceras:
            self.send_header(nombre, valor)
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(cuerpo)))
        self.end_headers()
        self.wfile.write(cuerpo)

    def manejar(self, metodo):
        ruta, _, consulta = self.path.partition('?')
        if ruta in ('/', '/index.html', '/finanzas.html'):
            return self.responder(200, (RAIZ / 'finanzas.html').read_bytes(), [('Content-Type', 'text/html; charset=utf-8')])
        if not ruta.startswith('/api/'):
            return self.responder(404, b'No encontrado')
        destino = ruta[len('/api/'):]
        if not any(r.match(destino) for r in RUTAS):
            return self.responder(404, b'{"message":"Ruta no permitida"}', [('Content-Type', 'application/json')])
        sitio = self.headers.get('Sec-Fetch-Site')
        if sitio and sitio not in ('same-origin', 'none'):
            return self.responder(403, b'{"message":"Origen no permitido"}', [('Content-Type', 'application/json')])
        cuerpo = self.rfile.read(int(self.headers.get('Content-Length') or 0)) or None
        peticion = urllib.request.Request(
            CONFIG['SUPABASE_URL'].rstrip('/') + '/' + destino + ('?' + consulta if consulta else ''),
            data=cuerpo, method=metodo)
        peticion.add_header('apikey', CONFIG['SUPABASE_CLAVE'])
        for nombre in CABECERAS_ENTRADA:
            if self.headers.get(nombre):
                peticion.add_header(nombre, self.headers[nombre])
        try:
            respuesta = abridor.open(peticion, timeout=30)
        except urllib.error.HTTPError as e:
            respuesta = e  # errores (4xx/5xx) y redirecciones se pasan tal cual al navegador
        except urllib.error.URLError:
            return self.responder(502, b'{"message":"No se pudo contactar con la base de datos."}', [('Content-Type', 'application/json')])
        cabeceras = [(n, respuesta.headers[n]) for n in CABECERAS_SALIDA if respuesta.headers.get(n)]
        self.responder(respuesta.status if hasattr(respuesta, 'status') else respuesta.code, respuesta.read(), cabeceras)

    def do_GET(self):
        self.manejar('GET')

    def do_POST(self):
        self.manejar('POST')

    def do_PUT(self):
        self.manejar('PUT')

    def do_PATCH(self):
        self.manejar('PATCH')

    def do_DELETE(self):
        self.manejar('DELETE')


print(f'Web en http://localhost:{PUERTO}/ (Ctrl+C para parar)')
ThreadingHTTPServer(('127.0.0.1', PUERTO), Manejador).serve_forever()
