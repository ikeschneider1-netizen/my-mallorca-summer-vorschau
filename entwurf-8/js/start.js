// Läuft im <head>, bevor etwas gezeichnet wird: markiert „JS da“ und schaltet den Ladeablauf an.
// Ohne JS oder bei reduzierter Bewegung bleibt der Hero sofort im Endzustand.
(function () {
  var html = document.documentElement;
  html.classList.add('js');
  var ruhig = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!ruhig && !/[?&]ruhe\b/.test(location.search)) {
    html.classList.add('intro');
    // Sicherung: Nach 2,2 s ist der Ablauf in jedem Fall vorbei, die Klasse geht weg.
    // ?halt (nur für Prüf-Screenshots) lässt die Klasse stehen, damit sich jeder Zeitpunkt einzeln ansehen lässt.
    if (!/[?&]halt\b/.test(location.search)) setTimeout(function () { html.classList.remove('intro'); }, 2200);
  }
})();
