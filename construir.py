"""Prepara lo que publica Cloudflare (comando de compilación: python3 construir.py).

- public/index.html: la web.
- trabajador/cabeceras.js: cabeceras de seguridad que el Worker (trabajador/index.js) añade a la web.
- public/_headers: las mismas cabeceras en el formato de archivo _headers (lo usa el servidor de
  pruebas pruebas/supabase_falso.py para imitar lo publicado).

La Content-Security-Policy solo permite los scripts de la propia página (por su hash SHA-256) y
conexiones a su mismo dominio (/api), así que un script inyectado o una conexión a otro servidor
no se ejecutarían.
"""
import base64
import hashlib
import json
import pathlib
import re

RAIZ = pathlib.Path(__file__).parent
# El navegador convierte CRLF y CR en LF antes de calcular el hash de un script: se hace lo mismo
# aquí para que el hash coincida tanto con saltos de línea de Windows como de Linux.
html = (RAIZ / 'finanzas.html').read_bytes().replace(b'\r\n', b'\n').replace(b'\r', b'\n')

scripts = re.findall(rb'<script>(.*?)</script>', html, re.S)
hashes = ' '.join("'sha256-%s'" % base64.b64encode(hashlib.sha256(s).digest()).decode() for s in scripts)

politica = '; '.join([
    "default-src 'none'",
    f"script-src {hashes}",
    "style-src 'self' 'unsafe-inline'",  # estilos en línea de la página; no ejecutan código
    "img-src 'self' data:",
    "connect-src 'self'",                # solo /api del mismo dominio
    "form-action 'self'",
    "base-uri 'none'",
    "frame-ancestors 'none'",            # nadie puede incrustar la web en otra página
])

cabeceras = {
    'Content-Security-Policy': politica,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Cross-Origin-Opener-Policy': 'same-origin',
}

salida = RAIZ / 'public'
salida.mkdir(exist_ok=True)
(salida / 'index.html').write_bytes(html)
(salida / '_headers').write_text('/*\n' + ''.join(f'  {k}: {v}\n' for k, v in cabeceras.items()),
                                 encoding='utf-8', newline='\n')
(RAIZ / 'trabajador' / 'cabeceras.js').write_text(
    '// Generado por construir.py: no editar a mano.\n'
    f'export const CABECERAS_SEGURIDAD = {json.dumps(cabeceras, indent=2, ensure_ascii=False)};\n',
    encoding='utf-8', newline='\n')
print(f'Listo: public/ y trabajador/cabeceras.js ({len(scripts)} scripts con hash en la Content-Security-Policy)')
