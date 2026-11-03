import * as THREE from '../vendor/three/three.module.js';
import { FontLoader } from '../vendor/three/FontLoader.js';
import { RoomEnvironment } from '../vendor/three/RoomEnvironment.js';
import { buildGull } from './gull.js';
import { buildFeathers } from './feathers.js';
import { planeAtlas } from './plane.js';

// Bühnenmaße und Kamera entsprechen dem freigegebenen Entwurf (1440 x 756).
const W = 1440, H = 756, F = 1500, CX = W / 2, CY = H / 2;
const BALL_R = 78, FLOOR = 704, GRAV = 2600, BOUNCE = 0.7, STEP = 1 / 240, FRONT = 430;
const REST = { x: 1128, y: FLOOR - BALL_R };
const RING_C = { x: 957, y: 297 };
const HOLE = [[1120, 52], [1205, 130], [1197, 205], [1160, 290], [1105, 365], [1045, 430], [975, 490], [900, 535], [830, 552], [778, 545], [748, 510], [742, 440], [758, 345], [790, 262], [838, 196], [900, 135], [975, 92], [1050, 65]];
const RING = [[800, 0], [1400, 0], [1405, 180], [1392, 290], [1352, 400], [1320, 442], [1296, 482], [1250, 542], [1200, 592], [1110, 640], [1000, 652], [800, 646], [690, 632], [615, 605], [575, 530], [555, 430], [590, 320], [640, 200]];
// Alle Zeilen liegen auf einer Fläche: gleiche Flucht, gleiche Größe, gleichmäßiger Zeilenabstand.
const VP = [3500, 556];
const BLOCK = [[120, 91], [1006, 213], [1012, 590], [108, 602]];
const BLOCK_W = 501, BLOCK_H = 182 + 66.6;
const LINES = [
  { text: 'My', y: 182, s: 1 },
  { text: 'Mallorca', y: 90, s: 1 },
  { text: 'Summer', y: 0, s: 1.0366, track: 1.2 },
];
// Optischer Ausgleich je Buchstabenpaar, gemessen an den Umrissen (bei Schriftgröße 100).
const KERN = { My: 0.7, Ma: -0.1, al: 2.4, ll: 4, lo: 3.6, or: 2.8, rc: 4.2, ca: 2.6, Su: 0, um: 3.7, mm: 2.9, me: 3.5, er: 2.1 };
// Der Satz steht klein auf der Terrasse. Die Möwe tauscht „Arbeiten“ und „Urlaub machen“, Komma und Punkt bleiben stehen.
const KLEIN = { Ar: 3.7, rb: 0.7, be: 4.9, ei: 2.2, it: 3.1, te: 0.4, en: 2.1, ar: 2.1, wo: 3.7, an: 2.1, nd: 4.2, de: 3.7, er: 2.1, re: 4.4, Ur: -1.8, rl: -0.4, la: 1.6, au: 2.7, ub: 4.6, ma: 2.3, ac: 2.6, ch: 1.5, he: 3.5 };
// Seit 03.11.2026 (Ike): „Dein Sommer. Deine Bühne. Dein Job.“ Die Möwe setzt sich auf das letzte „Dein“ und dreht sein D zum M:
// „Mein Job.“ Der Ball holt es zurück. Die Wörter bleiben stehen, ORDER_B ist nur noch die alte Schnittstelle.
const CLAIM_TOK = [['s1', 'Dein'], ['s2', 'Sommer.'], ['b1', 'Deine'], ['b2', 'Bühne.'], ['work', 'Dein'], ['job', 'Job.']];
const ORDER_A = ['s1', 's2', 'b1', 'b2', 'work', 'job'], ORDER_B = ORDER_A;
const edgeToVP = (x, y, to) => y + (VP[1] - y) / (VP[0] - x) * (to - x);
const CLAIM_QUAD = [[116, 644], [1012, edgeToVP(116, 644, 1012)], [1014, edgeToVP(112, 682, 1014)], [112, 682]];
const HIT_LINES = ['Treffer! Jetzt bewerben?', 'Schon wieder. Das ist ein Zeichen.', 'Drei Treffer! Jetzt aber bewerben.', 'Okay, du kannst zielen. Bewerben?'];
const GULL_D = 650, GULL_S = 72, CLAIM_G = 5000, CLAIM_LINE = 86;

const params = new URLSearchParams(location.search);
const debug = params.has('debug');
const root = document.documentElement;
const hero = document.querySelector('.hero');
const track = document.querySelector('.track');
const canvas = document.querySelector('.gl');
const landung = document.querySelector('.landung');
const bottom = document.querySelector('.bottom');
const formLink = document.querySelector('.form-link');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const inPoly = (p, x, y) => { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, yi] = p[i], [xj, yj] = p[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };

// --- Menü und Bewerben ---
let stickerSpin = null;
const stick = { el: document.querySelector('.apply'), x: 0, y: 0, r: 0, vx: 0, vy: 0, vr: 0, cx: 0, cy: 0, R: 60, cool: 0, hits: 0, active: false, timer: 0 };
// Die Wörter geben unter dem Zeiger nach wie Wasser unter der Hand und schwappen ein wenig nach.
const water = { on: false, x: -9999, y: -9999, items: [] };
function measureWater() {
  for (const it of water.items) { const r = it.el.getBoundingClientRect(); it.cx = r.left + r.width / 2 - it.x; it.cy = r.top + r.height / 2 - it.y; }
}
function stepWater(dt) {
  if (reduced.matches || !water.items.length) return;
  const h = Math.min(dt, 1 / 40);
  for (const it of water.items) {
    const dx = it.cx - water.x, dy = it.cy - water.y;
    const g = water.on ? Math.exp(-(dx * dx) / (2 * 48 * 48) - (dy * dy) / (2 * 40 * 40)) : 0;
    const side = clamp(dx / 26, -1, 1);
    const cy = (it.prev ? it.prev.y - it.y : 0) + (it.next ? it.next.y - it.y : 0);
    it.vy += (120 * (-5.2 * g - it.y) + 46 * cy - 12.5 * it.vy) * h;
    it.vx += (120 * (2.6 * side * g - it.x) - 12.5 * it.vx) * h;
    it.y += it.vy * h; it.x += it.vx * h;
    const moving = Math.abs(it.y) > 0.02 || Math.abs(it.x) > 0.02 || Math.abs(it.vy) > 0.05;
    if (moving) { it.el.style.translate = `${it.x.toFixed(2)}px ${it.y.toFixed(2)}px`; it.live = true; }
    else if (it.live) { it.el.style.translate = ''; it.live = false; it.x = 0; it.y = 0; it.vx = 0; it.vy = 0; }
  }
}
function initUi() {
  // Der WhatsApp-Link steht nur einmal im Dokument, am Aufkleber. Alle anderen Knöpfe holen ihn von dort.
  const waLink = document.querySelector('.apply').href;
  document.querySelectorAll('[data-wa]').forEach((a) => { a.href = waLink; });
  // Menü im Hochformat: geht als Sonne auf, schließt mit Klick, Link oder Esc.
  const menuBtn = document.getElementById('menu-btn'), nav = document.getElementById('nav');
  const setMenu = (on) => {
    if (on === root.classList.contains('menu-open')) return;
    root.classList.toggle('menu-open', on);
    menuBtn.setAttribute('aria-expanded', String(on));
    if (on) nav.querySelector('a').focus({ preventScroll: true }); else menuBtn.focus({ preventScroll: true });
  };
  menuBtn.addEventListener('click', () => setMenu(!root.classList.contains('menu-open')));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
  matchMedia('(orientation: landscape)').addEventListener('change', () => setMenu(false));
  // Nur die Klapp-Wörter des Heros; die übrigen Kapitel baut site.js.
  const keyed = document.querySelectorAll('.hero [data-key]');
  for (const el of keyed) {
    const word = el.textContent;
    el.setAttribute('aria-hidden', 'true');
    el.parentElement.setAttribute('aria-label', el.parentElement.getAttribute('aria-label') || word);
    el.textContent = '';
    // Jeder Buchstabe hat zwei Seiten: Beim Überfahren klappt die farbige nach vorn.
    // Die farbige Seite zeichnet CSS aus data-c, so steht jeder Buchstabe nur einmal im Text (sauberes Kopieren).
    [...word].forEach((c, i) => {
      const s = document.createElement('span'); s.className = 'ch'; s.style.setProperty('--i', i);
      const f = document.createElement('span'); f.className = 'f'; f.textContent = c; s.dataset.c = c; s.append(f);
      el.append(s);
    });
  }
  // Einzeln gesetzte Buchstaben verlieren das Kerning der Schrift, also messen wir es nach.
  const ctx = document.createElement('canvas').getContext('2d');
  document.fonts?.ready.then(() => {
    for (const el of keyed) {
      const cs = getComputedStyle(el);
      ctx.font = `${cs.fontWeight} 100px ${cs.fontFamily}`;
      if ('fontKerning' in ctx) ctx.fontKerning = 'normal';
      const chs = el.querySelectorAll('.ch');
      chs.forEach((c, i) => {
        if (!i) return;
        const a = chs[i - 1].textContent[0], b = c.textContent[0];
        const k = ctx.measureText(a + b).width - ctx.measureText(a).width - ctx.measureText(b).width;
        if (Math.abs(k) > 0.05) c.style.marginLeft = `${(k / 100).toFixed(4)}em`;
      });
    }
  });
  // Variante Welle: dieselbe Tastenbewegung wie im großen Schriftzug, nur klein.
  const press = (el) => {
    if (reduced.matches) return;
    el.querySelectorAll('.ch').forEach((c, i) => c.animate(
      [{ translate: '0 0' }, { translate: '0 .16em', offset: 0.42 }, { translate: '0 -.03em', offset: 0.8 }, { translate: '0 0' }],
      { duration: 820, delay: i * 40, easing: 'cubic-bezier(.33,0,.2,1)' },
    ));
  };
  document.querySelectorAll('.links a').forEach((a) => {
    a.addEventListener('pointerenter', () => { if (root.dataset.nav === 'welle') press(a); });
    a.addEventListener('focus', () => { if (root.dataset.nav === 'welle') press(a); });
  });

  // Variante Ball: Der kleine Volleyball landet auf dem Wort, erst dann gibt es nach.
  const links = document.querySelector('.links');
  const hop = links.querySelector('.hop');
  const go = (a) => {
    const r = a.getBoundingClientRect(), p = links.getBoundingClientRect();
    links.style.setProperty('--hx', `${r.left - p.left + r.width / 2}px`);
    links.classList.add('on');
    if (!reduced.matches && root.dataset.nav === 'ball') hop.animate(
      [{ translate: '0 0', scale: '1.2 .8' }, { translate: '0 -16px', scale: '.94 1.06', offset: 0.45 }, { translate: '0 0', scale: '1.22 .78', offset: 0.88 }, { translate: '0 0', scale: '1 1' }],
      { duration: 460, easing: 'cubic-bezier(.3,.7,.4,1)' },
    );
  };
  links.querySelectorAll('a').forEach((a) => { a.addEventListener('pointerenter', () => go(a)); a.addEventListener('focus', () => go(a)); });
  links.addEventListener('pointerleave', () => links.classList.remove('on'));

  // Bewerben: Sonne mit Strahlen, die sich langsam dreht und beim Überfahren Fahrt aufnimmt.
  const apply = document.querySelector('.apply');
  const burst = apply.querySelector('.burst');
  const N = 14, R = 58;
  let d = '';
  for (let i = 0; i <= 420; i++) {
    const a = (i / 420) * Math.PI * 2;
    const r = R * (0.83 + 0.17 * Math.pow(0.5 + 0.5 * Math.cos(N * a), 1.5));
    d += `${i ? 'L' : 'M'}${(Math.cos(a) * r).toFixed(2)} ${(Math.sin(a) * r).toFixed(2)}`;
  }
  burst.querySelector('path').setAttribute('d', `${d}Z`);
  let spin = null;
  if (!reduced.matches && burst.animate) {
    spin = burst.animate([{ rotate: '0deg' }, { rotate: '360deg' }], { duration: 42000, iterations: Infinity });
    stickerSpin = spin;
    apply.addEventListener('pointerenter', () => spin.updatePlaybackRate(7));
    apply.addEventListener('pointerleave', () => spin.updatePlaybackRate(1));
    reduced.addEventListener('change', () => { if (reduced.matches) spin.cancel(); });
  }
  if (finePointer.matches) {
    apply.addEventListener('pointermove', (e) => {
      if (reduced.matches) return;
      const r = apply.getBoundingClientRect();
      apply.style.translate = `${(e.clientX - r.left - r.width / 2) * 0.14}px ${(e.clientY - r.top - r.height / 2) * 0.14}px`;
    });
    apply.addEventListener('pointerleave', () => { apply.style.translate = ''; });
  }
  // Die Klappen laufen von der Seite los, von der die Hand kommt.
  document.querySelectorAll('.links > a, .apply, .discover, .form-link').forEach((a) => {
    const chs = a.querySelectorAll('.ch');
    const aim = (e) => { const r = a.getBoundingClientRect(), left = e.clientX < r.left + r.width / 2; chs.forEach((c, i) => c.style.setProperty('--i', left ? i : chs.length - 1 - i)); };
    a.addEventListener('pointerenter', aim);
    a.addEventListener('pointerleave', aim);
    if (!finePointer.matches) return;
    let prev = null;
    for (const el of chs) { const it = { el, cx: 0, cy: 0, x: 0, y: 0, vx: 0, vy: 0, prev, next: null, live: false }; if (prev) prev.next = it; prev = it; water.items.push(it); }
  });
  addEventListener('pointermove', (e) => { water.x = e.clientX; water.y = e.clientY; water.on = e.pointerType !== 'touch'; }, { passive: true });
  root.addEventListener('pointerleave', () => { water.on = false; });
  document.fonts?.ready.then(measureWater);
}
initUi();
// Ein harter Aufprall des Balls ist bis ins Menü zu spüren.
let lastBump = 0;
function bumpMenu(amp) {
  const now = performance.now();
  if (reduced.matches || now - lastBump < 420) return;
  lastBump = now;
  document.querySelectorAll('.links .ch').forEach((c, i) => c.animate(
    [{ translate: '0 0' }, { translate: `0 ${(-0.24 * amp).toFixed(3)}em`, offset: 0.4 }, { translate: '0 0' }],
    { duration: 540, delay: i * 14, easing: 'cubic-bezier(.33,0,.2,1)' },
  ));
}

// --- Szene ---
const PLATE_FRAG = /* glsl */`
  precision highp float;
  uniform sampler2D tPlate, tMaps, tShadow, tNoise, tBanner;
  uniform vec2 uPlane;
  uniform vec4 uPlaneT;
  uniform vec4 uView, uBall, uRipple, uPulse, uGullShadow;
  uniform vec2 uMouse, uRevealC, uShadowOff, uPtr, uC, uTarget;
  uniform float uMirror, uTime, uDawn, uReveal, uFlare, uGust, uStretch, uSheen, uZoom, uBlur, uHole, uFx, uBallShadow, uFlock;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  // Das Muster für Wolken und Wasser kommt aus einer festen Vorlage. Eine reine Rechenformel rundet auf jeder Grafikkarte anders,
  // dann passen die Zellen an den Kanten nicht zusammen und es entstehen harte Kästen.
  float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return texture2D(tNoise, (i + f + .5) / 256.).r; }
  vec3 plate(vec2 p) { return texture2D(tPlate, vec2(clamp(p.x / 1440., .001, .999), 1. - clamp(p.y / 756., .001, .999))).rgb; }
  float cap(vec2 p, vec2 a, vec2 b, float r0, float r1) { vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.); return length(pa - ba * h) - mix(r0, r1, h); }
  // Ein Vogel von weitem, dieselbe Figur wie die große Möwe: runder Körper, Kopf mit gelbem Schnabel, kräftige Flügel mit dunkler Spitze.
  vec3 farGull(vec3 c, vec2 g, float flap, float m, float aa) {
    vec2 u = vec2(g.x, -g.y), ax = vec2(abs(u.x), u.y);
    vec2 sh = vec2(.08, .08), wr = vec2(.46, .17 + .36 * flap), tp = vec2(1., .13 + .68 * flap - .14 * abs(flap));
    float d = min(cap(ax, sh, wr, .19, .145), cap(ax, wr, tp, .145, .028));
    float line = ax.x < wr.x ? mix(sh.y, wr.y, clamp((ax.x - sh.x) / (wr.x - sh.x), 0., 1.)) : mix(wr.y, tp.y, (ax.x - wr.x) / (tp.x - wr.x));
    vec3 wing = mix(vec3(1., .98, .94), vec3(.5, .59, .7), smoothstep(-.04, .07, ax.y - line) * .9);
    wing = mix(wing, vec3(.11, .13, .18), smoothstep(.66, .8, ax.x));
    c = mix(c, wing, smoothstep(aa, -aa, d) * m);
    c = mix(c, vec3(1., .98, .94), smoothstep(aa, -aa, cap(u, vec2(-.18, .0), vec2(-.46, -.03), .115, .04)) * m);
    vec3 body = mix(vec3(1., .985, .95), vec3(.96, .78, .62), smoothstep(.07, -.17, u.y));
    c = mix(c, body, smoothstep(aa, -aa, cap(u, vec2(-.15, .0), vec2(.13, .02), .16, .21)) * m);
    c = mix(c, vec3(1., .985, .95), smoothstep(aa, -aa, length(u - vec2(.27, .14)) - .16) * m);
    return mix(c, vec3(1., .75, .1), smoothstep(aa, -aa, cap(u, vec2(.38, .125), vec2(.62, .075), .072, .026)) * m);
  }
  // Der Werbeflieger. Er fliegt nach links, das Banner weht hinterher. b ist der Abstand zur Mitte des Flugzeugs.
  // Die Bilder sind vormultipliziert: So entsteht beim Verkleinern kein dunkler Rand ums Banner.
  vec3 planeBanner(vec3 c, vec2 b, float m, float px) {
    float aa = px / uPlaneT.z * 1.1, u = (b.x - 66.) / 250.;
    float line = min(cap(b, vec2(40., -1.), vec2(66., -14.), .36, .36), cap(b, vec2(40., -1.), vec2(66., 14.), .36, .36));
    c = mix(c, vec3(.2, .24, .3), smoothstep(aa, -aa, line) * m * .85);
    if (u > 0. && u < 1.) {
      float ph = u * 15. - uTime * 5.2, wave = sin(ph) * (1.1 + u * 3.) + sin(u * 31. - uTime * 8.) * .55 * u;
      float v = (b.y - wave - uPlaneT.w * u * u) / 32. + .5;
      if (v > 0. && v < 1.) {
        vec4 t = texture2D(tBanner, vec2(u, 1. - v * 132. / 512.));
        c = c * (1. - t.a * m) + t.rgb * (1. + .2 * cos(ph) * (.35 + u * .65)) * m;
      }
    }
    vec2 pu = (b + vec2(50., 25.)) / vec2(100., 50.);
    if (pu.x > 0. && pu.x < 1. && pu.y > 0. && pu.y < 1.) {
      float f = step(.5, fract(uTime * 8.));
      vec4 t = texture2D(tBanner, vec2((pu.x + f) * .5, 1. - (160. + pu.y * 256.) / 512.));
      c = c * (1. - t.a * m) + t.rgb * m;
    }
    return c;
  }
  float pane(vec2 d) { return 1. - smoothstep(.7, 1.3, length(d * vec2(.42, .2))); }
  // Das Segelboot, dieselbe Bildsprache wie der Rest: Großsegel mit Bauch und Schatten, davor ein bunter Spinnaker in den Farben des Balls.
  // d ist der Abstand zur Wasserlinie mittschiffs: x nach vorn, y nach unten.
  vec4 sailBoat(vec2 d) {
    vec3 c = vec3(0.); float a = 0.;
    float t = (d.y + 36.) / 27.;
    if (t > 0. && t < 1.) {
      float leech = -1.9 - 11.5 * pow(t, .95) - 2.8 * sin(3.14159 * t), u = clamp((-1.9 - d.x) / max(.6, -1.9 - leech), 0., 1.);
      float cov = clamp(min(-1.9 - d.x, d.x - leech) + .5, 0., 1.) * clamp((1. - t) * 27. + .5, 0., 1.);
      vec3 cloth = mix(vec3(1., .98, .93), vec3(.7, .73, .85), smoothstep(.05, 1., u) * .9);
      cloth *= 1. - .1 * (1. - smoothstep(.0, .09, abs(fract(t * 4. + u * .35) - .5)));
      c = mix(c, cloth, cov); a = max(a, cov);
    }
    float ts = (d.y + 35.) / 28.;
    if (ts > 0. && ts < 1.) {
      float sa = 3.14159 * pow(ts * .88, .82), front = -.7 + (18. + sin(uTime * .9) * .5) * pow(sin(sa), .85), back = -.7 + 3.4 * sin(sa);
      float v = (d.x - back) / max(.6, front - back), s = ts + .1 * (v - .45) * (v - .45);
      float cov = clamp(min(d.x - back, front - d.x) + .5, 0., 1.) * clamp((1. - ts) * 28. + .5, 0., 1.);
      vec3 sp = mix(vec3(.91, .26, .5), vec3(1., .79, .12), smoothstep(.27, .3, s));
      sp = mix(sp, vec3(.98, .94, .85), smoothstep(.51, .54, s));
      sp = mix(sp, vec3(.05, .5, .68), smoothstep(.75, .78, s));
      sp *= mix(.66, 1.1, smoothstep(.0, .62, v)) * mix(1.04, .9, smoothstep(.2, 1., ts));
      c = mix(c, sp, cov); a = max(a, cov);
    }
    float mast = clamp(.72 - abs(d.x + 1.4), 0., 1.) * smoothstep(-39., -38.4, d.y) * step(d.y, -4.);
    c = mix(c, vec3(.3, .22, .18), mast); a = max(a, mast);
    float boom = clamp(.6 - abs(d.y + 8.3 + (d.x + 1.4) * .03), 0., 1.) * step(-15.5, d.x) * step(d.x, -1.4);
    c = mix(c, vec3(.3, .22, .18), boom); a = max(a, boom);
    float flag = clamp(min(d.x + 1.4, -d.x - 1.4 + 4.6 - abs(d.y + 37.6) * 2.8) + .5, 0., 1.) * step(abs(d.y + 37.6), 1.5);
    c = mix(c, vec3(.91, .26, .5), flag); a = max(a, flag);
    float cab = clamp(min(min(d.x + 7.5, 2.5 - d.x), d.y + 7.3) + .5, 0., 1.) * step(d.y, -3.5);
    vec3 cabin = mix(vec3(.97, .93, .84), vec3(.12, .16, .22), step(-6.4, d.y) * step(d.y, -5.5) * step(.4, fract(d.x * .42)));
    c = mix(c, cabin, cab); a = max(a, cab);
    float sheer = -4.5 - 2.2 * smoothstep(2., 15., d.x) - .9 * smoothstep(-6., -14., d.x);
    float stern = -14.5 + 2.2 * clamp((d.y + 5.) / 5., 0., 1.), bow = 16.6 - 4.4 * clamp((d.y + 6.6) / 6.6, 0., 1.);
    float hull = clamp(min(min(d.x - stern, bow - d.x), min(d.y - sheer, .5 - d.y)) + .5, 0., 1.);
    vec3 paint = mix(vec3(.99, .97, .92), vec3(.04, .22, .38), smoothstep(-2.5, -1.9, d.y));
    paint = mix(vec3(.91, .26, .5), paint, smoothstep(.7, 1.15, d.y - sheer));
    paint *= mix(.8, 1.06, smoothstep(-14., 9., d.x));
    c = mix(c, paint, hull); a = max(a, hull);
    return vec4(c, a);
  }
  void main() {
    vec2 sv = vec2(uView.x + vUv.x * uView.z, uView.y + (1. - vUv.y) * uView.w);
    vec2 st = uC + (sv - uTarget) / uZoom;
    vec2 q = st; float ext = 0.;
    if (uStretch < 1. && st.y > 640.) {
      float d = st.y - 640., L = 60.;
      float qd = d < L ? d - (1. - uStretch) * d * d / (2. * L) : L * (1. + uStretch) / 2. + (d - L) * uStretch;
      q.y = 640. + qd; ext = max(0., q.y - 756.) / uStretch;
    }
    // Im Hochformat läuft die Terrasse unten gespiegelt weiter, statt zu verschwimmen.
    if (uMirror > .5 && q.y > 755.) q.y = 1510. - q.y;
    q = clamp(q, vec2(1.), vec2(1439., 755.));
    vec3 m = texture2D(tMaps, vec2(q.x / 1440., 1. - q.y / 756.)).rgb;
    float depth = m.r, water = m.g, ring = smoothstep(.72, .92, m.b), boat = smoothstep(.2, .42, m.b) * (1. - ring);
    vec2 p = q + uMouse * (depth - .25) * vec2(9., 6.);

    float palm = smoothstep(.88, .98, depth);
    p.x += palm * sin(uTime * .9 + q.y * .02) * (1.3 + uGust * 5.) * (q.y / 260.);
    p.y += palm * cos(uTime * .7 + q.x * .012) * (.7 + uGust * 2.5);
    p += boat * vec2(sin(uTime * .6) * .9, sin(uTime * 1.05) * 1.5);
    // Der Saum des Sonnendachs bewegt sich im Wind.
    p.y += boat * smoothstep(432., 442., q.y) * (1. - smoothstep(444., 454., q.y)) * sin(q.x * .32 + uTime * 3.4) * 1.2;

    float pr = smoothstep(262., 620., q.y);
    if (water > .001) {
      vec2 w = vec2(q.x * .012, q.y * .05) / (.3 + pr);
      float n1 = noise(w + vec2(uTime * .22, uTime * .3)) - .5, n2 = noise(w * 2.1 - vec2(uTime * .35, uTime * .2)) - .5;
      p += water * vec2(n1 * 1.3, n2 * 2.6) * (.6 + pr * 2.);
      if (uRipple.w < 3.) {
        vec2 rd = (q - uRipple.xy) * vec2(1., 2.4); float rl = length(rd);
        float rw = sin(rl * .16 - uRipple.w * 9.) * exp(-rl * .012) * exp(-uRipple.w * 1.3) * smoothstep(uRipple.w * 190. + 20., uRipple.w * 190. - 20., rl);
        p += water * normalize(rd + .001) * rw * 5.;
      }
    }
    float shade = smoothstep(590., 640., q.y) * (1. - smoothstep(620., 760., q.x));
    p += shade * vec2(sin(uTime * .55 + q.y * .03) * 1.7, cos(uTime * .4 + q.x * .02) * .7);

    vec3 col = plate(p);
    if (uBlur > .001) {
      vec3 acc = col; vec2 dir = st - uC;
      for (int i = 1; i <= 5; i++) acc += plate(p - dir * uBlur * float(i) / 5.);
      col = acc / 6.;
    }
    if (water > .001) {
      float sp = noise(vec2(q.x * .35, q.y * .9) + vec2(uTime * .6, -uTime * .3)) * noise(vec2(q.x * .11, q.y * .3) - uTime * .25);
      col += water * pow(sp, 4.) * .85 * (.25 + pr);
    }
    // Der Himmel lebt: ziehende Wolken, Möwen, und draußen auf dem Meer ein Segel. Alles liegt hinter Kathedrale und Ring.
    float blue = smoothstep(.2, .5, col.b - col.r);
    // Zwischen Ufer und Horizont liegt Wasser, auch wenn die Tiefenkarte dort flach ist: Bis dahin reicht der Himmel, nicht weiter.
    float skyCut = mix(226., 261., smoothstep(700., 780., q.x));
    // Die Grenze zu Kathedrale und Palme kommt aus dem Bild selbst, nicht aus der gröberen Tiefenkarte. So bleibt kein blauer Saum stehen.
    float landBand = smoothstep(.1, .15, depth) * (1. - smoothstep(.22, .3, depth));
    float sky = smoothstep(.12, .26, col.b - col.r) * smoothstep(.62, .8, col.b) * (1. - landBand) * (1. - smoothstep(skyCut - 3., skyCut, q.y));
    if (sky > .005) {
      // Das Muster wird verzerrt und jede Lage gedreht: So verschwindet das Raster, und die Wolken bleiben weich.
      vec2 cp = vec2(p.x * .0038 + uTime * .011, p.y * .012 - uTime * .0016);
      cp += vec2(noise(cp * 1.3 + 3.1), noise(cp * 1.3 + 7.7)) * 1.15;
      float cl = noise(cp) * .5 + noise(mat2(.8, .6, -.6, .8) * cp * 2.1 + 5.) * .31 + noise(mat2(.28, .96, -.96, .28) * cp * 4.4 + 9.) * .19;
      col = mix(col, vec3(1., .985, .96), smoothstep(.45, .8, cl) * sky * .74);
      // Möwen segeln meist und schlagen nur ab und zu mit den Flügeln.
      float px = max(fwidth(p.x), .25);
      for (int i = 0; i < 5; i++) {
        float fi = float(i);
        vec2 gp = vec2(mod(uTime * (30. + fi * 6.) + fi * 150. + step(3., fi) * 860., 1900.) - 230., 72. + fi * 23. + sin(uTime * .37 + fi * 1.7) * 13.);
        float gs = 17.5 - fi * 1.6;
        vec2 g = (p - gp) / gs;
        if (abs(g.x) < 1.2 && abs(g.y) < 1.1) {
          float burst = smoothstep(.45, .75, sin(uTime * .62 + fi * 2.3));
          col = farGull(col, g, mix(.3, sin(uTime * (6.5 + fi * .8) + fi * 2.1), burst), sky * (1. - fi * .06), px * 1.15 / gs);
        }
      }
      // Das Flugzeug fliegt in seiner eigenen Richtung und wird mit der Entfernung kleiner. In der Ferne verschwimmt es im Dunst.
      vec2 bq = p - uPlane;
      vec2 bn = vec2(dot(bq, uPlaneT.xy), uPlaneT.x * bq.y - uPlaneT.y * bq.x) / uPlaneT.z;
      if (bn.x > -52. && bn.x < 320. && abs(bn.y) < 36. + abs(uPlaneT.w)) col = planeBanner(col, bn, sky * (.42 + .58 * smoothstep(.24, .72, uPlaneT.z)), px);
      // Ein harter Aufprall scheucht die Tauben von den Türmen der Kathedrale auf.
      if (uFlock < 9.) {
        for (int i = 0; i < 7; i++) {
          float fi = float(i), a = -1.57 + (fi - 3.) * .42 + sin(fi * 7.) * .1;
          float d = (1. - exp(-uFlock * .55)) * (190. + fi * 26.);
          vec2 fp = vec2(540. + (fi - 3.) * 7., 66.) + vec2(cos(a), sin(a)) * d + vec2(sin(uFlock * 1.4 + fi) * 7., uFlock * 2.2);
          float gs = 7. + mod(fi, 3.) * .8;
          vec2 g = (p - fp) / gs;
          if (abs(g.x) < 1.2 && abs(g.y) < 1.2) col = farGull(col, g, sin(uFlock * 15. + fi * 1.9), sky * (1. - smoothstep(6.5, 9., uFlock)), px * 1.15 / gs);
        }
      }
    }
    // Die Kathedrale: Langsam wandert warmes Licht über den Stein. Kommt der Zeiger nah, glimmt die Rosette auf.
    vec2 rosePos = p - vec2(538.3, 137.3);
    float roseLen = length(rosePos), rosePat = .62 + .38 * sin(atan(rosePos.y, rosePos.x) * 10.);
    float stone = step(q.y, 178.) * smoothstep(486., 496., q.x) * (1. - smoothstep(662., 670., q.x)) * (1. - blue) * (1. - ring) * (1. - palm);
    if (stone > .01) {
      float sw = mod(uTime * .05, 2.6) * 300. + 400.;
      col += stone * vec3(1., .82, .58) * exp(-pow((q.x + q.y * .55 - sw) / 30., 2.)) * .13;
      vec2 toRose = uPtr - vec2(538., 137.);
      col += stone * vec3(1., .78, .46) * (1. - smoothstep(8., 12., roseLen)) * rosePat * exp(-dot(toRose, toRose) / 26000.) * uSheen * .6;
    }
    // Das Boot: Licht vom Wasser spielt auf dem Rumpf, unten schäumt es an der Wasserlinie, oben weht ein Wimpel.
    if (boat > .01) {
      float net = noise(vec2(q.x * .085 + uTime * .55, q.y * .2 - uTime * .25)) * noise(vec2(q.x * .13 - uTime * .4, q.y * .31 + uTime * .3));
      col += boat * smoothstep(530., 540., q.y) * (1. - smoothstep(580., 590., q.y)) * smoothstep(525., 585., q.y) * vec3(.72, .9, 1.) * net * net * .8;
    }
    float foam = (1. - ring) * smoothstep(1238., 1252., q.x) * (1. - smoothstep(1418., 1424., q.x)) * smoothstep(586., 595., q.y) * (1. - smoothstep(600., 611., q.y));
    if (foam > .01) col += foam * pow(noise(vec2(q.x * .11 - uTime * .85, q.y * .55 + uTime * .2)), 3.) * 1.7;
    vec2 pn = q - vec2(1375., 381.) - vec2(sin(uTime * .6) * .9, sin(uTime * 1.05) * 1.5);
    if (pn.x > -30. && pn.x < 1. && abs(pn.y) < 11.) {
      float pu = -pn.x / 28.;
      float py = pn.y - 4. * pu - sin(pu * 5. - uTime * 6.) * 1.6 * pu;
      col = mix(col, vec3(.84, .2, .44), clamp((1. - pu) * 3.6 - abs(py) + .5, 0., 1.) * step(pu, 1.) * step(0., pu) * blue * (1. - ring));
    }
    // Draußen am Horizont: vorn ein Segelboot mit Spiegelbild und Kielwasser, dahinter ein zweites, kleines im Dunst.
    vec2 hz = q + uMouse * vec2(-1.35, -.9);
    float seaMask = blue * (1. - ring) * (1. - boat);
    vec2 farD = hz - vec2(1330. - mod(uTime * 3., 360.), 263.);
    if (abs(farD.x) < 12. && farD.y > -22. && farD.y < 3.) {
      vec4 fb = sailBoat(vec2(-farD.x, farD.y) / .52);
      col = mix(col, mix(fb.rgb, vec3(.72, .86, .96), .38), fb.a * seaMask);
    }
    vec2 sailD = hz - vec2(mod(uTime * 6.5, 300.) + 985., 266.5 + sin(uTime * 1.1) * .45);
    if (abs(sailD.x) < 44. && sailD.y > -40. && sailD.y < 26.) {
      float rock = .05 + sin(uTime * .8) * .03, cr = cos(rock), sr = sin(rock);
      vec2 rd = vec2(cr * sailD.x - sr * sailD.y, sr * sailD.x + cr * sailD.y);
      if (sailD.y > 0.) {
        vec4 mir = sailBoat(vec2(rd.x + sin(sailD.y * 1.3 + uTime * 3.) * (.4 + sailD.y * .06), -sailD.y * 1.25));
        col = mix(col, mir.rgb, mir.a * .42 * exp(-sailD.y / 11.) * seaMask);
        float wake = exp(-pow(sailD.y - .5, 2.) / .9) * smoothstep(-44., -13., sailD.x) * (1. - smoothstep(-13., -9., sailD.x));
        col += seaMask * wake * .36 * (.35 + noise(vec2(sailD.x * .4 - uTime * 2., uTime)));
        col += seaMask * exp(-pow(sailD.y - .4, 2.) / .7) * exp(-pow((sailD.x - 13.) / 2.4, 2.)) * .5;
      }
      vec4 sb = sailBoat(rd);
      col = mix(col, mix(sb.rgb, vec3(.78, .88, .95), .1), sb.a * seaMask);
    }
    col *= 1. - .3 * smoothstep(uView.y + uView.w - 240., uView.y + uView.w, sv.y) * (2. - uFx) * .5;
    if (ext > 0.) col = mix(col, vec3(.5, .12, .05), smoothstep(0., 200., ext));

    // Schatten und weiche Spiegelung der Schrift auf der glänzenden Terrasse
    float sh = texture2D(tShadow, vUv + uShadowOff).r;
    col = mix(col, col * vec3(.16, .3, .36), sh * .58 * uFx);
    float yb = 602. - (st.x - 108.) * .0133;
    if (st.y > yb && uFx > .01) {
      vec2 ruv = vec2(vUv.x, 1. - ((2. * yb - st.y) - uView.y) / uView.w);
      float rf = texture2D(tShadow, ruv).r * exp(-(st.y - yb) / 62.);
      col += vec3(.62, .46, .3) * rf * .34 * uFx * smoothstep(590., 612., st.y);
    }
    // Der Schatten der Möwe läuft über den Boden, oft bevor man sie selbst sieht.
    if (uGullShadow.w > .001) {
      vec2 gd = (st - uGullShadow.xy) / vec2(uGullShadow.z, uGullShadow.z * .22);
      col = mix(col, col * vec3(.36, .17, .13), uGullShadow.w * (1. - smoothstep(.1, 1., length(gd))) * smoothstep(612., 632., st.y));
    }
    // Ball auf dem Boden: Kontaktschatten und Spiegelung
    if (uBallShadow > .001) {
      vec2 bd = (st - vec2(uBall.x, ${FLOOR.toFixed(1)})) / vec2(uBall.z * 1.05, uBall.z * .25);
      col = mix(col, col * vec3(.3, .1, .07), uBallShadow * (1. - smoothstep(.15, 1., length(bd))));
      vec2 br = (st - vec2(uBall.x, 2. * ${FLOOR.toFixed(1)} - uBall.y)) / vec2(uBall.z * .92, uBall.z * .62);
      col += vec3(.42, .26, .24) * (1. - smoothstep(.2, 1., length(br))) * uBallShadow * .3 * smoothstep(${(FLOOR - 4).toFixed(1)}, ${(FLOOR + 6).toFixed(1)}, st.y);
    }
    // Jeder Aufprall läuft als Lichtring über den nassen Boden.
    if (uPulse.w > .002) {
      float pd = length((st - uPulse.xy) * vec2(1., 3.2));
      col += vec3(1., .78, .5) * exp(-pow((pd - uPulse.z * 520.) / 34., 2.)) * uPulse.w * .26 * smoothstep(612., 640., st.y);
    }
    // Der Ring fängt das Licht dort, wo der Zeiger ist.
    float sd = distance(st, uPtr);
    col += ring * vec3(1., .8, .42) * exp(-sd * sd / 42000.) * .17 * uSheen;

    if (uDawn > .001) {
      float l = dot(col, vec3(.299, .587, .114));
      vec3 low = mix(vec3(l), col, .6) * .5 * vec3(.376, .478, .769);
      low = mix(low, mix(vec3(l), col, .62) * .27 * vec3(.9, .76, .86), ring);
      // Nachthimmel nur dort, wo das Bild wirklich Himmel zeigt.
      vec2 cs = floor(q / 9.), cf = fract(q / 9.) - .5; float h = hash(cs);
      vec2 co = (vec2(hash(cs + 3.), hash(cs + 5.)) - .5) * .7;
      low += sky * step(.91, h) * smoothstep(.16 * (h - .9) * 8. + .02, 0., length(cf - co)) * (.6 + .4 * sin(uTime * (1. + h * 4.) + h * 40.)) * vec3(.92, .95, 1.);
      vec2 md = q - vec2(1035., 132.); float ml = length(md);
      float lunar = .86 + .14 * noise(md * .16 + 4.) * noise(md * .07 + 9.) * 2.;
      low = mix(low, vec3(.97, .96, .88) * lunar, sky * (1. - smoothstep(24.5, 26.5, ml)));
      low += sky * vec3(.55, .62, .85) * exp(-ml / 80.) * .34;
      low += water * vec3(.8, .85, 1.) * pow(noise(vec2(q.x * .3, q.y * .8) + uTime * .35), 3.) * exp(-pow((q.x - 1035.) / 70., 2.)) * .9;
      float land = smoothstep(.12, .16, depth) * (1. - smoothstep(.27, .32, depth)) * step(q.y, 262.) * (1. - smoothstep(.0, .25, col.b - col.r));
      vec2 ls = floor(q / 7.), lf = fract(q / 7.) - .5; float h2 = hash(ls + 7.);
      float bulb = smoothstep(.2, .02, length(lf - (vec2(hash(ls + 2.), hash(ls + 4.)) - .5) * .5));
      low += land * step(.9, h2) * bulb * (.7 + .3 * sin(uTime * 1.6 + h2 * 30.)) * vec3(1., .74, .42) * 1.15;
      // Nachts brennt Licht in der Rosette, in den Turmfenstern und in der Kajüte.
      low += vec3(1., .6, .24) * ((1. - smoothstep(9., 12., roseLen)) * rosePat * 1.15 + exp(-roseLen / 22.) * .24);
      vec2 wp = p;
      float panes = pane(wp - vec2(511., 120.)) + pane(wp - vec2(511., 137.)) + pane(wp - vec2(560.7, 121.7)) + pane(wp - vec2(560.7, 145.7)) + pane(wp - vec2(535., 172.)) + pane(wp - vec2(548., 173.)) + pane(wp - vec2(510.7, 170.));
      low += vec3(1., .66, .3) * panes * .85;
      low += boat * step(1302., q.x) * step(q.x, 1413.) * step(463., q.y) * step(q.y, 497.) * vec3(1., .7, .35) * .5 * (.85 + .15 * sin(uTime * 3.1 + q.x * .05));
      low += vec3(1., .72, .38) * (1. - smoothstep(3., 5., distance(p, vec2(1275., 523.)))) * .9;
      low += seaMask * vec3(1., .82, .5) * exp(-dot(sailD - vec2(-1.4, -36.), sailD - vec2(-1.4, -36.)) / 3.) * 1.4;
      float d = distance(st, uRevealC);
      float a = 1. - smoothstep(uReveal - 240., uReveal, d);
      vec3 graded = mix(low, col, a);
      graded += vec3(1., .82, .42) * exp(-pow((d - uReveal) / 110., 2.)) * .3 * step(1., uReveal);
      col = mix(col, graded, uDawn);
    }
    vec2 fd = st - vec2(1188., 70.);
    float fl = length(fd), an = atan(fd.y, fd.x);
    float rays = pow(abs(sin(an * 5. + .3 + uTime * .05)), 24.) * exp(-fl / 300.) * smoothstep(.45, 1., uFlare);
    float tw = .88 + .12 * sin(uTime * 1.3);
    col += (vec3(1., .96, .78) * exp(-fl / 46.) * .9 + vec3(1., .9, .62) * exp(-fl / 190.) * .42 + vec3(1., .92, .7) * rays * .9) * uFlare * tw;
    col += (hash(gl_FragCoord.xy + fract(uTime) * 91.) - .5) * .016;

    float alpha = 1.;
    vec3 glow = vec3(0.);
    if (uHole > .001) {
      vec2 d = st - uC;
      float e = length(vec2(dot(d, vec2(.769, -.639)) / 297., dot(d, vec2(.639, .769)) / 160.));
      // Durch den Ring hindurch: Im Inneren öffnet sich von der Bildmitte aus eine Blende mit hellem Rand.
      // Dahinter liegt die Terrasse. So wird nicht flächig überblendet, und das Bild wird nie matt.
      vec2 a = vec2(uView.z / uView.w, 1.);
      float q = length((vUv - .5) * a) / length(a * .5);
      float r = uHole * 1.25 - .1;
      float innen = (1. - smoothstep(.96, 1.04, e)) * (1. - ring);
      alpha = 1. - innen * (1. - smoothstep(r - .14, r, q));
      glow = vec3(1., .94, .78) * exp(-pow((q - r + .05) / .06, 2.)) * innen * smoothstep(0., .2, uHole) * (1. - smoothstep(.8, 1., uHole)) * .7;
    }
    gl_FragColor = vec4(col * alpha + glow, alpha);
  }`;

const BLUR_FRAG = /* glsl */`
  precision highp float;
  uniform sampler2D tSrc; uniform vec2 uDir; varying vec2 vUv;
  void main() {
    float s = texture2D(tSrc, vUv).r * .2270270;
    s += (texture2D(tSrc, vUv + uDir * 1.3846).r + texture2D(tSrc, vUv - uDir * 1.3846).r) * .3162162;
    s += (texture2D(tSrc, vUv + uDir * 3.2308).r + texture2D(tSrc, vUv - uDir * 3.2308).r) * .0702703;
    gl_FragColor = vec4(vec3(s), 1.);
  }`;
const QUAD_VERT = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';

let renderer, scene, cam, bgScene, bgCam, plateMat, blurScene, blurMat, rtA, rtB, silhouette, ballGroup, ballMesh, ballMat, envTex, pointLight, sunLight, confetti, feathers;
const view = { x0: 0, y0: 0, vw: W, vh: H, s: 1, w: 0, h: 0 };
const letters = [];
const groups = [];
const B = { x: 330, y: -160, r: 52, sx: 1, sy: 1, shadow: 0 };
const S = { reveal: 0, dawn: 1, flare: 0, gust: 0, sheen: 0, glint: -1 };
const ballQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.55, -0.5, 0.25));
const fly = { on: false, p: 0, s: 0, v: 0, k: 1, tx: RING_C.x, ty: RING_C.y };
let mode = 'intro', intro = null, paused = false, visible = true, time = 0, last = 0, tempo = 1, lastBx = B.x, acc = 0, skipping = false, dprCap = 2, paceSum = 0, paceN = 0, confettiLive = 0;
const pointer = { touch: false, x: -999, y: -999, over: false, mx: 0, my: 0, sx: 0, sy: 0, px: W / 2, py: H / 2, vx: 0, lx: -999 };
const phys = { vx: 0, vy: 0, scored: false, wasIn: false, hist: [], down: null, hopCool: 0, sq: 0, sv: 0, idle: 7, grab: { x: 0, y: 0 }, homeV: 0, aim: null };
let ripple = { x: 0, y: 0, t: 9 };
const pulses = [], bits = [], tmpO = new THREE.Object3D();
let lastPulse = { x: 0, y: 0, age: 9, amp: 0 };
const glint = { value: new THREE.Vector2(-1, 1 / W) };
const flock = { t: 99 };
// Im Hochformat wird der Schriftzug als Ganzes verkleinert und neu gesetzt, ohne seine Perspektive zu verlieren.
const comp = { on: false, a: 1, px: 560, py: 346, qx: 560, qy: 346 };
let ballR = BALL_R, camL = null, grip = null;
const claim = { on: true, group: null, tok: {}, items: [], basis: null, inv: null, depth: 13, w: 0, carry: null, glow: { v: 0 } };
const gag = { s: GULL_S, tl: null, P: { x: -300, y: 100 }, next: 5.5, canHit: false, onClaim: false, bubble: document.getElementById('squawk'), sayT: null, nodes: [], rope: false, grip: 0, tip: { x: 0, y: 0 }, from: { x: 0, y: 0 }, hold: 0, shifted: false };
const plop = { mesh: null, splat: null, on: false, x: 0, y: 0, vx: 0, vy: 0 };
let gull = null;

function solveH(src, dst) {
  const A = [], b = [];
  for (let i = 0; i < 4; i++) {
    const [s, t] = src[i], [u, v] = dst[i];
    A.push([s, t, 1, 0, 0, 0, -u * s, -u * t]); b.push(u);
    A.push([0, 0, 0, s, t, 1, -v * s, -v * t]); b.push(v);
  }
  for (let c = 0; c < 8; c++) {
    let p = c; for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]];
    for (let r = 0; r < 8; r++) if (r !== c) { const f = A[r][c] / A[c][c]; for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k]; b[r] -= f * b[c]; }
  }
  const h = b.map((v, i) => v / A[i][i]);
  return [[h[0], h[1], h[2]], [h[3], h[4], h[5]], [h[6], h[7], 1]];
}
// Bildet die Textfläche exakt auf das perspektivische Viereck des Entwurfs ab.
function basisFromQuad(quad, w, h, depth) {
  const H3 = solveH([[0, h], [w, h], [w, 0], [0, 0]], quad);
  const col = (j) => { const u = H3[0][j], v = H3[1][j], q = H3[2][j]; return [(u - CX * q) / F, -(v - CY * q) / F, q]; };
  const c1 = col(0), c2 = col(1), c3 = col(2);
  const len = (a) => Math.hypot(a[0], a[1], a[2]);
  const l = 2 / (len(c1) + len(c2));
  const v3 = (a) => new THREE.Vector3(a[0] * l, a[1] * l, -a[2] * l);
  const a = v3(c1), b = v3(c2), c = v3(c3);
  const n = new THREE.Vector3().crossVectors(a, b).normalize();
  if (n.z < 0) n.multiplyScalar(-1);
  c.addScaledVector(n, -depth);
  return new THREE.Matrix4().makeBasis(a, b, n).setPosition(c);
}
function project(v) { const w = -v.z; return { x: CX + F * v.x / w, y: CY - F * v.y / w }; }

const CREAM = new THREE.Color(0xfff6e4), CREAM_SIDE = new THREE.Color(0xffdcb2);
const WARM = new THREE.Color(0xffd98a), WARM_SIDE = new THREE.Color(0xffb95e);
// Unten nimmt die Schrift das warme Licht der Terrasse auf.
function warmFoot(mat) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uGlint = glint;
    sh.vertexShader = 'varying float vLY;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vLY = position.y;');
    // Dazu ein schmaler Sonnenstreif, der ab und zu quer über die Buchstaben läuft.
    sh.fragmentShader = 'varying float vLY; uniform vec2 uGlint;\n' + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      diffuseColor.rgb *= mix(vec3(1., .85, .7), vec3(1.), smoothstep(-6., 58., vLY));
      diffuseColor.rgb += vec3(.36, .29, .17) * exp(-pow(((gl_FragCoord.x + gl_FragCoord.y * .45) * uGlint.y - uGlint.x) * 11., 2.));`);
  };
  return mat;
}
function buildLetters(font) {
  const size = 100, k = size / font.data.resolution, depth = 17;
  const block = basisFromQuad(BLOCK, BLOCK_W, BLOCK_H, depth);
  for (const line of LINES) {
    const group = new THREE.Group(); group.matrixAutoUpdate = false;
    let x = 0; const own = [];
    [...line.text].forEach((ch, i, all) => {
      const glyph = font.data.glyphs[ch];
      const geo = new THREE.ExtrudeGeometry(font.generateShapes(ch, size), { depth, curveSegments: 10, bevelEnabled: true, bevelThickness: 1.8, bevelSize: 1.2, bevelSegments: 3 });
      geo.computeBoundingBox();
      const cx = (geo.boundingBox.min.x + geo.boundingBox.max.x) / 2;
      geo.translate(-cx, 0, 0);
      const front = warmFoot(new THREE.MeshPhysicalMaterial({ color: CREAM.clone(), roughness: 0.52, clearcoat: 0.28, clearcoatRoughness: 0.45, envMapIntensity: 0.28 }));
      const side = warmFoot(new THREE.MeshPhysicalMaterial({ color: CREAM_SIDE.clone(), roughness: 0.62, envMapIntensity: 0.22 }));
      const mesh = new THREE.Mesh(geo, [front, side]);
      const pivot = new THREE.Group(); pivot.position.set(x + cx, 0, 0); pivot.add(mesh); pivot.visible = false;
      group.add(pivot);
      const item = { pivot, front, side, home: x + cx, on: false, drop: 0, sq: 0, sv: 0, pu: 2, press: 0, v: 0, f: 0, goal: 0, lift: 0, lv: 0, lgoal: 0, lf: 0, wob: 0, wv: 0, dx: 0, dy: 0, dvx: 0, dvy: 0, fx: 0, sx: 0, sy: 0, mid: (geo.boundingBox.max.y + geo.boundingBox.min.y) / 2, line: groups.length, prev: null, next: null, ln: [], lw: [] };
      if (own.length) { item.prev = own[own.length - 1]; item.prev.next = item; }
      own.push(item); letters.push(item);
      x += glyph.ha * k + (KERN[ch + (all[i + 1] || '')] || 0) + (line.track || 0);
    });
    const basis = block.clone().multiply(new THREE.Matrix4().makeTranslation(0, line.y, 0)).multiply(new THREE.Matrix4().makeScale(line.s, line.s, 1));
    const center = new THREE.Vector3(x / 2, 33, depth).applyMatrix4(basis);
    group.userData = { basis, own, depth, w: -center.z };
    for (const it of own) {
      const sc = project(new THREE.Vector3(it.home, it.mid, depth).applyMatrix4(basis));
      it.sx = sc.x; it.sy = sc.y;
      const ub = project(new THREE.Vector3(it.home, 0, depth).applyMatrix4(basis)), ut = project(new THREE.Vector3(it.home, 100, depth).applyMatrix4(basis));
      it.pu = Math.abs(ub.y - ut.y) / 100; it.by = ub.y;
      it.sx0 = it.sx; it.sy0 = it.sy; it.pu0 = it.pu;
    }
    group.matrix.copy(basis);
    group.traverse((o) => o.layers.set(1));
    scene.add(group); groups.push(group);
  }
  // Die Buchstaben sind wie eine weiche Haut verbunden: Bewegt sich einer, laufen die Nachbarn mit.
  for (const a of letters) for (const b of letters) {
    if (a === b) continue;
    const d = Math.hypot(a.sx - b.sx, a.sy - b.sy);
    if (d < 280) { a.ln.push(b); a.lw.push(Math.exp(-(d * d) / (2 * 125 * 125))); }
  }
}

function buildBall() {
  const col = (h) => { const c = new THREE.Color(h); return new THREE.Vector3(c.r, c.g, c.b); };
  const uniforms = { uPink: { value: col(0xe8437f) }, uSun: { value: col(0xffc91f) }, uCream: { value: col(0xf6ead2) }, uSea: { value: col(0x0a7fa8) }, uBump: { value: 1.1 } };
  ballMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.46, clearcoat: 0.4, clearcoatRoughness: 0.38, envMapIntensity: 0.55 });
  ballMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = 'varying vec3 vObj;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vObj = position;');
    sh.fragmentShader = /* glsl */`
      varying vec3 vObj; uniform vec3 uPink, uSun, uCream, uSea; uniform float uBump; float mmsSeam;
      vec3 panel(vec3 o) {
        vec3 a = abs(o), c = o / max(max(a.x, a.y), a.z);
        float s, e1, e2; int f;
        if (a.x >= a.y && a.x >= a.z) { s = c.y; e1 = c.y; e2 = c.z; f = 0; }
        else if (a.y >= a.z) { s = c.z; e1 = c.z; e2 = c.x; f = 1; }
        else { s = c.x; e1 = c.x; e2 = c.y; f = 2; }
        mmsSeam = min(abs(abs(s) - 1. / 3.), 1. - max(abs(e1), abs(e2)));
        bool mid = abs(s) < 1. / 3.;
        if (f == 0) return mid ? uCream : uPink;
        if (f == 1) return mid ? uCream : uSun;
        return mid ? uSea : uCream;
      }
      ${sh.fragmentShader}`
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 pc = panel(normalize(vObj));
        float aa = fwidth(mmsSeam) * 1.1;
        diffuseColor.rgb = pc * mix(.42, 1., smoothstep(.006, .014 + aa, mmsSeam));`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        { float bh = smoothstep(0., .085, mmsSeam); vec3 sp = -vViewPosition; vec3 dx = dFdx(sp), dy = dFdy(sp);
          float hx = dFdx(bh), hy = dFdy(bh); vec3 r1 = cross(dy, normal), r2 = cross(normal, dx); float det = dot(dx, r1);
          vec3 gr = sign(det) * (hx * r1 + hy * r2); normal = normalize(abs(det) * normal - uBump * gr); }`);
  };
  ballMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), ballMat);
  ballGroup = new THREE.Group(); ballGroup.add(ballMesh); scene.add(ballGroup);
}
const BALL_W = 640;
function placeBall(px, py) {
  // Die Kontaktstelle bleibt beim Stauchen auf dem Boden.
  const cy = B.y + B.r * (1 - B.sy);
  const g = fly.k > 1 ? 1 + (fly.k - 1) * 1.15 : 1;
  const sx = fly.tx + (B.x - RING_C.x) * fly.k, sy = fly.ty + (cy - RING_C.y) * fly.k;
  ballGroup.position.set((sx + px - CX) * BALL_W / F, -(sy + py - CY) * BALL_W / F, -BALL_W);
  const r = B.r * g * BALL_W / F;
  ballGroup.scale.set(r * B.sx, r * B.sy, r * B.sx);
  ballMesh.quaternion.copy(ballQ);
}

// Konfetti in den Farben des Balls beim Treffer am Aufkleber.
const TONES = [0xe8437f, 0xffc91f, 0xf6ead2, 0x0a7fa8, 0xff7a2f];
function buildConfetti() {
  confetti = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1.6), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false }), 64);
  confetti.frustumCulled = false; confetti.visible = false;
  const c = new THREE.Color();
  for (let i = 0; i < 64; i++) { confetti.setColorAt(i, c.setHex(TONES[i % 5])); bits.push({ x: 0, y: 0, vx: 0, vy: 0, a: 0, b: 0, va: 0, vb: 0, s: 0, life: 0 }); }
  scene.add(confetti);
}
function fireConfetti(x, y) {
  if (reduced.matches) return;
  bits.forEach((b) => {
    const an = Math.random() * Math.PI * 2, sp = 240 + Math.random() * 560;
    Object.assign(b, { x, y, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp * 0.8 - 260, a: Math.random() * 6.3, b: Math.random() * 6.3, va: (Math.random() - 0.5) * 14, vb: (Math.random() - 0.5) * 14, s: 7 + Math.random() * 7, life: 1.5 + Math.random() * 0.9 });
  });
  confettiLive = 3; confetti.visible = true;
}
function updateConfetti(dt) {
  if (confettiLive <= 0) return;
  confettiLive -= dt;
  bits.forEach((b, i) => {
    const drag = Math.exp(-dt * 1.6);
    b.life -= dt; b.vy += 900 * dt; b.vx *= drag; b.vy *= drag; b.x += b.vx * dt; b.y += b.vy * dt; b.a += b.va * dt; b.b += b.vb * dt;
    tmpO.position.set((b.x - CX) * BALL_W / F, -(b.y - CY) * BALL_W / F, -BALL_W);
    tmpO.rotation.set(b.a, b.b, 0);
    tmpO.scale.setScalar(b.s * BALL_W / F * clamp(b.life * 3, 0.0001, 1));
    tmpO.updateMatrix(); confetti.setMatrixAt(i, tmpO.matrix);
  });
  confetti.instanceMatrix.needsUpdate = true;
  if (confettiLive <= 0) confetti.visible = false;
}

// --- Der Satz: kleine 3D-Buchstaben, die auf der Terrasse stehen, in derselben Flucht wie der Schriftzug ---
const claimV = new THREE.Vector3();
// Beide Umrechnungen laufen über den Bildausschnitt des Hochformats. Am Desktop ist er neutral.
function claimToStage(x, y) { claimV.set(x, y, claim.depth).applyMatrix4(claim.basis); const s = project(claimV); return { x: comp.a * (s.x - comp.px) + comp.qx, y: comp.a * (s.y - comp.py) + comp.qy }; }
function stageToClaim(sx, sy) { const x = (sx - comp.qx) / comp.a + comp.px, y = (sy - comp.qy) / comp.a + comp.py, h = claim.inv, w = h[2][0] * x + h[2][1] * y + h[2][2]; return { x: (h[0][0] * x + h[0][1] * y + h[0][2]) / w, y: (h[1][0] * x + h[1][1] * y + h[1][2]) / w }; }
function buildClaim(font) {
  const size = 100, k = size / font.data.resolution, depth = claim.depth, geos = {};
  const geoOf = (ch) => {
    if (geos[ch]) return geos[ch];
    const g = new THREE.ExtrudeGeometry(font.generateShapes(ch, size), { depth, curveSegments: 6, bevelEnabled: true, bevelThickness: 1.6, bevelSize: 1.1, bevelSegments: 2 });
    g.computeBoundingBox();
    g.userData.cx = (g.boundingBox.min.x + g.boundingBox.max.x) / 2;
    g.translate(-g.userData.cx, 0, 0);
    geos[ch] = g;
    return g;
  };
  const front = warmFoot(new THREE.MeshPhysicalMaterial({ color: CREAM.clone(), roughness: 0.5, clearcoat: 0.28, clearcoatRoughness: 0.45, envMapIntensity: 0.28 }));
  const side = warmFoot(new THREE.MeshPhysicalMaterial({ color: CREAM_SIDE.clone(), roughness: 0.62, envMapIntensity: 0.22 }));
  claim.front = front; claim.side = side;
  // Was die Möwe trägt, leuchtet warm wie der Schriftzug unter dem Zeiger. So hebt sich das Wort vor „Summer“ ab.
  claim.carry = [warmFoot(new THREE.MeshPhysicalMaterial({ color: CREAM.clone(), roughness: 0.5, clearcoat: 0.28, clearcoatRoughness: 0.45, envMapIntensity: 0.28 })), warmFoot(new THREE.MeshPhysicalMaterial({ color: CREAM_SIDE.clone(), roughness: 0.62, envMapIntensity: 0.22 }))];
  const group = new THREE.Group(); group.matrixAutoUpdate = false;
  for (const [key, text] of CLAIM_TOK) {
    const t = { text, items: [] };
    for (const ch of text) {
      const mesh = new THREE.Mesh(geoOf(ch), [front, side]);
      const pivot = new THREE.Group(); pivot.add(mesh); pivot.visible = false; group.add(pivot);
      const it = { key, ch, pivot, mesh, alt: null, x: 0, y: 0, ly: 0, xP: 0, lyP: 0, jump: 0, jv: 0, s: 1, rz: 0, rzT: 0, rv: 0, spin: 0, press: 0, v: 0, goal: 0, wob: 0, wv: 0, sq: 0, sv: 0, sx: 0, sy: 0, on: false, xA: 0, xB: 0, air: false, up: false, at: 0, aT: 0, x0: 0, v0: 0, v1: 0, tx: 0, vy: 0, ox: 0, ov: 0 };
      t.items.push(it); claim.items.push(it);
    }
    claim.tok[key] = t;
  }
  const A = claim.tok.work.items[0];
  A.alt = new THREE.Mesh(geoOf('M'), [front, side]); A.alt.visible = false; A.pivot.add(A.alt);
  const flow = (order, lower, slot) => {
    let x = 0;
    order.forEach((key, oi) => {
      const t = claim.tok[key];
      if (oi && t.text.length > 1) x += 27;
      const chars = [...t.text];
      if (lower && key === 'work') chars[0] = 'M';
      chars.forEach((ch, i) => {
        t.items[i][slot] = x + geoOf(ch).userData.cx;
        x += font.data.glyphs[ch].ha * k + (KLEIN[ch + (chars[i + 1] || '')] || 0) + 1.2;
      });
    });
    return x;
  };
  claim.w = flow(ORDER_A, false, 'xA');
  flow(ORDER_B, true, 'xB');
  // Im Hochformat steht der Satz auf zwei Zeilen: „Dein Sommer. Deine Bühne.“ und „Dein Job.“
  const w1 = flow(['s1', 's2', 'b1', 'b2'], false, 'xP'), w2 = flow(['work', 'job'], false, 'xP');
  for (const key of ['s1', 's2', 'b1', 'b2']) for (const it of claim.tok[key].items) it.lyP = CLAIM_LINE;
  claim.wP = Math.max(w1, w2); claim.hP = CLAIM_LINE + 66.6;
  const rect = [[0, 66.6], [claim.w, 66.6], [claim.w, 0], [0, 0]];
  claim.inv = solveH(CLAIM_QUAD, rect);
  const base = basisFromQuad(CLAIM_QUAD, claim.w, 66.6, depth);
  // Gleich groß im Bild, aber näher an der Kamera: So steht der Satz wirklich vor dem Schriftzug.
  const far = -new THREE.Vector3(claim.w / 2, 33, depth).applyMatrix4(base).z;
  claim.basis = new THREE.Matrix4().makeScale(700 / far, 700 / far, 700 / far).multiply(base);
  claim.basisA = claim.basis; claim.invA = claim.inv;
  group.userData = { basis: claim.basis, own: [], depth, w: 700 };
  group.matrix.copy(claim.basis);
  for (const it of claim.items) { it.x = it.xA; const s = claimToStage(it.xA, 26); it.sx = s.x; it.sy = s.y; }
  group.traverse((o) => o.layers.set(1));
  scene.add(group); groups.push(group);
  claim.group = group;
}
function stepClaim(h) {
  for (const l of claim.items) {
    l.v += (60 * (l.goal - l.press) - 11 * l.v) * h; l.press += l.v * h;
    l.wv += (-110 * l.wob - 7 * l.wv) * h; l.wob += l.wv * h;
    l.sv += (-520 * l.sq - 20 * l.sv) * h; l.sq += l.sv * h;
    l.ov += (-300 * l.ox - 30 * l.ov) * h; l.ox += l.ov * h;
    // Das Kippen hat Masse: Es folgt dem Seil mit Verzögerung und richtet sich im Fallen von selbst auf.
    l.rv += (150 * (l.rzT - l.rz) - 17 * l.rv) * h; l.rz += l.rv * h;
    if (l.air) { stepAir(l, h); continue; }
    if (l.jump > 0 || l.jv > 0) {
      l.jv -= CLAIM_G * h; l.jump += l.jv * h;
      if (l.jump <= 0) { l.sv += Math.min(-l.jv, 700) * 0.004; l.jump = 0; l.jv = l.jv < -90 ? -l.jv * 0.32 : 0; }
    }
  }
}
// Jeder Sprung und jeder Fall ist derselbe Wurf: gleiche Schwerkraft wie beim Ball. Wie lange er dauert, ergibt sich aus der Höhe.
function toss(l, tx, vy, delay = 0, vx = 0) {
  const y0 = Math.max(l.y + l.jump, 0);
  l.y = y0; l.jump = 0; l.jv = 0; l.vy = vy;
  const T = Math.max((vy + Math.sqrt(vy * vy + 2 * CLAIM_G * y0)) / CLAIM_G, 0.06);
  Object.assign(l, { air: true, up: delay <= 0, at: -delay, aT: T, x0: l.x, v0: vx, v1: (tx - l.x) / T * 0.55, tx, rzT: 0 });
  if (delay <= 0) l.sv -= 1.4;
}
function stepAir(l, h) {
  l.at += h;
  if (l.at < 0) { if (l.at > -0.07 && !l.crouch) { l.crouch = true; l.sv += 2.6; } return; }
  if (!l.up) { l.up = true; l.crouch = false; l.sv -= 3; }
  l.vy -= CLAIM_G * h; l.y += l.vy * h;
  // Waagerecht läuft er in einer durchgehenden Kurve vom Tempo beim Loslassen bis auf seinen Platz.
  const T = l.aT, u = Math.min(1, l.at / T), u2 = u * u, u3 = u2 * u;
  l.x = (2 * u3 - 3 * u2 + 1) * l.x0 + (u3 - 2 * u2 + u) * T * l.v0 + (3 * u2 - 2 * u3) * l.tx + (u3 - u2) * T * l.v1;
  if (l.y <= 0 && l.vy < 0) landLetter(l);
}
function landLetter(l) {
  const hit = -l.vy;
  l.air = false; l.up = false; l.x = l.tx; l.y = 0; l.jump = 0;
  // Er setzt schwer auf, rutscht noch ein Stück, federt einmal und stößt die Nachbarn leicht an.
  l.sv += Math.min(hit, 1100) * 0.0062;
  l.jv = hit > 240 ? Math.min(hit * 0.2, 210) : 0;
  l.ov += l.v1 * 0.6;
  l.wv += -l.v1 * 0.0048 + (Math.random() - 0.5) * 0.5;
  for (const m of claim.items) {
    if (m === l || m.air || gag.rope && gag.nodes.some((n) => n.l === m && n.free)) continue;
    const d = Math.abs(m.x - l.x);
    if (d < 74) { m.jv = Math.max(m.jv, Math.min(hit, 800) * 0.085 * (1 - d / 74)); m.wv += Math.sign(m.x - l.x) * 0.25 * (1 - d / 74); }
  }
}

function setLower(on) { const A = claim.tok.work.items[0]; A.mesh.visible = !on; A.alt.visible = on; }
function spinSwap(on) {
  const g = window.gsap, A = claim.tok.work.items[0];
  g.fromTo(A, { spin: 0 }, { spin: Math.PI * 2, duration: 0.42, ease: 'power2.inOut', overwrite: false });
  g.delayedCall(0.21, () => setLower(on));
}
// Ganze Wörter springen als Kette, der Vorderste zuerst. Wer weit muss, springt hoch über die anderen hinweg, wer nur rückt, hüpft flach.
// Art „flach“: alle hüpfen flach. Art „tausch“: Das Wort der Möwe hüpft mittelhoch, der Rest flach darunter durch. Nie über den Titel.
function rearrange(slot, only = null, art = '') {
  const go = claim.items.filter((l) => (!only || only(l)) && (Math.abs(l[slot] - l.x) > 0.5 || l.y > 0.5 || l.air));
  const front = (l) => (l[slot] < l.x ? l.x : -l.x);
  go.sort((a, b) => front(a) - front(b));
  let far = 0, near = 0;
  for (const l of go) {
    const d = l[slot] - l.x, wide = Math.abs(d) > 150, low = art === 'flach' || (art === 'tausch' && l.key !== 'work');
    const T = low ? (wide ? 0.3 : 0.26) : art === 'tausch' ? (wide ? 0.42 : 0.3) : wide ? 0.58 : 0.34;
    if (l.air || l.y > 4) toss(l, l[slot], l.air ? l.vy : 90);
    else toss(l, l[slot], CLAIM_G * T / 2, wide ? far++ * 0.03 : 0.1 + near++ * 0.016, d / T * 0.85);
  }
}
// Das getragene Wort glüht warm auf und kühlt nach dem Ablegen wieder zu Creme ab.
function carryLook(on, now = false) {
  if (!claim.carry || !claim.tok.work) return;
  const g = window.gsap, work = claim.tok.work.items, A = work[0], [cf, cs] = claim.carry;
  const tint = () => { cf.color.lerpColors(CREAM, WARM, claim.glow.v); cs.color.lerpColors(CREAM_SIDE, WARM_SIDE, claim.glow.v); };
  const plain = () => { claim.glow.v = 0; tint(); for (const l of work) l.mesh.material = [claim.front, claim.side]; A.alt.material = [claim.front, claim.side]; };
  g?.killTweensOf(claim.glow);
  if (on) {
    for (const l of work) l.mesh.material = claim.carry;
    A.alt.material = claim.carry;
    g.to(claim.glow, { v: 0.85, duration: 0.35, ease: 'sine.out', onUpdate: tint });
  } else if (now || !g || claim.glow.v <= 0) plain();
  else g.to(claim.glow, { v: 0, duration: 0.7, ease: 'sine.inOut', onUpdate: tint, onComplete: plain });
}
// Das Wort hängt am Schnabel wie ein Seil: Es löst sich Buchstabe für Buchstabe und zieht hinterher wie ein Strandbanner.
function ropeStart() {
  const work = claim.tok.work.items, list = [...work].reverse();
  gag.nodes = list.map((l, i) => {
    const s = claimToStage(l.x, 0), prev = i ? claimToStage(list[i - 1].x, 0) : s;
    return { l, x: s.x, y: s.y, px: s.x, py: s.y, free: i === 0, firm: 1, len: Math.hypot(s.x - prev.x, s.y - prev.y) };
  });
  const a = claimToStage(0, 0), b = claimToStage(claim.w, 0);
  gag.base = { y: a.y, k: (b.y - a.y) / (b.x - a.x), x: a.x };
  // Sie hält das „n“ oben im Schnabel. Erst schnappt es vom Boden hoch an die Spitze, dann hängt es dort fest.
  // Gegriffen wird die Oberkante des kleinen „n“, ein Stück vor der Spitze, damit der Buchstabe vor der Brust hängt und nicht dahinter.
  const n0 = gag.nodes[0], top = claimToStage(n0.l.x, 34);
  gag.from = { x: n0.x, y: n0.y }; gag.hold = n0.y - top.y - 3; gag.lead = 8; gag.grip = 0;
  gag.ax = n0.x; gag.ay = n0.y;
  gag.rope = true; gag.print = false; gag.force = false; gag.printCool = 0; gag.shifted = false;
  carryLook(true);
}
function stepRope(h) {
  if (!gag.rope) return;
  const ns = gag.nodes;
  for (let i = 1; i < ns.length; i++) {
    const n = ns[i];
    if (!n.free) continue;
    // Die Luft bremst die Buchstaben: Fliegt sie, weht das Wort hinter ihr her wie ein Banner, statt senkrecht zu hängen.
    const vx = (n.x - n.px) * 0.966, vy = (n.y - n.py) * 0.966;
    n.px = n.x; n.py = n.y;
    n.x += vx; n.y += vy + 900 * h * h;
    n.firm = Math.min(1, n.firm + h * 6);
  }
  ns[0].x = gag.ax; ns[0].y = gag.ay;
  for (let it = 0; it < 4; it++) {
    for (let i = 1; i < ns.length; i++) {
      const a = ns[i - 1], b = ns[i];
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
      // Liegt ein Buchstabe noch, wartet er, bis das Seil straff wird. Dann kommt er weich hoch, nicht mit einem Ruck.
      if (!b.free) { if (d > b.len * 1.04 && a.free) { b.free = true; b.firm = 0.12; b.px = b.x; b.py = b.y; b.l.jv = 0; b.l.jump = 0; } else continue; }
      const e = (d - b.len) / d * b.firm;
      if (i === 1) { b.x -= dx * e; b.y -= dy * e; } else { a.x += dx * e * 0.5; a.y += dy * e * 0.5; b.x -= dx * e * 0.5; b.y -= dy * e * 0.5; }
    }
    // Das Wort ist steif wie ein Banner und kann sich nicht verknoten.
    for (let i = 2; i < ns.length; i++) {
      const a = ns[i - 2], b = ns[i];
      if (!b.free) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, min = (ns[i - 1].len + b.len) * 0.78;
      if (d < min) { const e = (min - d) / d * 0.5; if (i > 2) { a.x -= dx * e * 0.5; a.y -= dy * e * 0.5; } b.x += dx * e; b.y += dy * e; }
    }
    // Der Boden trägt mit: Was aufsetzt, schleift.
    for (let i = 1; i < ns.length; i++) {
      const n = ns[i];
      if (!n.free) continue;
      const gy = gag.base.y + (n.x - gag.base.x) * gag.base.k;
      if (n.y > gy) { n.y = gy; n.px += (n.x - n.px) * 0.3; }
    }
  }
  // Ist das ganze Wort vom Boden, schließt der Rest des Satzes die Lücke: flach über die anderen hinweg, nichts fliegt über den Titel.
  if (!gag.shifted && ns.length > 1 && ns.every((n) => n.free)) {
    const t = ns[ns.length - 1];
    if (gag.base.y + (t.x - gag.base.x) * gag.base.k - t.y > 60) shiftRest();
  }
}
function shiftRest() { if (gag.shifted) return; gag.shifted = true; rearrange('xB', (l) => l.key !== 'work', 'flach'); }
function syncRope() {
  if (!gag.rope) return;
  const ns = gag.nodes;
  for (let i = 0; i < ns.length; i++) {
    const n = ns[i];
    if (!n.free) continue;
    const c = stageToClaim(n.x, n.y);
    n.l.x = c.x; n.l.y = c.y;
    const a = i ? ns[i - 1] : ns[1], b = i ? n : ns[0];
    if (a && b && ns.length > 1) n.l.rzT = clamp(Math.atan2(-(a.y - b.y) * (i ? 1 : -1), (a.x - b.x) * (i ? 1 : -1)), -0.5, 2.7);
  }
}
// Sie lässt die Buchstaben genau über ihrem Platz los, von hinten nach vorn: Das Wort schreibt sich unter ihr von selbst auf den Boden.
function letGo(n) {
  const l = n.l, c = stageToClaim(n.x, n.y), q = 0.02, c2 = stageToClaim(n.x + (n.x - n.px) / STEP * q, n.y + (n.y - n.py) / STEP * q);
  l.x = c.x; l.y = Math.max(c.y, 0);
  toss(l, l.xB, clamp((c2.y - c.y) / q, -420, 260), 0, clamp((c2.x - c.x) / q, -800, 800));
  if (l === claim.tok.work.items[0]) spinSwap(true);
}
function printWord(dt) {
  if (!gag.print || !gag.rope) return;
  const ns = gag.nodes, n = ns[ns.length - 1];
  gag.printCool -= dt;
  if (ns.length < 2 || gag.printCool > 0) return;
  if (gag.force || n.x >= claimToStage(n.l.xB, 0).x - 16) { ns.pop(); letGo(n); gag.printCool = 0.045; }
}
function lastLetter() {
  const n0 = gag.nodes.pop();
  while (gag.nodes.length) letGo(gag.nodes.pop());
  gag.rope = false; gag.print = false;
  if (n0) letGo(n0);
}

// --- Die Möwe. Ihr Auftritt ist eine kleine Geschichte: lesen, umschreiben, abgeschossen werden, sich rächen. ---
function say(text, ms = 2200) {
  const el = gag.bubble;
  el.textContent = text; el.hidden = false;
  el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
  gag.sayT?.kill();
  gag.sayT = window.gsap.delayedCall(ms / 1000, () => { el.hidden = true; });
}
function startGag() {
  const g = window.gsap;
  if (!g || !gull || gag.tl || mode === 'intro' || mode === 'drag' || still() || fly.s > 0.01) return false;
  if (comp.on) return startGagHoch();
  const p = gull.pose, P = gag.P, work = claim.tok.work.items, A = work[0], n = work[work.length - 1];
  const a = claimToStage(A.xA, 66), b = claimToStage(n.xA, 54), c = claimToStage(n.xB, 54);
  Object.assign(P, { x: -200, y: 150 });
  gull.reset({ yaw: -0.5, pitch: 0.04, roll: 0.3, fold: 0, flapAmp: 0.95, flapRate: 9, tuck: 1, headPitch: -0.1, shades: 1, smile: 0.7 });
  gull.root.visible = true; gag.canHit = true; gag.onClaim = false;
  const tl = g.timeline({ onComplete: endGag });
  gag.tl = tl;
  // Anflug, dann landet sie auf dem großen A. Es wackelt, sie rudert kurz, dann steht sie.
  const T = 2;
  tl.to(P, { x: a.x, duration: T, ease: 'sine.out' }, 0)
    .to(P, { y: a.y, duration: T, ease: 'sine.in' }, 0)
    .to(p, { flapAmp: 0.22, flapRate: 6, roll: 0.42, duration: 0.6, ease: 'sine.inOut' }, 0.35)
    .to(p, { flapAmp: 1.05, flapRate: 15, pitch: 0.62, sweep: 0.5, tuck: 0, roll: 0, yaw: -0.42, duration: 0.34 }, T - 0.42)
    .call(() => { gag.onClaim = true; A.v += 5; A.sv += 4; impact(a.x, FLOOR - 30, 0.16); }, null, T)
    .to(p, { fold: 1, flapAmp: 0, pitch: 0.04, sweep: 0, duration: 0.34, ease: 'power2.out' }, T)
    .fromTo(p, { squash: 0.22 }, { squash: 0, duration: 0.42, ease: 'back.out(3)', immediateRender: false }, T)
    .fromTo(p, { gesture: 0.7 }, { gesture: 0, duration: 0.5, ease: 'sine.inOut', immediateRender: false }, T + 0.28)
    .to(p, { roll: 0.17, duration: 0.12, ease: 'sine.out' }, T + 0.02)
    .to(p, { roll: -0.13, duration: 0.2, ease: 'sine.inOut' }, T + 0.14)
    .to(p, { roll: 0.06, duration: 0.18, ease: 'sine.inOut' }, T + 0.34)
    .to(p, { roll: 0, duration: 0.16, ease: 'sine.out' }, T + 0.52);
  // Ein kurzer Blick zu dir, dann watschelt sie über das Wort und liest. Die Augen laufen beim Lesen mit.
  tl.to(p, { headYaw: -0.8, headPitch: 0.1, stare: 1, smile: 1, duration: 0.2, ease: 'power3.out' }, T + 0.72)
    .to(p, { headYaw: 0.08, headPitch: -0.62, stare: 0, lookY: -0.45, lookX: -0.3, smile: 0.3, shades: 2, duration: 0.22, ease: 'power2.inOut' }, T + 1.26)
    .to(p, { walk: 1, duration: 0.12 }, T + 1.4)
    .to(P, { x: b.x, y: b.y, duration: 1.5, ease: 'none' }, T + 1.4)
    .to(p, { lookX: 0.5, duration: 1.5, ease: 'none' }, T + 1.4)
    .to(p, { walk: 0, duration: 0.14 }, T + 2.82)
    .to(p, { headPitch: -0.12, lookY: 0, lookX: -0.3, duration: 0.2, ease: 'power2.out' }, T + 2.95)
    .to(p, { headYaw: 0.32, lookX: 0.6, duration: 1, ease: 'steps(5)' }, T + 3.18);
  // Sie stutzt: zurück aufs Wort, dann zu dir. „Arbeiten? Hier?“ Sie schüttelt den Kopf, und dann reift der Plan.
  tl.to(p, { headYaw: -0.1, headPitch: -0.75, lookX: 0, lookY: -0.5, brow: 0.9, headRoll: 0.22, duration: 0.14, ease: 'power3.out' }, T + 4.3)
    .to(p, { headYaw: -0.74, headPitch: -0.06, stare: 1, headRoll: 0.14, lid: 0.08, cock: 0.8, smile: 0.2, duration: 0.18, ease: 'power3.out' }, T + 4.72)
    .call(() => say('Dein Job? Hier?', 1800), null, T + 4.84)
    .to(p, { headYaw: -0.42, headRoll: 0, duration: 0.09, ease: 'sine.inOut' }, T + 5.56)
    .to(p, { headYaw: -1.08, duration: 0.12, ease: 'sine.inOut' }, T + 5.65)
    .to(p, { headYaw: -0.42, duration: 0.12, ease: 'sine.inOut' }, T + 5.77)
    .to(p, { headYaw: -1.08, duration: 0.12, ease: 'sine.inOut' }, T + 5.89)
    .to(p, { headYaw: -0.74, duration: 0.09, ease: 'sine.out' }, T + 6.01)
    .to(p, { brow: -0.7, lid: 0.3, cock: 0.75, smile: 1, duration: 0.14, ease: 'power2.out' }, T + 6.2)
    .to(p, { gesture: 0.5, duration: 0.1, ease: 'power2.out' }, T + 6.46)
    .to(p, { shades: 0, duration: 0.14, ease: 'power2.inOut' }, T + 6.5)
    .to(p, { gesture: 0, duration: 0.14, ease: 'power2.in' }, T + 6.58);
  // Der Plan: Sie hüpft auf das D, pickt einmal kräftig drauf, und das D dreht sich zum M. „Mein Job.“ Dann setzt sie sich stolz drauf.
  const B0 = T + 7, L = B0 + 1.3;
  tl.call(() => { gag.onClaim = false; }, null, B0)
    .to(p, { fold: 0, flapAmp: 0.9, flapRate: 14, tuck: 0.5, stare: 0, headYaw: 0, headRoll: 0, cock: 0.3, smile: 0.3, duration: 0.14 }, B0)
    .to(P, { x: a.x, y: a.y - 70, duration: 0.42, ease: 'power2.out' }, B0)
    .to(P, { y: a.y, duration: 0.3, ease: 'power2.in' }, B0 + 0.42)
    .to(p, { pitch: -0.5, headPitch: -0.6, mouth: 0.8, lid: 0.15, brow: -0.5, lookY: -0.6, duration: 0.2, ease: 'power2.inOut' }, B0 + 0.5)
    .call(() => { A.v += 6; A.sv += 5; A.wv += 1.6; impact(a.x, FLOOR - 30, 0.2); spinSwap(true); }, null, B0 + 0.72)
    .to(p, { fold: 1, flapAmp: 0, pitch: 0.04, mouth: 0, headPitch: -0.1, duration: 0.3, ease: 'power2.out' }, B0 + 0.72)
    .fromTo(p, { squash: 0.22 }, { squash: 0, duration: 0.42, ease: 'back.out(3)', immediateRender: false }, B0 + 0.72);
  // Fertig: „Dein Sommer. Deine Bühne. Mein Job.“ Sie setzt sich drauf, stolz, und klopft sich den Flügel ab. Dann macht sie selig die Augen zu.
  tl.call(() => { gag.onClaim = true; }, null, L)
    .to(p, { fold: 1, flapAmp: 0, pitch: 0.04, sweep: 0, yaw: -0.42, duration: 0.34, ease: 'power2.out' }, L)
    .fromTo(p, { squash: 0.2 }, { squash: 0, duration: 0.42, ease: 'back.out(3)', immediateRender: false }, L)
    .to(p, { headYaw: -0.78, headPitch: 0.12, stare: 1, lookY: 0, lid: 0.22, cock: 0.75, smile: 1, duration: 0.3, ease: 'power2.inOut' }, L + 0.24)
    .to(p, { puff: 1, duration: 0.42, ease: 'back.out(2)' }, L + 0.56)
    .call(() => carryLook(false), null, L + 0.3)
    .call(() => say('Mein Job!', 2300), null, L + 0.74)
    // Jetzt macht sie Urlaub: Brille runter, Schnabel hoch, Augen zu.
    .to(p, { gesture: 0.5, duration: 0.1, ease: 'power2.out' }, L + 1.34)
    .to(p, { shades: 1, duration: 0.13, ease: 'power2.in' }, L + 1.4)
    .to(p, { gesture: 0, duration: 0.13, ease: 'power2.in' }, L + 1.46)
    .to(p, { lid: 1, blink: 0, headYaw: -0.5, headPitch: 0.34, stare: 0, duration: 0.36, ease: 'sine.inOut' }, L + 1.95)
    // Der Ball hat genug gesehen: Er rollt zum Ausholen zurück, duckt sich und schießt flach und hart.
    .call(windUp, null, L + 1.9)
    .call(crouch, null, L + 2.82)
    .call(shootGull, null, L + 3)
    // Im letzten Moment rutscht die Brille runter, und die Augen gehen auf.
    .to(p, { lid: 0, wide: 1, brow: 0.9, cock: 0.2, smile: 0, shades: 2, lookX: 0.9, crest: 0.5, duration: 0.08, ease: 'power3.out' }, L + 3 + 0.12)
    .call(leaveGull, null, L + 4.6);
  return true;
}
// Im Hochformat die kurze Fassung: anfliegen, landen, frech schauen, und dann kommt schon der Ball.
function startGagHoch() {
  const g = window.gsap, p = gull.pose, P = gag.P, T = letters.filter((l) => l.line === 2)[3];
  const land = { x: T.sx, y: T.sy - 34 * T.pu };
  Object.assign(P, { x: view.x0 - 90, y: 90 });
  gull.reset({ yaw: -0.5, pitch: 0.04, roll: 0.3, fold: 0, flapAmp: 0.95, flapRate: 9, tuck: 1, headPitch: -0.1, shades: 1, smile: 0.7 });
  gull.root.visible = true; gag.canHit = true;
  const A = 1.7;
  gag.tl = g.timeline({ onComplete: endGag })
    .to(P, { x: land.x, duration: A, ease: 'sine.out' }, 0)
    .to(P, { y: land.y, duration: A, ease: 'sine.in' }, 0)
    .to(p, { flapAmp: 1.05, flapRate: 15, pitch: 0.62, sweep: 0.5, tuck: 0, roll: 0, yaw: -0.42, duration: 0.34 }, A - 0.42)
    .call(() => { T.v += 4; T.sv += 3.5; T.wv += 1; }, null, A)
    .to(p, { fold: 1, flapAmp: 0, pitch: 0.04, sweep: 0, duration: 0.34, ease: 'power2.out' }, A)
    .fromTo(p, { squash: 0.22 }, { squash: 0, duration: 0.42, ease: 'back.out(3)', immediateRender: false }, A)
    .to(p, { headYaw: -0.74, headPitch: -0.06, stare: 1, shades: 2, lid: 0.08, cock: 0.8, smile: 0.2, headRoll: 0.14, duration: 0.24, ease: 'power3.out' }, A + 0.5)
    .call(() => say('Dein Job?', 1500), null, A + 0.72)
    .to(p, { headYaw: -0.42, headRoll: 0, duration: 0.09, ease: 'sine.inOut' }, A + 1.5)
    .to(p, { headYaw: -1.08, duration: 0.12, ease: 'sine.inOut' }, A + 1.59)
    .to(p, { headYaw: -0.42, duration: 0.12, ease: 'sine.inOut' }, A + 1.71)
    .to(p, { headYaw: -0.74, duration: 0.09, ease: 'sine.out' }, A + 1.83)
    .to(p, { tongue: 1, smile: 1, cock: 0.85, duration: 0.16, ease: 'back.out(2)' }, A + 2.2)
    .call(() => say('Mein Job!', 1500), null, A + 2.3)
    .to(p, { tongue: 0, shades: 1, puff: 1, lid: 1, blink: 0, headYaw: -0.5, headPitch: 0.34, stare: 0, duration: 0.3, ease: 'sine.inOut' }, A + 3)
    .call(shootGull, null, A + 3.5)
    .to(p, { lid: 0, wide: 1, brow: 0.9, cock: 0.2, smile: 0, shades: 2, lookX: 0.9, crest: 0.5, duration: 0.08, ease: 'power3.out' }, A + 3.78)
    .call(leaveGull, null, A + 5);
  return true;
}
// Der Ball verteidigt den Satz.
function aimAtGull(t = 0.62) {
  const ty = gag.P.y - gag.s * 0.6;
  launch((gag.P.x - B.x) / t, (ty - B.y - GRAV * t * t / 2) / t);
}
// Der Ball holt aus: Er rollt ein Stück zurück, damit der Schuss Anlauf hat, und duckt sich kurz vor dem Abschuss.
function windUp() { if (mode === 'rest' && !comp.on) phys.aim = Math.min(REST.x + 190, wallR() - B.r - 8); }
function crouch() { if (mode === 'rest') phys.sv += 7; }
function shootGull(t = 0.62) { if (mode === 'rest') aimAtGull(phys.aim != null ? 0.3 : t); }
function leaveGull() {
  const g = window.gsap, P = gag.P;
  phys.aim = null;
  gag.tl?.kill();
  gag.canHit = false; gag.onClaim = false;
  if (gag.rope) lastLetter();
  carryLook(false);
  rearrange(homeSlot(), null, 'tausch');
  spinSwap(false);
  Object.assign(gull.pose, { fold: 0, flapAmp: 1, flapRate: 12, tuck: 1, yaw: -0.5, pitch: 0.25, roll: 0.3, mouth: 0, wide: 0, lid: 0.2, brow: 0, cock: 0.55, smile: 0.7, shades: 1, puff: 0, crest: 0, gesture: 0, stare: 0, lookX: 0, headYaw: 0, headPitch: 0, blink: 1 });
  gag.tl = g.timeline({ onComplete: endGag }).to(P, { x: view.x0 + view.vw + 240, y: -120, duration: 1.8, ease: 'power1.in' }, 0);
}
function gullHit(nx = 0.4, ny = -0.9, wucht = 900) {
  if (!gag.canHit) return;
  const g = window.gsap, p = gull.pose, P = gag.P, x0 = P.x, y0 = P.y;
  gag.tl?.kill();
  gag.canHit = false; gag.onClaim = false; gag.rope = false; gag.print = false; gag.nodes = [];
  // Die Buchstaben springen zurück, der Satz stimmt wieder.
  rearrange(homeSlot(), null, 'tausch');
  carryLook(false);
  if (claim.tok.work.items[0].alt.visible) spinSwap(false);
  say('Kreisch!', 1300);
  feathers.fire(x0, y0 - gag.s * 0.6, nx, ny, comp.on ? 0.72 : 1);
  startle();
  gull.pluck(true);
  gull.fling(x0 + gag.s * 0.7, y0 - gag.s * 1.05, nx * 340 + (Math.random() - 0.5) * 120, Math.min(ny, -0.5) * 860);
  // Volltreffer: Sie bleibt einen winzigen Moment platt in der Luft stehen, Schnabel auf, Augen rund.
  Object.assign(p, { fold: 0.25, flapAmp: 0, tuck: 1, mouth: 1, lid: 0, wide: 1, brow: 1, cock: 0, smile: 0, crest: 1, puff: 0, stare: 0, lookX: 0, lookY: 0, headYaw: -0.6, headPitch: 0.3, headRoll: 0, walk: 0, squash: 0.36, gesture: 0, stab: 0, blink: 0, sweep: 0, roll: 0 });
  // Wie aus der Kanone geschossen: eine Wurfbahn mit Schwerkraft und Luftwiderstand, je härter der Ball, desto weiter.
  // Dabei zwei Überschläge, die auslaufen, sodass sie am Ende wieder aufrecht ist. Am Scheitel fängt sie sich,
  // sackt kurz durch, schüttelt benommen den Kopf, begreift. Erst dann nichts wie weg, in Schussrichtung.
  const HOLD = 0.08, C = 1.3, GY = 1500, p0 = p.pitch;
  const ry = Math.min(ny, -0.5), rl = Math.hypot(nx, ry) || 1, V = clamp(1150 + wucht * 0.5, 1250, 1900);
  let vx = nx / rl * V, vy = ry / rl * V;
  const dir = vx >= 0 ? 1 : -1, shot = { t: 0 };
  // Die Bahn bleibt im Bild: nur so hoch, wie über ihr Platz ist, und nur so weit, wie es zur Seite noch geht.
  // Flach wie eine Kanonenkugel: viel Zug zur Seite, der Bogen steigt höchstens gut halb so hoch, wie über ihr Platz ist.
  if (Math.abs(vx) < V * 0.75) vx = dir * V * 0.75;
  vy = Math.max(vy, -Math.sqrt(2 * GY * Math.min(380, Math.max(40, (y0 - (view.y0 + gag.s * 1.3)) * 0.6))));
  // Sie fängt sich kurz nach dem Scheitel der Bahn: dort, wo es gerade wieder abwärts geht.
  const T1 = clamp(Math.log((GY / C - vy) / (GY / C)) / C + 0.16, 0.5, 0.95), norm = 1 - Math.exp(-3.4 * T1), reach = (1 - Math.exp(-C * T1)) / C;
  const seite = dir > 0 ? view.x0 + view.vw - gag.s - x0 : x0 - (view.x0 + gag.s);
  if (Math.abs(vx) * reach > seite) vx = dir * Math.max(0, seite) / reach;
  gag.tl = g.timeline()
    .to(p, { squash: 0, duration: 0.3, ease: 'back.out(3)' }, HOLD)
    .to(p, { fold: 0, flapAmp: 1.4, flapRate: 26, duration: 0.1 }, HOLD)
    .to(shot, { t: T1, duration: T1, ease: 'none', onUpdate: () => {
      const t = shot.t, e = (1 - Math.exp(-C * t)) / C;
      // Luftwiderstand linear: v(t) = g/C + (v0 - g/C)·e^(-Ct). y zeigt nach unten, die Schwerkraft zieht nach unten.
      P.x = x0 + vx * e; P.y = y0 + (vy - GY / C) * e + GY * t / C;
      p.pitch = p0 - dir * Math.PI * 4 * (1 - Math.exp(-3.4 * t)) / norm;
    } }, HOLD)
    .to(p, { flapAmp: 0.7, flapRate: 11, mouth: 0.15, wide: 0.8, stab: 0.8, duration: 0.2, ease: 'sine.out' }, HOLD + T1 - 0.12)
    .to(P, { y: '+=18', duration: 0.32, ease: 'sine.inOut' }, HOLD + T1)
    .to(p, { headYaw: 0.55, duration: 0.07, ease: 'sine.inOut' }, HOLD + T1 + 0.05)
    .to(p, { headYaw: -0.55, duration: 0.09, ease: 'sine.inOut' }, HOLD + T1 + 0.12)
    .to(p, { headYaw: 0.35, duration: 0.09, ease: 'sine.inOut' }, HOLD + T1 + 0.21)
    .to(p, { headYaw: dir > 0 ? -0.7 : 0.7, stare: 1, wide: 0.6, mouth: 0.1, duration: 0.18, ease: 'sine.out' }, HOLD + T1 + 0.3)
    .to(p, { flapAmp: 1.35, flapRate: 27, wide: 1, mouth: 0.8, stare: 0, headYaw: 0, yaw: dir > 0 ? -0.42 : Math.PI + 0.42, roll: dir > 0 ? 0.3 : -0.3, duration: 0.16, ease: 'power2.out' }, HOLD + T1 + 0.62)
    .to(P, { x: '+=' + dir * 1300, y: -180, duration: 0.9, ease: 'power2.in' }, HOLD + T1 + 0.66)
    .call(() => { gull.root.visible = false; }, null, HOLD + T1 + 1.58)
    .call(revenge, [24], HOLD + T1 + 2.7);
}
// Sie kommt zurück, ganz ruhig. Sie zielt genau. Und sie schaut nicht einmal hin.
function revenge(tries = 0) {
  const g = window.gsap, p = gull.pose, P = gag.P;
  // Sie wartet, bis der Ball wieder auf seinem Platz liegt. Rache braucht ein ruhiges Ziel.
  if (fly.s > 0.01) { endGag(); return; }
  if (mode !== 'rest' || still() || Math.abs(B.x - REST.x) > 2) {
    if (tries <= 0) { endGag(); return; }
    gag.tl = g.timeline().call(revenge, [tries - 1], 0.6);
    return;
  }
  gag.tl = null;
  const y = Math.max(view.y0 + 90, B.y - 300), speed = 300, fall = Math.sqrt(2 * Math.max(60, B.y - B.r - y - 20) / 1600), lead = 130 * fall;
  const startX = view.x0 + view.vw + 200, rel = (startX - (B.x + lead)) / speed, total = (startX + 240) / speed;
  Object.assign(P, { x: startX, y });
  gull.reset({ yaw: Math.PI + 0.4, pitch: 0.04, roll: -0.34, fold: 0, flapAmp: 0.3, flapRate: 7, tuck: 1, lid: 0.3, brow: -0.6, cock: 0.5, smile: 0.3, shades: 1, shadeTilt: 0.2, crest: 0.45, blink: 0 });
  gull.pluck(true);
  gull.hideFlyer();
  gull.root.visible = true;
  // Kurz vor dem Ziel: Schwanz hoch, Augen zu, Konzentration. Danach ein Blick über die Brille zu dir, und die Zunge raus.
  gag.tl = g.timeline({ onComplete: endGag })
    .to(P, { x: -240, duration: total, ease: 'none' }, 0)
    .to(p, { headPitch: -0.42, lookY: -0.5, duration: 0.3 }, rel - 0.7)
    .to(p, { tailUp: 1, lid: 1, puff: 0.5, duration: 0.2, ease: 'power2.out' }, rel - 0.26)
    .call(releasePlop, null, rel)
    .to(p, { tailUp: 0, lid: 0.18, puff: 0, brow: 0.2, cock: 0.85, smile: 1, shades: 2, lookY: 0, stare: 1, headYaw: 0.86, headPitch: 0.06, duration: 0.3, ease: 'power2.inOut' }, rel + 0.2)
    // Und zum Abschied die Zunge.
    .to(p, { tongue: 1, duration: 0.16, ease: 'back.out(2)' }, rel + 0.62);
}
function releasePlop() {
  Object.assign(plop, { on: true, x: gag.P.x + 30, y: gag.P.y - gag.s * 0.42, vx: -130, vy: 0 });
  plop.mesh.visible = true;
}
function splatBall() {
  const g = window.gsap, n = new THREE.Vector3((plop.x - B.x) / B.r, -(plop.y - B.y) / B.r, 0.42).normalize();
  n.applyQuaternion(ballQ.clone().invert());
  const s = plop.splat;
  s.position.copy(n);
  s.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
  s.visible = true;
  g.killTweensOf(s.scale);
  g.fromTo(s.scale, { x: 0.2, y: 0.2, z: 0.2 }, { x: 1, y: 1, z: 1, duration: 0.2, ease: 'back.out(3)' });
  g.to(s.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.8, delay: 16, ease: 'power2.in', onComplete: () => { s.visible = false; } });
  phys.sv += 2.4;
  say('Quitt.', 1900);
}
function endGag() {
  gag.tl = null; gag.canHit = false; gag.onClaim = false; gag.rope = false; gag.print = false; phys.aim = null;
  gag.next = 75 + Math.random() * 30;
  if (gull) gull.root.visible = false;
  plateMat.uniforms.uGullShadow.value.w = 0;
}
function resetLetter(l) {
  Object.assign(l, { x: l[homeSlot()], y: 0, jump: 0, jv: 0, rz: 0, rzT: 0, rv: 0, spin: 0, air: false, up: false, crouch: false, ox: 0, ov: 0 });
}
function abortGag() {
  const g = window.gsap;
  gag.tl?.kill();
  if (g) { g.killTweensOf(claim.items); if (gull) g.killTweensOf(gull.pose); g.killTweensOf(gag.P); }
  claim.items.forEach(resetLetter);
  setLower(false);
  carryLook(false, true);
  gag.nodes = []; gag.bubble.hidden = true;
  gull?.hideFlyer();
  plop.on = false; if (plop.mesh) plop.mesh.visible = false;
  endGag();
  gag.next = 30;
}
function updateGag(dt) {
  if (!gull) return;
  gull.stepFlyer(still() ? 0 : dt, FLOOR + 12);
  if ((gag.tl || gull.root.visible) && fly.s > 0.02) abortGag();
  if (!gag.tl && mode === 'rest' && !still() && fly.s < 0.01) { gag.next -= dt; if (gag.next <= 0 && !startGag()) gag.next = 4; }
  if (plop.on) {
    plop.vy += 1600 * dt; plop.x += plop.vx * dt; plop.y += plop.vy * dt;
    plop.mesh.position.set((plop.x - CX) * BALL_W / F, -(plop.y - CY) * BALL_W / F, -BALL_W + 4);
    plop.mesh.scale.setScalar(7 * BALL_W / F);
    if (Math.hypot(plop.x - B.x, plop.y - B.y) < B.r) { plop.on = false; plop.mesh.visible = false; splatBall(); }
    else if (plop.y > FLOOR) { plop.on = false; plop.mesh.visible = false; }
  }
  if (!gull.root.visible) return;
  const P = gag.P, u = plateMat.uniforms.uGullShadow.value;
  gull.update(still() ? 0 : dt);
  gull.place(P.x, P.y);
  if (gag.rope) {
    gull.beak(gag.tip);
    const g = gag.grip;
    gag.ax = gag.from.x + (gag.tip.x + gag.lead - gag.from.x) * g;
    gag.ay = gag.from.y + (gag.tip.y + gag.hold - gag.from.y) * g;
  }
  printWord(dt);
  const low = smooth(560, 640, P.y), hi = clamp((680 - P.y) / 500, 0, 1);
  u.set(P.x + hi * 26, 676 + (P.y + 8 - 676) * low, 54 + hi * 42, 0.56 - 0.3 * hi);
  if (!gag.bubble.hidden) gag.bubble.style.translate = `${Math.min(view.w - 210, Math.max(10, (P.x - 34 - view.x0) * view.s))}px ${Math.max(10, (P.y - gag.s * 2.05 - view.y0) * view.s)}px`;
}
function startle() { if (flock.t > 5) flock.t = 0; }

// --- Der Aufkleber „Bewerben“ ist ein echtes Ziel: Er schwingt, wenn der Ball ihn trifft. ---
function measureSticker() {
  const r = stick.el.getBoundingClientRect(), c = hero.getBoundingClientRect();
  stick.cx = view.x0 + (r.left + r.width / 2 - stick.x - c.left) / view.s;
  stick.cy = view.y0 + (r.top + r.height / 2 - stick.y - c.top) / view.s;
  stick.R = (r.width / 2 / view.s) * 0.84;
}
function hitSticker(nx, ny, k = 1) {
  stick.active = true; stick.cool = 0.5;
  stick.vx += nx * 460 * k; stick.vy += ny * 460 * k; stick.vr += (nx >= 0 ? 1 : -1) * 300 * k;
  setHit(true);
  bumpMenu(0.8);
  startle();
  fireConfetti(B.x + nx * B.r, B.y + ny * B.r);
  stickerSpin?.updatePlaybackRate(9);
  clearTimeout(stick.timer);
  stick.timer = setTimeout(() => { stickerSpin?.updatePlaybackRate(1); }, 1500);
}
function updateSticker(dt) {
  stick.cool = Math.max(0, stick.cool - dt);
  if (!stick.active) return;
  const h = Math.min(dt, 1 / 40);
  stick.vx += (-150 * stick.x - 11 * stick.vx) * h; stick.vy += (-150 * stick.y - 11 * stick.vy) * h; stick.vr += (-90 * stick.r - 7 * stick.vr) * h;
  stick.x += stick.vx * h; stick.y += stick.vy * h; stick.r += stick.vr * h;
  stick.el.style.transform = `translate(${stick.x.toFixed(2)}px, ${stick.y.toFixed(2)}px) rotate(${stick.r.toFixed(2)}deg)`;
  if (Math.abs(stick.x) + Math.abs(stick.y) + Math.abs(stick.r) + Math.abs(stick.vx) + Math.abs(stick.vy) + Math.abs(stick.vr) < 0.4) { stick.active = false; stick.x = stick.y = stick.r = 0; stick.el.style.transform = ''; }
}
// Ein Klick ist ein Aufschlag in Richtung Bewerben: meistens Treffer, manchmal knapp daneben.
function serve() {
  if (gag.canHit && gull?.root.visible) { aimAtGull(); return; }
  const t = 0.92, off = Math.random() < 0.22 ? (Math.random() < 0.5 ? -1 : 1) * (stick.R + B.r + 34) : (Math.random() - 0.5) * stick.R;
  const ty = Math.min(stick.cy + (Math.random() - 0.5) * stick.R * 0.6, FLOOR - B.r - 8);
  launch((stick.cx + off - B.x) / t, (ty - B.y - GRAV * t * t / 2) / t);
}

function layout() {
  const rect = hero.getBoundingClientRect();
  const w = Math.max(1, rect.width), h = Math.max(1, rect.height);
  let s = w / W, x0 = 0, y0 = 0, vw = W, vh = h / s;
  if (vh < H) {
    const crop = H - vh, bot = Math.min(crop, 66), top = crop - bot;
    if (top > 74) { vh = 632; s = h / vh; vw = w / s; x0 = (W - vw) / 2; y0 = 80; } else y0 = top;
  }
  const portrait = h > w * 1.02;
  // Das Bild reicht unten etwas weiter als die Vorlage: Die Terrasse wird gedehnt, damit unter dem Ball Platz für die Knöpfe bleibt.
  if (portrait) { vh = H + 74; s = h / vh; vw = w / s; x0 = clamp(592 - vw / 2, 0, W - vw); y0 = 0; } else {
    const foot = bottom.getBoundingClientRect().height;
    // Unten muss der Ball ganz im Bild bleiben.
    y0 = clamp(Math.max(610 + foot / s + 6, 712) - vh, y0, 90);
  }
  Object.assign(view, { x0, y0, vw, vh, s, w, h });
  const dpr = Math.min(devicePixelRatio || 1, dprCap);
  renderer.setPixelRatio(dpr); renderer.setSize(w, h, false);
  glint.value.y = 1 / (w * dpr);
  claim.on = true;
  compose(portrait);
  measureSticker();
  measureWater();
  cam.setViewOffset(W, H, x0, y0, vw, vh); cam.updateProjectionMatrix();
  const u = plateMat.uniforms;
  u.uView.value.set(x0, y0, vw, vh);
  u.uShadowOff.value.set(14 / vw, 15 / vh);
  u.uStretch.value = !portrait && vh > H ? clamp(86 / (vh - 640 - 30), 0.22, 1) : 1;
  u.uMirror.value = portrait ? 1 : 0;
  // Schatten der Schrift: Viertelauflösung reicht für den großen Schriftzug. Im Hochformat und auf schmalen Bildschirmen
  // ist der Spruch so klein, dass seine Striche durchs Raster fallen (Punktmuster): dort halbe Auflösung, gleich weich.
  const teil = portrait || w < 900 ? 2 : 4, rw = Math.max(2, Math.round(w * dpr / teil)), rh = Math.max(2, Math.round(h * dpr / teil));
  rtA.setSize(rw, rh); rtB.setSize(rw, rh);
  blurMat.userData.rw = rw; blurMat.userData.rh = rh; blurMat.userData.k = 4 / teil;
  setFly(!reduced.matches);
}
const homeSlot = () => (comp.on ? 'xP' : 'xA');
// Der Satz bekommt im Hochformat seine eigene Fläche unter dem Schriftzug, mit derselben Flucht nach rechts hinten.
function claimLayout(portrait) {
  if (!claim.group) return;
  if (portrait) {
    const v = view, L = v.x0 + v.vw * 0.06, R = v.x0 + v.vw * 0.94, T = comp.qy + 511 * comp.a / 2 + 18;
    const hq = (R - L) * claim.hP / claim.wP, hr = hq * 0.9, tr = T + (hq - hr) * 0.45;
    const inv = ([x, y]) => [(x - comp.qx) / comp.a + comp.px, (y - comp.qy) / comp.a + comp.py];
    const quad = [[L, T], [R, tr], [R, tr + hr], [L, T + hq]].map(inv);
    claim.inv = solveH(quad, [[0, claim.hP], [claim.wP, claim.hP], [claim.wP, 0], [0, 0]]);
    const base = basisFromQuad(quad, claim.wP, claim.hP, claim.depth), far = -new THREE.Vector3(claim.wP / 2, claim.hP / 2, claim.depth).applyMatrix4(base).z;
    claim.basis = new THREE.Matrix4().makeScale(700 / far, 700 / far, 700 / far).multiply(base);
  } else { claim.basis = claim.basisA; claim.inv = claim.invA; }
  claim.group.userData.basis = claim.basis;
  for (const l of claim.items) {
    if (!l.air) { l.x = l[homeSlot()]; l.y = 0; }
    l.ly = portrait ? l.lyP : 0;
    const p = claimToStage(l[homeSlot()], 26 + l.ly); l.sx = p.x; l.sy = p.y;
  }
}
// Unterkante des Satzes im Hochformat, in Bühnenpunkten (wie die Satzfläche in claimLayout).
function claimFloor() {
  if (!claim.wP) return 0;
  const v = view, T = comp.qy + 511 * comp.a / 2 + 18;
  return T + v.vw * 0.88 * claim.hP / claim.wP;
}
function compose(portrait) {
  const v = view;
  if (comp.on !== portrait && gag.tl) abortGag();
  comp.on = portrait;
  comp.a = portrait ? Math.min(v.vw * 0.94 / 904, 0.5) : 1;
  comp.qx = portrait ? v.x0 + v.vw / 2 : comp.px;
  comp.qy = portrait ? 254 + 511 * comp.a / 2 : comp.py;
  for (const l of letters) { l.sx = comp.a * (l.sx0 - comp.px) + comp.qx; l.sy = comp.a * (l.sy0 - comp.py) + comp.qy; l.pu = l.pu0 * comp.a; }
  // Dieselbe Kamera mit anderem Bildausschnitt: So bleibt der Schriftzug exakt derselbe, nur kleiner und an neuer Stelle.
  camL.setViewOffset(W, H, comp.px - (comp.qx - v.x0) / comp.a, comp.py - (comp.qy - v.y0) / comp.a, v.vw / comp.a, v.vh / comp.a);
  camL.updateProjectionMatrix();
  if (portrait) cam.layers.disable(1); else cam.layers.enable(1);
  // Der Ball wird kleiner und liegt links vom festen Aufkleber. Auf kurzen Bildschirmen höchstens so groß, dass er unter dem Satz Platz hat.
  ballR = portrait ? clamp(Math.min(v.vw * 0.125, (FLOOR - claimFloor() - 14) / 2), 40, 58) : BALL_R;
  REST.x = portrait ? v.x0 + v.vw * 0.42 : 1128;
  REST.y = FLOOR - ballR;
  if (mode !== 'intro' && mode !== 'free') { B.r = ballR; B.y = Math.min(B.y, REST.y); if (mode === 'rest') B.y = REST.y; }
  gag.s = GULL_S * (portrait ? 0.62 : 1);
  gull?.setSize(gag.s);
  claimLayout(portrait);
  if (grip) { const g = ballR * 2.5 * v.s; grip.style.width = grip.style.height = `${g.toFixed(0)}px`; grip.style.margin = `${(-g / 2).toFixed(0)}px 0 0 ${(-g / 2).toFixed(0)}px`; }
}
function setFly(on) {
  fly.on = on;
  root.classList.toggle('fly', on);
}
function readScroll() {
  if (!fly.on) { fly.p = 0; return; }
  const r = track.getBoundingClientRect();
  fly.p = clamp(-r.top / Math.max(1, r.height - innerHeight), 0, 1);
}
function updateFly(dt) {
  readScroll();
  const before = fly.s;
  fly.s += (fly.p - fly.s) * (1 - Math.exp(-dt * 7));
  if (Math.abs(fly.p - fly.s) < 0.0004) fly.s = fly.p;
  fly.v = Math.abs(fly.s - before) / Math.max(dt, 0.001);
  const p = fly.s;
  fly.k = 1 + 6.2 * Math.pow(p, 2.3);
  const e = smooth(0, 0.55, p);
  fly.tx = RING_C.x + (view.x0 + view.vw / 2 - RING_C.x) * e;
  fly.ty = RING_C.y + (view.y0 + view.vh / 2 - RING_C.y) * e;
  const u = plateMat.uniforms;
  u.uZoom.value = fly.k;
  u.uTarget.value.set(fly.tx, fly.ty);
  u.uBlur.value = clamp(fly.v * 0.05, 0, 0.09) * smooth(0.04, 0.2, p);
  u.uHole.value = smooth(0.4, 0.66, p);
  // Die Terrasse kommt beim Öffnen der Blende ein wenig auf einen zu und setzt sich.
  if (landung) landung.style.scale = fly.on ? (1.06 - 0.06 * u.uHole.value).toFixed(4) : '';
  u.uFx.value = 1 - smooth(0.02, 0.2, p);
  const fade = 1 - smooth(0, 0.12, p);
  bottom.style.opacity = fade.toFixed(3);
  bottom.style.visibility = fade < 0.01 ? 'hidden' : '';
  formLink.style.opacity = bottom.style.opacity; formLink.style.visibility = bottom.style.visibility;
  // Nach dem Flug liegt hinter der Kopfzeile Creme statt Himmel: Dann wird die Schrift dunkel.
  root.classList.toggle('past', p > 0.6);
  canvas.style.pointerEvents = p > 0.6 ? 'none' : '';
  const gone = p > 0.985;
  canvas.style.visibility = gone ? 'hidden' : '';
  return gone;
}

const tmpA = new THREE.Matrix4(), tmpB = new THREE.Matrix4(), tmpC = new THREE.Matrix4(), tmpD = new THREE.Matrix4(), tmpE = new THREE.Matrix4(), tmpF = new THREE.Matrix4(), PIVOT = new THREE.Vector3(0, 0, -780), EUL = new THREE.Euler();
function applyLetters() {
  tmpA.makeTranslation(PIVOT.x, PIVOT.y, PIVOT.z);
  tmpB.makeRotationFromEuler(EUL.set(pointer.sy * 0.016, pointer.sx * 0.024, 0));
  tmpC.makeTranslation(-PIVOT.x, -PIVOT.y, -PIVOT.z);
  const tilt = tmpE.copy(tmpA).multiply(tmpB).multiply(tmpC);
  groups.forEach((g, li) => {
    // Beim Flug rast die Schrift schneller auf die Kamera zu als der Ring.
    const gain = 1 + (fly.k - 1) * (1.7 + li * 0.45);
    const w = g.userData.w, dz = w * (1 - 1 / gain);
    // Die Zeilen weichen beim Näherkommen zur Seite aus und verlassen das Bild.
    // Sobald sich hinter dem Ring die Blende öffnet, fliegen sie schneller hinaus, damit keine Bruchstücke über der Terrasse hängen.
    const flee = 1 + 5 * smooth(0.4, 0.6, fly.s);
    const away = (fly.k - 1) * (li === 0 ? -130 : li === 1 ? -190 : 120) * flee, drop = (fly.k - 1) * (li === 0 ? -110 : li === 1 ? 90 : 170) * flee;
    const ka = comp.a, ftx = (fly.tx - comp.qx) / ka + comp.px, fty = (fly.ty - comp.qy) / ka + comp.py, rcx = (RING_C.x - comp.qx) / ka + comp.px, rcy = (RING_C.y - comp.qy) / ka + comp.py;
    const dx = ((ftx - CX) / gain + CX - rcx + away / (gain * ka)) * w / F, dy = -((fty - CY) / gain + CY - rcy + drop / (gain * ka)) * w / F;
    g.visible = gain < 9 && fly.s < 0.7 && (li < 3 || claim.on);
    tmpD.makeTranslation(fly.k > 1.0001 ? dx : 0, fly.k > 1.0001 ? dy : 0, dz);
    const par = li === 3 ? 1.5 : 2 + li * 1.2;
    g.matrix.copy(tmpD).multiply(tilt).multiply(tmpF.makeTranslation(pointer.sx * par, -pointer.sy * (1 + Math.min(li, 2) * 0.6), 0)).multiply(g.userData.basis);
    g.matrixWorldNeedsUpdate = true;
  });
  for (const l of claim.items) {
    const q = l.pivot, sq = Math.min(0.55, l.sq);
    q.visible = l.on;
    q.position.set(l.x + l.ox, l.y + l.ly + l.jump - l.press * 9, -l.press * 2);
    q.rotation.set(0, l.spin, l.rz + l.wob);
    q.scale.set(l.s / Math.sqrt(1 - sq), l.s * (1 - sq), l.s);
  }
  for (const l of letters) {
    const sq = clamp(l.sq, -0.2, 0.5);
    l.pivot.visible = l.on;
    l.pivot.position.x = l.home + l.dx / l.pu;
    // Gewicht drückt nach hinten (Ball, Aufprall), der Zeiger hebt nach oben und ein Stück nach vorn.
    l.pivot.position.y = l.drop - l.press * 6.2 + l.lift * 24 - l.dy / l.pu;
    l.pivot.position.z = -l.press * 3.5 + l.lift * 4;
    l.pivot.scale.set(1 / Math.sqrt(1 - sq), 1 - sq, 1);
    l.pivot.rotation.x = l.press * 0.07;
    // Jeder Buchstabe neigt sich mit dem Hang der Welle und dreht sich ein wenig zum Zeiger.
    l.pivot.rotation.z = l.wob - l.dx * 0.0034 + ((l.prev ? l.prev.press : l.press) - (l.next ? l.next.press : l.press)) * 0.055 + ((l.next ? l.next.lift : l.lift) - (l.prev ? l.prev.lift : l.lift)) * 0.09;
    l.pivot.rotation.y = (pointer.px - l.sx) / W * 0.09 * S.sheen;
    const warm = clamp((Math.max(l.press, l.lift) - 0.1) * 1.05, 0, 1);
    l.front.color.lerpColors(CREAM, WARM, warm);
    l.side.color.lerpColors(CREAM_SIDE, WARM_SIDE, warm);
  }
}

const still = () => paused || reduced.matches;
function letterGoals(dt) {
  const breathe = still() ? 0 : 0.075;
  const active = pointer.over && mode !== 'drag' && fly.s < 0.01;
  // Eine schnelle Hand bewegt mehr als eine langsame und zieht die Buchstaben ein wenig mit, wie Gras im Wind.
  const gain = 1.6 + Math.min(Math.abs(pointer.vx) / 2400, 0.35);
  for (const l of letters) {
    // Auch ohne Zeiger atmet der Schriftzug: eine ganz flache Welle läuft durch.
    let g = breathe * Math.sin(time * 0.9 - l.sx * 0.008 - l.sy * 0.005);
    // Unter dem Zeiger hebt sich der Buchstabe, die Nachbarn gehen als Welle mit (hoch und runter statt Klaviertaste, Ike 02.11.2026).
    l.lgoal = 0;
    if (active && l.on) {
      const dx = pointer.x - l.sx, dy = pointer.y - l.sy;
      const e = Math.exp(-(dx * dx) / (2 * 78 * 78) - (dy * dy) / (2 * 90 * 90));
      l.lgoal = gain * e;
      if (!reduced.matches) l.wv -= pointer.vx * 0.0025 * e * dt;
    }
    // Das Gewicht des Balls drückt die Schrift nach hinten, die Nachbarn geben mit nach.
    if (l.on && mode !== 'intro' && fly.s < 0.01) g += 1.25 * clamp((B.r + 70 - Math.hypot(B.x - l.sx - l.dx, B.y - l.sy - l.dy)) / 80, 0, 1);
    l.goal = g;
  }
  const foot = gag.onClaim ? stageToClaim(gag.P.x, gag.P.y).x : null;
  for (const l of claim.items) {
    let g = 0;
    if (active && !gag.tl && l.on) {
      const dx = pointer.x - l.sx, dy = pointer.y - l.sy;
      g = 1.15 * Math.exp(-(dx * dx) / (2 * 30 * 30) - (dy * dy) / (2 * 38 * 38));
    }
    // Wo die Möwe steht, gibt der Buchstabe unter ihrem Gewicht nach.
    if (foot !== null) { const d = l.x - foot; g += 0.95 * Math.exp(-(d * d) / (2 * 26 * 26)); }
    l.goal = g;
  }
}
function stepLetters(h) {
  if (reduced.matches) {
    for (const l of letters) { l.press += (clamp(Math.max(l.goal, l.lgoal), 0, 1) - l.press) * Math.min(1, h * 8); l.v = 0; l.lift = 0; l.lv = 0; l.wob = 0; l.wv = 0; l.dx = 0; l.dy = 0; l.dvx = 0; l.dvy = 0; }
    return;
  }
  for (const l of letters) {
    let f = 26 * (l.goal - l.press) - 6.6 * l.v, fx = -24 * l.dx * (1 + l.dx * l.dx / 5200) - 6.4 * l.dvx;
    // Das Heben federt weich: Zieht der Zeiger weiter, sinkt der Buchstabe einmal unter seine Ruhelage und kommt zurück.
    let lf = 34 * (l.lgoal - l.lift) - 4.6 * l.lv;
    for (let i = 0; i < l.ln.length; i++) { f += 15 * l.lw[i] * (l.ln[i].press - l.press); lf += 14 * l.lw[i] * (l.ln[i].lift - l.lift); fx += 9 * l.lw[i] * (l.ln[i].dx - l.dx); }
    l.lf = lf;
    // Buchstaben einer Zeile schieben einander, statt übereinanderzurutschen.
    if (l.prev && l.dx < l.prev.dx) fx += (l.prev.dx - l.dx) * 170;
    if (l.next && l.next.dx < l.dx) fx -= (l.dx - l.next.dx) * 170;
    l.f = f; l.fx = fx;
  }
  for (const l of letters) {
    l.v += l.f * h; l.press = clamp(l.press + l.v * h, -0.7, 1.35);
    l.lv += l.lf * h; l.lift = clamp(l.lift + l.lv * h, -0.6, 1.7);
    l.dvx += l.fx * h; l.dx += l.dvx * h;
    l.dvy += (-34 * l.dy - 7.5 * l.dvy) * h; l.dy += l.dvy * h;
    l.wv += (-70 * l.wob - 5.5 * l.wv) * h; l.wob += l.wv * h;
    l.sv += (-420 * l.sq - 15 * l.sv) * h; l.sq += l.sv * h;
  }
}
// Ein Aufprall läuft als Welle durch die Terrasse in den Schriftzug.
function impact(x, y, amp) {
  if (skipping || reduced.matches) return;
  pulses.push({ x, y, amp, age: 0 });
  lastPulse = { x, y, age: 0, amp };
  if (amp > 0.3) bumpMenu(amp);
  if (amp > 0.55) startle();
}
function updatePulses(dt) {
  lastPulse.age += dt;
  for (let i = pulses.length - 1; i >= 0; i--) {
    const p = pulses[i], r0 = p.age * 850;
    p.age += dt;
    const r1 = p.age * 850;
    for (const l of letters) {
      if (!l.on) continue;
      const d = Math.hypot(l.sx - p.x, l.sy - p.y);
      if (d >= r0 && d < r1) { const f = p.amp * Math.exp(-d / 620); l.v += 3.4 * f; l.wv += (l.sx < p.x ? 1 : -1) * 1.1 * f; }
    }
    // Die kleinen Buchstaben hüpfen bei jedem Aufprall wie Besteck auf einem Tisch, auf den jemand haut.
    for (const l of claim.items) {
      if (!l.on) continue;
      const d = Math.hypot(l.sx - p.x, l.sy - p.y);
      if (d >= r0 && d < r1) { const f = p.amp * Math.exp(-d / 460); l.jv = Math.max(l.jv, 620 * f); l.wv += (l.sx < p.x ? 1 : -1) * 2.2 * f; }
    }
    if (r1 > 1500) pulses.splice(i, 1);
  }
}

let hitTimer = 0;
function setHit(on) {
  const hit = document.getElementById('hit');
  clearTimeout(hitTimer);
  if (on) { hit.textContent = HIT_LINES[Math.min(stick.hits, HIT_LINES.length - 1)]; stick.hits++; hitTimer = setTimeout(() => setHit(false), 2800); }
  hit.hidden = !on;
  stick.el.classList.toggle('cheer', on);
}
const rollQ = new THREE.Quaternion(), rollAxis = new THREE.Vector3(0, 0, 1);
function roll(dx) {
  if (Math.abs(dx) < 0.001) return;
  ballQ.premultiply(rollQ.setFromAxisAngle(rollAxis, -dx / B.r));
}
// Vor jedem Wurf wird das Ziel frisch vermessen: Der Aufkleber kann sich seit dem Laden verschoben oder seine Größe geändert haben.
function launch(vx, vy) { measureSticker(); Object.assign(phys, { vx, vy, scored: false, wasIn: inPoly(HOLE, B.x, B.y), aim: null }); mode = 'free'; }
// Die Physik läuft in festen, kleinen Schritten und ist damit auf jedem Bildschirm gleich.
// Der Ball ist schwer und die Schrift nachgiebig: Er prallt nicht ab, sondern drückt die Buchstaben auseinander. Sie weichen zur Seite aus,
// nehmen die Nachbarn mit und kommen weich zurück, sobald er durch ist. Das gilt im Flug, beim Tragen und beim Rollen.
const wallL = () => (comp.on ? view.x0 : 0), wallR = () => (comp.on ? view.x0 + view.vw : W);
function pressLetters(h) {
  if (fly.s >= 0.01 || reduced.matches) return;
  const free = mode === 'free';
  for (const l of letters) {
    if (!l.on) continue;
    const dx = l.sx + l.dx - B.x, dy = l.sy + l.dy - B.y, d = Math.hypot(dx, dy), reach = B.r + 40;
    if (d >= reach || d === 0) continue;
    const over = reach - d, side = dx >= 0 ? 1 : -1, nx = dx / d, ny = dy / d;
    // Vor allem zur Seite: Auch ein Treffer genau von oben teilt die Buchstaben.
    l.dvx += (nx * 0.55 + side * 0.45) * over * 64 * h;
    l.dvy += Math.max(ny, 0.1) * over * 22 * h;
    l.wv += side * over * 0.11 * h;
    l.sv += over * 0.5 * h;
    if (free) {
      const drag = Math.exp(-h * over * 0.024);
      phys.vx *= drag; phys.vy *= phys.vy < 0 ? drag : Math.exp(-h * over * 0.02);
    }
  }
  if (!comp.on && B.y + B.r < 610) return;
  for (const l of claim.items) {
    if (!l.on || l.air) continue;
    const c = claimToStage(l.x, 26 + l.ly), dx = c.x + l.ox * 0.58 - B.x, d = Math.hypot(dx, c.y - B.y), reach = B.r + 8;
    if (d >= reach || d === 0) continue;
    const over = reach - d;
    l.ov += (dx >= 0 ? 1 : -1) * over * 190 * h;
    l.wv += (dx >= 0 ? 1 : -1) * over * 0.42 * h;
    l.v += over * 0.5 * h;
  }
}
function stepBall(h) {
  if (mode === 'intro') return;
  pressLetters(h);
  phys.sv += (-760 * phys.sq - 30 * phys.sv) * h; phys.sq += phys.sv * h;
  // Egal wo der Ball aufkommt: Er läuft aus, kehrt weich um und rollt ohne Pause zu seinem Platz zurück.
  if (mode === 'rest') {
    const home = phys.aim ?? REST.x, top = phys.aim != null ? 260 : 135;
    const dx = home - B.x, want = still() ? 0 : clamp(dx * 1.1 * (phys.aim != null ? 3 : 1), -top, top);
    const rate = want * phys.homeV < 0 || Math.abs(want) < Math.abs(phys.homeV) ? 520 : phys.aim != null ? 640 : 200;
    phys.homeV += clamp(want - phys.homeV, -rate * h, rate * h);
    B.x = clamp(B.x + phys.homeV * h, wallL() + B.r, wallR() - B.r);
    if (Math.abs(dx) < 0.3 && Math.abs(phys.homeV) < 1) { B.x = home; phys.homeV = 0; }
    return;
  }
  if (mode !== 'free') return;
  phys.vy += GRAV * h; B.x += phys.vx * h; B.y += phys.vy * h;
  const floor = FLOOR - B.r;
  if (B.y >= floor) {
    const hit = phys.vy;
    B.y = floor;
    if (hit > 200) { phys.sv += Math.min(hit, 2200) * 0.0068; impact(B.x, FLOOR, clamp(hit / 1900, 0.12, 1)); }
    if (hit > 110) { phys.vy = -hit * BOUNCE; phys.vx *= 0.93; } else phys.vy = 0;
  }
  // Die Wände halten ihn nur auf, wenn er hinaus will. Von außen rollt er ungehindert herein.
  if (B.x < wallL() + B.r && phys.vx <= 0) { B.x = wallL() + B.r; phys.vx = Math.abs(phys.vx) * 0.7; }
  if (B.x > wallR() - B.r && phys.vx >= 0) { B.x = wallR() - B.r; phys.vx = -Math.abs(phys.vx) * 0.7; }
  if (B.y < -320) { B.y = -320; phys.vy = Math.abs(phys.vy) * 0.3; }

  if (B.x < 460 && B.y < 340) S.gust = Math.min(1, S.gust + h * 3);

  // Durch den Ring: die Sonne blitzt auf.
  const inside = inPoly(HOLE, B.x, B.y);
  if (inside && !phys.wasIn && !phys.scored && Math.hypot(phys.vx, phys.vy) > 240) {
    phys.scored = true;
    if (window.gsap) window.gsap.fromTo(S, { flare: 1.25 }, { flare: 0.2, duration: 1.5, ease: 'power2.out', overwrite: 'auto' }); else S.flare = 0.2;
  }
  phys.wasIn = inside;

  // Der Aufkleber: Das ist der eigentliche Treffer.
  const tdx = stick.cx - B.x, tdy = stick.cy - B.y, td = Math.hypot(tdx, tdy), reachS = B.r + stick.R + (comp.on ? 36 : 0);
  // Knapp daneben zählt fast: Fliegt der Ball auf den Aufkleber zu, zieht der ihn in der Nähe ein wenig zu sich.
  if (td > reachS && td < reachS + 70 && !stick.cool) {
    const vn = (phys.vx * tdx + phys.vy * tdy) / td;
    if (vn > 200) { const k = 1 - (td - reachS) / 70; phys.vx += tdx / td * 6000 * k * h; phys.vy += tdy / td * 6000 * k * h; }
  }
  if (td < reachS && td > 0 && !stick.cool) {
    const nx = tdx / td, ny = tdy / td, vn = phys.vx * nx + phys.vy * ny;
    if (vn > 0) { phys.vx -= 1.6 * vn * nx; phys.vy -= 1.6 * vn * ny; }
    B.x -= nx * (reachS - td); B.y -= ny * (reachS - td);
    if (comp.on) phys.vy = Math.min(phys.vy, -520);
    hitSticker(nx, ny);
  }
  // Die Möwe lässt sich abschießen.
  if (gag.canHit && gull?.root.visible) {
    const gdx = gag.P.x - B.x, gdy = gag.P.y - gag.s * 0.6 - B.y, gd = Math.hypot(gdx, gdy);
    if (gd < B.r + gag.s * 0.5 && gd > 0) {
      const nx = gdx / gd, ny = gdy / gd, vn = phys.vx * nx + phys.vy * ny, wucht = Math.hypot(phys.vx, phys.vy);
      if (vn > 0) { phys.vx -= 1.5 * vn * nx; phys.vy -= 1.5 * vn * ny; }
      gullHit(nx, Math.min(ny, -0.2), wucht);
    }
  }

  // Sobald er nicht mehr springt, rollt er: Sein Tempo nimmt er mit, damit kein Stillstand entsteht.
  if (phys.vy === 0 && B.y >= floor - 0.5) { phys.homeV = phys.vx; phys.vx = 0; mode = 'rest'; }
}
function updateBall(dt) {
  const bx = pointer.sx * 3, by = -pointer.sy * 2;
  phys.hopCool = Math.max(0, phys.hopCool - dt);
  if (mode === 'drag') {
    const e = 1 - Math.exp(-dt * 30);
    B.x += (phys.grab.x - B.x) * e; B.y += (phys.grab.y - B.y) * e;
    // Wer den Ball in der Hand an den Aufkleber schlägt, trifft auch: Der Aufkleber schwingt, der Ball prallt ab und fliegt weiter.
    const dx = stick.cx - B.x, dy = stick.cy - B.y, d = Math.hypot(dx, dy), reach = B.r + stick.R;
    if (d < reach && d > 0 && !stick.cool) {
      const nx = dx / d, ny = dy / d, hs = phys.hist, a = hs[0], z = hs[hs.length - 1], t = Math.max(16, z.t - a.t) / 1000;
      let vx = clamp((z.x - a.x) / t, -2600, 2600), vy = clamp((z.y - a.y) / t, -2600, 2600);
      const vn = vx * nx + vy * ny;
      if (vn > 0) { vx -= 1.6 * vn * nx; vy -= 1.6 * vn * ny; }
      B.x -= nx * (reach - d); B.y -= ny * (reach - d);
      hitSticker(nx, ny, clamp(Math.hypot(vx, vy) / 1400, 0.6, 1.5));
      canvas.style.cursor = '';
      launch(vx - nx * 260, vy - ny * 260);
    }
  }
  if (mode === 'rest' && !still() && fly.s < 0.01) {
    // Kommt der Zeiger, hüpft der Ball einmal kurz. Lässt man ihn in Ruhe, meldet er sich ab und zu von selbst.
    const near = pointer.over && Math.hypot(pointer.x - B.x, pointer.y - B.y) < B.r + 4;
    phys.idle -= dt;
    if (near && !phys.hopCool) { phys.hopCool = 1.6; phys.idle = 8 + Math.random() * 7; launch(0, -620); }
    else if (phys.idle <= 0) { phys.idle = 8 + Math.random() * 7; if (!gag.tl && Math.abs(B.x - REST.x) < 2) launch((Math.random() - 0.5) * 70, -540); }
  }
  if (mode !== 'intro') {
    const sy = 1 - phys.sq + (mode === 'free' ? 0.11 * clamp(Math.abs(phys.vy) / 1500, 0, 1) : 0);
    B.sy = sy; B.sx = 1 / Math.sqrt(sy);
    B.shadow = clamp(0.62 - (FLOOR - B.r - B.y) / 620, 0.08, 0.62);
  }
  // Die Drehung folgt immer dem Weg über den Boden.
  if (mode !== 'drag') roll(B.x - lastBx);
  lastBx = B.x;
  placeBall(bx, by);
  if (grip && comp.on) grip.style.transform = `translate(${((B.x - view.x0) * view.s).toFixed(1)}px, ${((B.y - view.y0) * view.s).toFixed(1)}px)`;
  const u = plateMat.uniforms;
  u.uBall.value.set(B.x, B.y, B.r, 0);
  u.uBallShadow.value = B.shadow * (1 - smooth(0.02, 0.14, fly.s));
}

// Schafft der Rechner kein flüssiges Bild, senken wir die Auflösung, bis es wieder läuft. Flüssig geht vor scharf.
function pace(ms) {
  if (debug || ms > 150) return;
  paceSum += ms; paceN++;
  if (paceN < 40) return;
  const avg = paceSum / paceN, dpr = Math.min(devicePixelRatio || 1, dprCap);
  paceSum = paceN = 0;
  const low = comp.on ? 0.75 : 1;
  if (avg > 20.5 && dpr > low) { dprCap = Math.max(low, dpr * 0.8); layout(); }
}
function frame() {
  const now = performance.now(), ms = now - last;
  last = now;
  if (!visible || document.hidden) return;
  pace(ms);
  tick(Math.min(1 / 24, Math.max(0.001, ms / 1000)));
}
// Die Flugbahn des Werbefliegers. Er kommt von weit hinten über dem Horizont, steigt im Bogen auf, wird größer und zieht dann über die Szene.
// Der Flieger kommt erst, wenn die Möwe gelandet ist und ihre Show läuft, damit beide nicht gleichzeitig um den Blick kämpfen.
const PLANE_CYCLE = 64, PLANE_START = 16, PLANE_SPEED = 40, PLANE_ARC = 13;
const planeP = { x: 0, y: 0, s: 1 }, planeQ = { x: 0, y: 0, s: 1 }, planeR = { x: 0, y: 0, s: 1 };
function planeAt(t, o) {
  if (t < PLANE_ARC) {
    const k = Math.pow(Math.max(t, 0) / PLANE_ARC, 1.6), m = 1 - k;
    o.x = m * m * m * 1180 + 3 * m * m * k * 1080 + 3 * m * k * k * 988 + k * k * k * 880;
    o.y = m * m * m * 246 + 3 * m * m * k * 214 + 3 * m * k * k * 118 + k * k * k * 112;
    o.s = 0.24 + 0.76 * Math.pow(k, 1.25);
    return o;
  }
  const d = t - PLANE_ARC;
  o.x = 880 - PLANE_SPEED * d; o.y = 112 - d * 0.3 + Math.sin(d * 0.5) * 3.5; o.s = 1 + d * 0.004;
  return o;
}
function flyPlane(u) {
  const T = u.uPlaneT.value;
  // Im Hochformat zieht er in Ruhe oberhalb der Kathedrale durch den schmalen Ausschnitt.
  if (comp.on) {
    u.uPlane.value.set(view.x0 + view.vw + 60 - (time * 30) % 1380, 66 + Math.sin(time * 0.5) * 2);
    T.set(1, 0, 0.82, 0);
    return;
  }
  const t = (time - PLANE_START + PLANE_CYCLE * 4) % PLANE_CYCLE;
  if (time < PLANE_START || t > 48) { u.uPlane.value.set(9999, 0); return; }
  planeAt(t, planeP); planeAt(t + 0.05, planeQ);
  const dx = planeP.x - planeQ.x, dy = (planeP.y - planeQ.y) * 0.72, len = Math.hypot(dx, dy) || 1, tx = dx / len, ty = dy / len;
  // Das Banner folgt der Bahn: Sein Ende hängt dort, wo das Flugzeug vor ein paar Sekunden war.
  planeAt(t - 6.2, planeR);
  const bx = planeR.x - planeP.x, by = planeR.y - planeP.y;
  u.uPlane.value.set(planeP.x, planeP.y);
  T.set(tx, ty, planeP.s, clamp((tx * by - ty * bx) / planeP.s * 0.8, -44, 44));
}
function tick(dt, render = true) {
  if (!still()) time += dt;
  const lag = 1 - Math.exp(-dt * 3.2), trail = 1 - Math.exp(-dt * 7);
  const quiet = still() || mode === 'drag';
  pointer.sx += ((quiet ? 0 : pointer.mx) - pointer.sx) * lag;
  pointer.sy += ((quiet ? 0 : pointer.my) - pointer.sy) * lag;
  pointer.px += (pointer.x - pointer.px) * trail;
  pointer.py += (pointer.y - pointer.py) * trail;
  pointer.vx += (clamp((pointer.x - pointer.lx) / dt, -3000, 3000) - pointer.vx) * (1 - Math.exp(-dt * 14));
  pointer.lx = pointer.x;
  S.sheen += ((pointer.over && !still() ? 1 : 0) - S.sheen) * (1 - Math.exp(-dt * 3));
  S.gust = Math.max(0, S.gust - dt * 0.9);
  ripple.t += dt;
  if (!still()) flock.t += dt;
  stepWater(dt);
  updateSticker(dt);
  const gone = updateFly(dt);
  if (gone) return;
  letterGoals(dt); updatePulses(dt); updateGag(dt);
  acc = Math.min(acc + dt, 0.1);
  while (acc >= STEP) { stepLetters(STEP); stepClaim(STEP); stepBall(STEP); stepRope(STEP); acc -= STEP; }
  updateBall(dt); updateConfetti(dt); feathers.update(still() ? 0 : dt, fly.s > 0.02); syncRope(); applyLetters();

  // Das Licht wandert langsam, und ein zweites Licht folgt dem Zeiger über die Kanten der Buchstaben.
  sunLight.position.x = 0.35 + 0.16 * Math.sin(time * 0.2);
  pointLight.position.set((pointer.px - CX) * 700 / F, -(pointer.py - CY) * 700 / F, -700);
  pointLight.intensity = S.sheen * 15000;
  glint.value.x = S.glint;
  if (!still() && mode === 'rest' && fly.s < 0.01 && time % 9 < dt && window.gsap) window.gsap.fromTo(S, { glint: -0.2 }, { glint: 1.4, duration: 1.6, ease: 'sine.inOut', overwrite: 'auto' });

  const u = plateMat.uniforms;
  u.uTime.value = time; u.uMouse.value.set(pointer.sx, pointer.sy); u.uDawn.value = S.dawn; u.uReveal.value = S.reveal; u.uFlare.value = S.flare; u.uGust.value = S.gust; u.uSheen.value = S.sheen;
  u.uPtr.value.set(pointer.px, pointer.py);
  u.uRipple.value.set(ripple.x, ripple.y, 0, ripple.t);
  u.uPulse.value.set(lastPulse.x, lastPulse.y, lastPulse.age, lastPulse.amp * Math.exp(-lastPulse.age * 2.8));
  u.uFlock.value = flock.t;
  flyPlane(u);
  if (render) draw();
}
function draw() {
  // Schatten: Schriftumriss klein rendern und weich zeichnen.
  const cv = confetti.visible, gv = gull.root.visible, pv = plop.mesh.visible, fv = feathers.mesh.visible, sv = gull.flyer.visible;
  ballGroup.visible = false; confetti.visible = false; gull.root.visible = false; plop.mesh.visible = false; feathers.mesh.visible = false; gull.flyer.visible = false;
  scene.overrideMaterial = silhouette;
  renderer.setRenderTarget(rtA); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(scene, comp.on ? camL : cam);
  scene.overrideMaterial = null; ballGroup.visible = true; confetti.visible = cv; gull.root.visible = gv; plop.mesh.visible = pv; feathers.mesh.visible = fv; gull.flyer.visible = sv;
  const rw = blurMat.userData.rw, rh = blurMat.userData.rh, u = blurMat.uniforms;
  // Bei feinerem Raster mehrmals mit engen Abständen weichzeichnen: Die Durchgänge addieren sich zu einem weichen Schatten.
  // Weite Abstände würden selbst ein Punktmuster erzeugen.
  const durchgaenge = (blurMat.userData.k || 1) > 1 ? 4 : 1;
  for (let pass = 0; pass < durchgaenge; pass++) {
    u.tSrc.value = rtA.texture; u.uDir.value.set(2.4 / rw, 0);
    renderer.setRenderTarget(rtB); renderer.render(blurScene, bgCam);
    u.tSrc.value = rtB.texture; u.uDir.value.set(0, 2.4 / rh);
    renderer.setRenderTarget(rtA); renderer.render(blurScene, bgCam);
  }

  plateMat.uniforms.tShadow.value = rtA.texture;
  renderer.setRenderTarget(null); renderer.setClearColor(0x000000, 0); renderer.clear();
  renderer.render(bgScene, bgCam);
  renderer.clearDepth();
  if (comp.on) { renderer.render(scene, camL); renderer.clearDepth(); }
  renderer.render(scene, cam);
}

// --- Auftakt: Stille, Aufschlag, dann springt der Ball aus und bleibt auf der Terrasse liegen ---
// Die Flugbahn sind echte Wurfparabeln mit derselben Schwerkraft wie beim Spielen, als reine Funktion der Zeit.
function buildPath() {
  const floorY = FLOOR - BALL_R, drop = floorY + 160, T0 = 0.55, fall = Math.sqrt(2 * drop / GRAV), T1 = T0 + fall;
  const vHit = GRAV * fall, contact = (v) => 0.018 + 0.05 * v / vHit, stretch = (v) => 0.11 * Math.abs(v) / 1500;
  // Erst das Muster der Sprünge, dann das Grundtempo so, dass der Ball genau an seinem Platz ausrollt.
  const raw = [], FRICTION = 0.94, ROLL = 0.62;
  let vIn = vHit, f = 1, dist = 0;
  while (2 * vIn * BOUNCE / GRAV > 0.085) {
    const vOut = vIn * BOUNCE, c = contact(vIn), T = 2 * vOut / GRAV;
    raw.push({ vIn, vOut, c, T, f });
    dist += f * (c + T);
    vIn = vOut; f *= FRICTION;
  }
  const lastC = contact(vIn);
  dist += f * (lastC + ROLL / 2);
  const v0 = (REST.x - 330) / dist;
  const segs = [], hits = [];
  let t = T1, x = 330;
  for (const r of raw) {
    const vx = v0 * r.f;
    hits.push({ t, x, k: clamp(r.vIn / vHit, 0.1, 1) });
    segs.push({ kind: 0, t0: t, t1: t + r.c, x0: x, vx, vIn: r.vIn, vOut: r.vOut, A: 0.36 * Math.pow(r.vIn / vHit, 0.7) });
    t += r.c; x += vx * r.c;
    segs.push({ kind: 1, t0: t, t1: t + r.T, x0: x, vx, v: r.vOut });
    t += r.T; x += vx * r.T;
  }
  const vx = v0 * f;
  hits.push({ t, x, k: clamp(vIn / vHit, 0.1, 1) });
  segs.push({ kind: 0, t0: t, t1: t + lastC, x0: x, vx, vIn, vOut: 0, A: 0.36 * Math.pow(vIn / vHit, 0.7) });
  t += lastC; x += vx * lastC;
  segs.push({ kind: 2, t0: t, t1: t + ROLL, x0: x, vx });
  t += ROLL;
  const put = (px, py, sy) => { B.x = px; B.y = py; B.sy = sy; B.sx = 1 / Math.sqrt(sy); B.shadow = clamp(0.62 - (floorY - py) / 620, 0.08, 0.62); };
  const at = (now) => {
    if (now <= T1) {
      const u = clamp((now - T0) / fall, 0, 1);
      B.r = 52 + (BALL_R - 52) * u * u;
      put(330 - (v0 / FRICTION) * (T1 - Math.max(now, T0)), -160 + drop * u * u, 1 + stretch(vHit * u));
      return;
    }
    B.r = BALL_R;
    const s = segs.find((q) => now < q.t1) || segs[segs.length - 1];
    const d = Math.min(now, s.t1) - s.t0;
    if (s.kind === 0) {
      const u = d / (s.t1 - s.t0);
      put(s.x0 + s.vx * d, floorY, 1 + stretch(s.vIn) + (stretch(s.vOut) - stretch(s.vIn)) * u - s.A * Math.sin(Math.PI * u));
    } else if (s.kind === 1) {
      put(s.x0 + s.vx * d, floorY - (s.v * d - GRAV * d * d / 2), 1 + stretch(-s.v + GRAV * d));
    } else {
      put(s.x0 + s.vx * (d - d * d / (2 * ROLL)), floorY, 1);
    }
  };
  return { T0, T1, end: t, hits, at };
}
function buildIntro() {
  const g = window.gsap, P = buildPath(), T1 = P.T1;
  letters.forEach((l) => { l.on = false; l.drop = 0; l.press = 0; l.v = 0; l.wob = 0; l.wv = 0; l.sq = 0; l.sv = 0; l.dx = 0; l.dy = 0; l.dvx = 0; l.dvy = 0; });
  claim.items.forEach((l) => { l.on = false; l.jump = 0; l.jv = 0; l.s = 1; });
  Object.assign(S, { reveal: 0, dawn: 1, flare: 0, gust: 0, glint: -1 });
  Object.assign(phys, { sq: 0, sv: 0, idle: 6, homeV: 0 });
  P.at(0); lastBx = B.x; pulses.length = 0;
  hero.classList.add('dusk');
  const tl = g.timeline({ paused: true, onComplete: () => { mode = 'rest'; intro = null; syncTools(); } });
  const clock = { t: 0 };
  tl.to(clock, { t: P.end, duration: P.end, ease: 'none', onUpdate: () => P.at(clock.t) }, 0);
  P.hits.forEach((h) => tl.call(impact, [h.x, FLOOR, h.k], h.t));
  // Eine einzige Geste: Der Aufschlag löst eine Lichtfront aus, und wo sie ankommt, stehen die Buchstaben auf.
  // Kürzer und kausal (03.11.2026): Die Lichtfront braucht 2,1 s statt 3,6 s, die Szene steht nach gut 3 s.
  const sweep = 2.1, LICHT = FRONT * 3.62 / sweep;
  tl.to(S, { reveal: LICHT * sweep, duration: sweep, ease: 'none' }, T1)
    .set(S, { dawn: 0 }, T1 + sweep)
    .call(() => hero.classList.remove('dusk'), null, T1 + 1.35)
    .fromTo(S, { gust: 0 }, { gust: 1, duration: 0.4, ease: 'power1.out' }, T1 + 0.4)
    .to(S, { flare: 1.1, duration: 0.5, ease: 'power2.out' }, T1 + 1.35)
    .to(S, { flare: 0.2, duration: 1.3, ease: 'power2.inOut' }, T1 + 1.85)
    .fromTo(S, { glint: -0.2 }, { glint: 1.4, duration: 1.3, ease: 'sine.inOut' }, T1 + 1.6);
  // Die Buchstaben gehorchen derselben Schwerkraft wie der Ball: Sie fallen von oben, unterste Zeile zuerst, und setzen schwer auf.
  for (const l of letters) {
    const land = T1 + 0.15 + clamp((l.sx - 110) / 890, 0, 1) * 0.95 + (2 - l.line) * 0.16;
    const px = l.by + 190, dur = Math.sqrt(2 * px / GRAV);
    tl.call(() => { l.on = true; }, null, land - dur);
    tl.fromTo(l, { drop: px / l.pu }, { drop: 0, duration: dur, ease: 'power2.in' }, land - dur);
    tl.call(() => { l.sv += 3.4; l.v += 1.7; l.wv += (l.sx < 720 ? -1 : 1) * 0.9; }, null, land);
    tl.to(l, { drop: 7, duration: 0.1, ease: 'power2.out' }, land);
    tl.to(l, { drop: 0, duration: 0.1, ease: 'power2.in' }, land + 0.1);
  }
  // Zuletzt springen die kleinen Wörter aus dem Boden, während der Ball ausrollt.
  for (const l of claim.items) {
    const at = T1 + 1.55 + clamp((l.sx - 110) / 900, 0, 1) * 0.6;
    tl.call(() => { l.on = true; l.jv = 420; }, null, at);
    tl.fromTo(l, { s: 0.2 }, { s: 1, duration: 0.4, ease: 'back.out(2)' }, at);
  }
  return tl;
}
function settle() {
  abortGag();
  feathers.clear();
  gull.hideFlyer();
  letters.forEach((l) => { l.on = true; l.drop = 0; l.press = 0; l.v = 0; l.sq = 0; l.sv = 0; l.dx = 0; l.dy = 0; l.dvx = 0; l.dvy = 0; });
  claim.items.forEach((l) => { l.on = true; l.s = 1; l.jump = 0; l.jv = 0; });
  plop.splat.visible = false;
  Object.assign(B, { x: REST.x, y: REST.y, r: ballR, sx: 1, sy: 1, shadow: 0.62 }); lastBx = B.x;
  Object.assign(S, { reveal: 0, dawn: 0, flare: 0.2, gust: 0, glint: -1 });
  Object.assign(phys, { sq: 0, sv: 0, idle: 6, homeV: 0 });
  hero.classList.remove('dusk');
  mode = 'rest'; intro = null; syncTools();
}
function playIntro() {
  // Im Hochformat steht das Bild sofort. Der Auftakt ist nur der Ball: Er hüpft von links über die Terrasse herein, unter dem Satz durch.
  // So bleiben Schriftzug und Satz im ersten Eindruck ganz (vorher fiel er von oben durch beide hindurch).
  if (comp.on) {
    settle();
    if (!reduced.matches && window.gsap && scrollY < 5) {
      // Sprunghöhe nach dem Platz unter dem Satz; das Tempo so, dass er nach den Hüpfern knapp vor seinem Platz ausrollt.
      const hop = clamp(FLOOR - 2 * B.r - claimFloor() - 10, 14, 56), hops = 2 * Math.sqrt(2 * hop / GRAV) / (1 - BOUNCE);
      Object.assign(B, { x: view.x0 - B.r - 6, y: REST.y }); lastBx = B.x; phys.idle = 9; gag.next = 2.2;
      launch((REST.x - B.x) / hops * 0.9, -Math.sqrt(2 * GRAV * hop));
      // Die Sonne blitzt im Ring auf, und ein Lichtstreif läuft über die Buchstaben.
      window.gsap.fromTo(S, { flare: 1.05 }, { flare: 0.2, duration: 1.7, delay: 0.3, ease: 'power2.out' });
      window.gsap.fromTo(S, { glint: -0.2 }, { glint: 1.4, duration: 1.5, delay: 0.75, ease: 'sine.inOut' });
    }
    return;
  }
  if (reduced.matches || !window.gsap) { settle(); return; }
  intro?.kill();
  window.gsap.killTweensOf(S);
  abortGag();
  feathers.clear();
  // Die Möwe kommt nach einem Atemzug, wenn die Szene steht: Erst die Botschaft, dann der Lacher.
  gag.next = 2.4;
  plop.splat.visible = false;
  mode = 'intro';
  intro = buildIntro();
  intro.timeScale(tempo);
  syncTools();
  if (!params.has('hold')) intro.play();
}
function skipIntro() { if (intro && mode === 'intro') { skipping = true; intro.progress(1); skipping = false; } }

function syncTools() {
  document.querySelector('.tools').hidden = reduced.matches;
  const p = document.getElementById('pause');
  p.setAttribute('aria-pressed', String(paused));
  const label = paused ? 'Bewegung fortsetzen' : 'Bewegung anhalten';
  p.setAttribute('aria-label', label); p.title = label;
}

function toStage(e) {
  const r = canvas.getBoundingClientRect();
  return { x: view.x0 + (e.clientX - r.left) / view.s, y: view.y0 + (e.clientY - r.top) / view.s, nx: ((e.clientX - r.left) / r.width - 0.5) * 2, ny: ((e.clientY - r.top) / r.height - 0.5) * 2 };
}
function nearBall(p) { return (mode === 'rest' || mode === 'free') && !reduced.matches && fly.s < 0.01 && Math.hypot(p.x - B.x, p.y - B.y) < B.r + 8; }
function grabBall(e, p, el) {
  measureSticker();
  mode = 'drag'; phys.hist = [{ x: p.x, y: p.y, t: performance.now() }]; phys.down = { x: p.x, y: p.y, t: performance.now() }; phys.grab.x = B.x; phys.grab.y = B.y;
  el.setPointerCapture(e.pointerId); el.style.cursor = 'grabbing'; e.preventDefault();
}
function initPointer() {
  // Auf dem Handy liegt über dem Ball eine unsichtbare Griffzone. Dort greift der Finger den Ball, überall sonst scrollt die Seite.
  grip = document.querySelector('.ball-grip');
  grip.addEventListener('pointerdown', (e) => { if ((mode === 'rest' || mode === 'free') && !reduced.matches) grabBall(e, toStage(e), grip); });
  compose(comp.on);
  hero.addEventListener('pointermove', (e) => {
    const p = toStage(e);
    // Wer mit der Maus durch die Palme fährt, bringt sie in Bewegung.
    const speed = Math.hypot(p.x - pointer.x, p.y - pointer.y);
    if (!still() && p.x < 470 && p.y < 360 && speed < 300) S.gust = Math.min(1, S.gust + speed * 0.004);
    pointer.x = p.x; pointer.y = p.y; pointer.mx = clamp(p.nx, -1, 1); pointer.my = clamp(p.ny, -1, 1);
    pointer.over = (e.pointerType !== 'touch' || pointer.touch) && e.target === canvas;
    if (mode === 'drag') {
      phys.grab.x = p.x; phys.grab.y = Math.min(p.y, FLOOR - B.r);
      phys.hist.push({ x: p.x, y: p.y, t: performance.now() }); if (phys.hist.length > 6) phys.hist.shift();
    } else if (e.target === canvas) {
      canvas.style.cursor = nearBall(p) ? 'grab' : '';
    }
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { pointer.over = false; pointer.mx = 0; pointer.my = 0; });
  if (!finePointer.matches) {
    const base = { g: null, b: null };
    addEventListener('deviceorientation', (e) => {
      if (e.gamma == null || pointer.touch || still()) return;
      if (base.g === null) { base.g = e.gamma; base.b = e.beta; }
      // Die Ruhelage wandert langsam mit, so zählt nur die Bewegung, nicht wie man das Handy gerade hält.
      base.g += (e.gamma - base.g) * 0.02; base.b += (e.beta - base.b) * 0.02;
      pointer.mx = clamp((e.gamma - base.g) / 14, -1, 1); pointer.my = clamp((e.beta - base.b) / 14, -1, 1);
    }, { passive: true });
  }
  canvas.addEventListener('pointerdown', (e) => {
    const p = toStage(e);
    if (mode === 'intro') { skipIntro(); return; }
    if (gag.canHit && gull?.root.visible && Math.hypot(p.x - gag.P.x, p.y - (gag.P.y - gag.s * 0.6)) < gag.s * 0.85) { gullHit(); return; }
    if (p.x > 490 && p.x < 670 && p.y > 40 && p.y < 180) startle();
    if (e.pointerType === 'touch') {
      Object.assign(pointer, { touch: true, over: true, x: p.x, y: p.y, lx: p.x, px: p.x, py: p.y });
      if (letters.some((l) => Math.hypot(l.sx - p.x, l.sy - p.y) < 70 * comp.a + 20)) impact(p.x, p.y, 0.26);
    }
    if (nearBall(p)) { grabBall(e, p, canvas); return; }
    if (p.y > 275 && p.y < 610 && !inPoly(RING, p.x, p.y) && !(p.x > 1216 && p.y > 372)) ripple = { x: p.x, y: p.y, t: 0 };
  });
  const release = () => {
    if (mode !== 'drag') return;
    const h = phys.hist, a = h[0], b = h[h.length - 1], dt = Math.max(16, b.t - a.t) / 1000;
    const moved = Math.hypot(b.x - phys.down.x, b.y - phys.down.y);
    canvas.style.cursor = '';
    if (moved < 7) { serve(); return; }
    let vx = clamp((b.x - a.x) / dt, -2600, 2600), vy = clamp((b.y - a.y) / dt, -2600, 2600);
    if (performance.now() - b.t > 90) { vx *= 0.2; vy *= 0.2; }
    launch(vx, vy);
  };
  const lift = (e) => { if (e.pointerType === 'touch') { pointer.touch = false; setTimeout(() => { if (!pointer.touch) pointer.over = false; }, 160); } };
  canvas.addEventListener('pointerup', (e) => { lift(e); release(); });
  canvas.addEventListener('pointercancel', (e) => { lift(e); release(); });
  grip.addEventListener('pointerup', release);
  grip.addEventListener('pointercancel', release);
  addEventListener('wheel', skipIntro, { passive: true });
  addEventListener('keydown', skipIntro);
  addEventListener('touchstart', skipIntro, { passive: true });

  document.getElementById('pause').addEventListener('click', () => { paused = !paused; window.gsap?.globalTimeline.paused(paused); syncTools(); });
  document.getElementById('replay').addEventListener('click', () => { scrollTo({ top: 0, behavior: 'instant' }); playIntro(); });
  reduced.addEventListener('change', () => { if (reduced.matches) { intro?.progress(1); settle(); } layout(); syncTools(); });
  document.addEventListener('visibilitychange', () => { last = performance.now(); });
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; last = performance.now(); }).observe(hero);
  addEventListener('resize', layout);
}
function initProbe() {
  const bar = document.getElementById('probe');
  if (!params.has('probe')) return;
  bar.hidden = false;
  bar.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if ('gull' in b.dataset) { if (mode === 'intro') skipIntro(); abortGag(); startGag(); return; }
    if (b.dataset.shades) { gull.setShades(b.dataset.shades === 'an'); bar.querySelectorAll('[data-shades]').forEach((x) => x.classList.toggle('on', x === b)); return; }
    if (b.dataset.tempo) { tempo = Number(b.dataset.tempo); bar.querySelectorAll('[data-tempo]').forEach((x) => x.classList.toggle('on', x === b)); scrollTo({ top: 0, behavior: 'instant' }); playIntro(); }
    if (b.dataset.nav) { root.dataset.nav = b.dataset.nav; bar.querySelectorAll('[data-nav]').forEach((x) => x.classList.toggle('on', x === b)); }
    if (b.dataset.cta) { root.dataset.cta = b.dataset.cta; bar.querySelectorAll('[data-cta]').forEach((x) => x.classList.toggle('on', x === b)); }
  });
}

async function start() {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: debug, powerPreference: 'high-performance' });
  renderer.autoClear = false;
  scene = new THREE.Scene();
  cam = new THREE.PerspectiveCamera(2 * Math.atan(H / 2 / F) * 180 / Math.PI, W / H, 10, 40000);
  cam.position.set(0, 0, 0); cam.lookAt(0, 0, -1); cam.updateMatrixWorld();
  cam.layers.enable(1);
  camL = cam.clone();
  camL.layers.set(1);
  scene.add(new THREE.HemisphereLight(0xf6f8ff, 0xffe8d4, 1.75));
  sunLight = new THREE.DirectionalLight(0xfff4e2, 1.55); sunLight.position.set(0.35, 0.7, 0.85); scene.add(sunLight);
  const fill = new THREE.DirectionalLight(0xffdcb8, 0.65); fill.position.set(-0.9, 0.05, 0.45); scene.add(fill);
  pointLight = new THREE.PointLight(0xfff0cf, 0, 0, 2); scene.add(pointLight);
  scene.traverse((o) => { if (o.isLight) o.layers.enableAll(); });
  silhouette = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });

  const big = (window.innerWidth * Math.min(devicePixelRatio || 1, 2)) > 1100;
  const loader = new THREE.TextureLoader();
  const plateTex = await loader.loadAsync(big ? 'assets/scene/plate-2x.webp' : 'assets/scene/plate.webp').catch(() => loader.loadAsync('assets/scene/plate.webp'));
  const [mapsTex, fontJson] = await Promise.all([
    loader.loadAsync('assets/scene/maps.png'),
    fetch('assets/fonts/shrikhand-hero.typeface.json').then((r) => { if (!r.ok) throw new Error('Schrift'); return r.json(); }),
  ]);
  for (const t of [plateTex, mapsTex]) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter; }

  // Banner und Flugzeug: echte Schrift und Zeichnung aus dem Browser.
  await document.fonts?.load('400 80px Shrikhand').catch(() => {});
  const bannerTex = new THREE.CanvasTexture(planeAtlas('Event-Promoter gesucht'));
  bannerTex.premultiplyAlpha = true; bannerTex.generateMipmaps = true; bannerTex.minFilter = THREE.LinearMipmapLinearFilter; bannerTex.anisotropy = 4;
  const noiseData = new Uint8Array(256 * 256);
  for (let i = 0, n = 1234567; i < noiseData.length; i++) { n = (Math.imul(n, 1664525) + 1013904223) | 0; noiseData[i] = (n >>> 24) & 255; }
  const noiseTex = new THREE.DataTexture(noiseData, 256, 256, THREE.RedFormat);
  noiseTex.wrapS = noiseTex.wrapT = THREE.RepeatWrapping;
  noiseTex.minFilter = noiseTex.magFilter = THREE.LinearFilter;
  noiseTex.needsUpdate = true;
  bgCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  plateMat = new THREE.ShaderMaterial({
    vertexShader: QUAD_VERT, fragmentShader: PLATE_FRAG, depthTest: false, depthWrite: false, toneMapped: false, blending: THREE.NoBlending,
    uniforms: {
      tPlate: { value: plateTex }, tNoise: { value: noiseTex }, tBanner: { value: bannerTex }, uPlane: { value: new THREE.Vector2(9999, 0) }, uPlaneT: { value: new THREE.Vector4(1, 0, 1, 0) }, tMaps: { value: mapsTex }, tShadow: { value: null }, uPulse: { value: new THREE.Vector4() }, uGullShadow: { value: new THREE.Vector4() }, uFlock: { value: 99 }, uView: { value: new THREE.Vector4(0, 0, W, H) },
      uBall: { value: new THREE.Vector4() }, uBallShadow: { value: 0 }, uRipple: { value: new THREE.Vector4(0, 0, 0, 9) }, uMouse: { value: new THREE.Vector2() },
      uRevealC: { value: new THREE.Vector2(330, 700) }, uShadowOff: { value: new THREE.Vector2() }, uPtr: { value: new THREE.Vector2() },
      uC: { value: new THREE.Vector2(RING_C.x, RING_C.y) }, uTarget: { value: new THREE.Vector2(RING_C.x, RING_C.y) },
      uStretch: { value: 1 }, uMirror: { value: 0 }, uTime: { value: 0 }, uDawn: { value: 1 }, uReveal: { value: 0 }, uFlare: { value: 0 }, uGust: { value: 0 }, uSheen: { value: 0 },
      uZoom: { value: 1 }, uBlur: { value: 0 }, uHole: { value: 0 }, uFx: { value: 1 },
    },
  });
  bgScene = new THREE.Scene(); bgScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), plateMat));
  blurMat = new THREE.ShaderMaterial({ vertexShader: QUAD_VERT, fragmentShader: BLUR_FRAG, depthTest: false, depthWrite: false, toneMapped: false, uniforms: { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } } });
  blurScene = new THREE.Scene(); blurScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blurMat));
  rtA = new THREE.WebGLRenderTarget(4, 4, { depthBuffer: true }); rtB = new THREE.WebGLRenderTarget(4, 4, { depthBuffer: false });

  const pm = new THREE.PMREMGenerator(renderer);
  envTex = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  pm.dispose();
  // Der Aufbau läuft in Portionen. Dazwischen bleibt die Seite bedienbar, auch wenn das Handy langsam ist.
  const breathe = () => new Promise((r) => setTimeout(r));
  await breathe();
  const font = new FontLoader().parse(fontJson);
  buildLetters(font);
  await breathe();
  buildClaim(font);
  await breathe();
  buildBall();
  buildConfetti();
  ballMat.envMap = envTex;
  for (const l of letters) { l.front.envMap = envTex; l.side.envMap = envTex; }
  claim.front.envMap = envTex; claim.side.envMap = envTex; claim.carry.forEach((m) => { m.envMap = envTex; });
  await breathe();
  gull = buildGull(envTex, { depth: GULL_D, focal: F, cx: CX, cy: CY, size: GULL_S });
  await breathe();
  scene.add(gull.root);
  scene.add(gull.flyer);
  feathers = buildFeathers(envTex, { focal: F, cx: CX, cy: CY, floor: FLOOR, ball: () => ({ x: B.x, y: B.y, r: B.r, vx: mode === 'rest' ? phys.homeV : phys.vx, vy: mode === 'rest' ? 0 : phys.vy }), pointer: () => pointer });
  scene.add(feathers.mesh);
  // Der Abwurf der Möwe und was davon auf dem Ball landet.
  const plopMat = new THREE.MeshPhysicalMaterial({ color: 0xf7f5ee, roughness: 0.28, clearcoat: 0.6, clearcoatRoughness: 0.3, envMap: envTex, envMapIntensity: 0.5 });
  plop.mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), plopMat);
  plop.mesh.visible = false;
  scene.add(plop.mesh);
  plop.splat = new THREE.Group();
  for (const [x, z, r] of [[0, 0, 0.17], [0.15, 0.06, 0.09], [-0.12, 0.09, 0.075], [0.04, -0.15, 0.1], [-0.17, -0.07, 0.055], [0.22, -0.09, 0.04]]) {
    const blob = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), plopMat);
    blob.position.set(x, 0.005, z);
    blob.scale.set(r, r * 0.3, r);
    plop.splat.add(blob);
  }
  const core = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshPhysicalMaterial({ color: 0x7f8a7c, roughness: 0.4, clearcoat: 0.5, envMap: envTex, envMapIntensity: 0.4 }));
  core.position.set(0.02, 0.05, -0.01);
  core.scale.set(0.055, 0.02, 0.05);
  plop.splat.add(core);
  plop.splat.visible = false;
  ballMesh.add(plop.splat);

  layout();
  initPointer();
  initProbe();
  // Alles einmal vorab bauen und hochladen. Sonst hakt der Auftakt genau in dem Moment, in dem der erste Buchstabe fällt.
  letters.forEach((l) => { l.pivot.visible = true; });
  claim.items.forEach((l) => { l.pivot.visible = true; });
  confetti.visible = true; gull.root.visible = true; plop.mesh.visible = true; plop.splat.visible = true; feathers.mesh.visible = true;
  gull.update(0); gull.place(CX, CY); plop.mesh.position.set(0, 0, -BALL_W); plop.mesh.scale.setScalar(4);
  if (renderer.compileAsync) await renderer.compileAsync(scene, cam).catch(() => {});
  await breathe();
  renderer.compile(bgScene, bgCam);
  await breathe();
  draw();
  renderer.setRenderTarget(null); renderer.clear();
  letters.forEach((l) => { l.pivot.visible = l.on; });
  claim.items.forEach((l) => { l.pivot.visible = l.on; });
  confetti.visible = false; gull.root.visible = false; plop.mesh.visible = false; plop.splat.visible = false; feathers.mesh.visible = false;

  last = performance.now();
  if (window.gsap) window.gsap.ticker.add(frame);
  else { const loop = () => { requestAnimationFrame(loop); frame(); }; requestAnimationFrame(loop); }
  if (scrollY > 5 && !comp.on) settle(); else playIntro();
  root.classList.add('ready');
  // Nur zum Prüfen: rechnet die Szene mit genau 60 Bildern pro Sekunde, unabhängig von der Rechenleistung des Testbrowsers.
  let manual = false, clock = 0;
  const advance = (sec, render = true) => {
    const g = window.gsap;
    if (!manual) { manual = true; g.ticker.remove(g.updateRoot); g.ticker.remove(frame); clock = g.ticker.time; }
    const n = Math.round(sec * 60);
    for (let i = 0; i < n; i++) { clock += 1 / 60; g.updateRoot(clock); tick(1 / 60, false); }
    if (render) draw();
  };
  if (debug) window.__hero = { advance, feathers, tick, THREE, S, B, fly, letters, pointer, phys, view, pulses, plateMat, buildPath, impact, updateBallFree: launch, claim, gag, gull, plop, stick, flock, startGag, abortGag, gullHit, serve, claimToStage, startle, get intro() { return intro; }, get mode() { return mode; }, set mode(v) { mode = v; }, get time() { return time; }, seek: (t) => { intro.pause(t, false); }, settle, draw, renderer, scene, cam, ballGroup, groups, setHit, ballQ, placeBall, launch, playIntro };
}
start().catch((err) => { console.error(err); root.classList.add('fallback'); document.querySelector('.tools').hidden = true; });
