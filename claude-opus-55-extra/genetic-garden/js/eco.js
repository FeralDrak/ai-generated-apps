'use strict';
/* ==========================================================================
   Écosystème du pré : population, banque de graines, germination,
   pollinisation de fond (insectes & vent), vigueur, recensement.
   ========================================================================== */

const HERB_CAP = 1150, WOODY_CAP = 72, SEED_CAP = 4200;

const Eco = {
  day: 0, plants: [], seeds: [], rocks: [], grid: null,
  E: { doy: 0, season: 0, year: 1, day: 0, newSpring: false },
  openBlooms: [],
  counts: { herbe: 0, arbuste: 0, arbre: 0 },
  live: { herbe: 0, arbuste: 0, arbre: 0 },
  known: new Map(), census: [], history: [],
  wind: { x: 0.8, z: 0.35, s: 0.5 },
  ready: false,

  reset() {
    this.day = 0; this.plants = []; this.seeds = []; this.rocks = [];
    this.grid = new Grid(4, HALF + 2);
    this.openBlooms = []; this.counts = { herbe: 0, arbuste: 0, arbre: 0 }; this.live = { herbe: 0, arbuste: 0, arbre: 0 };
    this.known = new Map(); this.census = []; this.history = [];
    this.lastCensus = -99; this.lastHist = -99; this.lastSeason = undefined;
    this.vigorAcc = 0; this.vcur = 0; this.ready = false;
    this.E = { doy: 0, season: 0, year: 1, day: 0, newSpring: false };
  },

  /* ---------- Création du pré initial ---------- */
  init(onProgress) {
    this.reset();
    // rochers
    for (let i = 0; i < 16; i++) {
      for (let t = 0; t < 30; t++) {
        const x = rand(-45, 45), z = rand(-45, 45);
        if (Math.hypot(x - POND.x, z - POND.z) < 11) continue;
        this.rocks.push({ x, z, r: rand(0.45, 1.5), s: newSeed() });
        break;
      }
    }
    const byKind = (k) => ARCHETYPES.filter(a => a.kind === k);
    const wpick = (arr) => { let s = 0; for (const a of arr) s += a.weight; let x = rnd() * s; for (const a of arr) { x -= a.weight; if (x <= 0) return a; } return arr[0]; };
    const groves = {};
    for (const a of ARCHETYPES) groves[a.id] = [[rand(-38, 38), rand(-38, 38)], [rand(-38, 38), rand(-38, 38)]];
    const free = (x, z, dmin) => {
      if (Math.abs(x) > 46.5 || Math.abs(z) > 46.5 || inWater(x, z)) return false;
      if (Math.hypot(x - POND.x, z - POND.z) < 8.5) return false;
      for (const r of this.rocks) if (Math.hypot(r.x - x, r.z - z) < r.r + 1) return false;
      for (const p of this.plants) if (p.woody && Math.hypot(p.x - x, p.z - z) < dmin * (p.kind === 'arbre' ? 1 : 0.6)) return false;
      return true;
    };
    const placeWoody = (kind, n, dmin) => {
      const arch = byKind(kind);
      for (let i = 0; i < n; i++) {
        const a = wpick(arch);
        for (let t = 0; t < 60; t++) {
          let x, z;
          if (rnd() < 0.65) { const g = pick(groves[a.id]); x = g[0] + gauss() * 9; z = g[1] + gauss() * 9; }
          else { x = rand(-46, 46); z = rand(-46, 46); }
          if (!free(x, z, dmin)) continue;
          const g = makeGenome(a.g);
          const p = new Plant(g, x, z, { gen: 0 });
          const life = g.ph.lifespan / YEAR_DAYS;
          const years = rnd() < 0.2 ? randInt(1, 4) : randInt(3, Math.max(4, Math.floor(life * 0.97)));
          p.fastForward(years);
          this.addPlant(p);
          break;
        }
      }
    };
    placeWoody('arbre', 34, 7);
    placeWoody('arbuste', 18, 3);
    if (onProgress) onProgress(0.3);
    // massifs de fleurs sauvages (sous forme de graines prêtes à germer)
    const herbs = byKind('herbe');
    for (let d = 0; d < 30; d++) {
      const a = wpick(herbs);
      const cx = rand(-44, 44), cz = rand(-44, 44), sig = rand(2.5, 5.5), n = randInt(24, 46);
      for (let i = 0; i < n; i++) this.seeds.push(this.wildSeed(a, cx + gauss() * sig, cz + gauss() * sig));
    }
    for (let i = 0; i < 160; i++) this.seeds.push(this.wildSeed(wpick(herbs), rand(-48, 48), rand(-48, 48)));
    this.seeds = this.seeds.filter(s => Math.abs(s.x) < 48.8 && Math.abs(s.z) < 48.8);
    // la saison avance jusqu'à la fin du printemps
    for (let t = 0; t < 40; t += 0.5) this.step(0.5);
    this.takeCensus();
    this.ready = true;
    if (onProgress) onProgress(0.6);
  },
  wildSeed(a, x, z) {
    return { g: makeGenome(a.g), x, z, age: 0, gen: 0, mother: null, father: null, wild: true };
  },

  addPlant(p) {
    this.plants.push(p); this.grid.add(p); this.counts[p.kind]++;
    Hooks.plantAdded(p);
  },
  removePlant(p) {
    const i = this.plants.indexOf(p);
    if (i < 0) return;
    this.plants[i] = this.plants[this.plants.length - 1]; this.plants.pop();
    this.grid.remove(p); this.counts[p.kind]--;
    p.gone = true;
    Hooks.plantRemoved(p);
  },

  /* ---------- Pas de simulation (dt en jours) ---------- */
  step(dt) {
    const E = this.E;
    const prev = dayOfYear(this.day);
    this.day += dt;
    E.day = this.day; E.doy = dayOfYear(this.day); E.season = Math.floor(E.doy / SEASON_DAYS); E.year = yearOf(this.day);
    E.newSpring = E.doy < prev;
    if (E.season !== this.lastSeason) {
      if (this.lastSeason !== undefined && this.ready) Hooks.event('season', E.season);
      this.lastSeason = E.season;
    }
    if (E.newSpring) {
      for (const s of this.seeds) s.dormant = false;   // l'hiver a levé la dormance des graines
      this.prodLast = this.prodYear || 0; this.prodYear = 0;
      this.windInflux();
    }
    const P = this.plants, live = this.live;
    live.herbe = live.arbuste = live.arbre = 0;
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i];
      p.update(dt, E);
      if (p.gone) this.removePlant(p);
      else if (p.state === 'grow') live[p.kind]++;
    }
    const ob = this.openBlooms; ob.length = 0;
    for (let i = 0; i < P.length; i++) { const bl = P[i].blooms; for (let j = 0; j < bl.length; j++) if (bl[j].state === 'open') ob.push(bl[j]); }
    this.pollinate(dt);
    this.germinate(dt);
    this.vigorAcc += P.length * dt / 3;
    let guard = 0;
    while (this.vigorAcc >= 1 && P.length && guard++ < 2000) { this.vigorAcc -= 1; this.vcur = (this.vcur + 1) % P.length; this.updateVigor(P[this.vcur]); }
    if (this.day - this.lastCensus >= 2) { this.lastCensus = this.day; this.takeCensus(); }
    if (this.day - this.lastHist >= 4) { this.lastHist = this.day; this.record(); }
  },

  /* ---------- Pollinisation de fond (insectes invisibles & vent) ---------- */
  pollinate(dt) {
    const E = this.E, act = E.season <= 1 ? 1 : E.season === 2 ? 0.45 : 0;
    const ob = this.openBlooms;
    const cands = [];
    // les pollinisateurs se lassent des couleurs trop communes : avantage aux teintes rares
    const hb = this.hueBins || (this.hueBins = new Float32Array(12));
    hb.fill(0);
    let nh = 0;
    for (let i = 0; i < ob.length; i++) if (!ob[i].seg.plant.woody) { hb[Math.floor(ob[i].seg.g.ph.hue * 12) % 12]++; nh++; }
    for (let i = 0; i < ob.length; i++) {
      const b = ob[i];
      if (b.pollen.length >= 3) continue;
      const pl = b.seg.plant, ph = b.seg.g.ph;
      const wind = pl.woody && ph.nectar < 0.35;
      let rate = wind ? 0.3 : 0.2 * act * ph.attract;
      if (!pl.woody && nh > 20) rate *= clamp(1.55 - 2.2 * hb[Math.floor(ph.hue * 12) % 12] / nh, 0.35, 1.55);
      if (rnd() >= rate * dt) continue;
      const R = wind ? 28 : (pl.woody ? 16 : 9);
      cands.length = 0; let tot = 0;
      this.grid.query(pl.x, pl.z, R, o => {
        if (o === pl || o.state !== 'grow' || !o.blooms.length) return;
        const d = Math.hypot(o.x - pl.x, o.z - pl.z);
        if (d > R) return;
        for (const b2 of o.blooms) if (b2.state === 'open') {
          // constance florale : les insectes passent surtout d'une fleur à une fleur semblable
          const hd = hueDist(b2.seg.g.ph.hue, ph.hue);
          const w = (wind ? 1 : b2.seg.g.ph.attract / (1 + 40 * hd * hd)) / (1 + d * 0.3);
          cands.push(b2, w); tot += w; break;
        }
      });
      if (!cands.length) continue;
      for (let t = 0; t < 3; t++) {
        let x = rnd() * tot, j = 0;
        for (; j < cands.length - 2; j += 2) { x -= cands[j + 1]; if (x <= 0) break; }
        const d = cands[j];
        if (d.seg.g.distance(b.seg.g) <= COMPAT) {
          const dp = d.seg.plant;
          b.addPollen(d.seg.g, { id: dp.id, name: d.seg.g.name, gen: dp.gen });
          break;
        }
      }
    }
  },

  /* ---------- Graines ---------- */
  scatterSeeds(seeds, bloom) {
    const w = this.wind, landed = [];
    // la plupart des graines sont mangées ou pourrissent : survie fixée pour l'année, identique pour toutes
    const surv = Math.min(1, SEED_CAP / Math.max(1, this.prodLast || this.live.herbe * 16));
    for (const s of seeds) {
      this.prodYear = (this.prodYear || 0) + 1;
      if (rnd() > surv) continue;
      const u = rnd();
      const d = s.disp * Math.min(3, -Math.log(1 - u * 0.95)) * 0.8;
      const a = rnd() * Math.PI * 2;
      const drift = s.fluffy ? 0.7 : 0.25;
      s.x += Math.cos(a) * d + w.x * w.s * d * drift;
      s.z += Math.sin(a) * d + w.z * w.s * d * drift;
      if (Math.abs(s.x) > 48.8 || Math.abs(s.z) > 48.8 || inWater(s.x, s.z)) continue;
      landed.push(s);
      this.seeds.push(s);
    }
    if (this.seeds.length > SEED_CAP * 2) {
      for (let k = 0; k < this.seeds.length - SEED_CAP * 2; k++) { const i = Math.floor(rnd() * this.seeds.length); this.seeds[i] = this.seeds[this.seeds.length - 1]; this.seeds.pop(); }
    }
    Hooks.seedsDispersed(bloom, landed, seeds.length);
  },
  germinate(dt) {
    const E = this.E, S = this.seeds;
    const herbWin = E.doy < 42, woodyWin = E.doy < 30;
    const hf = Math.max(0, 1 - this.live.herbe / HERB_CAP);
    const wf = Math.max(0, 1 - (this.live.arbre + this.live.arbuste) / WOODY_CAP);
    for (let i = S.length - 1; i >= 0; i--) {
      const s = S[i];
      s.age += dt;
      const ph = s.g.ph;
      if (s.age > (ph.woody ? 3 : 2) * YEAR_DAYS) { S[i] = S[S.length - 1]; S.pop(); continue; }
      if (s.dormant && !s.sown) continue;
      let p;
      if (ph.woody) { if (!woodyWin) continue; p = 0.028 * wf; }
      else { if (!herbWin) continue; p = 0.085 * hf * hf; }
      if (s.watered) p *= 2.5;
      if (s.sown) p = 1;
      if (rnd() >= p * dt) continue;
      S[i] = S[S.length - 1]; S.pop();
      if (s.sown || this.canGrow(s.x, s.z, ph)) this.sprout(s);
    }
  },
  canGrow(x, z, ph) {
    if (Math.abs(x) > 48.8 || Math.abs(z) > 48.8 || inWater(x, z)) return false;
    for (const r of this.rocks) if ((x - r.x) ** 2 + (z - r.z) ** 2 < (r.r + 0.2) ** 2) return false;
    let ok = true, shade = 0;
    const rad = ph.woody ? (ph.kind === 'arbre' ? 4.5 : 2.2) : 0.16 + 0.1 * ph.height;
    this.grid.query(x, z, 9, (o) => {
      const d = Math.hypot(o.x - x, o.z - z);
      if (o.woody) {
        if (d < o.root.rad + 0.3) { ok = false; return false; }
        if (ph.woody && o.state === 'grow' && d < rad * (o.kind === 'arbre' ? 1 : 0.6)) { ok = false; return false; }
        if (o.kind === 'arbre' && o.state === 'grow' && d < o.crownR * 0.9) shade += (1 - d / (o.crownR * 0.9)) * (0.3 + 0.7 * o.leafAmt);
      } else if (!ph.woody && d < rad && o.state !== 'dead') { ok = false; return false; }
    });
    if (!ok) return false;
    if (shade > 0 && rnd() < Math.min(0.92, shade * (ph.woody ? 1.2 : 0.7))) return false;
    return true;
  },
  sprout(s) {
    const p = new Plant(s.g, s.x, s.z, { gen: s.gen, mother: s.mother, father: s.father, byPlayer: s.byPlayer, sownByPlayer: s.sown, selfed: s.selfed });
    this.addPlant(p);
    if (s.byPlayer && this.ready) Hooks.event('playerSeedling', p);
    return p;
  },
  /** Semis par le joueur : pousse immédiatement (sauf en hiver : la graine attend le printemps). */
  sow(seed, x, z) {
    if (Math.abs(x) > 48.8 || Math.abs(z) > 48.8) return { ok: false, msg: 'Hors du pré' };
    if (inWater(x, z)) return { ok: false, msg: "La graine coulerait dans l'étang" };
    for (const r of this.rocks) if ((x - r.x) ** 2 + (z - r.z) ** 2 < (r.r + 0.1) ** 2) return { ok: false, msg: 'Impossible de semer sur un rocher' };
    let blocked = false;
    this.grid.query(x, z, 2, o => { const d = Math.hypot(o.x - x, o.z - z); if (d < (o.woody ? o.root.rad + 0.25 : 0.1)) { blocked = true; return false; } });
    if (blocked) return { ok: false, msg: 'Trop près d’une autre plante' };
    const s = Object.assign({}, seed, { x, z, age: 0, sown: true });
    if (this.E.season === 3) { this.seeds.push(s); return { ok: true, waiting: true }; }
    return { ok: true, plant: this.sprout(s) };
  },
  windInflux() {
    let hs = 0, ws = 0;
    for (const s of this.seeds) { if (s.g.ph.woody) ws++; else hs++; }
    const herbs = ARCHETYPES.filter(a => a.kind === 'herbe'), trees = ARCHETYPES.filter(a => a.kind !== 'herbe');
    let added = false;
    // chaque printemps, le vent apporte quelques graines des prairies voisines
    for (let i = 0; i < 24; i++) this.seeds.push(this.wildSeed(pick(herbs), rand(-47, 47), rand(-47, 47)));
    if (this.live.herbe + hs < 160) {
      for (let i = 0; i < 60; i++) { const a = pick(herbs); const side = rnd() < 0.5; const e = pick([-47, 47]); this.seeds.push(this.wildSeed(a, side ? e : rand(-47, 47), side ? rand(-47, 47) : e)); }
      added = true;
    }
    if (this.live.arbre + this.live.arbuste + ws < 12) {
      for (let i = 0; i < 8; i++) this.seeds.push(this.wildSeed(pick(trees), rand(-45, 45), rand(-45, 45)));
      added = true;
    }
    if (added && this.ready) Hooks.event('influx');
  },

  /* ---------- Vigueur : lumière & concurrence ---------- */
  updateVigor(p) {
    if (p.state !== 'grow') return;
    if (!(this.day - p.framesDay < 8)) p.computeFrames();
    if (p.woody) {
      let shade = 0;
      this.grid.query(p.x, p.z, 12, o => {
        if (o === p || !o.woody || o.state !== 'grow' || o.top <= p.top * 1.05) return;
        const d = Math.hypot(o.x - p.x, o.z - p.z), reach = o.crownR + p.crownR * 0.5;
        if (d < reach) shade += (1 - d / reach) * (0.4 + 0.6 * o.leafAmt) * clamp((o.top - p.top) / Math.max(1, p.top), 0, 1);
      });
      p.vigor = clamp(1 - shade * 0.9, 0.08, 1);
      if (p.vigor < 0.35) p.lowVigorT += 3; else p.lowVigorT = Math.max(0, p.lowVigorT - 3);
    } else {
      let shade = 0, crowd = 0;
      this.grid.query(p.x, p.z, 10, o => {
        if (o === p) return;
        const d = Math.hypot(o.x - p.x, o.z - p.z);
        if (o.woody) { if (o.state === 'grow' && d < o.crownR) shade += (1 - d / o.crownR) * (0.3 + 0.7 * o.leafAmt) * (o.kind === 'arbre' ? 1 : 0.6); }
        else if (d < 0.4 && o.state === 'grow') crowd += o.top > p.top ? 1.2 : 0.6;
      });
      p.vigor = clamp((1 - Math.min(0.75, shade * 0.8)) / (1 + 0.25 * crowd), 0.15, 1);
    }
  },

  /* ---------- Recensement & chronique ---------- */
  takeCensus() {
    const m = new Map();
    for (const p of this.plants) {
      if (p.state !== 'grow') continue;
      let e = m.get(p.name);
      if (!e) { e = { name: p.name, n: 0, kind: p.ph.kind, needle: p.ph.needle, color: p.ph.petalC, leaf: p.ph.leafC, sample: p }; m.set(p.name, e); }
      e.n++;
    }
    this.census = [...m.values()].sort((a, b) => b.n - a.n);
    for (const e of this.census) {
      if (!this.known.has(e.name) && (e.n >= 3 || !this.ready)) {
        this.known.set(e.name, { day: this.day, kind: e.kind, color: e.color });
        if (this.ready) Hooks.event('newSpecies', e);
      }
    }
  },
  record() {
    const hues = new Array(12).fill(0);
    for (const b of this.openBlooms) if (!b.seg.plant.woody) hues[Math.floor(b.seg.g.ph.hue * 12) % 12]++;
    this.history.push({ day: this.day, herbe: this.live.herbe, arbuste: this.live.arbuste, arbre: this.live.arbre, seeds: this.seeds.length, species: this.census.length, hues });
    if (this.history.length > 800) this.history.splice(0, this.history.length - 800);
  },
};
