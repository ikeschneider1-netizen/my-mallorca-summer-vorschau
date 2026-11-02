// My Mallorca Summer · Bausteine für alle Seiten nach dem Hero: klappende Wörter, Sonne des Aufklebers, Einblenden beim Scrollen.
// Ohne JavaScript oder bei einem Fehler steht alles sofort und vollständig da.
(() => {
  const root = document.documentElement;
  if (!('IntersectionObserver' in window)) return;
  root.classList.add('js');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  const start = () => {
    try {
      // Der WhatsApp-Link steht nur einmal im Kopf; alle anderen Bewerben-Wege übernehmen ihn.
      const wa = document.querySelector('a.aufkleber[href^="https://wa.me/"]');
      if (wa) document.querySelectorAll('[data-wa]').forEach((a) => { a.href = wa.href; a.target = '_blank'; a.rel = 'noopener noreferrer'; });

      // Jeder Buchstabe hat zwei Seiten: Beim Überfahren klappt die farbige nach vorn (wie im Menü des Heros).
      for (const el of document.querySelectorAll('[data-key]')) {
        const word = el.textContent;
        el.setAttribute('aria-hidden', 'true');
        const link = el.closest('a');
        if (link && !link.getAttribute('aria-label')) link.setAttribute('aria-label', link.textContent.replace(/\s+/g, ' ').trim());
        el.textContent = '';
        [...word].forEach((c, i) => {
          const s = document.createElement('span'); s.className = 'ch'; s.style.setProperty('--i', i);
          for (let n = 0; n < 2; n++) { const f = document.createElement('span'); f.className = 'f'; f.textContent = c; s.append(f); }
          el.append(s);
        });
      }

      // Aufkleber: Sonne mit Strahlen, die sich langsam dreht und beim Überfahren Fahrt aufnimmt.
      const N = 14, R = 58;
      let d = '';
      for (let i = 0; i <= 420; i++) {
        const a = (i / 420) * Math.PI * 2, r = R * (0.83 + 0.17 * Math.pow(0.5 + 0.5 * Math.cos(N * a), 1.5));
        d += `${i ? 'L' : 'M'}${(Math.cos(a) * r).toFixed(2)} ${(Math.sin(a) * r).toFixed(2)}`;
      }
      for (const a of document.querySelectorAll('.aufkleber')) {
        const sonne = a.querySelector('.sonne');
        sonne.querySelector('path').setAttribute('d', `${d}Z`);
        if (reduced.matches || !sonne.animate) continue;
        const spin = sonne.animate([{ rotate: '0deg' }, { rotate: '360deg' }], { duration: 42000, iterations: Infinity });
        a.addEventListener('pointerenter', () => { spin.playbackRate = 6; });
        a.addEventListener('pointerleave', () => { spin.playbackRate = 1; });
      }

      // Titel Wort für Wort: Jedes Wort hüpft einzeln an seinen Platz.
      for (const t of document.querySelectorAll('.titel[data-zeigen]')) {
        const walk = (node) => {
          for (const n of [...node.childNodes]) {
            if (n.nodeType === 3) {
              const frag = document.createDocumentFragment();
              n.textContent.split(/(\s+)/).forEach((part) => {
                if (!part) return;
                if (/^\s+$/.test(part)) { frag.append(part); return; }
                const w = document.createElement('span'); w.className = 'w'; w.textContent = part; frag.append(w);
              });
              n.replaceWith(frag);
            } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
          }
        };
        walk(t);
        t.querySelectorAll('.w').forEach((w, i) => w.style.setProperty('--i', i));
      }

      // Einblenden, sobald ein Teil ins Bild kommt. Einmal, nicht bei jedem Scrollen.
      const io = new IntersectionObserver((entries) => {
        for (const e of entries) if (e.isIntersecting) { e.target.classList.add('da'); io.unobserve(e.target); }
      }, { rootMargin: '0px 0px -10% 0px' });
      document.querySelectorAll('[data-zeigen]').forEach((el) => io.observe(el));
    } catch (err) {
      root.classList.remove('js');
      throw err;
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
