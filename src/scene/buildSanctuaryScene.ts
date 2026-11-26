import * as THREE from 'three';
import type { RoomMonitor } from '../types/sentinel';

export interface RoomVisualRig {
  roomId: string;
  center: THREE.Vector3;
  turbineGroup: THREE.Group;
  statusRingMat: THREE.MeshStandardMaterial;
  filterCoreMat: THREE.MeshStandardMaterial;
  zoneBorderMat: THREE.MeshStandardMaterial;
  shieldGroup: THREE.Group;
  shieldGlassMat: THREE.MeshStandardMaterial;
  shieldRimMat: THREE.MeshStandardMaterial;
  currentShieldY: number;
  turbineAngle: number;
}

export interface SanctuarySceneHandle {
  rootGroup: THREE.Group;
  roomRigs: Map<string, RoomVisualRig>;
  outdoorSmogMesh: THREE.InstancedMesh;
  outdoorSmogMat: THREE.MeshStandardMaterial;
  indoorAirMesh: THREE.InstancedMesh;
  indoorAirMat: THREE.MeshStandardMaterial;
  smogSeeds: Float32Array; // [angle, radius, baseY, speed, scale] * count
  cleanSeeds: Float32Array; // [roomIndex, phase, angleOffset, radius, scale] * count
  smogCount: number;
  cleanCount: number;
  ambientRimLight: THREE.PointLight;
  dispose: () => void;
}

export const ROOM_LAYOUT_CENTERS: Record<string, [number, number]> = {
  'living-room': [-2.35, 1.85],
  'kids-room': [2.35, 1.85],
  'elderly-suite': [-2.35, -1.85],
  'master-bedroom': [2.35, -1.85],
};

function createSlateFloorTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#111a2c';
    ctx.fillRect(0, 0, 512, 512);

    // Subtle matte mineral grain
    for (let i = 0; i < 4000; i++) {
      const x = (i * 73) % 512;
      const y = (i * 197 + Math.floor(i / 7) * 13) % 512;
      const alpha = (i % 5) * 0.008;
      ctx.fillStyle = `rgba(148, 163, 184, ${alpha})`;
      ctx.fillRect(x, y, 2, 2);
    }

    // Architectural tile grid seams
    ctx.strokeStyle = 'rgba(42, 54, 79, 0.55)';
    ctx.lineWidth = 2;
    const step = 128;
    for (let pos = 0; pos <= 512; pos += step) {
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, 512);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(512, pos);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createPerforatedIntakeTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#1b263b';
    ctx.fillRect(0, 0, 256, 256);

    ctx.fillStyle = '#070c16';
    for (let y = 10; y < 250; y += 14) {
      const offset = ((y / 14) % 2) * 7;
      for (let x = 8; x < 250; x += 14) {
        ctx.beginPath();
        ctx.arc(x + offset, y, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 1);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 124);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
    grad.addColorStop(0.6, 'rgba(0, 0, 0, 0.28)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildHepaPurifierTower(
  intakeTex: THREE.CanvasTexture,
  geometriesToDispose: THREE.BufferGeometry[],
  materialsToDispose: THREE.Material[]
): {
  group: THREE.Group;
  turbineGroup: THREE.Group;
  statusRingMat: THREE.MeshStandardMaterial;
  filterCoreMat: THREE.MeshStandardMaterial;
} {
  const tower = new THREE.Group();

  // 1. Grounded dark titanium plinth base (pivot at y = 0)
  const baseGeo = new THREE.CylinderGeometry(0.46, 0.5, 0.12, 28);
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x101828,
    roughness: 0.72,
    metalness: 0.35,
  });
  const baseMesh = new THREE.Mesh(baseGeo, baseMat);
  baseMesh.position.y = 0.06;
  baseMesh.castShadow = true;
  baseMesh.receiveShadow = true;
  tower.add(baseMesh);

  // 2. Perforated 360-degree air intake drum
  const intakeGeo = new THREE.CylinderGeometry(0.43, 0.44, 0.68, 28);
  const intakeMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: intakeTex,
    roughness: 0.62,
    metalness: 0.45,
  });
  const intakeMesh = new THREE.Mesh(intakeGeo, intakeMat);
  intakeMesh.position.y = 0.46;
  intakeMesh.castShadow = true;
  intakeMesh.receiveShadow = true;
  tower.add(intakeMesh);

  // 3. Visible cylindrical HEPA H13 core collar (shows filter health tint)
  const filterCoreGeo = new THREE.CylinderGeometry(0.445, 0.445, 0.14, 28);
  const filterCoreMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x06b6d4,
    emissiveIntensity: 0.55,
    roughness: 0.35,
    metalness: 0.2,
  });
  const filterCore = new THREE.Mesh(filterCoreGeo, filterCoreMat);
  filterCore.position.y = 0.87;
  tower.add(filterCore);

  // 4. Brushed metallic mid-bezel trim ring (high metalness contrast)
  const bezelGeo = new THREE.TorusGeometry(0.44, 0.028, 12, 32);
  const bezelMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.2,
    metalness: 0.9,
  });
  const bezel = new THREE.Mesh(bezelGeo, bezelMat);
  bezel.rotation.x = Math.PI / 2;
  bezel.position.y = 0.96;
  tower.add(bezel);

  // 5. Lathe-profiled upper clean-air diffuser shroud
  const lathePoints = [
    new THREE.Vector2(0.44, 0.0),
    new THREE.Vector2(0.44, 0.34),
    new THREE.Vector2(0.39, 0.54),
    new THREE.Vector2(0.32, 0.62),
    new THREE.Vector2(0.28, 0.62),
    new THREE.Vector2(0.31, 0.44),
  ];
  const shroudGeo = new THREE.LatheGeometry(lathePoints, 28);
  const shroudMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.32,
    metalness: 0.52,
  });
  const shroud = new THREE.Mesh(shroudGeo, shroudMat);
  shroud.position.y = 0.96;
  shroud.castShadow = true;
  shroud.receiveShadow = true;
  tower.add(shroud);

  // 6. Emissive top LED air-quality halo ring
  const ringGeo = new THREE.TorusGeometry(0.33, 0.022, 12, 32);
  const statusRingMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x06b6d4,
    emissiveIntensity: 1.4,
    roughness: 0.2,
    metalness: 0.1,
  });
  const statusRing = new THREE.Mesh(ringGeo, statusRingMat);
  statusRing.rotation.x = Math.PI / 2;
  statusRing.position.y = 1.58;
  tower.add(statusRing);

  // 7. Spinning axial turbine rotor inside exhaust duct
  const turbineGroup = new THREE.Group();
  turbineGroup.position.y = 1.44;
  const hubGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.06, 16);
  const hubMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.25,
    metalness: 0.85,
  });
  turbineGroup.add(new THREE.Mesh(hubGeo, hubMat));

  const bladeGeo = new THREE.BoxGeometry(0.24, 0.015, 0.065);
  const bladeMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.3,
    metalness: 0.65,
  });
  for (let i = 0; i < 6; i++) {
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    const angle = (i / 6) * Math.PI * 2;
    blade.position.set(Math.cos(angle) * 0.15, 0, Math.sin(angle) * 0.15);
    blade.rotation.y = -angle;
    blade.rotation.x = 0.35;
    turbineGroup.add(blade);
  }
  tower.add(turbineGroup);

  geometriesToDispose.push(
    baseGeo,
    intakeGeo,
    filterCoreGeo,
    bezelGeo,
    shroudGeo,
    ringGeo,
    hubGeo,
    bladeGeo
  );
  materialsToDispose.push(
    baseMat,
    intakeMat,
    filterCoreMat,
    bezelMat,
    shroudMat,
    statusRingMat,
    hubMat,
    bladeMat
  );

  return { group: tower, turbineGroup, statusRingMat, filterCoreMat };
}

export function buildSanctuaryScene(
  scene: THREE.Scene,
  rooms: RoomMonitor[],
  maxAnisotropy: number
): SanctuarySceneHandle {
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  const rootGroup = new THREE.Group();
  scene.add(rootGroup);

  const floorTex = createSlateFloorTexture(maxAnisotropy);
  const intakeTex = createPerforatedIntakeTexture(maxAnisotropy);
  const contactShadowTex = createContactShadowTexture();
  textures.push(floorTex, intakeTex, contactShadowTex);

  // Soft radial contact shadow plane beneath residence plinth
  const shadowPlaneGeo = new THREE.PlaneGeometry(15, 13);
  const shadowPlaneMat = new THREE.MeshBasicMaterial({
    map: contactShadowTex,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = -0.34;
  rootGroup.add(shadowPlane);
  geometries.push(shadowPlaneGeo);
  materials.push(shadowPlaneMat);

  // Beveled architectural sub-slab foundation
  const slabShape = new THREE.Shape();
  const hw = 5.1;
  const hd = 4.1;
  const r = 0.38;
  slabShape.moveTo(-hw + r, -hd);
  slabShape.lineTo(hw - r, -hd);
  slabShape.quadraticCurveTo(hw, -hd, hw, -hd + r);
  slabShape.lineTo(hw, hd - r);
  slabShape.quadraticCurveTo(hw, hd, hw - r, hd);
  slabShape.lineTo(-hw + r, hd);
  slabShape.quadraticCurveTo(-hw, hd, -hw, hd - r);
  slabShape.lineTo(-hw, -hd + r);
  slabShape.quadraticCurveTo(-hw, -hd, -hw + r, -hd);

  const slabGeo = new THREE.ExtrudeGeometry(slabShape, {
    depth: 0.28,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.04,
    bevelSegments: 3,
  });
  slabGeo.rotateX(Math.PI / 2);
  const slabMat = new THREE.MeshStandardMaterial({
    color: 0x0b1222,
    roughness: 0.78,
    metalness: 0.28,
  });
  const slabMesh = new THREE.Mesh(slabGeo, slabMat);
  slabMesh.position.y = -0.02;
  slabMesh.receiveShadow = true;
  rootGroup.add(slabMesh);
  geometries.push(slabGeo);
  materials.push(slabMat);

  // Main interior floor deck (offset +0.02 on Y to prevent Z-fighting)
  const deckGeo = new THREE.BoxGeometry(9.7, 0.04, 7.7);
  const deckMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: floorTex,
    roughness: 0.72,
    metalness: 0.16,
  });
  const deckMesh = new THREE.Mesh(deckGeo, deckMat);
  deckMesh.position.y = 0.02;
  deckMesh.receiveShadow = true;
  rootGroup.add(deckMesh);
  geometries.push(deckGeo);
  materials.push(deckMat);

  // Interior architectural cross-partition walls (matte slate + metallic cap trim)
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x182338,
    roughness: 0.82,
    metalness: 0.15,
  });
  const mullionMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.26,
    metalness: 0.84,
  });
  materials.push(wallMat, mullionMat);

  const centerWallXGeo = new THREE.BoxGeometry(9.4, 1.15, 0.12);
  const centerWallX = new THREE.Mesh(centerWallXGeo, wallMat);
  centerWallX.position.set(0, 0.615, 0);
  centerWallX.castShadow = true;
  centerWallX.receiveShadow = true;
  rootGroup.add(centerWallX);

  const centerWallZGeo = new THREE.BoxGeometry(0.12, 1.15, 7.4);
  const centerWallZ = new THREE.Mesh(centerWallZGeo, wallMat);
  centerWallZ.position.set(0, 0.615, 0);
  centerWallZ.castShadow = true;
  centerWallZ.receiveShadow = true;
  rootGroup.add(centerWallZ);

  // Metallic architectural top cap rails
  const capXGeo = new THREE.BoxGeometry(9.44, 0.05, 0.16);
  const capX = new THREE.Mesh(capXGeo, mullionMat);
  capX.position.set(0, 1.21, 0);
  rootGroup.add(capX);

  const capZGeo = new THREE.BoxGeometry(0.16, 0.05, 7.44);
  const capZ = new THREE.Mesh(capZGeo, mullionMat);
  capZ.position.set(0, 1.21, 0);
  rootGroup.add(capZ);

  // Corner structural columns
  const columnGeo = new THREE.BoxGeometry(0.22, 1.85, 0.22);
  const cornerCoords: [number, number][] = [
    [-4.75, -3.75],
    [4.75, -3.75],
    [-4.75, 3.75],
    [4.75, 3.75],
    [0, -3.75],
    [0, 3.75],
    [-4.75, 0],
    [4.75, 0],
  ];
  for (const [cx, cz] of cornerCoords) {
    const col = new THREE.Mesh(columnGeo, mullionMat);
    col.position.set(cx, 0.96, cz);
    col.castShadow = true;
    rootGroup.add(col);
  }
  geometries.push(centerWallXGeo, centerWallZGeo, capXGeo, capZGeo, columnGeo);

  // Per-room HEPA purifier towers, glowing floor strips, & motorized perimeter glass shields
  const roomRigs = new Map<string, RoomVisualRig>();
  const zonePadGeo = new THREE.BoxGeometry(4.2, 0.025, 3.25);
  const sideShieldGeo = new THREE.BoxGeometry(4.35, 1.38, 0.06);
  const endShieldGeo = new THREE.BoxGeometry(0.06, 1.38, 3.35);
  const sideRimGeo = new THREE.BoxGeometry(4.38, 0.05, 0.09);
  const endRimGeo = new THREE.BoxGeometry(0.09, 0.05, 3.38);
  const furnitureMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.78,
    metalness: 0.14,
  });
  const cushionMat = new THREE.MeshStandardMaterial({
    color: 0x2a364f,
    roughness: 0.88,
    metalness: 0.05,
  });
  geometries.push(zonePadGeo, sideShieldGeo, endShieldGeo, sideRimGeo, endRimGeo);
  materials.push(furnitureMat, cushionMat);

  const sofaGeo = new THREE.BoxGeometry(1.45, 0.42, 0.62);
  const bedGeo = new THREE.BoxGeometry(1.35, 0.34, 1.65);
  const pillowGeo = new THREE.BoxGeometry(1.05, 0.14, 0.34);
  geometries.push(sofaGeo, bedGeo, pillowGeo);

  rooms.forEach((room) => {
    const [rx, rz] = ROOM_LAYOUT_CENTERS[room.id] ?? [0, 0];
    const center = new THREE.Vector3(rx, 0.05, rz);

    // Subtle glowing floor zone accent plate (offset +0.03 above floor deck)
    const zoneBorderMat = new THREE.MeshStandardMaterial({
      color: 0x132238,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.25,
      roughness: 0.65,
      metalness: 0.2,
    });
    materials.push(zoneBorderMat);
    const zonePad = new THREE.Mesh(zonePadGeo, zoneBorderMat);
    zonePad.position.set(rx, 0.052, rz);
    zonePad.receiveShadow = true;
    rootGroup.add(zonePad);

    // Minimal low-profile architectural room anchor prop (sofa or bed) for spatial identity
    const propGroup = new THREE.Group();
    const offsetX = rx < 0 ? -0.95 : 0.95;
    const offsetZ = rz < 0 ? -0.45 : 0.45;
    if (room.id === 'living-room') {
      const sofa = new THREE.Mesh(sofaGeo, furnitureMat);
      sofa.position.set(rx + offsetX, 0.27, rz + offsetZ);
      sofa.castShadow = true;
      sofa.receiveShadow = true;
      propGroup.add(sofa);
      const back = new THREE.Mesh(pillowGeo, cushionMat);
      back.position.set(rx + offsetX, 0.54, rz + offsetZ + 0.16);
      propGroup.add(back);
    } else {
      const bed = new THREE.Mesh(bedGeo, furnitureMat);
      bed.position.set(rx + offsetX, 0.23, rz + offsetZ * 0.5);
      bed.castShadow = true;
      bed.receiveShadow = true;
      propGroup.add(bed);
      const pillow = new THREE.Mesh(pillowGeo, cushionMat);
      pillow.position.set(rx + offsetX, 0.46, rz + offsetZ * 0.5 - 0.52);
      propGroup.add(pillow);
    }
    rootGroup.add(propGroup);

    // Composite 7-part HEPA purifier tower placed cleanly inside the room
    const purifier = buildHepaPurifierTower(intakeTex, geometries, materials);
    const purifierPosX = rx < 0 ? rx + 0.72 : rx - 0.72;
    const purifierPosZ = rz < 0 ? rz + 0.42 : rz - 0.42;
    purifier.group.position.set(purifierPosX, 0.065, purifierPosZ);
    rootGroup.add(purifier.group);

    // Exterior perimeter glass shields for this room's 2 exterior facades
    const shieldGroup = new THREE.Group();
    const shieldGlassMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.25,
      transparent: true,
      opacity: 0.26,
      roughness: 0.14,
      metalness: 0.35,
      depthWrite: false,
    });
    const shieldRimMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.9,
      roughness: 0.25,
      metalness: 0.6,
    });
    materials.push(shieldGlassMat, shieldRimMat);

    const outerZ = rz > 0 ? 3.74 : -3.74;
    const outerX = rx > 0 ? 4.74 : -4.74;

    const frontGlass = new THREE.Mesh(sideShieldGeo, shieldGlassMat);
    frontGlass.position.set(rx, 0.75, outerZ);
    frontGlass.renderOrder = 3;
    shieldGroup.add(frontGlass);

    const frontRim = new THREE.Mesh(sideRimGeo, shieldRimMat);
    frontRim.position.set(rx, 1.46, outerZ);
    shieldGroup.add(frontRim);

    const sideGlass = new THREE.Mesh(endShieldGeo, shieldGlassMat);
    sideGlass.position.set(outerX, 0.75, rz);
    sideGlass.renderOrder = 3;
    shieldGroup.add(sideGlass);

    const sideRim = new THREE.Mesh(endRimGeo, shieldRimMat);
    sideRim.position.set(outerX, 1.46, rz);
    shieldGroup.add(sideRim);

    const initialY = room.windowsSealed ? 0 : -0.92;
    shieldGroup.position.y = initialY;
    rootGroup.add(shieldGroup);

    roomRigs.set(room.id, {
      roomId: room.id,
      center: new THREE.Vector3(purifierPosX, 0.065, purifierPosZ),
      turbineGroup: purifier.turbineGroup,
      statusRingMat: purifier.statusRingMat,
      filterCoreMat: purifier.filterCoreMat,
      zoneBorderMat,
      shieldGroup,
      shieldGlassMat,
      shieldRimMat,
      currentShieldY: initialY,
      turbineAngle: 0,
    });
  });

  // Instanced Mesh 1: Exterior Outdoor Smog Plume (160 swirling particulates around home perimeter)
  const smogCount = 160;
  const smogGeo = new THREE.OctahedronGeometry(0.11, 0);
  const outdoorSmogMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0x991b1b,
    emissiveIntensity: 0.75,
    roughness: 0.6,
    metalness: 0.1,
    transparent: true,
    opacity: 0.72,
  });
  const outdoorSmogMesh = new THREE.InstancedMesh(smogGeo, outdoorSmogMat, smogCount);
  outdoorSmogMesh.frustumCulled = false;
  rootGroup.add(outdoorSmogMesh);
  geometries.push(smogGeo);
  materials.push(outdoorSmogMat);

  const smogSeeds = new Float32Array(smogCount * 5);
  for (let i = 0; i < smogCount; i++) {
    // Deterministic pseudo-random distribution outside the 5.1 x 4.1 house footprint
    const t = i / smogCount;
    const angle = t * Math.PI * 2 + (i % 7) * 0.41;
    const radius = 6.2 + ((i * 37) % 100) * 0.036;
    const baseY = 0.25 + ((i * 53) % 100) * 0.032;
    const speed = 0.16 + ((i * 19) % 100) * 0.0028;
    const scale = 0.55 + ((i * 29) % 100) * 0.009;
    smogSeeds[i * 5 + 0] = angle;
    smogSeeds[i * 5 + 1] = radius;
    smogSeeds[i * 5 + 2] = baseY;
    smogSeeds[i * 5 + 3] = speed;
    smogSeeds[i * 5 + 4] = scale;
  }

  // Instanced Mesh 2: Interior Laminar Clean-Air Spirals rising from each HEPA purifier
  const cleanCount = 112; // 28 particles per room
  const cleanGeo = new THREE.SphereGeometry(0.055, 8, 8);
  const indoorAirMat = new THREE.MeshStandardMaterial({
    color: 0x4cd7f6,
    emissive: 0x06b6d4,
    emissiveIntensity: 1.35,
    roughness: 0.2,
    metalness: 0.1,
    transparent: true,
    opacity: 0.85,
  });
  const indoorAirMesh = new THREE.InstancedMesh(cleanGeo, indoorAirMat, cleanCount);
  indoorAirMesh.frustumCulled = false;
  rootGroup.add(indoorAirMesh);
  geometries.push(cleanGeo);
  materials.push(indoorAirMat);

  const cleanSeeds = new Float32Array(cleanCount * 5);
  for (let i = 0; i < cleanCount; i++) {
    const roomIndex = i % Math.max(1, rooms.length);
    const phase = ((i * 31) % 100) / 100;
    const angleOffset = ((i * 73) % 360) * (Math.PI / 180);
    const radius = 0.16 + ((i * 17) % 100) * 0.0038;
    const scale = 0.65 + ((i * 43) % 100) * 0.007;
    cleanSeeds[i * 5 + 0] = roomIndex;
    cleanSeeds[i * 5 + 1] = phase;
    cleanSeeds[i * 5 + 2] = angleOffset;
    cleanSeeds[i * 5 + 3] = radius;
    cleanSeeds[i * 5 + 4] = scale;
  }

  // Dynamic atmospheric accent point light over exterior perimeter
  const ambientRimLight = new THREE.PointLight(0xef4444, 6, 22, 1.5);
  ambientRimLight.position.set(-6.5, 4.5, 5.5);
  rootGroup.add(ambientRimLight);

  const dispose = () => {
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
    scene.remove(rootGroup);
  };

  return {
    rootGroup,
    roomRigs,
    outdoorSmogMesh,
    outdoorSmogMat,
    indoorAirMesh,
    indoorAirMat,
    smogSeeds,
    cleanSeeds,
    smogCount,
    cleanCount,
    ambientRimLight,
    dispose,
  };
}
