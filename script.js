const STORAGE_KEY = "void-maze-sector-record-v4";
const TAU = Math.PI * 2;
const FOV = Math.PI / 3;
const MAX_VIEW_DISTANCE = 24;
const PLAYER_RADIUS = 0.2;
const TURRET_RADIUS = 0.28;
const EMITTER_RADIUS = 0.2;
const MOVE_SPEED = 2.7;
const CREEP_SPEED = 1.35;
const TURN_SPEED = 2.35;
const PLAYER_COOLDOWN = 0.26;
const PLAYER_HULL = 100;

const SECTOR_PREFIXES = ["Null", "Outer", "Cold", "Silent", "Glass", "Drift"];
const SECTOR_SUFFIXES = ["Array", "Vault", "Passage", "Spine", "Lattice", "Corridor"];
const PALETTES = [
  {
    code: "DRIFT-01",
    wallHue: 205,
    skyTop: "#02060d",
    skyBottom: "#0e1a28",
    floorTop: "#070a11",
    floorBottom: "#10131a",
    playerBeam: "#d8fbff",
    playerGlow: "rgba(216, 251, 255, 0.9)",
    alertBeam: "#ff9577",
    alertGlow: "rgba(255, 149, 119, 0.88)",
    gate: "#8fffe1",
    gateClosed: "#ffb18f",
    accent: "#b9d9ff",
  },
  {
    code: "SIGNAL-04",
    wallHue: 192,
    skyTop: "#03080c",
    skyBottom: "#0d1c1f",
    floorTop: "#06090a",
    floorBottom: "#111518",
    playerBeam: "#d1fff1",
    playerGlow: "rgba(209, 255, 241, 0.9)",
    alertBeam: "#ffb084",
    alertGlow: "rgba(255, 176, 132, 0.86)",
    gate: "#8fe9ff",
    gateClosed: "#ffb895",
    accent: "#d7fff6",
  },
  {
    code: "ASH-09",
    wallHue: 218,
    skyTop: "#03060b",
    skyBottom: "#141a25",
    floorTop: "#07080d",
    floorBottom: "#15161a",
    playerBeam: "#edf2ff",
    playerGlow: "rgba(237, 242, 255, 0.9)",
    alertBeam: "#ffa081",
    alertGlow: "rgba(255, 160, 129, 0.88)",
    gate: "#a2ffd7",
    gateClosed: "#ffaf8e",
    accent: "#dfe7ff",
  },
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function chooseRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function shuffle(array) {
  for (let index = array.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [array[index], array[swapIndex]] = [array[swapIndex], array[index]];
  }
  return array;
}

function toOdd(value) {
  return value % 2 === 0 ? value - 1 : value;
}

function randomOddBetween(min, max) {
  const values = [];
  for (let value = min; value <= max; value += 1) {
    if (value % 2 === 1) {
      values.push(value);
    }
  }
  return chooseRandom(values);
}

function normalizeAngle(angle) {
  let value = angle % TAU;
  if (value < 0) value += TAU;
  return value;
}

function shortestAngle(from, to) {
  let delta = (to - from + Math.PI) % TAU;
  if (delta < 0) delta += TAU;
  return delta - Math.PI;
}

function distanceToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) {
    return Math.hypot(px - ax, py - ay);
  }
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / lengthSquared, 0, 1);
  const closestX = ax + dx * t;
  const closestY = ay + dy * t;
  return Math.hypot(px - closestX, py - closestY);
}

function formatTime(milliseconds) {
  if (!Number.isFinite(milliseconds)) return "--";
  const totalSeconds = milliseconds / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const millis = Math.floor(milliseconds % 1000);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

function formatSector(level) {
  return String(level).padStart(2, "0");
}

function pickStartCell(columns, rows) {
  const side = Math.floor(Math.random() * 4);
  if (side === 0) return { col: 1, row: randomOddBetween(1, rows - 2) };
  if (side === 1) return { col: columns - 2, row: randomOddBetween(1, rows - 2) };
  if (side === 2) return { col: randomOddBetween(1, columns - 2), row: 1 };
  return { col: randomOddBetween(1, columns - 2), row: rows - 2 };
}

function farthestCell(grid, start) {
  const rows = grid.length;
  const columns = grid[0].length;
  const seen = Array.from({ length: rows }, () => Array(columns).fill(false));
  const queue = [{ col: start.col, row: start.row, distance: 0 }];
  let head = 0;
  let best = queue[0];
  seen[start.row][start.col] = true;

  while (head < queue.length) {
    const current = queue[head];
    head += 1;
    if (current.distance > best.distance) best = current;

    const neighbors = [
      { col: current.col + 1, row: current.row },
      { col: current.col - 1, row: current.row },
      { col: current.col, row: current.row + 1 },
      { col: current.col, row: current.row - 1 },
    ];

    for (const next of neighbors) {
      if (
        next.col <= 0 ||
        next.col >= columns - 1 ||
        next.row <= 0 ||
        next.row >= rows - 1 ||
        seen[next.row][next.col] ||
        grid[next.row][next.col] === 1
      ) {
        continue;
      }
      seen[next.row][next.col] = true;
      queue.push({ col: next.col, row: next.row, distance: current.distance + 1 });
    }
  }

  return best;
}

function openLoops(grid, openings) {
  const rows = grid.length;
  const columns = grid[0].length;
  const candidates = [];

  for (let row = 1; row < rows - 1; row += 1) {
    for (let col = 1; col < columns - 1; col += 1) {
      if (grid[row][col] === 0) continue;
      const horizontal =
        grid[row][col - 1] === 0 &&
        grid[row][col + 1] === 0 &&
        grid[row - 1][col] === 1 &&
        grid[row + 1][col] === 1;
      const vertical =
        grid[row - 1][col] === 0 &&
        grid[row + 1][col] === 0 &&
        grid[row][col - 1] === 1 &&
        grid[row][col + 1] === 1;
      if (horizontal || vertical) candidates.push({ col, row });
    }
  }

  for (const cell of shuffle(candidates).slice(0, openings)) {
    grid[cell.row][cell.col] = 0;
  }
}

function generateMaze(columns, rows, loopOpenings) {
  const grid = Array.from({ length: rows }, () => Array(columns).fill(1));
  const directions = [[0, -2], [2, 0], [0, 2], [-2, 0]];
  const start = pickStartCell(columns, rows);

  function carve(x, y) {
    grid[y][x] = 0;
    for (const [dx, dy] of shuffle(directions)) {
      const nextX = x + dx;
      const nextY = y + dy;
      if (
        nextX <= 0 ||
        nextX >= columns - 1 ||
        nextY <= 0 ||
        nextY >= rows - 1 ||
        grid[nextY][nextX] === 0
      ) {
        continue;
      }
      grid[y + dy / 2][x + dx / 2] = 0;
      carve(nextX, nextY);
    }
  }

  carve(start.col, start.row);
  openLoops(grid, loopOpenings);
  const exit = farthestCell(grid, start);
  return { grid, columns, rows, start, exit: { col: exit.col, row: exit.row } };
}

class AudioManager {
  constructor() {
    this.context = null;
    this.master = null;
    this.ready = false;
  }

  async unlock() {
    if (this.ready) {
      if (this.context.state === "suspended") await this.context.resume();
      return;
    }
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    this.context = new AudioCtor();
    this.master = this.context.createGain();
    this.master.gain.value = 0.24;
    this.master.connect(this.context.destination);
    await this.context.resume();
    this.ready = true;
  }

  pulse({ type = "sine", frequency = 440, endFrequency = null, duration = 0.12, gain = 0.03, filterFrequency = 1600 }) {
    if (!this.ready) return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const filter = this.context.createBiquadFilter();
    const envelope = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    if (endFrequency !== null) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, endFrequency), now + duration);
    }
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(filterFrequency, now);
    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.linearRampToValueAtTime(gain, now + 0.01);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(filter);
    filter.connect(envelope);
    envelope.connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  playerFire() { this.pulse({ type: "triangle", frequency: 780, endFrequency: 250, duration: 0.08, gain: 0.038, filterFrequency: 1450 }); }
  turretFire() { this.pulse({ type: "sawtooth", frequency: 250, endFrequency: 90, duration: 0.11, gain: 0.034, filterFrequency: 760 }); }
  impact() { this.pulse({ type: "square", frequency: 520, endFrequency: 180, duration: 0.09, gain: 0.024, filterFrequency: 420 }); }
  destroy() { this.pulse({ type: "sawtooth", frequency: 180, endFrequency: 45, duration: 0.32, gain: 0.055, filterFrequency: 560 }); }
  alarm(high) { this.pulse({ type: "square", frequency: high ? 980 : 760, endFrequency: high ? 760 : 620, duration: 0.08, gain: high ? 0.038 : 0.028, filterFrequency: high ? 2100 : 1600 }); }
  fail() { this.pulse({ type: "sawtooth", frequency: 170, endFrequency: 52, duration: 0.34, gain: 0.06, filterFrequency: 460 }); }
  win() {
    this.pulse({ type: "sine", frequency: 420, endFrequency: 840, duration: 0.22, gain: 0.028, filterFrequency: 1550 });
    this.pulse({ type: "triangle", frequency: 620, endFrequency: 1180, duration: 0.26, gain: 0.02, filterFrequency: 2200 });
  }
}

class InputHandler {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pointerDelta = 0;
    this.fireRequested = false;
    this.pointerLocked = false;

    window.addEventListener("keydown", (event) => {
      this.keys.add(event.key.toLowerCase());
      if (event.key === " ") {
        event.preventDefault();
        this.fireRequested = true;
      }
    });

    window.addEventListener("keyup", (event) => {
      this.keys.delete(event.key.toLowerCase());
    });

    window.addEventListener("blur", () => {
      this.keys.clear();
      this.pointerDelta = 0;
      this.fireRequested = false;
    });

    canvas.addEventListener("mousedown", () => {
      this.fireRequested = true;
    });

    canvas.addEventListener("mousemove", (event) => {
      if (this.pointerLocked) this.pointerDelta += event.movementX;
    });

    document.addEventListener("pointerlockchange", () => {
      this.pointerLocked = document.pointerLockElement === canvas;
    });
  }

  clearTransient() {
    this.pointerDelta = 0;
    this.fireRequested = false;
  }

  requestPointerLock() {
    if (document.pointerLockElement !== this.canvas && this.canvas.requestPointerLock) {
      this.canvas.requestPointerLock();
    }
  }

  releasePointerLock() {
    if (document.pointerLockElement === this.canvas && document.exitPointerLock) {
      document.exitPointerLock();
    }
  }

  isDown(...keys) { return keys.some((key) => this.keys.has(key)); }
  getForward() { return (this.isDown("w", "arrowup") ? 1 : 0) - (this.isDown("s", "arrowdown") ? 1 : 0); }
  getStrafe() { return (this.isDown("d") ? 1 : 0) - (this.isDown("a") ? 1 : 0); }
  getTurnDirection() { return (this.isDown("e", "arrowright") ? 1 : 0) - (this.isDown("q", "arrowleft") ? 1 : 0); }
  consumeMouseTurn() { const value = this.pointerDelta * 0.0025; this.pointerDelta = 0; return value; }
  consumeFire() { const fire = this.fireRequested; this.fireRequested = false; return fire; }
}

class Game {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.input = new InputHandler(this.canvas);
    this.audio = new AudioManager();

    this.levelValue = document.getElementById("levelValue");
    this.timerValue = document.getElementById("timerValue");
    this.bestValue = document.getElementById("bestValue");
    this.patternValue = document.getElementById("patternValue");
    this.challengeValue = document.getElementById("challengeValue");
    this.handlingValue = document.getElementById("handlingValue");
    this.speedFill = document.getElementById("speedFill");
    this.speedLabel = document.getElementById("speedLabel");
    this.detectionFill = document.getElementById("detectionFill");
    this.detectionLabel = document.getElementById("detectionLabel");
    this.cooldownFill = document.getElementById("cooldownFill");
    this.cooldownLabel = document.getElementById("cooldownLabel");
    this.statusHint = document.getElementById("statusHint");

    this.overlay = document.getElementById("overlay");
    this.overlayKicker = document.getElementById("overlayKicker");
    this.overlayTitle = document.getElementById("overlayTitle");
    this.overlayDescription = document.getElementById("overlayDescription");
    this.overlayPattern = document.getElementById("overlayPattern");
    this.overlayPace = document.getElementById("overlayPace");
    this.overlayRoute = document.getElementById("overlayRoute");
    this.primaryAction = document.getElementById("primaryAction");
    this.secondaryAction = document.getElementById("secondaryAction");

    this.width = 0;
    this.height = 0;
    this.depthBuffer = [];
    this.lastTime = 0;
    this.runTimeMs = 0;
    this.level = 1;
    this.state = "menu";
    this.bestTime = this.loadBestTime();
    this.alarmCooldown = 0;
    this.alertLevel = 0;
    this.hitMarker = 0;
    this.damageFlash = 0;
    this.aimTarget = null;
    this.palette = PALETTES[0];
    this.sectorName = `${SECTOR_PREFIXES[0]} ${SECTOR_SUFFIXES[0]}`;
    this.remainingHostiles = 0;
    this.gateOpen = false;
    this.beams = [];
    this.particles = [];
    this.turrets = [];
    this.emitters = [];
    this.player = {
      x: 1.5,
      y: 1.5,
      angle: 0,
      hull: PLAYER_HULL,
      detection: 0,
      cooldown: 0,
      kick: 0,
      bob: 0,
      movementBlend: 0,
    };
    this.exit = { col: 1, row: 1 };
    this.maze = generateMaze(15, 15, 10);

    this.bindEvents();
    this.resize();
    this.buildLevel(this.level);
    this.showMenuOverlay();
    this.updateHud();

    requestAnimationFrame((timestamp) => this.loop(timestamp));
  }

  bindEvents() {
    window.addEventListener("resize", () => this.resize());

    window.addEventListener("keydown", async (event) => {
      if (event.key.toLowerCase() === "p") {
        event.preventDefault();
        if (this.state === "playing") {
          this.pauseRun();
        } else if (this.state === "paused") {
          await this.resumeRun();
        }
      }

      if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        if (this.state !== "menu") {
          await this.audio.unlock();
          this.buildLevel(this.level);
          this.beginRun();
        }
      }

      if (event.key.toLowerCase() === "m") {
        event.preventDefault();
        if (this.state === "playing" || this.state === "paused") {
          this.goToMenu();
        }
      }

      if (event.key === "Enter" && this.overlay.classList.contains("show")) {
        event.preventDefault();
        await this.handlePrimaryAction();
      }
    });

    this.canvas.addEventListener("click", async () => {
      if (!this.audio.ready) {
        await this.audio.unlock();
      }
      if (this.state === "playing") {
        this.input.requestPointerLock();
      }
    });

    this.primaryAction.addEventListener("click", async () => {
      await this.handlePrimaryAction();
    });

    this.secondaryAction.addEventListener("click", () => {
      this.handleSecondaryAction();
    });
  }

  async handlePrimaryAction() {
    await this.audio.unlock();

    if (this.state === "menu") {
      this.buildLevel(this.level);
      this.beginRun();
      return;
    }

    if (this.state === "paused") {
      await this.resumeRun();
      return;
    }

    if (this.state === "gameover") {
      this.buildLevel(this.level);
      this.beginRun();
      return;
    }

    if (this.state === "win") {
      this.level += 1;
      this.buildLevel(this.level);
      this.beginRun();
    }
  }

  handleSecondaryAction() {
    if (this.state === "paused" || this.state === "gameover" || this.state === "win") {
      this.goToMenu();
    }
  }

  loadBestTime() {
    const rawValue = Number(window.localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(rawValue) && rawValue > 0 ? rawValue : Infinity;
  }

  saveBestTime(value) {
    if (value < this.bestTime) {
      this.bestTime = value;
      window.localStorage.setItem(STORAGE_KEY, String(Math.round(value)));
    }
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.width = this.canvas.clientWidth;
    this.height = this.canvas.clientHeight;
    this.canvas.width = Math.max(1, Math.floor(this.width * dpr));
    this.canvas.height = Math.max(1, Math.floor(this.height * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = true;
  }

  setOverlayState(kind, { kicker, title, description, pattern, pace, route, primary, secondary = null }) {
    this.overlay.className = `overlay show ${kind}`;
    this.overlayKicker.textContent = kicker;
    this.overlayTitle.textContent = title;
    this.overlayDescription.textContent = description;
    this.overlayPattern.textContent = pattern;
    this.overlayPace.textContent = pace;
    this.overlayRoute.textContent = route;
    this.primaryAction.textContent = primary;
    this.secondaryAction.hidden = !secondary;
    if (secondary) {
      this.secondaryAction.textContent = secondary;
    }
  }

  showMenuOverlay() {
    this.state = "menu";
    this.input.releasePointerLock();
    this.setOverlayState("start-screen", {
      kicker: "Sector Brief",
      title: "VOID MAZE",
      description: "Slip through the orbital maze, break the defense net, then take the jump gate before the facility locks down.",
      pattern: `${this.sectorName} / ${this.palette.code}`,
      pace: "Stealth first",
      route: "Disable defenses",
      primary: "Deploy",
    });
  }

  pauseRun() {
    if (this.state !== "playing") return;
    this.state = "paused";
    this.input.releasePointerLock();
    this.setOverlayState("pause-screen", {
      kicker: "Signal Hold",
      title: "PAUSED",
      description: "The facility scan is frozen. Resume when you are ready to move again.",
      pattern: `${this.sectorName} / ${this.palette.code}`,
      pace: this.alertLevel === 2 ? "Alarm maxed" : this.alertLevel === 1 ? "Trace live" : "Quiet",
      route: this.gateOpen ? "Reach jump gate" : "Remove remaining defenses",
      primary: "Resume",
      secondary: "Menu",
    });
  }

  async resumeRun() {
    if (this.state !== "paused") return;
    await this.audio.unlock();
    this.state = "playing";
    this.overlay.className = "overlay";
    this.input.requestPointerLock();
  }

  goToMenu() {
    this.buildLevel(this.level);
    this.showMenuOverlay();
    this.updateHud();
  }

  beginRun() {
    this.state = "playing";
    this.runTimeMs = 0;
    this.alertLevel = 0;
    this.alarmCooldown = 0;
    this.hitMarker = 0;
    this.damageFlash = 0;
    this.overlay.className = "overlay";
    this.input.requestPointerLock();
    this.updateHud();
  }

  buildLevel(level) {
    const columns = toOdd(clamp(15 + level * 2, 15, 23));
    const rows = toOdd(clamp(15 + level * 2, 15, 23));
    const openings = clamp(10 + level * 2, 10, 22);
    this.maze = generateMaze(columns, rows, openings);
    this.exit = { col: this.maze.exit.col, row: this.maze.exit.row };
    this.palette = PALETTES[(level - 1) % PALETTES.length];
    this.sectorName = `${chooseRandom(SECTOR_PREFIXES)} ${chooseRandom(SECTOR_SUFFIXES)}`;
    this.applyPalette();

    const startX = this.maze.start.col + 0.5;
    const startY = this.maze.start.row + 0.5;
    const exitX = this.exit.col + 0.5;
    const exitY = this.exit.row + 0.5;

    this.player = {
      x: startX,
      y: startY,
      angle: Math.atan2(exitY - startY, exitX - startX),
      hull: PLAYER_HULL,
      detection: 0,
      cooldown: 0,
      kick: 0,
      bob: 0,
      movementBlend: 0,
    };

    this.beams = [];
    this.particles = [];
    this.turrets = this.spawnTurrets(level);
    this.emitters = this.spawnEmitters(level);
    this.remainingHostiles = this.turrets.length + this.emitters.length;
    this.gateOpen = this.remainingHostiles === 0;
    this.aimTarget = null;
    this.refreshObjectiveHint();
    this.updateHud();
  }

  applyPalette() {
    const root = document.documentElement.style;
    root.setProperty("--accent", this.palette.accent);
    root.setProperty("--accent-strong", this.palette.gate);
  }

  openCells() {
    const cells = [];
    for (let row = 1; row < this.maze.rows - 1; row += 1) {
      for (let col = 1; col < this.maze.columns - 1; col += 1) {
        if (this.maze.grid[row][col] === 1) continue;
        const distToStart = Math.hypot(col - this.maze.start.col, row - this.maze.start.row);
        const distToExit = Math.hypot(col - this.exit.col, row - this.exit.row);
        if (distToStart < 4 || distToExit < 3) continue;
        cells.push({ col, row, distToStart, distToExit });
      }
    }
    return shuffle(cells);
  }

  spawnTurrets(level) {
    const turrets = [];
    const desired = clamp(2 + Math.floor(level / 2), 3, 5);

    for (const cell of this.openCells()) {
      const farEnough = turrets.every((turret) => Math.hypot(turret.x - (cell.col + 0.5), turret.y - (cell.row + 0.5)) > 3.4);
      if (!farEnough) continue;

      turrets.push({
        kind: "turret",
        x: cell.col + 0.5,
        y: cell.row + 0.5,
        angle: Math.random() * TAU,
        health: level >= 4 ? 3 : 2,
        maxHealth: level >= 4 ? 3 : 2,
        cooldown: 0.8 + Math.random() * 0.9,
        glow: 0,
        pulse: Math.random() * TAU,
        destroyed: false,
      });

      if (turrets.length >= desired) break;
    }

    return turrets;
  }

  spawnEmitters(level) {
    const candidates = [];

    for (let row = 1; row < this.maze.rows - 1; row += 1) {
      for (let col = 1; col < this.maze.columns - 1; col += 1) {
        if (this.maze.grid[row][col] === 1) continue;

        const wallHorizontal = this.maze.grid[row][col - 1] === 1 && this.maze.grid[row][col + 1] === 1;
        const openVertical = this.maze.grid[row - 1][col] === 0 && this.maze.grid[row + 1][col] === 0;
        const wallVertical = this.maze.grid[row - 1][col] === 1 && this.maze.grid[row + 1][col] === 1;
        const openHorizontal = this.maze.grid[row][col - 1] === 0 && this.maze.grid[row][col + 1] === 0;
        const distToStart = Math.hypot(col - this.maze.start.col, row - this.maze.start.row);
        const distToExit = Math.hypot(col - this.exit.col, row - this.exit.row);

        if (distToStart < 4 || distToExit < 3) continue;

        if (wallHorizontal && openVertical) {
          const mountLeft = Math.random() < 0.5;
          candidates.push({
            kind: "emitter",
            x: mountLeft ? col + 0.12 : col + 0.88,
            y: row + 0.5,
            beamAx: col + 0.14,
            beamAy: row + 0.5,
            beamBx: col + 0.86,
            beamBy: row + 0.5,
            health: 2,
            maxHealth: 2,
            destroyed: false,
            pulse: Math.random() * TAU,
            offset: Math.random() * 2.6,
          });
        } else if (wallVertical && openHorizontal) {
          const mountTop = Math.random() < 0.5;
          candidates.push({
            kind: "emitter",
            x: col + 0.5,
            y: mountTop ? row + 0.12 : row + 0.88,
            beamAx: col + 0.5,
            beamAy: row + 0.14,
            beamBx: col + 0.5,
            beamBy: row + 0.86,
            health: 2,
            maxHealth: 2,
            destroyed: false,
            pulse: Math.random() * TAU,
            offset: Math.random() * 2.6,
          });
        }
      }
    }

    return shuffle(candidates).slice(0, clamp(1 + Math.floor(level / 2), 2, 4));
  }

  isWallCell(col, row) {
    if (row < 0 || row >= this.maze.rows || col < 0 || col >= this.maze.columns) return true;
    return this.maze.grid[row][col] === 1;
  }

  collides(x, y, radius = PLAYER_RADIUS) {
    const samples = [
      [x, y],
      [x - radius, y - radius],
      [x + radius, y - radius],
      [x - radius, y + radius],
      [x + radius, y + radius],
    ];

    return samples.some(([sampleX, sampleY]) => this.isWallCell(Math.floor(sampleX), Math.floor(sampleY)));
  }

  movePlayer(delta) {
    const mouseTurn = this.input.consumeMouseTurn();
    const keyTurn = this.input.getTurnDirection() * TURN_SPEED * delta;
    this.player.angle = normalizeAngle(this.player.angle + mouseTurn + keyTurn);

    const forward = this.input.getForward();
    const strafe = this.input.getStrafe();
    const creeping = this.input.isDown("shift");
    const speed = creeping ? CREEP_SPEED : MOVE_SPEED;
    const magnitude = Math.hypot(forward, strafe) || 1;
    const moveX =
      (Math.cos(this.player.angle) * forward + Math.cos(this.player.angle + Math.PI / 2) * strafe) / magnitude;
    const moveY =
      (Math.sin(this.player.angle) * forward + Math.sin(this.player.angle + Math.PI / 2) * strafe) / magnitude;

    if (forward !== 0 || strafe !== 0) {
      const nextX = this.player.x + moveX * speed * delta;
      const nextY = this.player.y + moveY * speed * delta;

      if (!this.collides(nextX, this.player.y)) this.player.x = nextX;
      if (!this.collides(this.player.x, nextY)) this.player.y = nextY;

      this.player.bob += delta * (creeping ? 4 : 7);
      this.player.movementBlend = lerp(this.player.movementBlend, 1, delta * 7);
    } else {
      this.player.movementBlend = lerp(this.player.movementBlend, 0, delta * 6);
    }
  }

  ray(originX, originY, angle, maxDistance = MAX_VIEW_DISTANCE) {
    const directionX = Math.cos(angle);
    const directionY = Math.sin(angle);
    let mapX = Math.floor(originX);
    let mapY = Math.floor(originY);
    const deltaDistanceX = directionX === 0 ? 1e9 : Math.abs(1 / directionX);
    const deltaDistanceY = directionY === 0 ? 1e9 : Math.abs(1 / directionY);

    let stepX = 0;
    let stepY = 0;
    let sideDistanceX = 0;
    let sideDistanceY = 0;

    if (directionX < 0) {
      stepX = -1;
      sideDistanceX = (originX - mapX) * deltaDistanceX;
    } else {
      stepX = 1;
      sideDistanceX = (mapX + 1 - originX) * deltaDistanceX;
    }

    if (directionY < 0) {
      stepY = -1;
      sideDistanceY = (originY - mapY) * deltaDistanceY;
    } else {
      stepY = 1;
      sideDistanceY = (mapY + 1 - originY) * deltaDistanceY;
    }

    let distance = 0;
    let vertical = false;

    while (distance < maxDistance) {
      if (sideDistanceX < sideDistanceY) {
        mapX += stepX;
        distance = sideDistanceX;
        sideDistanceX += deltaDistanceX;
        vertical = true;
      } else {
        mapY += stepY;
        distance = sideDistanceY;
        sideDistanceY += deltaDistanceY;
        vertical = false;
      }

      if (mapX < 0 || mapY < 0 || mapX >= this.maze.columns || mapY >= this.maze.rows) {
        break;
      }

      if (this.maze.grid[mapY][mapX] === 1) {
        return {
          distance,
          hitX: originX + directionX * distance,
          hitY: originY + directionY * distance,
          vertical,
        };
      }
    }

    return {
      distance: maxDistance,
      hitX: originX + directionX * maxDistance,
      hitY: originY + directionY * maxDistance,
      vertical,
    };
  }

  hasLineOfSight(fromX, fromY, toX, toY, padding = 0.18) {
    const distance = Math.hypot(toX - fromX, toY - fromY);
    const angle = Math.atan2(toY - fromY, toX - fromX);
    const hit = this.ray(fromX, fromY, angle, distance + 0.04);
    return hit.distance >= distance - padding;
  }

  getAlertLevel() {
    if (this.player.detection >= 76) return 2;
    if (this.player.detection >= 38) return 1;
    return 0;
  }

  isEmitterActive(emitter) {
    const cycle = this.alertLevel === 2 ? 1.8 : this.alertLevel === 1 ? 2.1 : 2.5;
    const activeWindow = this.alertLevel === 2 ? 0.78 : this.alertLevel === 1 ? 0.66 : 0.56;
    const phase = ((this.runTimeMs / 1000) + emitter.offset) % cycle;
    return phase < cycle * activeWindow;
  }

  getAimTarget() {
    const wallHit = this.ray(this.player.x, this.player.y, this.player.angle, MAX_VIEW_DISTANCE);
    const directionX = Math.cos(this.player.angle);
    const directionY = Math.sin(this.player.angle);
    let bestTarget = null;
    let bestDistance = wallHit.distance;

    const targets = [
      ...this.turrets.filter((turret) => !turret.destroyed),
      ...this.emitters.filter((emitter) => !emitter.destroyed),
    ];

    for (const target of targets) {
      const deltaX = target.x - this.player.x;
      const deltaY = target.y - this.player.y;
      const forward = deltaX * directionX + deltaY * directionY;
      if (forward <= 0 || forward >= bestDistance) continue;

      const sideways = Math.abs(-directionY * deltaX + directionX * deltaY);
      const radius = target.kind === "turret" ? TURRET_RADIUS + 0.05 : EMITTER_RADIUS + 0.04;
      if (sideways > radius) continue;
      if (!this.hasLineOfSight(this.player.x, this.player.y, target.x, target.y, radius)) continue;

      bestDistance = forward;
      bestTarget = target;
    }

    return bestTarget;
  }

  refreshHostileCount() {
    this.remainingHostiles =
      this.turrets.filter((turret) => !turret.destroyed).length +
      this.emitters.filter((emitter) => !emitter.destroyed).length;
    this.gateOpen = this.remainingHostiles === 0;
  }

  refreshObjectiveHint() {
    if (this.gateOpen) {
      this.statusHint.textContent = "Jump gate unlocked. Cross the maze and hit the glowing exit column.";
      return;
    }

    if (this.alertLevel === 2) {
      this.statusHint.textContent = "Alarm maxed. Turrets rotate faster and laser lanes stay hot longer.";
      return;
    }

    if (this.alertLevel === 1) {
      this.statusHint.textContent = "Facility trace active. Stay low, move clean, and avoid open sightlines.";
      return;
    }

    this.statusHint.textContent = "Disable every defense node in the maze. The jump gate unlocks when the count hits zero.";
  }

  updateHud() {
    this.levelValue.textContent = formatSector(this.level);
    this.timerValue.textContent = formatTime(this.runTimeMs);
    this.bestValue.textContent = String(this.remainingHostiles).padStart(2, "0");
    this.patternValue.textContent = this.palette.code;
    this.challengeValue.textContent = this.gateOpen ? "Open" : "Locked";
    this.handlingValue.textContent = Number.isFinite(this.bestTime) ? formatTime(this.bestTime) : "--";

    const hullRatio = clamp(this.player.hull / PLAYER_HULL, 0, 1);
    const cooldownRatio = 1 - clamp(this.player.cooldown / PLAYER_COOLDOWN, 0, 1);
    const detectionRatio = clamp(this.player.detection / 100, 0, 1);

    this.speedFill.style.width = `${hullRatio * 100}%`;
    this.detectionFill.style.width = `${detectionRatio * 100}%`;
    this.cooldownFill.style.width = `${cooldownRatio * 100}%`;

    this.speedLabel.textContent = hullRatio > 0.65 ? "Stable" : hullRatio > 0.3 ? "Compromised" : "Critical";
    this.cooldownLabel.textContent = this.player.cooldown > 0.02 ? "Charging" : "Ready";
    this.detectionLabel.textContent = this.alertLevel === 2 ? "Alarm" : this.alertLevel === 1 ? "Traced" : "Hidden";
  }

  spawnSparks(x, y, color, count = 7, speed = 2) {
    for (let index = 0; index < count; index += 1) {
      const angle = Math.random() * TAU;
      const velocity = speed * (0.35 + Math.random());
      const life = 0.18 + Math.random() * 0.28;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        size: 0.04 + Math.random() * 0.06,
        life,
        maxLife: life,
        color,
      });
    }
  }

  spawnExplosion(x, y, color) {
    this.spawnSparks(x, y, color, 16, 3.4);
  }

  addBeam(ax, ay, bx, by, color, glow, source) {
    this.beams.push({
      ax,
      ay,
      bx,
      by,
      color,
      glow,
      source,
      life: 0.09,
      maxLife: 0.09,
    });
  }

  destroyTarget(target) {
    target.destroyed = true;
    this.spawnExplosion(target.x, target.y, target.kind === "turret" ? "#ff8c7c" : "#7beaff");
    this.audio.destroy();
    this.refreshHostileCount();
    this.refreshObjectiveHint();
  }

  firePlayerWeapon() {
    if (this.player.cooldown > 0 || this.state !== "playing") return;

    const wallHit = this.ray(this.player.x, this.player.y, this.player.angle, MAX_VIEW_DISTANCE);
    const directionX = Math.cos(this.player.angle);
    const directionY = Math.sin(this.player.angle);
    let impactX = wallHit.hitX;
    let impactY = wallHit.hitY;
    let hitTarget = null;
    let hitDistance = wallHit.distance;

    const targets = [
      ...this.turrets.filter((turret) => !turret.destroyed),
      ...this.emitters.filter((emitter) => !emitter.destroyed),
    ];

    for (const target of targets) {
      const deltaX = target.x - this.player.x;
      const deltaY = target.y - this.player.y;
      const forward = deltaX * directionX + deltaY * directionY;
      if (forward <= 0 || forward >= hitDistance) continue;

      const sideways = Math.abs(-directionY * deltaX + directionX * deltaY);
      const radius = target.kind === "turret" ? TURRET_RADIUS + 0.06 : EMITTER_RADIUS + 0.04;
      if (sideways > radius) continue;
      if (!this.hasLineOfSight(this.player.x, this.player.y, target.x, target.y, radius)) continue;

      hitDistance = forward;
      impactX = target.x;
      impactY = target.y;
      hitTarget = target;
    }

    this.player.cooldown = PLAYER_COOLDOWN;
    this.player.kick = 1;
    this.player.detection = clamp(this.player.detection + (hitTarget ? 18 : 13), 0, 100);
    this.addBeam(this.player.x, this.player.y, impactX, impactY, this.palette.playerBeam, this.palette.playerGlow, "player");
    this.audio.playerFire();

    if (hitTarget) {
      hitTarget.health -= 1;
      this.hitMarker = 0.14;
      this.spawnSparks(impactX, impactY, hitTarget.kind === "turret" ? "#ff9b8a" : "#9ffbff");
      this.audio.impact();

      if (hitTarget.health <= 0) {
        this.destroyTarget(hitTarget);
      }
    } else {
      this.spawnSparks(impactX, impactY, this.palette.playerBeam, 5, 1.5);
    }
  }

  turretFire(turret) {
    const angle = Math.atan2(this.player.y - turret.y, this.player.x - turret.x);
    const targetDistance = Math.hypot(this.player.x - turret.x, this.player.y - turret.y);
    const wallHit = this.ray(turret.x, turret.y, angle, targetDistance + 0.25);
    let impactX = wallHit.hitX;
    let impactY = wallHit.hitY;

    if (wallHit.distance >= targetDistance - PLAYER_RADIUS) {
      impactX = this.player.x;
      impactY = this.player.y;
      this.damageFlash = 0.36;
      this.player.hull = 0;
      this.addBeam(turret.x, turret.y, impactX, impactY, this.palette.alertBeam, this.palette.alertGlow, "enemy");
      this.audio.turretFire();
      this.failRun("A turret locked on and burned through the hull.");
      return;
    }

    this.addBeam(turret.x, turret.y, impactX, impactY, this.palette.alertBeam, this.palette.alertGlow, "enemy");
    this.spawnSparks(impactX, impactY, "#ff9b7f", 6, 1.8);
    this.audio.turretFire();
  }

  failRun(message) {
    if (this.state !== "playing") return;
    this.state = "gameover";
    this.input.releasePointerLock();
    this.damageFlash = 0.5;
    this.audio.fail();
    this.refreshObjectiveHint();
    this.updateHud();
    this.setOverlayState("gameover-screen", {
      kicker: "Hull Loss",
      title: "VESSEL LOST",
      description: message,
      pattern: `${this.sectorName} / ${this.palette.code}`,
      pace: this.alertLevel === 2 ? "Alarm state" : "Defense contact",
      route: "Redeploy or return to menu",
      primary: "Redeploy",
      secondary: "Menu",
    });
  }

  winRun() {
    if (this.state !== "playing") return;
    this.state = "win";
    this.input.releasePointerLock();
    this.audio.win();
    this.saveBestTime(this.runTimeMs);
    this.updateHud();
    this.setOverlayState("win-screen", {
      kicker: "Sector Clear",
      title: "GATE BREACHED",
      description: `Sector cleared in ${formatTime(this.runTimeMs)}. The next maze is ready to spin up.`,
      pattern: `${this.sectorName} / ${this.palette.code}`,
      pace: this.alertLevel === 2 ? "Escaped under alarm" : "Clean exit",
      route: "Advance or return to menu",
      primary: "Next Sector",
      secondary: "Menu",
    });
  }

  updateTurrets(delta) {
    const creeping = this.input.isDown("shift");

    for (const turret of this.turrets) {
      if (turret.destroyed) continue;

      const deltaX = this.player.x - turret.x;
      const deltaY = this.player.y - turret.y;
      const distance = Math.hypot(deltaX, deltaY);
      const desiredAngle = Math.atan2(deltaY, deltaX);
      const alertBoost = this.alertLevel === 2 ? 1.45 : this.alertLevel === 1 ? 1.15 : 1;
      const maxTurn = delta * (1.8 * alertBoost);
      const angleDelta = shortestAngle(turret.angle, desiredAngle);
      turret.angle = normalizeAngle(turret.angle + clamp(angleDelta, -maxTurn, maxTurn));
      turret.cooldown -= delta;
      turret.pulse += delta * 2;

      const viewRange = (creeping ? 5.6 : 8.3) + (this.alertLevel * 1.35);
      const seesPlayer =
        distance < viewRange &&
        Math.abs(angleDelta) < 0.92 &&
        this.hasLineOfSight(turret.x, turret.y, this.player.x, this.player.y, 0.22);

      turret.glow = lerp(turret.glow, seesPlayer ? 1 : 0.25, delta * 6);

      if (!seesPlayer) continue;

      this.player.detection = clamp(
        this.player.detection + delta * (distance < 4.2 ? 16 : 10) * (creeping ? 0.7 : 1),
        0,
        100
      );

      if (Math.abs(shortestAngle(turret.angle, desiredAngle)) < 0.14 && turret.cooldown <= 0) {
        turret.cooldown = (this.alertLevel === 2 ? 0.92 : this.alertLevel === 1 ? 1.18 : 1.48) + Math.random() * 0.18;
        this.turretFire(turret);
      }
    }
  }

  updateEmitters() {
    for (const emitter of this.emitters) {
      if (emitter.destroyed || !this.isEmitterActive(emitter)) continue;

      const distance = distanceToSegment(
        this.player.x,
        this.player.y,
        emitter.beamAx,
        emitter.beamAy,
        emitter.beamBx,
        emitter.beamBy
      );

      if (distance < PLAYER_RADIUS * 0.78) {
        this.player.hull = 0;
        this.damageFlash = 0.5;
        this.failRun("A corridor laser sliced through the ship.");
        return;
      }
    }
  }

  updateEffects(delta) {
    this.player.cooldown = Math.max(0, this.player.cooldown - delta);
    this.player.kick = Math.max(0, this.player.kick - delta * 7);
    this.hitMarker = Math.max(0, this.hitMarker - delta);
    this.damageFlash = Math.max(0, this.damageFlash - delta);

    this.beams = this.beams.filter((beam) => {
      beam.life -= delta;
      return beam.life > 0;
    });

    this.particles = this.particles.filter((particle) => {
      particle.life -= delta;
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.vx *= 0.97;
      particle.vy *= 0.97;
      return particle.life > 0;
    });
  }

  update(delta) {
    this.runTimeMs += delta * 1000;
    this.movePlayer(delta);

    if (this.input.consumeFire()) {
      this.firePlayerWeapon();
    }

    this.player.detection = clamp(this.player.detection - delta * (this.input.isDown("shift") ? 10 : 6), 0, 100);
    const previousAlert = this.alertLevel;
    this.alertLevel = this.getAlertLevel();

    if (this.alertLevel > 0) {
      this.alarmCooldown -= delta;
      if (this.alarmCooldown <= 0 || this.alertLevel > previousAlert) {
        this.audio.alarm(this.alertLevel === 2);
        this.alarmCooldown = this.alertLevel === 2 ? 1.15 : 2;
      }
    } else {
      this.alarmCooldown = 0;
    }

    this.updateTurrets(delta);
    if (this.state !== "playing") return;
    this.updateEmitters();
    if (this.state !== "playing") return;

    this.updateEffects(delta);
    this.refreshHostileCount();
    this.aimTarget = this.getAimTarget();
    this.refreshObjectiveHint();

    const exitX = this.exit.col + 0.5;
    const exitY = this.exit.row + 0.5;
    if (this.gateOpen && Math.hypot(this.player.x - exitX, this.player.y - exitY) < 0.6) {
      this.winRun();
    }

    this.updateHud();
  }

  getViewBob() {
    return Math.sin(this.player.bob * 2.1) * 4 * this.player.movementBlend - this.player.kick * 5;
  }

  projectPoint(worldX, worldY) {
    const deltaX = worldX - this.player.x;
    const deltaY = worldY - this.player.y;
    const rawDistance = Math.hypot(deltaX, deltaY);
    if (rawDistance < 0.001) return null;

    const angle = shortestAngle(this.player.angle, Math.atan2(deltaY, deltaX));
    const correctedDistance = rawDistance * Math.cos(angle);
    if (correctedDistance <= 0.01 || Math.abs(angle) > FOV / 2 + 0.35) return null;

    const screenX = this.width / 2 + (Math.tan(angle) / Math.tan(FOV / 2)) * (this.width / 2);
    if (screenX < -220 || screenX > this.width + 220) return null;
    return {
      x: screenX,
      angle,
      rawDistance,
      distance: correctedDistance,
      scale: this.height / correctedDistance,
    };
  }

  isOccluded(projected, allowance = 0.15) {
    if (!this.depthBuffer.length) return false;
    const index = clamp(Math.floor((projected.x / this.width) * this.depthBuffer.length), 0, this.depthBuffer.length - 1);
    return projected.distance > this.depthBuffer[index] + allowance;
  }

  drawProjectedLine(ax, ay, bx, by, color, glow, alpha = 1) {
    const start = this.projectPoint(ax, ay);
    const end = this.projectPoint(bx, by);
    if (!start || !end) return;

    const averageDistance = (start.distance + end.distance) * 0.5;
    const lineWidth = clamp(16 / averageDistance, 1.2, 7);
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;
    this.ctx.shadowBlur = 18;
    this.ctx.shadowColor = glow;
    this.ctx.beginPath();
    this.ctx.moveTo(start.x, this.height * 0.5 + this.getViewBob() + start.scale * 0.18);
    this.ctx.lineTo(end.x, this.height * 0.5 + this.getViewBob() + end.scale * 0.18);
    this.ctx.stroke();
    this.ctx.restore();
  }

  renderBackground() {
    const horizon = this.height * 0.5 + this.getViewBob();
    const skyGradient = this.ctx.createLinearGradient(0, 0, 0, horizon);
    skyGradient.addColorStop(0, this.palette.skyTop);
    skyGradient.addColorStop(1, this.palette.skyBottom);
    this.ctx.fillStyle = skyGradient;
    this.ctx.fillRect(0, 0, this.width, horizon);

    const floorGradient = this.ctx.createLinearGradient(0, horizon, 0, this.height);
    floorGradient.addColorStop(0, this.palette.floorTop);
    floorGradient.addColorStop(1, this.palette.floorBottom);
    this.ctx.fillStyle = floorGradient;
    this.ctx.fillRect(0, horizon, this.width, this.height - horizon);

    this.ctx.save();
    this.ctx.globalAlpha = 0.16;
    this.ctx.strokeStyle = "rgba(255,255,255,0.04)";
    for (let index = 1; index < 7; index += 1) {
      const y = horizon + ((this.height - horizon) / 7) * index;
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width, y);
      this.ctx.stroke();
    }
    this.ctx.restore();
  }

  renderWalls() {
    const horizon = this.height * 0.5 + this.getViewBob();
    const sliceCount = Math.max(140, Math.floor(this.width / 5));
    const sliceWidth = this.width / sliceCount;
    this.depthBuffer = new Array(sliceCount);

    for (let slice = 0; slice < sliceCount; slice += 1) {
      const progress = slice / sliceCount;
      const rayAngle = this.player.angle - FOV / 2 + progress * FOV;
      const hit = this.ray(this.player.x, this.player.y, rayAngle);
      const correctedDistance = Math.max(0.0001, hit.distance * Math.cos(rayAngle - this.player.angle));
      this.depthBuffer[slice] = correctedDistance;

      const wallHeight = Math.min(this.height * 1.25, (this.height * 0.92) / correctedDistance);
      const top = horizon - wallHeight * 0.5;
      const hue = this.palette.wallHue + (hit.vertical ? 0 : 8);
      const saturation = hit.vertical ? 34 : 28;
      const lightness = clamp(56 - correctedDistance * 5.3 - (hit.vertical ? 0 : 7), 12, 58);

      this.ctx.fillStyle = `hsl(${hue} ${saturation}% ${lightness}%)`;
      this.ctx.fillRect(slice * sliceWidth, top, sliceWidth + 1, wallHeight);

      this.ctx.fillStyle = `rgba(255,255,255,${clamp(0.14 - correctedDistance * 0.012, 0.01, 0.14)})`;
      this.ctx.fillRect(slice * sliceWidth, top + 1, sliceWidth + 1, Math.max(1, wallHeight * 0.045));
    }
  }

  renderGate() {
    const projected = this.projectPoint(this.exit.col + 0.5, this.exit.row + 0.5);
    if (!projected || this.isOccluded(projected, 0.25)) return;

    const size = projected.scale * 0.72;
    const centerY = this.height * 0.5 + this.getViewBob() + size * 0.08;
    const color = this.gateOpen ? this.palette.gate : this.palette.gateClosed;

    this.ctx.save();
    this.ctx.translate(projected.x, centerY);
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = Math.max(2, size * 0.06);
    this.ctx.shadowBlur = 24;
    this.ctx.shadowColor = color;
    this.ctx.strokeRect(-size * 0.22, -size * 0.48, size * 0.44, size * 0.96);

    if (this.gateOpen) {
      this.ctx.fillStyle = "rgba(122, 255, 232, 0.18)";
      this.ctx.fillRect(-size * 0.16, -size * 0.4, size * 0.32, size * 0.8);
      this.ctx.strokeStyle = "rgba(255,255,255,0.18)";
      this.ctx.beginPath();
      this.ctx.moveTo(-size * 0.06, -size * 0.36);
      this.ctx.lineTo(-size * 0.06, size * 0.36);
      this.ctx.moveTo(size * 0.06, -size * 0.36);
      this.ctx.lineTo(size * 0.06, size * 0.36);
      this.ctx.stroke();
    } else {
      this.ctx.beginPath();
      this.ctx.moveTo(-size * 0.16, -size * 0.36);
      this.ctx.lineTo(size * 0.16, size * 0.36);
      this.ctx.moveTo(size * 0.16, -size * 0.36);
      this.ctx.lineTo(-size * 0.16, size * 0.36);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  renderTurret(turret) {
    const projected = this.projectPoint(turret.x, turret.y);
    if (!projected || this.isOccluded(projected, 0.2)) return;

    const size = projected.scale * 0.46;
    const centerY = this.height * 0.5 + this.getViewBob() + size * 0.14;
    const glowColor = turret.glow > 0.55 ? this.palette.alertBeam : this.palette.accent;
    const barrelShift = Math.sin(shortestAngle(this.player.angle, turret.angle)) * size * 0.12;

    this.ctx.save();
    this.ctx.translate(projected.x, centerY);
    this.ctx.shadowBlur = 20;
    this.ctx.shadowColor = glowColor;
    this.ctx.fillStyle = `rgba(255, 148, 120, ${0.12 + turret.glow * 0.24})`;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, size * 0.6, 0, TAU);
    this.ctx.fill();

    this.ctx.fillStyle = "#10161f";
    this.ctx.beginPath();
    this.ctx.arc(0, size * 0.04, size * 0.26, 0, TAU);
    this.ctx.fill();

    this.ctx.fillStyle = "#c5d9ff";
    this.ctx.fillRect(-size * 0.22 + barrelShift, -size * 0.04, size * 0.38, size * 0.08);
    this.ctx.fillStyle = glowColor;
    this.ctx.beginPath();
    this.ctx.arc(0, -size * 0.02, size * 0.08, 0, TAU);
    this.ctx.fill();

    for (let pip = 0; pip < turret.maxHealth; pip += 1) {
      this.ctx.fillStyle = pip < turret.health ? "#ffd4c7" : "rgba(255,255,255,0.14)";
      this.ctx.fillRect(-size * 0.18 + pip * size * 0.12, -size * 0.4, size * 0.08, size * 0.05);
    }

    this.ctx.restore();
  }

  renderEmitter(emitter) {
    if (this.isEmitterActive(emitter)) {
      this.drawProjectedLine(emitter.beamAx, emitter.beamAy, emitter.beamBx, emitter.beamBy, "#ff8e72", "rgba(255,142,114,0.8)", 0.9);
    }

    const projected = this.projectPoint(emitter.x, emitter.y);
    if (!projected || this.isOccluded(projected, 0.16)) return;

    const size = projected.scale * 0.26;
    const centerY = this.height * 0.5 + this.getViewBob() + size * 0.2;
    const active = this.isEmitterActive(emitter);

    this.ctx.save();
    this.ctx.translate(projected.x, centerY);
    this.ctx.rotate(Math.PI / 4);
    this.ctx.fillStyle = active ? "#ff9c82" : "#7adfff";
    this.ctx.shadowBlur = 18;
    this.ctx.shadowColor = active ? "#ff9c82" : "#7adfff";
    this.ctx.fillRect(-size * 0.34, -size * 0.34, size * 0.68, size * 0.68);
    this.ctx.rotate(-Math.PI / 4);

    for (let pip = 0; pip < emitter.maxHealth; pip += 1) {
      this.ctx.fillStyle = pip < emitter.health ? "#eef8ff" : "rgba(255,255,255,0.14)";
      this.ctx.fillRect(-size * 0.26 + pip * size * 0.16, -size * 0.55, size * 0.12, size * 0.05);
    }

    this.ctx.restore();
  }

  renderParticle(particle) {
    const projected = this.projectPoint(particle.x, particle.y);
    if (!projected || this.isOccluded(projected, 0)) return;

    const size = Math.max(1, projected.scale * particle.size);
    const alpha = particle.life / particle.maxLife;
    const centerY = this.height * 0.5 + this.getViewBob() + projected.scale * 0.18;

    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = particle.color;
    this.ctx.shadowBlur = 12;
    this.ctx.shadowColor = particle.color;
    this.ctx.beginPath();
    this.ctx.arc(projected.x, centerY, size, 0, TAU);
    this.ctx.fill();
    this.ctx.restore();
  }

  renderBeams() {
    for (const beam of this.beams) {
      const alpha = beam.life / beam.maxLife;
      if (beam.source === "player") {
        const projectedEnd = this.projectPoint(beam.bx, beam.by);
        if (!projectedEnd) continue;

        this.ctx.save();
        this.ctx.globalAlpha = alpha;
        this.ctx.strokeStyle = beam.color;
        this.ctx.lineWidth = 2.8;
        this.ctx.shadowBlur = 18;
        this.ctx.shadowColor = beam.glow;
        this.ctx.beginPath();
        this.ctx.moveTo(this.width * 0.5, this.height * 0.78 + this.player.kick * 10);
        this.ctx.lineTo(projectedEnd.x, this.height * 0.5 + this.getViewBob() + projectedEnd.scale * 0.18);
        this.ctx.stroke();
        this.ctx.restore();
      } else {
        this.drawProjectedLine(beam.ax, beam.ay, beam.bx, beam.by, beam.color, beam.glow, alpha);
      }
    }
  }

  renderWeapon() {
    const baseY = this.height - 38 + this.player.kick * 10;
    this.ctx.save();
    this.ctx.translate(this.width * 0.5, baseY);
    this.ctx.fillStyle = "rgba(11, 17, 24, 0.92)";
    this.ctx.strokeStyle = "rgba(180, 210, 255, 0.18)";
    this.ctx.lineWidth = 1.2;

    this.ctx.beginPath();
    this.ctx.moveTo(-66, 0);
    this.ctx.lineTo(-26, -34);
    this.ctx.lineTo(-10, -38);
    this.ctx.lineTo(10, -38);
    this.ctx.lineTo(26, -34);
    this.ctx.lineTo(66, 0);
    this.ctx.lineTo(44, 10);
    this.ctx.lineTo(-44, 10);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.fillStyle = this.player.cooldown > 0.02 ? "rgba(255, 174, 134, 0.72)" : this.palette.gate;
    this.ctx.fillRect(-10, -42, 20, 24);
    this.ctx.fillStyle = "rgba(255,255,255,0.22)";
    this.ctx.fillRect(-2, -56, 4, 20);

    if (this.player.kick > 0.35) {
      this.ctx.fillStyle = "rgba(255, 245, 220, 0.78)";
      this.ctx.beginPath();
      this.ctx.moveTo(-8, -58);
      this.ctx.lineTo(0, -88 - this.player.kick * 12);
      this.ctx.lineTo(8, -58);
      this.ctx.closePath();
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  renderCrosshair() {
    const centerX = this.width * 0.5;
    const centerY = this.height * 0.5;
    const color = this.aimTarget ? "#ffb195" : "#e7f2ff";
    const gap = this.player.cooldown > 0 ? 8 + (this.player.cooldown / PLAYER_COOLDOWN) * 10 : 8;

    this.ctx.save();
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 1.6;
    this.ctx.shadowBlur = this.aimTarget ? 12 : 6;
    this.ctx.shadowColor = color;
    this.ctx.beginPath();
    this.ctx.moveTo(centerX - gap - 10, centerY);
    this.ctx.lineTo(centerX - gap, centerY);
    this.ctx.moveTo(centerX + gap, centerY);
    this.ctx.lineTo(centerX + gap + 10, centerY);
    this.ctx.moveTo(centerX, centerY - gap - 10);
    this.ctx.lineTo(centerX, centerY - gap);
    this.ctx.moveTo(centerX, centerY + gap);
    this.ctx.lineTo(centerX, centerY + gap + 10);
    this.ctx.stroke();

    if (this.hitMarker > 0) {
      this.ctx.globalAlpha = this.hitMarker / 0.14;
      this.ctx.strokeStyle = "#ffffff";
      this.ctx.beginPath();
      this.ctx.moveTo(centerX - 12, centerY - 12);
      this.ctx.lineTo(centerX - 4, centerY - 4);
      this.ctx.moveTo(centerX + 12, centerY - 12);
      this.ctx.lineTo(centerX + 4, centerY - 4);
      this.ctx.moveTo(centerX - 12, centerY + 12);
      this.ctx.lineTo(centerX - 4, centerY + 4);
      this.ctx.moveTo(centerX + 12, centerY + 12);
      this.ctx.lineTo(centerX + 4, centerY + 4);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  renderScreenEffects() {
    if (this.alertLevel > 0) {
      this.ctx.save();
      this.ctx.fillStyle = this.alertLevel === 2 ? "rgba(255, 102, 72, 0.08)" : "rgba(255, 184, 104, 0.05)";
      this.ctx.fillRect(0, 0, this.width, this.height);
      this.ctx.restore();
    }

    if (this.damageFlash > 0) {
      this.ctx.save();
      this.ctx.fillStyle = `rgba(255, 90, 90, ${this.damageFlash * 0.28})`;
      this.ctx.fillRect(0, 0, this.width, this.height);
      this.ctx.restore();
    }
  }

  render() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.renderBackground();
    this.renderWalls();
    this.renderGate();

    const drawables = [];

    for (const turret of this.turrets) {
      if (!turret.destroyed) {
        const projected = this.projectPoint(turret.x, turret.y);
        if (projected) drawables.push({ distance: projected.distance, render: () => this.renderTurret(turret) });
      }
    }

    for (const emitter of this.emitters) {
      if (!emitter.destroyed) {
        const projected = this.projectPoint(emitter.x, emitter.y);
        if (projected) drawables.push({ distance: projected.distance, render: () => this.renderEmitter(emitter) });
      }
    }

    for (const particle of this.particles) {
      const projected = this.projectPoint(particle.x, particle.y);
      if (projected) drawables.push({ distance: projected.distance, render: () => this.renderParticle(particle) });
    }

    drawables.sort((left, right) => right.distance - left.distance);
    for (const drawable of drawables) {
      drawable.render();
    }

    this.renderBeams();
    this.renderWeapon();
    this.renderCrosshair();
    this.renderScreenEffects();
  }

  loop(timestamp) {
    if (!this.lastTime) this.lastTime = timestamp;
    const delta = Math.min(0.05, (timestamp - this.lastTime) / 1000);
    this.lastTime = timestamp;

    if (this.state === "playing") {
      this.update(delta);
    } else {
      this.updateEffects(delta);
      this.input.clearTransient();
    }

    this.render();
    requestAnimationFrame((nextTimestamp) => this.loop(nextTimestamp));
  }
}

window.addEventListener("DOMContentLoaded", () => {
  new Game();
});
