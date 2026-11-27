/* All sound is synthesised and all tunes are original. Nothing plays until the visitor asks.
   The score changes with the reel:
     farm      1918 · tack piano over a crackling record
     seventies 1979 · fingerpicked guitar and a far-off harmonica
     eighties  1985 · synth bass, gated drums, neon pads
     barn      crickets, wind, an owl, a music box left running
     finale    low drone, strings and the projector
     end       the farm tune again, on the music box
   "dread" (0..1) detunes the players, drops notes, muffles them and wakes a heartbeat. */
(() => {
  let ac, master, sfx, music, tapeBus, out, noiseBuf, crackleBuf, beds, buses, timer;
  let enabled = false, filming = false, hushed = false;
  let dread = 0, scene = 'farm', playing = '', step = 0, nextNote = 0, nextBeat = 0, nextBreath = 0, nextTick = 0;
  const strings = new Map();

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const hz = midi => 440 * Math.pow(2, (midi - 69) / 12);
  const rand = (a, b) => a + Math.random() * (b - a);
  const sour = () => clamp((dread - .05) / .7);
  const ramp = (param, v, tau = .6) => param.setTargetAtTime(v, ac.currentTime, tau);

  /* ---------- building blocks ---------- */
  function gain(v, dest) { const g = ac.createGain(); g.gain.value = v; g.connect(dest); return g; }
  function filter(type, freq, q, dest) { const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; f.connect(dest); return f; }
  function loop(buffer, dest) { const n = ac.createBufferSource(); n.buffer = buffer; n.loop = true; n.connect(dest); n.start(); return n; }
  function drone(type, freq, dest) { const o = ac.createOscillator(); o.type = type; o.frequency.value = freq; o.connect(dest); o.start(); return o; }
  function wobble(param, rate, depth) { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = rate; g.gain.value = depth; o.connect(g).connect(param); o.start(); }
  function env(g, t, peak, attack, release) {
    g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(.0002, peak), t + attack);
    g.gain.exponentialRampToValueAtTime(.0001, t + attack + release);
  }
  /* one enveloped oscillator */
  function tone(t, freq, { type = 'sine', peak = .2, attack = .005, release = .4, dest = out, to, cents = 0 } = {}) {
    const g = gain(0, dest), o = ac.createOscillator();
    o.type = type; o.detune.value = cents; o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + attack + release);
    o.connect(g); env(g, t, peak, attack, release);
    o.start(t); o.stop(t + attack + release + .05);
    return o;
  }
  /* one enveloped burst of filtered noise */
  function burst(t, dur, type, freq, q, peak, attack, dest = out) {
    const g = gain(0, dest), f = filter(type, freq, q, g), n = ac.createBufferSource();
    n.buffer = noiseBuf; n.loop = true; n.connect(f);
    env(g, t, peak, attack, dur - attack);
    n.start(t, Math.random() * 2); n.stop(t + dur + .05);
    return f;
  }
  const thump = (t, peak = .5, freq = 58, dest = out) => tone(t, freq * 1.6, { peak, attack: .012, release: .26, to: freq * .6, dest });

  /* ---------- instruments ---------- */
  /* a slightly out-of-tune parlour piano */
  function piano(t, midi, peak, dest, cents = 0) {
    const f = hz(midi), len = clamp(1.5 - (midi - 48) / 60, .35, 1.5);
    tone(t, f, { type: 'triangle', peak, release: len, dest, cents: cents - 5 });
    tone(t, f, { type: 'triangle', peak: peak * .7, release: len * .8, dest, cents: cents + 7 });
    tone(t, f * 2, { peak: peak * .22, release: len * .4, dest, cents });
    tone(t, f * 4.02, { peak: peak * .07, release: .12, dest, cents });
    burst(t, .02, 'bandpass', 2200, 1, peak * .35, .002, dest);
  }
  /* plucked string (Karplus-Strong), rendered once per pitch */
  function pluck(t, midi, peak, dest, cents = 0) {
    if (!strings.has(midi)) {
      const sr = ac.sampleRate, buf = ac.createBuffer(1, Math.round(sr * 2.4), sr), data = buf.getChannelData(0);
      const n = Math.round(sr / hz(midi)), ring = new Float32Array(n);
      for (let i = 0, last = 0; i < n; i++) { last = last * .45 + (Math.random() * 2 - 1) * .55; ring[i] = last; }
      for (let i = 0; i < data.length; i++) {
        const k = i % n;
        data[i] = ring[k] * Math.min(1, (data.length - i) / 2000);
        ring[k] = .4985 * (ring[k] + ring[(k + 1) % n]);
      }
      strings.set(midi, buf);
    }
    const src = ac.createBufferSource(), g = gain(peak, dest);
    src.buffer = strings.get(midi); src.detune.value = cents; src.connect(g); src.start(t);
  }
  /* a breathy reed that bends into its note */
  function harmonica(t, midi, len, peak, dest, cents = 0) {
    const g = gain(0, dest), lp = filter('lowpass', 2100, 1.2, g);
    [0, 8].forEach(spread => {
      const o = ac.createOscillator(); o.type = spread ? 'square' : 'sawtooth'; o.detune.value = cents + spread;
      o.frequency.setValueAtTime(hz(midi - .6), t); o.frequency.exponentialRampToValueAtTime(hz(midi), t + .22);
      const v = ac.createOscillator(), depth = ac.createGain(); v.frequency.value = 5.2; depth.gain.value = hz(midi) * .008;
      v.connect(depth).connect(o.frequency); v.start(t); v.stop(t + len + .1);
      o.connect(lp); o.start(t); o.stop(t + len + .1);
    });
    g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + len * .35);
    g.gain.exponentialRampToValueAtTime(.0001, t + len);
  }
  /* music box comb */
  function bell(t, midi, peak, dest, cents = 0) {
    const f = hz(midi);
    [[1, 1, 1.6], [2.76, .28, .5], [5.4, .1, .18]].forEach(([k, a, len]) => tone(t, f * k, { peak: peak * a, attack: .004, release: len, dest, cents }));
  }
  /* bowed section: used for pads and for stabs */
  function bowed(t, midis, len, peak, dest, { attack = .4, cutoff = 1400, cents = 0, tremble = 0 } = {}) {
    const g = gain(0, dest), lp = filter('lowpass', cutoff, .8, g);
    midis.forEach(m => [-9, 8].forEach(spread => {
      const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(m); o.detune.value = cents + spread;
      if (tremble) { const v = ac.createOscillator(), d = ac.createGain(); v.frequency.value = tremble + rand(-1, 1); d.gain.value = hz(m) * .012; v.connect(d).connect(o.frequency); v.start(t); v.stop(t + len + .1); }
      o.connect(lp); o.start(t); o.stop(t + len + .1);
    }));
    g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.setValueAtTime(peak, t + Math.max(attack, len * .6));
    g.gain.exponentialRampToValueAtTime(.0001, t + len);
  }

  /* ---------- the score ---------- */
  // 1918: a stride rag in F
  const CHORDS = {
    F: [41, 36, [57, 60, 65]], D7: [38, 33, [54, 60, 62]], G7: [43, 38, [53, 59, 62]], C7: [36, 43, [52, 58, 60]],
    A7: [45, 40, [55, 61, 64]], Bb: [46, 41, [58, 62, 65]],
  };
  const RAG = ['F', 'D7', 'G7', 'C7', 'F', 'A7', 'Bb', 'C7'];
  const RAG_TUNE = [
    72, 0, 69, 72, 77, 0, 76, 74,  72, 0, 0, 69, 66, 69, 72, 0,  71, 0, 74, 0, 79, 77, 74, 71,  72, 0, 76, 0, 70, 0, 67, 0,
    72, 0, 69, 72, 77, 0, 81, 79,  76, 0, 73, 76, 79, 0, 76, 73,  74, 0, 77, 82, 81, 0, 77, 74,  79, 76, 72, 70, 77, 0, 0, 0,
  ];
  // 1979: open road, A minor
  const ROAD = [[45, 57, 60, 64, 69], [45, 57, 60, 64, 69], [48, 55, 60, 64, 67], [43, 55, 59, 62, 67], [45, 57, 60, 64, 69], [41, 53, 57, 60, 65], [40, 52, 56, 59, 64], [40, 52, 56, 59, 64]];
  const PICK = [0, 2, 3, 1, 4, 3, 2, 3];
  const HARP = { 0: [76, 2.2], 16: [79, 1.8], 22: [76, .8], 24: [74, 2.4], 32: [72, 1.2], 35: [71, 2], 48: [68, 2.6], 56: [71, 3] };
  // 1985: D minor on analogue synths
  const NEON = [[38, [62, 65, 69]], [34, [62, 65, 70]], [31, [62, 67, 70]], [33, [61, 64, 69]]];
  const LEAD = { 0: 81, 24: 77, 32: 79, 40: 77, 48: 76, 56: 73 };

  const SCORE = {
    farm(t, i, dest) {
      const bar = Math.floor(i / 8) % 8, s = i % 8, [root, fifth, chord] = CHORDS[RAG[bar]], k = sour();
      const off = () => -rand(0, 55) * k;
      if (s === 0 || s === 4) piano(t, s ? fifth : root, .17, dest, off());
      if (s === 2 || s === 6) chord.forEach((n, j) => piano(t + j * .004, n, .05, dest, off()));
      const note = RAG_TUNE[i % 64];
      if (note && Math.random() > k * .16) piano(t + rand(0, .03) * k, note, .15, dest, off());
      return (s % 2 ? .215 : .325) * (1 + k * .4 + (Math.random() < k * .08 ? .8 : 0));     // swung, then stumbling
    },
    seventies(t, i, dest) {
      const bar = Math.floor(i / 8) % 8, s = i % 8, k = sour(), off = () => rand(-35, 12) * k;
      pluck(t + rand(0, .012), ROAD[bar][PICK[s]], s === 0 ? .3 : .19, dest, off());
      if (s % 4 === 2) burst(t, .09, 'highpass', 5200, .7, .028, .02, dest);               // brushed snare
      if (s === 0) thump(t, .1, 62, dest);                                                  // boot on the floor
      const call = HARP[i % 64];
      if (call) harmonica(t, call[0], call[1], .035, dest, off());
      return .395 * (1 + k * .22);
    },
    eighties(t, i, dest) {
      const bar = Math.floor(i / 16) % 4, s = i % 16, [root, chord] = NEON[bar], k = sour(), beat = .142 * (1 + k * .18);
      if (s % 2 === 0) {                                                                    // pumping octave bass
        const g = filter('lowpass', 420 + 500 * (1 - k), 5, dest);
        tone(t, hz(root + (s % 4 ? 12 : 0)), { type: 'sawtooth', peak: .17, release: .2, dest: g, cents: -20 * k });
      }
      tone(t, hz(chord[s % 3] + (s % 6 > 2 ? 12 : 0)), { type: 'square', peak: .022, release: .11, dest, cents: rand(-30, 8) * k });
      if (s === 0) bowed(t, chord, beat * 16.5, .028, dest, { cutoff: 1900 - 1200 * k, cents: -18 * k });
      if (s === 0 || s === 8 || s === 11) thump(t, .42, 52, dest);
      if (s === 4 || s === 12) { burst(t, .24, 'bandpass', 1800, .6, .22, .004, dest); tone(t, 190, { type: 'triangle', peak: .09, release: .09, dest }); }
      if (s % 4 === 2) burst(t, .05, 'highpass', 7600, .8, .05, .003, dest);
      const lead = LEAD[i % 64];
      if (lead) [0, 3, 6].forEach((d, n) => bell(t + d * beat, lead, .06 / (n * 1.6 + 1), dest, -25 * k));   // echo
      return beat;
    },
    barn(t, i, dest) {
      if (i % 2 === 0) for (let c = 0; c < 3; c++) tone(t + c * .045, 4350 + rand(-40, 40), { peak: .018, attack: .008, release: .028, dest });   // crickets
      if (i % 3 === 1) tone(t + .12, 3820, { peak: .007, attack: .02, release: .09, dest });
      if (i % 23 === 9) [0, .55].forEach((d, n) => tone(t + d, n ? 330 : 392, { peak: .07, attack: .12, release: n ? .7 : .25, to: n ? 300 : 370, dest }));   // owl
      if (i % 17 === 4 && Math.random() > .35) fx.creak(t, rand(.8, 1.7), dest, .16);
      if (i % 5 === 0) { const n = RAG_TUNE[(i / 5 * 2) % 64] || 72; bell(t, n, .05, dest, rand(-70, -20)); }   // the box winding down
      return .34;
    },
    finale(t, i, dest) {
      if (i % 12 === 0) bowed(t, [62 + Math.floor(dread * 3), 63 + Math.floor(dread * 3), 68], 5.2, .01 + .014 * clamp((dread - .85) / .15), dest, { attack: 2.4, cutoff: 2400, tremble: 6 });
      return .45;
    },
    end(t, i, dest) {
      const n = RAG_TUNE[(i * 2) % 64];
      if (n) bell(t, n, .11, dest, -35 - rand(0, 25));
      return .46 + (i % 8 === 7 ? .3 : 0);
    },
  };
  // loudness of each reel, and of its continuous bed
  const LEVEL = { farm: .9, seventies: 1.6, eighties: .66, barn: .72, finale: .9, end: 1.7 };

  function build() {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 8; comp.connect(ac.destination);
    master = gain(0, comp);
    sfx = gain(1, master); out = sfx;
    music = filter('lowpass', 9000, .4, master);

    const sr = ac.sampleRate;
    noiseBuf = ac.createBuffer(1, sr * 3, sr);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // an old record: hiss, dust and the odd pop
    crackleBuf = ac.createBuffer(1, sr * 5, sr);
    const c = crackleBuf.getChannelData(0);
    for (let i = 0; i < c.length; i++) c[i] = (Math.random() * 2 - 1) * .016;
    for (let p = 0; p < 110; p++) {
      const at = Math.floor(Math.random() * (c.length - 400)), a = Math.random() < .08 ? .75 : rand(.08, .3);
      for (let i = 0; i < 90; i++) c[at + i] += (Math.random() * 2 - 1) * a * Math.exp(-i / 14);
    }
    // recordings come out of a small, dull speaker
    tapeBus = filter('highpass', 190, .7, filter('lowpass', 3900, .9, sfx));

    buses = {};
    for (const name in SCORE) buses[name] = gain(0, music);

    // continuous beds
    loop(crackleBuf, filter('highpass', 500, .4, gain(.55, buses.farm)));
    loop(crackleBuf, filter('highpass', 900, .4, gain(.4, buses.end)));
    loop(noiseBuf, filter('highpass', 5200, .5, gain(.008, buses.seventies)));             // tape hiss
    loop(noiseBuf, filter('highpass', 6500, .5, gain(.006, buses.eighties)));
    const windGain = gain(.06, buses.barn), wind = filter('bandpass', 380, 1.4, windGain);
    loop(noiseBuf, wind); wobble(wind.frequency, .09, 170); wobble(windGain.gain, .14, .03);
    [41.2, 43.1].forEach(f => drone('sawtooth', f, filter('lowpass', 140, 4, gain(.045, buses.barn))));
    const deep = filter('lowpass', 170, 6, gain(.06, buses.finale));
    [36.7, 38.9, 55.3].forEach(f => drone('sawtooth', f, deep));
    // shared undertow and a thin whine that arrive as things get worse
    const under = gain(0, master), underLP = filter('lowpass', 130, 6, under);
    [36.7, 38.9].forEach(f => drone('sawtooth', f, underLP));
    const whine = gain(0, master);
    drone('sine', 1661, whine); drone('sine', 1759, whine);
    beds = { under, underLP, whine };
  }

  function apply() {
    if (!ac) return;
    const d = hushed ? 0 : dread;
    ramp(music.frequency, hushed ? 9000 : 9000 - 6800 * clamp((dread - .15) / .7), 1);
    ramp(beds.under.gain, scene === 'end' ? 0 : .08 * clamp((d - .32) / .6), hushed ? .08 : .8);
    ramp(beds.underLP.frequency, 100 + 150 * clamp((d - .6) / .4), 1);
    ramp(beds.whine.gain, scene === 'end' ? 0 : .005 * clamp((d - .76) / .22), hushed ? .08 : 1.5);
  }

  /* crossfade to the reel on screen */
  function changeReel() {
    playing = hushed ? '' : scene;
    for (const name in buses) ramp(buses[name].gain, name === playing ? LEVEL[name] : 0, hushed ? .08 : .45);
    step = 0; nextNote = ac.currentTime + (scene === 'end' ? 1.2 : .12);
    apply();
  }

  /* ---------- one-off sounds ---------- */
  function breath(t, low, peak, dest = out) {
    const f = burst(t, 1.5, 'bandpass', low ? 330 : 620, 1.4, peak, .75, dest);
    f.frequency.linearRampToValueAtTime(low ? 520 : 900, t + .8);
    burst(t + 1.75, 1.7, 'bandpass', low ? 260 : 440, 1.2, peak * .75, .35, dest);
  }

  const fx = {
    /* interface: everything sounds like something in a projection room */
    click(t) { burst(t, .035, 'bandpass', 2600, 2.5, .38, .002); thump(t, .12, 150); },
    tin(t) { [[523, .16, .7], [1244, .09, .4], [2093, .05, .22], [3140, .025, .1]].forEach(([f, p, len]) => tone(t, f, { peak: p, attack: .002, release: len })); burst(t, .03, 'highpass', 3000, 1, .2, .002); },
    clap(t) { burst(t, .12, 'highpass', 900, .7, .55, .001); burst(t, .05, 'bandpass', 2200, 1.4, .45, .001); thump(t, .3, 140); },
    reel(t) {                                          // the countdown pip, then the shutter catching
      tone(t, 1000, { peak: .13, attack: .004, release: .13 });
      thump(t + .24, .35, 90);
      for (let i = 0; i < 9; i++) burst(t + .26 + i * (.1 - i * .005), .025, 'bandpass', 1900, 1.6, .2, .002);
    },
    ticket(t) {                                        // torn off the stub, then the box-office bell
      for (let i = 0; i < 18; i++) burst(t + i * .011 + rand(0, .006), .018, 'highpass', 2600 + i * 90, .8, rand(.18, .4), .001);
      bell(t + .3, 91, .12, out);
    },
    type(t) {                                          // typewriter keys and the margin bell
      let at = t;
      for (let i = 0; i < 6; i++) { burst(at, .03, 'bandpass', rand(1700, 3200), 3, .42, .001); thump(at, .09, rand(110, 170)); at += rand(.065, .12); }
      bell(at + .05, 96, .07, out);
    },
    tape(t) {                                          // a cassette clunking in and spooling up
      thump(t, .45, 120); burst(t, .08, 'highpass', 2000, 1, .5, .005);
      thump(t + .2, .28, 88); burst(t + .2, .05, 'bandpass', 900, 2, .35, .003);
      tone(t + .26, 180, { type: 'sawtooth', peak: .025, attack: .3, release: .25, to: 520 });
      burst(t + .25, 1.1, 'highpass', 3800, .4, .06, .2);
    },
    sting(t) {                                         // strings catching their breath
      bowed(t, [74, 75, 80, 86], 1.3, .075, out, { attack: .015, cutoff: 4200, tremble: 11 });
      thump(t, .45, 55);
    },

    /* the house */
    creak(t, len = 2.2, dest = out, peak = 1.1) {
      const g = gain(0, dest), bp = filter('bandpass', 760, 14, g), o = ac.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(38, t);
      for (let i = 1; i <= 8; i++) o.frequency.linearRampToValueAtTime(30 + Math.random() * 95, t + (len / 8) * i);
      bp.frequency.linearRampToValueAtTime(1250, t + len);
      o.connect(bp); env(g, t, peak, len * .15, len * .85); o.start(t); o.stop(t + len + .1);
    },
    whisper(t) {
      let at = t;
      [.28, .18, .42, .22, .55].forEach(len => {
        const a = burst(at, len, 'bandpass', rand(1100, 2000), 9, .8, len * .4);
        a.frequency.linearRampToValueAtTime(rand(600, 2400), at + len);
        burst(at, len, 'highpass', 4200, .7, .07, len * .3);
        at += len + .06;
      });
    },
    breath(t) { breath(t, false, .34); },
    breath2(t) { breath(t, false, .15); breath(t + .9, true, .4); },
    kettle(t) {                                        // boiling over, rising, then cut off
      [[1, .11], [1.012, .08], [2.003, .028]].forEach(([k, peak]) => tone(t, 820 * k, { peak, attack: 2.8, release: .25, to: 2250 * k }));
      burst(t, 3.05, 'bandpass', 3200, .8, .16, 2.8);
      for (let i = 0; i < 22; i++) tone(t + rand(0, 2.6), rand(180, 420), { peak: .05, attack: .01, release: .06, to: rand(500, 800) });   // bubbles
    },
    whistle(t) {                                       // someone outside, calling
      [[0, 1450, .45], [.62, 1180, .75], [1.7, 1450, .45], [2.32, 990, 1]].forEach(([at, f, len]) => {
        const o = tone(t + at, f, { peak: .13, attack: len * .3, release: len * .7 });
        o.frequency.linearRampToValueAtTime(f * 1.12, t + at + len * .55);
        o.frequency.linearRampToValueAtTime(f * .95, t + at + len);
        burst(t + at, len, 'bandpass', f, 18, .09, len * .3);
      });
    },
    knock(t) { [0, .42, .84].forEach(o => { thump(t + o, .7, 95); burst(t + o, .07, 'bandpass', 520, 3, .35, .003); }); },
    thud(t) { thump(t, .9, 48); burst(t, .5, 'lowpass', 220, 1, .5, .01); },
    waltz(t) {                                         // her music box: sweet, then winding down and sour
      const notes = [76, 79, 83, 81, 79, 76, 77, 81, 84, 83, 81, 79, 76, 75];
      let at = t;
      notes.forEach((n, i) => {
        const worn = i / (notes.length - 1);
        bell(at, n, .2, out, -80 * worn * worn);
        if (i % 3 === 0) { bell(at, n - 24, .09, out, -50 * worn); thump(at, .08, 150); }
        at += .3 + .45 * worn * worn;
      });
      loopFor(crackleBuf, t, 7, .35);
    },
    scream(t) {
      const bus = gain(0, sfx), shaper = ac.createWaveShaper();
      const curve = new Float32Array(1024);
      for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; curve[i] = Math.tanh(x * 5); }
      shaper.curve = curve; shaper.connect(bus);
      [311, 466, 698, 1047, 1480].forEach((f, i) => {
        const g = gain(.2, shaper), o = ac.createOscillator();
        o.type = i % 2 ? 'square' : 'sawtooth';
        o.frequency.setValueAtTime(f * .6, t);
        o.frequency.exponentialRampToValueAtTime(f * 1.35, t + .18);
        o.frequency.linearRampToValueAtTime(f * .9, t + 1.3);
        const v = ac.createOscillator(), vd = ac.createGain();
        v.frequency.value = 23 + i * 7; vd.gain.value = f * .08; v.connect(vd).connect(o.frequency);
        o.connect(g); o.start(t); v.start(t); o.stop(t + 1.35); v.stop(t + 1.35);
      });
      burst(t, 1.3, 'bandpass', 2600, .8, .9, .03, shaper);
      bowed(t, [86, 87, 92, 93], 1.35, .09, shaper, { attack: .03, cutoff: 6000, tremble: 14 });
      bus.gain.setValueAtTime(.0001, t);
      bus.gain.exponentialRampToValueAtTime(.62, t + .04);
      bus.gain.setValueAtTime(.62, t + .95);
      bus.gain.exponentialRampToValueAtTime(.0001, t + 1.3);
      thump(t, 1, 44);
    },
  };
  function loopFor(buffer, t, len, level) {
    const g = gain(level, sfx), n = ac.createBufferSource();
    n.buffer = buffer; n.loop = true; n.connect(g); n.start(t); n.stop(t + len);
  }

  function schedule() {
    if (!enabled || !ac) return;
    const now = ac.currentTime;
    if (playing) {
      if (nextNote < now - .3) nextNote = now + .05;
      while (nextNote < now + .2) nextNote += SCORE[playing](Math.max(now, nextNote), step++, buses[playing]);
    }
    if (filming) {                                     // projector clatter, queued a little ahead
      if (nextTick < now) nextTick = now + .02;
      while (nextTick < now + .2) { burst(nextTick, .028, 'bandpass', 1900, 1.4, .075, .003); nextTick += 1 / 14; }
    }
    if (!hushed && scene !== 'end' && dread > .56 && now >= nextBeat) {
      const k = clamp((dread - .56) / .44);
      thump(now + .02, .13 + .3 * k); thump(now + .27, .09 + .2 * k, 50);
      nextBeat = now + 1.35 - .78 * k;
    }
    // in the barn, someone else is breathing
    if (!hushed && scene === 'barn' && dread > .8 && now >= nextBreath) { breath(now + .05, true, .08 + .16 * clamp((dread - .8) / .15)); nextBreath = now + 4.6; }
  }

  document.addEventListener('visibilitychange', () => {
    if (!ac || !enabled) return;
    if (document.hidden) ac.suspend(); else ac.resume();
  });

  /* iPhone: Web Audio counts as "ambient" by default, so the silent switch mutes it.
     While the visitor has the sound on, declare it as playback, as a video would be. */
  function session(type) {
    try { if (navigator.audioSession) navigator.audioSession.type = type; } catch (e) { console.warn('Audio session:', e.message); }
  }

  window.Sound = {
    get on() { return enabled; },
    set(on) {
      try {
        session(on ? 'playback' : 'auto');
        if (on && !ac) build();
        if (!ac) return false;
        enabled = on;
        clearInterval(timer);
        if (on) { ac.resume(); changeReel(); schedule(); timer = setInterval(schedule, 40); }
        ramp(master.gain, on ? .85 : 0, on ? .25 : .05);
        return true;
      } catch (e) { console.warn('Audio unavailable:', e.message); return false; }
    },
    /* how wrong things are; also brings the score back after a hush */
    mood(d) {
      if (!hushed && Math.abs(d - dread) < .004) return;
      dread = d;
      if (!ac) { hushed = false; return; }
      if (hushed) { hushed = false; changeReel(); } else apply();
    },
    scene(name) { if (name === scene || !SCORE[name]) return; scene = name; if (ac) changeReel(); },
    play(name) { if (enabled && fx[name]) fx[name](ac.currentTime + .01); },
    /* a line from the tape: the deck clunks, hisses, and plays it through its little speaker */
    record(name) {
      if (!enabled || !fx[name]) return;
      const t = ac.currentTime + .01;
      thump(t, .35, 120); burst(t, .06, 'highpass', 2000, 1, .35, .004);
      burst(t + .05, 3.4, 'highpass', 3400, .4, .05, .15);
      out = tapeBus;
      try { fx[name](t + .22); } finally { out = sfx; }
    },
    film(on) { filming = on; },
    /* Drop every bed to nothing, instantly. The silence before the face. */
    hush() { filming = false; if (!ac || hushed) return; hushed = true; changeReel(); },
  };
})();
