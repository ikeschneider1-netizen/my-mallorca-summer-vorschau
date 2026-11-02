// My Mallorca Summer · Bausteine für alle Seiten nach dem Hero: klappende Wörter, Sonne des Aufklebers, Einblenden beim Scrollen.
// Ohne JavaScript oder bei einem Fehler steht alles sofort und vollständig da.
(() => {
  const root = document.documentElement;
  if (!('IntersectionObserver' in window)) return;
  // Eigene Klasse, damit der Hero (Klasse js) ungestört bleibt, auch wenn hier etwas schiefgeht.
  root.classList.add('site-js');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  const start = () => {
    try {
      // Der WhatsApp-Link steht nur einmal im Kopf; alle anderen Bewerben-Wege übernehmen ihn.
      const wa = document.querySelector('a.der-aufkleber[href^="https://wa.me/"], a.aufkleber[href^="https://wa.me/"], a.apply[href^="https://wa.me/"]');
      if (wa) document.querySelectorAll('[data-wa]').forEach((a) => { a.href = wa.href; a.target = '_blank'; a.rel = 'noopener noreferrer'; });

      // Jeder Buchstabe hat zwei Seiten: Beim Überfahren klappt die farbige nach vorn (wie im Menü des Heros).
      // Die Klapp-Wörter im Hero baut hero.js selbst.
      for (const el of document.querySelectorAll('[data-key]')) {
        if (el.closest('.hero')) continue;
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
        // Gedreht wird nur die Zeichnung, nicht der Kasten: So ragt die Sonne nie über den Seitenrand hinaus.
        const spin = sonne.querySelector('path').animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: 42000, iterations: Infinity });
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

      seitenkopf();
      faecher();
      const titel = raumTitel();
      spielbaelle(titel);

      // Einblenden, sobald ein Teil ins Bild kommt. Einmal, nicht bei jedem Scrollen.
      const io = new IntersectionObserver((entries) => {
        for (const e of entries) if (e.isIntersecting) { e.target.classList.add('da'); io.unobserve(e.target); }
      }, { rootMargin: '0px 0px -10% 0px' });
      // Die Landung liegt in der Bühne des Heros: Ihr Titel hüpft erst an seinen Platz, wenn der Flug durch den Ring ankommt.
      const landung = [...document.querySelectorAll('[data-landung]')];
      const imFlug = () => root.classList.contains('fly');
      const landen = () => { const da = !imFlug() || root.classList.contains('past'); landung.forEach((el) => el.classList.toggle('da', da)); };
      if (landung.length) { new MutationObserver(landen).observe(root, { attributes: true, attributeFilter: ['class'] }); landen(); }
      document.querySelectorAll('[data-zeigen]').forEach((el) => { if (!el.hasAttribute('data-landung')) io.observe(el); });
    } catch (err) {
      root.classList.remove('site-js');
      throw err;
    }
  };
  // Ein gemeinsamer Takt für Buchstaben und Bälle. Er läuft nur, solange sich etwas bewegt.
  const takt = new Set();
  let tickt = false, zuletzt = 0;
  const laufen = (fn) => {
    takt.add(fn);
    if (tickt) return;
    tickt = true; zuletzt = performance.now();
    requestAnimationFrame(function schritt(t) {
      const dt = Math.min(0.05, (t - zuletzt) / 1000); zuletzt = t;
      for (const f of [...takt]) if (!f(dt)) takt.delete(f);
      if (takt.size) requestAnimationFrame(schritt); else tickt = false;
    });
  };

  // Kopf wie im Hero: Menü als Sonne am Handy, Ausweichen beim Scrollen nach unten, Farbe passend zur Wand darunter.
  function seitenkopf() {
    const kopf = document.querySelector('.seitenkopf');
    if (!kopf) return;
    const knopf = kopf.querySelector('.menue-knopf'), menue = kopf.querySelector('.seitenmenue');
    const zu = (fokus) => { root.classList.remove('menue-offen'); knopf.setAttribute('aria-expanded', 'false'); if (fokus) knopf.focus(); };
    knopf.addEventListener('click', () => {
      const auf = !root.classList.contains('menue-offen');
      root.classList.toggle('menue-offen', auf); knopf.setAttribute('aria-expanded', String(auf));
      if (auf) setTimeout(() => menue.querySelector('a').focus({ preventScroll: true }), 80);
    });
    menue.addEventListener('click', (e) => { if (e.target.closest('a')) zu(false); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && root.classList.contains('menue-offen')) zu(true); });
    // Ausweichen: nach unten weg, nach oben zurück. Ganz oben immer sichtbar.
    let alt = scrollY, wartet = false;
    addEventListener('scroll', () => {
      if (wartet) return; wartet = true;
      requestAnimationFrame(() => {
        const y = scrollY, d = y - alt;
        if (y < 80 || d < -6) root.classList.remove('kopf-weg'); else if (d > 6) root.classList.add('kopf-weg');
        root.classList.toggle('gescrollt', y > 40);
        alt = y; wartet = false;
      });
    }, { passive: true });
    kopf.addEventListener('focusin', () => root.classList.remove('kopf-weg'));
    // Auf der Startseite hat der Hero seinen eigenen Kopf. Der schwebende Kopf übernimmt erst, wenn der Hero aus dem Bild ist.
    const spur = document.querySelector('.track');
    if (spur) new IntersectionObserver((es) => root.classList.toggle('im-hero', es[0].isIntersecting), { rootMargin: '0px 0px -98% 0px' }).observe(spur);
    // Farbe: Liegt eine dunkle Wand unter dem Kopf, wird er hell.
    const dunkle = document.querySelectorAll('[data-kopf="dunkel"]');
    if (dunkle.length) {
      const unter = new Set();
      const io = new IntersectionObserver((es) => {
        for (const e of es) if (e.isIntersecting) unter.add(e.target); else unter.delete(e.target);
        if (unter.size) root.dataset.kopf = 'dunkel'; else delete root.dataset.kopf;
      }, { rootMargin: '0px 0px -92% 0px' });
      dunkle.forEach((el) => io.observe(el));
    }
  }

  // Fotofächer am Handy: Das Foto in der Mitte richtet sich auf, die anderen bleiben schräg liegen.
  function faecher() {
    for (const f of document.querySelectorAll('.faecher')) {
      const io = new IntersectionObserver((es) => { for (const e of es) e.target.classList.toggle('mitte', e.isIntersecting); }, { root: f, rootMargin: '0px -30% 0px -30%', threshold: 0.5 });
      f.querySelectorAll('.faecher-foto').forEach((el) => io.observe(el));
    }
  }

  // Kapiteltitel im Hero-Look: Jeder Buchstabe ist eine Klaviertaste an einer Feder (Werte wie im Hero).
  // Die Maus drückt die Tasten unter sich, Nachbarn gehen ein wenig mit, ein Ballaufprall läuft als Welle durch.
  function raumTitel() {
    const alle = [];
    for (const t of document.querySelectorAll('.titel.raum')) {
      const woerter = t.querySelectorAll('.w').length ? [...t.querySelectorAll('.w')] : [t];
      const tasten = [];
      for (const ziel of woerter) {
        for (const n of [...ziel.childNodes]) {
          if (n.nodeType !== 3) continue;
          const frag = document.createDocumentFragment();
          for (const c of n.textContent) {
            const b = document.createElement('span'); b.className = 'b'; b.textContent = c; frag.append(b);
            tasten.push({ el: b, p: 0, v: 0, r: 0, rv: 0, ziel: 0, x: 0, y: 0, L: 0, T: 0, B: 0, H: 1 });
          }
          n.replaceWith(frag);
        }
      }
      tasten.forEach((k, i) => { k.el.style.zIndex = 200 - i; k.links = tasten[i - 1]; k.rechts = tasten[i + 1]; });
      alle.push({ t, tasten, wellen: [] });
    }
    const tasten = () => alle.flatMap((a) => a.tasten);
    // Lage aller Buchstaben, auf die Seite bezogen. Gemessen nur bei Bedarf, nie in jedem Bild.
    const messen = () => {
      for (const k of tasten()) {
        const r = k.el.getBoundingClientRect();
        k.L = r.left + scrollX; k.T = r.top + scrollY; k.B = r.width; k.H = r.height; k.x = k.L + k.B / 2; k.y = k.T + k.H / 2;
      }
    };
    // Einzelne Buchstaben verlieren das Kerning der Schrift. Wir messen Paare innerhalb eines Wortes und gleichen den Abstand aus.
    const ausgleichen = () => {
      for (const { t, tasten: ks } of alle) {
        const fs = parseFloat(getComputedStyle(t).fontSize);
        ks.forEach((k) => { k.el.style.marginLeft = ''; });
        const probe = document.createElement('span');
        probe.style.cssText = 'position:absolute;visibility:hidden;white-space:pre';
        t.append(probe);
        const breite = (s) => { probe.textContent = s; return probe.getBoundingClientRect().width; };
        const pos = ks.map((k) => k.el.getBoundingClientRect());
        ks.forEach((k, i) => {
          if (!i || ks[i - 1].el.parentElement !== k.el.parentElement || Math.abs(pos[i].top - pos[i - 1].top) > fs * 0.3) return;
          const soll = breite(ks[i - 1].el.textContent + k.el.textContent) - breite(k.el.textContent);
          const ist = pos[i].left - pos[i - 1].left;
          if (Math.abs(soll - ist) > 0.2) k.el.style.marginLeft = `${((soll - ist) / fs).toFixed(4)}em`;
        });
        probe.remove();
      }
      messen();
    };
    document.fonts.ready.then(ausgleichen);
    let breiteFenster = innerWidth;
    addEventListener('resize', () => { if (innerWidth !== breiteFenster) { breiteFenster = innerWidth; ausgleichen(); } });

    let zeiger = null;
    const feder = (dt) => {
      if (reduced.matches) return false;
      let ruhig = !zeiger;
      for (const { tasten: ks, wellen } of alle) {
        for (let i = wellen.length - 1; i >= 0; i--) {
          const w = wellen[i], r0 = w.alter * 850; w.alter += dt; const r1 = w.alter * 850;
          for (const k of ks) {
            const d = Math.hypot(k.x - w.x, k.y - w.y);
            if (d >= r0 && d < r1) { const f = w.st * Math.exp(-d / 620); k.v += 3.4 * f; k.rv += (k.x < w.x ? 1 : -1) * 1.1 * f; }
          }
          if (r1 > 1600) wellen.splice(i, 1); else ruhig = false;
        }
        for (const k of ks) {
          k.ziel = 0;
          if (zeiger) { const dx = (zeiger.x - k.x) / (k.H * 0.5), dy = (zeiger.y - k.y) / (k.H * 0.75); k.ziel = Math.exp(-(dx * dx + dy * dy)); }
        }
        for (const k of ks) {
          k.f = 26 * (k.ziel - k.p) - 6.6 * k.v + (k.links ? 7.5 * (k.links.p - k.p) : 0) + (k.rechts ? 7.5 * (k.rechts.p - k.p) : 0);
        }
        for (const k of ks) {
          k.v += k.f * dt; k.p = Math.max(-0.7, Math.min(1.35, k.p + k.v * dt));
          k.rv += (-70 * k.r - 5.5 * k.rv) * dt; k.r += k.rv * dt;
          k.el.style.transform = `translateY(${(k.p * 0.085).toFixed(4)}em) rotate(${(k.r * 4).toFixed(2)}deg)`;
          if (Math.abs(k.v) > 0.004 || Math.abs(k.p - k.ziel) > 0.004 || Math.abs(k.r) > 0.004 || Math.abs(k.rv) > 0.01) ruhig = false;
        }
      }
      return !ruhig;
    };
    for (const { t } of alle) {
      t.addEventListener('pointerenter', messen);
      t.addEventListener('pointermove', (e) => { if (e.pointerType === 'touch' || reduced.matches) return; zeiger = { x: e.pageX, y: e.pageY }; laufen(feder); });
      t.addEventListener('pointerleave', () => { zeiger = null; laufen(feder); });
      t.addEventListener('pointerdown', (e) => { messen(); stoss(e.pageX, e.pageY, e.pointerType === 'touch' ? 0.5 : 0.3); });
    }
    function stoss(x, y, st) {
      if (reduced.matches) return;
      for (const a of alle) a.wellen.push({ x, y, st, alter: 0 });
      laufen(feder);
    }
    return { stoss, messen, tasten };
  }

  // Der Spielball: fällt aus dem Ring des Heros ins Kapitel, springt die Stufen hinunter und bleibt liegen.
  // Antippen oder Klicken schießt ihn gegen die Titelbuchstaben. Schwerkraft und Abprall wie im Hero.
  function spielbaelle(titel) {
    for (const feld of document.querySelectorAll('[data-boden]')) {
      const ball = feld.querySelector('.spielball'), muster = ball.querySelector('.spielball-muster');
      const schatten = feld.querySelector('.spielball-schatten');
      const bild = feld.querySelector('.szene-unten');
      const stufen = JSON.parse(feld.dataset.boden);
      const B = { x: 0, y: 0, vx: 0, vy: 0, rot: 0, r: 40, lage: 'warten' };
      let W = 1, H = 1, s = 1, links = 0, oben = 0, unten = { x: 0, y: 0, w: 1, h: 1 };
      // Maße einmal pro Bild: Feld und unteres Szenenbild, auf das Feld bezogen.
      const mass = () => {
        const f = feld.getBoundingClientRect(), b = bild.getBoundingClientRect();
        W = f.width; H = f.height; links = f.left + scrollX; oben = f.top + scrollY;
        B.r = ball.offsetWidth / 2; s = B.r / 52;
        unten = { x: b.left - f.left, y: b.top - f.top, w: b.width, h: b.height };
        if (moewe) { const m = moewe.getBoundingClientRect(); moeweBox = { x: m.left - f.left + m.width * 0.18, y: m.top - f.top + m.height * 0.25, w: m.width * 0.64, h: m.height * 0.75 }; }
      };
      // Höhe des Bodens unter einer Stelle: Stufen aus dem Szenenbild, in Bruchteilen des unteren Bildes.
      const boden = (x) => {
        const fx = (x - unten.x) / unten.w;
        for (const [a, b, y] of stufen) if (fx >= a && fx < b) return unten.y + y * unten.h;
        return unten.y + stufen[fx < stufen[0][0] ? 0 : stufen.length - 1][2] * unten.h;
      };
      const zeigen = () => {
        ball.style.transform = `translate(${(B.x - B.r).toFixed(1)}px, ${(B.y - B.r).toFixed(1)}px)`;
        muster.style.rotate = `${B.rot.toFixed(3)}rad`;
        const g = boden(B.x), hoch = Math.max(0, g - B.y - B.r);
        schatten.style.transform = `translate(${(B.x - B.r).toFixed(1)}px, ${(g - B.r * 0.22).toFixed(1)}px) scale(${(1 + hoch / 600).toFixed(3)})`;
        schatten.style.opacity = Math.max(0.15, 1 - hoch / 500).toFixed(3);
      };
      const ruhen = () => { mass(); B.vx = 0; B.vy = 0; B.y = boden(B.x) - B.r; B.lage = 'ruhe'; zeigen(); };
      // Die Möwe: cool mit Brille, frech mit Brille auf der Stirn, Schreck mit Flügeln. Sie schaut, wenn etwas passiert.
      const moewe = feld.querySelector('.moewe');
      let moeweZeit = 0, moeweBox = null;
      const haltung = (l, ms) => {
        if (!moewe) return;
        moewe.dataset.lage = l; clearTimeout(moeweZeit);
        if (ms) moeweZeit = setTimeout(() => haltung(l === 'schreck' ? 'frech' : 'ruhe', l === 'schreck' ? 1600 : 0), ms);
      };
      const huepfen = () => { if (moewe && !reduced.matches && moewe.animate) moewe.animate([{ translate: '0 0' }, { translate: '0 -16%' }, { translate: '0 0' }], { duration: 420, easing: 'cubic-bezier(.3,.7,.4,1)' }); };
      if (moewe) {
        moewe.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') haltung('frech', 1500); });
        moewe.addEventListener('pointerdown', () => { haltung('frech', 1800); huepfen(); });
      }
      // Weniger Bewegung: Der Ball liegt still vor der Treppe, ohne Flug und ohne Physik.
      if (reduced.matches) {
        const legen = () => { mass(); B.x = Math.min(W - B.r, Math.max(B.r, unten.x + 0.5 * unten.w)); ruhen(); };
        legen(); addEventListener('resize', legen);
        continue;
      }
      ball.removeAttribute('aria-hidden');
      ball.setAttribute('role', 'button'); ball.tabIndex = 0;
      ball.setAttribute('aria-label', 'Ball anschießen');
      const getroffen = new Map();
      const physik = (dt) => {
        if (reduced.matches) { ruhen(); return false; }
        mass();
        const G = 2600 * s, n = Math.ceil(dt / (1 / 240)), h = dt / n;
        for (let i = 0; i < n; i++) {
          B.vy += G * h;
          const altX = B.x;
          B.x += B.vx * h; B.y += B.vy * h;
          if (B.x < B.r) { B.x = B.r; B.vx = Math.abs(B.vx) * 0.6; }
          if (B.x > W - B.r) { B.x = W - B.r; B.vx = -Math.abs(B.vx) * 0.6; }
          // Stufenkante: Rollt der Ball seitlich gegen eine höhere Stufe, prallt er ab.
          if (B.y + B.r > boden(B.x) + B.r * 0.5 && boden(altX) > boden(B.x) + 2) { B.x = altX; B.vx = -B.vx * 0.5; }
          const g = boden(B.x);
          if (B.y + B.r > g) {
            B.y = g - B.r;
            if (B.vy > 0) {
              if (B.vy > 260 * s) titel.stoss(B.x + links, g + oben, Math.min(0.5, B.vy / (3000 * s)));
              if (B.vy > 260 * s && moeweBox && Math.abs(B.x - (moeweBox.x + moeweBox.w / 2)) < B.r * 6 && moewe.dataset.lage !== 'schreck') haltung('frech', 1800);
              B.vy = B.vy > 90 * s ? -B.vy * 0.7 : 0;
            }
            B.vx *= Math.pow(B.y + B.r > g - 1 && Math.abs(B.vy) < 1 ? 0.08 : 0.4, h);
          }
          // Titelbuchstaben: Der Ball schubst sie und prallt weich ab.
          if (B.vy < 0 || B.y < H * 0.6) for (const k of titel.tasten()) {
            const kx = k.L - links, ky = k.T - oben + k.H * 0.12, kh = k.H * 0.7;
            const nx = Math.max(kx, Math.min(B.x, kx + k.B)), ny = Math.max(ky, Math.min(B.y, ky + kh));
            if (Math.hypot(B.x - nx, B.y - ny) < B.r && performance.now() - (getroffen.get(k) || 0) > 220) {
              getroffen.set(k, performance.now());
              B.vy = B.vy < 0 ? Math.abs(B.vy) * 0.45 : -B.vy * 0.5;
              B.vx *= 0.8;
              titel.stoss(B.x + links, B.y + oben, 0.9);
              k.v += 9; k.rv += (B.x < kx + k.B / 2 ? 1 : -1) * 3;
            }
          }
          // Trifft der Ball die Möwe, erschrickt sie und hüpft, der Ball springt ab.
          if (moeweBox) {
            const nx = Math.max(moeweBox.x, Math.min(B.x, moeweBox.x + moeweBox.w)), ny = Math.max(moeweBox.y, Math.min(B.y, moeweBox.y + moeweBox.h));
            if (Math.hypot(B.x - nx, B.y - ny) < B.r && performance.now() - (getroffen.get(moewe) || 0) > 400) {
              getroffen.set(moewe, performance.now());
              // Kein Schwung nach oben dazu: Der Ball rutscht seitlich von ihr ab, sonst hüpft er endlos auf ihrem Kopf.
              const weg = B.x < moeweBox.x + moeweBox.w / 2 ? -1 : 1;
              B.vy = -Math.abs(B.vy) * 0.4; B.vx = weg * Math.max(380 * s, Math.abs(B.vx) * 0.7);
              B.x = weg < 0 ? Math.min(B.x, moeweBox.x - B.r * 0.2) : Math.max(B.x, moeweBox.x + moeweBox.w + B.r * 0.2);
              haltung('schreck', 700); huepfen();
            }
          }
          B.rot += (B.x - altX) / B.r;
        }
        zeigen();
        if (Math.abs(B.vy) < 1 && Math.abs(B.vx) < 6 * s && B.y + B.r >= boden(B.x) - 0.5) { B.vx = 0; B.lage = 'ruhe'; return false; }
        return true;
      };
      const herein = () => {
        mass();
        const sichtOben = scrollY - oben;
        B.x = Math.min(W - B.r, Math.max(B.r, unten.x + 0.82 * unten.w));
        B.y = Math.max(-B.r * 2, sichtOben - B.r * 2); B.vx = -110 * s; B.vy = 200 * s; B.lage = 'frei';
        laufen(physik);
      };
      const schuss = () => {
        mass(); titel.messen();
        const sicht = titel.tasten().filter((k) => k.T - scrollY > 0 && k.T - scrollY + k.H < innerHeight && k.T > oben && k.T < oben + H);
        // Ziel ist ein sichtbarer Titelbuchstabe. Ist keiner im Bild, springt der Ball im sichtbaren Ausschnitt hoch und kommt zurück.
        let tx = Math.min(W - B.r, Math.max(B.r, B.x + (Math.random() - 0.5) * W * 0.5)), ty = Math.max(scrollY - oben + innerHeight * 0.18, B.r);
        if (sicht.length) { const k = sicht[Math.floor(Math.random() * sicht.length)]; tx = k.x - links; ty = k.T - oben + k.H * 0.6; }
        const T = 0.62, G = 2600 * s;
        B.vx = (tx - B.x) / T; B.vy = (ty - B.y) / T - 0.5 * G * T; B.lage = 'frei';
        haltung('schreck', 500);
        laufen(physik);
      };
      ball.addEventListener('click', schuss);
      ball.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); schuss(); } });
      // Das untere Bild ist am Handy breiter als der Bildschirm, darum eine niedrige Schwelle.
      new IntersectionObserver((es, io) => { if (es[0].isIntersecting) { io.disconnect(); herein(); } }, { threshold: 0.12 }).observe(bild);
      addEventListener('resize', () => { if (B.lage === 'ruhe') { const fx = B.x / W; mass(); B.x = fx * W; ruhen(); } });
      reduced.addEventListener('change', () => { if (reduced.matches && B.lage !== 'warten') ruhen(); });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
