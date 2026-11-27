/* Dona Cida's face. Raymarched once on the GPU into two still images (the held smile /
   the scream), then painted over with loose white hair and a red ribbon. No image files. */
(() => {
  const W = 900, H = 1200, VIEW_H = 2.95, TARGET_Y = -0.12;

  const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p,0.,1.); }`;

  const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uOpen;
uniform float uSmile;

float hash(vec3 p){ p = fract(p*.3183099+.1); p *= 17.; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float noise(vec3 x){
  vec3 i = floor(x), f = fract(x); f = f*f*(3.-2.*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x), mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x), mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y), f.z);
}
float fbm(vec3 p){ float a = .5, s = 0.; for(int i=0;i<4;i++){ s += a*noise(p); p = p*2.03+1.7; a *= .5; } return s; }
float smin(float a, float b, float k){ float h = clamp(.5+.5*(b-a)/k,0.,1.); return mix(b,a,h)-k*h*(1.-h); }
float smax(float a, float b, float k){ return -smin(-a,-b,k); }
float ell(vec3 p, vec3 r){ float k0 = length(p/r); float k1 = length(p/(r*r)); return k0*(k0-1.)/k1; }
float tcap(vec3 p, vec3 a, vec3 b, float ra, float rb){ vec3 pa = p-a, ba = b-a; float h = clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h)-mix(ra,rb,h); }

vec3 mouthC(){ return vec3(.012, -.50 - uOpen*.27, .62); }
vec3 mouthR(){ return vec3(.17 + .06*uOpen + .13*uSmile, .035 + .40*uOpen + .025*uSmile, .46); }
// pulls the corners of the mouth up into a grin
vec3 bend(vec3 p){ float dx = p.x-.012; p.y -= uSmile*1.7*dx*dx - uSmile*.025; return p; }

vec2 map(vec3 p){
  vec3 q = p;
  q.x += .028*sin(p.y*3.1+.6);           // nothing about it is quite symmetrical
  vec3 m = vec3(abs(q.x), q.y, q.z);
  float side = step(0., q.x);
  float drop = uOpen*.34;

  float d = ell(q-vec3(0,.22,0), vec3(.66,.84,.72));
  d = smin(d, ell(q-vec3(0,-.40-drop*.75,.12), vec3(.40+.02*uOpen,.54+drop*.4,.49)), .26);
  d = smin(d, tcap(m, vec3(.07,.31,.66), vec3(.47,.31,.47), .065,.05), .11);
  d = smin(d, ell(m-vec3(.42,-.09,.47), vec3(.18,.11,.17)), .10);
  d = smax(d, -ell(m-vec3(.52,-.43-drop*.35,.50), vec3(.15,.27,.22)), .17);
  d = smax(d, -ell(m-vec3(.70,.30,.34), vec3(.12,.24,.22)), .16);

  vec3 sr = mix(vec3(.205,.185,.31), vec3(.185,.150,.30), side);
  d = smax(d, -ell(m-vec3(.262,.12+.012*side,.75), sr), .085);

  d = smin(d, tcap(q, vec3(0,.23,.66), vec3(.008,-.15,.775), .028,.062), .075);
  d = smax(d, -ell(m-vec3(.036,-.185,.82), vec3(.019,.042,.085)), .018);

  // cheeks pushed up by the smile
  d = smin(d, ell(m-vec3(.34,-.25,.50), vec3(.17,.12,.13)*(.6+.4*uSmile)), .12);

  vec3 mc = mouthC(), mr = mouthR(), b = bend(q);
  // thin, painted lips
  vec3 lp = b-mc; lp.z = (b.z-.58+.55*uSmile*b.x*b.x)*1.6;
  float lip = ell(lp, vec3(mr.x+.05, mr.y+.05, .12));
  d = smin(d, lip, .06);
  // torn, ragged opening
  float cav = ell(b-mc, mr);
  if(abs(cav) < .12) cav += ((noise(q*14.)-.5)*.045 + (noise(q*37.)-.5)*.016)*uOpen;
  float mat = 1.;
  d = smax(d, -cav, .035);
  if(cav < .03 && q.z < .64) mat = 3.;

  float neck = tcap(p, vec3(0,-.55,-.20), vec3(0,-2.0,-.30), .23,.31);
  neck -= .018*sin(atan(p.x, p.z+.25)*9.)*smoothstep(-.7,-1.3,p.y);
  d = smin(d, neck, .16);

  float eye = length(m-vec3(.255,.118,.50)) - mix(.092,.084,side);
  if(eye < d){ d = eye; mat = 2.; }

  // teeth: a full, even set when she smiles; long and uneven when she screams
  if(length(q-mc) < .75){
    float tidy = uSmile*(1.-uOpen);
    for(int i=0;i<13;i++){
      float fi = float(i);
      float a = (fi-6.)/6.35;
      float x = mc.x + a*mr.x*.95;
      float ey = sqrt(max(0., 1.-a*a*.9))*mr.y;
      float z = .585 - a*a*(.10+.07*uSmile);
      float l1 = mix((.035 + .085*hash(vec3(fi,1.,3.)))*(.55+.55*uOpen), ey*1.02, tidy);
      float l2 = mix((.030 + .070*hash(vec3(fi,7.,2.)))*(.55+.55*uOpen), ey*.92, tidy);
      float jx = .016*(hash(vec3(fi,4.,9.))-.5)*(1.-tidy);
      float tip = mix(.0035, .017, tidy);
      float up = tcap(b, vec3(x, mc.y+ey+.015, z-.02), vec3(x+jx, mc.y+ey-l1, z+.012), .021, tip);
      float lo = tcap(b, vec3(x+.012*(1.-tidy), mc.y-ey-.015, z-.04), vec3(x-jx+.012*(1.-tidy), mc.y-ey+l2, z-.008), .019, tip*.9);
      float t = min(up,lo);
      if(t < d){ d = t; mat = 4.; }
    }
  }
  return vec2(d, mat);
}

vec3 normalAt(vec3 p){
  vec2 e = vec2(1,-1)*.0022;
  return normalize(e.xyy*map(p+e.xyy).x + e.yyx*map(p+e.yyx).x + e.yxy*map(p+e.yxy).x + e.xxx*map(p+e.xxx).x);
}
float shadow(vec3 ro, vec3 rd){
  float r = 1., t = .03;
  for(int i=0;i<36;i++){ float h = map(ro+rd*t).x; r = min(r, 9.*h/t); t += clamp(h,.015,.12); if(r < .01 || t > 1.8) break; }
  return clamp(r,0.,1.);
}
float occlusion(vec3 p, vec3 n){
  float o = 0., s = 1.;
  for(int i=1;i<=5;i++){ float h = .035*float(i); o += (h - map(p+n*h).x)*s; s *= .75; }
  return clamp(1.-3.4*o,0.,1.);
}
float skinHeight(vec3 p){
  vec3 mc = mouthC();
  float around = smoothstep(.62,.18,length((p-mc)*vec3(1.,.62,.4)));
  float creases = abs(noise(vec3(atan(p.y-mc.y,p.x-mc.x)*9., length(p.xy-mc.xy)*3., 4.))-.5);
  float cracks = smoothstep(.07,0.,abs(fbm(p*5.2+fbm(p*3.)*1.4)-.5));
  // age: lines across the forehead and fanning from the eyes
  float brow = smoothstep(.12,.0,abs(sin(p.y*52.+noise(p*5.)*3.)))*smoothstep(.34,.46,p.y)*smoothstep(.85,.6,p.y);
  vec2 corner = vec2(abs(p.x)-.34, p.y-.10);
  float feet = smoothstep(.2,.0,abs(sin(atan(corner.y,corner.x)*11.)))*smoothstep(.24,.09,length(corner))*step(0.,corner.x);
  return fbm(p*13.)*.4 + noise(p*55.)*.14 - cracks*.18 - creases*around*.45 - brow*.22 - feet*.36;
}

void main(){
  vec2 uv = (gl_FragCoord.xy - .5*uRes)/uRes.y;
  vec3 ro = vec3(0., ${TARGET_Y.toFixed(3)}, 5.);
  vec3 rd = normalize(vec3(uv*${VIEW_H.toFixed(3)}, -5.));

  float t = 3.4; vec2 h = vec2(1.); bool hit = false;
  for(int i=0;i<190;i++){
    h = map(ro+rd*t);
    if(h.x < .0012){ hit = true; break; }
    t += h.x*.68;
    if(t > 7.) break;
  }
  if(!hit){ gl_FragColor = vec4(0.); return; }

  vec3 p = ro+rd*t;
  vec3 n = normalAt(p);
  float mat = h.y;
  vec3 mc = mouthC();

  if(mat < 1.5){
    float e = .006, b = skinHeight(p);
    vec3 g = vec3(skinHeight(p+vec3(e,0,0))-b, skinHeight(p+vec3(0,e,0))-b, skinHeight(p+vec3(0,0,e))-b)/e;
    g -= n*dot(g,n);
    n = normalize(n - g*.018);
  }

  vec2 eyeP = vec2(abs(p.x)-.258, (p.y-.115)*1.12);
  float eyeD = length(eyeP);
  float mouthD = length((bend(p).xy-mc.xy)/(mouthR().xy+vec2(.02,.03)));

  vec3 alb; float gloss = .12, powr = 18.;
  float side = step(0.,p.x);
  vec2 gaze = vec2(mix(-.243,.245,side), mix(.108,.126,side));
  if(mat < 1.5){
    alb = vec3(.70,.55,.43);
    alb = mix(alb, vec3(.55,.37,.32), smoothstep(.45,.75,fbm(p*3.3+7.)));
    alb = mix(alb, vec3(.62,.55,.36), smoothstep(.55,.80,fbm(p*2.1+21.))*.5);
    float vein = smoothstep(.045,0.,abs(fbm(p*vec3(5.,3.2,5.)+fbm(p*2.4)*2.)-.52));
    alb = mix(alb, vec3(.27,.22,.24), vein*.34*smoothstep(.15,.55,fbm(p*1.9)));
    // matinee rouge, two perfect circles
    float rouge = smoothstep(.19,.05,length(vec2(abs(p.x)-.37,(p.y+.25)*1.15)));
    alb = mix(alb, vec3(.70,.14,.07), rouge*.72);
    float bruise = smoothstep(.27,.11,eyeD + .05*(fbm(p*11.)-.5));
    alb = mix(alb, vec3(.32,.10,.09), bruise*.75);
    alb *= 1. - .45*smoothstep(.17,.08,eyeD);
    // lipstick, smeared past the lips
    float paint = smoothstep(1.46,1.10,mouthD + .42*(fbm(p*12.)-.5));
    alb = mix(alb, vec3(.46,.025,.012), paint);
    // coffee-dark tears
    float run = smoothstep(.024,.0,abs(abs(p.x) - .245 - .05*(noise(vec3(p.y*7.,sign(p.x)*3.,0.))-.5)))
              * smoothstep(.04,-.04,p.y) * smoothstep(-.44,-.10,p.y);
    alb = mix(alb, vec3(.10,.035,.01), run*.85);
    gloss = .14 + .45*max(paint, run);
    powr = 24.;
  } else if(mat < 2.5){
    float iris = length(p.xy-gaze);
    float red = smoothstep(.04,0.,abs(fbm(p*24.+fbm(p*11.)*2.)-.5))*smoothstep(.03,.085,iris);
    alb = mix(vec3(.82,.77,.62), vec3(.55,.08,.05), red*.75);
    alb = mix(alb, vec3(.16,.19,.07), smoothstep(.033,.026,iris));
    alb = mix(alb, vec3(.006), smoothstep(.015,.01,iris));
    gloss = 1.3; powr = 150.;
  } else if(mat < 3.5){
    alb = vec3(.09,.008,.006)*smoothstep(.25,.62,p.z); gloss = .25;
  } else {
    alb = mix(vec3(.78,.70,.48), vec3(.34,.20,.07), smoothstep(.40,.80,fbm(p*26.)));
    gloss = .6; powr = 45.;
  }

  float ao = occlusion(p,n);
  vec3 L1 = normalize(vec3(.30,-.78,.72));   // torch from below
  vec3 L2 = normalize(vec3(-.95,.35,-.10));  // cold edge
  vec3 L3 = normalize(vec3(.9,.15,-.25));    // sick red edge
  float d1 = max(dot(n,L1),0.);
  float s1 = d1 > 0. ? shadow(p+n*.012, L1) : 0.;
  float d2 = max(dot(n,L2),0.), d3 = max(dot(n,L3),0.);
  float sp = pow(max(dot(n,normalize(L1-rd)),0.), powr);
  float fres = pow(1.-max(dot(n,-rd),0.), 3.);

  vec3 col = alb * (d1*mix(.12,1.,s1)*vec3(1.22,1.13,.96) + .05*ao*vec3(.5,.6,.75));
  col += alb * (d2*vec3(.20,.30,.42) + d3*vec3(.32,.05,.04)) * ao;
  col += gloss*sp*s1*vec3(1.,.93,.82)*.55;
  col += fres*(d2*vec3(.18,.28,.38)+d3*vec3(.22,.03,.03))*.8;
  col *= mix(.25,1.,ao);
  if(mat < 1.5) col += alb*smoothstep(.15,.70,p.y)*max(dot(n,normalize(vec3(-.25,.35,1.))),0.)*.16*ao;

  if(mat > 2.5 && mat < 3.5) col = alb*(.03 + .75*d1*s1)*ao;      // the throat swallows light
  col *= mix(1., .22, smoothstep(-.78,-1.30,p.y)*smoothstep(.36,.08,p.z));

  if(mat > 1.5 && mat < 2.5){
    col += alb*.16;                                                 // the eyes never fall into shadow
    float pin = length(p.xy-gaze-vec2(.012,.014));
    col += vec3(1.,.97,.9)*(smoothstep(.014,.006,pin) + .22*smoothstep(.055,0.,pin));
  }

  // the head dissolves into the dark
  col *= smoothstep(1.12,.42,p.y)*.35+.65;
  float a = smoothstep(-1.85,-1.15,p.y);
  col = pow(clamp(col,0.,1.), vec3(.52));
  col = clamp((col-.5)*1.10+.47, 0., 1.);
  col += (hash(vec3(gl_FragCoord.xy,3.))-.5)*.045;
  gl_FragColor = vec4(col*a, a);
}`;

  const nextFrame = () => new Promise(r => { let done = false; const go = () => { if (!done) { done = true; r(); } }; requestAnimationFrame(go); setTimeout(go, 60); });

  function seeded(seed) {
    return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  }

  function paintHair(ctx) {
    const rnd = seeded(333);
    const unit = H / VIEW_H;
    const X = x => W / 2 + x * unit;
    const Y = y => H / 2 - (y - TARGET_Y) * unit;
    ctx.lineCap = 'round';
    // loose white hair coming undone from the bun
    for (let c = 0; c < 130; c++) {
      const side = rnd() < .5 ? -1 : 1;
      const spread = Math.pow(rnd(), .8);
      const sx = side * spread * .52;
      const sy = 1.07 - spread * spread * .34 - rnd() * .05;
      const loose = rnd() < .06;                       // a few strands fall across the face
      const midX = loose ? sx * .9 + (rnd() - .5) * .25 : side * (.54 + rnd() * .32);
      const midY = .25 + rnd() * .3;
      const endX = loose ? midX * .8 + (rnd() - .5) * .3 : side * (.46 + rnd() * .5);
      const endY = loose ? -.2 - rnd() * .8 : -.6 - rnd() * 1.0;
      const strands = loose ? 3 : 15;
      for (let i = 0; i < strands; i++) {
        const j = () => (rnd() - .5) * .13;
        const tone = rnd();
        ctx.strokeStyle = tone < .22 ? `rgba(92,84,64,${.5 + rnd() * .4})` : tone < .62 ? `rgba(176,168,140,${.35 + rnd() * .45})` : `rgba(230,224,198,${.25 + rnd() * .45})`;
        ctx.lineWidth = .5 + rnd() * (loose ? 1.4 : 2.4);
        ctx.beginPath();
        ctx.moveTo(X(sx + j() * .5), Y(sy + j() * .5));
        ctx.bezierCurveTo(
          X((sx + midX) / 2 + side * .14 + j()), Y(sy + .02 + j()),
          X(midX + side * .16 * Math.sin(c * 1.7) + j()), Y(midY + j() * 2),
          X(endX + j() * 2), Y(endY + j() * 3));
        ctx.stroke();
      }
    }
    // frizz that escaped the ribbon
    for (let i = 0; i < 150; i++) {
      const a = rnd() * Math.PI, r = .5 + rnd() * .14;
      const x = Math.cos(a) * r, y = .5 + Math.sin(a) * r * 1.02;
      ctx.strokeStyle = `rgba(222,216,190,${.18 + rnd() * .35})`; ctx.lineWidth = .5 + rnd();
      ctx.beginPath(); ctx.moveTo(X(x), Y(y));
      ctx.bezierCurveTo(X(x * 1.2 + (rnd() - .5) * .2), Y(y + rnd() * .14), X(x * 1.1 + (rnd() - .5) * .3), Y(y + (rnd() - .5) * .25), X(x * 1.25 + (rnd() - .5) * .25), Y(y + (rnd() - .6) * .3));
      ctx.stroke();
    }
    // the red ribbon, tied with care
    const rx = X(.02), ry = Y(1.08);
    ctx.fillStyle = '#d62839';
    for (const dir of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(rx, ry);
      ctx.bezierCurveTo(rx + dir * 70, ry - 74, rx + dir * 168, ry - 40, rx + dir * 132, ry + 20);
      ctx.bezierCurveTo(rx + dir * 104, ry + 50, rx + dir * 42, ry + 30, rx, ry);
      ctx.fill();
      ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + dir * 52, ry + 96); ctx.lineTo(rx + dir * 70, ry + 70); ctx.lineTo(rx + dir * 92, ry + 82); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#7a1220'; ctx.beginPath(); ctx.ellipse(rx, ry, 22, 25, 0, 0, 7); ctx.fill();
  }

  /* Fade the lower edge so nothing ends in a straight line. */
  function dissolve(c) {
    const g = c.getContext('2d');
    const fade = g.createLinearGradient(0, H * .74, 0, H * .985);
    fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(0,0,0,1)');
    g.globalCompositeOperation = 'destination-out';
    g.fillStyle = fade; g.fillRect(0, H * .74, W, H * .26);
    g.globalCompositeOperation = 'source-over';
    return c;
  }

  function fallback(open) {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    const blob = (x, y, rx, ry, inner, outer) => {
      g.save(); g.translate(x, y); g.scale(rx, ry);
      const gr = g.createRadialGradient(0, .3, 0, 0, 0, 1);
      gr.addColorStop(0, inner); gr.addColorStop(1, outer);
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 1, 0, 7); g.fill(); g.restore();
    };
    blob(450, 600, 270, 430, '#bdb6a6', '#050404');
    blob(345, 500, 90, 75, '#000', '#1a050500'); blob(555, 492, 80, 65, '#000', '#1a050500');
    blob(348, 505, 7, 7, '#fff', '#fff0'); blob(552, 497, 7, 7, '#fff', '#fff0');
    blob(452, open ? 860 : 780, open ? 105 : 150, open ? 190 : 52, '#000', '#4a0806');
    if (!open) { g.fillStyle = '#d9cf9f'; for (let x = 340; x < 560; x += 28) g.fillRect(x, 758 + Math.sin((x - 340) / 220 * Math.PI) * 14, 24, 34); }
    paintHair(g);
    return dissolve(c);
  }

  async function render() {
    try {
      const glc = document.createElement('canvas'); glc.width = W; glc.height = H;
      const gl = glc.getContext('webgl', { preserveDrawingBuffer: true, antialias: false });
      if (!gl) throw new Error('no webgl');
      const sh = (type, src) => {
        const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
        return s;
      };
      const prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
      gl.useProgram(prog);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'p');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(gl.getUniformLocation(prog, 'uRes'), W, H);
      const uOpen = gl.getUniformLocation(prog, 'uOpen');
      const uSmile = gl.getUniformLocation(prog, 'uSmile');

      const out = {};
      for (const [key, open, smile] of [['closed', .15, 1], ['open', 1, .35]]) {
        gl.disable(gl.SCISSOR_TEST); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
        gl.enable(gl.SCISSOR_TEST);
        gl.uniform1f(uOpen, open);
        gl.uniform1f(uSmile, smile);
        const STRIPS = 20, step = H / STRIPS;
        for (let i = 0; i < STRIPS; i++) {        // in strips, so scrolling never stalls
          gl.scissor(0, i * step, W, step);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
          gl.flush();
          await nextFrame();
        }
        if (gl.isContextLost()) throw new Error('context lost');
        const c = document.createElement('canvas'); c.width = W; c.height = H;
        const g = c.getContext('2d');
        g.drawImage(glc, 0, 0);
        paintHair(g);
        out[key] = dissolve(c);
      }
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return out;
    } catch (err) {
      console.warn('Face renderer fell back to 2D:', err.message);
      return { closed: fallback(false), open: fallback(true) };
    }
  }

  window.Face = { render, W, H };
})();
