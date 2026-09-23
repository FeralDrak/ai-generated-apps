'use strict';
/* ==========================================================================
   Utilitaires : aléatoire, maths, couleurs, relief du terrain, constantes
   ========================================================================== */

const YEAR_DAYS = 112;            // un an = 4 saisons de 28 jours
const SEASON_DAYS = 28;
const SEASONS = ['Printemps', 'Été', 'Automne', 'Hiver'];
const HALF = 50;                  // le pré fait 100 m x 100 m = 1 hectare
const LIMIT = 49.3;               // limite de déplacement du joueur

// Hooks : points d'accroche entre la simulation (sans rendu) et le reste du jeu
const Hooks = {
  plantAdded() {}, plantRemoved() {}, seedsDispersed() {}, event() {}, treeFalling() {}, petalFall() {},
};

/* ---------- Aléatoire ---------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const rnd = Math.random;
function rand(a, b) { return a + (b - a) * rnd(); }
function randInt(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
function gauss() {
  let u = 0, v = 0;
  while (u === 0) u = rnd();
  while (v === 0) v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function pick(arr) { return arr[Math.floor(rnd() * arr.length)]; }
function hash32(n) {
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return (n ^ (n >>> 16)) >>> 0;
}
let seedCounter = 1;
function newSeed() { return hash32(seedCounter++ * 7919 + ((rnd() * 1e9) | 0)); }

/* ---------- Maths ---------- */
function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
function lerp(a, b, t) { return a + (b - a) * t; }
function smooth(t) { t = clamp01(t); return t * t * (3 - 2 * t); }
function smoothstep(a, b, x) { return smooth((x - a) / (b - a)); }
function wrap01(x) { return x - Math.floor(x); }
function hueDist(a, b) { let d = Math.abs(a - b) % 1; return d > 0.5 ? 1 - d : d; }

/* ---------- Couleurs (HSL -> sRGB 0..1) ---------- */
function hsl(h, s, l, out) {
  h = wrap01(h); s = clamp01(s); l = clamp01(l);
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t) => {
    t = wrap01(t);
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  out = out || [0, 0, 0];
  out[0] = f(h + 1 / 3); out[1] = f(h); out[2] = f(h - 1 / 3);
  return out;
}
function mixc(a, b, t, out) {
  out = out || [0, 0, 0];
  out[0] = a[0] + (b[0] - a[0]) * t; out[1] = a[1] + (b[1] - a[1]) * t; out[2] = a[2] + (b[2] - a[2]) * t;
  return out;
}
function cssColor(c) {
  return `rgb(${Math.round(clamp01(c[0]) * 255)},${Math.round(clamp01(c[1]) * 255)},${Math.round(clamp01(c[2]) * 255)})`;
}
function srgbToLin(c) { return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }

/* ---------- Relief ----------
   La même fonction existe en GLSL (TERRAIN_GLSL) pour l'herbe : garder les deux identiques. */
const POND = { x: 21, z: -15, depth: 1.7, spread: 42, level: 0 };
function terrainH(x, z) {
  let h = 1.1 * Math.sin(x * 0.045 + 1.3) * Math.cos(z * 0.038 - 0.7)
    + 0.55 * Math.sin((x + z) * 0.056 + 2.1)
    + 0.32 * Math.sin((-0.4 * x + 0.9 * z) * 0.13 + 0.4)
    + 0.16 * Math.sin((0.95 * x - 0.3 * z) * 0.23 + 1.7)
    + 0.07 * Math.sin(x * 0.51 + z * 0.37) * Math.sin(z * 0.43 - x * 0.29);
  const dx = x - POND.x, dz = z - POND.z;
  h -= POND.depth * Math.exp(-(dx * dx + dz * dz) / POND.spread);
  const ax = Math.abs(x), az = Math.abs(z);
  const r = Math.pow(ax * ax * ax * ax + az * az * az * az, 0.25);
  const d = r - 56;
  const t = clamp(d / 110, 0, 1);
  h += t * t * (3 - 2 * t) * 26 * (0.75 + 0.25 * Math.sin(x * 0.021 + z * 0.013)) + Math.max(d, 0) * 0.02;
  return h;
}
const TERRAIN_GLSL = /* glsl */`
float terrainH(vec2 p){
  float x = p.x, z = p.y;
  float h = 1.1*sin(x*0.045+1.3)*cos(z*0.038-0.7)
    + 0.55*sin((x+z)*0.056+2.1)
    + 0.32*sin((-0.4*x+0.9*z)*0.13+0.4)
    + 0.16*sin((0.95*x-0.3*z)*0.23+1.7)
    + 0.07*sin(x*0.51+z*0.37)*sin(z*0.43-x*0.29);
  float dx = x-${POND.x.toFixed(1)}, dz = z-(${POND.z.toFixed(1)});
  h -= ${POND.depth.toFixed(2)}*exp(-(dx*dx+dz*dz)/${POND.spread.toFixed(1)});
  float ax = abs(x), az = abs(z);
  float r = pow(ax*ax*ax*ax + az*az*az*az, 0.25);
  float d = r - 56.0;
  float t = clamp(d/110.0, 0.0, 1.0);
  h += t*t*(3.0-2.0*t)*26.0*(0.75+0.25*sin(x*0.021+z*0.013)) + max(d,0.0)*0.02;
  return h;
}`;
function terrainNormal(x, z, out) {
  const e = 0.3;
  const hx = terrainH(x + e, z) - terrainH(x - e, z);
  const hz = terrainH(x, z + e) - terrainH(x, z - e);
  out = out || [0, 1, 0];
  const l = Math.hypot(hx, 2 * e, hz);
  out[0] = -hx / l; out[1] = 2 * e / l; out[2] = -hz / l;
  return out;
}
// niveau de l'étang : juste sous le point le plus bas de la berge
(function computePondLevel() {
  let m = 1e9;
  for (let a = 0; a < Math.PI * 2; a += 0.05) m = Math.min(m, terrainH(POND.x + Math.cos(a) * 7.5, POND.z + Math.sin(a) * 7.5));
  POND.level = m - 0.12;
})();
const POND_R = 12;
function nearPond(x, z) { return Math.hypot(x - POND.x, z - POND.z) < POND_R; }
function inWater(x, z) { return nearPond(x, z) && terrainH(x, z) < POND.level + 0.06; }
/** Surface sur laquelle on marche ou vise : le sol, ou l'eau de l'étang. */
function surfaceH(x, z) { const h = terrainH(x, z); return nearPond(x, z) ? Math.max(h, POND.level) : h; }

/* ---------- Grille spatiale ---------- */
class Grid {
  constructor(cell, half) {
    this.cell = cell; this.half = half; this.n = Math.ceil(half * 2 / cell);
    this.cells = new Array(this.n * this.n);
    for (let i = 0; i < this.cells.length; i++) this.cells[i] = [];
  }
  idx(x, z) {
    const i = clamp(Math.floor((x + this.half) / this.cell), 0, this.n - 1);
    const j = clamp(Math.floor((z + this.half) / this.cell), 0, this.n - 1);
    return j * this.n + i;
  }
  add(o) { o._gi = this.idx(o.x, o.z); this.cells[o._gi].push(o); }
  remove(o) { const c = this.cells[o._gi]; if (!c) return; const k = c.indexOf(o); if (k >= 0) { c[k] = c[c.length - 1]; c.pop(); } }
  query(x, z, r, fn) {
    const i0 = clamp(Math.floor((x - r + this.half) / this.cell), 0, this.n - 1), i1 = clamp(Math.floor((x + r + this.half) / this.cell), 0, this.n - 1);
    const j0 = clamp(Math.floor((z - r + this.half) / this.cell), 0, this.n - 1), j1 = clamp(Math.floor((z + r + this.half) / this.cell), 0, this.n - 1);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const c = this.cells[j * this.n + i];
      for (let k = 0; k < c.length; k++) if (fn(c[k]) === false) return;
    }
  }
}

/* ---------- Calendrier ---------- */
function dayOfYear(day) { return ((day % YEAR_DAYS) + YEAR_DAYS) % YEAR_DAYS; }
function seasonOf(day) { return Math.floor(dayOfYear(day) / SEASON_DAYS); }
function yearOf(day) { return Math.floor(day / YEAR_DAYS) + 1; }
function fmtDate(day) { return `${SEASONS[seasonOf(day)]} · an ${yearOf(day)}`; }
function fmtAge(days, woody) {
  if (days < YEAR_DAYS) return `${Math.max(0, Math.floor(days))} jour${days >= 2 ? 's' : ''}`;
  const y = days / YEAR_DAYS;
  if (woody || y >= 2) return `${Math.floor(y)} an${y >= 2 ? 's' : ''}`;
  return `${Math.floor(days)} jours`;
}
