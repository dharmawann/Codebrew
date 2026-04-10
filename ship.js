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

    // Drag
    this.vx *= 0.87;
    this.vy *= 0.87;

    // Velocity cap
    const mv = H * 0.013;
    this.vx = clamp(this.vx, -mv, mv);
    this.vy = clamp(this.vy, -mv, mv);

    // Position
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Bounds
    this.x = clamp(this.x, -W * 0.3,  W * 0.3);
    this.y = clamp(this.y, -H * 0.24, H * 0.24);
  }
}
