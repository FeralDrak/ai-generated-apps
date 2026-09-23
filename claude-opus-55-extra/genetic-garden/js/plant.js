'use strict';
/* ==========================================================================
   Plantes : chaque plante est un arbre de tronçons (segments).
   Un tronçon = portion de tige/branche entre deux embranchements.
   Chaque tronçon porte son propre ADN, copié de son tronçon parent avec
   une chance de mutation (mutation somatique) : un arbre peut donc porter
   une branche aux fleurs d'une autre couleur.
   ========================================================================== */

let plantCounter = 0, bloomCounter = 0;
const _bw = [0, 0, 0];
const SEG_CAP = { herbe: 26, arbuste: 120, arbre: 280 };
const BLOOM_CAP = { herbe: 14, arbuste: 50, arbre: 100 };

function leaderRatio(ph) { return ph.woody ? lerp(0.6, 0.9, ph.apical) : lerp(0.7, 0.95, ph.apical); }
function rootLength(ph) {
  const r = leaderRatio(ph), D = ph.depth;
  let L = ph.height / ((1 - Math.pow(r, D)) / (1 - r));
  if (ph.woody) L *= 1 + (1 - ph.apical) * 0.35;
  return L * lerp(0.85, 1.15, (ph.segF - 0.65) / 0.7);
}
function sizeFactor(ageDays) { return 0.16 + 0.84 * (1 - Math.exp(-ageDays / YEAR_DAYS / 7)); }
function flowerRadius(ph, kind) {
  if (kind === 'arbre') return (0.028 + 0.0035 * ph.height) * ph.flSize;
  if (kind === 'arbuste') return 0.045 * ph.flSize;
  return (0.03 + 0.03 * Math.sqrt(ph.height)) * ph.flSize;
}

class Segment {
  constructor(plant, parent, g, o) {
    this.plant = plant; this.parent = parent; this.children = [];
    this.g = g;
    this.depth = parent ? parent.depth + 1 : 0;
    this.leader = !!o.leader;
    this.az = o.az || 0; this.el = o.el || 0;
    this.target = o.target;
    this.grow = o.grow || 0;
    this.len = 0; this.rad = 0.001; this.radEnd = 0.001;
    this.spawned = false; this.dead = false; this.hasBlooms = false;
    this.grafted = !!o.grafted; this.induced = !!o.induced;
    this.seed = newSeed();
    this.idx = ++plant.segCount;
    const r = mulberry32(this.seed);
    const wa = plant.woody ? (0.1 + 0.05 * this.depth) * (this.leader ? 0.6 : 1) : 0.22;
    this.wob = [(r() - 0.5) * wa, (r() - 0.5) * wa * 0.4, (r() - 0.5) * wa];
    this.K = plant.woody ? (this.depth < 2 ? 4 : 3) : 3;
    this.P = new Float32Array((this.K + 1) * 3);   // points (repère local de la plante)
    this.T = new Float32Array((this.K + 1) * 3);   // tangentes
    this.N = new Float32Array((this.K + 1) * 3);   // normales (repère transporté)
  }
  get ph() { return this.g.ph; }
  isTerminal() { return this.children.length === 0; }
}

class Bloom {
  constructor(seg, o) {
    this.id = ++bloomCounter;
    this.seg = seg;
    this.t = o.t; this.az = o.az; this.el = o.el; this.ped = o.ped; this.size = o.size;
    this.delay = o.delay || 0;
    this.state = 'bud'; this.time = 0;
    this.bud = 0; this.open = 0; this.fruit = 0; this.drop = 0; this.fade = 0;
    this.pollen = [];
    this.openDur = o.openDur || 11;
    this.ripeDoy = o.ripeDoy || 0;
    this.lx = null; this.ly = 0; this.lz = 0; this.fx = 0; this.fy = 1; this.fz = 0; this.R = 0.03; this.sw = 0;
  }
  get plant() { return this.seg.plant; }
  worldPos(out) {
    const p = this.seg.plant;
    out = out || [0, 0, 0];
    if (this.lx === null) { out[0] = p.x; out[1] = p.y + p.top; out[2] = p.z; return out; }
    out[0] = p.x + this.lx; out[1] = p.y + this.ly; out[2] = p.z + this.lz;
    if (this.sw > 0 && typeof windDisp === 'function') {
      windDisp(out[0], out[2], this.sw, _bw);
      out[0] += _bw[0]; out[1] += _bw[1]; out[2] += _bw[2];
    }
    return out;
  }
  addPollen(g, meta) {
    if (this.state !== 'open') return false;
    if (this.pollen.length >= 4) this.pollen.shift();
    this.pollen.push({ g, id: meta.id, name: meta.name, gen: meta.gen || 0, byPlayer: !!meta.byPlayer });
    return true;
  }
  update(dt, plant, E) {
    this.time += dt;
    switch (this.state) {
      case 'bud':
        if (this.time < this.delay) { this.bud = 0; return; }
        this.bud = clamp01((this.time - this.delay) / 2);
        this.open = clamp01((this.time - this.delay - 2) / 2);
        if (this.open >= 1) { this.state = 'open'; this.time = 0; }
        break;
      case 'open':
        this.bud = 1; this.open = 1;
        if (this.time > this.openDur) {
          if (!this.pollen.length && rnd() < 0.4) {       // autofécondation de secours
            const pl = this.seg.plant;
            this.pollen.push({ g: this.seg.g, id: pl.id, name: pl.name, gen: pl.gen, self: true });
          }
          this.state = this.pollen.length ? 'fruit' : 'fade';
          this.time = 0;
          if (this.state === 'fruit') Hooks.petalFall(this);
        }
        break;
      case 'fruit':
        this.drop = clamp01(this.time / 1.5);
        if (plant.woody) {
          this.fruit = clamp01(this.time / 26);
          if (this.fruit >= 1 && (E.doy >= this.ripeDoy || this.time > 60)) { plant.releaseSeeds(this); this.state = 'spent'; }
        } else {
          this.fruit = clamp01(this.time / 8);
          if (this.time > 11) { plant.releaseSeeds(this); this.state = 'spent'; }
        }
        break;
      case 'fade':
        this.fade = clamp01(this.time / 3);
        if (this.fade >= 1) this.state = 'spent';
        break;
    }
  }
}

class Plant {
  constructor(g, x, z, o = {}) {
    this.id = ++plantCounter;
    this.g = g; this.ph = g.ph; this.kind = this.ph.kind; this.woody = this.ph.woody;
    this.x = x; this.z = z; this.y = terrainH(x, z);
    this.age = 0;
    this.gen = o.gen || 0;
    this.mother = o.mother || null; this.father = o.father || null;
    this.byPlayer = !!o.byPlayer; this.sownByPlayer = !!o.sownByPlayer; this.selfed = !!o.selfed;
    this.name = g.name;
    this.segCount = 0;
    this.yaw = rnd() * Math.PI * 2;
    this.tilt = [gauss() * (this.woody ? 0.03 : 0.08), gauss() * (this.woody ? 0.03 : 0.08)];
    this.phase = rand(-4, 4);
    this.segs = []; this.blooms = [];
    this.state = 'grow';
    this.wither = 0; this.decay = 0; this.deadT = 0; this.fall = 0; this.fallDir = rnd() * Math.PI * 2;
    this.vigor = 1; this.watered = 0; this.lowVigorT = 0; this.health = 1;
    this.leafAmt = 1; this.autumn = 0; this.fresh = 0;
    this.bloomed = false; this.bloomYear = -1; this.endT = 0;
    this.seedsMade = 0; this.seedBudget = 0;
    this.scale = this.woody ? sizeFactor(0) : 1;
    this.top = 0.05; this.crownR = 0.05; this.bs = { x, y: this.y, z, r: 0.3 };
    this.dirty = true; this.urgent = true; this.lastBuild = -1e9; this.gone = false;
    this.root = this.addSeg(null, g, { target: rootLength(this.ph), leader: true });
  }

  addSeg(parent, g, o) {
    const s = new Segment(this, parent, g, o);
    if (parent) parent.children.push(s);
    this.segs.push(s);
    return s;
  }

  /* ---------- Ramification : un tronçon donne naissance à ses tronçons enfants ---------- */
  spawnChildren(seg, prob = 1) {
    seg.spawned = true;
    const ph = seg.g.ph;
    if (seg.dead || seg.depth >= ph.depth) return;
    const cap = SEG_CAP[this.kind];
    if (this.segs.length >= cap || rnd() > prob) return;
    const r = mulberry32(seg.seed ^ 0x9e3779b9);
    const kids = [];
    const rl = leaderRatio(ph);
    if (!this.woody) {
      kids.push({ leader: true, el: r() * 0.12, az: r() * 6.283, t: rl });
      const nl = r() < ph.ramif ? (r() < ph.ramif * 0.6 ? 2 : 1) : 0;
      const b = r() * 6.283;
      for (let j = 0; j < nl; j++) kids.push({ leader: false, el: ph.angle * (0.8 + 0.4 * r()), az: b + j * Math.PI + (r() - 0.5), t: lerp(0.85, 0.55, ph.apical) });
    } else if (ph.apical >= 0.45) {
      kids.push({ leader: true, el: (1 - ph.apical) * 0.3 * r(), az: r() * 6.283, t: rl });
      const nLat = 1 + Math.floor(ph.ramif * 2.99), b = r() * 6.283;
      for (let j = 0; j < nLat; j++) if (r() < 0.9) kids.push({ leader: false, el: ph.angle * (0.85 + 0.3 * r()), az: b + j * 6.283 / nLat + (r() - 0.5) * 0.6, t: lerp(0.82, 0.45, ph.apical) * (0.85 + 0.3 * r()) });
    } else {
      const n = 2 + (r() < ph.ramif ? 1 : 0) + (r() < ph.ramif * 0.35 ? 1 : 0), b = r() * 6.283;
      for (let j = 0; j < n; j++) kids.push({ leader: j === 0, el: ph.angle * (0.5 + 0.35 * r()), az: b + j * 6.283 / n + (r() - 0.5) * 0.5, t: lerp(0.8, 0.68, 1 - ph.apical) * (0.9 + 0.2 * r()) });
    }
    for (const k of kids) {
      if (this.segs.length >= cap) break;
      const cg = seg.g.somatic();
      const adj = Math.sqrt(cg.ph.height / ph.height);
      this.addSeg(seg, cg, { leader: k.leader, el: k.el, az: k.az, target: seg.target * k.t * clamp(adj, 0.6, 1.6) });
    }
  }

  /** Début de printemps (plantes ligneuses) : nouvelles pousses, dépérissement éventuel. */
  springFlush(fast) {
    const terms = this.segs.filter(s => !s.spawned && !s.dead && s.grow >= 0.95 && s.isTerminal() && s.depth < s.g.ph.depth);
    const room = SEG_CAP[this.kind] - this.segs.length;
    const expected = terms.length * (this.ph.apical < 0.45 ? 2.6 : 2.2);
    const prob = expected > 0 ? Math.min(1, room / expected) : 0;
    for (let i = terms.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [terms[i], terms[j]] = [terms[j], terms[i]]; }
    for (const s of terms) this.spawnChildren(s, prob);
    if (this.health < 0.92) {
      for (const s of this.segs) if (s.depth >= 2 && !s.dead && rnd() < (1 - this.health) * 0.18) this.killBranch(s);
    }
    if (!fast) this.dirty = true;
  }
  killBranch(s) { const st = [s]; while (st.length) { const c = st.pop(); c.dead = true; st.push(...c.children); } }

  /** Vieillissement accéléré (création du pré initial) */
  fastForward(years) {
    this.age = years * YEAR_DAYS;
    for (let y = 0; y < years; y++) {
      this.age = y * YEAR_DAYS;
      this.updateHealth();
      for (const s of this.segs) s.grow = 1;
      this.springFlush(true);
    }
    this.age = years * YEAR_DAYS;
    this.scale = sizeFactor(this.age);
    this.updateHealth();
  }
  updateHealth() {
    const L = this.ph.lifespan, a = this.age;
    this.health = a > 0.72 * L ? lerp(1, 0.3, clamp01((a - 0.72 * L) / (0.28 * L))) : 1;
  }

  /* ---------- Mise à jour de la simulation ---------- */
  update(dt, E) {
    this.age += dt;
    if (this.watered > 0) this.watered -= dt;
    if (this.woody) this.updateWoody(dt, E); else this.updateHerb(dt, E);
  }

  growSegments(dt, rate) {
    let changed = false;
    for (let i = 0; i < this.segs.length; i++) {
      const s = this.segs[i];
      if (s.dead) continue;
      if (s.grow < 1) {
        const boost = (s.grafted || s.induced) ? 1.6 : 1;
        s.grow = Math.min(1, s.grow + dt * rate * boost * (this.woody ? 1 : 1 + 0.15 * s.depth));
        changed = true;
      }
      if (!this.woody && !s.spawned && s.grow >= 0.65) { this.spawnChildren(s); changed = true; }
    }
    return changed;
  }

  updateHerb(dt, E) {
    const ph = this.ph;
    if (this.state === 'grow') {
      const water = this.watered > 0 ? 1.8 : 1;
      const rate = ph.growth * (0.35 + 0.65 * this.vigor) * water * (1 - 0.2 * ph.nectar) / 4.5;
      if (this.growSegments(dt, rate)) this.dirty = true;
      let done = true;
      for (const s of this.segs) if (s.grow < 0.9 || (!s.spawned && s.depth < s.g.ph.depth)) { done = false; break; }
      if (!this.bloomed && done && (E.doy >= ph.bloomDoy || this.age > 34 || this.sownByPlayer)) { this.bloomed = true; this.createHerbBlooms(); }
      else if (this.bloomed) {
        for (const s of this.segs) if (!s.hasBlooms && s.isTerminal() && s.grow >= 0.9 && !s.dead) this.createBloomsFor(s);
      }
      this.updateBlooms(dt, E);
      if (this.bloomed && this.blooms.length && this.blooms.every(b => b.state === 'spent')) {
        this.endT += dt; if (this.endT > 3) this.senesce();
      }
      if (this.age > ph.lifespan || E.season === 3) this.senesce();
    } else if (this.state === 'senescent') {
      this.wither = Math.min(1, this.wither + dt / 7);
      for (const b of this.blooms) if (b.state === 'open' || b.state === 'bud') { b.state = 'fade'; b.time = 0; }
      this.updateBlooms(dt, E);
      if (this.wither >= 1) { this.state = 'dead'; this.blooms = this.blooms.filter(b => b.state === 'fruit'); }
      this.dirty = true;
    } else if (this.state === 'dead') {
      this.updateBlooms(dt, E);
      const d0 = this.decay;
      this.decay = Math.min(1, this.decay + dt / (E.season === 3 ? 45 : 16));
      if (Math.floor(d0 * 12) !== Math.floor(this.decay * 12)) this.dirty = true;
      if (this.decay >= 1) this.gone = true;
    }
  }
  senesce() { if (this.state === 'grow') { this.state = 'senescent'; this.dirty = true; } }

  updateWoody(dt, E) {
    const ph = this.ph;
    if (this.state === 'grow') {
      this.scale = sizeFactor(this.age);
      this.updateHealth();
      if (E.newSpring) this.springFlush(false);
      const water = this.watered > 0 ? 1.6 : 1;
      if (E.doy < 64) {
        const rate = ph.growth * (0.3 + 0.7 * this.vigor) * water / 36;
        if (this.growSegments(dt, rate)) this.dirty = true;
      } else if (E.season < 3) {
        // les rameaux greffés ou induits poussent hors saison
        for (const s of this.segs) if ((s.grafted || s.induced) && s.grow < 1) { s.grow = Math.min(1, s.grow + dt / 12); this.dirty = true; }
      }
      this.seasonLeaves(E.doy);
      const mature = this.kind === 'arbuste' ? this.age > YEAR_DAYS * 0.9 : this.scale > 0.42;
      if (mature && this.bloomYear !== E.year && E.doy >= ph.bloomDoy + this.phase * 0.5 && E.doy < 52 && this.health > 0.35) {
        this.bloomYear = E.year; this.createWoodyBlooms(E);
      }
      this.updateBlooms(dt, E);
      if (this.age >= ph.lifespan) this.die();
      else if (this.lowVigorT > YEAR_DAYS * 1.6 && this.age < YEAR_DAYS * 8) this.die();
    } else if (this.state === 'dead') {
      this.deadT += dt;
      const l0 = this.leafAmt;
      this.leafAmt = Math.max(0, this.leafAmt - dt / 10);
      if (l0 !== this.leafAmt) this.dirty = true;
      if (this.deadT > YEAR_DAYS * 1.3) { this.state = 'falling'; Hooks.treeFalling(this); }
    } else if (this.state === 'fallen') {
      const d0 = this.decay;
      this.decay = Math.min(1, this.decay + dt / YEAR_DAYS);
      if (Math.floor(d0 * 20) !== Math.floor(this.decay * 20)) this.dirty = true;
      if (this.decay >= 1) this.gone = true;
    }
  }
  die() {
    if (this.state !== 'grow') return;
    this.state = 'dead'; this.deadT = 0; this.blooms = [];
    for (const s of this.segs) s.dead = true;
    this.dirty = true;
    Hooks.event('treeDied', this);
  }
  seasonLeaves(doy) {
    const ph = this.ph;
    const a0 = this.leafAmt, au0 = this.autumn, f0 = this.fresh;
    if (ph.evergreen) {
      this.leafAmt = 0.4 + 0.6 * this.health; this.autumn = 0; this.fresh = 1 - smoothstep(4, 22, doy);
    } else {
      const s = this.phase;
      const out = smoothstep(1 + s, 15 + s, doy);
      const fall = smoothstep(68 + s, 90 + s, doy);
      this.leafAmt = out * (1 - fall) * (0.35 + 0.65 * this.health);
      this.autumn = smoothstep(54 + s, 76 + s, doy);
      this.fresh = 1 - smoothstep(8, 26, doy);
    }
    if (Math.abs(a0 - this.leafAmt) + Math.abs(au0 - this.autumn) + Math.abs(f0 - this.fresh) > 1e-5) this.dirty = true;
  }

  /* ---------- Floraison ---------- */
  createHerbBlooms() { for (const s of this.segs) if (s.isTerminal() && !s.dead) this.createBloomsFor(s); }
  createBloomsFor(s) {
    s.hasBlooms = true;
    const cap = BLOOM_CAP[this.kind];
    const ph = s.g.ph, r = mulberry32(s.seed ^ 0xb100);
    const n = 1 + Math.floor(ph.abund * 4.99);
    const add = (o) => { if (this.blooms.length < cap) { o.openDur = 9 + r() * 6; this.blooms.push(new Bloom(s, o)); } };
    if (ph.infl < 0.33) {
      add({ t: 1, el: 0, az: 0, ped: 0, size: 1, delay: 0 });
      for (let j = 1; j < Math.min(n, 3); j++) add({ t: 0.72 + r() * 0.2, el: 0.75, az: j * 2.4 + r(), ped: 1.6, size: 0.78, delay: 2 + j * 2 });
    } else if (ph.infl < 0.66) {
      const m = n + 1;
      for (let j = 0; j < m; j++) add({ t: 1, el: 0.35 + 0.45 * r(), az: j * 6.283 / m + r() * 0.3, ped: 2.6, size: 0.78, delay: r() * 2 });
    } else {
      const m = 2 + n;
      for (let j = 0; j < m; j++) add({ t: 0.5 + 0.5 * j / m, el: 1.0 + 0.25 * r(), az: j * 2.4, ped: 0.7, size: 0.66, delay: j * 0.8 });
    }
    this.dirty = true;
  }
  createWoodyBlooms(E) {
    const terms = this.segs.filter(s => s.isTerminal() && !s.dead && s.depth >= 1);
    for (let i = terms.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [terms[i], terms[j]] = [terms[j], terms[i]]; }
    const cap = BLOOM_CAP[this.kind];
    this.blooms = this.blooms.filter(b => b.state === 'fruit');
    for (const s of terms) {
      if (this.blooms.length >= cap) break;
      const ph = s.g.ph, r = mulberry32(s.seed ^ (E.year * 7919));
      const n = this.kind === 'arbuste' ? 1 + Math.floor(ph.abund * 2.5) : 1 + Math.floor(ph.abund * 3.99);
      for (let j = 0; j < n && this.blooms.length < cap; j++) {
        this.blooms.push(new Bloom(s, { t: j === 0 ? 1 : 0.8 + r() * 0.2, el: j === 0 ? 0.25 : 0.6 + r() * 0.5, az: j * 2.4 + r() * 6.28, ped: 1.2, size: 0.85 + r() * 0.3, delay: r() * 3, openDur: 9 + r() * 4, ripeDoy: 58 + r() * 18 }));
      }
    }
    const nb = this.blooms.length || 1;
    this.seedBudget = Math.round(this.ph.seeds * (0.5 + 0.5 * this.vigor) * this.health);
    this.seedPerFruit = this.seedBudget / nb;
    this.dirty = true;
  }
  updateBlooms(dt, E) {
    const bl = this.blooms;
    for (let i = 0; i < bl.length; i++) {
      const b = bl[i], s0 = b.state, v0 = b.bud + b.open + b.fruit + b.drop + b.fade;
      b.update(dt, this, E);
      if (b.state !== s0 || Math.abs(b.bud + b.open + b.fruit + b.drop + b.fade - v0) > 1e-4) this.dirty = true;
    }
    if (this.woody && bl.length && bl.every(b => b.state === 'spent')) this.blooms = [];
  }

  /* ---------- Graines ---------- */
  makeSeeds(b, n) {
    const out = [];
    if (!b.pollen.length) return out;
    const pos = b.worldPos();
    const ph = b.seg.g.ph;
    for (let i = 0; i < n; i++) {
      const f = pick(b.pollen);
      const g = Genome.fuse(b.seg.g, f.g);
      out.push({
        g, x: pos[0], z: pos[2], y: pos[1], age: 0,
        gen: Math.max(this.gen, f.gen || 0) + 1,
        mother: { id: this.id, name: b.seg.g.name }, father: { id: f.id, name: f.self ? b.seg.g.name : (f.g.name || f.name) },
        selfed: !!f.self, byPlayer: !!f.byPlayer, disp: ph.dispersal, fluffy: ph.fluffy, dormant: true,
      });
    }
    return out;
  }
  /** Les ressources de la plante sont partagées entre ses fruits. */
  seedShare(b) {
    if (this.woody) return this.seedPerFruit || 0;
    const ph = b.seg.g.ph;
    const total = (4 + ph.seeds * 2.2) * (0.4 + 0.6 * this.vigor) * (1 - 0.25 * ph.nectar);
    return total / Math.max(1, this.blooms.length);
  }
  releaseSeeds(b) {
    let n;
    const share = this.seedShare(b);
    n = Math.floor(share); if (rnd() < share - n) n++;
    if (n <= 0) return;
    const seeds = this.makeSeeds(b, n);
    this.seedsMade += seeds.length;
    Eco.scatterSeeds(seeds, b);
  }
  harvest() {
    const out = [];
    for (const b of this.blooms) {
      if (b.state === 'fruit' && b.fruit >= 0.5) {
        out.push(...this.makeSeeds(b, Math.max(1, Math.round(this.seedShare(b) * 1.5))));
        b.state = 'spent';
      }
    }
    if (out.length) { this.dirty = true; this.urgent = true; }
    return out;
  }

  /* ---------- Interventions du jardinier ---------- */
  cut(seg) {
    if (seg === this.root) return false;
    const rm = new Set(), st = [seg];
    while (st.length) { const s = st.pop(); rm.add(s); st.push(...s.children); }
    const p = seg.parent;
    p.children.splice(p.children.indexOf(seg), 1);
    if (this.woody && !p.children.length) p.spawned = false;
    this.segs = this.segs.filter(s => !rm.has(s));
    this.blooms = this.blooms.filter(b => !rm.has(b.seg));
    this.dirty = true; this.urgent = true;
    return rm.size;
  }
  cutBloom(b) {
    const i = this.blooms.indexOf(b);
    if (i >= 0) this.blooms.splice(i, 1);
    this.dirty = true; this.urgent = true;
  }
  graft(seg, g, induced) {
    if (this.segs.length >= SEG_CAP[this.kind] + 30 || this.state !== 'grow') return null;
    const ph = seg.g.ph;
    const c = this.addSeg(seg, g, {
      leader: false, el: clamp(ph.angle, 0.45, 1.0) * rand(0.8, 1.2), az: rnd() * 6.283,
      target: this.woody ? seg.target * 0.7 : Math.max(seg.target * 0.75, 0.06),
      grafted: !induced, induced: !!induced, grow: 0.04,
    });
    seg.spawned = true;
    this.dirty = true; this.urgent = true;
    return c;
  }

  /* ---------- Squelette géométrique (utilisé par le rendu, la cueillette et les pollinisateurs) ---------- */
  computeFrames() {
    const ph = this.ph, woody = this.woody, segs = this.segs, sc = this.scale;
    this.framesDay = Eco.day;
    const tipR = woody ? 0.013 * ph.thick * Math.sqrt(ph.height / 8 + 0.3) : 0.0028 * ph.thick * (0.7 + ph.height * 0.9);
    for (let i = segs.length - 1; i >= 0; i--) {
      const s = segs[i];
      let sum = 0;
      const ex = woody ? 2.35 : 2;
      for (const c of s.children) sum += Math.pow(c.rad, ex);
      const own = tipR * (0.25 + 0.75 * s.grow);
      s.radEnd = s.children.length ? Math.pow(sum, 1 / ex) : own * 0.5;
      s.rad = Math.pow(sum + Math.pow(own, ex), 1 / ex);
    }
    const ageBoost = woody ? 1 + 0.35 * Math.min(1, this.age / YEAR_DAYS / 45) : 1;
    const rs = woody ? (0.35 + 0.65 * sc) * ageBoost : 1;
    const wither = this.wither, decay = this.decay;
    const herbSag = woody ? 0 : wither * 0.9 + decay * 2.2;
    let minX = 1e9, minY = 1e9, minZ = 1e9, maxX = -1e9, maxY = -1e9, maxZ = -1e9;
    // repère de départ
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      let px, py, pz, dx, dy, dz, nx, ny, nz;
      if (!s.parent) {
        dx = this.tilt[0]; dy = 1; dz = this.tilt[1];
        let l = Math.hypot(dx, dy, dz); dx /= l; dy /= l; dz /= l;
        nx = Math.cos(this.yaw); ny = 0; nz = Math.sin(this.yaw);
        const d = nx * dx + ny * dy + nz * dz; nx -= d * dx; ny -= d * dy; nz -= d * dz;
        l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
        px = 0; py = woody ? -0.15 : -0.01; pz = 0;
      } else {
        const p = s.parent, k = p.K * 3;
        const Dx = p.T[k], Dy = p.T[k + 1], Dz = p.T[k + 2];
        const Nx = p.N[k], Ny = p.N[k + 1], Nz = p.N[k + 2];
        const Bx = Dy * Nz - Dz * Ny, By = Dz * Nx - Dx * Nz, Bz = Dx * Ny - Dy * Nx;
        const ca = Math.cos(s.az), sa = Math.sin(s.az);
        const Ax = Nx * ca + Bx * sa, Ay = Ny * ca + By * sa, Az = Nz * ca + Bz * sa;
        const ce = Math.cos(s.el), se = Math.sin(s.el);
        dx = Dx * ce + Ax * se; dy = Dy * ce + Ay * se; dz = Dz * ce + Az * se;
        let d = Nx * dx + Ny * dy + Nz * dz;
        nx = Nx - d * dx; ny = Ny - d * dy; nz = Nz - d * dz;
        let l = Math.hypot(nx, ny, nz);
        if (l < 0.1) { nx = Ax; ny = Ay; nz = Az; l = Math.hypot(nx, ny, nz); }
        nx /= l; ny /= l; nz /= l;
        const emb = s.leader ? 0 : p.radEnd * 0.6 * rs;
        px = p.P[k] - dx * emb; py = p.P[k + 1] - dy * emb; pz = p.P[k + 2] - dz * emb;
      }
      const g = s.grow, eg = 1 - (1 - g) * (1 - g);
      const L = Math.max(0.002, s.target * eg * (woody ? sc : 1));
      s.len = L;
      const K = s.K, st = L / K;
      const sp = s.g.ph;
      let up = 0, droop = 0;
      if (woody) {
        up = sp.curv > 0 ? sp.curv * 0.45 * (s.depth === 0 ? 0.25 : 1) : 0;
        droop = sp.curv < 0 ? -sp.curv * (0.05 + 1.8 * Math.pow(s.depth / sp.depth, 1.6)) : 0;
        if (!s.leader) droop += 0.1;
        if (s.dead) droop += 0.15;
      } else {
        up = Math.max(sp.curv, 0) * 0.8;
        droop = Math.max(-sp.curv, 0) * (s.isTerminal() ? 1.6 : 0.4) + herbSag * (0.4 + 0.3 * s.depth);
      }
      const wb = s.wob;
      for (let k = 0; k <= K; k++) {
        const o = k * 3;
        if (k > 0) {
          dx += wb[0] / K; dy += (up - droop) / K + wb[1] / K; dz += wb[2] / K;
          const l = Math.hypot(dx, dy, dz); dx /= l; dy /= l; dz /= l;
          const d = nx * dx + ny * dy + nz * dz;
          nx -= d * dx; ny -= d * dy; nz -= d * dz;
          const ln = Math.hypot(nx, ny, nz) || 1; nx /= ln; ny /= ln; nz /= ln;
          px += dx * st; py += dy * st; pz += dz * st;
        }
        s.P[o] = px; s.P[o + 1] = py; s.P[o + 2] = pz;
        s.T[o] = dx; s.T[o + 1] = dy; s.T[o + 2] = dz;
        s.N[o] = nx; s.N[o + 1] = ny; s.N[o + 2] = nz;
        if (px < minX) minX = px; if (px > maxX) maxX = px;
        if (py < minY) minY = py; if (py > maxY) maxY = py;
        if (pz < minZ) minZ = pz; if (pz > maxZ) maxZ = pz;
      }
      s.rad *= rs; s.radEnd *= rs;
    }
    // fleurs
    for (const b of this.blooms) this.bloomFrame(b);
    this.top = Math.max(0.05, maxY);
    let cr = 0;
    for (const s of segs) { const k = s.K * 3; cr = Math.max(cr, Math.hypot(s.P[k], s.P[k + 2])); }
    this.crownR = Math.max(0.1, cr);
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, cz = (minZ + maxZ) / 2;
    this.bs.x = this.x + cx; this.bs.y = this.y + cy; this.bs.z = this.z + cz;
    this.bs.r = Math.hypot(maxX - minX, maxY - minY, maxZ - minZ) / 2 + (woody ? 1.2 : 0.15);
  }
  bloomFrame(b) {
    const s = b.seg, K = s.K;
    const f = b.t * K, k0 = Math.min(K - 1, Math.floor(f)), fr = f - k0;
    const o0 = k0 * 3, o1 = o0 + 3;
    const px = lerp(s.P[o0], s.P[o1], fr), py = lerp(s.P[o0 + 1], s.P[o1 + 1], fr), pz = lerp(s.P[o0 + 2], s.P[o1 + 2], fr);
    let Tx = lerp(s.T[o0], s.T[o1], fr), Ty = lerp(s.T[o0 + 1], s.T[o1 + 1], fr), Tz = lerp(s.T[o0 + 2], s.T[o1 + 2], fr);
    let l = Math.hypot(Tx, Ty, Tz); Tx /= l; Ty /= l; Tz /= l;
    const Nx = s.N[o1], Ny = s.N[o1 + 1], Nz = s.N[o1 + 2];
    const Bx = Ty * Nz - Tz * Ny, By = Tz * Nx - Tx * Nz, Bz = Tx * Ny - Ty * Nx;
    const ca = Math.cos(b.az), sa = Math.sin(b.az), ce = Math.cos(b.el), se = Math.sin(b.el);
    let dx = Tx * ce + (Nx * ca + Bx * sa) * se, dy = Ty * ce + (Ny * ca + By * sa) * se, dz = Tz * ce + (Nz * ca + Bz * sa) * se;
    const ph = s.g.ph;
    const R = flowerRadius(ph, this.kind) * b.size * (this.woody ? 1 : 0.6 + 0.4 * s.grow);
    b.R = R;
    const pl = b.ped * R;
    b.lx = px + dx * pl; b.ly = py + dy * pl; b.lz = pz + dz * pl;
    // orientation de la fleur
    let fx = dx, fy = dy, fz = dz;
    if (this.woody) { fy += 0.35; }
    else if (b.el > 0.01) { fy += 0.5; }
    if (!this.woody && ph.curv < -0.2) fy -= 0.4;
    l = Math.hypot(fx, fy, fz) || 1;
    b.fx = fx / l; b.fy = fy / l; b.fz = fz / l;
    b.sx = px; b.sy = py; b.sz = pz;       // point d'attache sur la tige
  }

  /* ---------- Informations ---------- */
  stateLabel() {
    if (this.state === 'senescent') return 'Se fane';
    if (this.state === 'dead') return this.woody ? 'Mort sur pied' : 'Tige sèche';
    if (this.state === 'falling' || this.state === 'fallen') return 'Tombé au sol';
    let open = 0, bud = 0, fruit = 0;
    for (const b of this.blooms) { if (b.state === 'open') open++; else if (b.state === 'bud') bud++; else if (b.state === 'fruit') fruit++; }
    if (open) return `En fleur (${open})`;
    if (fruit) return this.woody ? `Fructification (${fruit})` : `Graines en formation (${fruit})`;
    if (bud) return 'En boutons';
    if (this.woody) {
      if (this.leafAmt < 0.05 && !this.ph.evergreen) return 'Repos hivernal';
      if (this.scale < 0.42) return 'Jeune pousse';
      return this.health < 0.6 ? 'Vieillissant' : 'Feuillé';
    }
    return this.age < 6 ? 'Germination' : 'Croissance';
  }
  alive() { return this.state === 'grow'; }
}
