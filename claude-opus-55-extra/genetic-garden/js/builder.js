'use strict';
/* ==========================================================================
   Géométrie procédurale : tiges (tubes courbes), feuilles, pétales, cœurs,
   fruits. Tout est construit à partir du phénotype de chaque tronçon.
   ========================================================================== */

/* Tampon de sommets extensible, écrit directement dans des tableaux typés
   réutilisés d'une reconstruction à l'autre. */
class GeoBuf {
  constructor(cap = 256) {
    this.nv = 0; this.ni = 0; this.ver = 0; this.cap = 0; this.icap = 0;
    this.cr = 255; this.cg = 255; this.cb = 255; this.c2r = 0; this.c2g = 0; this.c2b = 0; this.pt = 0;
    this._growV(cap); this._growI(cap * 2);
  }
  _growV(cap) {
    const P = new Float32Array(cap * 3), N = new Int8Array(cap * 3), C = new Uint8Array(cap * 3), C2 = new Uint8Array(cap * 3), A = new Uint8Array(cap * 4);
    if (this.P) { P.set(this.P.subarray(0, this.nv * 3)); N.set(this.N.subarray(0, this.nv * 3)); C.set(this.C.subarray(0, this.nv * 3)); C2.set(this.C2.subarray(0, this.nv * 3)); A.set(this.A.subarray(0, this.nv * 4)); }
    this.P = P; this.N = N; this.C = C; this.C2 = C2; this.A = A; this.cap = cap; this.ver++;
  }
  _growI(cap) {
    const I = new Uint32Array(cap);
    if (this.I) I.set(this.I.subarray(0, this.ni));
    this.I = I; this.icap = cap; this.ver++;
  }
  reserve(nv, ni) {
    if (this.nv + nv > this.cap) this._growV(Math.ceil((this.nv + nv) * 1.5));
    if (this.ni + ni > this.icap) this._growI(Math.ceil((this.ni + ni) * 1.5));
  }
  reset() { this.nv = 0; this.ni = 0; }
  color(c, k = 1) { this.cr = clamp(c[0] * k * 255, 0, 255) | 0; this.cg = clamp(c[1] * k * 255, 0, 255) | 0; this.cb = clamp(c[2] * k * 255, 0, 255) | 0; }
  color2(c) { this.c2r = clamp(c[0] * 255, 0, 255) | 0; this.c2g = clamp(c[1] * 255, 0, 255) | 0; this.c2b = clamp(c[2] * 255, 0, 255) | 0; }
  pat(type, seed) { this.pt = (type & 7) | ((seed & 31) << 3); }
  v(x, y, z, nx, ny, nz, sway, u, vv) {
    const i = this.nv++, i3 = i * 3, i4 = i * 4;
    const P = this.P, N = this.N, C = this.C, C2 = this.C2, A = this.A;
    P[i3] = x; P[i3 + 1] = y; P[i3 + 2] = z;
    N[i3] = nx * 127; N[i3 + 1] = ny * 127; N[i3 + 2] = nz * 127;
    C[i3] = this.cr; C[i3 + 1] = this.cg; C[i3 + 2] = this.cb;
    C2[i3] = this.c2r; C2[i3 + 1] = this.c2g; C2[i3 + 2] = this.c2b;
    A[i4] = this.pt; A[i4 + 1] = (u * 127 + 128) | 0; A[i4 + 2] = clamp(vv * 255, 0, 255) | 0; A[i4 + 3] = clamp(sway * 255, 0, 255) | 0;
    return i;
  }
  tri(a, b, c) { const I = this.I, n = this.ni; I[n] = a; I[n + 1] = b; I[n + 2] = c; this.ni = n + 3; }
}

const _c1 = [0, 0, 0], _c2 = [0, 0, 0], _c3 = [0, 0, 0];
const STRAW = [0.62, 0.52, 0.32], DRYLEAF = [0.45, 0.36, 0.2], ROT = [0.24, 0.2, 0.15], DEADBARK = [0.46, 0.44, 0.41];
const LEAF_BUDGET = { arbre: 3000, arbuste: 1000, herbe: 60 };

const Builder = {
  build(plant, lod = 0) {
    const buf = plant.buf || (plant.buf = new GeoBuf(plant.woody ? 3000 : 400));
    buf.reset();
    plant.computeFrames();
    const ctx = this.ctx;
    ctx.plant = plant; ctx.lod = lod; plant.lod = lod;
    ctx.H = Math.max(0.25, plant.top);
    ctx.flex = plant.state === 'falling' || plant.state === 'fallen' ? 0 : plant.woody ? (plant.kind === 'arbre' ? 0.32 : 0.5) : 1;
    ctx.wither = plant.woody ? 0 : plant.wither;
    ctx.decay = plant.decay;
    for (const s of plant.segs) this.stem(buf, plant, s);
    this.leaves(buf, plant);
    for (const b of plant.blooms) this.bloom(buf, plant, b);
    if (!plant.woody && plant.state === 'dead') {
      const k = 1 - 0.75 * plant.decay, P = buf.P;
      for (let i = 0; i < buf.nv; i++) P[i * 3 + 1] *= k;
    }
    plant.lastBuildDay = Eco.day;
    return buf;
  },
  ctx: { plant: null, H: 1, flex: 1, wither: 0, decay: 0, lod: 0 },
  sway(y) { const c = this.ctx; const t = clamp01(y / c.H); return c.flex * t * Math.sqrt(t); },

  /* ---------- Tiges et branches ---------- */
  stem(buf, plant, s) {
    const K = s.K, woody = plant.woody;
    const lod = this.ctx.lod;
    let sides = woody ? (s.depth === 0 ? 9 : s.depth < 2 ? 7 : s.depth < 4 ? 5 : 4) : (s.depth === 0 ? 5 : 4);
    if (woody && (s.rad < 0.012 || (lod > 0 && s.depth >= 2))) sides = 3;
    if (!woody && lod > 0) sides = 3;
    if (woody && lod > 0 && s.depth < 2) sides = Math.max(5, sides - 2);
    const ph = s.g.ph;
    let base = _c1;
    if (woody) {
      base[0] = ph.barkC[0]; base[1] = ph.barkC[1]; base[2] = ph.barkC[2];
      if (s.dead) mixc(base, DEADBARK, 0.75, base);
      if (plant.state === 'fallen') mixc(base, ROT, plant.decay * 0.8, base);
    } else {
      const sc = ph.stemC;
      base[0] = sc[0]; base[1] = sc[1]; base[2] = sc[2];
      if (this.ctx.wither > 0) mixc(base, STRAW, this.ctx.wither, base);
      if (this.ctx.decay > 0) mixc(base, ROT, this.ctx.decay * 0.7, base);
    }
    const bright = woody && ph.barkL > 0.55;
    const r = mulberry32(s.seed ^ 0xba4c);
    buf.reserve((K + 1) * sides, K * sides * 6);
    buf.pat(0, 0);
    const b0 = buf.nv, P = s.P, T = s.T, N = s.N;
    for (let k = 0; k <= K; k++) {
      const o = k * 3, t = k / K;
      const rad = lerp(s.rad, s.radEnd, t);
      const tx = T[o], ty = T[o + 1], tz = T[o + 2], nx = N[o], ny = N[o + 1], nz = N[o + 2];
      const bx = ty * nz - tz * ny, by = tz * nx - tx * nz, bz = tx * ny - ty * nx;
      const px = P[o], py = P[o + 1], pz = P[o + 2];
      const sw = this.sway(py);
      for (let j = 0; j < sides; j++) {
        const a = j / sides * 6.2832, ca = Math.cos(a), sa = Math.sin(a);
        const dx = nx * ca + bx * sa, dy = ny * ca + by * sa, dz = nz * ca + bz * sa;
        let shade = woody ? (j & 1 ? 0.92 : 0.78) + r() * 0.12 : 0.9 + r() * 0.1;
        if (bright && r() < 0.18) shade *= 0.35;
        buf.color(base, shade * (0.85 + 0.15 * dy));
        buf.v(px + dx * rad, py + dy * rad, pz + dz * rad, dx, dy, dz, sw, 0, 0);
      }
    }
    for (let k = 0; k < K; k++) {
      const r0 = b0 + k * sides, r1 = r0 + sides;
      for (let j = 0; j < sides; j++) {
        const j1 = (j + 1) % sides;
        buf.tri(r0 + j, r0 + j1, r1 + j);
        buf.tri(r0 + j1, r1 + j1, r1 + j);
      }
    }
  },

  /* ---------- Feuillage ---------- */
  leafLen(plant, ph) {
    if (plant.woody) return (ph.needle ? 0.2 + 0.016 * ph.height : 0.13 + 0.028 * ph.height) * ph.leafSize * (plant.kind === 'arbuste' ? 0.75 : 1);
    return (0.045 + 0.085 * ph.height) * ph.leafSize;
  },
  leaves(buf, plant) {
    const woody = plant.woody;
    if (woody && (plant.leafAmt <= 0.01 || plant.state === 'falling' || plant.state === 'fallen')) return;
    if (!woody && plant.decay > 0.85) return;
    const list = [];
    let est = 0;
    for (const s of plant.segs) {
      if (s.dead) continue;
      const ph = s.g.ph;
      if (woody && s.depth < Math.max(1, ph.depth - 2) && !s.isTerminal()) continue;
      const L = this.leafLen(plant, ph);
      const spacing = woody ? L * (ph.needle ? 0.22 : 0.3) : L * 1.25;
      const n = s.len * ph.leafDens / spacing;
      list.push(s, n, L); est += n;
    }
    const budget = LEAF_BUDGET[plant.kind] * (woody && this.ctx.lod > 0 ? 0.45 : 1);
    const f = est > budget ? budget / est : 1;
    const boost = f < 1 ? Math.pow(1 / f, 0.33) : 1;
    const up = [0, 1, 0];
    for (let q = 0; q < list.length; q += 3) {
      const s = list[q], n = list[q + 1], L0 = list[q + 2];
      const ph = s.g.ph, r = mulberry32(s.seed ^ 0x1eaf);
      let cnt = Math.min(woody ? 400 : 12, Math.floor(n * f + r()));
      if (!woody && this.ctx.lod > 1) cnt = Math.ceil(cnt / 2);
      const K = s.K;
      for (let i = 0; i < cnt; i++) {
        const t = woody ? 0.12 + 0.88 * r() : 0.12 + 0.8 * (i + 0.5) / cnt;
        const az = woody ? r() * 6.2832 : i * 2.4 + s.idx;
        const rFall = r(), rAut = r(), rSz = r(), rCol = r(), rTilt = r();
        if (woody && rFall > plant.leafAmt) continue;
        let L = L0 * boost * (0.75 + 0.5 * rSz);
        if (!woody) L *= 0.3 + 0.7 * s.grow;
        else if (!ph.evergreen) L *= 0.45 + 0.55 * smoothstep(0, 0.6, plant.leafAmt + (1 - plant.fresh) * 0.5);
        const fk = t * K, k0 = Math.min(K - 1, Math.floor(fk)), fr = fk - k0, o0 = k0 * 3, o1 = o0 + 3;
        const px = lerp(s.P[o0], s.P[o1], fr), py = lerp(s.P[o0 + 1], s.P[o1 + 1], fr), pz = lerp(s.P[o0 + 2], s.P[o1 + 2], fr);
        const tx = s.T[o1], ty = s.T[o1 + 1], tz = s.T[o1 + 2], nx = s.N[o1], ny = s.N[o1 + 1], nz = s.N[o1 + 2];
        const bx = ty * nz - tz * ny, by = tz * nx - tx * nz, bz = tx * ny - ty * nx;
        const ca = Math.cos(az), sa = Math.sin(az);
        const ax = nx * ca + bx * sa, ay = ny * ca + by * sa, az2 = nz * ca + bz * sa;
        let dx, dy, dz;
        if (woody) {
          const droop = ph.curv < -0.3 ? -0.6 : -0.12 + rTilt * 0.3;
          dx = ax * 0.8 + tx * 0.45; dy = ay * 0.8 + ty * 0.45 + droop; dz = az2 * 0.8 + tz * 0.45;
        } else {
          dx = ax * 0.75 + tx * 0.3; dy = ay * 0.75 + ty * 0.3 + 0.25 - 0.5 * this.ctx.wither; dz = az2 * 0.75 + tz * 0.3;
        }
        const l = Math.hypot(dx, dy, dz); dx /= l; dy /= l; dz /= l;
        const rr = s.rad * (1 - t * 0.5) + (woody ? rTilt * L * 0.9 : 0);
        this.leafColor(plant, ph, rAut, rCol, _c2);
        this.leaf(buf, ph, px + ax * rr, py + ay * rr, pz + az2 * rr, dx, dy, dz, L, _c2, woody);
      }
      // rosette basale des herbacées
      if (!woody && s === plant.root) {
        const nr = 3 + Math.round(ph.leafDens * 5);
        for (let i = 0; i < nr; i++) {
          const a = i / nr * 6.2832 + s.idx, ca = Math.cos(a), sa = Math.sin(a);
          const dx = ca * 0.9, dz = sa * 0.9, dy = 0.35 - this.ctx.wither * 0.4;
          const l = Math.hypot(dx, dy, dz);
          this.leafColor(plant, ph, r(), r(), _c2);
          this.leaf(buf, ph, ca * 0.01, 0.01, sa * 0.01, dx / l, dy / l, dz / l, L0 * 1.3 * (0.4 + 0.6 * Math.min(1, s.grow * 1.5)), _c2, false);
        }
      }
    }
  },
  leafColor(plant, ph, rAut, rCol, out) {
    hsl(ph.leafH + (rCol - 0.5) * 0.03, ph.leafS, ph.leafL * (0.88 + rCol * 0.24), out);
    if (plant.woody) {
      if (plant.fresh > 0) { hsl(ph.leafH - 0.035, 0.62, 0.42, _c3); mixc(out, _c3, plant.fresh * 0.65, out); }
      if (plant.autumn > 0 && !ph.evergreen) {
        const m = clamp01(plant.autumn * 1.7 - rAut * 0.7);
        if (m > 0) {
          hsl(ph.autumnH + (rCol - 0.5) * 0.06, 0.7 + rAut * 0.2, 0.36 + rCol * 0.12, _c3);
          if (rAut > 0.8) mixc(_c3, DRYLEAF, 0.6, _c3);
          mixc(out, _c3, m, out);
        }
      }
    } else {
      if (this.ctx.wither > 0) mixc(out, DRYLEAF, clamp01(this.ctx.wither * 1.2 - rAut * 0.2), out);
      if (this.ctx.decay > 0) mixc(out, ROT, this.ctx.decay * 0.8, out);
    }
    return out;
  },
  /** Une feuille : contour procédural (élongation, lobes/dents) pliée le long de la nervure. */
  leaf(buf, ph, x, y, z, ax, ay, az, L, col, woody) {
    // repère de la feuille
    let sx = ay * 0 - az * 1, sy = az * 0 - ax * 0, sz = ax * 1 - ay * 0;   // axe x up
    let sl = Math.hypot(sx, sy, sz);
    if (sl < 0.15) { sx = 1; sy = 0; sz = 0; sl = 1; }
    sx /= sl; sy /= sl; sz /= sl;
    let nx = sy * az - sz * ay, ny = sz * ax - sx * az, nz = sx * ay - sy * ax;
    if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; sx = -sx; sy = -sy; sz = -sz; }
    const needle = ph.needle;
    const wr = needle ? 0.2 : lerp(woody ? 0.4 : 0.34, 0.08, ph.leafElong);
    const lobes = needle ? 6 : Math.round(ph.leafLobes * 5);
    const ldepth = needle ? 0.75 : ph.leafLobes * 0.55;
    let E = lobes > 0 ? Math.min(woody ? 7 : 11, lobes * 2 + 1) : (woody ? 2 : 4);
    if (this.ctx.lod > 0) E = Math.min(E, woody ? 3 : this.ctx.lod > 1 ? 2 : 3);
    const fold = needle ? 0.05 : 0.22;
    const W = L * wr;
    const sw0 = this.sway(y), sw1 = Math.min(1, sw0 + 0.06 * this.ctx.flex + 0.03);
    buf.reserve(2 + 2 * E, 6 * E + 6);
    buf.pat(7, 0);
    buf.color(col, 0.8);
    const base = buf.v(x, y, z, nx, ny, nz, sw0, 0, 0);
    buf.color(col, 1.05);
    const tip = buf.v(x + ax * L, y + ay * L, z + az * L, nx, ny, nz, sw1, 0, 1);
    const ex = lerp(0.85, 0.6, ph.leafElong);
    let prevL = base, prevR = base;
    for (let i = 1; i <= E; i++) {
      const t = i / (E + 1);
      let w = Math.pow(Math.sin(Math.PI * Math.pow(t, ex)), 0.8);
      if (lobes > 0) w *= 1 - ldepth * (0.5 - 0.5 * Math.cos(t * lobes * 6.2832));
      const hw = W * w, lift = hw * fold;
      const cx = x + ax * L * t + nx * lift, cy = y + ay * L * t + ny * lift, cz = z + az * L * t + nz * lift;
      const sw = lerp(sw0, sw1, t);
      buf.color(col, 0.85 + 0.2 * t);
      const li = buf.v(cx - sx * hw, cy - sy * hw, cz - sz * hw, nx - sx * 0.3, ny - sy * 0.3, nz - sz * 0.3, sw, -1, t);
      const ri = buf.v(cx + sx * hw, cy + sy * hw, cz + sz * hw, nx + sx * 0.3, ny + sy * 0.3, nz + sz * 0.3, sw, 1, t);
      if (i === 1) buf.tri(base, ri, li);
      else { buf.tri(prevL, prevR, ri); buf.tri(prevL, ri, li); }
      prevL = li; prevR = ri;
    }
    buf.tri(prevL, prevR, tip);
  },

  /* ---------- Fleurs ---------- */
  bloom(buf, plant, b) {
    if (b.lx === null || b.bud <= 0 || b.state === 'spent') return;
    const s = b.seg, ph = s.g.ph, R = b.R;
    const cx = b.lx, cy = b.ly, cz = b.lz, fx = b.fx, fy = b.fy, fz = b.fz;
    // base orthonormée (F, U, V)
    let ux = -fz, uy = 0, uz = fx; let ul = Math.hypot(ux, uy, uz);
    if (ul < 0.2) { ux = 1; uy = 0; uz = 0; ul = 1; }
    ux /= ul; uy /= ul; uz /= ul;
    const vx = fy * uz - fz * uy, vy = fz * ux - fx * uz, vz = fx * uy - fy * ux;
    const sw = Math.min(1, this.sway(cy) + 0.04 * this.ctx.flex);
    b.sw = sw;
    const tiny = plant.woody && plant.kind === 'arbre';
    const small = tiny || b.size < 0.7;
    const lod = this.ctx.lod;
    // pédoncule
    if (!plant.woody && b.ped > 0 && lod < 2) {
      buf.color(ph.stemC, 0.95); buf.pat(0, 0);
      const r0 = Math.max(0.0012, s.radEnd * 0.8);
      this.thinLine(buf, b.sx, b.sy, b.sz, cx, cy, cz, r0, this.sway(b.sy), sw);
    }
    const open = b.open, fade = b.fade, drop = b.drop, fruit = b.fruit;
    const sc = lerp(0.3, 1, b.bud) * (1 - 0.25 * fade);
    const wither = this.ctx.wither;
    // sépales
    if (!tiny && (lod === 0 || (lod === 1 && open < 0.5))) {
      buf.color(ph.stemC, 1); buf.color2(ph.stemC); buf.pat(7, 0);
      const sa = lerp(1.25, -0.5, open);
      for (let i = 0; i < 5; i++) {
        const phi = i / 5 * 6.2832 + 0.3;
        this.petal(buf, cx, cy, cz, fx, fy, fz, ux, uy, uz, vx, vy, vz, phi, sa, 0.15, R * 0.42 * sc, R * 0.13 * sc, 2, 3, 0.35, 0, 0, 0, 0, sw, -R * 0.05);
      }
    }
    // pétales
    if (drop < 1) {
      const nP = ph.petals, wh = ph.whorls;
      const aOpen = ph.cup * 0.75;
      const alpha = lerp(1.38, aOpen, open) - fade * 0.9 - wither * 0.6;
      const bend = ph.cup * 0.55 - fade * 0.5;
      const t = ph.tip;
      // profil de l'extrémité : arrondi / pointu / échancré / frangé
      const pw = clamp01((t - 0.2) / 0.15) * (1 - clamp01((t - 0.5) / 0.1));
      const q = lerp(0.45, 1.4, pw), wT = lerp(0.55, 0.02, pw);
      const notch = clamp01((t - 0.55) / 0.12) * (1 - clamp01((t - 0.78) / 0.07)) * 0.22;
      const fringe = clamp01((t - 0.76) / 0.1) * 0.16;
      const round = (1 - pw) * (notch > 0.01 || fringe > 0.01 ? 0.05 : 0.2);
      let nl = small ? 3 : 4, nw = small ? 3 : (fringe > 0.02 ? 5 : 3);
      if (lod === 1) { nl = 3; nw = 3; }
      else if (lod === 2) { nl = 2; nw = small ? 2 : 3; }
      const pr = mulberry32(b.id * 977);
      const pc = ph.petalC;
      buf.color2(ph.petalC2);
      for (let k = 0; k < wh; k++) {
        const Lp = R * (1 - 0.2 * k) * sc;
        const Wp = Lp * ph.pWidth * clamp(5 / nP, 0.4, 1.35) * 0.5;
        const ak = alpha + k * 0.25 * open;
        for (let i = 0; i < nP; i++) {
          const pv = pr();
          if (pv < drop) continue;
          const phi = (i + k * 0.5) / nP * 6.2832 + (pr() - 0.5) * 0.12;
          hsl(ph.hue + (pr() - 0.5) * 0.02, ph.sat, ph.light * (0.95 + pr() * 0.08), _c3);
          if (fade > 0 || wither > 0) { mixc(_c3, DRYLEAF, Math.max(fade, wither) * 0.7, _c3); }
          buf.color(_c3);
          buf.pat(1 + ph.motif, (pr() * 31) | 0);
          this.petal(buf, cx, cy, cz, fx, fy, fz, ux, uy, uz, vx, vy, vz, phi, ak, bend, Lp, Wp, nl, nw, q, wT, round, notch, fringe, sw, R * 0.04 * k);
        }
      }
    }
    // cœur ou fruit
    buf.pat(0, 0);
    if (b.state === 'fruit' || (b.state === 'spent' && fruit > 0)) {
      const woodyFruit = plant.woody;
      let rf, col;
      if (woodyFruit) {
        rf = R * lerp(0.2, 0.55, fruit) * (0.8 + ph.cSize);
        hsl(ph.cHue, 0.75, 0.33, _c3); mixc([0.35, 0.55, 0.2], _c3, smoothstep(0.3, 1, fruit), _c3);
        this.sphere(buf, cx, cy - rf * 1.2, cz, rf, _c3, 6, 4, sw, 0);
      } else if (ph.fluffy && fruit > 0.8) {
        rf = R * lerp(0.6, 1.25, (fruit - 0.8) / 0.2);
        this.sphere(buf, cx + fx * rf * 0.4, cy + fy * rf * 0.4, cz + fz * rf * 0.4, rf, [0.93, 0.93, 0.88], 7, 5, sw, 0.25);
      } else {
        rf = R * Math.max(0.2, ph.cSize) * (0.5 + 0.7 * fruit);
        mixc([0.35, 0.55, 0.22], [0.58, 0.46, 0.26], smoothstep(0.4, 1, fruit), _c3);
        this.sphere(buf, cx + fx * rf * 0.5, cy + fy * rf * 0.5, cz + fz * rf * 0.5, rf, _c3, 6, 4, sw, 0);
      }
    } else {
      const rc = R * ph.cSize * sc * (0.6 + 0.4 * open);
      const cc = ph.centerC;
      _c3[0] = cc[0]; _c3[1] = cc[1]; _c3[2] = cc[2];
      if (fade > 0 || wither > 0) mixc(_c3, DRYLEAF, Math.max(fade, wither) * 0.6, _c3);
      this.dome(buf, cx, cy, cz, fx, fy, fz, ux, uy, uz, vx, vy, vz, rc, rc * 0.55, _c3, lod > 1 ? 4 : small || lod ? 5 : 8, sw, lod ? 2 : 3);
    }
  },
  /** Surface d'un pétale : grille (nl x nw) courbée le long de sa longueur et creusée en largeur. */
  petal(buf, cx, cy, cz, fx, fy, fz, ux, uy, uz, vx, vy, vz, phi, alpha, bend, Lp, Wp, nl, nw, q, wT, round, notch, fringe, sw, hOff) {
    const cp = Math.cos(phi), sp = Math.sin(phi);
    const rx = ux * cp + vx * sp, ry = uy * cp + vy * sp, rz = uz * cp + vz * sp;
    const tx = fy * rz - fz * ry, ty = fz * rx - fx * rz, tz = fx * ry - fy * rx;
    buf.reserve(nl * nw, (nl - 1) * (nw - 1) * 6);
    const b0 = buf.nv;
    let r = Lp * 0.06, h = hOff;
    const ds = Lp / (nl - 1), cpos = 0.55;
    const curl = bend * 0.5;
    for (let j = 0; j < nl; j++) {
      const v = j / (nl - 1);
      const a = alpha + bend * v;
      if (j > 0) { r += Math.cos(a) * ds; h += Math.sin(a) * ds; }
      let w;
      if (v < cpos) w = 0.14 + 0.86 * Math.sin(Math.PI / 2 * v / cpos);
      else w = 1 - (1 - wT) * Math.pow((v - cpos) / (1 - cpos), 1 / q);
      const ca = Math.cos(a), sa = Math.sin(a);
      const nxr = fx * ca - rx * sa, nyr = fy * ca - ry * sa, nzr = fz * ca - rz * sa;
      for (let i = 0; i < nw; i++) {
        const u = nw === 1 ? 0 : i / (nw - 1) * 2 - 1;
        let rr = r, hh = h;
        if (j === nl - 1) {
          const cut = round * u * u + notch * (1 - Math.abs(u)) * (1 - Math.abs(u)) + fringe * Math.abs(Math.sin(u * 7.85));
          rr -= Math.cos(a) * cut * Lp; hh -= Math.sin(a) * cut * Lp;
        }
        const lat = u * w * Wp;
        const lift = curl * u * u * w * Wp;
        const x = cx + rx * rr + fx * (hh + lift) + tx * lat;
        const y = cy + ry * rr + fy * (hh + lift) + ty * lat;
        const z = cz + rz * rr + fz * (hh + lift) + tz * lat;
        const tl = -curl * u * 0.8;
        let nx = nxr + tx * tl, ny = nyr + ty * tl, nz = nzr + tz * tl;
        const nl2 = Math.hypot(nx, ny, nz) || 1;
        buf.v(x, y, z, nx / nl2, ny / nl2, nz / nl2, sw, u, v);
      }
    }
    for (let j = 0; j < nl - 1; j++) for (let i = 0; i < nw - 1; i++) {
      const a = b0 + j * nw + i, b = a + 1, c = a + nw, d = c + 1;
      buf.tri(a, c, b); buf.tri(b, c, d);
    }
  },
  dome(buf, cx, cy, cz, fx, fy, fz, ux, uy, uz, vx, vy, vz, r, h, col, sides, sw, rings = 3) {
    buf.reserve(sides * rings + 1, sides * rings * 6);
    const b0 = buf.nv;
    for (let k = 0; k < rings; k++) {
      const t = k / rings, rr = r * Math.cos(t * Math.PI / 2), hh = h * Math.sin(t * Math.PI / 2);
      buf.color(col, 0.75 + 0.35 * t);
      for (let j = 0; j < sides; j++) {
        const a = j / sides * 6.2832, ca = Math.cos(a), sa = Math.sin(a);
        const dx = ux * ca + vx * sa, dy = uy * ca + vy * sa, dz = uz * ca + vz * sa;
        const nx = dx * (1 - t) + fx * t, ny = dy * (1 - t) + fy * t, nz = dz * (1 - t) + fz * t;
        const nl = Math.hypot(nx, ny, nz) || 1;
        buf.v(cx + dx * rr + fx * hh, cy + dy * rr + fy * hh, cz + dz * rr + fz * hh, nx / nl, ny / nl, nz / nl, sw, 0, 0);
      }
    }
    buf.color(col, 1.15);
    const top = buf.v(cx + fx * h, cy + fy * h, cz + fz * h, fx, fy, fz, sw, 0, 0);
    for (let k = 0; k < rings - 1; k++) for (let j = 0; j < sides; j++) {
      const j1 = (j + 1) % sides, a = b0 + k * sides + j, b = b0 + k * sides + j1, c = a + sides, d = b + sides;
      buf.tri(a, b, c); buf.tri(b, d, c);
    }
    const last = b0 + (rings - 1) * sides;
    for (let j = 0; j < sides; j++) buf.tri(last + j, last + (j + 1) % sides, top);
  },
  sphere(buf, cx, cy, cz, r, col, sides, rings, sw, jitter) {
    buf.reserve(sides * (rings - 1) + 2, sides * rings * 6);
    buf.pat(0, 0);
    buf.color(col, 1.1);
    const top = buf.v(cx, cy + r, cz, 0, 1, 0, sw, 0, 0);
    const b0 = buf.nv;
    const rj = mulberry32(((cx * 1000) | 0) ^ ((cz * 1000) | 0));
    for (let k = 1; k < rings; k++) {
      const th = k / rings * Math.PI, st = Math.sin(th), ct = Math.cos(th);
      buf.color(col, 1.05 - 0.35 * k / rings);
      for (let j = 0; j < sides; j++) {
        const a = j / sides * 6.2832, nx = st * Math.cos(a), ny = ct, nz = st * Math.sin(a);
        const rr = r * (1 + (rj() - 0.5) * jitter);
        buf.v(cx + nx * rr, cy + ny * rr, cz + nz * rr, nx, ny, nz, sw, 0, 0);
      }
    }
    buf.color(col, 0.6);
    const bot = buf.v(cx, cy - r, cz, 0, -1, 0, sw, 0, 0);
    for (let j = 0; j < sides; j++) buf.tri(top, b0 + (j + 1) % sides, b0 + j);
    for (let k = 0; k < rings - 2; k++) for (let j = 0; j < sides; j++) {
      const j1 = (j + 1) % sides, a = b0 + k * sides + j, b = b0 + k * sides + j1, c = a + sides, d = b + sides;
      buf.tri(a, b, c); buf.tri(b, d, c);
    }
    const last = b0 + (rings - 2) * sides;
    for (let j = 0; j < sides; j++) buf.tri(last + j, last + (j + 1) % sides, bot);
  },
  thinLine(buf, x0, y0, z0, x1, y1, z1, r, sw0, sw1) {
    let dx = x1 - x0, dy = y1 - y0, dz = z1 - z0;
    const l = Math.hypot(dx, dy, dz) || 1; dx /= l; dy /= l; dz /= l;
    let px = -dz, py = 0, pz = dx; let pl = Math.hypot(px, py, pz);
    if (pl < 0.1) { px = 1; py = 0; pz = 0; pl = 1; }
    px /= pl; py /= pl; pz /= pl;
    const qx = dy * pz - dz * py, qy = dz * px - dx * pz, qz = dx * py - dy * px;
    buf.reserve(6, 18);
    const b0 = buf.nv;
    for (let e = 0; e < 2; e++) {
      const x = e ? x1 : x0, y = e ? y1 : y0, z = e ? z1 : z0, sw = e ? sw1 : sw0;
      for (let j = 0; j < 3; j++) {
        const a = j / 3 * 6.2832, ca = Math.cos(a), sa = Math.sin(a);
        const nx = px * ca + qx * sa, ny = py * ca + qy * sa, nz = pz * ca + qz * sa;
        buf.v(x + nx * r, y + ny * r, z + nz * r, nx, ny, nz, sw, 0, 0);
      }
    }
    for (let j = 0; j < 3; j++) { const j1 = (j + 1) % 3; buf.tri(b0 + j, b0 + j1, b0 + 3 + j); buf.tri(b0 + j1, b0 + 3 + j1, b0 + 3 + j); }
  },
};
