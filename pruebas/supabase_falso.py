"""Servidor local que imita lo que la web usa de Supabase (solo para pruebas).

Uso: python -I pruebas/supabase_falso.py finanzas.html 8766  →  http://127.0.0.1:8766/finanzas.html
Las cuentas y datos de prueba se guardan en pruebas/supabase_falso_estado.json (borrarlo al terminar).

- Sirve una copia de finanzas.html con SUPABASE_URL apuntando a este servidor.
- /auth/v1/signup, /auth/v1/token (password, refresh_token y pkce), /auth/v1/logout, /auth/v1/settings
- /auth/v1/authorize?provider=google: simula que Google aprueba y vuelve con ?code=… (cuenta google@ejemplo.test)
- /rest/v1/<tabla>: GET (select=*), POST (upsert), DELETE (id=in.(...)), filtrando por usuario
- /rest/v1/rpc/actualizar_tipo_cambio_bcrp y /rest/v1/tipos_cambio_bcrp
- /__estado: vuelca el contenido de las tablas (para comprobar desde las pruebas)
- /__caida?activa=1: simula que el servidor no responde (503) para probar errores
"""
import base64
import hashlib
import json
import re
import sys
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

PUERTO = int(sys.argv[2]) if len(sys.argv) > 2 else 8766
HTML = open(sys.argv[1], encoding='utf-8').read().replace(
    "https://incynxtdufsfjewjqffe.supabase.co", f"http://127.0.0.1:{PUERTO}")

usuarios = {}   # correo → {id, clave}
tokens = {}     # token → id de usuario
tablas = {t: {} for t in ['tarjetas', 'gastos', 'ingresos', 'pagos', 'tipos_cambio', 'preferencias']}
BCRP = [
    {"fecha": "2026-10-23", "compra": 3.431, "venta": 3.437},
    {"fecha": "2026-10-26", "compra": 3.446, "venta": 3.453},
    {"fecha": "2026-10-27", "compra": 3.45, "venta": 3.457},
]
caida = False
codigos = {}    # código OAuth → (reto PKCE, id de usuario)
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


def sesion_para(id_usuario, correo):
    token, renovar = uuid.uuid4().hex, uuid.uuid4().hex
    tokens[token] = id_usuario
    tokens['r:' + renovar] = id_usuario
    return {"access_token": token, "refresh_token": renovar, "expires_in": 3600, "token_type": "bearer",
            "user": {"id": id_usuario, "email": correo}}


class Manejador(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def responder(self, estado, datos=None, tipo='application/json'):
        cuerpo = b'' if datos is None else (datos.encode() if isinstance(datos, str) else json.dumps(datos).encode())
        self.send_response(estado)
        self.send_header('Content-Type', tipo)
        self.send_header('Content-Length', str(len(cuerpo)))
        self.end_headers()
        self.wfile.write(cuerpo)

    def cuerpo(self):
        n = int(self.headers.get('Content-Length') or 0)
        return json.loads(self.rfile.read(n) or b'null')

    def usuario(self):
        auth = self.headers.get('Authorization', '')
        return tokens.get(auth[7:]) if auth.startswith('Bearer ') else None

    def manejar(self, metodo):
        global caida
        url = urlparse(self.path)
        q = parse_qs(url.query)
        ruta = url.path
        if ruta == '/finanzas.html':
            return self.responder(200, HTML, 'text/html; charset=utf-8')
        if ruta == '/__estado':
            return self.responder(200, {"usuarios": list(usuarios), "tablas": {t: list(v.values()) for t, v in tablas.items()}})
        if ruta == '/__caida':
            caida = q.get('activa', ['0'])[0] == '1'
            return self.responder(200, {"caida": caida})
        if caida:
            return self.responder(503, {"message": "Servicio no disponible"})
        if ruta == '/auth/v1/authorize':
            # Lo abre el navegador (sin apikey). Simula que Google aprobó el acceso.
            if q.get('provider') != ['google'] or not q.get('code_challenge'):
                return self.responder(400, {"error_code": "validation_failed", "msg": "Unsupported provider"})
            correo = 'google@ejemplo.test'
            usuarios.setdefault(correo, {"id": str(uuid.uuid4()), "clave": None})
            codigo = uuid.uuid4().hex
            codigos[codigo] = (q['code_challenge'][0], usuarios[correo]['id'])
            self.send_response(302)
            self.send_header('Location', q['redirect_to'][0] + '?code=' + codigo)
            self.end_headers()
            return
        if self.headers.get('apikey') != 'sb_publishable_sR002sB6AwFxFgOeIIldXA_ceGYnsbv':
            return self.responder(401, {"message": "Falta apikey"})

        if ruta == '/auth/v1/signup' and metodo == 'POST':
            d = self.cuerpo()
            if d['email'] in usuarios:
                return self.responder(422, {"code": 422, "error_code": "user_already_exists", "msg": "User already registered"})
            if len(d['password']) < 6:
                return self.responder(422, {"code": 422, "error_code": "weak_password", "msg": "Password too short"})
            usuarios[d['email']] = {"id": str(uuid.uuid4()), "clave": d['password']}
            return self.responder(200, sesion_para(usuarios[d['email']]['id'], d['email']))
        if ruta == '/auth/v1/settings':
            return self.responder(200, {"external": {"email": True, "google": True}, "mailer_autoconfirm": True})
        if ruta == '/auth/v1/token' and metodo == 'POST':
            d = self.cuerpo()
            if q.get('grant_type') == ['pkce']:
                reto, id_usuario = codigos.pop(d.get('auth_code'), (None, None))
                calculado = base64.urlsafe_b64encode(hashlib.sha256(d.get('code_verifier', '').encode()).digest()).rstrip(b'=').decode()
                if not reto or reto != calculado:
                    return self.responder(400, {"error_code": "bad_code_verifier", "msg": "code challenge does not match"})
                correo = next(c for c, u in usuarios.items() if u['id'] == id_usuario)
                return self.responder(200, sesion_para(id_usuario, correo))
            if q.get('grant_type') == ['password']:
                u = usuarios.get(d['email'])
                if not u or u['clave'] != d['password']:
                    return self.responder(400, {"code": 400, "error_code": "invalid_credentials", "msg": "Invalid login credentials"})
                return self.responder(200, sesion_para(u['id'], d['email']))
            id_usuario = tokens.pop('r:' + d.get('refresh_token', ''), None)
            if not id_usuario:
                return self.responder(400, {"error_code": "refresh_token_not_found", "msg": "Invalid Refresh Token"})
            correo = next(c for c, u in usuarios.items() if u['id'] == id_usuario)
            return self.responder(200, sesion_para(id_usuario, correo))
        if ruta == '/auth/v1/logout':
            tokens.pop(self.headers.get('Authorization', '')[7:], None)
            return self.responder(204)

        if ruta == '/rest/v1/rpc/actualizar_tipo_cambio_bcrp':
            return self.responder(200, 0)
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
            return self.responder(200, [f for f in filas.values() if f['usuario'] == uid])
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
                    del filas[(i,)]
            return self.responder(204)
        return self.responder(405, {"message": "método no permitido"})

    def do_GET(self):
        self.manejar('GET')

    def do_POST(self):
        self.manejar('POST')
        guardar_estado()

    def do_DELETE(self):
        self.manejar('DELETE')
        guardar_estado()


ThreadingHTTPServer(('127.0.0.1', PUERTO), Manejador).serve_forever()
