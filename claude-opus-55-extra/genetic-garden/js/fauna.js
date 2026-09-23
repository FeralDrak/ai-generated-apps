'use strict';
/* ==========================================================================
   Pollinisateurs visibles : papillons et abeilles. Ils butinent les fleurs
   ouvertes et transportent réellement le pollen (ADN) d'une fleur à l'autre.
   ========================================================================== */

const Fauna = {
  list: [],
  init(scene) {
    this.scene = scene;
    const wingMat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x2a2320 });
    const beeWingMat = new THREE.MeshBasicMaterial({ color: 0xdfeaf5, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false });
    const palettes = [
      [[0.95, 0.55, 0.12], [0.1, 0.07, 0.05]], [[0.35, 0.55, 0.95], [0.08, 0.1, 0.2]], [[0.97, 0.96, 0.92], [0.25, 0.25, 0.28]],
      [[0.98, 0.85, 0.25], [0.3, 0.2, 0.05]], [[0.75, 0.35, 0.2], [0.15, 0.08, 0.05]], [[0.55, 0.85, 0.95], [0.1, 0.2, 0.25]],
    ];
    for (let i = 0; i < 16; i++) this.list.push(this.makeButterfly(pick(palettes), wingMat, bodyMat));
    for (let i = 0; i < 10; i++) this.list.push(this.makeBee(bodyMat, beeWingMat));
    for (const f of this.list) { this.respawn(f, true); scene.add(f.group); }
  },
  wingGeo(col, edge, side) {
    // aile antérieure + postérieure, éventail depuis le corps
    const fore = [[0.0, 0.004], [0.022, 0.03], [0.05, 0.04], [0.062, 0.028], [0.056, 0.008], [0.03, -0.002]];
    const hind = [[0.0, -0.002], [0.03, -0.004], [0.044, -0.02], [0.036, -0.04], [0.016, -0.042], [0.004, -0.02]];
    const pos = [], cols = [], lin = (c) => [srgbToLin(c[0]), srgbToLin(c[1]), srgbToLin(c[2])];
    const C = lin(col), Ed = lin(edge);
    for (const poly of [fore, hind]) {
      const cx = poly.reduce((s, p) => s + p[0], 0) / poly.length * 0.6, cz = poly.reduce((s, p) => s + p[1], 0) / poly.length * 0.6;
      for (let k = 0; k < poly.length; k++) {
        const a = poly[k], b = poly[(k + 1) % poly.length];
        pos.push(cx * side, 0, cz, a[0] * side, 0, a[1], b[0] * side, 0, b[1]);
        cols.push(...C, ...(k === 0 ? C : Ed), ...(k === poly.length - 1 ? C : Ed));
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    g.computeVertexNormals();
    return g;
  },
  makeButterfly(pal, wingMat, bodyMat) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.003, 0.045, 5), bodyMat);
    body.rotation.x = Math.PI / 2;
    const wl = new THREE.Mesh(this.wingGeo(pal[0], pal[1], 1), wingMat);
    const wr = new THREE.Mesh(this.wingGeo(pal[0], pal[1], -1), wingMat);
    group.add(body, wl, wr);
    group.scale.setScalar(1.3);
    return { kind: 'papillon', group, wl, wr, pos: new THREE.Vector3(), vel: new THREE.Vector3(), state: 'seek', target: null, timer: 0, pollen: null, phase: rnd() * 6, speed: rand(1.2, 1.8), flap: 11, color: pal[0], visible: true };
  },
  makeBee(bodyMat, wingMat) {
    const group = new THREE.Group();
    const g = new THREE.SphereGeometry(1, 8, 6);
    const cols = [], p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const z = p.getZ(i);
      const stripe = Math.sin(z * 9) > 0.2 ? [0.08, 0.06, 0.03] : [0.95, 0.72, 0.12];
      cols.push(srgbToLin(stripe[0]), srgbToLin(stripe[1]), srgbToLin(stripe[2]));
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    const body = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true }));
    body.scale.set(0.007, 0.007, 0.012);
    const wg = new THREE.CircleGeometry(0.009, 8); wg.rotateX(-Math.PI / 2); wg.translate(0.009, 0, 0);
    const wl = new THREE.Mesh(wg, wingMat), wr = new THREE.Mesh(wg, wingMat);
    wl.position.y = wr.position.y = 0.006; wr.rotation.y = Math.PI;
    group.add(body, wl, wr);
    group.scale.setScalar(1.5);
    return { kind: 'abeille', group, wl, wr, pos: new THREE.Vector3(), vel: new THREE.Vector3(), state: 'seek', target: null, timer: 0, pollen: null, phase: rnd() * 6, speed: rand(2.4, 3.2), flap: 60, visible: true };
  },
  respawn(f, init) {
    const a = rnd() * 6.28, d = init ? rand(3, 25) : rand(18, 26);
    const pp = Player.pos || { x: 0, z: 0 };
    const x = clamp(pp.x + Math.cos(a) * d, -48, 48), z = clamp(pp.z + Math.sin(a) * d, -48, 48);
    f.pos.set(x, terrainH(x, z) + rand(1, 2.5), z);
    f.vel.set(0, 0, 0); f.target = null; f.state = 'seek'; f.timer = 0;
  },
  chooseTarget(f) {
    const ob = Eco.openBlooms;
    if (!ob.length) return null;
    const pp = Player.pos;
    let best = null, bs = 0;
    for (let k = 0; k < 40; k++) {
      const b = ob[Math.floor(rnd() * ob.length)];
      if (b === f.target || (f.target && b.seg.plant === f.target.seg.plant && rnd() < 0.7)) continue;
      const w = b.worldPos(_fw);
      const d = Math.hypot(w[0] - f.pos.x, w[2] - f.pos.z), dp = Math.hypot(w[0] - pp.x, w[2] - pp.z);
      if (dp > 28) continue;
      const ph = b.seg.g.ph;
      let s = ph.attract / (1 + d * 0.25);
      if (f.kind === 'abeille') s *= 0.6 + ph.nectar;
      else s *= 0.7 + ph.sat * 0.6;
      if (b.seg.plant.woody && f.kind === 'papillon') s *= 0.5;
      if (f.pollen) s /= 1 + 25 * hueDist(ph.hue, f.pollen.g.ph.hue) ** 2;   // constance florale
      if (s > bs) { bs = s; best = b; }
    }
    return best;
  },
  update(dt, active) {
    const t = performance.now() / 1000;
    for (const f of this.list) {
      const g = f.group;
      if (!active) {
        // la nuit ou en hiver : ils s'éloignent et disparaissent
        if (f.visible) { f.pos.y += dt * 1.5; if (f.pos.y > terrainH(f.pos.x, f.pos.z) + 6) { f.visible = false; g.visible = false; } }
        g.position.copy(f.pos);
        continue;
      }
      if (!f.visible) { f.visible = true; g.visible = true; this.respawn(f); }
      if (Math.hypot(f.pos.x - Player.pos.x, f.pos.z - Player.pos.z) > 36) this.respawn(f);
      const tg = f.target;
      if (tg && (tg.state !== 'open' || tg.seg.plant.gone)) { f.target = null; if (f.state === 'feed') f.state = 'seek'; }
      if (f.state === 'feed') {
        f.timer -= dt;
        const w = f.target ? f.target.worldPos(_fw) : null;
        if (w) f.pos.set(w[0] + f.target.fx * 0.012, w[1] + f.target.fy * 0.012 + 0.004, w[2] + f.target.fz * 0.012);
        const open = f.kind === 'papillon' ? 0.2 + 0.9 * (0.5 + 0.5 * Math.sin(t * 2.2 + f.phase)) : 0.3 + 0.3 * Math.sin(t * f.flap);
        f.wl.rotation.z = open; f.wr.rotation.z = -open;
        if (f.timer <= 0) { f.state = 'seek'; f.vel.set(rand(-0.5, 0.5), 1.2, rand(-0.5, 0.5)); f.target = this.chooseTarget(f); }
      } else {
        if (!f.target || rnd() < dt * 0.05) f.target = this.chooseTarget(f);
        let tx, ty, tz;
        if (f.target) { const w = f.target.worldPos(_fw); tx = w[0] + f.target.fx * 0.012; ty = w[1] + f.target.fy * 0.012 + 0.004; tz = w[2] + f.target.fz * 0.012; }
        else { tx = Player.pos.x + Math.sin(t * 0.1 + f.phase) * 12; tz = Player.pos.z + Math.cos(t * 0.13 + f.phase) * 12; ty = terrainH(tx, tz) + 1.2; }
        const hd = Math.hypot(tx - f.pos.x, tz - f.pos.z);
        const cruise = hd > 2 ? Math.min(0.8, hd * 0.12) : 0;      // vole un peu au-dessus, puis descend sur la fleur
        const dx = tx - f.pos.x, dy = ty + cruise - f.pos.y, dz = tz - f.pos.z, d = Math.hypot(dx, dy, dz) || 1;
        const wig = (f.kind === 'papillon' ? 1.4 : 0.7) * clamp(d / 1.2, 0.05, 1);
        const sp = f.speed * Math.min(1, d * 1.2 + 0.12);
        const want = [dx / d * sp + Math.sin(t * 3.1 + f.phase) * wig, dy / d * sp + Math.sin(t * 4.3 + f.phase * 2) * wig * 0.6, dz / d * sp + Math.cos(t * 2.7 + f.phase) * wig];
        const k = Math.min(1, dt * (d < 1 ? 7 : f.kind === 'papillon' ? 2.5 : 4));
        f.vel.x += (want[0] - f.vel.x) * k; f.vel.y += (want[1] - f.vel.y) * k; f.vel.z += (want[2] - f.vel.z) * k;
        f.pos.addScaledVector(f.vel, dt);
        const gy = terrainH(f.pos.x, f.pos.z) + 0.15;
        if (f.pos.y < gy) f.pos.y = gy;
        const flap = f.kind === 'papillon' ? 0.15 + 1.05 * (0.5 + 0.5 * Math.sin(t * f.flap + f.phase)) : 0.35 * Math.sin(t * f.flap);
        f.wl.rotation.z = flap; f.wr.rotation.z = -flap;
        if (f.target && d < 0.07) this.land(f);
      }
      g.position.copy(f.pos);
      if (f.vel.lengthSq() > 0.01 && f.state !== 'feed') g.rotation.set(0, Math.atan2(f.vel.x, f.vel.z), 0);
    }
  },
  land(f) {
    const b = f.target;
    f.state = 'feed'; f.timer = f.kind === 'papillon' ? rand(2, 5) : rand(1, 2.5);
    f.vel.set(0, 0, 0);
    const pl = b.seg.plant;
    if (f.pollen && f.pollen.id !== pl.id && f.pollen.g.distance(b.seg.g) <= COMPAT) b.addPollen(f.pollen.g, f.pollen);
    f.pollen = { g: b.seg.g, id: pl.id, name: b.seg.g.name, gen: pl.gen };
    if (Math.hypot(f.pos.x - Player.pos.x, f.pos.z - Player.pos.z) < 12) {
      const c = b.seg.g.ph.petalC;
      Fx.burst(f.pos.x, f.pos.y, f.pos.z, [1, 0.9, 0.4], 5, 0.15, 0.012, true);
      if (f.kind === 'abeille') Sound.buzz(f.pos);
    }
  },
};
const _fw = [0, 0, 0];
