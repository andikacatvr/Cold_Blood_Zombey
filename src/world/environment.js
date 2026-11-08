/* =========================================================================
   WORLD ENVIRONMENT & ARCHITECTURE
   Sanctuary Farmhouse, Cream Village Cottages, Barricaded Doors, Conifers, Snow
   ========================================================================= */

import { Sfx } from '../audio/sfx.js';
import { spawnWoodSplinters } from '../entities/effects.js';

const THREE = window.THREE;

export const MAP_LIMIT = 90;
export const TERRAIN_LIMIT = 165;

export let riverWaterMesh = null;
export let waterfallMesh = null;
export let waterfallVeilMesh = null;
export let waterfallSplashRing = null;
export let waterfallInnerSplash = null;
export let waterfallMistParticles = null;
export const waterfallMistVel = [];
export let topRiverMesh = null;
export let topRiverCrestFoam = null;

/**
 * Returns the X position of the winding lower river centerline at any given Z coordinate.
 */
export function getRiverCenterX(z) {
  return 42.0 + Math.sin(z * 0.048) * 9.0 + Math.cos(z * 0.022) * 5.0;
}

/**
 * Returns the exact elevation (Y position) of the lower mountain river water surface at any given Z.
 * Naturally descends 3.0 meters from waterfall plunge pool (z=-56.5) down to the southern border (z=110).
 */
export function getRiverWaterY(z) {
  const progress = Math.max(0, (z - (-58.0)) / 198.0);
  return 0.85 - progress * 3.4;
}

/**
 * Returns the X position of the upper mountain feeder river centerline (z <= -58.6).
 * Naturally feeds directly into the waterfall crest at x = 42.0, z = -58.6.
 */
export function getUpperRiverCenterX(z) {
  return 42.0 + Math.sin((z - (-58.6)) * 0.075) * 2.2;
}

/**
 * Returns the exact elevation (Y position) of the upper mountain stream water surface at any given Z.
 * At the waterfall lip (z = -58.6) waterY is 8.62m, gently rising up into northern peaks (z = -92.0).
 */
export function getUpperRiverWaterY(z) {
  const distBack = Math.max(0, -58.6 - z);
  return 8.62 + distBack * 0.048;
}

/**
 * Organic undulating forest terrain height generator (hills, ridges, gentle valleys).
 * Seamlessly integrates North-East Mountain Waterfall Cliff, Upper Mountain River Ravine, and Winding Alpine River Valley.
 * Smoothly flattens around buildings and spawn point to keep architecture level.
 */
export function getTerrainHeight(x, z) {
  // Multi-frequency natural forest ground rolling waves
  const h1 = Math.sin(x * 0.052) * Math.cos(z * 0.048) * 2.5;
  const h2 = Math.sin(x * 0.105 + 1.2) * Math.cos(z * 0.092 - 0.7) * 1.35;
  const h3 = Math.cos(x * 0.028 - z * 0.034) * 1.55;
  let raw = h1 + h2 + h3; // Base undulating waves

  // 1. Mountain Waterfall Cliff Ridge in the North-East (x around 42)
  if (z <= -55.0 && Math.abs(x - 42.0) < 36.0) {
    const cliffDist = Math.max(0, -55.0 - z);
    // Steep majestic mountain cliff reaching full height of ~8.8m by z = -58.0
    const cliffElev = Math.min(8.8, cliffDist * 2.95);
    raw += cliffElev;

    // 1b. Carve Upper Mountain Stream Ravine for z <= -58.0
    if (z <= -58.0) {
      const topX = getUpperRiverCenterX(z);
      const distToTopStream = Math.abs(x - topX);
      const topWaterY = getUpperRiverWaterY(z);

      const topChannelR = 5.6; // Submerged stream channel width (~11.2m)
      const topBankR = 8.8;    // Snowy stream bank rise
      const topValleyR = 17.0; // Outer alpine valley

      if (distToTopStream < topChannelR) {
        // Submerged mountain stream bed: dips 0.40m to 0.55m below upper water surface
        const u = distToTopStream / topChannelR;
        const bedDepth = (1.0 - u * u) * 0.48 + 0.12;
        raw = topWaterY - bedDepth;
      } else if (distToTopStream < topBankR) {
        // Elevated snowy stream banks bordering the upper torrent
        const tb = (distToTopStream - topChannelR) / (topBankR - topChannelR);
        const sb = tb * tb * (3 - 2 * tb);
        const bankTargetY = topWaterY + 0.16 + sb * 0.75;
        raw = THREE.MathUtils.lerp(bankTargetY, raw, 0.18);
      } else if (distToTopStream < topValleyR) {
        const tv = (distToTopStream - topBankR) / (topValleyR - topBankR);
        const sv = tv * tv * (3 - 2 * tv);
        const bankTopY = topWaterY + 0.91;
        raw = THREE.MathUtils.lerp(bankTopY, raw, sv);
      }
    }
  }

  // 2. Winding Alpine River Valley & Riverbed Channel (from waterfall plunge pool z=-58.0 to well past southern border z=140)
  if (z > -59.0 && z < 145.0) {
    const rX = getRiverCenterX(z);
    const distToRiver = Math.abs(x - rX);
    const waterY = getRiverWaterY(z);

    const channelR = 5.2; // Submerged riverbed boundary
    const bankR = 8.5;    // Dry snow shoreline ridge
    const valleyR = 16.0; // Outer forest valley blend corridor

    if (distToRiver < channelR) {
      // Submerged U-shaped riverbed:
      // Depth dips up to 1.15m below the water surface in the center
      const u = distToRiver / channelR;
      const bedDepth = (1.0 - u * u) * 1.15 + 0.06;
      raw = waterY - bedDepth;
    } else if (distToRiver < bankR) {
      // Gentle snowy riverbank rising safely above the water surface
      const tb = (distToRiver - channelR) / (bankR - channelR);
      const sb = tb * tb * (3 - 2 * tb); // Smoothstep
      const bankTargetY = waterY + 0.06 + sb * 0.55;
      raw = THREE.MathUtils.lerp(bankTargetY, raw, 0.12);
    } else if (distToRiver < valleyR) {
      // Smooth gradual slope from river valley up to natural forest knolls
      const tv = (distToRiver - bankR) / (valleyR - bankR);
      const sv = tv * tv * (3 - 2 * tv);
      const bankTopY = waterY + 0.61;
      raw = THREE.MathUtils.lerp(bankTopY, raw, sv);
    }
  }

  // Smooth flattening around buildings & player spawn clearing
  const flatZones = [
    { x: -13, z: -6, innerR: 12.0, outerR: 19.0 }, // Sanctuary Farmhouse & Porch
    { x: 18, z: 6, innerR: 7.2, outerR: 13.5 },    // Village Cabin
    { x: 22, z: -20, innerR: 7.2, outerR: 13.5 },  // Village Stone House
    { x: -22, z: 22, innerR: 7.2, outerR: 13.5 },  // Village Cabin 2
    { x: 16, z: 28, innerR: 6.8, outerR: 12.5 },   // Village Shack
    { x: 0, z: 14, innerR: 5.5, outerR: 9.5 }      // Player spawn clearing
  ];

  let blend = 1.0;
  for (let i = 0; i < flatZones.length; i++) {
    const zf = flatZones[i];
    const d = Math.hypot(x - zf.x, z - zf.z);
    if (d < zf.outerR) {
      if (d <= zf.innerR) {
        blend = 0.0;
        break;
      } else {
        const factor = (d - zf.innerR) / (zf.outerR - zf.innerR);
        const smoothFactor = factor * factor * (3 - 2 * factor); // Cubic smoothstep
        blend = Math.min(blend, smoothFactor);
      }
    }
  }

  return raw * blend;
}

export const colliders = [];
export const lockedDoors = [];

export const housePickups = [
  {
    id: 'ammo',
    pos: new THREE.Vector3(-11.2, 1.1, -7.0),
    mesh: null,
    available: true
  },
  {
    id: 'vital',
    pos: new THREE.Vector3(-13.6, 2.7, -12.0),
    mesh: null,
    available: true
  }
];

export const SNOW_COUNT = 400;
export const snowGeo = new THREE.BufferGeometry();
export const snowPos = new Float32Array(SNOW_COUNT * 3);
export const snowVel = [];

export const busHazardLights = [];
export let schoolTourBus = null;
export const busWheelMeshes = [];
export const busHeadlights = [];
export let busCollider = null;
let snowSystem = null;

export function showPickupAlert(text, isHeal = false) {
  if (typeof Sfx !== 'undefined' && Sfx.playSmallBell) {
    Sfx.playSmallBell(isHeal ? 2637 : 2093, 0.65);
  }
  const el = document.getElementById('pickup-banner');
  if (el) {
    el.innerText = text;
    el.style.borderColor = isHeal ? '#4aa3df' : '#5aa572';
    el.style.color = isHeal ? '#82cbff' : '#92e0ab';
    el.style.display = 'block';
    setTimeout(() => { if (el) el.style.display = 'none'; }, 2400);
  }
}

export function checkHousePickups(cameraPos, state, updateHUD) {
  if (!state.running || state.isPaused) return;

  for (let i = 0; i < housePickups.length; i++) {
    const item = housePickups[i];
    if (!item.available || !item.mesh) continue;

    if (cameraPos.distanceTo(item.pos) < 2.0) {
      item.available = false;
      item.mesh.visible = false;

      if (item.id === 'ammo') {
        const added = Math.min(18, 36 - state.player.reserve);
        state.player.reserve += Math.max(12, added);
        Sfx.playPumpRack();
        showPickupAlert(`+12 SHELLS AMMO AMBILAN DARI RUMAH!`);
      } else if (item.id === 'vital') {
        state.player.hp = Math.min(100, state.player.hp + 40);
        if (state.player.lives < 3) {
          state.player.lives = Math.min(3, state.player.lives + 1);
          showPickupAlert(`BERKAH RELIK: +40% VITALITAS & +1 NYAWA PULIH!`, true);
        } else {
          showPickupAlert(`BERKAH RELIK: +40% VITALITAS PULIH!`, true);
        }
      }
      if (updateHUD) updateHUD();
    }
  }
}

export function respawnHousePickups() {
  housePickups.forEach(item => {
    item.available = true;
    if (item.mesh) item.mesh.visible = true;
  });
}

export function showLockedDoorPrompt(doorObj) {
  const el = document.getElementById('door-locked-prompt');
  if (el) {
    if (!doorObj.isBroken) {
      el.innerHTML = `<span style="color:#ffcc33; font-weight:bold;">${doorObj.name.toUpperCase()}</span><br><span style="color:#ff4455; font-size:18px;">PINTU DIBARIKADE — TEMBAK DENGAN SHOTGUN UNTUK MENJEBOL!</span>`;
    } else {
      el.innerHTML = `<span style="color:#92e0ab; font-weight:bold;">${doorObj.name.toUpperCase()}</span><br><span style="color:#c5d8e6; font-size:18px;">PINTU TELAH DIJEBOL SHOTGUN (TERBUKA)</span>`;
    }
    el.style.display = 'block';
    if (showLockedDoorPrompt.timer) clearTimeout(showLockedDoorPrompt.timer);
    showLockedDoorPrompt.timer = setTimeout(() => {
      if (el) el.style.display = 'none';
    }, 1500);
  }
}

export function blastOpenDoor(doorObj, state, updateHUD) {
  if (!doorObj || doorObj.isBroken) return;
  doorObj.isBroken = true;

  Sfx.playDoorBlast();
  spawnWoodSplinters(doorObj.worldPos);

  if (doorObj.planks) {
    doorObj.planks.forEach(p => p.visible = false);
  }

  if (doorObj.doorMesh) {
    doorObj.doorMesh.rotation.y = -Math.PI / 1.7;
    doorObj.doorMesh.position.z -= 0.65;
    doorObj.doorMesh.position.x += 0.45;
  }
  if (doorObj.doorMeshR) {
    doorObj.doorMeshR.rotation.y = Math.PI / 1.7;
    doorObj.doorMeshR.position.z -= 0.65;
    doorObj.doorMeshR.position.x -= 0.45;
  }

  if (doorObj.interiorLight) {
    doorObj.interiorLight.intensity = 2.4;
  }

  if (doorObj.frontColliderIndex >= 0 && colliders[doorObj.frontColliderIndex]) {
    colliders[doorObj.frontColliderIndex].minX = 9999;
    colliders[doorObj.frontColliderIndex].maxX = 9999;
    indexColliders();
  }

  if (state && state.player) {
    const bonus = Math.min(10, 36 - state.player.reserve);
    state.player.reserve += Math.max(6, bonus);
    if (updateHUD) updateHUD();
    showPickupAlert(`PINTU BERHASIL DIJEBOL SHOTGUN! +8 SHELLS DIAMBIL DARI DALAM RUMAH!`);
  }

  showLockedDoorPrompt(doorObj);
}

export function initWorld(scene, textures) {
  const {
    snowTex,
    houseWallTex,
    woodPlanksTex,
    brickHearthTex,
    creamCabinTex,
    creamBarnTex,
    creamStoneTex
  } = textures;

  // Undulating Natural Forest Ground Mesh (Expanded 330m Expanse - Infinite snowy horizon past boundary)
  const groundGeo = new THREE.PlaneGeometry(TERRAIN_LIMIT * 2, TERRAIN_LIMIT * 2, 130, 130);
  groundGeo.rotateX(-Math.PI / 2);
  const posAttr = groundGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vz = posAttr.getZ(i);
    posAttr.setY(i, getTerrainHeight(vx, vz));
  }
  groundGeo.computeVertexNormals();

  if (snowTex) {
    snowTex.repeat.set(96, 96);
  }
  const groundMat = new THREE.MeshLambertMaterial({ map: snowTex, flatShading: false });
  const groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);

  // Materials
  const houseWallMat = new THREE.MeshLambertMaterial({ map: houseWallTex, color: 0xeef3f7, flatShading: false });
  const roofSnowMat = new THREE.MeshLambertMaterial({ color: 0xdde7ee, flatShading: false });
  const chimneyMat = new THREE.MeshLambertMaterial({ color: 0x7a2d26, flatShading: false });
  const windowDarkMat = new THREE.MeshLambertMaterial({ color: 0x1f2b34, flatShading: false });
  const trimMat = new THREE.MeshLambertMaterial({ color: 0xb5c8d4, flatShading: false });
  const metalTurquoiseRoofMat = new THREE.MeshLambertMaterial({ color: 0x476b6d, flatShading: false });

  const interiorFloorMat = new THREE.MeshLambertMaterial({ map: woodPlanksTex, color: 0x5a4132, flatShading: false });
  const hearthBrickMat = new THREE.MeshLambertMaterial({ map: brickHearthTex, color: 0x63352f, flatShading: false });
  const darkWoodMat = new THREE.MeshLambertMaterial({ color: 0x2e1e17, flatShading: false });
  const tableMat = new THREE.MeshLambertMaterial({ color: 0x483327, flatShading: false });
  const amberGlowMat = new THREE.MeshBasicMaterial({ color: 0xffb74d });
  const fireEmbersMat = new THREE.MeshBasicMaterial({ color: 0xff3b00 });

  const creamCabinMat = new THREE.MeshLambertMaterial({ map: creamCabinTex, color: 0xf5eedc, flatShading: false });
  const creamBarnMat = new THREE.MeshLambertMaterial({ map: creamBarnTex, color: 0xf2e7d3, flatShading: false });
  const creamStoneMat = new THREE.MeshLambertMaterial({ map: creamStoneTex, color: 0xeee4d2, flatShading: false });
  const creamTrimMat = new THREE.MeshLambertMaterial({ color: 0x6e4732, flatShading: false });
  const boardedWoodMat = new THREE.MeshLambertMaterial({ color: 0x5a3e2b, flatShading: false });

  // 1. Build White Farmhouse
  function buildWhiteFarmhouse(x, z) {
    const house = new THREE.Group();
    house.position.set(x, 0, z);

    const mainW = 10, mainH = 8.5, mainD = 13;
    const halfW = mainW / 2;
    const halfD = mainD / 2;
    const porchW = 4.8, porchD = 7.0;

    // Solid Rustic Stone Foundations (extends 3.2m underground, eliminating any floating gap)
    const foundationMat = new THREE.MeshLambertMaterial({ color: 0x2d3238, flatShading: false });

    // Main house foundation block
    const mainFound = new THREE.Mesh(new THREE.BoxGeometry(mainW + 0.3, 3.2, mainD + 0.3), foundationMat);
    mainFound.position.set(0, -1.45, 0);
    house.add(mainFound);

    // Porch foundation block
    const porchFound = new THREE.Mesh(new THREE.BoxGeometry(porchW + 0.3, 3.2, porchD + 0.3), foundationMat);
    porchFound.position.set(-halfW - porchW / 2 + 0.2, -1.45, 1.5);
    house.add(porchFound);

    // Bay window foundation block
    const bayFound = new THREE.Mesh(new THREE.BoxGeometry(3.4, 3.2, 1.8), foundationMat);
    bayFound.position.set(-0.7, -1.45, halfD + 0.7);
    house.add(bayFound);

    // Natural snow accumulation embankment around house base (napak salju alami)
    const snowBermMat = new THREE.MeshLambertMaterial({ color: 0xd8e3eb, flatShading: true });

    // Front snow berm
    const bermFront = new THREE.Mesh(new THREE.BoxGeometry(mainW + 1.2, 0.42, 0.8), snowBermMat);
    bermFront.position.set(0, 0.08, halfD + 0.35);
    house.add(bermFront);

    // Back snow berm
    const bermBack = new THREE.Mesh(new THREE.BoxGeometry(mainW + 1.2, 0.42, 0.8), snowBermMat);
    bermBack.position.set(0, 0.08, -halfD - 0.35);
    house.add(bermBack);

    // Right snow berm
    const bermRight = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.42, mainD + 1.2), snowBermMat);
    bermRight.position.set(halfW + 0.35, 0.08, 0);
    house.add(bermRight);

    // Porch snow berm
    const bermPorch = new THREE.Mesh(new THREE.BoxGeometry(porchW + 0.9, 0.42, porchD + 0.9), snowBermMat);
    bermPorch.position.set(-halfW - porchW / 2 + 0.2, 0.08, 1.5);
    house.add(bermPorch);

    const mainFloor = new THREE.Mesh(new THREE.BoxGeometry(mainW - 0.1, 0.2, mainD - 0.1), interiorFloorMat);
    mainFloor.position.set(0, 0.1, 0);
    house.add(mainFloor);

    const porchFloor = new THREE.Mesh(new THREE.BoxGeometry(porchW - 0.1, 0.2, porchD - 0.1), interiorFloorMat);
    porchFloor.position.set(-halfW - porchW / 2 + 0.2, 0.1, 1.5);
    house.add(porchFloor);

    const ceilMesh = new THREE.Mesh(new THREE.BoxGeometry(mainW, 0.2, mainD), interiorFloorMat);
    ceilMesh.position.set(0, 4.0, 0);
    house.add(ceilMesh);

    [-4.0, -1.5, 1.5, 4.0].forEach(bz => {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(mainW, 0.24, 0.28), darkWoodMat);
      beam.position.set(0, 3.88, bz);
      house.add(beam);
    });

    const intLantern = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.45, 0.3), darkWoodMat);
    intLantern.position.set(0, 3.5, 0);
    house.add(intLantern);

    const intLanternGlow = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.28, 0.22), amberGlowMat);
    intLanternGlow.position.set(0, 3.48, 0);
    house.add(intLanternGlow);

    const intLight = new THREE.PointLight(0xffbe66, 1.8, 14);
    intLight.position.set(0, 3.4, 0);
    house.add(intLight);

    const backWall = new THREE.Mesh(new THREE.BoxGeometry(mainW, mainH, 0.4), houseWallMat);
    backWall.position.set(0, mainH / 2, -halfD);
    house.add(backWall);

    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, mainH, mainD), houseWallMat);
    rightWall.position.set(halfW, mainH / 2, 0);
    house.add(rightWall);

    const winRight = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.8, 1.4), windowDarkMat);
    winRight.position.set(halfW, 2.0, -1.5);
    house.add(winRight);

    const leftWallBack = new THREE.Mesh(new THREE.BoxGeometry(0.4, mainH, 4.5), houseWallMat);
    leftWallBack.position.set(-halfW, mainH / 2, -4.25);
    house.add(leftWallBack);

    const leftWallFront = new THREE.Mesh(new THREE.BoxGeometry(0.4, mainH, 4.5), houseWallMat);
    leftWallFront.position.set(-halfW, mainH / 2, 4.25);
    house.add(leftWallFront);

    const leftWallLintel = new THREE.Mesh(new THREE.BoxGeometry(0.4, mainH - 2.8, 4.0), houseWallMat);
    leftWallLintel.position.set(-halfW, 2.8 + (mainH - 2.8) / 2, 0);
    house.add(leftWallLintel);

    const frontLeft = new THREE.Mesh(new THREE.BoxGeometry(6.6, mainH, 0.4), houseWallMat);
    frontLeft.position.set(-5.0 + 6.6 / 2, mainH / 2, halfD);
    house.add(frontLeft);

    const frontRight = new THREE.Mesh(new THREE.BoxGeometry(1.6, mainH, 0.4), houseWallMat);
    frontRight.position.set(5.0 - 1.6 / 2, mainH / 2, halfD);
    house.add(frontRight);

    const doorLintel = new THREE.Mesh(new THREE.BoxGeometry(1.8, mainH - 2.7, 0.4), houseWallMat);
    doorLintel.position.set(2.5, 2.7 + (mainH - 2.7) / 2, halfD);
    house.add(doorLintel);

    const doorTrimL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.7, 0.48), trimMat);
    doorTrimL.position.set(1.65, 1.35, halfD);
    house.add(doorTrimL);

    const doorTrimR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.7, 0.48), trimMat);
    doorTrimR.position.set(3.35, 1.35, halfD);
    house.add(doorTrimR);

    const doorTrimTop = new THREE.Mesh(new THREE.BoxGeometry(1.84, 0.16, 0.48), trimMat);
    doorTrimTop.position.set(2.5, 2.7, halfD);
    house.add(doorTrimTop);

    const openDoor = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.5, 1.3), darkWoodMat);
    openDoor.position.set(1.85, 1.25, halfD - 0.65);
    openDoor.rotation.y = -Math.PI / 3;
    house.add(openDoor);

    for (let s = 0; s < 3; s++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.45), darkWoodMat);
      step.position.set(2.5, 0.15 - s * 0.06, halfD + 0.35 + s * 0.35);
      house.add(step);
    }

    const extLantern = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.36, 0.24), darkWoodMat);
    extLantern.position.set(2.5, 3.15, halfD + 0.35);
    house.add(extLantern);

    const extLanternGlow = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.16), amberGlowMat);
    extLanternGlow.position.set(2.5, 3.12, halfD + 0.35);
    house.add(extLanternGlow);

    const porchLight = new THREE.PointLight(0xffa73b, 2.2, 9);
    porchLight.position.set(2.5, 3.0, halfD + 0.45);
    house.add(porchLight);

    const bay = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.6, 1.6), houseWallMat);
    bay.position.set(-0.7, 1.4, halfD + 0.7);
    house.add(bay);

    const bayRoof = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.4, 1.8), metalTurquoiseRoofMat);
    bayRoof.position.set(-0.7, 2.8, halfD + 0.7);
    house.add(bayRoof);

    const bayRoofSnow = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.25, 1.6), roofSnowMat);
    bayRoofSnow.position.set(-0.7, 3.0, halfD + 0.7);
    house.add(bayRoofSnow);

    const bayPane1 = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.6, 0.1), windowDarkMat);
    bayPane1.position.set(-1.5, 1.4, halfD + 1.52);
    house.add(bayPane1);

    const bayPane2 = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.6, 0.1), windowDarkMat);
    bayPane2.position.set(0.1, 1.4, halfD + 1.52);
    house.add(bayPane2);

    const win2F_L = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.8, 0.1), windowDarkMat);
    win2F_L.position.set(-1.5, 5.8, halfD + 0.05);
    house.add(win2F_L);

    const win2F_R = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.8, 0.1), windowDarkMat);
    win2F_R.position.set(0.1, 5.8, halfD + 0.05);
    house.add(win2F_R);

    const roofGeo = new THREE.ConeGeometry(mainW * 0.74, 4.2, 4);
    const roofMesh = new THREE.Mesh(roofGeo, roofSnowMat);
    roofMesh.position.y = mainH + 2.0;
    roofMesh.rotation.y = Math.PI / 4;
    roofMesh.scale.set(1.0, 1.0, 1.45);
    house.add(roofMesh);

    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.9, 3.2, 0.9), chimneyMat);
    chimney.position.set(-1.2, mainH + 3.0, 1.5);
    house.add(chimney);

    const porchBody = new THREE.Mesh(new THREE.BoxGeometry(porchW, 3.4, porchD), houseWallMat);
    porchBody.position.set(-halfW - porchW / 2 + 0.2, 1.7, 1.5);
    house.add(porchBody);

    const porchRoof = new THREE.Mesh(new THREE.BoxGeometry(porchW + 0.6, 0.5, porchD + 0.4), roofSnowMat);
    porchRoof.position.set(-halfW - porchW / 2, 3.55, 1.5);
    porchRoof.rotation.z = -0.08;
    house.add(porchRoof);

    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.2, 0.3), trimMat);
    pillar.position.set(-halfW - porchW + 0.5, 1.6, 4.5);
    house.add(pillar);

    // Furniture
    const hearthMantle = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.6, 0.8), hearthBrickMat);
    hearthMantle.position.set(-1.5, 1.3, -halfD + 0.45);
    house.add(hearthMantle);

    const hearthCavity = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 0.6), windowDarkMat);
    hearthCavity.position.set(-1.5, 0.75, -halfD + 0.55);
    house.add(hearthCavity);

    const fireLogs = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.25, 0.35), darkWoodMat);
    fireLogs.position.set(-1.5, 0.2, -halfD + 0.6);
    house.add(fireLogs);

    const fireEmbers = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.12, 0.28), fireEmbersMat);
    fireEmbers.position.set(-1.5, 0.26, -halfD + 0.6);
    house.add(fireEmbers);

    const fireLight = new THREE.PointLight(0xff4d11, 2.8, 7);
    fireLight.position.set(-1.5, 0.8, -halfD + 1.0);
    house.add(fireLight);

    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.8, 0.04), trimMat);
    crossV.position.set(-1.5, 2.8, -halfD + 0.22);
    house.add(crossV);
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.08, 0.04), trimMat);
    crossH.position.set(-1.5, 2.95, -halfD + 0.22);
    house.add(crossH);

    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 1.3), tableMat);
    tableTop.position.set(1.8, 0.82, -1.0);
    house.add(tableTop);

    [[-0.95, -0.5], [0.95, -0.5], [-0.95, 0.5], [0.95, 0.5]].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.8, 0.12), darkWoodMat);
      leg.position.set(1.8 + lx, 0.41, -1.0 + lz);
      house.add(leg);
    });

    [-1.8, 1.8].forEach(cz => {
      const chair = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.08, 0.65), darkWoodMat);
      chair.position.set(1.8, 0.48, -1.0 + (cz > 0 ? 0.9 : -0.9));
      house.add(chair);
      const backRest = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.65, 0.08), darkWoodMat);
      backRest.position.set(1.8, 0.82, -1.0 + (cz > 0 ? 1.2 : -1.2));
      house.add(backRest);
    });

    // Pickups in house
    const ammoBoxGroup = new THREE.Group();
    ammoBoxGroup.position.set(1.8, 0.95, -1.0);
    const ammoBoxMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.28, 0.4),
      new THREE.MeshLambertMaterial({ color: 0x93242b, flatShading: true })
    );
    ammoBoxGroup.add(ammoBoxMesh);
    const ammoGlow = new THREE.PointLight(0xff3344, 1.2, 2.4);
    ammoGlow.position.set(0, 0.3, 0);
    ammoBoxGroup.add(ammoGlow);
    house.add(ammoBoxGroup);

    const vitalFlaskGroup = new THREE.Group();
    vitalFlaskGroup.position.set(-0.6, 2.7, -halfD + 0.6);
    const flaskMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.16, 0.42, 6),
      new THREE.MeshLambertMaterial({ color: 0x33b8ff, flatShading: true })
    );
    vitalFlaskGroup.add(flaskMesh);
    const flaskGlow = new THREE.PointLight(0x44c5ff, 1.4, 2.5);
    flaskGlow.position.set(0, 0.2, 0);
    vitalFlaskGroup.add(flaskGlow);
    house.add(vitalFlaskGroup);

    if (housePickups.length >= 2) {
      housePickups[0].mesh = ammoBoxGroup;
      housePickups[0].pos.set(x + 1.8, 0.95, z - 1.0);
      housePickups[1].mesh = vitalFlaskGroup;
      housePickups[1].pos.set(x - 0.6, 2.7, z - halfD + 0.6);
    }

    house.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    scene.add(house);

    // Colliders
    colliders.push({ minX: x - 5.3, maxX: x + 5.3, minZ: z - halfD - 0.35, maxZ: z - halfD + 0.35 });
    colliders.push({ minX: x + halfW - 0.35, maxX: x + halfW + 0.35, minZ: z - halfD, maxZ: z + halfD + 0.35 });
    colliders.push({ minX: x - halfW - 0.35, maxX: x - halfW + 0.35, minZ: z - halfD, maxZ: z - 2.0 });
    colliders.push({ minX: x - halfW - 0.35, maxX: x - halfW + 0.35, minZ: z + 2.0, maxZ: z + halfD + 0.35 });

    const pLeft = x - halfW - porchW + 0.2;
    const pBack = z + 1.5 - porchD / 2;
    const pFront = z + 1.5 + porchD / 2;
    colliders.push({ minX: pLeft - 0.35, maxX: pLeft + 0.35, minZ: pBack - 0.2, maxZ: pFront + 0.2 });
    colliders.push({ minX: pLeft, maxX: x - halfW + 0.2, minZ: pBack - 0.35, maxZ: pBack + 0.35 });
    colliders.push({ minX: pLeft, maxX: x - halfW + 0.2, minZ: pFront - 0.35, maxZ: pFront + 0.35 });

    colliders.push({ minX: x - 5.3, maxX: x + 1.6, minZ: z + halfD - 0.35, maxZ: z + halfD + 0.35 });
    colliders.push({ minX: x - 2.5, maxX: x + 1.1, minZ: z + halfD + 0.35, maxZ: z + halfD + 1.6 });
    colliders.push({ minX: x + 3.4, maxX: x + 5.3, minZ: z + halfD - 0.35, maxZ: z + halfD + 0.35 });
    colliders.push({ minX: x + 0.7, maxX: x + 2.9, minZ: z - 1.7, maxZ: z - 0.3 });
    colliders.push({ minX: x - 2.8, maxX: x - 0.2, minZ: z - halfD, maxZ: z - halfD + 0.9 });
  }

  // 2. Build Village Houses with Breachable Doors
  function buildLockedVillageHouse(type, x, z, rotY = 0) {
    const hGroup = new THREE.Group();
    hGroup.position.set(x, 0, z);
    hGroup.rotation.y = rotY;

    let w = 8.5, h = 6.0, d = 7.5;
    let doorName = 'Rumah Cream Pedesaan';
    let mainDoorMesh = null;
    let secondDoorMesh = null;
    const doorPlanks = [];

    const intLight = new THREE.PointLight(0xffa238, 0, 11);
    intLight.position.set(0, 2.2, 0);
    hGroup.add(intLight);

    const intBox = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.6), creamTrimMat);
    intBox.position.set(0.6, 0.25, 0);
    hGroup.add(intBox);

    if (type === 'cabin') {
      w = 8.5; h = 5.8; d = 7.5;
      doorName = 'Pondok Kayu Cream';

      const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), creamCabinMat);
      body.position.y = h / 2;
      hGroup.add(body);

      const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.76, 3.8, 4), roofSnowMat);
      roof.position.y = h + 1.8;
      roof.rotation.y = Math.PI / 4;
      roof.scale.set(1.0, 1.0, (d / w) * 1.5);
      hGroup.add(roof);

      [-w / 2, w / 2].forEach(px => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.35, h, 0.35), creamTrimMat);
        post.position.set(px, h / 2, d / 2);
        hGroup.add(post);
      });

      const chim = new THREE.Mesh(new THREE.BoxGeometry(0.85, 2.8, 0.85), chimneyMat);
      chim.position.set(w * 0.3, h + 1.6, -d * 0.2);
      hGroup.add(chim);

      const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.7, 0.2), creamTrimMat);
      doorFrame.position.set(0, 1.35, d / 2 + 0.05);
      hGroup.add(doorFrame);

      const door = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.4, 0.15), darkWoodMat);
      door.position.set(0, 1.2, d / 2 + 0.08);
      hGroup.add(door);
      mainDoorMesh = door;

      [-0.45, 0.45].forEach(ang => {
        const plank = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.6, 0.09), boardedWoodMat);
        plank.position.set(0, 1.2, d / 2 + 0.18);
        plank.rotation.z = ang;
        hGroup.add(plank);
        doorPlanks.push(plank);
      });

      [-2.4, 2.4].forEach(wx => {
        const winFrame = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.6, 0.12), creamTrimMat);
        winFrame.position.set(wx, 2.2, d / 2 + 0.04);
        hGroup.add(winFrame);
        const win = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, 0.1), windowDarkMat);
        win.position.set(wx, 2.2, d / 2 + 0.07);
        hGroup.add(win);
        const board = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.25, 0.08), boardedWoodMat);
        board.position.set(wx, 2.2, d / 2 + 0.13);
        hGroup.add(board);
      });

    } else if (type === 'barn') {
      w = 11.0; h = 7.5; d = 9.5;
      doorName = 'Gudang Kayu Cream';

      const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), creamBarnMat);
      body.position.y = h / 2;
      hGroup.add(body);

      const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.78, 4.4, 4), roofSnowMat);
      roof.position.y = h + 2.0;
      roof.rotation.y = Math.PI / 4;
      roof.scale.set(1.0, 1.0, (d / w) * 1.55);
      hGroup.add(roof);

      const trimBeam = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, 0.35, 0.35), creamTrimMat);
      trimBeam.position.set(0, 3.8, d / 2 + 0.05);
      hGroup.add(trimBeam);

      const gateL = new THREE.Mesh(new THREE.BoxGeometry(1.6, 3.4, 0.18), darkWoodMat);
      gateL.position.set(-0.85, 1.7, d / 2 + 0.1);
      hGroup.add(gateL);
      mainDoorMesh = gateL;

      const gateR = new THREE.Mesh(new THREE.BoxGeometry(1.6, 3.4, 0.18), darkWoodMat);
      gateR.position.set(0.85, 1.7, d / 2 + 0.1);
      hGroup.add(gateR);
      secondDoorMesh = gateR;

      const lockBar = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.28, 0.14), boardedWoodMat);
      lockBar.position.set(0, 1.8, d / 2 + 0.22);
      hGroup.add(lockBar);
      doorPlanks.push(lockBar);

      const loftWin = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 0.1), windowDarkMat);
      loftWin.position.set(0, 5.2, d / 2 + 0.06);
      hGroup.add(loftWin);

    } else if (type === 'stone') {
      w = 8.0; h = 6.2; d = 7.0;
      doorName = 'Rumah Batu Kapur Cream';

      const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), creamStoneMat);
      body.position.y = h / 2;
      hGroup.add(body);

      const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.74, 3.6, 4), roofSnowMat);
      roof.position.y = h + 1.7;
      roof.rotation.y = Math.PI / 4;
      roof.scale.set(1.0, 1.0, (d / w) * 1.45);
      hGroup.add(roof);

      const chim = new THREE.Mesh(new THREE.BoxGeometry(1.0, 3.0, 1.0), chimneyMat);
      chim.position.set(-w * 0.35, h + 1.8, 0);
      hGroup.add(chim);

      const door = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.5, 0.16), darkWoodMat);
      door.position.set(0, 1.25, d / 2 + 0.08);
      hGroup.add(door);
      mainDoorMesh = door;

      [-0.4, 0.4].forEach(ang => {
        const plank = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.8, 0.1), boardedWoodMat);
        plank.position.set(0, 1.25, d / 2 + 0.2);
        plank.rotation.z = ang;
        hGroup.add(plank);
        doorPlanks.push(plank);
      });

    } else if (type === 'shack') {
      w = 6.0; h = 4.8; d = 5.5;
      doorName = 'Pos Jaga Kayu Cream';

      const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), creamCabinMat);
      body.position.y = h / 2;
      hGroup.add(body);

      const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.8, 0.5, d + 0.8), roofSnowMat);
      roof.position.set(0, h + 0.25, 0);
      roof.rotation.x = 0.12;
      hGroup.add(roof);

      const door = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.2, 0.14), darkWoodMat);
      door.position.set(0, 1.1, d / 2 + 0.08);
      hGroup.add(door);
      mainDoorMesh = door;

      const lockPlank = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.22, 0.08), boardedWoodMat);
      lockPlank.position.set(0, 1.2, d / 2 + 0.18);
      hGroup.add(lockPlank);
      doorPlanks.push(lockPlank);
    }

    // Deep Stone Foundation Block (extends 3.2m underground, eliminating any floating gap)
    const villageFoundMat = new THREE.MeshLambertMaterial({ color: 0x2e3338, flatShading: false });
    const villageFound = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 3.2, d + 0.3), villageFoundMat);
    villageFound.position.set(0, -1.45, 0);
    hGroup.add(villageFound);

    // Natural snow accumulation embankment around building base
    const villageSnowBermMat = new THREE.MeshLambertMaterial({ color: 0xd8e3eb, flatShading: true });
    const villageSnowBase = new THREE.Mesh(new THREE.BoxGeometry(w + 0.9, 0.42, d + 0.9), villageSnowBermMat);
    villageSnowBase.position.set(0, 0.08, 0);
    hGroup.add(villageSnowBase);

    hGroup.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    scene.add(hGroup);

    const doorLocal = new THREE.Vector3(0, 1.35, d / 2 + 0.15);
    doorLocal.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
    const worldDoorPos = new THREE.Vector3(x + doorLocal.x, 1.35, z + doorLocal.z);
    const frontDoorIndex = colliders.length;

    const cos = Math.abs(Math.cos(rotY));
    const sin = Math.abs(Math.sin(rotY));
    const extentX = (w / 2) * cos + (d / 2) * sin + 0.5;
    const extentZ = (w / 2) * sin + (d / 2) * cos + 0.5;

    colliders.push({
      minX: x - extentX,
      maxX: x + extentX,
      minZ: z - extentZ,
      maxZ: z + extentZ
    });

    lockedDoors.push({
      name: doorName,
      worldPos: worldDoorPos,
      doorMesh: mainDoorMesh,
      doorMeshR: secondDoorMesh,
      planks: doorPlanks,
      interiorLight: intLight,
      isBroken: false,
      frontColliderIndex: frontDoorIndex
    });
  }

  // 4. Trees
  const pineSnowMat = new THREE.MeshLambertMaterial({ color: 0x9fb5a8, flatShading: true });
  const pineFoliageMat = new THREE.MeshLambertMaterial({ color: 0x223528, flatShading: true });
  const bareBarkMat = new THREE.MeshLambertMaterial({ color: 0x24201c, flatShading: true });

  // High-Performance Geometry Merging Helper for Instanced Forest
  function mergeGeometries(geoList) {
    let totalVerts = 0;
    for (let i = 0; i < geoList.length; i++) {
      totalVerts += geoList[i].attributes.position.count;
    }

    const positions = new Float32Array(totalVerts * 3);
    const normals = new Float32Array(totalVerts * 3);
    const indices = [];

    let vertOffset = 0;
    let posOffset = 0;
    let normOffset = 0;

    for (let i = 0; i < geoList.length; i++) {
      const g = geoList[i];
      const pos = g.attributes.position.array;
      positions.set(pos, posOffset);
      posOffset += pos.length;

      if (g.attributes.normal) {
        const norm = g.attributes.normal.array;
        normals.set(norm, normOffset);
        normOffset += norm.length;
      }

      if (g.index) {
        const idx = g.index.array;
        for (let j = 0; j < idx.length; j++) {
          indices.push(idx[j] + vertOffset);
        }
      } else {
        const count = g.attributes.position.count;
        for (let j = 0; j < count; j++) {
          indices.push(j + vertOffset);
        }
      }
      vertOffset += g.attributes.position.count;
    }

    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    if (normOffset > 0) {
      merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    }
    merged.setIndex(indices);
    return merged;
  }

  function buildPineCanopyGeometry() {
    const tiers = [];
    const canopyStart = 6.2;
    for (let t = 0; t < 5; t++) {
      const tierR = 3.8 - t * 0.58;
      const tierH = 3.2;
      const yPos = canopyStart + t * 2.1;
      const cone = new THREE.ConeGeometry(tierR, tierH, 6);
      cone.translate(0, yPos, 0);
      tiers.push(cone);
    }
    return mergeGeometries(tiers);
  }

  function buildPineSnowGeometry() {
    const caps = [];
    const canopyStart = 6.2;
    for (let t = 0; t < 5; t++) {
      const tierR = 3.8 - t * 0.58;
      const tierH = 3.2;
      const yPos = canopyStart + t * 2.1 + 0.40;
      const snow = new THREE.ConeGeometry(tierR * 0.94, tierH * 0.52, 6);
      snow.translate(0, yPos, 0);
      caps.push(snow);
    }
    return mergeGeometries(caps);
  }

  function buildBareBranchesGeometry() {
    const branches = [];
    const branchAngles = [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5, Math.PI * 0.25, Math.PI * 0.75];
    branchAngles.forEach((ang, i) => {
      const bLen = 4.0 + (i % 3) * 0.9;
      const branch = new THREE.CylinderGeometry(0.10, 0.20, bLen, 4);
      branch.rotateZ(0.65);
      branch.rotateY(ang);
      branch.translate(0, 6.8 + (i % 2) * 2.0, 0);
      branches.push(branch);
    });
    return mergeGeometries(branches);
  }

  function buildBareSnowGeometry() {
    const snowCaps = [];
    const branchAngles = [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5, Math.PI * 0.25, Math.PI * 0.75];
    branchAngles.forEach((ang, i) => {
      const bLen = 4.0 + (i % 3) * 0.9;
      const snow = new THREE.BoxGeometry(0.14, 0.08, bLen * 0.8);
      snow.rotateZ(0.65);
      snow.rotateY(ang);
      snow.translate(0, 6.8 + (i % 2) * 2.0 + 0.1, 0);
      snowCaps.push(snow);
    });
    return mergeGeometries(snowCaps);
  }

  // 5. Frosted Forest Rocks & Fallen Timber Logs
  const rockSnowMat = new THREE.MeshLambertMaterial({ color: 0x3d434a, flatShading: true });
  const snowCapMat = new THREE.MeshLambertMaterial({ color: 0xdde6ed, flatShading: true });

  function makeForestRock(x, z, sc = 1.0) {
    const rGroup = new THREE.Group();
    const gy = getTerrainHeight(x, z);
    rGroup.position.set(x, gy, z);

    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.85 * sc, 1), rockSnowMat);
    rock.position.y = 0.45 * sc;
    rock.scale.set(1.2, 0.7, 1.1);
    rock.rotation.set(Math.random() * 0.4, Math.random() * Math.PI, Math.random() * 0.3);
    rGroup.add(rock);

    const snowCap = new THREE.Mesh(new THREE.DodecahedronGeometry(0.65 * sc, 1), snowCapMat);
    snowCap.position.y = 0.8 * sc;
    snowCap.scale.set(1.1, 0.35, 1.0);
    rGroup.add(snowCap);

    scene.add(rGroup);
    colliders.push({
      minX: x - 0.7 * sc,
      maxX: x + 0.7 * sc,
      minZ: z - 0.7 * sc,
      maxZ: z + 0.7 * sc
    });
  }

  function makeFallenLog(x, z, rotY, len = 4.2) {
    const logGroup = new THREE.Group();
    const gy = getTerrainHeight(x, z);
    logGroup.position.set(x, gy + 0.22, z);
    logGroup.rotation.y = rotY;

    const logMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, len, 6), bareBarkMat);
    logMesh.rotation.z = Math.PI / 2;
    logGroup.add(logMesh);

    const snowTop = new THREE.Mesh(new THREE.BoxGeometry(len * 0.95, 0.12, 0.38), pineSnowMat);
    snowTop.position.y = 0.22;
    logGroup.add(snowTop);

    scene.add(logGroup);
    colliders.push({
      minX: x - 1.0,
      maxX: x + 1.0,
      minZ: z - 1.0,
      maxZ: z + 1.0
    });
  }

  // 6. Occult Forest Totem
  const totemBoneMat = new THREE.MeshLambertMaterial({ color: 0xd8d4c8 });

  function makeOccultTotem(x, z) {
    const totem = new THREE.Group();
    const gy = getTerrainHeight(x, z);
    totem.position.set(x, gy, z);

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 3.2, 5), bareBarkMat);
    pole.position.y = 1.6;
    totem.add(pole);

    const cross = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.8, 5), bareBarkMat);
    cross.position.set(0, 2.2, 0);
    cross.rotation.z = Math.PI / 2;
    totem.add(cross);

    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.38, 0.32), totemBoneMat);
    skull.position.set(0, 3.2, 0);
    totem.add(skull);

    const candleLight = new THREE.PointLight(0xcc2222, 1.4, 7);
    candleLight.position.set(0, 2.5, 0);
    totem.add(candleLight);

    scene.add(totem);
  }

  // 7. High-Performance Instanced Snowy Pine & Winter Forest Generator (Expansive 300m Map)
  function buildDenseSnowForest() {
    const pinePositions = [];
    const barePositions = [];

    // Distribute 420 tall snowy pines and bare trunks across the 290m terrain (stretching beyond boundary)
    for (let i = 0; i < 420; i++) {
      const x = (Math.random() - 0.5) * 286;
      const z = (Math.random() - 0.5) * 286;

      // Natural clearing around player starting position (0, 14)
      if (Math.hypot(x - 0, z - 14) < 5.0) continue;

      // Farmhouse clearing at (-13, -6)
      if (Math.hypot(x - (-13), z - (-6)) < 9.5) continue;

      // Cabins and shacks clearings
      if (Math.hypot(x - 18, z - 6) < 7.5) continue;
      if (Math.hypot(x - 22, z - (-20)) < 8.0) continue;
      if (Math.hypot(x - (-22), z - 22) < 7.5) continue;
      if (Math.hypot(x - 16, z - 28) < 7.5) continue;

      // Keep trees out of the Winding River Channel & Valley
      if (z > -62.0 && z < 112.0) {
        const rX = getRiverCenterX(z);
        if (Math.abs(x - rX) < 7.2) continue;
      }

      // Keep trees out of the Waterfall plunge pool canyon
      if (z <= -56.0 && z >= -66.0 && Math.abs(x - 42.0) < 15.0) continue;

      // Keep trees out of the Upper Mountain Feeder River channel
      if (z <= -56.0 && z >= -96.0) {
        const topX = getUpperRiverCenterX(z);
        if (Math.abs(x - topX) < 7.8) continue;
      }

      const sc = 0.90 + Math.random() * 0.75;
      const gy = getTerrainHeight(x, z);
      const rotY = Math.random() * Math.PI * 2;

      if (Math.random() < 0.80) {
        pinePositions.push({ x, y: gy, z, scale: sc, rotY });
      } else {
        barePositions.push({ x, y: gy, z, scale: sc, rotY });
      }
    }

    // Outer forest pines stretching far out into the snow (r = 95m to 155m)
    for (let i = 0; i < 75; i++) {
      const a = (i / 75) * Math.PI * 2;
      const r = 96 + Math.random() * 55;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const gy = getTerrainHeight(x, z);
      const sc = 1.35 + Math.random() * 0.55;
      const rotY = Math.random() * Math.PI * 2;
      pinePositions.push({ x, y: gy, z, scale: sc, rotY });
    }

    const dummy = new THREE.Object3D();

    // A. INSTANCED TALL ALPINE SNOW PINES (Reduced to 3 Draw Calls for the entire map!)
    const pineCount = pinePositions.length;
    if (pineCount > 0) {
      const pineTrunkGeo = new THREE.CylinderGeometry(0.24, 0.38, 15.0, 5);
      pineTrunkGeo.translate(0, 7.5, 0);

      const pineCanopyGeo = buildPineCanopyGeometry();
      const pineSnowGeo = buildPineSnowGeometry();

      const pineTrunkMesh = new THREE.InstancedMesh(pineTrunkGeo, bareBarkMat, pineCount);
      const pineFoliageMesh = new THREE.InstancedMesh(pineCanopyGeo, pineFoliageMat, pineCount);
      const pineSnowMesh = new THREE.InstancedMesh(pineSnowGeo, pineSnowMat, pineCount);

      for (let i = 0; i < pineCount; i++) {
        const p = pinePositions[i];
        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.set(0, p.rotY, 0);
        dummy.scale.set(p.scale, p.scale, p.scale);
        dummy.updateMatrix();

        pineTrunkMesh.setMatrixAt(i, dummy.matrix);
        pineFoliageMesh.setMatrixAt(i, dummy.matrix);
        pineSnowMesh.setMatrixAt(i, dummy.matrix);

        // Precise slender trunk collider (only inside active play area)
        if (Math.abs(p.x) < MAP_LIMIT + 2 && Math.abs(p.z) < MAP_LIMIT + 2) {
          const colR = 0.38 * p.scale;
          colliders.push({ minX: p.x - colR, maxX: p.x + colR, minZ: p.z - colR, maxZ: p.z + colR });
        }
      }

      pineTrunkMesh.instanceMatrix.needsUpdate = true;
      pineFoliageMesh.instanceMatrix.needsUpdate = true;
      pineSnowMesh.instanceMatrix.needsUpdate = true;

      pineTrunkMesh.castShadow = true;
      pineTrunkMesh.receiveShadow = true;
      pineFoliageMesh.castShadow = true;
      pineFoliageMesh.receiveShadow = true;
      pineSnowMesh.castShadow = true;
      pineSnowMesh.receiveShadow = true;

      scene.add(pineTrunkMesh);
      scene.add(pineFoliageMesh);
      scene.add(pineSnowMesh);
    }

    // B. INSTANCED BARE WINTER TREES (3 Draw Calls for the entire map!)
    const bareCount = barePositions.length;
    if (bareCount > 0) {
      const bareTrunkGeo = new THREE.CylinderGeometry(0.22, 0.34, 14.0, 5);
      bareTrunkGeo.translate(0, 7.0, 0);

      const bareBranchesGeo = buildBareBranchesGeometry();
      const bareSnowGeo = buildBareSnowGeometry();

      const bareTrunkMesh = new THREE.InstancedMesh(bareTrunkGeo, bareBarkMat, bareCount);
      const bareBranchMesh = new THREE.InstancedMesh(bareBranchesGeo, bareBarkMat, bareCount);
      const bareSnowMesh = new THREE.InstancedMesh(bareSnowGeo, roofSnowMat, bareCount);

      for (let i = 0; i < bareCount; i++) {
        const b = barePositions[i];
        dummy.position.set(b.x, b.y, b.z);
        dummy.rotation.set(0, b.rotY, 0);
        dummy.scale.set(b.scale, b.scale, b.scale);
        dummy.updateMatrix();

        bareTrunkMesh.setMatrixAt(i, dummy.matrix);
        bareBranchMesh.setMatrixAt(i, dummy.matrix);
        bareSnowMesh.setMatrixAt(i, dummy.matrix);

        if (Math.abs(b.x) < MAP_LIMIT + 2 && Math.abs(b.z) < MAP_LIMIT + 2) {
          const colR = 0.34 * b.scale;
          colliders.push({ minX: b.x - colR, maxX: b.x + colR, minZ: b.z - colR, maxZ: b.z + colR });
        }
      }

      bareTrunkMesh.instanceMatrix.needsUpdate = true;
      bareBranchMesh.instanceMatrix.needsUpdate = true;
      bareSnowMesh.instanceMatrix.needsUpdate = true;

      bareTrunkMesh.castShadow = true;
      bareTrunkMesh.receiveShadow = true;
      bareBranchMesh.castShadow = true;
      bareBranchMesh.receiveShadow = true;
      bareSnowMesh.castShadow = true;
      bareSnowMesh.receiveShadow = true;

      scene.add(bareTrunkMesh);
      scene.add(bareBranchMesh);
      scene.add(bareSnowMesh);
    }
  }

  // World Boundary Transparent Frosted Ice Barrier Wall
  function buildTransparentBoundaryWall(scene) {
    const wallH = 10.0;
    const limit = MAP_LIMIT; // 90m
    const wallGroup = new THREE.Group();
    wallGroup.name = 'Transparent_World_Boundary';

    // Translucent frosted glass / ice material with high specular sheen and subtle cyan shimmer
    const glassMat = new THREE.MeshPhongMaterial({
      color: 0x9be0f7,
      emissive: 0x071520,
      specular: 0xffffff,
      shininess: 95,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    // Faint icy base rim grounded into snow
    const baseMat = new THREE.MeshLambertMaterial({
      color: 0x5faad6,
      transparent: true,
      opacity: 0.32,
      depthWrite: false
    });

    const segments = [
      // North Wall (z = -limit)
      { x: 0, z: -limit, rotY: 0, len: limit * 2 },
      // South Wall (z = limit)
      { x: 0, z: limit, rotY: 0, len: limit * 2 },
      // East Wall (x = limit)
      { x: limit, z: 0, rotY: Math.PI / 2, len: limit * 2 },
      // West Wall (x = -limit)
      { x: -limit, z: 0, rotY: Math.PI / 2, len: limit * 2 }
    ];

    segments.forEach(seg => {
      const step = 6.0;
      const count = Math.ceil(seg.len / step);
      for (let i = 0; i < count; i++) {
        const offset = -seg.len / 2 + (i + 0.5) * step;
        let wx, wz;
        if (seg.rotY === 0) {
          wx = seg.x + offset;
          wz = seg.z;
        } else {
          wx = seg.x;
          wz = seg.z + offset;
        }
        const gy = getTerrainHeight(wx, wz);

        // Transparent glass panel
        const panelGeo = new THREE.PlaneGeometry(step + 0.1, wallH);
        const panel = new THREE.Mesh(panelGeo, glassMat);
        panel.position.set(wx, gy + wallH / 2 - 0.4, wz);
        panel.rotation.y = seg.rotY;
        wallGroup.add(panel);

        // Ground frost seam
        const baseGeo = new THREE.BoxGeometry(step + 0.1, 0.28, 0.35);
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.set(wx, gy + 0.12, wz);
        base.rotation.y = seg.rotY;
        wallGroup.add(base);
      }
    });

    scene.add(wallGroup);
  }

  // 8. Winding Alpine Mountain River & Cascading Waterfall Generator
  function buildRiverAndWaterfall(scene, textures) {
    const { riverWaterTex, waterfallTex, waterfallMistTex, topStreamTex, crestFoamTex, woodPlanksTex } = textures;

    // A. Winding Curved Mountain River Ribbon Mesh
    const riverSegments = 160;
    const startZ = -58.0;
    const endZ = 140.0; // Flows completely past the world boundaries (mentok sampai ujung)
    const stepZ = (endZ - startZ) / riverSegments;
    const riverHalfW = 5.25; // Embeds deeply into the snowy shoreline banks

    const riverPositions = [];
    const riverNormals = [];
    const riverUVs = [];
    const riverIndices = [];

    for (let i = 0; i <= riverSegments; i++) {
      const z = startZ + i * stepZ;
      const cx = getRiverCenterX(z);
      const wy = getRiverWaterY(z);

      // Left bank vertex
      riverPositions.push(cx - riverHalfW, wy, z);
      riverNormals.push(0, 1, 0);
      riverUVs.push(0, i * 0.35);

      // Center stream vertex
      riverPositions.push(cx, wy, z);
      riverNormals.push(0, 1, 0);
      riverUVs.push(0.5, i * 0.35);

      // Right bank vertex
      riverPositions.push(cx + riverHalfW, wy, z);
      riverNormals.push(0, 1, 0);
      riverUVs.push(1.0, i * 0.35);

      if (i < riverSegments) {
        const row = i * 3;
        const nextRow = (i + 1) * 3;

        // Quad 1: Left to Center
        riverIndices.push(row, row + 1, nextRow);
        riverIndices.push(row + 1, nextRow + 1, nextRow);

        // Quad 2: Center to Right
        riverIndices.push(row + 1, row + 2, nextRow + 1);
        riverIndices.push(row + 2, nextRow + 2, nextRow + 1);
      }
    }

    const riverGeo = new THREE.BufferGeometry();
    riverGeo.setAttribute('position', new THREE.Float32BufferAttribute(riverPositions, 3));
    riverGeo.setAttribute('normal', new THREE.Float32BufferAttribute(riverNormals, 3));
    riverGeo.setAttribute('uv', new THREE.Float32BufferAttribute(riverUVs, 2));
    riverGeo.setIndex(riverIndices);

    const riverMat = new THREE.MeshPhongMaterial({
      map: riverWaterTex,
      color: 0x3d82a4,
      specular: 0x99ddff,
      shininess: 95,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    riverWaterMesh = new THREE.Mesh(riverGeo, riverMat);
    scene.add(riverWaterMesh);

    // B. Cascading 3D Mountain Waterfall (Wide, Majestic, Clean & Completely Unobstructed)
    const cliffX = 42.0;
    const poolZ = -56.2;
    const crestZ = -58.6;
    const plungeWaterY = getRiverWaterY(poolZ); // ~0.85m
    const cliffTopY = 8.6;
    const fallH = cliffTopY - plungeWaterY; // ~7.75m
    const fallW = 12.0;

    // 1. Curved 3D Torrent Mesh (Core Cascade)
    const uSegs = 16;
    const vSegs = 18;
    const wfPositions = [];
    const wfNormals = [];
    const wfUVs = [];
    const wfIndices = [];

    for (let iv = 0; iv <= vSegs; iv++) {
      const v = iv / vSegs;
      const curY = cliffTopY - v * fallH;
      const curZ = crestZ + (poolZ - crestZ) * v + Math.sin(v * Math.PI) * 0.22;

      for (let iu = 0; iu <= uSegs; iu++) {
        const u = iu / uSegs;
        const curveArch = Math.sin(u * Math.PI) * 0.35;
        const curX = cliffX + (u - 0.5) * (fallW + v * 1.5);

        wfPositions.push(curX, curY, curZ + curveArch);
        wfNormals.push(0, 0.3, 0.95);
        wfUVs.push(u * 2.2, (1.0 - v) * 3.8);
      }
    }

    for (let iv = 0; iv < vSegs; iv++) {
      for (let iu = 0; iu < uSegs; iu++) {
        const a = iv * (uSegs + 1) + iu;
        const b = a + 1;
        const c = (iv + 1) * (uSegs + 1) + iu;
        const d = c + 1;
        wfIndices.push(a, b, c);
        wfIndices.push(b, d, c);
      }
    }

    const wfGeo = new THREE.BufferGeometry();
    wfGeo.setAttribute('position', new THREE.Float32BufferAttribute(wfPositions, 3));
    wfGeo.setAttribute('normal', new THREE.Float32BufferAttribute(wfNormals, 3));
    wfGeo.setAttribute('uv', new THREE.Float32BufferAttribute(wfUVs, 2));
    wfGeo.setIndex(wfIndices);
    wfGeo.computeVertexNormals();

    const wfMat = new THREE.MeshPhongMaterial({
      map: waterfallTex,
      color: 0xe8f8fd,
      specular: 0xffffff,
      shininess: 110,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    waterfallMesh = new THREE.Mesh(wfGeo, wfMat);
    scene.add(waterfallMesh);

    // 2. Outer Mist Curtain & Froth Veil (Parallax depth layer offset forward by 0.18m)
    const veilPositions = [];
    const veilUVs = [];
    for (let iv = 0; iv <= vSegs; iv++) {
      const v = iv / vSegs;
      const curY = cliffTopY - v * fallH;
      const curZ = crestZ + (poolZ - crestZ) * v + Math.sin(v * Math.PI) * 0.22 + 0.18;
      for (let iu = 0; iu <= uSegs; iu++) {
        const u = iu / uSegs;
        const curveArch = Math.sin(u * Math.PI) * 0.42;
        const curX = cliffX + (u - 0.5) * (fallW * 1.05 + v * 1.8);
        veilPositions.push(curX, curY, curZ + curveArch);
        veilUVs.push(u * 2.0, (1.0 - v) * 5.0);
      }
    }
    const veilGeo = new THREE.BufferGeometry();
    veilGeo.setAttribute('position', new THREE.Float32BufferAttribute(veilPositions, 3));
    veilGeo.setAttribute('uv', new THREE.Float32BufferAttribute(veilUVs, 2));
    veilGeo.setIndex(wfIndices);
    veilGeo.computeVertexNormals();

    const veilMat = new THREE.MeshPhongMaterial({
      map: waterfallTex,
      color: 0xffffff,
      specular: 0xffffff,
      shininess: 130,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    waterfallVeilMesh = new THREE.Mesh(veilGeo, veilMat);
    scene.add(waterfallVeilMesh);

    // 2b. Upper Mountain Feeder River Torrent (Water Flowing on Top of Cliff Summit)
    const topSegmentsZ = 48;
    const topStartPosZ = -135.0; // Feeds all the way from deep behind northern mountain peaks (mentok)
    const topEndPosZ = crestZ; // -58.6
    const topUSegs = 16; // Exact match with waterfallMesh

    const topPositions = [];
    const topNormals = [];
    const topUVs = [];
    const topIndices = [];

    for (let iz = 0; iz <= topSegmentsZ; iz++) {
      const v = iz / topSegmentsZ;
      const curZ = topStartPosZ + v * (topEndPosZ - topStartPosZ);
      const cx = getUpperRiverCenterX(curZ);
      const wy = getUpperRiverWaterY(curZ);

      // Width gradually expands from 9.6m deep in the mountains to 12.0m at the precipice
      const curW = 9.6 + v * 2.4;

      for (let iu = 0; iu <= topUSegs; iu++) {
        const u = iu / topUSegs;
        const curX = cx + (u - 0.5) * curW;

        // Realistic parabolic roll-over crest dip right at the cliff edge
        let edgeDip = 0;
        if (v > 0.92) {
          const dipProg = (v - 0.92) / 0.08;
          edgeDip = dipProg * dipProg * 0.14;
        }

        topPositions.push(curX, wy - edgeDip, curZ);
        topNormals.push(0, 1, 0);
        topUVs.push(u * 2.2, (1.0 - v) * 8.5);
      }
    }

    for (let iz = 0; iz < topSegmentsZ; iz++) {
      for (let iu = 0; iu < topUSegs; iu++) {
        const a = iz * (topUSegs + 1) + iu;
        const b = a + 1;
        const c = (iz + 1) * (topUSegs + 1) + iu;
        const d = c + 1;
        topIndices.push(a, b, c);
        topIndices.push(b, d, c);
      }
    }

    const topGeo = new THREE.BufferGeometry();
    topGeo.setAttribute('position', new THREE.Float32BufferAttribute(topPositions, 3));
    topGeo.setAttribute('normal', new THREE.Float32BufferAttribute(topNormals, 3));
    topGeo.setAttribute('uv', new THREE.Float32BufferAttribute(topUVs, 2));
    topGeo.setIndex(topIndices);
    topGeo.computeVertexNormals();

    const topRiverMat = new THREE.MeshPhongMaterial({
      map: topStreamTex || riverWaterTex,
      color: 0x4aa3cc,
      specular: 0xdaf2fc,
      shininess: 120,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    topRiverMesh = new THREE.Mesh(topGeo, topRiverMat);
    scene.add(topRiverMesh);

    // 2c. Churning White Water Precipice Lip & Crest Foam Mesh
    const crestGeo = new THREE.PlaneGeometry(fallW + 0.6, 1.8, 16, 2);
    crestGeo.rotateX(-Math.PI / 2.35); // Slanted over the lip into the vertical cascade
    const crestMat = new THREE.MeshPhongMaterial({
      map: crestFoamTex || waterfallTex,
      color: 0xd2effa,
      specular: 0xffffff,
      shininess: 90,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    topRiverCrestFoam = new THREE.Mesh(crestGeo, crestMat);
    topRiverCrestFoam.position.set(cliffX, cliffTopY + 0.02, crestZ + 0.4);
    scene.add(topRiverCrestFoam);

    // 3. Wide Churning Foam Splash Ring at Waterfall Foot
    const foamGeo = new THREE.RingGeometry(1.2, 7.5, 24);
    foamGeo.rotateX(-Math.PI / 2);
    const foamMat = new THREE.MeshBasicMaterial({
      map: waterfallMistTex || null,
      color: 0xebf7fc,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    waterfallSplashRing = new THREE.Mesh(foamGeo, foamMat);
    waterfallSplashRing.position.set(cliffX, plungeWaterY + 0.04, poolZ + 1.2);
    scene.add(waterfallSplashRing);

    // Inner turbulent impact splash ring
    const innerFoamGeo = new THREE.RingGeometry(0.2, 4.2, 20);
    innerFoamGeo.rotateX(-Math.PI / 2);
    const innerFoamMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.90,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    waterfallInnerSplash = new THREE.Mesh(innerFoamGeo, innerFoamMat);
    waterfallInnerSplash.position.set(cliffX, plungeWaterY + 0.06, poolZ + 0.8);
    scene.add(waterfallInnerSplash);

    // 4. Rising Waterfall Mist Particles
    const MIST_COUNT = 40;
    const mistGeo = new THREE.BufferGeometry();
    const mistPositions = new Float32Array(MIST_COUNT * 3);

    for (let i = 0; i < MIST_COUNT; i++) {
      mistPositions[i * 3 + 0] = cliffX + (Math.random() - 0.5) * 10.5;
      mistPositions[i * 3 + 1] = plungeWaterY + Math.random() * 2.5;
      mistPositions[i * 3 + 2] = poolZ + 0.5 + Math.random() * 3.5;
      waterfallMistVel.push({
        vy: 0.6 + Math.random() * 1.1,
        vx: (Math.random() - 0.5) * 0.35,
        vz: 0.2 + Math.random() * 0.45,
        life: Math.random() * 3.0,
        maxLife: 3.0
      });
    }

    mistGeo.setAttribute('position', new THREE.BufferAttribute(mistPositions, 3));
    const mistMat = new THREE.PointsMaterial({
      map: waterfallMistTex || null,
      color: 0xdff4fc,
      size: 2.4,
      transparent: true,
      opacity: 0.45,
      depthWrite: false
    });
    waterfallMistParticles = new THREE.Points(mistGeo, mistMat);
    scene.add(waterfallMistParticles);

    // 5. Alpine Rocky Canyon Gorge Framing (SIDEWALLS ONLY — FRONT IS 100% CLEAR)
    const canyonRockMat = new THREE.MeshLambertMaterial({ color: 0x2e353c, flatShading: true });
    const canyonSnowMat = new THREE.MeshLambertMaterial({ color: 0xdde7ee, flatShading: true });

    const gorgeRocks = [
      // Left Canyon Wall (Well to the left of the waterfall: x <= 33.0)
      { x: 32.5, z: -57.0, sc: 2.2, y: 3.2 },
      { x: 31.8, z: -58.5, sc: 2.6, y: 5.5 },
      { x: 33.5, z: -55.5, sc: 1.6, y: 1.2 },
      { x: 32.0, z: -64.0, sc: 2.0, y: 8.8 },
      { x: 31.5, z: -72.0, sc: 2.3, y: 9.3 },

      // Right Canyon Wall (Well to the right of the waterfall: x >= 51.0)
      { x: 51.5, z: -57.0, sc: 2.2, y: 3.2 },
      { x: 52.2, z: -58.5, sc: 2.6, y: 5.5 },
      { x: 50.5, z: -55.5, sc: 1.6, y: 1.2 },
      { x: 52.0, z: -64.0, sc: 2.0, y: 8.8 },
      { x: 52.5, z: -72.0, sc: 2.3, y: 9.3 }
    ];

    gorgeRocks.forEach(rc => {
      const rkGroup = new THREE.Group();
      rkGroup.position.set(rc.x, rc.y, rc.z);

      const rkMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(rc.sc, 1), canyonRockMat);
      rkMesh.scale.set(1.1, 1.3, 1.05);
      rkMesh.rotation.set(0.2, Math.random() * Math.PI, 0.1);
      rkGroup.add(rkMesh);

      const rkSnow = new THREE.Mesh(new THREE.DodecahedronGeometry(rc.sc * 0.85, 1), canyonSnowMat);
      rkSnow.position.y = rc.sc * 0.55;
      rkSnow.scale.set(1.1, 0.4, 1.0);
      rkGroup.add(rkSnow);

      scene.add(rkGroup);
      colliders.push({
        minX: rc.x - rc.sc * 0.85,
        maxX: rc.x + rc.sc * 0.85,
        minZ: rc.z - rc.sc * 0.85,
        maxZ: rc.z + rc.sc * 0.85
      });
    });

    // C. Rustic Wooden Forest Bridge over the River (at z = 4.0)
    const bridgeZ = 4.0;
    const bridgeCenterX = getRiverCenterX(bridgeZ);
    const bridgeWaterY = getRiverWaterY(bridgeZ);
    const bridgeFloorY = bridgeWaterY + 0.68;
    const bridgeLen = 13.5;
    const bridgeW = 3.4;

    const bridgeGroup = new THREE.Group();
    bridgeGroup.position.set(bridgeCenterX, bridgeFloorY, bridgeZ);

    const bridgeWoodMat = new THREE.MeshLambertMaterial({ map: woodPlanksTex || null, color: 0x4a3222, flatShading: false });
    const bridgeSnowMat = new THREE.MeshLambertMaterial({ color: 0xdce6ec, flatShading: true });

    // Main bridge deck floor
    const deck = new THREE.Mesh(new THREE.BoxGeometry(bridgeLen, 0.28, bridgeW), bridgeWoodMat);
    bridgeGroup.add(deck);

    // Deck snow coating
    const deckSnow = new THREE.Mesh(new THREE.BoxGeometry(bridgeLen * 0.96, 0.08, bridgeW * 0.85), bridgeSnowMat);
    deckSnow.position.y = 0.18;
    bridgeGroup.add(deckSnow);

    // Wooden handrails
    [-bridgeW / 2 + 0.15, bridgeW / 2 - 0.15].forEach(rz => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(bridgeLen, 0.14, 0.14), bridgeWoodMat);
      rail.position.set(0, 0.85, rz);
      bridgeGroup.add(rail);

      for (let px = -bridgeLen / 2 + 0.8; px <= bridgeLen / 2 - 0.8; px += 2.2) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.85, 0.14), bridgeWoodMat);
        post.position.set(px, 0.42, rz);
        bridgeGroup.add(post);
      }
    });

    // Log Stilts & Pilings plunging into the riverbed
    const pilingGeo = new THREE.CylinderGeometry(0.2, 0.22, 2.2, 8);
    [-4.0, 4.0].forEach(px => {
      [-1.2, 1.2].forEach(pz => {
        const piling = new THREE.Mesh(pilingGeo, bridgeWoodMat);
        piling.position.set(px, -0.9, pz);
        bridgeGroup.add(piling);
      });
    });

    scene.add(bridgeGroup);

    // Natural Riverbed Stepping Stones & Rocks
    const riverRockSpots = [
      { z: -32.0, sc: 1.1 },
      { z: -15.0, sc: 0.9 },
      { z: 22.0, sc: 1.2 },
      { z: 45.0, sc: 1.0 },
      { z: 72.0, sc: 1.15 }
    ];
    riverRockSpots.forEach(rs => {
      const rx = getRiverCenterX(rs.z) + (Math.random() - 0.5) * 3.2;
      const ry = getRiverWaterY(rs.z) + 0.12;
      const rMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(rs.sc, 1), new THREE.MeshLambertMaterial({ color: 0x333b42, flatShading: true }));
      rMesh.position.set(rx, ry, rs.z);
      rMesh.scale.set(1.2, 0.6, 1.1);
      scene.add(rMesh);
    });
  }

  // Pure Dense Snow Forest (No road, no vehicles, only deep snow wilderness)
  buildDenseSnowForest();

  // World Boundary Transparent Frosted Ice Barrier Wall
  buildTransparentBoundaryWall(scene);

  // Construct Winding River, Mountain Waterfall & Wooden Bridge
  buildRiverAndWaterfall(scene, textures);

  // Construct Sanctuary White Farmhouse
  buildWhiteFarmhouse(-13, -6);

  // Construct Forest Cabins & Ruins
  buildLockedVillageHouse('cabin', 18, 6, -0.3);
  buildLockedVillageHouse('stone', 22, -20, 0.25);
  buildLockedVillageHouse('cabin', -22, 22, 0.4);
  buildLockedVillageHouse('shack', 16, 28, -0.2);

  // Occult Shrines & Totems in Deep Trees
  makeOccultTotem(-22, 12);
  makeOccultTotem(24, -10);
  makeOccultTotem(-20, -28);
  makeOccultTotem(5, 26);
  makeOccultTotem(-3, -34);
  makeOccultTotem(-45, 18);
  makeOccultTotem(48, -25);
  makeOccultTotem(36, 42);
  makeOccultTotem(-40, -45);

  // Frosted Boulders & Fallen Mossy Logs in the Snow
  makeForestRock(4.5, 10.5, 1.2);
  makeForestRock(-5.0, 18.0, 1.0);
  makeForestRock(8.0, -12.0, 1.4);
  makeForestRock(-7.5, -22.0, 1.1);
  makeForestRock(0.0, 30.0, 1.3);
  makeForestRock(34.0, 15.0, 1.4);
  makeForestRock(-35.0, -12.0, 1.3);
  makeForestRock(28.0, -42.0, 1.5);
  makeForestRock(-32.0, 40.0, 1.2);

  makeFallenLog(-2.5, 6.0, 0.45, 4.5);
  makeFallenLog(5.2, 1.5, -0.65, 4.0);
  makeFallenLog(-4.8, -14.0, 0.85, 4.2);
  makeFallenLog(25.0, 32.0, 0.35, 4.8);
  makeFallenLog(-38.0, 8.0, -0.55, 4.4);
  makeFallenLog(-18.0, -42.0, 0.75, 4.2);

  // Snow Particle System
  for (let i = 0; i < SNOW_COUNT; i++) {
    snowPos[i * 3 + 0] = (Math.random() - 0.5) * 140;
    snowPos[i * 3 + 1] = Math.random() * 25;
    snowPos[i * 3 + 2] = (Math.random() - 0.5) * 140;
    snowVel.push({
      y: 1.2 + Math.random() * 1.4,
      xDrift: (Math.random() - 0.5) * 0.4,
      sway: Math.random() * Math.PI * 2
    });
  }

  snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
  const snowMat = new THREE.PointsMaterial({
    color: 0xf0f6fa,
    size: 0.16,
    transparent: true,
    opacity: 0.85
  });
  snowSystem = new THREE.Points(snowGeo, snowMat);
  scene.add(snowSystem);

  // Build high-speed spatial collision acceleration grid
  indexColliders();
}

// High-speed 10m Spatial Hash Grid for instantaneous collision queries (O(1) instead of O(N))
const GRID_CELL_SIZE = 10.0;
const colliderGrid = new Map();

function getGridKey(cx, cz) {
  return `${cx},${cz}`;
}

export function indexColliders() {
  colliderGrid.clear();
  for (let i = 0; i < colliders.length; i++) {
    const c = colliders[i];
    const minCX = Math.floor(c.minX / GRID_CELL_SIZE);
    const maxCX = Math.floor(c.maxX / GRID_CELL_SIZE);
    const minCZ = Math.floor(c.minZ / GRID_CELL_SIZE);
    const maxCZ = Math.floor(c.maxZ / GRID_CELL_SIZE);

    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cz = minCZ; cz <= maxCZ; cz++) {
        const key = getGridKey(cx, cz);
        let list = colliderGrid.get(key);
        if (!list) {
          list = [];
          colliderGrid.set(key, list);
        }
        list.push(c);
      }
    }
  }
}

export function checkWallCollision(x, z) {
  if (Math.abs(x) > MAP_LIMIT - 0.5 || Math.abs(z) > MAP_LIMIT - 0.5) return true;
  const cx = Math.floor(x / GRID_CELL_SIZE);
  const cz = Math.floor(z / GRID_CELL_SIZE);
  const key = getGridKey(cx, cz);
  const nearby = colliderGrid.get(key);
  if (!nearby) return false;

  for (let i = 0; i < nearby.length; i++) {
    const c = nearby[i];
    if (x > c.minX && x < c.maxX && z > c.minZ && z < c.maxZ) return true;
  }
  return false;
}
