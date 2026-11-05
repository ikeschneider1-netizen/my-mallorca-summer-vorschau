// Halftone-Schimmer: Punkteraster mit einzelnen Buchstaben, eine Welle lässt die Punkte wachsen und schrumpfen.
// Stop-Motion mit 12 Bildern pro Sekunde, nur solange sichtbar; bei reduzierter Bewegung ein stilles Bild.
// Einbau: <canvas class="schimmer" data-zeichen="MYMALLORCASUMMER2027" data-farbe="schwarz|blau" [data-still] aria-hidden="true"></canvas>
(function () {
  'use strict';
  var ruhig = window.matchMedia('(prefers-reduced-motion: reduce)');
  var FARBE = { schwarz: '#111111', blau: '#2e2fc8' };
  var BILD = 1000 / 12;

  function schimmer(canvas) {
    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    var zeichen = (canvas.dataset.zeichen || 'MYMALLORCASUMMER2027').split('');
    var farbe = FARBE[canvas.dataset.farbe] || FARBE.schwarz;
    var w = 0, h = 0, zelle = 14, spalten = 0, zeilen = 0;
    var buchstaben = {};
    var sichtbar = false, raf = 0, letztes = 0;
    // data-still: nur ein ruhiges Bild (der Reflex ist der einzige bewegte Punkte-Effekt)
    var still = canvas.hasAttribute('data-still');
    var start = performance.now();

    // Feste Buchstabenplätze mit Seed: gleiche Fläche, gleiches Muster.
    function verteilen() {
      buchstaben = {};
      var s = 20271;
      function z() { s = (s * 16807) % 2147483647; return s / 2147483647; }
      for (var y = 0; y < zeilen; y++) {
        for (var x = 0; x < spalten; x++) {
          if (z() < .035) buchstaben[x + ',' + y] = { c: zeichen[Math.floor(z() * zeichen.length)], f: z() < .5 ? 'Bungee' : '"Courier Prime"' };
        }
      }
    }
    function messen() {
      var r = canvas.getBoundingClientRect();
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      w = r.width; h = r.height;
      if (!w || !h) return;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      zelle = w < 600 ? 11 : 14;
      spalten = Math.ceil(w / zelle) + 1;
      zeilen = Math.ceil(h / zelle) + 1;
      verteilen();
      zeichnen(zeit());
    }
    function zeit() { return (performance.now() - start) / 1000; }
    // Zwei Wellen überlagert: eine schräge, schnelle und eine flache, langsame. Ergebnis 0…1.
    function welle(x, y, t) {
      var a = Math.sin(x * .17 + y * .11 - t * 2.1);
      var b = Math.sin(x * .05 - y * .14 + t * 1.2);
      return Math.max(0, Math.min(1, .48 + .36 * a + .22 * b));
    }
    function zeichnen(t) {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = farbe;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (var y = 0; y < zeilen; y++) {
        for (var x = 0; x < spalten; x++) {
          var v = welle(x, y, t);
          var cx = x * zelle + (y % 2 ? zelle / 2 : 0);
          var cy = y * zelle;
          var b = buchstaben[x + ',' + y];
          if (b) {
            ctx.font = Math.round(zelle * (.85 + v * 1.05)) + 'px ' + b.f;
            ctx.fillText(b.c, cx, cy);
            continue;
          }
          var r = zelle * .5 * Math.pow(v, 1.35) * .92;
          if (r < .45) continue;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, 6.2832);
          ctx.fill();
        }
      }
    }
    function schleife(jetzt) {
      raf = 0;
      if (!sichtbar || still || ruhig.matches || document.hidden) return;
      if (jetzt - letztes >= BILD) { letztes = jetzt; zeichnen(zeit()); }
      raf = requestAnimationFrame(schleife);
    }
    function weiter() { if (!raf && sichtbar && !still && !ruhig.matches && !document.hidden) raf = requestAnimationFrame(schleife); }

    messen();
    if ('ResizeObserver' in window) new ResizeObserver(messen).observe(canvas);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) { sichtbar = e[0].isIntersecting; weiter(); }).observe(canvas);
    } else { sichtbar = true; weiter(); }
    document.addEventListener('visibilitychange', weiter);
    if (ruhig.addEventListener) ruhig.addEventListener('change', function () { zeichnen(zeit()); weiter(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { zeichnen(zeit()); });
    canvas.classList.add('schimmer-an');
  }

  Array.prototype.forEach.call(document.querySelectorAll('canvas.schimmer'), schimmer);
})();
