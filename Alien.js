function rnd(a, b) {
    return a + Math.random() * (b - a);
  }
  
  export class Alien {
    constructor(rndFn) {
      this.rnd = rndFn || rnd;
  
      this.type = this._pickType();
      this.x = this.rnd(-1400, 1400);
      this.y = this.rnd(-900, 900);
      this.z = this.rnd(1400, 2600);
  
      this.size = this.type === 'aggressive' ? this.rnd(70, 110)
                : this.type === 'mysterious' ? this.rnd(60, 95)
                : this.rnd(55, 85);
  
      this.vx = this.rnd(-0.25, 0.25);
      this.vy = this.rnd(-0.2, 0.2);
      this.phase = this.rnd(0, Math.PI * 2);
  
      this.scanned = false;
      this.resolved = false;
    }
  
    _pickType() {
      const roll = Math.random();
      if (roll < 0.34) return 'friendly';
      if (roll < 0.68) return 'mysterious';
      return 'aggressive';
    }
  
    reset() {
      this.type = this._pickType();
      this.x = this.rnd(-1400, 1400);
      this.y = this.rnd(-900, 900);
      this.z = this.rnd(1800, 2800);
      this.size = this.type === 'aggressive' ? this.rnd(70, 110)
                : this.type === 'mysterious' ? this.rnd(60, 95)
                : this.rnd(55, 85);
      this.vx = this.rnd(-0.25, 0.25);
      this.vy = this.rnd(-0.2, 0.2);
      this.phase = this.rnd(0, Math.PI * 2);
      this.scanned = false;
      this.resolved = false;
    }
  
    update(speed, dt, survivalTime) {
      this.z -= speed * 16 * dt;
  
      this.phase += 0.02 * dt;
  
      if (this.type === 'friendly') {
        this.x += this.vx * dt + Math.sin(this.phase) * 0.25;
        this.y += this.vy * dt + Math.cos(this.phase) * 0.18;
      } else if (this.type === 'mysterious') {
        this.x += this.vx * dt + Math.sin(this.phase * 1.7) * 0.55;
        this.y += this.vy * dt + Math.cos(this.phase * 1.3) * 0.45;
      } else {
        this.x += this.vx * dt + Math.sin(this.phase * 2.2) * 0.7;
        this.y += this.vy * dt + Math.cos(this.phase * 1.9) * 0.55;
        this.z -= survivalTime * 0.004 * dt;
      }
  
      if (this.z < -100) {
        this.reset();
      }
    }
  
    draw(ctx, project) {
      const p = project(this.x, this.y, this.z);
      if (!p) return;
  
      const r = Math.max(6, this.size * p.scale * 0.18);
  
      let glow = '#00ffaa';
      let core = '#66ffee';
  
      if (this.type === 'mysterious') {
        glow = '#bb66ff';
        core = '#f0a0ff';
      }
  
      if (this.type === 'aggressive') {
        glow = '#ff3355';
        core = '#ff9aa8';
      }
  
      ctx.save();
      ctx.globalAlpha = 0.9;
  
      ctx.shadowBlur = r * 2.4;
      ctx.shadowColor = glow;
  
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
  
      ctx.shadowBlur = 0;
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 0.48, 0, Math.PI * 2);
      ctx.fill();
  
      if (this.type === 'mysterious') {
        ctx.strokeStyle = 'rgba(220,160,255,0.75)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 1.45, 0, Math.PI * 2);
        ctx.stroke();
      }
  
      if (this.type === 'aggressive') {
        ctx.strokeStyle = 'rgba(255,70,90,0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.x - r * 1.5, p.y);
        ctx.lineTo(p.x + r * 1.5, p.y);
        ctx.moveTo(p.x, p.y - r * 1.5);
        ctx.lineTo(p.x, p.y + r * 1.5);
        ctx.stroke();
      }
  
      ctx.restore();
    }
  
    getPromptText() {
      if (this.type === 'friendly') {
        return {
          title: 'FRIENDLY ALIEN DETECTED',
          body: 'Passive lifeform. Non-hostile movement pattern.',
          choices: ['ATTACK', 'LEAVE', 'SIGNAL']
        };
      }
  
      if (this.type === 'mysterious') {
        return {
          title: 'MYSTERIOUS ALIEN DETECTED',
          body: 'Unknown intent. Readings unstable. Decision required.',
          choices: ['SCAN', 'IGNORE', 'ATTACK']
        };
      }
  
      return {
        title: 'AGGRESSIVE ALIEN DETECTED',
        body: 'Hostile target closing fast. Immediate action advised.',
        choices: ['ATTACK', 'SHIELD', 'EVADE']
      };
    }
  
    getAIRecommendation() {
      if (this.type === 'friendly') return 'LEAVE';
      if (this.type === 'mysterious') return 'SCAN';
      return 'ATTACK';
    }
  
    resolve(choice) {
      if (this.type === 'friendly') {
        if (choice === 'LEAVE') {
          return {
            ok: true,
            message: 'Friendly alien allowed to pass.',
            effects: { score: 1, oxygen: 3 }
          };
        }
        if (choice === 'SIGNAL') {
          return {
            ok: true,
            message: 'Alien responded peacefully and drifted away.',
            effects: { oxygen: 2, radiation: -4 }
          };
        }
        return {
          ok: false,
          message: 'You attacked a peaceful alien. Retaliation hit the hull.',
          effects: { hull: -18, radiation: 8 }
        };
      }
  
      if (this.type === 'mysterious') {
        if (choice === 'SCAN') {
          const good = Math.random() < 0.65;
          if (good) {
            return {
              ok: true,
              message: 'Scan successful. Safe route data acquired.',
              effects: { oxygen: 4, radiation: -6 }
            };
          }
          return {
            ok: false,
            message: 'Scan triggered an unstable pulse.',
            effects: { hull: -10, radiation: 14 }
          };
        }
  
        if (choice === 'IGNORE') {
          return {
            ok: true,
            message: 'You ignored it. It vanished into deep space.',
            effects: { }
          };
        }
  
        return {
          ok: false,
          message: 'The target reacted violently to aggression.',
          effects: { hull: -15, radiation: 10 }
        };
      }
  
      if (choice === 'ATTACK') {
        return {
          ok: true,
          message: 'Aggressive alien neutralized.',
          effects: { oxygen: -2 }
        };
      }
  
      if (choice === 'SHIELD') {
        return {
          ok: true,
          message: 'Shield absorbed the incoming strike.',
          effects: { radiation: 4, oxygen: -1 }
        };
      }
  
      return {
        ok: false,
        message: 'Evasion failed. Direct impact sustained.',
        effects: { hull: -20, health: -10 }
      };
    }
  }