const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const ui = Object.fromEntries([
  'intro', 'startButton', 'restartButton', 'homeButton', 'finishPanel', 'finishTime',
  'finishResult', 'results', 'timer', 'phaseLabel', 'message', 'fleetChoice', 'courseMeta',
  'courseDescription', 'keyHint', 'fullscreenButton', 'tackButton', 'rightTackButton', 'leftHud', 'rightHud', 'bannerCourse',
  'bannerLeg', 'bannerWindDirection', 'topThree', 'pauseButton',
  'pausePanel', 'resumeButton', 'pauseRestartButton', 'pauseHomeButton',
  'windCompass', 'compassWindArrow', 'compassWindSpeed', 'gustLabel',
  'rotatePrompt', 'leftHudToggle', 'rightHudToggle', 'leftTableTime', 'leftTableWind',
  'rightTableTime', 'rightTableWind', 'leftPenaltyValue', 'rightPenalty', 'rightPenaltyValue',
  'leftRank', 'leftSpeed', 'leftHeading', 'leftWindAngle', 'leftMode', 'leftMark',
  'leftDistance', 'leftBearing', 'leftEfficiency', 'leftEfficiencyBar', 'leftPower',
  'leftMainStatus', 'leftJibStatus', 'leftSpiStatus',
  'rightRank', 'rightSpeed', 'rightHeading', 'rightWindAngle', 'rightMode', 'rightMark',
  'rightDistance', 'rightBearing', 'rightEfficiency', 'rightEfficiencyBar', 'rightPower',
  'rightMainStatus', 'rightJibStatus', 'rightSpiStatus'
].map(id => [id, document.getElementById(id)]));

const WORLD = { width: 1200, height: 920 };
const COURSES = {
  triangle: {
    name: 'Triangle de Quiberon', meta: 'BAIE DE QUIBERON · 3,2 NM',
    description: 'Un triangle équilibré : près, grand largue puis retour rapide vers la ligne.',
    windFrom: 4, windSpeed: 12, start: { a: { x: 430, y: 760 }, b: { x: 710, y: 760 } },
    finish: { a: { x: 430, y: 760 }, b: { x: 710, y: 760 } },
    spawn: { x: 570, y: 850, heading: 320 },
    marks: [
      { x: 550, y: 175, name: 'BOUÉE AU VENT', color: '#ff6b35' },
      { x: 955, y: 440, name: 'BOUÉE DE LARGUE', color: '#d7f25c' }
    ]
  },
  olympic: {
    name: 'Banane olympique', meta: 'RADE DE LORIENT · 4,1 NM',
    description: 'Deux remontées au vent et une longue descente où le choix du spi fera la différence.',
    windFrom: 0, windSpeed: 13, start: { a: { x: 390, y: 790 }, b: { x: 730, y: 790 } },
    finish: { a: { x: 390, y: 810 }, b: { x: 730, y: 810 } },
    spawn: { x: 560, y: 875, heading: 318 },
    marks: [
      { x: 540, y: 150, name: 'MARQUE AU VENT', roundingDir: -1 },
      { x: 565, y: 680, name: 'MARQUE SOUS LE VENT', roundingDir: -1 },
      { x: 540, y: 150, name: 'SECOND PASSAGE AU VENT', roundingDir: -1 }
    ]
  },
  coastal: {
    name: 'Raid côtier', meta: 'ARCHIPEL DES GLÉNAN · 5,8 NM',
    description: 'Cinq marques, des changements d’allure constants et peu de temps pour préparer les manœuvres.',
    windFrom: 338, windSpeed: 11, start: { a: { x: 310, y: 805 }, b: { x: 650, y: 805 } },
    finish: { a: { x: 640, y: 820 }, b: { x: 930, y: 820 } },
    spawn: { x: 480, y: 880, heading: 300 },
    marks: [
      { x: 205, y: 535, name: 'POINTE OUEST', color: '#ff6b35' },
      { x: 415, y: 165, name: 'BALISE DU LARGE', color: '#d7f25c' },
      { x: 880, y: 205, name: 'ÎLOT NORD', color: '#ff6b35' },
      { x: 1030, y: 530, name: 'CARDINALE EST', color: '#d7f25c' },
      { x: 760, y: 690, name: 'DERNIÈRE MARQUE', color: '#ff6b35' }
    ]
  },
  sprint: {
    name: 'Sprint de la Teignouse', meta: 'PASSE DE LA TEIGNOUSE · 2,4 NM',
    description: 'Un parcours court dans 17 nœuds : départ décisif, vitesse élevée et marques rapprochées.',
    windFrom: 24, windSpeed: 17, start: { a: { x: 390, y: 785 }, b: { x: 720, y: 785 } },
    finish: { a: { x: 520, y: 805 }, b: { x: 840, y: 805 } },
    spawn: { x: 555, y: 875, heading: 340 },
    marks: [
      { x: 390, y: 265, name: 'MARQUE DE PRÈS', color: '#ff6b35' },
      { x: 910, y: 385, name: 'MARQUE DE VITESSE', color: '#d7f25c' },
      { x: 650, y: 665, name: 'BOUÉE SPRINT', color: '#ff6b35' }
    ]
  }
};

// Loop courses use the same gate in both directions; the coastal raid is point-to-point.
COURSES.triangle.finish = COURSES.triangle.start;
COURSES.olympic.finish = COURSES.olympic.start;
COURSES.sprint.finish = COURSES.sprint.start;

function prepareCourses() {
  Object.values(COURSES).forEach(course => {
    const start = { x: (course.start.a.x + course.start.b.x) / 2, y: (course.start.a.y + course.start.b.y) / 2 };
    const finish = { x: (course.finish.a.x + course.finish.b.x) / 2, y: (course.finish.a.y + course.finish.b.y) / 2 };
    course.marks.forEach((mark, index) => {
      const previous = index === 0 ? start : course.marks[index - 1];
      const next = index === course.marks.length - 1 ? finish : course.marks[index + 1];
      const incomingLength = distance(previous, mark);
      const outgoingLength = distance(mark, next);
      mark.incoming = { x: (mark.x - previous.x) / incomingLength, y: (mark.y - previous.y) / incomingLength };
      mark.outgoing = { x: (next.x - mark.x) / outgoingLength, y: (next.y - mark.y) / outgoingLength };
      const cross = mark.incoming.x * mark.outgoing.y - mark.incoming.y * mark.outgoing.x;
      if (mark.roundingDir === undefined) mark.roundingDir = cross >= 0 ? 1 : -1;
      mark.roundingSide = mark.roundingDir > 0 ? 'TRIBORD' : 'BÂBORD';
    });
  });
}

prepareCourses();

const DIFFICULTIES = {
  easy: { count: 3, speed: .88, reaction: 1.25, error: 11, sailDelay: 1.8 },
  normal: { count: 3, speed: .98, reaction: .72, error: 5, sailDelay: .9 },
  expert: { count: 3, speed: 1.025, reaction: .38, error: 1.8, sailDelay: .35 }
};

const AI_NAMES = ['Mistral', 'Alizé', 'Mélusine', 'Pen Duick', 'Ar-Men', 'Avel', 'Korrigan'];
const AI_COLORS = ['#b8a1ff', '#66e0b5', '#ffd166', '#ef7aa8', '#8dc6ff', '#f5a65b', '#c4e36b'];
const setup = { mode: 'solo', fleet: 'ai', difficulty: 'normal', course: 'triangle' };
const input = [{ left: false, right: false }, { left: false, right: false }];
const activeContacts = new Set();
let view = { scale: 1, x: 0, y: 0, dpr: 1 };
let lastFrame = performance.now();
let lastUiUpdate = 0;
let flashTimeout;
let pauseMenuIndex = 0;

const game = {
  state: 'idle', countdown: 5, elapsed: 0, penalty: 0, windFrom: 4, windSpeed: 12,
  gustClock: 0, boats: [], humans: [], course: COURSES.triangle, resultsShown: false,
  finishDeadline: null, pausedFrom: null,
  gust: { active: false, elapsed: 0, duration: 0, strength: 0, shift: 0, next: 14, amount: 0 }
};

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function rad(degrees) { return degrees * Math.PI / 180; }
function normalize(angle) { return (angle % 360 + 360) % 360; }
function signedAngle(angle) { return ((angle + 180) % 360 + 360) % 360 - 180; }
function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function bearing(from, to) { return normalize(Math.atan2(to.x - from.x, from.y - to.y) * 180 / Math.PI); }
function formatTime(seconds) {
  const tenths = Math.max(0, Math.round(seconds * 10));
  const mins = Math.floor(tenths / 600);
  const remainder = (tenths - mins * 600) / 10;
  return `${String(mins).padStart(2, '0')}:${remainder.toFixed(1).padStart(4, '0')}`;
}

function bestKey() { return `ecume-best-${setup.course}`; }
function getBest() {
  try { return Number(localStorage.getItem(bestKey())) || 0; } catch { return 0; }
}
function setBest(value) {
  try { localStorage.setItem(bestKey(), String(value)); } catch { /* Storage can be disabled. */ }
}

function makeBoat(index, type, playerIndex = -1) {
  const course = game.course;
  const column = index % 5 - 2;
  const row = Math.floor(index / 5);
  const isPlayerOne = playerIndex === 0;
  const isPlayerTwo = playerIndex === 1;
  return {
    id: `${type}-${index}`, type, playerIndex,
    name: isPlayerOne ? 'Joueur gauche' : isPlayerTwo ? 'Joueur droite' : AI_NAMES[index % AI_NAMES.length],
    color: isPlayerOne ? '#62e7ff' : isPlayerTwo ? '#ff784f' : AI_COLORS[index % AI_COLORS.length],
    x: course.spawn.x + column * 42, y: course.spawn.y + row * 35,
    previous: { x: course.spawn.x + column * 42, y: course.spawn.y + row * 35 },
    heading: normalize(course.spawn.heading + column * 2), speed: 0, heel: 0, wake: [],
    sails: { main: { deployed: true, current: 1 }, jib: { deployed: true, current: 1 }, spi: { deployed: false, current: 0 } },
    started: false, leg: 0, penalty: 0, rawFinishTime: null, finishTime: null, tackTarget: null,
    aiClock: Math.random() * .5, aiHeading: course.spawn.heading, aiRouteHeading: course.spawn.heading, sailClock: 0,
    aiLane: type === 'ai' ? (index % 3) - 1 : 0,
    roundingState: null
  };
}

function buildFleet(state = 'idle') {
  game.course = COURSES[setup.course];
  game.state = state;
  game.countdown = 5;
  game.elapsed = 0;
  game.gustClock = 0;
  game.windFrom = game.course.windFrom;
  game.windSpeed = game.course.windSpeed;
  game.resultsShown = false;
  game.finishDeadline = null;
  game.pausedFrom = null;
  Object.assign(game.gust, { active: false, elapsed: 0, duration: 0, strength: 0, shift: 0, next: 12 + Math.random() * 9, amount: 0 });
  activeContacts.clear();
  game.boats = [];
  game.humans = [];
  const humanCount = setup.mode === 'local' ? 2 : 1;
  for (let i = 0; i < humanCount; i++) {
    const boat = makeBoat(i, 'player', i);
    game.boats.push(boat);
    game.humans.push(boat);
  }
  const useAi = setup.mode === 'solo' || setup.fleet === 'ai';
  if (useAi) {
    const count = DIFFICULTIES[setup.difficulty].count;
    for (let i = 0; i < count; i++) game.boats.push(makeBoat(i + humanCount, 'ai'));
  }
  ui.finishPanel.classList.add('hidden');
  ui.pausePanel.classList.add('hidden');
  ui.leftHud.classList.toggle('hidden', state === 'idle');
  ui.rightHud.classList.toggle('hidden', setup.mode !== 'local' || state === 'idle');
  ui.leftHud.classList.remove('expanded');
  ui.rightHud.classList.remove('expanded');
  ui.leftHudToggle.setAttribute('aria-expanded', 'false');
  ui.rightHudToggle.setAttribute('aria-expanded', 'false');
  input.forEach(keys => { keys.left = false; keys.right = false; });
  updateRotatePrompt();
  if (state === 'countdown') flash('5', 900);
}

function startGame() {
  ui.intro.classList.add('hidden');
  buildFleet('countdown');
}

function clearInputs() {
  input.forEach(keys => { keys.left = false; keys.right = false; });
}

function pauseButtons() {
  return [ui.resumeButton, ui.pauseRestartButton, ui.pauseHomeButton];
}

function focusPauseButton(index) {
  const buttons = pauseButtons();
  pauseMenuIndex = (index + buttons.length) % buttons.length;
  buttons[pauseMenuIndex].focus();
}

function togglePause() {
  if (game.state === 'paused') {
    game.state = game.pausedFrom;
    game.pausedFrom = null;
    ui.pausePanel.classList.add('hidden');
    ui.pauseButton.focus();
    updateRotatePrompt();
    return;
  }
  if (!['countdown', 'racing'].includes(game.state)) return;
  game.pausedFrom = game.state;
  game.state = 'paused';
  clearInputs();
  ui.pausePanel.classList.remove('hidden');
  updateRotatePrompt();
  pauseMenuIndex = 0;
  requestAnimationFrame(() => focusPauseButton(0));
}

function restartRace() {
  clearInputs();
  buildFleet('countdown');
}

function returnHome() {
  clearInputs();
  ui.finishPanel.classList.add('hidden');
  ui.pausePanel.classList.add('hidden');
  ui.intro.classList.remove('hidden');
  buildFleet('idle');
}

function updateRotatePrompt() {
  const mobilePortrait = window.matchMedia('(max-width: 1024px) and (orientation: portrait), (pointer: coarse) and (orientation: portrait)').matches;
  const shouldShow = setup.mode === 'local' && ['countdown', 'racing'].includes(game.state) && mobilePortrait;
  ui.rotatePrompt.classList.toggle('hidden', !shouldShow);
}

function isFullscreen() {
  return Boolean(document.fullscreenElement || document.webkitFullscreenElement);
}

function updateFullscreenButton() {
  const active = isFullscreen();
  ui.fullscreenButton.classList.toggle('hidden', active);
  ui.fullscreenButton.setAttribute('aria-pressed', String(active));
  resize();
}

async function enterFullscreen() {
  if (isFullscreen()) return;
  const root = document.documentElement;
  try {
    if (root.requestFullscreen) await root.requestFullscreen();
    else if (root.webkitRequestFullscreen) await root.webkitRequestFullscreen();
    else throw new Error('Fullscreen API unavailable');
  } catch {
    ui.fullscreenButton.textContent = 'PLEIN ÉCRAN NON DISPONIBLE';
    ui.fullscreenButton.disabled = true;
  }
}

function toggleMobileHud(playerIndex) {
  const hud = playerIndex === 0 ? ui.leftHud : ui.rightHud;
  const button = playerIndex === 0 ? ui.leftHudToggle : ui.rightHudToggle;
  const expanded = hud.classList.toggle('expanded');
  button.setAttribute('aria-expanded', String(expanded));
  resize();
}

function flash(text, duration = 1200) {
  clearTimeout(flashTimeout);
  ui.message.textContent = text;
  ui.message.classList.add('visible');
  flashTimeout = setTimeout(() => ui.message.classList.remove('visible'), duration);
}

function polarEfficiency(angle) {
  angle = Math.abs(angle);
  if (angle < 35) return .08;
  if (angle < 50) return .48 + (angle - 35) / 15 * .27;
  if (angle < 90) return .75 + (angle - 50) / 40 * .22;
  if (angle < 120) return .97 + (angle - 90) / 30 * .03;
  if (angle < 155) return 1 - (angle - 120) / 35 * .16;
  return .84 - (angle - 155) / 25 * .12;
}

function sailingMode(angle) {
  angle = Math.abs(angle);
  if (angle < 35) return ['FACE AU VENT', 'Écarte-toi du vent pour gonfler les voiles.'];
  if (angle < 55) return ['PRÈS SERRÉ', 'Bonne remontée au vent. Surveille ta vitesse.'];
  if (angle < 85) return ['BON PLEIN', 'Un compromis efficace entre cap et vitesse.'];
  if (angle < 120) return ['TRAVERS', 'Allure rapide : les voiles donnent leur plein rendement.'];
  if (angle < 160) return ['LARGUE', 'Le spi devient le meilleur choix.'];
  return ['VENT ARRIÈRE', 'Le spi porte, évite toutefois le plein vent arrière.'];
}

function sailPerformance(boat, angle) {
  angle = Math.abs(angle);
  const jibSuitability = angle <= 90 ? 1 : angle < 135 ? 1 - (angle - 90) / 45 * .75 : .25;
  const spiSuitability = angle < 70 ? 0 : angle < 100 ? (angle - 70) / 30 : angle < 160 ? 1 : .9;
  const power = boat.sails.main.current * .55 + boat.sails.jib.current * .45 * jibSuitability + boat.sails.spi.current * .70 * spiSuitability;
  return Math.max(0, power - (angle < 75 ? boat.sails.spi.current * .18 : 0));
}

function toggleSail(boat, name) {
  if (!boat || boat.finishTime !== null || !['countdown', 'racing'].includes(game.state)) return;
  const sail = boat.sails[name];
  sail.deployed = !sail.deployed;
  if (sail.deployed && name === 'spi') boat.sails.jib.deployed = false;
  if (sail.deployed && name === 'jib') boat.sails.spi.deployed = false;
}

function triggerTack(boat) {
  if (!boat || boat.finishTime !== null || boat.tackTarget !== null || !['countdown', 'racing'].includes(game.state)) return;
  const side = signedAngle(boat.heading - game.windFrom) >= 0 ? 1 : -1;
  boat.tackTarget = normalize(game.windFrom - side * 45);
  if (boat.type === 'player') flash(`${boat.name.toUpperCase()} · VIREMENT`, 650);
}

function boatVelocity(boat) {
  return { x: Math.sin(rad(boat.heading)) * boat.speed * 7.2, y: -Math.cos(rad(boat.heading)) * boat.speed * 7.2 };
}

function tackOf(boat) {
  return signedAngle(boat.heading - game.windFrom) < 0 ? 'starboard' : 'port';
}

function giveWayReason(boat, other) {
  if (boat.started && other.started && boat.leg === other.leg && boat.leg > 0 && boat.leg <= game.course.marks.length) {
    const mark = game.course.marks[boat.leg - 1];
    const boatDistance = distance(boat, mark);
    const otherDistance = distance(other, mark);
    if (boatDistance < 155 && otherDistance < 155 && Math.abs(boatDistance - otherDistance) > 8) {
      return boatDistance > otherDistance ? 'PLACE À LA MARQUE' : null;
    }
  }

  const boatTack = tackOf(boat);
  const otherTack = tackOf(other);
  if (boatTack !== otherTack) return boatTack === 'port' ? 'BÂBORD AMURE' : null;

  const downwind = rad(game.windFrom + 180);
  const downwindX = Math.sin(downwind);
  const downwindY = -Math.cos(downwind);
  const boatProjection = boat.x * downwindX + boat.y * downwindY;
  const otherProjection = other.x * downwindX + other.y * downwindY;
  if (Math.abs(boatProjection - otherProjection) > 5) return boatProjection < otherProjection ? 'BATEAU AU VENT' : null;

  return Math.abs(signedAngle(bearing(boat, other) - boat.heading)) < 70 ? 'BATEAU RATTRAPANT' : null;
}

function mustGiveWay(boat, other) {
  return giveWayReason(boat, other) !== null;
}

function applyCollisionAvoidance(boat, desiredHeading) {
  const velocity = boatVelocity(boat);
  let correction = 0;
  let closestRisk = Infinity;
  for (const other of game.boats) {
    if (other === boat || other.finishTime !== null) continue;
    const otherVelocity = boatVelocity(other);
    const relative = { x: other.x - boat.x, y: other.y - boat.y };
    const currentGapSquared = relative.x ** 2 + relative.y ** 2;
    if (currentGapSquared > 220 ** 2) continue;
    const relativeVelocity = { x: otherVelocity.x - velocity.x, y: otherVelocity.y - velocity.y };
    const velocitySquared = relativeVelocity.x ** 2 + relativeVelocity.y ** 2;
    const time = velocitySquared > .01 ? clamp(-(relative.x * relativeVelocity.x + relative.y * relativeVelocity.y) / velocitySquared, 0, 2.8) : 0;
    const closestX = relative.x + relativeVelocity.x * time;
    const closestY = relative.y + relativeVelocity.y * time;
    const closestSquared = closestX ** 2 + closestY ** 2;
    if (closestSquared >= 58 ** 2 || (time <= .05 && currentGapSquared > 45 ** 2) || closestSquared >= closestRisk) continue;
    closestRisk = closestSquared;
    const otherSide = signedAngle(bearing(boat, other) - boat.heading);
    const strength = mustGiveWay(boat, other) ? 22 : 7;
    correction = otherSide >= 0 ? -strength : strength;
  }
  return normalize(desiredHeading + correction);
}

function nextTarget(boat) {
  if (!boat.started) {
    const line = game.course.start;
    const length = distance(line.a, line.b);
    const lane = boat.aiLane * 48;
    return { x: (line.a.x + line.b.x) / 2 + (line.b.x - line.a.x) / length * lane, y: (line.a.y + line.b.y) / 2 + (line.b.y - line.a.y) / length * lane, name: 'LIGNE DE DÉPART' };
  }
  if (boat.leg <= game.course.marks.length) {
    const mark = game.course.marks[boat.leg - 1];
    const state = boat.roundingState;
    const exiting = state && state.index === boat.leg - 1 && state.entered;
    if (exiting && state.sweep < rad(58)) {
      const orbitAngle = state.lastAngle + mark.roundingDir * .72;
      const orbitRadius = 76 + boat.aiLane * 10;
      return {
        x: mark.x + Math.cos(orbitAngle) * orbitRadius,
        y: mark.y + Math.sin(orbitAngle) * orbitRadius,
        name: `${mark.name} · ${mark.roundingSide}`
      };
    }
    const direction = exiting ? mark.outgoing : mark.incoming;
    const side = { x: mark.roundingDir * direction.y, y: -mark.roundingDir * direction.x };
    const along = exiting ? 70 : -28;
    const sideDistance = (exiting ? 86 : 74) + boat.aiLane * 10;
    return {
      x: mark.x + side.x * sideDistance + direction.x * along,
      y: mark.y + side.y * sideDistance + direction.y * along,
      name: `${mark.name} · ${mark.roundingSide}`
    };
  }
  const line = game.course.finish;
  const length = distance(line.a, line.b);
  const lane = boat.aiLane * 48;
  return { x: (line.a.x + line.b.x) / 2 + (line.b.x - line.a.x) / length * lane, y: (line.a.y + line.b.y) / 2 + (line.b.y - line.a.y) / length * lane, name: 'LIGNE D’ARRIVÉE' };
}

function updateAI(boat, dt) {
  const difficulty = DIFFICULTIES[setup.difficulty];
  boat.aiClock -= dt;
  boat.sailClock -= dt;
  const target = nextTarget(boat);
  if (boat.aiClock <= 0) {
    const direct = bearing(boat, target);
    const relative = signedAngle(direct - game.windFrom);
    let desired = direct;
    if (Math.abs(relative) < 39) {
      const tackSide = Math.abs(boat.x - target.x) > 45 ? Math.sign(target.x - boat.x) : (boat.id.charCodeAt(3) % 2 ? 1 : -1);
      desired = normalize(game.windFrom + tackSide * 44);
    }
    desired += (Math.random() - .5) * difficulty.error * 2;
    boat.aiRouteHeading = normalize(desired);
    boat.aiClock = difficulty.reaction * (.75 + Math.random() * .5);
  }
  if (boat.sailClock <= 0) {
    const angle = Math.abs(signedAngle(boat.heading - game.windFrom));
    boat.sails.main.deployed = true;
    boat.sails.spi.deployed = angle > 98;
    boat.sails.jib.deployed = !boat.sails.spi.deployed;
    boat.sailClock = difficulty.sailDelay;
  }
  boat.aiHeading = applyCollisionAvoidance(boat, boat.aiRouteHeading);
  return Math.sign(signedAngle(boat.aiHeading - boat.heading));
}

function updateBoat(boat, dt) {
  if (boat.finishTime !== null) {
    boat.speed += (0 - boat.speed) * dt;
    return;
  }
  Object.values(boat.sails).forEach(sail => {
    const target = sail.deployed ? 1 : 0;
    sail.current += Math.sign(target - sail.current) * Math.min(Math.abs(target - sail.current), dt * .42);
  });

  let turn = boat.type === 'ai' ? updateAI(boat, dt) : (input[boat.playerIndex].right ? 1 : 0) - (input[boat.playerIndex].left ? 1 : 0);
  const oldWindSide = Math.sign(signedAngle(boat.heading - game.windFrom));
  if (boat.tackTarget !== null) {
    const delta = signedAngle(boat.tackTarget - boat.heading);
    if (Math.abs(delta) < 2.5) { boat.heading = boat.tackTarget; boat.tackTarget = null; }
    else turn = Math.sign(delta);
  }
  const turnRate = 38 * (.45 + clamp(boat.speed / 5, 0, 1) * .55);
  boat.heading = normalize(boat.heading + turn * turnRate * dt);
  const windAngle = signedAngle(boat.heading - game.windFrom);
  const efficiency = polarEfficiency(windAngle);
  let targetSpeed = game.windSpeed * .56 * efficiency * sailPerformance(boat, windAngle);
  if (boat.type === 'ai') targetSpeed *= DIFFICULTIES[setup.difficulty].speed;
  if (boat.type === 'ai' && game.state === 'countdown') targetSpeed *= game.countdown > .8 ? .22 : .7;
  if (oldWindSide !== Math.sign(windAngle) && Math.abs(windAngle) < 50) boat.speed *= .68;
  if (boat.tackTarget !== null && Math.abs(windAngle) < 35) targetSpeed *= .4;
  boat.speed += (targetSpeed - boat.speed) * (targetSpeed > boat.speed ? .55 : 1.15) * dt;
  boat.heel += ((Math.sin(rad(windAngle)) * efficiency * 12) - boat.heel) * dt * 2;

  boat.previous.x = boat.x;
  boat.previous.y = boat.y;
  const movement = boat.speed * 7.2 * dt;
  boat.x += Math.sin(rad(boat.heading)) * movement;
  boat.y -= Math.cos(rad(boat.heading)) * movement;
  const drift = Math.max(0, Math.cos(rad(windAngle))) * .8 * dt;
  boat.x -= Math.sin(rad(game.windFrom)) * drift;
  boat.y += Math.cos(rad(game.windFrom)) * drift;
  boat.x = clamp(boat.x, 35, WORLD.width - 35);
  boat.y = clamp(boat.y, 35, WORLD.height - 35);

  if (boat.speed > .8) {
    boat.wake.unshift({ x: boat.x, y: boat.y, life: 1 });
    const wakeLimit = boat.type === 'ai' ? 14 : 28;
    if (boat.wake.length > wakeLimit) boat.wake.pop();
  }
  boat.wake.forEach(point => point.life -= dt * .55);
}

function lineSide(point, line) {
  return (line.b.x - line.a.x) * (point.y - line.a.y) - (line.b.y - line.a.y) * (point.x - line.a.x);
}

function crossedGate(from, to, line, direction) {
  const before = lineSide(from, line);
  const after = lineSide(to, line);
  if (direction < 0 && !(before > 0 && after <= 0)) return false;
  if (direction > 0 && !(before < 0 && after >= 0)) return false;
  const ratio = before / (before - after || 1);
  const hit = { x: from.x + (to.x - from.x) * ratio, y: from.y + (to.y - from.y) * ratio };
  const dx = line.b.x - line.a.x;
  const dy = line.b.y - line.a.y;
  const projection = ((hit.x - line.a.x) * dx + (hit.y - line.a.y) * dy) / (dx * dx + dy * dy);
  return projection >= 0 && projection <= 1;
}

function checkCourse(boat) {
  if (boat.finishTime !== null) return;
  if (!boat.started && crossedGate(boat.previous, boat, game.course.start, -1)) {
    if (game.state === 'countdown') {
      boat.penalty += 5;
      const dx = game.course.start.b.x - game.course.start.a.x;
      const dy = game.course.start.b.y - game.course.start.a.y;
      const length = Math.hypot(dx, dy);
      boat.x = boat.previous.x - dy / length * 12;
      boat.y = boat.previous.y + dx / length * 12;
      boat.previous.x = boat.x;
      boat.previous.y = boat.y;
      boat.speed *= .3;
      if (boat.type === 'player') flash(`${boat.name.toUpperCase()} · FAUX DÉPART +5 S`, 1300);
    } else {
      boat.started = true;
      boat.leg = 1;
      if (boat.type === 'player') flash(`${boat.name.toUpperCase()} · DÉPART VALIDÉ`, 900);
    }
    return;
  }
  if (!boat.started) return;
  if (boat.leg <= game.course.marks.length) {
    const index = boat.leg - 1;
    const mark = game.course.marks[index];
    const markDistance = distance(boat, mark);
    if (!boat.roundingState || boat.roundingState.index !== index) {
      boat.roundingState = { index, entered: false, lastAngle: 0, sweep: 0 };
    }
    const state = boat.roundingState;

    if (markDistance <= 100) {
      const angle = Math.atan2(boat.y - mark.y, boat.x - mark.x);
      if (!state.entered) {
        state.entered = true;
        state.lastAngle = angle;
        state.sweep = 0;
      } else if (markDistance > 5) {
        const delta = Math.atan2(Math.sin(angle - state.lastAngle), Math.cos(angle - state.lastAngle));
        const progress = delta * mark.roundingDir;
        state.sweep = progress >= 0 ? state.sweep + progress : Math.max(0, state.sweep + progress * .4);
        state.lastAngle = angle;
      }
    } else if (state.entered) {
      const exitProgress = (boat.x - mark.x) * mark.outgoing.x + (boat.y - mark.y) * mark.outgoing.y;
      if (state.sweep >= rad(50) && exitProgress > 15) {
        boat.leg++;
        boat.roundingState = null;
        if (boat.type === 'player') flash(`${boat.name.toUpperCase()} · MARQUE VALIDÉE`, 850);
      } else if (markDistance > 115) {
        state.entered = false;
        state.sweep = 0;
        if (boat.type === 'player') flash(`${mark.roundingSide} REQUIS · REPRENDS LA MARQUE`, 1100);
      }
    }
  } else if (crossedGate(boat.previous, boat, game.course.finish, 1)) {
    boat.rawFinishTime = game.elapsed;
    boat.finishTime = boat.rawFinishTime + boat.penalty;
    boat.speed *= .55;
    if (boat.type === 'player') handleHumanFinish(boat);
  }
}

function handleHumanFinish(boat) {
  flash(`${boat.name.toUpperCase()} · ARRIVÉE ${formatTime(boat.finishTime)}`, 1500);
  if (game.humans.every(human => human.finishTime !== null)) {
    game.finishDeadline = game.elapsed + 8;
  }
}

function finishRaceIfReady() {
  if (game.finishDeadline === null) return;
  const fleetFinished = game.boats.every(boat => boat.finishTime !== null);
  if (fleetFinished || game.elapsed >= game.finishDeadline) {
    game.state = 'finished';
    showResults();
  }
}

function resolveCollisions() {
  for (let i = 0; i < game.boats.length; i++) {
    for (let j = i + 1; j < game.boats.length; j++) {
      const a = game.boats[i];
      const b = game.boats[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const gapSquared = dx * dx + dy * dy;
      const contactKey = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
      if (a.finishTime !== null || b.finishTime !== null) {
        activeContacts.delete(contactKey);
        continue;
      }
      if (gapSquared > 0 && gapSquared < 25 ** 2) {
        const gap = Math.sqrt(gapSquared);
        const push = (25 - gap) / 2;
        const nx = dx / gap;
        const ny = dy / gap;
        a.x += nx * push; a.y += ny * push;
        b.x -= nx * push; b.y -= ny * push;
        if (!activeContacts.has(contactKey)) {
          activeContacts.add(contactKey);
          a.speed *= .82;
          b.speed *= .82;
          const aGivesWay = mustGiveWay(a, b);
          const bGivesWay = mustGiveWay(b, a);
          let responsible;
          if (aGivesWay !== bGivesWay) responsible = aGivesWay ? a : b;
          else {
            const aClosing = Math.abs(signedAngle(bearing(a, b) - a.heading));
            const bClosing = Math.abs(signedAngle(bearing(b, a) - b.heading));
            responsible = aClosing <= bClosing ? a : b;
          }
          responsible.penalty += 5;
          const humanInvolved = a.type === 'player' || b.type === 'player';
          if (humanInvolved) {
            const other = responsible === a ? b : a;
            const reason = giveWayReason(responsible, other) || 'CONTACT ÉVITABLE';
            flash(`${reason} · ${responsible.name.toUpperCase()} +5 S`, 1400);
          }
        }
      } else if (gapSquared > 35 ** 2) {
        activeContacts.delete(contactKey);
      }
    }
  }
}

function boatProgress(boat) {
  if (boat.finishTime !== null) return 1e8 - boat.finishTime;
  const target = nextTarget(boat);
  return (boat.started ? boat.leg : 0) * 10000 - distance(boat, target);
}

function standings() {
  return [...game.boats].sort((a, b) => boatProgress(b) - boatProgress(a));
}

function showResults() {
  if (game.resultsShown) return;
  game.resultsShown = true;
  const ordered = standings();
  const primary = game.humans[0];
  const best = getBest();
  if (!best || primary.finishTime < best) setBest(primary.finishTime);
  ui.finishTime.textContent = formatTime(primary.finishTime);
  ui.finishResult.textContent = ordered[0] === primary ? 'Victoire ! Tu remportes cette régate.' : `${ordered.indexOf(primary) + 1}e place pour ${primary.name}.`;
  ui.results.innerHTML = ordered.map((boat, index) => {
    const value = boat.finishTime === null
      ? '<span class="result-breakdown">DNF</span>'
      : `<span class="result-breakdown"><span>${formatTime(boat.rawFinishTime)}</span><b>+${boat.penalty} s</b><strong>= ${formatTime(boat.finishTime)}</strong></span>`;
    return `<div class="result-row ${boat.type === 'player' ? 'player' : ''}" style="color:${boat.color}"><span>${index + 1}</span><span>${boat.name}</span>${value}</div>`;
  }).join('');
  ui.finishPanel.classList.remove('hidden');
}

function updateGust(dt) {
  const gust = game.gust;
  if (!gust.active) {
    gust.amount = 0;
    if (game.state !== 'racing') return;
    gust.next -= dt;
    if (gust.next <= 0) {
      gust.active = true;
      gust.elapsed = 0;
      gust.duration = 7 + Math.random() * 5;
      gust.strength = 2 + Math.random() * 2;
      gust.shift = (Math.random() < .5 ? -1 : 1) * (5 + Math.random() * 7);
      flash(`RAFALE · +${gust.strength.toFixed(1)} ND`, 1300);
    }
    return;
  }
  gust.elapsed += dt;
  const progress = clamp(gust.elapsed / gust.duration, 0, 1);
  gust.amount = Math.sin(progress * Math.PI);
  if (progress >= 1) {
    gust.active = false;
    gust.amount = 0;
    gust.next = 16 + Math.random() * 15;
  }
}

function update(dt) {
  if (!['countdown', 'racing'].includes(game.state)) return;
  game.gustClock += dt;
  updateGust(dt);
  game.windFrom = game.course.windFrom + Math.sin(game.gustClock * .11) * 7 + Math.sin(game.gustClock * .037) * 3 + game.gust.shift * game.gust.amount;
  game.windSpeed = game.course.windSpeed + Math.sin(game.gustClock * .3) * 1.15 + Math.sin(game.gustClock * .07) * .65 + game.gust.strength * game.gust.amount;
  if (game.state === 'countdown') {
    const old = Math.ceil(game.countdown);
    game.countdown -= dt;
    const current = Math.ceil(game.countdown);
    if (current !== old && current > 0) flash(String(current), 800);
    if (game.countdown <= 0) { game.state = 'racing'; game.elapsed = 0; flash('PARTEZ !', 1000); }
  } else {
    game.elapsed += dt;
  }
  game.boats.forEach(boat => updateBoat(boat, dt));
  resolveCollisions();
  game.boats.forEach(checkCourse);
  finishRaceIfReady();
}

function resize() {
  const rect = canvas.getBoundingClientRect();
  view.dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * view.dpr);
  canvas.height = Math.round(rect.height * view.dpr);
  const padding = rect.width < 600 ? 22 : 45;
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const tableMode = setup.mode === 'local' && (rect.width <= 1024 || coarsePointer) && rect.width > rect.height;
  if (tableMode) {
    const styles = getComputedStyle(canvas.parentElement);
    const safeTop = parseFloat(styles.getPropertyValue('--safe-top')) || 0;
    const safeBottom = parseFloat(styles.getPropertyValue('--safe-bottom')) || 0;
    const topSpace = (ui.rightHud.classList.contains('expanded') ? 130 : 68) + safeTop;
    const bottomSpace = (ui.leftHud.classList.contains('expanded') ? 130 : 68) + safeBottom;
    const usableHeight = rect.height - topSpace - bottomSpace;
    view.scale = Math.min((rect.width - padding * 2) / WORLD.width, (usableHeight - 12) / WORLD.height);
    view.x = (rect.width - WORLD.width * view.scale) / 2;
    view.y = topSpace + (usableHeight - WORLD.height * view.scale) / 2;
  } else {
    view.scale = Math.min((rect.width - padding * 2) / WORLD.width, (rect.height - padding * 2) / WORLD.height);
    view.x = (rect.width - WORLD.width * view.scale) / 2;
    view.y = (rect.height - WORLD.height * view.scale) / 2;
  }
  updateRotatePrompt();
}

function worldTransform() {
  ctx.setTransform(view.dpr * view.scale, 0, 0, view.dpr * view.scale, view.dpr * view.x, view.dpr * view.y);
}

function drawSea(time) {
  const width = canvas.width / view.dpr;
  const height = canvas.height / view.dpr;
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#147b82'); gradient.addColorStop(1, '#074a58');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = `rgba(224,244,237,${.08 + game.gust.amount * .1})`; ctx.lineWidth = 1 + game.gust.amount;
  const offset = (time * (.008 + game.gust.amount * .01)) % 42;
  for (let y = offset; y < height; y += 42) {
    ctx.beginPath();
    for (let x = -20; x < width + 20; x += 20) {
      const waveY = y + Math.sin(x * .025 + time * .0004) * 4;
      x === -20 ? ctx.moveTo(x, waveY) : ctx.lineTo(x, waveY);
    }
    ctx.stroke();
  }
}

function drawGate(line, type) {
  const shared = type === 'shared';
  const color = '#c4d0ce';
  const label = type === 'finish' ? 'ARRIVÉE' : shared ? 'DÉPART / ARRIVÉE' : 'DÉPART';
  ctx.strokeStyle = color; ctx.lineWidth = 4 / view.scale;
  if (type === 'finish') ctx.setLineDash([8 / view.scale, 5 / view.scale]);
  ctx.beginPath(); ctx.moveTo(line.a.x, line.a.y); ctx.lineTo(line.b.x, line.b.y); ctx.stroke();
  ctx.setLineDash([]);
  drawPin(line.a.x, line.a.y, color); drawPin(line.b.x, line.b.y, color);
  ctx.fillStyle = color; ctx.font = `700 ${9 / view.scale}px DM Mono`; ctx.textAlign = 'center';
  ctx.fillText(label, (line.a.x + line.b.x) / 2, (line.a.y + line.b.y) / 2 + 24 / view.scale);
}

function drawGateTarget(line, boat) {
  const dx = line.b.x - line.a.x;
  const dy = line.b.y - line.a.y;
  const length = Math.hypot(dx, dy);
  const offset = (boat.playerIndex === 0 ? -4 : 4) / view.scale;
  const offsetX = -dy / length * offset;
  const offsetY = dx / length * offset;
  ctx.strokeStyle = boat.color; ctx.lineWidth = 3 / view.scale; ctx.setLineDash([9 / view.scale, 5 / view.scale]);
  ctx.beginPath(); ctx.moveTo(line.a.x + offsetX, line.a.y + offsetY); ctx.lineTo(line.b.x + offsetX, line.b.y + offsetY); ctx.stroke(); ctx.setLineDash([]);
}

function drawCourse() {
  worldTransform();
  const startMid = { x: (game.course.start.a.x + game.course.start.b.x) / 2, y: (game.course.start.a.y + game.course.start.b.y) / 2 };
  const finishMid = { x: (game.course.finish.a.x + game.course.finish.b.x) / 2, y: (game.course.finish.a.y + game.course.finish.b.y) / 2 };
  ctx.lineWidth = 3 / view.scale; ctx.setLineDash([10 / view.scale, 9 / view.scale]); ctx.strokeStyle = 'rgba(238,238,226,.3)';
  ctx.beginPath(); ctx.moveTo(startMid.x, startMid.y);
  game.course.marks.forEach(mark => ctx.lineTo(mark.x, mark.y));
  ctx.lineTo(finishMid.x, finishMid.y); ctx.stroke(); ctx.setLineDash([]);
  const sharedLine = game.course.finish === game.course.start;
  drawGate(game.course.start, sharedLine ? 'shared' : 'start');
  if (!sharedLine) drawGate(game.course.finish, 'finish');
  game.course.marks.forEach((mark, index) => {
    const firstAtPosition = game.course.marks.findIndex(candidate => candidate.x === mark.x && candidate.y === mark.y);
    if (firstAtPosition !== index) return;
    const passNumbers = game.course.marks
      .map((candidate, candidateIndex) => candidate.x === mark.x && candidate.y === mark.y ? String(candidateIndex + 1).padStart(2, '0') : null)
      .filter(Boolean)
      .join('/');
    drawPin(mark.x, mark.y, '#c4d0ce', 6);
    ctx.fillStyle = 'rgba(7,29,38,.8)'; ctx.font = `700 ${14 / view.scale}px Manrope`; ctx.textAlign = 'center';
    ctx.fillText(passNumbers, mark.x, mark.y - 38 / view.scale);
  });
  game.humans.forEach(boat => {
    if (boat.finishTime !== null) return;
    if (!boat.started) {
      drawGateTarget(game.course.start, boat);
    } else if (boat.leg <= game.course.marks.length) {
      const mark = game.course.marks[boat.leg - 1];
      const offset = boat.playerIndex * 11;
      ctx.strokeStyle = boat.color; ctx.lineWidth = 2 / view.scale; ctx.globalAlpha = .82;
      ctx.beginPath(); ctx.arc(mark.x, mark.y, 72 + offset + Math.sin(performance.now() * .004) * 5, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
      drawRoundingArrow(mark, boat.color, offset);
    } else {
      drawGateTarget(game.course.finish, boat);
    }
  });
}

function drawRoundingArrow(mark, color, offset = 0) {
  const side = { x: mark.roundingDir * mark.incoming.y, y: -mark.roundingDir * mark.incoming.x };
  const start = Math.atan2(side.y * 74 - mark.incoming.y * 28, side.x * 74 - mark.incoming.x * 28);
  const end = start + mark.roundingDir * 1.45;
  const radius = (52 + offset) / view.scale;
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 3 / view.scale;
  ctx.beginPath(); ctx.arc(mark.x, mark.y, radius, start, end, mark.roundingDir < 0); ctx.stroke();
  const tipX = mark.x + Math.cos(end) * radius;
  const tipY = mark.y + Math.sin(end) * radius;
  ctx.beginPath(); ctx.arc(tipX, tipY, 4 / view.scale, 0, Math.PI * 2); ctx.fill();
  ctx.font = `700 ${8 / view.scale}px DM Mono`; ctx.textAlign = 'center';
  ctx.fillText(`À LAISSER À ${mark.roundingSide}`, mark.x, mark.y + (56 + offset) / view.scale);
}

function drawPin(x, y, color, screenSize = 11) {
  const size = screenSize / view.scale;
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(7,29,38,.7)'; ctx.lineWidth = Math.max(1.5, screenSize * .22) / view.scale; ctx.stroke();
}

function drawWindField() {
  worldTransform();
  const angle = rad(game.windFrom);
  const windAlpha = .15 + game.gust.amount * .18;
  ctx.strokeStyle = `rgba(240,238,230,${windAlpha})`; ctx.fillStyle = `rgba(240,238,230,${windAlpha})`; ctx.lineWidth = (1.5 + game.gust.amount) / view.scale;
  for (let y = 110; y < WORLD.height; y += 165) for (let x = 110; x < WORLD.width; x += 190) {
    const length = 20 + game.gust.amount * 15;
    const dx = Math.sin(angle) * length / view.scale; const dy = -Math.cos(angle) * length / view.scale;
    ctx.beginPath(); ctx.moveTo(x - dx, y - dy); ctx.lineTo(x + dx, y + dy); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + dx, y + dy, 2 / view.scale, 0, Math.PI * 2); ctx.fill();
  }
}

function drawBoat(boat) {
  worldTransform();
  ctx.lineCap = 'round';
  boat.wake.forEach((point, index) => {
    if (point.life <= 0) return;
    ctx.globalAlpha = Math.max(0, point.life) * .2; ctx.fillStyle = '#eaf5eb';
    ctx.beginPath(); ctx.arc(point.x, point.y, (2 + index * .07) / view.scale, 0, Math.PI * 2); ctx.fill();
  });
  ctx.globalAlpha = 1;
  if (boat.type === 'player') {
    ctx.strokeStyle = boat.color; ctx.lineWidth = 2 / view.scale; ctx.globalAlpha = .35;
    ctx.beginPath(); ctx.arc(boat.x, boat.y, 31 / view.scale, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
  }
  ctx.save(); ctx.translate(boat.x, boat.y); ctx.rotate(rad(boat.heading));
  const s = (boat.type === 'ai' ? .86 : 1.05) / view.scale;
  ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 12 * s; ctx.shadowOffsetY = 6 * s;
  ctx.fillStyle = boat.color; ctx.beginPath();
  ctx.moveTo(0, -24 * s); ctx.bezierCurveTo(11 * s, -7 * s, 10 * s, 16 * s, 0, 24 * s); ctx.bezierCurveTo(-10 * s, 16 * s, -11 * s, -7 * s, 0, -24 * s); ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.strokeStyle = '#06212a'; ctx.lineWidth = 2.2 * s;
  ctx.beginPath(); ctx.moveTo(0, -18 * s); ctx.lineTo(0, 16 * s); ctx.stroke();
  if (boat.sails.main.current > .04) {
    ctx.globalAlpha = boat.sails.main.current; ctx.fillStyle = '#fffdf2'; ctx.strokeStyle = '#06212a'; ctx.lineWidth = 1.4 * s;
    ctx.beginPath(); ctx.moveTo(-2 * s, -18 * s); ctx.lineTo(-19 * s * boat.sails.main.current, 11 * s); ctx.lineTo(-2 * s, 7 * s); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  if (boat.sails.jib.current > .04) {
    ctx.globalAlpha = boat.sails.jib.current; ctx.fillStyle = '#ffe04b'; ctx.strokeStyle = '#06212a';
    ctx.beginPath(); ctx.moveTo(2 * s, -18 * s); ctx.lineTo(14 * s * boat.sails.jib.current, 6 * s); ctx.lineTo(2 * s, 1 * s); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  if (boat.sails.spi.current > .04) {
    ctx.globalAlpha = boat.sails.spi.current; ctx.fillStyle = '#ff3f91'; ctx.strokeStyle = '#fff0d8'; ctx.lineWidth = 1.5 * s;
    ctx.beginPath(); ctx.moveTo(3 * s, -19 * s); ctx.quadraticCurveTo(28 * s * boat.sails.spi.current, -5 * s, 13 * s * boat.sails.spi.current, 13 * s); ctx.lineTo(3 * s, 2 * s); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.globalAlpha = 1; ctx.restore();
  ctx.fillStyle = boat.type === 'player' ? '#ffffff' : 'rgba(255,255,255,.75)';
  ctx.font = `700 ${(boat.type === 'player' ? 10 : 8) / view.scale}px DM Mono`; ctx.textAlign = 'center';
  const label = boat.type === 'player' ? (boat.playerIndex === 0 ? 'GAUCHE' : 'DROITE') : boat.name;
  ctx.fillText(label, boat.x, boat.y - 32 / view.scale);
}

function updatePlayerHud(side, boat, ordered) {
  const angle = signedAngle(boat.heading - game.windFrom);
  const efficiency = polarEfficiency(angle);
  const mode = sailingMode(angle);
  const power = sailPerformance(boat, angle);
  const totalEfficiency = clamp(efficiency * power, 0, 1.25);
  const target = nextTarget(boat);
  const spiWarning = boat.sails.spi.current > .15 && Math.abs(angle) < 75;

  ui[`${side}Rank`].textContent = `${ordered.indexOf(boat) + 1}/${game.boats.length}`;
  ui[`${side}Speed`].textContent = boat.speed.toFixed(1);
  ui[`${side}Heading`].textContent = String(Math.round(boat.heading) % 360).padStart(3, '0');
  ui[`${side}WindAngle`].textContent = String(Math.round(Math.abs(angle)));
  ui[`${side}Mode`].textContent = mode[0];
  ui[`${side}Mark`].textContent = target.name;
  ui[`${side}Distance`].textContent = `${(distance(boat, target) / 475).toFixed(1)} NM`;
  ui[`${side}Bearing`].textContent = `${String(Math.round(bearing(boat, target))).padStart(3, '0')}°`;
  ui[`${side}Efficiency`].textContent = `${Math.round(totalEfficiency * 100)}%`;
  ui[`${side}EfficiencyBar`].style.width = `${clamp(totalEfficiency, 0, 1) * 100}%`;
  ui[`${side}EfficiencyBar`].style.background = totalEfficiency < .3 || spiWarning ? '#ff6b35' : '';
  ui[`${side}Power`].textContent = `${Math.round(power * 100)}%`;

  document.querySelectorAll(`[data-player="${boat.playerIndex}"][data-sail]`).forEach(button => {
    const name = button.dataset.sail;
    const sail = boat.sails[name];
    const status = ui[`${side}${name[0].toUpperCase()}${name.slice(1)}Status`];
    const transitioning = Math.abs(sail.current - (sail.deployed ? 1 : 0)) > .03;
    button.classList.toggle('active', sail.deployed);
    button.classList.toggle('warning', name === 'spi' && spiWarning);
    status.textContent = transitioning ? (sail.deployed ? 'ENVOI…' : 'AFFALAGE…') : (sail.deployed ? 'HISSÉE' : 'AFFALÉE');
  });
}

function updateUI() {
  const primary = game.humans[0] || game.boats[0];
  if (!primary) return;
  const ordered = standings();
  ui.timer.textContent = formatTime(game.elapsed);
  ui.leftPenaltyValue.textContent = `+${game.humans[0]?.penalty || 0} S`;
  ui.rightPenaltyValue.textContent = `+${game.humans[1]?.penalty || 0} S`;
  ui.rightPenalty.classList.toggle('hidden', setup.mode !== 'local');
  ui.phaseLabel.textContent = game.state === 'countdown' ? `DÉPART · ${Math.max(0, Math.ceil(game.countdown))}` : game.state === 'racing' ? 'EN COURSE' : game.state === 'paused' ? 'PAUSE' : game.state === 'finished' ? 'TERMINÉ' : 'EN ATTENTE';
  ui.bannerCourse.textContent = game.course.name.toUpperCase();
  ui.bannerLeg.textContent = `${primary.started ? 'PARCOURS' : 'DÉPART'} · ${Math.max(0, primary.leg - 1)}/${game.course.marks.length}`;
  ui.bannerWindDirection.textContent = `${String(Math.round(normalize(game.windFrom))).padStart(3, '0')}°`;
  ui.compassWindSpeed.textContent = game.windSpeed.toFixed(1);
  ui.compassWindArrow.style.transform = `rotate(${normalize(game.windFrom)}deg)`;
  const gustVisible = game.gust.active && game.gust.amount > .05;
  ui.windCompass.classList.toggle('gusting', gustVisible);
  ui.gustLabel.classList.toggle('hidden', !gustVisible);
  ui.gustLabel.textContent = `RAFALE +${(game.gust.strength * game.gust.amount).toFixed(1)} ND`;
  const tableTime = formatTime(game.elapsed).slice(0, 5);
  const tableWind = `${game.windSpeed.toFixed(1)} ND`;
  ui.leftTableTime.textContent = tableTime;
  ui.leftTableWind.textContent = tableWind;
  ui.rightTableTime.textContent = tableTime;
  ui.rightTableWind.textContent = tableWind;
  ui.topThree.innerHTML = ordered.slice(0, 3).map((boat, index) => {
    const progress = boat.finishTime !== null ? formatTime(boat.finishTime) : `${Math.max(0, boat.leg - 1)}/${game.course.marks.length}`;
    return `<div class="leader"><b>${index + 1}</b><i class="leader-dot" style="background:${boat.color}"></i><span><strong>${boat.name}</strong><small>${progress}</small></span></div>`;
  }).join('');
  updatePlayerHud('left', primary, ordered);
  if (setup.mode === 'local' && game.humans[1]) updatePlayerHud('right', game.humans[1], ordered);
}

function render(time) {
  drawSea(time); drawWindField(); drawCourse();
  game.boats.filter(boat => boat.type === 'ai').forEach(drawBoat);
  game.boats.filter(boat => boat.type === 'player').forEach(drawBoat);
}

function frame(time) {
  const dt = Math.min((time - lastFrame) / 1000, .05); lastFrame = time;
  update(dt);
  if (time - lastUiUpdate >= 100) {
    updateUI();
    lastUiUpdate = time;
  }
  render(time); requestAnimationFrame(frame);
}

function setTurn(player, direction, active) {
  if (!input[player]) return;
  if (direction < 0) input[player].left = active;
  if (direction > 0) input[player].right = active;
  if (active && game.humans[player]) game.humans[player].tackTarget = null;
}

function selectOption(group, value) {
  setup[group] = value;
  document.body.classList.toggle('local-mode', setup.mode === 'local');
  document.querySelectorAll(`[data-${group}]`).forEach(button => button.classList.toggle('active', button.dataset[group] === value));
  ui.fleetChoice.classList.toggle('hidden', setup.mode !== 'local');
  const duel = setup.mode === 'local' && setup.fleet === 'duel';
  document.querySelectorAll('[data-difficulty]').forEach(button => { button.disabled = duel; });
  const course = COURSES[setup.course]; ui.courseMeta.textContent = course.meta; ui.courseDescription.textContent = course.description;
  ui.keyHint.textContent = setup.mode === 'local' ? 'Joueur gauche : W C · X · & é "   |   Joueur droite : ← → · ↓ · ; : !' : 'Joueur gauche : W C ou ← → · X · & é "';
  buildFleet('idle');
}

window.addEventListener('keydown', event => {
  const local = setup.mode === 'local';
  if (!event.repeat && (event.code === 'Escape' || event.key.toLowerCase() === 'p')) {
    event.preventDefault();
    togglePause();
    return;
  }
  if (game.state === 'paused') {
    if (event.code === 'ArrowUp' || event.code === 'ArrowDown') {
      event.preventDefault();
      focusPauseButton(pauseMenuIndex + (event.code === 'ArrowDown' ? 1 : -1));
    } else if (event.code === 'Enter' && !event.repeat) {
      event.preventDefault();
      pauseButtons()[pauseMenuIndex].click();
    }
    return;
  }
  if (event.key.toLowerCase() === 'w') { event.preventDefault(); setTurn(0, -1, true); }
  if (event.key.toLowerCase() === 'c') { event.preventDefault(); setTurn(0, 1, true); }
  if (event.code === 'ArrowLeft') { event.preventDefault(); setTurn(local ? 1 : 0, -1, true); }
  if (event.code === 'ArrowRight') { event.preventDefault(); setTurn(local ? 1 : 0, 1, true); }
  if (event.code === 'KeyX' && !event.repeat) triggerTack(game.humans[0]);
  if (event.code === 'ArrowDown' && local && !event.repeat) { event.preventDefault(); triggerTack(game.humans[1]); }
  if (event.code === 'Space' && !local && !event.repeat) { event.preventDefault(); triggerTack(game.humans[0]); }
  if (!event.repeat && event.key === '&') toggleSail(game.humans[0], 'main');
  if (!event.repeat && event.key.toLowerCase() === 'é') toggleSail(game.humans[0], 'jib');
  if (!event.repeat && event.key === '"') toggleSail(game.humans[0], 'spi');
  if (local && !event.repeat && event.key === ';') toggleSail(game.humans[1], 'main');
  if (local && !event.repeat && event.key === ':') toggleSail(game.humans[1], 'jib');
  if (local && !event.repeat && event.key === '!') toggleSail(game.humans[1], 'spi');
});

window.addEventListener('keyup', event => {
  const local = setup.mode === 'local';
  if (event.key.toLowerCase() === 'w') setTurn(0, -1, false);
  if (event.key.toLowerCase() === 'c') setTurn(0, 1, false);
  if (event.code === 'ArrowLeft') setTurn(local ? 1 : 0, -1, false);
  if (event.code === 'ArrowRight') setTurn(local ? 1 : 0, 1, false);
});

window.addEventListener('resize', resize);
document.addEventListener('fullscreenchange', updateFullscreenButton);
document.addEventListener('webkitfullscreenchange', updateFullscreenButton);
ui.startButton.addEventListener('click', startGame);
ui.fullscreenButton.addEventListener('click', enterFullscreen);
ui.restartButton.addEventListener('click', restartRace);
ui.homeButton.addEventListener('click', returnHome);
ui.pauseButton.addEventListener('click', togglePause);
ui.resumeButton.addEventListener('click', togglePause);
ui.pauseRestartButton.addEventListener('click', restartRace);
ui.pauseHomeButton.addEventListener('click', returnHome);
ui.leftHudToggle.addEventListener('click', () => toggleMobileHud(0));
ui.rightHudToggle.addEventListener('click', () => toggleMobileHud(1));
ui.tackButton.addEventListener('click', () => triggerTack(game.humans[0]));
ui.rightTackButton.addEventListener('click', () => triggerTack(game.humans[1]));
document.querySelectorAll('[data-player][data-sail]').forEach(button => {
  button.addEventListener('click', () => toggleSail(game.humans[Number(button.dataset.player)], button.dataset.sail));
});
document.querySelectorAll('[data-turn]').forEach(button => {
  const direction = Number(button.dataset.turn);
  const player = Number(button.dataset.player || 0);
  button.addEventListener('pointerdown', event => { event.preventDefault(); button.setPointerCapture(event.pointerId); setTurn(player, direction, true); });
  button.addEventListener('pointerup', () => setTurn(player, direction, false));
  button.addEventListener('pointercancel', () => setTurn(player, direction, false));
});
['mode', 'fleet', 'difficulty', 'course'].forEach(group => {
  document.querySelectorAll(`[data-${group}]`).forEach(button => button.addEventListener('click', () => selectOption(group, button.dataset[group])));
});

buildFleet('idle');
resize();
updateUI();
requestAnimationFrame(frame);
