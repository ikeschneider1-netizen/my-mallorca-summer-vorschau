// Entwurf 8 – Bedienung ohne Bibliothek: Menü, Navigation, Sticky-Knopf, Clip, Stempel, kleine Gimmicks.
// GSAP wird erst nach dem Laden nachgeladen (js/scroll.js). Fällt hier etwas aus, bleibt die Seite vollständig lesbar.
(function () {
  'use strict';
  var html = document.documentElement;
  // Basisordner der Seite (für die 404-Seite), aus der eigenen Skript-Adresse: funktioniert auf Unterseiten und unter /entwurf-8/
  var basis = ((document.currentScript && document.currentScript.src) || '').replace(/js\/seite\.js.*$/, '');
  var ruhig = window.matchMedia('(prefers-reduced-motion: reduce)');
  var desktop = window.matchMedia('(min-width: 1024px)');
  var handy = window.matchMedia('(max-width: 767px)');
  var hatIO = 'IntersectionObserver' in window;
  window.__e8 = window.__e8 || {};

  // ---------- Menü ----------
  var knopf = document.querySelector('.menue-knopf');
  var menue = document.getElementById('menue');
  var zuletzt = null;
  // Menü als Zettel am Tape (Ike, 05.11.2026): Die Seite bleibt sichtbar. Zu geht es über den Knopf, Escape,
  // Klick daneben, Weiterscrollen oder die Wahl eines Kapitels; die Zettel fliegen dann hoch (0,3 s, ohne Bewegung sofort).
  var offen = false, offenBei = 0, zuTimer = 0;
  function fokussierbar() {
    return [knopf].concat(Array.prototype.slice.call(menue.querySelectorAll('a[href], button:not([disabled])')));
  }
  function oeffnen() {
    clearTimeout(zuTimer);
    offen = true;
    offenBei = window.scrollY;
    zuletzt = document.activeElement;
    menue.classList.remove('zu');
    menue.inert = false;
    menue.hidden = false;
    knopf.setAttribute('aria-expanded', 'true');
    html.classList.add('menue-offen');
    if (!ruhig.matches) { menue.classList.remove('auf'); void menue.offsetWidth; menue.classList.add('auf'); }
    var erstes = menue.querySelector('a');
    if (erstes) erstes.focus({ preventScroll: true });
    zeigeSticky();
  }
  function schliessen(zurueck) {
    if (!offen) return;
    offen = false;
    menue.classList.remove('auf');
    knopf.setAttribute('aria-expanded', 'false');
    html.classList.remove('menue-offen');
    if (zurueck !== false) knopf.focus();
    zeigeSticky();
    if (ruhig.matches) { menue.hidden = true; return; }
    menue.inert = true; // während die Zettel hochfliegen, ist nichts mehr bedienbar
    menue.classList.add('zu');
    zuTimer = setTimeout(function () { menue.hidden = true; menue.inert = false; menue.classList.remove('zu'); }, 300);
  }
  if (knopf && menue) {
    knopf.addEventListener('click', function () {
      if (!offen) oeffnen(); else schliessen();
    });
    // Klick oder Tippen neben die Zettel schließt; der Klick selbst wirkt normal weiter (Link, Knopf, Text markieren).
    document.addEventListener('pointerdown', function (e) {
      if (offen && !menue.contains(e.target) && !knopf.contains(e.target)) schliessen(false);
    });
    // Wer weiterscrollt, will lesen: ab 140 px Abstand zur Stelle, an der das Menü aufging, fliegen die Zettel hoch.
    window.addEventListener('scroll', function () {
      if (offen && Math.abs(window.scrollY - offenBei) > 140) schliessen(false);
    }, { passive: true });
    document.addEventListener('keydown', function (e) {
      if (!offen) return;
      if (e.key === 'Escape') { e.preventDefault(); schliessen(); return; }
      if (e.key !== 'Tab') return;
      var liste = fokussierbar();
      var i = liste.indexOf(document.activeElement);
      if (e.shiftKey && (i <= 0)) { e.preventDefault(); liste[liste.length - 1].focus(); }
      else if (!e.shiftKey && i === liste.length - 1) { e.preventDefault(); liste[0].focus(); }
      else if (i === -1) { e.preventDefault(); liste[0].focus(); }
    });
    // Klick auf einen Anker im Menü: Menü zu, Sprung ausführen, Fokus nicht zurück auf den Knopf.
    menue.addEventListener('click', function (e) {
      var a = e.target.closest('a');
      if (a && a.getAttribute('href').charAt(0) === '#') schliessen(false);
    });
  }

  // Desktop: Der Menü-Schnipsel erscheint erst, wenn die Kopfleiste aus dem Bild ist.
  var kopf = document.getElementById('kopf');
  if (knopf && kopf && hatIO) {
    new IntersectionObserver(function (e) {
      knopf.classList.toggle('zeigen', !e[0].isIntersecting);
    }).observe(kopf);
  }

  // ---------- Menü-Schnipsel weicht beim Runterscrollen aus (verdeckt sonst Text), beim Hochscrollen kommt er sofort wieder ----------
  if (knopf) {
    var letzteY = window.scrollY;
    window.addEventListener('scroll', function () {
      var y = window.scrollY, dy = y - letzteY;
      if (Math.abs(dy) < 6) return;
      knopf.classList.toggle('versteckt', dy > 0 && y > 160 && !html.classList.contains('menue-offen'));
      letzteY = y;
    }, { passive: true });
    knopf.addEventListener('focus', function () { knopf.classList.remove('versteckt'); });
  }

  // ---------- Noch nicht gebaute Ziele (z. B. #faq, #vorteile): zur 404-Seite „Hier ist nur Sand.“ statt ins Leere ----------
  // Sobald es das Kapitel gibt, greift der normale Sprung von selbst.
  function fehlt(hash) {
    if (!hash || hash.length < 2) return false;
    try { return !document.getElementById(decodeURIComponent(hash.slice(1))); } catch (e) { return false; }
  }
  if (basis) {
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a || !fehlt(a.getAttribute('href'))) return;
      e.preventDefault();
      window.location.href = basis + '404.html';
    });
    if (fehlt(window.location.hash)) window.location.replace(basis + '404.html');
  }

  // ---------- Aktives Kapitel: Gold-Schnipsel in Navigation und Menü ----------
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav a, .menue-liste a'));
  navLinks.forEach(function (a, i) { a.style.setProperty('--rot', ((i * 37) % 7 - 3) * .7 + 'deg'); });
  if (hatIO) {
    var kapitel = ['der-job', 'ablauf'].map(function (id) { return document.getElementById(id); }).filter(Boolean);
    var sichtbar = {};
    var navIO = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) { sichtbar[e.target.id] = e.isIntersecting; });
      var aktiv = null;
      kapitel.forEach(function (k) { if (sichtbar[k.id]) aktiv = k.id; });
      navLinks.forEach(function (a) {
        if (a.getAttribute('href') === '#' + aktiv) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    kapitel.forEach(function (k) { navIO.observe(k); });
  }

  // ---------- Mitlaufender Knopf (Handy, Tablet): nie zwei Grüne gleichzeitig ----------
  // Sichtbar vom Hero bis zum Ende des Sticky-Bereichs (vor dem Ablauf), solange weder der Hero-Knopf noch der Clip
  // im Bild ist und das Menü zu ist. Während des Ladeablaufs bleibt er weg und kommt mit dem Hero-Knopf.
  var sticky = document.querySelector('.sticky-wa');
  var gruenSichtbar = { hero: false, clip: false };
  var heroTeil = 0;
  var bereich = document.querySelector('.sticky-bereich');
  var nachBereich = false;
  function zeigeSticky() {
    if (!sticky) return;
    var weg = gruenSichtbar.hero || gruenSichtbar.clip || nachBereich || html.classList.contains('menue-offen') || html.classList.contains('intro') || html.classList.contains('stempelt');
    sticky.classList.toggle('weg', weg);
    var hk = document.querySelector('.hero-knopf');
    if (hk) hk.classList.toggle('uebergeben', !weg && heroTeil > 0 && window.innerWidth < 1024);
  }
  if (sticky) {
    sticky.classList.add('weg');
    var pruefeBereich = function () {
      var n = bereich ? bereich.getBoundingClientRect().bottom < window.innerHeight * .92 : false;
      if (n !== nachBereich) { nachBereich = n; zeigeSticky(); }
    };
    var bereichTakt = false;
    window.addEventListener('scroll', function () {
      if (bereichTakt) return; bereichTakt = true;
      requestAnimationFrame(function () { bereichTakt = false; pruefeBereich(); });
    }, { passive: true });
    window.addEventListener('resize', pruefeBereich, { passive: true });
    pruefeBereich();
    // Ladeablauf vorbei (start.js nimmt .intro nach spätestens 2,2 s weg)
    if (window.MutationObserver) new MutationObserver(zeigeSticky).observe(html, { attributes: true, attributeFilter: ['class'] });
    setTimeout(zeigeSticky, 1500);
  }
  if (sticky && hatIO) {
    var heroKnopf = document.querySelector('.hero-knopf');
    var clipRahmen = document.querySelector('.clip-rahmen');
    var stickyIO = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        // erst ab 60 % sichtbar zählt der Hero-Knopf: ragt er nur mit der Oberkante ins Bild (360 × 740), hilft der mitlaufende
        if (e.target === heroKnopf) { heroTeil = e.intersectionRatio; gruenSichtbar.hero = e.intersectionRatio >= .6; }
        if (e.target === clipRahmen) gruenSichtbar.clip = e.intersectionRatio > .2;
      });
      zeigeSticky();
    }, { threshold: [0, .01, .2, .5, .6, 1] });
    if (heroKnopf) stickyIO.observe(heroKnopf);
    if (clipRahmen) stickyIO.observe(clipRahmen);
  }

  // ---------- Clip als Loop (Runde B): stumm, läuft, solange er sichtbar ist, harter Schnitt vom Ende an den Anfang ----------
  // Pause-Knopf bleibt (WCAG 2.2.2). Hat jemand selbst pausiert, startet er beim Vorbeiscrollen nicht von allein neu.
  // Bei reduzierter Bewegung startet er nie von selbst.
  var video = document.querySelector('.clip-video');
  var blatt = document.querySelector('.clip-blatt');
  var clipKnopf = document.querySelector('.clip-knopf');
  if (video && blatt && clipKnopf) {
    video.removeAttribute('controls');
    video.loop = true;
    clipKnopf.hidden = false;
    blatt.classList.add('clip-fertig');
    var symbol = clipKnopf.querySelector('use');
    var geladen = false;
    var nutzerPause = false;
    // Ike: etwas langsamer als gerendert (nicht viel). Wird vor jedem Abspielen gesetzt, manche Browser setzen es beim Laden zurück.
    var TEMPO = .85;
    function tempo() { video.defaultPlaybackRate = TEMPO; video.playbackRate = TEMPO; }
    tempo();
    function poster() {
      if (geladen) return;
      geladen = true;
      video.poster = handy.matches ? video.dataset.posterHoch : video.dataset.posterQuer;
    }
    function zustand() {
      var laeuft = !video.paused && !video.ended;
      symbol.setAttribute('href', laeuft ? '#i-pause' : '#i-play');
      clipKnopf.setAttribute('aria-label', laeuft ? 'Video pausieren' : 'Video abspielen');
      // Steht der Clip am Anfang, zeigt er den WhatsApp-Knopf aus dem letzten Bild: dann ist er auch anklickbar.
      blatt.classList.toggle('clip-fertig', !laeuft && video.currentTime === 0);
    }
    function abspielen() {
      // Die ersten 0,5 s sind fast leeres Papier: Der Clip startet gleich mit den Schnipseln.
      if (video.currentTime < .5) video.currentTime = .5;
      tempo();
      var p = video.play();
      if (p && p.catch) p.catch(function () { zustand(); });
    }
    ['play', 'pause', 'loadeddata'].forEach(function (t) { video.addEventListener(t, zustand); });
    // Nach dem Sprung vom Ende an den Anfang die fast leeren ersten 0,5 s überspringen.
    // Das „Kopierer-Flackern“ (8,40–9,65 s) wird nicht mehr übersprungen: Seit 05.11.2026 ist der Clip mit sanfterem
    // Flackern neu gerendert, höchstens 2 Blitze pro Sekunde (WCAG 2.3.1 erlaubt 3).
    function ueberspringen(zeit) {
      if (zeit < .4 && !video.paused) video.currentTime = .5;
    }
    // Bildzähler am Filmstreifen zählt mit (Runde B2); 12 Bilder je Sekunde wie der Clip
    var film = blatt.querySelector('.film-unten');
    var letztesBild = -1;
    function zaehlen(zeit) {
      if (!film) return;
      var n = Math.floor(zeit * 12);
      if (n === letztesBild) return;
      letztesBild = n;
      film.setAttribute('data-bild', n + 'A \u25B8   ' + (n + 1) + ' \u25B8   ' + (n + 1) + 'A \u25B8');
    }
    if ('requestVideoFrameCallback' in video) {
      var bild = function (jetzt, info) { ueberspringen(info.mediaTime); zaehlen(info.mediaTime); video.requestVideoFrameCallback(bild); };
      video.requestVideoFrameCallback(bild);
    } else {
      video.addEventListener('timeupdate', function () { ueberspringen(video.currentTime + .2); zaehlen(video.currentTime); });
    }
    clipKnopf.addEventListener('click', function () {
      if (!video.paused) { nutzerPause = true; video.pause(); }
      else { nutzerPause = false; abspielen(); }
    });
    if (hatIO) {
      new IntersectionObserver(function (e) { if (e[0].isIntersecting) poster(); }, { rootMargin: '900px 0px' }).observe(video);
      new IntersectionObserver(function (e) {
        var drin = e[0].intersectionRatio >= .5;
        if (drin && video.paused && !nutzerPause && !ruhig.matches) abspielen();
        if (!drin && !video.paused) video.pause();
      }, { threshold: [0, .5] }).observe(video);
    } else {
      poster();
    }
    zustand();
  }

  // ---------- Kleine Überraschungen (Runde B2): Klick auf den Stempel stempelt neu, das Blatt bebt ----------
  document.addEventListener('click', function (e) {
    var st = e.target.closest && e.target.closest('.stempel');
    if (!st || ruhig.matches) return;
    var blatt = st.closest('.plakat-riss, .form-blatt') || st.parentNode;
    [st, blatt].forEach(function (el) { el.classList.remove('neu-gestempelt', 'bebt'); void el.offsetWidth; });
    st.classList.add('neu-gestempelt');
    blatt.classList.add('bebt');
  });

  // ---------- Marker-Kritzeleien zeichnen sich, wenn sie ins Bild kommen (Runde B) ----------
  var kritzel = Array.prototype.slice.call(document.querySelectorAll('.kritzel'));
  if (kritzel.length) {
    if (hatIO && !ruhig.matches) {
      var kritzelIO = new IntersectionObserver(function (eintraege) {
        eintraege.forEach(function (e) { if (e.intersectionRatio >= .6) { e.target.classList.add('gezeichnet'); kritzelIO.unobserve(e.target); } });
      }, { threshold: [0, .6] });
      kritzel.forEach(function (k) { kritzelIO.observe(k); });
    } else {
      kritzel.forEach(function (k) { k.classList.add('gezeichnet'); });
    }
  }

  // ---------- Stempel-Feedback auf WhatsApp-Knöpfen (verzögert den Link nie) ----------
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a.knopf');
    if (!a || ruhig.matches) return;
    a.classList.remove('gestempelt');
    void a.offsetWidth;
    a.classList.add('gestempelt');
    setTimeout(function () { a.classList.remove('gestempelt'); }, 320);
  });

  // ---------- Kapitelnummern stempeln sich ein (Idee 1) ----------
  if (hatIO && !ruhig.matches) {
    var nummern = Array.prototype.slice.call(document.querySelectorAll('.kapitelnr')).filter(function (n) {
      return n.getBoundingClientRect().top > window.innerHeight;
    });
    nummern.forEach(function (n) { n.classList.add('nr-bereit'); });
    var nrIO = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.remove('nr-bereit');
        e.target.classList.add('nr-stempel');
        nrIO.unobserve(e.target);
      });
    }, { threshold: .9 });
    nummern.forEach(function (n) { nrIO.observe(n); });
  }

  // ---------- Erpresserbrief-Mischen (Idee 3): große Wörter tauschen kurz Schrift und Farbe ----------
  var SCHRIFTEN = ['f-anton', 'f-abril', 'f-alfa', 'f-bungee', 'f-ultra', 'f-staatliches'];
  var PAARE = [['p-weiss', 'c-schwarz'], ['p-papier', 'c-schwarz'], ['p-schwarz', 'c-weiss'], ['p-schwarz', 'c-gold'],
    ['p-gold', 'c-schwarz'], ['p-aprikose', 'c-schwarz'], ['p-blau', 'c-papier'], ['p-schwarz', 'c-papier']];
  function mischen(wort) {
    if (ruhig.matches || wort.__misch) return;
    wort.__misch = true;
    var teile = Array.prototype.slice.call(wort.querySelectorAll('.rp'));
    var original = teile.map(function (t) { return t.className; });
    var runde = 0;
    function schritt() {
      if (runde === 2) {
        teile.forEach(function (t, i) { t.className = original[i]; });
        setTimeout(function () { wort.__misch = false; }, 900);
        return;
      }
      teile.forEach(function (t, i) {
        var p = PAARE[(i * 3 + runde * 5 + teile.length) % PAARE.length];
        var f = SCHRIFTEN[(i * 5 + runde * 2) % SCHRIFTEN.length];
        var raster = /\bhtw?\b/.exec(original[i]);
        t.className = 'rp ' + p[0] + ' ' + p[1] + ' ' + f + (raster ? ' ' + raster[0] : '');
      });
      runde++;
      setTimeout(schritt, 84);
    }
    schritt();
  }
  Array.prototype.forEach.call(document.querySelectorAll('.rw.xl, .rw.l, .rw.ml'), function (wort) {
    wort.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') mischen(wort); });
    wort.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') mischen(wort); });
  });

  // ---------- Anker merken: Wann wurde zuletzt per Anker gesprungen, hat jemand seitdem selbst gescrollt? ----------
  // scroll.js justiert nach dem Einrichten der Bremspunkte einmal nach (die schieben Ziele nachträglich weg).
  window.__e8.ankerZeit = performance.now();
  window.__e8.selbstGescrollt = false;
  window.addEventListener('hashchange', function () { window.__e8.ankerZeit = performance.now(); window.__e8.selbstGescrollt = false; });
  ['wheel', 'touchmove', 'keydown'].forEach(function (t) { window.addEventListener(t, function () { window.__e8.selbstGescrollt = true; }, { passive: true }); });

  // ---------- GSAP nach dem ersten Bild nachladen ----------
  function laden(src) {
    return new Promise(function (ok, fehler) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = ok;
      s.onerror = fehler;
      document.head.appendChild(s);
    });
  }
  // Weiches Scrollen (Lenis) nur mit Maus/Trackpad und ohne reduzierte Bewegung; Touch scrollt nativ.
  var weich = window.matchMedia('(pointer: fine)').matches && !ruhig.matches;
  function gsapLaden() {
    laden('../vendor/gsap/gsap.min.js')
      .then(function () { return laden('../vendor/gsap/ScrollTrigger.min.js'); })
      .then(function () { return weich ? laden('../vendor/lenis/lenis.min.js').catch(function () {}) : null; })
      .then(function () { return laden('js/scroll.js'); })
      .catch(function () { html.classList.add('ohne-gsap'); });
  }
  function spaeter() {
    if ('requestIdleCallback' in window) requestIdleCallback(gsapLaden, { timeout: 1200 });
    else setTimeout(gsapLaden, 200);
  }
  // Scroll-Szenen gibt es nur auf der Startseite.
  if (document.querySelector('.ablauf')) {
    if (document.readyState === 'complete') spaeter();
    else window.addEventListener('load', spaeter);
  }
})();
