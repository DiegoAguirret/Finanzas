// Gráficos SVG y su tooltip
'use strict';

// ---- Tooltip compartido ----
const tip = $('tooltip');

// lineas: [{ valor, texto, clave }] — valor en negrita, texto secundario, clave = clase de color
function mostrarTip(x, y, titulo, lineas) {
  const nodos = [];
  const t = document.createElement('div');
  t.textContent = titulo;
  nodos.push(t);
  for (const l of lineas) {
    const d = document.createElement('div');
    if (l.clave) {
      const k = document.createElement('span');
      k.className = 'clave ' + l.clave;
      d.appendChild(k);
    }
    const v = document.createElement('strong');
    v.textContent = l.valor;
    d.appendChild(v);
    if (l.texto) d.appendChild(document.createTextNode(' ' + l.texto));
    nodos.push(d);
  }
  tip.replaceChildren(...nodos);
  tip.classList.remove('hidden');
  const r = tip.getBoundingClientRect();
  let left = x + 14, top = y + 14;
  if (left + r.width > innerWidth - 8) left = x - r.width - 14;
  if (top + r.height > innerHeight - 8) top = y - r.height - 14;
  tip.style.left = Math.max(8, left) + 'px';
  tip.style.top = Math.max(8, top) + 'px';
}

function ocultarTip() {
  tip.classList.add('hidden');
}

// Conecta hover y foco de teclado de un elemento a un tooltip
function conTooltip(el, titulo, lineas, alActivar) {
  el.addEventListener('pointermove', (e) => { alActivar?.(true); mostrarTip(e.clientX, e.clientY, titulo, lineas); });
  el.addEventListener('pointerleave', () => { alActivar?.(false); ocultarTip(); });
  el.addEventListener('focus', () => {
    const r = el.getBoundingClientRect();
    alActivar?.(true);
    mostrarTip(r.left + r.width / 2, r.top, titulo, lineas);
  });
  el.addEventListener('blur', () => { alActivar?.(false); ocultarTip(); });
}

// ---- Gráficos SVG ----
const SVG_NS = 'http://www.w3.org/2000/svg';
function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

function svgTexto(x, y, contenido, clase, ancla = 'start') {
  const t = svgEl('text', { x, y, class: clase, 'text-anchor': ancla });
  t.textContent = contenido;
  return t;
}

// Escala con marcas "redondas" entre min y max
function escala(min, max, marcas = 4) {
  if (max - min < 1e-9) max = min + 1;
  const bruto = (max - min) / marcas;
  const mag = 10 ** Math.floor(Math.log10(bruto));
  const f = bruto / mag;
  const paso = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag;
  const lo = Math.floor(min / paso) * paso;
  const hi = Math.ceil(max / paso) * paso;
  const ticks = [];
  for (let v = lo; v <= hi + paso / 2; v += paso) ticks.push(Math.round(v * 1e6) / 1e6);
  return { lo, hi, ticks };
}

// Barra con extremo superior redondeado (4px) y base recta
function barraPath(x, y, w, h, r = 4) {
  r = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

// datos: [{ etiqueta, titulo, valor, destacar }]
function graficoBarras(cont, datos) {
  cont.replaceChildren();
  const W = cont.clientWidth;
  if (!W) return;
  const H = 240, m = { t: 22, r: 8, b: 28, l: 62 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const max = Math.max(0, ...datos.map((d) => d.valor));
  const { hi, ticks } = escala(0, max);
  const y = (v) => m.t + ih - (v / hi) * ih;

  const s = svgEl('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Gráfico de barras de gastos' });
  for (const t of ticks) {
    if (t > 0) s.append(svgEl('line', { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), class: 'g-grid' }));
    s.append(svgTexto(m.l - 8, y(t) + 4, compacto.format(t), 'g-texto', 'end'));
  }

  const banda = iw / datos.length;
  const bw = Math.max(2, Math.min(36, banda - 2, banda * 0.65));
  // Etiquetas del eje X sin solaparse
  const cada = Math.ceil(datos.length / Math.max(1, Math.floor(iw / 44)));

  datos.forEach((d, i) => {
    const cx = m.l + banda * i + banda / 2;
    const h = y(0) - y(d.valor);
    let barra = null;
    if (h > 0.5) {
      barra = svgEl('path', { d: barraPath(cx - bw / 2, y(d.valor), bw, h), class: 'g-barra' });
      s.append(barra);
    }
    if (i % cada === 0 || d.destacar) s.append(svgTexto(cx, H - 8, d.etiqueta, 'g-texto', 'middle'));
    if (d.destacar && d.valor > 0) s.append(svgTexto(cx, y(d.valor) - 7, compacto.format(d.valor), 'g-etiqueta', 'middle'));

    const hit = svgEl('rect', { x: m.l + banda * i, y: m.t, width: banda, height: ih, class: 'g-hit', tabindex: 0 });
    hit.setAttribute('aria-label', `${d.titulo}: ${soles.format(d.valor)}`);
    conTooltip(hit, d.titulo, [{ valor: soles.format(d.valor) }], (on) => barra?.classList.toggle('activa', on));
    s.append(hit);
  });
  s.append(svgEl('line', { x1: m.l, x2: W - m.r, y1: y(0), y2: y(0), class: 'g-base' }));
  cont.append(s);
}

// series: [{ nombre, n (1|2), valores[] }], etiquetas: textos del eje X, meta opcional
function graficoLineas(cont, etiquetas, series, meta) {
  cont.replaceChildren();
  const W = cont.clientWidth;
  if (!W) return;
  const H = 260, m = { t: 16, r: 84, b: 28, l: 62 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const n = etiquetas.length - 1;
  const todos = series.flatMap((s) => s.valores).concat(meta ? [meta] : []);
  const { lo, hi, ticks } = escala(Math.min(0, ...todos), Math.max(0, ...todos));
  const x = (k) => m.l + (n ? (k / n) * iw : 0);
  const y = (v) => m.t + ih - ((v - lo) / (hi - lo)) * ih;

  const s = svgEl('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Gráfico de proyección' });
  for (const t of ticks) {
    if (t !== 0) s.append(svgEl('line', { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), class: 'g-grid' }));
    s.append(svgTexto(m.l - 8, y(t) + 4, compacto.format(t), 'g-texto', 'end'));
  }
  s.append(svgEl('line', { x1: m.l, x2: W - m.r, y1: y(0), y2: y(0), class: 'g-base' }));

  const cada = Math.ceil(etiquetas.length / Math.max(1, Math.floor(iw / 44)));
  etiquetas.forEach((e, k) => {
    if (k % cada === 0 || k === n) s.append(svgTexto(x(k), H - 8, e, 'g-texto', 'middle'));
  });

  if (meta) {
    s.append(svgEl('line', { x1: m.l, x2: W - m.r, y1: y(meta), y2: y(meta), class: 'g-meta' }));
    s.append(svgTexto(m.l + 4, y(meta) - 6, 'Meta ' + compacto.format(meta), 'g-texto'));
  }

  for (const serie of series) {
    const d = serie.valores.map((v, k) => (k ? 'L' : 'M') + x(k) + ',' + y(v)).join('');
    s.append(svgEl('path', { d, class: 'g-linea c' + serie.n }));
  }

  // Etiquetas directas al final de cada línea, separadas si chocan
  const finales = series.map((serie) => ({ serie, y: y(serie.valores[n]) }));
  if (finales.length === 2 && Math.abs(finales[0].y - finales[1].y) < 16) {
    const medio = (finales[0].y + finales[1].y) / 2;
    const [arriba, abajo] = finales[0].y <= finales[1].y ? finales : [finales[1], finales[0]];
    arriba.y = medio - 8;
    abajo.y = medio + 8;
  }
  for (const f of finales) s.append(svgTexto(x(n) + 8, f.y + 4, f.serie.nombre, 'g-etiqueta'));

  // Cruceta + puntos que siguen al puntero
  const cruz = svgEl('line', { y1: m.t, y2: m.t + ih, class: 'g-cruz', visibility: 'hidden' });
  const puntos = series.map((serie) => svgEl('circle', { r: 4, class: 'g-punto f' + serie.n, visibility: 'hidden' }));
  s.append(cruz, ...puntos);

  const capa = svgEl('rect', { x: m.l, y: m.t, width: iw, height: ih, class: 'g-hit' });
  capa.addEventListener('pointermove', (e) => {
    const r = s.getBoundingClientRect();
    const k = Math.max(0, Math.min(n, Math.round(((e.clientX - r.left - m.l) / iw) * n)));
    cruz.setAttribute('x1', x(k));
    cruz.setAttribute('x2', x(k));
    cruz.setAttribute('visibility', 'visible');
    series.forEach((serie, i) => {
      puntos[i].setAttribute('cx', x(k));
      puntos[i].setAttribute('cy', y(serie.valores[k]));
      puntos[i].setAttribute('visibility', 'visible');
    });
    mostrarTip(e.clientX, e.clientY, k === 0 ? 'Hoy' : `Dentro de ${k} ${k === 1 ? 'mes' : 'meses'}`,
      series.map((serie) => ({ valor: soles.format(serie.valores[k]), texto: serie.nombre, clave: 'b' + serie.n })));
  });
  capa.addEventListener('pointerleave', () => {
    cruz.setAttribute('visibility', 'hidden');
    puntos.forEach((p) => p.setAttribute('visibility', 'hidden'));
    ocultarTip();
  });
  s.append(capa);
  cont.append(s);
}
