const KEYS_POOL = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K'];

export class Minigame {
    constructor() {
        this.active = false;
        this.type = null;
        this.result = null; // 'success' | 'fail' | null
        this.resultTimer = 0;

        // cooling
        this.needlePos = 0;
        this.needleDir = 1;
        this._coolSpeed = 1.2;
        this.coolHits = 0;
        this.coolTotalHits = 3;
        this.coolZoneLeft = 35;
        this.coolZoneWidth = 20;
        this.coolMissFlash = 0;

        // shield
        this.seq = [];
        this.seqIdx = 0;
        this.seqTimer = 0;
        this.seqMaxTime = 6;
        this.seqWrongFlash = 0;

        // fog
        this.fogLines = [];
        this.fogNumLines = 6;
        this.fogRegenDelay = 180;
        this.fogGoal = 0;
        this.fogWiped = 0;
    }

    start(type, param) {
        this.active = true;
        this.type = type;
        this.result = null;
        this.resultTimer = 0;

        if (type === 'cool') {
            const danger = Math.max(0, Math.min(1, (param - 55) / 75));
            this._coolSpeed = 1.0 + danger * 3.8;
            this.coolTotalHits = param > 100 ? 5 : param > 80 ? 4 : 3;
            this.coolZoneWidth = Math.max(8, 22 - danger * 14);
            this.coolZoneLeft = 10 + Math.random() * (80 - this.coolZoneWidth);
            this.coolHits = 0;
            this.needlePos = 0;
            this.needleDir = 1;
            this.coolMissFlash = 0;
        }

        if (type === 'shield') {
            const hull = param;
            const len = hull > 75 ? 4 : hull > 50 ? 5 : hull > 25 ? 6 : 7;
            this.seqMaxTime = hull > 75 ? 6 : hull > 50 ? 5 : hull > 25 ? 4 : 3;
            this.seq = Array.from({ length: len }, () =>
                KEYS_POOL[Math.floor(Math.random() * KEYS_POOL.length)]
            );
            this.seqIdx = 0;
            this.seqTimer = this.seqMaxTime * 60;
            this.seqWrongFlash = 0;
        }

        if (type === 'fog') {
            const hum = param;
            const danger = Math.max(0, Math.min(1, (hum - 55) / 45));
            this.fogNumLines = Math.floor(6 + danger * 4);
            this.fogRegenDelay = Math.max(40, Math.round(220 - danger * 180));
            this.fogGoal = Math.ceil(this.fogNumLines * 0.8);
            this.fogLines = Array.from({ length: this.fogNumLines }, (_, i) => ({
                idx: i,
                wiped: false,
                regenTimer: 0
            }));
            this.fogWiped = 0;
        }
    }

    close() {
        this.active = false;
        this.type = null;
    }

    update(dt) {
        if (!this.active) return;

        if (this.result) {
            this.resultTimer -= dt;
            if (this.resultTimer <= 0) this.close();
            return;
        }

        if (this.type === 'cool') {
            this.needlePos += this.needleDir * this._coolSpeed * dt * 0.9;
            if (this.needlePos >= 100) { this.needlePos = 100; this.needleDir = -1; }
            if (this.needlePos <= 0) { this.needlePos = 0; this.needleDir = 1; }
            if (this.coolMissFlash > 0) this.coolMissFlash -= dt;
        }

        if (this.type === 'shield') {
            this.seqTimer -= dt;
            if (this.seqWrongFlash > 0) this.seqWrongFlash -= dt;
            if (this.seqTimer <= 0) this._finish(false);
        }

        if (this.type === 'fog') {
            let wiped = 0;
            for (const l of this.fogLines) {
                if (l.wiped) {
                    wiped++;
                    l.regenTimer -= dt;
                    if (l.regenTimer <= 0) {
                        l.wiped = false;
                        l.regenTimer = 0;
                    }
                }
            }
            this.fogWiped = wiped;
            if (wiped >= this.fogGoal) this._finish(true);
        }
    }

    _finish(ok) {
        this.result = ok ? 'success' : 'fail';
        this.resultTimer = 90;
    }

    // ── input handlers ─────────────────────────────────────────────────────────

    onSpace() {
        if (!this.active || this.type !== 'cool' || this.result) return false;
        const inZone = this.needlePos >= this.coolZoneLeft &&
            this.needlePos <= this.coolZoneLeft + this.coolZoneWidth;
        if (inZone) {
            this.coolHits++;
            if (this.coolHits >= this.coolTotalHits) {
                this._finish(true);
            } else {
                this.coolZoneLeft = 10 + Math.random() * (80 - this.coolZoneWidth);
            }
        } else {
            this.coolMissFlash = 18;
            this.coolZoneLeft = 10 + Math.random() * (80 - this.coolZoneWidth);
        }
        return true;
    }

    onKey(k) {
        if (!this.active || this.type !== 'shield' || this.result) return false;
        const expected = this.seq[this.seqIdx] && this.seq[this.seqIdx].toLowerCase();
        if (!expected) return false;
        if (k.toLowerCase() === expected) {
            this.seqIdx++;
            this.seqWrongFlash = 0;
            if (this.seqIdx >= this.seq.length) this._finish(true);
        } else {
            this.seqWrongFlash = 16;
        }
        return true;
    }

    getFogLineAtMouse(mouseX, mouseY, w, h) {
        if (this.type !== 'fog') return -1;
        const bw = w * 0.52;
        const bh = h * 0.38;
        const bx = (w - bw) / 2;
        const by = h * 0.09;
        const pad = 24;
        const areaX = bx + pad;
        const areaY = by + 66;
        const areaW = bw - pad * 2;
        const lineH = 13;
        const lineGap = Math.floor((bh - 120) / this.fogNumLines) - lineH;
        if (mouseX < areaX || mouseX > areaX + areaW) return -1;
        for (let i = 0; i < this.fogNumLines; i++) {
            const ly = areaY + i * (lineH + lineGap);
            if (mouseY >= ly && mouseY <= ly + lineH) return i;
        }
        return -1;
    }

    wipeLineAtIndex(i) {
        if (!this.active || this.type !== 'fog' || this.result) return;
        const l = this.fogLines[i];
        if (!l || l.wiped) return;
        l.wiped = true;
        l.regenTimer = this.fogRegenDelay;
    }

    // ── draw ───────────────────────────────────────────────────────────────────

    draw(ctx, w, h, frame) {
        if (!this.active) return;

        const bw = w * 0.52;
        const bh = h * 0.38;
        const bx = (w - bw) / 2;
        const by = h * 0.09;

        ctx.save();
        ctx.fillStyle = 'rgba(2,8,18,0.95)';
        ctx.fillRect(bx, by, bw, bh);

        const borderCol = this.result === 'success' ? 'rgba(0,255,150,0.9)'
            : this.result === 'fail' ? 'rgba(255,60,0,0.9)'
                : (frame % 20 < 10 ? 'rgba(0,200,255,0.75)' : 'rgba(0,130,255,0.5)');
        ctx.strokeStyle = borderCol;
        ctx.lineWidth = 2;
        ctx.strokeRect(bx, by, bw, bh);

        if (this.result) {
            this._drawResult(ctx, bx, by, bw, bh, h);
            ctx.restore();
            return;
        }

        if (this.type === 'cool') this._drawCool(ctx, bx, by, bw, bh, h, frame);
        if (this.type === 'shield') this._drawShield(ctx, bx, by, bw, bh, h, frame);
        if (this.type === 'fog') this._drawFog(ctx, bx, by, bw, bh, h, frame);

        ctx.restore();
    }

    _drawResult(ctx, bx, by, bw, bh, h) {
        const ok = this.result === 'success';
        ctx.fillStyle = ok ? '#00ff99' : '#ff4422';
        ctx.font = `bold ${Math.round(h * 0.032)}px 'Courier New'`;
        ctx.textAlign = 'center';
        ctx.fillText(ok ? 'SUCCESS' : 'FAILED', bx + bw / 2, by + bh / 2 - 10);
        ctx.fillStyle = ok ? 'rgba(0,255,150,0.6)' : 'rgba(255,80,0,0.6)';
        ctx.font = `${Math.round(h * 0.018)}px 'Courier New'`;
        ctx.fillText(ok ? 'SYSTEM STABILISED' : 'ATTEMPT UNSUCCESSFUL', bx + bw / 2, by + bh / 2 + 24);
        ctx.textAlign = 'left';
    }

    _drawCool(ctx, bx, by, bw, bh, h, frame) {
        const fs = Math.round(h * 0.02);
        const pad = 24;

        ctx.fillStyle = '#ff8822';
        ctx.font = `bold ${fs}px 'Courier New'`;
        ctx.fillText('COOLING VENTS', bx + pad, by + 32);

        ctx.fillStyle = 'rgba(220,240,255,0.65)';
        ctx.font = `${Math.round(fs * 0.78)}px 'Courier New'`;
        ctx.fillText('Press SPACE when needle is inside the green zone', bx + pad, by + 52);

        // hit pips
        const pipW = 22, pipH = 10, pipGap = 6;
        for (let i = 0; i < this.coolTotalHits; i++) {
            ctx.fillStyle = i < this.coolHits ? '#00ff99' : 'rgba(255,255,255,0.1)';
            ctx.fillRect(bx + pad + i * (pipW + pipGap), by + 64, pipW, pipH);
        }

        // bar
        const barX = bx + pad, barY = by + 86, barW = bw - pad * 2, barH = 30;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(barX, barY, barW, barH);

        if (this.coolMissFlash > 0) {
            ctx.fillStyle = `rgba(255,40,0,${(this.coolMissFlash / 18) * 0.4})`;
            ctx.fillRect(barX, barY, barW, barH);
        }

        // zone
        const zx = barX + (this.coolZoneLeft / 100) * barW;
        const zw = (this.coolZoneWidth / 100) * barW;
        ctx.fillStyle = 'rgba(0,255,130,0.2)';
        ctx.fillRect(zx, barY, zw, barH);
        ctx.strokeStyle = '#00ff99';
        ctx.lineWidth = 2;
        ctx.strokeRect(zx, barY, zw, barH);

        // needle
        const nx = barX + (this.needlePos / 100) * barW - 2;
        ctx.fillStyle = this.coolMissFlash > 0 ? '#ff4400' : '#ffffff';
        ctx.fillRect(nx, barY, 4, barH);

        // speed label
        const danger = (this._coolSpeed - 1.0) / 3.8;
        const speedLabel = danger < 0.3 ? 'SLOW' : danger < 0.65 ? 'MEDIUM' : 'FAST';
        const speedCol = danger < 0.3 ? '#00ffcc' : danger < 0.65 ? '#ffaa00' : '#ff4400';
        ctx.fillStyle = speedCol;
        ctx.font = `${Math.round(fs * 0.75)}px 'Courier New'`;
        ctx.textAlign = 'right';
        ctx.fillText(`SPEED: ${speedLabel}`, bx + bw - pad, by + 52);
        ctx.textAlign = 'left';

        ctx.fillStyle = 'rgba(150,200,255,0.55)';
        ctx.font = `${Math.round(fs * 0.72)}px 'Courier New'`;
        ctx.fillText(`${this.coolHits}/${this.coolTotalHits} hits  |  ESC to cancel`, bx + pad, by + bh - 14);
    }

    _drawShield(ctx, bx, by, bw, bh, h, frame) {
        const fs = Math.round(h * 0.02);
        const pad = 24;

        ctx.fillStyle = '#4499ff';
        ctx.font = `bold ${fs}px 'Courier New'`;
        ctx.fillText('SHIELD MATRIX', bx + pad, by + 32);

        ctx.fillStyle = 'rgba(220,240,255,0.65)';
        ctx.font = `${Math.round(fs * 0.78)}px 'Courier New'`;
        ctx.fillText('Type the highlighted key sequence in time', bx + pad, by + 52);

        // countdown bar
        const timerFrac = Math.max(0, this.seqTimer / (this.seqMaxTime * 60));
        const tbX = bx + pad, tbY = by + 62, tbW = bw - pad * 2, tbH = 7;
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(tbX, tbY, tbW, tbH);
        ctx.fillStyle = timerFrac > 0.5 ? '#00ffcc' : timerFrac > 0.25 ? '#ffaa00' : '#ff4400';
        ctx.fillRect(tbX, tbY, tbW * timerFrac, tbH);

        ctx.fillStyle = timerFrac > 0.5 ? '#00ffcc' : '#ff4400';
        ctx.font = `${Math.round(fs * 0.78)}px 'Courier New'`;
        ctx.textAlign = 'right';
        ctx.fillText(`${(this.seqTimer / 60).toFixed(1)}s`, bx + bw - pad, by + 62);
        ctx.textAlign = 'left';

        // keys
        const keySize = Math.min(40, (bw - pad * 2 - (this.seq.length - 1) * 8) / this.seq.length);
        const totalW = this.seq.length * keySize + (this.seq.length - 1) * 8;
        const startX = bx + (bw - totalW) / 2;
        const keyY = by + 86;

        for (let i = 0; i < this.seq.length; i++) {
            const kx = startX + i * (keySize + 8);
            const isDone = i < this.seqIdx;
            const isNext = i === this.seqIdx;
            const isWrong = isNext && this.seqWrongFlash > 0;

            ctx.fillStyle = isDone ? 'rgba(0,200,100,0.15)'
                : isWrong ? 'rgba(255,60,0,0.28)'
                    : isNext ? 'rgba(60,150,255,0.22)'
                        : 'rgba(255,255,255,0.05)';
            ctx.fillRect(kx, keyY, keySize, keySize);

            ctx.strokeStyle = isDone ? 'rgba(0,255,120,0.5)'
                : isWrong ? '#ff4400'
                    : isNext ? '#4499ff'
                        : 'rgba(255,255,255,0.14)';
            ctx.lineWidth = isNext ? 2 : 1;
            ctx.strokeRect(kx, keyY, keySize, keySize);

            ctx.fillStyle = isDone ? 'rgba(0,255,120,0.5)'
                : isWrong ? '#ff6644'
                    : isNext ? '#ffffff'
                        : 'rgba(255,255,255,0.28)';
            ctx.font = `bold ${Math.round(keySize * 0.44)}px 'Courier New'`;
            ctx.textAlign = 'center';
            ctx.fillText(this.seq[i], kx + keySize / 2, keyY + keySize * 0.67);
            ctx.textAlign = 'left';
        }

        // progress bar
        const pbX = bx + pad, pbY = keyY + keySize + 14, pbW = bw - pad * 2, pbH = 8;
        ctx.fillStyle = 'rgba(255,255,255,0.07)';
        ctx.fillRect(pbX, pbY, pbW, pbH);
        ctx.fillStyle = '#4499ff';
        ctx.fillRect(pbX, pbY, pbW * (this.seqIdx / this.seq.length), pbH);

        ctx.fillStyle = 'rgba(150,200,255,0.55)';
        ctx.font = `${Math.round(fs * 0.72)}px 'Courier New'`;
        ctx.fillText(`${this.seqIdx}/${this.seq.length} keys  |  ESC to cancel`, bx + pad, by + bh - 14);
    }

    _drawFog(ctx, bx, by, bw, bh, h, frame) {
        const fs = Math.round(h * 0.02);
        const pad = 24;

        ctx.fillStyle = '#00ffcc';
        ctx.font = `bold ${fs}px 'Courier New'`;
        ctx.fillText('DEHUMIDIFIER', bx + pad, by + 32);

        ctx.fillStyle = 'rgba(220,240,255,0.65)';
        ctx.font = `${Math.round(fs * 0.78)}px 'Courier New'`;
        ctx.fillText('Move mouse over scan lines — they regenerate fast!', bx + pad, by + 52);

        const areaX = bx + pad;
        const areaY = by + 66;
        const areaW = bw - pad * 2;
        const lineH = 13;
        const lineGap = Math.max(4, Math.floor((bh - 130) / this.fogNumLines) - lineH);

        for (let i = 0; i < this.fogNumLines; i++) {
            const l = this.fogLines[i];
            const ly = areaY + i * (lineH + lineGap);

            if (l.wiped) {
                const regenFrac = l.regenTimer / this.fogRegenDelay;
                ctx.fillStyle = `rgba(29,158,117,${regenFrac * 0.14})`;
                ctx.fillRect(areaX, ly, areaW, lineH);
                ctx.strokeStyle = `rgba(29,158,117,${regenFrac * 0.28})`;
                ctx.lineWidth = 1;
                ctx.strokeRect(areaX, ly, areaW, lineH);
            } else {
                const pulse = 0.18 + Math.sin(frame * 0.08 + i * 0.7) * 0.07;
                ctx.fillStyle = `rgba(29,158,117,${pulse})`;
                ctx.fillRect(areaX, ly, areaW, lineH);
                ctx.strokeStyle = 'rgba(29,200,130,0.5)';
                ctx.lineWidth = 1;
                ctx.strokeRect(areaX, ly, areaW, lineH);
            }
        }

        // progress
        const pct = this.fogWiped / this.fogNumLines;
        const pbX = bx + pad, pbY = by + bh - 38, pbW = bw - pad * 2, pbH = 8;
        ctx.fillStyle = 'rgba(255,255,255,0.07)';
        ctx.fillRect(pbX, pbY, pbW, pbH);
        ctx.fillStyle = pct >= 0.8 ? '#00ff99' : '#1D9E75';
        ctx.fillRect(pbX, pbY, pbW * pct, pbH);

        ctx.fillStyle = 'rgba(150,200,255,0.55)';
        ctx.font = `${Math.round(fs * 0.72)}px 'Courier New'`;
        ctx.fillText(`${this.fogWiped}/${this.fogGoal} cleared  |  ESC to cancel`, bx + pad, by + bh - 14);
    }
}