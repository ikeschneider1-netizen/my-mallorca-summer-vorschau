/*! Halftone-Galerie mit Zackenschere – My Mallorca Summer
 *  Kein Framework, kein Build. Einbinden: <script src="galerie.js" defer></script>
 *  API:  const g = initHalftoneGallery(rootElementOderSelektor, optionen?)
 *  Auto: jedes Element mit [data-ht-gallery] wird beim Laden automatisch initialisiert.
 *  Optionen (JS-Objekt oder data-Attribute am Root):
 *    duration  data-ht-duration   Schnittdauer in s          (1.1)
 *    fps       data-ht-fps        Stop-Motion-Bildrate       (12; 0 = fließend)
 *    part      data-ht-part       Auseinanderklappen in s    (0.7)
 *    direction data-ht-direction  ltr | rtl | ttb | btt | auto (auto)
 *              auto = pro Karte abwechselnd nach data-ht-sequence (Standard "ttb ltr rtl")
 *              Einzelne Karte: data-ht-direction an der .ht-card überschreibt alles.
 *    fadeBack  data-ht-fade-back  Zurückblenden in s         (0.25)
 *    edgeZig   data-ht-edge-zig   Zackenschere-Rand am Foto  (true)
 */
(function (global) {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  // Zackenschere (aus dem Motion-Clip): Klingen .ht-bl1/.ht-bl2 klappen um den Drehpunkt (52|30)
  var SCISSOR =
    '<svg viewBox="0 0 100 60" width="100%" height="100%" overflow="visible" focusable="false">' +
    '<g class="ht-bl1"><circle cx="13" cy="13" r="10" stroke="#111111" stroke-width="6" fill="#ffc20e"/>' +
    '<path d="M21 18 L99 36 L93 41 L19 25Z" fill="#111111" stroke="#fff4df" stroke-width="2.2" stroke-linejoin="miter"/></g>' +
    '<g class="ht-bl2"><circle cx="13" cy="47" r="10" stroke="#111111" stroke-width="6" fill="#ffc20e"/>' +
    '<path d="M21 42 L99 24 L93 19 L19 35Z" fill="#111111" stroke="#fff4df" stroke-width="2.2" stroke-linejoin="miter"/></g>' +
    '<circle cx="52" cy="30" r="3" fill="#ffffff"/></svg>';
  var PIVOT = [0.52, 0.5]; // Drehpunkt relativ zur Scheren-Box

  function num(v, d) { v = parseFloat(v); return isFinite(v) ? v : d; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function zigPolygon(w, h, t, a) { // Zackenrand rundum (wie zig() im Entwurf)
    var P = [], n = Math.max(2, Math.round(w / t)), m = Math.max(2, Math.round(h / t)), i;
    for (i = 0; i <= n; i++) P.push([i * w / n, i % 2 ? a : 0]);
    for (i = 1; i < m; i++) P.push([w - (i % 2 ? a : 0), i * h / m]);
    for (i = n; i >= 0; i--) P.push([i * w / n, h - (i % 2 ? a : 0)]);
    for (i = m - 1; i > 0; i--) P.push([i % 2 ? a : 0, i * h / m]);
    return 'polygon(' + P.map(function (p) { return p[0].toFixed(1) + 'px ' + p[1].toFixed(1) + 'px'; }).join(',') + ')';
  }

  function initHalftoneGallery(root, opts) {
    if (typeof root === 'string') root = document.querySelector(root);
    if (!root) return null;
    if (root.__htGallery) return root.__htGallery;
    opts = opts || {};
    var ds = root.dataset;
    var o = {
      duration: num(ds.htDuration, opts.duration != null ? opts.duration : 1.1),
      fps: num(ds.htFps, opts.fps || 12),
      direction: ds.htDirection || opts.direction || 'auto',
      sequence: (ds.htSequence || opts.sequence || 'ttb ltr rtl').split(/[\s,]+/).filter(Boolean),
      fadeBack: num(ds.htFadeBack, opts.fadeBack != null ? opts.fadeBack : 0.25),
      edgeZig: (ds.htEdgeZig || String(opts.edgeZig != null ? opts.edgeZig : true)) !== 'false',
      part: num(ds.htPart, opts.part != null ? opts.part : 0.7),
      reducedFade: 0.3
    };
    var mqReduce = global.matchMedia('(prefers-reduced-motion: reduce)');
    var mqTouch = global.matchMedia('(hover: none)');
    var manual = false, manualT = 0, raf = 0, io = null;
    function now() { return manual ? manualT : performance.now() / 1000; }

    // Richtung = Winkel der Schnittlinie durch die Mitte (Grad, im Uhrzeigersinn, 0 = von links nach rechts).
    // Ike, 06.11.2026: auch schräg durch einige Fotos (diag, diag-auf, diag-zurueck) oder eine Zahl in Grad.
    var DIRS = { ltr: 0, rtl: 180, ttb: 90, btt: 270, diag: 32, 'diag-auf': -32, 'diag-zurueck': 212 };
    function winkelVon(dir) {
      if (dir && Object.prototype.hasOwnProperty.call(DIRS, dir)) return DIRS[dir];
      var z = parseFloat(dir); return isFinite(z) ? z : null;
    }
    var cards = Array.prototype.map.call(root.querySelectorAll('.ht-card'), function (el, idx) {
      var frame = el.querySelector('.ht-card__frame');
      var ht = el.querySelector('.ht-card__ht');
      // Zwei Halbton-Hälften aus derselben Bilddatei (kein zweiter Download): Die Schere trennt sie in der Mitte,
      // danach klappen sie auseinander. Die Hüllen tragen Schatten und Bewegung, die Bilder den Schnitt.
      var hb = ht.cloneNode(false);
      var wa = document.createElement('span'), wb = document.createElement('span');
      wa.className = wb.className = 'ht-card__half';
      wa.setAttribute('aria-hidden', 'true'); wb.setAttribute('aria-hidden', 'true');
      ht.parentNode.insertBefore(wa, ht);
      wa.appendChild(ht);
      wb.appendChild(hb);
      wa.parentNode.insertBefore(wb, wa.nextSibling);
      wb.style.visibility = 'hidden';
      var sc = document.createElement('span');
      sc.className = 'ht-card__scissor';
      sc.setAttribute('aria-hidden', 'true');
      sc.innerHTML = SCISSOR;
      el.appendChild(sc);
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
      var dir = el.dataset.htDirection;
      if (winkelVon(dir) === null) dir = winkelVon(o.direction) !== null ? o.direction : o.sequence[idx % o.sequence.length];
      if (winkelVon(dir) === null) dir = 'ltr';
      el.dataset.htDir = dir; // aufgelöste Richtung (Hook für CSS/Tests)
      var grad = winkelVon(dir), rad = grad * Math.PI / 180, dx = Math.cos(rad), dy = Math.sin(rad);
      // Der Schatten der Hälften fällt quer zur Schnittlinie in den Spalt
      el.style.setProperty('--ht-sx', (-dy * 4).toFixed(1) + 'px'); el.style.setProperty('--ht-sy', (dx * 4).toFixed(1) + 'px');
      return { dir: dir, grad: grad, dx: dx, dy: dy, nx: -dy, ny: dx, L: 0, C: 0, uIn: 0, uOut: 0, el: el, frame: frame, ht: ht, hb: hb, wa: wa, wb: wb, sc: sc, bl1: sc.querySelector('.ht-bl1'), bl2: sc.querySelector('.ht-bl2'),
               kipp: idx % 2 ? 1 : -1, cutL: 0, tCut: 0,
               phase: 'idle', t0: 0, tc: 0, hover: false, focus: false, pinned: false, done: false, w: 0, h: 0 };
    });

    function measure(c) {
      c.w = c.frame.offsetWidth; c.h = c.frame.offsetHeight;
      if (o.edgeZig && c.w) {
        var t = clamp(c.w / 22, 12, 26);
        c.frame.style.clipPath = zigPolygon(c.w, c.h, t, t * 0.5);
      }
      var s = clamp(Math.min(c.w, c.h) * 0.5, 110, 260);
      c.sc.style.width = s + 'px'; c.sc.style.height = (s * 0.6) + 'px';
      c.scW = s; c.scH = s * 0.6;
      // Ausdehnung des Rahmens längs (L) und quer (C) zur Schnittlinie; Ein- und Austritt der Linie durch die Mitte
      var adx = Math.abs(c.dx), ady = Math.abs(c.dy);
      c.L = adx * c.w + ady * c.h; c.C = ady * c.w + adx * c.h;
      var halb = Math.min(adx > 1e-6 ? c.w / 2 / adx : Infinity, ady > 1e-6 ? c.h / 2 / ady : Infinity);
      c.uIn = c.L / 2 - halb; c.uOut = c.L / 2 + halb; c.cutL = 0;
      // jede Hälfte kippt um ihre eigene Mitte
      var oa = map(c, c.L / 2, c.C / 4), ob = map(c, c.L / 2, c.C * 3 / 4);
      c.wa.style.transformOrigin = oa[0].toFixed(1) + 'px ' + oa[1].toFixed(1) + 'px';
      c.wb.style.transformOrigin = ob[0].toFixed(1) + 'px ' + ob[1].toFixed(1) + 'px';
    }

    // Koordinaten: u = Laufrichtung der Schere, v = quer dazu
    function map(c, u, v) {
      var a = u - c.L / 2, b = v - c.C / 2;
      return [c.w / 2 + a * c.dx + b * c.nx, c.h / 2 + a * c.dy + b * c.ny];
    }

    // Ike, 05.11.2026: Die Schere schneidet den Halbton in der Mitte auf, fließend und etwas langsamer,
    // danach klappen die Hälften auseinander und das echte Foto bleibt.
    // Tempo fast gleichmäßig wie beim echten Schneiden, sanft an- und auslaufend (startet mit knapp halbem Tempo).
    function easeCut(p) { return p - 0.55 * Math.sin(2 * Math.PI * p) / (2 * Math.PI); }
    function easeInOut(q) { return q < 0.5 ? 4 * q * q * q : 1 - Math.pow(-2 * q + 2, 3) / 2; }
    function invert(f, y) { var a = 0, b = 1, m, i; for (i = 0; i < 24; i++) { m = (a + b) / 2; if (f(m) < y) a = m; else b = m; } return (a + b) / 2; }
    function poly(c, P) {
      return 'polygon(' + P.map(function (q) { q = map(c, q[0], q[1]); return q[0].toFixed(1) + 'px ' + q[1].toFixed(1) + 'px'; }).join(',') + ')';
    }
    function ganz(c) { // Halbton ungeschnitten: eine Hälfte deckt alles, die zweite ruht
      c.ht.style.clipPath = ''; c.hb.style.clipPath = '';
      c.wa.style.transform = ''; c.wb.style.transform = '';
      c.wa.style.opacity = ''; c.wb.style.opacity = '';
      c.wa.style.visibility = ''; c.wb.style.visibility = 'hidden';
    }

    function render(c, t) {
      var sc = c.sc;
      if (c.phase === 'idle') { ganz(c); sc.style.visibility = 'hidden'; return false; }
      if (c.phase === 'closed') {
        var q0 = clamp((t - c.tc) / Math.max(o.fadeBack, 0.001), 0, 1);
        ganz(c); c.wa.style.opacity = q0; sc.style.visibility = 'hidden';
        if (q0 >= 1) { c.phase = 'idle'; c.wa.style.opacity = ''; return false; }
        return true;
      }
      // phase open
      var e = Math.max(0, t - c.t0);
      if (c.reduced) {
        var r = clamp(e / o.reducedFade, 0, 1);
        ganz(c); c.wa.style.opacity = 1 - r; sc.style.visibility = 'hidden';
        return r < 1;
      }
      if (o.fps > 0) e = Math.floor(e * o.fps + 1e-6) / o.fps; // nur falls Stop-Motion gewünscht
      var L = c.L, C = c.C, D = o.duration, span = c.uOut - c.uIn;
      var U0 = c.uIn - 0.06 * span, U1 = c.uOut + 0.14 * span; // Schere kommt von außen und läuft aus dem Bild
      var lin = Math.min(1, e / D);
      var pos = U0 + easeCut(lin) * (U1 - U0);
      if (c.cutL !== L) { c.cutL = L; c.tCut = D * invert(easeCut, (c.uOut + 2 - U0) / (U1 - U0)); }
      var q = clamp((e - c.tCut) / o.part, 0, 1);      // Auseinanderklappen, sobald der Schnitt durch ist

      if (pos <= c.uIn) {
        ganz(c);
      } else {
        // Schnittkante der Zackenschere in der Mitte; dahinter öffnet sich ein keilförmiger Spalt
        var mid = C / 2, tooth = clamp(span / 26, 9, 18), half = tooth / 2, amp = tooth * 0.3;
        var maxW = clamp(C * 0.06, 8, 24), slope = 0.2;
        var uEnd = Math.min(pos, L + 2), schneidet = pos < L + 2, k;
        var kante = [[-2, -amp]];
        for (k = 0; k * half < uEnd; k++) kante.push([k * half, k % 2 ? amp : -amp]);
        var kk = Math.floor(uEnd / half), z0 = kk % 2 ? amp : -amp;
        kante.push([uEnd, z0 - 2 * z0 * (uEnd / half - kk)]);
        var spalt = function (u) { return Math.min(maxW, Math.max(0, pos - u) * slope); };
        // Hälfte A: oben (bzw. links) und alles, was noch nicht geschnitten ist
        var A = [[-2, -2], [L + 2, -2]];
        if (schneidet) A.push([L + 2, C + 2], [uEnd, C + 2]);
        for (k = kante.length - 1; k >= 0; k--) A.push([kante[k][0], mid + kante[k][1] - spalt(kante[k][0])]);
        // Hälfte B: unten (bzw. rechts), nur hinter der Schere; 1 px Überlappung gegen Haarlinien
        var B = kante.map(function (p) { return [p[0], mid + p[1] + spalt(p[0])]; });
        if (schneidet) B.push([uEnd + 1, mid + kante[kante.length - 1][1]], [uEnd + 1, C + 2]);
        else B.push([L + 2, C + 2]);
        B.push([-2, C + 2]);
        c.ht.style.clipPath = poly(c, A);
        c.hb.style.clipPath = poly(c, B);
        c.wb.style.visibility = '';
        // Auseinanderklappen: beide Hälften gleiten aus dem Rahmen, leicht gekippt, zum Schluss ausgeblendet
        var g = easeInOut(q), d = g * (mid + maxW + 30), w = (g * 5 * c.kipp).toFixed(2);
        var tx = c.nx * d, ty = c.ny * d; // quer zur Schnittlinie auseinander
        c.wa.style.transform = q > 0 ? 'translate(' + (-tx).toFixed(1) + 'px,' + (-ty).toFixed(1) + 'px) rotate(' + (-w) + 'deg)' : '';
        c.wb.style.transform = q > 0 ? 'translate(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px) rotate(' + w + 'deg)' : '';
        var op = q > 0.65 ? String(1 - (q - 0.65) / 0.35) : '';
        c.wa.style.opacity = op; c.wb.style.opacity = op;
      }
      // Schere: fließend, die Klingen öffnen und schließen sich mehrmals pro Schnitt
      var show = e < D;
      sc.style.visibility = show ? 'visible' : 'hidden';
      if (show) {
        var snips = clamp(Math.round(span / 70), 4, 9), ph = 2 * Math.PI * snips * lin;
        var pt = map(c, pos, C / 2 + Math.sin(ph) * Math.max(1, C * 0.004));
        var px = c.scW * PIVOT[0], py = c.scH * PIVOT[1];
        sc.style.transformOrigin = px + 'px ' + py + 'px';
        sc.style.transform = 'translate(' + (pt[0] - px).toFixed(1) + 'px,' + (pt[1] - py).toFixed(1) + 'px) rotate(' +
          (c.grad + Math.sin(ph * 0.5) * 2).toFixed(2) + 'deg)';
        var a = (13 * (0.5 + 0.5 * Math.cos(ph))).toFixed(2);
        c.bl1.setAttribute('transform', 'rotate(' + (-a) + ' 52 30)');
        c.bl2.setAttribute('transform', 'rotate(' + a + ' 52 30)');
      }
      if (!show && q >= 1) {
        c.wa.style.visibility = 'hidden'; c.wb.style.visibility = 'hidden';
        if (!c.done) { c.el.classList.remove('schnipp'); void c.el.offsetWidth; c.el.classList.add('schnipp'); }
        c.done = true; return false;
      }
      return true;
    }

    function frame() {
      raf = 0;
      var t = now(), busy = false;
      cards.forEach(function (c) { if (render(c, t)) busy = true; });
      if (busy && !manual) raf = requestAnimationFrame(frame);
    }
    function kick() { if (!manual && !raf) raf = requestAnimationFrame(frame); }

    function open(c, t) {
      if (c.phase === 'open') return;
      if (!c.w) measure(c);
      c.phase = 'open'; c.t0 = t != null ? t : now(); c.done = false;
      c.reduced = mqReduce.matches;
      c.el.classList.add('is-open');
      kick();
    }
    function close(c, t) {
      if (c.phase !== 'open') return;
      c.phase = 'closed'; c.tc = t != null ? t : now();
      c.el.classList.remove('is-open');
      kick();
    }
    function maybeClose(c) { if (!c.pinned && !c.hover && !c.focus && !mqTouch.matches) close(c); }
    // Angeklickt (oder Enter/Leertaste): Foto bleibt offen, auch wenn Maus oder Fokus weggehen
    function pin(c) { if (c.pinned) return; c.pinned = true; c.el.classList.add('is-pinned'); open(c); }

    cards.forEach(function (c) {
      measure(c); render(c, 0);
      // Ike: Maus drüber → Schere schneidet auf → das echte Foto bleibt (kein Zurückfallen ins Halftone)
      c.el.addEventListener('pointerenter', function (ev) { if (ev.pointerType === 'mouse' || ev.pointerType === 'pen') { c.hover = true; pin(c); } });
      c.el.addEventListener('pointerleave', function (ev) { if (ev.pointerType === 'mouse' || ev.pointerType === 'pen') { c.hover = false; maybeClose(c); } });
      c.el.addEventListener('focus', function () { c.focus = true; pin(c); });
      c.el.addEventListener('blur', function () { c.focus = false; maybeClose(c); });
      c.el.addEventListener('click', function () { pin(c); });
      c.el.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') { if (ev.key === ' ') ev.preventDefault(); pin(c); }
      });
    });

    // Ohne Maus (Touch, kein Hover): beim Reinscrollen einmal aufschneiden, wenn ~50 % sichtbar, danach bleibt das echte Foto.
    // Kommen mehrere Karten gleichzeitig ins Bild, schneidet die Schere nacheinander (0,22 s Abstand). Mit Maus: nur beim Drüberfahren.
    function setupTouch() {
      if (io) { io.disconnect(); io = null; }
      if (!mqTouch.matches || !('IntersectionObserver' in global)) return;
      io = new IntersectionObserver(function (entries) {
        var n = 0;
        entries.forEach(function (en) {
          if (en.isIntersecting && en.intersectionRatio >= 0.5) {
            var c = cards.filter(function (x) { return x.el === en.target; })[0];
            if (c && !manual) {
              io.unobserve(en.target);
              if (c.pinned) return;
              setTimeout(function () { pin(c); }, 220 * n++);
            }
          }
        });
      }, { threshold: [0.5] });
      cards.forEach(function (c) { if (c.phase === 'idle') io.observe(c.el); });
    }
    setupTouch();
    if (mqTouch.addEventListener) mqTouch.addEventListener('change', setupTouch);

    var ro = ('ResizeObserver' in global) ? new ResizeObserver(function () { cards.forEach(measure); frame(); }) : null;
    if (ro) cards.forEach(function (c) { ro.observe(c.frame); });

    var api = {
      root: root, cards: cards, options: o,
      open: function (i, t) { open(cards[i], t); },
      close: function (i, t) { cards[i].pinned = false; cards[i].el.classList.remove('is-pinned'); close(cards[i], t); },
      reset: function () { cards.forEach(function (c) { c.phase = 'idle'; c.pinned = false; c.el.classList.remove('is-open', 'is-pinned'); render(c, 0); }); },
      // Aufnahme/Tests: feste Zeitachse statt Echtzeit
      manual: function (on) { manual = !!on; if (manual && io) io.disconnect(); },
      seek: function (t) { manualT = t; frame(); },
      destroy: function () {
        if (io) io.disconnect(); if (ro) ro.disconnect(); if (raf) cancelAnimationFrame(raf);
        cards.forEach(function (c) {
          c.sc.remove(); c.frame.style.clipPath = ''; c.ht.style.clipPath = '';
          c.wa.parentNode.insertBefore(c.ht, c.wa); c.wa.remove(); c.wb.remove();
        });
        delete root.__htGallery;
      }
    };
    root.__htGallery = api;
    root.classList.add('ht-ready');
    return api;
  }

  global.initHalftoneGallery = initHalftoneGallery;
  function auto() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-ht-gallery]'), function (r) {
      if (r.dataset.htGallery !== 'manual') initHalftoneGallery(r);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto); else auto();
})(window);
