import * as THREE from '../vendor/three/three.module.js';

// Echte Federn, wenn der Ball die Möwe erwischt: ein Puff aus Flaum und ein paar einzelne Federn. Sie bremsen in der Luft fast sofort ab
// und segeln dann pendelnd wie ein Blatt nach unten. Unten bleiben sie liegen, der Ball wirbelt sie wieder auf.
const CELL = 256;
const seeded = (s) => () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

// Zeichnet eine Feder von der Spitze (oben) bis zum Kiel (unten). Fahne, Äste, Risse, flaumiger Ansatz und Schaft.
function drawFeather(ctx, ox, big, rnd) {
  const cx = ox + CELL / 2, H = CELL * 2, top = 16, end = H * 0.8, shaft = (y) => cx + 20 * Math.sin(Math.PI * (y - top) / (H - top));
  const half = (t, k) => k * (big ? 62 : 92) * Math.pow(Math.sin(Math.PI * Math.pow(t, big ? 0.5 : 0.62)), 0.72);
  const edge = (t, s) => { const y = top + (end - top) * t; return [shaft(y) + s * half(t, s > 0 ? 1 : 0.74), y]; };
  ctx.save();
  ctx.beginPath(); ctx.rect(ox, 0, CELL, H); ctx.clip();
  ctx.beginPath();
  const at = (i) => Math.pow(i / 70, 1.9);
  for (let i = 0; i <= 70; i++) { const [x, y] = edge(at(i), 1); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
  for (let i = 70; i >= 0; i--) { const [x, y] = edge(at(i), -1); ctx.lineTo(x, y); }
  ctx.closePath();
  const g = ctx.createLinearGradient(0, top, 0, end);
  if (big) { g.addColorStop(0, '#23282f'); g.addColorStop(0.42, '#2a3039'); g.addColorStop(0.68, '#6a7e95'); g.addColorStop(1, '#9fb0c2'); }
  else { g.addColorStop(0, '#fffdf8'); g.addColorStop(0.6, '#fbf6ec'); g.addColorStop(1, '#efe6d6'); }
  ctx.fillStyle = g; ctx.fill();
  // Schwungfedern tragen an der Spitze einen runden hellen Fleck, wie bei einer echten Möwe.
  if (big) {
    ctx.save();
    ctx.clip();
    const sy = top + (end - top) * 0.07, sx = shaft(sy), sp = ctx.createRadialGradient(sx, sy, 6, sx, sy, 58);
    sp.addColorStop(0, 'rgba(248,243,232,1)'); sp.addColorStop(0.62, 'rgba(248,243,232,1)'); sp.addColorStop(1, 'rgba(248,243,232,0)');
    ctx.fillStyle = sp; ctx.fillRect(ox, 0, CELL, CELL);
    ctx.restore();
  }
  // Die Äste laufen schräg vom Schaft zum Rand. Sie geben der Fahne ihre Struktur und ihren Schimmer.
  ctx.lineWidth = 1.4;
  for (const s of [1, -1]) for (let t = 0.02; t < 0.98; t += 0.012) {
    const [ex, ey] = edge(t, s), y0 = ey + 26 + half(t, 0.3), x0 = shaft(y0);
    ctx.strokeStyle = big ? `rgba(255,255,255,${0.04 + rnd() * 0.08})` : `rgba(120,130,150,${0.05 + rnd() * 0.1})`;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(ex, ey); ctx.stroke();
  }
  // Risse: Daran erkennt man eine Feder, ein Blatt hat so etwas nicht.
  ctx.globalCompositeOperation = 'destination-out';
  for (const [t, s] of big ? [[0.34, 1], [0.58, -1], [0.72, 1]] : [[0.28, 1], [0.46, -1], [0.62, 1], [0.76, -1]]) {
    const [ex, ey] = edge(t, s), y0 = ey + 42, x0 = shaft(y0) + s * 22;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(ex + s * 10, ey - 9); ctx.lineTo(ex + s * 10, ey + 11); ctx.closePath(); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  // Flaum am Ansatz.
  ctx.lineCap = 'round';
  for (let i = 0; i < 110; i++) {
    const r0 = rnd(), t = 1 - 0.34 * r0 * r0, y = top + (end - top) * t, s = rnd() < 0.5 ? -1 : 1, L = 26 + rnd() * 62;
    ctx.strokeStyle = `rgba(255,252,246,${0.28 + rnd() * 0.5})`; ctx.lineWidth = 1 + rnd() * 2.2;
    ctx.beginPath(); ctx.moveTo(shaft(y), y); ctx.quadraticCurveTo(shaft(y) + s * L * 0.6, y - 6 + rnd() * 10, shaft(y) + s * L, y + 8 + rnd() * 26); ctx.stroke();
  }
  // Schaft und Kiel.
  for (let i = 0; i < 90; i++) {
    const y = top + 26 + (H - top - 46) * i / 90, w = 2.4 + 8 * i / 90;
    ctx.fillStyle = big && y < end * 0.5 ? '#c9c2b6' : '#d8c8ad';
    ctx.fillRect(shaft(y) - w / 2, y, w, (H - top) / 88);
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.fillRect(shaft(y) - w / 2 + 0.6, y, Math.max(1, w * 0.32), (H - top) / 88);
  }
  ctx.restore();
}
function drawDown(ctx, ox, rnd) {
  const cx = ox + CELL / 2, cy = CELL;
  ctx.save();
  ctx.beginPath(); ctx.rect(ox, 0, CELL, CELL * 2); ctx.clip();
  ctx.lineCap = 'round';
  for (let i = 0; i < 150; i++) {
    const a = rnd() * Math.PI * 2, L = 44 + rnd() * 84, bx = cx + Math.cos(a) * L * 0.5 + (rnd() - 0.5) * 22, by = cy + Math.sin(a) * L * 0.5 * 1.5;
    ctx.strokeStyle = `rgba(255,252,246,${0.22 + rnd() * 0.5})`; ctx.lineWidth = 1.2 + rnd() * 3;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.quadraticCurveTo(bx, by, cx + Math.cos(a + 0.5) * L, cy + Math.sin(a + 0.5) * L * 1.5); ctx.stroke();
  }
  const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 34);
  g.addColorStop(0, 'rgba(255,253,248,.95)'); g.addColorStop(1, 'rgba(255,253,248,0)');
  ctx.fillStyle = g; ctx.fillRect(ox, 0, CELL, CELL * 2);
  ctx.restore();
}
function drawShadow(ctx, ox) {
  const cx = ox + CELL / 2, cy = CELL;
  ctx.save();
  ctx.translate(cx, cy); ctx.scale(1, 2);
  const g = ctx.createRadialGradient(0, 0, 8, 0, 0, CELL * 0.48);
  g.addColorStop(0, 'rgba(70,16,0,.62)'); g.addColorStop(0.6, 'rgba(70,16,0,.24)'); g.addColorStop(1, 'rgba(70,16,0,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, CELL * 0.48, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
// Vier Felder nebeneinander: Deckfeder, Schwungfeder, Flaum und der weiche Schatten am Boden.
function buildAtlas() {
  const canvas = document.createElement('canvas');
  canvas.width = CELL * 4; canvas.height = CELL * 2;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const rnd = seeded(7);
  drawFeather(ctx, 0, false, rnd);
  drawFeather(ctx, CELL, true, rnd);
  drawDown(ctx, CELL * 2, rnd);
  drawShadow(ctx, CELL * 3);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height), d = img.data;
  // Ganz durchsichtige Stellen bekommen die Farbe ihres Feldes, sonst entsteht beim Verkleinern ein dunkler Rand.
  const fills = [[250, 246, 236], [120, 134, 150], [253, 250, 244], [70, 16, 0]];
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] > 0) continue;
    const c = fills[Math.min(3, Math.floor(((i / 4) % canvas.width) / CELL))];
    d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2];
  }
  const tex = new THREE.DataTexture(d, canvas.width, canvas.height, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 4; tex.needsUpdate = true;
  return tex;
}

const COUNT = 22, SHADOWS = 9;
export function buildFeathers(env, { focal, cx, cy, floor, ball, pointer }) {
  const geo = new THREE.PlaneGeometry(1, 2, 3, 10);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), t = (y + 1) / 2;
    p.setZ(i, Math.sin(Math.PI * t) * 0.26 - x * x * 0.55 + Math.sin(t * 3) * x * 0.12);
  }
  geo.computeVertexNormals();
  const fx = new THREE.InstancedBufferAttribute(new Float32Array((COUNT + SHADOWS) * 2), 2);
  fx.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('aFx', fx);
  const mat = new THREE.MeshStandardMaterial({ map: buildAtlas(), transparent: true, depthWrite: false, alphaTest: 0.012, side: THREE.DoubleSide, roughness: 0.82, metalness: 0, envMap: env, envMapIntensity: 0.4 });
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = 'attribute vec2 aFx; varying float vFade;\n' + sh.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\n vMapUv.x = (vMapUv.x + aFx.x) / 4.; vFade = aFx.y;');
    sh.fragmentShader = 'varying float vFade;\n' + sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n diffuseColor.a *= vFade;');
  };
  const mesh = new THREE.InstancedMesh(geo, mat, COUNT + SHADOWS);
  mesh.frustumCulled = false;
  mesh.visible = false;
  const tones = [0xffffff, 0xf7f2e8, 0xc9d3de], c = new THREE.Color(), o = new THREE.Object3D();
  o.rotation.order = 'ZXY';
  for (let i = 0; i < COUNT + SHADOWS; i++) mesh.setColorAt(i, c.setHex(i < SHADOWS ? 0xffffff : tones[i % 3]));
  // Die Schatten stehen vorn in der Liste und liegen damit unter den Federn.
  const list = Array.from({ length: COUNT }, (_, i) => ({ kind: i < 2 ? 1 : i < SHADOWS ? 0 : 2, on: false, x: 0, y: 0, vx: 0, vy: 0 }));
  let live = 0;
  const rand = (a, b) => a + Math.random() * (b - a);

  function fire(x, y, nx = 0.4, ny = -0.9, k = 1) {
    list.forEach((f, i) => {
      const big = f.kind === 1, down = f.kind === 2;
      const sp = big ? rand(170, 380) : down ? rand(90, 520) : rand(220, 640), an = down ? rand(-Math.PI * 1.1, Math.PI * 0.1) : rand(-Math.PI, 0);
      Object.assign(f, {
        on: true, ground: false, gone: false, age: 0, x: x + rand(-22, 22), y: y + rand(-20, 20),
        vx: Math.cos(an) * sp + nx * sp * 0.55, vy: Math.sin(an) * sp * 1.05 + ny * sp * 0.3 - (down ? 60 : 220),
        d: rand(600, 688), a: Math.random() * 6.28, va: rand(-13, 13), b: Math.random() * 6.28, vb: rand(-9, 9), ph: Math.random() * 6.28,
        w: big ? rand(2, 2.7) : down ? rand(3.2, 4.6) : rand(2.5, 3.7), amp: big ? rand(52, 90) : down ? rand(10, 20) : rand(26, 62),
        term: big ? rand(58, 76) : down ? rand(15, 30) : rand(44, 78), drag: big ? rand(3, 3.8) : down ? rand(4.6, 6) : rand(3.6, 4.8),
        s: big ? rand(30, 38) : down ? rand(11, 21) : rand(16, 26), wind: rand(-9, 9), rest: rand(4.5, 7.5), life: down ? rand(0.55, 1.5) : 99, lay: 0, fade: 1,
        floor: floor + rand(-2, 40), head: Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2,
      });
      // Die eine Feder, die sich Zeit lässt: Sie kommt lange nach allen anderen unten an.
      if (i === 0) { f.term = 31; f.amp = 96; f.w = 1.75; f.vy -= 180; }
      f.s *= k; f.vx *= k; f.vy *= k; f.amp *= k;
    });
    live = 1;
    mesh.visible = true;
  }
  function clear() { for (const f of list) f.on = false; live = 0; mesh.visible = false; }

  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  function update(dt, hidden) {
    if (!live) return;
    if (hidden) { clear(); return; }
    const b = ball(), P = pointer();
    let any = false;
    list.forEach((f, i) => {
      const si = i < SHADOWS ? i : -1, fi = SHADOWS + i;
      if (!f.on) { mesh.setMatrixAt(fi, zero); if (si >= 0) mesh.setMatrixAt(si, zero); fx.setXY(fi, f.kind, 0); return; }
      any = true;
      f.age += dt;
      const calm = 1 - Math.exp(-f.age * 2.1);
      if (!f.ground) {
        f.ph += f.w * dt;
        const co = Math.cos(f.ph), k = 1 - Math.exp(-dt * f.drag);
        // Pendeln wie ein fallendes Blatt: Mitten im Schwung fällt sie am schnellsten, an den Enden hängt sie fast in der Luft.
        f.vx += (f.wind + f.amp * co * calm - f.vx) * k;
        f.vy += (f.term * (0.26 + 0.74 * co * co) * calm - f.vy) * k;
        f.x += f.vx * dt; f.y += f.vy * dt;
        f.a += f.va * dt; f.va *= Math.exp(-dt * 2.8);
        f.a += Math.atan2(Math.sin(f.head - f.a), Math.cos(f.head - f.a)) * Math.min(1, dt * 1.5 * calm);
        f.b += f.vb * dt * (1 - calm);
        if (f.y >= f.floor && f.kind !== 2 && !f.gone) { f.ground = true; f.y = f.floor; f.vy = 0; f.vx *= 0.4; f.lay = 0; }
      } else {
        f.x += f.vx * dt; f.vx *= Math.exp(-dt * 6);
        f.lay += (1 - f.lay) * (1 - Math.exp(-dt * 9));
        f.rest -= dt;
        // Ein leichter Windstoß nimmt am Ende mit, was noch auf der Terrasse liegt.
        if (f.rest <= 0) { f.ground = false; f.gone = true; f.wind = rand(220, 340); f.term = -18; f.amp = 12; f.vy = -40; }
      }
      // Der Ball schiebt Federn zur Seite und wirbelt liegende wieder auf.
      const dx = f.x - b.x, dy = f.y - b.y, dist = Math.hypot(dx, dy), reach = b.r + 7;
      if (dist < reach && dist > 0) {
        const nx = dx / dist, ny = dy / dist;
        f.x = b.x + nx * reach; f.y = Math.min(f.floor, b.y + ny * reach);
        const speed = Math.hypot(b.vx, b.vy);
        if (speed > 12) { f.vx += b.vx * 0.5 + nx * (40 + speed * 0.2); f.vy += b.vy * 0.3 - 60 - speed * 0.35; f.va += rand(-4, 4); if (f.ground) { f.ground = false; f.y -= 2; } }
      }
      // Auch die Hand macht Wind.
      if (P.over && !f.ground) { const px = f.x - P.x, py = f.y - P.y, e = Math.exp(-(px * px + py * py) / (2 * 70 * 70)); f.vx += P.vx * 0.05 * e; }
      if (f.kind === 2) f.fade = Math.min(1, Math.max(0, (f.life - f.age) / 0.5));
      if (f.gone) f.fade = Math.max(0, f.fade - dt * 0.8);
      if (f.fade <= 0) { f.on = false; return; }

      const K = f.d / focal;
      o.position.set((f.x - cx) * K, -(f.y - cy) * K, -f.d);
      const rock = Math.sin(f.ph) * calm;
      o.rotation.set(rock * 0.28 * (1 - f.lay) + f.lay * 0.1, (f.b + rock * 0.62) * (1 - f.lay) + f.lay * 1.02, f.a + rock * 0.42 * (1 - f.lay));
      o.scale.setScalar(f.s * K);
      o.updateMatrix();
      mesh.setMatrixAt(fi, o.matrix);
      fx.setXY(fi, f.kind, f.fade);
      if (si >= 0) {
        // Der Schatten zieht sich zusammen und wird dunkler, je näher die Feder dem Boden kommt.
        const near = Math.min(1, Math.max(0, 1 - (f.floor - f.y) / 90)), SK = 700 / focal;
        o.position.set((f.x - cx) * SK, -(f.floor + 3 - cy) * SK, -700);
        o.rotation.set(0, 0, 0);
        o.scale.set(f.s * SK * (2.5 - near * 0.5), f.s * SK * (0.42 - near * 0.1), f.s * SK);
        o.updateMatrix();
        mesh.setMatrixAt(si, o.matrix);
        fx.setXY(si, 3, near * near * 0.8 * f.fade);
      }
    });
    mesh.instanceMatrix.needsUpdate = true;
    fx.needsUpdate = true;
    if (!any) clear();
  }
  // Einmal vorab durch die Grafikkarte schicken, damit der erste Treffer nicht hakt.
  mesh.instanceColor.needsUpdate = true;
  for (let i = 0; i < COUNT + SHADOWS; i++) mesh.setMatrixAt(i, zero);
  return { mesh, fire, clear, update, list, get live() { return live; } };
}
