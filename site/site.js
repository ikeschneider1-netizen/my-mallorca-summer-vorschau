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
      // Tiefe wie im Hero: Die Gegenstände rücken mit der Maus ein wenig mit, einmal je Bild gesetzt.
      if (!reduced.matches) for (const job of document.querySelectorAll('.job')) {
        let geplant = 0, zx = 0, zy = 0;
        (job.closest('.kapitel') || job).addEventListener('pointermove', (e) => {
          if (e.pointerType !== 'mouse') return;
          zx = e.clientX / innerWidth * 2 - 1; zy = e.clientY / innerHeight * 2 - 1;
          if (!geplant) geplant = requestAnimationFrame(() => { geplant = 0; job.style.setProperty('--zx', zx.toFixed(3)); job.style.setProperty('--zy', zy.toFixed(3)); });
        });
      }
      // Fakten: Beim Überfahren oder Antippen spielt der Gegenstand seine kleine Szene einmal ganz durch.
      if (!reduced.matches) for (const f of document.querySelectorAll('.fakt')) {
        const ding = f.querySelector('.fakt-ding');
        if (!ding) continue;
        const los = () => f.classList.add('spielt');
        f.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') los(); });
        f.addEventListener('click', los);
        ding.addEventListener('animationend', () => f.classList.remove('spielt'));
      }
      const titel = raumTitel();
      spielbaelle(titel);
      wind();
      aufkleberPlatz();
      mauerMoewe();

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

  // Die Möwe auf der Mauerkante der Landung: Sie sitzt da, wenn man durch den Ring ankommt, und schaut auf den Titel.
  // Landet der Titel, guckt sie frech. Antippen erschreckt sie, sie hüpft und schimpft stumm. Scrollt man weiter ins Kapitel,
  // fliegt sie hinunter, dort sitzt sie dann. Scrollt man zurück, sitzt sie wieder oben.
  function mauerMoewe() {
    const m = document.querySelector('.moewe-mauer'), kapitel = document.querySelector('.job-rest');
    if (!m || reduced.matches || !m.animate) return;
    let zeit = 0, weg = false, flug = null;
    const lage = (l, ms) => { m.dataset.lage = l; clearTimeout(zeit); if (ms) zeit = setTimeout(() => lage(l === 'schreck' ? 'frech' : 'ruhe', l === 'schreck' ? 1400 : 0), ms); };
    const titel = document.getElementById('job-t');
    if (titel) new MutationObserver(() => { if (titel.classList.contains('da') && !weg) setTimeout(() => lage('frech', 2000), 700); }).observe(titel, { attributes: true, attributeFilter: ['class'] });
    m.addEventListener('click', () => {
      if (weg) return;
      lage('schreck', 420);
      m.querySelector('.moewe-stand').animate([{ transform: 'none' }, { transform: 'translateY(-32%) scale(.95, 1.06)' }, { transform: 'scale(1.1, .88)' }, { transform: 'none' }], { duration: 560, easing: 'cubic-bezier(.3, 1.4, .5, 1)' });
    });
    if (!kapitel) return;
    // Sobald das Kapitel von unten ins Bild kommt, verlässt die Bühne mit der Landung den Bildschirm: Jetzt hebt sie ab.
    new IntersectionObserver(([e]) => {
      const unterhalb = e.boundingClientRect.top > innerHeight * 0.5;
      if (e.isIntersecting && !unterhalb && !weg) {
        weg = true; m.classList.add('fliegt');
        flug = m.animate([{ transform: 'none', opacity: 1 }, { transform: 'translate(-120%, 60%) scale(1.25)', opacity: 1, offset: 0.55 }, { transform: 'translate(-240%, 260%) scale(1.6)', opacity: 0 }], { duration: 1300, easing: 'cubic-bezier(.45, 0, .7, 1)', fill: 'forwards' });
      } else if (!e.isIntersecting && unterhalb && weg) {
        weg = false; flug?.cancel(); m.classList.remove('fliegt'); lage('ruhe');
      }
    }, { threshold: [0, 0.02] }).observe(kapitel);
  }

  // Der eine Aufkleber macht Platz, wenn Text unter ihm liegt: Er schrumpft in seiner Ecke zur kleinen WhatsApp-Sonne (.platz)
  // und springt groß zurück, sobald darunter wieder Szene ist. Geprüft wird an neun Punkten innerhalb der Sonne.
  function aufkleberPlatz() {
    const a = document.querySelector('a.apply, a.der-aufkleber');
    if (!a || !document.elementsFromPoint) return;
    const TEXT = 'p, dd, dt, h1, h2, h3, li, figcaption, summary, .job-los, .offen';
    const PUNKTE = [[0, 0], [-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3], [0, -0.38], [0, 0.38], [-0.38, 0], [0.38, 0]];
    let geplant = false, frei = 0, spaet = 0;
    const pruefen = () => {
      geplant = false;
      // Die Ecke, in der er hängt, bleibt beim Schrumpfen fest. Daraus und aus der vollen Größe ergibt sich sein voller Platz.
      const r = a.getBoundingClientRect(), w = a.offsetWidth, h = a.offsetHeight;
      if (!w) return;
      const unten = getComputedStyle(a).transformOrigin.split(' ')[1] !== '0px';
      const imFlugVerdeckt = root.classList.contains('fly') && !root.classList.contains('past');
      const x = r.right - w, y = unten ? r.bottom - h : r.top;
      let text = false;
      for (const [dx, dy] of PUNKTE) {
        const px = x + w * (0.5 + dx), py = y + h * (0.5 + dy);
        if (px < 0 || py < 0 || px >= innerWidth || py >= innerHeight) continue;
        for (const el of document.elementsFromPoint(px, py)) {
          if (el === a || a.contains(el)) continue;
          // Die Landung liegt während des Flugs noch verdeckt hinter dem Hero.
          if (imFlugVerdeckt && el.closest('.landung')) continue;
          if (el.closest(TEXT) && !el.closest('.hero, .seitenkopf, [aria-hidden="true"]')) { text = true; break; }
        }
        if (text) break;
      }
      // Kleiner wird er sofort, groß erst nach einer kurzen Ruhe. So flackert er nicht an Textkanten.
      if (text) { frei = 0; a.classList.add('platz'); }
      else if (a.classList.contains('platz')) {
        frei = frei || performance.now();
        if (performance.now() - frei > 260) { a.classList.remove('platz'); frei = 0; } else nachher();
      }
    };
    const anstossen = () => { if (!geplant) { geplant = true; requestAnimationFrame(pruefen); } };
    const nachher = () => { clearTimeout(spaet); spaet = setTimeout(anstossen, 300); };
    addEventListener('scroll', () => { anstossen(); nachher(); }, { passive: true });
    addEventListener('resize', anstossen);
    anstossen();
  }

  // Blätter im Wind: Palmwedel und Kübelpflanze werden auf einer kleinen WebGL-Fläche verbogen, wie die Szene im Hero lebt.
  // Wo ein Blatt am Bildrand oder in der Erde hängt (data-halt, data-anker), steht es fest, nach außen wiegt es immer stärker.
  // data-weit ist der größte Ausschlag in Bildpunkten des Blattbildes. Ohne WebGL, bei weniger Bewegung oder bei einem Fehler
  // bleibt das ruhige Bild stehen; die Fläche übernimmt erst, wenn sie ihr erstes Bild gezeichnet hat.
  function wind() {
    if (reduced.matches) return;
    const RAND = 0.08;
    const VS = `attribute vec2 a;
uniform float t, amp, asp, rand;
uniform vec2 uvs;
uniform vec4 halt;
uniform vec3 anker;
varying vec2 v;
void main() {
  v = a * uvs;
  vec2 p = vec2(a.x, a.y * asp);
  float d = 9.0;
  if (halt.x > .5) d = min(d, p.y);
  if (halt.y > .5) d = min(d, p.x);
  if (halt.z > .5) d = min(d, asp - p.y);
  if (halt.w > .5) d = min(d, 1.0 - p.x);
  float w = smoothstep(0.0, 0.42, d);
  if (anker.z > 0.0) w *= smoothstep(0.0, anker.z, distance(p, vec2(anker.x, anker.y * asp)));
  float ph = dot(p, vec2(4.2, 2.6));
  float boe = 0.62 + 0.38 * sin(t * 0.29) * sin(t * 0.13 + 1.3);
  vec2 s = vec2(sin(t * 1.15 - ph), 0.4 * sin(t * 0.93 - ph * 1.3 + 1.7)) * boe
         + vec2(sin(t * 4.1 - ph * 3.3), cos(t * 3.6 - ph * 2.7)) * 0.09;
  vec2 q = a + vec2(s.x, s.y / asp) * amp * w;
  vec2 c = (q + rand) / (1.0 + 2.0 * rand) * 2.0 - 1.0;
  gl_Position = vec4(c.x, -c.y, 0.0, 1.0);
}`;
    // Leicht zur schärferen Mipmap-Stufe hin, damit die Fiedern so klar bleiben wie im ruhigen Bild.
    const FS = 'precision mediump float; uniform sampler2D bild; varying vec2 v; void main() { gl_FragColor = texture2D(bild, v, -0.6); }';
    const imFlug = () => root.classList.contains('fly') && !root.classList.contains('past');
    const alle = [];
    for (const blatt of document.querySelectorAll('.blatt[data-halt]')) {
      try {
        const bild = blatt.querySelector('img');
        const flaeche = document.createElement('canvas');
        flaeche.setAttribute('aria-hidden', 'true');
        const gl = flaeche.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
        if (!gl) continue;
        const shader = (typ, quelle) => { const sh = gl.createShader(typ); gl.shaderSource(sh, quelle); gl.compileShader(sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh)); return sh; };
        const prog = gl.createProgram();
        gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
        gl.useProgram(prog);
        const bw = +bild.getAttribute('width'), asp = +bild.getAttribute('height') / bw;
        // Ein feines Netz über dem Blatt: Jeder Knoten wird einzeln verschoben, so biegen sich die Wedel statt sich steif zu drehen.
        const NX = 40, NY = Math.max(8, Math.round(NX * asp)), netz = [];
        for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
          const x0 = i / NX, x1 = (i + 1) / NX, y0 = j / NY, y1 = (j + 1) / NY;
          netz.push(x0, y0, x1, y0, x0, y1, x0, y1, x1, y0, x1, y1);
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(netz), gl.STATIC_DRAW);
        const lage = gl.getAttribLocation(prog, 'a');
        gl.enableVertexAttribArray(lage); gl.vertexAttribPointer(lage, 2, gl.FLOAT, false, 0, 0);
        const u = (n) => gl.getUniformLocation(prog, n);
        const halt = blatt.dataset.halt.split(/\s+/);
        gl.uniform4f(u('halt'), +halt.includes('oben'), +halt.includes('links'), +halt.includes('unten'), +halt.includes('rechts'));
        const [ax = 0, ay = 0, ar = 0] = (blatt.dataset.anker || '').split(/\s+/).filter(Boolean).map(Number);
        gl.uniform3f(u('anker'), ax, ay, ar);
        gl.uniform1f(u('asp'), asp); gl.uniform1f(u('rand'), RAND);
        const uT = u('t'), uAmp = u('amp');
        const weit = (+blatt.dataset.weit || 8) / bw;
        const B = { blatt, landung: !!blatt.closest('.landung'), t: Math.random() * 40, stark: 0, sicht: false, laeuft: false, bereit: false, aus: false };
        // Bild ungestreckt in eine Fläche mit Zweierpotenz-Maßen legen: So gibt es Mipmaps, und feine Fiedern flimmern beim Verkleinern nicht.
        const laden = () => {
          if (B.bereit || !bild.naturalWidth) return;
          const pot = (n) => 2 ** Math.ceil(Math.log2(n));
          const c = document.createElement('canvas'); c.width = pot(bild.naturalWidth); c.height = pot(bild.naturalHeight);
          c.getContext('2d').drawImage(bild, 0, 0);
          gl.uniform2f(u('uvs'), bild.naturalWidth / c.width, bild.naturalHeight / c.height);
          gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
          gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
          gl.generateMipmap(gl.TEXTURE_2D);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          B.bereit = true; pruefen(B);
        };
        // Beim ersten Start wächst der Ausschlag von null an: Das erste Bild der Fläche gleicht dem ruhigen Bild aufs Haar.
        const malen = () => {
          const e = B.stark * B.stark * (3 - 2 * B.stark);
          gl.uniform1f(uT, B.t); gl.uniform1f(uAmp, weit * e);
          gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
          gl.drawArrays(gl.TRIANGLES, 0, netz.length / 2);
          blatt.classList.add('wind');
        };
        B.zeichnen = (dt) => {
          if (B.aus || !B.sicht || !B.bereit || (B.landung && imFlug())) { B.laeuft = false; return false; }
          B.t += dt; B.stark = Math.min(1, B.stark + dt / 1.8);
          malen();
          return true;
        };
        new ResizeObserver(([e]) => {
          const dpr = Math.min(2, devicePixelRatio || 1), k = 1 + 2 * RAND;
          flaeche.width = Math.max(1, Math.round(e.contentRect.width * k * dpr)); flaeche.height = Math.max(1, Math.round(e.contentRect.height * k * dpr));
          gl.viewport(0, 0, flaeche.width, flaeche.height);
          // Eine neue Größe leert die Fläche: Steht der Wind gerade, gleich wieder das letzte Bild zeichnen.
          if (B.bereit && !B.aus && blatt.classList.contains('wind')) malen();
        }).observe(blatt);
        flaeche.addEventListener('webglcontextlost', () => { B.aus = true; blatt.classList.remove('wind'); });
        blatt.append(flaeche);
        new IntersectionObserver(([e]) => { B.sicht = e.isIntersecting; pruefen(B); }, { rootMargin: '120px 0px' }).observe(blatt);
        if (bild.complete) laden(); else bild.addEventListener('load', laden, { once: true });
        alle.push(B);
      } catch (err) {
        blatt.classList.remove('wind');
      }
    }
    function pruefen(B) {
      if (B.laeuft || B.aus || !B.sicht || !B.bereit) return;
      if (B.landung && imFlug()) return;
      B.laeuft = true; laufen(B.zeichnen);
    }
    // Die Landung liegt in der Bühne des Heros: Ihre Palmen wiegen sich erst, wenn der Flug durch den Ring ankommt.
    if (alle.some((B) => B.landung)) new MutationObserver(() => alle.forEach(pruefen)).observe(root, { attributes: true, attributeFilter: ['class'] });
    reduced.addEventListener('change', () => { if (!reduced.matches) return; for (const B of alle) { B.aus = true; B.blatt.classList.remove('wind'); } });
  }

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

  // Kapiteltitel im Hero-Look: Jeder Buchstabe sitzt an einer Feder (Werte wie im Hero).
  // Unter der Maus hebt er sich, die Nachbarn gehen als Welle mit und neigen sich mit ihr. Zieht die Maus weiter,
  // sinkt er federnd einmal unter seine Ruhelage (hoch und runter statt Klaviertaste, Ike 02.11.2026). Ein Ballaufprall läuft als Welle durch.
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
          if (zeiger) { const dx = (zeiger.x - k.x) / (k.H * 0.62), dy = (zeiger.y - k.y) / (k.H * 0.8); k.ziel = Math.exp(-(dx * dx + dy * dy)); }
        }
        for (const k of ks) {
          k.f = 34 * (k.ziel - k.p) - 4.6 * k.v + (k.links ? 9 * (k.links.p - k.p) : 0) + (k.rechts ? 9 * (k.rechts.p - k.p) : 0);
        }
        for (const k of ks) {
          k.v += k.f * dt; k.p = Math.max(-0.7, Math.min(1.35, k.p + k.v * dt));
          k.rv += (-70 * k.r - 5.5 * k.rv) * dt; k.r += k.rv * dt;
          const neig = ((k.rechts ? k.rechts.p : k.p) - (k.links ? k.links.p : k.p)) * -6;
          k.el.style.transform = `translateY(${(-k.p * 0.18).toFixed(4)}em) rotate(${(k.r * 4 + neig).toFixed(2)}deg)`;
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
      new IntersectionObserver((es, io) => { if (es[0].isIntersecting) { feld.classList.add('nah'); io.disconnect(); } }, { rootMargin: '900px 0px' }).observe(feld);
      const B = { x: 0, y: 0, vx: 0, vy: 0, rot: 0, w: 0, q: 0, qv: 0, qa: 0, r: 40, lage: 'warten' };
      let W = 1, H = 1, s = 1, links = 0, oben = 0, unten = { x: 0, y: 0, w: 1, h: 1 };
      // Maße einmal pro Bild: Feld und unteres Szenenbild, auf das Feld bezogen.
      const mass = () => {
        const f = feld.getBoundingClientRect(), b = bild.getBoundingClientRect();
        W = f.width; H = f.height; links = f.left + scrollX; oben = f.top + scrollY;
        B.r = ball.offsetWidth / 2; s = B.r / 52;
        unten = { x: b.left - f.left, y: b.top - f.top, w: b.width, h: b.height };
        if (moewe && !fliegt) { const m = moewe.getBoundingClientRect(); moeweBox = { x: m.left - f.left + m.width * 0.18, y: m.top - f.top + m.height * 0.25, w: m.width * 0.64, h: m.height * 0.75 }; } else moeweBox = null;
      };
      // Höhe des Bodens unter einer Stelle: Stufen aus dem Szenenbild, in Bruchteilen des unteren Bildes.
      // Ein Eintrag mit vier Werten [von x, bis x, Höhe links, Höhe rechts] ist schräg.
      const boden = (x) => {
        const fx = (x - unten.x) / unten.w;
        for (const [a, b, y1, y2 = y1] of stufen) if (fx >= a && fx < b) return unten.y + (y1 + (y2 - y1) * (fx - a) / (b - a)) * unten.h;
        const [, , y1, y2 = y1] = stufen[fx < stufen[0][0] ? 0 : stufen.length - 1];
        return unten.y + (fx < stufen[0][0] ? y1 : y2) * unten.h;
      };
      // Der Boden als Linienzug: Stufenflächen, dazwischen senkrechte Kanten. Der Ball stößt an Flächen, Kanten und Ecken
      // wie ein echter Ball. Auf einer Ecke balanciert er nicht, er kippt ab. Der Kübel ist oben leicht schräg:
      // Die Blätter drücken den Ball herunter, er rollt ab, statt auf dem Rand liegen zu bleiben.
      const kanten = () => {
        const L = [];
        stufen.forEach(([a, b, y1, y2 = y1], i) => {
          const x1 = unten.x + a * unten.w, x2 = unten.x + b * unten.w, p1 = unten.y + y1 * unten.h, p2 = unten.y + y2 * unten.h;
          // Über die Bildränder hinaus geht es waagrecht weiter (am Handy ist das Bild breiter als der Bildschirm).
          if (i === 0) L.push([-W, p1, x1, p1]);
          const vor = L[L.length - 1];
          if (vor && Math.abs(vor[3] - p1) > 0.5) L.push([x1, vor[3], x1, p1]);
          L.push([x1, p1, x2, p2]);
          if (i === stufen.length - 1) L.push([x2, p2, 2 * W, p2]);
        });
        return L;
      };
      const zeigen = () => {
        // Beim Aufprall staucht der Ball kurz entlang der Stoßrichtung und federt zurück.
        const quetsch = Math.abs(B.q) > 0.004 ? ` rotate(${B.qa.toFixed(3)}rad) scale(${(1 - B.q).toFixed(3)}, ${(1 + B.q * 0.6).toFixed(3)}) rotate(${(-B.qa).toFixed(3)}rad)` : '';
        ball.style.transform = `translate(${(B.x - B.r).toFixed(1)}px, ${(B.y - B.r).toFixed(1)}px)${quetsch}`;
        const schritt = Math.PI / 8, k = Math.round(B.rot / schritt), bild = ((k % 16) + 16) % 16;
        muster.style.backgroundPositionX = `${(bild / 15 * 100).toFixed(3)}%`;
        muster.style.rotate = `${(B.rot - k * schritt).toFixed(3)}rad`;
        const g = boden(B.x), hoch = Math.max(0, g - B.y - B.r);
        schatten.style.transform = `translate(${(B.x - B.r).toFixed(1)}px, ${(g - B.r * 0.22).toFixed(1)}px) scale(${(1 + hoch / 600).toFixed(3)})`;
        schatten.style.opacity = Math.max(0.15, 1 - hoch / 500).toFixed(3);
      };
      const ruhen = () => { mass(); B.vx = 0; B.vy = 0; B.y = boden(B.x) - B.r; B.lage = 'ruhe'; zeigen(); };
      // Die Möwe: cool mit Brille, frech mit Brille auf der Stirn, Schreck mit Flügeln. Sie schaut, wenn etwas passiert,
      // und fliegt ab und zu auf einen anderen Platz (Kübelkante, Boden, Stufen). Antippen oder ein Ballwurf scheucht sie auf.
      const moewe = feld.querySelector('.moewe');
      const sitze = feld.dataset.sitze ? JSON.parse(feld.dataset.sitze) : [];
      let moeweZeit = 0, moeweBox = null, platz = -1, fliegt = false, imBild = false, naechsterFlug = 0;
      const M = { x: 0, y: 0 };
      const haltung = (l, ms) => {
        if (!moewe) return;
        moewe.dataset.lage = l; clearTimeout(moeweZeit);
        if (ms) moeweZeit = setTimeout(() => haltung(l === 'schreck' ? 'frech' : 'ruhe', l === 'schreck' ? 1600 : 0), ms);
      };
      const sitzPunkt = (i) => ({ x: unten.x + sitze[i][0] * unten.w, y: unten.y + sitze[i][1] * unten.h });
      // Ein Platz zählt, wenn er im Bild ist, nicht dort, wo der Ball gerade liegt, und wenn die Möwe dort keinen Text verdeckt
      // (je nach Breite rücken Wörter an Kübel oder Stufen heran).
      const textFrei = (i) => {
        if (!moewe) return true;
        const q = sitzPunkt(i), f = feld.getBoundingClientRect(), mw = moewe.offsetWidth, mh = moewe.offsetHeight;
        const l = q.x - 0.547 * mw + mw * 0.18, r = q.x - 0.547 * mw + mw * 0.82, t = q.y - mh * 0.95, b = q.y;
        for (const el of feld.querySelectorAll('.fakt dt, .fakt dd, .offen, .job-los a')) {
          const e = el.getBoundingClientRect(), x = e.left - f.left, y = e.top - f.top;
          if (x + e.width > l && x < r && y + e.height > t && y < b) return false;
        }
        return true;
      };
      const sichtbar = (i) => { const q = sitzPunkt(i); return q.x > W * 0.08 && q.x < W * 0.92 && (B.lage !== 'ruhe' || Math.abs(q.x - B.x) > B.r * 3.2) && textFrei(i); };
      // Die Füße stehen im Bild bei 54,7 % der Breite, ganz unten.
      const stellen = () => { const w = moewe.offsetWidth, h = moewe.offsetHeight; moewe.style.transform = `translate(${(M.x - 0.547 * w).toFixed(1)}px, ${(M.y - 0.995 * h).toFixed(1)}px)`; };
      const setzen = (i) => { platz = i; const q = sitzPunkt(i); M.x = q.x; M.y = q.y; moewe.classList.toggle('links', sitze[i][0] > 0.55); stellen(); };
      const fliegen = (ziel, getroffenVomBall = false) => {
        if (!moewe || fliegt || ziel === platz || reduced.matches) return;
        mass();
        const a = { x: M.x, y: M.y }, b = sitzPunkt(ziel), k = moewe.offsetWidth / 150;
        const c = { x: (a.x + b.x) / 2, y: Math.min(a.y, b.y) - (140 + Math.random() * 90) * k }, dauer = 1.1 + Math.abs(b.x - a.x) / Math.max(W, 1) * 1.3;
        fliegt = true; moeweBox = null; clearTimeout(moeweZeit); delete moewe.dataset.lage;
        const flug = moewe.querySelector('.moewe-flug'), schonInDerLuft = moewe.classList.contains('fliegt');
        // So fliegt eine Möwe: Sie geht kurz in die Knie und springt ab, steigt mit schnellem Flügelschlag,
        // neigt sich in die Flugrichtung, gleitet im Sinkflug mit ausgebreiteten Flügeln und richtet sich vor
        // der Landung auf, um mit ein paar Schlägen abzubremsen.
        const los = () => {
          moewe.classList.add('fliegt'); moewe.classList.toggle('links', b.x < a.x);
          let t = 0, px = M.x, py = M.y, neig = 0;
          laufen((dt) => {
            t = Math.min(1, t + dt / dauer);
            // Weich los, weich landen: Bogen mit sanftem Anfang und Ende.
            const u = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2, v = 1 - u;
            M.x = v * v * a.x + 2 * v * u * c.x + u * u * b.x; M.y = v * v * a.y + 2 * v * u * c.y + u * u * b.y;
            const dx = M.x - px, dy = M.y - py; px = M.x; py = M.y;
            const soll = t > 0.84 ? -14 : Math.max(-22, Math.min(26, Math.atan2(dy, Math.abs(dx) + 0.01) * 180 / Math.PI * 0.55));
            neig += (soll - neig) * (1 - Math.exp(-9 * dt));
            flug.style.rotate = `${neig.toFixed(1)}deg`;
            moewe.classList.toggle('steigt', t < 0.32);
            moewe.classList.toggle('gleitet', t > 0.46 && t < 0.84);
            stellen();
            if (t < 1) return true;
            fliegt = false; platz = ziel; flug.style.rotate = '';
            moewe.classList.remove('fliegt', 'steigt', 'gleitet'); moewe.classList.toggle('links', sitze[ziel][0] > 0.55);
            const stand = moewe.querySelector('.moewe-stand');
            if (stand.animate) stand.animate([{ transform: 'scale(1.1, .86)' }, { transform: 'scale(1, 1)' }], { duration: 320, easing: 'cubic-bezier(.3, 1.6, .5, 1)' });
            if (getroffenVomBall) {
              // Nach dem Treffer: Sie schüttelt sich, dreht sich zum Ball und schaut ihn lange frech an.
              moewe.classList.toggle('links', B.x < M.x);
              if (stand.animate) stand.animate([{ rotate: '0deg' }, { rotate: '-10deg' }, { rotate: '8deg' }, { rotate: '-5deg' }, { rotate: '2deg' }, { rotate: '0deg' }], { duration: 700, delay: 300, easing: 'ease-in-out' });
              haltung('frech', 3200);
            } else haltung('frech', 1600);
            naechsterFlug = performance.now() + 9000 + Math.random() * 7000;
            return false;
          });
        };
        if (schonInDerLuft || !moewe.animate) { los(); return; }
        moewe.querySelector('.moewe-stand').animate([{ transform: 'none' }, { transform: 'scale(1.07, .88)', offset: 0.55 }, { transform: 'translateY(-7%) scale(.95, 1.07)' }], { duration: 230, easing: 'ease-in' });
        setTimeout(los, 200);
      };
      const wegfliegen = () => { const frei = sitze.map((_, i) => i).filter((i) => i !== platz && sichtbar(i)); if (frei.length) fliegen(frei[Math.floor(Math.random() * frei.length)]); };
      // Federn beim Treffer: Sie stieben in Schussrichtung auseinander und segeln pendelnd zu Boden.
      const federn = (x, y, nx, ny, k) => {
        for (let i = 0; i < 8; i++) {
          const f = document.createElement('i'); f.className = 'feder'; f.style.setProperty('--k', k.toFixed(2)); feld.append(f);
          const w = (Math.random() - 0.5) * 2.2, v = (160 + Math.random() * 260) * k;
          const vx = (nx * 0.6 + Math.cos(w) * 0.5 * (Math.random() < 0.5 ? -1 : 1)) * v, vy = (Math.min(ny, -0.3) * 0.7 - Math.random() * 0.5) * v;
          const dauer = 1600 + Math.random() * 1100, schritte = [], pend = (12 + Math.random() * 16) * k, dreh = Math.random() * 360;
          for (let j = 0; j <= 12; j++) {
            const t = (j / 12) * dauer / 1000, auf = 1 - Math.exp(-3 * t);
            const px = x + vx * auf / 3 + Math.sin(t * 5.5 + i) * pend * Math.min(1, t * 2), py = y + vy * auf / 3 + 70 * k * t * t + 40 * k * t;
            schritte.push({ transform: `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px) rotate(${(dreh + Math.sin(t * 5.5 + i) * 50).toFixed(1)}deg)`, opacity: j < 9 ? 1 : 1 - (j - 8) / 4 });
          }
          if (!f.animate) { f.remove(); continue; }
          f.animate(schritte, { duration: dauer, easing: 'linear', fill: 'forwards' }).onfinish = () => f.remove();
        }
      };
      // Volltreffer mit dem Ball: Die Möwe fliegt wie aus der Kanone geschossen. Einen Wimpernschlag platt, Federn, dann eine Wurfbahn
      // mit Schwerkraft und Luftwiderstand, dabei überschlägt sie sich mit wild schlagenden Flügeln. Am Scheitel fängt sie sich und
      // fliegt zu dem Platz, der am weitesten vom Ball weg ist. Fliegt sie aus dem Bild, kommt sie kurz danach von der Seite zurück.
      const abschuss = (nx, ny, wucht) => {
        if (!moewe || fliegt || reduced.matches || !moewe.animate) return;
        mass();
        const k = moewe.offsetWidth / 150, w = moewe.offsetWidth, h = moewe.offsetHeight, flug = moewe.querySelector('.moewe-flug'), stand = moewe.querySelector('.moewe-stand');
        fliegt = true; moeweBox = null; clearTimeout(moeweZeit); platz = -1;
        haltung('schreck');
        federn(M.x - w * 0.05, M.y - h * 0.55, nx, ny, k);
        stand.animate([{ transform: `scale(${1 + 0.32 * Math.abs(nx)}, ${1 - 0.3 * Math.max(0.4, Math.abs(ny))})` }, { transform: 'scale(1, 1)' }], { duration: 110, easing: 'ease-out' });
        // Immer schräg nach oben, mit genug Wucht für einen echten Abflug.
        const ry = Math.min(ny, -0.55), rl = Math.hypot(nx, ry) || 1, V = Math.min(1500, 900 + wucht * 0.35) * k;
        let vx = nx / rl * V, vy = ry / rl * V, t = 0, dreh = 0, spin = (vx >= 0 ? 1 : -1) * (900 + Math.random() * 300), gefangen = 0;
        const G = 1900 * k, links = vx < 0;
        const ziel = () => {
          const frei = sitze.map((_, i) => i).filter((i) => sichtbar(i));
          frei.sort((a, b) => Math.abs(sitzPunkt(b).x - B.x) - Math.abs(sitzPunkt(a).x - B.x));
          return frei.length ? frei[0] : -1;
        };
        const ankommen = (i) => { fliegt = false; flug.style.rotate = ''; moewe.classList.remove('trudelt'); if (i >= 0) fliegen(i, true); else { moewe.classList.remove('fliegt'); naechsterFlug = performance.now() + 4000; } };
        setTimeout(() => {
          moewe.classList.add('fliegt', 'trudelt'); moewe.classList.toggle('links', links);
          laufen((dt) => {
            t += dt;
            if (!gefangen) {
              vx *= Math.exp(-1.1 * dt); vy = vy * Math.exp(-1.1 * dt) + G * dt;
              spin *= Math.exp(-1.9 * dt); dreh += spin * dt;
              // Am Scheitel fängt sie sich: Die Flügel greifen wieder Luft, der Überschlag läuft aus.
              if (t > 0.5 && vy > -120 * k) { gefangen = t; moewe.classList.remove('trudelt'); }
            } else {
              vx *= Math.exp(-3.5 * dt); vy = vy * Math.exp(-5 * dt) + G * 0.12 * dt;
              const aufrecht = Math.round(dreh / 360) * 360; dreh += (aufrecht - dreh) * (1 - Math.exp(-9 * dt));
            }
            M.x += vx * dt; M.y += vy * dt;
            stellen(); flug.style.rotate = `${dreh.toFixed(1)}deg`;
            const sichtOben = scrollY - oben;
            const draussen = M.x < -w * 0.7 || M.x > W + w * 0.7 || M.y < sichtOben - h * 0.4 || M.y < -h * 0.4;
            if (draussen) {
              // Aus dem Bild geschossen: Kurz Ruhe, dann kommt sie von der Seite zurück, mit Wut im Bauch.
              moewe.style.visibility = 'hidden'; fliegt = true;
              setTimeout(() => {
                mass();
                const i = ziel();
                if (i < 0) { moewe.style.visibility = ''; ankommen(-1); return; }
                const q = sitzPunkt(i), vonLinks = q.x > W / 2 ? false : true;
                M.x = vonLinks ? -w * 0.6 : W + w * 0.6; M.y = Math.max(scrollY - oben + innerHeight * 0.25, q.y - innerHeight * 0.45);
                moewe.style.visibility = ''; stellen(); ankommen(i);
              }, 1500 + Math.random() * 700);
              return false;
            }
            if (gefangen && t - gefangen > 0.38) { ankommen(ziel()); return false; }
            return true;
          });
        }, 110);
      };
      if (moewe) {
        moewe.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse' && !fliegt) haltung('frech', 1500); });
        moewe.addEventListener('pointerdown', () => { if (reduced.matches || !sitze.length) { haltung('frech', 1800); return; } haltung('schreck', 260); setTimeout(wegfliegen, 180); });
      }
      // Mit Skript übernimmt sie ihren Platz selbst: der sichtbare Platz, der ihrer Startstelle am nächsten liegt.
      if (moewe && sitze.length && !reduced.matches) {
        mass();
        const r = moewe.getBoundingClientRect(), f = feld.getBoundingClientRect(), fussX = r.left - f.left + 0.547 * r.width;
        let best = -1, d = Infinity;
        sitze.forEach((_, i) => { if (sichtbar(i)) { const q = sitzPunkt(i), e = Math.abs(q.x - fussX); if (e < d) { d = e; best = i; } } });
        if (best >= 0) { moewe.classList.add('frei'); setzen(best); }
        new IntersectionObserver((es) => { imBild = es[0].isIntersecting; if (imBild && !naechsterFlug) naechsterFlug = performance.now() + 6000 + Math.random() * 4000; }, { threshold: 0.2 }).observe(feld);
        setInterval(() => { if (imBild && !fliegt && platz >= 0 && naechsterFlug && performance.now() > naechsterFlug && B.lage !== 'frei' && !document.hidden) wegfliegen(); }, 1000);
        addEventListener('resize', () => { if (fliegt || platz < 0) return; mass(); if (!sichtbar(platz)) { const i = sitze.findIndex((_, j) => sichtbar(j)); if (i >= 0) platz = i; } setzen(platz); });
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
        const G = 2600 * s, n = Math.ceil(dt / (1 / 240)), h = dt / n, segs = kanten();
        let kontakt = null;
        for (let i = 0; i < n; i++) {
          B.vy += G * h;
          B.x += B.vx * h; B.y += B.vy * h;
          if (B.x < B.r) { B.x = B.r; B.vx = Math.abs(B.vx) * 0.6; }
          if (B.x > W - B.r) { B.x = W - B.r; B.vx = -Math.abs(B.vx) * 0.6; }
          kontakt = null;
          for (const [x1, y1, x2, y2] of segs) {
            const dx = x2 - x1, dy = y2 - y1, t = Math.max(0, Math.min(1, ((B.x - x1) * dx + (B.y - y1) * dy) / (dx * dx + dy * dy)));
            const ex = B.x - (x1 + t * dx), ey = B.y - (y1 + t * dy), d = Math.hypot(ex, ey);
            if (d >= B.r || d === 0) continue;
            // Normale von der Fläche zum Ball; der Ball wird hinausgeschoben.
            const nx = ex / d, ny = ey / d;
            B.x += nx * (B.r - d); B.y += ny * (B.r - d);
            const vn = B.vx * nx + B.vy * ny;
            if (vn < 0) {
              const tx = -ny, ty = nx, vt = B.vx * tx + B.vy * ty, prall = -vn;
              // Harte Treffer springen zurück, ganz leichte nicht: So kommt er zur Ruhe, statt endlos zu zittern.
              const e = prall > 140 * s ? 0.62 : 0;
              if (prall > 260 * s) {
                titel.stoss(B.x + links, B.y + B.r + oben, Math.min(0.5, prall / (3000 * s)));
                if (moeweBox && Math.abs(B.x - (moeweBox.x + moeweBox.w / 2)) < B.r * 6 && moewe.dataset.lage !== 'schreck') haltung('frech', 1800);
                B.q = Math.min(0.2, prall / (7000 * s)); B.qv = 0; B.qa = Math.atan2(ny, nx);
              }
              B.vx = tx * vt + nx * prall * e; B.vy = ty * vt + ny * prall * e;
            }
            kontakt = { nx, ny };
          }
          if (kontakt) {
            // Rollwiderstand bremst gleichmäßig. Der Drall passt sich der Bahn an: Er rollt, statt zu rutschen.
            const tx = -kontakt.ny, ty = kontakt.nx, vn = B.vx * kontakt.nx + B.vy * kontakt.ny, brems = 70 * s * h;
            let vt = B.vx * tx + B.vy * ty;
            vt = Math.abs(vt) <= brems ? 0 : vt - Math.sign(vt) * brems;
            B.vx = tx * vt + kontakt.nx * vn; B.vy = ty * vt + kontakt.ny * vn;
            B.w += (vt / B.r - B.w) * (1 - Math.exp(-25 * h));
          } else B.w *= Math.exp(-0.3 * h);
          B.rot += B.w * h;
          B.qv += (-340 * B.q - 16 * B.qv) * h; B.q += B.qv * h;
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
              // Wie hart der Ball trifft, entscheidet: ein Stups scheucht sie auf, ein echter Schuss schießt sie weg.
              const wucht = Math.hypot(B.vx, B.vy) / s, mx = moeweBox.x + moeweBox.w / 2 - B.x, my = moeweBox.y + moeweBox.h * 0.45 - B.y, ml = Math.hypot(mx, my) || 1;
              B.vy = -Math.abs(B.vy) * 0.4; B.vx = weg * Math.max(380 * s, Math.abs(B.vx) * 0.7);
              B.x = weg < 0 ? Math.min(B.x, moeweBox.x - B.r * 0.2) : Math.max(B.x, moeweBox.x + moeweBox.w + B.r * 0.2);
              if (wucht > 420) abschuss(mx / ml, my / ml, wucht);
              else { haltung('schreck', 300); setTimeout(wegfliegen, 240); }
            }
          }
        }
        zeigen();
        // Zur Ruhe kommt er nur auf flachem Boden. Auf einer Schräge oder einer Ecke rollt er weiter.
        if (kontakt && kontakt.ny < -0.985 && Math.hypot(B.vx, B.vy) < 5 * s && Math.abs(B.q) < 0.01) {
          B.vx = 0; B.vy = 0; B.w = 0; B.q = 0; B.lage = 'ruhe';
          // Liegt der Ball dort, wo die Möwe steht, macht sie Platz.
          if (moewe && platz >= 0 && !fliegt && Math.abs(M.x - B.x) < B.r * 3.2) setTimeout(wegfliegen, 350);
          return false;
        }
        return true;
      };
      const herein = () => {
        mass();
        // Ist die Oberkante des Kapitels noch im Bild, fiele der Ball sichtbar aus der Kante zur Landung.
        // Dann wartet er, bis sie aus dem Bild ist, oder bis man unten angekommen ist.
        const amEnde = () => scrollY + innerHeight >= document.documentElement.scrollHeight - 2;
        if (scrollY < oben && !amEnde()) {
          const nochmal = () => { if (scrollY >= oben || amEnde()) { removeEventListener('scroll', nochmal); herein(); } };
          addEventListener('scroll', nochmal, { passive: true });
          return;
        }
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
        // Weitere Ziele bekommen einen höheren, längeren Bogen. Der Ball fliegt mit Drall in Flugrichtung.
        const G = 2600 * s, T = Math.min(1, Math.max(0.5, 0.42 + Math.hypot(tx - B.x, ty - B.y) / (2400 * s)));
        B.vx = (tx - B.x) / T; B.vy = (ty - B.y) / T - 0.5 * G * T; B.w = Math.sign(B.vx || 1) * 9; B.lage = 'frei';
        haltung('schreck', 500);
        laufen(physik);
      };
      ball.addEventListener('click', schuss);
      // Für die Prüfskripte (nur mit ?debug): den Abschuss der Möwe direkt auslösen.
      if (/[?&]debug\b/.test(location.search)) {
        feld.__abschuss = abschuss;
        // Ball an eine Stelle des unteren Bildes setzen und fallen lassen (Bruchteile wie data-boden).
        feld.__ball = (fx, fy, vx = 0) => { mass(); B.x = unten.x + fx * unten.w; B.y = unten.y + fy * unten.h; B.vx = vx * s; B.vy = 0; B.w = 0; B.lage = 'frei'; laufen(physik); };
      }
      ball.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); schuss(); } });
      // Das untere Bild ist am Handy breiter als der Bildschirm, darum eine niedrige Schwelle.
      new IntersectionObserver((es, io) => { if (es[0].isIntersecting) { io.disconnect(); herein(); } }, { threshold: 0.12 }).observe(bild);
      addEventListener('resize', () => { if (B.lage === 'ruhe') { const fx = B.x / W; mass(); B.x = fx * W; ruhen(); } });
      reduced.addEventListener('change', () => { if (reduced.matches && B.lage !== 'warten') ruhen(); });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
