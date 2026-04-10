const images = {
    friendly: new Image(),
    mysterious: new Image(),
    aggressive: new Image()
  };
  
  images.friendly.src = './Assets/friendly.png';
  images.mysterious.src = './Assets/mysterious.png';
  images.aggressive.src = './Assets/aggressive.png';
  
function rnd(a, b) {
    return a + Math.random() * (b - a);
  }
  
  export class Alien {
    constructor(type = 'friendly') {
      this.type = type;
      this.reset();
    }
  
    reset() {
      this.x = rnd(-900, 900);
      this.y = rnd(-520, 520);
      this.z = rnd(1800, 2800);
      this.vx = rnd(-0.3, 0.3);
      this.vy = rnd(-0.2, 0.2);
      this.size =
        this.type === 'aggressive' ? rnd(85, 115) :
        this.type === 'mysterious' ? rnd(75, 100) :
        rnd(70, 95);
  
      this.phase = rnd(0, Math.PI * 2);
      this.resolved = false;
    }
  
    update(speed, dt) {
      this.z -= speed * 18 * dt;
      this.phase += 0.03 * dt;
  
      if (this.type === 'friendly') {
        this.x += this.vx * dt + Math.sin(this.phase) * 0.35;
        this.y += this.vy * dt + Math.cos(this.phase) * 0.2;
      } else if (this.type === 'mysterious') {
        this.x += this.vx * dt + Math.sin(this.phase * 1.7) * 0.55;
        this.y += this.vy * dt + Math.cos(this.phase * 1.3) * 0.45;
      } else {
        this.x += this.vx * dt + Math.sin(this.phase * 2.2) * 0.75;
        this.y += this.vy * dt + Math.cos(this.phase * 1.8) * 0.55;
        this.z -= 0.35 * dt;
      }
  
      if (this.z < -100) {
        this.reset();
      }
    }
  
    draw(ctx, project) {
        const p = project(this.x, this.y, this.z);
        if (!p) return;
      
        const img = images[this.type];
        if (!img.complete || img.naturalWidth === 0) return;
      
        const size = Math.max(45, this.size * p.scale);
      
        ctx.save();
        ctx.globalAlpha = 0.98;
      
        let glow = '#66ffee';
        if (this.type === 'mysterious') glow = '#d07cff';
        if (this.type === 'aggressive') glow = '#ff5a78';
      
        ctx.shadowBlur = size * 0.25;
        ctx.shadowColor = glow;
      
        ctx.drawImage(
          img,
          p.x - size / 2,
          p.y - size / 2,
          size,
          size
        );
      
        ctx.restore();
      }
  
    getPromptText() {
      if (this.type === 'friendly') {
        return {
          title: 'FRIENDLY ALIEN DETECTED',
          body: 'Passive lifeform. No hostile signatures.',
          choices: ['ATTACK', 'LEAVE', 'SIGNAL']
        };
      }
  
      if (this.type === 'mysterious') {
        return {
          title: 'MYSTERIOUS ALIEN DETECTED',
          body: 'Unknown intent. Readings unstable.',
          choices: ['SCAN', 'IGNORE', 'ATTACK']
        };
      }
  
      return {
        title: 'AGGRESSIVE ALIEN DETECTED',
        body: 'Hostile target closing fast.',
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
          return { ok: true, message: 'Friendly alien drifted away.', effects: { oxygen: 8 } };
        }
        if (choice === 'SIGNAL') {
          return { ok: true, message: 'Peaceful contact made.', effects: { oxygen: 4, radiation: -4 } };
        }
        return { ok: false, message: 'You attacked a peaceful alien.', effects: { hull: -18, health: -10 } };
      }
  
      if (this.type === 'mysterious') {
        if (choice === 'SCAN') {
          if (Math.random() < 0.65) {
            return { ok: true, message: 'Scan succeeded. Entity vanished.', effects: { radiation: -8 } };
          }
          return { ok: false, message: 'Scan triggered an unstable burst.', effects: { radiation: 16, health: -8 } };
        }
        if (choice === 'IGNORE') {
          return { ok: true, message: 'You ignored it. It disappeared.', effects: {} };
        }
        return { ok: false, message: 'The alien retaliated.', effects: { hull: -14 } };
      }
  
      if (choice === 'ATTACK') {
        return { ok: true, message: 'Hostile alien neutralized.', effects: {} };
      }
      if (choice === 'SHIELD') {
        return { ok: true, message: 'Shield absorbed the strike.', effects: { radiation: 4 } };
      }
      return { ok: false, message: 'Evasion failed.', effects: { hull: -20, health: -10 } };
    }
  }