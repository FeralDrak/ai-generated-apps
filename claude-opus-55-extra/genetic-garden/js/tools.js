'use strict';
/* ==========================================================================
   Outils du jardinier : visée (lancer de rayon sur les tronçons et fleurs)
   et interactions.
   ========================================================================== */

const TOOLS = [
  { id: 'loupe', name: 'Loupe', icon: '🔍', hint: '<b>Clic</b> : examiner la plante et le tronçon visé · <b>Clic droit</b> : vue clonale (ADN de chaque tronçon)' },
  { id: 'pollen', name: 'Pinceau à pollen', icon: '🖌️', hint: '<b>Clic</b> sur une fleur ouverte : prélever puis déposer le pollen · <b>Clic droit</b> : nettoyer le pinceau' },
  { id: 'secateur', name: 'Sécateur', icon: '✂️', hint: '<b>Clic</b> : couper le tronçon ou la fleur visés · <b>Clic droit</b> : récolter les graines mûres' },
  { id: 'greffoir', name: 'Greffoir', icon: '🌿', hint: '<b>Clic</b> : prélever un greffon, puis le greffer sur une autre plante · <b>Clic droit</b> : jeter le greffon' },
  { id: 'semoir', name: 'Semoir', icon: '🌱', hint: '<b>Clic</b> au sol : semer la graine choisie · <b>Clic droit</b> : graine suivante (voir le carnet, touche C)' },
  { id: 'arrosoir', name: 'Arrosoir', icon: '💧', hint: '<b>Maintenir le clic</b> : arroser — croissance accélérée, germination favorisée' },
  { id: 'mutagene', name: 'Rayon mutagène', icon: '🧬', hint: '<b>Clic</b> : provoquer une mutation somatique — un rameau mutant pousse du tronçon visé' },
];
const REACH = 9;
const _pw = [0, 0, 0];

const Tools = {
  cur: 0, pollen: null, scion: null, pouch: [], seedSel: 0,
  aim: null, ground: null, pin: null, clonePlant: null, holding: false, cool: 0, waterAcc: 0,
  _o: null, _d: null,
  init() {
    this._o = new THREE.Vector3(); this._d = new THREE.Vector3();
    // quelques graines sauvages pour commencer
    for (const a of ARCHETYPES) {
      const n = a.kind === 'herbe' ? 3 : 1;
      for (let i = 0; i < n; i++) this.pouch.push(Eco.wildSeed(a, 0, 0));
    }
  },
  select(i) {
    this.cur = (i + TOOLS.length) % TOOLS.length;
    UI.updateToolbar();
    Sound.click();
  },
  tool() { return TOOLS[this.cur].id; },

  /* ---------- Visée ---------- */
  pick() {
    const o = this._o.copy(View.camera.position), d = Player.forward(this._d);
    const ox = o.x, oy = o.y, oz = o.z, dx = d.x, dy = d.y, dz = d.z;
    let best = { t: REACH, plant: null, seg: null, bloom: null };
    for (const p of Eco.plants) {
      if (p.state === 'falling' || p.state === 'fallen' || !p.buf) continue;
      const bx = p.bs.x - ox, by = p.bs.y - oy, bz = p.bs.z - oz, r = p.bs.r;
      const tca = bx * dx + by * dy + bz * dz;
      if (tca < -r) continue;
      const d2 = bx * bx + by * by + bz * bz - tca * tca;
      if (d2 > r * r || tca - Math.sqrt(r * r - d2) > best.t) continue;
      for (const b of p.blooms) {
        if (b.lx === null || b.state === 'spent' || b.bud <= 0) continue;
        const bw = b.worldPos(_pw);
        const cx = bw[0] - ox, cy = bw[1] - oy, cz = bw[2] - oz;
        const rr = Math.max(b.R * 1.15, 0.035);
        const tc = cx * dx + cy * dy + cz * dz;
        if (tc < 0) continue;
        const dd = cx * cx + cy * cy + cz * cz - tc * tc;
        if (dd > rr * rr) continue;
        const th = tc - Math.sqrt(rr * rr - dd);
        if (th < best.t) best = { t: th, plant: p, seg: b.seg, bloom: b };
      }
      const leafy = p.woody && p.leafAmt > 0.2;
      const Lf = leafy ? Builder.leafLen(p, p.ph) * 0.8 : 0;
      for (const s of p.segs) {
        let rad = Math.max(s.rad * 1.2, p.woody ? 0.035 : 0.014);
        if (leafy && !s.dead && s.depth >= Math.max(1, s.g.ph.depth - 2)) rad = Math.max(rad, Lf);
        for (let k = 0; k < s.K; k++) {
          const q = k * 3;
          const t = raySeg(ox, oy, oz, dx, dy, dz, p.x + s.P[q], p.y + s.P[q + 1], p.z + s.P[q + 2], p.x + s.P[q + 3], p.y + s.P[q + 4], p.z + s.P[q + 5], rad);
          if (t >= 0 && t < best.t) best = { t, plant: p, seg: s, bloom: null };
        }
      }
    }
    this.aim = best.plant ? best : null;
    // sol
    this.ground = null;
    let prev = 0;
    for (let t = 0.3; t <= REACH + 3; t += 0.2) {
      const x = ox + dx * t, y = oy + dy * t, z = oz + dz * t;
      if (y < surfaceH(x, z)) {
        let a = prev, b = t;
        for (let i = 0; i < 8; i++) { const m = (a + b) / 2; if (oy + dy * m < surfaceH(ox + dx * m, oz + dz * m)) b = m; else a = m; }
        this.ground = { x: ox + dx * b, y: oy + dy * b, z: oz + dz * b, t: b };
        break;
      }
      prev = t;
    }
    return this.aim;
  },

  /* ---------- Actions ---------- */
  press(btn) {
    if (UI.modalOpen()) return;
    const id = this.tool(), a = this.aim;
    if (btn === 0) this.holding = true;
    if (this.cool > 0) return;
    this.cool = 0.18;
    const fn = this['do_' + id];
    if (fn) fn.call(this, btn, a);
  },
  release(btn) { if (btn === 0) this.holding = false; },

  do_loupe(btn, a) {
    if (btn === 2) {
      const p = a ? a.plant : this.pin ? this.pin.plant : null;
      if (this.clonePlant && (!p || p === this.clonePlant)) { this.clonePlant = null; UI.toast('Vue clonale désactivée', 'info'); }
      else if (p) {
        this.clonePlant = p;
        const n = new Set(p.segs.map(s => s.g)).size;
        UI.toast(`Vue clonale : ${n} lignée${n > 1 ? 's' : ''} d’ADN dans cette plante (blanc = ADN de la graine)`, 'info');
        if (!this.pin || this.pin.plant !== p) this.pinTarget(a);
      }
      Sound.click();
      return;
    }
    if (a) { this.pinTarget(a); Sound.click(); }
    else if (this.pin) { this.pin = null; UI.inspector(null); }
  },
  pinTarget(a) {
    if (!a) return;
    this.pin = { plant: a.plant, seg: a.seg, bloom: a.bloom };
    UI.inspector(this.pin);
  },

  do_pollen(btn, a) {
    if (btn === 2) { if (this.pollen) { this.pollen = null; UI.toast('Pinceau nettoyé', 'info'); UI.updateCarry(); } return; }
    if (!a || !a.bloom) { UI.toast('Visez une fleur', 'warn'); return; }
    const b = a.bloom;
    if (b.state !== 'open') { UI.toast(b.state === 'bud' ? 'Cette fleur est encore en bouton' : 'Cette fleur est fanée', 'warn'); return; }
    const w = b.worldPos();
    if (!this.pollen) {
      this.pollen = { g: b.seg.g, id: a.plant.id, name: b.seg.g.name, gen: a.plant.gen, byPlayer: true, color: b.seg.g.ph.petalC };
      Fx.burst(w[0], w[1], w[2], [1, 0.88, 0.35], 16, 0.4, 0.02);
      UI.toast(`Pollen prélevé : ${b.seg.g.name}`, 'good');
      Sound.pop(1.2);
    } else {
      const d = this.pollen.g.distance(b.seg.g);
      if (d > HAND_COMPAT) { UI.toast(`Pollen incompatible : espèces trop éloignées (distance génétique ${(d * 100).toFixed(0)} > ${(HAND_COMPAT * 100).toFixed(0)})`, 'warn'); Sound.deny(); return; }
      if (!b.addPollen(this.pollen.g, this.pollen)) return;
      const self = this.pollen.id === a.plant.id;
      Fx.sparkle(w[0], w[1], w[2], [1, 0.85, 0.4]);
      UI.toast(self ? 'Autofécondation réalisée' : `Fleur pollinisée : ${b.seg.g.name} × ${this.pollen.name}${d > COMPAT ? ' — un croisement que la nature ne ferait pas' : ''}`, 'good');
      Sound.pop(1.6);
    }
    UI.updateCarry();
  },

  do_secateur(btn, a) {
    if (!a) { UI.toast('Rien à couper ici', 'warn'); return; }
    const p = a.plant;
    if (btn === 2) {
      const seeds = p.harvest();
      if (!seeds.length) { UI.toast('Aucun fruit mûr sur cette plante', 'warn'); Sound.deny(); return; }
      this.pouch.push(...seeds);
      const w = a.bloom ? a.bloom.worldPos() : [p.x, p.y + p.top * 0.7, p.z];
      Fx.burst(w[0], w[1], w[2], [0.6, 0.45, 0.25], 12, 0.5, 0.02, false);
      UI.toast(`${seeds.length} graine${seeds.length > 1 ? 's' : ''} récoltée${seeds.length > 1 ? 's' : ''} (${seeds[0].g.name})`, 'good');
      Sound.pop(0.8);
      UI.updateCarry(); UI.refreshJournal();
      return;
    }
    if (a.bloom) {
      const w = a.bloom.worldPos();
      if (a.bloom.state === 'open' || a.bloom.state === 'bud') Fx.petals(a.bloom);
      p.cutBloom(a.bloom);
      Fx.burst(w[0], w[1], w[2], a.bloom.seg.g.ph.petalC, 8, 0.4, 0.02, false);
      UI.toast('Fleur coupée', 'info');
      Sound.snip();
      return;
    }
    if (a.seg === p.root) {
      if (p.woody && p.state === 'grow' || p.woody && p.state === 'dead') {
        p.felled = true;
        if (p.state === 'grow') p.die();
        p.state = 'falling'; PlantView.startFall(p);
        UI.toast(`${p.kind === 'arbre' ? 'Arbre abattu' : 'Arbuste coupé'} : ${p.name}`, 'info');
        Sound.snip(); Sound.creak();
      } else {
        Eco.removePlant(p);
        UI.toast(`Plante arrachée : ${p.name}`, 'info');
        Sound.snip();
      }
      if (this.pin && this.pin.plant === p) { this.pin = null; UI.inspector(null); }
      return;
    }
    const n = p.cut(a.seg);
    const q = a.seg.K * 3;
    Fx.burst(p.x + a.seg.P[q], p.y + a.seg.P[q + 1], p.z + a.seg.P[q + 2], p.ph.leafC, 12, 0.5, 0.03, false);
    UI.toast(`Coupé : ${n} tronçon${n > 1 ? 's' : ''}${p.woody ? ' (de nouvelles pousses repartiront au printemps)' : ''}`, 'info');
    Sound.snip();
    if (this.pin && this.pin.plant === p && !p.segs.includes(this.pin.seg)) this.pinTarget({ plant: p, seg: p.root });
  },

  do_greffoir(btn, a) {
    if (btn === 2) { if (this.scion) { this.scion = null; UI.toast('Greffon jeté', 'info'); UI.updateCarry(); } return; }
    if (!a) { UI.toast('Visez un rameau', 'warn'); return; }
    const p = a.plant, s = a.seg;
    if (!this.scion) {
      if (s.dead) { UI.toast('Ce rameau est mort', 'warn'); return; }
      this.scion = { g: s.g, name: s.g.name, from: p.id, color: s.g.ph.petalC, woody: p.woody };
      UI.toast(`Greffon prélevé sur le tronçon #${s.idx} (${s.g.name})`, 'good');
      Sound.snip();
    } else {
      if (p.state !== 'grow' || s.dead) { UI.toast('Impossible de greffer sur une plante morte', 'warn'); return; }
      const d = this.scion.g.distance(s.g);
      if (d > GRAFT_COMPAT) { UI.toast(`Greffe rejetée : plantes incompatibles (distance ${(d * 100).toFixed(0)} > ${(GRAFT_COMPAT * 100).toFixed(0)})`, 'warn'); Sound.deny(); return; }
      const c = p.graft(s, this.scion.g, false);
      if (!c) { UI.toast('Cette plante ne peut plus porter de rameau', 'warn'); return; }
      const q = s.K * 3;
      Fx.sparkle(p.x + s.P[q], p.y + s.P[q + 1], p.z + s.P[q + 2], [0.6, 1, 0.5]);
      UI.toast(`Greffe réussie : un rameau de ${this.scion.name} pousse sur ${p.name}`, 'good');
      Sound.graft();
      this.scion = null;
    }
    UI.updateCarry();
  },

  seedGroups() {
    const m = new Map();
    for (const s of this.pouch) {
      const k = s.g.name;
      if (!m.has(k)) m.set(k, { name: k, seeds: [], ph: s.g.ph });
      m.get(k).seeds.push(s);
    }
    return [...m.values()];
  },
  do_semoir(btn) {
    const groups = this.seedGroups();
    if (btn === 2) {
      if (!groups.length) { UI.toast('Votre sachet est vide', 'warn'); return; }
      this.seedSel = (this.seedSel + 1) % groups.length;
      UI.updateCarry(); Sound.click();
      return;
    }
    if (!groups.length) { UI.toast('Sachet vide : récoltez des graines au sécateur (clic droit sur un fruit mûr)', 'warn'); return; }
    if (!this.ground) { UI.toast('Visez le sol', 'warn'); return; }
    const gsel = groups[Math.min(this.seedSel, groups.length - 1)];
    const seed = gsel.seeds[0];
    const r = Eco.sow(seed, this.ground.x, this.ground.z);
    if (!r.ok) { UI.toast(r.msg, 'warn'); Sound.deny(); return; }
    this.pouch.splice(this.pouch.indexOf(seed), 1);
    Fx.burst(this.ground.x, this.ground.y + 0.05, this.ground.z, [0.45, 0.32, 0.2], 10, 0.4, 0.03, false);
    if (r.waiting) UI.toast(`Graine enfouie : ${seed.g.name} germera au printemps`, 'info');
    else UI.toast(`Semé : ${seed.g.name}${seed.gen ? ' (génération ' + seed.gen + ')' : ''}`, 'good');
    Sound.plant();
    UI.updateCarry(); UI.refreshJournal();
  },

  do_mutagene(btn, a) {
    if (!a) { UI.toast('Visez un tronçon', 'warn'); return; }
    const p = a.plant, s = a.seg;
    if (p.state !== 'grow' || s.dead) { UI.toast('Il faut une plante vivante', 'warn'); return; }
    const g = s.g.mutated(3 + Math.floor(rnd() * 3), rnd() < 0.65);
    const c = p.graft(s, g, true);
    if (!c) { UI.toast('Cette plante ne peut plus porter de rameau', 'warn'); return; }
    const q = s.K * 3;
    Fx.sparkle(p.x + s.P[q], p.y + s.P[q + 1], p.z + s.P[q + 2], [0.7, 0.5, 1]);
    const names = g.mut.map(i => GENES[i].n.toLowerCase()).join(', ');
    UI.toast(`Mutation induite (${names}) : un rameau mutant pousse sur le tronçon #${s.idx}`, 'good');
    Sound.mutate();
    if (this.pin && this.pin.plant === p) UI.inspector(this.pin);
  },

  /* ---------- Mise à jour continue (arrosage) ---------- */
  update(dt) {
    this.cool = Math.max(0, this.cool - dt);
    if (this.holding && this.tool() === 'arrosoir' && Player.active()) {
      this.waterAcc += dt;
      const g = this.ground;
      const cam = View.camera.position;
      if (g) {
        const f = Player.forward(this._d);
        Fx.water(cam.x + f.x * 0.6, cam.y - 0.35, cam.z + f.z * 0.6, g.x, g.y, g.z);
        if (this.waterAcc > 0.25) {
          this.waterAcc = 0;
          Eco.grid.query(g.x, g.z, 2.2, (p) => { if (Math.hypot(p.x - g.x, p.z - g.z) < 2.2 && p.state === 'grow') { p.watered = Math.max(p.watered, 10); } });
          for (const s of Eco.seeds) if (Math.abs(s.x - g.x) < 2 && Math.abs(s.z - g.z) < 2) s.watered = true;
          Sound.water();
        }
      }
    }
  },
};

/** Distance du rayon (origine o, direction unitaire d) au segment [a,b] : renvoie t si < rayon, sinon -1. */
function raySeg(ox, oy, oz, dx, dy, dz, ax, ay, az, bx, by, bz, rad) {
  const ux = bx - ax, uy = by - ay, uz = bz - az;
  const wx = ox - ax, wy = oy - ay, wz = oz - az;
  const b = dx * ux + dy * uy + dz * uz, c = ux * ux + uy * uy + uz * uz;
  const d = dx * wx + dy * wy + dz * wz, e = ux * wx + uy * wy + uz * wz;
  const den = c - b * b;
  let tc = den > 1e-9 ? (e - b * d) / den : (c > 0 ? e / c : 0);
  tc = clamp01(tc);
  const px = ax + ux * tc, py = ay + uy * tc, pz = az + uz * tc;
  const sc = Math.max(0, (px - ox) * dx + (py - oy) * dy + (pz - oz) * dz);
  const qx = ox + dx * sc - px, qy = oy + dy * sc - py, qz = oz + dz * sc - pz;
  if (qx * qx + qy * qy + qz * qz > rad * rad) return -1;
  return sc;
}
