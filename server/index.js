import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Serve production build if available
app.use(express.static(path.join(__dirname, "../dist")));

app.get("/api/status", (req, res) => {
  res.json({
    status: "online",
    playersCount: Object.keys(players).length,
    collectiblesCount: Object.keys(collectibles).length,
    uptime: process.uptime()
  });
});

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/socket.io")) return next();
  res.sendFile(path.join(__dirname, "../dist/index.html"));
});

const ARENA_SIZE = 90; // -45 to +45
const TOTAL_COLLECTIBLES = 28;

const players = {};
const collectibles = {};

const COLOR_PALETTE = [
  "#00f0ff", // Neon Cyan
  "#ff007f", // Cyber Pink
  "#ffe600", // Electric Gold
  "#00ff88", // Emerald Glow
  "#a855f7", // Ultraviolet
  "#ff5722", // Plasma Orange
  "#00e5ff"  // Deep Cyan
];

const ITEM_TYPES = [
  { type: "crystal", value: 10, color: 0x00f0ff, weight: 60 },
  { type: "relic", value: 25, color: 0xffd700, weight: 30 },
  { type: "quantum_orb", value: 50, color: 0xff007f, weight: 10 }
];

function getRandomType() {
  const rand = Math.random() * 100;
  if (rand < 60) return ITEM_TYPES[0];
  if (rand < 90) return ITEM_TYPES[1];
  return ITEM_TYPES[2];
}

function spawnCollectible(id) {
  const chosen = getRandomType();
  const radius = (ARENA_SIZE / 2) - 4;
  collectibles[id] = {
    id,
    x: Math.round((Math.random() * 2 - 1) * radius * 10) / 10,
    y: 1.2,
    z: Math.round((Math.random() * 2 - 1) * radius * 10) / 10,
    type: chosen.type,
    value: chosen.value,
    color: chosen.color
  };
}

// Initial seed
for (let i = 0; i < TOTAL_COLLECTIBLES; i++) {
  spawnCollectible(`c_${i}`);
}

function getLeaderboard() {
  return Object.values(players)
    .map(p => ({ id: p.id, name: p.name, score: p.score, color: p.color }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

io.on("connection", (socket) => {
  const colorIndex = Math.floor(Math.random() * COLOR_PALETTE.length);
  const randomNum = Math.floor(100 + Math.random() * 900);
  const defaultName = `Explorer-${randomNum}`;

  const spawnRadius = 15;
  players[socket.id] = {
    id: socket.id,
    name: defaultName,
    color: COLOR_PALETTE[colorIndex],
    x: (Math.random() - 0.5) * spawnRadius,
    y: 1.6, // first-person eye height
    z: (Math.random() - 0.5) * spawnRadius,
    rotY: 0,
    score: 0
  };

  console.log(`[+] Player connected: ${defaultName} (${socket.id})`);

  // Send current state to newly connected player
  socket.emit("init", {
    id: socket.id,
    playerData: players[socket.id],
    players,
    collectibles,
    leaderboard: getLeaderboard()
  });

  // Notify everyone else
  socket.broadcast.emit("playerJoined", players[socket.id]);
  io.emit("leaderboardUpdate", getLeaderboard());

  // Player custom name update
  socket.on("setName", (name) => {
    if (players[socket.id] && typeof name === "string") {
      const cleanName = name.trim().substring(0, 16) || players[socket.id].name;
      players[socket.id].name = cleanName;
      io.emit("playerNameChanged", { id: socket.id, name: cleanName });
      io.emit("leaderboardUpdate", getLeaderboard());
    }
  });

  // Movement update from client
  socket.on("move", (pos) => {
    const p = players[socket.id];
    if (!p) return;
    p.x = pos.x;
    p.y = pos.y;
    p.z = pos.z;
    p.rotY = pos.rotY;

    // Relay to other players
    socket.broadcast.emit("playerMoved", {
      id: socket.id,
      x: pos.x,
      y: pos.y,
      z: pos.z,
      rotY: pos.rotY
    });
  });

  // Collect attempt
  socket.on("collect", (collectibleId) => {
    const item = collectibles[collectibleId];
    const player = players[socket.id];
    if (!item || !player) return;

    // Server-side distance validation to prevent cheating
    const dx = player.x - item.x;
    const dz = player.z - item.z;
    const distSq = dx * dx + dz * dz;

    // Max collection reach (allowing for minor network latency)
    if (distSq > 30) {
      return;
    }

    // Authoritatively claim
    delete collectibles[collectibleId];
    player.score += item.value;

    console.log(`[★] ${player.name} collected ${item.type} (+${item.value}). Total: ${player.score}`);

    // Broadcast collection event to all clients
    io.emit("collected", {
      collectibleId,
      by: socket.id,
      playerName: player.name,
      score: player.score,
      itemValue: item.value,
      itemType: item.type
    });

    io.emit("leaderboardUpdate", getLeaderboard());

    // Respawn a new collectible after delay
    setTimeout(() => {
      spawnCollectible(collectibleId);
      io.emit("spawned", collectibles[collectibleId]);
    }, 4000 + Math.random() * 2000);
  });

  socket.on("disconnect", () => {
    const p = players[socket.id];
    console.log(`[-] Player disconnected: ${p ? p.name : socket.id}`);
    delete players[socket.id];
    io.emit("playerLeft", socket.id);
    io.emit("leaderboardUpdate", getLeaderboard());
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`=============================================`);
  console.log(` 🌌 3D Multiplayer Game Server running on :${PORT}`);
  console.log(`=============================================`);
});
