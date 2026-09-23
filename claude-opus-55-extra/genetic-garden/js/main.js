'use strict';
/* ==========================================================================
   Démarrage et boucle principale.
   ========================================================================== */

const DAY_SECONDS = 4;                       // un jour du pré dure 4 s à vitesse ×1
const SPEEDS = [0, 0.5, 1, 3, 10, 30];

const Game = {
  speedIdx: 2, prevSpeed: 2, acc: 0, simBudget: 10,
  setSpeed(i) {
    if (this.speedIdx) this.prevSpeed = this.speedIdx;
    this.speedIdx = clamp(i, 0, SPEEDS.length - 1);
    UI.toast(this.speedIdx === 0 ? 'Temps suspendu' : `Écoulement du temps ${SPEED_LABELS[this.speedIdx]}`, 'info');
  },
  simulate(dt) {
    const sp = SPEEDS[this.speedIdx];
    if (!sp) return;
    this.acc += dt * sp / DAY_SECONDS;
    const step = sp <= 1 ? 0.1 : sp <= 3 ? 0.25 : sp <= 10 ? 0.5 : 1;
    const t0 = performance.now();
    while (this.acc >= step) {
      Eco.step(step);
      this.acc -= step;
      if (performance.now() - t0 > this.simBudget) { this.acc = Math.min(this.acc, step); break; }
    }
  },
  visDoy() { return dayOfYear(Eco.day + this.acc); },
  async newMeadow() {
    UI.inspector(null); Tools.pin = null; Tools.clonePlant = null; Tools.aim = null;
    PlantView.clear();
    Eco.init();
    Player.spawn();
    for (const p of Eco.plants) PlantView.add(p);
    for (const p of Eco.plants) PlantView.buildPlant(p);
    for (const c of PlantView.chunks) PlantView.assemble(c);
    UI.logs = [];
    UI.toast('Un nouveau pré s’éveille', 'event');
    Player.lock();
  },
};

function wireHooks() {
  Hooks.plantAdded = (p) => PlantView.add(p);
  Hooks.plantRemoved = (p) => {
    PlantView.remove(p);
    if (Tools.pin && Tools.pin.plant === p) { Tools.pin = null; UI.inspector(null); }
    if (Tools.clonePlant === p) Tools.clonePlant = null;
  };
  Hooks.seedsDispersed = (b, landed, total) => Fx.seeds(b, landed, total);
  Hooks.treeFalling = (p) => {
    PlantView.startFall(p);
    if (Math.hypot(p.x - Player.pos.x, p.z - Player.pos.z) < 45) Sound.creak(Sound.panOf(p));
  };
  Hooks.petalFall = (b) => Fx.petals(b);
  Hooks.event = (k, d) => UI.onEvent(k, d);
}

// laisse le navigateur respirer (et peindre la barre de progression) ; sans attendre si l'onglet est masqué
const nextFrame = () => new Promise(r => {
  if (document.hidden) { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0); }
  else requestAnimationFrame(() => r());
});

async function boot() {
  const canvas = $('scene');
  UI.progress(0.05, 'Le pré s’éveille…');
  await nextFrame();
  Eco.init();
  UI.progress(0.35, 'Les graines germent…');
  await nextFrame();
  View.init(canvas);
  Sky.init();
  Fx.init(View.scene);
  Highlight.init(View.scene);
  PlantView.init();
  wireHooks();
  for (const p of Eco.plants) PlantView.add(p);
  Player.init(View.camera, canvas);
  Tools.init();
  UI.init();
  Fauna.init(View.scene);
  // première construction de toutes les plantes, par lots
  const P = Eco.plants.slice();
  for (let i = 0; i < P.length; i++) {
    PlantView.buildPlant(P[i]);
    if (i % 60 === 0) { UI.progress(0.4 + 0.5 * i / P.length, 'Les fleurs s’ouvrent…'); await nextFrame(); }
  }
  for (const c of PlantView.chunks) PlantView.assemble(c);
  UI.progress(1);
  // premier rendu (compilation des shaders) avant d'ouvrir le pré
  SeasonLook.apply(Eco.E.doy);
  Player.update(0);
  View.updateEnv(0, Player.pos);
  View.render();
  UI.ready();
  requestAnimationFrame(loop);
}

let lastT = performance.now(), frameMs = 16;
const _wind = { a: 0.6, s: 0.5 };
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - lastT) / 1000);
  frameMs = frameMs * 0.95 + (now - lastT) * 0.05;
  lastT = now;
  U.uTime.value += dt;
  const t = U.uTime.value;
  if (UI.started) {
    if (Player.active() || !UI.journalOpen) Player.update(dt);
    Game.simulate(dt);
  }
  const doy = Game.visDoy();
  Sky.update(dt, doy);
  SeasonLook.apply(doy);
  // vent : direction et force changent lentement, plus fort en hiver
  const winter = doy >= 84 ? 1 : 0;
  _wind.a = 0.6 + 0.9 * Math.sin(t * 0.011) + 0.3 * Math.sin(t * 0.037);
  _wind.s = clamp(0.32 + 0.22 * Math.sin(t * 0.05) * Math.sin(t * 0.031 + 1) + 0.12 * Math.sin(t * 0.21) + winter * 0.15, 0.08, 0.9);
  U.uWind.value.set(Math.cos(_wind.a) * _wind.s, Math.sin(_wind.a) * _wind.s);
  U.uGust.value = 0.6 + 0.4 * Math.sin(t * 0.23);
  Eco.wind.x = Math.cos(_wind.a); Eco.wind.z = Math.sin(_wind.a); Eco.wind.s = _wind.s;
  View.updateEnv(dt, Player.pos);
  const budget = frameMs > 24 ? 3 : 6;
  PlantView.update(dt, Player.pos, budget);
  Fauna.update(dt, Sky.state.sunUp > 0.35 && doy < 80);
  Fx.update(dt, Player.pos, doy);
  if (UI.started) {
    if (Player.active()) Tools.pick(); else Tools.aim = null;
    Tools.update(dt);
    Highlight.update(Tools.aim, Tools.pin, Tools.clonePlant);
    UI.frame(dt);
    Sound.update(dt);
  }
  View.render();
}

boot().catch((e) => {
  console.error(e);
  const el = document.getElementById('startErr');
  if (el) el.textContent = 'Erreur au démarrage : ' + e.message;
});
