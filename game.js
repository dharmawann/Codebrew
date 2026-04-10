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

    this.ship.update(this.keys, dt, clamp, this.W(), this.H());

    this.speed = clamp(this.speed + 0.0018 * dt, 0.5, 3.8);

    const moving = this.keys['w'] || this.keys['a'] || this.keys['s'] || this.keys['d'];
    let tgt = 18 + this.speed * 20 + (moving ? 9 : 0);

    if (this.coolActive > 0) tgt = Math.max(18, tgt - 45);

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

      if (Math.abs(dx) < hitR + 14 && Math.abs(dy) < hitR + 14 && a.z < 220 && a.z > -60) {
        this._handleCollision(a, p);
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

  _handleCollision(a, p) {
    if (this.shieldActive > 0) {
      this.ai.push('SHIELD ABSORBED IMPACT', '#00ccff');

      for (let i = 0; i < 9; i++) {
        this.particles.push(
          new Particle(p.x, p.y, rnd(-3, 3), rnd(-3, 3), 35, '#0088ff')
        );
      }

      a.z = rnd(1500, 2200);
      a.x = rnd(-1700, 1700);
      a.y = rnd(-1000, 1000);
      return;
    }

    const dmg = 7 + a.size * 0.28;
    this.hull = Math.max(0, this.hull - dmg);
    this.jitter = 15;

    for (let i = 0; i < 14; i++) {
      this.particles.push(
        new Particle(
          this.W() / 2,
          this.H() / 2,
          rnd(-6, 6),
          rnd(-6, 6),
          44,
          i % 2 === 0 ? '#ff4400' : '#ff8800'
        )
      );
    }

    a.z = rnd(1600, 2400);
    a.x = rnd(-1700, 1700);
    a.y = rnd(-1000, 1000);

    if (this.aiMode) {
      this.ai.push(`HULL BREACH: ${Math.round(this.hull)}% — PRESS E FOR SHIELD`, '#ff4400');
    }

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

    const dmg = 18;
    this.hull = Math.max(0, this.hull - dmg);
    this.jitter = 22;

    for (let i = 0; i < 20; i++) {
      this.particles.push(
        new Particle(
          this.W() / 2,
          this.H() / 2,
          rndFn(-7, 7),
          rndFn(-7, 7),
          48,
          i % 2 === 0 ? '#ff4400' : '#ffaa00'
        )
      );
    }

    if (this.aiMode) {
      this.ai.push(`MAJOR IMPACT: ${Math.round(this.hull)}% HULL`, '#ff2200');
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