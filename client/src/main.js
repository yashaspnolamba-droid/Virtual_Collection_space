import * as THREE from "three";
import { io } from "socket.io-client";
import { createEnvironment } from "./environment.js";
import { FirstPersonController, RemotePlayerManager } from "./player.js";
import { CollectibleManager } from "./collectibles.js";
import { UIManager } from "./ui.js";
import { sound } from "./audio.js";

// Scene Setup
const container = document.getElementById("canvas-container");
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance"
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
container.appendChild(renderer.domElement);

// Instantiate Subsystems
const ARENA_SIZE = 90;
const environment = createEnvironment(scene, ARENA_SIZE);
const collectibles = new CollectibleManager(scene);
const remotePlayers = new RemotePlayerManager(scene);
const ui = new UIManager();
const controller = new FirstPersonController(camera, renderer.domElement, ARENA_SIZE);

// Multiplayer Connection
// Socket.io automatically connects to current origin / proxy
const socket = io();
let myId = null;
let myName = "";
let myColor = "#00f0ff";

// Setup Start Overlay & Audio Unlock
const blocker = document.getElementById("blocker");
const startBtn = document.getElementById("start-btn");
const nameInput = document.getElementById("player-name-input");
const muteBtn = document.getElementById("mute-btn");

if (startBtn) {
  startBtn.addEventListener("click", () => {
    sound.init();
    controller.lock();
    if (nameInput && nameInput.value.trim() && nameInput.value.trim() !== myName) {
      myName = nameInput.value.trim();
      socket.emit("setName", myName);
    }
  });
}

if (muteBtn) {
  muteBtn.addEventListener("click", () => {
    const isMuted = sound.toggleMute();
    muteBtn.textContent = isMuted ? "🔇 Unmute" : "🔊 Audio";
    muteBtn.classList.toggle("muted", isMuted);
  });
}

// Socket Network Events
socket.on("connect", () => {
  console.log("[Socket] Connected with ID:", socket.id);
});

socket.on("init", ({ id, playerData, players, collectibles: initialCollectibles, leaderboard }) => {
  myId = id;
  myName = playerData.name;
  myColor = playerData.color;

  if (nameInput) nameInput.value = myName;

  // Sync position from server start point
  controller.position.set(playerData.x, playerData.y, playerData.z);
  camera.position.set(playerData.x, playerData.y, playerData.z);

  // Seed existing remote players
  for (const [pid, pData] of Object.entries(players)) {
    if (pid !== myId) {
      remotePlayers.addPlayer(pid, pData);
    }
  }

  // Seed collectibles
  for (const [cid, cData] of Object.entries(initialCollectibles)) {
    collectibles.add(cid, cData);
  }

  // Set initial UI state
  ui.updateLeaderboard(leaderboard, myId);
  ui.setScore(playerData.score || 0);
  ui.addFeedMessage(`Connected as <b style="color:${myColor}">${myName}</b>`);
});

socket.on("playerJoined", (p) => {
  remotePlayers.addPlayer(p.id, p);
  ui.addFeedMessage(`<span style="color:${p.color}">${p.name}</span> joined the arena`);
});

socket.on("playerMoved", (pos) => {
  remotePlayers.updatePlayerPosition(pos.id, pos);
});

socket.on("playerNameChanged", ({ id, name }) => {
  remotePlayers.updatePlayerName(id, name);
});

socket.on("collected", ({ collectibleId, by, playerName, score, itemValue, itemType }) => {
  const item = collectibles.collectibles.get(collectibleId);
  if (item) {
    collectibles.explodeAt(
      item.group.position.x,
      item.group.position.y,
      item.group.position.z,
      item.data.color
    );
    collectibles.remove(collectibleId);
  }

  if (by === myId) {
    ui.setScore(score);
    sound.playCollectSound(itemType);
    ui.addFeedMessage(`<b>+${itemValue} pts</b> You collected a ${itemType.replace("_", " ")}!`);
  } else {
    remotePlayers.updatePlayerScore(by, score);
    ui.addFeedMessage(`<b>${playerName}</b> collected a ${itemType.replace("_", " ")}`);
  }
});

socket.on("spawned", (cData) => {
  collectibles.add(cData.id, cData);
});

socket.on("playerLeft", (id) => {
  const p = remotePlayers.players.get(id);
  if (p) {
    ui.addFeedMessage(`${p.data.name} left the arena`);
  }
  remotePlayers.removePlayer(id);
});

socket.on("leaderboardUpdate", (board) => {
  ui.updateLeaderboard(board, myId);
});

// Throttled Network Position Emitter (~20Hz)
let lastNetworkSync = 0;
function syncNetworkPosition(time) {
  if (time - lastNetworkSync > 50 && myId) {
    const p = controller.getPosition();
    socket.emit("move", p);
    lastNetworkSync = time;
  }
}

// Proximity Collection Detection
function checkCollection() {
  const pickup = collectibles.findPickup(controller.position, 1.8);
  if (pickup) {
    // Request collection confirmation from authoritative server
    socket.emit("collect", pickup.id);
  }
}

// Main Render Loop
const clock = new THREE.Clock();

function animate(currentTime) {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.1);
  const elapsedTime = clock.getElapsedTime();

  // Update Player Simulation
  controller.update(delta);
  checkCollection();
  syncNetworkPosition(currentTime);

  // Update Game Entities
  collectibles.update(elapsedTime, delta);
  remotePlayers.update(delta, elapsedTime);
  environment.update(elapsedTime);

  // Update UI & Minimap
  const localPos = controller.getPosition();
  ui.drawRadar(
    localPos,
    remotePlayers.getAll(),
    collectibles.getAll(),
    ARENA_SIZE
  );

  renderer.render(scene, camera);
}

animate(0);

// Window Resize Handler
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});
