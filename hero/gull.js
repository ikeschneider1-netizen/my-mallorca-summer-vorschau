import * as THREE from '../vendor/three/three.module.js';

// Die Möwe: eine kleine Spielzeugfigur im selben Look wie Ball und Buchstaben.
// Der Körper ist weich modelliert, die Flügel bestehen aus einzelnen Federn, die beim Anlegen übereinanderrutschen.
// Achsen: +x ist vorn, +y oben, +z zeigt zur Kamera. Der Ursprung liegt bei den Füßen.
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;
const tmp = new THREE.Vector3();

const CREAM = new THREE.Color(0xf6efe0), PEACH = new THREE.Color(0xeeb98c), SHADE = new THREE.Color(0xd9cdbc);
const MANTLE = new THREE.Color(0x667c94), MANTLE_SOFT = new THREE.Color(0x8297ae), UNDER = new THREE.Color(0xe6e3dc), INK = new THREE.Color(0x1d2229);
const BEAK = new THREE.Color(0xffbf1a), BEAK_TIP = new THREE.Color(0xf0861c);

function shaped(geo, fn) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { tmp.fromBufferAttribute(p, i); fn(tmp); p.setXYZ(i, tmp.x, tmp.y, tmp.z); }
  geo.computeVertexNormals();
  return geo;
}
// Malt direkt auf die Form: So gehen Farben weich ineinander über, ganz ohne Textur.
function paint(geo, fn) {
  const p = geo.attributes.position, c = new Float32Array(p.count * 3), col = new THREE.Color();
  for (let i = 0; i < p.count; i++) { tmp.fromBufferAttribute(p, i); fn(tmp, col); c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return geo;
}
// Eine Feder als weiches Kissen. Sie läuft von der Wurzel entlang -x zur Spitze, u geht dabei von 0 nach 1.
function blade({ len, wid, thick, arch = 0, bend = 0, tone }) {
  const S = 16, R = 8, pos = [], col = [], idx = [], c = new THREE.Color();
  for (let i = 0; i <= S; i++) {
    const u = i / S;
    const w = wid * (0.4 + 0.6 * smooth(0, 0.34, u)) * Math.sqrt(Math.max(0, 1 - Math.pow(Math.max(0, u - 0.6) / 0.4, 2)));
    const t = thick * (1 - 0.45 * u) * Math.min(1, w / wid + 0.2);
    for (let j = 0; j < R; j++) {
      const a = j / R * Math.PI * 2, sa = Math.sin(a), ca = Math.cos(a);
      pos.push(-len * u, arch * Math.sin(Math.PI * u) + t * sa, bend * u * u + w * ca);
      tone(u, sa, c);
      col.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < S; i++) for (let j = 0; j < R; j++) {
    const a = i * R + j, b = i * R + (j + 1) % R, d = (i + 1) * R + j, e = (i + 1) * R + (j + 1) % R;
    idx.push(a, b, d, b, e, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}
// Flache, weich gerundete Form aus einem Umriss; u läuft nach außen (+z), v nach vorn (+x).
function slab(points, thick) {
  const sh = new THREE.Shape();
  sh.moveTo(points[0][0], points[0][1]);
  sh.splineThru(points.slice(1).map(([a, b]) => new THREE.Vector2(a, b)));
  sh.closePath();
  const geo = new THREE.ExtrudeGeometry(sh, { depth: thick, curveSegments: 10, bevelEnabled: true, bevelThickness: thick * 0.5, bevelSize: thick * 0.7, bevelSegments: 2 });
  return shaped(geo, (v) => v.set(v.y, v.z - thick / 2, v.x));
}

const ARM = 0.42, FORE = 0.4, FOLD_IN = 0.76;
const DEFAULTS = { yaw: -0.4, pitch: 0, roll: 0, sweep: 0, fold: 1, flapAmp: 0, flapRate: 10, tuck: 0, walk: 0, headYaw: 0, headPitch: 0, headRoll: 0, lid: 0.3, mouth: 0, squash: 0, stare: 0, lookX: 0, lookY: 0, brow: 0, cock: 0.7, smile: 0.62, tongue: 0, shades: 0, shadeTilt: 0, wide: 0, puff: 0, crest: 0, gesture: 0, tailUp: 0, stab: 0.6, blink: 1 };

export function buildGull(env, { depth, focal, cx, cy, size: startSize }) {
  let size = startSize;
  const soft = (color, o = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.62, clearcoat: 0.12, clearcoatRoughness: 0.5, envMap: env, envMapIntensity: 0.34, side: THREE.DoubleSide, ...o });
  const skin = soft(0xffffff, { vertexColors: true }), beakMat = soft(0xffffff, { vertexColors: true, roughness: 0.34, clearcoat: 0.55, clearcoatRoughness: 0.3, envMapIntensity: 0.5 });
  const lidMat = soft(0xece5d6), browMat = soft(0x3a4a5e, { roughness: 0.5 }), lashMat = soft(0x262c35, { roughness: 0.4 }), footMat = soft(0xf07f2e, { roughness: 0.48, clearcoat: 0.25 }), ringMat = soft(0xe8437f, { roughness: 0.3, clearcoat: 0.6 });
  const redMat = soft(0xe03024, { roughness: 0.34, clearcoat: 0.5 }), mouthMat = soft(0x8c2230), tongueMat = soft(0xf07a86);
  const eyeMat = soft(0xfffdf5, { roughness: 0.2, clearcoat: 0.8, clearcoatRoughness: 0.12 });
  const frameMat = soft(0xe8437f, { roughness: 0.26, clearcoat: 0.8, clearcoatRoughness: 0.2 }), lensMat = soft(0x14171d, { roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.5 });
  const irisMat = soft(0xffc62e, { roughness: 0.22, clearcoat: 0.8, clearcoatRoughness: 0.15 }), pupilMat = soft(0x101215, { roughness: 0.14, clearcoat: 0.9, clearcoatRoughness: 0.1 });
  const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const mesh = (geo, mat, parent, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };

  const root = new THREE.Group();
  root.visible = false;
  const tilt = new THREE.Group();
  tilt.position.y = 0.62;
  root.add(tilt);

  // Körper: voll vorn, spitz nach hinten. Oben liegt der graue Rücken, unten nimmt er wie die Buchstaben das warme Licht der Terrasse an.
  const trunk = new THREE.Group();
  tilt.add(trunk);
  const toneBody = (v, c) => {
    const t = (v.x + 0.78) / 1.56;
    c.copy(CREAM).lerp(SHADE, smooth(-0.02, -0.2, v.y) * 0.55).lerp(PEACH, smooth(-0.16, -0.42, v.y) * 0.75);
    c.lerp(MANTLE, smooth(0.14, 0.32, v.y) * smooth(0.82, 0.5, t));
  };
  mesh(paint(shaped(new THREE.SphereGeometry(1, 48, 32), (v) => {
    const t = (v.x + 1) / 2, w = 0.3 + 0.7 * Math.pow(Math.sin(Math.min(1, t * 1.28) * Math.PI / 2), 0.85);
    v.set(v.x * 0.78, v.y * (v.y < 0 ? 0.47 : 0.41) * w + (t - 0.55) * 0.1, v.z * 0.41 * w);
  }), toneBody), skin, trunk);
  const neck = mesh(paint(new THREE.SphereGeometry(1, 28, 20), (v, c) => { c.copy(CREAM).lerp(SHADE, smooth(0.5, -0.8, v.y) * 0.75); }), skin, trunk, 0.47, 0.2, 0);
  neck.scale.set(0.28, 0.3, 0.25);

  // Kopf: etwas zu groß, das macht den Charakter. Dazu Schnabel, Augen mit Lid und Braue und ein Federschopf.
  const head = new THREE.Group();
  head.position.set(0.6, 0.4, 0);
  head.rotation.order = 'YZX';
  tilt.add(head);
  // Ein Stück größer als natürlich: Großer Kopf, große Augen, das macht sie frech statt brav.
  head.scale.setScalar(1.1);
  mesh(paint(shaped(new THREE.SphereGeometry(0.3, 36, 26), (v) => { const brow = v.y > 0 ? 1 - 0.2 * smooth(0, 0.3, v.x) : 1; v.set(v.x * 1.06, v.y * (v.y > 0 ? 0.96 : 1) * brow, v.z * (v.y < 0 ? 1.03 : 0.92)); }), (v, c) => { c.copy(CREAM).lerp(SHADE, smooth(-0.04, -0.28, v.y) * 0.8); }), skin, head);

  const toneBeak = (L) => (v, c) => { c.copy(BEAK).lerp(BEAK_TIP, smooth(0.6, 1, v.x / L) * 0.6); };
  mesh(paint(shaped(new THREE.SphereGeometry(1, 28, 18), (v) => {
    const u = (v.x + 1) / 2, y = v.y > 0 ? 0.14 : 0.024;
    v.set(u * 0.45, v.y * y * Math.pow(1 - u * u * 0.95, 0.62) - 0.062 * u * u * u + 0.014, v.z * 0.125 * Math.pow(1 - u * u * 0.9, 0.58));
  }), toneBeak(0.45)), beakMat, head, 0.2, -0.01, 0);
  const roof = mesh(new THREE.SphereGeometry(1, 14, 10), mouthMat, head, 0.34, -0.01, 0);
  roof.scale.set(0.15, 0.012, 0.08);
  const jaw = new THREE.Group();
  jaw.position.set(0.2, -0.04, 0);
  head.add(jaw);
  mesh(paint(shaped(new THREE.SphereGeometry(1, 24, 16), (v) => {
    const u = (v.x + 1) / 2, dn = v.y < 0 ? 0.088 * (1 + 0.5 * smooth(0.4, 0.68, u) * smooth(0.97, 0.72, u)) : 0.016;
    v.set(u * 0.37, v.y * dn * Math.pow(1 - u * u * 0.96, 0.62), v.z * 0.1 * Math.pow(1 - u * u * 0.9, 0.58));
  }), toneBeak(0.37)), beakMat, jaw);
  const floorMouth = mesh(new THREE.SphereGeometry(1, 14, 10), mouthMat, jaw, 0.13, 0.012, 0);
  floorMouth.scale.set(0.13, 0.01, 0.072);
  const tongue = mesh(new THREE.SphereGeometry(1, 14, 10), tongueMat, jaw, 0.13, 0.024, 0);
  const spot = mesh(new THREE.SphereGeometry(1, 14, 10), redMat, jaw, 0.26, -0.044, 0);
  spot.scale.set(0.04, 0.036, 0.056);

  // Die Mundwinkel laufen in die Wange und gehen nach oben: Daher kommt das freche Grinsen.
  const corners = [1, -1].map((side) => {
    const m = mesh(new THREE.SphereGeometry(1, 14, 10), beakMat, head, 0.17, -0.048, side * 0.122);
    m.scale.set(0.09, 0.031, 0.032);
    m.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(m.geometry.attributes.position.count * 3).map((_, i) => [BEAK_TIP.r, BEAK_TIP.g, BEAK_TIP.b][i % 3]), 3));
    return { m, side };
  });

  const hemi = new THREE.SphereGeometry(0.113, 22, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  const lashGeo = new THREE.TorusGeometry(0.113, 0.014, 6, 20, Math.PI);
  lashGeo.rotateX(Math.PI / 2); lashGeo.rotateY(Math.PI / 2);
  const eyes = [1, -1].map((side) => {
    // Die Augen sitzen nah beieinander und nah am Schnabel. +x ist die Blickrichtung des Auges.
    const g = new THREE.Group();
    g.position.set(0.163, 0.118, side * 0.174);
    const dir = new THREE.Vector3(0.66, 0.1, side * 0.74).normalize();
    const zz = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
    const yy = new THREE.Vector3().crossVectors(zz, dir);
    g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(dir, yy, zz));
    head.add(g);
    const ball = mesh(new THREE.SphereGeometry(0.106, 24, 18), eyeMat, g);
    const gaze = new THREE.Group();
    g.add(gaze);
    mesh(new THREE.SphereGeometry(0.077, 18, 14), irisMat, gaze, 0.043, 0, 0);
    const pupil = mesh(new THREE.SphereGeometry(0.052, 16, 12), pupilMat, gaze, 0.075, 0, 0);
    const spark = mesh(new THREE.SphereGeometry(0.019, 8, 6), sparkMat, gaze, 0.123, 0.03, 0.016);
    const lids = new THREE.Group();
    g.add(lids);
    const upper = new THREE.Group();
    lids.add(upper);
    mesh(hemi, lidMat, upper);
    mesh(lashGeo, lashMat, upper);
    const low = new THREE.Group();
    lids.add(low);
    mesh(hemi, lidMat, low).rotation.x = Math.PI;
    // Die Braue ist außen dick und läuft zum Schnabel hin spitz zu.
    const browGeo = shaped(new THREE.SphereGeometry(1, 16, 10), (v) => { const k = 0.62 + 0.38 * v.z * side; v.set(v.x * 0.056 * k, v.y * 0.042 * k, v.z * 0.15); });
    const brow = mesh(browGeo, browMat, lids, 0.015, 0.127, 0);
    return { g, gaze, ball, pupil, spark, lids, upper, low, brow, side, inv: g.quaternion.clone().invert() };
  });
  // Die Sonnenbrille: oben auf der Stirn, auf den Augen oder vorn auf dem Schnabel, zum Drüberwegschauen.
  const makeShades = (parent) => {
    const sph = new THREE.SphereGeometry(1, 16, 12);
    for (const side of [1, -1]) {
      const f = mesh(sph, frameMat, parent, -0.03, 0, side * 0.2); f.scale.set(0.02, 0.096, 0.122); f.rotation.y = -side * 0.72;
      const l = mesh(sph, lensMat, parent, -0.021, 0, side * 0.21); l.scale.set(0.018, 0.08, 0.106); l.rotation.y = -side * 0.72;
      const arm = mesh(sph, frameMat, parent, -0.26, 0.015, side * 0.285); arm.scale.set(0.17, 0.013, 0.013);
    }
    const bridge = mesh(sph, frameMat, parent, 0.006, 0.03, 0); bridge.scale.set(0.016, 0.017, 0.11);
  };
  const shades = new THREE.Group();
  head.add(shades);
  makeShades(shades);
  const flyer = new THREE.Group();
  flyer.visible = false;
  makeShades(flyer);
  const tuft = shaped(blade({ len: 0.3, wid: 0.062, thick: 0.026, arch: 0.012, tone: (u, s, c) => { c.copy(CREAM).lerp(MANTLE_SOFT, smooth(0.55, 1, u) * 0.55); } }), (v) => { const u = -v.x / 0.3; v.y += 0.075 * u * u; });
  const crest = new THREE.Group();
  crest.position.set(-0.04, 0.245, 0);
  head.add(crest);
  [[0.02, 0, 1], [-0.012, 0.032, 0.88], [-0.012, -0.032, 0.88], [-0.04, 0.012, 0.72]].forEach(([y, z, k], i) => {
    const m = mesh(tuft, skin, crest, -i * 0.024, y, z);
    m.rotation.y = z * 3.2; m.rotation.z = i === 3 ? 0.3 : 0; m.scale.setScalar(k);
  });

  // Die Federn der Flügel: dunkle Spitzen mit weißem Fleck, graue Schwingen mit weißem Saum, darüber kurze Decken. Die Unterseite ist hell.
  const under = (c, s) => { if (s < 0.2) c.lerp(UNDER, smooth(0.2, -0.3, s)); };
  const primary = blade({ len: 0.8, wid: 0.08, thick: 0.022, arch: 0.04, bend: -0.03, tone: (u, s, c) => { c.copy(MANTLE).lerp(INK, smooth(0.34, 0.5, u)).lerp(CREAM, smooth(0.86, 0.91, u)); if (u < 0.4) under(c, s); } });
  const second = blade({ len: 0.56, wid: 0.1, thick: 0.026, arch: 0.04, tone: (u, s, c) => { c.copy(MANTLE).lerp(CREAM, smooth(0.76, 0.9, u)); under(c, s); } });
  const covert = blade({ len: 0.3, wid: 0.088, thick: 0.028, arch: 0.022, tone: (u, s, c) => { c.copy(MANTLE_SOFT).lerp(MANTLE, smooth(0.1, 0.7, u) * 0.3); under(c, s); } });
  const armGeo = paint(new THREE.SphereGeometry(1, 18, 12), (v, c) => { c.copy(MANTLE_SOFT); if (v.y < 0.1) c.lerp(UNDER, smooth(0.1, -0.5, v.y)); });

  const wings = [1, -1].map((side) => {
    const holder = new THREE.Group();
    holder.scale.z = side;
    tilt.add(holder);
    const base = new THREE.Group();
    holder.add(base);
    const shoulder = new THREE.Group();
    shoulder.rotation.order = 'YXZ';
    base.add(shoulder);
    const elbow = new THREE.Group();
    shoulder.add(elbow);
    const wrist = new THREE.Group();
    elbow.add(wrist);
    const parts = [], bulk = [];
    const feather = (seg, geo, z, x, y, open, folded, twist = 0.1, k = 1, fan = 0) => {
      const q = mesh(geo, skin, seg, x, y, z);
      q.rotation.order = 'YXZ'; q.rotation.x = twist; q.scale.setScalar(k);
      parts.push({ q, z, open, folded, fan });
    };
    const arm = (seg, z, r, y, h) => { const m = mesh(armGeo, skin, seg, 0.06, y, z); m.scale.set(0.1, h, r); bulk.push({ m, z, r, h }); };
    // Armschwingen: innen kurz, nach außen länger. Angelegt fächern sie leicht nach unten auf, sodass ihre weißen Säume sichtbar bleiben.
    [[0.06, -0.14, 0.2, 0.78], [0.17, -0.08, 0.26, 0.84], [0.28, -0.03, 0.32, 0.9], [0.39, 0.02, 0.38, 0.94]].forEach(([z, a, f, k]) => feather(shoulder, second, z, 0, 0, a, f, 0.1, k));
    [[0.02, 0.04, 0.42, 0.96], [0.14, 0.09, 0.46, 1], [0.26, 0.14, 0.5, 1.02], [0.38, 0.2, 0.54, 1.02]].forEach(([z, a, f, k]) => feather(elbow, second, z, 0, -0.004, a, f, 0.1, k));
    // Handschwingen: gefingert, wenn der Flügel offen ist, und eng beieinander, wenn er anliegt.
    [[0, 0.46, 0.3, 0.72], [0.02, 0.68, 0.25, 0.8], [0.03, 0.9, 0.2, 0.88], [0.04, 1.1, 0.15, 0.95], [0.05, 1.28, 0.09, 1], [0.06, 1.44, 0.03, 0.97]].forEach(([z, a, f, k], i) => feather(wrist, primary, z, 0, -0.004 * i, a, f, 0.14, k, 1));
    [[0.05, 0.28], [0.2, 0.3], [0.35, 0.32]].forEach(([z, f]) => feather(shoulder, covert, z, 0.05, 0.028, 0, f, 0.14));
    [[0.03, 0.34], [0.18, 0.38], [0.33, 0.42]].forEach(([z, f], i) => feather(elbow, covert, z, 0.05, 0.028, 0.06 + i * 0.04, f, 0.14));
    [[0.02, 0.12, 0.4], [0.1, 0.5, 0.2]].forEach(([z, a, f]) => feather(wrist, covert, z, 0.04, 0.024, a, f, 0.14, 0.9));
    arm(shoulder, ARM / 2, ARM / 2 + 0.07, 0.012, 0.062);
    arm(elbow, FORE / 2, FORE / 2 + 0.06, 0.01, 0.052);
    arm(wrist, 0.06, 0.13, 0.008, 0.04);
    return { side, holder, base, shoulder, elbow, wrist, parts, bulk };
  });

  const tail = new THREE.Group();
  tail.position.set(-0.64, 0.02, 0);
  tilt.add(tail);
  const tailBlade = blade({ len: 0.46, wid: 0.098, thick: 0.05, arch: 0.05, tone: (u, s, c) => { c.copy(CREAM).lerp(SHADE, smooth(0.2, -0.4, s) * 0.8); } });
  const tailFeathers = [-0.4, -0.2, 0, 0.2, 0.4].map((a, i) => { const m = mesh(tailBlade, skin, tail, 0, 0.004 * (2 - Math.abs(i - 2)), 0); m.rotation.y = a; m.rotation.order = 'YXZ'; m.rotation.x = a * 0.25; return m; });

  // Kräftige Beine und große Schwimmfüße. Am Bein trägt sie den pinken Ring: ihr Bändchen.
  const footGeo = slab([[-0.045, -0.05], [-0.15, 0.17], [-0.05, 0.14], [0, 0.25], [0.05, 0.14], [0.15, 0.17], [0.045, -0.05]], 0.03);
  const shin = new THREE.CylinderGeometry(0.036, 0.046, 0.3, 14);
  shin.translate(0, -0.15, 0);
  const anklet = new THREE.TorusGeometry(0.046, 0.016, 10, 20);
  anklet.rotateX(Math.PI / 2);
  const legs = [1, -1].map((side) => {
    const leg = new THREE.Group();
    tilt.add(leg);
    mesh(shin, footMat, leg);
    mesh(new THREE.SphereGeometry(0.05, 14, 10), footMat, leg, 0, -0.28, 0);
    if (side === 1) mesh(anklet, ringMat, leg, 0, -0.16, 0);
    const foot = new THREE.Group();
    foot.position.set(0.01, -0.285, 0);
    leg.add(foot);
    mesh(footGeo, footMat, foot);
    return { leg, foot, side };
  });

  const pose = { ...DEFAULTS };
  let phase = 0, stride = 0, clock = 0, bob = 0, blinkIn = 2, blinkT = 9, snapIn = 1, snapGoal = 0, snap = 0, crestA = 0, crestV = 0, tailA = 0, tailV = 0, shadeY = 0, shadeV = 0;
  const q = new THREE.Quaternion(), toCam = new THREE.Vector3(), want = new THREE.Vector3(), X = new THREE.Vector3(1, 0, 0);
  function update(dt) {
    const p = pose, fold = clamp01(p.fold), open = 1 - fold, h = Math.min(dt, 1 / 30);
    clock += dt;
    phase += dt * p.flapRate;
    stride += dt * 11 * p.walk;
    const f = Math.sin(phase) * p.flapAmp, f2 = Math.sin(phase - 0.9) * p.flapAmp, f3 = Math.sin(phase - 1.7) * p.flapAmp, step = Math.sin(stride);
    // Beim Abschlag hebt sich der Körper ein wenig: So fliegt sie und gleitet nicht auf Schienen.
    bob = -Math.cos(phase) * p.flapAmp * open * 0.075;
    const breath = Math.sin(clock * 2.3) * 0.012 * fold;
    root.rotation.y = p.yaw;
    tilt.rotation.set(p.roll + step * 0.17 * p.walk, 0, p.pitch);
    tilt.position.y = 0.62 + Math.abs(step) * 0.05 * p.walk;
    tilt.scale.set(1 + p.squash * 0.55, 1 - p.squash + breath, 1 + p.squash * 0.55);
    trunk.scale.set(1 + p.puff * 0.05, 1 + p.puff * 0.1, 1 + p.puff * 0.08);

    // Vögel halten den Kopf ruhig, auch wenn der Körper kippt, und bewegen ihn dann in kleinen Rucken.
    if (dt > 0 && fold > 0.9 && p.walk < 0.1) { snapIn -= dt; if (snapIn <= 0) { snapIn = 0.6 + Math.random() * 1.7; snapGoal = (Math.random() - 0.5) * 0.2; } } else snapGoal = 0;
    snap += (snapGoal - snap) * (1 - Math.exp(-dt * 26));
    head.position.set(0.61 + Math.sin(stride * 2) * 0.042 * p.walk, 0.42 + p.puff * 0.05, 0);
    head.rotation.set(p.headRoll, p.headYaw + snap, p.headPitch - Math.max(-1, Math.min(1, p.pitch)) * p.stab + Math.sin(stride * 2) * 0.06 * p.walk);
    jaw.rotation.z = -Math.max(p.mouth, p.tongue * 0.42) * 0.78;
    // Zunge raus: Sie schiebt sich über die Schnabelspitze und wackelt.
    tongue.position.set(0.13 + p.tongue * 0.25, 0.024 + p.tongue * 0.012, 0);
    tongue.scale.set(0.09 + p.tongue * 0.1, 0.016 + p.tongue * 0.006, 0.034 + p.tongue * 0.012);
    tongue.rotation.set(Math.sin(clock * 17) * 0.32 * p.tongue, Math.sin(clock * 11) * 0.3 * p.tongue, -0.22 * p.tongue);

    // Lidschlag von selbst, außer sie kneift gerade oder ist erschrocken.
    if (dt > 0 && p.blink > 0) { blinkIn -= dt; if (blinkIn <= 0) { blinkIn = 1.8 + Math.random() * 3.4; blinkT = 0; } }
    blinkT += dt;
    const blinkNow = p.blink > 0 && blinkT < 0.16 ? 1 - Math.abs(blinkT / 0.08 - 1) : 0, lid = Math.max(p.lid, blinkNow);

    // Der Blick: frei über lookX und lookY, oder mit stare direkt in die Kamera. Das geht auch, wenn der Kopf woanders hinzeigt.
    toCam.copy(root.position).multiplyScalar(-1).normalize();
    q.copy(root.quaternion).multiply(tilt.quaternion).multiply(head.quaternion).invert();
    toCam.applyQuaternion(q);
    const nearEye = Math.abs(p.yaw) < Math.PI / 2 ? 1 : -1;
    for (const c of corners) {
      const up = p.smile + (c.side === nearEye ? p.cock * 0.5 : -p.cock * 0.25);
      c.m.rotation.z = -0.3 - up * 0.86;
      c.m.position.y = -0.052 + up * 0.021;
    }
    for (const e of eyes) {
      want.copy(toCam).applyQuaternion(e.inv);
      const free = tmp.set(1, p.lookY * 0.72, -e.side * p.lookX * 0.8).normalize();
      want.lerp(free, 1 - p.stare);
      want.x = Math.max(want.x, 0.42);
      e.gaze.quaternion.setFromUnitVectors(X, want.normalize());
      const big = 1 + p.wide * 0.14;
      e.ball.scale.setScalar(big);
      // Beim Schreck wird die Pupille klein, bleibt aber sichtbar auf dem Auge.
      const small = 1 - p.wide * 0.4;
      e.gaze.scale.setScalar(big);
      e.pupil.scale.setScalar(small);
      e.pupil.position.x = 0.127 - 0.052 * small;
      e.spark.visible = lid < 0.9;
      // Die Braue kippt das Lid: hoch und schräg heißt „hä?“, tief zum Schnabel heißt „na warte“.
      // Asymmetrie macht das Gesicht frech: Eine Braue steht höher, das andere Auge ist etwas zugekniffen.
      const isNear = e.side === nearEye, b = p.brow + (isNear ? p.cock : -p.cock * 0.7), l = clamp01(lid + (isNear ? -p.cock * 0.12 : p.cock * 0.22) * (1 - p.wide));
      e.lids.rotation.x = e.side * b * 0.4;
      e.lids.scale.setScalar(big);
      e.upper.rotation.z = mix(0.72, -0.3, l);
      e.low.rotation.z = mix(-0.92, -0.26, smooth(0.5, 1, l));
      e.brow.position.y = 0.127 + Math.max(0, b) * 0.05 - l * 0.018;
      e.brow.position.x = 0.015 + l * 0.05;
      e.brow.rotation.x = e.side * b * 0.3;
    }
    crestV += ((p.crest * 1.05 - crestA) * 130 - crestV * 9) * h; crestA += crestV * h;
    crest.rotation.z = -0.1 - crestA;
    // Die Brille gleitet zwischen Stirn, Augen und Schnabel. Beim Kopfschütteln wackelt sie mit.
    const sh = Math.max(0, Math.min(2, p.shades)), a1 = Math.min(1, sh), a2 = Math.max(0, sh - 1);
    shades.position.set(mix(mix(0.1, 0.262, a1), 0.31, a2), mix(mix(0.3, 0.118, a1), 0.006, a2), 0);
    shadeV += ((p.headYaw - shadeY) * 220 - shadeV * 14) * h; shadeY += shadeV * h;
    shades.rotation.set((p.headYaw - shadeY) * 0.4 + p.shadeTilt, 0, mix(mix(0.95, 0, a1), -0.14, a2));
    shades.scale.z = mix(0.6, 1, a1);

    const nearWing = Math.abs(p.yaw) < Math.PI / 2 ? 1 : -1;
    for (const w of wings) {
      const fw = clamp01(fold * (1 - (w.side === nearWing ? p.gesture : 0))), op = 1 - fw, s = 1 - FOLD_IN * fw;
      w.holder.position.set(0.2 - 0.02 * fw, 0.2 + p.puff * 0.024, w.side * (0.2 + 0.12 * fw + p.puff * 0.035));
      w.base.rotation.set(0, -0.12 * fw, -0.14 * fw);
      w.shoulder.rotation.set(1.42 * fw - (0.14 + f * 0.85) * op, p.sweep * op, 0);
      w.elbow.position.set(-0.1 * fw, 0, ARM * s);
      w.elbow.rotation.x = -(f2 * 0.55 - 0.1) * op;
      w.wrist.position.set(-0.22 * fw, 0, FORE * s);
      w.wrist.rotation.x = -(f3 * 0.7 - 0.05) * op;
      for (const e of w.parts) { e.q.position.z = e.z * s; e.q.rotation.y = mix(e.open, e.folded, fw) - e.fan * f * 0.09 * op; }
      for (const b of w.bulk) { b.m.position.z = b.z * s; b.m.scale.set(mix(0.1, 0.07, fw), b.h * mix(1, 0.75, fw), Math.max(0.1, b.r * s)); }
    }
    // Der Schwanz schwingt nach und wedelt beim Watscheln mit.
    tailV += ((-p.pitch * 0.5 + f * 0.07 - p.tailUp * 0.95 - tailA) * 150 - tailV * 13) * h; tailA += tailV * h;
    tail.rotation.set(0, Math.sin(stride) * 0.24 * p.walk, tailA);
    for (const l of legs) {
      const swing = Math.sin(stride + l.side * 1.57), lift = Math.max(0, Math.cos(stride + l.side * 1.57));
      l.leg.position.set(-0.03, -0.32 + lift * 0.055 * p.walk, l.side * 0.13);
      l.leg.rotation.z = -p.pitch * (1 - p.tuck) - p.tuck * 1.5 + swing * 0.5 * p.walk;
      l.leg.scale.setScalar(1 - 0.18 * p.tuck);
      l.foot.rotation.z = p.tuck * 0.95 - swing * 0.45 * p.walk + lift * 0.3 * p.walk;
    }
  }
  function place(x, y) {
    root.position.set((x - cx) * depth / focal, -(y - cy) * depth / focal + bob * size * depth / focal, -depth);
    root.scale.setScalar(size * depth / focal);
  }
  // Beim Treffer fliegt die Brille davon, dreht sich und bleibt kurz auf der Terrasse liegen.
  const fly = { on: false, x: 0, y: 0, vx: 0, vy: 0, a: 0, va: 0, life: 0, lay: 0 };
  function fling(x, y, vx, vy) { Object.assign(fly, { on: true, x, y, vx, vy, a: 0, va: (vx >= 0 ? 1 : -1) * 15, life: 6, lay: 0 }); flyer.visible = shadesOn; shades.visible = false; }
  function stepFlyer(dt, floor) {
    if (!fly.on) return;
    fly.life -= dt; fly.vy += 1800 * dt; fly.x += fly.vx * dt; fly.y += fly.vy * dt; fly.a += fly.va * dt;
    if (fly.y > floor && fly.vy > 0) { fly.y = floor; fly.vy *= -0.42; fly.vx *= 0.62; fly.va *= 0.5; if (Math.abs(fly.vy) < 70) { fly.vy = 0; fly.va = 0; fly.vx *= 0.86; fly.lay = Math.min(1, fly.lay + dt * 8); } }
    const k = depth / focal;
    flyer.position.set((fly.x - cx) * k, -(fly.y - cy) * k, -depth);
    flyer.rotation.set(mix(fly.a * 0.35, 0.1, fly.lay), mix(fly.a, -1.36, fly.lay), mix(fly.a * 0.7, 0.14, fly.lay));
    flyer.scale.setScalar(size * 1.05 * k * Math.min(1, fly.life / 0.35));
    if (fly.life <= 0) { fly.on = false; flyer.visible = false; }
  }
  let shadesOn = true;
  function setShades(on) { shadesOn = on; shades.visible = on; if (!on) { flyer.visible = false; fly.on = false; } }
  function hideFlyer() { fly.on = false; flyer.visible = false; }
  // Ein Treffer kostet sie Schwanzfedern. Bis zum nächsten Auftritt sieht man ihr das an.
  function pluck(on) { tailFeathers.forEach((m, i) => { m.visible = !on || i === 0 || i === 3; }); }
  function reset(over = {}) { Object.assign(pose, DEFAULTS, over); pluck(false); shades.visible = shadesOn; }
  return { root, pose, update, place, reset, pluck, flyer, fling, stepFlyer, setShades, hideFlyer, setSize(v) { size = v; }, get bobPx() { return bob * size; } };
}
