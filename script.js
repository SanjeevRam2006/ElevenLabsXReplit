const STORAGE_KEY = "silent-maze-best-times-v1";
const PATTERN_PREFIXES = [
  "Prime",
  "Ghost",
  "Vector",
  "Echo",
  "Helix",
  "Pulse",
  "Cipher",
  "Null",
];
const PATTERN_SUFFIXES = [
  "Run",
  "Shift",
  "Lattice",
  "Circuit",
  "Spiral",
  "Drift",
  "Maze",
  "Vault",
];
const CHALLENGE_LABELS = ["Steady", "Focused", "Sharp", "Hot"];
const HANDLING_LABELS = ["Soft", "Balanced", "Tight"];
const ROUTE_LABELS = ["Linear", "Forked", "Weaving", "Dense"];
const LEVEL_PALETTES = [
  {
    wallA: "rgba(56, 189, 248, 0.84)",
    wallB: "rgba(99, 102, 241, 0.76)",
    wallC: "rgba(34, 211, 238, 0.86)",
    player: "#f97316",
    trail: "#fb923c",
    backdropA: "#020617",
    backdropB: "#081225",
    grid: "rgba(56, 189, 248, 0.12)",
  },
  {
    wallA: "rgba(244, 114, 182, 0.84)",
    wallB: "rgba(168, 85, 247, 0.76)",
    wallC: "rgba(236, 72, 153, 0.84)",
    player: "#22d3ee",
    trail: "#67e8f9",
    backdropA: "#050816",
    backdropB: "#140b1f",
    grid: "rgba(236, 72, 153, 0.12)",
  },
  {
    wallA: "rgba(250, 204, 21, 0.84)",
    wallB: "rgba(249, 115, 22, 0.76)",
    wallC: "rgba(251, 146, 60, 0.84)",
    player: "#38bdf8",
    trail: "#7dd3fc",
    backdropA: "#080b17",
    backdropB: "#1c1205",
    grid: "rgba(250, 204, 21, 0.12)",
  },
  {
    wallA: "rgba(52, 211, 153, 0.84)",
    wallB: "rgba(45, 212, 191, 0.76)",
    wallC: "rgba(16, 185, 129, 0.86)",
    player: "#f59e0b",
    trail: "#fbbf24",
    backdropA: "#04110f",
    backdropB: "#05151c",
    grid: "rgba(52, 211, 153, 0.12)",
  },
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function toOdd(value) {
  return value % 2 === 0 ? value - 1 : value;
}

function shuffle(array) {
  for (let index = array.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [array[index], array[swapIndex]] = [array[swapIndex], array[index]];
  }
  return array;
}

function chooseRandom(list, rng = Math.random) {
  return list[Math.floor(rng() * list.length)];
}

function randomOddBetween(min, max, rng = Math.random) {
  const values = [];
  for (let value = min; value <= max; value += 1) {
    if (value % 2 === 1) {
      values.push(value);
    }
  }
  return chooseRandom(values, rng);
}

function formatTime(milliseconds) {
  if (!Number.isFinite(milliseconds)) {
    return "--";
  }

  const totalSeconds = milliseconds / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const millis = Math.floor(milliseconds % 1000);

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0"
  )}.${String(millis).padStart(3, "0")}`;
}

function pickStartCell(columns, rows, rng = Math.random) {
  const side = Math.floor(rng() * 4);

  if (side === 0) {
    return { col: 1, row: randomOddBetween(1, rows - 2, rng), side: "west" };
  }
  if (side === 1) {
    return {
      col: columns - 2,
      row: randomOddBetween(1, rows - 2, rng),
      side: "east",
    };
  }
  if (side === 2) {
    return { col: randomOddBetween(1, columns - 2, rng), row: 1, side: "north" };
  }

  return {
    col: randomOddBetween(1, columns - 2, rng),
    row: rows - 2,
    side: "south",
  };
}

function findFarthestCell(grid, start) {
  const rows = grid.length;
  const columns = grid[0].length;
  const visited = Array.from({ length: rows }, () => Array(columns).fill(false));
  const queue = [{ col: start.col, row: start.row, distance: 0 }];
  visited[start.row][start.col] = true;
  let head = 0;
  let farthest = { col: start.col, row: start.row, distance: 0 };

  while (head < queue.length) {
    const current = queue[head];
    head += 1;

    if (current.distance > farthest.distance) {
      farthest = current;
    }

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
        visited[next.row][next.col] ||
        grid[next.row][next.col] === 1
      ) {
        continue;
      }

      visited[next.row][next.col] = true;
      queue.push({
        col: next.col,
        row: next.row,
        distance: current.distance + 1,
      });
    }
  }

  return farthest;
}

function openMazeLoops(grid, openings, rng = Math.random) {
  const rows = grid.length;
  const columns = grid[0].length;
  const candidates = [];

  for (let row = 1; row < rows - 1; row += 1) {
    for (let col = 1; col < columns - 1; col += 1) {
      if (grid[row][col] === 0) {
        continue;
      }

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

      if (horizontal || vertical) {
        candidates.push({ col, row });
      }
    }
  }

  shuffle(candidates);
  for (let index = 0; index < Math.min(openings, candidates.length); index += 1) {
    const candidate = candidates[index];
    grid[candidate.row][candidate.col] = 0;
  }
}

function generateMaze(columns, rows, profile, rng = Math.random) {
  const grid = Array.from({ length: rows }, () => Array(columns).fill(1));
  const directions = [
    [0, -2],
    [2, 0],
    [0, 2],
    [-2, 0],
  ];
  const start = pickStartCell(columns, rows, rng);

  function carve(x, y) {
    grid[y][x] = 0;
    shuffle(directions);

    for (const [dx, dy] of directions) {
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
  openMazeLoops(grid, profile.loopOpenings, rng);
  const farthest = findFarthestCell(grid, start);
  const exit = { col: farthest.col, row: farthest.row };

  grid[start.row][start.col] = 0;
  grid[exit.row][exit.col] = 0;

  return {
    grid,
    columns,
    rows,
    start,
    exit,
  };
}

class AudioManager {
  constructor() {
    this.context = null;
    this.masterGain = null;
    this.voiceGain = null;
    this.warningGain = null;
    this.voiceBaseGain = null;
    this.voiceUpperGain = null;
    this.voiceFormantA = null;
    this.voiceFormantB = null;
    this.voiceOscillator = null;
    this.voiceUpperOscillator = null;
    this.warningOscillator = null;
    this.nextAccentAt = 0;
    this.ready = false;
  }

  async unlock() {
    if (this.ready) {
      if (this.context.state === "suspended") {
        await this.context.resume();
      }
      return;
    }

    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) {
      return;
    }

    this.context = new AudioCtor();
    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = 0.35;
    this.masterGain.connect(this.context.destination);

    this.voiceGain = this.context.createGain();
    this.voiceGain.gain.value = 0.0001;
    this.voiceGain.connect(this.masterGain);

    this.voiceBaseGain = this.context.createGain();
    this.voiceBaseGain.gain.value = 0.55;
    this.voiceUpperGain = this.context.createGain();
    this.voiceUpperGain.gain.value = 0.22;

    this.voiceFormantA = this.context.createBiquadFilter();
    this.voiceFormantA.type = "bandpass";
    this.voiceFormantA.Q.value = 8;
    this.voiceFormantA.frequency.value = 740;

    this.voiceFormantB = this.context.createBiquadFilter();
    this.voiceFormantB.type = "bandpass";
    this.voiceFormantB.Q.value = 11;
    this.voiceFormantB.frequency.value = 1280;

    this.voiceOscillator = this.context.createOscillator();
    this.voiceOscillator.type = "sawtooth";
    this.voiceOscillator.frequency.value = 155;

    this.voiceUpperOscillator = this.context.createOscillator();
    this.voiceUpperOscillator.type = "triangle";
    this.voiceUpperOscillator.frequency.value = 232;

    this.warningGain = this.context.createGain();
    this.warningGain.gain.value = 0.0001;
    this.warningGain.connect(this.masterGain);

    this.warningOscillator = this.context.createOscillator();
    this.warningOscillator.type = "sawtooth";
    this.warningOscillator.frequency.value = 220;
    this.warningOscillator.connect(this.warningGain);

    this.voiceOscillator.connect(this.voiceBaseGain);
    this.voiceUpperOscillator.connect(this.voiceUpperGain);
    this.voiceBaseGain.connect(this.voiceFormantA);
    this.voiceBaseGain.connect(this.voiceFormantB);
    this.voiceUpperGain.connect(this.voiceFormantA);
    this.voiceUpperGain.connect(this.voiceFormantB);
    this.voiceFormantA.connect(this.voiceGain);
    this.voiceFormantB.connect(this.voiceGain);

    this.voiceOscillator.start();
    this.voiceUpperOscillator.start();
    this.warningOscillator.start();
    this.nextAccentAt = performance.now() + 140;

    await this.context.resume();
    this.ready = true;
  }

  updateMotion(speedRatio, isSafeMotion) {
    if (!this.ready) {
      return;
    }

    const now = this.context.currentTime;
    const wallTime = performance.now();
    const motionRatio = clamp(speedRatio, 0, 1.35);
    const voiceTarget = isSafeMotion ? 0.016 + motionRatio * 0.04 : 0.0001;
    const warningTarget =
      isSafeMotion && motionRatio > 0.35
        ? clamp((motionRatio - 0.35) * 0.085, 0, 0.07)
        : 0.0001;
    const time = wallTime * 0.001;
    const wobble = Math.sin(time * (4.5 + motionRatio * 5.5));
    const chatter = Math.sin(time * (8 + motionRatio * 11) + motionRatio * 2.5);
    const basePitch = 145 + motionRatio * 60 + wobble * 12 + chatter * 5;
    const upperPitch = basePitch * (1.48 + motionRatio * 0.12);
    const vowelBlend = (Math.sin(time * (2.6 + motionRatio * 2.4)) + 1) * 0.5;
    const formantA = lerp(520, 930, vowelBlend) + chatter * 35;
    const formantB = lerp(1180, 2160, 1 - vowelBlend) + wobble * 55;

    this.voiceGain.gain.setTargetAtTime(voiceTarget, now, 0.06);
    this.warningGain.gain.setTargetAtTime(warningTarget, now, 0.05);
    this.voiceBaseGain.gain.setTargetAtTime(0.48 + motionRatio * 0.08, now, 0.08);
    this.voiceUpperGain.gain.setTargetAtTime(
      0.16 + motionRatio * 0.06 + Math.max(0, chatter) * 0.05,
      now,
      0.08
    );
    this.voiceOscillator.frequency.setTargetAtTime(basePitch, now, 0.035);
    this.voiceUpperOscillator.frequency.setTargetAtTime(upperPitch, now, 0.035);
    this.voiceFormantA.frequency.setTargetAtTime(formantA, now, 0.04);
    this.voiceFormantB.frequency.setTargetAtTime(formantB, now, 0.04);
    this.warningOscillator.frequency.setTargetAtTime(
      210 + motionRatio * 900,
      now,
      0.04
    );

    if (motionRatio > 0.08 && wallTime >= this.nextAccentAt) {
      this.playMoveAccent(motionRatio, isSafeMotion);
      this.nextAccentAt =
        wallTime + lerp(240, 110, clamp(motionRatio, 0, 1)) + Math.random() * 140;
    }
  }

  quiet() {
    if (!this.ready) {
      return;
    }

    const now = this.context.currentTime;
    this.voiceGain.gain.setTargetAtTime(0.0001, now, 0.08);
    this.warningGain.gain.setTargetAtTime(0.0001, now, 0.05);
    this.nextAccentAt = performance.now() + 120;
  }

  playMoveAccent(speedRatio, isSafeMotion) {
    if (!this.ready) {
      return;
    }

    const now = this.context.currentTime;
    const accentGain = this.context.createGain();
    const accentFilter = this.context.createBiquadFilter();
    const accentOscillator = this.context.createOscillator();
    const accentStyle = Math.floor(Math.random() * 4);
    const baseFrequency = 210 + Math.random() * 460 + speedRatio * 180;
    const duration = 0.05 + Math.random() * 0.09;
    const volume = (isSafeMotion ? 0.02 : 0.014) + Math.random() * 0.018;

    accentGain.gain.setValueAtTime(0.0001, now);
    accentGain.gain.linearRampToValueAtTime(volume, now + 0.008);
    accentGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    if (accentStyle === 0) {
      accentOscillator.type = "square";
      accentOscillator.frequency.setValueAtTime(baseFrequency, now);
      accentOscillator.frequency.exponentialRampToValueAtTime(
        Math.max(110, baseFrequency * 0.52),
        now + duration * 0.88
      );
      accentFilter.type = "bandpass";
      accentFilter.Q.value = 10 + Math.random() * 6;
      accentFilter.frequency.setValueAtTime(760 + Math.random() * 420, now);
    } else if (accentStyle === 1) {
      accentOscillator.type = "triangle";
      accentOscillator.frequency.setValueAtTime(baseFrequency * 0.94, now);
      accentOscillator.frequency.exponentialRampToValueAtTime(
        baseFrequency * (1.18 + Math.random() * 0.2),
        now + duration * 0.82
      );
      accentFilter.type = "lowpass";
      accentFilter.Q.value = 2.4 + Math.random() * 1.6;
      accentFilter.frequency.setValueAtTime(1180 + Math.random() * 720, now);
    } else if (accentStyle === 2) {
      accentOscillator.type = "sine";
      accentOscillator.frequency.setValueAtTime(baseFrequency * 0.78, now);
      accentOscillator.frequency.exponentialRampToValueAtTime(
        Math.max(120, baseFrequency * 1.34),
        now + duration * 0.72
      );
      accentFilter.type = "bandpass";
      accentFilter.Q.value = 14 + Math.random() * 4;
      accentFilter.frequency.setValueAtTime(1280 + Math.random() * 900, now);
    } else {
      accentOscillator.type = "sawtooth";
      accentOscillator.frequency.setValueAtTime(baseFrequency * 1.1, now);
      accentOscillator.frequency.exponentialRampToValueAtTime(
        Math.max(90, baseFrequency * 0.68),
        now + duration * 0.95
      );
      accentFilter.type = "highpass";
      accentFilter.Q.value = 1.8 + Math.random() * 2.8;
      accentFilter.frequency.setValueAtTime(520 + Math.random() * 420, now);
    }

    accentOscillator.detune.setValueAtTime((Math.random() - 0.5) * 320, now);
    accentOscillator.connect(accentFilter);
    accentFilter.connect(accentGain);
    accentGain.connect(this.masterGain);
    accentOscillator.start(now);
    accentOscillator.stop(now + duration + 0.03);

    if (Math.random() < 0.34) {
      const echoOscillator = this.context.createOscillator();
      const echoGain = this.context.createGain();
      const echoStart = now + duration * (0.28 + Math.random() * 0.16);
      const echoDuration = duration * (0.75 + Math.random() * 0.35);

      echoOscillator.type = chooseRandom(["triangle", "sine"]);
      echoOscillator.frequency.setValueAtTime(baseFrequency * (0.62 + Math.random() * 0.28), echoStart);
      echoOscillator.frequency.exponentialRampToValueAtTime(
        Math.max(80, baseFrequency * (1.02 + Math.random() * 0.26)),
        echoStart + echoDuration * 0.86
      );
      echoGain.gain.setValueAtTime(0.0001, echoStart);
      echoGain.gain.linearRampToValueAtTime(volume * 0.42, echoStart + 0.008);
      echoGain.gain.exponentialRampToValueAtTime(0.0001, echoStart + echoDuration);

      echoOscillator.connect(echoGain);
      echoGain.connect(this.masterGain);
      echoOscillator.start(echoStart);
      echoOscillator.stop(echoStart + echoDuration + 0.03);
    }
  }

  playBuzzer() {
    if (!this.ready) {
      return;
    }

    const now = this.context.currentTime;
    const buzzerGain = this.context.createGain();
    buzzerGain.gain.setValueAtTime(0.0001, now);
    buzzerGain.gain.linearRampToValueAtTime(0.18, now + 0.01);
    buzzerGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
    buzzerGain.connect(this.masterGain);

    const buzzA = this.context.createOscillator();
    buzzA.type = "square";
    buzzA.frequency.setValueAtTime(92, now);
    buzzA.frequency.exponentialRampToValueAtTime(64, now + 0.42);
    buzzA.connect(buzzerGain);

    const buzzB = this.context.createOscillator();
    buzzB.type = "sawtooth";
    buzzB.frequency.setValueAtTime(184, now);
    buzzB.detune.setValueAtTime(-18, now);
    buzzB.connect(buzzerGain);

    buzzA.start(now);
    buzzB.start(now);
    buzzA.stop(now + 0.58);
    buzzB.stop(now + 0.58);
  }

  playWin() {
    if (!this.ready) {
      return;
    }

    const notes = [523.25, 659.25, 783.99, 1046.5];
    const now = this.context.currentTime;

    notes.forEach((frequency, index) => {
      const tone = this.context.createOscillator();
      const toneGain = this.context.createGain();
      const startAt = now + index * 0.08;

      tone.type = "triangle";
      tone.frequency.setValueAtTime(frequency, startAt);

      toneGain.gain.setValueAtTime(0.0001, startAt);
      toneGain.gain.linearRampToValueAtTime(0.08, startAt + 0.02);
      toneGain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.38);

      tone.connect(toneGain);
      toneGain.connect(this.masterGain);
      tone.start(startAt);
      tone.stop(startAt + 0.42);
    });
  }
}

class InputHandler {
  constructor(game) {
    this.game = game;
    this.keys = new Set();
    this.attachEvents();
  }

  attachEvents() {
    window.addEventListener("keydown", (event) => {
      const key = event.key.toLowerCase();

      if (
        ["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(
          key
        )
      ) {
        event.preventDefault();
        this.keys.add(key);
        this.game.audio.unlock();
      }
    });

    window.addEventListener("keyup", (event) => {
      this.keys.delete(event.key.toLowerCase());
    });
  }

  getDirection() {
    let x = 0;
    let y = 0;

    if (this.keys.has("arrowleft") || this.keys.has("a")) {
      x -= 1;
    }
    if (this.keys.has("arrowright") || this.keys.has("d")) {
      x += 1;
    }
    if (this.keys.has("arrowup") || this.keys.has("w")) {
      y -= 1;
    }
    if (this.keys.has("arrowdown") || this.keys.has("s")) {
      y += 1;
    }

    if (x !== 0 || y !== 0) {
      const length = Math.hypot(x, y);
      x /= length;
      y /= length;
    }

    return { x, y };
  }
}

class Game {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.context = this.canvas.getContext("2d");
    this.overlay = document.getElementById("overlay");
    this.overlayKicker = document.getElementById("overlayKicker");
    this.overlayTitle = document.getElementById("overlayTitle");
    this.overlayDescription = document.getElementById("overlayDescription");
    this.primaryAction = document.getElementById("primaryAction");
    this.secondaryAction = document.getElementById("secondaryAction");
    this.levelValue = document.getElementById("levelValue");
    this.timerValue = document.getElementById("timerValue");
    this.bestValue = document.getElementById("bestValue");
    this.patternValue = document.getElementById("patternValue");
    this.challengeValue = document.getElementById("challengeValue");
    this.handlingValue = document.getElementById("handlingValue");
    this.speedFill = document.getElementById("speedFill");
    this.speedLabel = document.getElementById("speedLabel");
    this.statusHint = document.getElementById("statusHint");
    this.overlayPattern = document.getElementById("overlayPattern");
    this.overlayPace = document.getElementById("overlayPace");
    this.overlayRoute = document.getElementById("overlayRoute");

    this.audio = new AudioManager();
    this.input = new InputHandler(this);

    this.level = 1;
    this.state = "menu";
    this.failureReason = "";
    this.elapsedMs = 0;
    this.startTimestamp = 0;
    this.lastFrameTime = performance.now();
    this.lastMoveTimestamp = 0;
    this.currentSpeed = 0;
    this.displaySpeed = 0;
    this.speedThreshold = 0;
    this.bestTimes = this.loadBestTimes();
    this.lastHudSyncAt = 0;
    this.hudSnapshot = "";
    this.levelProfile = null;
    this.particles = [];
    this.shake = 0;
    this.flash = 0;

    this.maze = null;
    this.layout = {
      width: 0,
      height: 0,
      cellSize: 0,
      offsetX: 0,
      offsetY: 0,
    };
    this.backgroundCache = document.createElement("canvas");
    this.backgroundCacheContext = this.backgroundCache.getContext("2d");
    this.mazeCache = document.createElement("canvas");
    this.mazeCacheContext = this.mazeCache.getContext("2d");

    this.player = {
      x: 0,
      y: 0,
      radius: 10,
      vx: 0,
      vy: 0,
      trail: [],
      visible: true,
    };

    this.bindUI();
    this.handleResize();
    this.buildLevel(true);
    this.showOverlay("menu");
    window.addEventListener("resize", () => this.handleResize());
    requestAnimationFrame((timestamp) => this.loop(timestamp));
  }

  bindUI() {
    this.primaryAction.addEventListener("click", async () => {
      await this.audio.unlock();

      if (this.state === "won") {
        this.level += 1;
        this.buildLevel(true);
        this.startCurrentMode();
        return;
      }

      if (this.state === "caught") {
        this.restartLevel();
        return;
      }

      if (this.state === "paused") {
        this.resumeRun();
        return;
      }

      if (this.state === "menu") {
        this.startCurrentMode();
      }
    });

    this.secondaryAction.addEventListener("click", async () => {
      await this.audio.unlock();
      this.showMenu();
    });

    window.addEventListener("keydown", async (event) => {
      const key = event.key.toLowerCase();

      if (event.repeat) {
        return;
      }

      if (key === " " || key === "enter") {
        event.preventDefault();
        await this.audio.unlock();

        if (this.state === "playing") {
          this.pauseRun();
          return;
        }

        if (["menu", "caught", "won", "paused"].includes(this.state)) {
          this.primaryAction.click();
        }
        return;
      }

      if (key === "r") {
        event.preventDefault();
        await this.audio.unlock();

        if (this.state !== "menu") {
          this.restartLevel();
        }
        return;
      }

      if (key === "m") {
        event.preventDefault();
        await this.audio.unlock();
        this.showMenu();
      }
    });
  }

  loadBestTimes() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (error) {
      return {};
    }
  }

  saveBestTimes() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.bestTimes));
    } catch (error) {
      return;
    }
  }

  bestKey() {
    return `level-${this.level}`;
  }

  getBestTime() {
    return this.bestTimes[this.bestKey()] ?? null;
  }

  setBestTime(milliseconds) {
    const existing = this.getBestTime();
    if (existing === null || milliseconds < existing) {
      this.bestTimes[this.bestKey()] = milliseconds;
      this.saveBestTimes();
    }
  }

  createLevelProfile(level) {
    const palette = chooseRandom(LEVEL_PALETTES);
    const patternName = `${chooseRandom(PATTERN_PREFIXES)} ${chooseRandom(
      PATTERN_SUFFIXES
    )}`;
    const sizeBoost = chooseRandom([0, 0, 0, 2]);
    const speedPenalty = Math.floor(Math.random() * 18) + level * 3;
    const acceleration = 1180 + level * 28 + Math.floor(Math.random() * 120);
    const drag = 5.6 + Math.random() * 1.2;
    const loopOpenings = Math.min(
      1 + Math.floor(level / 2) + Math.floor(Math.random() * 2),
      5
    );
    const challengeLabel =
      speedPenalty < 15
        ? CHALLENGE_LABELS[0]
        : speedPenalty < 22
        ? CHALLENGE_LABELS[1]
        : speedPenalty < 28
        ? CHALLENGE_LABELS[2]
        : CHALLENGE_LABELS[3];
    const handlingLabel =
      drag >= 6.4
        ? HANDLING_LABELS[0]
        : drag >= 6
        ? HANDLING_LABELS[1]
        : HANDLING_LABELS[2];
    const routeLabel =
      loopOpenings <= 1
        ? ROUTE_LABELS[0]
        : loopOpenings === 2
        ? ROUTE_LABELS[1]
        : loopOpenings <= 4
        ? ROUTE_LABELS[2]
        : ROUTE_LABELS[3];

    return {
      name: patternName,
      palette,
      sizeBoost,
      speedPenalty,
      acceleration,
      drag,
      loopOpenings,
      challengeLabel,
      handlingLabel,
      routeLabel,
    };
  }

  handleResize() {
    const rect = this.canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);

    this.canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    this.canvas.height = Math.max(1, Math.floor(rect.height * ratio));
    this.context.setTransform(ratio, 0, 0, ratio, 0, 0);

    this.layout.width = rect.width;
    this.layout.height = rect.height;

    if (this.maze) {
      this.computeMazeLayout();
      this.buildBackgroundCache();
      this.buildMazeCache();
      this.resetPlayerPosition();
    }
  }

  buildLevel(resetTimer) {
    this.levelProfile = this.createLevelProfile(this.level);
    const minCellSize = Math.max(18, 30 - this.level * 0.45);
    const maxColumns = Math.max(
      13,
      toOdd(Math.floor((this.layout.width - 30) / minCellSize))
    );
    const maxRows = Math.max(
      9,
      toOdd(Math.floor((this.layout.height - 30) / minCellSize))
    );
    const desiredColumns = 13 + (this.level - 1) + this.levelProfile.sizeBoost;
    const desiredRows = 9 + (this.level - 1) + this.levelProfile.sizeBoost;
    const columns = clamp(toOdd(desiredColumns), 13, maxColumns);
    const rows = clamp(toOdd(desiredRows), 9, maxRows);

    this.maze = generateMaze(columns, rows, this.levelProfile);
    this.computeMazeLayout();
    this.buildBackgroundCache();
    this.buildMazeCache();

    this.speedThreshold = this.getSpeedThreshold();
    this.currentSpeed = 0;
    this.displaySpeed = 0;
    this.lastMoveTimestamp = performance.now();

    if (resetTimer) {
      this.elapsedMs = 0;
      this.startTimestamp = 0;
    }

    this.resetPlayerPosition();
    this.updateHUD(true);
  }

  computeMazeLayout() {
    const padding = 18;
    const cellSize = Math.floor(
      Math.min(
        (this.layout.width - padding * 2) / this.maze.columns,
        (this.layout.height - padding * 2) / this.maze.rows
      )
    );

    this.layout.cellSize = Math.max(12, cellSize);
    this.layout.offsetX =
      (this.layout.width - this.maze.columns * this.layout.cellSize) / 2;
    this.layout.offsetY =
      (this.layout.height - this.maze.rows * this.layout.cellSize) / 2;
    this.player.radius = Math.max(5, this.layout.cellSize * 0.22);
  }

  buildBackgroundCache() {
    this.backgroundCache.width = Math.max(1, Math.floor(this.layout.width));
    this.backgroundCache.height = Math.max(1, Math.floor(this.layout.height));

    const ctx = this.backgroundCacheContext;
    const { width, height } = this.layout;
    const palette = this.levelProfile.palette;
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, palette.backdropA);
    gradient.addColorStop(0.45, palette.backdropB);
    gradient.addColorStop(1, "#01040b");

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const nebulaA = ctx.createRadialGradient(
      width * 0.18,
      height * 0.22,
      0,
      width * 0.18,
      height * 0.22,
      width * 0.42
    );
    nebulaA.addColorStop(0, `${palette.wallA.replace("0.84", "0.14")}`);
    nebulaA.addColorStop(0.55, `${palette.wallB.replace("0.76", "0.09")}`);
    nebulaA.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = nebulaA;
    ctx.fillRect(0, 0, width, height);

    const nebulaB = ctx.createRadialGradient(
      width * 0.82,
      height * 0.78,
      0,
      width * 0.82,
      height * 0.78,
      width * 0.36
    );
    nebulaB.addColorStop(0, `${palette.wallC.replace("0.84", "0.12").replace("0.86", "0.12")}`);
    nebulaB.addColorStop(0.58, `${palette.wallB.replace("0.76", "0.07")}`);
    nebulaB.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = nebulaB;
    ctx.fillRect(0, 0, width, height);

    const starCount = Math.max(90, Math.floor((width * height) / 3600));
    ctx.save();
    for (let index = 0; index < starCount; index += 1) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const radius = Math.random() < 0.82 ? Math.random() * 1.4 + 0.2 : Math.random() * 2.2 + 0.8;
      const alpha = 0.18 + Math.random() * 0.68;
      const tint = Math.random();

      ctx.beginPath();
      ctx.fillStyle =
        tint < 0.16
          ? `rgba(191, 219, 254, ${alpha})`
          : tint < 0.3
          ? `rgba(253, 224, 71, ${alpha * 0.82})`
          : `rgba(255, 255, 255, ${alpha})`;
      ctx.shadowBlur = radius < 1.2 ? 0 : 10 + Math.random() * 10;
      ctx.shadowColor = ctx.fillStyle;
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    const streakCount = Math.max(12, Math.floor(width / 90));
    ctx.save();
    ctx.lineCap = "round";
    for (let index = 0; index < streakCount; index += 1) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const length = 18 + Math.random() * 64;
      const angle = -0.32 + Math.random() * 0.12;
      const stroke = 0.5 + Math.random() * 1.2;
      const gradientStroke = ctx.createLinearGradient(
        x,
        y,
        x + Math.cos(angle) * length,
        y + Math.sin(angle) * length
      );

      gradientStroke.addColorStop(0, "rgba(255, 255, 255, 0)");
      gradientStroke.addColorStop(0.5, "rgba(255, 255, 255, 0.18)");
      gradientStroke.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.strokeStyle = gradientStroke;
      ctx.lineWidth = stroke;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
      ctx.stroke();
    }
    ctx.restore();

    const vignette = ctx.createRadialGradient(
      width * 0.5,
      height * 0.5,
      Math.min(width, height) * 0.12,
      width * 0.5,
      height * 0.5,
      Math.max(width, height) * 0.72
    );
    vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
    vignette.addColorStop(0.7, "rgba(2, 6, 23, 0.16)");
    vignette.addColorStop(1, "rgba(2, 6, 23, 0.46)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
  }

  buildMazeCache() {
    this.mazeCache.width = Math.max(1, Math.floor(this.layout.width));
    this.mazeCache.height = Math.max(1, Math.floor(this.layout.height));

    const ctx = this.mazeCacheContext;
    const palette = this.levelProfile.palette;
    ctx.clearRect(0, 0, this.layout.width, this.layout.height);

    const wallGradient = ctx.createLinearGradient(
      this.layout.offsetX,
      this.layout.offsetY,
      this.layout.offsetX + this.maze.columns * this.layout.cellSize,
      this.layout.offsetY + this.maze.rows * this.layout.cellSize
    );
    wallGradient.addColorStop(0, palette.wallA);
    wallGradient.addColorStop(0.5, palette.wallB);
    wallGradient.addColorStop(1, palette.wallC);

    ctx.save();
    ctx.shadowBlur = 18;
    ctx.shadowColor = palette.wallC;

    for (let row = 0; row < this.maze.rows; row += 1) {
      for (let col = 0; col < this.maze.columns; col += 1) {
        const x = this.layout.offsetX + col * this.layout.cellSize;
        const y = this.layout.offsetY + row * this.layout.cellSize;

        if (this.maze.grid[row][col] === 1) {
          ctx.fillStyle = wallGradient;
          ctx.fillRect(x + 1, y + 1, this.layout.cellSize - 2, this.layout.cellSize - 2);
        } else {
          ctx.fillStyle = "rgba(15, 23, 42, 0.22)";
          ctx.fillRect(x + 1, y + 1, this.layout.cellSize - 2, this.layout.cellSize - 2);
        }
      }
    }

    ctx.restore();
    this.drawZoneCell(
      ctx,
      this.maze.start.col,
      this.maze.start.row,
      "rgba(34, 197, 94, 0.95)"
    );
    this.drawZoneCell(
      ctx,
      this.maze.exit.col,
      this.maze.exit.row,
      "rgba(59, 130, 246, 0.95)"
    );
  }

  drawZoneCell(ctx, col, row, fill) {
    const x = this.layout.offsetX + col * this.layout.cellSize;
    const y = this.layout.offsetY + row * this.layout.cellSize;

    ctx.save();
    ctx.fillStyle = fill;
    ctx.shadowBlur = 24;
    ctx.shadowColor = fill;
    ctx.fillRect(x + 3, y + 3, this.layout.cellSize - 6, this.layout.cellSize - 6);
    ctx.restore();
  }

  updateOverlayMetrics() {
    this.overlayPattern.textContent = this.levelProfile.name;
    this.overlayPace.textContent = this.levelProfile.challengeLabel;
    this.overlayRoute.textContent = this.levelProfile.routeLabel;
  }

  startCurrentMode() {
    this.failureReason = "";
    this.audio.quiet();
    this.currentSpeed = 0;
    this.displaySpeed = 0;
    this.particles = [];
    this.flash = 0;
    this.shake = 0;
    this.resetPlayerPosition();
    this.beginRun();
  }

  beginRun() {
    this.state = "playing";
    const now = performance.now();
    this.startTimestamp = now;
    this.lastMoveTimestamp = now;
    this.elapsedMs = 0;
    this.failureReason = "";
    this.player.vx = 0;
    this.player.vy = 0;
    this.hideOverlay();
    this.statusHint.textContent =
      `Arrow keys or WASD. ${this.levelProfile.challengeLabel} pacing, ${this.levelProfile.routeLabel.toLowerCase()} route.`;
    this.updateHUD(true);
  }

  pauseRun() {
    if (this.state !== "playing") {
      return;
    }

    this.state = "paused";
    this.audio.quiet();
    this.showOverlay("paused");
  }

  resumeRun() {
    if (this.state !== "paused") {
      return;
    }

    const now = performance.now();
    this.state = "playing";
    this.startTimestamp = now - this.elapsedMs;
    this.lastMoveTimestamp = now;
    this.hideOverlay();
    this.statusHint.textContent =
      `Back live. ${this.levelProfile.handlingLabel} handling, speed cap ${Math.round(
        this.speedThreshold
      )}.`;
    this.updateHUD(true);
  }

  restartLevel() {
    this.buildLevel(true);
    this.startCurrentMode();
  }

  showMenu() {
    this.audio.quiet();
    this.shake = 0;
    this.showOverlay("menu");
  }

  hideOverlay() {
    this.overlay.classList.remove(
      "show",
      "active",
      "start-screen",
      "gameover-screen",
      "win-screen",
      "pause-screen"
    );
  }

  showOverlay(kind) {
    this.overlay.classList.remove(
      "start-screen",
      "gameover-screen",
      "win-screen",
      "pause-screen"
    );
    this.overlay.classList.add("show", "active");
    this.updateOverlayMetrics();

    if (kind === "menu") {
      this.state = "menu";
      this.failureReason = "";
      this.overlay.classList.add("start-screen");
      this.overlayKicker.textContent = "Silent Run";
      this.overlayTitle.textContent = "SILENT MAZE";
      this.overlayDescription.textContent =
        "A keyboard-only stealth maze. Every level remixes the layout, pacing, and route pressure.";
      this.primaryAction.textContent = "Start Game";
      this.secondaryAction.hidden = true;
      this.statusHint.textContent =
        "Press Start Game. The timer starts instantly and the maze goes live.";
      return;
    }

    if (kind === "paused") {
      this.state = "paused";
      this.overlay.classList.add("pause-screen");
      this.overlayKicker.textContent = this.levelProfile.name;
      this.overlayTitle.textContent = "Run Paused";
      this.overlayDescription.textContent =
        "Hold your line. Resume when you are ready to push deeper into the maze.";
      this.primaryAction.textContent = "Resume";
      this.secondaryAction.hidden = false;
      this.secondaryAction.textContent = "Menu";
      this.statusHint.textContent = "Paused. Space resumes, R restarts, M returns to menu.";
      return;
    }

    if (kind === "caught") {
      this.state = "caught";
      this.overlay.classList.add("gameover-screen");
      this.overlayKicker.textContent = this.levelProfile.name;
      this.overlayTitle.textContent = "You got caught";
      this.overlayDescription.textContent =
        this.failureReason ||
        "The maze detected you. Reset and move with more control.";
      this.primaryAction.textContent = "Restart";
      this.secondaryAction.hidden = false;
      this.secondaryAction.textContent = "Menu";
      this.statusHint.textContent =
        "Restart to reroll the route and try a cleaner line.";
      return;
    }

    this.state = "won";
    this.overlay.classList.add("win-screen");
    const best = this.getBestTime();
    this.overlayKicker.textContent = this.levelProfile.name;
    this.overlayTitle.textContent = "Stealth Complete";
    this.overlayDescription.textContent = `${this.levelProfile.name} cleared in ${formatTime(
      this.elapsedMs
    )}${best !== null && best === this.elapsedMs ? " - New best time" : ""}.`;
    this.primaryAction.textContent = "Next Level";
    this.secondaryAction.hidden = false;
    this.secondaryAction.textContent = "Menu";
    this.statusHint.textContent =
      "Next level brings a fresh pattern, new route branches, and a sharper pace target.";
  }

  resetPlayerPosition() {
    const start = this.cellCenter(this.maze.start.col, this.maze.start.row);
    this.player.x = start.x;
    this.player.y = start.y;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.trail = [];
  }

  cellCenter(col, row) {
    return {
      x: this.layout.offsetX + col * this.layout.cellSize + this.layout.cellSize / 2,
      y: this.layout.offsetY + row * this.layout.cellSize + this.layout.cellSize / 2,
    };
  }

  getSpeedThreshold() {
    return Math.max(360, 720 - (this.level - 1) * 18 - this.levelProfile.speedPenalty);
  }

  circleHitsWall(x, y, radius) {
    const left = Math.floor((x - radius - this.layout.offsetX) / this.layout.cellSize);
    const right = Math.floor((x + radius - this.layout.offsetX) / this.layout.cellSize);
    const top = Math.floor((y - radius - this.layout.offsetY) / this.layout.cellSize);
    const bottom = Math.floor((y + radius - this.layout.offsetY) / this.layout.cellSize);

    for (let row = top; row <= bottom; row += 1) {
      for (let col = left; col <= right; col += 1) {
        if (
          row < 0 ||
          col < 0 ||
          row >= this.maze.rows ||
          col >= this.maze.columns
        ) {
          return true;
        }

        if (this.maze.grid[row][col] !== 1) {
          continue;
        }

        const cellLeft = this.layout.offsetX + col * this.layout.cellSize;
        const cellTop = this.layout.offsetY + row * this.layout.cellSize;
        const nearestX = clamp(x, cellLeft, cellLeft + this.layout.cellSize);
        const nearestY = clamp(y, cellTop, cellTop + this.layout.cellSize);

        if ((x - nearestX) ** 2 + (y - nearestY) ** 2 <= radius ** 2) {
          return true;
        }
      }
    }

    return false;
  }

  circleInExit(x, y, radius) {
    const cellLeft = this.layout.offsetX + this.maze.exit.col * this.layout.cellSize;
    const cellTop = this.layout.offsetY + this.maze.exit.row * this.layout.cellSize;
    const cellRight = cellLeft + this.layout.cellSize;
    const cellBottom = cellTop + this.layout.cellSize;
    const nearestX = clamp(x, cellLeft, cellRight);
    const nearestY = clamp(y, cellTop, cellBottom);

    return (x - nearestX) ** 2 + (y - nearestY) ** 2 <= radius ** 2;
  }

  emitBurst(x, y, color, count, force) {
    for (let index = 0; index < count; index += 1) {
      const angle = (Math.PI * 2 * index) / count + Math.random() * 0.45;
      const speed = force * (0.45 + Math.random() * 0.75);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.35 + Math.random() * 0.45,
        color,
        size: 2 + Math.random() * 3.5,
      });
    }

    if (this.particles.length > 80) {
      this.particles.splice(0, this.particles.length - 80);
    }
  }

  triggerFailure(reason) {
    const failureText = reason;
    this.failureReason = failureText;
    this.state = "caught";
    this.currentSpeed = 0;
    this.player.vx = 0;
    this.player.vy = 0;
    this.shake = 14;
    this.flash = 0.3;
    this.emitBurst(this.player.x, this.player.y, "rgba(251, 113, 133, 0.95)", 18, 120);
    this.audio.playBuzzer();
    this.audio.quiet();
    this.updateHUD(true);
    this.showOverlay("caught");
  }

  handleWin() {
    if (this.state !== "playing") {
      return;
    }

    this.elapsedMs = performance.now() - this.startTimestamp;
    this.setBestTime(this.elapsedMs);
    this.shake = 6;
    this.flash = 0.18;
    this.emitBurst(
      this.player.x,
      this.player.y,
      "rgba(96, 165, 250, 0.95)",
      20,
      100
    );
    this.audio.playWin();
    this.audio.quiet();
    this.updateHUD(true);
    this.showOverlay("won");
  }

  updateBall(dt) {
    const direction = this.input.getDirection();
    const acceleration = this.levelProfile.acceleration;
    const drag = this.levelProfile.drag;

    this.player.vx += direction.x * acceleration * dt;
    this.player.vy += direction.y * acceleration * dt;

    this.player.vx -= this.player.vx * drag * dt;
    this.player.vy -= this.player.vy * drag * dt;

    const moveX = this.player.vx * dt;
    const moveY = this.player.vy * dt;
    const distance = Math.hypot(moveX, moveY);
    const steps = Math.max(
      1,
      Math.ceil(distance / Math.max(1, this.player.radius * 0.45))
    );

    for (let step = 0; step < steps; step += 1) {
      const nextX = this.player.x + moveX / steps;
      const nextY = this.player.y + moveY / steps;

      if (this.circleHitsWall(nextX, nextY, this.player.radius)) {
        this.triggerFailure("Wall contact detected. The maze buzzed you out.");
        return;
      }

      this.player.x = nextX;
      this.player.y = nextY;

      if (this.circleInExit(this.player.x, this.player.y, this.player.radius)) {
        this.handleWin();
        return;
      }
    }

    this.currentSpeed = Math.hypot(this.player.vx, this.player.vy);
    if (this.currentSpeed > this.speedThreshold) {
      this.triggerFailure("You moved too fast. The alarm heard the rush.");
      return;
    }

    if (this.currentSpeed > 5) {
      this.addTrailPoint(this.player.x, this.player.y);
    }
  }

  addTrailPoint(x, y) {
    const lastPoint = this.player.trail[this.player.trail.length - 1];
    if (lastPoint && Math.hypot(lastPoint.x - x, lastPoint.y - y) < this.player.radius * 0.55) {
      return;
    }

    this.player.trail.push({
      x,
      y,
      life: 1,
    });

    if (this.player.trail.length > 18) {
      this.player.trail.shift();
    }
  }

  updateTrail(dt) {
    this.player.trail = this.player.trail
      .map((point) => ({
        ...point,
        life: point.life - dt * 1.9,
      }))
      .filter((point) => point.life > 0);
  }

  updateHUD(force = false) {
    const now = performance.now();
    if (!force && now - this.lastHudSyncAt < 48) {
      return;
    }

    const ratio = clamp(this.displaySpeed / Math.max(1, this.speedThreshold), 0, 1.2);
    const width = Math.max(2, ratio * 100);
    const bestTime = formatTime(this.getBestTime());
    const snapshot = [
      this.level,
      this.levelProfile.name,
      this.levelProfile.challengeLabel,
      this.levelProfile.handlingLabel,
      formatTime(this.elapsedMs),
      bestTime,
      Math.round(width),
      this.state,
      ratio >= 0.78 ? "warn" : "safe",
    ].join("|");

    if (!force && snapshot === this.hudSnapshot) {
      return;
    }

    this.hudSnapshot = snapshot;
    this.lastHudSyncAt = now;

    this.levelValue.textContent = String(this.level);
    this.patternValue.textContent = this.levelProfile.name;
    this.challengeValue.textContent = this.levelProfile.challengeLabel;
    this.handlingValue.textContent = this.levelProfile.handlingLabel;
    this.timerValue.textContent = formatTime(this.elapsedMs);
    this.bestValue.textContent = bestTime;
    this.speedFill.style.width = `${width}%`;
    this.speedFill.style.opacity = this.state === "playing" ? "1" : "0.45";
    this.speedFill.classList.toggle("warn", ratio >= 0.78);

    if (this.state !== "playing") {
      this.speedLabel.textContent =
        this.state === "won"
          ? "Clear"
          : this.state === "paused"
          ? "Paused"
          : "Stand by";
      return;
    }

    if (ratio < 0.45) {
      this.speedLabel.textContent = "Quiet";
    } else if (ratio < 0.8) {
      this.speedLabel.textContent = "Warning";
    } else {
      this.speedLabel.textContent = "Critical";
    }
  }

  update(dt, timestamp) {
    if (this.state === "playing") {
      this.elapsedMs = timestamp - this.startTimestamp;
      this.updateBall(dt);
    } else {
      this.currentSpeed = 0;
    }

    this.displaySpeed = lerp(this.displaySpeed, this.currentSpeed, 0.14);
    this.updateTrail(dt);
    this.updateParticles(dt);
    this.shake = Math.max(0, this.shake - dt * 34);
    this.flash = Math.max(0, this.flash - dt * 1.6);

    const speedRatio = this.displaySpeed / Math.max(1, this.speedThreshold);
    const movingSafely =
      this.state === "playing" &&
      this.displaySpeed > 5 &&
      speedRatio <= 1 &&
      !this.failureReason;
    if (movingSafely || speedRatio > 0.3) {
      this.audio.updateMotion(speedRatio, movingSafely);
    } else {
      this.audio.quiet();
    }
    this.updateHUD();
  }

  updateParticles(dt) {
    this.particles = this.particles
      .map((particle) => ({
        ...particle,
        x: particle.x + particle.vx * dt,
        y: particle.y + particle.vy * dt,
        vx: particle.vx * (1 - dt * 2.4),
        vy: particle.vy * (1 - dt * 2.4),
        life: particle.life - dt,
      }))
      .filter((particle) => particle.life > 0);
  }

  drawBackground() {
    this.context.drawImage(this.backgroundCache, 0, 0);
  }

  drawTrail() {
    const ctx = this.context;
    const trailColor = this.levelProfile.palette.trail;

    this.player.trail.forEach((point, index) => {
      const alpha = point.life * 0.18;
      const radius = this.player.radius * (0.45 + index / this.player.trail.length);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = trailColor;
      ctx.shadowBlur = 20;
      ctx.shadowColor = trailColor;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  drawPlayer() {
    const ctx = this.context;
    const color = this.levelProfile.palette.player;

    ctx.save();
    ctx.fillStyle = color;
    ctx.shadowBlur = 22;
    ctx.shadowColor = color;
    ctx.beginPath();
    ctx.arc(this.player.x, this.player.y, this.player.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.player.x, this.player.y, this.player.radius + 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  drawBeacon(col, row, color, phaseOffset = 0) {
    const ctx = this.context;
    const center = this.cellCenter(col, row);
    const phase = (performance.now() * 0.004 + phaseOffset) % (Math.PI * 2);
    const radius = this.layout.cellSize * (0.34 + (Math.sin(phase) + 1) * 0.08);

    ctx.save();
    ctx.globalAlpha = 0.42;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 18;
    ctx.shadowColor = color;
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  drawParticles() {
    const ctx = this.context;

    for (const particle of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, particle.life * 1.4);
      ctx.fillStyle = particle.color;
      ctx.shadowBlur = 12;
      ctx.shadowColor = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawFrame() {
    const shakeX = this.shake > 0 ? (Math.random() - 0.5) * this.shake : 0;
    const shakeY = this.shake > 0 ? (Math.random() - 0.5) * this.shake : 0;

    this.context.save();
    this.context.translate(shakeX, shakeY);
    this.drawBackground();
    this.context.drawImage(this.mazeCache, 0, 0);
    this.drawBeacon(this.maze.start.col, this.maze.start.row, "rgba(74, 222, 128, 0.9)", 0);
    this.drawBeacon(this.maze.exit.col, this.maze.exit.row, "rgba(96, 165, 250, 0.9)", 1.4);
    this.drawTrail();
    this.drawParticles();
    this.drawPlayer();
    this.context.restore();

    if (this.flash > 0) {
      this.context.save();
      this.context.globalAlpha = this.flash;
      this.context.fillStyle =
        this.state === "won" ? "rgba(96, 165, 250, 0.16)" : "rgba(251, 113, 133, 0.16)";
      this.context.fillRect(0, 0, this.layout.width, this.layout.height);
      this.context.restore();
    }
  }

  loop(timestamp) {
    const dt = Math.min((timestamp - this.lastFrameTime) / 1000, 0.033);
    this.lastFrameTime = timestamp;

    this.update(dt, timestamp);
    this.drawFrame();
    requestAnimationFrame((nextTimestamp) => this.loop(nextTimestamp));
  }
}

window.addEventListener("load", () => {
  new Game();
});
