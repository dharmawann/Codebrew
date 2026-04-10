export class AI {
  constructor() {
    this.history  = [];   // { msg, col, age }
    this.cooldown = 0;
  }

  // Called every frame to age messages and fire periodic warnings
  update(dt, frame, temp, hull, humidity, aiCooldown) {
    for (const h of this.history) h.age++;

    if (frame % 200 !== 0) return;
    if (temp > 82 && aiCooldown <= 0)
      this.push('CRITICAL HEAT — PRESS E TO VENT', '#ff4400');
    else if (hull < 40 && aiCooldown <= 0)
      this.push('HULL CRITICAL — PRESS E FOR SHIELD', '#ff4400');
    else if (humidity > 74 && aiCooldown <= 0)
      this.push('HUMIDITY HAZARD — PRESS E TO PURGE', '#ffaa00');
    else if (hull > 75 && temp < 55)
      this.push('ALL SYSTEMS NOMINAL', '#00ffcc');
  }

  // Returns { action, cooldown } so Game can apply the side-effects
  execute(temp, hull, humidity, aiCooldown) {
    if (aiCooldown > 0) return null;

    if (temp > 75) {
      this.push('COOLING VENTS ENGAGED — TEMP REDUCING', '#00ffcc');
      return { action: 'cool', cooldown: 440 };
    }
    if (hull < 60) {
      this.push('SHIELD MATRIX ACTIVE — HULL PROTECTED', '#00ccff');
      return { action: 'shield', cooldown: 520 };
    }
    if (humidity > 70) {
      this.push('DEHUMIDIFIER ACTIVATED — VISION CLEARING', '#00ffcc');
      return { action: 'dehumidify', cooldown: 320 };
    }
    this.push('ALL SYSTEMS NOMINAL — NO ACTION NEEDED', '#00ffcc');
    return { action: 'none', cooldown: 100 };
  }

  push(msg, col = '#00ffcc') {
    this.history.unshift({ msg, col, age: 0 });
    if (this.history.length > 7) this.history.pop();
  }
}
