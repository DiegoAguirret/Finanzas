// Se carga en <head> antes de pintar: aplica el tema y la paleta guardados para evitar parpadeo
'use strict';
(function () {
  let tema = null;
  try { tema = localStorage.getItem('finanzas.tema'); } catch {}
  if (tema !== 'light' && tema !== 'dark') {
    tema = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.dataset.theme = tema;
  // Paleta elegida en Ajustes (esmeralda, si no se eligió ninguna)
  let paleta = null;
  try { paleta = localStorage.getItem('finanzas.paleta'); } catch {}
  const paletas = ['esmeralda', 'petroleo', 'azul', 'indigo', 'ciruela', 'oliva', 'terracota', 'grafito'];
  document.documentElement.dataset.paleta = paletas.includes(paleta) ? paleta : 'esmeralda';
  // Barra lateral oculta (solo en pantallas anchas; en móvil siempre empieza cerrada)
  try {
    if (localStorage.getItem('finanzas.menu') === 'oculto') document.documentElement.dataset.menu = 'oculto';
  } catch {}
})();
