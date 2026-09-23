'use strict';
/* ==========================================================================
   ADN : génome diploïde de 40 gènes répartis sur 5 chromosomes.
   Chaque gène porte deux allèles (valeurs 0..1). L'expression est :
   - 'c' : codominance (moyenne des deux allèles)
   - 'h' : teinte, moyenne circulaire (rouge x bleu -> pourpre)
   - 'd' : dominance (l'allèle le plus fort l'emporte, l'autre reste caché)
   ========================================================================== */

const CHROMOSOMES = [
  { n: 'I', label: 'Port' },
  { n: 'II', label: 'Feuillage' },
  { n: 'III', label: 'Fleur' },
  { n: 'IV', label: 'Pigments' },
  { n: 'V', label: 'Cycle' },
];

const GENES = [
  // I · Port
  { k: 'stature', n: 'Stature', t: 'c', w: 3 },
  { k: 'lignine', n: 'Lignification', t: 'c', w: 6 },
  { k: 'entrenoeud', n: 'Entre-nœuds', t: 'c' },
  { k: 'ramification', n: 'Ramification', t: 'c' },
  { k: 'angle', n: 'Angle des rameaux', t: 'c' },
  { k: 'generations', n: 'Générations de rameaux', t: 'c' },
  { k: 'courbure', n: 'Tropisme', t: 'c' },
  { k: 'apical', n: 'Dominance apicale', t: 'c' },
  // II · Bois & feuilles
  { k: 'epaisseur', n: 'Épaisseur du bois', t: 'c' },
  { k: 'ecorceTeinte', n: "Teinte de l'écorce", t: 'c' },
  { k: 'ecorceClarte', n: "Clarté de l'écorce", t: 'c' },
  { k: 'fTaille', n: 'Taille des feuilles', t: 'c' },
  { k: 'fForme', n: 'Élongation des feuilles', t: 'c', w: 1.5 },
  { k: 'fLobes', n: 'Découpe des feuilles', t: 'c' },
  { k: 'fDensite', n: 'Densité du feuillage', t: 'c' },
  { k: 'fTeinte', n: 'Teinte du feuillage', t: 'c' },
  // III · Fleur
  { k: 'flTaille', n: 'Taille des fleurs', t: 'c' },
  { k: 'petales', n: 'Nombre de pétales', t: 'c', w: 1.5 },
  { k: 'pForme', n: 'Largeur des pétales', t: 'c' },
  { k: 'pPointe', n: 'Extrémité des pétales', t: 'c' },
  { k: 'pCoupe', n: 'Port des pétales', t: 'c' },
  { k: 'verticilles', n: 'Verticilles', t: 'c' },
  { k: 'abondance', n: 'Abondance florale', t: 'c' },
  { k: 'inflorescence', n: 'Inflorescence', t: 'c' },
  // IV · Pigments
  { k: 'teinte', n: 'Teinte des pétales', t: 'h', w: 0.6 },
  { k: 'saturation', n: 'Saturation', t: 'c', w: 0.6 },
  { k: 'clarte', n: 'Clarté des pétales', t: 'c', w: 0.6 },
  { k: 'motif', n: 'Motif', t: 'd', w: 0.6 },
  { k: 'teinte2', n: 'Teinte du motif', t: 'h', w: 0.4 },
  { k: 'contraste', n: 'Clarté du motif', t: 'c', w: 0.4 },
  { k: 'coeurTeinte', n: 'Teinte du cœur', t: 'h', w: 0.4 },
  { k: 'coeurTaille', n: 'Taille du cœur', t: 'c', w: 0.6 },
  // V · Cycle de vie
  { k: 'precocite', n: 'Précocité', t: 'c' },
  { k: 'longevite', n: 'Longévité', t: 'c' },
  { k: 'vigueur', n: 'Vigueur', t: 'c' },
  { k: 'graines', n: 'Fécondité', t: 'c' },
  { k: 'dispersion', n: 'Dispersion', t: 'c' },
  { k: 'nectar', n: 'Nectar', t: 'c' },
  { k: 'automne', n: "Couleur d'automne", t: 'c' },
  { k: 'mutabilite', n: 'Mutabilité', t: 'c' },
];
const NG = GENES.length;
const GI = {};
GENES.forEach((g, i) => { GI[g.k] = i; g.chr = Math.floor(i / 8); if (!g.w) g.w = 1; });
const GENE_WSUM = GENES.reduce((s, g) => s + g.w, 0);

const MOTIFS = ['Uni', 'Cœur dégradé', 'Nervures', 'Mouchetures', 'Liseré', 'Pointes bicolores'];
const COMPAT = 0.13;            // distance génétique max pour une fécondation
const HAND_COMPAT = 0.19;       // pollinisation à la main : croisements plus audacieux possibles
const GRAFT_COMPAT = 0.2;       // distance max pour une greffe

let genomeCounter = 0;

class Genome {
  constructor(a) {
    this.a = a || new Float32Array(NG * 2);
    this.id = ++genomeCounter;
    this.mut = null;       // gènes modifiés par rapport au tronçon parent (mutation somatique)
    this._ph = null; this._name = null; this._e = null;
  }
  expr(i) {
    if (this._e) return this._e[i];
    const e = this._e = new Float32Array(NG);
    for (let k = 0; k < NG; k++) {
      const x = this.a[2 * k], y = this.a[2 * k + 1], t = GENES[k].t;
      if (t === 'h') { let d = y - x; if (d > 0.5) d -= 1; if (d < -0.5) d += 1; e[k] = wrap01(x + d / 2); }
      else if (t === 'd') e[k] = Math.max(x, y);
      else e[k] = (x + y) / 2;
    }
    return e[i];
  }
  get ph() { return this._ph || (this._ph = decodePheno(this)); }
  get name() { return this._name || (this._name = speciesName(this.ph)); }

  /** Copie somatique : chaque tronçon hérite de l'ADN de son tronçon parent,
      avec une petite chance de mutation. Sans mutation, l'objet est partagé (clone). */
  somatic(boost = 1) {
    const p = 0.1 * this.ph.mut * boost;
    if (rnd() >= p) return this;
    return this.mutated(rnd() < 0.3 ? 2 : 1, rnd() < 0.15);
  }
  /** Nouveau génome avec n allèles mutés (big = saut aléatoire plutôt que dérive). */
  mutated(n, big) {
    const g = new Genome(new Float32Array(this.a));
    g.mut = [];
    for (let k = 0; k < n; k++) {
      const gi = Math.floor(rnd() * NG), s = rnd() < 0.5 ? 0 : 1, j = 2 * gi + s;
      g.a[j] = mutateAllele(g.a[j], GENES[gi].t, big);
      if (!g.mut.includes(gi)) g.mut.push(gi);
    }
    return g;
  }
  /** Méiose : un gamète haploïde avec enjambements (crossing-over) par chromosome. */
  gamete() {
    const out = new Float32Array(NG), mu = 0.006 * this.ph.mut;
    for (let c = 0; c < 5; c++) {
      let strand = rnd() < 0.5 ? 0 : 1;
      for (let i = c * 8; i < c * 8 + 8; i++) {
        if (rnd() < 0.14) strand ^= 1;
        let v = this.a[2 * i + strand];
        if (rnd() < mu) v = mutateAllele(v, GENES[i].t, rnd() < 0.08);
        out[i] = v;
      }
    }
    return out;
  }
  /** Fécondation : fusion de deux gamètes -> nouvel individu diploïde. */
  static fuse(mother, father) {
    const ga = mother.gamete(), gb = father.gamete(), a = new Float32Array(NG * 2);
    for (let i = 0; i < NG; i++) {
      // l'ordre des brins n'a pas d'importance biologique : on les mélange pour l'affichage
      if (rnd() < 0.5) { a[2 * i] = ga[i]; a[2 * i + 1] = gb[i]; } else { a[2 * i] = gb[i]; a[2 * i + 1] = ga[i]; }
    }
    return new Genome(a);
  }
  distance(o) {
    let s = 0;
    for (let i = 0; i < NG; i++) {
      const g = GENES[i], a = this.expr(i), b = o.expr(i);
      s += g.w * (g.t === 'h' ? hueDist(a, b) * 2 : Math.abs(a - b));
    }
    return s / GENE_WSUM;
  }
  /** Gènes qui diffèrent d'un autre génome (pour l'inspecteur). */
  diff(o) {
    const out = [];
    for (let i = 0; i < NG * 2; i++) if (Math.abs(this.a[i] - o.a[i]) > 1e-6) { const gi = i >> 1; if (!out.includes(gi)) out.push(gi); }
    return out;
  }
}

function mutateAllele(v, type, big) {
  if (big) return rnd();
  v += gauss() * (type === 'h' ? 0.06 : 0.1);
  return type === 'h' ? wrap01(v) : clamp01(v);
}

function makeGenome(center, spread = 0.045) {
  const a = new Float32Array(NG * 2);
  for (let i = 0; i < NG; i++) {
    const c = center[GENES[i].k] !== undefined ? center[GENES[i].k] : 0.5;
    for (let s = 0; s < 2; s++) {
      let v = c + gauss() * spread;
      a[2 * i + s] = GENES[i].t === 'h' ? wrap01(v) : clamp01(v);
    }
  }
  return new Genome(a);
}

/* ==========================================================================
   Phénotype : traduction des gènes exprimés en paramètres de croissance
   ========================================================================== */
function decodePheno(g) {
  const E = (k) => g.expr(GI[k]);
  const p = {};
  p.lign = E('lignine');
  p.kind = p.lign > 0.62 ? 'arbre' : p.lign > 0.42 ? 'arbuste' : 'herbe';
  p.woody = p.kind !== 'herbe';
  let H = 0.18 * Math.pow(120, E('stature'));
  if (p.kind === 'herbe') H = clamp(H, 0.14, 2.4);
  else if (p.kind === 'arbuste') H = clamp(H, 0.8, 4.5);
  else H = clamp(H, 3, 22);
  p.height = H;
  p.segF = lerp(0.65, 1.35, E('entrenoeud'));
  p.ramif = E('ramification');
  p.angle = lerp(0.2, 1.25, E('angle'));
  const gv = E('generations');
  p.depth = p.kind === 'herbe' ? 1 + Math.floor(gv * 3.99) : p.kind === 'arbuste' ? 3 + Math.floor(gv * 2.99) : 3 + Math.floor(gv * 4.99);
  p.curv = lerp(-1, 1, E('courbure'));
  p.apical = E('apical');
  p.thick = lerp(0.55, 1.7, E('epaisseur'));
  p.barkH = lerp(0.02, 0.13, E('ecorceTeinte'));
  p.barkL = lerp(0.2, 0.84, Math.pow(E('ecorceClarte'), 1.3));
  p.barkS = lerp(0.32, 0.08, E('ecorceClarte'));
  p.leafSize = lerp(0.4, 1.5, E('fTaille'));
  p.leafElong = E('fForme');
  p.needle = p.woody && p.leafElong > 0.84;
  p.evergreen = p.needle;
  p.leafLobes = E('fLobes');
  p.leafDens = lerp(0.25, 1, E('fDensite'));
  const lt = E('fTeinte');
  p.leafH = lerp(0.17, 0.42, lt);
  p.leafS = lerp(0.5, 0.38, lt);
  p.leafL = lerp(0.3, 0.24, lt) - (p.needle ? 0.05 : 0);
  p.flSize = lerp(0.5, 1.6, E('flTaille'));
  p.petals = 3 + Math.floor(E('petales') * 9.99);
  p.pWidth = lerp(0.2, 1.0, E('pForme'));
  p.tip = E('pPointe');
  p.cup = lerp(-0.9, 1.1, E('pCoupe'));
  p.whorls = 1 + Math.floor(E('verticilles') * 2.99);
  p.abund = E('abondance');
  p.infl = E('inflorescence');
  p.hue = E('teinte');
  p.sat = lerp(0.15, 1, E('saturation'));
  p.light = lerp(0.22, 0.92, E('clarte'));
  p.motif = Math.min(5, Math.floor(E('motif') * 6));
  p.hue2 = E('teinte2');
  p.light2 = lerp(0.08, 0.95, E('contraste'));
  p.cHue = E('coeurTeinte');
  p.cSize = lerp(0.1, 0.5, E('coeurTaille'));
  p.cLight = 0.12 + 0.45 * Math.pow(E('coeurTaille'), 0.7);
  const pr = E('precocite');
  p.bloomDoy = p.woody ? lerp(2, 32, pr) : lerp(10, 52, pr);
  const lo = E('longevite');
  p.lifespan = p.kind === 'herbe' ? lerp(48, 105, lo) : (p.kind === 'arbuste' ? lerp(6, 30, lo) : lerp(20, 110, lo)) * YEAR_DAYS;
  p.growth = lerp(0.55, 1.6, E('vigueur'));
  const gr = E('graines');
  p.seeds = p.woody ? Math.round(lerp(3, 26, gr)) : 2 + Math.floor(gr * 10);
  const di = E('dispersion');
  p.dispersal = p.woody ? lerp(3, 30, Math.pow(di, 1.5)) : lerp(0.6, 14, di * di);
  p.fluffy = di > 0.62;
  p.nectar = E('nectar');
  p.autumnH = lerp(0.0, 0.15, E('automne'));
  p.mut = 0.25 + 2.75 * Math.pow(E('mutabilite'), 2);
  // couleurs (sRGB 0..1)
  p.petalC = hsl(p.hue, p.sat, p.light);
  p.petalC2 = hsl(p.hue2, Math.max(p.sat, 0.4), p.light2);
  p.centerC = hsl(p.cHue, 0.8, p.cLight);
  p.leafC = hsl(p.leafH, p.leafS, p.leafL);
  p.barkC = hsl(p.barkH, p.barkS, p.barkL);
  p.stemC = p.woody ? p.barkC : hsl(p.leafH - 0.01, p.leafS * 0.85, p.leafL * 1.2);
  p.autumnC = hsl(p.autumnH, 0.75, 0.42);
  p.attract = 0.25 + p.nectar * 0.75 + p.sat * 0.25 + (p.flSize - 1) * 0.2;
  return p;
}

/* ==========================================================================
   Nomenclature pseudo-latine, déduite du phénotype
   ========================================================================== */
const NUM_PREFIX = { 3: 'Tri', 4: 'Tetra', 5: 'Penta', 6: 'Hexa', 7: 'Hepta', 8: 'Octo', 9: 'Ennea', 10: 'Deca', 11: 'Hendeca', 12: 'Dodeca' };
function colorWord(h, s, l) {
  if (l > 0.84 && s < 0.55) return ['alba', 'blanc'];
  if (l < 0.2) return ['nigra', 'noirâtre'];
  if (s < 0.28) return ['grisea', 'gris'];
  h = wrap01(h);
  const tbl = [
    [0.03, 'rubra', 'rouge'], [0.085, 'aurantia', 'orange'], [0.165, 'lutea', 'jaune'], [0.24, 'chlorina', 'jaune-vert'],
    [0.45, 'viridis', 'vert'], [0.53, 'thalassina', 'turquoise'], [0.69, 'caerulea', 'bleu'], [0.77, 'violacea', 'violet'],
    [0.87, 'purpurea', 'pourpre'], [0.95, l > 0.6 ? 'rosea' : 'magentea', l > 0.6 ? 'rose' : 'magenta'], [1.01, l > 0.72 ? 'rosea' : 'rubra', l > 0.72 ? 'rose' : 'rouge'],
  ];
  for (const [lim, la, fr] of tbl) if (h < lim) return [la, fr];
  return ['rubra', 'rouge'];
}
const MOTIF_LAT = [null, null, 'venosa', 'maculata', 'marginata', 'bicolor'];
function speciesName(p) {
  let pre = NUM_PREFIX[p.petals] || 'Poly', suf;
  if (p.kind === 'arbre') suf = p.needle ? 'pitys' : 'dendron';
  else if (p.kind === 'arbuste') suf = 'thamnus';
  else suf = 'anthus';
  if (/[ao]$/.test(pre) && /^[aeiou]/.test(suf)) pre = pre.slice(0, -1);
  const genus = pre + suf;
  const sp = colorWord(p.hue, p.sat, p.light)[0];
  let v = null;
  if (p.woody && p.curv < -0.45) v = 'pendula';
  else if (MOTIF_LAT[p.motif]) v = MOTIF_LAT[p.motif];
  return genus + ' ' + sp + (v ? ' var. ' + v : '');
}
function kindLabel(p) { return p.kind === 'arbre' ? (p.needle ? 'Conifère' : 'Arbre') : p.kind === 'arbuste' ? 'Arbuste' : 'Plante herbacée'; }

/* ==========================================================================
   Description en français d'un gène exprimé (pour l'inspecteur)
   ========================================================================== */
function geneText(i, v, p) {
  const k = GENES[i].k;
  const lvl = (x) => x < 0.2 ? 'très faible' : x < 0.4 ? 'faible' : x < 0.6 ? 'moyenne' : x < 0.8 ? 'forte' : 'très forte';
  switch (k) {
    case 'stature': return `hauteur adulte ≈ ${p.height < 2 ? p.height.toFixed(2) : p.height.toFixed(1)} m`;
    case 'lignine': return kindLabel(p).toLowerCase() + ` (${Math.round(v * 100)} %)`;
    case 'entrenoeud': return `entre-nœuds ×${p.segF.toFixed(2)}`;
    case 'ramification': return `ramification ${lvl(v)}`;
    case 'angle': return `angle ≈ ${Math.round(p.angle * 57.3)}°`;
    case 'generations': return `${p.depth} générations de rameaux`;
    case 'courbure': return p.curv < -0.35 ? 'rameaux retombants' : p.curv > 0.35 ? 'rameaux redressés' : 'port droit';
    case 'apical': return v > 0.65 ? 'axe principal dominant' : v < 0.35 ? 'port en fourche' : 'port équilibré';
    case 'epaisseur': return `bois ×${p.thick.toFixed(2)}`;
    case 'ecorceTeinte': case 'ecorceClarte': return p.barkL > 0.6 ? 'écorce claire' : p.barkL < 0.22 ? 'écorce sombre' : 'écorce brune';
    case 'fTaille': return `feuilles ×${p.leafSize.toFixed(2)}`;
    case 'fForme': return p.needle ? 'aiguilles (persistant)' : v > 0.66 ? 'feuilles lancéolées' : v < 0.33 ? 'feuilles rondes' : 'feuilles ovales';
    case 'fLobes': return v > 0.66 ? 'profondément lobées' : v > 0.35 ? 'dentées' : 'bord lisse';
    case 'fDensite': return `feuillage ${lvl(v)}`;
    case 'fTeinte': return v > 0.66 ? 'vert bleuté' : v < 0.33 ? 'vert jaune' : 'vert franc';
    case 'flTaille': return `fleurs ×${p.flSize.toFixed(2)}`;
    case 'petales': return `${p.petals} pétales`;
    case 'pForme': return v > 0.66 ? 'pétales larges' : v < 0.33 ? 'pétales étroits' : 'pétales moyens';
    case 'pPointe': return tipLabel(p.tip);
    case 'pCoupe': return p.cup > 0.45 ? 'en coupe' : p.cup < -0.3 ? 'réfléchis' : 'étalés';
    case 'verticilles': return p.whorls === 1 ? 'fleur simple' : p.whorls === 2 ? 'fleur semi-double' : 'fleur double';
    case 'abondance': return `abondance ${lvl(v)}`;
    case 'inflorescence': return p.infl < 0.33 ? 'fleurs solitaires' : p.infl < 0.66 ? 'en ombelle' : 'en épi';
    case 'teinte': return colorWord(p.hue, 0.9, 0.5)[1];
    case 'saturation': return `saturation ${lvl(v)}`;
    case 'clarte': return `clarté ${lvl(v)}`;
    case 'motif': return MOTIFS[p.motif];
    case 'teinte2': return 'motif ' + colorWord(p.hue2, 0.9, 0.5)[1];
    case 'contraste': return p.light2 < 0.35 ? 'motif sombre' : p.light2 > 0.7 ? 'motif clair' : 'motif moyen';
    case 'coeurTeinte': return 'cœur ' + colorWord(p.cHue, 0.8, 0.5)[1];
    case 'coeurTaille': return `cœur ${lvl(v)}`;
    case 'precocite': return p.woody ? `floraison jour ${Math.round(p.bloomDoy)} du printemps` : `floraison vers le jour ${Math.round(p.bloomDoy)}`;
    case 'longevite': return p.kind === 'herbe' ? `vit ≈ ${Math.round(p.lifespan)} jours` : `vit ≈ ${Math.round(p.lifespan / YEAR_DAYS)} ans`;
    case 'vigueur': return `croissance ×${p.growth.toFixed(2)}`;
    case 'graines': return p.woody ? `≈ ${p.seeds} graines / an` : `${p.seeds} graines / fleur`;
    case 'dispersion': return `≈ ${p.dispersal.toFixed(1)} m` + (p.fluffy ? ' (aigrettes)' : '');
    case 'nectar': return `nectar ${lvl(v)}`;
    case 'automne': return 'automne ' + colorWord(p.autumnH, 0.8, 0.45)[1];
    case 'mutabilite': return `mutations ×${p.mut.toFixed(2)}`;
  }
  return '';
}
function tipLabel(t) { return t < 0.3 ? 'arrondis' : t < 0.55 ? 'pointus' : t < 0.8 ? 'échancrés' : 'frangés'; }

/** Couleur d'illustration d'un allèle pour le caryotype. */
function alleleColor(i, v) {
  const k = GENES[i].k;
  if (GENES[i].t === 'h') return hsl(v, 0.75, 0.55);
  switch (k) {
    case 'fTeinte': return hsl(lerp(0.17, 0.42, v), 0.5, 0.4);
    case 'ecorceTeinte': return hsl(lerp(0.02, 0.13, v), 0.35, 0.35);
    case 'ecorceClarte': case 'clarte': case 'contraste': return hsl(0.1, 0.1, lerp(0.1, 0.92, v));
    case 'saturation': return hsl(0.95, v, 0.55);
    case 'automne': return hsl(lerp(0, 0.15, v), 0.8, 0.5);
    case 'motif': { const m = Math.min(5, Math.floor(v * 6)); return hsl(0.08 + m * 0.13, 0.55, 0.35 + m * 0.07); }
  }
  // rampe « viridis » simplifiée
  const stops = [[0.27, 0.0, 0.33], [0.23, 0.32, 0.55], [0.13, 0.57, 0.55], [0.37, 0.79, 0.38], [0.99, 0.91, 0.15]];
  const x = clamp01(v) * 4, j = Math.min(3, Math.floor(x)), f = x - j;
  return mixc(stops[j], stops[j + 1], f);
}

/* ==========================================================================
   Archétypes : populations fondatrices du pré
   ========================================================================== */
const ARCHETYPES = [
  { id: 'coquelicot', kind: 'herbe', weight: 1.1, g: {
    stature: .30, lignine: .12, entrenoeud: .6, ramification: .28, angle: .35, generations: .35, courbure: .62, apical: .85,
    epaisseur: .35, fTaille: .5, fForme: .55, fLobes: .75, fDensite: .4, fTeinte: .35,
    flTaille: .8, petales: .15, pForme: .92, pPointe: .12, pCoupe: .62, verticilles: .1, abondance: .12, inflorescence: .1,
    teinte: .0, saturation: .95, clarte: .42, motif: .25, teinte2: .8, contraste: .06, coeurTeinte: .75, coeurTaille: .12,
    precocite: .4, longevite: .5, vigueur: .6, graines: .7, dispersion: .25, nectar: .35, mutabilite: .35 } },
  { id: 'marguerite', kind: 'herbe', weight: 1.2, g: {
    stature: .28, lignine: .1, entrenoeud: .5, ramification: .35, angle: .4, generations: .4, courbure: .6, apical: .6,
    epaisseur: .4, fTaille: .45, fForme: .45, fLobes: .5, fDensite: .5, fTeinte: .3,
    flTaille: .7, petales: .97, pForme: .22, pPointe: .35, pCoupe: .45, verticilles: .15, abondance: .3, inflorescence: .2,
    teinte: .15, saturation: .12, clarte: .98, motif: .05, teinte2: .15, contraste: .9, coeurTeinte: .13, coeurTaille: .78,
    precocite: .45, longevite: .6, vigueur: .55, graines: .6, dispersion: .35, nectar: .55, mutabilite: .35 } },
  { id: 'bleuet', kind: 'herbe', weight: 1, g: {
    stature: .33, lignine: .14, entrenoeud: .55, ramification: .6, angle: .45, generations: .6, courbure: .6, apical: .45,
    epaisseur: .3, fTaille: .4, fForme: .8, fLobes: .2, fDensite: .45, fTeinte: .45,
    flTaille: .55, petales: .55, pForme: .35, pPointe: .92, pCoupe: .5, verticilles: .35, abondance: .3, inflorescence: .15,
    teinte: .62, saturation: .85, clarte: .55, motif: .4, teinte2: .7, contraste: .3, coeurTeinte: .72, coeurTaille: .3,
    precocite: .5, longevite: .55, vigueur: .55, graines: .55, dispersion: .2, nectar: .6, mutabilite: .35 } },
  { id: 'primevere', kind: 'herbe', weight: 1, g: {
    stature: .15, lignine: .08, entrenoeud: .5, ramification: .1, angle: .4, generations: .1, courbure: .6, apical: .9,
    epaisseur: .45, fTaille: .7, fForme: .3, fLobes: .1, fDensite: .8, fTeinte: .3,
    flTaille: .55, petales: .25, pForme: .8, pPointe: .65, pCoupe: .35, verticilles: .1, abondance: .75, inflorescence: .5,
    teinte: .125, saturation: .9, clarte: .52, motif: .22, teinte2: .09, contraste: .55, coeurTeinte: .1, coeurTaille: .25,
    precocite: .08, longevite: .45, vigueur: .5, graines: .5, dispersion: .15, nectar: .5, mutabilite: .35 } },
  { id: 'mauve', kind: 'herbe', weight: 0.9, g: {
    stature: .42, lignine: .18, entrenoeud: .6, ramification: .45, angle: .3, generations: .6, courbure: .65, apical: .75,
    epaisseur: .5, fTaille: .6, fForme: .35, fLobes: .6, fDensite: .55, fTeinte: .35,
    flTaille: .6, petales: .25, pForme: .75, pPointe: .6, pCoupe: .4, verticilles: .1, abondance: .7, inflorescence: .85,
    teinte: .82, saturation: .6, clarte: .6, motif: .41, teinte2: .78, contraste: .25, coeurTeinte: .9, coeurTaille: .15,
    precocite: .6, longevite: .65, vigueur: .5, graines: .5, dispersion: .3, nectar: .75, mutabilite: .35 } },
  { id: 'lis', kind: 'herbe', weight: 0.8, g: {
    stature: .4, lignine: .15, entrenoeud: .55, ramification: .2, angle: .5, generations: .35, courbure: .45, apical: .9,
    epaisseur: .5, fTaille: .5, fForme: .75, fLobes: .05, fDensite: .6, fTeinte: .4,
    flTaille: .95, petales: .35, pForme: .45, pPointe: .45, pCoupe: .05, verticilles: .1, abondance: .45, inflorescence: .35,
    teinte: .06, saturation: .95, clarte: .55, motif: .57, teinte2: .0, contraste: .12, coeurTeinte: .06, coeurTaille: .1,
    precocite: .75, longevite: .7, vigueur: .5, graines: .45, dispersion: .3, nectar: .45, mutabilite: .35 } },
  { id: 'campanule', kind: 'herbe', weight: 0.9, g: {
    stature: .3, lignine: .12, entrenoeud: .5, ramification: .3, angle: .4, generations: .35, courbure: .15, apical: .7,
    epaisseur: .35, fTaille: .4, fForme: .6, fLobes: .3, fDensite: .45, fTeinte: .4,
    flTaille: .6, petales: .25, pForme: .85, pPointe: .45, pCoupe: .97, verticilles: .1, abondance: .6, inflorescence: .8,
    teinte: .73, saturation: .6, clarte: .65, motif: .05, teinte2: .72, contraste: .5, coeurTeinte: .7, coeurTaille: .12,
    precocite: .55, longevite: .6, vigueur: .55, graines: .6, dispersion: .25, nectar: .6, mutabilite: .35 } },
  { id: 'rosier', kind: 'arbuste', weight: 1, g: {
    stature: .5, lignine: .52, entrenoeud: .5, ramification: .55, angle: .5, generations: .5, courbure: .45, apical: .4,
    epaisseur: .5, ecorceTeinte: .1, ecorceClarte: .35, fTaille: .45, fForme: .35, fLobes: .4, fDensite: .7, fTeinte: .3,
    flTaille: .75, petales: .25, pForme: .9, pPointe: .2, pCoupe: .7, verticilles: .95, abondance: .4, inflorescence: .3,
    teinte: .95, saturation: .7, clarte: .72, motif: .25, teinte2: .92, contraste: .45, coeurTeinte: .13, coeurTaille: .2,
    precocite: .5, longevite: .5, vigueur: .5, graines: .35, dispersion: .35, nectar: .7, automne: .3, mutabilite: .35 } },
  { id: 'genet', kind: 'arbuste', weight: 0.8, g: {
    stature: .45, lignine: .5, entrenoeud: .55, ramification: .7, angle: .25, generations: .7, courbure: .7, apical: .2,
    epaisseur: .35, ecorceTeinte: .6, ecorceClarte: .3, fTaille: .3, fForme: .7, fLobes: .1, fDensite: .6, fTeinte: .45,
    flTaille: .35, petales: .15, pForme: .6, pPointe: .3, pCoupe: .2, verticilles: .1, abondance: .9, inflorescence: .85,
    teinte: .14, saturation: .95, clarte: .6, motif: .1, teinte2: .1, contraste: .5, coeurTeinte: .12, coeurTaille: .15,
    precocite: .25, longevite: .45, vigueur: .6, graines: .5, dispersion: .2, nectar: .55, automne: .8, mutabilite: .35 } },
  { id: 'chene', kind: 'arbre', weight: 1.1, g: {
    stature: .88, lignine: .9, entrenoeud: .45, ramification: .65, angle: .6, generations: .75, courbure: .5, apical: .25,
    epaisseur: .8, ecorceTeinte: .08, ecorceClarte: .25, fTaille: .6, fForme: .4, fLobes: .85, fDensite: .8, fTeinte: .3,
    flTaille: .15, petales: .35, pForme: .3, pPointe: .4, pCoupe: .4, verticilles: .1, abondance: .3, inflorescence: .5,
    teinte: .2, saturation: .4, clarte: .55, motif: .05, teinte2: .2, contraste: .5, coeurTeinte: .15, coeurTaille: .3,
    precocite: .3, longevite: .8, vigueur: .4, graines: .4, dispersion: .45, nectar: .15, automne: .35, mutabilite: .3 } },
  { id: 'bouleau', kind: 'arbre', weight: 1, g: {
    stature: .84, lignine: .8, entrenoeud: .6, ramification: .5, angle: .3, generations: .7, courbure: .35, apical: .75,
    epaisseur: .4, ecorceTeinte: .1, ecorceClarte: .95, fTaille: .3, fForme: .3, fLobes: .15, fDensite: .55, fTeinte: .22,
    flTaille: .15, petales: .15, pForme: .5, pPointe: .3, pCoupe: .4, verticilles: .1, abondance: .4, inflorescence: .6,
    teinte: .18, saturation: .4, clarte: .65, motif: .05, teinte2: .18, contraste: .5, coeurTeinte: .15, coeurTaille: .3,
    precocite: .15, longevite: .4, vigueur: .75, graines: .8, dispersion: .8, nectar: .1, automne: .95, mutabilite: .3 } },
  { id: 'cerisier', kind: 'arbre', weight: 1.1, g: {
    stature: .74, lignine: .78, entrenoeud: .5, ramification: .6, angle: .55, generations: .7, courbure: .55, apical: .35,
    epaisseur: .6, ecorceTeinte: .02, ecorceClarte: .3, fTaille: .55, fForme: .45, fLobes: .2, fDensite: .7, fTeinte: .32,
    flTaille: .6, petales: .25, pForme: .85, pPointe: .6, pCoupe: .45, verticilles: .15, abondance: .75, inflorescence: .5,
    teinte: .95, saturation: .45, clarte: .85, motif: .25, teinte2: .95, contraste: .7, coeurTeinte: .95, coeurTaille: .2,
    precocite: .1, longevite: .45, vigueur: .6, graines: .6, dispersion: .5, nectar: .85, automne: .02, mutabilite: .3 } },
  { id: 'sapin', kind: 'arbre', weight: 0.9, g: {
    stature: .9, lignine: .92, entrenoeud: .35, ramification: .75, angle: .85, generations: .5, courbure: .3, apical: .97,
    epaisseur: .6, ecorceTeinte: .06, ecorceClarte: .25, fTaille: .25, fForme: .95, fLobes: .05, fDensite: .95, fTeinte: .45,
    flTaille: .1, petales: .1, pForme: .5, pPointe: .3, pCoupe: .4, verticilles: .1, abondance: .2, inflorescence: .3,
    teinte: .05, saturation: .3, clarte: .4, motif: .05, teinte2: .05, contraste: .5, coeurTeinte: .05, coeurTaille: .3,
    precocite: .3, longevite: .85, vigueur: .45, graines: .5, dispersion: .5, nectar: .05, automne: .5, mutabilite: .3 } },
  { id: 'saule', kind: 'arbre', weight: 0.8, g: {
    stature: .82, lignine: .8, entrenoeud: .7, ramification: .55, angle: .45, generations: .65, courbure: .02, apical: .35,
    epaisseur: .7, ecorceTeinte: .1, ecorceClarte: .35, fTaille: .45, fForme: .78, fLobes: .05, fDensite: .85, fTeinte: .25,
    flTaille: .2, petales: .15, pForme: .5, pPointe: .3, pCoupe: .4, verticilles: .1, abondance: .3, inflorescence: .7,
    teinte: .2, saturation: .4, clarte: .6, motif: .05, teinte2: .2, contraste: .5, coeurTeinte: .15, coeurTaille: .3,
    precocite: .15, longevite: .6, vigueur: .8, graines: .5, dispersion: .6, nectar: .2, automne: .9, mutabilite: .3 } },
];
