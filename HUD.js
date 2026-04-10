export class HUD {
  constructor(ctx) {
    this.ctx = ctx;
  }

  // Helpers
  W() {
    return this.ctx.canvas.width;
  }

  H() {
    return this.ctx.canvas.height;
  }

  // ─── Cockpit frame ────────────────────────────────────────────────────────

  drawCockpit() {
    const ctx = this.ctx;
    const w = this.W();
    const h = this.H();
    const vH = h * 0.60;

    ctx.strokeStyle = 'rgba(0,185,225,0.42)';
    ctx.lineWidth = 2;
    ctx.strokeRect(w * 0.04, h * 0.02, w * 0.92, vH - h * 0.025);

    for (let i = 1; i < 4; i++) {
      ctx.strokeStyle = 'rgba(0,180,220,0.11)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      const px = w * 0.04 + (w * 0.92 * i) / 4;
      ctx.moveTo(px, h * 0.02);
      ctx.lineTo(px, vH);
      ctx.stroke();
    }

    for (let i = 0; i < 8; i++) {
      ctx.strokeStyle = 'rgba(0,255,200,0.055)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(w * 0.5, vH * 0.5);
      ctx.lineTo(w * 0.04 + (w * 0.92 * i) / 7, h * 0.02);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(1,6,16,.97)';
    ctx.fillRect(0, vH, w, h - vH);

    ctx.strokeStyle = 'rgba(0,200,255,0.13)';
    ctx.lineWidth = 0.5;

    for (let i = 0; i < 15; i++) {
      const x = (w * i) / 15;
      ctx.beginPath();
      ctx.moveTo(x, vH);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    for (let i = 0; i < 7; i++) {
      const y = vH + ((h - vH) * i) / 7;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }

  // ─── Crosshair + shield ring ──────────────────────────────────────────────

  drawHUD(hull, speed, shieldActive, aiMode, aiCooldown, frame) {
    const ctx = this.ctx;
    const cx = this.W() / 2;
    const cy = this.H() / 2;
    const col = hull < 25 ? 'rgba(255,80,0,.75)' : 'rgba(0,255,185,.38)';

    ctx.strokeStyle = col;
    ctx.lineWidth = 1;

    [
      [cx - 30, cy, cx - 9, cy],
      [cx + 9, cy, cx + 30, cy],
      [cx, cy - 30, cx, cy - 9],
      [cx, cy + 9, cx, cy + 30]
    ].forEach(([x1, y1, x2, y2]) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });

    if (shieldActive > 0) {
      const pulse = Math.sin(frame * 0.22) * 0.28 + 0.72;
      ctx.strokeStyle = `rgba(0,130,255,${pulse * 0.65})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, Math.min(this.W(), this.H()) * 0.39, 0, 6.28);
      ctx.stroke();
    }

    const fs = Math.round(this.H() * 0.018);

    ctx.fillStyle = 'rgba(0,255,185,.52)';
    ctx.font = `${fs}px 'Courier New'`;
    ctx.fillText(`HULL: ${hull.toFixed(0)}%`, cx + 38, cy + 6);

    ctx.fillStyle = 'rgba(0,205,255,.42)';
    ctx.fillText(`${speed.toFixed(2)} km/s`, cx + 38, cy - 20);

    if (aiMode && aiCooldown <= 0) {
      ctx.fillStyle = 'rgba(0,255,110,.52)';
      ctx.font = `${Math.round(fs * 0.85)}px 'Courier New'`;
      ctx.fillText('[E] AI READY', cx - 155, cy - 40);
    }
  }

  // ─── Three MFD panels ─────────────────────────────────────────────────────

  drawMFDs(game) {
    const ctx = this.ctx;
    const w = this.W();
    const h = this.H();
    const dY = h * 0.618;
    const dH = h * 0.368;
    const gap = w * 0.011;
    const dW = (w - gap * 4) / 3;

    const panels = [
      { x: gap, type: 'eng' },
      { x: gap * 2 + dW, type: 'neural' },
      { x: gap * 3 + dW * 2, type: 'nav' }
    ];

    const fs = Math.max(10, Math.round(h * 0.017));

    for (const p of panels) {
      const crit =
        (p.type === 'eng' && game.temp > 86) ||
        (p.type === 'neural' && !game.aiMode) ||
        (p.type === 'nav' && game.hull < 22);

      const bc = crit
        ? (game.frame % 8 < 4 ? '#ff4400' : '#330000')
        : 'rgba(0,185,205,.52)';

      ctx.fillStyle = 'rgba(0,5,13,.94)';
      ctx.fillRect(p.x, dY, dW, dH);

      ctx.strokeStyle = bc;
      ctx.lineWidth = crit ? 2 : 1;
      ctx.strokeRect(p.x, dY, dW, dH);

      const hH = h * 0.034;

      ctx.fillStyle = crit ? 'rgba(55,0,0,.65)' : 'rgba(0,18,28,.72)';
      ctx.fillRect(p.x, dY, dW, hH);

      ctx.fillStyle = crit ? '#ff4400' : 'rgba(0,215,255,.82)';
      ctx.font = `bold ${fs}px 'Courier New'`;

      const lbl = {
        eng: 'ENGINEERING',
        neural: 'NEURAL LINK',
        nav: 'NAV & FLIGHT'
      };

      ctx.fillText(lbl[p.type], p.x + 8, dY + hH * 0.74);

      const tag =
        p.type === 'neural'
          ? (game.aiMode ? 'AI ACTIVE' : 'OFFLINE')
          : p.type === 'nav'
            ? `${game.speed.toFixed(1)} km/s`
            : '';

      ctx.fillStyle = '#334';
      ctx.font = `${Math.round(fs * 0.78)}px 'Courier New'`;
      ctx.textAlign = 'right';
      ctx.fillText(tag, p.x + dW - 6, dY + hH * 0.74);
      ctx.textAlign = 'left';

      if (p.type === 'eng') this._drawEng(p.x, dY + hH, dW, dH - hH, fs, game);
      if (p.type === 'neural') this._drawNeural(p.x, dY + hH, dW, dH - hH, fs, game);
      if (p.type === 'nav') this._drawNav(p.x, dY + hH, dW, dH - hH, fs, game);
    }
  }

  _drawEng(x, y, w, h, fs, game) {
    const ctx = this.ctx;
    const fog = game.fogAlpha;
    const tempCritical = game.temp > 86;

    if (tempCritical && game.frame % 6 < 3) {
      ctx.fillStyle = 'rgba(255,15,0,.065)';
      ctx.fillRect(x, y, w, h);
    }

    const pw = w - 18;
    const ph = Math.round(h * 0.21);

    const labels = ['TEMPERATURE (°C)', 'HUMIDITY (%)'];
    const cols = [
      game.temp > 86 ? '#ff2200' : game.temp > 68 ? '#ff8800' : '#00ccff',
      game.humidity > 72 ? '#ff8800' : '#00ffcc'
    ];

    const hists = [game.tempHistory, game.humHistory];
    const disp = [game.temp.toFixed(1) + '°', game.humidity.toFixed(0) + '%'];

    for (let i = 0; i < 2; i++) {
      const ly = y + 10 + i * (ph + h * 0.09);

      ctx.fillStyle = '#223';
      ctx.font = `${Math.round(fs * 0.83)}px 'Courier New'`;
      ctx.fillText(labels[i], x + 9, ly + fs);

      ctx.fillStyle = cols[i];
      ctx.font = `bold ${Math.round(fs * 1.08)}px 'Courier New'`;
      ctx.textAlign = 'right';
      ctx.fillText(disp[i], x + w - 7, ly + fs);
      ctx.textAlign = 'left';

      ctx.fillStyle = 'rgba(0,28,48,.85)';
      ctx.fillRect(x + 9, ly + fs + 5, pw, ph);

      const arr = hists[i];
      const maxV = i === 0 ? 135 : 100;

      ctx.beginPath();
      arr.forEach((v, j) => {
        const bx = x + 9 + (j / 59) * pw;
        const by = ly + fs + 5 + ph * (1 - v / maxV);
        if (j === 0) ctx.moveTo(bx, by);
        else ctx.lineTo(bx, by);
      });

      ctx.strokeStyle = cols[i];
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    const warningY = y + h * 0.78;

    if (tempCritical) {
      ctx.fillStyle = game.frame % 8 < 4 ? '#ff4400' : '#660000';
      ctx.font = `bold ${Math.round(fs * 0.9)}px 'Courier New'`;
      ctx.textAlign = 'center';
      ctx.fillText('TEMP CRITICAL', x + w / 2, warningY);
      ctx.textAlign = 'left';
    } else if (game.humidity > 72) {
      ctx.fillStyle = '#ffaa00';
      ctx.font = `${Math.round(fs * 0.85)}px 'Courier New'`;
      ctx.textAlign = 'center';
      ctx.fillText('HUMIDITY ALERT', x + w / 2, warningY);
      ctx.textAlign = 'left';
    }

    if (fog > 0.06) {
      const g = ctx.createLinearGradient(x, y, x, y + h);
      g.addColorStop(0, `rgba(175,225,205,${fog * 0.88})`);
      g.addColorStop(1, `rgba(110,175,158,${fog * 0.42})`);
      ctx.fillStyle = g;
      ctx.fillRect(x, y, w, h);

      ctx.fillStyle = `rgba(200,245,225,${fog * 0.55})`;
      ctx.font = `bold ${Math.round(fs * 0.9)}px 'Courier New'`;
      ctx.textAlign = 'center';
      ctx.fillText('CONDENSATION', x + w / 2, y + h / 2);
      ctx.textAlign = 'left';
    }
  }

  _drawNeural(x, y, w, h, fs, game) {
    const ctx = this.ctx;

    if (!game.aiMode) {
      ctx.fillStyle = 'rgba(255,30,0,.03)';
      ctx.fillRect(x, y, w, h);

      for (let i = 0; i < 8; i++) {
        if (Math.random() < 0.45) {
          const gy = y + Math.random() * h;
          const gw = 20 + Math.random() * (w * 0.72);
          ctx.fillStyle = `rgba(${Math.random() > 0.5 ? '255,0,0' : '0,255,120'},.07)`;
          ctx.fillRect(x + Math.random() * (w - gw), gy, gw, 1.5);
        }
      }

      ctx.fillStyle = 'rgba(255,40,0,.52)';
      ctx.font = `bold ${fs}px 'Courier New'`;
      ctx.textAlign = 'center';

      ['NEURAL LINK', 'OFFLINE', '', 'STATIC MODE', '--- NO DATA ---'].forEach((l, i) => {
        if (l && Math.random() > 0.04) {
          ctx.fillText(l, x + w / 2, y + h * 0.22 + i * fs * 1.9);
        }
      });

      ctx.textAlign = 'left';
      return;
    }

    const lineH = fs * 1.72;
    let cy = y + lineH * 0.6;

    // AI message history
    for (const e of game.ai.history) {
      if (cy > y + h - lineH * 4.4) break;

      const alpha = Math.min(
        1,
        e.age < 22
          ? e.age / 22
          : e.age > 210
            ? Math.max(0, 1 - (e.age - 210) / 75)
            : 1
      );

      ctx.globalAlpha = alpha;
      ctx.fillStyle = e.col;
      ctx.font = `${Math.round(fs * 0.88)}px 'Courier New'`;

      const words = e.msg.split(' ');
      let line = '';

      for (const word of words) {
        const test = line + (line ? ' ' : '') + word;

        if (ctx.measureText(test).width > w - 18 && line) {
          ctx.fillText(line, x + 9, cy);
          cy += lineH;
          line = word;
        } else {
          line = test;
        }
      }

      if (line) {
        ctx.fillText(line, x + 9, cy);
        cy += lineH;
      }

      cy += 5;
    }

    ctx.globalAlpha = 1;

    // Recommendation line
    if (game.ai.lastRecommendation) {
      const rec = game.ai.lastRecommendation;

      let actionLabel = 'NONE';
      if (rec.action === 'cool') actionLabel = 'COOL';
      else if (rec.action === 'shield') actionLabel = 'SHIELD';
      else if (rec.action === 'dehumidify') actionLabel = 'PURGE';

      ctx.fillStyle = 'rgba(80,120,140,0.22)';
      ctx.fillRect(x + 7, y + h - 58, w - 14, 16);

      ctx.fillStyle = rec.color || '#00ffcc';
      ctx.font = `bold ${Math.round(fs * 0.8)}px 'Courier New'`;
      ctx.fillText(`RECOMMEND: ${actionLabel}`, x + 10, y + h - 46);
    }

    const bw = w - 18;

    if (game.aiCooldown > 0) {
      ctx.fillStyle = 'rgba(0,28,48,.85)';
      ctx.fillRect(x + 9, y + h - 22, bw, 10);

      ctx.fillStyle = '#0099ff';
      ctx.fillRect(x + 9, y + h - 22, bw * (1 - game.aiCooldown / 540), 10);

      ctx.fillStyle = '#334';
      ctx.font = `${Math.round(fs * 0.75)}px 'Courier New'`;
      ctx.fillText('[E] RECHARGING...', x + 9, y + h - 25);
    } else {
      ctx.fillStyle = 'rgba(0,255,140,.68)';
      ctx.font = `bold ${Math.round(fs * 0.85)}px 'Courier New'`;
      ctx.fillText('[ E ] EXECUTE — READY', x + 9, y + h - 9);
    }
  }

  _drawNav(x, y, w, h, fs, game) {
    const ctx = this.ctx;

    const items = [
      { l: 'SPEED', v: `${game.speed.toFixed(2)} km/s`, c: '#00ccff' },
      {
        l: 'HULL INTEGRITY',
        v: `${game.hull.toFixed(1)}%`,
        c: game.hull < 30 ? '#ff4400' : game.hull < 60 ? '#ff8800' : '#00ffcc'
      },
      {
        l: 'TEMPERATURE',
        v: `${game.temp.toFixed(1)}°C`,
        c: game.temp > 86 ? '#ff4400' : game.temp > 66 ? '#ff8800' : '#00ccff'
      },
      {
        l: 'HUMIDITY',
        v: `${game.humidity.toFixed(0)}%`,
        c: game.humidity > 72 ? '#ff8800' : '#00ffcc'
      }
    ];

    const lineH = h * 0.145;

    items.forEach((item, i) => {
      const iy = y + 8 + i * lineH;

      ctx.fillStyle = '#334';
      ctx.font = `${Math.round(fs * 0.8)}px 'Courier New'`;
      ctx.fillText(item.l, x + 8, iy + fs * 0.9);

      ctx.fillStyle = item.c;
      ctx.font = `bold ${Math.round(fs * 1.06)}px 'Courier New'`;
      ctx.fillText(item.v, x + 8, iy + fs * 1.95);
    });

    const bW = w - 16;
    const bY = y + h * 0.66;

    ctx.fillStyle = '#223';
    ctx.font = `${Math.round(fs * 0.8)}px 'Courier New'`;
    ctx.fillText('HULL STATUS', x + 8, bY);

    ctx.fillStyle = 'rgba(0,28,48,.85)';
    ctx.fillRect(x + 8, bY + 5, bW, 9);

    ctx.fillStyle = game.hull < 30 ? '#ff4400' : game.hull < 60 ? '#ff8800' : '#00ffcc';
    ctx.fillRect(x + 8, bY + 5, (bW * game.hull) / 100, 9);

    const t = game.survivalTime;
    const mm = Math.floor(t / 60).toString().padStart(2, '0');
    const ss = Math.floor(t % 60).toString().padStart(2, '0');
    const ms = Math.floor((t * 10) % 10);

    const tY = y + h * 0.78;

    ctx.fillStyle = '#334';
    ctx.font = `${Math.round(fs * 0.8)}px 'Courier New'`;
    ctx.fillText('SURVIVAL TIME', x + 8, tY);

    ctx.fillStyle = '#00ffcc';
    ctx.font = `bold ${Math.round(fs * 1.65)}px 'Courier New'`;
    ctx.fillText(`${mm}:${ss}.${ms}`, x + 8, tY + fs * 2.1);
  }

  // ─── Fog + flicker overlays ───────────────────────────────────────────────

  drawFog(fogAlpha, rnd) {
    if (fogAlpha < 0.05) return;

    const ctx = this.ctx;
    const w = this.W();
    const h = this.H();
    const vH = h * 0.60;

    ctx.fillStyle = `rgba(160,215,195,${fogAlpha * 0.32})`;
    ctx.fillRect(0, 0, w, vH);

    const lines = Math.floor(fogAlpha * 12);

    for (let i = 0; i < lines; i++) {
      const fy = Math.random() * vH;
      ctx.fillStyle = `rgba(200,240,220,${fogAlpha * 0.12})`;
      ctx.fillRect(0, fy, w, rnd(1, 4));
    }
  }

  drawFlicker(flickerAlpha, rnd) {
    if (flickerAlpha < 0.01) return;

    const ctx = this.ctx;

    ctx.fillStyle = `rgba(0,205,255,${flickerAlpha * 0.055})`;
    ctx.fillRect(0, 0, this.W(), this.H());

    for (let i = 0; i < Math.floor(rnd(1, 5)); i++) {
      const ly = rnd(0, this.H() * 0.6);
      ctx.fillStyle = `rgba(0,255,180,${flickerAlpha * 0.16})`;
      ctx.fillRect(0, ly, this.W(), rnd(0.5, 3));
    }
  }
}