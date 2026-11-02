// Der Werbeflieger: ein kleiner Doppeldecker, unsere Möwe sitzt mit Brille und Schal am Steuer.
// Alles wird beim Laden im Browser gezeichnet. Oben im Bild liegt das Banner, darunter zwei Phasen des Flugzeugs: Propeller und Schal bewegen sich.
const INK = '#00343a', CREAM = '#fff4df', PINK = '#e8437f', PLUM = '#b5235f', SUN = '#ffc91f', SEA = '#0a7fa8', DARK = '#1d2229';

function ball(x, cx, cy, r) {
  x.save();
  x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.clip();
  x.fillStyle = CREAM; x.fillRect(cx - r, cy - r, r * 2, r * 2);
  x.fillStyle = SEA; x.beginPath(); x.ellipse(cx - r * 0.42, cy + r * 0.42, r * 0.55, r * 0.95, 0.5, 0, Math.PI * 2); x.fill();
  x.fillStyle = PINK; x.beginPath(); x.ellipse(cx + r * 0.62, cy + r * 0.05, r * 0.5, r * 0.9, -0.25, 0, Math.PI * 2); x.fill();
  x.fillStyle = SUN; x.beginPath(); x.ellipse(cx - r * 0.1, cy - r * 0.62, r * 0.95, r * 0.42, -0.2, 0, Math.PI * 2); x.fill();
  x.restore();
  x.strokeStyle = 'rgba(0, 52, 58, .75)'; x.lineWidth = Math.max(2, r * 0.09);
  x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.stroke();
}

function banner(x, text) {
  const W = 1024, H = 132, top = 6, bot = 126;
  x.save();
  // Das Tuch endet wie ein Wimpel im Schwalbenschwanz.
  x.beginPath();
  x.moveTo(8, top); x.lineTo(W - 4, top); x.lineTo(W - 56, H / 2); x.lineTo(W - 4, bot); x.lineTo(8, bot); x.closePath();
  const g = x.createLinearGradient(0, top, 0, bot);
  g.addColorStop(0, '#fffaf0'); g.addColorStop(0.55, CREAM); g.addColorStop(1, '#f3dfc2');
  x.fillStyle = g; x.fill();
  x.clip();
  // Saum oben und unten, dazu eine feine gelbe Linie und eine Naht.
  x.fillStyle = PINK; x.fillRect(0, top, W, 12); x.fillRect(0, bot - 12, W, 12);
  x.fillStyle = SUN; x.fillRect(0, top + 12, W, 4); x.fillRect(0, bot - 16, W, 4);
  x.strokeStyle = 'rgba(255, 255, 255, .75)'; x.lineWidth = 1.6; x.setLineDash([9, 7]);
  x.beginPath(); x.moveTo(0, top + 6); x.lineTo(W, top + 6); x.moveTo(0, bot - 6); x.lineTo(W, bot - 6); x.stroke();
  x.setLineDash([]);
  // Stoff hat Falten.
  for (let i = 40; i < W; i += 74) {
    const f = x.createLinearGradient(i, 0, i + 46, 0);
    f.addColorStop(0, 'rgba(120, 80, 40, 0)'); f.addColorStop(0.5, 'rgba(120, 80, 40, .1)'); f.addColorStop(1, 'rgba(120, 80, 40, 0)');
    x.fillStyle = f; x.fillRect(i, top, 46, bot - top);
  }
  ball(x, 66, H / 2, 33);
  x.font = '400 74px Shrikhand, Georgia, serif'; x.textAlign = 'left'; x.textBaseline = 'middle';
  x.fillStyle = PINK; x.fillText(text, 115, H / 2 + 7, 838);
  x.fillStyle = INK; x.fillText(text, 112, H / 2 + 3, 838);
  x.restore();
  // Vorn hält ihn eine Stange mit zwei Gewichten, damit er aufrecht fliegt.
  x.fillStyle = '#26363f'; x.fillRect(0, 0, 9, H);
  x.fillStyle = DARK; x.beginPath(); x.arc(4.5, 4, 5, 0, Math.PI * 2); x.arc(4.5, H - 4, 6, 0, Math.PI * 2); x.fill();
}

function plane(x, frame) {
  const scarfPhase = frame ? 1.6 : 0;
  // Hinteres Rad und Sporn
  x.fillStyle = '#3a3f47'; x.beginPath(); x.arc(216, 228, 13, 0, Math.PI * 2); x.fill();
  x.strokeStyle = '#4a4f57'; x.lineWidth = 4; x.beginPath(); x.moveTo(436, 148); x.lineTo(452, 176); x.stroke();
  // Leitwerk: blau mit cremefarbenem Streifen und pinker Spitze, wie der Ball
  x.beginPath(); x.moveTo(404, 122); x.bezierCurveTo(420, 88, 434, 44, 462, 36); x.bezierCurveTo(486, 32, 494, 50, 488, 70); x.lineTo(474, 128); x.closePath();
  const fin = x.createLinearGradient(420, 40, 480, 130); fin.addColorStop(0, '#2aa3cc'); fin.addColorStop(1, SEA);
  x.fillStyle = fin; x.fill();
  x.save(); x.clip();
  x.fillStyle = CREAM; x.fillRect(404, 72, 100, 15);
  x.fillStyle = PINK; x.fillRect(404, 26, 100, 22);
  x.restore();
  x.fillStyle = '#075f7e'; x.beginPath(); x.ellipse(446, 130, 46, 9, -0.05, 0, Math.PI * 2); x.fill();
  // Der Rumpf, rund und etwas zu dick, damit er freundlich wirkt
  x.save();
  x.beginPath(); x.moveTo(84, 128); x.bezierCurveTo(92, 84, 170, 72, 244, 76); x.bezierCurveTo(330, 82, 424, 106, 474, 124); x.bezierCurveTo(440, 148, 340, 172, 244, 178); x.bezierCurveTo(170, 182, 96, 174, 84, 128); x.closePath();
  const body = x.createLinearGradient(0, 74, 0, 180); body.addColorStop(0, '#ffe878'); body.addColorStop(0.5, SUN); body.addColorStop(1, '#e2860a');
  x.fillStyle = body; x.fill();
  x.clip();
  // Streifen längs, Blechkanten und Nieten
  x.fillStyle = PINK; x.beginPath(); x.moveTo(70, 124); x.bezierCurveTo(200, 134, 340, 132, 490, 118); x.lineTo(490, 134); x.bezierCurveTo(340, 150, 200, 152, 70, 142); x.closePath(); x.fill();
  x.fillStyle = CREAM; x.beginPath(); x.moveTo(70, 142); x.bezierCurveTo(200, 152, 340, 150, 490, 134); x.lineTo(490, 139); x.bezierCurveTo(340, 156, 200, 158, 70, 147); x.closePath(); x.fill();
  x.strokeStyle = 'rgba(120, 60, 0, .35)'; x.lineWidth = 2;
  for (const px of [176, 320, 392]) { x.beginPath(); x.moveTo(px, 60); x.quadraticCurveTo(px + 6, 120, px, 190); x.stroke(); }
  x.fillStyle = 'rgba(120, 60, 0, .4)';
  for (let px = 190; px < 400; px += 16) { x.beginPath(); x.arc(px, 108 + (px - 190) * 0.03, 1.8, 0, Math.PI * 2); x.fill(); }
  x.fillStyle = 'rgba(255, 255, 255, .42)'; x.beginPath(); x.ellipse(230, 92, 92, 9, 0.02, 0, Math.PI * 2); x.fill();
  // Motorhaube mit Lüftungsschlitzen
  x.fillStyle = PINK; x.fillRect(60, 60, 66, 130);
  x.fillStyle = PLUM; x.fillRect(122, 60, 7, 130);
  x.strokeStyle = 'rgba(90, 0, 40, .5)'; x.lineWidth = 3;
  for (const ly of [104, 116, 150, 162]) { x.beginPath(); x.moveTo(96, ly); x.lineTo(118, ly); x.stroke(); }
  x.restore();

  // Der Schal weht im Fahrtwind nach hinten.
  x.save();
  const scarf = (o, w) => { x.beginPath(); for (let i = 0; i <= 22; i++) { const t = i / 22, sx = 310 + t * 118, sy = 78 + o + Math.sin(t * 7 + scarfPhase) * (3 + t * 11) - t * 6; if (i) x.lineTo(sx, sy - w * (1 - t * 0.35)); else x.moveTo(sx, sy - w); } for (let i = 22; i >= 0; i--) { const t = i / 22, sx = 310 + t * 118, sy = 78 + o + Math.sin(t * 7 + scarfPhase) * (3 + t * 11) - t * 6; x.lineTo(sx, sy + w * (1 - t * 0.35)); } x.closePath(); };
  scarf(0, 9); x.fillStyle = PINK; x.fill();
  scarf(0, 3); x.fillStyle = CREAM; x.fill();
  x.restore();

  // Die Pilotin: dieselbe Möwe wie auf der Terrasse. Kopf, Tolle, großer Schnabel, pinke Brille.
  const face = x.createRadialGradient(278, 44, 4, 288, 56, 34); face.addColorStop(0, '#ffffff'); face.addColorStop(1, '#e6dccb');
  x.fillStyle = '#efe7d6'; x.beginPath(); x.ellipse(298, 80, 26, 16, 0, 0, Math.PI * 2); x.fill();
  x.fillStyle = face; x.beginPath(); x.arc(288, 54, 30, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#f3ecdd';
  for (const [tx, ty, a] of [[300, 24, 0.5], [290, 20, 0.12], [278, 21, -0.28]]) { x.save(); x.translate(tx, ty); x.rotate(a); x.beginPath(); x.ellipse(5, -10, 6, 15, 0.1, 0, Math.PI * 2); x.fill(); x.restore(); }
  x.fillStyle = '#ffbf1a'; x.beginPath(); x.moveTo(266, 44); x.bezierCurveTo(240, 42, 214, 52, 212, 66); x.bezierCurveTo(226, 64, 252, 68, 268, 68); x.closePath(); x.fill();
  x.fillStyle = '#f0861c'; x.beginPath(); x.moveTo(268, 66); x.bezierCurveTo(250, 68, 232, 68, 222, 70); x.bezierCurveTo(234, 80, 258, 80, 270, 74); x.closePath(); x.fill();
  x.fillStyle = '#e03024'; x.beginPath(); x.arc(238, 72, 4, 0, Math.PI * 2); x.fill();
  // Frech grinsender Mundwinkel
  x.strokeStyle = '#b5661a'; x.lineWidth = 2.4; x.lineCap = 'round'; x.beginPath(); x.moveTo(216, 67); x.quadraticCurveTo(250, 68, 276, 60); x.stroke();
  x.strokeStyle = PINK; x.lineWidth = 5; x.beginPath(); x.moveTo(284, 40); x.lineTo(316, 36); x.stroke();
  x.fillStyle = PINK; x.beginPath(); x.ellipse(270, 42, 17, 13.5, -0.1, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#14171d'; x.beginPath(); x.ellipse(270, 42, 13.5, 10.5, -0.1, 0, Math.PI * 2); x.fill();
  x.fillStyle = 'rgba(255, 255, 255, .85)'; x.beginPath(); x.ellipse(265, 38, 4.2, 2.4, -0.5, 0, Math.PI * 2); x.fill();
  x.strokeStyle = '#3a4a5e'; x.lineWidth = 5.5; x.beginPath(); x.moveTo(256, 25); x.quadraticCurveTo(272, 15, 288, 22); x.stroke();

  // Cockpit: Rand über dem Hals, davor eine kleine Scheibe
  x.fillStyle = '#7d4a12'; x.beginPath(); x.ellipse(290, 86, 46, 8, 0.05, 0, Math.PI * 2); x.fill();
  x.fillStyle = 'rgba(200, 240, 255, .5)'; x.beginPath(); x.moveTo(236, 80); x.lineTo(244, 50); x.lineTo(258, 56); x.lineTo(258, 82); x.closePath(); x.fill();
  x.strokeStyle = 'rgba(255, 255, 255, .85)'; x.lineWidth = 2; x.stroke();

  // Fahrwerk
  x.strokeStyle = '#4a4f57'; x.lineWidth = 6; x.beginPath(); x.moveTo(190, 172); x.lineTo(176, 222); x.moveTo(146, 170); x.lineTo(176, 222); x.stroke();
  x.fillStyle = '#23272e'; x.beginPath(); x.arc(176, 228, 20, 0, Math.PI * 2); x.fill();
  x.fillStyle = CREAM; x.beginPath(); x.arc(176, 228, 8, 0, Math.PI * 2); x.fill();
  x.fillStyle = PINK; x.beginPath(); x.arc(176, 228, 3.5, 0, Math.PI * 2); x.fill();

  // Tragflächen mit Streben: unten vor dem Rumpf, oben vor dem Kopf
  x.strokeStyle = '#6a4a2a'; x.lineWidth = 5;
  for (const [a, b] of [[138, 150], [204, 212]]) { x.beginPath(); x.moveTo(a, 30); x.lineTo(b, 176); x.stroke(); }
  x.strokeStyle = 'rgba(40, 40, 50, .6)'; x.lineWidth = 1.6; x.beginPath(); x.moveTo(140, 34); x.lineTo(212, 176); x.moveTo(204, 34); x.lineTo(150, 176); x.stroke();
  const wing = (y, h, l, r, top, low) => { const g = x.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, top); g.addColorStop(1, low); x.fillStyle = g; x.beginPath(); x.moveTo(l + 12, y); x.lineTo(r - 18, y); x.quadraticCurveTo(r + 6, y + h / 2, r - 18, y + h); x.lineTo(l + 12, y + h); x.quadraticCurveTo(l - 8, y + h / 2, l + 12, y); x.closePath(); x.fill(); };
  wing(14, 22, 112, 240, '#ff7aa8', PLUM);
  x.fillStyle = 'rgba(255, 255, 255, .55)'; x.fillRect(128, 18, 90, 3.4);
  wing(168, 20, 122, 248, PINK, '#8f1747');
  // Propeller: Der helle Kreis ist das schnelle Drehen, das Blatt sitzt in jeder Phase anders.
  x.fillStyle = 'rgba(235, 244, 250, .42)'; x.beginPath(); x.ellipse(60, 128, 9, 68, 0, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#39302a';
  if (frame) x.fillRect(57, 104, 6, 48); else x.fillRect(57, 64, 6, 128);
  x.fillStyle = CREAM; x.beginPath(); x.ellipse(70, 128, 15, 17, 0, 0, Math.PI * 2); x.fill();
  x.fillStyle = PINK; x.beginPath(); x.arc(64, 128, 5, 0, Math.PI * 2); x.fill();
}

// Atlas 1024 x 512: Banner oben (Höhe 132), die beiden Flugzeug-Phasen ab Zeile 160, je 512 x 256.
export function planeAtlas(text) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 512;
  const x = c.getContext('2d');
  banner(x, text);
  [0, 1].forEach((f) => { x.save(); x.beginPath(); x.rect(f * 512, 160, 512, 256); x.clip(); x.translate(f * 512, 160); plane(x, f); x.restore(); });
  return c;
}
