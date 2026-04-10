import { Ship } from './ship.js';
import { Star } from './Star.js';
import { Asteroid } from './Asteroid.js';
import { Particle } from './Particle.js';
import { AI } from './AI.js';
import { HUD } from './HUD.js';
import { Planet } from './Planet.js';

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

    // ── Asteroid hit effects ────────────────────────────────────────────────
    this.burnTimer = 0;
    this.burnStrength = 0;
    this.freezeTimer = 0;
    this.freezeStrength = 0;
    this.effectText = '';
    this.effectTextColor = '#ffffff';
    this.effectTextTimer = 0;

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

  showEffectText(msg, col) {
    this.effectText = msg;
    this.effectTextColor = col;
    this.effectTextTimer = 95;
  }

  applyAsteroidEffect(a) {
    if (!a.hitEffect) return;

    if (a.hitEffect === 'burn') {
      this.burnTimer = Math.max(this.burnTimer, a.effectDuration || 200);
      this.burnStrength = Math.max(this.burnStrength, a.effectStrength || 0.1);
      this.showEffectText('BURNING IMPACT', '#ff7a2f');

      if (this.aiMode) {
        this.ai.push('THERMAL STATUS EFFECT — HULL BURNING', '#ff7a2f');
      }
    }

    if (a.hitEffect === 'freeze') {
      this.freezeTimer = Math.max(this.freezeTimer, a.effectDuration || 180);
      this.freezeStrength = Math.max(this.freezeStrength, a.effectStrength || 0.25);
      this.showEffectText('CRYO SLOWDOWN', '#7ec8ff');

      if (this.aiMode) {
        this.ai.push('CRYO STATUS EFFECT — MOVEMENT REDUCED', '#7ec8ff');
      }
    }
  }

  applyStatusEffects(dt) {
    if (this.burnTimer > 0) {
      this.burnTimer = Math.max(0, this.burnTimer - dt);

      const burnDamage = this.burnStrength * 0.05 * dt;
      const burnHeat = this.burnStrength * 0.22 * dt;

      if (this.shieldActive <= 0) {
        this.hull = Math.max(0, this.hull - burnDamage);
      }

      this.temp = Math.min(135, this.temp + burnHeat);

      if (Math.random() < 0.04 * dt) {
        this.particles.push(
          new Particle(
            this.W() / 2 + rnd(-30, 30),
            this.H() / 2 + rnd(-30, 30),
            rnd(-1.2, 1.2),
            rnd(-2.5, -0.5),
            18,
            Math.random() < 0.5 ? '#ff5a00' : '#ffb347'
          )
        );
      }

      if (this.burnTimer === 0) {
        this.burnStrength = 0;
      }
    }

    if (this.freezeTimer > 0) {
      this.freezeTimer = Math.max(0, this.freezeTimer - dt);

      const coolRate = this.freezeStrength * 0.28 * dt;
      this.temp = Math.max(18, this.temp - coolRate);

      this.ship.vx *= 1 - Math.min(0.045, this.freezeStrength * 0.018);
      this.ship.vy *= 1 - Math.min(0.045, this.freezeStrength * 0.018);

      if (Math.random() < 0.03 * dt) {
        this.particles.push(
          new Particle(
            this.W() / 2 + rnd(-34, 34),
            this.H() / 2 + rnd(-34, 34),
            rnd(-1.3, 1.3),
            rnd(-1.4, 0.1),
            20,
            Math.random() < 0.5 ? '#8fdcff' : '#d5f3ff'
          )
        );
      }

      if (this.freezeTimer === 0) {
        this.freezeStrength = 0;
      }
    }

    this.effectTextTimer = Math.max(0, this.effectTextTimer - dt);
  }

  drawStatusEffectOverlays() {
    const ctx = this.ctx;
    const w = this.W();
    const h = this.H();

    if (this.burnTimer > 0) {
      const alpha = 0.08 + 0.08 * Math.sin(this.frame * 0.18);
      ctx.fillStyle = `rgba(255,80,10,${alpha})`;
      ctx.fillRect(0, 0, w, h);

      for (let i = 0; i < 4; i++) {
        const y = h * (0.18 + i * 0.17) + Math.sin(this.frame * 0.08 + i) * 8;
        ctx.fillStyle = `rgba(255,160,60,${0.035 + i * 0.01})`;
        ctx.fillRect(0, y, w, 8);
      }
    }

    if (this.freezeTimer > 0) {
      const alpha = 0.07 + 0.05 * Math.sin(this.frame * 0.12);
      ctx.fillStyle = `rgba(120,190,255,${alpha})`;
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(210,240,255,0.18)';
      ctx.lineWidth = 2;

      for (let i = 0; i < 6; i++) {
        const x = (w / 6) * i + Math.sin(this.frame * 0.03 + i) * 8;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x - 18, h * 0.12);
        ctx.lineTo(x + 10, h * 0.22);
        ctx.stroke();
      }
    }

    if (this.effectTextTimer > 0 && this.effectText) {
      ctx.fillStyle = this.effectTextColor;
      ctx.font = `bold ${Math.max(18, Math.round(h * 0.03))}px 'Courier New'`;
      ctx.textAlign = 'center';
      ctx.globalAlpha = Math.min(1, this.effectTextTimer / 25);
      ctx.fillText(this.effectText, w / 2, h * 0.16);
      ctx.globalAlpha = 1;
      ctx.textAlign = 'left';
    }
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

    this.applyStatusEffects(dt);

    // Ship
    this.ship.update(this.keys, dt, clamp, this.W(), this.H());

    // Freeze slowdown on overall speed feel
    const slowFactor = this.freezeTimer > 0
      ? clamp(1 - this.freezeStrength * 0.55, 0.45, 1)
      : 1;

    // Speed ramp
    const accelerating = this.keys['shift'];

    if (accelerating) {
      this.speed += 0.03 * dt * slowFactor;
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

    this.temp += (tgt - this.temp) * 0.002 * dt;
    this.temp = clamp(this.temp, 18, 135);

    // Humidity + fog
    if (Math.random() < 0.004 * dt) {
      this.humidity += rnd(-5, 7);
    }

    this.humidity = clamp(this.humidity, 18, 100);
    this.fogAlpha = clamp((this.humidity - 63) / 37, 0, 0.75);

    // Hull heat decay
    if (this.temp > 88 && this.shieldActive <= 0) {
      this.hull -= 0.022 * dt * (this.temp - 88) / 84;
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

      a.update(
        asteroidSpeed,
        dt,
        rnd,
        this.ship.x + this.ship.vx * 10,
        this.ship.y + this.ship.vy * 10
      );

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

      this.applyAsteroidEffect(a);

      for (let i = 0; i < 14; i++) {
        let particleCol = i % 2 === 0 ? '#ff4400' : '#ff8800';

        if (a.hitEffect === 'freeze') {
          particleCol = i % 2 === 0 ? '#8fdcff' : '#d5f3ff';
        }

        this.particles.push(
          new Particle(
            this.W() / 2,
            this.H() / 2,
            rnd(-6, 6),
            rnd(-6, 6),
            44,
            particleCol
          )
        );
      }

      a.z = rnd(1600, 2400);
      a.x = rnd(-1700, 1700);

      if (this.aiMode) {
        if (a.hitEffect === 'burn') {
          this.ai.push(
            `BURN EFFECT ACTIVE: ${Math.round(this.hull)}% HULL`,
            '#ff7a2f'
          );
        } else if (a.hitEffect === 'freeze') {
          this.ai.push(
            `CRYO EFFECT ACTIVE: ${Math.round(this.hull)}% HULL`,
            '#7ec8ff'
          );
        } else {
          this.ai.push(
            `HULL BREACH: ${Math.round(this.hull)}% — PRESS E FOR SHIELD`,
            '#ff4400'
          );
        }
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
    this.drawStatusEffectOverlays();

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