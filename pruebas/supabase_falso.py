"""Servidor local que imita, todo junto, la web publicada + el intermediario /api + Supabase (solo pruebas).

Uso: python -I pruebas/supabase_falso.py public/index.html 8766  →  http://127.0.0.1:8766/
     (o finanzas.html; sirve también css/ y js/ junto al HTML; si hay un _headers, sus cabeceras se aplican, como en Cloudflare)
Las cuentas y datos de prueba se guardan en pruebas/supabase_falso_estado.json (borrarlo al terminar).

- /api/auth/v1/signup (con /__confirmar?activo=1 exige confirmar por correo), /token (password,
  refresh_token y pkce), /logout, /settings, /user (GET y PUT para cambiar la contraseña), /recover
- /api/auth/v1/authorize?provider=google: simula que Google aprueba (cuenta google@ejemplo.test)
- Los «correos» no se envían: /__correo devuelve el último enlace (confirmación o nueva contraseña)
- /api/rest/v1/<tabla>: GET (select=*, order, limit, offset), POST (upsert), DELETE (id=in.(...)),
  filtrando por usuario como Row Level Security; /api/rest/v1/tipos_cambio_bcrp es pública
- /__estado vuelca las tablas; /__caida?activa=1 simula que el servidor no responde (503)
- /trabajador/<archivo>.js sirve el código del Worker para probarlo en el navegador con import()
"""
import base64
import hashlib
import json
import pathlib
import re
import sys
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse, quote

PUERTO = int(sys.argv[2]) if len(sys.argv) > 2 else 8766
ARCHIVO_HTML = pathlib.Path(sys.argv[1])
ARCHIVO_CABECERAS = ARCHIVO_HTML.parent / '_headers'
LIMITE_FILAS = 1000  # como el max_rows de Supabase

usuarios = {}   # correo → {id, clave, confirmado}
tokens = {}     # token → id de usuario
tablas = {t: {} for t in ['tarjetas', 'gastos', 'ingresos', 'pagos', 'saldos', 'deudas', 'abonos', 'metas', 'aportes', 'negocio', 'tipos_cambio', 'preferencias']}
BCRP = [
    {"fecha": "2026-10-23", "compra": 3.431, "venta": 3.437},
    {"fecha": "2026-10-26", "compra": 3.446, "venta": 3.453},
    {"fecha": "2026-10-27", "compra": 3.45, "venta": 3.457},
]
caida = False
confirmar_correo = False
codigos = {}         # código PKCE → (reto, id de usuario)
enlaces = {}         # token de correo → (tipo, id de usuario, reto, redirect_to)
ultimo_correo = {}
CLAVES = {'tipos_cambio': ('usuario', 'banco', 'fecha'), 'preferencias': ('usuario',)}
ARCHIVO = __file__.replace('.py', '_estado.json')


def guardar_estado():
    json.dump({"usuarios": usuarios, "tokens": tokens,
               "tablas": {t: list(v.values()) for t, v in tablas.items()}}, open(ARCHIVO, 'w'))


try:
    _e = json.load(open(ARCHIVO))
    usuarios.update(_e['usuarios'])
    tokens.update(_e['tokens'])
    for _t, _filas in _e['tablas'].items():
        for _f in _filas:
            tablas[_t][tuple(_f[c] for c in CLAVES.get(_t, ('id',)))] = _f
except FileNotFoundError:
    pass


def correo_de(id_usuario):
    return next(c for c, u in usuarios.items() if u['id'] == id_usuario)


def sesion_para(id_usuario):
    token, renovar = uuid.uuid4().hex, uuid.uuid4().hex
    tokens[token] = id_usuario
    tokens['r:' + renovar] = id_usuario
    return {"access_token": token, "refresh_token": renovar, "expires_in": 3600, "token_type": "bearer",
            "user": usuario_publico(id_usuario)}


def usuario_publico(id_usuario):
    correo = correo_de(id_usuario)
    return {"id": id_usuario, "email": correo, "user_metadata": usuarios[correo].get('meta', {}),
            "identities": [{"provider": usuarios[correo].get('proveedor', 'email')}]}


def reto_de(verificador):
    return base64.urlsafe_b64encode(hashlib.sha256(verificador.encode()).digest()).rstrip(b'=').decode()


def cabeceras_publicadas():
    """Cabeceras del bloque /* de _headers (formato de Cloudflare Pages)."""
    if not ARCHIVO_CABECERAS.exists():
        return []
    return [tuple(x.strip() for x in linea.split(':', 1))
            for linea in ARCHIVO_CABECERAS.read_text(encoding='utf-8').splitlines()[1:] if ':' in linea]


class Manejador(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def responder(self, estado, datos=None, tipo='application/json', extra=()):
        cuerpo = b'' if datos is None else (datos if isinstance(datos, bytes) else json.dumps(datos).encode())
        self.send_response(estado)
        self.send_header('Content-Type', tipo)
        for nombre, valor in extra:
            self.send_header(nombre, valor)
        self.send_header('Content-Length', str(len(cuerpo)))
        self.end_headers()
        self.wfile.write(cuerpo)

    def redirigir(self, destino):
        self.send_response(302)
        self.send_header('Location', destino)
        self.end_headers()

    def cuerpo(self):
        n = int(self.headers.get('Content-Length') or 0)
        return json.loads(self.rfile.read(n) or b'null')

    def usuario(self):
        auth = self.headers.get('Authorization', '')
        return tokens.get(auth[7:]) if auth.startswith('Bearer ') else None

    def enviar_correo(self, tipo, id_usuario, reto, volver):
        token = uuid.uuid4().hex
        enlaces[token] = (tipo, id_usuario, reto, volver)
        ultimo_correo.clear()
        ultimo_correo.update({"tipo": tipo, "enlace": f"http://127.0.0.1:{PUERTO}/auth/v1/verify?token={token}"})

    def manejar(self, metodo):
        global caida, confirmar_correo
        url = urlparse(self.path)
        q = parse_qs(url.query)
        ruta = url.path
        if ruta in ('/', '/index.html', '/finanzas.html'):
            return self.responder(200, ARCHIVO_HTML.read_bytes(), 'text/html; charset=utf-8', cabeceras_publicadas())
        m = re.fullmatch(r'/(css|js)/[a-z_]+\.(css|js)', ruta)
        if m:
            archivo = ARCHIVO_HTML.parent / ruta.lstrip('/')
            if archivo.exists():
                tipo = 'text/css' if m.group(2) == 'css' else 'text/javascript'
                return self.responder(200, archivo.read_bytes(), tipo + '; charset=utf-8', cabeceras_publicadas())
        if re.fullmatch(r'/trabajador/[a-z_]+\.js', ruta):
            archivo = pathlib.Path(__file__).resolve().parent.parent / ruta.lstrip('/')
            if archivo.exists():
                return self.responder(200, archivo.read_bytes(), 'text/javascript; charset=utf-8')
        if ruta == '/__estado':
            return self.responder(200, {"usuarios": list(usuarios), "tablas": {t: list(v.values()) for t, v in tablas.items()}})
        if ruta == '/__caida':
            caida = q.get('activa', ['0'])[0] == '1'
            return self.responder(200, {"caida": caida})
        if ruta == '/__confirmar':
            confirmar_correo = q.get('activo', ['0'])[0] == '1'
            return self.responder(200, {"confirmar_correo": confirmar_correo})
        if ruta == '/__correo':
            return self.responder(200, ultimo_correo)
        if caida:
            return self.responder(503, {"message": "Servicio no disponible"})
        if ruta == '/auth/v1/verify':
            # Enlace del correo (va directo a Supabase, no por /api): confirma y vuelve con ?code=…
            tipo, id_usuario, reto, volver = enlaces.pop(q.get('token', [''])[0], (None,) * 4)
            if not tipo:
                return self.redirigir('/?error=access_denied&error_description=' + quote('El enlace caducó'))
            usuarios[correo_de(id_usuario)]['confirmado'] = True
            codigo = uuid.uuid4().hex
            codigos[codigo] = (reto, id_usuario)
            return self.redirigir(volver + '?code=' + codigo)
        if not ruta.startswith('/api/'):
            return self.responder(404, {"message": "No encontrado"})
        ruta = ruta[len('/api'):]

        if ruta == '/auth/v1/authorize':
            if q.get('provider') != ['google'] or not q.get('code_challenge'):
                return self.responder(400, {"error_code": "validation_failed", "msg": "Unsupported provider"})
            correo = 'google@ejemplo.test'
            usuarios.setdefault(correo, {"id": str(uuid.uuid4()), "clave": None, "confirmado": True,
                                         "proveedor": "google", "meta": {"full_name": "Usuaria de Google"}})
            codigo = uuid.uuid4().hex
            codigos[codigo] = (q['code_challenge'][0], usuarios[correo]['id'])
            return self.redirigir(q['redirect_to'][0] + '?code=' + codigo)
        if ruta == '/auth/v1/settings':
            return self.responder(200, {"external": {"email": True, "google": True}, "mailer_autoconfirm": not confirmar_correo})
        if ruta == '/auth/v1/signup' and metodo == 'POST':
            d = self.cuerpo()
            if len(d['password']) < 8:
                return self.responder(422, {"code": 422, "error_code": "weak_password", "msg": "Password too short"})
            if d['email'] in usuarios and confirmar_correo and not usuarios[d['email']].get('confirmado', True):
                # Como Supabase: si la cuenta aún no está confirmada, reenvía el correo de confirmación
                u = usuarios[d['email']]
                self.enviar_correo('registro', u['id'], d.get('code_challenge'), q['redirect_to'][0])
                return self.responder(200, usuario_publico(u['id']))
            if d['email'] in usuarios:
                if confirmar_correo:  # como Supabase: usuario falso sin identidades, sin enviar correo
                    return self.responder(200, {"id": str(uuid.uuid4()), "email": d['email'], "identities": []})
                return self.responder(422, {"code": 422, "error_code": "user_already_exists", "msg": "User already registered"})
            usuarios[d['email']] = {"id": str(uuid.uuid4()), "clave": d['password'], "confirmado": not confirmar_correo,
                                    "meta": d.get('data') or {}}
            if confirmar_correo:
                self.enviar_correo('registro', usuarios[d['email']]['id'], d.get('code_challenge'), q['redirect_to'][0])
                return self.responder(200, usuario_publico(usuarios[d['email']]['id']))
            return self.responder(200, sesion_para(usuarios[d['email']]['id']))
        if ruta == '/auth/v1/recover' and metodo == 'POST':
            d = self.cuerpo()
            if d['email'] in usuarios:
                self.enviar_correo('recuperar', usuarios[d['email']]['id'], d.get('code_challenge'), q['redirect_to'][0])
            return self.responder(200, {})
        if ruta == '/auth/v1/token' and metodo == 'POST':
            d = self.cuerpo()
            if q.get('grant_type') == ['pkce']:
                reto, id_usuario = codigos.pop(d.get('auth_code'), (None, None))
                if not reto or reto != reto_de(d.get('code_verifier', '')):
                    return self.responder(400, {"error_code": "bad_code_verifier", "msg": "code challenge does not match"})
                return self.responder(200, sesion_para(id_usuario))
            if q.get('grant_type') == ['password']:
                u = usuarios.get(d['email'])
                if not u or u['clave'] != d['password']:
                    return self.responder(400, {"code": 400, "error_code": "invalid_credentials", "msg": "Invalid login credentials"})
                if not u.get('confirmado', True):
                    return self.responder(400, {"code": 400, "error_code": "email_not_confirmed", "msg": "Email not confirmed"})
                return self.responder(200, sesion_para(u['id']))
            id_usuario = tokens.pop('r:' + d.get('refresh_token', ''), None)
            if not id_usuario:
                return self.responder(400, {"error_code": "refresh_token_not_found", "msg": "Invalid Refresh Token"})
            return self.responder(200, sesion_para(id_usuario))
        if ruta == '/auth/v1/logout':
            tokens.pop(self.headers.get('Authorization', '')[7:], None)
            return self.responder(204)
        if ruta == '/auth/v1/user':
            uid = self.usuario()
            if not uid:
                return self.responder(401, {"message": "invalid JWT"})
            if metodo == 'PUT':
                d = self.cuerpo()
                u = usuarios[correo_de(uid)]
                if 'data' in d:
                    u['meta'] = {**u.get('meta', {}), **d['data']}
                    return self.responder(200, usuario_publico(uid))
                if d.get('password') == u['clave']:
                    return self.responder(422, {"error_code": "same_password", "msg": "New password should be different"})
                if len(d.get('password', '')) < 8:
                    return self.responder(422, {"error_code": "weak_password", "msg": "Password too short"})
                u['clave'] = d['password']
            return self.responder(200, usuario_publico(uid))
        if ruta == '/rest/v1/tipos_cambio_bcrp':
            return self.responder(200, sorted(BCRP, key=lambda x: x['fecha'], reverse=True))

        m = re.fullmatch(r'/rest/v1/(\w+)', ruta)
        if not m or m.group(1) not in tablas:
            return self.responder(404, {"code": "PGRST205", "message": "Could not find the table"})
        tabla = m.group(1)
        uid = self.usuario()
        if not uid:
            return self.responder(401, {"code": "42501", "message": "permission denied"})
        filas = tablas[tabla]

        if metodo == 'GET':
            lista = [f for f in filas.values() if f['usuario'] == uid]
            if q.get('order'):
                campos = q['order'][0].split(',')
                lista.sort(key=lambda f: tuple(str(f.get(c, '')) for c in campos))
            desde = int(q.get('offset', ['0'])[0])
            cuantos = min(int(q.get('limit', [LIMITE_FILAS])[0]), LIMITE_FILAS)
            return self.responder(200, lista[desde:desde + cuantos])
        if metodo == 'POST':
            lista = self.cuerpo()
            for f in (lista if isinstance(lista, list) else [lista]):
                f = {**f, 'usuario': uid}
                # Reglas como las de la base: tarjeta propia y valores válidos
                if f.get('tarjeta') and not any(t['id'] == f['tarjeta'] and t['usuario'] == uid for t in tablas['tarjetas'].values()):
                    return self.responder(403, {"code": "42501", "message": "new row violates row-level security policy"})
                if f.get('moneda', 'PEN') not in ('PEN', 'USD'):
                    return self.responder(400, {"code": "23514", "message": "violates check constraint"})
                clave = tuple(f[c] for c in CLAVES.get(tabla, ('id',)))
                existente = filas.get(clave)
                if existente and existente['usuario'] != uid:
                    return self.responder(403, {"code": "42501", "message": "row-level security"})
                filas[clave] = {**(existente or {}), **f}
            return self.responder(201)
        if metodo == 'DELETE':
            ids = re.fullmatch(r'in\.\((.*)\)', q.get('id', [''])[0])
            for i in (ids.group(1).split(',') if ids else []):
                if (i,) in filas and filas[(i,)]['usuario'] == uid:
                    if tabla == 'tarjetas':  # on delete cascade / set null, como en la base
                        for k in [k for k, v in tablas['pagos'].items() if v['tarjeta'] == i]:
                            del tablas['pagos'][k]
                        for g in tablas['gastos'].values():
                            if g.get('tarjeta') == i:
                                g['tarjeta'] = None
                    for hija, campo, padre in (('abonos', 'deuda', 'deudas'), ('aportes', 'meta', 'metas'), ('saldos', 'tarjeta', 'tarjetas')):
                        if tabla == padre:
                            for k in [k for k, v in tablas[hija].items() if v[campo] == i]:
                                del tablas[hija][k]
                    del filas[(i,)]
            return self.responder(204)
        return self.responder(405, {"message": "método no permitido"})

    def do_GET(self):
        self.manejar('GET')

    def do_POST(self):
        self.manejar('POST')
        guardar_estado()

    def do_PUT(self):
        self.manejar('PUT')
        guardar_estado()

    def do_DELETE(self):
        self.manejar('DELETE')
        guardar_estado()


ThreadingHTTPServer(('127.0.0.1', PUERTO), Manejador).serve_forever()
