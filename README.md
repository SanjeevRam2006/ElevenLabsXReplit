# SILENT MAZE

A fast, neon stealth maze game built with HTML, CSS, and Vanilla JavaScript.

**SILENT MAZE** is a browser game where the rule is simple: move carefully, stay under the speed threshold, and make it to the exit. Touch a wall or rush the route and the maze throws you out with a harsh alarm. Every level remixes the maze pattern, pacing profile, handling feel, and route pressure to keep runs tense and unpredictable.

It is designed to run instantly in the browser and work cleanly on Replit with no build step, no framework setup, and no dependencies.

## Highlights

- Keyboard-only arcade-style movement with smooth inertia
- Procedurally generated maze layouts with progressive difficulty
- Precision wall collision and speed-based failure detection
- Reactive HUD with timer, best time, level, pattern, handling, and stealth speed meter
- Neon dark-theme presentation with glow effects, transitions, beacons, particles, and screen flash
- Web Audio API sound design including movement audio, warning tones, buzzer fail state, and win chime
- Local best-time persistence with `localStorage`
- Responsive canvas rendering with a 60 FPS animation loop

## Core Loop

1. Start the run.
2. Move the ball through the maze using `WASD` or the arrow keys.
3. Stay off the walls.
4. Stay under the speed limit.
5. Reach the blue exit zone.
6. Advance to the next level and face a new maze profile.

## Controls

- `W`, `A`, `S`, `D` or Arrow Keys: Move
- `Space`: Start / Pause / Resume
- `Enter`: Start / Resume
- `R`: Restart current run
- `M`: Return to menu

## Game Systems

### Maze Generation

The maze is generated from a grid-based 2D array and carved into a playable route using randomized path carving. Levels can introduce more branching and route variation as progression increases.

### Collision Detection

The player is represented as a moving ball on the canvas. Wall collision is checked precisely against nearby cells so failures feel fair and immediate.

### Speed Detection

Movement is continuously tracked and compared against the current level’s stealth threshold. If the player pushes too hard, the run fails instantly.

### Progression

Each new level can shift:

- maze size
- route density
- speed pressure
- handling feel
- visual palette
- pattern identity

This keeps the game from becoming repetitive even though the core rule set stays clean.

## Audio Design

Audio is built with the Web Audio API and reacts to play state:

- movement audio changes while you travel safely
- warning tone rises as you approach dangerous speed
- buzzer fires on failure
- chime plays on a successful clear

The current build leans into a weird, playful movement sound so the game feels more alive while staying minimal.

## Tech Stack

- `HTML`
- `CSS`
- `Vanilla JavaScript`
- `Canvas API`
- `Web Audio API`

No frameworks. No external packages. No asset pipeline.

## Run Locally

### Option 1

Open `index.html` directly in a browser.

### Option 2

Serve the folder with any static server.

Example with Python:

```bash
python -m http.server 3000
```

Then open:

```text
http://localhost:3000
```

## Works Well On

- Replit
- Desktop browsers
- Laptop keyboard play

## Project Structure

```text
.
├── index.html
├── style.css
├── script.js
└── README.md
```

## Code Structure

The JavaScript is organized around a few clear responsibilities:

- `Game` class: state, loop, rendering, progression, UI sync
- maze generation utilities: grid creation and path carving
- `AudioManager`: movement audio, warnings, buzzer, win chime
- `InputHandler`: keyboard input and directional control
- collision and speed systems: failure logic and goal detection

## Why This Project Stands Out

This is not just a maze toy. The game is designed around pressure and restraint:

- the player is punished for panic
- sound reinforces tension
- progression keeps changing the emotional rhythm of each run
- the presentation is intentionally sharp, dark, and arcade-like

The result is a compact browser game that feels closer to an indie prototype than a classroom demo.

## Possible Next Upgrades

- seeded runs for shareable challenge IDs
- daily challenge mode
- leaderboard integration
- touch controls for tablet play
- stronger accessibility options for color and audio intensity

## License

This repository currently does not include a license file.
