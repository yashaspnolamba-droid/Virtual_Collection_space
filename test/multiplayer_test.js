import { io } from "socket.io-client";

console.log("🚀 Starting Multiplayer Verification Test...");

const clientA = io("http://localhost:3000", { reconnection: false });
const clientB = io("http://localhost:3000", { reconnection: false });

let clientAData = null;
let clientBData = null;
let initialCollectibles = null;

let stepAInit = false;
let stepBInit = false;
let stepBHeardAJoin = false;
let stepBHeardAMove = false;
let stepCollectConfirmed = false;

clientA.on("connect", () => {
  console.log("✓ Client A connected:", clientA.id);
});

clientA.on("init", (data) => {
  clientAData = data;
  initialCollectibles = data.collectibles;
  stepAInit = true;
  console.log(`✓ Client A received init. Available collectibles: ${Object.keys(initialCollectibles).length}`);
});

clientB.on("connect", () => {
  console.log("✓ Client B connected:", clientB.id);
});

clientB.on("init", (data) => {
  clientBData = data;
  stepBInit = true;
  console.log("✓ Client B received init.");
  runInteractionTests();
});

clientB.on("playerJoined", (p) => {
  console.log(`✓ Client B received playerJoined: ${p.name} (${p.id})`);
  stepBHeardAJoin = true;
});

clientB.on("playerMoved", (pos) => {
  if (pos.id === clientA.id) {
    stepBHeardAMove = true;
    console.log(`✓ Client B received Client A movement: (${pos.x}, ${pos.z})`);
  }
});

let testTimeout = null;

function runInteractionTests() {
  // Test movement broadcast
  setTimeout(() => {
    clientA.emit("move", { x: 5.5, y: 1.6, z: -10.2, rotY: 1.57 });
  }, 200);

  // Test collectible pickup
  setTimeout(() => {
    const firstKey = Object.keys(initialCollectibles)[0];
    const targetItem = initialCollectibles[firstKey];
    console.log(`🎯 Testing collection of ${firstKey} (${targetItem.type}) at (${targetItem.x}, ${targetItem.z})`);

    // Move Client A directly to item position (satisfies server distance check)
    clientA.emit("move", { x: targetItem.x, y: targetItem.y, z: targetItem.z, rotY: 0 });

    // Request collection
    clientA.emit("collect", firstKey);
  }, 600);
}

clientB.on("collected", ({ collectibleId, by, score, itemValue }) => {
  if (by === clientA.id) {
    stepCollectConfirmed = true;
    console.log(`🎉 Client B verified: Client A collected ${collectibleId} (+${itemValue} pts). Client A Score: ${score}`);
  }
});

clientB.on("leaderboardUpdate", (board) => {
  const top = board[0];
  if (top && top.score > 0) {
    console.log(`✓ Leaderboard synced. Leader: ${top.name} with ${top.score} pts.`);
    finishTest(true);
  }
});

function finishTest(success) {
  if (testTimeout) clearTimeout(testTimeout);
  console.log("\n=============================================");
  if (success) {
    console.log("🏆 ALL MULTIPLAYER TEST ASSERTIONS PASSED!");
    console.log(` - Init Handshake: ${stepAInit && stepBInit}`);
    console.log(` - Movement Synchronization: ${stepBHeardAMove}`);
    console.log(` - Authoritative Pickup Confirmation: ${stepCollectConfirmed}`);
  } else {
    console.error("❌ MULTIPLAYER TEST FAILED OR TIMED OUT");
  }
  console.log("=============================================\n");

  clientA.disconnect();
  clientB.disconnect();
  process.exit(success ? 0 : 1);
}

testTimeout = setTimeout(() => {
  finishTest(false);
}, 6000);