export class HealthBoost {
  constructor(rnd, spread = false) {
    this.reset(rnd, spread);
  }

  reset(rnd, spread = false) {
    this.limitX = 950;
    this.limitY = 520;

    this.x = rnd(-this.limitX, this.limitX);
    this.y = rnd(-this.limitY, this.limitY);
    this.z = spread ? rnd(700, 2400) : rnd(1800, 2600);

    this.vx = rnd(-0.22, 0.22);
    this.vy = rnd(-0.18, 0.18);
    this.vz = rnd(-3.2, -1.7);

    this.size = rnd(18, 28);
    this.rot = rnd(0, 6.28);
    this.rotV = rnd(-0.045, 0.045);

    this.healAmount = Math.floor(rnd(10, 19));
    this.pulse = rnd(0, 6.28);
    this.active = true;
  }

  update(speed, dt, rnd) {
    if (!this.active) return;

    this.z += this.vz * speed * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rot += this.rotV * dt;
    this.pulse += 0.08 * dt;

    if (this.x < -this.limitX) {
      this.x = -this.limitX;
      this.vx *= -1;
    } else if (this.x > this.limitX) {
      this.x = this.limitX;
      this.vx *= -1;
    }

    if (this.y < -this.limitY) {
      this.y = -this.limitY;
      this.vy *= -1;
    } else if (this.y > this.limitY) {
      this.y = this.limitY;
      this.vy *= -1;
    }

    if (this.z < -120) {
      this.reset(rnd, false);
    }
  }

  collect() {
    this.active = false;
    return this.healAmount;
  }

  respawn(rnd) {
    this.reset(rnd, false);
  }

  draw(ctx, projection, clamp) {
    if (!this.active) return;

    const p = projection(this.x, this.y, this.z);
    if (!p) return;

    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    if (p.x < -180 || p.x > W + 180 || p.y < -180 || p.y > H + 180) return;

    const s = Math.max(8, this.size * p.scale);
    const fade = clamp(this.z < 320 ? this.z / 320 : 1, 0, 1);
    const pulseScale = 1 + Math.sin(this.pulse) * 0.12;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(this.rot);
    ctx.globalAlpha = fade;

    ctx.fillStyle = `rgba(80,255,170,${0.16 * pulseScale})`;
    ctx.beginPath();
    ctx.arc(0, 0, s * 1.8, 0, 6.28);
    ctx.fill();

    ctx.strokeStyle = 'rgba(130,255,200,0.75)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.95 * pulseScale, 0, 6.28);
    ctx.stroke();

    ctx.fillStyle = '#7dffbf';

    ctx.beginPath();
    ctx.roundRect(-s * 0.22, -s * 0.72, s * 0.44, s * 1.44, s * 0.08);
    ctx.fill();

    ctx.beginPath();
    ctx.roundRect(-s * 0.72, -s * 0.22, s * 1.44, s * 0.44, s * 0.08);
    ctx.fill();

    ctx.strokeStyle = 'rgba(220,255,240,0.95)';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(-s * 0.22, -s * 0.72, s * 0.44, s * 1.44);
    ctx.strokeRect(-s * 0.72, -s * 0.22, s * 1.44, s * 0.44);

    if (this.z < 700) {
      ctx.strokeStyle = `rgba(110,255,190,${(1 - this.z / 700) * 0.55})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, s * 1.4, 0, 6.28);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }
}