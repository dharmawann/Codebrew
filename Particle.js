export class Particle {
  constructor(x, y, vx, vy, life, col) {
    this.x   = x;
    this.y   = y;
    this.vx  = vx;
    this.vy  = vy;
    this.life = life;
    this.maxLife = life;
    this.col = col;
  }

  update() {
    this.x  += this.vx;
    this.y  += this.vy;
    this.vy += 0.12; // gravity
    this.life--;
  }

  get dead() {
    return this.life <= 0;
  }

  draw(ctx) {
    ctx.globalAlpha = this.life / this.maxLife;
    ctx.fillStyle   = this.col;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 2.8, 0, 6.28);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}
