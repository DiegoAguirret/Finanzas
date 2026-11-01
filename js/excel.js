// Crea un libro de Excel (.xlsx) sin librerías: un .xlsx es un ZIP de archivos XML.
// crearXlsx([{ nombre, columnas: [{ titulo, tipo, ancho }], filas: [[…]] }]) → Uint8Array
// tipo: 'texto' | 'fecha' (ISO YYYY-MM-DD) | 'importe' | 'tc' | 'numero'; null = celda vacía.
// Los textos van como texto en línea: Excel nunca los interpreta como fórmulas.
'use strict';

const crearXlsx = (() => {
  const ESTILO = { cabecera: 1, fecha: 2, importe: 3, tc: 4 };

  // Quita los caracteres que XML no admite y escapa los especiales
  const xml = (v) => String(v)
    .replace(/[^\t\n\r -퟿-�\u{10000}-\u{10FFFF}]/gu, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // 0 → A, 26 → AA
  function letra(n) {
    let s = '';
    for (n += 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + (n - 1) % 26) + s;
    return s;
  }

  // Excel cuenta los días desde el 30/12/1899
  function serialFecha(iso) {
    const [a, m, d] = iso.split('-').map(Number);
    return (Date.UTC(a, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000;
  }

  function celda(ref, valor, tipo) {
    if (valor === null || valor === undefined || valor === '') return '';
    if (tipo === 'fecha') return `<c r="${ref}" s="${ESTILO.fecha}"><v>${serialFecha(valor)}</v></c>`;
    if (tipo === 'importe') return `<c r="${ref}" s="${ESTILO.importe}"><v>${Number(valor)}</v></c>`;
    if (tipo === 'tc') return `<c r="${ref}" s="${ESTILO.tc}"><v>${Number(valor)}</v></c>`;
    if (tipo === 'numero') return `<c r="${ref}"><v>${Number(valor)}</v></c>`;
    return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xml(valor)}</t></is></c>`;
  }

  function hojaXML(hoja) {
    const ultima = letra(hoja.columnas.length - 1);
    const cols = hoja.columnas.map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.ancho || 14}" customWidth="1"/>`).join('');
    const cabecera = hoja.columnas.map((c, i) => `<c r="${letra(i)}1" s="${ESTILO.cabecera}" t="inlineStr"><is><t>${xml(c.titulo)}</t></is></c>`).join('');
    const filas = hoja.filas.map((f, n) =>
      `<row r="${n + 2}">${f.map((v, i) => celda(letra(i) + (n + 2), v, hoja.columnas[i].tipo)).join('')}</row>`).join('');
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      `<dimension ref="A1:${ultima}${hoja.filas.length + 1}"/>` +
      '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
      `<sheetFormatPr defaultRowHeight="15"/><cols>${cols}</cols>` +
      `<sheetData><row r="1">${cabecera}</row>${filas}</sheetData>` +
      `<autoFilter ref="A1:${ultima}${hoja.filas.length + 1}"/>` +
      '</worksheet>';
  }

  const ESTILOS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<numFmts count="2"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/><numFmt numFmtId="165" formatCode="0.0000"/></numFmts>' +
    '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>' +
    '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FF1E3A8A"/><bgColor indexed="64"/></patternFill></fill></fills>' +
    '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="5">' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
    '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>' +
    '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
    '<xf numFmtId="4" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
    '<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
    '</cellXfs></styleSheet>';

  // Excel admite 31 caracteres en el nombre de la hoja y prohíbe algunos símbolos
  const nombreHoja = (s) => s.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31);

  function libro(hojas) {
    const lista = hojas.map((h, i) => `<sheet name="${xml(nombreHoja(h.nombre))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('');
    const filtros = hojas.map((h, i) =>
      `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${xml(nombreHoja(h.nombre).replace(/'/g, "''"))}'!$A$1:$${letra(h.columnas.length - 1)}$${h.filas.length + 1}</definedName>`).join('');
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      `<sheets>${lista}</sheets><definedNames>${filtros}</definedNames></workbook>`;
  }

  function relaciones(hojas) {
    const base = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
    const r = hojas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${base}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('');
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      `${r}<Relationship Id="rId${hojas.length + 1}" Type="${base}/styles" Target="styles.xml"/></Relationships>`;
  }

  function tipos(hojas) {
    const ct = 'application/vnd.openxmlformats-officedocument.spreadsheetml';
    const h = hojas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="${ct}.worksheet+xml"/>`).join('');
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      `<Override PartName="/xl/workbook.xml" ContentType="${ct}.sheet.main+xml"/>${h}` +
      `<Override PartName="/xl/styles.xml" ContentType="${ct}.styles+xml"/></Types>`;
  }

  const RAIZ = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';

  const TABLA_CRC = Uint32Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  function crc32(datos) {
    let c = 0xFFFFFFFF;
    for (const b of datos) c = TABLA_CRC[(c ^ b) & 255] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  // ZIP sin comprimir: Excel lo abre igual y no necesita código de compresión
  function zip(archivos) {
    const cod = new TextEncoder();
    const partes = [], central = [];
    let posicion = 0;
    const comunes = (v, crc, tam, nombre) => {
      v.setUint16(0, 20, true); // versión mínima
      v.setUint16(2, 0x0800, true); // nombres en UTF-8
      v.setUint16(4, 0, true); // sin compresión
      v.setUint16(6, 0, true); // hora
      v.setUint16(8, 0x21, true); // fecha fija: 01/01/1980
      v.setUint32(10, crc, true);
      v.setUint32(14, tam, true);
      v.setUint32(18, tam, true);
      v.setUint16(22, nombre, true);
      v.setUint16(24, 0, true);
    };
    for (const [ruta, texto] of archivos) {
      const nombre = cod.encode(ruta), datos = cod.encode(texto), crc = crc32(datos);
      const local = new Uint8Array(30 + nombre.length);
      const vl = new DataView(local.buffer);
      vl.setUint32(0, 0x04034b50, true);
      comunes(new DataView(local.buffer, 4), crc, datos.length, nombre.length);
      local.set(nombre, 30);
      const dir = new Uint8Array(46 + nombre.length);
      const vd = new DataView(dir.buffer);
      vd.setUint32(0, 0x02014b50, true);
      vd.setUint16(4, 20, true);
      comunes(new DataView(dir.buffer, 6), crc, datos.length, nombre.length);
      vd.setUint32(42, posicion, true);
      dir.set(nombre, 46);
      partes.push(local, datos);
      central.push(dir);
      posicion += local.length + datos.length;
    }
    const tamCentral = central.reduce((s, x) => s + x.length, 0);
    const fin = new Uint8Array(22);
    const vf = new DataView(fin.buffer);
    vf.setUint32(0, 0x06054b50, true);
    vf.setUint16(8, archivos.length, true);
    vf.setUint16(10, archivos.length, true);
    vf.setUint32(12, tamCentral, true);
    vf.setUint32(16, posicion, true);
    const todo = new Uint8Array(posicion + tamCentral + 22);
    let i = 0;
    for (const p of [...partes, ...central, fin]) {
      todo.set(p, i);
      i += p.length;
    }
    return todo;
  }

  return (hojas) => zip([
    ['[Content_Types].xml', tipos(hojas)],
    ['_rels/.rels', RAIZ],
    ['xl/workbook.xml', libro(hojas)],
    ['xl/_rels/workbook.xml.rels', relaciones(hojas)],
    ['xl/styles.xml', ESTILOS],
    ...hojas.map((h, i) => [`xl/worksheets/sheet${i + 1}.xml`, hojaXML(h)]),
  ]);
})();
