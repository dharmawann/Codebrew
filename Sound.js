/**
 * COSMOS-OS Sound Engine v2
 * Pure Web Audio API — zero audio files required.
 * All sounds are synthesised procedurally.
 *
 * Usage:
 *   import { Sound } from './Sound.js';
 *   const snd = new Sound();
 *   snd.resume();          // call on first user gesture
 *   snd.play('impact');
 *   snd.updateAlarms(hull, oxygen, temp);  // call every frame
 *   snd.destroy();
 *
 * Sound names:
 *   impact, shield, burn, freeze
 *   aiExecute, aiBeep, aiAlert
 *   collectHealth, radiation, death
 *   encounterStart, encounterChoice
 *   minigameOpen, minigameCancel, minigameSuccess, minigameFail
 *   thrustOn, thrustOff
 */

export class Sound {
    constructor() {
        this._ctx = null;
        this._master = null;
        this._ambience = null;
        this._thrustNode = null;
        this._thrustGain = null;
        this._alarmNode = null;
        this._alarmGain = null;
        this._alarmType = '';
        this._lastImpact = 0;
        this._enabled = true;
    }

    // ── Initialisation ──────────────────────────────────────────────────────────

    _init() {
        if (this._ctx) return;
        try {
            this._ctx = new (window.AudioContext || window.webkitAudioContext)();
            this._master = this._ctx.createGain();
            this._master.gain.value = 0.6;
            this._master.connect(this._ctx.destination);
            this._startAmbience();
        } catch (_) {
            this._enabled = false;
        }
    }

    /** Call on first user gesture to unblock the AudioContext. */
    resume() {
        this._init();
        if (this._ctx && this._ctx.state === 'suspended') {
            this._ctx.resume();
        }
    }

    setEnabled(on) {
        this._enabled = on;
        if (this._master) {
            this._master.gain.setTargetAtTime(on ? 0.6 : 0, this._ctx.currentTime, 0.1);
        }
    }

    // ── Low-level helpers ───────────────────────────────────────────────────────

    _t() { return this._ctx ? this._ctx.currentTime : 0; }

    /**
     * One-shot oscillator burst.
     * @param {object} o - { type, freq, freqEnd, vol, attack, release, duration, detune, dest }
     */
    _osc(o = {}) {
        if (!this._ctx) return;
        const {
            type = 'sine', freq = 440, freqEnd = null,
            vol = 0.3, attack = 0.005, release = 0.2,
            duration = 0.3, detune = 0, dest = null
        } = o;
        const t = this._t();
        const g = this._ctx.createGain();
        g.connect(dest || this._master);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(vol, t + attack);
        g.gain.setValueAtTime(vol, t + duration - release);
        g.gain.linearRampToValueAtTime(0, t + duration);
        const osc = this._ctx.createOscillator();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t);
        if (freqEnd !== null) osc.frequency.linearRampToValueAtTime(freqEnd, t + duration);
        if (detune) osc.detune.value = detune;
        osc.connect(g);
        osc.start(t);
        osc.stop(t + duration + 0.02);
    }

    /**
     * Filtered noise burst.
     * @param {object} o - { vol, attack, release, duration, filterFreq, filterType, dest }
     */
    _noise(o = {}) {
        if (!this._ctx) return;
        const {
            vol = 0.15, attack = 0.005, release = 0.1,
            duration = 0.2, filterFreq = 1200,
            filterType = 'bandpass', dest = null
        } = o;
        const t = this._t();
        const len = Math.ceil(this._ctx.sampleRate * (duration + 0.06));
        const buf = this._ctx.createBuffer(1, len, this._ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        const src = this._ctx.createBufferSource();
        src.buffer = buf;
        const f = this._ctx.createBiquadFilter();
        f.type = filterType;
        f.frequency.value = filterFreq;
        f.Q.value = 1.4;
        const g = this._ctx.createGain();
        g.connect(dest || this._master);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(vol, t + attack);
        g.gain.setValueAtTime(vol, t + duration - release);
        g.gain.linearRampToValueAtTime(0, t + duration);
        src.connect(f);
        f.connect(g);
        src.start(t);
        src.stop(t + duration + 0.06);
    }

    // ── Continuous loops ────────────────────────────────────────────────────────

    _startAmbience() {
        if (!this._ctx) return;
        const g = this._ctx.createGain();
        g.gain.value = 0.032;
        g.connect(this._master);
        for (const det of [-5, 5]) {
            const o = this._ctx.createOscillator();
            o.type = 'sine';
            o.frequency.value = 42;
            o.detune.value = det;
            o.connect(g);
            o.start();
        }
        const sub = this._ctx.createOscillator();
        sub.type = 'triangle';
        sub.frequency.value = 21;
        sub.connect(g);
        sub.start();
        this._ambience = g;
    }

    /** Start looping engine rumble. Called when player starts moving. */
    startThrust() {
        if (!this._ctx || this._thrustNode) return;
        const g = this._ctx.createGain();
        g.gain.value = 0;
        g.connect(this._master);
        this._thrustGain = g;

        const len = this._ctx.sampleRate * 2;
        const buf = this._ctx.createBuffer(1, len, this._ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        const src = this._ctx.createBufferSource();
        src.buffer = buf;
        src.loop = true;

        const lp = this._ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 160;
        lp.Q.value = 2.2;

        const osc = this._ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = 52;

        src.connect(lp);
        osc.connect(lp);
        lp.connect(g);
        src.start();
        osc.start();
        this._thrustNode = { src, osc };
        g.gain.setTargetAtTime(0.09, this._ctx.currentTime, 0.14);
    }

    /** Stop looping engine rumble. */
    stopThrust() {
        if (!this._thrustGain || !this._thrustNode) return;
        this._thrustGain.gain.setTargetAtTime(0, this._ctx.currentTime, 0.2);
        const node = this._thrustNode;
        const gain = this._thrustGain;
        setTimeout(() => {
            try { node.src.stop(); } catch (_) { }
            try { node.osc.stop(); } catch (_) { }
            try { gain.disconnect(); } catch (_) { }
        }, 700);
        this._thrustNode = null;
        this._thrustGain = null;
    }

    _startAlarm(type) {
        if (this._alarmType === type) return;
        this._stopAlarm();
        this._alarmType = type;
        if (!this._ctx) return;

        const g = this._ctx.createGain();
        g.gain.value = 0.16;
        g.connect(this._master);
        this._alarmGain = g;

        const osc = this._ctx.createOscillator();
        const lfo = this._ctx.createOscillator();
        const lfoG = this._ctx.createGain();

        if (type === 'hull') {
            osc.type = 'square';
            osc.frequency.value = 880;
            lfo.type = 'square';
            lfo.frequency.value = 2.8;
            lfoG.gain.value = 0.5;
        } else if (type === 'oxygen') {
            osc.type = 'sine';
            osc.frequency.value = 660;
            lfo.type = 'sine';
            lfo.frequency.value = 1.4;
            lfoG.gain.value = 0.35;
        } else if (type === 'heat') {
            osc.type = 'sawtooth';
            osc.frequency.value = 440;
            lfo.type = 'square';
            lfo.frequency.value = 4.2;
            lfoG.gain.value = 0.42;
        }

        lfo.connect(lfoG);
        lfoG.connect(g.gain);
        osc.connect(g);
        lfo.start();
        osc.start();
        this._alarmNode = { osc, lfo, lfoG, g };
    }

    _stopAlarm() {
        if (!this._alarmNode) return;
        try {
            this._alarmGain.gain.setTargetAtTime(0, this._ctx.currentTime, 0.12);
            const n = this._alarmNode;
            setTimeout(() => {
                try { n.osc.stop(); } catch (_) { }
                try { n.lfo.stop(); } catch (_) { }
                try { n.g.disconnect(); } catch (_) { }
            }, 500);
        } catch (_) { }
        this._alarmNode = null;
        this._alarmGain = null;
        this._alarmType = '';
    }

    // ── Public API ──────────────────────────────────────────────────────────────

    /**
     * Play a one-shot sound by name.
     */
    play(name) {
        if (!this._enabled) return;
        this._init();
        if (!this._ctx) return;

        switch (name) {

            // ── Asteroid collisions ───────────────────────────────────────────────

            case 'impact': {
                const now = Date.now();
                if (now - this._lastImpact < 180) return;
                this._lastImpact = now;
                // Deep thud
                this._osc({
                    type: 'sine', freq: 80, freqEnd: 26, vol: 0.55,
                    attack: 0.002, release: 0.18, duration: 0.28
                });
                // Mid crunch
                this._osc({
                    type: 'sawtooth', freq: 220, freqEnd: 55, vol: 0.22,
                    attack: 0.003, release: 0.12, duration: 0.18
                });
                // Noise burst
                this._noise({
                    vol: 0.32, attack: 0.002, duration: 0.22,
                    release: 0.1, filterFreq: 900, filterType: 'bandpass'
                });
                break;
            }

            case 'shield': {
                // Metallic resonant ping
                this._osc({
                    type: 'triangle', freq: 1200, freqEnd: 750, vol: 0.26,
                    attack: 0.004, release: 0.3, duration: 0.5
                });
                this._osc({
                    type: 'sine', freq: 600, freqEnd: 380, vol: 0.18,
                    attack: 0.006, release: 0.4, duration: 0.6, detune: 7
                });
                this._noise({
                    vol: 0.08, attack: 0.002, duration: 0.12,
                    filterFreq: 3000, filterType: 'highpass'
                });
                break;
            }

            case 'burn': {
                // Fire crackle
                this._noise({
                    vol: 0.28, attack: 0.005, duration: 0.35,
                    release: 0.15, filterFreq: 1800, filterType: 'bandpass'
                });
                this._osc({
                    type: 'sawtooth', freq: 160, freqEnd: 80, vol: 0.18,
                    attack: 0.004, release: 0.2, duration: 0.3
                });
                break;
            }

            case 'freeze': {
                // Ice zing
                this._osc({
                    type: 'sine', freq: 1600, freqEnd: 400, vol: 0.22,
                    attack: 0.006, release: 0.35, duration: 0.5
                });
                this._noise({
                    vol: 0.12, attack: 0.002, duration: 0.3,
                    filterFreq: 4000, filterType: 'highpass'
                });
                break;
            }

            // ── AI sounds ─────────────────────────────────────────────────────────

            case 'aiExecute': {
                // 4-note ascending confirm sequence
                [440, 550, 660, 880].forEach((f, i) => {
                    setTimeout(() => {
                        this._osc({
                            type: 'sine', freq: f, vol: 0.18,
                            attack: 0.01, release: 0.08, duration: 0.12
                        });
                    }, i * 55);
                });
                break;
            }

            case 'aiBeep': {
                // Soft single bleep
                this._osc({
                    type: 'sine', freq: 880, vol: 0.09,
                    attack: 0.01, release: 0.06, duration: 0.1
                });
                break;
            }

            case 'aiAlert': {
                // Sharp double-beep for critical AI messages
                this._osc({
                    type: 'square', freq: 1100, vol: 0.16,
                    attack: 0.005, release: 0.05, duration: 0.09
                });
                setTimeout(() => {
                    this._osc({
                        type: 'square', freq: 1100, vol: 0.16,
                        attack: 0.005, release: 0.05, duration: 0.09
                    });
                }, 130);
                break;
            }

            // ── Pickups ───────────────────────────────────────────────────────────

            case 'collectHealth': {
                // Rising arpeggio
                [523, 659, 784, 1047].forEach((f, i) => {
                    setTimeout(() => {
                        this._osc({
                            type: 'triangle', freq: f, vol: 0.2,
                            attack: 0.008, release: 0.1, duration: 0.18
                        });
                    }, i * 60);
                });
                break;
            }

            // ── Hazards ───────────────────────────────────────────────────────────

            case 'radiation': {
                // Geiger-counter clicks (random timing)
                for (let i = 0; i < 5; i++) {
                    setTimeout(() => {
                        this._noise({
                            vol: 0.2, attack: 0.001, duration: 0.04,
                            release: 0.02, filterFreq: 2200, filterType: 'bandpass'
                        });
                    }, i * (28 + Math.random() * 38));
                }
                break;
            }

            case 'death': {
                // Long descending drone + noise wash
                this._osc({
                    type: 'sawtooth', freq: 220, freqEnd: 44, vol: 0.4,
                    attack: 0.04, release: 0.8, duration: 2.2
                });
                this._osc({
                    type: 'sine', freq: 110, freqEnd: 28, vol: 0.35,
                    attack: 0.06, release: 1.0, duration: 2.8
                });
                this._noise({
                    vol: 0.25, attack: 0.01, duration: 1.8,
                    release: 0.8, filterFreq: 600, filterType: 'lowpass'
                });
                break;
            }

            // ── Encounters ────────────────────────────────────────────────────────

            case 'encounterStart': {
                // Tense rising stinger
                this._osc({
                    type: 'triangle', freq: 300, freqEnd: 600, vol: 0.22,
                    attack: 0.02, release: 0.25, duration: 0.55
                });
                this._osc({
                    type: 'sine', freq: 200, freqEnd: 150, vol: 0.14,
                    attack: 0.04, release: 0.4, duration: 0.8
                });
                this._noise({
                    vol: 0.1, attack: 0.01, duration: 0.35,
                    filterFreq: 800, filterType: 'lowpass'
                });
                break;
            }

            case 'encounterChoice': {
                // Soft confirm tick
                this._osc({
                    type: 'sine', freq: 660, vol: 0.14,
                    attack: 0.008, release: 0.1, duration: 0.18
                });
                break;
            }

            // ── Minigames ─────────────────────────────────────────────────────────

            case 'minigameOpen': {
                // Whoosh-in
                this._osc({
                    type: 'sine', freq: 220, freqEnd: 880, vol: 0.18,
                    attack: 0.01, release: 0.15, duration: 0.3
                });
                this._noise({
                    vol: 0.08, attack: 0.005, duration: 0.2,
                    filterFreq: 2000, filterType: 'highpass'
                });
                break;
            }

            case 'minigameCancel': {
                // Descending close
                this._osc({
                    type: 'sine', freq: 500, freqEnd: 200, vol: 0.14,
                    attack: 0.01, release: 0.18, duration: 0.28
                });
                break;
            }

            case 'minigameSuccess': {
                // Victory chord
                [523, 659, 784].forEach((f, i) => {
                    setTimeout(() => {
                        this._osc({
                            type: 'triangle', freq: f, vol: 0.22,
                            attack: 0.01, release: 0.2, duration: 0.35
                        });
                    }, i * 45);
                });
                break;
            }

            case 'minigameFail': {
                // Descending fail tone
                this._osc({
                    type: 'sawtooth', freq: 400, freqEnd: 160, vol: 0.25,
                    attack: 0.01, release: 0.3, duration: 0.55
                });
                this._noise({
                    vol: 0.12, attack: 0.005, duration: 0.3,
                    filterFreq: 600, filterType: 'lowpass'
                });
                break;
            }

            // ── Thrust ────────────────────────────────────────────────────────────

            case 'thrustOn': {
                this._osc({
                    type: 'sine', freq: 90, freqEnd: 140, vol: 0.12,
                    attack: 0.08, release: 0.1, duration: 0.35
                });
                this.startThrust();
                break;
            }

            case 'thrustOff': {
                this.stopThrust();
                this._osc({
                    type: 'sine', freq: 140, freqEnd: 60, vol: 0.1,
                    attack: 0.01, release: 0.2, duration: 0.3
                });
                break;
            }

            default:
                break;
        }
    }

    /**
     * Call every game frame to manage looping critical alarms.
     * Starts the correct alarm loop based on the most urgent threat,
     * and stops it when the threat clears.
     */
    updateAlarms(hull, oxygen, temp) {
        if (!this._enabled || !this._ctx) return;

        if (hull < 20) {
            this._startAlarm('hull');
        } else if (oxygen < 20) {
            this._startAlarm('oxygen');
        } else if (temp > 100) {
            this._startAlarm('heat');
        } else {
            if (this._alarmType) this._stopAlarm();
        }
    }

    /** Clean up all audio nodes. Call when the game ends. */
    destroy() {
        this.stopThrust();
        this._stopAlarm();
        if (this._ambience) {
            try { this._ambience.disconnect(); } catch (_) { }
            this._ambience = null;
        }
        if (this._ctx) {
            try { this._ctx.close(); } catch (_) { }
            this._ctx = null;
        }
    }
}
