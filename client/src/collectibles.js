import * as THREE from "three";

export class CollectibleManager {
  constructor(scene) {
    this.scene = scene;
    this.collectibles = new Map(); // id -> { group, mesh, light, data, basePos, rotSpeed, bobOffset }
    this.particles = []; // active particle explosions

    // Reusable geometries and base materials
    this.geometries = {
      crystal: new THREE.OctahedronGeometry(0.55, 0),
      relic: new THREE.DodecahedronGeometry(0.65, 0),
      quantum_orb: new THREE.IcosahedronGeometry(0.7, 1)
    };

    this.ringGeo = new THREE.TorusGeometry(0.85, 0.02, 8, 24);
  }

  add(id, data) {
    if (this.collectibles.has(id)) {
      this.remove(id);
    }

    const group = new THREE.Group();
    group.position.set(data.x, data.y, data.z);

    const colorHex = data.color || 0x00f0ff;
    const type = data.type || "crystal";
    const geo = this.geometries[type] || this.geometries.crystal;

    // Inner glowing core
    const coreMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      emissive: colorHex,
      emissiveIntensity: 0.85,
      roughness: 0.2,
      metalness: 0.8,
      flatShading: true
    });
    const coreMesh = new THREE.Mesh(geo, coreMat);
    coreMesh.castShadow = true;
    group.add(coreMesh);

    // Orbiting wireframe ring
    const ringMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      wireframe: true,
      transparent: true,
      opacity: 0.6
    });
    const ringMesh = new THREE.Mesh(this.ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 3;
    group.add(ringMesh);

    // Glowing point light
    const light = new THREE.PointLight(colorHex, 1.8, 6);
    light.position.set(0, 0, 0);
    group.add(light);

    this.scene.add(group);

    this.collectibles.set(id, {
      id,
      group,
      coreMesh,
      ringMesh,
      light,
      data,
      baseY: data.y,
      rotSpeedY: 1.2 + Math.random() * 0.8,
      rotSpeedX: 0.6 + Math.random() * 0.4,
      bobOffset: Math.random() * Math.PI * 2
    });
  }

  remove(id) {
    const item = this.collectibles.get(id);
    if (!item) return;

    this.scene.remove(item.group);
    item.coreMesh.geometry.dispose;
    item.coreMesh.material.dispose;
    item.ringMesh.material.dispose;
    this.collectibles.delete(id);
  }

  // Trigger glowing burst of particles when an item is collected
  explodeAt(x, y, z, colorHex = 0x00f0ff) {
    const count = 36;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const speed = 2.5 + Math.random() * 4.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      velocities.push(
        new THREE.Vector3(
          speed * Math.sin(phi) * Math.cos(theta),
          speed * Math.sin(phi) * Math.sin(theta) + 1.2,
          speed * Math.cos(phi)
        )
      );
    }

    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: colorHex,
      size: 0.35,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending
    });

    const pSystem = new THREE.Points(geo, mat);
    this.scene.add(pSystem);

    this.particles.push({
      pSystem,
      geo,
      mat,
      positions,
      velocities,
      age: 0,
      lifespan: 0.65
    });
  }

  update(time, delta) {
    // Animate collectibles
    for (const item of this.collectibles.values()) {
      item.coreMesh.rotation.y += item.rotSpeedY * delta;
      item.coreMesh.rotation.x += item.rotSpeedX * delta;
      item.ringMesh.rotation.z -= (item.rotSpeedY * 0.7) * delta;

      // Floating bobbing motion
      item.group.position.y = item.baseY + Math.sin(time * 2.2 + item.bobOffset) * 0.22;

      // Subtle light pulse
      item.light.intensity = 1.4 + Math.sin(time * 3 + item.bobOffset) * 0.5;
    }

    // Animate particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += delta;
      const progress = p.age / p.lifespan;

      if (progress >= 1.0) {
        this.scene.remove(p.pSystem);
        p.geo.dispose();
        p.mat.dispose();
        this.particles.splice(i, 1);
        continue;
      }

      p.mat.opacity = 1.0 - progress;

      for (let j = 0; j < p.velocities.length; j++) {
        p.positions[j * 3] += p.velocities[j].x * delta;
        p.positions[j * 3 + 1] += p.velocities[j].y * delta;
        p.positions[j * 3 + 2] += p.velocities[j].z * delta;
        p.velocities[j].y -= 4.0 * delta; // gentle gravity
      }

      p.geo.attributes.position.needsUpdate = true;
    }
  }

  // Check which item is within pickup radius of player
  findPickup(playerPos, radius = 1.8) {
    for (const [id, item] of this.collectibles.entries()) {
      const dx = playerPos.x - item.group.position.x;
      const dy = playerPos.y - item.group.position.y;
      const dz = playerPos.z - item.group.position.z;
      const distSq = dx * dx + dy * dy + dz * dz;

      if (distSq <= radius * radius) {
        return {
          id,
          item,
          pos: item.group.position.clone(),
          color: item.data.color
        };
      }
    }
    return null;
  }

  getAll() {
    return Array.from(this.collectibles.values()).map(c => ({
      id: c.id,
      x: c.group.position.x,
      z: c.group.position.z,
      type: c.data.type,
      color: c.data.color
    }));
  }
}
