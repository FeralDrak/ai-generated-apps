import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";

const HECTARE = 100;
const HALF = HECTARE / 2;
const MAX_PLANTS = 180;
const SIM_SPEED = 0.15;
const MUTATION_RATE = 0.075;

const canvas = document.querySelector("#world");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0x9fc7d2);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x9fc7d2, 0.018);

const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 320);
camera.position.set(0, 2.1, 11);

const controls = new PointerLockControls(camera, document.body);
document.body.addEventListener("click", (event) => {
  if (!event.target.closest("button")) controls.lock();
});

const hemi = new THREE.HemisphereLight(0xeaf7ff, 0x4c6b3a, 1.6);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff1b8, 2.2);
sun.position.set(-36, 60, 28);
sun.castShadow = true;
sun.shadow.camera.left = -72;
sun.shadow.camera.right = 72;
sun.shadow.camera.top = 72;
sun.shadow.camera.bottom = -72;
sun.shadow.mapSize.set(2048, 2048);
scene.add(sun);

const soil = new THREE.Mesh(
  new THREE.PlaneGeometry(HECTARE, HECTARE, 80, 80),
  new THREE.MeshStandardMaterial({ color: 0x6f9b54, roughness: 0.95 })
);
soil.rotation.x = -Math.PI / 2;
soil.receiveShadow = true;
scene.add(soil);

const meadow = new THREE.Group();
scene.add(meadow);

const raycaster = new THREE.Raycaster();
const keys = new Set();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const plants = [];
const interactables = [];
let selectedTool = "inspect";
let sampledDNA = null;
let dayTime = 0.2;
let simDay = 1;

const ui = {
  clock: document.querySelector("#clock"),
  toolName: document.querySelector("#toolName"),
  plantCount: document.querySelector("#plantCount"),
  diversity: document.querySelector("#diversity"),
  biomass: document.querySelector("#biomass"),
  focusName: document.querySelector("#focusName"),
  focusText: document.querySelector("#focusText"),
  geneList: document.querySelector("#geneList"),
};

const toolLabels = {
  inspect: "Sonde ADN",
  water: "Arrosoir",
  seed: "Graine hybride",
  prune: "Secateur",
  sample: "Echantillon",
};

const geneNames = [
  ["stemHeight", "hauteur"],
  ["stemWidth", "epaisseur"],
  ["branching", "branches"],
  ["flowerSize", "corolle"],
  ["petalCount", "petales"],
  ["petalHue", "teinte"],
  ["growthRate", "vigueur"],
  ["lifespan", "longevite"],
  ["seedRadius", "dispersion"],
  ["woodiness", "bois"],
];

function rand(min = 0, max = 1) {
  return min + Math.random() * (max - min);
}

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function randomDNA(kind = Math.random() > 0.64 ? "tree" : "flower") {
  const woodiness = kind === "tree" ? rand(0.62, 1) : rand(0.02, 0.42);
  return {
    stemHeight: kind === "tree" ? rand(0.62, 1) : rand(0.08, 0.35),
    stemWidth: kind === "tree" ? rand(0.44, 0.9) : rand(0.05, 0.28),
    branching: kind === "tree" ? rand(0.35, 0.95) : rand(0.02, 0.25),
    flowerSize: kind === "tree" ? rand(0.05, 0.18) : rand(0.36, 1),
    petalCount: rand(0.08, 1),
    petalHue: rand(),
    leafHue: rand(0.18, 0.42),
    growthRate: rand(0.35, 1),
    lifespan: rand(0.38, 1),
    seedRadius: rand(0.2, 1),
    woodiness,
    twist: rand(),
    asymmetry: rand(),
  };
}

function mutateDNA(dna, localRate = MUTATION_RATE) {
  const next = { ...dna };
  for (const key of Object.keys(next)) {
    if (Math.random() < localRate) next[key] = clamp(next[key] + rand(-0.16, 0.16));
  }
  return next;
}

function combineDNA(a, b) {
  const child = {};
  for (const key of Object.keys(a)) {
    const mix = Math.random() < 0.5 ? a[key] : b[key] ?? a[key];
    child[key] = clamp(mix + rand(-0.035, 0.035));
  }
  return mutateDNA(child, MUTATION_RATE);
}

function colorFromHue(hue, saturation = 0.72, lightness = 0.56) {
  return new THREE.Color().setHSL(hue, saturation, lightness);
}

function makePlant(position, dna = randomDNA(), age = 0) {
  const plant = {
    id: crypto.randomUUID().slice(0, 8),
    dna,
    age,
    health: 1,
    waterBoost: 0,
    mature: false,
    dead: false,
    reproductionClock: rand(5, 18),
    mesh: new THREE.Group(),
    branchSegments: [],
    bodyMeshes: [],
    flowerMeshes: [],
    seedCooldown: 0,
  };
  plant.mesh.position.copy(position);
  plant.mesh.userData.plant = plant;
  meadow.add(plant.mesh);
  plants.push(plant);
  rebuildPlant(plant);
  return plant;
}

function branchLength(dna, depth) {
  return (0.75 + dna.stemHeight * 4.8) * Math.pow(0.68, depth) * (0.78 + dna.growthRate * 0.35);
}

function branchRadius(dna, depth) {
  return (0.035 + dna.stemWidth * 0.22) * Math.pow(0.65, depth);
}

function makeBranchGeometry(start, end, radius, dna, plant, depth) {
  const midpoint = start.clone().add(end).multiplyScalar(0.5);
  const length = start.distanceTo(end);
  const geom = new THREE.CylinderGeometry(radius * 0.72, radius, length, 7, 1);
  const mat = new THREE.MeshStandardMaterial({
    color: colorFromHue(0.07 + dna.woodiness * 0.025, 0.48, 0.25 + depth * 0.045),
    roughness: 0.88,
  });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.copy(midpoint);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(start).normalize());
  mesh.castShadow = true;
  mesh.userData.plant = plant;
  mesh.userData.segmentDNA = dna;
  plant.bodyMeshes.push(mesh);
  plant.branchSegments.push({ start, end, dna, depth });
  plant.mesh.add(mesh);
  interactables.push(mesh);
}

function makeLeafCluster(position, dna, plant, scale = 1) {
  const leafCount = 3 + Math.floor(dna.branching * 8);
  for (let i = 0; i < leafCount; i++) {
    const geom = new THREE.SphereGeometry((0.12 + dna.flowerSize * 0.12) * scale, 7, 5);
    const mat = new THREE.MeshStandardMaterial({
      color: colorFromHue(dna.leafHue + rand(-0.025, 0.025), 0.56, 0.35 + rand(0, 0.12)),
      roughness: 0.82,
    });
    const leaf = new THREE.Mesh(geom, mat);
    leaf.scale.set(rand(0.55, 1.3), rand(0.18, 0.45), rand(0.34, 0.82));
    leaf.position.copy(position).add(new THREE.Vector3(rand(-0.28, 0.28), rand(-0.08, 0.18), rand(-0.28, 0.28)).multiplyScalar(scale));
    leaf.rotation.set(rand(-0.6, 0.6), rand(0, Math.PI), rand(-0.5, 0.5));
    leaf.castShadow = true;
    leaf.userData.plant = plant;
    plant.flowerMeshes.push(leaf);
    plant.mesh.add(leaf);
    interactables.push(leaf);
  }
}

function makeFlower(position, dna, plant, scale = 1) {
  const petals = 4 + Math.floor(dna.petalCount * 12);
  const petalColor = colorFromHue(dna.petalHue, 0.72, 0.58);
  const center = new THREE.Mesh(
    new THREE.SphereGeometry(0.08 * scale, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xf0c75e, roughness: 0.75 })
  );
  center.position.copy(position);
  center.userData.plant = plant;
  plant.mesh.add(center);
  interactables.push(center);
  plant.flowerMeshes.push(center);

  for (let i = 0; i < petals; i++) {
    const geom = new THREE.SphereGeometry((0.07 + dna.flowerSize * 0.1) * scale, 10, 6);
    const mat = new THREE.MeshStandardMaterial({ color: petalColor.clone().offsetHSL(rand(-0.025, 0.025), 0, rand(-0.06, 0.06)), roughness: 0.7 });
    const petal = new THREE.Mesh(geom, mat);
    const angle = (i / petals) * Math.PI * 2 + dna.twist * 0.6;
    petal.position.copy(position).add(new THREE.Vector3(Math.cos(angle), rand(-0.08, 0.08), Math.sin(angle)).multiplyScalar((0.14 + dna.flowerSize * 0.22) * scale));
    petal.scale.set(1.15 + dna.asymmetry * 0.35, 0.24, 0.58 + dna.flowerSize * 0.62);
    petal.lookAt(position);
    petal.castShadow = true;
    petal.userData.plant = plant;
    plant.flowerMeshes.push(petal);
    plant.mesh.add(petal);
    interactables.push(petal);
  }
}

function growBranch(plant, dna, start, dir, depth, scale) {
  const len = branchLength(dna, depth) * scale;
  const bend = new THREE.Vector3(rand(-0.18, 0.18), 0, rand(-0.18, 0.18)).multiplyScalar(dna.asymmetry + 0.25);
  const end = start.clone().add(dir.clone().add(bend).normalize().multiplyScalar(len));
  makeBranchGeometry(start, end, branchRadius(dna, depth) * scale, dna, plant, depth);

  const shouldFork = depth < 3 && dna.branching * scale > 0.22 && Math.random() < dna.branching * (depth === 0 ? 1 : 0.82);
  if (shouldFork) {
    const forks = 2 + Math.floor(dna.branching * 2.2);
    for (let i = 0; i < forks; i++) {
      const childDNA = mutateDNA(dna, 0.12);
      const angle = (i / forks) * Math.PI * 2 + dna.twist * Math.PI + rand(-0.4, 0.4);
      const lean = 0.42 + childDNA.branching * 0.38;
      const childDir = new THREE.Vector3(Math.cos(angle) * lean, 0.78, Math.sin(angle) * lean).normalize();
      growBranch(plant, childDNA, end, childDir, depth + 1, scale * rand(0.68, 0.86));
    }
  } else {
    makeLeafCluster(end, dna, plant, scale);
    if (plant.age > 0.45 && Math.random() < 0.55) makeFlower(end.clone().add(new THREE.Vector3(0, 0.08, 0)), plant.dna, plant, scale * 0.85);
  }
}

function rebuildPlant(plant) {
  for (const child of [...plant.mesh.children]) plant.mesh.remove(child);
  for (const mesh of [...plant.bodyMeshes, ...plant.flowerMeshes]) {
    const idx = interactables.indexOf(mesh);
    if (idx >= 0) interactables.splice(idx, 1);
    mesh.geometry?.dispose();
    mesh.material?.dispose();
  }
  plant.bodyMeshes = [];
  plant.flowerMeshes = [];
  plant.branchSegments = [];

  const dna = plant.dna;
  const scale = Math.max(0.05, plant.age);
  if (dna.woodiness > 0.52) {
    growBranch(plant, mutateDNA(dna, 0.04), new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0), 0, scale);
  } else {
    const stemHeight = (0.35 + dna.stemHeight * 2.4) * scale;
    makeBranchGeometry(new THREE.Vector3(0, 0, 0), new THREE.Vector3(rand(-0.12, 0.12), stemHeight, rand(-0.12, 0.12)), branchRadius(dna, 0) * scale * 0.72, dna, plant, 0);
    const crown = new THREE.Vector3(0, stemHeight, 0);
    makeLeafCluster(crown.clone().add(new THREE.Vector3(0, -0.08, 0)), dna, plant, scale * 0.7);
    if (plant.age > 0.28) makeFlower(crown, dna, plant, scale);
  }
}

function removePlant(plant) {
  plant.dead = true;
  meadow.remove(plant.mesh);
  for (const mesh of [...plant.bodyMeshes, ...plant.flowerMeshes]) {
    const idx = interactables.indexOf(mesh);
    if (idx >= 0) interactables.splice(idx, 1);
    mesh.geometry?.dispose();
    mesh.material?.dispose();
  }
  const idx = plants.indexOf(plant);
  if (idx >= 0) plants.splice(idx, 1);
}

function getNearestMate(plant) {
  let best = null;
  let bestDistance = Infinity;
  const radius = 5 + plant.dna.seedRadius * 14;
  for (const other of plants) {
    if (other === plant || other.age < 0.55) continue;
    const dist = plant.mesh.position.distanceTo(other.mesh.position);
    if (dist < radius && dist < bestDistance) {
      best = other;
      bestDistance = dist;
    }
  }
  return best;
}

function reproduce(plant) {
  if (plants.length >= MAX_PLANTS || plant.age < 0.58) return;
  const mate = getNearestMate(plant);
  const dna = mate ? combineDNA(plant.dna, mate.dna) : mutateDNA(plant.dna, 0.18);
  const radius = 1.5 + plant.dna.seedRadius * 8;
  const angle = rand(0, Math.PI * 2);
  const pos = plant.mesh.position.clone().add(new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)).multiplyScalar(rand(1.2, radius)));
  pos.x = clamp(pos.x, -HALF + 2, HALF - 2);
  pos.z = clamp(pos.z, -HALF + 2, HALF - 2);
  makePlant(pos, dna, rand(0.02, 0.08));
}

function updatePlant(plant, dt) {
  const vigor = plant.dna.growthRate + plant.waterBoost * 0.7;
  const oldStage = Math.floor(plant.age * 12);
  plant.age += dt * SIM_SPEED * (0.025 + vigor * 0.06);
  plant.waterBoost = Math.max(0, plant.waterBoost - dt * 0.035);
  plant.health -= dt * SIM_SPEED * Math.max(0, plant.age - plant.dna.lifespan * 1.75) * 0.04;
  plant.reproductionClock -= dt * (0.3 + plant.dna.growthRate);
  plant.seedCooldown = Math.max(0, plant.seedCooldown - dt);

  if (Math.floor(plant.age * 12) !== oldStage && plant.age < 1.05) rebuildPlant(plant);
  if (plant.reproductionClock <= 0) {
    plant.reproductionClock = rand(14, 34) / Math.max(0.35, plant.dna.growthRate);
    reproduce(plant);
  }
  if (plant.health <= 0 || plant.age > 2.15 + plant.dna.lifespan * 2.4) removePlant(plant);
}

function inspectPlant(plant) {
  ui.focusName.textContent = `${plant.dna.woodiness > 0.52 ? "Arbre" : "Fleur"} #${plant.id}`;
  const segmentCount = plant.branchSegments.length;
  ui.focusText.textContent = `Age ${(plant.age * 100).toFixed(0)}%, sante ${(plant.health * 100).toFixed(0)}%, ${segmentCount} troncon${segmentCount > 1 ? "s" : ""}. Chaque troncon d'arbre conserve sa propre copie mutee d'ADN.`;
  ui.geneList.innerHTML = "";
  for (const [key, label] of geneNames) {
    const value = plant.dna[key];
    const row = document.createElement("div");
    row.className = "gene";
    row.innerHTML = `<span>${label}</span><div class="bar"><span style="width:${Math.round(value * 100)}%"></span></div><strong>${Math.round(value * 100)}</strong>`;
    ui.geneList.append(row);
  }
}

function targetedPlant() {
  raycaster.setFromCamera({ x: 0, y: 0 }, camera);
  const hit = raycaster.intersectObjects(interactables, false)[0];
  return hit?.object?.userData?.plant ?? null;
}

function useTool() {
  const plant = targetedPlant();
  if (selectedTool === "seed") {
    const base = sampledDNA ?? plant?.dna ?? randomDNA();
    const mate = plant?.dna ?? randomDNA();
    const dna = combineDNA(base, mate);
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    const pos = camera.position.clone().add(forward.multiplyScalar(5));
    pos.y = 0;
    pos.x = clamp(pos.x, -HALF + 2, HALF - 2);
    pos.z = clamp(pos.z, -HALF + 2, HALF - 2);
    makePlant(pos, dna, 0.05);
    return;
  }
  if (!plant) return;
  if (selectedTool === "inspect") inspectPlant(plant);
  if (selectedTool === "water") {
    plant.waterBoost = clamp(plant.waterBoost + 0.45, 0, 1.6);
    inspectPlant(plant);
  }
  if (selectedTool === "sample") {
    sampledDNA = mutateDNA(plant.dna, 0.015);
    inspectPlant(plant);
    ui.focusText.textContent += " ADN memorise pour les prochains semis.";
  }
  if (selectedTool === "prune") removePlant(plant);
}

function updateHud() {
  const biomass = plants.reduce((sum, p) => sum + p.age * (0.5 + p.dna.woodiness), 0);
  const hues = new Set(plants.map((p) => Math.round(p.dna.petalHue * 10)));
  ui.plantCount.textContent = plants.length.toString();
  ui.diversity.textContent = `${Math.round((hues.size / 11) * 100)}%`;
  ui.biomass.textContent = biomass.toFixed(1);
  const phase = dayTime < 0.25 ? "Aube" : dayTime < 0.55 ? "Jour" : dayTime < 0.75 ? "Soir" : "Nuit";
  ui.clock.textContent = `Jour ${simDay} · ${phase}`;
}

function updateMovement(dt) {
  velocity.x -= velocity.x * 9 * dt;
  velocity.z -= velocity.z * 9 * dt;
  direction.z = Number(keys.has("KeyW")) - Number(keys.has("KeyS"));
  direction.x = Number(keys.has("KeyD")) - Number(keys.has("KeyA"));
  direction.normalize();
  const speed = keys.has("ShiftLeft") || keys.has("ShiftRight") ? 58 : 28;
  if (keys.has("KeyW") || keys.has("KeyS")) velocity.z -= direction.z * speed * dt;
  if (keys.has("KeyA") || keys.has("KeyD")) velocity.x -= direction.x * speed * dt;
  controls.moveRight(-velocity.x * dt);
  controls.moveForward(-velocity.z * dt);
  camera.position.x = clamp(camera.position.x, -HALF + 1, HALF - 1);
  camera.position.z = clamp(camera.position.z, -HALF + 1, HALF - 1);
  camera.position.y = 1.75;
}

function createGrass() {
  const bladeGeom = new THREE.ConeGeometry(0.035, 0.5, 4);
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0x7fb75b, roughness: 0.9 });
  const grass = new THREE.InstancedMesh(bladeGeom, bladeMat, 1800);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < grass.count; i++) {
    dummy.position.set(rand(-HALF, HALF), 0.25, rand(-HALF, HALF));
    dummy.rotation.set(rand(-0.16, 0.16), rand(0, Math.PI * 2), rand(-0.16, 0.16));
    const s = rand(0.35, 1.15);
    dummy.scale.set(s, s * rand(0.7, 1.5), s);
    dummy.updateMatrix();
    grass.setMatrixAt(i, dummy.matrix);
  }
  grass.receiveShadow = true;
  scene.add(grass);
}

function seedInitialGarden() {
  createGrass();
  for (let i = 0; i < 34; i++) {
    makePlant(new THREE.Vector3(rand(-HALF + 4, HALF - 4), 0, rand(-HALF + 4, HALF - 4)), randomDNA(i % 4 === 0 ? "tree" : "flower"), rand(0.15, 0.95));
  }
}

document.querySelectorAll(".tool").forEach((button) => {
  button.addEventListener("click", () => {
    selectedTool = button.dataset.tool;
    document.querySelectorAll(".tool").forEach((item) => item.classList.toggle("active", item === button));
    ui.toolName.textContent = toolLabels[selectedTool];
  });
});

window.addEventListener("keydown", (event) => {
  keys.add(event.code);
  const index = Number(event.key) - 1;
  const tools = ["inspect", "water", "seed", "prune", "sample"];
  if (tools[index]) document.querySelector(`[data-tool="${tools[index]}"]`).click();
});
window.addEventListener("keyup", (event) => keys.delete(event.code));
window.addEventListener("mousedown", (event) => {
  if (event.button === 0 && controls.isLocked) useTool();
});
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

seedInitialGarden();
inspectPlant(plants[0]);

const clock = new THREE.Clock();
function animate() {
  const dt = Math.min(clock.getDelta(), 0.05);
  dayTime += dt * 0.012;
  if (dayTime >= 1) {
    dayTime -= 1;
    simDay += 1;
  }
  const sunAngle = dayTime * Math.PI * 2;
  sun.position.set(Math.cos(sunAngle) * 46, Math.sin(sunAngle) * 48 + 18, 28);
  sun.intensity = 0.55 + Math.max(0, Math.sin(sunAngle)) * 2.1;
  hemi.intensity = 0.9 + Math.max(0, Math.sin(sunAngle)) * 0.8;

  updateMovement(dt);
  for (const plant of [...plants]) updatePlant(plant, dt);
  updateHud();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();
