document.documentElement.classList.add('js');
// Die 3D-Szene kommt nach dem ersten Bild. Im Hochformat steht zuerst das fertige Standbild mit allen Knöpfen, die Szene lädt danach im Hintergrund.
(() => {
  const add = (src, module, done) => {
    const s = document.createElement('script');
    s.src = src;
    if (module) s.type = 'module';
    s.onload = done;
    s.onerror = () => document.documentElement.classList.add('fallback');
    document.head.append(s);
  };
  const start = () => add('../vendor/gsap/gsap.min.js', false, () => add('hero.js', true));
  if (matchMedia('(orientation: portrait)').matches) {
    // Erst wenn das erste Bild wirklich gemalt ist: zwei Bildwechsel abwarten, dann starten.
    addEventListener('load', () => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(start, 150))), { once: true });
  } else if (document.readyState === 'loading') {
    addEventListener('DOMContentLoaded', start, { once: true });
  } else start();
})();
