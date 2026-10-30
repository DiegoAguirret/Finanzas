"""Prepara lo que publica Cloudflare (comando de compilación: python3 construir.py).

- public/: la web (finanzas.html como index.html, más css/ y js/).
- trabajador/cabeceras.js: cabeceras de seguridad que el Worker (trabajador/index.js) añade a la web.
- public/_headers: las mismas cabeceras en el formato de archivo _headers (lo usa el servidor de
  pruebas pruebas/supabase_falso.py para imitar lo publicado).

La Content-Security-Policy solo permite scripts y estilos de archivos del propio dominio (nada en
línea) y conexiones a ese mismo dominio (/api), así que un script inyectado o una conexión a otro
servidor no se ejecutarían.
"""
import json
import pathlib
import shutil

RAIZ = pathlib.Path(__file__).parent

politica = '; '.join([
    "default-src 'none'",
    "script-src 'self'",                 # solo js/*.js; ningún script ni manejador on… en línea
    "style-src 'self'",                  # solo css/*.css; ningún atributo style en el HTML
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
if salida.exists():
    shutil.rmtree(salida)  # sin restos de publicaciones anteriores
salida.mkdir()
shutil.copyfile(RAIZ / 'finanzas.html', salida / 'index.html')
for carpeta in ('css', 'js'):
    shutil.copytree(RAIZ / carpeta, salida / carpeta)
(salida / '_headers').write_text('/*\n' + ''.join(f'  {k}: {v}\n' for k, v in cabeceras.items()),
                                 encoding='utf-8', newline='\n')
(RAIZ / 'trabajador' / 'cabeceras.js').write_text(
    '// Generado por construir.py: no editar a mano.\n'
    f'export const CABECERAS_SEGURIDAD = {json.dumps(cabeceras, indent=2, ensure_ascii=False)};\n',
    encoding='utf-8', newline='\n')
print('Listo: public/ y trabajador/cabeceras.js')
