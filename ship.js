export class Ship {
  constructor() {
    this.x  = 0;
    this.y  = 0;
    this.vx = 0;
    this.vy = 0;
  }

  update(keys, dt, clamp, W, H) {
    const mf = 5.5 * dt;

    if (keys['a']) this.vx -= mf * 0.08;
    if (keys['d']) this.vx += mf * 0.08;
    if (keys['w']) this.vy -= mf * 0.07;
    if (keys['s']) this.vy += mf * 0.07;

    this.vx *= 0.87;
    this.vy *= 0.87;

    const mv = H * 0.013;
    this.vx = clamp(this.vx, -mv, mv);
    this.vy = clamp(this.vy, -mv, mv);

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.x = clamp(this.x, -W * 0.42,  W * 0.42);
    this.y = clamp(this.y, -H * 0.34, H * 0.34);
  }
}