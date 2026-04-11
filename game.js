import { Ship } from './ship.js';
import { Star } from './Star.js';
import { Asteroid } from './Asteroid.js';
import { Particle } from './Particle.js';
import { AI } from './AI.js';
import { HUD } from './HUD.js';
import { Planet } from './Planet.js';
import { HealthBoost } from './healthboost.js';
import { Minigame } from './Minigame.js';
import { Alien } from './Alien.js';

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
    this.idleTime = 0;

    this.planets = Array.from({ length: 5 }, () => new Planet(rnd));
    this.healthBoosts = Array.from({ length: 4 }, () => new HealthBoost(rnd, true));

    // ── Game state ──────────────────────────────────────────────────────────
    this.alive = true;
    this.frame = 0;
    this.survivalTime = 0;
    this.speed = 0.8;
    this.hull = 100;
    this.temp = 22;
    this.humidity = 45;
    this.oxygen = 100;
    this.radiation = 0;
    this.health = 100;
    this.fogAlpha = 0;
    this.flickerAlpha = 0;
    this.jitter = 0;
    this.shieldActive = 0;
    this.coolActive = 0;
    this.aiCooldown = 0;
    this.radiationFlash = 0;

    this.tempHistory = Array(60).fill(22);
    this.humHistory = Array(60).fill(45);
    this.oxygenHistory = Array(60).fill(100);
    this.radiationHistory = Array(60).fill(0);

    // ── Asteroid hit effects ────────────────────────────────────────────────
    this.burnTimer = 0;
    this.burnStrength = 0;
    this.freezeTimer = 0;
    this.freezeStrength = 0;
    this.effectText = '';
    this.effectTextColor = '#ffffff';
    this.effectTextTimer = 0;

    // ── Alien encounter ─────────────────────────────────────────────────────
    this.aliens = [
      new Alien('friendly'),
      new Alien('mysterious'),
      new Alien('aggressive')
    ];

    this.encounter = {
      active: false,
      alien: null,
      title: '',
      body: '',
      choices: [],
      aiRecommendation: '',
      timer: 0
    };

    // ── Minigame ────────────────────────────────────────────────────────────
    this.minigame = new Minigame();
    this._mouseX = 0;
    this._mouseY = 0;

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

        // ── minigame open shortcuts ─────────────────────────────────────
        if (!this.minigame.active) {
          if (k === 't' && this.temp > 55) {
            this.minigame.start('cool', this.temp);
            if (this.aiMode) this.ai.push('COOLING VENT MINIGAME STARTED — PRESS SPACE', '#ff8822');
          }
          if (k === 'r' && this.hull < 80) {
            this.minigame.start('shield', this.hull);
            if (this.aiMode) this.ai.push('SHIELD MATRIX MINIGAME STARTED — TYPE SEQUENCE', '#4499ff');
          }
          if (k === 'd' && this.humidity > 55) {
            this.minigame.start('fog', this.humidity);
            if (this.aiMode) this.ai.push('DEHUMIDIFIER MINIGAME STARTED — WIPE SCAN LINES', '#00ffcc');
          }
        }

        // ── ESC closes minigame ─────────────────────────────────────────
        if (k === 'escape' && this.minigame.active) {
          this.minigame.close();
        }

        // ── SPACE: minigame first, then normal ──────────────────────────
        if (k === ' ') {
          const handled = this.minigame.onSpace();
          if (!handled && this.aiMode) {
            this.executeAI();
          }
        }

        // ── E: AI execute (only when no minigame) ───────────────────────
        if (k === 'e' && this.aiMode && !this.minigame.active) {
          this.executeAI();
        }

        // ── Encounter choices ───────────────────────────────────────────
        if (this.encounter.active && ['1', '2', '3'].includes(k)) {
          this.resolveEncounter(parseInt(k, 10) - 1);
        }

        // ── shield minigame key input ───────────────────────────────────
        if (this.minigame.active && this.minigame.type === 'shield') {
          this.minigame.onKey(k);
        }
      }

      if (['w', 'a', 's', 'd', 'e', 'r', 't', ' ', 'shift'].includes(k)) {
        e.preventDefault();
      }
    };

    this._onKeyUp = (e) => {
      this.keys[e.key.toLowerCase()] = false;
    };

    this._onMouseMove = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this._mouseX = (e.clientX - rect.left) * (this.canvas.width / rect.width);
      this._mouseY = (e.clientY - rect.top) * (this.canvas.height / rect.height);

      if (this.minigame.active && this.minigame.type === 'fog') {
        const lineIdx = this.minigame.getFogLineAtMouse(
          this._mouseX, this._mouseY, this.W(), this.H()
        );
        if (lineIdx >= 0) this.minigame.wipeLineAtIndex(lineIdx);
      }
    };

    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);
    this.canvas.addEventListener('mousemove', this._onMouseMove);

    // ── Boot message ────────────────────────────────────────────────────────
    if (aiMode) {
      this.ai.push('NEURAL LINK ONLINE — STANDBY', '#00ffcc');
      this.ai.push('T=COOLING  R=SHIELD  D=DEHUMIDIFIER', '#336655');
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  W() { return this.canvas.width; }
  H() { return this.canvas.height; }

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
      if (this.aiMode) this.ai.push('THERMAL STATUS EFFECT — HULL BURNING', '#ff7a2f');
    }
    if (a.hitEffect === 'freeze') {
      this.freezeTimer = Math.max(this.freezeTimer, a.effectDuration || 180);
      this.freezeStrength = Math.max(this.freezeStrength, a.effectStrength || 0.25);
      this.showEffectText('CRYO SLOWDOWN', '#7ec8ff');
      if (this.aiMode) this.ai.push('CRYO STATUS EFFECT — MOVEMENT REDUCED', '#7ec8ff');
    }
  }

  applyStatusEffects(dt) {
    if (this.burnTimer > 0) {
      this.burnTimer = Math.max(0, this.burnTimer - dt);
      const burnDamage = this.burnStrength * 0.05 * dt;
      const burnHeat = this.burnStrength * 0.22 * dt;
      if (this.shieldActive <= 0) this.hull = Math.max(0, this.hull - burnDamage);
      this.temp = Math.min(135, this.temp + burnHeat);
      if (Math.random() < 0.04 * dt) {
        this.particles.push(new Particle(
          this.W() / 2 + rnd(-30, 30), this.H() / 2 + rnd(-30, 30),
          rnd(-1.2, 1.2), rnd(-2.5, -0.5), 18,
          Math.random() < 0.5 ? '#ff5a00' : '#ffb347'
        ));
      }
      if (this.burnTimer === 0) this.burnStrength = 0;
    }

    if (this.freezeTimer > 0) {
      this.freezeTimer = Math.max(0, this.freezeTimer - dt);
      const coolRate = this.freezeStrength * 0.28 * dt;
      this.temp = Math.max(18, this.temp - coolRate);
      this.ship.vx *= 1 - Math.min(0.045, this.freezeStrength * 0.018);
      this.ship.vy *= 1 - Math.min(0.045, this.freezeStrength * 0.018);
      if (Math.random() < 0.03 * dt) {
        this.particles.push(new Particle(
          this.W() / 2 + rnd(-34, 34), this.H() / 2 + rnd(-34, 34),
          rnd(-1.3, 1.3), rnd(-1.4, 0.1), 20,
          Math.random() < 0.5 ? '#8fdcff' : '#d5f3ff'
        ));
      }
      if (this.freezeTimer === 0) this.freezeStrength = 0;
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

  executeAI() {
    const result = this.ai.execute(
      this.temp, this.hull, this.humidity,
      this.oxygen, this.radiation, this.aiCooldown
    );
    if (!result) return;
    this.aiCooldown = result.cooldown;
    if (result.action === 'cool') this.coolActive = 200;
    if (result.action === 'shield') this.shieldActive = 260;
    if (result.action === 'dehumidify') this.humidity = Math.max(28, this.humidity - 28);
    if (result.action === 'oxygen') this.oxygen = Math.min(100, this.oxygen + 26);
    if (result.action === 'radiation') {
      this.radiation = Math.max(0, this.radiation - 24);
      this.radiationFlash = 0.15;
    }
  }

  // ── Alien encounter methods ─────────────────────────────────────────────────

  startEncounter(alien) {
    if (this.encounter.active) return;
    const data = alien.getPromptText();
    this.encounter.active = true;
    this.encounter.alien = alien;
    this.encounter.title = data.title;
    this.encounter.body = data.body;
    this.encounter.choices = data.choices;
    this.encounter.aiRecommendation = this.aiMode ? alien.getAIRecommendation() : '';
    this.encounter.timer = 300;
    if (this.aiMode) {
      this.ai.push(`DECISION EVENT: ${data.title}`, '#bbccff');
      this.ai.push(`RECOMMENDATION: ${this.encounter.aiRecommendation}`, '#99ff66');
    }
  }

  resolveEncounter(choiceIndex) {
    if (!this.encounter.active || !this.encounter.alien) return;
    const choice = this.encounter.choices[choiceIndex];
    const result = this.encounter.alien.resolve(choice);
    const fx = result.effects || {};
    if (fx.hull) this.hull = clamp(this.hull + fx.hull, 0, 100);
    if (fx.oxygen) this.oxygen = clamp(this.oxygen + fx.oxygen, 0, 100);
    if (fx.radiation) this.radiation = clamp(this.radiation + fx.radiation, 0, 100);
    if (fx.health) this.health = clamp(this.health + fx.health, 0, 100);
    if (this.aiMode) {
      this.ai.push(result.message, result.ok ? '#00ffcc' : '#ff6644');
    }
    this._clearEncounter();
  }

  failEncounter() {
    if (!this.encounter.active || !this.encounter.alien) return;
    if (this.encounter.alien.type === 'friendly') {
      this.hull = Math.max(0, this.hull - 10);
    } else if (this.encounter.alien.type === 'mysterious') {
      this.radiation = clamp(this.radiation + 12, 0, 100);
    } else {
      this.hull = Math.max(0, this.hull - 18);
      this.health = Math.max(0, this.health - 10);
    }
    if (this.aiMode) {
      this.ai.push('ENCOUNTER TIMED OUT', '#ff6644');
    }
    this._clearEncounter();
  }

  _clearEncounter() {
    if (this.encounter.alien) this.encounter.alien.reset();
    this.encounter.active = false;
    this.encounter.alien = null;
    this.encounter.title = '';
    this.encounter.body = '';
    this.encounter.choices = [];
    this.encounter.aiRecommendation = '';
    this.encounter.timer = 0;
  }

  _applyMinigameResult(type, success) {
    if (type === 'cool') {
      if (success) {
        this.coolActive = 300;
        this.temp = Math.max(18, this.temp - 30);
        if (this.aiMode) this.ai.push('COOLING VENTS ACTIVE — TEMP DROPPING', '#00ffcc');
      } else {
        this.temp = Math.min(135, this.temp + 8);
        if (this.aiMode) this.ai.push('COOLING ATTEMPT FAILED — TEMP RISING', '#ff4400');
      }
    }
    if (type === 'shield') {
      if (success) {
        this.shieldActive = 320;
        if (this.aiMode) this.ai.push('SHIELD MATRIX ONLINE — HULL PROTECTED', '#4499ff');
      } else {
        if (this.aiMode) this.ai.push('SHIELD CHARGE FAILED — HULL EXPOSED', '#ff4400');
      }
    }
    if (type === 'fog') {
      if (success) {
        this.humidity = Math.max(18, this.humidity - 32);
        if (this.aiMode) this.ai.push('DEHUMIDIFIER COMPLETE — FOG CLEARING', '#00ffcc');
      } else {
        if (this.aiMode) this.ai.push('DEHUMIDIFIER INCOMPLETE', '#ffaa00');
      }
    }
  }

  animateSplash(sc) {
    const sctx = sc.getContext('2d');
    const splashStars = Array.from({ length: 320 }, () => ({
      x: Math.random(), y: Math.random(),
      s: rnd(0.4, 2), b: rnd(0.2, 0.9), t: rnd(0, 6.28)
    }));
    let splashRaf;
    const frame = () => {
      if (document.getElementById('splash').style.display === 'none') return;
      const sw = sc.width, sh = sc.height;
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
    this.radiationFlash = Math.max(0, this.radiationFlash - 0.01 * dt);

    // ── Encounter timer ─────────────────────────────────────────────────────
    if (this.encounter.active) {
      this.encounter.timer = Math.max(0, this.encounter.timer - dt);
      if (this.encounter.timer <= 0) {
        this.failEncounter();
      }
    }

    // ── Minigame update ─────────────────────────────────────────────────────
    const mgWasActive = this.minigame.active;
    const mgType = this.minigame.type;
    const mgResult = this.minigame.result;

    this.minigame.update(dt);

    if (mgWasActive && !this.minigame.active && mgResult) {
      this._applyMinigameResult(mgType, mgResult === 'success');
    }

    // pause ship movement and most physics during minigame
    if (this.minigame.active && !this.minigame.result) {
      this.applyStatusEffects(dt);
      return;
    }

    this.applyStatusEffects(dt);

    this.ship.update(this.keys, dt, clamp, this.W(), this.H());

    const slowFactor = this.freezeTimer > 0
      ? clamp(1 - this.freezeStrength * 0.55, 0.45, 1) : 1;

    const accelerating = this.keys['shift'];
    if (accelerating) this.speed += 0.03 * dt * slowFactor;
    else this.speed -= 0.02 * dt;
    this.speed = Math.max(0, this.speed);

    const moving = this.keys['w'] || this.keys['a'] || this.keys['s'] || this.keys['d'];

    let tgt = 18 + this.speed * 20 + (moving ? 9 : 0);
    if (this.coolActive > 0) tgt = Math.max(18, tgt - 45);
    this.temp += (tgt - this.temp) * 0.002 * dt;
    this.temp = clamp(this.temp, 18, 135);

    if (Math.random() < 0.004 * dt) this.humidity += rnd(-5, 7);
    this.humidity = clamp(this.humidity, 18, 100);
    this.fogAlpha = clamp((this.humidity - 63) / 37, 0, 0.75);

    // ── Oxygen (fixed: no constant drain, zero oxygen hurts health) ─────────
    let oxygenDrain = 0;
    if (moving) oxygenDrain += 0.01 * dt;
    if (this.speed > 1.8) oxygenDrain += 0.012 * dt;
    if (this.temp > 95) oxygenDrain += 0.018 * dt;
    if (this.burnTimer > 0) oxygenDrain += 0.015 * dt;
    oxygenDrain += 0.002 * dt; // tiny passive drain
    this.oxygen = clamp(this.oxygen - oxygenDrain, 0, 100);

    if (this.oxygen <= 0) {
      this.health -= 0.22 * dt;
      this.showEffectText('OXYGEN DEPLETED', '#66ccff');
    }

    // ── Radiation ───────────────────────────────────────────────────────────
    if (Math.random() < 0.0028 * dt) this.radiation += rnd(2, 6);
    if (this.temp > 96) this.radiation += 0.012 * dt;
    if (this.burnTimer > 0) this.radiation += 0.015 * dt;
    this.radiation = clamp(this.radiation - 0.01 * dt, 0, 100);
    if (this.radiation > 70) this.radiationFlash = Math.min(0.22, this.radiationFlash + 0.005 * dt);

    // ── Damage from bad conditions ──────────────────────────────────────────
    if (this.temp > 88 && this.shieldActive <= 0) {
      this.hull -= 0.022 * dt * (this.temp - 88) / 84;
    }
    if (this.oxygen < 22 && this.oxygen > 0) {
      this.health -= 0.05 * dt * (22 - this.oxygen) / 22;
    }
    if (this.radiation > 72) this.health -= 0.04 * dt * (this.radiation - 72) / 28;
    if (this.temp > 108) this.health -= 0.03 * dt;
    this.health = clamp(this.health, 0, 100);

    if (this.hull <= 0) { this.hull = 0; this.alive = false; return; }
    if (this.health <= 0) { this.health = 0; this.alive = false; return; }

    this.tempHistory.push(this.temp);
    if (this.tempHistory.length > 60) this.tempHistory.shift();
    this.humHistory.push(this.humidity);
    if (this.humHistory.length > 60) this.humHistory.shift();
    this.oxygenHistory.push(this.oxygen);
    if (this.oxygenHistory.length > 60) this.oxygenHistory.shift();
    this.radiationHistory.push(this.radiation);
    if (this.radiationHistory.length > 60) this.radiationHistory.shift();

    for (const s of this.stars) s.update(this.speed, dt, rnd);
    for (const p of this.planets) p.update(this.speed, dt, rnd);

    for (const hb of this.healthBoosts) {
      hb.update(this.speed, dt, rnd);
      const p = this.project(hb.x, hb.y, hb.z);
      if (!p || !hb.active) continue;
      const hitR = hb.size * p.scale * 0.95;
      const dx = p.x - this.W() / 2;
      const dy = p.y - this.H() / 2;
      if (
        Math.abs(dx) < hitR + 10 &&
        Math.abs(dy) < hitR + 10 &&
        hb.z < 180 &&
        hb.z > -40
      ) {
        const heal = hb.collect();
        this.hull = Math.min(100, this.hull + heal);
        this.health = Math.min(100, this.health + heal * 0.6);
        for (let i = 0; i < 12; i++) {
          this.particles.push(new Particle(
            this.W() / 2, this.H() / 2, rnd(-4, 4), rnd(-4, 4), 28,
            i % 2 === 0 ? '#7dffbf' : '#d7fff0'
          ));
        }
        this.showEffectText(`+${heal}% HULL`, '#7dffbf');
        if (this.aiMode) this.ai.push(`HEALTH BOOST COLLECTED +${heal}%`, '#7dffbf');
        hb.respawn(rnd);
      }
    }
    const moving =
      this.keys['w'] ||
      this.keys['a'] ||
      this.keys['s'] ||
      this.keys['d'];


    if (moving) {
      this.idleTime = 0;
    } else {
      this.idleTime += dt / 60;
    }


    for (const a of this.asteroids) {
      const asteroidSpeed = this.speed * (1 + this.survivalTime * 0.015);
      const difficultyLevel = Math.floor(this.survivalTime / 30);

      a.update(
        asteroidSpeed,
        dt,
        rnd,
        this.ship.x + this.ship.vx * 10,
        this.ship.y + this.ship.vy * 10,
        this.idleTime,
        difficultyLevel
      );


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

    // ── Alien update + trigger ──────────────────────────────────────────────
    for (const alien of this.aliens) {
      alien.update(this.speed, dt);

      if (this.encounter.active) continue;

      const p = this.project(alien.x, alien.y, alien.z);
      if (!p) continue;

      const hitR = alien.size * p.scale * 0.5;
      const dx = p.x - this.W() / 2;
      const dy = p.y - this.H() / 2;

      if (
        Math.abs(dx) < hitR + 16 &&
        Math.abs(dy) < hitR + 16 &&
        alien.z < 360 &&
        alien.z > 120
      ) {
        this.startEncounter(alien);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update();
      if (this.particles[i].dead) this.particles.splice(i, 1);
    }

    if (this.flickerAlpha > 0) this.flickerAlpha -= 0.035 * dt;
    if (Math.random() < 0.002 * dt) this.flickerAlpha = rnd(0.2, 0.55);

    if (this.aiMode) {
      this.ai.update(
        dt, this.frame, this.temp, this.hull, this.humidity,
        this.oxygen, this.radiation, this.aiCooldown, this.encounter.active
      );
    }
  }

  _handleCollision(a, p) {
    if (this.shieldActive > 0) {
      this.ai.push('SHIELD ABSORBED IMPACT', '#00ccff');
      for (let i = 0; i < 9; i++) {
        this.particles.push(new Particle(p.x, p.y, rnd(-3, 3), rnd(-3, 3), 35, '#0088ff'));
      }
      a.z = rnd(1500, 2200);
      a.x = rnd(-1700, 1700);
    } else {
      const dmg = (7 + a.size * 0.28) * (this.speed + 18) / 25;
      this.hull = Math.max(0, this.hull - dmg);
      this.jitter = 15;
      this.applyAsteroidEffect(a);
      this.oxygen = Math.max(0, this.oxygen - rnd(1, 4));
      this.radiation = clamp(this.radiation + rnd(0.5, 2.5), 0, 100);

      for (let i = 0; i < 14; i++) {
        let particleCol = i % 2 === 0 ? '#ff4400' : '#ff8800';
        if (a.hitEffect === 'freeze') particleCol = i % 2 === 0 ? '#8fdcff' : '#d5f3ff';
        this.particles.push(new Particle(
          this.W() / 2, this.H() / 2, rnd(-6, 6), rnd(-6, 6), 44, particleCol
        ));
      }

      a.z = rnd(1600, 2400);
      a.x = rnd(-1700, 1700);

      if (this.aiMode) {
        if (a.hitEffect === 'burn') {
          this.ai.push(`BURN EFFECT ACTIVE: ${Math.round(this.hull)}% HULL`, '#ff7a2f');
        } else if (a.hitEffect === 'freeze') {
          this.ai.push(`CRYO EFFECT ACTIVE: ${Math.round(this.hull)}% HULL`, '#7ec8ff');
        } else {
          this.ai.push(`HULL BREACH: ${Math.round(this.hull)}% — PRESS R FOR SHIELD`, '#ff4400');
        }
      }

      if (this.hull <= 0) { this.hull = 0; this.alive = false; }
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

    for (const s of this.stars) s.draw(ctx, this.project.bind(this), this.speed, w, h);
    for (const p of this.planets) p.draw(ctx, this.project.bind(this));
    for (const hb of this.healthBoosts) hb.draw(ctx, this.project.bind(this), clamp);

    [...this.asteroids]
      .sort((a, b) => b.z - a.z)
      .forEach(a => a.draw(ctx, this.project.bind(this), clamp));

    // ── Draw aliens (behind cockpit frame) ──────────────────────────────────
    [...this.aliens]
      .sort((a, b) => b.z - a.z)
      .forEach(a => a.draw(ctx, this.project.bind(this)));

    this.hud.drawCockpit();
    for (const p of this.particles) p.draw(ctx);
    this.hud.drawMFDs(this);
    this.hud.drawHUD(this.hull, this.speed, this.shieldActive, this.aiMode, this.aiCooldown, this.frame);
    this.hud.drawVitals(this);

    // ── Draw encounter popup ────────────────────────────────────────────────
    this.hud.drawEncounter(this.encounter, this.frame);

    this.hud.drawFog(this.fogAlpha, rnd);
    this.hud.drawFlicker(this.flickerAlpha, rnd);
    this.hud.drawRadiationOverlay(this.radiation / 100 + this.radiationFlash, rnd);
    this.drawStatusEffectOverlays();

    // ── Minigame overlay ────────────────────────────────────────────────────
    this.minigame.draw(ctx, w, h, this.frame);

    // ── Minigame keybind hints ──────────────────────────────────────────────
    if (!this.minigame.active) {
      this._drawMinigameHints(ctx, w, h);
    }

    ctx.restore();
  }

  _drawMinigameHints(ctx, w, h) {
    const fs = Math.round(h * 0.014);
    const y = h * 0.96;
    const hints = [];

    if (this.temp > 55) hints.push({ key: 'T', label: 'COOLING', col: '#ff8822', urgent: this.temp > 90 });
    if (this.hull < 80) hints.push({ key: 'R', label: 'SHIELD', col: '#4499ff', urgent: this.hull < 40 });
    if (this.humidity > 55) hints.push({ key: 'D', label: 'DEHUM', col: '#00ffcc', urgent: this.humidity > 80 });

    const totalW = hints.length * 110;
    let x = (w - totalW) / 2;

    for (const h2 of hints) {
      const flash = h2.urgent && this.frame % 20 < 10;
      ctx.fillStyle = flash ? h2.col : 'rgba(255,255,255,0.18)';
      ctx.font = `${fs}px 'Courier New'`;
      ctx.fillText(`[${h2.key}] ${h2.label}`, x, y);
      x += 110;
    }
  }

  destroy() {
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup', this._onKeyUp);
    this.canvas.removeEventListener('mousemove', this._onMouseMove);
    if (this._stopSplash) this._stopSplash();
  }
}