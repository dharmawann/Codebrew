export class AI {
  constructor() {
    this.history = [];   // { msg, col, age }
    this.cooldown = 0;
    this.lastRecommendation = null;
  }

  getRecommendation(temp, hull, humidity, oxygen, radiation, burnTimer, speed) {

    // --- Predict future (next ~3 seconds) ---
    const futureTemp = temp + speed * 6 + (burnTimer > 0 ? 12 : 0);
    const futureOxygen = oxygen - (futureTemp > 90 ? 8 : 3);
    const futureRadiation = radiation + (temp > 95 ? 6 : 1);

    // --- Risk calculations ---
    const risks = {
      heat: Math.max(0, futureTemp - 90) * 2.5,
      hull: Math.max(0, 60 - hull) * 3,
      oxygen: Math.max(0, 40 - futureOxygen) * 3.2,
      radiation: Math.max(0, futureRadiation - 65) * 2.8,
      burn: burnTimer > 0 ? 25 : 0,
      humidity: Math.max(0, humidity - 70) * 0.5
    };

    // --- Evaluate actions (damage prevented) ---
    const actions = [
      {
        type: 'cool',
        score: risks.heat + risks.oxygen * 0.6 + risks.radiation * 0.4,
        msg: 'PREDICTIVE COOLING REQUIRED — PRESS T',
        color: '#ff8800'
      },
      {
        type: 'shield',
        score: risks.hull + risks.burn * 1.5,
        msg: 'STRUCTURAL FAILURE RISK — PRESS R',
        color: '#ff4400'
      },
      {
        type: 'oxygen',
        score: risks.oxygen * 1.8,
        msg: 'HYPOXIA IMMINENT — PRESS E',
        color: '#66ccff'
      },
      {
        type: 'radiation',
        score: risks.radiation * 1.6,
        msg: 'RADIATION CASCADE — PRESS E',
        color: '#ccff33'
      },
      {
        type: 'dehumidify',
        score: risks.humidity,
        msg: 'VISUAL OBSTRUCTION — PRESS F',
        color: '#ffaa00'
      }
    ];

    // --- Choose best ---
    actions.sort((a, b) => b.score - a.score);
    const best = actions[0];

    if (!best || best.score < 10) {
      return {
        type: 'stable',
        action: 'none',
        msg: 'SYSTEMS STABLE — MONITORING',
        color: '#00ffcc'
      };
    }

    return best;
  }

  // Returns all threat scores for the HUD threat pill display
  getThreatScores(temp, hull, humidity, oxygen, radiation) {
    return {
      heat: temp >= 55 ? (temp - 55) * 1.6 : 0,
      hull: hull <= 75 ? (75 - hull) * 2.2 : 0,
      humidity: humidity >= 55 ? (humidity - 55) * 1.3 : 0,
      oxygen: oxygen <= 60 ? (60 - oxygen) * 2.0 : 0,
      radiation: radiation >= 35 ? (radiation - 35) * 1.8 : 0,
    };
  }

  update(dt, frame, temp, hull, humidity, oxygen, radiation, aiCooldown, encounterActive) {
    for (const h of this.history) h.age++;

    const rec = this.getRecommendation(temp, hull, humidity, oxygen, radiation, this.burnTimer, this.speed);
    this.lastRecommendation = rec;

    if (encounterActive) return;
    if (frame % 120 !== 0) return;

    if (aiCooldown <= 0) {
      this.push(rec.msg, rec.color);
    } else {
      if (rec.type === 'stable') {
        this.push('AI RECHARGING — SYSTEMS STABLE', '#00ccaa');
      }
    }
  }

  execute(temp, hull, humidity, oxygen, radiation, aiCooldown) {
    if (aiCooldown > 0) return null;
    const rec = this.getRecommendation(temp, hull, humidity, oxygen, radiation, this.burnTimer, this.speed);
    this.lastRecommendation = rec;

    if (rec.action === 'cool') {
      this.push('AI EXECUTED COOLING VENTS', '#00ffcc');
      return { action: 'cool', cooldown: 440 };
    }
    if (rec.action === 'shield') {
      this.push('AI EXECUTED SHIELD MATRIX', '#00ccff');
      return { action: 'shield', cooldown: 520 };
    }
    if (rec.action === 'dehumidify') {
      this.push('AI EXECUTED DEHUMIDIFIER', '#00ffcc');
      return { action: 'dehumidify', cooldown: 320 };
    }
    if (rec.action === 'oxygen') {
      this.push('AI EXECUTED LIFE SUPPORT BOOST', '#66ccff');
      return { action: 'oxygen', cooldown: 420 };
    }
    if (rec.action === 'radiation') {
      this.push('AI EXECUTED RADIATION PURGE', '#ccff33');
      return { action: 'radiation', cooldown: 460 };
    }

    this.push('NO ACTION NEEDED — SYSTEMS STABLE', '#00ffcc');
    return { action: 'none', cooldown: 100 };
  }

  push(msg, col = '#00ffcc') {
    this.history.unshift({ msg, col, age: 0 });
    if (this.history.length > 7) this.history.pop();
  }
}