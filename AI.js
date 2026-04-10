export class AI {
  constructor() {
    this.history = [];   // { msg, col, age }
    this.cooldown = 0;
    this.lastRecommendation = null;
  }

  // Score each danger and choose the biggest one
  getRecommendation(temp, hull, humidity, oxygen, radiation) {
    const heatScore = temp >= 55 ? (temp - 55) * 1.6 : 0;
    const hullScore = hull <= 75 ? (75 - hull) * 2.2 : 0;
    const humidityScore = humidity >= 55 ? (humidity - 55) * 1.3 : 0;

    const oxygenScore = oxygen <= 60 ? (60 - oxygen) * 2.0 : 0;
    const radiationScore = radiation >= 35 ? (radiation - 35) * 1.8 : 0;

    const options = [
      {
        type: 'heat',
        score: heatScore,
        action: 'cool',
        msg: 'THERMAL LOAD RISING — COOLING RECOMMENDED',
        color: '#ff8800'
      },
      {
        type: 'hull',
        score: hullScore,
        action: 'shield',
        msg: 'HULL INTEGRITY DROPPING — SHIELD PRIORITY',
        color: '#ff4400'
      },
      {
        type: 'humidity',
        score: humidityScore,
        action: 'dehumidify',
        msg: 'CONDENSATION RISK DETECTED — PURGE RECOMMENDED',
        color: '#ffaa00'
      },
      {
        type: 'oxygen',
        score: oxygenScore,
        action: 'oxygen',
        msg: 'OXYGEN RESERVE FALLING — LIFE SUPPORT RECOMMENDED',
        color: '#66ccff'
      },
      {
        type: 'radiation',
        score: radiationScore,
        action: 'radiation',
        msg: 'RADIATION BUILDUP DETECTED — PURGE RECOMMENDED',
        color: '#ccff33'
      }
    ];

    options.sort((a, b) => b.score - a.score);
    const top = options[0];

    // if all threats are low, return stable
    if (!top || top.score < 8) {
      return {
        type: 'stable',
        score: 0,
        action: 'none',
        msg: 'ALL SYSTEMS NOMINAL',
        color: '#00ffcc'
      };
    }

    return top;
  }

  // Called every frame
  update(dt, frame, temp, hull, humidity, oxygen, radiation, aiCooldown, encounterActive) {
    for (const h of this.history) {
      h.age++;
    }

    const rec = this.getRecommendation(temp, hull, humidity, oxygen, radiation);
    this.lastRecommendation = rec;

    // Don't interrupt alien decision prompts
    if (encounterActive) return;

    // only speak every so often so it doesn't spam
    if (frame % 120 !== 0) return;

    if (aiCooldown <= 0) {
      this.push(rec.msg, rec.color);
    } else {
      // still update internal recommendation, but reduce spam while recharging
      if (rec.type === 'stable') {
        this.push('AI RECHARGING — SYSTEMS STABLE', '#00ccaa');
      }
    }
  }

  // Execute best action based on current recommendation
  execute(temp, hull, humidity, oxygen, radiation, aiCooldown) {
    if (aiCooldown > 0) return null;

    const rec = this.getRecommendation(temp, hull, humidity, oxygen, radiation);
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