// Mehr Action in den Ransom-Titeln, ohne Dauerschleife:
//  – beim Scrollen zucken die Buchstaben aller sichtbaren Titel in Stop-Motion (je schneller, desto stärker), dann ist wieder Ruhe
//  – am Desktop heben sich die Schnipsel des Hero-Titels unter der Maus wie lose Sticker
// Mit weichem Scrollen (Lenis) kommt das Tempo aus Lenis, sonst aus dem Scroll-Ereignis.
// Bei reduzierter Bewegung passiert nichts.
(function () {
  'use strict';
  var ruhig = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (ruhig.matches) return;
  var e8 = window.__e8 = window.__e8 || {};
  var titel = Array.prototype.slice.call(document.querySelectorAll('.ransom-titel, .zwischenzeile'));
  if (!titel.length) return;
  var hero = document.querySelector('.hero-titel');

  var gruppen = titel.map(function (t) {
    var teile = Array.prototype.slice.call(t.querySelectorAll('.rp'));
    return {
      el: t, teile: teile, sichtbar: t === hero,
      zucken: teile.map(function () { return { r: 0, y: 0 }; }),
      heben: teile.map(function () { return 0; }),
      richtung: teile.map(function (x, i) { return (i * 7919) % 2 ? 1 : -1; })
    };
  });
  var energie = 0, letzteY = window.scrollY, letzteZeit = performance.now(), letztesBild = 0, raf = 0;
  e8.zuckEnergie = function () { return energie; };

  function anwenden(g, i) {
    var t = g.teile[i], f = g.heben[i], z = g.zucken[i];
    t.style.rotate = z.r ? z.r.toFixed(1) + 'deg' : '';
    t.style.translate = (z.y || f) ? '0 ' + (z.y - 9 * f).toFixed(1) + 'px' : '';
    t.style.scale = f ? (1 + .09 * f).toFixed(3) : '';
    t.style.filter = f > .05 ? 'drop-shadow(' + (2 + 4 * f).toFixed(1) + 'px ' + (3 + 6 * f).toFixed(1) + 'px 0 rgba(17,17,17,.8))' : '';
  }

  // Scrollen: Energie aus dem Tempo, Stop-Motion mit etwa 12 Bildern pro Sekunde, klingt ab.
  function bild(jetzt) {
    raf = 0;
    if (jetzt - letztesBild >= 83) {
      letztesBild = jetzt;
      energie *= .72;
      gruppen.forEach(function (g) {
        if (!g.sichtbar && energie >= .04) return;
        for (var i = 0; i < g.teile.length; i++) {
          var wackel = energie < .04 ? 0 : energie * (2.5 + (i % 3) * 1.6);
          g.zucken[i].r = wackel * g.richtung[i] * (Math.random() < .5 ? -1 : 1);
          g.zucken[i].y = energie < .04 ? 0 : -energie * 6 * Math.random();
          anwenden(g, i);
        }
      });
    }
    if (energie >= .04) raf = requestAnimationFrame(bild);
  }
  function antreiben(v) {
    energie = Math.min(1, energie + v * .35);
    if (!raf) raf = requestAnimationFrame(bild);
  }
  window.addEventListener('scroll', function () {
    var jetzt = performance.now();
    var v = Math.abs(window.scrollY - letzteY) / Math.max(1, jetzt - letzteZeit);
    letzteY = window.scrollY; letzteZeit = jetzt;
    // Weiches Scrollen verteilt den Radstoß über viele Bilder: Tempo pro Bild ist kleiner, darum verstärkt
    if (e8.lenis) v = Math.abs(e8.lenis.velocity) / 16.7 * 1.9;
    antreiben(v);
  }, { passive: true });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) { gruppen.forEach(function (g) { if (g.el === e.target) g.sichtbar = e.isIntersecting; }); });
    });
    gruppen.forEach(function (g) { io.observe(g.el); });
  } else {
    gruppen.forEach(function (g) { g.sichtbar = true; });
  }

  // Maus: Schnipsel des Hero-Titels in der Nähe heben sich (nur echte Maus, nur Desktop).
  var heroGruppe = gruppen.filter(function (g) { return g.el === hero; })[0];
  if (heroGruppe && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    var bereich = hero.closest('.hero') || hero;
    var teile = heroGruppe.teile, heben = heroGruppe.heben;
    var mitten = [];
    var mx = -1e4, my = -1e4, mausRaf = 0;
    function messen() {
      mitten = teile.map(function (t) { var q = t.getBoundingClientRect(); return [q.left + q.width / 2, q.top + q.height / 2]; });
    }
    function maus() {
      mausRaf = 0;
      if (!mitten.length) messen();
      for (var i = 0; i < teile.length; i++) {
        var dx = mitten[i][0] - mx, dy = mitten[i][1] - my;
        var f = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / 150);
        f = Math.round(f * 4) / 4; // in Stufen, passend zur Stop-Motion
        if (f !== heben[i]) { heben[i] = f; anwenden(heroGruppe, i); }
      }
    }
    bereich.addEventListener('pointerenter', messen);
    bereich.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      if (!mitten.length) messen();
      mx = e.clientX; my = e.clientY;
      if (!mausRaf) mausRaf = requestAnimationFrame(maus);
    });
    bereich.addEventListener('pointerleave', function () { mx = my = -1e4; maus(); mitten = []; });
    window.addEventListener('scroll', function () { mitten = []; }, { passive: true });
    window.addEventListener('resize', function () { mitten = []; });
  }
})();
