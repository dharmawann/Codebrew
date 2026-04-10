export class Planet {
  constructor(rnd, dangerous = false) {
    this.dangerous = dangerous;
    this.reset(rnd, true);
  }

  reset(rnd, initial = false) {
    this.x = rnd(-2200, 2200);
    this.y = rnd(-1300, 1300);

    if (this.dangerous) {
      this.z = initial ? rnd(1800, 3200) : rnd(2400, 3600);
      this.radius = rnd(45, 120);
      this.vz = rnd(-2.4, -1.1);
    } else {
      this.z = initial ? rnd(2200, 4600) : rnd(3200, 5000);
      this.radius = rnd(120, 320);
      this.vz = rnd(-0.18, -0.05);
    }

    const palettes = [
      { base: '#6fa8dc', glow: 'rgba(120,180,255,0.18)' },
      { base: '#d9a066', glow: 'rgba(255,180,90,0.16)' },
      { base: '#8f7cff', glow: 'rgba(170,150,255,0.18)' },
      { base: '#c96b5c', glow: 'rgba(255,120,100,0.15)' }
    ];

    const pick = palettes[Math.floor(rnd(0, palettes.length))];
    this.color = pick.base;
    this.glow = pick.glow;
    this.ring = !this.dangerous && Math.random() < 0.35;

    this.rot = rnd(0, 6.28);
    this.rotV = rnd(-0.01, 0.01);
  }

  update(speed, dt, rnd) {
    const multiplier = this.dangerous ? 0.75 : 0.18;
    this.z += this.vz * speed * multiplier * dt;
    this.rot += this.rotV * dt;

    if (this.z < -200) {
      this.reset(rnd, false);
    }
  }

  draw(ctx, projection) {
    const p = projection(this.x, this.y, this.z);
    if (!p) return;

    const W = ctx.canvas.width;
    const H = ctx.canvas.height;
    if (p.x < -500 || p.x > W + 500 || p.y < -500 || p.y > H + 500) return;

    const r = this.radius * p.scale;
    if (r < 6) return;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(this.rot);

    ctx.fillStyle = this.glow;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.35, 0, 6.28);
    ctx.fill();

    const grad = ctx.createRadialGradient(-r * 0.28, -r * 0.28, r * 0.15, 0, 0, r);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.15, this.color);
    grad.addColorStop(1, '#111822');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, 6.28);
    ctx.fill();

    if (this.ring) {
      ctx.strokeStyle = 'rgba(230,230,255,0.28)';
      ctx.lineWidth = Math.max(1, r * 0.08);
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.55, r * 0.55, 0, 0, 6.28);
      ctx.stroke();
    }

    if (this.dangerous && this.z < 900) {
      ctx.strokeStyle = `rgba(255,120,0,${Math.max(0, 1 - this.z / 900) * 0.55})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.2, 0, 6.28);
      ctx.stroke();
    }

    ctx.restore();
  }
}