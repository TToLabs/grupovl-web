/*
 * Mapa interactivo de Chile — comportamiento.
 *
 * Requiere: window.CHILE_MAPA (chile-regiones.js, generado desde Natural Earth) y el marcado con [data-cmap-raiz].
 *
 * Qué hace
 * --------
 * - Dibuja las 16 regiones como trazados SVG propios (sin librerías ni mapas de terceros).
 * - Cada región tiene un estado: "confirmada" (hay clientes visibles del grupo), "ejemplo" (por confirmar con Grupo VL)
 *   o "sin" (sin información cargada: no es interactiva).
 * - Hover o foco: se resalta la región y aparece un tooltip. Clic, toque o Enter: se selecciona y se llena el panel.
 * - La Región Metropolitana es la selección inicial y muestra los datos de la casa matriz.
 * - Selector alternativo en botones: la misma información para quien navega con teclado o con el teléfono.
 *
 * Los datos de este archivo (DATOS) son lo único que hay que editar para cambiar regiones, clientes o la casa matriz.
 *
 * Accesibilidad
 * -------------
 * - Las regiones interactivas son botones (role="button", aria-pressed, aria-label con su estado) y se recorren con Tab.
 * - Flechas: pasan de una región a la siguiente en sentido norte-sur (izquierda a derecha). Enter o espacio seleccionan. Escape vuelve a la matriz.
 * - El panel es aria-live="polite": el lector de pantalla anuncia la región elegida.
 */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var XLINK = 'http://www.w3.org/1999/xlink';

  var TEXTO_ESTADO = { confirmada: 'Presencia confirmada por clientes', ejemplo: 'Ejemplo, por confirmar' };

  /* ---------- Datos editables ---------- */
  var DATOS = {
    rm: {
      estado: 'confirmada',
      texto: 'Aquí está la casa matriz del grupo, en Santiago.',
      clientes: [
        'Municipalidades de Santiago, Renca, Cerro Navia, Lo Espejo, Lampa, Independencia, Pudahuel, Quilicura, Recoleta, Cerrillos y San Bernardo',
        'Hospitales San Borja Arriarán y El Pino',
        'Universidad Diego Portales y Universidad de los Andes'
      ],
      hq: {
        direccion: 'Arturo Prat 1370, Santiago',
        telefono: '+56 2 2363 5000',
        horario: 'Por confirmar con Grupo VL',
        correo: 'comercial@grupovl.cl'
      },
      tip: 'Casa matriz · Arturo Prat 1370'
    },
    valparaiso: { estado: 'confirmada', texto: 'Clientes del grupo visibles hoy en esta región.', clientes: ['Municipalidad de Nogales', 'Universidad de Valparaíso'] },
    ohiggins: { estado: 'confirmada', texto: 'Clientes del grupo visibles hoy en esta región.', clientes: ['Municipalidades de Machalí, Requínoa y Olivar'] },
    maule: { estado: 'confirmada', texto: 'Clientes del grupo visibles hoy en esta región.', clientes: ['Universidad de Talca'] },
    biobio: { estado: 'confirmada', texto: 'Clientes del grupo visibles hoy en esta región.', clientes: ['Municipalidad de Concepción'] },
    // La web declara 8 regiones "desde la II Región hasta la Región del Bío Bío" (grupovl.cl/nosotros).
    // Estas tres, dentro de ese rango, completan las 8. Grupo VL debe confirmar cuáles son.
    antofagasta: { estado: 'ejemplo', texto: 'La web del grupo declara presencia desde la II Región. Clientes por confirmar antes de publicar.' },
    coquimbo: { estado: 'ejemplo', texto: 'Región de ejemplo dentro de la cobertura declarada (II Región a Biobío). Debe confirmarse antes de publicar.' },
    nuble: { estado: 'ejemplo', texto: 'Región de ejemplo dentro de la cobertura declarada (II Región a Biobío). Debe confirmarse antes de publicar.' }
  };
  var INICIAL = 'rm';

  function crear(tag, atributos, padre) {
    var e = document.createElementNS(NS, tag);
    for (var k in atributos) if (Object.prototype.hasOwnProperty.call(atributos, k)) e.setAttribute(k, atributos[k]);
    if (padre) padre.appendChild(e);
    return e;
  }

  function Mapa(raiz, mapa) {
    var $ = function (s) { return raiz.querySelector('[data-cmap="' + s + '"]'); };
    var svg = $('svg'), escenario = raiz.querySelector('.cmap__escenario'), tip = $('tip'), panel = $('panel'), contChips = $('chips');
    var campos = { estado: $('estado'), titulo: $('titulo'), texto: $('texto'), clientes: $('clientes'), hq: $('hq') };

    var porId = {}, interactivas = [], seleccionada = null, ocultarTip = 0;

    /* ---------- Dibujo ---------- */
    svg.setAttribute('viewBox', mapa.viewBox.join(' '));

    // Trama diagonal para las regiones de ejemplo (se distinguen sin depender solo del color)
    var defs = crear('defs', {}, svg);
    var trama = crear('pattern', { id: 'cmap-trama', width: 5, height: 5, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
    crear('rect', { width: 5, height: 5, fill: '#fff3d6' }, trama);
    crear('rect', { width: 2.2, height: 5, fill: '#e8a100', opacity: '.55' }, trama);

    var capaRegiones = crear('g', {}, svg);
    mapa.regiones.forEach(function (r, i) {
      var datos = DATOS[r.id];
      var estado = datos ? datos.estado : 'sin';
      var p = crear('path', { id: 'cmap-reg-' + r.id, d: r.d, class: 'cmap__reg cmap__reg--' + estado }, capaRegiones);
      p.style.setProperty('--i', i);
      var reg = { id: r.id, nombre: r.nombre, estado: estado, datos: datos, el: p, chip: null };
      porId[r.id] = reg;
      if (!datos) { p.setAttribute('aria-hidden', 'true'); return; }
      interactivas.push(reg);
      p.setAttribute('tabindex', '0');
      p.setAttribute('role', 'button');
      p.setAttribute('aria-pressed', 'false');
      p.setAttribute('aria-label', r.nombre + '. ' + TEXTO_ESTADO[estado]);
      p.addEventListener('pointerenter', function (e) { if (e.pointerType !== 'touch') resaltar(reg); });
      p.addEventListener('pointerleave', function (e) { if (e.pointerType !== 'touch') quitarResalte(reg); });
      p.addEventListener('focus', function () { resaltar(reg); });
      p.addEventListener('blur', function () { quitarResalte(reg); });
      p.addEventListener('click', function () { seleccionar(reg.id); if (!window.matchMedia('(hover: hover)').matches) mostrarBreve(reg); });
      p.addEventListener('keydown', function (e) { teclado(e, reg); });
    });

    // Contorno de la región seleccionada, en una capa superior para que no lo tapen las vecinas
    var contorno = crear('path', { class: 'cmap__sel', d: '' }, svg);

    // Casa matriz
    var hq = crear('g', {}, svg);
    var sx = mapa.santiago[0], sy = mapa.santiago[1];
    // Tamaños en unidades del mapa horizontal (822 de ancho); la etiqueta va sobre el pin, hacia la cordillera
    crear('circle', { class: 'cmap__pulso', cx: sx, cy: sy, r: 4.5 }, hq);
    crear('circle', { class: 'cmap__pin', cx: sx, cy: sy, r: 3.6 }, hq);
    var etiqueta = crear('text', { class: 'cmap__etiqueta', x: sx, y: sy - 10, 'text-anchor': 'middle' }, hq);
    etiqueta.textContent = 'Casa matriz';

    /* ---------- Selector alternativo ---------- */
    interactivas.forEach(function (reg) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'cmap__chip' + (reg.estado === 'ejemplo' ? ' cmap__chip--ejemplo' : '');
      b.textContent = reg.nombre;
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () { seleccionar(reg.id); });
      contChips.appendChild(b);
      reg.chip = b;
    });

    /* ---------- Tooltip ---------- */
    function mostrarTip(reg) {
      clearTimeout(ocultarTip);
      var s1 = document.createElement('strong'); s1.textContent = reg.nombre;
      var s2 = document.createElement('span'); s2.textContent = reg.datos.tip || TEXTO_ESTADO[reg.estado];
      tip.textContent = '';
      tip.appendChild(s1); tip.appendChild(s2);
      tip.hidden = false;
      // Posición: centrado sobre la región; si no cabe arriba, debajo. Siempre dentro del escenario.
      var e = escenario.getBoundingClientRect(), r = reg.el.getBoundingClientRect();
      var w = tip.offsetWidth, h = tip.offsetHeight;
      var x = Math.max(8, Math.min(r.left - e.left + r.width / 2 - w / 2, e.width - w - 8));
      var y = r.top - e.top - h - 8;
      if (y < 8) y = r.bottom - e.top + 8;
      if (y + h > e.height - 8) {   // región alta: no cabe arriba ni abajo, va al costado (derecha o izquierda)
        y = Math.max(8, Math.min(r.top - e.top + r.height / 2 - h / 2, e.height - h - 8));
        x = r.right - e.left + 10;
        if (x + w > e.width - 8) x = Math.max(8, r.left - e.left - w - 10);
      }
      tip.style.left = x + 'px';
      tip.style.top = y + 'px';
    }
    function ocultar() { tip.hidden = true; }
    function mostrarBreve(reg) { mostrarTip(reg); clearTimeout(ocultarTip); ocultarTip = setTimeout(ocultar, 2400); }   // en el teléfono no hay hover
    function resaltar(reg) { reg.el.classList.add('is-hover'); mostrarTip(reg); }
    function quitarResalte(reg) { reg.el.classList.remove('is-hover'); ocultar(); }

    /* ---------- Selección y panel ---------- */
    function seleccionar(id) {
      var reg = porId[id];
      if (!reg || !reg.datos) return;
      seleccionada = reg;
      interactivas.forEach(function (r) {
        var activa = r === reg;
        r.el.setAttribute('aria-pressed', String(activa));
        r.chip.setAttribute('aria-pressed', String(activa));
      });
      contorno.setAttribute('d', mapa.regiones.filter(function (x) { return x.id === id; })[0].d);
      // En el teléfono el país se desliza de lado: se centra la región elegida
      var sc = svg.parentNode;
      if (sc.scrollWidth > sc.clientWidth) {
        var rr = reg.el.getBoundingClientRect(), sr = sc.getBoundingClientRect();
        sc.scrollLeft += rr.left + rr.width / 2 - (sr.left + sr.width / 2);
      }

      var d = reg.datos;
      campos.estado.className = 'cmap__estado cmap__estado--' + reg.estado;
      campos.estado.textContent = TEXTO_ESTADO[reg.estado];
      campos.titulo.textContent = reg.nombre;
      campos.texto.textContent = d.texto;
      campos.clientes.textContent = '';
      (d.clientes || []).forEach(function (c) {
        var li = document.createElement('li');
        li.textContent = c;
        campos.clientes.appendChild(li);
      });
      campos.clientes.hidden = !(d.clientes && d.clientes.length);

      campos.hq.textContent = '';
      if (d.hq) {
        [['Dirección', d.hq.direccion], ['Teléfono', d.hq.telefono], ['Horario', d.hq.horario], ['Correo', d.hq.correo]].forEach(function (par) {
          var fila = document.createElement('div'), dt = document.createElement('dt'), dd = document.createElement('dd');
          dt.textContent = par[0]; dd.textContent = par[1];
          fila.appendChild(dt); fila.appendChild(dd);
          campos.hq.appendChild(fila);
        });
        campos.hq.hidden = false;
      } else {
        campos.hq.hidden = true;
      }
    }

    /* ---------- Teclado ---------- */
    function teclado(e, reg) {
      var i = interactivas.indexOf(reg), destino = null;
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); seleccionar(reg.id); return; }
      if (e.key === 'Escape') { seleccionar(INICIAL); ocultar(); return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') destino = interactivas[Math.min(i + 1, interactivas.length - 1)];
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') destino = interactivas[Math.max(i - 1, 0)];
      if (e.key === 'Home') destino = interactivas[0];
      if (e.key === 'End') destino = interactivas[interactivas.length - 1];
      if (destino) { e.preventDefault(); destino.el.focus(); }
    }

    /* ---------- Entrada animada al aparecer ---------- */
    function listo() { raiz.classList.add('is-listo'); }
    if ('IntersectionObserver' in window) {
      var obs = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { listo(); obs.disconnect(); } }, { threshold: 0.2 });
      obs.observe(raiz);
      setTimeout(listo, 3000);    // respaldo: si el observador no responde, el mapa igual se muestra
    } else {
      listo();
    }

    seleccionar(INICIAL);
    return { seleccionar: seleccionar, regiones: porId };
  }

  function arrancar() {
    if (!window.CHILE_MAPA) return;
    [].forEach.call(document.querySelectorAll('[data-cmap-raiz]'), function (raiz) { raiz.mapa = new Mapa(raiz, window.CHILE_MAPA); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar); else arrancar();
})();
