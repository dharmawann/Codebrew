export class Star {
  constructor(rnd) {
    this.x = rnd(-2200, 2200); this.y = rnd(-1300, 1300); this.z = rnd(100, 3200);
    this.s = rnd(0.5, 2.2); this.b = rnd(0.3, 1);
    this.col = ['#ffffff', '#aaddff', '#ffeebb', '#ccffee'][Math.floor(rnd(0, 4))];
  }
  update(speed, dt, rnd) {
    this.z -= speed * 1.9 * dt;
    if (this.z < 10) { this.z = rnd(2200, 3200); this.x = rnd(-2200, 2200); this.y = rnd(-1300, 1300); }
  }
  draw(ctx, projection, speed, W, H) {
    const p = projection(this.x, this.y, this.z);
    if (!p || p.x < -5 || p.x > W + 5 || p.y < -5 || p.y > H + 5) return;
    ctx.globalAlpha = Math.min(1, this.b * (1 + speed * 0.18));
    ctx.fillStyle = this.col;
    ctx.beginPath(); ctx.arc(p.x, p.y, this.s * Math.min(2.2, p.scale * 120), 0, 6.28); ctx.fill();
    ctx.globalAlpha = 1;
  }
}