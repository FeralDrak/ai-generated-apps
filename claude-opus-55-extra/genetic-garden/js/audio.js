'use strict';
/* ==========================================================================
   Ambiance sonore entièrement synthétisée (Web Audio) : vent, oiseaux,
   grillons, chouette, et bruitages des outils.
   ========================================================================== */

const Sound = {
  ctx: null, master: null, vol: 0.6, birdT: 2, cricketT: 1, owlT: 30,
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const c = this.ctx = new AC();
    this.master = c.createGain(); this.master.gain.value = this.vol;
    this.master.connect(c.destination);
    // bruit blanc réutilisable
    const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;
    // vent : bruit filtré, modulé lentement
    const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 420; bp.Q.value = 0.7;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1200;
    this.windGain = c.createGain(); this.windGain.gain.value = 0.05;
    src.connect(bp).connect(lp).connect(this.windGain).connect(this.master);
    src.start();
    this.windBp = bp;
    // feuillage : bruissement aigu léger
    const src2 = c.createBufferSource(); src2.buffer = buf; src2.loop = true; src2.playbackRate.value = 0.93;
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2500;
    this.rustle = c.createGain(); this.rustle.gain.value = 0.01;
    src2.connect(hp).connect(this.rustle).connect(this.master);
    src2.start();
  },
  setVolume(v) { this.vol = v; if (this.master) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.1); },
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  out(pan) {
    const c = this.ctx;
    if (pan === undefined || !c.createStereoPanner) return this.master;
    const p = c.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); p.connect(this.master); return p;
  },
  env(g, t0, a, peak, dec) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + dec);
  },
  tone(type, f0, f1, dur, vol, pan, t0) {
    if (!this.ctx) return;
    const c = this.ctx; t0 = t0 || c.currentTime;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t0);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    this.env(g, t0, Math.min(0.02, dur * 0.3), vol, dur);
    o.connect(g).connect(this.out(pan));
    o.start(t0); o.stop(t0 + dur + 0.05);
  },
  noiseBurst(type, freq, q, dur, vol, pan, t0) {
    if (!this.ctx) return;
    const c = this.ctx; t0 = t0 || c.currentTime;
    const s = c.createBufferSource(); s.buffer = this.noise; s.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain();
    this.env(g, t0, 0.005, vol, dur);
    s.connect(f).connect(g).connect(this.out(pan));
    s.start(t0, Math.random()); s.stop(t0 + dur + 0.05);
  },

  /* ---------- Ambiance ---------- */
  update(dt) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    const w = U.uWind.value.length();
    const doy = Eco.E.doy, night = Sky.state.night, day = Sky.state.sunUp;
    const winter = doy >= 84;
    this.windGain.gain.setTargetAtTime(0.025 + w * 0.12 * (0.6 + 0.4 * Math.sin(t * 0.3)), t, 0.5);
    this.windBp.frequency.setTargetAtTime(300 + w * 500, t, 0.8);
    this.rustle.gain.setTargetAtTime(winter ? 0.003 : 0.006 + w * 0.02, t, 0.5);
    // oiseaux le jour (printemps / été surtout)
    this.birdT -= dt;
    if (this.birdT <= 0) {
      const act = day * (doy < 56 ? 1 : doy < 84 ? 0.45 : 0.12);
      this.birdT = rand(1.5, 6) / Math.max(0.15, act);
      if (act > 0.1 && Math.random() < act) this.bird();
    }
    // grillons les nuits d'été
    this.cricketT -= dt;
    if (this.cricketT <= 0) {
      this.cricketT = rand(0.35, 0.9);
      const act = night * (doy > 24 && doy < 76 ? 1 : 0);
      if (act > 0.3) this.cricket(act);
    }
    this.owlT -= dt;
    if (this.owlT <= 0) { this.owlT = rand(25, 70); if (night > 0.7) this.owl(); }
  },
  bird() {
    const c = this.ctx, pan = rand(-0.9, 0.9), vol = rand(0.015, 0.045);
    let t = c.currentTime + 0.05;
    const kind = Math.floor(Math.random() * 4);
    const base = rand(2200, 4200);
    const n = kind === 2 ? randInt(6, 12) : randInt(2, 6);
    for (let i = 0; i < n; i++) {
      if (kind === 0) { this.tone('sine', base * rand(0.9, 1.1), base * rand(1.2, 1.6), rand(0.06, 0.12), vol, pan, t); t += rand(0.1, 0.22); }
      else if (kind === 1) { this.tone('sine', base * 1.4, base * 0.8, 0.14, vol, pan, t); t += 0.2; }
      else if (kind === 2) { this.tone('triangle', base * (i % 2 ? 1.12 : 1), base * (i % 2 ? 1.05 : 1.2), 0.04, vol * 0.8, pan, t); t += 0.055; }
      else { this.tone('sine', base * 0.7, base * 0.7 * rand(1.05, 1.3), 0.22, vol * 0.8, pan, t); t += rand(0.25, 0.4); }
    }
  },
  cricket(act) {
    const c = this.ctx, pan = rand(-1, 1), t = c.currentTime + 0.02, f = rand(4200, 4800);
    for (let i = 0; i < 3; i++) this.tone('sine', f, f, 0.025, 0.006 * act, pan, t + i * 0.045);
  },
  owl() {
    const t = this.ctx.currentTime + 0.1, pan = rand(-0.8, 0.8);
    this.tone('sine', 400, 370, 0.35, 0.03, pan, t);
    this.tone('sine', 390, 360, 0.55, 0.03, pan, t + 0.55);
  },

  /* ---------- Bruitages ---------- */
  click() { this.tone('sine', 1300, 1100, 0.03, 0.03); },
  pop(p = 1) { this.tone('sine', 700 * p, 350 * p, 0.12, 0.06); },
  snip() { this.noiseBurst('highpass', 3200, 0.8, 0.04, 0.12); this.noiseBurst('highpass', 4000, 0.8, 0.03, 0.08, 0, this.ctx && this.ctx.currentTime + 0.07); },
  deny() { this.tone('square', 190, 170, 0.14, 0.02); },
  plant() { this.noiseBurst('lowpass', 500, 0.7, 0.18, 0.15); this.tone('sine', 160, 90, 0.18, 0.08); },
  water() { this.noiseBurst('bandpass', 1400, 1.2, 0.3, 0.05); },
  graft() { this.click(); const t = this.ctx ? this.ctx.currentTime : 0; this.tone('sine', 880, 880, 0.4, 0.04, 0, t + 0.08); this.tone('sine', 1320, 1320, 0.5, 0.03, 0, t + 0.16); },
  mutate() {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime, o = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(300, t); o.frequency.exponentialRampToValueAtTime(1600, t + 0.5);
    lfo.frequency.value = 18; lg.gain.value = 40; lfo.connect(lg).connect(o.frequency);
    this.env(g, t, 0.05, 0.05, 0.6);
    o.connect(g).connect(this.master); o.start(t); lfo.start(t); o.stop(t + 0.7); lfo.stop(t + 0.7);
  },
  chime() { const t = this.ctx ? this.ctx.currentTime : 0; this.tone('sine', 1047, 1047, 1.2, 0.03, 0, t); this.tone('sine', 1568, 1568, 1.4, 0.02, 0, t + 0.12); },
  creak(pan) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime, o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(70, t);
    for (let i = 0; i < 10; i++) o.frequency.linearRampToValueAtTime(60 + Math.random() * 40, t + i * 0.18);
    f.type = 'lowpass'; f.frequency.value = 500;
    this.env(g, t, 0.2, 0.05, 1.8);
    o.connect(f).connect(g).connect(this.out(pan)); o.start(t); o.stop(t + 2.1);
  },
  thud(pan, vol = 0.25) { this.tone('sine', 70, 38, 0.9, vol, pan); this.noiseBurst('lowpass', 350, 0.6, 0.8, vol * 0.7, pan); },
  buzz(pos) {
    if (!this.ctx || !pos) return;
    const d = Math.hypot(pos.x - Player.pos.x, pos.z - Player.pos.z);
    if (d > 6) return;
    const c = this.ctx, t = c.currentTime, o = c.createOscillator(), g = c.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(rand(200, 240), t); o.frequency.linearRampToValueAtTime(rand(180, 260), t + 0.5);
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 600; f.Q.value = 2;
    this.env(g, t, 0.05, 0.012 * (1 - d / 6), 0.5);
    o.connect(f).connect(g).connect(this.out(this.panOf(pos))); o.start(t); o.stop(t + 0.6);
  },
  panOf(pos) {
    const dx = pos.x - Player.pos.x, dz = pos.z - Player.pos.z, l = Math.hypot(dx, dz) || 1;
    return clamp((dx * Math.cos(Player.yaw) - dz * Math.sin(Player.yaw)) / l, -1, 1);
  },
};
