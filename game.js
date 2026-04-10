import { Ship } from './ship.js';
import { Star } from './star.js';
import { Asteroid } from './asteroid.js';
import { Particle } from './particle.js';
import { AI } from './ai.js';
import { HUD } from './hud.js';
import { Planet } from './planet.js';

function rnd(a, b) {
  return a + Math.random() * (b - a);
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export class Game {
  constructor(canvas, aiMode) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.aiMode = aiMode;

    this.alive = true;
    this.frame = 0;
    this.survivalTime = 0;
    this.speed = 0.8;
    this.hull = 100;
    this.temp = 22;
    this.humidity = 45;
    this.fogAlpha = 0;
    this.flickerAlpha = 0;
    this.jitter = 0;
    this.shieldActive = 0;
    this.coolActive = 0;
    this.aiCooldown = 0;

    this.tempHistory = Array(60).fill(22);
    this.humHistory = Array(60).fill(45);

    this.ship = new Ship();
    this.ai = new AI();
    this.hud = new HUD(this.ctx);

    this.stars = Array.from({ length: 540 }, () => new Star(rnd));
    this.planets = Array.from({ length: 3 }, () => new Planet(rnd, false));
    this.hazardPlanets = Array.from({ length: 2 }, () => new Planet(rnd, true));
    this.asteroids = Array.from({ length: 44 }, () => new Asteroid(rnd, true));
    this.particles = [];

    this.keys = {};
    this.nearMissTimer = 0;
    this.nearMissText = '';

    this._onKeyDown = (e) => {
      const k = e.key.toLowerCase();

      if (!this.keys[k]) {
        this.keys[k] = true;
        if (k === 'e' && this.aiMode) this.executeAI();
      }

      if (['w', 'a', 's', 'd', 'e', ' '].includes(k)) e.preventDefault();
    };

    this._onKeyUp = (e) => {
      this.keys[e.key.toLowerCase()] = false;
    };

    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);

    if (aiMode) this.ai.push('NEURAL LINK ONLINE — STANDBY', '#00ffcc');
  }

  W() {
    return this.canvas.width;
  }

  H() {
    return this.canvas.height;
  }

  project(x, y, z) {
    if (z < 1) return null;

    const fov = Math.min(this.W(), this.H()) * 0.88;

    return {
      x: this.W() / 2 + (x - this.ship.x) * fov / z,
      y: this.H() / 2 + (y - this.ship.y) * fov / z,
      scale: fov / z
    };
  }

  executeAI() {
    const result = this.ai.execute(this.temp, this.hull, this.humidity, this.aiCooldown);
    if (!result) return;

    this.aiCooldown = result.cooldown;

    if (result.action === 'cool') this.coolActive = 200;
    if (result.action === 'shield') this.shieldActive = 260;
    if (result.action === 'dehumidify') {
      this.humidity = Math.max(28, this.humidity - 28);
    }
  }

  animateSplash(sc) {
    const sctx = sc.getContext('2d');

    const splashStars = Array.from({ length: 320 }, () => ({
      x: Math.random(),
      y: Math.random(),
      s: rnd(0.4, 2),
      b: rnd(0.2, 0.9),
      t: rnd(0, 6.28)
    }));

    let splashRaf;

    const frame = () => {
      if (document.getElementById('splash').style.display === 'none') return;

      const sw = sc.width;
      const sh = sc.height;

      sctx.fillStyle = '#000';
      sctx.fillRect(0, 0, sw, sh);

      for (const s of splashStars) {
        s.t += 0.008;
        sctx.globalAlpha = (Math.sin(s.t) * 0.3 + 0.6) * s.b;
        sctx.fillStyle = s.b > 0.7 ? '#00ffcc' : '#ffffff';
        sctx.beginPath();
        sctx.arc(s.x * sw, s.y * sh, s.s, 0, 6.28);
        sctx.fill();
      }

      sctx.globalAlpha = 1;
      splashRaf = requestAnimationFrame(frame);
    };

    splashRaf = requestAnimationFrame(frame);
    this._stopSplash = () => cancelAnimationFrame(splashRaf);
  }

  update(dt) {
    if (!this.alive) return;

    this.frame++;
    this.survivalTime += dt / 60;

    this.aiCooldown = Math.max(0, this.aiCooldown - dt);
    this.shieldActive = Math.max(0, this.shieldActive - dt);
    this.coolActive = Math.max(0, this.coolActive - dt);
    this.jitter = Math.max(0, this.jitter - 0.45 * dt);
    this.nearMissTimer = Math.max(0, this.nearMissTimer - dt);

    this.ship.update(this.keys, dt, clamp, this.W(), this.H());

    this.speed = clamp(this.speed + 0.0018 * dt, 0.5, 3.8);

    const moving = this.keys['w'] || this.keys['a'] || this.keys['s'] || this.keys['d'];
    let tgt = 18 + this.speed * 20 + (moving ? 9 : 0);

    if (this.coolActive > 0) tgt = Math.max(18, tgt - 45);

    this._applyPlanetEffects(dt);

    this.temp += (tgt - this.temp) * 0.014 * dt;
    this.temp = clamp(this.temp, 18, 135);

    if (Math.random() < 0.004 * dt) this.humidity += rnd(-5, 7);
    this.humidity = clamp(this.humidity, 18, 100);
    this.fogAlpha = clamp((this.humidity - 63) / 37, 0, 0.75);

    if (this.temp > 88 && this.shieldActive <= 0) {
      this.hull -= 0.022 * dt * (this.temp - 88) / 42;
    }

    if (this.hull <= 0) {
      this.hull = 0;
      this.alive = false;
      return;
    }

    this.tempHistory.push(this.temp);
    if (this.tempHistory.length > 60) this.tempHistory.shift();

    this.humHistory.push(this.humidity);
    if (this.humHistory.length > 60) this.humHistory.shift();

    for (const s of this.stars) s.update(this.speed, dt, rnd);

    for (const p of this.planets) {
      p.update(this.speed, dt, rnd);
    }

    for (const p of this.hazardPlanets) {
      p.update(this.speed * (1 + this.survivalTime * 0.01), dt, rnd);

      const proj = this.project(p.x, p.y, p.z);
      if (!proj) continue;

      const hitR = p.radius * proj.scale * 0.78;
      const dx = proj.x - this.W() / 2;
      const dy = proj.y - this.H() / 2;

      if (Math.abs(dx) < hitR + 18 && Math.abs(dy) < hitR + 18 && p.z < 260 && p.z > -80) {
        this._handlePlanetCollision(p, proj, rnd);
        if (!this.alive) return;
      }
    }

    for (const a of this.asteroids) {
      const asteroidSpeed = this.speed * (1 + this.survivalTime * 0.015);
      a.update(asteroidSpeed, dt, rnd);

      const p = this.project(a.x, a.y, a.z);
      if (!p) continue;

      const hitR = a.size * p.scale * 0.72;
      const dx = p.x - this.W() / 2;
      const dy = p.y - this.H() / 2;

      this._checkNearMiss(a, dx, dy, hitR);

      if (Math.abs(dx) < hitR + 14 && Math.abs(dy) < hitR + 14 && a.z < 220 && a.z > -60) {
        this._handleCollision(a, p, rnd);
        if (!this.alive) return;
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update();
      if (this.particles[i].dead) this.particles.splice(i, 1);
    }

    if (this.flickerAlpha > 0) this.flickerAlpha -= 0.035 * dt;
    if (Math.random() < 0.002 * dt) this.flickerAlpha = rnd(0.2, 0.55);

    if (this.aiMode) {
      this.ai.update(dt, this.frame, this.temp, this.hull, this.humidity, this.aiCooldown);
    }
  }

  _applyPlanetEffects(dt) {
    const allPlanets = [...this.planets, ...this.hazardPlanets];

    for (const p of allPlanets) {
      const proj = this.project(p.x, p.y, p.z);
      if (!proj) continue;

      const dx = proj.x - this.W() / 2;
      const dy = proj.y - this.H() / 2;
      const screenDist = Math.sqrt(dx * dx + dy * dy);

      if (p.z > 1600) continue;
      if (screenDist > Math.min(this.W(), this.H()) * 0.42) continue;

      const closeness = clamp(1 - p.z / 1600, 0, 1) * clamp(1 - screenDist / (Math.min(this.W(), this.H()) * 0.42), 0, 1);
      const effectPower = closeness * p.effectStrength * dt;

      if (p.effect === 'heat') {
        this.temp += effectPower * 3.2;
      } else if (p.effect === 'humidity') {
        this.humidity += effectPower * 3.8;
      } else if (p.effect === 'flicker') {
        this.flickerAlpha = Math.max(this.flickerAlpha, clamp(effectPower * 1.8, 0, 0.45));
      } else if (p.effect === 'drift') {
        this.ship.vx += Math.sin(this.frame * 0.02 + p.rot) * effectPower * 0.45;
      }
    }
  }

  _checkNearMiss(a, dx, dy, hitR) {
    if (a.nearMissed) return;
    if (a.z > 250 || a.z < 80) return;

    const dist = Math.sqrt(dx * dx + dy * dy);
    const nearR = hitR + 36;

    if (dist > hitR + 10 && dist < nearR) {
      a.nearMissed = true;
      this.nearMissTimer = 55;
      this.nearMissText = 'NEAR MISS';
      this.flickerAlpha = Math.max(this.flickerAlpha, 0.18);

      if (this.aiMode) {
        this.ai.push('NEAR MISS DETECTED — GOOD EVASION', '#00ffcc');
      }
    }
  }

  _spawnClusterFragments(source, rndFn) {
    if (!source.clusterHint) return;
    if (Math.random() > 0.55) return;

    const fragments = Math.floor(rndFn(1, 3));

    for (let i = 0; i < fragments; i++) {
      const frag = new Asteroid(rndFn, false);
      frag.variant = 'fast';
      frag.size = rndFn(8, 16);
      frag.vx = source.vx + rndFn(-0.45, 0.45);
      frag.vy = source.vy + rndFn(-0.3, 0.3);
      frag.vz = source.vz + rndFn(-1.6, -0.6);
      frag.x = source.x + rndFn(-120, 120);
      frag.y = source.y + rndFn(-90, 90);
      frag.z = source.z + rndFn(140, 260);
      frag.damageMult = 0.75;
      frag.tempImpact = 0;
      frag.electricImpact = 0;
      frag.trail = true;
      frag.color = 'hsl(22,18%,38%)';
      frag.clusterHint = false;
      frag.nearMissed = false;
      this.asteroids.push(frag);
    }

    if (this.asteroids.length > 58) {
      this.asteroids.length = 58;
    }
  }

  _handleCollision(a, p, rndFn) {
    if (this.shieldActive > 0) {
      this.ai.push('SHIELD ABSORBED IMPACT', '#00ccff');

      for (let i = 0; i < 9; i++) {
        this.particles.push(
          new Particle(p.x, p.y, rndFn(-3, 3), rndFn(-3, 3), 35, '#0088ff')
        );
      }

      this._spawnClusterFragments(a, rndFn);

      a.z = rndFn(1500, 2200);
      a.x = rndFn(-1700, 1700);
      a.y = rndFn(-1000, 1000);
      a.nearMissed = false;
      return;
    }

    let dmg = (7 + a.size * 0.28) * (a.damageMult || 1);

    if (a.variant === 'heavy') dmg += 5;

    this.hull = Math.max(0, this.hull - dmg);
    this.jitter = 15;

    if (a.tempImpact) {
      this.temp = Math.min(135, this.temp + a.tempImpact);
    }

    if (a.electricImpact) {
      this.aiCooldown = Math.max(this.aiCooldown, 120 + a.electricImpact * 18);
      this.flickerAlpha = Math.max(this.flickerAlpha, 0.3);
    }

    for (let i = 0; i < 14; i++) {
      let col = i % 2 === 0 ? '#ff4400' : '#ff8800';
      if (a.variant === 'charged') col = i % 2 === 0 ? '#66aaff' : '#cce6ff';
      if (a.variant === 'ember') col = i % 2 === 0 ? '#ff5500' : '#ffcc66';

      this.particles.push(
        new Particle(
          this.W() / 2,
          this.H() / 2,
          rndFn(-6, 6),
          rndFn(-6, 6),
          44,
          col
        )
      );
    }

    if (this.aiMode) {
      if (a.variant === 'ember') {
        this.ai.push(`THERMAL IMPACT: ${Math.round(this.hull)}% HULL`, '#ff8800');
      } else if (a.variant === 'charged') {
        this.ai.push(`ELECTRICAL IMPACT: ${Math.round(this.hull)}% HULL`, '#88ccff');
      } else if (a.variant === 'heavy') {
        this.ai.push(`HEAVY IMPACT: ${Math.round(this.hull)}% HULL`, '#ff4400');
      } else {
        this.ai.push(`HULL BREACH: ${Math.round(this.hull)}% — PRESS E FOR SHIELD`, '#ff4400');
      }
    }

    this._spawnClusterFragments(a, rndFn);

    a.z = rndFn(1600, 2400);
    a.x = rndFn(-1700, 1700);
    a.y = rndFn(-1000, 1000);
    a.nearMissed = false;

    if (this.hull <= 0) {
      this.hull = 0;
      this.alive = false;
    }
  }

  _handlePlanetCollision(p, proj, rndFn) {
    if (this.shieldActive > 0) {
      this.ai.push('SHIELD ABSORBED PLANETARY IMPACT', '#00ccff');

      for (let i = 0; i < 14; i++) {
        this.particles.push(
          new Particle(
            proj.x,
            proj.y,
            rndFn(-4, 4),
            rndFn(-4, 4),
            40,
            '#66ccff'
          )
        );
      }

      p.reset(rndFn, false);
      return;
    }

    let dmg = 18;

    if (p.kind === 'lava') {
      dmg += 4;
      this.temp = Math.min(135, this.temp + 8);
    } else if (p.kind === 'ice') {
      this.humidity = Math.min(100, this.humidity + 12);
    } else if (p.kind === 'magnetic') {
      this.aiCooldown = Math.max(this.aiCooldown, 180);
      this.flickerAlpha = Math.max(this.flickerAlpha, 0.35);
    } else if (p.kind === 'gas') {
      this.ship.vx += rndFn(-1.4, 1.4);
      this.ship.vy += rndFn(-1.1, 1.1);
    }

    this.hull = Math.max(0, this.hull - dmg);
    this.jitter = 22;

    for (let i = 0; i < 20; i++) {
      let col = i % 2 === 0 ? '#ff4400' : '#ffaa00';
      if (p.kind === 'ice') col = i % 2 === 0 ? '#c9f3ff' : '#7bdfff';
      if (p.kind === 'magnetic') col = i % 2 === 0 ? '#9db4ff' : '#d5caff';

      this.particles.push(
        new Particle(
          this.W() / 2,
          this.H() / 2,
          rndFn(-7, 7),
          rndFn(-7, 7),
          48,
          col
        )
      );
    }

    if (this.aiMode) {
      this.ai.push(`MAJOR ${p.kind.toUpperCase()} IMPACT: ${Math.round(this.hull)}% HULL`, '#ff2200');
    }

    p.reset(rndFn, false);

    if (this.hull <= 0) {
      this.hull = 0;
      this.alive = false;
    }
  }

  render() {
    const ctx = this.ctx;
    const w = this.W();
    const h = this.H();

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#000004';
    ctx.fillRect(0, 0, w, h);

    const jx = this.jitter ? (Math.random() - 0.5) * this.jitter : 0;
    const jy = this.jitter ? (Math.random() - 0.5) * this.jitter : 0;

    ctx.save();
    ctx.translate(jx, jy);

    for (const s of this.stars) {
      s.draw(ctx, this.project.bind(this), this.speed, w, h);
    }

    for (const p of this.planets) {
      p.draw(ctx, this.project.bind(this));
    }

    [...this.asteroids]
      .sort((a, b) => b.z - a.z)
      .forEach((a) => {
        a.draw(ctx, this.project.bind(this), clamp);
      });

    for (const p of this.hazardPlanets) {
      p.draw(ctx, this.project.bind(this));
    }

    this.hud.drawCockpit();

    for (const p of this.particles) {
      p.draw(ctx);
    }

    this.hud.drawMFDs(this);

    this.hud.drawHUD(
      this.hull,
      this.speed,
      this.shieldActive,
      this.aiMode,
      this.aiCooldown,
      this.frame
    );

    if (this.nearMissTimer > 0) {
      ctx.fillStyle = `rgba(0,255,200,${Math.min(1, this.nearMissTimer / 30) * 0.85})`;
      ctx.font = `bold ${Math.round(h * 0.026)}px 'Courier New'`;
      ctx.textAlign = 'center';
      ctx.fillText(this.nearMissText, w / 2, h * 0.18);
      ctx.textAlign = 'left';
    }

    this.hud.drawFog(this.fogAlpha, rnd);
    this.hud.drawFlicker(this.flickerAlpha, rnd);

    ctx.restore();
  }

  destroy() {
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup', this._onKeyUp);

    if (this._stopSplash) this._stopSplash();
  }
}