export class Asteroid {
  constructor(rnd, spread = false) {
    this.setup(rnd, spread);
  }

  setup(rnd, spread = false) {
    this.x = rnd(-1900, 1900);
    this.y = rnd(-1100, 1100);
    this.z = spread ? rnd(400, 2600) : rnd(1600, 2600);

    this.type = Math.floor(rnd(0, 3));

    if (this.type === 0) {
      this.vx = rnd(-0.25, 0.25);
      this.vy = rnd(-0.18, 0.18);
      this.vz = rnd(-2.4, -1.2);
      this.size = rnd(28, 68);
    } else if (this.type === 1) {
      this.vx = rnd(-0.45, 0.45);
      this.vy = rnd(-0.35, 0.35);
      this.vz = rnd(-5.4, -2.8);
      this.size = rnd(14, 42);
    } else {
      this.vx = rnd(-0.7, 0.7);
      this.vy = rnd(-0.45, 0.45);
      this.vz = rnd(-8.2, -5.2);
      this.size = rnd(10, 26);
    }

    this.rot = rnd(0, 6.28);
    this.rotV = rnd(-0.06, 0.06);
    this.color = `hsl(${rnd(15,42)},${rnd(10,26)}%,${rnd(18,38)}%)`;
    this.pts = Math.floor(rnd(6, 11));
  }

  reset(rnd) {
    this.setup(rnd, false);
    this.z = rnd(1600, 2600);
  }

  update(speed, dt, rnd) {
    this.z += this.vz * speed * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rot += this.rotV * dt;

    if (this.z < -120) this.reset(rnd);
  }

  draw(ctx, projection, clamp) {
    const p = projection(this.x, this.y, this.z);
    if (!p) return;

    const W = ctx.canvas.width;
    const H = ctx.canvas.height;
    if (p.x < -250 || p.x > W + 250 || p.y < -250 || p.y > H + 250) return;

    const sz = Math.max(1, this.size * p.scale);
    const fade = clamp(this.z < 350 ? (this.z / 350) : 1, 0, 1);

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(this.rot);
    ctx.globalAlpha = fade;
    ctx.fillStyle = this.color;

    ctx.beginPath();
    for (let i = 0; i < this.pts; i++) {
      const ang = i / this.pts * 6.28;
      const r = sz * (0.58 + 0.42 * Math.sin(ang * 1.8 + this.rot));
      if (i === 0) ctx.moveTo(Math.cos(ang) * r, Math.sin(ang) * r);
      else ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
    }
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(90,65,45,.4)';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    if (this.type === 2 && this.z < 700) {
      ctx.strokeStyle = `rgba(255,80,0,${(1 - this.z / 700) * 0.55})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, sz * 1.55, 0, 6.28);
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