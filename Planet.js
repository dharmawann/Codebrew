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

    const kinds = [
      {
        kind: 'ice',
        base: '#91d8ff',
        glow: 'rgba(170,230,255,0.18)',
        shadow: '#102233',
        effect: 'humidity',
        effectStrength: this.dangerous ? 0.22 : 0.08
      },
      {
        kind: 'lava',
        base: '#ff7a4d',
        glow: 'rgba(255,130,70,0.18)',
        shadow: '#2a120c',
        effect: 'heat',
        effectStrength: this.dangerous ? 0.28 : 0.1
      },
      {
        kind: 'gas',
        base: '#d8b27a',
        glow: 'rgba(255,210,140,0.16)',
        shadow: '#24180f',
        effect: 'drift',
        effectStrength: this.dangerous ? 0.18 : 0.05
      },
      {
        kind: 'rocky',
        base: '#9b8f86',
        glow: 'rgba(220,200,185,0.12)',
        shadow: '#171412',
        effect: 'none',
        effectStrength: 0
      },
      {
        kind: 'magnetic',
        base: '#8f7cff',
        glow: 'rgba(170,150,255,0.18)',
        shadow: '#141126',
        effect: 'flicker',
        effectStrength: this.dangerous ? 0.24 : 0.08
      }
    ];

    const pick = kinds[Math.floor(rnd(0, kinds.length))];

    this.kind = pick.kind;
    this.color = pick.base;
    this.glow = pick.glow;
    this.shadow = pick.shadow;
    this.effect = pick.effect;
    this.effectStrength = pick.effectStrength;

    this.ring = !this.dangerous && (this.kind === 'gas' || Math.random() < 0.22);
    this.hasMoon = !this.dangerous && Math.random() < 0.28;
    this.moonAngle = rnd(0, 6.28);
    this.moonDist = rnd(1.5, 2.1);
    this.moonSize = rnd(0.12, 0.2);

    this.craters = [];
    const craterCount = this.kind === 'rocky' ? Math.floor(rnd(3, 7)) : Math.floor(rnd(1, 4));
    for (let i = 0; i < craterCount; i++) {
      this.craters.push({
        ox: rnd(-0.45, 0.45),
        oy: rnd(-0.45, 0.45),
        r: rnd(0.08, 0.18),
        a: rnd(0.08, 0.22)
      });
    }

    this.bandOffset = rnd(0, 6.28);
    this.rot = rnd(0, 6.28);
    this.rotV = rnd(-0.01, 0.01);
  }

  update(speed, dt, rnd) {
    const multiplier = this.dangerous ? 0.75 : 0.18;
    this.z += this.vz * speed * multiplier * dt;
    this.rot += this.rotV * dt;
    this.moonAngle += 0.004 * dt;

    if (this.kind === 'gas') this.bandOffset += 0.01 * dt;

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

    const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.14, 0, 0, r);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.12, this.color);
    grad.addColorStop(1, this.shadow);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, 6.28);
    ctx.fill();

    if (this.kind === 'gas') {
      ctx.save();
      ctx.globalAlpha = 0.28;
      for (let i = -2; i <= 2; i++) {
        const by = i * r * 0.22 + Math.sin(this.bandOffset + i) * r * 0.03;
        ctx.strokeStyle = i % 2 === 0 ? 'rgba(255,240,210,0.35)' : 'rgba(130,90,55,0.26)';
        ctx.lineWidth = Math.max(1, r * 0.08);
        ctx.beginPath();
        ctx.moveTo(-r * 0.82, by);
        ctx.lineTo(r * 0.82, by);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (this.kind === 'lava') {
      ctx.save();
      ctx.globalAlpha = 0.45;
      for (let i = 0; i < 4; i++) {
        const lx = Math.sin(this.rot * 1.3 + i) * r * 0.38;
        const ly = Math.cos(this.rot * 0.9 + i * 1.4) * r * 0.34;
        ctx.fillStyle = i % 2 === 0 ? 'rgba(255,220,120,0.18)' : 'rgba(255,90,40,0.22)';
        ctx.beginPath();
        ctx.arc(lx, ly, r * rndRange(i, 0.12, 0.22), 0, 6.28);
        ctx.fill();
      }
      ctx.restore();
    }

    if (this.kind === 'rocky' || this.kind === 'ice') {
      for (const c of this.craters) {
        ctx.fillStyle = this.kind === 'ice'
          ? `rgba(210,245,255,${c.a})`
          : `rgba(40,28,22,${c.a})`;
        ctx.beginPath();
        ctx.arc(c.ox * r, c.oy * r, c.r * r, 0, 6.28);
        ctx.fill();
      }
    }

    if (this.kind === 'magnetic') {
      ctx.save();
      ctx.strokeStyle = 'rgba(165,150,255,0.22)';
      ctx.lineWidth = Math.max(1, r * 0.03);
      for (let i = 0; i < 2; i++) {
        ctx.beginPath();
        ctx.ellipse(0, 0, r * (1.18 + i * 0.18), r * (0.65 + i * 0.08), 0.5 + i * 0.1, 0, 6.28);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (this.ring) {
      ctx.strokeStyle = 'rgba(230,230,255,0.28)';
      ctx.lineWidth = Math.max(1, r * 0.08);
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.58, r * 0.56, 0.18, 0, 6.28);
      ctx.stroke();
    }

    if (this.hasMoon && r > 18) {
      const mx = Math.cos(this.moonAngle) * r * this.moonDist;
      const my = Math.sin(this.moonAngle) * r * this.moonDist * 0.7;

      ctx.fillStyle = 'rgba(215,220,230,0.85)';
      ctx.beginPath();
      ctx.arc(mx, my, r * this.moonSize, 0, 6.28);
      ctx.fill();
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

function rndRange(seed, a, b) {
  const t = Math.abs(Math.sin(seed * 12.9898)) % 1;
  return a + (b - a) * t;
}