/* Scroll position decides how wrong things are. */
(() => {
  document.documentElement.classList.add('js');
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const reducedQ = matchMedia('(prefers-reduced-motion: reduce)');

  const reelName = $('#reelName'), progressBar = $('#progress');
  const nav = $('#nav'), vignette = $('#vignette'), grain = $('#grain');
  const sections = $$('section[data-dread]');
  const finale = $('#finale'), dark = $('#dark');
  let name = '', dread = 0, faces = null, woke = false;
  const calmTitle = document.title;

  /* ---------- film grain tile ---------- */
  (() => {
    const c = document.createElement('canvas'); c.width = c.height = 160;
    const g = c.getContext('2d'), img = g.createImageData(160, 160);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    grain.style.backgroundImage = `url(${c.toDataURL()})`;
  })();

  /* ---------- name ---------- */
  function applyName() {
    $$('.name').forEach(el => { el.textContent = name || el.dataset.fallback; });
    $('#roomName').textContent = name ? `Quarto de ${name}` : 'Seu quarto';
    $('#endName').textContent = name ? `, ${name}` : '';
  }
  applyName();
  $('#nameForm').addEventListener('submit', e => {
    e.preventDefault();
    name = $('#nameInput').value.trim().replace(/\s+/g, ' ').slice(0, 20);
    applyName();
    $('#nameNote').textContent = name ? `Anotado, ${name}. Ela não vai esquecer.` : 'Sem nome? Tudo bem. Ela descobre.';
    Sound.play('type');
    flashSmile(700);
  });

  /* ---------- the hostess ---------- */
  const portrait = $('#portrait');
  let smileTimers = [];
  function flashSmile(ms) {
    if (woke) return;
    portrait.classList.add('wide');
    Sound.play('sting');
    smileTimers.push(setTimeout(() => { if (!woke) portrait.classList.remove('wide'); }, ms));
  }
  // stay with the portrait long enough and the smile slips, briefly
  new IntersectionObserver(([e]) => {
    smileTimers.forEach(clearTimeout); smileTimers = [];
    if (!woke) portrait.classList.remove('wide');
    if (e.isIntersecting) smileTimers.push(setTimeout(() => flashSmile(240), 3600), setTimeout(() => flashSmile(900), 8200));
  }, { threshold: .7 }).observe(portrait);

  /* ---------- the tin leans toward the pointer, on a spring ---------- */
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  (() => {
    const tin = $('#heroTin');
    const now = { x: 0, y: 0 }, goal = { x: 0, y: 0 }, speed = { x: 0, y: 0 };
    let id = 0;
    const step = () => {
      let moving = false;
      for (const k in now) {
        speed[k] = (speed[k] + (goal[k] - now[k]) * .09) * .76;
        now[k] += speed[k];
        if (Math.abs(speed[k]) > .01 || Math.abs(goal[k] - now[k]) > .05) moving = true;
      }
      tin.style.transform = `rotateX(${now.x}deg) rotateY(${now.y}deg)`;
      id = moving ? requestAnimationFrame(step) : 0;
    };
    const aim = (x, y) => { goal.x = x; goal.y = y; if (!id) id = requestAnimationFrame(step); };
    tin.addEventListener('pointermove', e => {
      if (reducedQ.matches || !fine.matches) return;
      const r = tin.getBoundingClientRect();
      aim(-((e.clientY - r.top) / r.height - .5) * 12, ((e.clientX - r.left) / r.width - .5) * 28);
    });
    tin.addEventListener('pointerleave', () => aim(0, 0));
  })();

  /* ---------- the farm has depth: layers slide with scroll and pointer ---------- */
  const hero = $('#top'), layers = $$('.farm .layer');
  const look = { x: 0, tx: 0 };
  addEventListener('pointermove', e => { if (fine.matches) look.tx = e.clientX / innerWidth - .5; }, { passive: true });
  function parallax() {
    if (reducedQ.matches || scrollY > hero.offsetHeight) return;
    look.x += (look.tx - look.x) * .06;
    for (const l of layers) {
      const d = +l.dataset.depth;
      l.setAttribute('transform', `translate(${(-look.x * 46 * (1 - d)).toFixed(2)} ${(Math.max(0, scrollY) * d * .55).toFixed(2)})`);
    }
  }

  /* ---------- the film strip runs sideways while the page scrolls down ---------- */
  const features = $('#features'), track = $('#track'), strip = $('.strip');
  const setPan = () => {
    const pan = !reducedQ.matches && innerHeight > 520;
    document.documentElement.classList.toggle('pan', pan);
    if (!pan) { track.style.transform = ''; strip.style.removeProperty('--roll'); }
  };
  setPan();
  addEventListener('resize', setPan);
  reducedQ.addEventListener('change', setPan);
  function runStrip() {
    if (!document.documentElement.classList.contains('pan')) return;
    const r = features.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    const p = clamp((-r.top / (r.height - innerHeight) - .04) / .9);
    const x = -p * Math.max(0, track.scrollWidth - strip.clientWidth);
    track.style.transform = `translate3d(${x}px, 0, 0)`;
    strip.style.setProperty('--roll', `${x}px`);
  }

  /* ---------- reel cards open like an iris and count down ---------- */
  const cards = $$('.reelcard');
  function runCards() {
    for (const card of cards) {
      const r = card.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) continue;
      const p = clamp((innerHeight - r.top) / (innerHeight * .95));
      const inner = card.firstElementChild;
      inner.style.setProperty('--iris', `${(p * p * (3 - 2 * p) * 80).toFixed(2)}%`);
      inner.firstElementChild.style.setProperty('--sweep', `${((scrollY * 1.4) % 360).toFixed(0)}deg`);
    }
  }

  /* ---------- the marquee counts up once ---------- */
  new IntersectionObserver(([e], obs) => {
    if (!e.isIntersecting) return;
    obs.disconnect();
    if (reducedQ.matches) return;
    const items = $$('[data-count]');
    const start = performance.now();
    const tick = now => {
      const k = clamp((now - start) / 1400), ease = 1 - Math.pow(1 - k, 3);
      for (const el of items) {
        const target = +el.dataset.count, digits = el.dataset.count.includes('.') ? 1 : 0;
        el.textContent = (target * ease).toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits }) + el.dataset.suffix;
      }
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, { threshold: .4 }).observe($('.marquee'));

  /* ---------- sound ---------- */
  const soundBtn = $('#soundToggle'), previewBtn = $('#previewSound');
  function setSound(on) {
    if (!Sound.set(on)) return;
    soundBtn.setAttribute('aria-pressed', String(on));
    $('#soundLabel').textContent = on ? 'Som ligado' : 'Som desligado';
    previewBtn.querySelector('span').textContent = on ? 'Parar o som' : 'Ouvir a trilha do filme';
    if (on) { Sound.mood(dread); Sound.play('click'); }
  }
  soundBtn.addEventListener('click', () => setSound(!Sound.on));
  previewBtn.addEventListener('click', () => setSound(!Sound.on));

  /* ---------- the little noises of a projection room ---------- */
  document.addEventListener('click', e => {
    if (e.target.closest('a.btn, .nav a, #wake')) Sound.play('click');
  });
  $('#heroTin').addEventListener('pointerdown', () => Sound.play('tin'));
  $$('.clap').forEach(c => c.addEventListener('animationend', () => Sound.play('clap')));
  const cardSound = new IntersectionObserver(entries => {
    for (const e of entries) if (e.isIntersecting) Sound.play('reel');
  }, { rootMargin: '-45% 0px -45% 0px' });
  $$('.reelcard').forEach(c => cardSound.observe(c));

  /* ---------- reveals, staggered per container ---------- */
  const io = new IntersectionObserver(entries => {
    entries.filter(e => e.isIntersecting).forEach((e, i) => {
      e.target.style.setProperty('--stagger', `${[0, 60, 105, 160, 200][Math.min(i, 4)]}ms`);
      e.target.classList.add('in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -10% 0px' });
  $$('.reveal').forEach(el => io.observe(el));

  /* ---------- step three changes its mind ---------- */
  const step3 = $('#step3');
  new IntersectionObserver(([e], obs) => {
    if (!e.isIntersecting) return;
    obs.disconnect();
    setTimeout(() => {
      const parts = $$('#step3 .swap');
      parts.forEach(p => p.classList.add('changing'));
      setTimeout(() => {
        parts.forEach(p => { p.textContent = p.dataset.to; p.classList.remove('changing'); });
        step3.classList.add('turned');
        Sound.play('sting');
      }, 520);
    }, 1700);
  }, { threshold: 1 }).observe(step3);

  /* ---------- eyes that follow ---------- */
  const watching = $$('.pupils');
  addEventListener('pointermove', e => {
    for (const g of watching) {
      const r = g.ownerSVGElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) continue;
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const len = Math.hypot(dx, dy) || 1;
      g.style.transform = `translate(${(dx / len) * 3}px, ${(dy / len) * 2.4}px)`;
    }
  }, { passive: true });

  /* ---------- recordings ---------- */
  let playingTimer;
  $$('.play').forEach(btn => btn.addEventListener('click', () => {
    if (!Sound.on) setSound(true);
    Sound.record(btn.dataset.sound);
    $$('.play').forEach(b => b.classList.remove('playing'));
    btn.classList.add('playing');
    clearTimeout(playingTimer);
    playingTimer = setTimeout(() => btn.classList.remove('playing'), 3500);
  }));

  /* one frame off the tape: her, and a leather glove over half the lens */
  function paintPhoto() {
    const c = $('#photoCanvas'), g = c.getContext('2d');
    g.fillStyle = '#050810'; g.fillRect(0, 0, c.width, c.height);
    if (!faces) return;
    // soft focus without ctx.filter: shrink, then stretch back up
    const small = document.createElement('canvas'); small.width = 200; small.height = 150;
    const s = small.getContext('2d');
    s.translate(124, 86); s.rotate(-.34);
    s.drawImage(faces.closed, -75, -100, 150, 200);
    s.setTransform(1, 0, 0, 1, 0, 0);
    Scene.glove(s, 38, 158, .5, .36);
    g.globalAlpha = .8; g.drawImage(small, 0, 0, c.width, c.height);
    g.globalAlpha = .22; g.drawImage(small, 12, 0, c.width, c.height);
    g.globalAlpha = 1;
    g.fillStyle = 'rgba(69,123,157,.18)'; g.fillRect(0, 0, c.width, c.height);
    const v = g.createRadialGradient(360, 230, 60, 320, 230, 400);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.92)');
    g.fillStyle = v; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = 'rgba(0,0,0,.2)';
    for (let y = 0; y < c.height; y += 4) g.fillRect(0, y, c.width, 1.5);
    for (let y = 372; y < 402; y += 3) g.drawImage(c, 0, y, c.width, 3, Math.sin(y * 1.7) * 16, y, c.width, 3);
    for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(241,250,238,${Math.random() * .14})`; g.fillRect(Math.random() * c.width, Math.random() * c.height, 3, 1.5); }
    g.font = '700 19px "Courier Prime", monospace'; g.fillStyle = '#f1faee';
    g.fillText('PLAY ▶  SP', 20, 34); g.fillText('FITA 3 · 03:33:07', 20, c.height - 20);
  }
  $('#viewPhoto').addEventListener('click', e => {
    const open = $('#photo').classList.toggle('open');
    e.currentTarget.setAttribute('aria-expanded', String(open));
    e.currentTarget.textContent = open ? 'Esconder' : 'Ver';
    if (open) { paintPhoto(); Sound.play('tape'); }
  });

  /* ---------- pricing + faq ---------- */
  $$('.plan-btn').forEach(btn => {
    const original = btn.textContent;
    let t;
    btn.addEventListener('click', () => {
      btn.textContent = btn.dataset.reply;
      btn.classList.remove('said'); void btn.offsetWidth; btn.classList.add('said');
      Sound.play('ticket');
      if (btn.closest('.forever') || dread > .7) setTimeout(() => Sound.play('knock'), 620);
      clearTimeout(t); t = setTimeout(() => { btn.textContent = original; }, 2600);
    });
  });
  $$('.qa button').forEach(btn => btn.addEventListener('click', () => {
    const open = btn.getAttribute('aria-expanded') !== 'true';
    btn.setAttribute('aria-expanded', String(open));
    Sound.play('type');
    if (open) setTimeout(() => Sound.play('whisper'), 1100);
  }));

  /* ---------- headings that slip ---------- */
  const headings = $$('.glitch');
  setInterval(() => {
    if (reducedQ.matches || document.hidden) return;
    const h = headings.find(el => { const r = el.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; });
    if (!h || h.dataset.busy) return;
    const text = h.textContent;
    h.dataset.busy = '1';
    h.textContent = h.dataset.alt;
    setTimeout(() => { h.textContent = text; delete h.dataset.busy; }, 380);
  }, 3400);

  /* ---------- flashlight ---------- */
  const beam = $('#beam'), eyesA = $('#eyesA'), eyesB = $('#eyesB'), hint = $('#darkHint');
  const light = { x: innerWidth / 2, y: innerHeight * .55, tx: innerWidth / 2, ty: innerHeight * .55, last: -1e9 };
  const aim = e => {
    light.tx = e.clientX;
    light.ty = e.clientY - (e.pointerType === 'touch' ? 70 : 0);
    light.last = performance.now();
  };
  addEventListener('pointermove', aim, { passive: true });
  addEventListener('pointerdown', aim, { passive: true });
  addEventListener('touchmove', e => aim({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY, pointerType: 'touch' }), { passive: true });

  function placeEyes(el, fx, fy, p, from) {
    const x = fx * innerWidth, y = fy * innerHeight;
    el.style.left = `${x}px`; el.style.top = `${y}px`;
    const near = Math.hypot(light.x - x, light.y - y) < Math.max(innerWidth, innerHeight) * .24;
    el.classList.toggle('on', p > from && !near);
    el.classList.toggle('hide', near);         // gone the instant you look
  }
  function flashlight(now, p) {
    if (now - light.last > 2600) {             // idle: the beam wanders by itself
      const t = now / 1000;
      light.tx = innerWidth * (.5 + .34 * Math.sin(t * .55));
      light.ty = innerHeight * (.5 + .22 * Math.sin(t * .83 + 1));
    }
    light.x += (light.tx - light.x) * .09;
    light.y += (light.ty - light.y) * .09;
    const r = dark.firstElementChild.getBoundingClientRect();
    const shrink = 1 - .38 * clamp((p - .55) / .45);   // the battery is going
    beam.style.transform = `translate3d(${light.x - r.left}px, ${light.y - r.top}px, 0) scale(${shrink})`;
    beam.style.opacity = 1;
    placeEyes(eyesA, p < .6 ? .84 : .17, p < .6 ? .34 : .28, p, .18);
    placeEyes(eyesB, .62, .74, p, .5);
    hint.style.opacity = p < .22 ? 1 : 0;
    const gone = clamp((p - .9) / .1);
    dark.firstElementChild.style.opacity = 1 - gone;
  }

  /* ---------- finale ---------- */
  const canvas = $('#scene'), ctx = canvas.getContext('2d');
  const caption = $('#caption'), keep = $('#keep'), end = $('#end');
  let shown = 0, lungeAt = -1, ended = false, endAt = 0, prevShown = 0, captionText = '', smileAt = 0;

  function sizeCanvas() {
    const dpr = Math.min(devicePixelRatio || 1, 1.75);
    const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  }
  const crossed = at => prevShown < at && shown >= at;

  function finaleFrame(now, dt, target) {
    sizeCanvas();
    if (lungeAt < 0) {
      // scroll leads, but never faster than the film can play
      const max = dt * .17;
      prevShown = shown;
      shown += clamp(target - shown, -max * 3, max);
      if (crossed(.14)) Sound.play('sting');
      if (crossed(.21)) Sound.play('kettle');
      if (crossed(.338)) Sound.play('creak');
      if (crossed(.40)) Sound.play('knock');
      if (crossed(.47)) Sound.play('breath2');
      if (crossed(.568)) Sound.play('thud');
      if (crossed(.715)) Sound.play('tape');
      if (crossed(.775)) Sound.play('whisper');
      if (crossed(.838)) Sound.hush();
      if (crossed(.874)) Sound.play('waltz');
      Sound.film(shown > .01 && shown < .715);
      // the smile can only be held so long
      if (shown < .884) smileAt = 0; else smileAt ||= now;
      if (faces && (shown >= .955 || (smileAt && now - smileAt > 9000))) { lungeAt = now; Sound.hush(); Sound.play('scream'); }
    }
    const lunge = lungeAt < 0 ? -1 : (now - lungeAt) / 1000;
    Scene.draw(ctx, canvas.width, canvas.height, shown, now / 1000, { faces, lunge, reduced: reducedQ.matches });

    const line = lunge < 0 && Scene.CAPTIONS.find(([a, b]) => shown >= a && shown < b);
    if (line) {
      const text = line[2].replace('{name}', name ? `, ${name}` : '');
      if (text !== captionText) { captionText = text; caption.textContent = text; }
    }
    caption.classList.toggle('show', !!line);
    caption.classList.toggle('scream', !!line && shown > .76 && shown < .86);
    keep.style.opacity = (shown < .73 || (shown > .89 && shown < .95)) && lunge < 0 ? 1 : 0;

    if (lunge > 2.4 && !ended) {
      ended = true; endAt = now;
      const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
      $('#endClock').textContent = `O relógio marca ${time}. Tem certeza de que não tem mais ninguém aí?`;
      end.classList.add('show');
      Sound.mood(.8);
    }
    if (ended) {
      const s = Math.floor((now - endAt) / 1000) + 7;
      $('#endTimer').textContent = [s / 3600, (s / 60) % 60, s % 60].map(n => String(Math.floor(n)).padStart(2, '0')).join(':');
    }
  }
  function resetFinale() {
    shown = prevShown = smileAt = 0; lungeAt = -1; ended = false; captionText = '';
    Sound.film(false);
    end.classList.remove('show');
  }

  /* ---------- waking up (or not) ---------- */
  const curtain = $('#curtain');
  function goTop(after) {
    curtain.classList.add('on');
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'instant' });
      resetFinale();
      after?.();
      setTimeout(() => curtain.classList.remove('on'), 120);
    }, 220);
  }
  $('#wake').addEventListener('click', () => goTop(() => {
    woke = true;
    document.body.classList.add('woke');
    $('#heroTitle').textContent = name ? `Você voltou, ${name}.` : 'Você voltou.';
    $('#heroLede').textContent = 'Foi só um instante. A água continuou no fogo. Tem uma coisa nova na sua lata.';
    $('#canTitle').textContent = 'Ainda é noite';
    $('#factScore').textContent = '0 de 100';
    $('#factDurLabel').textContent = 'Tempo observando';
    $('#factDur').textContent = 'a noite toda';
    $('#factRec').textContent = '1 nova';
    $('#cidaSays').textContent = '“Você nem provou.”';
    portrait.classList.add('wide');
  }));
  // Esc is always the way out.
  addEventListener('keydown', e => {
    if (e.key !== 'Escape' || scrollY < 10) return;
    setSound(false); goTop();
  });

  /* ---------- tab title ---------- */
  const favicon = $('#favicon'), calmIcon = favicon.href;
  const eyeIcon = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><circle cx='16' cy='16' r='16' fill='%230b1424'/><circle cx='10' cy='12' r='2.4' fill='%23f1faee'/><circle cx='22' cy='12' r='2.4' fill='%23f1faee'/><path d='M6 19q10 14 20 0q-10 5-20 0z' fill='%23e63946'/></svg>";
  let titleState = '';
  function setTitle() {
    let t = calmTitle;
    if (document.hidden && dread > .4) t = 'volta aqui';
    else if (dread > .84) t = 'sorria de volta';
    else if (dread > .6) t = 'Último Gole — o café está esfriando';
    else if (dread > .35) t = 'Último Gole — Beba. Não acorde.';
    else if (woke) t = 'Último Gole — (1) gravação nova';
    if (t === titleState) return;
    titleState = t; document.title = t;
    const icon = dread > .6 ? eyeIcon : calmIcon;
    if (favicon.href !== icon) favicon.href = icon;
  }
  document.addEventListener('visibilitychange', setTitle);

  /* ---------- the loop ---------- */
  function measure() {
    const mid = scrollY + innerHeight * .5;
    let d = 0;
    for (let i = 0; i < sections.length; i++) {
      const s = sections[i], next = sections[i + 1];
      const top = s.offsetTop;
      if (mid < top) break;
      const a = +s.dataset.dread, b = next ? +next.dataset.dread : 1;
      d = a + (b - a) * clamp((mid - top) / s.offsetHeight);
    }
    return scrollY < 40 ? 0 : d;
  }
  const progress = el => clamp((scrollY - el.offsetTop) / (el.offsetHeight - innerHeight));

  const SCORES = { 'Rolo 1 · 1918': 'farm', 'Rolo 2 · 1979': 'seventies', 'Rolo 3 · 1985': 'eighties' };
  let last = performance.now(), prevAct = '';
  function frame(now) {
    const dt = Math.min(.2, (now - last) / 1000); last = now;
    dread = measure();

    // nav takes the tone of whatever sits beneath it
    let tone = 'light', reel = '', here = sections[0];
    for (const s of sections) {
      if (s.offsetTop <= scrollY + 40) tone = s.dataset.tone;
      if (s.offsetTop <= scrollY + innerHeight * .5) { reel = s.dataset.reel; here = s; }
    }
    if (nav.dataset.tone !== tone) nav.dataset.tone = tone;
    if (reel && reelName.textContent !== reel) reelName.textContent = reel;
    progressBar.style.transform = `scaleX(${clamp(scrollY / (document.documentElement.scrollHeight - innerHeight)).toFixed(4)})`;
    parallax(); runStrip(); runCards();

    const act = dread > .6 ? 'late' : dread > .3 ? 'mid' : 'calm';
    if (act !== prevAct) {
      prevAct = act;
      document.body.classList.toggle('late', act === 'late');
      $('#navCta').textContent = act === 'late' ? 'Fica' : act === 'mid' ? 'Beber agora' : 'Provar';
      $('#wordmark').textContent = act === 'late' ? 'último.' : 'Último Gole';
    }

    const inFinale = scrollY + innerHeight > finale.offsetTop;
    document.body.classList.toggle('in-finale', inFinale);
    const fade = inFinale ? clamp((finale.offsetTop - scrollY) / innerHeight) : 1;
    vignette.style.opacity = (clamp((dread - .3) / .5) * .85 * fade).toFixed(3);
    grain.style.opacity = (clamp((dread - .18) / .7) * .075).toFixed(3);

    const dr = dark.getBoundingClientRect();
    if (dr.top < innerHeight && dr.bottom > 0) flashlight(now, progress(dark));

    if (inFinale) finaleFrame(now, dt, progress(finale));
    else if (shown || lungeAt >= 0) resetFinale();

    // the score follows the reel; the silence before the face is left alone
    Sound.scene(here === finale ? (ended ? 'end' : 'finale') : here === dark ? 'barn' : SCORES[reel] || 'farm');
    if (!(inFinale && (shown > .835 || ended))) Sound.mood(woke ? Math.max(dread, .3) : dread);
    setTitle();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* Prepare the face once the page has settled. */
  const start = () => Face.render().then(f => { faces = f; window.__faces = f; if ($('#photo').classList.contains('open')) paintPhoto(); });
  if (document.readyState === 'complete') setTimeout(start, 700);
  else addEventListener('load', () => setTimeout(start, 700));
})();
