export class UIManager {
  constructor() {
    this.scoreEl = document.getElementById("score-value");
    this.leaderboardListEl = document.getElementById("leaderboard-list");
    this.feedEl = document.getElementById("event-feed");
    this.radarCanvas = document.getElementById("radar-canvas");
    this.radarCtx = this.radarCanvas ? this.radarCanvas.getContext("2d") : null;

    this.currentScore = 0;
  }

  setScore(score) {
    this.currentScore = score;
    if (this.scoreEl) {
      this.scoreEl.textContent = score;
      // Trigger pop animation
      this.scoreEl.classList.remove("bump");
      void this.scoreEl.offsetWidth; // trigger reflow
      this.scoreEl.classList.add("bump");
    }
  }

  updateLeaderboard(board, myId) {
    if (!this.leaderboardListEl) return;
    this.leaderboardListEl.innerHTML = "";

    board.forEach((player, index) => {
      const item = document.createElement("div");
      item.className = "leaderboard-row" + (player.id === myId ? " is-me" : "");

      const rankBadge = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`;

      item.innerHTML = `
        <div class="rank">${rankBadge}</div>
        <div class="name" style="color: ${player.color || '#fff'}">${player.name}</div>
        <div class="score">${player.score} pts</div>
      `;
      this.leaderboardListEl.appendChild(item);
    });
  }

  addFeedMessage(html) {
    if (!this.feedEl) return;
    const msg = document.createElement("div");
    msg.className = "feed-item";
    msg.innerHTML = html;
    this.feedEl.appendChild(msg);

    // Fade out and remove after 4 seconds
    setTimeout(() => {
      msg.style.opacity = "0";
      setTimeout(() => msg.remove(), 600);
    }, 3800);

    // Keep max 5 feed items
    while (this.feedEl.children.length > 5) {
      this.feedEl.removeChild(this.feedEl.firstChild);
    }
  }

  drawRadar(localPlayer, remotePlayers, collectibles, arenaSize = 90) {
    if (!this.radarCtx) return;
    const ctx = this.radarCtx;
    const w = this.radarCanvas.width;
    const h = this.radarCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const scale = (w * 0.44) / (arenaSize / 2);

    ctx.clearRect(0, 0, w, h);

    // Radar background grid
    ctx.strokeStyle = "rgba(0, 240, 255, 0.15)";
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.arc(cx, cy, w * 0.44, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, w * 0.25, 0, Math.PI * 2);
    ctx.stroke();

    // Radar sweep line
    const sweepAngle = (performance.now() * 0.002) % (Math.PI * 2);
    ctx.strokeStyle = "rgba(0, 240, 255, 0.4)";
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(sweepAngle) * (w * 0.44), cy + Math.sin(sweepAngle) * (w * 0.44));
    ctx.stroke();

    // Draw Collectibles
    collectibles.forEach(c => {
      const rx = cx + c.x * scale;
      const ry = cy + c.z * scale;

      ctx.fillStyle = c.color ? `#${c.color.toString(16).padStart(6, '0')}` : "#00f0ff";
      ctx.beginPath();
      ctx.arc(rx, ry, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw Remote Players
    remotePlayers.forEach(p => {
      const px = cx + p.x * scale;
      const py = cy + p.z * scale;

      ctx.fillStyle = p.color || "#ff6633";
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw Local Player (Cyan Directional Arrow)
    const lx = cx + localPlayer.x * scale;
    const ly = cy + localPlayer.z * scale;

    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(localPlayer.rotY);

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4, 5);
    ctx.lineTo(0, 3);
    ctx.lineTo(-4, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
