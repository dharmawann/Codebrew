import { Ship } from './ship.js';
import { Star } from './Star.js';
import { Asteroid } from './Asteroid.js';
import { Particle } from './Particle.js';
import { AI } from './AI.js';
import { HUD } from './HUD.js';
import { Planet } from './planet.js';

// ─── Utility functions ────────────────────────────────────────────────────────
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

    this.planets = Array.from({ length: 5 }, () => new Planet(rnd));

    // ── Game state ──────────────────────────────────────────────────────────
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

    // ── Objects ─────────────────────────────────────────────────────────────
    this.ship = new Ship();
    this.ai = new AI();
    this.ai.lastRecommendation = {
      type: 'stable',
      score: 0,
      action: 'none',
      msg: 'ALL SYSTEMS NOMINAL',
      color: '#00ffcc'
    };

    this.hud = new HUD(this.ctx);
    this.stars = Array.from({ length: 540 }, () => new Star(rnd));
    this.asteroids = Array.from({ length: 44 }, () => new Asteroid(rnd, true));
    this.particles = [];

    // ── Input ───────────────────────────────────────────────────────────────
    this.keys = {};

    this._onKeyDown = (e) => {
      const k = e.key.toLowerCase();

      if (!this.keys[k]) {
        this.keys[k] = true;

        if (k === 'e' && this.aiMode) {
          this.executeAI();
        }
      }

      if (['w', 'a', 's', 'd', 'e', ' ', 'shift'].includes(k)) {
        e.preventDefault();
      }
    };

    this._onKeyUp = (e) => {
      this.keys[e.key.toLowerCase()] = false;
    };

    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);

    // ── Boot message ────────────────────────────────────────────────────────
    if (aiMode) {
      this.ai.push('NEURAL LINK ONLINE — STANDBY', '#00ffcc');
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  W() {
    return this.canvas.width;
  }

  H() {
    return this.canvas.height;
  }

  // Projects a 3D point to 2D screen space
  project(x, y, z) {
    if (z < 1) return null;

    const fov = Math.min(this.W(), this.H()) * 0.88;

    return {
      x: this.W() / 2 + (x - this.ship.x) * fov / z,
      y: this.H() / 2 + (y - this.ship.y) * fov / z,
      scale: fov / z
    };
  }

  // ── AI ────────────────────────────────────────────────────────────────────

  executeAI() {
    const result = this.ai.execute(
      this.temp,
      this.hull,
      this.humidity,
      this.aiCooldown
    );

    if (!result) return;

    this.aiCooldown = result.cooldown;

    if (result.action === 'cool') {
      this.coolActive = 200;
    }

    if (result.action === 'shield') {
      this.shieldActive = 260;
    }

    if (result.action === 'dehumidify') {
      this.humidity = Math.max(28, this.humidity - 28);
    }
  }

  // ── Splash screen animation ───────────────────────────────────────────────

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

  // ── Update ────────────────────────────────────────────────────────────────

  update(dt) {
    if (!this.alive) return;

    this.frame++;
    this.survivalTime += dt / 60;

    // Timers
    this.aiCooldown = Math.max(0, this.aiCooldown - dt);
    this.shieldActive = Math.max(0, this.shieldActive - dt);
    this.coolActive = Math.max(0, this.coolActive - dt);
    this.jitter = Math.max(0, this.jitter - 0.45 * dt);

    // Ship
    this.ship.update(this.keys, dt, clamp, this.W(), this.H());

    // Speed ramp
    const accelerating = this.keys['shift'];

    if (accelerating) {
      this.speed += 0.03 * dt;
    } else {
      this.speed -= 0.02 * dt;
    }

    this.speed = Math.max(0, this.speed);

    // Temperature
    const moving =
      this.keys['w'] ||
      this.keys['a'] ||
      this.keys['s'] ||
      this.keys['d'];

    let tgt = 18 + this.speed * 20 + (moving ? 9 : 0);

    if (this.coolActive > 0) {
      tgt = Math.max(18, tgt - 45);
    }

    this.temp += (tgt - this.temp) * 0.014 * dt;
    this.temp = clamp(this.temp, 18, 135);

    // Humidity + fog
    if (Math.random() < 0.004 * dt) {
      this.humidity += rnd(-5, 7);
    }

    this.humidity = clamp(this.humidity, 18, 100);
    this.fogAlpha = clamp((this.humidity - 63) / 37, 0, 0.75);

    // Hull heat decay
    if (this.temp > 88 && this.shieldActive <= 0) {
      this.hull -= 0.022 * dt * (this.temp - 88) / 42;
    }

    if (this.hull <= 0) {
      this.hull = 0;
      this.alive = false;
      return;
    }

    // History buffers
    this.tempHistory.push(this.temp);
    if (this.tempHistory.length > 60) {
      this.tempHistory.shift();
    }

    this.humHistory.push(this.humidity);
    if (this.humHistory.length > 60) {
      this.humHistory.shift();
    }

    // Stars
    for (const s of this.stars) {
      s.update(this.speed, dt, rnd);
    }

    // Planets
    for (const p of this.planets) {
      p.update(this.speed, dt, rnd);
    }

    // Asteroids
    for (const a of this.asteroids) {
      const asteroidSpeed = this.speed * (1 + this.survivalTime * 0.015);
      a.update(asteroidSpeed, dt, rnd);

      const p = this.project(a.x, a.y, a.z);
      if (!p) continue;

      const hitR = a.size * p.scale * 0.72;
      const dx = p.x - this.W() / 2;
      const dy = p.y - this.H() / 2;

      if (
        Math.abs(dx) < hitR + 14 &&
        Math.abs(dy) < hitR + 14 &&
        a.z < 220 &&
        a.z > -60
      ) {
        this._handleCollision(a, p);

        if (!this.alive) {
          return;
        }
      }
    }

    // Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update();

      if (this.particles[i].dead) {
        this.particles.splice(i, 1);
      }
    }

    // Effects
    if (this.flickerAlpha > 0) {
      this.flickerAlpha -= 0.035 * dt;
    }

    if (Math.random() < 0.002 * dt) {
      this.flickerAlpha = rnd(0.2, 0.55);
    }

    // AI advisor
    if (this.aiMode) {
      this.ai.update(
        dt,
        this.frame,
        this.temp,
        this.hull,
        this.humidity,
        this.aiCooldown
      );
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
    } else {
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

      if (this.aiMode) {
        this.ai.push(
          `HULL BREACH: ${Math.round(this.hull)}% — PRESS E FOR SHIELD`,
          '#ff4400'
        );
      }

      if (this.hull <= 0) {
        this.hull = 0;
        this.alive = false;
      }
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

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

    // Stars
    for (const s of this.stars) {
      s.draw(ctx, this.project.bind(this), this.speed, w, h);
    }

    // Planets
    for (const p of this.planets) {
      p.draw(ctx, this.project.bind(this));
    }

    // Asteroids (back to front)
    [...this.asteroids]
      .sort((a, b) => b.z - a.z)
      .forEach((a) => a.draw(ctx, this.project.bind(this), clamp));

    // Cockpit frame
    this.hud.drawCockpit();

    // Particles
    for (const p of this.particles) {
      p.draw(ctx);
    }

    // MFD panels
    this.hud.drawMFDs(this);

    // Crosshair + HUD text
    this.hud.drawHUD(
      this.hull,
      this.speed,
      this.shieldActive,
      this.aiMode,
      this.aiCooldown,
      this.frame
    );

    // Overlays
    this.hud.drawFog(this.fogAlpha, rnd);
    this.hud.drawFlicker(this.flickerAlpha, rnd);

    ctx.restore();
  }

  // Clean up event listeners when game ends
  destroy() {
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup', this._onKeyUp);

    if (this._stopSplash) {
      this._stopSplash();
    }
  }
}