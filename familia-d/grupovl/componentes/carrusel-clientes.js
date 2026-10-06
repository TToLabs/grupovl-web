/*
 * Carrusel de clientes — comportamiento.
 *
 * Requiere: window.CLIENTES (clientes.js) y el marcado con [data-ccar-raiz] (ver index.html).
 *
 * Cómo funciona
 * -------------
 * - La pista es una fila de tarjetas de ancho fijo. Se repite el conjunto el número de veces necesario para cubrir
 *   la ventana, y se desplaza con transform: translate3d. Cuando el desplazamiento completa un conjunto, vuelve a
 *   cero: el salto es invisible porque el siguiente conjunto es idéntico (bucle infinito sin parpadeo).
 * - La tarjeta destacada (.is-on) se calcula con una división, no leyendo posiciones del DOM:
 *   indice = round((desplazamiento + ancho_ventana/2 - ancho_tarjeta/2) / paso). Es barato y corre a 60 fps.
 * - El avance se detiene (sin gastar CPU) cuando: el usuario lo pausa, el cursor está encima, hay foco dentro,
 *   se está arrastrando, el carrusel salió de pantalla o la pestaña está oculta.
 * - Con "reducir movimiento" activado no hay animación: se muestra una grilla estática con los mismos nombres.
 *
 * Accesibilidad
 * -------------
 * - Región con roledescription="carrusel", navegable con flechas izquierda y derecha.
 * - Botón de pausa (WCAG 2.2.2), botones anterior/siguiente y filtros con aria-pressed.
 * - Las tarjetas repetidas llevan aria-hidden e inert: los lectores de pantalla leen cada cliente una sola vez.
 * - Un mensaje aria-live anuncia cuántos clientes se muestran al filtrar.
 */
(function () {
  'use strict';

  var VELOCIDAD = 42;          // px por segundo
  var ESPERA_TRAS_USO = 1400;  // ms sin avanzar después de arrastrar o usar los botones
  var DURACION_SALTO = 480;    // ms del desplazamiento de los botones anterior/siguiente

  var ICONO = {
    prev: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>',
    next: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
    pausa: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',
    play: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg>'
  };

  function ease(t) { return 1 - Math.pow(1 - t, 3); }          // ease-out cúbico

  function Carrusel(raiz, datos) {
    var $ = function (s) { return raiz.querySelector('[data-ccar="' + s + '"]'); };
    var ventana = $('ventana'), pista = $('pista'), contFiltros = $('filtros'), estadoTxt = $('estado');
    var btnPrev = $('prev'), btnNext = $('next'), btnPausa = $('pausa');

    var filtro = 'todos', lista = [], lis = [];
    var ancho = 200, paso = 216, anchoConjunto = 0, anchoVentana = 0;
    var desplazamiento = 0, ultimo = 0, raf = 0, salto = null, activo = null, estatico = false;
    var motivos = { usuario: false, cursor: false, foco: false, arrastre: false, fuera: false, oculta: false, hasta: 0 };

    var reducir = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

    /* ---------- Construcción ---------- */
    function filtrar() {
      lista = datos.items.filter(function (it) { return filtro === 'todos' || it.c === filtro; });
    }

    function medir() {
      var cs = getComputedStyle(raiz);
      ancho = parseFloat(cs.getPropertyValue('--ccar-w')) || 200;
      var gap = parseFloat(cs.getPropertyValue('--ccar-gap')) || 16;
      paso = ancho + gap;
      anchoVentana = ventana.clientWidth;
      anchoConjunto = lista.length * paso;
    }

    function crearItem(it, clon) {
      var li = document.createElement('li');
      li.className = 'ccar__item';
      var img = document.createElement('img');
      img.src = 'img/clientes/' + it.f;
      img.alt = '';                                 // el nombre ya está en el texto: la imagen es decorativa
      img.decoding = 'async';
      img.draggable = false;
      var nombre = document.createElement('span');
      nombre.className = 'ccar__nombre';
      nombre.textContent = it.n;
      li.appendChild(img);
      li.appendChild(nombre);
      if (clon) {
        li.setAttribute('aria-hidden', 'true');
        li.setAttribute('inert', '');
      }
      return li;
    }

    function construir() {
      estatico = reducir.matches;
      raiz.classList.toggle('is-estatico', estatico);
      medir();
      pista.textContent = '';
      lis = [];
      activo = null;
      // Cuántos conjuntos hacen falta: los que cubren la ventana más uno de margen a cada lado
      var conjuntos = estatico || !anchoConjunto ? 1 : Math.ceil(anchoVentana / anchoConjunto) + 2;
      for (var c = 0; c < conjuntos; c++) {
        lista.forEach(function (it) {
          var li = crearItem(it, c > 0);
          pista.appendChild(li);
          lis.push(li);
        });
      }
      desplazamiento = 0;
      pista.style.transform = estatico ? 'none' : 'translate3d(0,0,0)';
      if (!estatico) marcar();
    }

    function construirFiltros() {
      contFiltros.textContent = '';
      var opciones = [{ id: 'todos', nombre: 'Todos', total: datos.items.length }].concat(datos.categorias.map(function (cat) {
        return { id: cat.id, nombre: cat.nombre, total: datos.items.filter(function (i) { return i.c === cat.id; }).length };
      }));
      opciones.forEach(function (op) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'ccar__filtro';
        b.setAttribute('aria-pressed', String(op.id === filtro));
        b.dataset.filtro = op.id;
        b.innerHTML = op.nombre + '<small>' + op.total + '</small>';
        b.addEventListener('click', function () { aplicarFiltro(op); });
        contFiltros.appendChild(b);
      });
    }

    function aplicarFiltro(op) {
      filtro = op.id;
      [].forEach.call(contFiltros.children, function (b) { b.setAttribute('aria-pressed', String(b.dataset.filtro === filtro)); });
      filtrar();
      construir();
      estadoTxt.textContent = filtro === 'todos' ? 'Mostrando los ' + lista.length + ' clientes' : 'Mostrando ' + lista.length + ' clientes de ' + op.nombre;
    }

    /* ---------- Animación ---------- */
    function pausado(ahora) {
      return motivos.usuario || motivos.cursor || motivos.foco || motivos.arrastre || motivos.fuera || motivos.oculta || ahora < motivos.hasta;
    }

    // Marca la tarjeta más cercana al centro de la ventana. Una sola división, sin leer el DOM.
    function marcar() {
      if (!lis.length) return;
      var centro = desplazamiento + anchoVentana / 2 - ancho / 2;
      var i = Math.max(0, Math.min(lis.length - 1, Math.round(centro / paso)));
      if (lis[i] !== activo) {
        if (activo) activo.classList.remove('is-on');
        activo = lis[i];
        activo.classList.add('is-on');
      }
    }

    function normalizar() {
      if (anchoConjunto) desplazamiento = ((desplazamiento % anchoConjunto) + anchoConjunto) % anchoConjunto;
    }

    function cuadro(t) {
      raf = requestAnimationFrame(cuadro);
      var dt = Math.min(0.05, (t - ultimo) / 1000);   // tope: si la pestaña estuvo inactiva no hay saltos grandes
      ultimo = t;
      if (estatico || !anchoConjunto) return;
      if (salto) {
        var p = Math.min(1, (t - salto.inicio) / DURACION_SALTO);
        desplazamiento = salto.desde + (salto.hasta - salto.desde) * ease(p);
        if (p === 1) salto = null;
      } else if (!pausado(t)) {
        desplazamiento += VELOCIDAD * dt;
      } else {
        return;                                        // en pausa: no se toca el DOM
      }
      normalizar();
      pista.style.transform = 'translate3d(' + (-desplazamiento).toFixed(2) + 'px,0,0)';
      marcar();
    }

    function iniciar() { if (!raf) { ultimo = performance.now(); raf = requestAnimationFrame(cuadro); } }

    /* ---------- Controles ---------- */
    function mover(direccion) {
      if (estatico || !anchoConjunto) return;
      salto = { inicio: performance.now(), desde: desplazamiento, hasta: desplazamiento + direccion * paso };
      motivos.hasta = performance.now() + DURACION_SALTO + ESPERA_TRAS_USO;
    }

    function fijarPausa(valor) {
      motivos.usuario = valor;
      btnPausa.setAttribute('aria-pressed', String(valor));
      btnPausa.setAttribute('aria-label', valor ? 'Reanudar carrusel' : 'Pausar carrusel');
      btnPausa.innerHTML = valor ? ICONO.play : ICONO.pausa;
      estadoTxt.textContent = valor ? 'Carrusel en pausa' : 'Carrusel en movimiento';
    }

    btnPrev.innerHTML = ICONO.prev;
    btnNext.innerHTML = ICONO.next;
    btnPausa.innerHTML = ICONO.pausa;
    btnPrev.addEventListener('click', function () { mover(-1); });
    btnNext.addEventListener('click', function () { mover(1); });
    btnPausa.addEventListener('click', function () { fijarPausa(!motivos.usuario); });

    // Teclado: flechas sobre la ventana
    ventana.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); mover(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); mover(-1); }
    });

    // Cursor y foco detienen el avance (solo con mouse: en el teléfono un toque no debe dejarlo pegado)
    ventana.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') motivos.cursor = true; });
    ventana.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') motivos.cursor = false; });
    // El foco detiene el avance solo si es foco de teclado (:focus-visible). Después de un clic con el mouse el foco
    // queda en el botón, y sin esta distinción el carrusel se quedaría congelado.
    raiz.addEventListener('focusin', function (e) { motivos.foco = !!(e.target.matches && e.target.matches(':focus-visible')); });
    raiz.addEventListener('focusout', function () { motivos.foco = false; });

    // Arrastre con el dedo o el mouse
    var xAnterior = 0;
    ventana.addEventListener('pointerdown', function (e) {
      if (estatico || (e.pointerType === 'mouse' && e.button !== 0)) return;
      motivos.arrastre = true; salto = null; xAnterior = e.clientX;
      raiz.classList.add('is-arrastrando');
      try { ventana.setPointerCapture(e.pointerId); } catch (err) { /* sin captura: el arrastre sigue funcionando dentro */ }
    });
    ventana.addEventListener('pointermove', function (e) {
      if (!motivos.arrastre) return;
      desplazamiento -= e.clientX - xAnterior;
      xAnterior = e.clientX;
      normalizar();
      pista.style.transform = 'translate3d(' + (-desplazamiento).toFixed(2) + 'px,0,0)';
      marcar();
    });
    function soltar() {
      if (!motivos.arrastre) return;
      motivos.arrastre = false;
      motivos.hasta = performance.now() + ESPERA_TRAS_USO;
      raiz.classList.remove('is-arrastrando');
    }
    ventana.addEventListener('pointerup', soltar);
    ventana.addEventListener('pointercancel', soltar);

    // Solo se anima mientras se ve
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        motivos.fuera = !es[0].isIntersecting;
        if (es[0].isIntersecting && ventana.clientWidth !== anchoVentana) construir();   // pudo medirse en 0 estando oculto
      }).observe(raiz);
    }
    document.addEventListener('visibilitychange', function () { motivos.oculta = document.hidden; });

    // Cambios de tamaño y de preferencia de movimiento
    var temporizador = 0;
    window.addEventListener('resize', function () {
      clearTimeout(temporizador);
      temporizador = setTimeout(function () { if (ventana.clientWidth !== anchoVentana) construir(); }, 160);
    });
    if (reducir.addEventListener) reducir.addEventListener('change', construir);

    /* ---------- Arranque ---------- */
    construirFiltros();
    filtrar();
    construir();
    estadoTxt.textContent = '';
    iniciar();

    return { mover: mover, pausar: fijarPausa };
  }

  function arrancar() {
    var datos = window.CLIENTES;
    if (!datos) return;
    [].forEach.call(document.querySelectorAll('[data-ccar-raiz]'), function (raiz) { raiz.carrusel = new Carrusel(raiz, datos); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar); else arrancar();
})();
