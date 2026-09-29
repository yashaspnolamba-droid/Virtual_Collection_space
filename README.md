# 🌌 CYBERSLICE // 3D First-Person Multiplayer Simulation

A high-fidelity, real-time multiplayer 3D simulation and collectible game built with **Three.js**, **Socket.IO**, **Node.js / Express**, and **Vite**.

Designed with modern AR/VR aesthetic principles: cyber-sanctuary arena, volumetric atmosphere, procedural Web Audio synthesizer, first-person pointer-lock locomotion, and server-authoritative state synchronization.

---

## 🕹 Features

- **True First-Person Experience (FPV)**:
  - Full **Pointer Lock** mouse-look controls with vertical pitch clamping (-85° to +85°).
  - Smooth inertial WASD navigation with sprint boost (`Shift`) and thruster jumps (`Space`).
  - Realistic kinematic head-bobbing and footstep cadence.
  - Centered holographic crosshair reticle.
- **Cyber-Sanctuary Simulation Environment**:
  - Deep midnight skybox with multi-depth procedural starfield.
  - Reflective neon-grid ground plane with boundary energy rails and beacon obelisks.
  - Atmospheric exponential fog and cinematic ACESFilmic tone-mapping.
  - Floating architectural monoliths with glowing power stripes.
- **Interactive Multi-Tier Collectibles**:
  - **Energy Crystals** (Octahedron, Cyan glow, +10 pts)
  - **Ancient Relics** (Dodecahedron, Gold glow, +25 pts)
  - **Quantum Orbs** (Icosahedron, Magenta glow, +50 pts)
  - Continuous dual-axis spinning, sine-wave hover bobbing, and dynamic point lights.
  - Particle explosion shockwaves (35+ sparks with gravity & additive blending) upon collection.
- **Real-Time Multiplayer & Avatars**:
  - Server-authoritative pickup verification (eliminates race conditions and cheating).
  - Other players rendered as sleek hovering robotic drones with glowing visors and sensor rings.
  - Floating 3D billboard nametags and live scores above each player.
  - Smooth 60fps linear interpolation (LERP) for zero-jitter network motion.
- **Futuristic HUD & Audio**:
  - Frosted glass (glassmorphism) score indicator with pop animations.
  - Live synced leaderboard with podium badges (🥇, 🥈, 🥉).
  - 2D Circular Sector Radar / Minimap tracking players, competitors, and energy cores with a sweeping scanner beam.
  - Live activity feed showing pickup logs and player arrivals.
  - 100% procedural sound effects via **Web Audio API** (chimes, chords, jumps, steps) — no external sound assets required!

---

## 🚀 Quick Start

### 1. Launch Game Server
From the project folder:
```bash
npm start
```
The server will boot on `http://localhost:3000`.

### 2. Play Multiplayer
1. Open `http://localhost:3000` in your web browser.
2. Enter your Callsign and click **"INITIALIZE & ENTER"**.
3. Click anywhere on screen to lock your mouse pointer into first-person mode (`ESC` to unlock).
4. Open a **second tab** or window (or visit `http://<your-local-ip>:3000` from another device on the same Wi-Fi).
5. Watch your avatars roam together in real-time, pick up glowing crystals, and compete on the live leaderboard!

---

## 🛠 Development Commands

- `npm run dev:server`: Run backend with Node (`server/index.js`)
- `npm run dev:client`: Run Vite dev server with instant HMR (`http://localhost:5173`)
- `npm run build`: Build production optimized client assets to `dist/`
- `node test/multiplayer_test.js`: Run automated headless multi-client synchronization test

---

## 📂 Project Architecture

```
collect-game/
├── client/
│   ├── index.html            # Futuristic HUD, crosshair, overlay
│   ├── style.css             # Glassmorphic UI & Orbitron typography
│   └── src/
│       ├── main.js           # Three.js render loop & Socket.IO wiring
│       ├── player.js         # First-person controller & remote drone avatars
│       ├── collectibles.js   # Procedural crystals, animations, particle VFX
│       ├── environment.js    # Cyber arena, lighting, starfield, fog
│       ├── audio.js          # Web Audio API procedural sound synthesizer
│       └── ui.js             # Radar minimap, leaderboard, activity feed
├── server/
│   └── index.js              # Authoritative Express + Socket.IO server
├── test/
│   └── multiplayer_test.js   # Automated multi-client test suite
├── dist/                     # Optimized client production bundle
├── vite.config.js
└── package.json
```