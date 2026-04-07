# VOID MAZE

Fullscreen 3D sci-fi stealth and combat maze game built for the **ElevenLabs x Replit Hackathon**.

`VOID MAZE` drops the player into a hostile orbital security facility where every corridor is a tradeoff: move slowly and stay hidden, or fire back and risk turning the whole maze against you. The project is designed to run instantly in the browser with no build step, no dependencies, and a clean Replit-friendly setup.

## Hackathon Pitch

This project aims to feel like a compact playable demo rather than a rough prototype:

- immersive first-person maze traversal
- stealth versus combat decision-making
- reactive defense systems
- polished HUD and alert feedback
- lightweight architecture that runs directly in the browser

It is a strong fit for a hackathon demo because it is:

- fast to launch
- easy to understand in seconds
- visually distinctive
- self-contained
- ready for future voice-driven expansion with ElevenLabs-style mission briefings, alarms, or AI security voices

## Core Experience

You are infiltrating a high-tech deep-space facility.

Your job is simple:

1. enter the maze
2. avoid detection when possible
3. destroy turrets and laser emitters
4. survive escalating alarms
5. unlock the jump gate
6. escape the sector

The tension comes from the central choice:

- stay quiet and move carefully
- or fight your way through and trigger a more dangerous facility response

## Features

- first-person raycast-rendered 3D maze presentation
- procedural maze generation for replayable runs
- player laser weapon with cooldown and hit feedback
- destructible defense turrets with tracking and return fire
- corridor laser emitters that create spatial hazards
- detection meter that rises when the player is seen or starts shooting
- alarm escalation that makes the facility more aggressive
- crosshair that reacts when the player is aiming at a valid target
- HUD for hull, detection, weapon cooldown, sector state, and hostiles remaining
- particle sparks, beam flashes, gate glow, and simple combat effects
- Web Audio API sound effects for firing, impacts, alarms, destruction, fail, and success
- no external dependencies and no asset pipeline required

## Controls

- `W A S D`: move
- `Shift`: creep / lower exposure
- `Mouse`: turn
- `Q / E`: turn fallback
- `Left Click` or `Space`: fire
- `P`: pause
- `R`: redeploy current sector
- `M`: return to menu
- `Enter`: trigger overlay action

## Tech Stack

- `HTML`
- `CSS`
- `Vanilla JavaScript`
- `Canvas API`
- `Web Audio API`

## Run Locally

### Option 1

Open `index.html` directly in a desktop browser.

### Option 2

Serve the project as a static site.

Example:

```bash
python -m http.server 3000
```

Then open:

```text
http://localhost:3000
```

## Replit-Friendly Setup

The project is intentionally simple to run on Replit:

- no package install
- no bundler
- no framework setup
- no external game engine

Everything ships in three core files:

```text
index.html
style.css
script.js
```

## System Design

### Gameplay

- procedural maze sectors
- stealth and combat balance through the detection meter
- low enemy count for fairness and performance
- reset-on-hit structure that keeps stakes high and runs quick

### Rendering

- raycasting-based wall rendering
- projected sprites for turrets, emitters, particles, and gate
- lightweight beam and flash effects
- fullscreen-ready canvas presentation

### Audio

- synthesized effects generated with the Web Audio API
- no external audio assets required
- alarm and combat sounds tied directly to gameplay state

## Why It Works As A Demo

- The game starts fast and communicates its goal immediately.
- The visual style is minimal but still feels intentional and sci-fi.
- The stealth/combat tension gives the run actual decision-making instead of simple maze solving.
- The codebase stays small enough to understand and extend during a hackathon.

## Next Extensions

If this continues after the hackathon, the most natural upgrades are:

- voiced AI mission briefings with ElevenLabs
- spoken alarm announcements and enemy chatter
- leaderboard or timed challenge mode
- seeded sectors for shareable runs
- more facility types, palettes, and defense behaviors

## Project Structure

```text
.
|-- index.html
|-- style.css
|-- script.js
`-- README.md
```

## Status

Current build is a polished browser-playable mini-game demo focused on:

- presentation
- gameplay clarity
- replayable procedural sectors
- hackathon-friendly delivery

## License

No license file is currently included in this repository.
