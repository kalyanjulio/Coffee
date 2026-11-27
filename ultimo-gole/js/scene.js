/* The farmhouse bedroom, seen from the bed, shot like a worn film print.
   Everything is a function of scroll progress p (0..1), except breathing sway,
   film wear and the final lunge, which run on the clock.
   Three movements: the farm on 16mm (window, split screen, doorway),
   the tape (she rises), and the smile that holds too long. */
(() => {
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const span = (p, a, b) => clamp((p - a) / (b - a));
  const smooth = t => t * t * (3 - 2 * t);
  const lerp = (a, b, t) => a + (b - a) * t;

  const VW = 1600, VH = 1000, EYE = 430;
  const DOOR = { l: 668, r: 932, t: 205, b: 770 };
  const C = { mist: '#a8dadc', navy: '#1d3557', paper: '#f1faee', beige: '#eadfc4', blue: '#457b9d', red: '#e63946', blood: '#a81f30' };

  function poly(g, pts, fill) {
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
    g.fillStyle = fill; g.fill();
  }
  function grad(g, x0, y0, x1, y1, stops) {
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    stops.forEach(([o, c]) => gr.addColorStop(o, c));
    return gr;
  }
  function glow(g, x, y, r, color) {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, color); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function dot(g, x, y, rx, ry, fill) { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fillStyle = fill; g.fill(); }
  /* A limb as one smoothly tapering shape, optionally swollen at the joints. */
  function limb(g, pts, w0, w1, color, knuckle = 0) {
    const lens = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
    const total = lens.reduce((a, b) => a + b, 0) || 1;
    let done = 0;
    g.beginPath();
    for (let i = 0; i < lens.length; i++) {
      const steps = Math.max(1, Math.ceil(lens[i] / 1.5));
      for (let k = 0; k <= steps; k++) {
        const u = k / steps;
        const joint = knuckle * Math.pow(Math.abs(Math.cos(u * Math.PI)), 10);
        const rad = Math.max(.4, lerp(w0, w1, (done + lens[i] * u) / total) / 2 * (1 + joint));
        const x = lerp(pts[i][0], pts[i + 1][0], u), y = lerp(pts[i][1], pts[i + 1][1], u);
        g.moveTo(x + rad, y); g.arc(x, y, rad, 0, Math.PI * 2);
      }
      done += lens[i];
    }
    g.fillStyle = color; g.fill();
  }

  /* A black leather glove. (x, y) is the wrist; fingers point towards angle 0 = up. */
  function glove(g, x, y, angle, s) {
    g.save(); g.translate(x, y); g.rotate(angle); g.scale(s, s);
    limb(g, [[0, 330], [0, 20]], 150, 96, '#070706');
    dot(g, 0, -32, 70, 84, '#0b0b09');
    const fingers = [[-48, -72, -84, -170, -92, -232], [-17, -96, -30, -214, -28, -290], [18, -96, 24, -216, 34, -288], [50, -76, 74, -166, 92, -222]];
    for (const [ax, ay, bx, by, cx, cy] of fingers) {
      limb(g, [[ax, ay], [bx, by], [cx, cy]], 40, 27, '#0b0b09', .08);
      limb(g, [[ax - 5, ay - 4], [bx - 6, by], [cx - 4, cy + 6]], 7, 3, 'rgba(190,185,160,.32)');
    }
    limb(g, [[48, -8], [112, -62], [132, -124]], 48, 28, '#0b0b09', .08);
    limb(g, [[56, -22], [108, -68], [124, -116]], 8, 3, 'rgba(190,185,160,.28)');
    g.strokeStyle = 'rgba(190,185,160,.2)'; g.lineWidth = 3;
    for (const sx of [-30, 0, 30]) { g.beginPath(); g.moveTo(sx, -62); g.lineTo(sx * .6, 6); g.stroke(); }
    g.beginPath(); g.moveTo(-50, 34); g.quadraticCurveTo(0, 48, 50, 34); g.stroke();
    g.restore();
  }

  /* Dona Cida at a distance: nightgown, white bun, red ribbon, enamel pot, that grin.
     Drawn standing; (x, y) is between her feet. */
  function woman(g, x, y, { tilt = 0, sway = 0, grin = 1, gown = '#8f8d77', pot = true, scale = 1 } = {}) {
    g.save(); g.translate(x, y); g.scale(scale, scale);
    const skin = '#4a3f30';
    limb(g, [[-22, -130], [-24, 0]], 17, 11, skin); limb(g, [[22, -130], [27, 0]], 17, 11, skin);
    g.beginPath();
    g.moveTo(-30, -430 + sway);
    g.bezierCurveTo(-72, -330, -66, -200, -88, -92);
    g.quadraticCurveTo(-40, -74, -4, -94); g.quadraticCurveTo(40, -70, 90, -96);
    g.bezierCurveTo(66, -200, 70, -330, 30, -430 + sway);
    g.closePath();
    g.fillStyle = grad(g, -90, 0, 90, 0, [[0, '#101008'], [.5, gown], [1, '#0b0b06']]); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 3;
    for (const fx of [-34, -6, 28]) { g.beginPath(); g.moveTo(fx * .5, -330); g.quadraticCurveTo(fx, -220, fx * 1.5, -96); g.stroke(); }
    // one arm hangs too low, the other holds the pot out to you
    limb(g, [[-34, -418 + sway], [-70, -300], [-68 - sway, -178]], 26, 11, gown);
    limb(g, [[-68 - sway, -178], [-72 - sway, -140]], 10, 8, skin);
    for (let i = 0; i < 4; i++) limb(g, [[-72 - sway, -140], [-83 - sway + i * 8, -102 - (i % 2) * 8]], 4.5, 1.5, skin);
    limb(g, [[34, -416 + sway], [74, -332], [34, -300 + sway]], 26, 12, gown);
    if (pot) {
      g.save(); g.translate(14, -300 + sway);
      poly(g, [[-26, -34], [24, -34], [32, 34], [-32, 34]], C.red);
      poly(g, [[-26, -34], [-56, -50], [-50, -34], [-30, -4]], C.red);
      g.strokeStyle = C.red; g.lineWidth = 8; g.beginPath(); g.arc(28, -2, 18, -1.4, 1.5); g.stroke();
      g.fillStyle = '#4a0c14'; g.fillRect(-30, -42, 58, 9); dot(g, -1, -47, 7, 6, '#4a0c14');
      g.fillStyle = 'rgba(241,250,238,.35)'; g.fillRect(-19, -26, 5, 50);
      g.strokeStyle = 'rgba(241,250,238,.22)'; g.lineWidth = 4;
      g.beginPath(); g.moveTo(-54, -58); g.bezierCurveTo(-78, -84, -42, -100, -62, -132 - sway * 3); g.stroke();
      g.restore();
    }
    dot(g, 22, -308 + sway, 11, 9, skin);
    limb(g, [[0, -432 + sway], [5, -452 + sway]], 22, 20, skin);
    g.translate(6, -486 + sway); g.rotate(tilt);
    dot(g, 0, -4, 47, 52, '#8d8a76');                       // hair
    dot(g, 0, -58, 22, 19, '#8d8a76');
    dot(g, -12, -49, 12, 8, C.red); dot(g, 12, -49, 12, 8, C.red); dot(g, 0, -49, 5, 5, '#7a1220');
    dot(g, 0, 5, 32, 42, skin);
    for (const ex of [-12, 13]) { dot(g, ex, -6, 8, 7, '#0c0a06'); glow(g, ex, -6, 9, 'rgba(241,250,238,.5)'); dot(g, ex, -6, 2, 2, C.paper); }
    if (grin > 0) {
      g.globalAlpha *= grin;
      g.beginPath(); g.moveTo(-22, 13); g.quadraticCurveTo(0, 22, 22, 13); g.quadraticCurveTo(14, 38, 0, 38); g.quadraticCurveTo(-14, 38, -22, 13); g.closePath();
      g.fillStyle = '#f1faee'; g.fill(); g.strokeStyle = '#7a1220'; g.lineWidth = 3; g.stroke();
      g.strokeStyle = '#2a1a10'; g.lineWidth = 1;
      for (let tx = -14; tx <= 14; tx += 7) { g.beginPath(); g.moveTo(tx, 18); g.lineTo(tx, 34); g.stroke(); }
      g.beginPath(); g.moveTo(-18, 22); g.quadraticCurveTo(0, 31, 18, 22); g.stroke();
    }
    g.restore();
  }

  /* The coffee field outside, with the barn. Used by the window and by the split screen. */
  function field(g, x, y, w, h) {
    g.fillStyle = grad(g, 0, y, 0, y + h, [[0, '#0d1a30'], [.62, '#457b9d'], [1, '#0b1424']]); g.fillRect(x, y, w, h);
    glow(g, x + w * .76, y + h * .2, w * .4, 'rgba(241,250,238,.28)');
    dot(g, x + w * .76, y + h * .2, w * .075, w * .075, '#f1faee');
    poly(g, [[x, y + h * .6], [x + w * .3, y + h * .52], [x + w * .64, y + h * .6], [x + w, y + h * .53], [x + w, y + h], [x, y + h]], '#1d3557');
    const bx = x + w * .08, by = y + h * .6;
    poly(g, [[bx, by], [bx, by - h * .1], [bx + w * .11, by - h * .17], [bx + w * .22, by - h * .1], [bx + w * .22, by]], '#070d19');
    for (let r = 0; r < 4; r++) {
      const ry = y + h * (.66 + r * .1), size = w * (.018 + r * .008);
      for (let i = 0; i <= 12; i++) dot(g, x + (i + (r % 2) * .5) * w / 12, ry + Math.sin(i * 2.3 + r) * 3, size * 1.5, size, r % 2 ? '#0b1528' : '#12213c');
    }
  }

  function room(g, light, winX, outside) {
    g.fillStyle = '#050912'; g.fillRect(-400, -400, VW + 800, VH + 800);
    // back wall, with faded wallpaper
    g.fillStyle = grad(g, 0, 80, 0, DOOR.b, [[0, '#132542'], [1, '#2a4a70']]);
    g.fillRect(250, 90, 1100, DOOR.b - 90);
    g.fillStyle = 'rgba(168,218,220,.07)';
    for (let x = 282; x < 1340; x += 58) g.fillRect(x, 90, 14, DOOR.b - 90);
    // side walls, ceiling, plank floor
    poly(g, [[250, 90], [-400, -260], [-400, 1250], [250, DOOR.b]], '#14233f');
    poly(g, [[1350, 90], [2000, -260], [2000, 1250], [1350, DOOR.b]], '#0f1c33');
    poly(g, [[250, 90], [1350, 90], [2000, -260], [-400, -260]], '#070d19');
    poly(g, [[250, DOOR.b], [1350, DOOR.b], [2000, 1250], [-400, 1250]], grad(g, 0, DOOR.b, 0, 1100, [[0, '#2c1a24'], [1, '#09060c']]));
    g.strokeStyle = 'rgba(168,218,220,.1)'; g.lineWidth = 2;
    for (let i = -8; i <= 8; i++) { g.beginPath(); g.moveTo(800 + i * 72, DOOR.b); g.lineTo(800 + i * 260, 1250); g.stroke(); }
    g.beginPath(); g.moveTo(250, 90); g.lineTo(250, DOOR.b); g.lineTo(1350, DOOR.b); g.lineTo(1350, 90); g.stroke();
    // window onto the coffee field
    const wy = 230, ww = 170, wh = 270;
    g.save(); g.beginPath(); g.rect(winX, wy, ww, wh); g.clip();
    field(g, winX, wy, ww, wh);
    if (outside) woman(g, winX + outside.x * ww, wy + outside.y * wh, { scale: outside.scale, gown: '#cbc6a4', pot: false, tilt: .12 });
    g.restore();
    g.strokeStyle = '#6a1b28'; g.lineWidth = 11; g.strokeRect(winX, wy, ww, wh);
    g.lineWidth = 6; g.beginPath(); g.moveTo(winX + ww / 2, wy); g.lineTo(winX + ww / 2, wy + wh); g.moveTo(winX, wy + wh / 2); g.lineTo(winX + ww, wy + wh / 2); g.stroke();
    for (const dir of [-1, 1]) {                                 // curtains
      const cx = dir < 0 ? winX - 6 : winX + ww + 6;
      poly(g, [[cx + dir * 34, wy - 22], [cx - dir * 22, wy - 22], [cx - dir * 4, wy + 150], [cx - dir * 20, wy + wh + 34], [cx + dir * 36, wy + wh + 28]], '#a81f30');
    }
    glow(g, winX + 85, wy + 130, 300, 'rgba(120,175,200,.14)');
    poly(g, [[winX - 20, 800], [winX + 190, 800], [winX + 260, 960], [winX - 80, 960]], 'rgba(168,218,220,.08)');
    // a framed portrait, slightly crooked, of someone smiling
    g.save(); g.translate(1100, 330); g.rotate(.07);
    g.fillStyle = '#6a1b28'; g.fillRect(-70, -90, 140, 180);
    g.fillStyle = '#8a8570'; g.fillRect(-56, -76, 112, 152);
    dot(g, 0, 62, 44, 40, '#101828'); dot(g, 0, -20, 27, 30, '#1d2335'); dot(g, 0, -12, 18, 24, '#c9b8a0');
    for (const ex of [-7, 7]) dot(g, ex, -17, 2, 2, '#0b1424');
    g.strokeStyle = '#f1faee'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(-10, -4); g.quadraticCurveTo(0, 6, 10, -4); g.stroke();
    g.restore();
    if (light > 0) glow(g, 800, 640, 560, `rgba(234,223,196,${.13 * light})`);
  }

  function doorway(g, s) {
    const { l, r, t, b } = DOOR;
    g.save(); g.beginPath(); g.rect(l, t, r - l, b - t); g.clip();
    g.fillStyle = '#000'; g.fillRect(l, t, r - l, b - t);
    g.globalAlpha = s.hall;
    g.fillStyle = grad(g, 0, t, 0, b, [[0, '#4a1620'], [.55, '#d9786a'], [1, '#33101a']]);
    g.fillRect(l, t, r - l, b - t);
    poly(g, [[l, t], [l + 70, t + 70], [l + 70, b - 90], [l, b]], 'rgba(0,0,0,.45)');
    poly(g, [[r, t], [r - 70, t + 70], [r - 70, b - 90], [r, b]], 'rgba(0,0,0,.55)');
    glow(g, 795, 360, 210, 'rgba(255,230,205,.52)');
    g.globalAlpha = 1;
    if (s.figure > 0) {
      g.globalAlpha = s.figure;
      woman(g, 800, b - 8 + s.step * 42, { scale: .88 + s.step * .17, tilt: s.tilt, sway: s.sway, gown: '#a39f84' });
    }
    g.restore();
  }

  function doorPanel(g, open, hall) {
    const { l, r, t, b } = DOOR;
    const a = open * 1.85;                       // radians, swinging into the room
    const w = r - l;
    const fx = l + w * Math.cos(a);
    const s = 1 + .30 * Math.sin(Math.min(a, Math.PI / 2));
    const ft = EYE + (t - EYE) * s, fb = EYE + (b - EYE) * s;
    const shade = Math.cos(a) > 0 ? 1 : .6;
    poly(g, [[l, t], [fx, ft], [fx, fb], [l, b]], `rgb(${112 * shade},${27 * shade},${40 * shade})`);
    const at = (u, v) => { const x = lerp(l, fx, u), top = lerp(t, ft, u), bot = lerp(b, fb, u); return [x, lerp(top, bot, v)]; };
    g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 5;
    for (const [v0, v1] of [[.07, .42], [.50, .92]]) {
      g.beginPath();
      [[.14, v0], [.86, v0], [.86, v1], [.14, v1]].forEach(([u, v], i) => (i ? g.lineTo(...at(u, v)) : g.moveTo(...at(u, v))));
      g.closePath(); g.stroke();
    }
    const [kx, ky] = at(.88, .52);
    dot(g, kx, ky, 7, 7, '#d8c690');
    if (hall > 0 && open > .01) { g.strokeStyle = `rgba(255,214,196,${.5 * hall})`; g.lineWidth = 3; g.beginPath(); g.moveTo(fx, ft); g.lineTo(fx, fb); g.stroke(); }
  }

  function frame(g, hall, open) {
    const { l, r, t, b } = DOOR;
    g.strokeStyle = '#4a101c'; g.lineWidth = 18;
    g.beginPath(); g.moveTo(l - 9, b); g.lineTo(l - 9, t - 9); g.lineTo(r + 9, t - 9); g.lineTo(r + 9, b); g.stroke();
    // light under the shut door, then spilling across the floor
    if (hall > 0) {
      g.fillStyle = `rgba(255,214,190,${.6 * hall * (1 - open)})`; g.fillRect(l, b - 3, r - l, 4);
      if (open > 0) {
        const w = (r - l) * Math.min(1, open * 1.15);
        poly(g, [[r - w, b], [r, b], [r + 190 * open, 1150], [r - w - 60, 1150]],
          grad(g, 0, b, 0, 1080, [[0, `rgba(240,150,130,${.32 * hall})`], [1, 'rgba(240,150,130,0)']]));
      }
    }
  }

  /* Old fingers with red nails, taking hold of the frame one at a time. */
  function fingers(g, k) {
    if (k <= 0) return;
    const { r } = DOOR;
    const ys = [356, 384, 413, 443];
    const lens = [66, 90, 96, 74];
    ys.forEach((y, i) => {
      const e = smooth(clamp(k * 1.9 - i * .28));
      if (e <= 0) return;
      const x = r - 24, len = lens[i] * e;
      const pts = [[x, y + 14], [x + len * .36, y - 5], [x + len * .70, y + 1], [x + len * .90, y + 15], [x + len, y + 15 + 19 * e]];
      limb(g, pts.map(([px, py]) => [px + 3, py + 8]), 18, 8, 'rgba(0,0,0,.6)');
      limb(g, pts, 18, 9, '#8a6a4c', .22);
      limb(g, pts.map(([px, py]) => [px - 1, py - 3]), 6, 2, 'rgba(235,200,160,.55)', .3);
      const [tx, ty] = pts[4]; limb(g, [[tx - 1, ty - 4], [tx + 2, ty + 13 * e]], 9, 3, '#b3200f');
    });
    // the rest of the hand stays in shadow
    g.save(); g.translate(r - 27, 416); g.scale(.5, 1.25);
    glow(g, 0, 0, 68, 'rgba(0,0,0,.96)');
    g.restore();
  }

  function bed(g, breathe) {
    // iron footboard
    g.fillStyle = '#060b16';
    g.fillRect(190, 790, 1220, 30);
    for (let x = 240; x <= 1360; x += 112) g.fillRect(x, 800, 16, 120);
    for (const x of [190, 1380]) { g.fillRect(x, 755, 30, 200); dot(g, x + 15, 750, 24, 24, '#060b16'); }
    g.fillStyle = 'rgba(168,218,220,.24)'; g.fillRect(214, 790, 1166, 3);
    // patchwork quilt, and your own feet under it
    g.beginPath();
    g.moveTo(-200, 1250); g.lineTo(-200, 960);
    g.bezierCurveTo(200, 890, 420, 900, 590, 885 - breathe);
    g.bezierCurveTo(640, 800 - breathe, 730, 805 - breathe, 758, 893);
    g.bezierCurveTo(780, 915, 820, 915, 842, 893);
    g.bezierCurveTo(872, 805 - breathe, 962, 800 - breathe, 1012, 885 - breathe);
    g.bezierCurveTo(1200, 902, 1420, 890, 1800, 955);
    g.lineTo(1800, 1250); g.closePath();
    g.fillStyle = '#1a2c4c'; g.fill();
    g.save(); g.clip();
    const patches = ['rgba(230,57,70,.24)', 'rgba(241,250,238,.07)', 'rgba(69,123,157,.34)', 'rgba(168,218,220,.14)'];
    for (let row = 0; row < 5; row++) for (let i = 0; i < 18; i++) if ((i + row) % 2 === 0) {
      g.fillStyle = patches[(i * 3 + row) % patches.length]; g.fillRect(-220 + i * 118, 820 + row * 74 - breathe * .4, 118, 74);
    }
    g.fillStyle = grad(g, 0, 820, 0, 1080, [[0, 'rgba(0,0,0,.05)'], [1, 'rgba(0,0,0,.8)']]); g.fillRect(-220, 780, 2060, 480);
    g.restore();
    g.strokeStyle = 'rgba(168,218,220,.22)'; g.lineWidth = 3; g.stroke();
  }

  /* Nightstand with your cup, and the phone still recording. */
  function nightstand(g, t, x) {
    g.save(); g.translate(x - 1100, 0);
    g.fillStyle = '#131c30'; g.fillRect(1100, 640, 150, 160);
    g.fillStyle = '#4a101c'; g.fillRect(1092, 636, 166, 12);
    poly(g, [[1180, 640], [1232, 640], [1244, 618], [1192, 618]], '#0b1424');
    const on = .5 + .5 * Math.sin(t * 3.6);
    glow(g, 1212, 628, 40, `rgba(255,70,40,${.28 * on})`);
    dot(g, 1212, 628, 4, 4, `rgba(255,90,60,${.35 + .65 * on})`);
    g.fillStyle = '#cfe0d8'; g.beginPath(); g.moveTo(1116, 592); g.lineTo(1160, 592); g.lineTo(1156, 636); g.lineTo(1120, 636); g.fill();
    g.strokeStyle = '#cfe0d8'; g.lineWidth = 6; g.beginPath(); g.arc(1164, 612, 12, -1.4, 1.4); g.stroke();
    g.fillStyle = C.red; g.fillRect(1119, 605, 38, 9);
    g.strokeStyle = 'rgba(241,250,238,.25)'; g.lineWidth = 3;
    for (const sx of [1128, 1148]) { g.beginPath(); g.moveTo(sx, 584); g.bezierCurveTo(sx - 12, 568 + Math.sin(t) * 3, sx + 14, 556, sx - 2, 536); g.stroke(); }
    g.restore();
  }

  /* She comes up from behind the footboard. */
  function crawler(g, k, face, t) {
    if (k <= 0 || !face) return;
    const e = smooth(k);
    const y = lerp(1190, 755, e) + Math.sin(t * 1.7) * 4;
    g.save(); g.translate(800, y); g.rotate(lerp(.55, .2, e));
    glow(g, 0, -60, 300, 'rgba(0,0,0,.95)');
    g.globalAlpha = .88; g.drawImage(face, -180, -265, 360, 480);
    g.restore();
  }
  function grip(g, k) {
    const e = smooth(span(k, .35, 1));
    if (e <= 0) return;
    for (const dir of [-1, 1]) {
      const x = 800 + dir * 235;
      for (let i = 0; i < 4; i++) {
        const fx = x + (i - 1.5) * 27;
        const pts = [[x + dir * 25, 880], [fx + dir * 5, 786], [fx, lerp(786, 806, e)], [fx - dir * 6, lerp(790, 852 - Math.abs(i - 1.5) * 12, e)]];
        limb(g, pts, 18, 8, '#6d523b');
        limb(g, pts.slice(1).map(([px, py]) => [px - 2, py - 2]), 4, 1.5, '#b08a66');
        const [tx, ty] = pts[3]; limb(g, [[tx, ty - 6], [tx - dir * 3, ty + 5]], 8, 3, '#b3200f');
      }
    }
  }

  /* The other half of the split screen: outside, walking to your window. */
  function outsidePanel(g, x, y, w, h, k, t, reduced) {
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    field(g, x, y, w, h);
    const s = h / 1000;
    const hx = x + w * .78, hy = y + h * .76;                    // the house, one window lit
    poly(g, [[hx - 150 * s, hy], [hx - 150 * s, hy - 170 * s], [hx, hy - 290 * s], [hx + 150 * s, hy - 170 * s], [hx + 150 * s, hy]], '#060b16');
    glow(g, hx - 55 * s, hy - 90 * s, 150 * s, 'rgba(234,223,196,.42)');
    g.fillStyle = C.beige; g.fillRect(hx - 85 * s, hy - 130 * s, 60 * s, 78 * s);
    g.fillStyle = '#060b16'; g.fillRect(hx - 57 * s, hy - 130 * s, 5 * s, 78 * s); g.fillRect(hx - 85 * s, hy - 93 * s, 60 * s, 5 * s);
    const walk = lerp(.14, .52, k), bob = reduced ? 0 : Math.abs(Math.sin(t * 3.1)) * 7 * s;
    glow(g, x + w * walk, hy - 40 * s, 190 * s, 'rgba(241,250,238,.1)');
    woman(g, x + w * walk, y + h * .9 - bob, { scale: s * lerp(.72, 1, k), gown: '#d6d1ae', tilt: .1, sway: reduced ? 0 : Math.sin(t * 3.1) * 5 });
    g.restore();
  }

  /* Wear on the print: weave is applied by the caller, this adds dust and scratches. */
  function wear(g, gate, t) {
    const { x, y, w, h } = gate;
    const tick = Math.floor(t * 9);
    const rnd = n => { const v = Math.sin(tick * 91.7 + n * 47.3) * 43758.5; return v - Math.floor(v); };
    for (let i = 0; i < 5; i++) dot(g, x + rnd(i) * w, y + rnd(i + 9) * h, 1 + rnd(i + 3) * 2.4, 1 + rnd(i + 5) * 2.4, i % 2 ? 'rgba(241,250,238,.35)' : 'rgba(0,0,0,.6)');
    if (rnd(40) > .55) { g.fillStyle = 'rgba(241,250,238,.12)'; g.fillRect(x + rnd(41) * w, y, 1.2, h); }
  }

  /* Tape look for the moment she rises. */
  function tape(g, gate, t, reduced) {
    const { x, y, w, h } = gate;
    g.fillStyle = 'rgba(0,0,0,.16)';
    for (let ly = y; ly < y + h; ly += 4) g.fillRect(x, ly, w, 1.4);
    if (!reduced) {
      const band = y + ((t * .16) % 1) * h;
      for (let i = 0; i < 9; i++) {
        const sy = Math.min(band + i * 4, y + h - 5);
        const shift = Math.sin(t * 23 + i * 1.9) * 12;
        g.drawImage(g.canvas, x, sy, w, 4, x + shift, sy, w, 4);
        g.fillStyle = 'rgba(241,250,238,.09)'; g.fillRect(x, sy, w, 1.5);
      }
    }
    const size = Math.max(13, h * .032);
    g.font = `700 ${size}px "Courier Prime", monospace`; g.fillStyle = 'rgba(241,250,238,.9)';
    g.textAlign = 'left'; g.fillText('PLAY ▶  SP', x + size * 1.3, y + size * 2);
    g.textAlign = 'right'; g.fillText('03:33', x + w - size * 1.3, y + size * 2);
    g.textAlign = 'left';
  }

  /* Bright as a matinee, and she will not stop smiling. */
  function matinee(g, w, h, p, t, face, reduced) {
    const iris = smooth(span(p, .872, .888));
    const strain = span(p, .895, .952);
    const cx = w / 2, cy = h * .5, R = Math.hypot(w, h) / 2;
    g.save();
    g.beginPath(); g.arc(cx, cy, Math.max(.001, iris * R * 1.05), 0, Math.PI * 2); g.clip();
    g.fillStyle = C.mist; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(241,250,238,.45)';
    for (let i = 0; i < 18; i++) {
      const a = i / 18 * Math.PI * 2 + (reduced ? 0 : t * .03);
      g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R * 1.2, a, a + Math.PI / 18); g.closePath(); g.fill();
    }
    g.fillStyle = `rgba(168,31,48,${.92 * smooth(strain)})`; g.fillRect(0, 0, w, h);
    const base = Math.min(h / Face.H, w / (Face.W * .72));
    const shiver = reduced ? 0 : strain * strain * 5 * base;
    g.translate(cx + Math.sin(t * 47) * shiver, h * .53 + Math.cos(t * 59) * shiver * .6);
    g.rotate(.035 * Math.sin(t * .5) * (1 - strain));
    const sc = base * lerp(.9, 1.14, smooth(strain));
    g.scale(sc * lerp(1, 1.07, strain), sc);                     // the smile stretches
    g.drawImage(face, -Face.W / 2, -Face.H * .54);
    // coffee-dark tears
    for (const [dir, delay] of [[-1, .1], [1, .38]]) {
      const run = smooth(span(strain, delay, delay + .55));
      if (run <= 0) continue;
      const x = dir * 112;
      limb(g, [[x, -122], [x + dir * 12, -122 + 110 * run], [x + dir * 4, -122 + 250 * run]], 4, 10, 'rgba(48,20,6,.88)');
    }
    g.restore();
    // vignette closing like an old iris
    const v = g.createRadialGradient(cx, cy, R * lerp(.5, .2, strain), cx, cy, R);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.92)');
    g.fillStyle = v; g.fillRect(0, 0, w, h);
  }

  const CAPTIONS = [
    [.022, .085, 'Você lembra de ter fechado a porta.'],
    [.105, .180, 'A janela do quarto dá para o cafezal.'],
    [.228, .300, 'Tem água fervendo. Não foi você.'],
    [.352, .398, 'Não se mexe.'],
    [.410, .455, 'Essas unhas não são suas.'],
    [.495, .562, '“Trouxe um cafezinho.”'],
    [.625, .680, 'Cadê ela?'],
    [.765, .805, 'Por favor{name}. Para de descer.'],
    [.822, .856, 'Para.'],
    [.884, .916, '“Você não vai provar?”'],
    [.924, .953, '“Sorria comigo{name}.”'],
  ];

  function draw(g, w, h, p, t, opts) {
    const { faces, lunge, reduced } = opts;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);

    // ---- final act: the face and the gloves, on the clock ----
    if (lunge >= 0) {
      if (lunge > 1.35 || !faces) return;
      const k = clamp(lunge / (reduced ? 1.2 : .62));
      const e = reduced ? smooth(k) : k * k * k;
      const base = Math.min(h / Face.H, w / (Face.W * .72));
      const sc = base * lerp(reduced ? .75 : .66, reduced ? .95 : 2.15, e);
      const shake = reduced ? 0 : (6 + 30 * e) * base;
      g.save();
      g.translate(w / 2 + (Math.random() - .5) * shake, h * lerp(.5, .56, e) + (Math.random() - .5) * shake);
      g.rotate(reduced ? 0 : (Math.random() - .5) * .07);
      g.scale(sc, sc);
      g.globalAlpha = reduced ? k : 1;
      g.drawImage(faces.open, -Face.W / 2, -Face.H * .54);
      g.restore();
      const reach = reduced ? .6 : smooth(span(k, .25, 1));
      for (const dir of [-1, 1]) glove(g, w / 2 + dir * w * lerp(.68, .34, reach), h * lerp(1.15, .88, reach), -dir * .6, base * lerp(.8, 1.5, reach));
      return;
    }

    if (p >= .86) {
      if (faces && p >= .872) matinee(g, w, h, p, t, faces.closed, reduced);
      return;
    }

    // a 16mm frame floating in the dark
    const wide = w > h;
    const gw = wide ? Math.min(w * .94, h * .9 * 4 / 3) : w * .95;
    const gh = wide ? h * .9 : Math.min(h * .78, gw * 1.55);
    const weave = reduced ? 0 : Math.sin(t * 17) * .8 + Math.sin(t * 7.3) * .8;
    const gate = { x: (w - gw) / 2, y: (h - gh) / 2 + weave, w: gw, h: gh };
    const corner = Math.min(gw, gh) * .035;

    g.save();
    g.beginPath(); g.roundRect(gate.x, gate.y, gate.w, gate.h, corner); g.clip();

    const s = Math.min(gh / VH, gw / 720);
    const split = smooth(span(p, .195, .216)) * (1 - smooth(span(p, .305, .326)));
    const zoom = 1 + .13 * smooth(span(p, .33, .62));
    const sway = reduced ? 0 : Math.sin(t * .9) * 3;
    const narrow = gw / s < 1000;
    const camX = w / 2 - split * gw * .23;                       // slides to stay in its half
    g.setTransform(s * zoom, 0, 0, s * zoom, camX - 800 * s * zoom, gate.y + gh * .5 - 500 * s * zoom + sway * s);

    const open = smooth(span(p, .335, .40)) * .52 + smooth(span(p, .42, .50)) * .38;
    // the hall light dies once, comes back to an empty doorway, then dies for good
    const hall = clamp(Math.min(1 - span(p, .565, .580) + span(p, .612, .630), 1) * (1 - span(p, .675, .700)));
    // first she is far out in the field, then much closer, then gone
    const outside = p > .095 && p < .14 ? { x: .3, y: .8, scale: .13 } : p >= .14 && p < .188 ? { x: .5, y: 1.52, scale: .62 } : null;
    const state = {
      hall,
      figure: p < .595 ? smooth(span(p, .44, .49)) : 0,
      step: smooth(span(p, .50, .565)),
      tilt: .08 + .5 * smooth(span(p, .50, .555)),
      sway: reduced ? 0 : Math.sin(t * 1.35) * 4,
    };
    room(g, hall * open, narrow ? 462 : 350, outside);
    doorway(g, state);
    frame(g, hall, open);
    doorPanel(g, open, hall);
    if (p < .48) { g.globalAlpha = 1 - span(p, .455, .48); fingers(g, span(p, .385, .45)); g.globalAlpha = 1; }
    nightstand(g, t, narrow ? 965 : 1070);
    const rising = span(p, .715, .815);
    crawler(g, rising, faces?.closed, t);
    bed(g, reduced ? 0 : (Math.sin(t * 1.5) + 1) * 3);
    grip(g, rising);
    g.setTransform(1, 0, 0, 1, 0, 0);

    if (split > 0) {
      const half = gate.w / 2, px = gate.x + gate.w - half * split;
      outsidePanel(g, px, gate.y, half, gate.h, span(p, .205, .315), t, reduced);
      g.fillStyle = '#000'; g.fillRect(px - 5, gate.y, 10, gate.h);
    }

    // lamp-warm print, darker at the edges
    g.fillStyle = 'rgba(69,123,157,.08)'; g.fillRect(gate.x, gate.y, gate.w, gate.h);
    const R = Math.hypot(gate.w, gate.h) / 2;
    const v = g.createRadialGradient(w / 2, h * .5, R * .34, w / 2, h * .5, R);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.86)');
    g.fillStyle = v; g.fillRect(gate.x, gate.y, gate.w, gate.h);
    if (p >= .715) tape(g, gate, t, reduced); else if (!reduced) wear(g, gate, t);

    // iris in at the start, cut to black before the smile
    const iris = smooth(span(p, 0, .055));
    if (iris < 1) {
      g.fillStyle = '#000';
      g.beginPath(); g.rect(0, 0, w, h); g.arc(w / 2, h / 2, iris * R * 1.1, 0, Math.PI * 2, true); g.fill();
    }
    const dim = span(p, .838, .857);
    if (dim > 0) { g.fillStyle = `rgba(0,0,0,${dim})`; g.fillRect(0, 0, w, h); }
    g.restore();
  }

  window.Scene = { draw, glove, CAPTIONS };
})();
