export class AI {
  constructor() {
    this.history = [];   // { msg, col, age }
    this.cooldown = 0;
    this.lastRecommendation = null;
  }

  // Score each danger and choose the biggest one
  getRecommendation(temp, hull, humidity) {
    const heatScore = temp >= 55 ? (temp - 55) * 1.6 : 0;
    const hullScore = hull <= 75 ? (75 - hull) * 2.2 : 0;
    const humidityScore = humidity >= 55 ? (humidity - 55) * 1.3 : 0;

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
  update(dt, frame, temp, hull, humidity, aiCooldown) {
    for (const h of this.history) {
      h.age++;
    }

    const rec = this.getRecommendation(temp, hull, humidity);
    this.lastRecommendation = rec;

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
  execute(temp, hull, humidity, aiCooldown) {
    if (aiCooldown > 0) return null;

    const rec = this.getRecommendation(temp, hull, humidity);
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

    this.push('NO ACTION NEEDED — SYSTEMS STABLE', '#00ffcc');
    return { action: 'none', cooldown: 100 };
  }

  push(msg, col = '#00ffcc') {
    this.history.unshift({ msg, col, age: 0 });
    if (this.history.length > 7) this.history.pop();
  }
}