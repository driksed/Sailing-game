const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const ui = Object.fromEntries([
  'intro', 'startButton', 'restartButton', 'finishPanel', 'finishTime', 'finishResult',
  'timer', 'phaseLabel', 'message', 'legCounter', 'windSpeed', 'windDirection',
  'boatSpeed', 'heading', 'windAngle', 'sailingMode', 'efficiency', 'efficiencyBar',
  'sailingTip', 'markDistance', 'markName', 'markBearing', 'bestTime', 'windArrow',
  'tackButton'
].map(id => [id, document.getElementById(id)]));

const WORLD = { width: 1200, height: 920 };
const startLine = { y: 760, left: 430, right: 710 };
const marks = [
  { x: 550, y: 175, name: 'BOUÉE AU VENT', color: '#ff6b35' },
  { x: 955, y: 440, name: 'BOUÉE DE LARGUE', color: '#d7f25c' }
];
const keys = { left: false, right: false };
let view = { scale: 1, x: 0, y: 0, dpr: 1 };
let lastFrame = performance.now();
let flashTimeout;

const game = {
  state: 'idle',
  elapsed: 0,
  countdown: 5,
  leg: 0,
  started: false,
  penalty: 0,
  windFrom: 4,
  windSpeed: 12,
  gustClock: 0,
  boat: { x: 570, y: 850, heading: 320, speed: 0, heel: 0, wake: [] },
  tackTarget: null,
  previousY: 850
};

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function rad(degrees) { return degrees * Math.PI / 180; }
function normalize(angle) { return (angle % 360 + 360) % 360; }
function signedAngle(angle) { return ((angle + 180) % 360 + 360) % 360 - 180; }
function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function bearing(from, to) { return normalize(Math.atan2(to.x - from.x, from.y - to.y) * 180 / Math.PI); }

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds - mins * 60;
  return `${String(mins).padStart(2, '0')}:${secs.toFixed(1).padStart(4, '0')}`;
}

function getBest() {
  try { return Number(localStorage.getItem('ecume-best')) || 0; } catch { return 0; }
}

function setBest(value) {
  try { localStorage.setItem('ecume-best', String(value)); } catch { /* Storage can be disabled. */ }
}

function resetGame() {
  Object.assign(game, {
    state: 'countdown', elapsed: 0, countdown: 5, leg: 0, started: false, penalty: 0,
    windFrom: 4, windSpeed: 12, gustClock: 0, tackTarget: null, previousY: 850
  });
  Object.assign(game.boat, { x: 570, y: 850, heading: 320, speed: 0, heel: 0, wake: [] });
  ui.finishPanel.classList.add('hidden');
  flash('5', 900);
}

function startGame() {
  ui.intro.classList.add('hidden');
  resetGame();
}

function flash(text, duration = 1200) {
  clearTimeout(flashTimeout);
  ui.message.textContent = text;
  ui.message.classList.add('visible');
  flashTimeout = setTimeout(() => ui.message.classList.remove('visible'), duration);
}

function polarEfficiency(angle) {
  angle = Math.abs(angle);
  if (angle < 35) return 0.08;
  if (angle < 50) return 0.48 + (angle - 35) / 15 * 0.27;
  if (angle < 90) return 0.75 + (angle - 50) / 40 * 0.22;
  if (angle < 120) return 0.97 + (angle - 90) / 30 * 0.03;
  if (angle < 155) return 1 - (angle - 120) / 35 * 0.16;
  return 0.84 - (angle - 155) / 25 * 0.12;
}

function sailingMode(angle) {
  angle = Math.abs(angle);
  if (angle < 35) return ['FACE AU VENT', 'Écarte-toi du vent pour gonfler les voiles.'];
  if (angle < 55) return ['PRÈS SERRÉ', 'Bonne remontée au vent. Surveille ta vitesse.'];
  if (angle < 85) return ['BON PLEIN', 'Un compromis efficace entre cap et vitesse.'];
  if (angle < 120) return ['TRAVERS', 'Allure rapide : les voiles donnent leur plein rendement.'];
  if (angle < 160) return ['LARGUE', 'Très rapide, mais tu t’éloignes du vent.'];
  return ['VENT ARRIÈRE', 'Stable mais moins rapide que le grand largue.'];
}

function triggerTack() {
  if (!['countdown', 'racing'].includes(game.state) || game.tackTarget !== null) return;
  const side = signedAngle(game.boat.heading - game.windFrom) >= 0 ? 1 : -1;
  game.tackTarget = normalize(game.windFrom - side * 45);
  flash('VIREMENT', 650);
}

function update(dt) {
  if (!['countdown', 'racing'].includes(game.state)) return;

  game.gustClock += dt;
  game.windFrom = 4 + Math.sin(game.gustClock * 0.11) * 7 + Math.sin(game.gustClock * 0.037) * 3;
  game.windSpeed = 12 + Math.sin(game.gustClock * 0.3) * 1.15 + Math.sin(game.gustClock * 0.07) * .65;

  if (game.state === 'countdown') {
    const old = Math.ceil(game.countdown);
    game.countdown -= dt;
    const current = Math.ceil(game.countdown);
    if (current !== old && current > 0) flash(String(current), 800);
    if (game.countdown <= 0) {
      game.state = 'racing';
      flash('PARTEZ !', 1100);
    }
  } else if (game.started) {
    game.elapsed += dt;
  }

  let turn = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  const oldWindSide = Math.sign(signedAngle(game.boat.heading - game.windFrom));

  if (game.tackTarget !== null) {
    const delta = signedAngle(game.tackTarget - game.boat.heading);
    if (Math.abs(delta) < 2.5) {
      game.boat.heading = game.tackTarget;
      game.tackTarget = null;
    } else {
      turn = Math.sign(delta);
    }
  }

  const turnRate = 38 * (.45 + clamp(game.boat.speed / 5, 0, 1) * .55);
  game.boat.heading = normalize(game.boat.heading + turn * turnRate * dt);
  const windAngle = signedAngle(game.boat.heading - game.windFrom);
  const newWindSide = Math.sign(windAngle);
  const efficiency = polarEfficiency(windAngle);
  let targetSpeed = game.windSpeed * .56 * efficiency;
  if (oldWindSide !== newWindSide && Math.abs(windAngle) < 50) game.boat.speed *= .68;
  if (game.tackTarget !== null && Math.abs(windAngle) < 35) targetSpeed *= .4;

  const acceleration = targetSpeed > game.boat.speed ? .55 : 1.15;
  game.boat.speed += (targetSpeed - game.boat.speed) * acceleration * dt;
  game.boat.heel += ((Math.sin(rad(windAngle)) * efficiency * 12) - game.boat.heel) * dt * 2;

  game.previousY = game.boat.y;
  const movement = game.boat.speed * 7.2 * dt;
  game.boat.x += Math.sin(rad(game.boat.heading)) * movement;
  game.boat.y -= Math.cos(rad(game.boat.heading)) * movement;
  const drift = Math.max(0, Math.cos(rad(windAngle))) * .8 * dt;
  game.boat.x -= Math.sin(rad(game.windFrom)) * drift;
  game.boat.y += Math.cos(rad(game.windFrom)) * drift;
  game.boat.x = clamp(game.boat.x, 40, WORLD.width - 40);
  game.boat.y = clamp(game.boat.y, 40, WORLD.height - 40);

  if (game.boat.speed > .8) {
    game.boat.wake.unshift({ x: game.boat.x, y: game.boat.y, life: 1 });
    if (game.boat.wake.length > 45) game.boat.wake.pop();
  }
  game.boat.wake.forEach(point => point.life -= dt * .5);

  checkCourse();
}

function checkCourse() {
  const b = game.boat;
  const inGate = b.x > startLine.left && b.x < startLine.right;

  if (!game.started && game.previousY > startLine.y && b.y <= startLine.y && inGate) {
    if (game.state === 'countdown') {
      game.penalty += 5;
      b.y = startLine.y + 8;
      b.speed *= .35;
      flash('FAUX DÉPART · +5 S', 1500);
    } else {
      game.started = true;
      game.leg = 1;
      flash('DÉPART VALIDÉ', 1000);
    }
  }

  if (game.started && game.leg === 1 && distance(b, marks[0]) < 58) {
    game.leg = 2;
    flash('BOUÉE 1 VALIDÉE', 1100);
  } else if (game.started && game.leg === 2 && distance(b, marks[1]) < 58) {
    game.leg = 3;
    flash('CAP SUR L’ARRIVÉE', 1100);
  } else if (game.started && game.leg === 3 && game.previousY < startLine.y && b.y >= startLine.y && inGate) {
    finishRace();
  }
}

function finishRace() {
  game.state = 'finished';
  const finalTime = game.elapsed + game.penalty;
  const previousBest = getBest();
  const isRecord = !previousBest || finalTime < previousBest;
  if (isRecord) setBest(finalTime);
  ui.finishTime.textContent = formatTime(finalTime);
  ui.finishResult.textContent = isRecord ? 'Nouveau meilleur temps. La baie est à toi.' : `À ${formatTime(finalTime - previousBest)} du meilleur temps.`;
  ui.finishPanel.classList.remove('hidden');
}

function resize() {
  const rect = canvas.getBoundingClientRect();
  view.dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * view.dpr);
  canvas.height = Math.round(rect.height * view.dpr);
  const padding = rect.width < 600 ? 22 : 45;
  view.scale = Math.min((rect.width - padding * 2) / WORLD.width, (rect.height - padding * 2) / WORLD.height);
  view.x = (rect.width - WORLD.width * view.scale) / 2;
  view.y = (rect.height - WORLD.height * view.scale) / 2;
}

function worldTransform() {
  ctx.setTransform(view.dpr * view.scale, 0, 0, view.dpr * view.scale, view.dpr * view.x, view.dpr * view.y);
}

function drawSea(time) {
  const width = canvas.width / view.dpr;
  const height = canvas.height / view.dpr;
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#147b82');
  gradient.addColorStop(1, '#074a58');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = 'rgba(224,244,237,.08)';
  ctx.lineWidth = 1;
  const spacing = 42;
  const offset = (time * .008) % spacing;
  for (let y = offset; y < height; y += spacing) {
    ctx.beginPath();
    for (let x = -20; x < width + 20; x += 20) {
      const waveY = y + Math.sin(x * .025 + time * .0004) * 4;
      x === -20 ? ctx.moveTo(x, waveY) : ctx.lineTo(x, waveY);
    }
    ctx.stroke();
  }
}

function drawCourse() {
  worldTransform();
  ctx.lineWidth = 3 / view.scale;
  ctx.setLineDash([10 / view.scale, 9 / view.scale]);
  ctx.strokeStyle = 'rgba(238,238,226,.32)';
  ctx.beginPath();
  ctx.moveTo((startLine.left + startLine.right) / 2, startLine.y);
  ctx.lineTo(marks[0].x, marks[0].y);
  ctx.lineTo(marks[1].x, marks[1].y);
  ctx.lineTo((startLine.left + startLine.right) / 2, startLine.y);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = '#f0eee6';
  ctx.lineWidth = 4 / view.scale;
  ctx.beginPath(); ctx.moveTo(startLine.left, startLine.y); ctx.lineTo(startLine.right, startLine.y); ctx.stroke();
  drawPin(startLine.left, startLine.y, '#f0eee6');
  drawPin(startLine.right, startLine.y, '#f0eee6');

  marks.forEach((mark, index) => {
    const active = game.leg === index + 1;
    if (active) {
      ctx.strokeStyle = mark.color;
      ctx.lineWidth = 2 / view.scale;
      ctx.globalAlpha = .65;
      ctx.beginPath(); ctx.arc(mark.x, mark.y, 72 + Math.sin(performance.now() * .004) * 7, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    drawPin(mark.x, mark.y, mark.color);
    ctx.fillStyle = 'rgba(7,29,38,.75)';
    ctx.font = `700 ${14 / view.scale}px Manrope`;
    ctx.textAlign = 'center';
    ctx.fillText(String(index + 1).padStart(2, '0'), mark.x, mark.y - 38 / view.scale);
  });
}

function drawPin(x, y, color) {
  const size = 11 / view.scale;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(7,29,38,.65)'; ctx.lineWidth = 3 / view.scale; ctx.stroke();
}

function drawWindField() {
  worldTransform();
  const angle = rad(game.windFrom);
  ctx.strokeStyle = 'rgba(240,238,230,.15)';
  ctx.fillStyle = 'rgba(240,238,230,.15)';
  ctx.lineWidth = 1.5 / view.scale;
  for (let y = 110; y < WORLD.height; y += 165) {
    for (let x = 110; x < WORLD.width; x += 190) {
      const dx = Math.sin(angle) * 20 / view.scale;
      const dy = -Math.cos(angle) * 20 / view.scale;
      ctx.beginPath(); ctx.moveTo(x - dx, y - dy); ctx.lineTo(x + dx, y + dy); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + dx, y + dy, 2 / view.scale, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function drawBoat() {
  worldTransform();
  const b = game.boat;
  ctx.lineCap = 'round';
  b.wake.forEach((point, index) => {
    if (point.life <= 0) return;
    ctx.globalAlpha = Math.max(0, point.life) * .22;
    ctx.fillStyle = '#eaf5eb';
    ctx.beginPath(); ctx.arc(point.x, point.y, (2 + index * .07) / view.scale, 0, Math.PI * 2); ctx.fill();
  });
  ctx.globalAlpha = 1;
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(rad(b.heading));
  const s = 1 / view.scale;
  ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 12 * s; ctx.shadowOffsetY = 7 * s;
  ctx.fillStyle = '#f0eee6';
  ctx.beginPath();
  ctx.moveTo(0, -22 * s); ctx.bezierCurveTo(11 * s, -7 * s, 10 * s, 15 * s, 0, 23 * s); ctx.bezierCurveTo(-10 * s, 15 * s, -11 * s, -7 * s, 0, -22 * s); ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#ff6b35'; ctx.lineWidth = 2 * s;
  ctx.beginPath(); ctx.moveTo(0, -13 * s); ctx.lineTo(0, 14 * s); ctx.stroke();
  ctx.fillStyle = '#0b6672'; ctx.beginPath(); ctx.arc(0, 8 * s, 3 * s, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function nextTarget() {
  if (!game.started) return { x: 570, y: startLine.y, name: 'LIGNE DE DÉPART' };
  if (game.leg === 1) return marks[0];
  if (game.leg === 2) return marks[1];
  return { x: 570, y: startLine.y, name: 'LIGNE D’ARRIVÉE' };
}

function updateUI() {
  const angle = signedAngle(game.boat.heading - game.windFrom);
  const efficiency = polarEfficiency(angle);
  const mode = sailingMode(angle);
  const target = nextTarget();
  const best = getBest();
  const displayedTime = game.elapsed + game.penalty;

  ui.timer.textContent = formatTime(displayedTime);
  ui.phaseLabel.textContent = game.state === 'countdown' ? `DÉPART · ${Math.max(0, Math.ceil(game.countdown))}` : game.state === 'racing' ? (game.started ? 'EN COURSE' : 'LIGNE OUVERTE') : game.state === 'finished' ? 'TERMINÉ' : 'EN ATTENTE';
  ui.legCounter.textContent = `${game.started ? 'PARCOURS' : 'DÉPART'} · ${Math.max(0, game.leg - 1)}/2`;
  ui.windSpeed.textContent = game.windSpeed.toFixed(1);
  ui.windDirection.textContent = `N · ${String(Math.round(normalize(game.windFrom))).padStart(3, '0')}°`;
  ui.boatSpeed.textContent = game.boat.speed.toFixed(1);
  ui.heading.textContent = String(Math.round(game.boat.heading) % 360).padStart(3, '0');
  ui.windAngle.textContent = String(Math.round(Math.abs(angle)));
  ui.sailingMode.textContent = mode[0];
  ui.sailingTip.textContent = mode[1];
  ui.efficiency.textContent = `${Math.round(efficiency * 100)}%`;
  ui.efficiencyBar.style.width = `${efficiency * 100}%`;
  ui.efficiencyBar.style.background = efficiency < .3 ? '#ff6b35' : '#d7f25c';
  ui.markName.textContent = target.name;
  ui.markDistance.textContent = `${(distance(game.boat, target) / 475).toFixed(1)} NM`;
  ui.markBearing.textContent = `Relèvement ${String(Math.round(bearing(game.boat, target))).padStart(3, '0')}°`;
  ui.bestTime.textContent = best ? formatTime(best) : '—';
  ui.windArrow.style.transform = `rotate(${signedAngle(game.windFrom - game.boat.heading)}deg)`;
}

function render(time) {
  drawSea(time);
  drawWindField();
  drawCourse();
  drawBoat();
}

function frame(time) {
  const dt = Math.min((time - lastFrame) / 1000, .05);
  lastFrame = time;
  update(dt);
  updateUI();
  render(time);
  requestAnimationFrame(frame);
}

function setTurn(direction, active) {
  if (direction < 0) keys.left = active;
  if (direction > 0) keys.right = active;
  if (active) game.tackTarget = null;
}

window.addEventListener('keydown', event => {
  if (['ArrowLeft', 'a', 'A'].includes(event.key)) { event.preventDefault(); setTurn(-1, true); }
  if (['ArrowRight', 'd', 'D'].includes(event.key)) { event.preventDefault(); setTurn(1, true); }
  if (event.code === 'Space') { event.preventDefault(); triggerTack(); }
});
window.addEventListener('keyup', event => {
  if (['ArrowLeft', 'a', 'A'].includes(event.key)) setTurn(-1, false);
  if (['ArrowRight', 'd', 'D'].includes(event.key)) setTurn(1, false);
});
window.addEventListener('resize', resize);
ui.startButton.addEventListener('click', startGame);
ui.restartButton.addEventListener('click', resetGame);
ui.tackButton.addEventListener('click', triggerTack);
document.querySelectorAll('[data-turn]').forEach(button => {
  const direction = Number(button.dataset.turn);
  button.addEventListener('pointerdown', event => { event.preventDefault(); button.setPointerCapture(event.pointerId); setTurn(direction, true); });
  button.addEventListener('pointerup', () => setTurn(direction, false));
  button.addEventListener('pointercancel', () => setTurn(direction, false));
});

resize();
updateUI();
requestAnimationFrame(frame);
