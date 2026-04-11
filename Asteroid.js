export class Asteroid {
  constructor(rnd, spread = false) {
    this.setup(rnd, spread);
  }


  setup(rnd, spread = false) {
    this.x = rnd(-1900, 1900);
    this.y = rnd(-1100, 1100);
    this.z = spread ? rnd(400, 2600) : rnd(1600, 2600);


    const variants = [
      'heavy',
      'drift',
      'fast',
      'ember',
      'charged'
    ];


    this.variant = variants[Math.floor(rnd(0, variants.length))];
    this.clusterHint = Math.random() < 0.18;


    this.hitEffect = null;
    this.effectDuration = 0;
    this.effectStrength = 0;
    this.effectOverlay = null;


    if (this.variant === 'heavy') {
      this.vx = rnd(-0.22, 0.22);
      this.vy = rnd(-0.15, 0.15);
      this.vz = rnd(-2.8, -1.4);
      this.size = rnd(34, 76);
      this.damageMult = 1.35;
      this.tempImpact = 0;
      this.electricImpact = 0;
      this.trail = false;
      this.color = `hsl(${rnd(20, 34)},${rnd(14, 28)}%,${rnd(20, 34)}%)`;
    } else if (this.variant === 'drift') {
      this.vx = rnd(-0.9, 0.9);
      this.vy = rnd(-0.55, 0.55);
      this.vz = rnd(-4.4, -2.2);
      this.size = rnd(16, 42);
      this.damageMult = 1;
      this.tempImpact = 0;
      this.electricImpact = 0;
      this.trail = false;
      this.color = `hsl(${rnd(18, 42)},${rnd(10, 24)}%,${rnd(18, 36)}%)`;
    } else if (this.variant === 'fast') {
      this.vx = rnd(-0.5, 0.5);
      this.vy = rnd(-0.38, 0.38);
      this.vz = rnd(-8.5, -5.6);
      this.size = rnd(10, 24);
      this.damageMult = 0.92;
      this.tempImpact = 0;
      this.electricImpact = 0;
      this.trail = true;
      this.color = `hsl(${rnd(18, 40)},${rnd(12, 26)}%,${rnd(22, 36)}%)`;
    } else if (this.variant === 'ember') {
      this.vx = rnd(-0.42, 0.42);
      this.vy = rnd(-0.32, 0.32);
      this.vz = rnd(-6.2, -3.6);
      this.size = rnd(14, 34);
      this.damageMult = 1.08;
      this.tempImpact = rnd(4, 9);
      this.electricImpact = 0;
      this.trail = true;
      this.color = `hsl(${rnd(8, 18)},${rnd(68, 88)}%,${rnd(42, 58)}%)`;


      this.hitEffect = 'burn';
      this.effectDuration = Math.floor(rnd(180, 260));
      this.effectStrength = rnd(0.08, 0.14);
      this.effectOverlay = 'rgba(255,90,0,0.22)';
    } else {
      this.vx = rnd(-0.52, 0.52);
      this.vy = rnd(-0.36, 0.36);
      this.vz = rnd(-5.8, -3.4);
      this.size = rnd(12, 30);
      this.damageMult = 1;
      this.tempImpact = 0;
      this.electricImpact = rnd(4, 8);
      this.trail = false;
      this.color = `hsl(${rnd(225, 255)},${rnd(44, 70)}%,${rnd(44, 62)}%)`;


      this.hitEffect = 'freeze';
      this.effectDuration = Math.floor(rnd(160, 240));
      this.effectStrength = rnd(0.22, 0.34);
      this.effectOverlay = 'rgba(120,190,255,0.20)';
    }


    this.rot = rnd(0, 6.28);
    this.rotV = rnd(-0.06, 0.06);
    this.pts = Math.floor(rnd(6, 11));
    this.nearMissed = false;
  }


  reset(rnd) {
    this.setup(rnd, false);
    this.z = rnd(1600, 2600);
  }


  update(
    speed,
    dt,
    rnd,
    shipX = 0,
    shipY = 0,
    idleSeconds = 0,
    difficultyLevel = 0
  ) {
    const dx = shipX - this.x;
    const dy = shipY - this.y;


    let tracking = 0.0048;


    if (this.variant === 'drift') tracking = 0.0062;
    if (this.variant === 'fast') tracking = 0.0058;
    if (this.variant === 'heavy') tracking = 0.0032;
    if (this.variant === 'charged') tracking = 0.0056;
    if (this.variant === 'ember') tracking = 0.0052;


    const depthBoost = this.z < 1500 ? 1.5 : 1;
    const closeBoost = this.z < 900 ? 1.35 : 1;


    // difficulty increases every 30 seconds
    const difficultyBoost = 1 + difficultyLevel * 0.14;


    // if player is idle for 10+ seconds, asteroids aggressively track
    const idleBoost = idleSeconds >= 10 ? 2.15 : 1;


    const steer = tracking * depthBoost * closeBoost * difficultyBoost * idleBoost * dt;


    this.vx += dx * steer * 0.025;
    this.vy += dy * steer * 0.025;


    const maxVX = 1.8 + difficultyLevel * 0.16;
    const maxVY = 1.2 + difficultyLevel * 0.1;


    this.vx = Math.max(-maxVX, Math.min(maxVX, this.vx));
    this.vy = Math.max(-maxVY, Math.min(maxVY, this.vy));


    // increase forward pressure with difficulty
    const forwardBoost = 1 + difficultyLevel * 0.08;


    this.z += this.vz * speed * forwardBoost * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rot += this.rotV * (1 + difficultyLevel * 0.05) * dt;


    if (this.z < -120) this.reset(rnd);
  }


  draw(ctx, projection, clamp) {
    const p = projection(this.x, this.y, this.z);
    if (!p) return;


    const W = ctx.canvas.width;
    const H = ctx.canvas.height;
    if (p.x < -250 || p.x > W + 250 || p.y < -250 || p.y > H + 250) return;


    const sz = Math.max(1, this.size * p.scale);
    const fade = clamp(this.z < 350 ? this.z / 350 : 1, 0, 1);


    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(this.rot);
    ctx.globalAlpha = fade;


    if (this.trail && this.z < 900) {
      const trailAlpha = Math.max(0, 1 - this.z / 900) * 0.3;
      ctx.fillStyle = this.variant === 'ember'
        ? `rgba(255,120,40,${trailAlpha})`
        : `rgba(255,255,255,${trailAlpha * 0.7})`;
      ctx.beginPath();
      ctx.ellipse(-sz * 1.3, 0, sz * 1.8, sz * 0.55, 0, 0, 6.28);
      ctx.fill();
    }


    ctx.fillStyle = this.color;
    ctx.beginPath();
    for (let i = 0; i < this.pts; i++) {
      const ang = i / this.pts * 6.28;
      const wobble = this.variant === 'charged'
        ? Math.sin(ang * 2.3 + this.rot * 1.4)
        : Math.sin(ang * 1.8 + this.rot);
      const r = sz * (0.58 + 0.42 * wobble);
      if (i === 0) ctx.moveTo(Math.cos(ang) * r, Math.sin(ang) * r);
      else ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
    }
    ctx.closePath();
    ctx.fill();


    ctx.strokeStyle = this.variant === 'charged'
      ? 'rgba(170,200,255,0.5)'
      : 'rgba(90,65,45,.4)';
    ctx.lineWidth = 0.8;
    ctx.stroke();


    if (this.variant === 'ember') {
      ctx.strokeStyle = `rgba(255,90,0,${(1 - Math.min(this.z, 700) / 700) * 0.65})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, sz * 1.45, 0, 6.28);
      ctx.stroke();
    }


    if (this.variant === 'charged') {
      ctx.strokeStyle = `rgba(120,180,255,${(1 - Math.min(this.z, 800) / 800) * 0.6})`;
      ctx.lineWidth = 1.6;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, sz * (1.18 + i * 0.16), 0, 6.28);
        ctx.stroke();
      }
    }


    if (this.variant === 'fast' && this.z < 620) {
      ctx.strokeStyle = `rgba(255,255,255,${(1 - this.z / 620) * 0.35})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, sz * 1.3, 0, 6.28);
      ctx.stroke();
    }


    if (this.z < 420) {
      ctx.strokeStyle = `rgba(255,110,0,${(1 - this.z / 420) * 0.65})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, sz * 1.35, 0, 6.28);
      ctx.stroke();
    }


    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

