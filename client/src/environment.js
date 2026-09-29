import * as THREE from "three";

export function createEnvironment(scene, arenaSize = 90) {
  // Atmospheric Fog
  scene.fog = new THREE.FogExp2(0x0a0c1a, 0.015);

  // Deep Cosmic Background
  scene.background = new THREE.Color(0x060814);

  // Starfield Particles
  const starsCount = 1500;
  const starGeo = new THREE.BufferGeometry();
  const starPositions = new Float32Array(starsCount * 3);
  const starColors = new Float32Array(starsCount * 3);

  for (let i = 0; i < starsCount; i++) {
    const r = 180 + Math.random() * 80;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);

    starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = Math.abs(r * Math.cos(phi)) + 10; // keep above horizon
    starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

    const brightness = 0.7 + Math.random() * 0.3;
    starColors[i * 3] = brightness;
    starColors[i * 3 + 1] = brightness * (0.8 + Math.random() * 0.2);
    starColors[i * 3 + 2] = 1.0;
  }

  starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
  starGeo.setAttribute("color", new THREE.BufferAttribute(starColors, 3));

  const starMat = new THREE.PointsMaterial({
    size: 1.2,
    vertexColors: true,
    transparent: true,
    opacity: 0.85
  });
  const starField = new THREE.Points(starGeo, starMat);
  scene.add(starField);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0x1a2138, 1.2);
  scene.add(ambientLight);

  const hemiLight = new THREE.HemisphereLight(0x4466aa, 0x080c18, 0.9);
  scene.add(hemiLight);

  const mainLight = new THREE.DirectionalLight(0x00f0ff, 1.4);
  mainLight.position.set(30, 60, 40);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.width = 2048;
  mainLight.shadow.mapSize.height = 2048;
  mainLight.shadow.camera.near = 10;
  mainLight.shadow.camera.far = 160;
  mainLight.shadow.camera.left = -arenaSize / 1.5;
  mainLight.shadow.camera.right = arenaSize / 1.5;
  mainLight.shadow.camera.top = arenaSize / 1.5;
  mainLight.shadow.camera.bottom = -arenaSize / 1.5;
  scene.add(mainLight);

  // Warm accent rim light
  const rimLight = new THREE.DirectionalLight(0xff007f, 0.8);
  rimLight.position.set(-40, 30, -30);
  scene.add(rimLight);

  // Floor Base
  const floorGeo = new THREE.PlaneGeometry(arenaSize + 20, arenaSize + 20);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x0d1124,
    roughness: 0.3,
    metalness: 0.8
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Neon Grid Overlay
  const gridHelper = new THREE.GridHelper(arenaSize, 45, 0x00f0ff, 0x1e2749);
  gridHelper.position.y = 0.02;
  scene.add(gridHelper);

  // Central Hologram Platform
  const centerPlatGeo = new THREE.CylinderGeometry(4, 4.4, 0.3, 32);
  const centerPlatMat = new THREE.MeshStandardMaterial({
    color: 0x121a36,
    metalness: 0.9,
    roughness: 0.2
  });
  const centerPlat = new THREE.Mesh(centerPlatGeo, centerPlatMat);
  centerPlat.position.set(0, 0.15, 0);
  centerPlat.receiveShadow = true;
  scene.add(centerPlat);

  const centerRingGeo = new THREE.RingGeometry(3.6, 3.9, 32);
  const centerRingMat = new THREE.MeshBasicMaterial({
    color: 0x00f0ff,
    side: THREE.DoubleSide
  });
  const centerRing = new THREE.Mesh(centerRingGeo, centerRingMat);
  centerRing.rotation.x = -Math.PI / 2;
  centerRing.position.y = 0.31;
  scene.add(centerRing);

  // Perimeter Boundary Pylons & Energy Walls
  const half = arenaSize / 2;
  const pylonPositions = [
    [-half, -half], [half, -half], [half, half], [-half, half],
    [0, -half], [0, half], [-half, 0], [half, 0]
  ];

  const pylonGeo = new THREE.CylinderGeometry(0.6, 1.0, 10, 8);
  const pylonMat = new THREE.MeshStandardMaterial({
    color: 0x1a233d,
    metalness: 0.8,
    roughness: 0.2
  });
  const beaconGeo = new THREE.SphereGeometry(0.5, 16, 16);
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });

  pylonPositions.forEach(([px, pz]) => {
    const pylon = new THREE.Mesh(pylonGeo, pylonMat);
    pylon.position.set(px, 5, pz);
    pylon.castShadow = true;
    pylon.receiveShadow = true;
    scene.add(pylon);

    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.set(px, 10.3, pz);
    scene.add(beacon);

    const pLight = new THREE.PointLight(0x00f0ff, 1.5, 18);
    pLight.position.set(px, 10, pz);
    scene.add(pLight);
  });

  // Perimeter glowing barrier rails
  const railMat = new THREE.MeshBasicMaterial({
    color: 0x00f0ff,
    transparent: true,
    opacity: 0.35,
    wireframe: true
  });
  const wallPositions = [
    { pos: [0, 2, -half], rot: [0, 0, 0], len: arenaSize },
    { pos: [0, 2, half], rot: [0, 0, 0], len: arenaSize },
    { pos: [-half, 2, 0], rot: [0, Math.PI / 2, 0], len: arenaSize },
    { pos: [half, 2, 0], rot: [0, Math.PI / 2, 0], len: arenaSize }
  ];

  wallPositions.forEach(w => {
    const wallGeo = new THREE.PlaneGeometry(w.len, 4, 16, 4);
    const wall = new THREE.Mesh(wallGeo, railMat);
    wall.position.set(...w.pos);
    wall.rotation.set(...w.rot);
    scene.add(wall);
  });

  // Floating Decorative Sci-Fi Monoliths in Background
  const monolithGeo = new THREE.BoxGeometry(2.5, 20, 2.5);
  const monolithMat = new THREE.MeshStandardMaterial({
    color: 0x0e1428,
    metalness: 0.85,
    roughness: 0.25
  });

  const decorPositions = [
    [-half - 8, -half - 8], [half + 8, -half - 8],
    [-half - 8, half + 8], [half + 8, half + 8],
    [-half - 12, 0], [half + 12, 0],
    [0, -half - 12], [0, half + 12]
  ];

  decorPositions.forEach(([dx, dz], idx) => {
    const monolith = new THREE.Mesh(monolithGeo, monolithMat);
    monolith.position.set(dx, 8, dz);
    monolith.rotation.y = (idx * Math.PI) / 4;
    scene.add(monolith);

    // Glowing core stripe
    const stripeGeo = new THREE.BoxGeometry(0.3, 16, 2.52);
    const stripeMat = new THREE.MeshBasicMaterial({
      color: idx % 2 === 0 ? 0x00f0ff : 0xff007f
    });
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.position.set(dx, 8, dz);
    stripe.rotation.y = (idx * Math.PI) / 4;
    scene.add(stripe);
  });

  return {
    arenaSize,
    update: (time) => {
      // Gentle pulsing of beacon lights
      const pulse = 0.8 + Math.sin(time * 0.003) * 0.2;
      centerRingMat.opacity = pulse;
    }
  };
}
