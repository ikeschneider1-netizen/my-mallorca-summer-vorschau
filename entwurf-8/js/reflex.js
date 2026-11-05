// Reflex wie auf einer Fensterscheibe: Halftone-Punkte gleiten diagonal über die Seite.
// Er liegt ZWISCHEN Hintergrund und Inhalt: über dem Papier, unter Text, Karten, Fotos und Knöpfen.
//  – global: ein festes Canvas mit z-index -1 (sichtbar überall, wo das Papier der Seite durchscheint)
//  – lokal: Flächen mit eigener Farbe tragen [data-reflex="#farbe"] und bekommen ein eigenes Canvas hinter ihren Inhalt
// Gekoppelt ans Scrollen (beim Lesen blendet er aus), beim Laden einmal quer drüber.
// Kein Dauerlauf; bei reduzierter Bewegung gar nicht vorhanden. Rein dekorativ (aria-hidden, keine Klicks).
(function () {
  'use strict';
  var ruhig = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (ruhig.matches || !window.requestAnimationFrame) return;

  function ebene(klasse, eltern, farbe) {
    var c = document.createElement('canvas');
    c.className = klasse;
    c.setAttribute('aria-hidden', 'true');
    eltern.insertBefore(c, eltern.firstChild);
    return { c: c, ctx: c.getContext('2d'), eltern: eltern, farbe: farbe, global: eltern === document.body };
  }
  var ebenen = [ebene('reflex', document.body, '#111111')];
  // Farbflächen bekommen eigene Ebenen erst ab Tablet (am Handy zu teuer); das Handy hat den Reflex auf dem Papier.
  var gross = window.matchMedia('(min-width: 768px)').matches;
  if (gross) Array.prototype.forEach.call(document.querySelectorAll('[data-reflex]'), function (el) {
    ebenen.push(ebene('reflex reflex-lokal', el, el.getAttribute('data-reflex')));
  });

  // Richtung: Streifen stehen steil, wandern nach rechts unten. Ein breiter und ein schmaler Streifen.
  var WINKEL = 22 * Math.PI / 180;
  var CA = Math.cos(WINKEL), SA = Math.sin(WINKEL);
  var STREIFEN = [{ ab: 0, halb: 1, groesse: 1 }, { ab: -1.75, halb: .3, groesse: .78 }];
  var w = 0, h = 0, dpr = 1, zelle = 9, breite = 120, spanne = 1;
  var weg = 0, schub = 0, staerke = 0, ziel = 0;
  var letzteY = window.scrollY, letzteZeit = performance.now(), ruheSeit = 0, raf = 0;
  var intro = null;

  function messen() {
    dpr = Math.min(1.5, window.devicePixelRatio || 1);
    w = window.innerWidth; h = window.innerHeight;
    zelle = w < 768 ? 8 : 9;
    breite = w < 768 ? 80 : 130;
    spanne = w * CA + h * SA + breite * 5;
    ebenen.forEach(function (e) {
      // Alle Canvas sind höchstens fensterhoch; lokale wandern innerhalb ihres Abschnitts mit (siehe zeichneEbene)
      var bw = e.global ? w : e.eltern.offsetWidth, bh = e.global ? h : Math.min(h, e.eltern.offsetHeight);
      e.bw = bw; e.bh = bh; e.leer = false;
      if (!e.global) e.c.style.height = bh + 'px';
      e.c.width = Math.round(bw * dpr); e.c.height = Math.round(bh * dpr);
      e.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    });
    zeichnen();
  }

  function leeren(e) { if (!e.leer) { e.ctx.clearRect(0, 0, e.bw, e.bh); e.leer = true; } }
  function zeichneEbene(e, p) {
    var ctx = e.ctx;
    if (staerke < .01) { leeren(e); return; }
    // Lokale Flächen: Canvas an den sichtbaren Teil schieben, Fensterkoordinaten umrechnen (Streifen wirkt durchgehend)
    var ox = 0, oy = 0, vh = h;
    if (!e.global) {
      var r = e.eltern.getBoundingClientRect();
      if (r.bottom < 0 || r.top > h) { leeren(e); return; }
      var schieb = Math.max(0, Math.min(-r.top, r.height - e.bh));
      e.c.style.transform = 'translateY(' + schieb + 'px)';
      ox = r.left; oy = r.top + schieb;
    }
    ctx.clearRect(0, 0, e.bw, e.bh);
    e.leer = false;
    var rMax = zelle * .46;
    ctx.fillStyle = e.farbe;
    ctx.beginPath();
    var y0 = Math.max(0, Math.floor(-oy / zelle)) * zelle, y1 = Math.min(e.bh, vh - oy) + zelle;
    for (var y = y0; y < y1; y += zelle) {
      var zeile = Math.round(y / zelle);
      var versatz = zeile % 2 ? zelle / 2 : 0;
      var fy = y + oy;
      for (var s = 0; s < STREIFEN.length; s++) {
        var st = STREIFEN[s];
        var mitte = p + st.ab * breite;
        var halb = st.halb * breite;
        var x0 = Math.floor((((mitte - halb - fy * SA) / CA - ox) - versatz) / zelle) * zelle + versatz;
        var x1 = (mitte + halb - fy * SA) / CA - ox;
        for (var x = Math.max(versatz, x0); x <= Math.min(e.bw + zelle, x1); x += zelle) {
          var d = ((x + ox) * CA + fy * SA - mitte) / halb;
          if (d <= -1 || d >= 1) continue;
          var rad = rMax * (1 - d * d) * st.groesse;
          if (rad < .5) continue;
          ctx.moveTo(x + rad, y);
          ctx.arc(x, y, rad, 0, 6.2832);
        }
      }
    }
    ctx.fill();
  }

  function zeichnen() {
    // Position: ruht beim Seitenanfang links außerhalb, wandert mit dem Scrollen, wiederholt sich je Durchgang.
    var p = -breite * 1.5 + ((weg + schub) % spanne + spanne) % spanne;
    ebenen.forEach(function (e) {
      e.c.style.opacity = (staerke * (e.global ? .42 : .3)).toFixed(3);
      zeichneEbene(e, p);
    });
  }

  function schritt(jetzt) {
    raf = 0;
    if (intro) {
      var t = Math.min(1, (jetzt - intro.start) / intro.dauer);
      schub = (1 - Math.pow(1 - t, 3)) * spanne;
      ziel = t < .85 ? 1 : 0;
      if (t >= 1) { intro = null; schub = 0; }
    }
    if (!intro && jetzt - ruheSeit > 160) ziel = 0;
    staerke += (ziel - staerke) * (ziel > staerke ? .35 : .12);
    zeichnen();
    if (intro || staerke > .01 || ziel > 0) raf = requestAnimationFrame(schritt);
  }
  function anstossen() { if (!raf) raf = requestAnimationFrame(schritt); }

  window.addEventListener('scroll', function () {
    var jetzt = performance.now();
    var dy = window.scrollY - letzteY;
    var dt = Math.max(1, jetzt - letzteZeit);
    letzteY = window.scrollY; letzteZeit = jetzt; ruheSeit = jetzt;
    weg += Math.abs(dy) * .8;
    ziel = Math.min(1, .45 + Math.abs(dy) / dt * .6);
    anstossen();
  }, { passive: true });
  window.addEventListener('resize', messen);
  if ('ResizeObserver' in window) {
    var ro = new ResizeObserver(function () { messen(); });
    ebenen.forEach(function (e) { if (!e.global) ro.observe(e.eltern); });
  }
  if (ruhig.addEventListener) ruhig.addEventListener('change', function () { if (ruhig.matches) ebenen.forEach(function (e) { e.c.remove(); }); });

  messen();
  // Einmal quer über die Seite, nach dem Ladeablauf des Heros (falls er läuft).
  // (am Handy nicht: das Laden soll dort ruhig und schnell bleiben)
  if (window.matchMedia('(min-width: 1024px)').matches) {
    var verzug = document.documentElement.classList.contains('intro') ? 1500 : 350;
    setTimeout(function () { intro = { start: performance.now(), dauer: 1300 }; anstossen(); }, verzug);
  }
})();
