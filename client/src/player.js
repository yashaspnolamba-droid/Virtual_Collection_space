import * as THREE from "three";
import { sound } from "./audio.js";

export class FirstPersonController {
  constructor(camera, domElement, arenaSize = 90) {
    this.camera = camera;
    this.domElement = domElement;
    this.arenaSize = arenaSize;
    this.boundary = (arenaSize / 2) - 1.5;

    // Movement state
    this.position = new THREE.Vector3(0, 1.6, 0);
    this.velocity = new THREE.Vector3();
    this.camera.position.copy(this.position);

    // Orientation
    this.yaw = 0;
    this.pitch = 0;
    this.isLocked = false;

    // Physics constants
    this.walkSpeed = 7.0;
    this.sprintSpeed = 12.0;
    this.jumpForce = 6.8;
    this.gravity = 18.0;
    this.isGrounded = true;

    // Head bobbing
    this.bobTimer = 0;
    this.bobAmount = 0.06;
    this.lastBobPhase = 0;

    // Input state
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      sprint: false,
      jump: false
    };

    this.setupInputs();
  }

  setupInputs() {
    // Pointer Lock
    document.addEventListener("pointerlockchange", () => {
      this.isLocked = (document.pointerLockElement === this.domElement);
      const blocker = document.getElementById("blocker");
      if (blocker) {
        blocker.style.display = this.isLocked ? "none" : "flex";
      }
    });

    document.addEventListener("mousemove", (e) => {
      if (!this.isLocked) return;

      const sensitivity = 0.0022;
      this.yaw -= e.movementX * sensitivity;
      this.pitch -= e.movementY * sensitivity;

      // Clamp vertical look (pitch)
      const maxPitch = Math.PI / 2 - 0.05;
      this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));
    });

    // Keyboard handlers
    window.addEventListener("keydown", (e) => {
      switch (e.code) {
        case "KeyW": case "ArrowUp": this.keys.forward = true; break;
        case "KeyS": case "ArrowDown": this.keys.backward = true; break;
        case "KeyA": case "ArrowLeft": this.keys.left = true; break;
        case "KeyD": case "ArrowRight": this.keys.right = true; break;
        case "ShiftLeft": case "ShiftRight": this.keys.sprint = true; break;
        case "Space":
          if (this.isGrounded) {
            this.velocity.y = this.jumpForce;
            this.isGrounded = false;
            sound.playJumpSound();
          }
          break;
      }
    });

    window.addEventListener("keyup", (e) => {
      switch (e.code) {
        case "KeyW": case "ArrowUp": this.keys.forward = false; break;
        case "KeyS": case "ArrowDown": this.keys.backward = false; break;
        case "KeyA": case "ArrowLeft": this.keys.left = false; break;
        case "KeyD": case "ArrowRight": this.keys.right = false; break;
        case "ShiftLeft": case "ShiftRight": this.keys.sprint = false; break;
      }
    });
  }

  lock() {
    this.domElement.requestPointerLock();
  }

  update(delta) {
    // Determine movement direction relative to camera yaw
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    const moveDir = new THREE.Vector3();
    if (this.keys.forward) moveDir.add(forward);
    if (this.keys.backward) moveDir.sub(forward);
    if (this.keys.right) moveDir.add(right);
    if (this.keys.left) moveDir.sub(right);

    const isMoving = moveDir.lengthSq() > 0.001;
    if (isMoving) moveDir.normalize();

    const speed = this.keys.sprint ? this.sprintSpeed : this.walkSpeed;

    // Horizontal velocity damping
    this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, moveDir.x * speed, 12 * delta);
    this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, moveDir.z * speed, 12 * delta);

    // Vertical physics (gravity)
    this.velocity.y -= this.gravity * delta;

    // Apply movement
    this.position.x += this.velocity.x * delta;
    this.position.y += this.velocity.y * delta;
    this.position.z += this.velocity.z * delta;

    // Ground collision
    const eyeHeight = 1.6;
    if (this.position.y <= eyeHeight) {
      this.position.y = eyeHeight;
      this.velocity.y = 0;
      this.isGrounded = true;
    }

    // Arena boundary collision
    this.position.x = Math.max(-this.boundary, Math.min(this.boundary, this.position.x));
    this.position.z = Math.max(-this.boundary, Math.min(this.boundary, this.position.z));

    // Head bobbing calculation
    let bobOffset = 0;
    if (isMoving && this.isGrounded) {
      const bobFreq = this.keys.sprint ? 14 : 10;
      this.bobTimer += delta * bobFreq;
      bobOffset = Math.sin(this.bobTimer) * this.bobAmount;

      // Trigger footstep sound at bottom of bob
      const currentPhase = Math.sin(this.bobTimer);
      if (this.lastBobPhase > -0.7 && currentPhase <= -0.7) {
        sound.playStepSound();
      }
      this.lastBobPhase = currentPhase;
    } else {
      this.bobTimer = 0;
    }

    // Apply position & rotation to camera
    this.camera.position.set(
      this.position.x,
      this.position.y + bobOffset,
      this.position.z
    );

    // Compute rotation quaternion: first yaw (Y axis), then pitch (X axis)
    const euler = new THREE.Euler(this.pitch, this.yaw, 0, "YXZ");
    this.camera.quaternion.setFromEuler(euler);
  }

  getPosition() {
    return {
      x: this.position.x,
      y: this.position.y,
      z: this.position.z,
      rotY: this.yaw
    };
  }
}

// Remote Player representation
export class RemotePlayerManager {
  constructor(scene) {
    this.scene = scene;
    this.players = new Map(); // id -> { group, targetPos, targetRotY, sprite, canvas, ctx, texture, data }
  }

  // Helper to create glowing billboard name and score tag
  createNametag(name, score, colorHex) {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 80;
    const ctx = canvas.getContext("2d");

    this.drawNametag(ctx, canvas.width, canvas.height, name, score, colorHex);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(2.4, 0.75, 1);
    sprite.position.set(0, 1.4, 0);

    return { sprite, canvas, ctx, texture };
  }

  drawNametag(ctx, w, h, name, score, colorHex) {
    ctx.clearRect(0, 0, w, h);

    // Pill background with glow
    ctx.fillStyle = "rgba(10, 15, 30, 0.75)";
    ctx.strokeStyle = colorHex || "#00f0ff";
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.roundRect(8, 8, w - 16, h - 16, 16);
    ctx.fill();
    ctx.stroke();

    // Player Name
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 22px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(name, w / 2, 36);

    // Score Tag
    ctx.fillStyle = colorHex || "#00f0ff";
    ctx.font = "16px monospace";
    ctx.fillText(`SCORE: ${score}`, w / 2, 58);
  }

  addPlayer(id, data) {
    if (this.players.has(id)) {
      this.removePlayer(id);
    }

    const group = new THREE.Group();
    group.position.set(data.x, data.y, data.z);

    const colorHex = data.color || "#00f0ff";

    // Drone / Avatar Body: Futuristic Hovering Pod
    const bodyGeo = new THREE.CapsuleGeometry(0.4, 0.5, 8, 16);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x182035,
      metalness: 0.85,
      roughness: 0.25
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.castShadow = true;
    group.add(bodyMesh);

    // Glowing Visor / Sensor Eye
    const visorGeo = new THREE.BoxGeometry(0.45, 0.18, 0.25);
    const visorMat = new THREE.MeshBasicMaterial({ color: colorHex });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 0.2, 0.32);
    group.add(visor);

    // Hover Ring
    const ringGeo = new THREE.TorusGeometry(0.55, 0.03, 8, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: colorHex, wireframe: true });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    // Thruster Light
    const thrusterLight = new THREE.PointLight(colorHex, 1.2, 4);
    thrusterLight.position.set(0, -0.4, 0);
    group.add(thrusterLight);

    // Nametag Sprite
    const nametag = this.createNametag(data.name || "Explorer", data.score || 0, colorHex);
    group.add(nametag.sprite);

    this.scene.add(group);

    this.players.set(id, {
      id,
      group,
      ring,
      nametag,
      data,
      targetPos: new THREE.Vector3(data.x, data.y, data.z),
      targetRotY: data.rotY || 0
    });
  }

  removePlayer(id) {
    const p = this.players.get(id);
    if (!p) return;

    this.scene.remove(p.group);
    p.nametag.texture.dispose();
    p.nametag.sprite.material.dispose();
    this.players.delete(id);
  }

  updatePlayerPosition(id, pos) {
    const p = this.players.get(id);
    if (!p) return;

    p.targetPos.set(pos.x, pos.y, pos.z);
    if (pos.rotY !== undefined) {
      p.targetRotY = pos.rotY;
    }
  }

  updatePlayerScore(id, newScore) {
    const p = this.players.get(id);
    if (!p) return;

    p.data.score = newScore;
    this.drawNametag(
      p.nametag.ctx,
      p.nametag.canvas.width,
      p.nametag.canvas.height,
      p.data.name,
      newScore,
      p.data.color
    );
    p.nametag.texture.needsUpdate = true;
  }

  updatePlayerName(id, newName) {
    const p = this.players.get(id);
    if (!p) return;

    p.data.name = newName;
    this.drawNametag(
      p.nametag.ctx,
      p.nametag.canvas.width,
      p.nametag.canvas.height,
      newName,
      p.data.score,
      p.data.color
    );
    p.nametag.texture.needsUpdate = true;
  }

  update(delta, time) {
    for (const p of this.players.values()) {
      // Smooth position interpolation (LERP)
      p.group.position.lerp(p.targetPos, 14 * delta);

      // Smooth rotation interpolation
      let diff = p.targetRotY - p.group.rotation.y;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      p.group.rotation.y += diff * 12 * delta;

      // Hover bobbing animation
      p.group.position.y = p.targetPos.y + Math.sin(time * 3 + p.group.position.x) * 0.08;

      // Spin ring
      p.ring.rotation.z += 1.5 * delta;
    }
  }

  getAll() {
    return Array.from(this.players.values()).map(p => ({
      id: p.id,
      name: p.data.name,
      x: p.group.position.x,
      z: p.group.position.z,
      score: p.data.score,
      color: p.data.color
    }));
  }
}
