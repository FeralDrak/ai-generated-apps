'use strict';
/* ==========================================================================
   Interface : HUD, inspecteur (caryotype), carnet, plan, réglages.
   ========================================================================== */

const $ = (id) => document.getElementById(id);
const SEASON_ICONS = ['🌱', '☀️', '🍂', '❄️'];
const SPEED_LABELS = ['⏸', '×½', '×1', '×3', '×10', '×30'];

const UI = {
  started: false, logs: [], t: 0, tSlow: 0, mapOpen: false, journalOpen: false, tab: 'seeds',
  insp: null, karyoKey: '', karyoCells: [], lastSpecToast: 0,

  init() {
    this.buildToolbar();
    this.updateCarry();
    // souris sur la scène
    const cv = $('scene');
    cv.addEventListener('mousedown', (e) => {
      if (!this.started) return;
      Sound.resume();
      if (Player.noLock) {
        // mode de repli : glisser = regarder, clic bref = utiliser l'outil
        if (this.journalOpen) return;
        $('menu').classList.add('hidden');
        if (e.button === 0) { Player.dragging = true; Player.dragDist = 0; if (Tools.tool() === 'arrosoir') Tools.press(0); }
        else Tools.press(e.button);
        return;
      }
      if (!Player.locked) { if (!this.journalOpen) Player.lock(); return; }
      Tools.press(e.button);
    });
    window.addEventListener('mouseup', (e) => {
      if (Player.noLock && e.button === 0 && Player.dragging) {
        Player.dragging = false;
        if (Player.dragDist < 6 && Tools.tool() !== 'arrosoir') { Tools.pick(); Tools.press(0); }
      }
      Tools.release(e.button);
    });
    window.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('wheel', (e) => {
      if (!Player.active() || e.target !== $('scene') && !Player.locked) return;
      Tools.select(Tools.cur + (e.deltaY > 0 ? 1 : -1));
    }, { passive: true });
    document.addEventListener('keydown', (e) => this.key(e));
    window.addEventListener('resize', () => View.resize());
    // inspecteur
    $('iClose').onclick = () => { Tools.pin = null; Tools.clonePlant = null; this.inspector(null); };
    const k = $('karyo');
    k.addEventListener('mousemove', (e) => this.karyoHover(e));
    k.addEventListener('mouseleave', () => $('tooltip').classList.add('hidden'));
    // carnet
    $('jClose').onclick = () => this.toggleJournal(false);
    document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => this.setTab(b.dataset.tab));
    // réglages
    const sp = $('mSpeed');
    SPEED_LABELS.forEach((l, i) => { const b = document.createElement('button'); b.textContent = l; b.onclick = () => { Game.setSpeed(i); this.syncMenu(); }; sp.appendChild(b); });
    $('mDay').querySelectorAll('button').forEach(b => b.onclick = () => { Sky.cycle = b.dataset.v === 'cycle'; this.syncMenu(); this.save(); });
    $('mHour').oninput = (e) => { Sky.tod = +e.target.value; this.syncMenu(); };
    $('mGrass').querySelectorAll('button').forEach(b => b.onclick = () => { View.quality.grass = +b.dataset.v; View.setGrassQuality(+b.dataset.v); this.syncMenu(); this.save(); });
    $('mShadow').querySelectorAll('button').forEach(b => b.onclick = () => { View.setShadows(b.dataset.v === '1'); this.syncMenu(); this.save(); });
    $('mSens').oninput = (e) => { Player.sens = +e.target.value; this.save(); };
    $('mVol').oninput = (e) => { Sound.setVolume(+e.target.value); this.save(); };
    $('mResume').onclick = () => Player.lock();
    $('mJournal').onclick = () => this.toggleJournal(true);
    $('mNew').onclick = () => { if (confirm('Recommencer avec un nouveau pré ? Le pré actuel sera perdu.')) Game.newMeadow(); };
    this.load();
  },
  save() {
    try { localStorage.setItem('gg-settings', JSON.stringify({ sens: Player.sens, vol: Sound.vol, grass: View.quality.grass, shadows: View.quality.shadows, cycle: Sky.cycle })); } catch (e) { }
  },
  load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem('gg-settings')); } catch (e) { }
    if (!s) return;
    if (s.sens) Player.sens = s.sens;
    if (s.vol !== undefined) Sound.vol = s.vol;
    if (s.grass !== undefined) { View.quality.grass = s.grass; View.setGrassQuality(s.grass); }
    if (s.shadows === false) View.setShadows(false);
    if (s.cycle === false) Sky.cycle = false;
  },
  syncMenu() {
    const on = (sel, pred) => document.querySelectorAll(sel).forEach((b, i) => b.classList.toggle('on', pred(b, i)));
    on('#mSpeed button', (b, i) => i === Game.speedIdx);
    on('#mDay button', (b) => (b.dataset.v === 'cycle') === Sky.cycle);
    on('#mGrass button', (b) => +b.dataset.v === View.quality.grass);
    on('#mShadow button', (b) => (b.dataset.v === '1') === View.quality.shadows);
    $('mHour').value = Sky.tod; $('mHourTxt').textContent = 'Heure : ' + Sky.timeLabel();
    $('mSens').value = Player.sens; $('mVol').value = Sound.vol;
  },

  /* ---------- Clavier ---------- */
  key(e) {
    if (!this.started) return;
    const c = e.code;
    if (c.startsWith('Digit')) { const n = +c.slice(5); if (n >= 1 && n <= TOOLS.length) Tools.select(n - 1); return; }
    switch (c) {
      case 'KeyC': this.toggleJournal(); break;
      case 'KeyM': this.mapOpen = !this.mapOpen; $('mapWrap').classList.toggle('hidden', !this.mapOpen); if (this.mapOpen) this.drawMap(); break;
      case 'KeyH': document.body.classList.toggle('nohud'); break;
      case 'KeyT': Game.setSpeed(Game.speedIdx >= SPEED_LABELS.length - 1 ? 1 : Game.speedIdx + 1); break;
      case 'KeyP': Game.setSpeed(Game.speedIdx === 0 ? (Game.prevSpeed || 2) : 0); break;
      case 'KeyV': if (Player.active()) Player.toggleFly(); break;
      case 'Escape':
        if (this.journalOpen) { this.journalOpen = false; $('journal').classList.add('hidden'); $('menu').classList.remove('hidden'); this.syncMenu(); }
        else if (this.mapOpen) { this.mapOpen = false; $('mapWrap').classList.add('hidden'); }
        else if (Player.noLock) { $('menu').classList.toggle('hidden'); this.syncMenu(); }
        break;
    }
  },
  modalOpen() { return this.journalOpen; },
  onLockChange(locked) {
    if (!this.started) return;
    $('menu').classList.toggle('hidden', locked || this.journalOpen || Player.noLock);
    $('lockHint').classList.toggle('hidden', locked || this.journalOpen || true);
    if (!locked && !this.journalOpen) this.syncMenu();
    $('cross').style.opacity = locked || Player.noLock ? 1 : 0.3;
  },
  toggleJournal(force) {
    this.journalOpen = force !== undefined ? force : !this.journalOpen;
    $('journal').classList.toggle('hidden', !this.journalOpen);
    if (this.journalOpen) { Player.unlock(); $('menu').classList.add('hidden'); this.refreshJournal(); }
    else Player.lock();
    $('tooltip').classList.add('hidden');
  },
  setTab(t) {
    this.tab = t;
    document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
    document.querySelectorAll('.j-body section').forEach(s => s.classList.toggle('on', s.dataset.tab === t));
    this.refreshJournal();
  },

  /* ---------- Notifications ---------- */
  toast(text, type = 'info') {
    const box = $('toasts');
    const d = document.createElement('div');
    d.className = 'toast ' + type; d.textContent = text;
    box.appendChild(d);
    while (box.children.length > 4) box.removeChild(box.firstChild);
    setTimeout(() => d.classList.add('out'), type === 'event' ? 5200 : 3600);
    setTimeout(() => d.remove(), type === 'event' ? 6000 : 4300);
    if (type === 'event' || type === 'good') this.log(text);
  },
  log(text) {
    this.logs.push({ day: Eco.day, text });
    if (this.logs.length > 200) this.logs.shift();
    if (this.journalOpen && this.tab === 'chron') this.refreshJournal();
  },
  onEvent(kind, d) {
    if (!this.started) return;
    const near = (p) => Math.hypot(p.x - Player.pos.x, p.z - Player.pos.z);
    switch (kind) {
      case 'season':
        this.toast(['Le printemps s’éveille sur le pré', 'L’été s’installe sur le pré', 'L’automne dore le pré', 'L’hiver recouvre le pré'][d], 'event');
        Sound.chime();
        break;
      case 'treeDied':
        if (d.felled) break;
        this.toast(`${d.kind === 'arbre' ? 'Un arbre' : 'Un arbuste'} s’éteint : ${d.name}, ${Math.floor(d.age / YEAR_DAYS)} ans`, 'event');
        break;
      case 'treeLanded': {
        const dist = near(d);
        Fx.treeDust(d);
        Sound.thud(Sound.panOf(d), clamp(0.35 - dist * 0.006, 0.03, 0.35));
        if (!d.felled) this.log(`Un ${d.kind} mort s’est effondré (${d.name})`);
        break;
      }
      case 'newSpecies': {
        const now = performance.now();
        if (now - this.lastSpecToast > 6000) { this.toast(`Nouvelle variété observée : ${d.name}`, 'event'); Sound.chime(); this.lastSpecToast = now; }
        else this.log(`Nouvelle variété observée : ${d.name}`);
        break;
      }
      case 'influx': this.log('Le vent a apporté des graines sauvages'); break;
      case 'playerSeedling': this.toast(`Une graine issue de votre pollinisation a germé : ${d.name}`, 'good'); break;
    }
  },

  /* ---------- Barre d'outils ---------- */
  buildToolbar() {
    const tb = $('toolbar'); tb.innerHTML = '';
    TOOLS.forEach((t, i) => {
      const s = document.createElement('div');
      s.className = 'slot'; s.innerHTML = `<span class="k">${i + 1}</span>${t.icon}`;
      tb.appendChild(s);
    });
    this.updateToolbar();
  },
  updateToolbar() {
    document.querySelectorAll('#toolbar .slot').forEach((s, i) => s.classList.toggle('on', i === Tools.cur));
    const t = TOOLS[Tools.cur];
    $('toolHint').innerHTML = `<span class="tname">${t.name}</span>${t.hint}`;
    this.updateCarry();
  },
  swatchHTML(ph, cls = '') {
    return `<div class="swatch ${cls}" style="background:${cssColor(ph.petalC)};--c2:${cssColor(ph.centerC)}"></div>`;
  },
  updateCarry() {
    const out = [];
    if (Tools.pollen) out.push(`<div class="chip">${this.swatchHTML(Tools.pollen.g.ph)}Pollen : <i>${Tools.pollen.name}</i></div>`);
    if (Tools.scion) out.push(`<div class="chip"><div class="swatch" style="background:${cssColor(Tools.scion.g.ph.leafC)};--c2:${cssColor(Tools.scion.g.ph.petalC)}"></div>Greffon : <i>${Tools.scion.name}</i></div>`);
    if (Tools.tool() === 'semoir') {
      const gs = Tools.seedGroups();
      if (gs.length) {
        Tools.seedSel = Math.min(Tools.seedSel, gs.length - 1);
        const g = gs[Tools.seedSel];
        out.push(`<div class="chip">${this.swatchHTML(g.ph)}Graine : <i>${g.name}</i> ×${g.seeds.length} <small>(${Tools.seedSel + 1}/${gs.length})</small></div>`);
      } else out.push('<div class="chip">Sachet vide</div>');
    }
    $('carry').innerHTML = out.join('');
  },

  /* ---------- Boucle d'interface ---------- */
  frame(dt) {
    this.t += dt; this.tSlow += dt;
    if (this.t >= 0.12) { this.t = 0; this.updateAim(); }
    if (this.tSlow >= 0.4) {
      this.tSlow = 0;
      const E = Eco.E;
      $('seasonIcon').textContent = SEASON_ICONS[E.season];
      $('seasonName').textContent = SEASONS[E.season];
      $('yearTxt').textContent = 'an ' + E.year;
      $('seasonBar').style.left = (E.doy / YEAR_DAYS * 100).toFixed(2) + '%';
      $('todTxt').textContent = Sky.timeLabel() + (Sky.cycle ? '' : ' · figé');
      $('speedTxt').textContent = Game.speedIdx === 0 ? '⏸ pause' : 'temps ' + SPEED_LABELS[Game.speedIdx];
      $('stHerb').textContent = Eco.live.herbe;
      $('stTree').textContent = Eco.live.arbre + Eco.live.arbuste;
      $('stSeed').textContent = Eco.seeds.length;
      $('stSpec').textContent = Eco.census.length;
      if (this.insp) this.refreshInspector();
      if (this.mapOpen) this.drawMap();
      if (!Player.locked && !$('menu').classList.contains('hidden')) $('mHourTxt').textContent = 'Heure : ' + Sky.timeLabel();
    }
  },
  updateAim() {
    const a = Tools.aim, tip = $('aimTip'), id = Tools.tool();
    $('cross').classList.toggle('on', !!a || ((id === 'semoir' || id === 'arrosoir') && !!Tools.ground));
    if (!Player.active()) { tip.innerHTML = ''; return; }
    if (a) {
      const p = a.plant, s = a.seg;
      let t2 = p.stateLabel();
      if (a.bloom) t2 += ' · ' + bloomLabel(a.bloom);
      else t2 += ` · tronçon #${s.idx}`;
      const branch = s.g !== p.g && s.g.name !== p.name ? `<div class="t2">ce rameau exprime <i>${s.g.name}</i></div>` : '';
      tip.innerHTML = `<div class="t1">${p.name}</div><div class="t2">${t2}</div>${branch}`;
    } else if ((id === 'semoir' || id === 'arrosoir') && Tools.ground) {
      tip.innerHTML = `<div class="t2">${inWater(Tools.ground.x, Tools.ground.z) ? 'Eau' : 'Sol'} · ${Tools.ground.t.toFixed(1)} m</div>`;
    } else tip.innerHTML = '';
  },

  /* ---------- Inspecteur ---------- */
  inspector(pin) {
    this.insp = pin;
    $('inspector').classList.toggle('hidden', !pin);
    this.karyoKey = '';
    if (pin) this.refreshInspector();
  },
  refreshInspector() {
    const pin = this.insp, p = pin.plant;
    if (!p || p.gone) { this.inspector(null); Tools.pin = null; return; }
    let s = pin.seg;
    if (!p.segs.includes(s)) s = pin.seg = p.root;
    const ph = p.ph, sph = s.g.ph;
    $('iSwatch').outerHTML = `<div id="iSwatch" class="swatch big" style="background:${cssColor(ph.petalC)};--c2:${cssColor(ph.centerC)}"></div>`;
    $('iName').textContent = p.name;
    $('iSub').textContent = `${kindLabel(ph)} · génération ${p.gen} · spécimen n° ${p.id}`;
    let open = 0, tot = 0, fr = 0;
    for (const b of p.blooms) { if (b.state !== 'spent') tot++; if (b.state === 'open') open++; if (b.state === 'fruit') fr++; }
    const par = !p.mother ? (p.gen === 0 ? 'population fondatrice' : '—')
      : (p.selfed ? `${p.mother.name} (autofécondation)` : `♀ ${p.mother.name}<br>♂ ${p.father.name}`);
    const lin = new Set(p.segs.map(x => x.g)).size;
    const rows = [
      ['État', p.stateLabel() + (p.watered > 0 ? ' · arrosée 💧' : '')],
      ['Âge', fmtAge(p.age, p.woody)],
      ['Hauteur', p.top < 2 ? (p.top * 100).toFixed(0) + ' cm' : p.top.toFixed(1) + ' m'],
      ['Vigueur', `<span class="bar2"><i style="width:${Math.round(p.vigor * 100)}%"></i></span>${Math.round(p.vigor * 100)} %`],
      ['Tronçons', `${p.segs.length} · ${lin} lignée${lin > 1 ? 's' : ''} d’ADN`],
      ['Fleurs', tot ? `${open} ouverte${open > 1 ? 's' : ''} / ${tot}${fr ? ` · ${fr} fruit${fr > 1 ? 's' : ''}` : ''}` : '—'],
      ['Graines', p.seedsMade ? `${p.seedsMade} dispersées` : '—'],
      ['Parents', par],
    ];
    if (p.byPlayer) rows.push(['Origine', 'issue de votre pollinisation ✿']);
    $('iInfo').innerHTML = rows.map(r => `<dt>${r[0]}</dt><dd>${r[1]}</dd>`).join('');
    // tronçon
    const parts = [];
    parts.push(`<b>Tronçon n° ${s.idx}</b> · ${s.depth === 0 ? 'base' : 'génération ' + s.depth} · ${fmtLen(s.len)} · Ø ${fmtLen(s.rad * 2)}`);
    if (s.dead) parts.push('<span class="tag">rameau mort</span>');
    if (!s.parent) parts.push('<span class="tag">ADN de la graine</span> tronçon fondateur, issu directement de la fécondation');
    else if (s.grafted) parts.push('<span class="tag graft">greffon</span> ADN apporté par greffe');
    else {
      const diff = s.g.diff(s.parent.g);
      if (!diff.length) parts.push('<span class="tag">clone</span> ADN identique au tronçon parent');
      else parts.push(`<span class="tag mut">${s.induced ? 'mutation induite' : 'mutation somatique'}</span> ${diff.map(i => GENES[i].n.toLowerCase()).join(', ')}`);
    }
    const fromRoot = s.g.diff(p.g);
    if (s.parent && fromRoot.length) parts.push(`${fromRoot.length} gène${fromRoot.length > 1 ? 's' : ''} diffère${fromRoot.length > 1 ? 'nt' : ''} de l’ADN de la graine`);
    if (s.g.name !== p.name) parts.push(`Ce rameau exprime : <b><i>${s.g.name}</i></b>`);
    if (pin.bloom && p.blooms.includes(pin.bloom)) {
      const b = pin.bloom;
      let t = `<b>Fleur</b> : ${bloomLabel(b)}`;
      const fathers = b.pollen.filter(x => !x.self).map(x => x.name);
      if (b.pollen.length) t += ` — pollen reçu de ${b.pollen.some(x => x.self) ? 'elle-même' : ''}${fathers.length && b.pollen.some(x => x.self) ? ', ' : ''}${[...new Set(fathers)].map(n => '<i>' + n + '</i>').join(', ')}`;
      parts.push(t);
    }
    $('iSeg').innerHTML = parts.join('<br>');
    // caryotype
    const key = s.g.id + ':' + (s.parent ? s.parent.g.id : 0);
    if (key !== this.karyoKey) { this.karyoKey = key; this.drawKaryo(s); this.traits(s.g); }
    // lignées clonales
    if (Tools.clonePlant === p) {
      const m = new Map();
      for (const x of p.segs) { if (!m.has(x.g)) m.set(x.g, []); m.get(x.g).push(x); }
      const lines = [...m.entries()].sort((a, b) => b[1].length - a[1].length).map(([g, segs]) => {
        const c = cloneColor(g, p);
        const d = g === p.g ? 'ADN de la graine' : g.diff(p.g).map(i => GENES[i].n.toLowerCase()).slice(0, 3).join(', ') + (g.diff(p.g).length > 3 ? '…' : '');
        return `<div class="cl"><div class="swatch" style="background:${cssColor(c)}"></div><span>${segs.length} tronçon${segs.length > 1 ? 's' : ''} — ${d}${g.name !== p.name ? ` · <i>${g.name}</i>` : ''}</span></div>`;
      });
      $('iClones').innerHTML = `<div class="i-sec">Vue clonale <small>${m.size} lignée${m.size > 1 ? 's' : ''}</small></div>` + lines.join('');
    } else $('iClones').innerHTML = '';
  },
  traits(g) {
    const ph = g.ph, T = (k) => geneText(GI[k], g.expr(GI[k]), ph);
    const L = [
      ['Port', [kindLabel(ph).toLowerCase(), T('stature'), T('generations'), T('courbure'), T('apical')]],
      ['Feuilles', [T('fForme'), T('fLobes'), T('fTeinte')]],
      ['Fleurs', [`${ph.petals} pétales ${tipLabel(ph.tip)}`, T('pCoupe'), T('verticilles'), T('inflorescence')]],
      ['Couleurs', [T('teinte') + (ph.light > 0.84 && ph.sat < 0.5 ? ' (presque blanc)' : ''), 'motif : ' + MOTIFS[ph.motif].toLowerCase() + (ph.motif ? ' ' + colorWord(ph.hue2, 0.9, 0.5)[1] : ''), T('coeurTeinte')]],
      ['Cycle', [T('precocite'), T('longevite'), T('dispersion'), T('nectar')]],
    ];
    $('iTraits').innerHTML = L.map(([k, v]) => `<b>${k}</b> — ${v.join(', ')}`).join('<br>');
  },
  drawKaryo(s) {
    const cv = $('karyo'), dpr = window.devicePixelRatio || 1;
    const W = 344, H = 236;
    if (cv.width !== W * dpr) { cv.width = W * dpr; cv.height = H * dpr; }
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const g = s.g, mut = s.parent ? s.g.diff(s.parent.g) : [];
    const x0 = 58, cw = 35, rowH = 46;
    this.karyoCells = [];
    ctx.font = '600 15px "Cormorant Garamond", serif';
    for (let c = 0; c < 5; c++) {
      const y = 4 + c * rowH;
      ctx.fillStyle = '#e9c46a'; ctx.textAlign = 'left';
      ctx.font = '600 16px "Cormorant Garamond", serif';
      ctx.fillText(CHROMOSOMES[c].n, 2, y + 20);
      ctx.fillStyle = '#9a9a88'; ctx.font = '10px Inter, sans-serif';
      ctx.fillText(CHROMOSOMES[c].label, 2, y + 33);
      // contour du chromosome
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      roundRect(ctx, x0 - 3, y + 5, cw * 8 + 6, 30, 12); ctx.fill();
      for (let k = 0; k < 8; k++) {
        const i = c * 8 + k, x = x0 + k * cw;
        for (let st = 0; st < 2; st++) {
          const v = g.a[2 * i + st];
          const col = alleleColor(i, v);
          ctx.fillStyle = cssColor(col);
          const yy = y + 8 + st * 13;
          const r = k === 0 ? [6, 1, 1, 6] : k === 7 ? [1, 6, 6, 1] : 1.5;
          roundRect(ctx, x + 1, yy, cw - 2, 11, r); ctx.fill();
          if (GENES[i].t === 'd' && v === Math.max(g.a[2 * i], g.a[2 * i + 1])) {
            ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(x + cw - 6, yy + 5.5, 2, 0, 7); ctx.fill();
          }
        }
        if (k === 3) { ctx.fillStyle = 'rgba(15,20,16,0.9)'; ctx.fillRect(x + cw - 1.5, y + 5, 3, 3); ctx.fillRect(x + cw - 1.5, y + 32, 3, 3); }
        if (mut.includes(i)) {
          ctx.fillStyle = '#f09a50';
          ctx.beginPath(); ctx.moveTo(x + cw / 2 - 5, y + 1); ctx.lineTo(x + cw / 2 + 5, y + 1); ctx.lineTo(x + cw / 2, y + 7); ctx.fill();
        }
        this.karyoCells.push({ i, x, y: y + 5, w: cw, h: 30 });
      }
      // phénotype exprimé : fine barre sous le chromosome
      for (let k = 0; k < 8; k++) {
        const i = c * 8 + k, x = x0 + k * cw;
        ctx.fillStyle = cssColor(alleleColor(i, g.expr(i)));
        ctx.fillRect(x + 5, y + 38, cw - 10, 3);
      }
    }
  },
  karyoHover(e) {
    const r = $('karyo').getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
    const tt = $('tooltip');
    const cell = this.karyoCells.find(c => mx >= c.x && mx < c.x + c.w && my >= c.y && my < c.y + c.h + 8);
    if (!cell || !this.insp) { tt.classList.add('hidden'); return; }
    const s = this.insp.seg, g = s.g, i = cell.i, G = GENES[i];
    const a = g.a[2 * i], b = g.a[2 * i + 1], ex = g.expr(i);
    const mode = G.t === 'h' ? 'mélange des teintes' : G.t === 'd' ? 'dominance : l’allèle le plus fort s’exprime' : 'codominance : moyenne des allèles';
    const sw = (v) => `<span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${cssColor(alleleColor(i, v))};margin:0 3px -1px 0"></span>`;
    const mutd = s.parent && s.g.diff(s.parent.g).includes(i) ? '<br><span style="color:#f09a50">▲ muté par rapport au tronçon parent</span>' : '';
    tt.innerHTML = `<b>${G.n}</b> <small>chromosome ${CHROMOSOMES[G.chr].n}</small><br>${sw(a)}allèle 1 : ${a.toFixed(2)} &nbsp; ${sw(b)}allèle 2 : ${b.toFixed(2)}<br>exprimé : ${ex.toFixed(2)} → <i>${geneText(i, ex, g.ph)}</i><br><small>${mode}</small>${mutd}`;
    tt.classList.remove('hidden');
    tt.style.left = Math.min(window.innerWidth - 310, e.clientX + 14) + 'px';
    tt.style.top = (e.clientY + 14) + 'px';
  },

  /* ---------- Plan ---------- */
  drawMap() {
    const cv = $('map'), ctx = cv.getContext('2d'), W = cv.width, S = W / 100;
    if (!this.mapBg) {
      const img = ctx.createImageData(W, W);
      for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) {
        const x = i / S - 50, z = j / S - 50, h = terrainH(x, z);
        const n = terrainNormal(x, z);
        const sh = clamp(0.55 + (n[0] * -0.6 + n[2] * -0.5) * 1.8 + h * 0.05, 0.3, 1.1);
        let c = inWater(x, z) ? [60, 95, 120] : [84 * sh, 112 * sh, 62 * sh];
        const o = (j * W + i) * 4;
        img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = 255;
      }
      this.mapBg = document.createElement('canvas'); this.mapBg.width = this.mapBg.height = W;
      this.mapBg.getContext('2d').putImageData(img, 0, 0);
    }
    ctx.drawImage(this.mapBg, 0, 0);
    const X = (x) => (x + 50) * S, Z = (z) => (z + 50) * S;
    ctx.fillStyle = 'rgba(120,120,110,0.9)';
    for (const r of Eco.rocks) { ctx.beginPath(); ctx.arc(X(r.x), Z(r.z), r.r * S, 0, 7); ctx.fill(); }
    for (const p of Eco.plants) {
      if (p.woody) continue;
      const ob = p.blooms.find(b => b.state === 'open');
      ctx.fillStyle = ob ? cssColor(ob.seg.g.ph.petalC) : p.state === 'grow' ? '#79a35a' : '#8a7a55';
      ctx.fillRect(X(p.x) - 1, Z(p.z) - 1, ob ? 3 : 2, ob ? 3 : 2);
    }
    for (const p of Eco.plants) {
      if (!p.woody) continue;
      const c = p.state !== 'grow' ? [0.45, 0.42, 0.38] : p.autumn > 0.5 && !p.ph.evergreen ? p.ph.autumnC : p.ph.leafC;
      ctx.fillStyle = cssColor(c).replace('rgb', 'rgba').replace(')', ',0.62)');
      ctx.beginPath(); ctx.arc(X(p.x), Z(p.z), Math.max(2, p.crownR * S * 0.7), 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.stroke();
    }
    if (Tools.pin && !Tools.pin.plant.gone) {
      const p = Tools.pin.plant;
      ctx.strokeStyle = '#72e0f0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X(p.x), Z(p.z), Math.max(6, p.crownR * S + 3), 0, 7); ctx.stroke(); ctx.lineWidth = 1;
    }
    const px = X(Player.pos.x), pz = Z(Player.pos.z), a = Player.yaw;
    ctx.save(); ctx.translate(px, pz); ctx.rotate(-a);
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 40, -Math.PI / 2 - 0.6, -Math.PI / 2 + 0.6); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(5, 6); ctx.lineTo(-5, 6); ctx.closePath(); ctx.fill();
    ctx.restore();
  },

  /* ---------- Carnet ---------- */
  refreshJournal() {
    if (!this.journalOpen) return;
    if (this.tab === 'seeds') {
      const gs = Tools.seedGroups();
      $('seedList').innerHTML = gs.length ? gs.map((g, i) => {
        const s = g.seeds[0];
        const par = s.mother ? `${s.mother.name} × ${s.father.name}` : 'graine sauvage';
        const gen = Math.max(...g.seeds.map(x => x.gen || 0));
        return `<div class="card ${i === Tools.seedSel ? 'on' : ''}" data-i="${i}">${this.swatchHTML(g.ph, 'big')}<div><div class="nm">${g.name}</div><div class="meta">${kindLabel(g.ph)} · génération ${gen}<br>${par}${s.byPlayer ? ' · <span style="color:#a7d98b">votre croisement</span>' : ''}</div></div><div class="cnt">${g.seeds.length}</div></div>`;
      }).join('') : '<p class="lead">Votre sachet est vide. Récoltez des graines avec le sécateur (clic droit sur une plante qui porte des fruits mûrs).</p>';
      $('seedList').querySelectorAll('.card').forEach(el => el.onclick = () => { Tools.seedSel = +el.dataset.i; Tools.select(4); this.refreshJournal(); });
    } else if (this.tab === 'species') {
      $('specLead').textContent = `${Eco.census.length} variétés vivantes dans le pré · ${Eco.known.size} observées depuis le début.`;
      $('specList').innerHTML = Eco.census.map(e => {
        const k = Eco.known.get(e.name);
        const ph = e.sample.ph;
        return `<div class="row">${this.swatchHTML(ph)}<div class="nm">${e.name}</div><div class="k">${kindLabel(ph)}</div><div class="n">${e.n}</div><div class="d">apparue ${k ? fmtDate(k.day).toLowerCase() : ''}</div></div>`;
      }).join('');
    } else if (this.tab === 'chron') {
      this.drawPopChart(); this.drawHueChart();
      $('logList').innerHTML = this.logs.slice().reverse().map(l => `<div><span>${fmtDate(l.day)}</span>${l.text}</div>`).join('') || '<div>Rien à signaler pour l’instant.</div>';
    }
  },
  drawPopChart() {
    const cv = $('popChart'), ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
    ctx.clearRect(0, 0, W, H);
    const h = Eco.history;
    if (h.length < 2) { ctx.fillStyle = '#9a9a88'; ctx.font = '12px Inter'; ctx.fillText('Les courbes apparaîtront au fil des jours…', 10, 20); return; }
    const d0 = h[0].day, d1 = h[h.length - 1].day;
    const pad = { l: 34, r: 34, t: 10, b: 22 };
    const X = (d) => pad.l + (d - d0) / Math.max(1, d1 - d0) * (W - pad.l - pad.r);
    const maxH = Math.max(50, ...h.map(e => e.herbe)), maxW = Math.max(20, ...h.map(e => e.arbre + e.arbuste)), maxS = Math.max(10, ...h.map(e => e.species));
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.fillStyle = '#9a9a88'; ctx.font = '10px Inter';
    for (let y = 1; y <= yearOf(d1); y++) { const d = (y - 1) * YEAR_DAYS; if (d < d0) continue; const x = X(d); ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, H - pad.b); ctx.stroke(); ctx.fillText('an ' + y, x + 3, H - 8); }
    const line = (f, max, col, fill) => {
      ctx.beginPath();
      h.forEach((e, i) => { const x = X(e.day), y = H - pad.b - f(e) / max * (H - pad.t - pad.b); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke(); ctx.lineWidth = 1;
      if (fill) { ctx.lineTo(X(d1), H - pad.b); ctx.lineTo(X(d0), H - pad.b); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); }
    };
    line(e => e.herbe, maxH, '#a7d98b', 'rgba(167,217,139,0.12)');
    line(e => e.arbre + e.arbuste, maxW, '#c8a06a');
    line(e => e.species, maxS, '#e9c46a');
    ctx.font = '11px Inter';
    [['fleurs (max ' + maxH + ')', '#a7d98b'], ['ligneux (max ' + maxW + ')', '#c8a06a'], ['variétés (max ' + maxS + ')', '#e9c46a']].forEach(([t, c], i) => { ctx.fillStyle = c; ctx.fillText(t, pad.l + 4 + i * 150, pad.t + 10); });
  },
  drawHueChart() {
    const cv = $('hueChart'), ctx = cv.getContext('2d'), W = cv.width, c = W / 2;
    ctx.clearRect(0, 0, W, W);
    const hues = new Array(24).fill(0);
    let whites = 0;
    for (const b of Eco.openBlooms) { const ph = b.seg.g.ph; if (ph.light > 0.84 && ph.sat < 0.5) whites++; else hues[Math.floor(ph.hue * 24) % 24]++; }
    const mx = Math.max(1, ...hues);
    for (let i = 0; i < 24; i++) {
      const a0 = i / 24 * Math.PI * 2 - Math.PI / 2, a1 = (i + 1) / 24 * Math.PI * 2 - Math.PI / 2;
      const r = 42 + hues[i] / mx * 62;
      ctx.beginPath(); ctx.moveTo(c + Math.cos(a0) * 38, c + Math.sin(a0) * 38); ctx.arc(c, c, r, a0, a1); ctx.arc(c, c, 38, a1, a0, true); ctx.closePath();
      ctx.fillStyle = cssColor(hsl((i + 0.5) / 24, 0.7, hues[i] ? 0.55 : 0.25)); ctx.globalAlpha = hues[i] ? 1 : 0.35; ctx.fill(); ctx.globalAlpha = 1;
    }
    ctx.beginPath(); ctx.arc(c, c, 32, 0, 7); ctx.fillStyle = '#f1efe4'; ctx.globalAlpha = 0.15 + 0.85 * Math.min(1, whites / mx); ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = '#2a2a22'; ctx.font = '600 12px Inter'; ctx.textAlign = 'center';
    ctx.fillText(Eco.openBlooms.length, c, c + 4); ctx.textAlign = 'left';
  },

  /* ---------- Démarrage ---------- */
  progress(f, txt) { $('startBar').style.width = Math.round(f * 100) + '%'; if (txt) $('startBtn').textContent = txt; },
  ready() {
    const b = $('startBtn');
    b.disabled = false; b.textContent = 'Entrer dans le pré';
    $('start').classList.add('over');
    b.onclick = () => {
      Sound.init(); Sound.setVolume(Sound.vol); Sound.resume();
      $('start').classList.add('fade');
      setTimeout(() => $('start').classList.add('hidden'), 1000);
      $('hud').classList.remove('hidden');
      this.started = true;
      Player.lock();
      setTimeout(() => this.toast('Bienvenue dans le pré. Visez une plante avec la loupe (1) et cliquez pour l’examiner.', 'info'), 1200);
    };
  },
};

function bloomLabel(b) {
  switch (b.state) {
    case 'bud': return 'bouton floral';
    case 'open': return b.pollen.length ? 'fleur pollinisée' : 'fleur ouverte';
    case 'fruit': return b.fruit >= 0.5 ? (b.seg.plant.woody ? 'fruit mûrissant' : 'graines presque mûres') : 'fruit en formation';
    case 'fade': return 'fleur fanée';
  }
  return '';
}
function fmtLen(m) { return m < 0.01 ? (m * 1000).toFixed(1) + ' mm' : m < 1 ? (m * 100).toFixed(1) + ' cm' : m.toFixed(2) + ' m'; }
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}
