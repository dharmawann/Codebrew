import { Game } from './game.js';
const canvas = document.getElementById('c');
const sc = document.getElementById('sc');
let G = null;
let raf = null;
let lastAiMode = true;

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  sc.width = window.innerWidth;
  sc.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

window.startGame = function (aiMode) {
  lastAiMode = aiMode;
  if (raf) { cancelAnimationFrame(raf); raf = null; }
  document.getElementById('splash').style.display = 'none';
  document.getElementById('gameover').style.display = 'none';
  G = new Game(canvas, aiMode);
  let last = performance.now();
  (function loop(ts) {
    const dt = Math.min(50, ts - last); last = ts;
    G.update(dt / 16.67);
    G.render();
    if (G.alive) raf = requestAnimationFrame(loop);
    else endGame();
  })(performance.now());
};

window.retryGame = function () {
  window.startGame(lastAiMode);
};

window.showSplash = function () {
  if (raf) { cancelAnimationFrame(raf); raf = null; }
  G = null;
  document.getElementById('splash').style.display = 'flex';
  document.getElementById('gameover').style.display = 'none';
  G = new Game(canvas, false);
  G.animateSplash(sc);
};

function endGame() {
  const t = G.survivalTime;
  const m = Math.floor(t / 60).toString().padStart(2, '0');
  const s = Math.floor(t % 60).toString().padStart(2, '0');
  const ms = Math.floor((t * 100) % 100).toString().padStart(2, '0');
  document.getElementById('finalTime').textContent = `${m}:${s}.${ms}`;
  document.getElementById('finalMode').textContent = G.aiMode ? 'AI ASSIST MODE' : 'MANUAL PILOT MODE';
  document.getElementById('gameover').style.display = 'flex';
}

window.showSplash();