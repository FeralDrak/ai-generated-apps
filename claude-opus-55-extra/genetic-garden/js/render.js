'use strict';
/* ==========================================================================
   Rendu 3D (three.js) : scène, lumière, ciel, terrain, herbe, étang,
   clôture, forêt lointaine, gestion des maillages de plantes.
   ========================================================================== */

// uniformes partagés par tous les matériaux animés
const U = {
  uTime: { value: 0 }, uWind: { value: null }, uGust: { value: 1 }, uSnow: { value: 0 }, uLight: { value: 1 },
  uCam: { value: null }, uR: { value: 30 }, uGrassH: { value: 1 }, uWater: { value: POND.level },
  uGrassBase: { value: null }, uGrassTip: { value: null }, uGrassDry: { value: null }, uDry: { value: 0 },
  uGroundTint: { value: null },
};

/** Même déplacement dû au vent que dans le shader des plantes (pour viser et butiner précisément). */
function windDisp(x, z, sway, out) {
  const t = U.uTime.value, w = U.uWind.value;
  const ph = x * 0.21 + z * 0.17;
  const w1 = Math.sin(t * 1.7 + ph) * 0.6 + Math.sin(t * 3.1 + ph * 1.7) * 0.25;
  const gust = 0.5 + 0.5 * Math.sin(t * 0.37 + ph * 0.06);
  const k = (w1 * U.uGust.value + gust * 0.8) * sway * 0.3;
  out[0] = w.x * k; out[1] = -(w.x * w.x + w.y * w.y) * k * k * 0.6; out[2] = w.y * k;
  return out;
}

const View = {
  quality: { grass: 1, shadows: true },
  init(canvas) {
    U.uWind.value = new THREE.Vector2(0.3, 0.1);
    U.uCam.value = new THREE.Vector3();
    U.uGrassBase.value = new THREE.Color(); U.uGrassTip.value = new THREE.Color(); U.uGrassDry.value = new THREE.Color();
    U.uGroundTint.value = new THREE.Color(1, 1, 1);
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    const sc = this.scene = new THREE.Scene();
    sc.fog = new THREE.FogExp2(0xbfd8ee, 0.0062);
    this.camera = new THREE.PerspectiveCamera(70, 1, 0.05, 2000);
    // lumières
    const sun = this.sun = new THREE.DirectionalLight(0xffffff, 3);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc2 = sun.shadow.camera;
    sc2.left = -42; sc2.right = 42; sc2.top = 42; sc2.bottom = -42; sc2.near = 1; sc2.far = 260;
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
    sc.add(sun); sc.add(sun.target);
    this.hemi = new THREE.HemisphereLight(0xbcd4f0, 0x4a4630, 1.1);
    sc.add(this.hemi);
    this.plantMat = this.makePlantMaterial();
    this.makeSky();
    this.makeTerrain();
    this.makeWater();
    this.makeFence();
    this.makeForest();
    this.makeGrass();
    this.resize();
  },
  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    Fx.resize(h, this.camera.fov);
  },
  setShadows(on) {
    this.quality.shadows = on;
    this.sun.castShadow = on;
    this.renderer.shadowMap.needsUpdate = true;
    this.scene.traverse(o => { if (o.material) o.material.needsUpdate = true; });
  },

  /* ---------- Matériau des plantes : motifs de pétales, vent, neige ---------- */
  makePlantMaterial() {
    const m = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
    m.onBeforeCompile = (sh) => {
      for (const k of ['uTime', 'uWind', 'uGust', 'uSnow', 'uLight']) sh.uniforms[k] = U[k];
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', `#include <common>
          attribute vec3 color2; attribute vec4 aPat;
          varying vec3 vColor2; varying vec4 vPat; varying float vWNy;
          uniform float uTime; uniform vec2 uWind; uniform float uGust;`)
        .replace('#include <color_vertex>', `vColor = pow(color, vec3(2.2)); vColor2 = pow(color2, vec3(2.2)); vPat = aPat;`)
        .replace('#include <defaultnormal_vertex>', `#include <defaultnormal_vertex>
          vWNy = normalize(mat3(modelMatrix) * objectNormal).y;`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          float sway = aPat.w / 255.0;
          vec4 wp0 = modelMatrix * vec4(position, 1.0);
          float wph = dot(wp0.xz, vec2(0.21, 0.17));
          float w1 = sin(uTime * 1.7 + wph) * 0.6 + sin(uTime * 3.1 + wph * 1.7) * 0.25;
          float gust = 0.5 + 0.5 * sin(uTime * 0.37 + wph * 0.06);
          vec2 disp = uWind * (w1 * uGust + gust * 0.8) * sway * 0.3;
          transformed.xz += disp;
          transformed.y -= dot(disp, disp) * 0.6;`);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
          varying vec3 vColor2; varying vec4 vPat; varying float vWNy;
          uniform float uSnow; uniform float uLight;
          float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }`)
        .replace('#include <color_fragment>', `
          vec3 col = vColor;
          float ptype = mod(vPat.x + 0.5, 8.0) - 0.5;
          float pseed = floor((vPat.x + 0.5) / 8.0);
          float pu = (vPat.y - 128.0) / 127.0;
          float pv = vPat.z / 255.0;
          float glow = 0.0;
          if (ptype > 0.5 && ptype < 6.5) {
            vec3 c2 = vColor2;
            if (ptype < 1.5) { col *= 0.78 + 0.22 * smoothstep(0.0, 0.4, pv); }
            else if (ptype < 2.5) { col = mix(c2, col, smoothstep(0.06, 0.6, pv)); }
            else if (ptype < 3.5) {
              float s = abs(sin(pu * 3.1416 * 2.5));
              float line = (1.0 - smoothstep(0.0, 0.3, s)) * (1.0 - smoothstep(0.3, 0.95, pv));
              col = mix(col * (0.8 + 0.2 * smoothstep(0.0, 0.4, pv)), c2, line * 0.9);
            } else if (ptype < 4.5) {
              vec2 g = vec2(pu * 2.3, pv * 6.5) + pseed * 1.37;
              vec2 cell = floor(g); vec2 f = fract(g) - 0.5;
              float h = hash12(cell);
              vec2 o = vec2(hash12(cell + 7.1), hash12(cell + 3.3)) - 0.5;
              float d = length(f - o * 0.45);
              float spot = step(0.3, h) * (1.0 - smoothstep(0.13, 0.2, d)) * (1.0 - smoothstep(0.5, 0.88, pv)) * smoothstep(0.05, 0.15, pv);
              col = mix(col, c2, spot);
            } else if (ptype < 5.5) {
              float e = max(smoothstep(0.6, 0.92, abs(pu)), smoothstep(0.8, 0.98, pv));
              col = mix(col, c2, e);
            } else {
              col = mix(col, c2, smoothstep(0.52, 0.72, pv));
            }
            glow = 0.4;
          } else if (ptype > 6.5) {
            float rib = 1.0 - smoothstep(0.0, 0.14, abs(pu));
            col *= 0.92 + 0.16 * pv - rib * 0.14 * (1.0 - pv);
            glow = 0.16;
          }
          col = mix(col, vec3(0.9, 0.93, 1.0), uSnow * smoothstep(0.35, 0.8, vWNy));
          diffuseColor.rgb *= col;
          totalEmissiveRadiance += col * glow * uLight * 0.3;
        `);
    };
    return m;
  },

  /* ---------- Ciel : dégradé, soleil, nuages, étoiles ---------- */
  makeSky() {
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: {
        uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uMoonDir: { value: new THREE.Vector3(0, 1, 0) },
        uZenith: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uSunCol: { value: new THREE.Color() },
        uTime: U.uTime, uNight: { value: 0 }, uCloud: { value: 0.5 }, uCloudCol: { value: new THREE.Color() },
      },
      vertexShader: `varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }`,
      fragmentShader: `
        varying vec3 vDir;
        uniform vec3 uSunDir, uMoonDir, uZenith, uHorizon, uSunCol, uCloudCol; uniform float uTime, uNight, uCloud;
        float h31(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.yzx + 33.33); return fract((p.x + p.y) * p.z); }
        float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
        float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
          return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }
        float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ s += a * vn(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
        void main(){
          vec3 d = normalize(vDir);
          float h = d.y;
          vec3 col = mix(uHorizon, uZenith, pow(max(h, 0.0), 0.55));
          col = mix(col, uHorizon * 0.8, smoothstep(0.0, -0.25, h));
          float sd = max(dot(d, uSunDir), 0.0);
          col += uSunCol * (pow(sd, 900.0) * 30.0 + pow(sd, 18.0) * 0.35 + pow(sd, 3.0) * 0.08) * smoothstep(-0.1, 0.05, uSunDir.y);
          // étoiles
          if (uNight > 0.01 && h > 0.0) {
            vec3 sp = d * 220.0; vec3 cell = floor(sp); vec3 f = fract(sp) - 0.5;
            float r = h31(cell);
            float star = step(0.992, r) * (1.0 - smoothstep(0.05, 0.22, length(f)));
            float tw = 0.6 + 0.4 * sin(uTime * (2.0 + r * 5.0) + r * 60.0);
            col += vec3(0.85, 0.9, 1.0) * star * tw * uNight * smoothstep(0.0, 0.25, h) * 1.4;
            float md = max(dot(d, uMoonDir), 0.0);
            col += vec3(0.8, 0.85, 1.0) * (pow(md, 2200.0) * 6.0 + pow(md, 60.0) * 0.08) * uNight;
          }
          // nuages
          if (h > 0.0) {
            vec2 cp = d.xz / (h + 0.12) * 1.3 + vec2(uTime * 0.006, uTime * 0.002);
            float n = fbm(cp);
            float c = smoothstep(0.62 - uCloud * 0.3, 0.95 - uCloud * 0.2, n) * smoothstep(0.0, 0.18, h);
            float lit = 0.75 + 0.25 * fbm(cp * 1.7 + 3.0);
            vec3 cc = uCloudCol * lit + uSunCol * pow(sd, 6.0) * 0.4;
            col = mix(col, cc, c * 0.85);
          }
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1000, 40, 20), mat);
    this.sky.frustumCulled = false;
    this.sky.renderOrder = -10;
    this.scene.add(this.sky);
  },

  /* ---------- Terrain ---------- */
  /** Données du sol par sommet : r = variation, g = vase (berges), b = hors du pré. */
  groundData(x, z, out) {
    const n1 = Math.sin(x * 0.13 + z * 0.07) * Math.sin(z * 0.11 - x * 0.05);
    const n2 = Math.sin(x * 0.61 + 1.3) * Math.sin(z * 0.53 + 0.4);
    const r = Math.max(Math.abs(x), Math.abs(z));
    const h = terrainH(x, z);
    out[0] = clamp01(0.5 + n1 * 0.35 + n2 * 0.15);
    out[1] = smoothstep(POND.level + 0.35, POND.level - 0.05, h) * (1 - smoothstep(10.5, 12.5, Math.hypot(x - POND.x, z - POND.z)));
    out[2] = smoothstep(51, 70, r);
    return out;
  },
  makeTerrain() {
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    mat.onBeforeCompile = (sh) => {
      for (const k of ['uSnow', 'uGroundTint', 'uGrassBase', 'uGrassTip', 'uGrassDry', 'uDry', 'uCam', 'uR']) sh.uniforms[k] = U[k];
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vNy; varying vec3 vWp;')
        .replace('#include <defaultnormal_vertex>', '#include <defaultnormal_vertex>\nvNy = objectNormal.y;')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
          varying float vNy; varying vec3 vWp;
          uniform float uSnow, uDry, uR; uniform vec3 uGroundTint, uGrassBase, uGrassTip, uGrassDry, uCam;`)
        .replace('#include <color_fragment>', `
          // le sol prend la teinte moyenne de l'herbe : le pré reste vert au-delà des brins dessinés
          float gv = vColor.r, mud = vColor.g, outside = vColor.b;
          vec3 g = mix(uGrassBase, uGrassTip, 0.38 + 0.25 * gv) * (0.8 + 0.4 * gv);
          float dryN = smoothstep(0.2, 0.9, sin(vWp.x * 0.09 + 1.0) * sin(vWp.z * 0.07 + 2.0));
          g = mix(g, uGrassDry * 0.8, dryN * uDry * 0.6);
          float near = 1.0 - smoothstep(uR * 0.35, uR * 0.92, length(vWp.xz - uCam.xz));
          g = mix(g, g * 0.5, near * (1.0 - outside));
          g = mix(g, vec3(0.07, 0.05, 0.03), mud);
          g = mix(g, g * vec3(0.85, 0.95, 0.9), outside);
          diffuseColor.rgb = g * uGroundTint;
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.89, 0.95), uSnow * smoothstep(0.6, 0.9, vNy) * 0.95);`);
    };
    this.terrainMat = mat;
    const outerMat = new THREE.MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 8 });
    outerMat.onBeforeCompile = mat.onBeforeCompile;
    const mk = (size, segs, inner) => {
      const g = new THREE.PlaneGeometry(size, size, segs, segs);
      g.rotateX(-Math.PI / 2);
      const p = g.attributes.position, col = new Float32Array(p.count * 3), c = [0, 0, 0];
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), z = p.getZ(i);
        let y = terrainH(x, z);
        if (inner === false && Math.abs(x) < 50 && Math.abs(z) < 50) y -= 4;
        p.setY(i, y);
        this.groundData(x, z, c);
        col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, inner ? mat : outerMat);
      m.receiveShadow = true;
      this.scene.add(m);
      return m;
    };
    this.ground = mk(118, 236, true);
    mk(1400, 280, false);
    // rochers
    const rockMat = new THREE.MeshLambertMaterial({ vertexColors: true });
    rockMat.onBeforeCompile = (sh) => {
      sh.uniforms.uSnow = U.uSnow;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vNy;').replace('#include <defaultnormal_vertex>', '#include <defaultnormal_vertex>\nvNy = objectNormal.y;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vNy; uniform float uSnow;')
        .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.89, 0.95), uSnow * smoothstep(0.5, 0.85, vNy));');
    };
    for (const rk of Eco.rocks) {
      const g = new THREE.IcosahedronGeometry(1, 1);
      const p = g.attributes.position, col = new Float32Array(p.count * 3), rr = mulberry32(rk.s);
      const jit = {};
      for (let i = 0; i < p.count; i++) {
        const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
        if (!(key in jit)) jit[key] = 0.75 + rr() * 0.4;
        const k = jit[key];
        p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k);
      }
      g.computeVertexNormals();
      const n = g.attributes.normal;
      for (let i = 0; i < p.count; i++) {
        const moss = smoothstep(0.35, 0.8, n.getY(i));
        const gr = 0.42 + (p.getY(i) + 1) * 0.05;
        const c = mixc([gr, gr * 0.98, gr * 0.94], [0.3, 0.38, 0.16], moss * 0.8);
        col[i * 3] = srgbToLin(c[0]); col[i * 3 + 1] = srgbToLin(c[1]); col[i * 3 + 2] = srgbToLin(c[2]);
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const m = new THREE.Mesh(g, rockMat);
      m.scale.set(rk.r, rk.r * 0.62, rk.r * 0.9);
      m.rotation.y = rr() * 6.28;
      m.position.set(rk.x, terrainH(rk.x, rk.z) - rk.r * 0.18, rk.z);
      m.castShadow = true; m.receiveShadow = true;
      this.scene.add(m);
    }
  },

  /* ---------- Étang ---------- */
  makeWater() {
    const mat = new THREE.ShaderMaterial({
      transparent: true, fog: true, depthWrite: false,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
        uZenith: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3() }, uSunCol: { value: new THREE.Color() }, uTime: { value: 0 }, uSnow: { value: 0 },
      }]),
      vertexShader: `
        varying vec3 vW;
        #include <fog_pars_vertex>
        void main(){
          vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz;
          vec4 mvPosition = viewMatrix * w;
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: `
        varying vec3 vW; uniform vec3 uZenith, uHorizon, uSunDir, uSunCol; uniform float uTime, uSnow;
        #include <fog_pars_fragment>
        void main(){
          vec2 p = vW.xz;
          float t = uTime;
          vec2 g = vec2(cos(p.x*1.7 + t*1.3) + cos(p.x*0.9 - p.y*1.3 + t*0.9)*0.7 + cos(p.y*2.9 + t*1.7)*0.3,
                        cos(p.y*1.5 + t*1.1) + cos(p.y*1.1 + p.x*1.4 - t*0.8)*0.7 + cos(p.x*3.1 - t*1.9)*0.3);
          vec3 N = normalize(vec3(g.x * 0.035, 1.0, g.y * 0.035));
          vec3 V = normalize(cameraPosition - vW);
          float fres = 0.03 + 0.97 * pow(1.0 - max(dot(V, N), 0.0), 5.0);
          vec3 R = reflect(-V, N);
          vec3 sky = mix(uHorizon, uZenith, pow(max(R.y, 0.0), 0.5));
          vec3 deep = vec3(0.015, 0.045, 0.04);
          vec3 col = mix(deep, sky, fres);
          col += uSunCol * pow(max(dot(R, uSunDir), 0.0), 250.0) * 3.0;
          col = mix(col, vec3(0.75, 0.8, 0.86), uSnow * 0.85);
          float edge = 0.78 + 0.2 * fres;
          gl_FragColor = vec4(col, mix(edge, 1.0, uSnow));
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <fog_fragment>
        }`,
    });
    const m = this.water = new THREE.Mesh(new THREE.CircleGeometry(12, 48), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(POND.x, POND.level, POND.z);
    m.renderOrder = 2;
    this.scene.add(m);
  },

  /* ---------- Clôture de l'hectare ---------- */
  makeFence() {
    const wood = new THREE.MeshLambertMaterial({ color: 0x7b6149 });
    const E = 50.6, step = 2.6, posts = [];
    for (let s = 0; s < 4; s++) {
      for (let t = -E; t < E - 0.01; t += step) {
        const x = s === 0 ? t : s === 1 ? E : s === 2 ? -t : -E;
        const z = s === 0 ? -E : s === 1 ? t : s === 2 ? E : -t;
        posts.push([x, z]);
      }
    }
    const pm = new THREE.InstancedMesh(new THREE.BoxGeometry(0.13, 1.25, 0.13), wood, posts.length);
    const rm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.075, 0.05), wood, posts.length * 2);
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), Pv = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    posts.forEach(([x, z], i) => {
      const y = terrainH(x, z);
      M.makeRotationY((i * 0.37) % 0.2); M.setPosition(x, y + 0.5, z);
      pm.setMatrixAt(i, M);
      const [x2, z2] = posts[(i + 1) % posts.length], y2 = terrainH(x2, z2);
      for (let k = 0; k < 2; k++) {
        const hh = k ? 0.95 : 0.5;
        const a = new THREE.Vector3(x, y + hh, z), b = new THREE.Vector3(x2, y2 + hh, z2);
        const d = b.clone().sub(a), len = d.length();
        Pv.copy(a).add(b).multiplyScalar(0.5);
        Q.setFromUnitVectors(new THREE.Vector3(1, 0, 0), d.normalize());
        S.set(len, 1, 1);
        M.compose(Pv, Q, S);
        rm.setMatrixAt(i * 2 + k, M);
      }
    });
    pm.castShadow = rm.castShadow = true; pm.receiveShadow = rm.receiveShadow = true;
    this.scene.add(pm, rm);
  },

  /* ---------- Forêt lointaine au-delà du pré ---------- */
  makeForest() {
    const cone = new THREE.ConeGeometry(2.6, 8, 7); cone.translate(0, 6, 0);
    const trunk = new THREE.CylinderGeometry(0.3, 0.4, 2.4, 5); trunk.translate(0, 1.2, 0);
    const blob = new THREE.IcosahedronGeometry(3.6, 0); blob.translate(0, 6, 0);
    const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uSnow = U.uSnow;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vNy;').replace('#include <defaultnormal_vertex>', '#include <defaultnormal_vertex>\nvNy = objectNormal.y;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vNy; uniform float uSnow;').replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.8,0.84,0.9), uSnow * smoothstep(0.2,0.7,vNy) * 0.8);');
    };
    const n = 520;
    const cones = new THREE.InstancedMesh(cone, mat, n), blobs = new THREE.InstancedMesh(blob, mat, n), trunks = new THREE.InstancedMesh(trunk, new THREE.MeshLambertMaterial({ color: 0x4a3a2c }), n * 2);
    const M = new THREE.Matrix4(), c = new THREE.Color();
    let ic = 0, ib = 0, it = 0;
    for (let i = 0; i < n * 2; i++) {
      const a = rnd() * Math.PI * 2, d = 66 + Math.pow(rnd(), 0.7) * 230;
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (Math.max(Math.abs(x), Math.abs(z)) < 64) continue;
      const y = terrainH(x, z) - 0.3, s = rand(0.7, 1.5);
      M.makeRotationY(rnd() * 6.28); M.scale(new THREE.Vector3(s, s * rand(0.85, 1.3), s)); M.setPosition(x, y, z);
      if (rnd() < 0.55 && ic < n) { cones.setMatrixAt(ic, M); c.setHSL(0.36 + rnd() * 0.06, 0.35, 0.16 + rnd() * 0.06); cones.setColorAt(ic++, c); }
      else if (ib < n) { blobs.setMatrixAt(ib, M); c.setHSL(0.22 + rnd() * 0.08, 0.4, 0.2 + rnd() * 0.07); blobs.setColorAt(ib++, c); }
      else continue;
      if (it < n * 2) trunks.setMatrixAt(it++, M);
    }
    cones.count = ic; blobs.count = ib; trunks.count = it;
    this.forestBlobs = blobs; this.forestBlobColors = [];
    for (let i = 0; i < ib; i++) { blobs.getColorAt(i, c); this.forestBlobColors.push(c.clone()); }
    this.scene.add(cones, blobs, trunks);
  },

  /* ---------- Herbe : brins instanciés autour de la caméra, relief calculé en GLSL ---------- */
  makeGrass() {
    const g = new THREE.InstancedBufferGeometry();
    const pos = new Float32Array([-1, 0, 0, 1, 0, 0, -0.75, 0.45, 0, 0.75, 0.45, 0, 0, 1, 0]);
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(15).fill(0).map((v, i) => i % 3 === 1 ? 1 : 0), 3));
    g.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4]);
    const N = 190000;
    const off = new Float32Array(N * 4), shp = new Float32Array(N * 2);
    const R = U.uR.value;
    for (let i = 0; i < N; i++) {
      off[i * 4] = rand(-R, R); off[i * 4 + 1] = rand(-R, R); off[i * 4 + 2] = rnd() * 6.283; off[i * 4 + 3] = rnd();
      shp[i * 2] = 0.07 + Math.pow(rnd(), 1.8) * 0.27; shp[i * 2 + 1] = 0.0055 + rnd() * 0.0065;
    }
    g.setAttribute('aOff', new THREE.InstancedBufferAttribute(off, 4));
    g.setAttribute('aShape', new THREE.InstancedBufferAttribute(shp, 2));
    g.instanceCount = N;
    this.grassMax = N;
    g.instanceCount = Math.floor(N * 0.6);
    const mat = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide, vertexColors: true });
    mat.onBeforeCompile = (sh) => {
      for (const k of ['uTime', 'uWind', 'uCam', 'uR', 'uGrassH', 'uWater', 'uGrassBase', 'uGrassTip', 'uGrassDry', 'uDry', 'uSnow']) sh.uniforms[k] = U[k];
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', `#include <common>
          attribute vec4 aOff; attribute vec2 aShape;
          uniform float uTime, uR, uGrassH, uWater, uDry, uSnow; uniform vec2 uWind; uniform vec3 uCam, uGrassBase, uGrassTip, uGrassDry;
          ${TERRAIN_GLSL}`)
        .replace('#include <color_vertex>', '')
        .replace('#include <beginnormal_vertex>', `
          vec2 rel = aOff.xy;
          vec2 wp = rel + 2.0 * uR * floor((uCam.xz - rel) / (2.0 * uR) + 0.5);
          float th = terrainH(wp);
          float dist = length(wp - uCam.xz);
          float fadeS = 1.0 - smoothstep(uR * 0.7, uR * 0.98, dist);
          float wet = max(smoothstep(uWater + 0.03, uWater + 0.14, th), smoothstep(10.5, 12.5, length(wp - vec2(${POND.x.toFixed(1)}, ${POND.z.toFixed(1)}))));
          float patchy = 0.75 + 0.25 * sin(wp.x * 0.37 + sin(wp.y * 0.29) * 2.0) * sin(wp.y * 0.41);
          float H = aShape.x * uGrassH * fadeS * wet * patchy;
          float W = aShape.y * (0.7 + 0.3 * fadeS) * (1.0 + (1.0 - fadeS) * 1.5);
          float ang = aOff.z; vec2 side = vec2(cos(ang), sin(ang));
          float y = position.y;
          vec2 lean = vec2(cos(aOff.w * 6.283), sin(aOff.w * 6.283)) * 0.3;
          float gph = dot(wp, vec2(0.23, 0.19));
          float wv = sin(uTime * 1.9 + gph) * 0.45 + sin(uTime * 3.3 + gph * 1.9) * 0.18 + 0.55 + 0.35 * sin(uTime * 0.37 + wp.x * 0.05);
          vec2 bend = (lean + uWind * wv * 1.5) * y * y * H;
          vec3 gpos = vec3(wp.x + side.x * position.x * W + bend.x, th + y * H - dot(bend, bend) * 0.5, wp.y + side.y * position.x * W + bend.y);
          vec3 objectNormal = normalize(vec3(-side.y * 0.3 + bend.x, 1.0, side.x * 0.3 + bend.y));
          float dryN = smoothstep(0.2, 0.9, sin(wp.x * 0.09 + 1.0) * sin(wp.y * 0.07 + 2.0) + aOff.w * 0.4 - 0.2);
          vec3 gc = mix(uGrassBase, uGrassTip, y) * (0.82 + 0.36 * aOff.w);
          gc = mix(gc, uGrassDry * (0.6 + 0.4 * y), dryN * uDry);
          gc = mix(gc, vec3(0.85, 0.88, 0.93), uSnow * (0.65 + 0.35 * y));
          vColor = gc;
          #ifdef USE_TANGENT
          vec3 objectTangent = vec3(tangent.xyz);
          #endif`)
        .replace('#include <begin_vertex>', 'vec3 transformed = gpos;');
    };
    const m = this.grass = new THREE.Mesh(g, mat);
    m.frustumCulled = false;
    m.receiveShadow = true;
    this.scene.add(m);
  },
  setGrassQuality(q) { this.grass.geometry.instanceCount = Math.floor(this.grassMax * [0.3, 0.6, 1][q]); },

  /* ---------- Mise à jour de l'environnement ---------- */
  updateEnv(dt, cam) {
    U.uCam.value.copy(cam);
    const ss = Sky.state;
    const sun = this.sun;
    const L = ss.lightDir;
    const snap = 42 * 2 / 2048;
    const tx = Math.round(cam.x / snap) * snap, tz = Math.round(cam.z / snap) * snap;
    sun.target.position.set(tx, terrainH(tx, tz), tz);
    sun.position.set(tx + L.x * 120, terrainH(tx, tz) + L.y * 120, tz + L.z * 120);
    sun.color.copy(ss.lightCol); sun.intensity = ss.lightInt;
    this.hemi.color.copy(ss.hemiSky); this.hemi.groundColor.copy(ss.hemiGround); this.hemi.intensity = ss.hemiInt;
    this.scene.fog.color.copy(ss.horizon); this.scene.fog.density = ss.fog;
    const su = this.sky.material.uniforms;
    su.uSunDir.value.copy(ss.sunDir); su.uMoonDir.value.copy(ss.moonDir);
    su.uZenith.value.copy(ss.zenith); su.uHorizon.value.copy(ss.horizon); su.uSunCol.value.copy(ss.sunCol);
    su.uNight.value = ss.night; su.uCloud.value = ss.cloud; su.uCloudCol.value.copy(ss.cloudCol);
    this.sky.position.copy(this.camera.position);
    const wu = this.water.material.uniforms;
    wu.uZenith.value.copy(ss.zenith); wu.uHorizon.value.copy(ss.horizon); wu.uSunDir.value.copy(ss.sunDir); wu.uSunCol.value.copy(ss.sunCol);
    wu.uTime.value = U.uTime.value; wu.uSnow.value = Math.max(0, U.uSnow.value - 0.3) * 1.4;
    this.renderer.toneMappingExposure = ss.exposure;
  },
  render() { this.renderer.render(this.scene, this.camera); },
};

/* ==========================================================================
   Ciel, heure du jour, saisons
   ========================================================================== */
const Sky = {
  tod: 0.38, dayLength: 600, cycle: true,
  state: null,
  init() {
    const C = () => new THREE.Color();
    this.state = {
      sunDir: new THREE.Vector3(), moonDir: new THREE.Vector3(), lightDir: new THREE.Vector3(),
      zenith: C(), horizon: C(), sunCol: C(), lightCol: C(), hemiSky: C(), hemiGround: C(), cloudCol: C(),
      lightInt: 3, hemiInt: 1, fog: 0.006, night: 0, cloud: 0.5, exposure: 1, sunUp: 1,
    };
    this.update(0, 0);
  },
  timeLabel() {
    const h = Math.floor(this.tod * 24), m = Math.floor((this.tod * 24 - h) * 60);
    return `${String(h).padStart(2, '0')}h${String(m).padStart(2, '0')}`;
  },
  update(dt, doy) {
    if (this.cycle) {
      const night = this.tod < 0.22 || this.tod > 0.8;
      this.tod = wrap01(this.tod + dt / this.dayLength * (night ? 3 : 1));
    }
    const st = this.state;
    const A = (this.tod - 0.25) * Math.PI * 2;
    // hauteur du soleil selon la saison (été haut, hiver bas)
    const seasonal = 0.62 + 0.38 * Math.cos((doy - 42) / YEAR_DAYS * Math.PI * 2);
    st.sunDir.set(-Math.cos(A), Math.sin(A) * (0.35 + 0.75 * seasonal), 0.42).normalize();
    st.moonDir.set(Math.cos(A) * 0.8, Math.max(0.35, -Math.sin(A) * 0.7), -0.45).normalize();
    const e = st.sunDir.y;
    const day = smoothstep(-0.02, 0.28, e), gold = smoothstep(0.28, 0.02, e) * smoothstep(-0.12, 0.02, e), nightF = smoothstep(0.02, -0.16, e);
    st.night = nightF; st.sunUp = smoothstep(-0.05, 0.05, e);
    const winter = smoothstep(80, 90, doy) * (1 - smoothstep(104, 111, doy));
    const set = (c, rgb) => c.setRGB(rgb[0], rgb[1], rgb[2], THREE.SRGBColorSpace);
    const mix3 = (a, b, c, wa, wb, wc) => { const s = wa + wb + wc || 1; return [0, 1, 2].map(i => (a[i] * wa + b[i] * wb + c[i] * wc) / s); };
    const wD = day * (1 - gold), wG = gold, wN = nightF;
    const zen = mix3(mixc([0.25, 0.5, 0.88], [0.45, 0.6, 0.8], winter), [0.32, 0.4, 0.66], [0.025, 0.04, 0.1], wD, wG, wN);
    const hor = mix3(mixc([0.72, 0.84, 0.95], [0.82, 0.86, 0.9], winter), [1.0, 0.66, 0.44], [0.1, 0.13, 0.22], wD, wG, wN);
    set(st.zenith, zen); set(st.horizon, hor);
    const sunc = mix3([1, 0.97, 0.9], [1, 0.6, 0.32], [0.3, 0.35, 0.55], wD, wG, wN);
    set(st.sunCol, sunc);
    set(st.cloudCol, mix3([0.97, 0.97, 0.98], [1.0, 0.78, 0.65], [0.06, 0.07, 0.1], wD, wG, wN));
    if (st.sunUp > 0.001) {
      st.lightDir.copy(st.sunDir);
      if (st.lightDir.y < 0.06) { st.lightDir.y = 0.06; st.lightDir.normalize(); }
      set(st.lightCol, sunc);
      st.lightInt = 3.1 * smoothstep(-0.03, 0.2, e) * (1 - winter * 0.2);
    } else {
      st.lightDir.copy(st.moonDir);
      set(st.lightCol, [0.6, 0.7, 1.0]);
      st.lightInt = 1.1 * nightF;
    }
    set(st.hemiSky, mix3([0.62, 0.74, 0.95], [0.75, 0.62, 0.6], [0.32, 0.4, 0.62], wD, wG, wN));
    set(st.hemiGround, mix3([0.34, 0.32, 0.2], [0.35, 0.26, 0.18], [0.1, 0.12, 0.15], wD, wG, wN));
    st.hemiInt = 2.5 * day + 1.8 * gold + 1.5 * nightF;
    st.fog = 0.0058 + winter * 0.003 + nightF * 0.002;
    st.cloud = 0.45 + 0.35 * Math.sin(doy * 0.21) * Math.sin(doy * 0.07 + 1) + winter * 0.25;
    st.exposure = 1.05 + nightF * 0.55;
    U.uLight.value = smoothstep(-0.03, 0.25, e);
  },
};

/** Paramètres visuels saisonniers, interpolés au jour près. */
const SeasonLook = {
  keys: [
    { d: 0, base: [0.14, 0.3, 0.07], tip: [0.5, 0.72, 0.26], dry: 0.0, h: 0.75, tint: [1.0, 1.05, 0.95] },
    { d: 20, base: [0.15, 0.31, 0.07], tip: [0.55, 0.74, 0.28], dry: 0.05, h: 1.0, tint: [1.0, 1.05, 0.95] },
    { d: 42, base: [0.17, 0.31, 0.08], tip: [0.64, 0.71, 0.3], dry: 0.35, h: 1.05, tint: [1.05, 1.03, 0.9] },
    { d: 60, base: [0.15, 0.26, 0.07], tip: [0.63, 0.6, 0.26], dry: 0.7, h: 1.0, tint: [1.08, 1.0, 0.85] },
    { d: 76, base: [0.18, 0.24, 0.08], tip: [0.6, 0.52, 0.27], dry: 0.9, h: 0.85, tint: [1.05, 0.95, 0.82] },
    { d: 88, base: [0.2, 0.24, 0.14], tip: [0.5, 0.5, 0.36], dry: 0.9, h: 0.4, tint: [0.95, 0.95, 0.9] },
    { d: 104, base: [0.2, 0.24, 0.14], tip: [0.5, 0.52, 0.36], dry: 0.6, h: 0.4, tint: [0.95, 0.97, 0.92] },
    { d: 112, base: [0.14, 0.3, 0.07], tip: [0.5, 0.72, 0.26], dry: 0.0, h: 0.75, tint: [1.0, 1.05, 0.95] },
  ],
  lastForest: -99,
  /** Les feuillus lointains changent aussi de couleur avec les saisons. */
  forest(doy) {
    if (Math.abs(doy - this.lastForest) < 0.7 || !View.forestBlobs) return;
    this.lastForest = doy;
    const au = smoothstep(56, 76, doy) * (1 - smoothstep(100, 111, doy)), bare = smoothstep(80, 92, doy) * (1 - smoothstep(104, 112, doy));
    const fresh = 1 - smoothstep(6, 22, doy);
    const bl = View.forestBlobs, base = View.forestBlobColors, c = new THREE.Color(), a = new THREE.Color(), g = new THREE.Color(0.2, 0.17, 0.13);
    for (let i = 0; i < base.length; i++) {
      c.copy(base[i]);
      if (fresh > 0) { a.setRGB(0.28, 0.4, 0.1); c.lerp(a, fresh * 0.5); }
      if (au > 0) { a.setHSL(0.02 + (i % 7) * 0.02, 0.65, 0.3); c.lerp(a, au * (0.6 + 0.4 * ((i * 37) % 10) / 10)); }
      if (bare > 0) c.lerp(g, bare * 0.85);
      bl.setColorAt(i, c);
    }
    bl.instanceColor.needsUpdate = true;
  },
  apply(doy) {
    const K = this.keys;
    let i = 0; while (i < K.length - 2 && doy > K[i + 1].d) i++;
    const a = K[i], b = K[i + 1], t = smooth((doy - a.d) / (b.d - a.d));
    const m = (x, y) => [0, 1, 2].map(j => lerp(x[j], y[j], t));
    const base = m(a.base, b.base), tip = m(a.tip, b.tip), tint = m(a.tint, b.tint);
    U.uGrassBase.value.setRGB(base[0], base[1], base[2], THREE.SRGBColorSpace);
    U.uGrassTip.value.setRGB(tip[0], tip[1], tip[2], THREE.SRGBColorSpace);
    U.uGrassDry.value.setRGB(0.66, 0.56, 0.3, THREE.SRGBColorSpace);
    U.uDry.value = lerp(a.dry, b.dry, t);
    U.uGrassH.value = lerp(a.h, b.h, t);
    U.uGroundTint.value.setRGB(tint[0], tint[1], tint[2]);
    this.forest(doy);
    const snow = smoothstep(85, 91, doy) * (1 - smoothstep(104, 111.5, doy));
    U.uSnow.value = snow;
    return snow;
  },
};

/* ==========================================================================
   Gestion des maillages de plantes : un maillage par plante ligneuse,
   des « parcelles » fusionnées pour les herbacées (moins d'appels de dessin).
   ========================================================================== */
const CH = 10, NCH = 10;
const PlantView = {
  chunks: [], woody: new Map(), cursor: 0, falling: [],
  init() {
    this.chunks = [];
    for (let j = 0; j < NCH; j++) for (let i = 0; i < NCH; i++) {
      const buf = new GeoBuf(4000);
      const mesh = new THREE.Mesh(new THREE.BufferGeometry(), View.plantMat);
      mesh.castShadow = false; mesh.receiveShadow = true;
      mesh.visible = false;
      View.scene.add(mesh);
      this.chunks.push({ i, j, buf, mesh, plants: new Set(), dirty: false, cx: -HALF + (i + 0.5) * CH, cz: -HALF + (j + 0.5) * CH });
    }
  },
  clear() {
    for (const c of this.chunks) { c.plants.clear(); c.dirty = true; }
    for (const [p, m] of this.woody) { View.scene.remove(m); m.geometry.dispose(); }
    this.woody.clear(); this.falling = [];
  },
  chunkOf(x, z) {
    const i = clamp(Math.floor((x + HALF) / CH), 0, NCH - 1), j = clamp(Math.floor((z + HALF) / CH), 0, NCH - 1);
    return this.chunks[j * NCH + i];
  },
  add(p) {
    p.dirty = true; p.urgent = true; p.lastBuild = -1e9;
    if (p.woody) {
      const m = new THREE.Mesh(new THREE.BufferGeometry(), View.plantMat);
      m.position.set(p.x, p.y, p.z);
      m.castShadow = true; m.receiveShadow = true;
      m.visible = false;
      m.userData.plant = p;
      View.scene.add(m);
      this.woody.set(p, m);
    } else {
      const c = this.chunkOf(p.x, p.z);
      c.plants.add(p); p.chunk = c;
    }
  },
  remove(p) {
    if (p.woody) {
      const m = this.woody.get(p);
      if (m) { View.scene.remove(m); m.geometry.dispose(); this.woody.delete(p); }
    } else if (p.chunk) { p.chunk.plants.delete(p); p.chunk.dirty = true; }
  },
  sync(mesh, buf) {
    let g = mesh.geometry;
    if (g.userData.ver !== buf.ver || !g.attributes.position) {
      g.dispose();
      g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(buf.P, 3));
      g.setAttribute('normal', new THREE.BufferAttribute(buf.N, 3, true));
      g.setAttribute('color', new THREE.BufferAttribute(buf.C, 3, true));
      g.setAttribute('color2', new THREE.BufferAttribute(buf.C2, 3, true));
      g.setAttribute('aPat', new THREE.BufferAttribute(buf.A, 4, false));
      g.setIndex(new THREE.BufferAttribute(buf.I, 1));
      g.userData.ver = buf.ver;
      for (const k in g.attributes) g.attributes[k].setUsage(THREE.DynamicDrawUsage);
      g.index.setUsage(THREE.DynamicDrawUsage);
      mesh.geometry = g;
    } else {
      const upd = (a, n) => { if (a.addUpdateRange) { a.clearUpdateRanges(); a.addUpdateRange(0, n); } a.needsUpdate = true; };
      upd(g.attributes.position, buf.nv * 3); upd(g.attributes.normal, buf.nv * 3); upd(g.attributes.color, buf.nv * 3);
      upd(g.attributes.color2, buf.nv * 3); upd(g.attributes.aPat, buf.nv * 4); upd(g.index, buf.ni);
    }
    g.setDrawRange(0, buf.ni);
    return g;
  },
  lodOf(p, d) {
    const T = p.woody ? [40] : [15, 34];
    let l = 0;
    while (l < T.length && d > T[l] + (p.lod !== undefined && p.lod <= l ? 2 : -2)) l++;
    return l;
  },
  buildPlant(p, lod) {
    if (lod === undefined) lod = this.lodOf(p, Math.hypot(p.x - Player.pos.x, p.z - Player.pos.z));
    Builder.build(p, lod);
    p.dirty = false; p.urgent = false; p.lastBuild = performance.now();
    if (p.woody) {
      const m = this.woody.get(p);
      if (!m) return;
      const g = this.sync(m, p.buf);
      g.boundingSphere = new THREE.Sphere(new THREE.Vector3(p.bs.x - p.x, p.bs.y - p.y, p.bs.z - p.z), p.bs.r);
      m.visible = p.buf.ni > 0;
    } else if (p.chunk) p.chunk.dirty = true;
  },
  assemble(c) {
    const out = c.buf;
    out.reset();
    let nv = 0, ni = 0;
    for (const p of c.plants) if (p.buf) { nv += p.buf.nv; ni += p.buf.ni; }
    out.reserve(nv, ni);
    for (const p of c.plants) {
      const b = p.buf;
      if (!b || !b.nv) continue;
      const v0 = out.nv, i0 = out.ni, n = b.nv;
      const P = out.P, BP = b.P, x = p.x, y = p.y, z = p.z;
      for (let k = 0; k < n; k++) { const o = (v0 + k) * 3, s = k * 3; P[o] = BP[s] + x; P[o + 1] = BP[s + 1] + y; P[o + 2] = BP[s + 2] + z; }
      out.N.set(b.N.subarray(0, n * 3), v0 * 3);
      out.C.set(b.C.subarray(0, n * 3), v0 * 3);
      out.C2.set(b.C2.subarray(0, n * 3), v0 * 3);
      out.A.set(b.A.subarray(0, n * 4), v0 * 4);
      const I = out.I, BI = b.I;
      for (let k = 0; k < b.ni; k++) I[i0 + k] = BI[k] + v0;
      out.nv += n; out.ni += b.ni;
    }
    const g = this.sync(c.mesh, out);
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(c.cx, terrainH(c.cx, c.cz) + 1, c.cz), CH * 0.75 + 3);
    c.mesh.visible = out.ni > 0;
    c.dirty = false;
  },
  /** Reconstruit les plantes modifiées dans un budget de temps, en priorité les plus proches. */
  update(dt, cam, budget) {
    const t0 = performance.now(), now = t0;
    const P = Eco.plants;
    // animations de chute
    for (let i = this.falling.length - 1; i >= 0; i--) {
      const f = this.falling[i], p = f.p;
      f.t += dt / 2.6;
      p.fall = Math.min(1, f.t);
      if (p.fall >= 1) { p.state = 'fallen'; p.dirty = true; this.falling.splice(i, 1); Hooks.event('treeLanded', p); }
    }
    for (const [p, m] of this.woody) {
      if (p.state === 'falling' || p.state === 'fallen') {
        const a = (Math.PI / 2 - 0.12) * p.fall * p.fall;
        m.quaternion.setFromAxisAngle(new THREE.Vector3(Math.cos(p.fallDir + Math.PI / 2), 0, Math.sin(p.fallDir + Math.PI / 2)), a);
        m.position.y = p.y - p.decay * 1.2 + (p.state === 'fallen' ? 0.15 : 0);
      }
    }
    // niveaux de détail selon la distance ; urgences (interactions, détails proches)
    for (let i = 0; i < P.length; i++) {
      const p = P[i];
      const d = Math.hypot(p.x - cam.x, p.z - cam.z);
      const l = this.lodOf(p, d);
      p.lodWant = l;
      if (l !== p.lod) { p.dirty = true; if (l < p.lod && d < 22) p.urgent = true; }
      if (p.urgent && p.dirty && performance.now() - t0 < budget * 0.6) this.buildPlant(p, l);
    }
    // tourniquet
    const n = P.length;
    let visited = 0;
    while (visited < n && performance.now() - t0 < budget) {
      this.cursor = (this.cursor + 1) % n;
      visited++;
      const p = P[this.cursor];
      if (!p.dirty) continue;
      const d = Math.hypot(p.x - cam.x, p.z - cam.z);
      const interval = (p.woody ? 700 : 120) + d * (p.woody ? 45 : 22);
      if (now - p.lastBuild < interval && p.lodWant === p.lod) continue;
      this.buildPlant(p, p.lodWant);
    }
    // parcelles
    for (const c of this.chunks) {
      if (!c.dirty) continue;
      if (performance.now() - t0 > budget * 1.3) break;
      this.assemble(c);
    }
  },
  startFall(p) { this.falling.push({ p, t: 0 }); },
};
