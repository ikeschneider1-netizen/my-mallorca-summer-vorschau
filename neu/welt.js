// Neuentwurf „Ein Tag an der Playa“ (03.11.2026, Storyboard in docs/redesign/storyboard-neu-20261103.md).
// Hinter dem Ring liegt eine durchgehende Kulisse: die gerenderte Terrasse (Creme, Terrakotta, Lagune) und darunter die gelbe
// Abschluss-Terrasse mit dem Ring. Jede Ebene ist ein Kapitel. Die Kamera hält auf jeder Wand, die Wand ist die Leinwand für
// die Bilder (Beats, HTML). Je Kapitel steht ein 3D-Titel in der Szene, er hüpft herein und wieder hinaus. Die Möwe führt von
// Ebene zu Ebene, der Ball rollt die Treppen hinunter und landet am Ende im Ring.
// Bühnenpunkte: 1440 breit; Terrasse 2992 hoch, gelbe Terrasse 900 hoch (auf Fensterhöhe geschnitten).
import * as THREE from '../vendor/three/three.module.js';
import { FontLoader } from '../vendor/three/FontLoader.js';
import { RoomEnvironment } from '../vendor/three/RoomEnvironment.js';
import { buildGull } from './gull.js';

const W = 1440, HT = 2992, HG = 900, HP = HT + HG, F = 1500, CX = W / 2, CY = HP / 2;
const canvas = document.querySelector('canvas.welt');
const track = document.querySelector('.track');
const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
// Hochformat: Die Welt zeigt einen Ausschnitt von CW Bühnenpunkten Breite (je Bild data-x), die Bilder laufen als normale Seite darüber.
const hoch = matchMedia('(orientation: portrait)');
const CW_H = 520;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0xf8e9d3);
const scene = new THREE.Scene();
const env = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environment = env;

// Licht wie im Hero, die Sonne links oben wie die gemalten Palmenschatten.
scene.add(new THREE.HemisphereLight(0xf6f8ff, 0xffe8d4, 1.75));
const sun = new THREE.DirectionalLight(0xfff4e2, 1.55);
sun.position.set(CX - 0.35 * 3000, -CY + 0.7 * 3000, 0.85 * 3000); sun.target.position.set(CX, -CY, 0);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { near: 300, far: 7000, left: -2300, right: 2300, top: 2300, bottom: -2300 });
sun.shadow.bias = -0.0003; sun.shadow.normalBias = 1.5; sun.shadow.radius = 5;
scene.add(sun, sun.target);
const fill = new THREE.DirectionalLight(0xffdcb8, 0.65);
fill.position.set(CX + 0.9 * 2000, -CY + 0.05 * 2000, 0.45 * 2000); fill.target.position.set(CX, -CY, 0);
scene.add(fill, fill.target);

// Die Kulisse: Terrasse oben, gelbe Terrasse unten (auf 900 Höhe gebracht, links beschnitten, damit der Ring rechts bleibt).
const plateMat = new THREE.MeshBasicMaterial({ color: 0xf8e9d3, toneMapped: false });
const bilder = (srcs) => Promise.all(srcs.map((s) => new Promise((ok, nein) => new THREE.ImageLoader().load(s, ok, undefined, nein))));
bilder(['../assets/scene/terrace.webp', '../assets/scene/closing-background.webp']).then(([t, g]) => {
  const c = document.createElement('canvas'); c.width = W; c.height = HP; const k = c.getContext('2d');
  k.drawImage(t, 0, 0, t.width, t.height, 0, 0, W, HT);
  const sc = HG / g.height, gw = g.width * sc, links = gw - W;
  k.drawImage(g, links / sc, 0, g.width - links / sc, g.height, 0, HT, W, HG);
  // Weiche Kante zwischen Lagunenboden und gelber Terrasse: ein kurzer Schatten, wie eine Stufe.
  const grad = k.createLinearGradient(0, HT - 2, 0, HT + 50); grad.addColorStop(0, 'rgba(70,40,0,0)'); grad.addColorStop(0.08, 'rgba(70,40,0,.35)'); grad.addColorStop(1, 'rgba(70,40,0,0)');
  k.fillStyle = grad; k.fillRect(0, HT - 2, W, 52);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  plateMat.map = tex; plateMat.color.set(0xffffff); plateMat.needsUpdate = true;
});
const plate = new THREE.Mesh(new THREE.PlaneGeometry(W, HP), plateMat);
plate.position.set(CX, -CY, 0); scene.add(plate);
const wand = new THREE.Mesh(new THREE.PlaneGeometry(W, HP), new THREE.ShadowMaterial({ color: 0x3a1600, opacity: 0.34 }));
wand.position.set(CX, -CY, 0.6); wand.receiveShadow = true; scene.add(wand);

// Kamera senkrecht auf die Kulisse wie im Hero; der Ausschnitt wandert mit den Bildern.
const cam = new THREE.PerspectiveCamera(2 * Math.atan(CY / F) * 180 / Math.PI, W / HP, 100, 9000);
cam.position.set(CX, -CY, F); cam.lookAt(CX, -CY, 0);
const camSpace = new THREE.Group(); camSpace.position.copy(cam.position); scene.add(camSpace);

// Materialien wie im Hero.
const CREAM = 0xfff6e4, CREAM_SIDE = 0xffdcb2, INK = 0x0b3f46, INK_SIDE = 0x062a2f;
function warmFoot(mat) {
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = 'varying float vLY;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vLY = position.y;');
    sh.fragmentShader = 'varying float vLY;\n' + sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= mix(vec3(1., .85, .7), vec3(1.), smoothstep(-6., 58., vLY));');
  };
  return mat;
}
const fleckTex = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d'); const r = g.createRadialGradient(128, 64, 0, 128, 64, 64); r.addColorStop(0, 'rgba(60,22,0,.5)'); r.addColorStop(0.55, 'rgba(60,22,0,.22)'); r.addColorStop(1, 'rgba(60,22,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 256, 128); return new THREE.CanvasTexture(c); })();
function fleck(x, y, w, h, z = 1.2) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: fleckTex, transparent: true, depthWrite: false, toneMapped: false }));
  m.position.set(x, -y, z); scene.add(m); return m;
}

// 3D-Wörter: Buchstabe für Buchstabe mit gemessenem Kerning, stehend auf einer Grundlinie.
let font = null;
const ctx = document.createElement('canvas').getContext('2d');
function kern(a, b) { ctx.font = '400 100px Shrikhand'; if ('fontKerning' in ctx) ctx.fontKerning = 'normal'; return ctx.measureText(a + b).width - ctx.measureText(a).width - ctx.measureText(b).width; }
function wort(text, { size = 100, depth = 17, front = CREAM, side = CREAM_SIDE } = {}) {
  const k = size / font.data.resolution, g = new THREE.Group(); let x = 0; const own = [];
  const chars = [...text];
  chars.forEach((ch, i) => {
    const glyph = font.data.glyphs[ch] || font.data.glyphs['?'];
    if (ch !== ' ') {
      const geo = new THREE.ExtrudeGeometry(font.generateShapes(ch, size), { depth, curveSegments: 10, bevelEnabled: true, bevelThickness: 1.8 * size / 100, bevelSize: 1.2 * size / 100, bevelSegments: 3 });
      const m = new THREE.Mesh(geo, [warmFoot(new THREE.MeshPhysicalMaterial({ color: front, roughness: 0.52, clearcoat: 0.28, clearcoatRoughness: 0.45, envMapIntensity: 0.28 })), warmFoot(new THREE.MeshPhysicalMaterial({ color: side, roughness: 0.62, envMapIntensity: 0.22 }))]);
      m.position.x = x; m.castShadow = true; g.add(m); own.push({ m, y: 700, v: 0 });
    }
    x += glyph.ha * k + kern(ch, chars[i + 1] || '') * size / 100;
  });
  g.userData.w = x; g.userData.own = own;
  return g;
}

// Die Kapiteltitel: Zeilen, die auf dem Boden ihrer Ebene stehen. Sie gehören zu einem Bild (beat) und hüpfen herein und hinaus.
const titel = [];
function titelStellen(beat, zeilen, { size = 150, depth = 22, front = CREAM, side = CREAM_SIDE, x = 96, basis, abstand = 174 } = {}) {
  const gruppen = zeilen.map((z, i) => { const g = wort(z, { size, depth, front, side }); const y = basis - (zeilen.length - 1 - i) * abstand; g.position.set(x, -y, 46); g.visible = false; scene.add(g); g.userData.fleck = fleck(x + g.userData.w / 2 + 10, y + 2, g.userData.w * 1.12, 42); g.userData.fleck.visible = false; g.userData.x0 = x; g.userData.y0 = y; return g; });
  titel.push({ beat, gruppen, da: false, t: 0 });
}
function titelSchritt(dt, beatPos) {
  for (const T of titel) {
    const soll = Math.abs(beatPos - T.beat) < 0.55;
    if (soll !== T.da) { T.da = soll; T.t = 0; if (soll) { let n = 0; for (const g of T.gruppen) for (const b of g.userData.own) { b.y = 560 + n * 7; b.v = 0; n++; } moeweErschrickt(); } }
    T.t += dt;
    let n = 0, fertig = true;
    for (const g of T.gruppen) {
      g.visible = true; g.userData.fleck.visible = T.da;
      for (const b of g.userData.own) {
        const t0 = n * 0.04; n++;
        if (reduced.matches) { b.y = T.da ? 0 : 700; b.m.position.y = b.y; continue; }
        if (T.da) {
          if (T.t < t0) { b.m.position.y = b.y; continue; }
          b.v += 3200 * dt; b.y -= b.v * dt;
          if (b.y <= 0) { b.y = 0; b.v = b.v > 140 ? -b.v * 0.38 : 0; }
        } else {
          // Hinaus: nacheinander nach oben weg, mit einem kleinen Ducken davor.
          if (T.t < t0) { b.m.position.y = b.y; fertig = false; continue; }
          b.v -= 5200 * dt; b.y -= b.v * dt; if (b.y > 700) b.y = 700; else fertig = false;
        }
        b.m.position.y = b.y;
      }
      if (!T.da && fertig) g.visible = false;
    }
  }
}

// Wenn ein Titel auf den Boden kracht, zuckt die Möwe zusammen, flattert kurz und setzt sich wieder: ihr kleiner Moment je Kapitel.
function moeweErschrickt() {
  const g = window.gsap; if (!g || !gull || !sitzend || reduced.matches) return;
  g.killTweensOf(gull.pose);
  g.timeline().to(gull.pose, { wide: 1, brow: 0.9, lid: 0, fold: 0.3, flapAmp: 1, flapRate: 18, tuck: 0.7, crest: 0.6, headYaw: -0.2, duration: 0.12, delay: 0.55 })
    .to(gull.pose, { wide: 0, brow: -0.4, lid: 0.56, fold: 1, flapAmp: 0, tuck: 0, crest: 0, headYaw: -0.8, headPitch: 0.1, duration: 0.6, ease: 'power2.out' }, 1.1);
}
// Der Ball wie im Hero: die Felder sitzen im Material.
function ballMaterial() {
  const col = (h) => { const c = new THREE.Color(h); return new THREE.Vector3(c.r, c.g, c.b); };
  const uniforms = { uPink: { value: col(0xe8437f) }, uSun: { value: col(0xffc91f) }, uCream: { value: col(0xf6ead2) }, uSea: { value: col(0x0a7fa8) }, uBump: { value: 1.1 } };
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.46, clearcoat: 0.4, clearcoatRoughness: 0.38, envMapIntensity: 0.55 });
  m.onBeforeCompile = (sh) => {
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
  return m;
}

// Die Bilder (Beats) und ihre Kameralage. Jedes Kapitel hält seine Wand: Creme 452, Terrakotta 1230, Lagune 1980, Gelb 2992.
const beats = [...document.querySelectorAll('.beat')];
const PAN = beats.map((b) => +b.dataset.pan);
const XH = beats.map((b) => +(b.dataset.x || 560));
const PAN_H = beats.map((b) => +(b.dataset.panH || b.dataset.pan));
// Wo Ball und Möwe je Bild sind (Bühnenpunkte). Dazwischen reisen sie: der Ball hüpfend, die Möwe fliegend.
const BALL_D = beats.map((b) => b.dataset.ball ? b.dataset.ball.split(/\s+/).map(Number) : null), BALL_H = beats.map((b) => b.dataset.ballH ? b.dataset.ballH.split(/\s+/).map(Number) : null);
const MOEWE_D = beats.map((b) => b.dataset.moewe ? b.dataset.moewe.split(/\s+/).map(Number) : null), MOEWE_H = beats.map((b) => b.dataset.moeweH ? b.dataset.moeweH.split(/\s+/).map(Number) : null);
let BALL = BALL_D, MOEWE = MOEWE_D;
const BALL_R = 52;
function stuetze(liste, i) { for (let k = i; k >= 0; k--) if (liste[k]) return liste[k]; for (let k = i; k < liste.length; k++) if (liste[k]) return liste[k]; return [0, 0]; }

let gull = null, ball = null, ballFleck = null, gullFleck = null;
function bauenBuehne() {
  titelStellen(0, ['Der Job', 'auf einen Blick'], { basis: 1134 });
  titelStellen(6, ['Dein Leben', 'auf Mallorca'], { basis: 1908 });
  titelStellen(11, ['Dein Sommer.', 'Dein Team.'], { basis: 2660 });
  titelStellen(18, ['Dein Sommer.', 'Deine Bühne.', 'Dein Job.'], { basis: HT + 585, size: 126, depth: 20, front: INK, side: INK_SIDE, abstand: 150 });
  gull = buildGull(env, { depth: 1300, focal: F, cx: CX, cy: CY, size: 80 });
  gull.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  camSpace.add(gull.root); gull.root.visible = true;
  gull.reset({ yaw: -0.42, pitch: 0.04, fold: 1, tuck: 0, headYaw: -0.8, headPitch: 0.1, stare: 1, cock: 0.85, smile: 0.9, shades: 0 });
  gullFleck = fleck(0, 0, 150, 30);
  ball = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), ballMaterial()); ball.castShadow = true;
  ball.quaternion.setFromEuler(new THREE.Euler(0.55, -0.5, 0.25));
  ball.scale.setScalar(BALL_R); scene.add(ball);
  ballFleck = fleck(0, 0, 150, 30);
}

// Scrollen: Jedes Bild ist eine Strecke von --beat Fensterhöhen. beatPos zählt die Bilder, die Kamera gleitet dazwischen.
let beatPos = 0, pan = PAN[0] || 0, vhU = 900, sitzend = true, CW = W, xOff = 0;
// Im Hochformat stehen die Titel kleiner und am linken Rand des Ausschnitts.
function titelPassen() {
  const k = hoch.matches ? 0.45 : 1;
  for (const T of titel) for (const g of T.gruppen) {
    const x = hoch.matches ? XH[T.beat] + 26 : g.userData.x0;
    g.position.x = x; g.scale.set(k, k, 1);
    const f = g.userData.fleck; f.position.x = x + g.userData.w * k / 2 + 10; f.scale.set(k, 1, 1);
  }
}
const beatH = () => innerHeight * (parseFloat(getComputedStyle(root).getPropertyValue('--beat')) || 0.85);
function layout() {
  const w = innerWidth, h = innerHeight;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5)); renderer.setSize(w, h, false);
  CW = hoch.matches ? CW_H : W; vhU = h * CW / w;
  BALL = hoch.matches ? BALL_H : BALL_D; MOEWE = hoch.matches ? MOEWE_H : MOEWE_D;
  root.classList.toggle('welt-hoch', hoch.matches);
  if (font) titelPassen();
}
// Im Hochformat liegen die Bilder in der Seite: Das Bild in der Fenstermitte bestimmt die Kameralage.
function beatPosFluss() {
  const mitte = innerHeight * 0.45; let k = 0;
  for (let i = 0; i < beats.length; i++) { const r = beats[i].getBoundingClientRect(); if (r.top <= mitte) k = i + clamp((mitte - r.top) / Math.max(1, r.height), 0, 0.999); }
  return clamp(k, 0, beats.length - 1);
}
let lastBallX = 0;
function scrollen() {
  const s0 = track.offsetHeight - innerHeight, n = beats.length;
  beatPos = hoch.matches ? beatPosFluss() : clamp((scrollY - s0) / beatH(), 0, n - 1);
  const i = Math.min(n - 2, Math.floor(beatPos)), fr = clamp(beatPos - i, 0, 1);
  // Im Hochformat wechselt die Kamera erst im letzten Drittel eines Bildes, damit jedes Kapitel auf seiner Wand bleibt.
  const f = hoch.matches ? ease(clamp((fr - 0.66) / 0.34, 0, 1)) : ease(fr);
  const P = hoch.matches ? PAN_H : PAN;
  pan = clamp(lerp(P[i], P[i + 1], f), 0, HP - vhU);
  xOff = hoch.matches ? clamp(lerp(XH[i], XH[i + 1], f), 0, W - CW) : 0;
  cam.setViewOffset(W, HP, xOff, pan, CW, vhU); cam.updateProjectionMatrix();
  if (!hoch.matches) beats.forEach((b, k) => {
    const d = beatPos - k, a = clamp(1 - Math.abs(d) * 1.7, 0, 1);
    b.style.opacity = a.toFixed(3); b.style.transform = `translateY(${(-d * 60).toFixed(1)}px)`; b.style.visibility = a > 0.01 ? 'visible' : 'hidden';
    b.toggleAttribute('data-aktiv', Math.abs(d) < 0.5);
  });
  // Ball: zwischen zwei Bildern hüpft er in einem Bogen, dazu rollt er mit dem Weg.
  const a0 = stuetze(BALL, i), a1 = stuetze(BALL, i + 1), hop = Math.sin(Math.PI * f) * (a0 === a1 ? 0 : 220);
  const bx = lerp(a0[0], a1[0], f), by = lerp(a0[1], a1[1], f) - hop;
  if (ball) { ball.position.set(bx, -(by - BALL_R), 120); ball.rotation.z -= (bx - lastBallX) / BALL_R; lastBallX = bx; ballFleck.position.set(bx + 8, -(by + 4), 1.2); ballFleck.scale.setScalar(1 - hop / 400); }
  // Möwe: fliegt in einem Bogen zur nächsten Ebene, sonst sitzt sie.
  const m0 = stuetze(MOEWE, i), m1 = stuetze(MOEWE, i + 1), fliegt = m0 !== m1 && f > 0.02 && f < 0.98;
  if (gull) {
    const mx = lerp(m0[0], m1[0], f), my = lerp(m0[1], m1[1], f) - Math.sin(Math.PI * f) * (m0 === m1 ? 0 : 260);
    gull.place(mx, my);
    if (fliegt && sitzend) { sitzend = false; gull.reset({ yaw: m1[0] >= m0[0] ? -0.42 : Math.PI + 0.42, pitch: 0.12, fold: 0, flapAmp: 1, flapRate: 13, tuck: 1, headYaw: -0.3, stare: 1, shades: 1, cock: 0.6 }); }
    if (!fliegt && !sitzend) { sitzend = true; gull.reset({ yaw: -0.42, pitch: 0.04, fold: 1, tuck: 0, headYaw: -0.8, headPitch: 0.1, stare: 1, cock: 0.85, smile: 0.9, shades: 0 }); }
    gullFleck.position.set(mx + 2, -(my + 7), 1.2); gullFleck.visible = !fliegt;
  }
}
let last = performance.now();
function frame() {
  requestAnimationFrame(frame);
  if (!root.classList.contains('past') || document.hidden) { last = performance.now(); return; }
  const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
  scrollen(); titelSchritt(dt, beatPos);
  if (gull && !reduced.matches) gull.update(dt);
  renderer.render(scene, cam);
}

// Menü: Die Kapitel sind Bilder, ein Anker springt zu seinem Bild.
function zuBeat(k) { const s0 = track.offsetHeight - innerHeight; const top = hoch.matches ? beats[k].getBoundingClientRect().top + scrollY - innerHeight * 0.08 : s0 + k * beatH(); scrollTo({ top, behavior: reduced.matches ? 'instant' : 'smooth' }); }
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]'); if (!a) return;
  const ziel = document.getElementById(a.getAttribute('href').slice(1)); if (!ziel || !ziel.dataset.beat) return;
  e.preventDefault(); zuBeat(+ziel.dataset.beat);
});

Promise.all([fetch('fonts/shrikhand-welt.typeface.json').then((r) => r.json()), document.fonts?.ready]).then(([json]) => {
  font = new FontLoader().parse(json);
  layout(); bauenBuehne(); titelPassen(); scrollen(); titelSchritt(0, beatPos);
  addEventListener('resize', () => { layout(); scrollen(); });
  hoch.addEventListener('change', () => { layout(); beats.forEach((b) => { b.style.opacity = ''; b.style.transform = ''; b.style.visibility = ''; }); scrollen(); });
  requestAnimationFrame(frame);
  root.classList.add('welt-da');
  if (new URLSearchParams(location.search).has('debug')) window.__welt = { scene, cam, renderer, gull, ball, titel, beats: beats.length, pan: () => pan, beat: () => beatPos, beatH, beatTop: (k) => beats[k].getBoundingClientRect().top + scrollY, advance: (s) => { for (let k = 0; k < s * 60; k++) { titelSchritt(1 / 60, beatPos); gull?.update(1 / 60); } }, render: () => { scrollen(); renderer.render(scene, cam); } };
}).catch((e) => console.error('Welt', e));
