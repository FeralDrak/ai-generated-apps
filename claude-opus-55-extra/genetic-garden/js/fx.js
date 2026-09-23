'use strict';
/* ==========================================================================
   Effets : particules (pollen, gouttes, graines, feuilles, pétales),
   ambiance (neige, lucioles, poussières dorées), surlignage des tronçons.
   ========================================================================== */

class ParticleSys {
  constructor(n, additive) {
    this.n = n; this.count = 0;
    this.pos = new Float32Array(n * 3); this.col = new Float32Array(n * 3); this.size = new Float32Array(n); this.misc = new Float32Array(n * 3);
    this.vel = new Float32Array(n * 3); this.life = new Float32Array(n); this.max = new Float32Array(n);
    this.grav = new Float32Array(n); this.drag = new Float32Array(n); this.spin = new Float32Array(n); this.flut = new Float32Array(n); this.a0 = new Float32Array(n);
    const g = this.geo = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aCol', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aMisc', new THREE.BufferAttribute(this.misc, 3).setUsage(THREE.DynamicDrawUsage));
    g.setDrawRange(0, 0);
    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: { uScale: Fx.uScale },
      vertexShader: `
        attribute vec3 aCol; attribute float aSize; attribute vec3 aMisc; uniform float uScale;
        varying vec3 vCol; varying vec3 vMisc;
        void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
          gl_PointSize = clamp(aSize * uScale / max(0.05, -mv.z), 0.0, 90.0); vCol = aCol; vMisc = aMisc; }`,
      fragmentShader: `
        varying vec3 vCol; varying vec3 vMisc;
        void main(){
          vec2 p = gl_PointCoord * 2.0 - 1.0;
          float c = cos(vMisc.y), s = sin(vMisc.y);
          p = vec2(c * p.x - s * p.y, s * p.x + c * p.y);
          float t = vMisc.x, a; vec3 col = vCol;
          if (t < 0.5) a = smoothstep(1.0, 0.15, length(p));
          else if (t < 1.5) { float d = length(vec2(p.x * 2.1, p.y)); a = 1.0 - smoothstep(0.82, 1.0, d); col *= 0.85 + 0.3 * step(abs(p.x), 0.06); }
          else if (t < 2.5) a = smoothstep(1.0, 0.45, length(p));
          else { float d = length(vec2(p.x * 1.5, p.y * 1.05 + 0.1 * p.x * p.x)); a = 1.0 - smoothstep(0.8, 1.0, d); }
          a *= vMisc.z;
          if (a < 0.02) discard;
          gl_FragColor = vec4(col, a);
          #include <colorspace_fragment>
        }`,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
  }
  spawn(x, y, z, vx, vy, vz, c, size, life, type, o = {}) {
    if (this.count >= this.n) return;
    const i = this.count++, i3 = i * 3;
    this.pos[i3] = x; this.pos[i3 + 1] = y; this.pos[i3 + 2] = z;
    this.vel[i3] = vx; this.vel[i3 + 1] = vy; this.vel[i3 + 2] = vz;
    this.col[i3] = srgbToLin(c[0]); this.col[i3 + 1] = srgbToLin(c[1]); this.col[i3 + 2] = srgbToLin(c[2]);
    this.size[i] = size; this.life[i] = 0; this.max[i] = life;
    this.misc[i3] = type; this.misc[i3 + 1] = rnd() * 6.28; this.misc[i3 + 2] = 0;
    this.grav[i] = o.grav !== undefined ? o.grav : 0; this.drag[i] = o.drag !== undefined ? o.drag : 0.5;
    this.spin[i] = o.spin || 0; this.flut[i] = o.flutter || 0; this.a0[i] = o.alpha || 1;
  }
  kill(i) {
    const j = --this.count;
    if (i === j) return;
    const cp3 = (arr) => { arr[i * 3] = arr[j * 3]; arr[i * 3 + 1] = arr[j * 3 + 1]; arr[i * 3 + 2] = arr[j * 3 + 2]; };
    cp3(this.pos); cp3(this.vel); cp3(this.col); cp3(this.misc);
    this.size[i] = this.size[j]; this.life[i] = this.life[j]; this.max[i] = this.max[j];
    this.grav[i] = this.grav[j]; this.drag[i] = this.drag[j]; this.spin[i] = this.spin[j]; this.flut[i] = this.flut[j]; this.a0[i] = this.a0[j];
  }
  update(dt, t) {
    const P = this.pos, V = this.vel, M = this.misc;
    for (let i = this.count - 1; i >= 0; i--) {
      this.life[i] += dt;
      const L = this.life[i], mx = this.max[i];
      if (L >= mx) { this.kill(i); continue; }
      const i3 = i * 3;
      const dr = Math.exp(-this.drag[i] * dt);
      V[i3] *= dr; V[i3 + 2] *= dr; V[i3 + 1] = V[i3 + 1] * dr - this.grav[i] * dt;
      const fl = this.flut[i];
      if (fl) { V[i3] += Math.sin(t * 3.1 + i) * fl * dt; V[i3 + 2] += Math.cos(t * 2.7 + i * 1.3) * fl * dt; }
      P[i3] += V[i3] * dt; P[i3 + 1] += V[i3 + 1] * dt; P[i3 + 2] += V[i3 + 2] * dt;
      const gy = terrainH(P[i3], P[i3 + 2]);
      if (P[i3 + 1] < gy + 0.01) { P[i3 + 1] = gy + 0.01; V[i3] *= 0.3; V[i3 + 1] = 0; V[i3 + 2] *= 0.3; this.spin[i] *= 0.2; }
      M[i3 + 1] += this.spin[i] * dt;
      M[i3 + 2] = this.a0[i] * Math.min(1, L * 6) * Math.min(1, (mx - L) * 1.5);
    }
    const g = this.geo;
    g.setDrawRange(0, this.count);
    for (const k of ['position', 'aCol', 'aSize', 'aMisc']) g.attributes[k].needsUpdate = true;
  }
}

const Fx = {
  uScale: { value: 500 },
  init(scene) {
    this.parts = new ParticleSys(5000, false);
    this.glow = new ParticleSys(1500, true);
    scene.add(this.parts.points, this.glow.points);
    this.makeAmbient(scene);
    this.leafAcc = 0; this.t = 0;
  },
  resize(h, fov) { this.uScale.value = h / (2 * Math.tan(fov * Math.PI / 360)); },

  /* ---------- Ambiance animée sur GPU ---------- */
  makeAmbient(scene) {
    const mk = (n, box, vs, fs, additive, uniforms) => {
      const g = new THREE.BufferGeometry();
      const p = new Float32Array(n * 3), r = new Float32Array(n);
      for (let i = 0; i < n; i++) { p[i * 3] = rand(-box[0], box[0]); p[i * 3 + 1] = rand(0, box[1]); p[i * 3 + 2] = rand(-box[2], box[2]); r[i] = rnd(); }
      g.setAttribute('position', new THREE.BufferAttribute(p, 3));
      g.setAttribute('aR', new THREE.BufferAttribute(r, 1));
      const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, uniforms: Object.assign({ uScale: this.uScale, uTime: U.uTime, uCam: U.uCam, uWind: U.uWind }, uniforms), vertexShader: vs, fragmentShader: fs });
      const pts = new THREE.Points(g, m);
      pts.frustumCulled = false;
      scene.add(pts);
      return m;
    };
    const head = `attribute float aR; uniform float uScale, uTime; uniform vec3 uCam; uniform vec2 uWind; varying float vA; ${TERRAIN_GLSL}`;
    // neige
    this.snowMat = mk(3000, [30, 22, 30], `${head} uniform float uAmt;
      void main(){
        vec3 p = position;
        p.y -= uTime * (0.8 + aR * 0.6);
        p.xz += uWind * uTime * 1.5 + vec2(sin(uTime * 0.7 + aR * 30.0), cos(uTime * 0.6 + aR * 17.0)) * 0.4;
        vec3 box = vec3(60.0, 22.0, 60.0);
        vec3 rel = mod(p - uCam + vec3(30.0, 6.0, 30.0), box) - vec3(30.0, 6.0, 30.0);
        vec3 w = uCam + rel;
        vA = uAmt * step(aR, uAmt * 1.2) * smoothstep(30.0, 18.0, length(rel.xz)) * step(terrainH(w.xz), w.y);
        vec4 mv = viewMatrix * vec4(w, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (0.035 + aR * 0.03) * uScale / max(0.1, -mv.z);
      }`, `varying float vA; void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; float a = smoothstep(1.0, 0.3, d) * vA; if (a < 0.01) discard; gl_FragColor = vec4(0.95, 0.97, 1.0, a * 0.9); }`,
      false, { uAmt: { value: 0 } });
    // lucioles
    this.fireMat = mk(260, [28, 1, 28], `${head} uniform float uAmt;
      void main(){
        vec3 p = position;
        p.x += sin(uTime * 0.3 + aR * 40.0) * 1.5; p.z += cos(uTime * 0.25 + aR * 23.0) * 1.5;
        vec2 rel = mod(p.xz - uCam.xz + 28.0, 56.0) - 28.0;
        vec2 xz = uCam.xz + rel;
        float y = terrainH(xz) + 0.35 + aR * 1.6 + sin(uTime * 0.8 + aR * 11.0) * 0.25;
        float blink = pow(max(0.0, sin(uTime * (0.9 + aR) + aR * 50.0)), 3.0);
        vA = uAmt * blink * smoothstep(28.0, 16.0, length(rel));
        vec4 mv = viewMatrix * vec4(xz.x, y, xz.y, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = 0.2 * uScale / max(0.1, -mv.z);
      }`, `varying float vA; void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; float a = (smoothstep(1.0, 0.0, d) * 0.5 + smoothstep(0.25, 0.0, d) * 1.5) * vA; if (a < 0.01) discard; gl_FragColor = vec4(vec3(0.75, 1.0, 0.35) * a, a); }`,
      true, { uAmt: { value: 0 } });
    // poussières / pollens dorés en suspension
    this.dustMat = mk(500, [14, 5, 14], `${head} uniform float uAmt;
      void main(){
        vec3 p = position;
        p.xz += uWind * uTime * 0.6 + vec2(sin(uTime * 0.21 + aR * 9.0), cos(uTime * 0.17 + aR * 13.0)) * 0.8;
        p.y += sin(uTime * 0.3 + aR * 20.0) * 0.4;
        vec3 rel = vec3(mod(p.x - uCam.x + 14.0, 28.0) - 14.0, 0.0, mod(p.z - uCam.z + 14.0, 28.0) - 14.0);
        vec3 w = vec3(uCam.x + rel.x, terrainH(uCam.xz + rel.xz) + 0.2 + p.y, uCam.z + rel.z);
        vA = uAmt * smoothstep(14.0, 6.0, length(rel.xz)) * (0.4 + 0.6 * sin(uTime * 1.3 + aR * 40.0) * sin(uTime * 1.3 + aR * 40.0));
        vec4 mv = viewMatrix * vec4(w, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = 0.018 * uScale / max(0.1, -mv.z);
      }`, `varying float vA; void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; float a = smoothstep(1.0, 0.0, d) * vA; if (a < 0.01) discard; gl_FragColor = vec4(vec3(1.0, 0.92, 0.6) * a, a); }`,
      true, { uAmt: { value: 0 } });
  },

  update(dt, cam, doy) {
    this.t += dt;
    const night = Sky.state.night, sunUp = Sky.state.sunUp;
    this.snowMat.uniforms.uAmt.value = smoothstep(83, 88, doy) * (1 - smoothstep(100, 106, doy)) * (0.35 + 0.65 * Math.max(0, Math.sin(Eco.day * 0.9)));
    this.fireMat.uniforms.uAmt.value = night * smoothstep(22, 32, doy) * (1 - smoothstep(58, 66, doy));
    this.dustMat.uniforms.uAmt.value = sunUp * (doy < 70 ? 0.8 : 0.3) * (doy > 84 ? 0 : 1);
    // feuilles mortes en automne autour du joueur
    if (doy > 60 && doy < 92) {
      this.leafAcc += dt * 6;
      while (this.leafAcc > 1) {
        this.leafAcc -= 1;
        const p = pick(Eco.plants);
        if (!p || !p.woody || p.ph.evergreen || p.state !== 'grow' || p.autumn < 0.3 || p.leafAmt < 0.05) continue;
        if (Math.hypot(p.x - cam.x, p.z - cam.z) > 40) continue;
        const a = rnd() * 6.28, r = rnd() * p.crownR;
        const y = p.y + p.top * rand(0.45, 0.95);
        const c = hsl(p.ph.autumnH + rand(-0.03, 0.03), 0.7, rand(0.3, 0.45));
        this.parts.spawn(p.x + Math.cos(a) * r, y, p.z + Math.sin(a) * r, U.uWind.value.x, -0.3, U.uWind.value.y, c, Math.max(0.05, Builder.leafLen(p, p.ph) * 0.7), 14, 1, { grav: 0.25, drag: 1.2, spin: rand(-3, 3), flutter: 2.5 });
      }
    }
    this.parts.update(dt, this.t);
    this.glow.update(dt, this.t);
  },

  /* ---------- Effets ponctuels ---------- */
  burst(x, y, z, c, n = 14, spd = 0.6, size = 0.025, glow = true) {
    const sys = glow ? this.glow : this.parts;
    for (let i = 0; i < n; i++) {
      const a = rnd() * 6.28, e = rnd() * 2 - 0.3;
      sys.spawn(x, y, z, Math.cos(a) * spd * rnd(), e * spd * 0.8, Math.sin(a) * spd * rnd(), c, size * rand(0.6, 1.3), rand(0.6, 1.4), 0, { grav: 0.4, drag: 2 });
    }
  },
  sparkle(x, y, z, c) {
    for (let i = 0; i < 26; i++) {
      const a = rnd() * 6.28, r = rnd() * 0.35;
      this.glow.spawn(x + Math.cos(a) * r, y + rnd() * 0.3, z + Math.sin(a) * r, 0, rand(0.2, 0.7), 0, c, rand(0.02, 0.05), rand(0.8, 1.8), 0, { grav: -0.1, drag: 1, flutter: 1 });
    }
  },
  water(x0, y0, z0, x1, y1, z1) {
    for (let i = 0; i < 5; i++) {
      const T = rand(0.45, 0.6);
      const tx = x1 + rand(-0.5, 0.5), tz = z1 + rand(-0.5, 0.5);
      const vx = (tx - x0) / T, vz = (tz - z0) / T, vy = (y1 - y0) / T + 4.9 * T;
      this.parts.spawn(x0, y0, z0, vx, vy, vz, [0.6, 0.78, 0.95], rand(0.018, 0.03), T + 0.05, 0, { grav: 9.8, drag: 0, alpha: 0.8 });
    }
  },
  seeds(b, landed, total) {
    const pos = b.worldPos();
    if (Math.hypot(pos[0] - Player.pos.x, pos[2] - Player.pos.z) > 45) return;
    const fluffy = b.seg.g.ph.fluffy;
    const n = Math.min(total, 14);
    for (let i = 0; i < n; i++) {
      const s = landed[i];
      const T = fluffy ? rand(3, 6) : rand(0.6, 1.2);
      const tx = s ? s.x : pos[0] + rand(-2, 2), tz = s ? s.z : pos[2] + rand(-2, 2);
      const vx = (tx - pos[0]) / T, vz = (tz - pos[2]) / T;
      if (fluffy) this.parts.spawn(pos[0], pos[1], pos[2], vx, rand(0.2, 0.6), vz, [0.96, 0.95, 0.9], 0.035, T, 2, { grav: 0.04, drag: 0.05, flutter: 0.8 });
      else this.parts.spawn(pos[0], pos[1], pos[2], vx, 2 + rnd() * 1.5, vz, [0.4, 0.3, 0.18], 0.012, T, 0, { grav: 7, drag: 0 });
    }
  },
  petals(b) {
    const pos = b.worldPos(), ph = b.seg.g.ph;
    if (Math.hypot(pos[0] - Player.pos.x, pos[2] - Player.pos.z) > 35) return;
    const n = Math.min(ph.petals, 8);
    for (let i = 0; i < n; i++) this.parts.spawn(pos[0], pos[1], pos[2], rand(-0.3, 0.3) + U.uWind.value.x * 0.5, rand(0, 0.3), rand(-0.3, 0.3) + U.uWind.value.y * 0.5, ph.petalC, b.R * 0.9, rand(2.5, 5), 3, { grav: 0.35, drag: 1.5, spin: rand(-4, 4), flutter: 1.5 });
  },
  treeDust(p) {
    const d = [Math.cos(p.fallDir), Math.sin(p.fallDir)];
    for (let i = 0; i < 60; i++) {
      const r = rnd() * p.top;
      this.parts.spawn(p.x + d[0] * r + rand(-1, 1), p.y + 0.2, p.z + d[1] * r + rand(-1, 1), rand(-0.8, 0.8), rand(0.3, 1.2), rand(-0.8, 0.8), [0.55, 0.5, 0.42], rand(0.2, 0.5), rand(1.5, 3), 0, { grav: -0.05, drag: 1.5, alpha: 0.35 });
    }
  },
};

/* ==========================================================================
   Surlignage : tronçon visé, tronçon épinglé, vue clonale d'une plante
   ========================================================================== */
const Highlight = {
  init(scene) {
    const mk = (opacity) => {
      const m = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity, depthTest: false, depthWrite: false, side: THREE.DoubleSide }));
      m.frustumCulled = false; m.renderOrder = 20; m.visible = false;
      scene.add(m); return m;
    };
    this.aimMesh = mk(0.4); this.pinMesh = mk(0.55); this.cloneMesh = mk(0.85);
    this.aimKey = null; this.pinKey = null; this.cloneT = 0;
  },
  geo(parts) {
    let nv = 0; for (const p of parts) nv += p.n;
    const pos = new Float32Array(nv * 3), col = new Float32Array(nv * 3), idx = [];
    let o = 0;
    for (const p of parts) { p.fill(pos, col, o, idx); o += p.n; }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setIndex(idx);
    return g;
  },
  segTube(p, s, c, inflate, minR) {
    const K = s.K, sides = 6, n = (K + 1) * sides;
    const lc = [srgbToLin(c[0]), srgbToLin(c[1]), srgbToLin(c[2])];
    return {
      n, fill(pos, col, o, idx) {
        for (let k = 0; k <= K; k++) {
          const q = k * 3, rad = Math.max(minR, lerp(s.rad, s.radEnd, k / K) * inflate + 0.006);
          const tx = s.T[q], ty = s.T[q + 1], tz = s.T[q + 2], nx = s.N[q], ny = s.N[q + 1], nz = s.N[q + 2];
          const bx = ty * nz - tz * ny, by = tz * nx - tx * nz, bz = tx * ny - ty * nx;
          for (let j = 0; j < sides; j++) {
            const a = j / sides * 6.2832, ca = Math.cos(a), sa = Math.sin(a), i = (o + k * sides + j) * 3;
            pos[i] = p.x + s.P[q] + (nx * ca + bx * sa) * rad; pos[i + 1] = p.y + s.P[q + 1] + (ny * ca + by * sa) * rad; pos[i + 2] = p.z + s.P[q + 2] + (nz * ca + bz * sa) * rad;
            col[i] = lc[0]; col[i + 1] = lc[1]; col[i + 2] = lc[2];
          }
        }
        for (let k = 0; k < K; k++) for (let j = 0; j < sides; j++) {
          const a = o + k * sides + j, b = o + k * sides + (j + 1) % sides;
          idx.push(a, a + sides, b, b, a + sides, b + sides);
        }
      },
    };
  },
  ring(b, c) {
    const n = 32, lc = [srgbToLin(c[0]), srgbToLin(c[1]), srgbToLin(c[2])];
    return {
      n, fill(pos, col, o, idx) {
        const w = b.worldPos(), R = b.R * 1.35 + 0.01;
        let ux = -b.fz, uz = b.fx, uy = 0; let l = Math.hypot(ux, uz); if (l < 0.2) { ux = 1; uz = 0; l = 1; } ux /= l; uz /= l;
        const vx = b.fy * uz - b.fz * uy, vy = b.fz * ux - b.fx * uz, vz = b.fx * uy - b.fy * ux;
        for (let i = 0; i < 16; i++) {
          const a = i / 16 * 6.2832, ca = Math.cos(a), sa = Math.sin(a);
          for (let e = 0; e < 2; e++) {
            const r = R * (e ? 1.18 : 1), k = (o + i * 2 + e) * 3;
            pos[k] = w[0] + (ux * ca + vx * sa) * r; pos[k + 1] = w[1] + (uy * ca + vy * sa) * r; pos[k + 2] = w[2] + (uz * ca + vz * sa) * r;
            col[k] = lc[0]; col[k + 1] = lc[1]; col[k + 2] = lc[2];
          }
        }
        for (let i = 0; i < 16; i++) { const a = o + i * 2, b2 = o + ((i + 1) % 16) * 2; idx.push(a, a + 1, b2, b2, a + 1, b2 + 1); }
      },
    };
  },
  setMesh(mesh, parts) {
    mesh.geometry.dispose();
    if (!parts.length) { mesh.visible = false; mesh.geometry = new THREE.BufferGeometry(); return; }
    mesh.geometry = this.geo(parts); mesh.visible = true;
  },
  target(t, c) {
    if (!t || !t.plant || t.plant.gone) return [];
    if (t.bloom) return [this.ring(t.bloom, c)];
    if (t.seg && t.plant.segs.includes(t.seg)) return [this.segTube(t.plant, t.seg, c, 1.25, 0.012)];
    return [];
  },
  update(aim, pin, clonePlant, force) {
    const key = (t) => t && t.plant ? `${t.plant.id}:${t.seg ? t.seg.idx : ''}:${t.bloom ? t.bloom.id : ''}:${t.plant.lastBuild}` : '';
    const ak = key(aim), pk = key(pin);
    if (ak !== this.aimKey || force) { this.aimKey = ak; this.setMesh(this.aimMesh, this.target(aim, [1, 0.92, 0.55])); }
    if (pk !== this.pinKey || force) { this.pinKey = pk; this.setMesh(this.pinMesh, this.target(pin, [0.45, 0.95, 1])); }
    const ck = clonePlant ? clonePlant.id + ':' + clonePlant.lastBuild : '';
    if (ck !== this.cloneKey || force) {
      this.cloneKey = ck;
      const parts = [];
      if (clonePlant && !clonePlant.gone) for (const s of clonePlant.segs) parts.push(this.segTube(clonePlant, s, cloneColor(s.g, clonePlant), 1.05, clonePlant.woody ? 0.02 : 0.006));
      this.setMesh(this.cloneMesh, parts);
    }
  },
};
/** Couleur d'une lignée clonale (même génome = même couleur ; le génome d'origine est blanc). */
function cloneColor(g, plant) {
  if (g === plant.g) return [0.95, 0.95, 0.92];
  const h = (hash32(g.id * 2654435761) % 1000) / 1000;
  return hsl(h, 0.85, 0.58);
}
