'use strict';
/* ==========================================================================
   Déplacement du jardinier : vue à la première personne (ZQSD / WASD),
   saut, course, mode survol (V), collisions avec troncs et rochers.
   ========================================================================== */

const Player = {
  pos: null, vel: null, yaw: 0.6, pitch: -0.08, fly: false, onGround: true, keys: {}, locked: false, noLock: false,
  sens: 0.0022, bob: 0, eye: 1.65, moving: false,
  init(camera, canvas) {
    this.camera = camera; this.canvas = canvas;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.spawn();
    document.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      this.keys[e.code] = true;
      if (this.locked && ['Space', 'Tab', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
    });
    document.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    window.addEventListener('blur', () => { this.keys = {}; });
    document.addEventListener('mousemove', (e) => {
      // souris verrouillée, ou (repli) glisser avec le bouton gauche enfoncé sur la scène
      if (!this.locked && !(this.noLock && this.dragging && (e.buttons & 1))) return;
      if (this.dragging) this.dragDist += Math.abs(e.movementX) + Math.abs(e.movementY);
      this.yaw -= e.movementX * this.sens;
      this.pitch = clamp(this.pitch - e.movementY * this.sens, -1.5, 1.5);
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
      if (this.locked) this.lockFails = 0; else this.unlockedAt = performance.now();
      UI.onLockChange(this.locked);
    });
    // verrouillage refusé à répétition (navigateur ou cadre qui l'interdit) : mode « glisser pour regarder ».
    // Un refus juste après Échap est normal (délai imposé par le navigateur) et ne compte pas.
    document.addEventListener('pointerlockerror', () => {
      if (performance.now() - (this.unlockedAt || -1e9) < 2500) { UI.onLockChange(false); return; }
      this.lockFails = (this.lockFails || 0) + 1;
      if (this.lockFails >= 2) this.fallback();
      else UI.onLockChange(false);
    });
  },
  /** Point de départ : un coin fleuri, tourné vers l'étang. */
  spawn() {
    let best = [-6, 14], bs = -1;
    for (let k = 0; k < 160; k++) {
      const x = rand(-34, 34), z = rand(-34, 34);
      if (inWater(x, z) || Math.hypot(x - POND.x, z - POND.z) < 14) continue;
      let s = 0, blocked = false;
      Eco.grid.query(x, z, 7, (p) => {
        const d = Math.hypot(p.x - x, p.z - z);
        if (p.woody && d < 2.5) blocked = true;
        for (const b of p.blooms) if (b.state === 'open' && !p.woody) s += 1 / (1 + d * 0.3);
      });
      if (!blocked && s > bs) { bs = s; best = [x, z]; }
    }
    this.pos.set(best[0], terrainH(best[0], best[1]) + this.eye, best[1]);
    this.vel.set(0, 0, 0);
    this.yaw = Math.atan2(-(POND.x - best[0]), -(POND.z - best[1]));
    this.pitch = -0.12;
  },
  /** Le joueur contrôle-t-il la vue (souris verrouillée, ou mode de repli sans verrouillage) ? */
  active() { return this.locked || (this.noLock && !UI.journalOpen); },
  lock() {
    if (this.locked || this.noLock) return;
    let p;
    try { p = this.canvas.requestPointerLock(); } catch (e) { this.fallback(); return; }
    if (p && p.catch) p.catch((err) => { if (err && err.name === 'NotSupportedError') this.fallback(); });
  },
  fallback() {
    if (this.noLock) return;
    this.noLock = true;
    UI.onLockChange(false);
    UI.toast('Souris non verrouillable : maintenez le clic gauche et glissez pour regarder', 'warn');
  },
  unlock() { if (document.pointerLockElement) document.exitPointerLock(); },
  toggleFly() { this.fly = !this.fly; this.vel.set(0, 0, 0); UI.toast(this.fly ? 'Mode survol : Espace pour monter, Maj pour descendre' : 'Retour à pied', 'info'); },
  update(dt) {
    const k = this.keys;
    const f = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0);
    const s = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
    const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
    let mx = -sy * f + cy * s, mz = -cy * f - sy * s;
    const ml = Math.hypot(mx, mz);
    if (ml > 0) { mx /= ml; mz /= ml; }
    this.moving = ml > 0;
    const P = this.pos;
    if (this.fly) {
      const sp = 9;
      const up = (k.Space ? 1 : 0) - (k.ShiftLeft || k.ShiftRight ? 1 : 0);
      this.vel.x += (mx * sp - this.vel.x) * Math.min(1, dt * 5);
      this.vel.z += (mz * sp - this.vel.z) * Math.min(1, dt * 5);
      this.vel.y += (up * sp * 0.7 - this.vel.y) * Math.min(1, dt * 5);
      P.addScaledVector(this.vel, dt);
      const gy = this.groundY(P.x, P.z) + 0.6;
      if (P.y < gy) P.y = gy;
      if (P.y > 70) P.y = 70;
    } else {
      const sp = (k.ShiftLeft || k.ShiftRight) ? 6.5 : 3.2;
      const acc = this.onGround ? 10 : 2;
      this.vel.x += (mx * sp - this.vel.x) * Math.min(1, dt * acc);
      this.vel.z += (mz * sp - this.vel.z) * Math.min(1, dt * acc);
      this.vel.y -= 18 * dt;
      if (k.Space && this.onGround) { this.vel.y = 5; this.onGround = false; }
      P.addScaledVector(this.vel, dt);
      const gy = this.groundY(P.x, P.z) + this.eye;
      if (P.y <= gy) { P.y = gy; this.vel.y = 0; this.onGround = true; }
      else if (this.onGround && this.vel.y <= 0 && P.y - gy < 0.3) { P.y = gy; this.vel.y = 0; }
      else this.onGround = false;
      if (this.moving && this.onGround) this.bob += dt * Math.hypot(this.vel.x, this.vel.z) * 2.1;
    }
    this.collide();
    P.x = clamp(P.x, -LIMIT, LIMIT); P.z = clamp(P.z, -LIMIT, LIMIT);
    const cam = this.camera;
    cam.position.copy(P);
    if (!this.fly) cam.position.y += Math.sin(this.bob) * 0.028;
    cam.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  },
  groundY(x, z) { const h = terrainH(x, z); return nearPond(x, z) ? Math.max(h, POND.level - 0.45) : h; },
  collide() {
    const P = this.pos;
    Eco.grid.query(P.x, P.z, 3, (p) => {
      if (!p.woody || p.state === 'fallen' || p.state === 'falling') return;
      const r = p.root.rad + 0.28;
      if (r < 0.3 || P.y > p.y + p.top + this.eye) return;
      const dx = P.x - p.x, dz = P.z - p.z, d = Math.hypot(dx, dz);
      if (d < r && d > 1e-4) { P.x = p.x + dx / d * r; P.z = p.z + dz / d * r; }
    });
    for (const rk of Eco.rocks) {
      const dx = P.x - rk.x, dz = P.z - rk.z, d = Math.hypot(dx, dz), r = rk.r * 0.95 + 0.25;
      if (d < r && d > 1e-4 && P.y < terrainH(rk.x, rk.z) + rk.r * 0.5 + this.eye) { P.x = rk.x + dx / d * r; P.z = rk.z + dz / d * r; }
    }
  },
  forward(out) {
    const cp = Math.cos(this.pitch);
    return out.set(-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp);
  },
};
