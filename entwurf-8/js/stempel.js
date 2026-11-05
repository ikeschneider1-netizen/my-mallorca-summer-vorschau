// Easter Egg „Stempeln“: Klick auf den Stempel „2027“ klappt unten links ein Stempelkissen auf, der Holzstempel hebt sich
// aus dem Kissen und hängt am Zeiger (von oben gesehen). Jeder Klick auf freie Fläche setzt ein Schlagwort im Stempel-Look.
// Die Tinte kommt aus dem Kissen: der erste Abdruck ist satt und nass, jeder weitere trockener und löchriger, nach drei bis
// vier Abdrücken ist der Gummi trocken und das Kissen wackelt. Klick aufs Kissen: der Stempel tunkt ein und ist wieder voll.
// Knöpfe, Links und Felder bleiben benutzbar. Zweimal dieselbe Stelle gibt einen Doppelschlag, auf einem Galerie-Foto sitzt der
// Abdruck auf dem Abzug. Zwölf Abdrücke sind das Ende, dann wird der Stempel neben das Kissen gelegt, der Deckel klappt zu und
// beides rutscht aus dem Bild. Auch Escape, Klick auf den Stempel und der Knopf „Stempel weglegen“ beenden so.
// Nichts wird gespeichert, kein Ton. Rein dekorativ (aria-hidden). Schlagwörter nur aus content/.
(function () {
  'use strict';
  var stempel = document.querySelectorAll('.stempel');
  if (!stempel.length) return;
  var html = document.documentElement;
  var ruhig = window.matchMedia('(prefers-reduced-motion: reduce)');
  // Zwölf Abdrücke erzählen in fester Reihenfolge den Weg zur Bewerbung, alle Sätze wortgleich aus content/.
  var WORTE = ['Lust auf die Saison 2027?', 'Bereit für Mallorca?', 'Ab 18', 'Werde Promoter', 'Sonnencreme bringst du mit.', 'Zwei Wege, eine Bewerbung.',
    'Jetzt bewerben', 'Per WhatsApp bewerben', 'Deine Bewerbung ist angekommen.', 'Schön, dass du dabei sein willst.', 'Ab dann bist du Teil des Teams.', 'Dein Sommer 2027'];
  var MAX = WORTE.length, NAH = 44;
  var an = false, zeiger = null, weg = null, abdruecke = [], x = -1e4, y = -1e4, naechstes = '';

  function naechstesWort() { return WORTE[Math.min(gesamt, WORTE.length - 1)]; }
  function zufall(a, b) { return a + Math.random() * (b - a); }
  // Holzstempel von oben, hyperrealistisch, nach zehn Jahren Dauergebrauch (Ikes Referenzfoto für Material, Draufsicht wie gewünscht):
  // nachgedunkelte Buche mit welliger Maserung, Spiegeln, Poren, Fasen im Licht von links oben, Schmutz in den Ecken, Griffring,
  // gerundete Ecken (Radius 10) mit weichen Fasenübergängen, Kratzer, Kerben, Trockenrisse, Dellen, Staub,
  // Abplatzer mit rohem Holz an den Rundungen, Leimreste eines alten Etiketts,
  // eingetrocknete Tinte in Schichten (rot, schwarz, magenta) mit dunklerem Rand und entlang der Faser ausgelaufen,
  // Fingerabdrücke in drei Tinten, tintengetränkte Gummikante mit Läufern, Knauf mit abgegriffenem Lack, Stahlstift, Foto-Körnung.
  // Tinte und Fingerabdrücke werden multipliziert, damit sie im Holz sitzen statt darauf.
  // Zeiger 188 × 132 px, Druckmitte (Mitte des Fußes) bei 94/69 px; der Fuß ist 150 × 100 px groß wie der Abdruck.
  function stempelSvg (wort) {
    var z = 4061988; function r() { z = (z * 1103515245 + 12345) % 2147483648; return z / 2147483648; }
    function f(v) { return (+v).toFixed(1); }
    var X0 = 20, Y0 = 20, X1 = 180, Y1 = 126, F = 9, KX = 100, KY = 64, KR = 31, R = 10;
    // abgerundetes Rechteck als Pfad
    function rund(x, y, w, h, q) {
      return 'M' + (x + q) + ' ' + y + ' H' + (x + w - q) + ' A' + q + ' ' + q + ' 0 0 1 ' + (x + w) + ' ' + (y + q) + ' V' + (y + h - q) + ' A' + q + ' ' + q + ' 0 0 1 ' + (x + w - q) + ' ' + (y + h) +
        ' H' + (x + q) + ' A' + q + ' ' + q + ' 0 0 1 ' + x + ' ' + (y + h - q) + ' V' + (y + q) + ' A' + q + ' ' + q + ' 0 0 1 ' + (x + q) + ' ' + y + 'Z';
    }
    // Abplatzer auf der Rundung einer Ecke (sx/sy = Spiegelung: 1 links/oben, -1 rechts/unten)
    function abplatzer(sx, sy, farbe) {
      var ox = sx > 0 ? X0 : X1, oy = sy > 0 ? Y0 : Y1, pts = [[1.6, 4.4], [3.4, 2.4], [4.6, 2], [3.9, 3.3], [3, 3.6], [2.4, 4.8]];
      return '<path d="M' + pts.map(function (q) { return f(ox + sx * q[0]) + ' ' + f(oy + sy * q[1]); }).join(' L') + 'Z"' + (farbe ? ' fill="' + farbe + '"' : '') + '/>';
    }
    var i, s = '';
    // Buchen-Spiegel (kurze, dunkle Strahlen quer zur Faser)
    var spiegel = '';
    for (i = 0; i < 46; i++) {
      var x = X0 + F + r() * (X1 - X0 - 2 * F), y = Y0 + F + r() * (Y1 - Y0 - 2 * F);
      if (Math.hypot(x - KX, y - KY) < KR + 2) continue;
      spiegel += '<ellipse cx="' + f(x) + '" cy="' + f(y) + '" rx="' + f(.5 + r() * 1.9) + '" ry="' + f(.18 + r() * .22) + '" transform="rotate(' + f(-3 + r() * 6) + ' ' + f(x) + ' ' + f(y) + ')"/>';
    }
    // Kratzer (hell = frisch, dunkel = Schmutz drin) und Dellen
    var kratzer = '';
    for (i = 0; i < 42; i++) {
      var sx = X0 + 6 + r() * (X1 - X0 - 12), sy = Y0 + 6 + r() * (Y1 - Y0 - 12);
      if (Math.hypot(sx - KX, sy - KY) < KR + 4) continue;
      var len = 2 + r() * 10, w = (r() - .5) * 1.4;
      kratzer += '<path d="M' + f(sx) + ' ' + f(sy) + ' q' + f(len * .5) + ' ' + f(w * 2) + ' ' + f(len) + ' ' + f(w * 3) + '" stroke="' + (r() < .15 ? 'rgba(255,240,214,.36)' : 'rgba(58,32,12,.48)') + '" stroke-width="' + f(.22 + r() * .38) + '"/>';
    }
    var dellen = '';
    for (i = 0; i < 14; i++) {
      var dx = X0 + 12 + r() * (X1 - X0 - 24), dy = Y0 + 12 + r() * (Y1 - Y0 - 24);
      if (Math.hypot(dx - KX, dy - KY) < KR + 6) continue;
      var dr = 1 + r() * 1.8;
      dellen += '<ellipse cx="' + f(dx) + '" cy="' + f(dy) + '" rx="' + f(dr) + '" ry="' + f(dr * .7) + '" fill="rgba(70,40,15,.24)"/><path d="M' + f(dx - dr) + ' ' + f(dy + dr * .5) + ' q' + f(dr) + ' ' + f(dr * .7) + ' ' + f(dr * 2) + ' 0" stroke="rgba(255,240,215,.32)" stroke-width=".4" fill="none"/>';
    }
    // Zehn Jahre Gebrauch: unregelmäßige Tintenflecken in Schichten (schwarz, rot, magenta)
    function fleck(x0, y0, groesse, farbe, deck) {
      var n = 9 + Math.floor(r() * 5), pts = [];
      for (var j = 0; j < n; j++) { var wk = j / n * Math.PI * 2, rr = groesse * (.55 + r() * .7); pts.push([x0 + Math.cos(wk) * rr * 1.45, y0 + Math.sin(wk) * rr * .66]); }
      var d = 'M' + f(pts[0][0]) + ' ' + f(pts[0][1]);
      for (var j2 = 1; j2 <= n; j2++) { var a2 = pts[j2 % n], m = [(pts[j2 - 1][0] + a2[0]) / 2, (pts[j2 - 1][1] + a2[1]) / 2]; d += ' Q' + f(pts[j2 - 1][0]) + ' ' + f(pts[j2 - 1][1]) + ' ' + f(m[0]) + ' ' + f(m[1]); }
      var faser = '';
      for (var j3 = 0; j3 < 3; j3++) { var fy = y0 + (r() - .5) * groesse * .9, fl = groesse * (1.4 + r() * 1.6); faser += '<path d="M' + f(x0 - fl) + ' ' + f(fy) + ' L' + f(x0 + fl) + ' ' + f(fy + (r() - .5) * .4) + '" stroke="' + farbe + '" stroke-opacity="' + f(deck * .45) + '" stroke-width="' + f(.25 + r() * .3) + '" stroke-dasharray="' + f(fl * .4) + ' ' + f(.6 + r()) + '"/>'; }
      return faser + '<path d="' + d + 'Z" fill="' + farbe + '" fill-opacity="' + f(deck * .6) + '" stroke="' + farbe + '" stroke-opacity="' + f(Math.min(1, deck * 1.15)) + '" stroke-width=".5"/>';
    }
    var SCHWARZ = '#161314', ROT = '#b8161c', MAG = '#a51d52';
    var tinte = '';
    // an den Rändern und Fasen (beim Eintauchen ins Kissen), rund um den Griff (Finger)
    var orte = [[24, 30, 5, SCHWARZ, .55], [30, 112, 7, SCHWARZ, .5], [176, 118, 8, SCHWARZ, .6], [170, 26, 4, SCHWARZ, .45], [58, 121, 6, ROT, .55], [120, 122, 5, ROT, .5], [178, 70, 6, ROT, .48],
                [22, 74, 5, ROT, .45], [96, 22, 4, SCHWARZ, .35], [144, 122, 4, MAG, .5], [26, 52, 3, MAG, .45], [128, 84, 5, SCHWARZ, .28], [70, 92, 4, ROT, .3], [134, 40, 4, ROT, .26], [52, 46, 4, SCHWARZ, .22]];
    var alt = [[46, 56, 14, ROT, .13], [150, 78, 16, SCHWARZ, .1], [74, 110, 12, MAG, .1], [160, 36, 11, ROT, .12], [36, 98, 13, SCHWARZ, .12], [120, 100, 10, ROT, .1]];
    alt.forEach(function (o) { tinte += fleck(o[0], o[1], o[2], o[3], o[4]); });
    orte = orte.concat([[36, 62, 3.2, ROT, .6], [158, 40, 2.6, ROT, .55], [110, 113, 3, SCHWARZ, .55], [168, 96, 2.4, SCHWARZ, .5], [86, 36, 2.2, MAG, .45], [48, 80, 2, SCHWARZ, .45], [166, 58, 3.4, SCHWARZ, .75], [140, 112, 2.6, SCHWARZ, .7], [40, 36, 2.8, SCHWARZ, .65]]);
    orte.forEach(function (o) { tinte += fleck(o[0], o[1], o[2], o[3], o[4]); });
    // Spritzer
    for (i = 0; i < 26; i++) { var farbe = [SCHWARZ, ROT, MAG][Math.floor(r() * 3)]; tinte += '<circle cx="' + f(X0 + 4 + r() * (X1 - X0 - 8)) + '" cy="' + f(Y0 + 4 + r() * (Y1 - Y0 - 8)) + '" r="' + f(.3 + r() * 1.1) + '" fill="' + farbe + '" opacity="' + f(.3 + r() * .4) + '"/>'; }
    // Fingerabdrücke in drei Tinten, teils nur halb
    function abdruckFinger(x0, y0, dreh, farbe, deck, teil) {
      var g = '<g transform="translate(' + x0 + ' ' + y0 + ') rotate(' + dreh + ')' + (teil ? ' scale(1 .6)' : '') + '" opacity="' + deck + '" mask="url(#so-fmaske)" style="mix-blend-mode:multiply">' +
        '<ellipse rx="7.6" ry="9.6" fill="' + farbe + '" opacity=".2" filter="url(#so-wisch)"/>' +
        '<g filter="url(#so-finger)" stroke="' + farbe + '" stroke-width=".34" fill="none">';
      for (var j = 0; j < 13; j++) { var rx = .5 + j * .64, ry = .8 + j * .82; g += '<ellipse cy="' + f(-j * .12) + '" rx="' + f(rx) + '" ry="' + f(ry) + '" stroke-dasharray="' + f(1.2 + r() * 4.5) + ' ' + f(.35 + r() * .9) + '" stroke-dashoffset="' + f(r() * 6) + '"/>'; }
      return g + '</g></g>';
    }
    // Kerben, Trockenrisse, Bleistift
    var kerben = '';
    for (i = 0; i < 4; i++) {
      var gx = X0 + 14 + r() * (X1 - X0 - 28), gy = Y0 + 14 + r() * (Y1 - Y0 - 28);
      if (Math.hypot(gx - KX, gy - KY) < KR + 8) continue;
      var gl = 8 + r() * 12, gw = (r() - .5) * .5;
      kerben += '<path d="M' + f(gx) + ' ' + f(gy) + ' l' + f(gl) + ' ' + f(gl * gw) + '" stroke="rgba(45,25,8,.5)" stroke-width=".7" stroke-linecap="round"/><path d="M' + f(gx) + ' ' + f(gy + .6) + ' l' + f(gl) + ' ' + f(gl * gw) + '" stroke="rgba(255,240,212,.4)" stroke-width=".35" stroke-linecap="round"/>';
    }
    var risse = '<g stroke="rgba(40,22,6,.55)" stroke-width=".45" fill="none">' +
      '<path d="M' + (X0 + 2) + ' 44 q9 .6 17 -.3 q6 -.4 9 .2"/><path d="M' + (X1 - 2) + ' 96 q-8 -.5 -14 .4"/><path d="M' + (X0 + 3) + ' 104 q7 .3 12 -.5"/></g>';
    var bleistift = '<path d="M146 98 q6 -3 11 0 q-4 2 -9 4" stroke="rgba(70,70,78,.4)" stroke-width=".55" fill="none"/><path d="M40 66 l9 -1.4" stroke="rgba(70,70,78,.32)" stroke-width=".5"/>';
    // Staub
    var staub = '';
    for (i = 0; i < 60; i++) staub += '<circle cx="' + f(X0 + r() * (X1 - X0)) + '" cy="' + f(Y0 + r() * (Y1 - Y0)) + '" r="' + f(.15 + r() * .4) + '" fill="' + (r() < .25 ? 'rgba(255,250,240,.3)' : 'rgba(40,25,12,.38)') + '"/>';
    return '<svg viewBox="0 0 200 140" width="188" height="132" aria-hidden="true" focusable="false">' +
    '<defs>' +
      // Langholz von oben: feine Fasern + große Farbwolken + Poren
      '<filter id="so-holz" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">' +
        '<feTurbulence type="fractalNoise" baseFrequency="0.005 0.95" numOctaves="3" seed="21" result="n0"/>' +
        '<feTurbulence type="fractalNoise" baseFrequency="0.02 0.03" numOctaves="1" seed="40" result="welle"/>' +
        '<feDisplacementMap in="n0" in2="welle" scale="9" xChannelSelector="R" yChannelSelector="G" result="n"/>' +
        '<feColorMatrix in="n" type="matrix" values="0 0 0 0 .55  0 0 0 0 .37  0 0 0 0 .19  2.1 0 0 0 -1.12" result="fasern"/>' +
        '<feTurbulence type="fractalNoise" baseFrequency="0.0035 0.16" numOctaves="2" seed="33" result="s0"/>' +
        '<feDisplacementMap in="s0" in2="welle" scale="12" xChannelSelector="G" yChannelSelector="R" result="s"/>' +
        '<feColorMatrix in="s" type="matrix" values="0 0 0 0 .47  0 0 0 0 .3  0 0 0 0 .13  4.6 0 0 0 -2.85" result="spaet"/>' +
        '<feTurbulence type="fractalNoise" baseFrequency="0.015 0.05" numOctaves="2" seed="9" result="w"/>' +
        '<feColorMatrix in="w" type="matrix" values="0 0 0 0 .7  0 0 0 0 .48  0 0 0 0 .24  1.1 0 0 0 -.5" result="wolken"/>' +
        '<feTurbulence type="fractalNoise" baseFrequency="1.6 .5" numOctaves="1" seed="4" result="p"/>' +
        '<feColorMatrix in="p" type="matrix" values="0 0 0 0 .3  0 0 0 0 .18  0 0 0 0 .08  2.4 0 0 0 -1.62" result="poren"/>' +
        '<feMerge result="holz"><feMergeNode in="wolken"/><feMergeNode in="fasern"/><feMergeNode in="spaet"/><feMergeNode in="poren"/></feMerge>' +
        '<feComposite in="holz" in2="SourceGraphic" operator="in" result="m"/>' +
        '<feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="m"/></feMerge>' +
      '</filter>' +
      // Knauf: gedrechselte Ringe (verzerrtes Rauschen), sehr feines Craquelé
      '<filter id="so-lack" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">' +
        '<feTurbulence type="fractalNoise" baseFrequency="0.03 0.12" numOctaves="3" seed="8" result="n"/>' +
        '<feDisplacementMap in="n" in2="n" scale="14" xChannelSelector="G" yChannelSelector="B" result="nb"/>' +
        '<feColorMatrix in="nb" type="matrix" values="0 0 0 0 .4  0 0 0 0 .17  0 0 0 0 .04  3.6 0 0 0 -1.6" result="maser"/>' +
        '<feTurbulence type="turbulence" baseFrequency="1.15 1.3" numOctaves="1" seed="2" result="t"/>' +
        '<feColorMatrix in="t" type="matrix" values="0 0 0 0 .3  0 0 0 0 .14  0 0 0 0 .04  -12 0 0 0 .55" result="risse"/>' +
        '<feMerge result="alles"><feMergeNode in="maser"/><feMergeNode in="risse"/></feMerge>' +
        '<feComposite in="alles" in2="SourceGraphic" operator="in" result="m"/>' +
        '<feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="m"/></feMerge>' +
      '</filter>' +
      '<filter id="so-korn" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="2.2" numOctaves="1" seed="12" result="k"/><feColorMatrix in="k" type="matrix" values="0 0 0 0 .2  0 0 0 0 .14  0 0 0 0 .08  0 0 0 .9 -.32" result="kk"/><feComposite in="kk" in2="SourceGraphic" operator="in"/></filter>' +
      '<linearGradient id="so-licht" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="rgba(255,250,235,.22)"/><stop offset=".45" stop-color="rgba(255,250,235,0)"/><stop offset="1" stop-color="rgba(70,40,12,.2)"/></linearGradient>' +
      '<filter id="so-kante" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".5" seed="17" result="k"/><feDisplacementMap in="SourceGraphic" in2="k" scale="1.6" xChannelSelector="R" yChannelSelector="G"/></filter>' +
      '<filter id="so-finger" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency=".32" numOctaves="2" seed="27" result="k"/><feDisplacementMap in="SourceGraphic" in2="k" scale="1.5" xChannelSelector="R" yChannelSelector="G"/><feGaussianBlur stdDeviation=".14"/></filter>' +
      '<filter id="so-tfleck" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="2" seed="31" result="k"/><feDisplacementMap in="SourceGraphic" in2="k" scale="1.8" xChannelSelector="R" yChannelSelector="G"/><feGaussianBlur stdDeviation=".22"/></filter>' +
      '<radialGradient id="so-fverlauf"><stop offset=".35" stop-color="#fff"/><stop offset=".8" stop-color="#777"/><stop offset="1" stop-color="#000"/></radialGradient>' +
      '<mask id="so-fmaske" maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill="url(#so-fverlauf)"/></mask>' +
      '<filter id="so-kantefein" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".35" seed="17" result="k"/><feDisplacementMap in="SourceGraphic" in2="k" scale=".7" xChannelSelector="R" yChannelSelector="G"/></filter>' +
      '<filter id="so-weich" x="-30%" y="-40%" width="160%" height="180%"><feGaussianBlur stdDeviation="5.5"/></filter>' +
      '<filter id="so-wisch" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation=".8"/></filter>' +
      '<filter id="so-hauch" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation=".35"/></filter>' +
      '<filter id="so-grob" x="-10%" y="-20%" width="120%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="1.2" seed="6" result="k"/><feDisplacementMap in="SourceGraphic" in2="k" scale="1.1" xChannelSelector="R" yChannelSelector="G"/></filter>' +
      '<linearGradient id="so-fo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ecca92"/><stop offset="1" stop-color="#ddb47a"/></linearGradient>' +
      '<linearGradient id="so-fl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e5c088"/><stop offset="1" stop-color="#d0a56c"/></linearGradient>' +
      '<linearGradient id="so-fr" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#b48650"/><stop offset="1" stop-color="#92643a"/></linearGradient>' +
      '<linearGradient id="so-fu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a87a48"/><stop offset="1" stop-color="#835a33"/></linearGradient>' +
      '<linearGradient id="so-deck" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#dcb075"/><stop offset=".55" stop-color="#cd9d60"/><stop offset="1" stop-color="#b98650"/></linearGradient>' +
      '<radialGradient id="so-kugel" cx="34%" cy="30%" r="76%"><stop offset="0" stop-color="#f3c78d"/><stop offset=".28" stop-color="#dd9a55"/><stop offset=".62" stop-color="#b6662d"/><stop offset=".88" stop-color="#743914"/><stop offset="1" stop-color="#5a2b0e"/></radialGradient>' +
      '<radialGradient id="so-griff" cx="50%" cy="50%" r="50%"><stop offset=".5" stop-color="rgba(58,32,10,0)"/><stop offset=".72" stop-color="rgba(58,32,10,.42)"/><stop offset="1" stop-color="rgba(58,32,10,0)"/></radialGradient>' +
      '<radialGradient id="so-patina" cx="45%" cy="42%" r="70%"><stop offset=".35" stop-color="rgba(80,50,22,0)"/><stop offset="1" stop-color="rgba(70,42,16,.38)"/></radialGradient>' +
      '<radialGradient id="so-ecke" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="rgba(55,32,12,.5)"/><stop offset=".6" stop-color="rgba(55,32,12,.2)"/><stop offset="1" stop-color="rgba(55,32,12,0)"/></radialGradient>' +
      '<radialGradient id="so-rund" cx="30%" cy="26%" r="85%"><stop offset=".45" stop-color="rgba(40,15,2,0)"/><stop offset=".85" stop-color="rgba(40,15,2,.32)"/><stop offset="1" stop-color="rgba(40,15,2,.5)"/></radialGradient>' +
      '<linearGradient id="so-kissen" x1="0" x2="1"><stop offset="0" stop-color="rgba(22,19,20,.75)"/><stop offset=".18" stop-color="rgba(184,22,28,.6)"/><stop offset=".33" stop-color="rgba(22,19,20,.25)"/><stop offset=".5" stop-color="rgba(184,22,28,.35)"/><stop offset=".66" stop-color="rgba(22,19,20,.62)"/><stop offset=".82" stop-color="rgba(165,29,82,.5)"/><stop offset="1" stop-color="rgba(22,19,20,.8)"/></linearGradient>' +
      '<radialGradient id="so-stift" cx="34%" cy="30%" r="70%"><stop offset="0" stop-color="#ffffff"/><stop offset=".22" stop-color="#c4c9cf"/><stop offset=".65" stop-color="#5b6066"/><stop offset="1" stop-color="#23262a"/></radialGradient>' +
      '<clipPath id="so-deckclip"><rect x="' + (X0 + F) + '" y="' + (Y0 + F) + '" width="' + (X1 - X0 - 2 * F) + '" height="' + (Y1 - Y0 - 2 * F) + '" rx="2"/></clipPath>' +
      '<mask id="so-fussmaske" maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="140"><g fill="#fff" filter="url(#so-kantefein)"><path d="' + rund(X0, Y0, X1 - X0, Y1 - Y0, R) + '"/><path d="' + rund(X0, Y0 + 9.5, X1 - X0, Y1 - Y0, R) + '"/></g></mask>' +
      // weiche Übergänge der Fasen an den gerundeten Ecken
      '<linearGradient id="so-eol" x1="1" y1="0" x2="0" y2="1"><stop offset=".2" stop-color="#e8c58a"/><stop offset=".8" stop-color="#dcb47a"/></linearGradient>' +
      '<linearGradient id="so-eor" x1="0" y1="0" x2="1" y2="1"><stop offset=".15" stop-color="#e6c086"/><stop offset=".85" stop-color="#a37548"/></linearGradient>' +
      '<linearGradient id="so-eul" x1="0" y1="0" x2="1" y2="1"><stop offset=".15" stop-color="#dab47a"/><stop offset=".85" stop-color="#96693d"/></linearGradient>' +
      '<linearGradient id="so-eur" x1="1" y1="0" x2="0" y2="1"><stop offset=".15" stop-color="#a37548"/><stop offset=".85" stop-color="#8e6239"/></linearGradient>' +
    '</defs>' +
    // Schatten auf dem Papier (Licht von links oben, Stempel schwebt knapp)
    '<rect class="so-schatten" x="' + (X0 + 8) + '" y="' + (Y0 + 12) + '" width="' + (X1 - X0) + '" height="' + (Y1 - Y0 + 8) + '" rx="13" fill="rgba(35,18,4,.45)" filter="url(#so-weich)"/>' +
    '<g class="so-koerper">' +
      '<g mask="url(#so-fussmaske)">' +
      '<rect x="' + X0 + '" y="' + Y0 + '" width="' + (X1 - X0) + '" height="' + (Y1 - Y0 + 10) + '" fill="#b78a55"/>' +
      // Vorderkante (leichte Neigung) mit Gummiplatte und Stempelkissen-Tinte
      '<path d="M' + X0 + ' ' + (Y1 - 2) + ' L' + X1 + ' ' + (Y1 - 2) + ' L' + (X1 - .5) + ' ' + (Y1 + 7) + ' L' + (X0 + .5) + ' ' + (Y1 + 7) + 'Z" fill="#9b7046" filter="url(#so-holz)"/>' +
      '<path d="M' + (X0 + .5) + ' ' + (Y1 + 7) + ' L' + (X1 - .5) + ' ' + (Y1 + 7) + ' L' + (X1 - 1.5) + ' ' + (Y1 + 9.5) + ' L' + (X0 + 1.5) + ' ' + (Y1 + 9.5) + 'Z" fill="#1c1517"/>' +
      '<path d="M' + (X0 + 1) + ' ' + (Y1 + 7.4) + ' L' + (X1 - 1) + ' ' + (Y1 + 7.4) + '" stroke="url(#so-kissen)" stroke-width="1.6" opacity=".55"/>' +
      '<path d="M' + (X0 + 2) + ' ' + (Y1 + 8.6) + ' L' + (X1 - 2) + ' ' + (Y1 + 8.6) + '" stroke="rgba(255,255,255,.12)" stroke-width=".4"/>' +
      '<g style="mix-blend-mode:multiply" filter="url(#so-tfleck)">' +
        '<path d="M' + X0 + ' ' + (Y1 + 3.5) + ' L' + X1 + ' ' + (Y1 + 3.5) + ' L' + X1 + ' ' + (Y1 + 7) + ' L' + X0 + ' ' + (Y1 + 7) + 'Z" fill="url(#so-kissen)" opacity=".8"/>' +
        '<path d="M' + (X0 + 8) + ' ' + (Y1 + 7) + ' q.4 -3 1.6 -5.6 q.6 3 .2 5.6z M' + (X0 + 63) + ' ' + (Y1 + 7) + ' q.3 -2.4 1 -4.2 q.5 2.4 .3 4.2z" fill="' + SCHWARZ + '" opacity=".7"/>' +
        '<path d="M' + (X1 - 22) + ' ' + (Y1 + 7) + ' q.5 -3.4 1.4 -6 q.7 3.4 .2 6z M' + (X0 + 36) + ' ' + (Y1 + 7) + ' q.3 -2 1.2 -3.6 q.3 2 0 3.6z" fill="' + ROT + '" opacity=".7"/>' +
        '<path d="M' + (X1 - 52) + ' ' + (Y1 + 7) + ' q.4 -2.6 1.2 -4.4 q.5 2.6 .1 4.4z" fill="' + MAG + '" opacity=".6"/>' +
      '</g>' +
      // nasse Tinte an der Gummikante (Deckkraft = Tintenstand, setzt js)
    '<g class="so-nass" style="opacity:0"><path d="M' + X0 + ' ' + (Y1 + 3.5) + ' H' + X1 + ' V' + (Y1 + 7) + ' H' + X0 + 'Z" fill="rgba(165,29,82,.62)"/><path d="M' + (X0 + 6) + ' ' + (Y1 + 4.6) + ' H' + (X1 - 10) + '" stroke="rgba(255,235,245,.5)" stroke-width=".7" stroke-dasharray="14 5 30 3 22 6"/><path d="M' + (X0 + 14) + ' ' + (Y1 + 6.6) + ' H' + (X1 - 26) + '" stroke="rgba(255,235,245,.22)" stroke-width=".5"/></g>' +
    // Fasen (Licht von links oben), Kanten minimal unregelmäßig
      '<g filter="url(#so-kante)">' +
      '<path d="M' + X0 + ' ' + Y0 + ' L' + X1 + ' ' + Y0 + ' L' + (X1 - F) + ' ' + (Y0 + F) + ' L' + (X0 + F) + ' ' + (Y0 + F) + 'Z" fill="url(#so-fo)" filter="url(#so-holz)"/>' +
      '<path d="M' + X0 + ' ' + Y0 + ' L' + (X0 + F) + ' ' + (Y0 + F) + ' L' + (X0 + F) + ' ' + (Y1 - F) + ' L' + X0 + ' ' + Y1 + 'Z" fill="url(#so-fl)" filter="url(#so-holz)"/>' +
      '<path d="M' + X1 + ' ' + Y0 + ' L' + X1 + ' ' + Y1 + ' L' + (X1 - F) + ' ' + (Y1 - F) + ' L' + (X1 - F) + ' ' + (Y0 + F) + 'Z" fill="url(#so-fr)" filter="url(#so-holz)"/>' +
      '<path d="M' + X0 + ' ' + Y1 + ' L' + (X0 + F) + ' ' + (Y1 - F) + ' L' + (X1 - F) + ' ' + (Y1 - F) + ' L' + X1 + ' ' + Y1 + 'Z" fill="url(#so-fu)" filter="url(#so-holz)"/>' +
      '<rect x="' + X0 + '" y="' + Y0 + '" width="' + F + '" height="' + F + '" fill="url(#so-eol)" filter="url(#so-holz)"/><rect x="' + (X1 - F) + '" y="' + Y0 + '" width="' + F + '" height="' + F + '" fill="url(#so-eor)" filter="url(#so-holz)"/>' +
      '<rect x="' + X0 + '" y="' + (Y1 - F) + '" width="' + F + '" height="' + F + '" fill="url(#so-eul)" filter="url(#so-holz)"/><rect x="' + (X1 - F) + '" y="' + (Y1 - F) + '" width="' + F + '" height="' + F + '" fill="url(#so-eur)" filter="url(#so-holz)"/>' +
        '<path d="M' + X0 + ' ' + Y0 + ' L' + X1 + ' ' + Y0 + ' L' + X1 + ' ' + Y1 + ' L' + X0 + ' ' + Y1 + 'Z M' + (X0 + F) + ' ' + (Y0 + F) + ' L' + (X0 + F) + ' ' + (Y1 - F) + ' L' + (X1 - F) + ' ' + (Y1 - F) + ' L' + (X1 - F) + ' ' + (Y0 + F) + 'Z" fill="#e6b070" opacity=".35" style="mix-blend-mode:multiply"/>' +
        '<path d="' + rund(X0 + .6, Y0 + .6, X1 - X0 - 1.2, Y1 - Y0 - 1.2, R - .6) + '" fill="none" stroke="' + SCHWARZ + '" stroke-width="1.3" stroke-dasharray="18 6 4 9 30 5 12 14 22 4" opacity=".28" filter="url(#so-tfleck)" style="mix-blend-mode:multiply"/>' +
        '<g filter="url(#so-tfleck)" opacity=".8" style="mix-blend-mode:multiply"><path d="M' + (X0 + 40) + ' ' + (Y1 - 1) + ' q8 -5 18 -1 q-8 3 -18 1z" fill="' + SCHWARZ + '"/><path d="M' + (X1 - 1) + ' ' + (Y0 + 52) + ' q-5 6 -1 14 q3 -6 1 -14z" fill="' + ROT + '"/><path d="M' + (X0 + 1) + ' ' + (Y0 + 30) + ' q5 4 1 10z" fill="' + SCHWARZ + '" opacity=".6"/><path d="M' + (X1 - 30) + ' ' + (Y1 - 1) + ' q6 -4 13 -1 q-6 2 -13 1z" fill="' + MAG + '"/></g>' +
      '</g>' +
      // Deckfläche
      '<g clip-path="url(#so-deckclip)">' +
        '<rect x="' + (X0 + F) + '" y="' + (Y0 + F) + '" width="' + (X1 - X0 - 2 * F) + '" height="' + (Y1 - Y0 - 2 * F) + '" rx="1.5" fill="url(#so-deck)" filter="url(#so-holz)"/>' +
        '<rect x="' + (X0 + F) + '" y="' + (Y0 + F) + '" width="' + (X1 - X0 - 2 * F) + '" height="' + (Y1 - Y0 - 2 * F) + '" fill="url(#so-licht)"/>' +
        '<rect x="' + (X0 + F) + '" y="' + (Y0 + F) + '" width="' + (X1 - X0 - 2 * F) + '" height="' + (Y1 - Y0 - 2 * F) + '" fill="url(#so-patina)"/>' +
        '<rect x="' + (X0 + F) + '" y="' + (Y0 + F) + '" width="' + (X1 - X0 - 2 * F) + '" height="' + (Y1 - Y0 - 2 * F) + '" fill="#eab676" opacity=".42" style="mix-blend-mode:multiply"/>' +
        '<g fill="rgba(105,58,22,.4)">' + spiegel + '</g>' +
        // Schmutz in den Ecken, Griffring um den Knauf
        '<ellipse cx="' + (X0 + F + 2) + '" cy="' + (Y0 + F + 2) + '" rx="13" ry="9" fill="url(#so-ecke)"/><ellipse cx="' + (X1 - F - 3) + '" cy="' + (Y0 + F + 2) + '" rx="16" ry="10" fill="url(#so-ecke)"/>' +
        '<ellipse cx="' + (X0 + F + 3) + '" cy="' + (Y1 - F - 2) + '" rx="17" ry="11" fill="url(#so-ecke)"/><ellipse cx="' + (X1 - F - 4) + '" cy="' + (Y1 - F - 3) + '" rx="20" ry="13" fill="url(#so-ecke)"/>' +
        '<rect x="' + (X0 + F) + '" y="' + (Y0 + F) + '" width="' + (X1 - X0 - 2 * F) + '" height="' + (Y1 - Y0 - 2 * F) + '" fill="none" stroke="rgba(70,40,14,.22)" stroke-width="3" filter="url(#so-wisch)"/>' +
        '<circle cx="' + KX + '" cy="' + (KY + 2) + '" r="' + (KR + 20) + '" fill="url(#so-griff)"/>' +
        risse + '<g filter="url(#so-hauch)">' + kerben + '</g>' + bleistift +
        '<g fill="none" stroke-linecap="round">' + kratzer + '</g><g filter="url(#so-hauch)">' + dellen + '</g>' + staub +
        // Leimreste und Papierfetzen eines älteren Etiketts
        '<g transform="translate(64 97) rotate(2.4)"><rect width="66" height="16" fill="rgba(110,72,30,.2)" filter="url(#so-wisch)"/><path d="M60 0 L66 0 L66 9 L63 7 L61.5 3.5Z M0 12 L4 11 L5.5 16 L0 16Z" fill="rgba(232,214,176,.48)" filter="url(#so-kante)"/></g>' +
        // Etikett mit Miniatur des nächsten Abdrucks (vergilbt, Ecke abgegriffen)
        '<g transform="translate(70 100) rotate(-1.2)">' +
          '<path d="M.8 .9 L60.8 .9 L60.8 13.4 L3.3 13.4 L.8 10.9Z" fill="rgba(60,35,10,.28)" filter="url(#so-hauch)"/>' +
          '<path d="M0 0 L60 0 L60 12.5 L2.5 12.5 L0 10Z" fill="#ead9b0"/>' +
          '<ellipse cx="46" cy="4" rx="9" ry="3.6" fill="rgba(150,105,45,.22)" filter="url(#so-wisch)"/><ellipse cx="8" cy="9" rx="6" ry="3" fill="rgba(90,60,25,.18)" filter="url(#so-wisch)"/>' +
          '<path d="M0 10 L2.5 12.5 L3.4 9.8Z" fill="#c9b385"/>' +
          '<path d="M60 0 L60 4 L56.5 1.8 L57.8 0Z" fill="#d3ad78"/><path d="M57.8 0 L56.5 1.8 L60 4" stroke="rgba(90,60,25,.5)" stroke-width=".35" fill="none"/>' +
          '<rect x="0" y="0" width="60" height="12.5" fill="rgba(110,80,40,.16)"/>' +
          '<rect x="3" y="1.8" width="54" height="8.9" fill="none" stroke="#b5126c" stroke-width=".7" opacity=".72" filter="url(#so-grob)"/>' +
          '<text class="so-wort" x="30" y="8.4" fill="#b5126c" font-family="Anton, sans-serif" font-size="6.3" letter-spacing=".5" text-anchor="middle" opacity=".78" filter="url(#so-grob)">' + wort + '</text>' +
          '<path d="M0 0 L60 0 L60 12.5 L2.5 12.5 L0 10Z" fill="none" stroke="rgba(80,55,25,.35)" stroke-width=".5"/>' +
          abdruckFinger(10, 9, 15, SCHWARZ, .33, true) +
        '</g>' +
        // Tinte: Schichten aus zehn Jahren, Fingerabdrücke in drei Farben, Wischer, Spritzer
        '<g filter="url(#so-tfleck)" style="mix-blend-mode:multiply">' + tinte + '</g>' +
        abdruckFinger(142, 46, 28, MAG, .55) + abdruckFinger(42, 96, -22, SCHWARZ, .5, true) + abdruckFinger(152, 102, 64, ROT, .55) + abdruckFinger(60, 38, -48, ROT, .42, true) + abdruckFinger(124, 30, 80, SCHWARZ, .3, true) +
        '<g fill="#a51d52" filter="url(#so-wisch)" style="mix-blend-mode:multiply">' +
          '<path d="M34 94 q8 -3 14 1 q-6 4 -14 -1z" opacity=".38"/><path d="M152 104 q6 1 9 4 q-6 1 -9 -4z" opacity=".42"/>' +
          '<path d="M44 40 q5 -1 7 1.5 q-4 1.4 -7 -1.5z" opacity=".3"/><circle cx="160" cy="88" r="1.2" opacity=".45"/><circle cx="58" cy="108" r=".9" opacity=".45"/>' +
        '</g>' +
      '</g>' +
      // abgegriffene, abgestoßene Kanten
      '<path d="M' + (X0 + .6) + ' ' + (Y1 - R) + ' V' + (Y0 + R) + ' A' + (R - .6) + ' ' + (R - .6) + ' 0 0 1 ' + (X0 + R) + ' ' + (Y0 + .6) + ' H' + (X1 - R) + '" stroke="rgba(255,243,220,.6)" stroke-width="1.1" fill="none" stroke-dasharray="26 2 14 3 40 1.5 30 2 60" stroke-linecap="round"/>' +
      '<path d="M' + (X0 + F) + ' ' + (Y1 - F) + ' L' + (X0 + F) + ' ' + (Y0 + F) + ' L' + (X1 - F) + ' ' + (Y0 + F) + '" stroke="rgba(120,78,36,.35)" stroke-width=".7" fill="none"/>' +
      '<path d="M' + (X1 - F) + ' ' + (Y0 + F) + ' L' + (X1 - F) + ' ' + (Y1 - F) + ' L' + (X0 + F) + ' ' + (Y1 - F) + '" stroke="rgba(255,240,212,.55)" stroke-width=".7" fill="none"/>' +
      '<path d="M' + (X0 + 3) + ' ' + (Y0 + 3) + ' L' + (X0 + F) + ' ' + (Y0 + F) + ' M' + (X1 - 3) + ' ' + (Y0 + 3) + ' L' + (X1 - F) + ' ' + (Y0 + F) + ' M' + (X0 + 3) + ' ' + (Y1 - 3) + ' L' + (X0 + F) + ' ' + (Y1 - F) + ' M' + (X1 - 3) + ' ' + (Y1 - 3) + ' L' + (X1 - F) + ' ' + (Y1 - F) + '" stroke="rgba(90,55,20,.12)" stroke-width=".6" filter="url(#so-hauch)"/>' +
      '<path d="M' + (X1 - .4) + ' ' + (Y0 + R) + ' V' + (Y1 - R) + ' A' + (R - .4) + ' ' + (R - .4) + ' 0 0 1 ' + (X1 - R) + ' ' + (Y1 - .4) + ' H' + (X0 + R) + '" stroke="rgba(60,32,10,.45)" stroke-width=".8" fill="none"/>' +
      '<g fill="#e2b678" stroke="rgba(70,40,14,.3)" stroke-width=".3" opacity=".85">' +
        abplatzer(1, 1) + abplatzer(-1, 1) + abplatzer(1, -1) + abplatzer(-1, -1, '#c99c62') + '</g>' +
      '<path d="M' + (X0 + 30) + ' ' + Y0 + ' l3 1.6 l3 -1.4 M' + (X1 - 50) + ' ' + Y1 + ' l2.6 -1.8 l3 1.6 M' + X1 + ' ' + (Y0 + 40) + ' l-1.6 2.6 l1.4 2.8" stroke="rgba(60,34,10,.3)" stroke-width=".4" fill="rgba(236,206,155,.75)"/>' +
      '</g>' +
      // Knauf: Kontaktschatten, Kugel, Lack, Glanz, abgegriffene Stelle, Stahlstift
      '<circle cx="' + (KX + 5) + '" cy="' + (KY + 7) + '" r="' + (KR + 2) + '" fill="rgba(40,20,5,.5)" filter="url(#so-weich)"/>' +
      '<circle cx="' + KX + '" cy="' + KY + '" r="' + KR + '" fill="url(#so-kugel)" filter="url(#so-lack)"/>' +
      '<ellipse cx="' + (KX + 2) + '" cy="' + (KY - 1) + '" rx="15" ry="12" fill="rgba(232,190,130,.38)" filter="url(#so-wisch)"/>' +
      abdruckFinger(KX + 12, KY + 8, 40, SCHWARZ, .42, true) +
      '<ellipse cx="' + (KX + 17) + '" cy="' + (KY - 14) + '" rx="2.2" ry="1.4" fill="#e9c08a"/><ellipse cx="' + (KX + 17) + '" cy="' + (KY - 14) + '" rx="2.2" ry="1.4" fill="none" stroke="rgba(60,25,5,.55)" stroke-width=".4"/>' +
      '<ellipse cx="' + (KX + 6) + '" cy="' + (KY + 22) + '" rx="1.6" ry="1" fill="#e2b57c"/>' +
      '<circle cx="' + KX + '" cy="' + KY + '" r="' + KR + '" fill="url(#so-rund)"/>' +
      '<circle cx="' + KX + '" cy="' + KY + '" r="' + KR + '" fill="none" stroke="rgba(55,24,6,.45)" stroke-width="1.2"/>' +
      '<path d="M' + (KX + KR * .45) + ' ' + (KY + KR * .85) + ' a' + KR + ' ' + KR + ' 0 0 0 ' + f(KR * .5) + ' ' + f(-KR * .62) + '" stroke="rgba(255,206,150,.4)" stroke-width="2.2" fill="none"/>' +
      '<ellipse cx="' + (KX - 4) + '" cy="' + (KY - 7) + '" rx="13" ry="9" fill="rgba(240,215,175,.18)" filter="url(#so-hauch)"/>' +
      '<g transform="translate(' + (KX - 15) + ' ' + (KY - 17) + ') rotate(-28) skewX(-12)" opacity=".5" filter="url(#so-hauch)">' +
        '<rect x="-7" y="-5" width="6.2" height="7.6" rx="1.6" fill="rgba(255,252,242,.78)"/><rect x=".6" y="-5" width="6.2" height="7.6" rx="1.6" fill="rgba(255,252,242,.62)"/>' +
        '<rect x="-7" y="3.4" width="6.2" height="4.8" rx="1.4" fill="rgba(255,252,242,.45)"/><rect x=".6" y="3.4" width="6.2" height="4.8" rx="1.4" fill="rgba(255,252,242,.35)"/>' +
      '</g>' +
      '<ellipse cx="' + (KX - 16.5) + '" cy="' + (KY - 18) + '" rx="1.6" ry="1" fill="#fff"/>' +
      '<path d="M' + (KX + 13) + ' ' + (KY + 22) + ' a' + (KR - 4) + ' ' + (KR - 4) + ' 0 0 0 ' + 11 + ' -14" stroke="rgba(255,190,120,.45)" stroke-width="1.6" fill="none" filter="url(#so-hauch)"/>' +
      '<circle cx="' + (KX - KR + 4) + '" cy="' + (KY + 4) + '" r="3.6" fill="rgba(35,15,3,.6)"/>' +
      '<circle cx="' + (KX - KR + 4.3) + '" cy="' + (KY + 3.6) + '" r="2.8" fill="url(#so-stift)"/><circle cx="' + (KX - KR + 3.5) + '" cy="' + (KY + 2.7) + '" r=".75" fill="#fff"/>' +
      '<path d="M' + (KX + 9) + ' ' + (KY + 18) + ' q4 -2 6 -6" stroke="' + ROT + '" stroke-width="1.6" fill="none" opacity=".35" filter="url(#so-wisch)"/>' +
      '<rect x="' + (X0 - 2) + '" y="' + (Y0 - 2) + '" width="' + (X1 - X0 + 4) + '" height="' + (Y1 - Y0 + 13) + '" fill="#000" filter="url(#so-korn)" opacity=".55" mask="url(#so-fussmaske)" style="mix-blend-mode:multiply"/>' +
    '</g></svg>';
  }

  // Abdruck passend zum Fuß: 160 × 106 mit gerundeten Ecken wie der Holzfuß, Doppelrahmen, oben die Marke, unten Ort und Jahr,
  // dazwischen der Satz so groß wie möglich: ein bis drei Zeilen, eingepasst nach den echten Zeichenbreiten von Anton.
  // Lesbar bleibt er auch bei wenig Tinte: Rahmen und Kleintext tragen die volle Abnutzung (#f-tinte) und verblassen zuerst,
  // der Satz bekommt eine sanftere (#f-tinte-wort). Frische Tinte spritzt, beim Doppelschlag kommt eine zweite, versetzte Lage dazu.
  var ANTON = { A: .485, B: .479, C: .474, D: .493, E: .412, F: .399, G: .485, H: .499, I: .227, J: .466, K: .472, L: .397, M: .746, N: .498,
    O: .486, P: .472, Q: .494, R: .477, S: .461, T: .396, U: .474, V: .469, W: .712, X: .484, Y: .446, Z: .41, 'Ä': .485, 'Ö': .486, 'Ü': .474,
    '1': .331, ' ': .234, ',': .236, '.': .229, '?': .492, '!': .229, '-': .311 };
  var SPERR = .03; // Laufweite in em
  function breite(s) { var b = 0; for (var i = 0; i < s.length; i++) b += (ANTON[s[i]] || .494) + SPERR; return b - SPERR; }
  // beste Aufteilung in 1–3 Zeilen: größte Schrift, die in 126 × 50 passt (Luft zum Innenrahmen)
  function satzLayout(gross) {
    var w = gross.split(' '), best = null;
    function pruefe(zeilen) {
      var n = zeilen.length, em = Math.max.apply(null, zeilen.map(breite));
      var fs = Math.min(126 / em, 50 / ((n - 1) * .98 + .86), n === 1 ? 40 : 30);
      if (!best || fs > best.fs + .01) best = { fs: fs, zeilen: zeilen };
    }
    pruefe([gross]);
    for (var i = 1; i < w.length; i++) {
      pruefe([w.slice(0, i).join(' '), w.slice(i).join(' ')]);
      for (var j = i + 1; j < w.length; j++) pruefe([w.slice(0, i).join(' '), w.slice(i, j).join(' '), w.slice(j).join(' ')]);
    }
    return best;
  }
  function abdruckSvg(wort, spritzer, lage2) {
    var gross = wort.toUpperCase(), lay = satzLayout(gross), fs = lay.fs, n = lay.zeilen.length;
    var erste = 54 - (n - 1) * .98 * fs / 2 + .43 * fs, satz = '';
    lay.zeilen.forEach(function (z, i) { satz += '<text x="80" y="' + (erste + i * .98 * fs).toFixed(1) + '">' + z + '</text>'; });
    var sp = '';
    if (spritzer) {
      // frische, satte Tinte spritzt beim Aufschlag ein paar Tropfen neben den Rahmen
      for (var k = 0, m = 3 + Math.floor(Math.random() * 3); k < m; k++) {
        var wk = Math.random() * Math.PI * 2, d = 1 + Math.random() * 7;
        sp += '<circle cx="' + (80 + Math.cos(wk) * (84 + d)).toFixed(1) + '" cy="' + (53 + Math.sin(wk) * (58 + d)).toFixed(1) + '" r="' + (.5 + Math.random() * 1.3).toFixed(1) + '" opacity="' + (.5 + Math.random() * .5).toFixed(2) + '"/>';
      }
      sp = '<g fill="currentColor">' + sp + '</g>';
    }
    return '<svg viewBox="0 0 160 106" width="100%" height="100%" aria-hidden="true" focusable="false"' + (lage2 ? ' class="lage2"' : '') + '>' + sp +
      '<g class="ab-rahmen" filter="url(#f-tinte)">' +
        '<g fill="none" stroke="currentColor"><rect x="4" y="4" width="152" height="98" rx="8" stroke-width="5"/><rect x="11" y="11" width="138" height="84" rx="3.5" stroke-width="1.6"/>' +
        '<path d="M18 27 H142 M18 81 H142" stroke-width="1.2"/></g>' +
        '<g fill="currentColor" font-family="Anton, sans-serif" text-anchor="middle">' +
          '<text x="80" y="22.5" font-size="8.4" letter-spacing="2">MYMALLORCASUMMER</text>' +
          '<text x="80" y="91.5" font-size="8" letter-spacing="1.5">PLAYA DE PALMA · 2027</text>' +
        '</g><g fill="currentColor"><circle cx="17" cy="19" r="1.5"/><circle cx="143" cy="19" r="1.5"/><circle cx="17" cy="88" r="1.5"/><circle cx="143" cy="88" r="1.5"/></g>' +
      '</g>' +
      '<g class="ab-satz" filter="url(#f-tinte-wort)" fill="currentColor" font-family="Anton, sans-serif" text-anchor="middle" font-size="' + fs.toFixed(1) + '" letter-spacing="' + (SPERR * fs).toFixed(2) + '">' + satz + '</g></svg>';
  }
  // Stempelkissen von oben: Blechdose mit aufgeklapptem Deckel (perspektivisch verkürzt, Innenseite sichtbar),
  // magentafarbener Filz, nass glänzend, an den Rändern eingetrocknet, mit Dellen und den Abdrücken früherer Stempelfüße.
  // Der zugeklappte Deckel liegt als zweite Gruppe bereit (sk-deckel-zu) und klappt am Ende zu.
  function kissenSvg() {
    var z = 20270; function r() { z = (z * 1103515245 + 12345) % 2147483648; return z / 2147483648; }
    function f(v) { return (+v).toFixed(1); }
    var i, kratzer = '', deckelKratzer = '', fasern = '', spritzer = '';
    for (i = 0; i < 30; i++) { var kx = 12 + r() * 176, ky = 58 + r() * 84, kl = 3 + r() * 12; kratzer += '<path d="M' + f(kx) + ' ' + f(ky) + ' l' + f(kl) + ' ' + f((r() - .5) * 2.2) + '" stroke="rgba(255,255,255,' + f(.06 + r() * .16) + ')" stroke-width="' + f(.3 + r() * .4) + '"/>'; }
    for (i = 0; i < 18; i++) { var dx = 14 + r() * 172, dy = 16 + r() * 38, dl = 3 + r() * 10; deckelKratzer += '<path d="M' + f(dx) + ' ' + f(dy) + ' l' + f(dl) + ' ' + f((r() - .5) * 1.6) + '" stroke="rgba(255,255,255,' + f(.05 + r() * .12) + ')" stroke-width="' + f(.3 + r() * .35) + '"/>'; }
    for (i = 0; i < 40; i++) { var fx = 18 + r() * 164, fy = 66 + r() * 68; fasern += '<path d="M' + f(fx) + ' ' + f(fy) + ' l' + f(1 + r() * 4) + ' ' + f((r() - .5) * 1.2) + '" stroke="rgba(255,170,210,' + f(.14 + r() * .2) + ')" stroke-width=".4"/>'; }
    for (i = 0; i < 22; i++) { spritzer += '<circle cx="' + f(8 + r() * 184) + '" cy="' + f(14 + r() * 132) + '" r="' + f(.3 + r() * 1.2) + '" fill="rgba(165,29,82,' + f(.3 + r() * .5) + ')"/>'; }
    return '<svg viewBox="0 0 200 150" aria-hidden="true" focusable="false">' +
    '<defs>' +
      '<linearGradient id="sk-innen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6a6a72"/><stop offset=".55" stop-color="#45454c"/><stop offset="1" stop-color="#26262b"/></linearGradient>' +
      '<linearGradient id="sk-blech" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a3a40"/><stop offset=".5" stop-color="#222226"/><stop offset="1" stop-color="#141417"/></linearGradient>' +
      '<linearGradient id="sk-blechzu" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#34343a"/><stop offset=".45" stop-color="#1d1d21"/><stop offset="1" stop-color="#111114"/></linearGradient>' +
      '<radialGradient id="sk-tinte" cx="42%" cy="40%" r="75%"><stop offset="0" stop-color="#a8135f"/><stop offset=".55" stop-color="#7c0d48"/><stop offset="1" stop-color="#480530"/></radialGradient>' +
      '<filter id="sk-weich" x="-20%" y="-30%" width="140%" height="160%"><feGaussianBlur stdDeviation="4"/></filter>' +
      '<filter id="sk-wisch" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="1.1"/></filter>' +
      '<filter id="sk-fein" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation=".35"/></filter>' +
      '<filter id="sk-filzkorn" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9 .5" numOctaves="2" seed="7" result="k"/><feColorMatrix in="k" type="matrix" values="0 0 0 0 .1  0 0 0 0 0  0 0 0 0 .06  0 0 0 .8 -.3" result="kk"/><feComposite in="kk" in2="SourceGraphic" operator="in" result="m"/><feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="m"/></feMerge></filter>' +
      '<filter id="sk-korn" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="2" numOctaves="1" seed="12" result="k"/><feColorMatrix in="k" type="matrix" values="0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  0 0 0 .7 -.26" result="kk"/><feComposite in="kk" in2="SourceGraphic" operator="in"/></filter>' +
    '</defs>' +
    // Schatten der Dose auf dem Papier
    '<rect x="12" y="62" width="184" height="88" rx="8" fill="rgba(30,10,20,.5)" filter="url(#sk-weich)"/>' +
    // aufgeklappter Deckel (Innenseite), am Scharnier bei y 56
    '<g class="sk-deckel-auf">' +
      '<rect x="8" y="14" width="184" height="44" rx="6" fill="url(#sk-innen)"/>' +
      '<rect x="13" y="19" width="174" height="36" rx="3.5" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="1.4"/>' +
      '<rect x="13" y="19" width="174" height="36" rx="3.5" fill="none" stroke="rgba(255,255,255,.14)" stroke-width=".6"/>' +
      '<g filter="url(#sk-wisch)"><ellipse cx="64" cy="38" rx="24" ry="7" fill="rgba(165,29,82,.55)"/><ellipse cx="128" cy="30" rx="14" ry="5" fill="rgba(165,29,82,.4)"/><ellipse cx="150" cy="44" rx="18" ry="5" fill="rgba(120,14,60,.5)"/></g>' +
      '<path d="M84 26 q4 -3 9 -1 q-5 3 -9 1z M40 46 q6 -2 11 1 q-6 2 -11 -1z" fill="rgba(165,29,82,.6)" filter="url(#sk-fein)"/>' +
      deckelKratzer +
      '<path d="M16 15.5 H184" stroke="rgba(255,255,255,.3)" stroke-width=".8"/>' +
      '<rect x="36" y="53" width="128" height="5" rx="2.5" fill="#0f0f12"/><path d="M40 54 H160" stroke="rgba(255,255,255,.18)" stroke-width=".7"/>' +
    '</g>' +
    // Dose
    '<g class="sk-dose">' +
      '<rect x="8" y="56" width="184" height="88" rx="7" fill="url(#sk-blech)"/>' +
      '<path d="M15 57 H185 M9 64 V136" stroke="rgba(255,255,255,.22)" stroke-width="1" filter="url(#sk-fein)"/>' +
      '<path d="M191 64 V136 M15 143 H185" stroke="rgba(0,0,0,.6)" stroke-width="1"/>' +
      kratzer +
      // Emaille abgeplatzt
      '<path d="M22 60 l5 .6 l-1.2 2.4 l-3.6 .4z M176 138 l4 -1.2 l1.4 2.8 l-4.6 .4z M186 70 l1.6 4 l-1.8 1.4 l-1 -3.4z" fill="#8c8c94" stroke="rgba(0,0,0,.5)" stroke-width=".3"/>' +
      // Vertiefung mit Filz
      '<rect x="14" y="62" width="172" height="76" rx="4" fill="#09090b"/>' +
      '<g class="sk-filz">' +
        '<rect x="16" y="64" width="168" height="72" rx="3.5" fill="url(#sk-tinte)" filter="url(#sk-filzkorn)"/>' +
        fasern +
        // alte Fußabdrücke im Filz
        '<rect x="34" y="72" width="120" height="58" rx="7" fill="none" stroke="rgba(0,0,0,.2)" stroke-width="2" transform="rotate(-3 94 101)" filter="url(#sk-wisch)"/>' +
        '<rect x="52" y="70" width="116" height="60" rx="7" fill="none" stroke="rgba(0,0,0,.14)" stroke-width="2" transform="rotate(4 110 100)" filter="url(#sk-wisch)"/>' +
        // Dellen
        '<g filter="url(#sk-wisch)"><ellipse cx="78" cy="112" rx="16" ry="7" fill="rgba(30,0,18,.4)"/><ellipse cx="140" cy="84" rx="12" ry="6" fill="rgba(30,0,18,.32)"/></g>' +
        // eingetrocknete Kruste am Rand, nasser Glanz in der Mitte
        '<rect x="18" y="66" width="164" height="68" rx="3" fill="none" stroke="rgba(226,120,175,.3)" stroke-width="3" filter="url(#sk-wisch)"/>' +
        '<ellipse cx="72" cy="86" rx="42" ry="13" fill="rgba(255,255,255,.14)" filter="url(#sk-weich)"/>' +
        '<ellipse cx="58" cy="80" rx="12" ry="3.4" fill="rgba(255,255,255,.22)" filter="url(#sk-wisch)"/>' +
        '<rect class="sk-delle" x="16" y="64" width="168" height="72" rx="3.5" fill="rgba(20,0,12,.55)" opacity="0"/>' +
      '</g>' +
      '<rect x="14" y="62" width="172" height="76" rx="4" fill="none" stroke="rgba(255,255,255,.1)" stroke-width=".8"/>' +
      // Tinte am Rand der Dose
      '<g filter="url(#sk-wisch)"><ellipse cx="30" cy="140" rx="9" ry="2.6" fill="rgba(165,29,82,.6)"/><ellipse cx="150" cy="59" rx="12" ry="2.4" fill="rgba(165,29,82,.5)"/><ellipse cx="188" cy="100" rx="2.2" ry="9" fill="rgba(165,29,82,.45)"/></g>' +
      spritzer +
      '<rect x="8" y="56" width="184" height="88" rx="7" fill="#000" filter="url(#sk-korn)" opacity=".45" style="mix-blend-mode:multiply"/>' +
    '</g>' +
    // zugeklappter Deckel (Außenseite), klappt am Ende über die Dose
    '<g class="sk-deckel-zu">' +
      '<rect x="7" y="55" width="186" height="90" rx="7" fill="url(#sk-blechzu)"/>' +
      '<path d="M14 56.5 H186" stroke="rgba(255,255,255,.28)" stroke-width="1"/><path d="M8 62 V138" stroke="rgba(255,255,255,.16)" stroke-width="1"/>' +
      '<rect x="18" y="68" width="164" height="64" rx="4" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="1"/>' +
      // abgegriffenes Etikett ohne Schrift, mit Tintenrand und Fingerspuren
      '<g transform="translate(58 84) rotate(-1.5)"><rect width="84" height="30" fill="#e8d7ad"/><rect x="5" y="5" width="74" height="20" rx="2" fill="none" stroke="rgba(165,29,82,.7)" stroke-width="1.4"/><ellipse cx="70" cy="8" rx="12" ry="5" fill="rgba(120,80,30,.25)" filter="url(#sk-wisch)"/><ellipse cx="12" cy="24" rx="8" ry="4" fill="rgba(165,29,82,.3)" filter="url(#sk-wisch)"/><path d="M84 0 L84 6 L79 2.5 Z" fill="#1d1d21"/></g>' +
      '<g filter="url(#sk-wisch)"><ellipse cx="36" cy="128" rx="12" ry="4" fill="rgba(165,29,82,.5)"/><ellipse cx="168" cy="72" rx="8" ry="3" fill="rgba(165,29,82,.45)"/></g>' +
      kratzer.replace(/rgba\(255,255,255,/g, 'rgba(255,255,255,') +
      '<rect x="7" y="55" width="186" height="90" rx="7" fill="#000" filter="url(#sk-korn)" opacity=".45" style="mix-blend-mode:multiply"/>' +
    '</g></svg>';
  }

  var drehung = 0, tinte = 0, gesamt = 0, kissen = null, beschaeftigt = false, timer = [];
  // Ike, 05.11.2026: Die Geschichte spielt nur auf ihrer Bühne (Plakatwand bzw. das Blatt mit dem Stempel), nicht auf der
  // ganzen Seite. Außerhalb ist der Zeiger normal und Klicks wirken normal; wer die Bühne wegscrollt, legt den Stempel weg.
  var buehne = null, wartend = false, letzterTyp = 'mouse', runde = 0;
  function spaeter(fn, ms) { timer.push(setTimeout(fn, ruhig.matches ? 0 : ms)); }
  function drinnen(cx, cy) {
    if (!buehne) return false;
    var r = buehne.getBoundingClientRect();
    return cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom;
  }
  // Kissen und Weglegen-Knopf liegen unten links im sichtbaren Teil der Bühne, nie über anderen Sektionen
  function platzieren() {
    if (!kissen || !buehne) return;
    var r = buehne.getBoundingClientRect(), kb = kissen.offsetWidth, kh = kissen.offsetHeight;
    var links = Math.max(r.left, 0) + 14;
    var oben = Math.max(Math.max(r.top, 0) + 14, Math.min(r.bottom, window.innerHeight) - kh - 14);
    kissen.style.left = links + 'px'; kissen.style.top = oben + 'px'; kissen.style.bottom = 'auto';
    if (weg) { weg.style.left = (links + kb - 22) + 'px'; weg.style.top = (oben - 14) + 'px'; weg.style.bottom = 'auto'; }
  }
  // Ist von der Bühne weniger als 40 % zu sehen, wird der Stempel weggelegt
  function sichtPruefen() {
    if (!an || !buehne) return;
    var r = buehne.getBoundingClientRect();
    var sicht = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
    if (sicht < Math.min(r.height, window.innerHeight) * .4) { ausschalten(); return; }
    platzieren();
    if (zeiger && letzterTyp !== 'touch') zeiger.classList.toggle('draussen', !drinnen(x, y));
  }
  // Stempel trocken: nicht ins Leere drucken, sondern zeigen, wo es Tinte gibt (Kissen hüpft, Kritzel-Pfeil zum Kissen)
  function trocken(cx, cy) {
    if (!kissen) return;
    kissen.classList.remove('leer', 'ruft'); void kissen.offsetWidth; kissen.classList.add('ruft');
    if (zeiger) { zeiger.classList.remove('trocken'); void zeiger.offsetWidth; zeiger.classList.add('trocken'); }
    var m = kissenMitte(), dx = m[0] - cx, dy = m[1] - cy, l = Math.hypot(dx, dy);
    if (l < 140) return;
    var ex = m[0] - dx / l * 92, ey = m[1] - dy / l * 72;           // Pfeil endet kurz vor dem Kissen
    var sx = cx + dx / l * 70, sy = cy + dy / l * 50;                 // und beginnt neben dem Stempel
    var qx = (sx + ex) / 2 - dy / l * 50, qy = (sy + ey) / 2 + dx / l * 50; // leicht gebogen wie von Hand
    var a = Math.atan2(ey - qy, ex - qx), sp = 16;
    var k1 = (ex - Math.cos(a - .5) * sp).toFixed(1) + ' ' + (ey - Math.sin(a - .5) * sp).toFixed(1);
    var k2 = (ex - Math.cos(a + .5) * sp).toFixed(1) + ' ' + (ey - Math.sin(a + .5) * sp).toFixed(1);
    var p = document.createElement('div');
    p.className = 'stempel-pfeil'; p.setAttribute('aria-hidden', 'true');
    p.innerHTML = '<svg width="100%" height="100%"><path pathLength="1" d="M' + sx.toFixed(1) + ' ' + sy.toFixed(1) + ' Q' + qx.toFixed(1) + ' ' + qy.toFixed(1) + ' ' + ex.toFixed(1) + ' ' + ey.toFixed(1) + '"/>' +
      '<path pathLength="1" class="spitze" d="M' + k1 + ' L' + ex.toFixed(1) + ' ' + ey.toFixed(1) + ' L' + k2 + '"/></svg>';
    document.body.appendChild(p);
    setTimeout(function () { p.classList.add('weg'); setTimeout(function () { p.remove(); }, 400); }, 1300);
  }
  // Mitte des Filzes im Kissen (Bildschirmkoordinaten)
  function kissenMitte() { var k = kissen.getBoundingClientRect(); return [k.left + k.width * .5, k.top + k.height * (100 / 150)]; }
  function stellen(cx, cy) { if (zeiger) zeiger.style.transform = 'translate(' + (cx - 94) + 'px,' + (cy - 69) + 'px) rotate(' + drehung.toFixed(1) + 'deg)'; }
  function flug(cx, cy, dauer, danach) {
    if (!zeiger) return;
    zeiger.classList.add('fliegt'); void zeiger.offsetWidth; stellen(cx, cy);
    spaeter(function () { if (zeiger) zeiger.classList.remove('fliegt'); if (danach) danach(); }, dauer);
  }
  // Nasse Tinte an der Gummikante zeigt den Tintenstand
  function nassStand() { var n = zeiger && zeiger.querySelector('.so-nass'); if (n) n.style.opacity = Math.max(0, tinte).toFixed(2); }

  // Anfang: Kissen klappt auf, der Stempel hebt sich aus dem Kissen und fliegt an den Zeiger
  function einschalten(quelle, cx, cy) {
    an = true; tinte = 1; gesamt = 0; beschaeftigt = false; wartend = false; runde++;
    buehne = (quelle && quelle.closest && (quelle.closest('.plakatwand') || quelle.closest('section, .form-blatt'))) || document.body;
    buehne.classList.add('stempel-buehne');
    html.classList.add('stempelt');
    kissen = document.createElement('div');
    kissen.className = 'stempel-kissen';
    kissen.setAttribute('aria-hidden', 'true');
    kissen.innerHTML = kissenSvg();
    document.body.appendChild(kissen);
    zeiger = document.createElement('div');
    zeiger.className = 'stempel-zeiger';
    zeiger.setAttribute('aria-hidden', 'true');
    naechstes = naechstesWort();
    drehung = zufall(-7, 7);
    zeiger.innerHTML = stempelSvg(naechstes.toUpperCase());
    document.body.appendChild(zeiger);
    etikett(); nassStand();
    weg = document.createElement('button');
    weg.type = 'button'; weg.className = 'stempel-weg'; weg.setAttribute('aria-label', 'Stempel weglegen');
    weg.textContent = '✕';
    weg.addEventListener('click', ausschalten);
    document.body.appendChild(weg);
    platzieren();
    if (cx == null && quelle) { var q = quelle.getBoundingClientRect(); cx = q.left + q.width / 2; cy = q.top + q.height / 2; }
    x = cx; y = cy;
    if (ruhig.matches) { stellen(x, y); return; }
    var m = kissenMitte(); stellen(m[0], m[1]);
    zeiger.classList.add('tunkt');
    spaeter(function () { flug(x, y, 520); }, 320);
  }
  // Ende: der Stempel wird neben das Kissen gelegt, der Deckel klappt zu, beides rutscht aus dem Bild
  function ausschalten() {
    if (!an) return;
    an = false; beschaeftigt = false; wartend = false;
    if (buehne) { buehne.classList.remove('stempel-buehne'); buehne = null; }
    html.classList.remove('stempelt');
    timer.forEach(clearTimeout); timer = [];
    if (weg) { weg.remove(); weg = null; }
    var z = zeiger, k = kissen; zeiger = null; kissen = null;
    if (!z) { if (k) k.remove(); return; }
    if (ruhig.matches || !k) { z.remove(); if (k) k.remove(); return; }
    var r = k.getBoundingClientRect();
    z.classList.add('fliegt'); void z.offsetWidth;
    z.style.transform = 'translate(' + (r.right + 92 - 94) + 'px,' + (r.top + r.height * .64 - 69) + 'px) rotate(' + (drehung * .3 - 4).toFixed(1) + 'deg)';
    setTimeout(function () {
      z.classList.remove('fliegt'); z.classList.add('landet'); k.classList.add('zu');
      setTimeout(function () {
        z.classList.add('weg'); k.classList.add('weg');
        setTimeout(function () { z.remove(); k.remove(); }, 560);
      }, 980);
    }, 480);
  }
  // Eintunken: Stempel fliegt ins Kissen, drückt den Filz ein, nimmt Tinte auf und kommt zurück
  function eintunken() {
    if (!zeiger || !kissen || beschaeftigt) return;
    beschaeftigt = true;
    var m = kissenMitte();
    flug(m[0], m[1], 420, function () {
      if (!zeiger) return;
      zeiger.classList.remove('tunkt'); void zeiger.offsetWidth; zeiger.classList.add('tunkt');
      kissen.classList.remove('gedrueckt', 'leer'); void kissen.offsetWidth; kissen.classList.add('gedrueckt');
      tinte = 1; nassStand();
      if (navigator.vibrate) navigator.vibrate(14);
      spaeter(function () {
        flug(x, y, 480, function () {
          beschaeftigt = false;
          // Wer während des Eintunkens geklickt hat, bekommt den Abdruck jetzt (früher ging der Klick still verloren)
          if (wartend) { wartend = false; setzen(x, y, document.elementFromPoint(x, y)); }
        });
      }, 320);
    });
  }
  function etikett() {
    var t = zeiger && zeiger.querySelector('.so-wort'); if (!t) return;
    t.textContent = naechstes.toUpperCase();
    var lang = naechstes.length > 12;
    t.setAttribute('font-size', lang ? '4' : '6.3'); t.setAttribute('letter-spacing', lang ? '.1' : '.5');
    if (naechstes.length > 22) { t.setAttribute('textLength', '52'); t.setAttribute('lengthAdjust', 'spacingAndGlyphs'); } else { t.removeAttribute('textLength'); t.removeAttribute('lengthAdjust'); }
  }
  function bewegen(cx, cy) {
    x = cx; y = cy;
    if (zeiger) zeiger.classList.toggle('draussen', letzterTyp !== 'touch' && !drinnen(cx, cy));
    if (!beschaeftigt) stellen(cx, cy);
  }

  function setzen(cx, cy, ziel) {
    if (gesamt >= MAX) return;
    if (beschaeftigt) { wartend = true; return; }
    if (tinte <= .05 && kissen) { trocken(cx, cy); return; }
    // Auf Bildern (Plakat, Fotos) verschwindet Magenta im Multiplizieren: dort satter und normal gedruckt, damit der Satz lesbar bleibt
    var aufBild = !!(ziel && ziel.closest && ziel.closest('img, picture, video, .riss-haelfte, .plakat'));
    // Galerie-Foto: Abdruck sitzt auf dem Abzug (bleibt mit dem Foto zusammen)
    var rahmen = ziel && ziel.closest && ziel.closest('.ht-card__frame');
    var eltern = rahmen || document.body;
    var px = cx, py = cy;
    if (rahmen) { var r = rahmen.getBoundingClientRect(); px = cx - r.left; py = cy - r.top; }
    else { px = cx + window.scrollX; py = cy + window.scrollY; }
    // Wie viel Tinte ist noch am Gummi? Jeder Abdruck nimmt etwas mit.
    // Der letzte Satz („Dein Sommer 2027“) ist der Schlusspunkt: immer satt, mit Nachdruck.
    var letzter = gesamt + 1 === MAX;
    var kraft = letzter ? Math.max(tinte, .9) : tinte;
    tinte = Math.max(0, tinte - zufall(.22, .32)); nassStand();
    if (tinte < .2 && kissen) { kissen.classList.remove('leer'); void kissen.offsetWidth; kissen.classList.add('leer'); }
    // Zweimal dieselbe Stelle: Doppelschlag, zweite Lage leicht versetzt
    for (var i = abdruecke.length - 1; i >= 0; i--) {
      var a = abdruecke[i];
      // nur Abdrücke dieser Runde: wer neu anfängt, soll neben alten Abdrücken nicht hängen bleiben
      if (a.runde === runde && a.eltern === eltern && Math.hypot(a.x - px, a.y - py) < NAH) {
        if (!a.doppelt) { a.doppelt = true; a.el.insertAdjacentHTML('beforeend', abdruckSvg(a.wort, false, true)); }
        a.el.style.setProperty('--lage2', (.3 + .5 * kraft).toFixed(2));
        a.el.style.setProperty('--tinte', Math.min(1, parseFloat(a.el.style.getPropertyValue('--tinte')) + .3 * kraft).toFixed(2));
        a.el.classList.remove('satt'); void a.el.offsetWidth; a.el.classList.add('satt');
        return;
      }
    }
    var el = document.createElement('span');
    el.className = 'abdruck' + (kraft > .6 ? ' nass' : '') + (letzter ? ' letzter-satz' : '') + (aufBild ? ' auf-bild' : '');
    el.setAttribute('aria-hidden', 'true');
    var wort = naechstes || naechstesWort();
    el.setAttribute('data-wort', wort);
    el.innerHTML = abdruckSvg(wort, kraft > .6);
    // Die Hand greift beim nächsten Mal minimal anders
    drehung = Math.max(-9, Math.min(9, drehung + zufall(-4, 4)));
    bewegen(x, y);
    // Der Abdruck steht so, wie der Stempel gerade gehalten wird (plus ein Hauch Verrutschen)
    el.style.setProperty('--dreh', (drehung + zufall(-1.5, 1.5)).toFixed(1) + 'deg');
    // satt und voll bei frischer Tinte, blass und löchrig bei trockenem Gummi
    // wenig Tinte: das Ganze wird blasser und eine Seite schwächer, der Rahmen verblasst stärker, der Satz bleibt lesbar
    el.style.setProperty('--tinte', (aufBild ? Math.max(.94, .64 + .36 * kraft) : (.64 + .36 * kraft) * zufall(.94, 1)).toFixed(2));
    el.style.setProperty('--fs', Math.round(32 + 38 * kraft + zufall(-6, 6)) + '%');
    el.style.setProperty('--fe', (aufBild ? Math.max(.82, .5 + .35 * kraft) : .5 + .35 * kraft).toFixed(2));
    el.style.setProperty('--rahmen', (.5 + .5 * kraft).toFixed(2));
    el.style.setProperty('--groesse', '1');
    el.style.setProperty('--sx', Math.round(zufall(0, 100)) + '%');
    el.style.setProperty('--sy', Math.round(zufall(0, 100)) + '%');
    // schief aufgesetzt: eine Seite drückt schwächer
    el.style.setProperty('--fw', Math.round(zufall(0, 360)) + 'deg');
    el.style.left = px + 'px'; el.style.top = py + 'px';
    eltern.appendChild(el);
    abdruecke.push({ el: el, eltern: eltern, x: px, y: py, wort: wort, runde: runde });
    gesamt++; naechstes = naechstesWort(); etikett();
    if (navigator.vibrate) navigator.vibrate(letzter ? [14, 50, 22] : kraft > .6 ? 10 : 5);
    if (!ruhig.matches) {
      var blatt = (ziel && ziel.closest && ziel.closest('.ht-card, .karte, .plakat-riss, .form-blatt, section, .plakatwand, footer')) || null;
      var beben = letzter ? 'bebt-stark' : 'bebt';
      if (blatt) { blatt.classList.remove('bebt', 'bebt-stark'); void blatt.offsetWidth; blatt.classList.add(beben); }
      if (zeiger) { zeiger.classList.remove('drueckt'); void zeiger.offsetWidth; zeiger.classList.add('drueckt'); }
    }
    // Am Handy gibt es keinen Mauszeiger, der weiterzieht: der Stempel hebt sich nach dem Abdruck zur Seite, sonst verdeckt er ihn
    if (letzterTyp === 'touch' && zeiger && gesamt < MAX) {
      var ax = Math.min(window.innerWidth - 60, cx + 96), ay = Math.max(70, cy - 96);
      spaeter(function () { if (!beschaeftigt) flug(ax, ay, 260); }, 260);
    }
    while (abdruecke.length > MAX) {
      var alt = abdruecke.shift();
      alt.el.classList.add('verblasst');
      setTimeout(function (e) { e.remove(); }.bind(null, alt.el), 700);
    }
    // Der zwölfte Abdruck ist der letzte: kurz wirken lassen, dann wird der Stempel weggelegt
    if (gesamt >= MAX) spaeter(ausschalten, 1300);
  }

  document.addEventListener('click', function (e) {
    var st = e.target.closest && e.target.closest('.stempel');
    if (st) { if (an) ausschalten(); else einschalten(st, e.clientX, e.clientY); return; }
    if (!an) return;
    if (e.target.closest && e.target.closest('.stempel-kissen')) { e.preventDefault(); eintunken(); return; }
    // Außerhalb der Bühne ist alles wie immer
    if (!drinnen(e.clientX, e.clientY)) return;
    // Bedienelemente bleiben Bedienelemente
    if (e.target.closest('a, button, input, select, textarea, label, summary, video, .menue, .kopf')) return;
    e.preventDefault();
    setzen(e.clientX, e.clientY, e.target);
  });
  document.addEventListener('pointermove', function (e) { if (!an) return; letzterTyp = e.pointerType; if (e.pointerType !== 'touch') bewegen(e.clientX, e.clientY); }, { passive: true });
  document.addEventListener('pointerdown', function (e) { if (!an) return; letzterTyp = e.pointerType; if (e.pointerType === 'touch' && drinnen(e.clientX, e.clientY)) bewegen(e.clientX, e.clientY); }, { passive: true });
  document.addEventListener('keydown', function (e) { if (an && e.key === 'Escape') ausschalten(); });
  var sichtRaf = 0;
  function sichtBald() { if (an && !sichtRaf) sichtRaf = requestAnimationFrame(function () { sichtRaf = 0; sichtPruefen(); }); }
  window.addEventListener('scroll', sichtBald, { passive: true });
  window.addEventListener('resize', sichtBald);

  // Man soll die Geschichte finden: Ist die Plakatwand fertig (bzw. der Stempel ganz im Bild), wackelt „2027“ einmal kurz.
  var lockStempel = document.querySelector('.plakat-riss .stempel') || stempel[0], gelockt = false, lockRaf = 0, lockVersuche = 0;
  function locken() {
    lockRaf = 0;
    if (gelockt || an || !lockStempel || ruhig.matches) return;
    var e8 = window.__e8 || {}, r = lockStempel.getBoundingClientRect();
    if (!(r.width > 0 && r.top >= 0 && r.bottom <= window.innerHeight)) return;
    if (e8.plakatZu && window.scrollY < e8.plakatZu() - 4) return;
    // Am Ende angekommen, aber „2027“ wird gerade erst eingeblendet (Sprung statt Scrollen): gleich noch einmal nachsehen
    if (parseFloat(getComputedStyle(lockStempel).opacity) < .5) { if (lockVersuche++ < 10) setTimeout(locken, 250); return; }
    gelockt = true;
    setTimeout(function () {
      if (an) return;
      lockStempel.classList.add('lockt');
      setTimeout(function () { lockStempel.classList.remove('lockt'); }, 1000);
    }, 350);
  }
  window.addEventListener('scroll', function () { if (!gelockt && !lockRaf) lockRaf = requestAnimationFrame(locken); }, { passive: true });
  setTimeout(locken, 1500);
})();
