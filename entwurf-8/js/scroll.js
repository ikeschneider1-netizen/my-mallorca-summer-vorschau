// Entwurf 8 – Scroll-Szenen mit GSAP + ScrollTrigger (wird erst nach dem Laden von js/seite.js nachgeladen).
// Riss Hero → Kapitel 01 (an den Scroll gekoppelt) und Ablauf (angeheftet, Karten fliegen ein).
// gsap.matchMedia räumt alles wieder ab, wenn Breite oder Bewegungs-Einstellung wechseln.
(function () {
  'use strict';
  var gsap = window.gsap;
  var ST = window.ScrollTrigger;
  if (!gsap || !ST) return;
  gsap.registerPlugin(ST);
  var html = document.documentElement;
  var e8 = window.__e8 = window.__e8 || {};
  var mm = gsap.matchMedia();

  // ---------- Weiches Scrollen (Runde B): Lenis treibt das Scrollen, ScrollTrigger hört mit ----------
  // Nur wenn seite.js Lenis geladen hat (Maus/Trackpad, keine reduzierte Bewegung). Tastatur und Anker bleiben nativ.
  if (window.Lenis && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var lenis = new window.Lenis({ lerp: 0.11, wheelMultiplier: 0.95, anchors: false, autoRaf: false });
    lenis.on('scroll', ST.update);
    gsap.ticker.add(function (zeit) { lenis.raf(zeit * 1000); });
    gsap.ticker.lagSmoothing(0);
    e8.lenis = lenis;
    // Das Menü hängt als Zettel über der sichtbaren Seite (05.11.2026): Die Seite scrollt weiter, seite.js schließt dann das Menü.
  }
  var STOP = 'steps(5)';

  var oben = document.querySelector('.hero-oben');
  var unten = document.querySelector('.hero-unten');
  var rand = document.querySelector('.riss-rand');
  var ablauf = document.querySelector('.ablauf');
  var karten = gsap.utils.toArray('.karte');
  var chips = gsap.utils.toArray('.chips li');
  var aktion = document.querySelector('.ablauf-aktion');
  var aktionKnopf = aktion && aktion.querySelector('.knopf');
  var aktionTape = aktion && aktion.querySelector('.tape');

  // Vier Karten, vier Auftritte (Ike): wackeln, reindrehen, draufklatschen, hochklappen. Danach klebt das Tape.
  // Während des Flugs ein hoher Schatten, gelandet der harte Druckschatten aus dem CSS (clearProps am Ende).
  var HOCH = 'drop-shadow(16px 22px 0 rgba(17,17,17,.45))', HART = 'drop-shadow(6px 7px 0 rgba(17,17,17,.88))';
  function flug(karte, i) {
    var tape = karte.querySelector('.tape-karte');
    var tl = gsap.timeline({ paused: true });
    if (i === 0) { // fällt von oben und wackelt sich fest
      tl.fromTo(karte, { opacity: 0, y: -150, rotation: -12, filter: HOCH }, { opacity: 1, y: 0, rotation: 0, filter: HART, duration: .3, ease: 'power2.in', immediateRender: false })
        .to(karte, { keyframes: [{ rotation: -6 }, { rotation: 5 }, { rotation: -3 }, { rotation: 1.5 }, { rotation: 0 }], duration: .5, ease: 'steps(5)' });
    } else if (i === 1) { // dreht sich von rechts herein
      tl.fromTo(karte, { opacity: 0, x: 280, rotation: 230, scale: .5, filter: HOCH }, { opacity: 1, x: 0, rotation: 0, scale: 1, filter: HART, duration: .72, ease: 'back.out(1.3)', immediateRender: false });
    } else if (i === 2) { // wird draufgeklatscht wie ein Stempel, das Brett bebt kurz
      tl.fromTo(karte, { opacity: 0, scale: 1.9, rotation: 8, filter: HOCH }, { opacity: 1, scale: 1, rotation: 0, filter: HART, duration: .28, ease: 'steps(4)', immediateRender: false })
        .to(karte, { keyframes: [{ x: -7, y: 3 }, { x: 5, y: -2 }, { x: 0, y: 0 }], duration: .18, ease: 'steps(3)' });
    } else { // klappt von unten hoch: „Ab auf die Insel“
      tl.fromTo(karte, { opacity: 0, rotationX: -95, y: 70, transformPerspective: 700, transformOrigin: '50% 100%', filter: HOCH }, { opacity: 1, rotationX: 0, y: 0, filter: HART, duration: .6, ease: 'back.out(1.7)', immediateRender: false });
    }
    tl.fromTo(tape, { autoAlpha: 0, scale: 1.7 }, { autoAlpha: 1, scale: 1, duration: .12, ease: 'steps(2)', immediateRender: false })
      .set(karte, { clearProps: 'filter' });
    return tl;
  }
  function knopfKlebt() {
    var tl = gsap.timeline({ paused: true });
    tl.fromTo(aktionKnopf, { opacity: 0, rotation: -9, y: -14, scale: 1.08 }, { opacity: 1, rotation: 0, y: 0, scale: 1, duration: .34, ease: 'steps(4)', immediateRender: false })
      .fromTo(aktionTape, { autoAlpha: 0, scale: 1.8 }, { autoAlpha: 1, scale: 1, duration: .14, ease: 'steps(2)', immediateRender: false })
      .add(function () {
        // Klatsch (Idee 5): Das Brett bebt zwei Bilder lang, wenn der Knopf klebt.
        ablauf.classList.remove('klatsch');
        void ablauf.offsetWidth;
        ablauf.classList.add('klatsch');
      });
    return tl;
  }

  // Karten und Knopf sind vor dem Einflug nur durchsichtig (nicht versteckt): Screenreader lesen sie,
  // und springt der Tastaturfokus hinein, stehen sofort alle da.
  function allesDa(fluege, knopf) {
    function zeigen() {
      fluege.forEach(function (f) { f.progress(1); });
      if (knopf) knopf.progress(1);
    }
    ablauf.addEventListener('focusin', zeigen);
    return function () { ablauf.removeEventListener('focusin', zeigen); };
  }

  // ---------- Desktop: Riss und angehefteter Ablauf ----------
  mm.add('(prefers-reduced-motion: no-preference) and (min-width: 1024px) and (min-height: 620px)', function () {
    html.classList.add('riss-aktiv');

    // Papierfetzen (Idee 4): drei kleine Schnipsel lösen sich an der Risskante.
    var fetzen = [0, 1, 2].map(function (n) {
      var f = document.createElement('span');
      f.className = 'fetzen fetzen-' + (n + 1);
      f.setAttribute('aria-hidden', 'true');
      rand.appendChild(f);
      return f;
    });

    var riss = gsap.timeline({
      scrollTrigger: {
        trigger: oben,
        start: 'top top',
        end: function () { return '+=' + unten.offsetHeight; },
        pin: true,
        pinSpacing: false,
        scrub: true,
        invalidateOnRefresh: true,
        toggleClass: { targets: oben, className: 'gepinnt' }
      }
    });
    // Das untere Stück (Text, Knopf, Fakten) reißt ab und fällt weg, bevor es die Kante erreicht:
    // So läuft der Riss nur durch Leerraum und schneidet keinen Text an.
    riss.fromTo(rand, { autoAlpha: 0 }, { autoAlpha: 1, duration: .14, ease: 'steps(3)' }, 0)
      .fromTo(unten, { rotation: 0, y: 0, autoAlpha: 1, transformOrigin: '30% 0%' },
        { rotation: -2.2, y: function () { return unten.offsetHeight * .42; }, autoAlpha: 0, duration: .32, ease: 'steps(4)' }, 0)
      .fromTo(fetzen, { y: 0, rotation: 0, autoAlpha: 1 },
        { y: function (n) { return 120 + n * 70; }, x: function (n) { return [-20, 34, -8][n]; }, rotation: function (n) { return [-70, 110, -160][n]; }, autoAlpha: 0, duration: .7, ease: 'steps(8)', stagger: .1 }, .12);

    e8.rissMitte = function () { var s = riss.scrollTrigger; return s.start + (s.end - s.start) * .55; };
    e8.kapitelZiel = function () { var s = riss.scrollTrigger; return s.end + oben.offsetHeight; };

    // Ablauf (Ike): kein langes Anheften mehr. Kommt das Kapitel ins Bild, fliegen die vier Karten nacheinander
    // von selbst herein, jede auf ihre Art; die Chips zählen mit, zum Schluss klebt der grüne Knopf.
    // Scrollt man zurück darüber, setzt sich die Folge zurück und spielt beim nächsten Mal wieder.
    var fluege = karten.map(flug);
    var knopf = knopfKlebt();
    gsap.set(karten, { opacity: 0 });
    gsap.set(aktionKnopf, { opacity: 0 });
    gsap.set(aktionTape, { autoAlpha: 0 });
    var fokusAus = allesDa(fluege, knopf);
    var TAKT = .45;
    var folge = gsap.timeline({ paused: true });
    fluege.forEach(function (f, i) {
      folge.add(function () { f.restart(); chips.forEach(function (c, j) { c.classList.toggle('an', j === i); }); }, i * TAKT);
    });
    folge.add(function () { knopf.restart(); }, 4 * TAKT + .4);
    function zuruecksetzen() {
      folge.pause(0); fluege.forEach(function (f) { f.pause(0); }); knopf.pause(0);
      chips.forEach(function (c) { c.classList.remove('an'); });
    }
    function sofortDa() {
      fluege.forEach(function (f) { f.progress(1); }); knopf.progress(1);
      chips.forEach(function (c, j) { c.classList.toggle('an', j === 3); });
    }
    // Video-Fragmente (Carson-Probe): laden kurz vor dem Ablauf, werden vom Scrollen Bild für Bild gespult.
    // Kein Autoplay, keine Schleife – ohne Scrollen steht das Bild.
    var fragmente = gsap.utils.toArray('.fragment video');
    // Eigener Name: „stand“ gehört oben der Kartenanzeige (sonst fliegen die Karten beim Zurückscrollen nicht raus)
    var letzteSpulung = 0, spulStand = 0;
    function spulen(fortschritt, sofort) {
      spulStand = fortschritt;
      var jetzt = performance.now();
      if (!sofort && jetzt - letzteSpulung < 83) return;
      letzteSpulung = jetzt;
      fragmente.forEach(function (v) {
        if (v.readyState < 1) return;
        var von = Number(v.dataset.von), bis = Number(v.dataset.bis);
        var t = Math.round((von + (bis - von) * fortschritt) * 12) / 12;
        if (Math.abs(v.currentTime - t) > .04) v.currentTime = t;
      });
    }
    fragmente.forEach(function (v) {
      // Nach dem Laden auf den aktuellen Scrollstand springen (falls man direkt mitten in den Ablauf gesprungen ist)
      v.addEventListener('loadedmetadata', function () { spulen(spulStand, true); });
    });
    // Fragmente im Offset-Halftone wie die Fotos (tools/entwurf-8/halftone-einzel.cjs): Raster 45°, runde Punkte,
    // Fläche wie Tonwert, Lichter bleiben frei. Jedes gespulte Videobild wird neu gerastert, das Video bleibt unsichtbar darunter.
    var raster = fragmente.map(function (v) {
      var feld = v.parentNode;
      var c = document.createElement('canvas');
      c.className = 'fragment-ht';
      c.setAttribute('aria-hidden', 'true');
      feld.appendChild(c);
      feld.classList.add('als-raster');
      var probe = document.createElement('canvas');
      return { v: v, feld: feld, c: c, ctx: c.getContext('2d'), probe: probe, pctx: probe.getContext('2d', { willReadFrequently: true }) };
    });
    var ZELLE = 6, KONTRAST = 1.5, PUNKT = .6, PROBE = 2;
    var UX = ZELLE * Math.SQRT1_2, UY = ZELLE * Math.SQRT1_2;
    function rastern(r) {
      var v = r.v;
      if (v.readyState < 2 || !v.videoWidth) return;
      var W = r.feld.clientWidth, H = r.feld.clientHeight;
      if (!W || !H) return;
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      if (r.c.width !== Math.round(W * dpr) || r.c.height !== Math.round(H * dpr)) {
        r.c.width = Math.round(W * dpr); r.c.height = Math.round(H * dpr);
      }
      // Sichtbarer Ausschnitt genau wie im CSS: object-fit cover + object-position + Zoom (transform: scale) um die Mitte
      var cs = getComputedStyle(v);
      var pos = cs.objectPosition.split(' ').map(function (x) { return parseFloat(x) / 100; });
      var zoom = cs.transform && cs.transform !== 'none' ? parseFloat(cs.transform.split('(')[1]) : 1;
      var s = Math.max(W / v.videoWidth, H / v.videoHeight);
      var ox = (W - v.videoWidth * s) * pos[0], oy = (H - v.videoHeight * s) * pos[1];
      var bw = W / zoom, bh = H / zoom, bx = (W - bw) / 2, by = (H - bh) / 2;
      // Probe: ein gemittelter Wert je 2 px, daraus werden die Rasterpunkte abgetastet
      var pw = Math.ceil(W / PROBE), ph = Math.ceil(H / PROBE);
      r.probe.width = pw; r.probe.height = ph;
      r.pctx.imageSmoothingQuality = 'high';
      r.pctx.drawImage(v, (bx - ox) / s, (by - oy) / s, bw / s, bh / s, 0, 0, pw, ph);
      var d = r.pctx.getImageData(0, 0, pw, ph).data, n = pw * ph, hell = new Float32Array(n), i;
      // Autokontrast je Bild (1 %/99 %), wie normalise() beim Foto
      var hist = new Uint32Array(64);
      for (i = 0; i < n; i++) { var l = (.2126 * d[i * 4] + .7152 * d[i * 4 + 1] + .0722 * d[i * 4 + 2]) / 255; hell[i] = l; hist[Math.min(63, l * 64 | 0)]++; }
      var unten = 0, oben = 63, summe = 0;
      for (i = 0; i < 64; i++) { summe += hist[i]; if (summe >= n * .01) { unten = i; break; } }
      for (summe = 0, i = 63; i >= 0; i--) { summe += hist[i]; if (summe >= n * .01) { oben = i; break; } }
      var lo = unten / 64, spanne = Math.max(.1, (oben + 1) / 64 - lo);
      var ctx = r.ctx;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#111111';
      ctx.beginPath();
      var m = Math.ceil((W + H) / ZELLE) + 2;
      for (var a = -m; a <= m; a++) {
        for (var b = -m; b <= m; b++) {
          var x = W / 2 + a * UX - b * UY, y = H / 2 + a * UY + b * UX;
          if (x < -ZELLE || y < -ZELLE || x > W + ZELLE || y > H + ZELLE) continue;
          var qx = Math.min(pw - 1, Math.max(0, x / PROBE | 0)), qy = Math.min(ph - 1, Math.max(0, y / PROBE | 0));
          var w0 = Math.min(1, Math.max(0, (hell[qy * pw + qx] - lo) / spanne));
          var dunkel = 1 - Math.min(1, Math.max(0, (w0 - .5) * KONTRAST + .5));
          if (dunkel < .06) continue;
          var rad = PUNKT * ZELLE * Math.sqrt(dunkel);
          if (rad < .5) continue;
          ctx.moveTo(x + rad, y);
          ctx.arc(x, y, rad, 0, 6.2832);
        }
      }
      ctx.fill();
    }
    raster.forEach(function (r) {
      ['loadeddata', 'seeked'].forEach(function (t) { r.v.addEventListener(t, function () { rastern(r); }); });
    });
    function allesRastern() { raster.forEach(rastern); }
    window.addEventListener('resize', allesRastern);
    if (fragmente.length) {
      ST.create({ trigger: ablauf, start: 'top bottom+=800', once: true, onEnter: function () {
        fragmente.forEach(function (v) { v.preload = 'auto'; v.load(); });
      } });
    }
    var los = ST.create({ trigger: ablauf, start: 'top 62%', onEnter: function () { folge.restart(); }, onLeaveBack: zuruecksetzen });
    // Lädt die Seite schon unterhalb des Ablaufs (Anker, Zurück-Taste), steht alles sofort da
    if (window.scrollY > los.start + 10) sofortDa();
    // Video-Schnipsel spulen mit dem Scrollen durch das Kapitel (ohne Anheften)
    var spulST = ST.create({ trigger: ablauf, start: 'top bottom', end: 'bottom top', onUpdate: function (st) { spulen(st.progress); } });
    // Für Prüf- und Fotoskripte: Scrollposition im Ablauf (0 = Kapitel oben im Bild, 1 = Ende)
    e8.ablaufBei = function (anteil) { var oben = ablauf.getBoundingClientRect().top + window.scrollY; return oben + Math.max(0, ablauf.offsetHeight - window.innerHeight * .6) * anteil; };

    return function () {
      window.removeEventListener('resize', allesRastern);
      raster.forEach(function (r) { r.c.remove(); r.feld.classList.remove('als-raster'); });
      fokusAus();
      html.classList.remove('riss-aktiv');
      fetzen.forEach(function (f) { f.remove(); });
      chips.forEach(function (c) { c.classList.remove('an'); });
      delete e8.rissMitte; delete e8.kapitelZiel; delete e8.ablaufBei;
    };
  });

  // ---------- Handy und Tablet: kein Anheften, die Karten kleben beim Reinscrollen ----------
  mm.add('(prefers-reduced-motion: no-preference) and (max-width: 1023px)', function () {
    var fluege = karten.map(flug);
    var knopf = null;
    karten.forEach(function (k, i) {
      if (k.getBoundingClientRect().top < window.innerHeight * .85) return;
      gsap.set(k, { opacity: 0 });
      ST.create({ trigger: k, start: 'top 85%', once: true, onEnter: function () { fluege[i].play(); } });
    });
    if (aktionKnopf && aktion.getBoundingClientRect().top > window.innerHeight) {
      knopf = knopfKlebt();
      gsap.set(aktionKnopf, { opacity: 0 });
      gsap.set(aktionTape, { autoAlpha: 0 });
      ST.create({ trigger: aktion, start: 'top 88%', once: true, onEnter: function () { knopf.play(); } });
    }
    return allesDa(fluege, knopf);
  });

  // ---------- Plakatwand SUNSTRUCK: die zerrissenen Hälften finden zusammen ----------
  // Desktop (Runde B, Bremspunkt): Die Plakatwand hält an, während sich die Hälften beim Weiterscrollen schließen;
  // am Ende klatschen Tapes und Stempel drauf, dann geht es weiter. Handy: ohne Anhalten, an den Scroll gekoppelt.
  // Ohne JS und bei reduzierter Bewegung steht das Plakat schon zusammengeklebt da (Endzustand im CSS).
  mm.add({ gross: '(prefers-reduced-motion: no-preference) and (min-width: 1024px) and (min-height: 620px)', klein: '(prefers-reduced-motion: no-preference) and (max-width: 1023px), (prefers-reduced-motion: no-preference) and (max-height: 619px)' }, function (ctx) {
    var wand = document.querySelector('.plakatwand');
    var riss = document.querySelector('.plakat-riss');
    if (!wand || !riss) return;
    var l = riss.querySelector('.riss-l'), r = riss.querySelector('.riss-r');
    var tapes = gsap.utils.toArray(riss.querySelectorAll('.tape'));
    var stempel = riss.querySelector('.stempel');
    var weit = ctx.conditions.gross ? 24 : 16;
    var VON_L = { xPercent: -weit, yPercent: 4, rotation: -9 }, ZU_L = { xPercent: -0.6, yPercent: 0.2, rotation: -0.6 };
    var VON_R = { xPercent: weit, yPercent: -5, rotation: 8 }, ZU_R = { xPercent: 0.6, yPercent: -0.3, rotation: 0.5 };
    gsap.set(tapes, { autoAlpha: 0, scale: 1.5 });
    if (stempel) gsap.set(stempel, { autoAlpha: 0, scale: 2.2 });
    var tl;
    if (ctx.conditions.gross) {
      tl = gsap.timeline({ scrollTrigger: { trigger: wand, start: 'center center', end: '+=75%', pin: true, scrub: 0.7, anticipatePin: 1 } });
      tl.fromTo(l, VON_L, Object.assign({ ease: 'power1.out', duration: .8 }, ZU_L), 0)
        .fromTo(r, VON_R, Object.assign({ ease: 'power1.out', duration: .8 }, ZU_R), 0)
        .to(tapes, { autoAlpha: 1, scale: 1, duration: .08, ease: 'steps(3)', stagger: .04 }, .8)
        .to(stempel, { autoAlpha: .82, scale: 1, duration: .06, ease: 'steps(3)' }, .93)
        .to({}, { duration: .06 });
      e8.plakatZu = function () { return tl.scrollTrigger.end; };
    } else {
      tl = gsap.timeline({ scrollTrigger: { trigger: riss, start: 'top 92%', end: 'center 45%', scrub: 0.8 } });
      tl.fromTo(l, VON_L, Object.assign({ ease: 'power1.out', duration: .85 }, ZU_L), 0)
        .fromTo(r, VON_R, Object.assign({ ease: 'power1.out', duration: .85 }, ZU_R), 0)
        .to(tapes, { autoAlpha: 1, scale: 1, duration: .06, ease: 'steps(3)', stagger: .03 }, .86)
        .to(stempel, { autoAlpha: .82, scale: 1, duration: .05, ease: 'steps(3)' }, .95);
      e8.plakatZu = function () { return tl.scrollTrigger.end; };
    }
    return function () { delete e8.plakatZu; gsap.set([l, r, tapes, stempel], { clearProps: 'all' }); };
  });

  // Anker, die vor dem Laden von GSAP angesprungen wurden (Klick in der ersten Sekunde, Aufruf mit #kontakt):
  // Die Bremspunkte schieben das Ziel nachträglich weg. Einmal nachjustieren, wenn der Sprung frisch ist und niemand selbst scrollt.
  // „Frisch“ zählt ab dem späteren von Sprung und Einrichten der Bremspunkte: Safari kennt kein requestIdleCallback und lädt
  // GSAP erst nach „load“ (bei #kontakt nach 4,7 s), bei langsamem Netz auch Chrome. Sonst käme das Nachjustieren zu spät.
  var bremsenSeit = performance.now();
  function ankerNachjustieren() {
    if (location.hash.length < 2 || e8.selbstGescrollt || performance.now() - Math.max(e8.ankerZeit || 0, bremsenSeit) > 4000) return;
    var ziel; try { ziel = document.getElementById(decodeURIComponent(location.hash.slice(1))); } catch (f) { return; }
    if (!ziel) return;
    var y = Math.round(ziel.getBoundingClientRect().top + window.scrollY);
    if (Math.abs(window.scrollY - y) < 4) return;
    // Lenis hat die Seitenhöhe vor den Bremspunkten gemessen: erst neu messen, sonst begrenzt es auf die alte Länge
    if (e8.lenis) { e8.lenis.resize(); e8.lenis.scrollTo(y, { immediate: true, force: true }); }
    else window.scrollTo(0, y);
  }
  ST.addEventListener('refresh', function () { if (e8.lenis) e8.lenis.resize(); ankerNachjustieren(); });
  requestAnimationFrame(function () { ST.refresh(); });

  // Schriften verändern Höhen: danach einmal neu messen.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ST.refresh(); });
})();
