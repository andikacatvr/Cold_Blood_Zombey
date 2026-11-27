/* =========================================================================
   WORLD ENVIRONMENT & ARCHITECTURE
   Sanctuary Farmhouse, Cream Village Cottages, Barricaded Doors, Conifers, Snow
   ========================================================================= */

import { Sfx } from '../audio/sfx.js';
import { spawnWoodSplinters } from '../entities/effects.js';
import { setEndlessVillagers } from '../entities/villager.js';
import { ambientLight, overcastDirLight } from '../graphics/engine.js';
import { initTimesSquareWorld, setTimesSquareActive, updateTimesSquareEffects } from './timesSquare.js';

let groundMeshRef = null;
let coldbrookGroup = null;

const THREE = window.THREE;

export const MAP_LIMIT = 150;
export const TERRAIN_LIMIT = 230;

export let riverWaterMesh = null;
export let waterfallMesh = null;
export let waterfallVeilMesh = null;
export let waterfallSplashRing = null;
export let waterfallInnerSplash = null;
export let waterfallMistParticles = null;
export const waterfallMistVel = [];
export let topRiverMesh = null;
export let topRiverCrestFoam = null;
export let beachSandMesh = null;
export let wetBeachSandMesh = null;
export let oceanWaterMesh = null;
export let oceanBasePositions = null;
export let oceanShorelineFoam = null;
export let oceanSecondaryFoam = null;
export let beachPalmTrees = [];
export const cemeteryCandles = [];

/**
 * Updates subtle atmospheric flickering of cemetery memorial candles & lanterns.
 */
export function updateCemeteryAtmosphere(time) {
  for (let i = 0; i < cemeteryCandles.length; i++) {
    const c = cemeteryCandles[i];
    const flicker = Math.sin(time * 7.5 + c.seed) * 0.18 + Math.cos(time * 12.3 + c.seed * 1.7) * 0.12;
    c.light.intensity = Math.max(0.2, c.baseIntensity + flicker);
    if (c.flame) {
      c.flame.scale.setScalar(1.0 + flicker * 0.35);
    }
  }
}

/**
 * Returns the exact water surface elevation (Y) at given (x, z), or null if on dry land.
 */
export function getWaterSurfaceY(x, z) {
  if (z > 125.0) {
    const time = performance.now() * 0.001;
    const wave = Math.sin(z * 0.18 - time * 2.2 + x * 0.04) * 0.16 + Math.sin(z * 0.32 - time * 3.1) * 0.08;
    return -2.52 + wave;
  }
  if (z <= -58.6 && Math.abs(x - getUpperRiverCenterX(z)) < 5.2) {
    return getUpperRiverWaterY(z);
  }
  const riverX = getRiverCenterX(z);
  if (z > -58.6 && z <= 126.0 && Math.abs(x - riverX) < 6.8) {
    return getRiverWaterY(z);
  }
  return null;
}

/**
 * Returns the X position of the winding lower river centerline at any given Z coordinate.
 */
export function getRiverCenterX(z) {
  return 42.0 + Math.sin(z * 0.048) * 9.0 + Math.cos(z * 0.022) * 5.0;
}

/**
 * Returns the exact elevation (Y position) of the lower mountain river water surface at any given Z.
 * Naturally descends from waterfall plunge pool (z=-56.5) down to sea level (-2.55m) at the southern ocean beach (z=126.0).
 */
export function getRiverWaterY(z) {
  const progress = Math.min(1.0, Math.max(0, (z - (-58.0)) / 184.0));
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
  // Multi-Level Subway Stairwell & Concourse + Flat Times Square NYC Avenue
  if (window.__ENDLESS_ACTIVE) {
    // Flight 1: z = -18.0 (y = 0.0) down to z = -24.0 (y = -2.2)
    if (x >= -21.5 && x <= -16.5 && z <= -18.0 && z >= -24.0) {
      return -((-18.0 - z) / 6.0) * 2.2;
    }
    // Mid-landing: z = -24.0 to -27.0 (y = -2.2)
    if (x >= -21.5 && x <= -16.5 && z < -24.0 && z >= -27.0) {
      return -2.2;
    }
    // Flight 2: z = -27.0 (y = -2.2) down to z = -30.5 (y = -3.4)
    if (x >= -21.5 && x <= -16.5 && z < -27.0 && z >= -30.5) {
      return -2.2 - ((-27.0 - z) / 3.5) * 1.2;
    }
    // Underground Subway Concourse & Enterable Train Interior
    if (x >= -27.6 && x <= -13.5 && z < -30.5 && z >= -43.2) {
      return -3.4;
    }
    return 0.0;
  }

  // Multi-frequency natural forest ground rolling waves
  const h1 = Math.sin(x * 0.052) * Math.cos(z * 0.048) * 2.5;
  const h2 = Math.sin(x * 0.105 + 1.2) * Math.cos(z * 0.092 - 0.7) * 1.35;
  const h3 = Math.cos(x * 0.028 - z * 0.034) * 1.55;
  let raw = h1 + h2 + h3; // Base undulating waves

  // 0. Coastal Sand Dunes, Beach & Ocean Bay Transition (z >= 75.0)
  if (z >= 75.0) {
    const coastP = Math.min(1.0, (z - 75.0) / 40.0);
    // Smooth transition from forest knolls into coastal sand dunes & beach flats
    const duneWaves = Math.sin(x * 0.062) * 0.55 + Math.cos(z * 0.078) * 0.35;
    const targetBeachY = -1.35 + duneWaves - (coastP * 0.95);
    raw = THREE.MathUtils.lerp(raw, targetBeachY, coastP);

    // Submerged coastal seabed descending smoothly into the ocean (z > 126.0)
    if (z > 126.0) {
      const seabedDepth = Math.min(4.8, (z - 126.0) * 0.24);
      raw = Math.min(raw, -2.55 - seabedDepth);
    }
  }

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

  // 2. Winding Alpine River Valley & Riverbed Channel (from waterfall plunge pool z=-58.0 to beach estuary z=126.0)
  if (z > -59.0 && z <= 126.0) {
    const rX = getRiverCenterX(z);
    const distToRiver = Math.abs(x - rX);
    const waterY = getRiverWaterY(z);

    // River widens as it approaches the beach estuary
    const widenFactor = (z > 78.0) ? (1.0 + (z - 78.0) * 0.024) : 1.0;
    const channelR = 5.2 * widenFactor; // Submerged riverbed boundary
    const bankR = 8.5 * widenFactor;    // Shoreline ridge
    const valleyR = 16.0 * widenFactor; // Outer valley blend corridor

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

  // Highway Flat Roadway Corridor (x around 0, z from -230.0 to 32.0)
  if (Math.abs(x) < 5.8 && z >= -230.0 && z <= 32.0) {
    const roadDist = Math.abs(x);
    if (roadDist < 3.8) {
      raw = 0.05;
      blend = 1.0;
    } else {
      const f = (roadDist - 3.8) / (5.8 - 3.8);
      raw = THREE.MathUtils.lerp(0.05, raw, f * f);
    }
  }

  return raw * blend;
}

export const colliders = [];
export const lockedDoors = [];
export const houseObjects = [];
export let roadObject = null;

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
  },
  {
    id: 'shotgun_darrell',
    pos: new THREE.Vector3(-12.8, 1.1, -7.0),
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
      } else if (item.id === 'shotgun_darrell') {
        state.player.weapon = 'pump';
        state.player.maxClip = 8;
        state.player.clip = 8;
        state.player.reserve = 32;
        if (window.__equipDarrellShotgun) window.__equipDarrellShotgun();
        Sfx.playPumpRack();
        showPickupAlert(`MENEMUKAN SENAPAN LARAS GANDA DARRELL & 40 SHELLS!`);
        if (window.__triggerDarrellPickup) window.__triggerDarrellPickup();
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
  coldbrookGroup = new THREE.Group();
  coldbrookGroup.name = 'Coldbrook_Village_World';
  scene.add(coldbrookGroup);

  const origSceneAdd = scene.add.bind(scene);
  scene.add = (...objs) => {
    for (let i = 0; i < objs.length; i++) {
      if (objs[i] !== coldbrookGroup) coldbrookGroup.add(objs[i]);
    }
    return scene;
  };

  const {
    snowTex,
    beachSandTex,
    wetBeachSandTex,
    oceanWaterTex,
    shorelineFoamTex,
    chainlinkTex,
    houseWallTex,
    woodPlanksTex,
    brickHearthTex,
    creamCabinTex,
    creamBarnTex,
    creamStoneTex,
    asphaltRoadTex
  } = textures;

  // Undulating Natural Forest Ground Mesh (Expanded 460m Expanse - Infinite snowy & coastal horizon past boundary)
  const groundGeo = new THREE.PlaneGeometry(TERRAIN_LIMIT * 2, TERRAIN_LIMIT * 2, 160, 160);
  groundGeo.rotateX(-Math.PI / 2);
  const posAttr = groundGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vz = posAttr.getZ(i);
    posAttr.setY(i, getTerrainHeight(vx, vz));
  }
  groundGeo.computeVertexNormals();

  if (snowTex) {
    snowTex.repeat.set(130, 130);
  }
  const groundMat = new THREE.MeshLambertMaterial({ map: snowTex, flatShading: false });
  const groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.receiveShadow = true;
  groundMeshRef = groundMesh;
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

    // Pickups in house (Optimized Emissive Materials: Zero PointLight Draw Call Overhead)
    const ammoBoxGroup = new THREE.Group();
    ammoBoxGroup.position.set(1.8, 0.95, -1.0);
    const ammoBoxMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.28, 0.4),
      new THREE.MeshLambertMaterial({ color: 0x93242b, emissive: 0xaa2222, emissiveIntensity: 0.7, flatShading: true })
    );
    ammoBoxGroup.add(ammoBoxMesh);
    house.add(ammoBoxGroup);

    const vitalFlaskGroup = new THREE.Group();
    vitalFlaskGroup.position.set(-0.6, 2.7, -halfD + 0.6);
    const flaskMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.16, 0.42, 6),
      new THREE.MeshLambertMaterial({ color: 0x33b8ff, emissive: 0x2288cc, emissiveIntensity: 0.7, flatShading: true })
    );
    vitalFlaskGroup.add(flaskMesh);
    house.add(vitalFlaskGroup);

    // Darrell's Double-Barrel Shotgun on wooden table
    const darrellShotgunGroup = new THREE.Group();
    darrellShotgunGroup.position.set(0.2, 0.98, -1.0);
    const sgBarrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, 0.78, 8),
      new THREE.MeshStandardMaterial({ color: 0x2a2c30, metalness: 0.85, roughness: 0.35 })
    );
    sgBarrel.rotation.z = Math.PI / 2;
    darrellShotgunGroup.add(sgBarrel);
    const sgStock = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.075, 0.05),
      new THREE.MeshLambertMaterial({ color: 0x5a3219, emissive: 0x281408, emissiveIntensity: 0.5 })
    );
    sgStock.position.set(-0.35, -0.02, 0);
    darrellShotgunGroup.add(sgStock);
    house.add(darrellShotgunGroup);

    if (housePickups.length >= 3) {
      housePickups[0].mesh = ammoBoxGroup;
      housePickups[0].pos.set(x + 1.8, 0.95, z - 1.0);
      housePickups[1].mesh = vitalFlaskGroup;
      housePickups[1].pos.set(x - 0.6, 2.7, z - halfD + 0.6);
      housePickups[2].mesh = darrellShotgunGroup;
      housePickups[2].pos.set(x + 0.2, 0.98, z - 1.0);
    }

    house.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    houseObjects.push(house);
    scene.add(house);

    // Colliders (tagged with category: 'house')
    const addHouseCol = (minX, maxX, minZ, maxZ) => {
      colliders.push({ minX, maxX, minZ, maxZ, category: 'house', disabled: false });
    };
    addHouseCol(x - 5.3, x + 5.3, z - halfD - 0.35, z - halfD + 0.35);
    addHouseCol(x + halfW - 0.35, x + halfW + 0.35, z - halfD, z + halfD + 0.35);
    addHouseCol(x - halfW - 0.35, x - halfW + 0.35, z - halfD, z - 2.0);
    addHouseCol(x - halfW - 0.35, x - halfW + 0.35, z + 2.0, z + halfD + 0.35);

    const pLeft = x - halfW - porchW + 0.2;
    const pBack = z + 1.5 - porchD / 2;
    const pFront = z + 1.5 + porchD / 2;
    addHouseCol(pLeft - 0.35, pLeft + 0.35, pBack - 0.2, pFront + 0.2);
    addHouseCol(pLeft, x - halfW + 0.2, pBack - 0.35, pBack + 0.35);
    addHouseCol(pLeft, x - halfW + 0.2, pFront - 0.35, pFront + 0.35);

    addHouseCol(x - 5.3, x + 1.6, z + halfD - 0.35, z + halfD + 0.35);
    addHouseCol(x - 2.5, x + 1.1, z + halfD + 0.35, z + halfD + 1.6);
    addHouseCol(x + 3.4, x + 5.3, z + halfD - 0.35, z + halfD + 0.35);
    addHouseCol(x + 0.7, x + 2.9, z - 1.7, z - 0.3);
    addHouseCol(x - 2.8, x - 0.2, z - halfD, z - halfD + 0.9);
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
    houseObjects.push(hGroup);
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
      maxZ: z + extentZ,
      category: 'house',
      disabled: false
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

  // 5. Fallen Timber Logs in the Snow
  function makeForestRock(x, z, sc = 1.0) {}

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

      // Keep trees out of Christian Cemetery clearing [-46, -14], [-46, -14]
      if (x >= -46.0 && x <= -14.0 && z >= -46.0 && z <= -14.0) continue;

      // Cabins and shacks clearings
      if (Math.hypot(x - 18, z - 6) < 7.5) continue;
      if (Math.hypot(x - 22, z - (-20)) < 8.0) continue;
      if (Math.hypot(x - (-22), z - 22) < 7.5) continue;
      if (Math.hypot(x - 16, z - 28) < 7.5) continue;

      // Keep trees off the mountain highway & open road corridor
      if (Math.abs(x) < 5.2 && z >= -230.0 && z <= 32.0) continue;

      // Keep trees out of the Coastal Beach & Sand Dunes zone (z >= 76)
      if (z >= 76.0) continue;

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

    // Outer forest pines stretching far out into the snow (r = 100m to 195m, excluding southern beach)
    for (let i = 0; i < 90; i++) {
      const a = (i / 90) * Math.PI * 2;
      const r = 100 + Math.random() * 85;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (z > 76.0) continue; // Keep southern beach open
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

      pineTrunkMesh.castShadow = false;
      pineTrunkMesh.receiveShadow = true;
      pineFoliageMesh.castShadow = false;
      pineFoliageMesh.receiveShadow = true;
      pineSnowMesh.castShadow = false;
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

      bareTrunkMesh.castShadow = false;
      bareTrunkMesh.receiveShadow = true;
      bareBranchMesh.castShadow = false;
      bareBranchMesh.receiveShadow = true;
      bareSnowMesh.castShadow = false;
      bareSnowMesh.receiveShadow = true;

      scene.add(bareTrunkMesh);
      scene.add(bareBranchMesh);
      scene.add(bareSnowMesh);
    }
  }

  // World Boundary Chainlink Security Perimeter Fence (PS1/PS2 Survival Horror Style)
  function buildChainlinkBoundaryFence(scene, chainlinkTex) {
    const fenceH = 5.2; // Tall 5.2m security perimeter
    const limit = MAP_LIMIT; // 90m
    const fenceGroup = new THREE.Group();
    fenceGroup.name = 'World_Boundary_Chainlink_Fence';

    // Chainlink wire mesh material with alphaTest for clean transparent diamond cutouts (opaque pipeline prevents distance graying)
    const chainlinkMat = new THREE.MeshStandardMaterial({
      map: chainlinkTex,
      alphaTest: 0.45,
      transparent: false,
      side: THREE.DoubleSide,
      metalness: 0.5,
      roughness: 0.45,
      color: 0xdde7ee,
      depthWrite: true
    });

    // Dark weathered galvanized steel for posts, top rails, and support brackets
    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x333a40,
      metalness: 0.6,
      roughness: 0.55,
      flatShading: true
    });

    // Tension / barbed wire line material
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x22282e
    });

    // Procedural Warning / Quarantine sign texture
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 128;
    signCanvas.height = 64;
    const sctx = signCanvas.getContext('2d');
    sctx.fillStyle = '#cfc9be';
    sctx.fillRect(0, 0, 128, 64);
    sctx.fillStyle = '#a62626';
    sctx.fillRect(4, 4, 120, 22);
    sctx.fillStyle = '#ffffff';
    sctx.font = 'bold 15px monospace';
    sctx.textAlign = 'center';
    sctx.textBaseline = 'middle';
    sctx.fillText('DANGER', 64, 15);
    sctx.fillStyle = '#1c1b18';
    sctx.font = 'bold 10px monospace';
    sctx.fillText('QUARANTINE ZONE', 64, 36);
    sctx.font = '8px monospace';
    sctx.fillText('UNAUTHORIZED ENTRY FORBIDDEN', 64, 50);
    // Weathering scratches
    sctx.fillStyle = 'rgba(70, 40, 20, 0.45)';
    for (let i = 0; i < 30; i++) {
      sctx.fillRect(Math.random() * 128, Math.random() * 64, 2, 2);
    }
    const signTex = new THREE.CanvasTexture(signCanvas);
    signTex.magFilter = THREE.NearestFilter;
    const signMat = new THREE.MeshStandardMaterial({
      map: signTex,
      metalness: 0.2,
      roughness: 0.8,
      side: THREE.DoubleSide
    });
    const signGeo = new THREE.PlaneGeometry(1.6, 0.8);

    const step = 5.0; // 5 meters per section
    const stepCount = Math.round((limit * 2) / step); // 36 panels per side
    const actualStep = (limit * 2) / stepCount;

    // Shared panel geometry with custom UV mapping so diamonds are realistically proportioned (~14cm diamond openings)
    const panelGeo = new THREE.PlaneGeometry(actualStep + 0.08, fenceH + 0.8);
    const uvAttr = panelGeo.attributes.uv;
    const uRepeat = actualStep * 1.5;
    const vRepeat = (fenceH + 0.8) * 1.5;
    for (let i = 0; i < uvAttr.count; i++) {
      uvAttr.setX(i, uvAttr.getX(i) * uRepeat);
      uvAttr.setY(i, uvAttr.getY(i) * vRepeat);
    }
    uvAttr.needsUpdate = true;

    // Shared rail and post geometries
    const postGeo = new THREE.CylinderGeometry(0.08, 0.08, fenceH + 1.1, 8);
    const postCapGeo = new THREE.SphereGeometry(0.095, 6, 6);
    const railGeo = new THREE.CylinderGeometry(0.042, 0.042, actualStep + 0.08, 8);
    railGeo.rotateZ(Math.PI / 2);
    const midWireGeo = new THREE.CylinderGeometry(0.02, 0.02, actualStep + 0.08, 6);
    midWireGeo.rotateZ(Math.PI / 2);
    const armGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.75, 6);
    const barbWireGeo = new THREE.CylinderGeometry(0.015, 0.015, actualStep + 0.08, 4);
    barbWireGeo.rotateZ(Math.PI / 2);

    const sides = [
      // North Wall (z = -limit)
      { dir: 'N', p1: { x: -limit, z: -limit }, p2: { x: limit, z: -limit }, rotY: 0, inward: { x: 0, z: 1 } },
      // East Wall (x = limit)
      { dir: 'E', p1: { x: limit, z: -limit }, p2: { x: limit, z: limit }, rotY: -Math.PI / 2, inward: { x: -1, z: 0 } },
      // South Wall (z = limit)
      { dir: 'S', p1: { x: limit, z: limit }, p2: { x: -limit, z: limit }, rotY: Math.PI, inward: { x: 0, z: -1 } },
      // West Wall (x = -limit)
      { dir: 'W', p1: { x: -limit, z: limit }, p2: { x: -limit, z: -limit }, rotY: Math.PI / 2, inward: { x: 1, z: 0 } }
    ];

    sides.forEach(side => {
      const dx = (side.p2.x - side.p1.x) / stepCount;
      const dz = (side.p2.z - side.p1.z) / stepCount;

      for (let i = 0; i < stepCount; i++) {
        // Section node 1 (post position)
        const x1 = side.p1.x + dx * i;
        const z1 = side.p1.z + dz * i;
        const y1 = getTerrainHeight(x1, z1);

        // Section node 2
        const x2 = side.p1.x + dx * (i + 1);
        const z2 = side.p1.z + dz * (i + 1);
        const y2 = getTerrainHeight(x2, z2);

        // Section center
        const cx = (x1 + x2) / 2;
        const cz = (z1 + z2) / 2;
        const cy = getTerrainHeight(cx, cz);

        // 1. Vertical Post at node 1
        const post = new THREE.Mesh(postGeo, metalMat);
        post.position.set(x1, y1 + (fenceH + 1.1) / 2 - 0.4, z1);
        fenceGroup.add(post);

        const cap = new THREE.Mesh(postCapGeo, metalMat);
        cap.position.set(x1, y1 + fenceH + 0.45, z1);
        fenceGroup.add(cap);

        // Angled Barbed Wire Top Arm (tilted 45 degrees inwards toward map center)
        const arm = new THREE.Mesh(armGeo, metalMat);
        arm.position.set(
          x1 + side.inward.x * 0.22,
          y1 + fenceH + 0.68,
          z1 + side.inward.z * 0.22
        );
        if (side.dir === 'N') arm.rotation.set(0.65, 0, 0);
        else if (side.dir === 'S') arm.rotation.set(-0.65, 0, 0);
        else if (side.dir === 'E') arm.rotation.set(0, 0, 0.65);
        else if (side.dir === 'W') arm.rotation.set(0, 0, -0.65);
        fenceGroup.add(arm);

        // 2. Chainlink Mesh Panel
        const panel = new THREE.Mesh(panelGeo, chainlinkMat);
        panel.position.set(cx, cy + fenceH / 2, cz);
        panel.rotation.y = side.rotY;
        fenceGroup.add(panel);

        // 3. Horizontal Top Rail Pipe
        const topRail = new THREE.Mesh(railGeo, metalMat);
        topRail.position.set(cx, cy + fenceH + 0.25, cz);
        topRail.rotation.y = side.rotY;
        fenceGroup.add(topRail);

        // 4. Horizontal Bottom Rail Pipe (just above snow ground)
        const botRail = new THREE.Mesh(railGeo, metalMat);
        botRail.position.set(cx, cy + 0.15, cz);
        botRail.rotation.y = side.rotY;
        fenceGroup.add(botRail);

        // 5. Middle Tension Wire
        const midWire = new THREE.Mesh(midWireGeo, wireMat);
        midWire.position.set(cx, cy + fenceH * 0.5, cz);
        midWire.rotation.y = side.rotY;
        fenceGroup.add(midWire);

        // 6. Angled Barbed Wire Strands (3 strands running horizontally along fence top)
        for (let b = 1; b <= 3; b++) {
          const barbStrand = new THREE.Mesh(barbWireGeo, wireMat);
          const armOffset = b * 0.14;
          barbStrand.position.set(
            cx + side.inward.x * armOffset,
            cy + fenceH + 0.40 + armOffset * 0.9,
            cz + side.inward.z * armOffset
          );
          barbStrand.rotation.y = side.rotY;
          fenceGroup.add(barbStrand);
        }

        // 7. Danger / Quarantine Signs (every 7 panels)
        if (i % 7 === 3) {
          const sign = new THREE.Mesh(signGeo, signMat);
          // Position slightly in front of the mesh toward player
          sign.position.set(
            cx + side.inward.x * 0.06,
            cy + 2.5,
            cz + side.inward.z * 0.06
          );
          sign.rotation.y = side.rotY;
          fenceGroup.add(sign);
        }
      }
    });

    scene.add(fenceGroup);
  }

  // 8. Winding Alpine Mountain River & Cascading Waterfall Generator
  function buildRiverAndWaterfall(scene, textures) {
    const { riverWaterTex, waterfallTex, waterfallMistTex, topStreamTex, crestFoamTex, woodPlanksTex } = textures;

    // A. Winding Curved Mountain River Ribbon Mesh
    const riverSegments = 160;
    const startZ = -58.0;
    const endZ = 126.0; // Flows into the coastal ocean bay at the beach
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
      const curHalfW = riverHalfW * (z > 78.0 ? (1.0 + (z - 78.0) * 0.024) : 1.0);

      // Left bank vertex
      riverPositions.push(cx - curHalfW, wy, z);
      riverNormals.push(0, 1, 0);
      riverUVs.push(0, i * 0.35);

      // Center stream vertex
      riverPositions.push(cx, wy, z);
      riverNormals.push(0, 1, 0);
      riverUVs.push(0.5, i * 0.35);

      // Right bank vertex
      riverPositions.push(cx + curHalfW, wy, z);
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

    const riverMat = new THREE.MeshStandardMaterial({
      map: riverWaterTex,
      color: 0x168ca8,
      roughness: 0.08,
      metalness: 0.16,
      transparent: true,
      opacity: 0.85,
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
  }

  /**
   * Builds an authentic tropical Coconut Palm Tree (Pohon Kelapa)
   * Curved ringed trunk, radial crown of drooping feathery fronds, and hanging coconuts.
   */
  function buildCoconutPalmTree() {
    const root = new THREE.Group();
    root.name = 'Coconut_Palm_Tree';

    // Materials
    const barkMat = new THREE.MeshLambertMaterial({ color: 0x7c5d3d, flatShading: false });
    const ringMat = new THREE.MeshLambertMaterial({ color: 0x4a3622, flatShading: false });
    const frondMat = new THREE.MeshLambertMaterial({ color: 0x247835, side: THREE.DoubleSide, flatShading: false });
    const frondLightMat = new THREE.MeshLambertMaterial({ color: 0x3aa44e, side: THREE.DoubleSide, flatShading: false });
    const coconutMat = new THREE.MeshLambertMaterial({ color: 0x544026, flatShading: false });

    // 1. Curved Trunk (7 stacked cylinders leaning toward the ocean)
    const segments = 7;
    const totalH = 7.4;
    const segH = totalH / segments;
    const curveDir = (Math.random() - 0.5) * 0.7;
    const leanZ = 0.38 + Math.random() * 0.32; // Leaning seaward

    let curY = 0;
    let curX = 0;
    let curZ = 0;
    let curRotX = 0;
    let curRotZ = 0;

    for (let s = 0; s < segments; s++) {
      const progress = s / segments;
      const botR = 0.35 * (1.0 - progress * 0.44);
      const topR = 0.35 * (1.0 - (progress + 1 / segments) * 0.44);
      const geo = new THREE.CylinderGeometry(topR, botR, segH, 8);
      const mesh = new THREE.Mesh(geo, (s % 2 === 0) ? barkMat : ringMat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      mesh.position.set(curX, curY + segH / 2, curZ);
      mesh.rotation.x = curRotX;
      mesh.rotation.z = curRotZ;
      root.add(mesh);

      curRotX += leanZ * 0.052;
      curRotZ += curveDir * 0.042;
      curY += Math.cos(curRotX) * segH;
      curZ += Math.sin(curRotX) * segH;
      curX += Math.sin(curRotZ) * segH;
    }

    // 2. Crown of Arching Palm Fronds (Daun Kelapa)
    const crownGroup = new THREE.Group();
    crownGroup.position.set(curX, curY, curZ);

    const numFronds = 10;
    for (let f = 0; f < numFronds; f++) {
      const angle = (f / numFronds) * Math.PI * 2 + Math.random() * 0.15;
      const frondGroup = new THREE.Group();
      frondGroup.rotation.y = angle;

      const frondLen = 3.8 + Math.random() * 0.7;
      const leafGeo = new THREE.PlaneGeometry(0.85, frondLen, 3, 6);
      leafGeo.rotateX(Math.PI / 2);
      leafGeo.translate(0, 0, frondLen / 2);

      const pos = leafGeo.attributes.position;
      for (let p = 0; p < pos.count; p++) {
        const pz = pos.getZ(p);
        const droop = Math.pow(pz / frondLen, 2.2) * 1.55;
        pos.setY(p, pos.getY(p) - droop);
      }
      leafGeo.computeVertexNormals();

      const leafMesh = new THREE.Mesh(leafGeo, (f % 2 === 0) ? frondMat : frondLightMat);
      leafMesh.rotation.x = -0.38 - Math.random() * 0.18;
      leafMesh.castShadow = true;
      frondGroup.add(leafMesh);

      crownGroup.add(frondGroup);
    }

    // 3. Cluster of Coconuts (Buah Kelapa)
    const cocoGeo = new THREE.SphereGeometry(0.18, 6, 5);
    for (let c = 0; c < 5; c++) {
      const cAng = (c / 5) * Math.PI * 2;
      const coco = new THREE.Mesh(cocoGeo, coconutMat);
      coco.position.set(Math.cos(cAng) * 0.32, -0.24, Math.sin(cAng) * 0.32);
      coco.castShadow = true;
      crownGroup.add(coco);
    }

    root.add(crownGroup);
    return root;
  }

  // 9. Coastal Beach, Sand Dunes, Ocean Bay & Fishing Pier Generator
  function buildBeachAndCoastline(scene, textures) {
    const { beachSandTex, wetBeachSandTex, oceanWaterTex, shorelineFoamTex, woodPlanksTex } = textures;

    // A. Golden Sand Beach Surface Mesh (curved coastal dunes & river delta banks)
    const sandW = 265;
    const sandD = 60;
    const sandGeo = new THREE.PlaneGeometry(sandW, sandD, 110, 42);
    sandGeo.rotateX(-Math.PI / 2);
    const sandPos = sandGeo.attributes.position;
    for (let i = 0; i < sandPos.count; i++) {
      const vx = sandPos.getX(i);
      const edgeWave = Math.sin(vx * 0.075) * 5.2 + Math.cos(vx * 0.13) * 2.8;
      const baseVz = sandPos.getZ(i) + 104.0;
      const vz = (baseVz < 98.0) ? (baseVz + edgeWave * Math.max(0, 1.0 - (baseVz - 74.0) / 24.0)) : baseVz;
      sandPos.setZ(i, vz);
      sandPos.setY(i, getTerrainHeight(vx, vz) + 0.035);
    }
    sandGeo.computeVertexNormals();

    const sandMat = new THREE.MeshLambertMaterial({
      map: beachSandTex,
      flatShading: false
    });
    beachSandMesh = new THREE.Mesh(sandGeo, sandMat);
    beachSandMesh.receiveShadow = true;
    scene.add(beachSandMesh);

    // B. Wet Dark Sand Shoreline Ribbon (along surf edge z: 123 to 132)
    const wetW = 265;
    const wetD = 10.0;
    const wetGeo = new THREE.PlaneGeometry(wetW, wetD, 90, 8);
    wetGeo.rotateX(-Math.PI / 2);
    const wetPos = wetGeo.attributes.position;
    for (let i = 0; i < wetPos.count; i++) {
      const vx = wetPos.getX(i);
      const vz = wetPos.getZ(i) + 127.0;
      wetPos.setZ(i, vz);
      wetPos.setY(i, getTerrainHeight(vx, vz) + 0.048);
    }
    wetGeo.computeVertexNormals();

    const wetMat = new THREE.MeshStandardMaterial({
      map: wetBeachSandTex,
      roughness: 0.32,
      metalness: 0.22,
      flatShading: false
    });
    wetBeachSandMesh = new THREE.Mesh(wetGeo, wetMat);
    wetBeachSandMesh.receiveShadow = true;
    scene.add(wetBeachSandMesh);

    // C. Expansive Ocean Water Surface with Dynamic Small Waves (z: 125.0 to 255.0, sea level -2.52m)
    const oceanW = 460;
    const oceanD = 145;
    const oceanGeo = new THREE.PlaneGeometry(oceanW, oceanD, 140, 70);
    oceanGeo.rotateX(-Math.PI / 2);
    oceanGeo.translate(0, -2.52, 195.0);

    oceanBasePositions = new Float32Array(oceanGeo.attributes.position.array);

    const oceanMat = new THREE.MeshStandardMaterial({
      map: oceanWaterTex,
      color: 0x168ca8, // Vibrant Caribbean/tropical ocean aqua-blue
      roughness: 0.06,
      metalness: 0.15,
      transparent: true,
      opacity: 0.86
    });
    oceanWaterMesh = new THREE.Mesh(oceanGeo, oceanMat);
    oceanWaterMesh.receiveShadow = true;
    scene.add(oceanWaterMesh);

    // D. Primary Shoreline Wave Breaker Foam Line (z ~ 126.8)
    const foamGeo = new THREE.PlaneGeometry(265, 4.6, 64, 4);
    foamGeo.rotateX(-Math.PI / 2);
    foamGeo.translate(0, -2.46, 126.8);

    const foamMat = new THREE.MeshBasicMaterial({
      map: shorelineFoamTex,
      transparent: true,
      opacity: 0.82,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    oceanShorelineFoam = new THREE.Mesh(foamGeo, foamMat);
    scene.add(oceanShorelineFoam);

    // D2. Secondary Rolling Surf Wave Ribbon (advances onto the wet sand)
    const foamGeo2 = new THREE.PlaneGeometry(265, 3.8, 64, 2);
    foamGeo2.rotateX(-Math.PI / 2);
    foamGeo2.translate(0, -2.43, 125.4);

    const foamMat2 = new THREE.MeshBasicMaterial({
      map: shorelineFoamTex,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    oceanSecondaryFoam = new THREE.Mesh(foamGeo2, foamMat2);
    scene.add(oceanSecondaryFoam);

    // Plant Tropical Coconut Palm Trees (Pohon Kelapa) along the beach sand dunes
    const palmPositions = [
      { x: -88, z: 86 }, { x: -75, z: 98 }, { x: -62, z: 110 }, { x: -50, z: 82 },
      { x: -42, z: 104 }, { x: -35, z: 118 }, { x: -28, z: 92 }, { x: -22, z: 112 },
      { x: -14, z: 85 }, { x: -8, z: 102 }, { x: -2, z: 116 }, { x: 5, z: 90 },
      { x: 24, z: 88 }, { x: 30, z: 106 }, { x: 36, z: 118 }, { x: 48, z: 84 },
      { x: 54, z: 98 }, { x: 60, z: 114 }, { x: 68, z: 88 }, { x: 74, z: 105 },
      { x: 82, z: 116 }, { x: 92, z: 92 }, { x: 98, z: 108 }, { x: 105, z: 85 },
      { x: -68, z: 92 }, { x: -55, z: 115 }, { x: -18, z: 98 }, { x: 26, z: 115 },
      { x: 40, z: 92 }, { x: 62, z: 86 }, { x: 78, z: 98 }, { x: 88, z: 112 }
    ];

    palmPositions.forEach(p => {
      // Avoid lower river delta mouth around x: 42
      if (Math.abs(p.x - getRiverCenterX(p.z)) < 8.0) return;
      // Avoid wooden fishing pier at x: 14, z: 112..138
      if (Math.abs(p.x - 14.0) < 5.0 && p.z >= 110.0) return;

      const palm = buildCoconutPalmTree();
      const gy = getTerrainHeight(p.x, p.z);
      palm.position.set(p.x, gy - 0.05, p.z);
      palm.rotation.y = Math.random() * Math.PI * 2;
      const s = 0.88 + Math.random() * 0.28;
      palm.scale.set(s, s, s);
      scene.add(palm);
      beachPalmTrees.push(palm);

      // Add trunk collider
      colliders.push({
        minX: p.x - 0.45,
        maxX: p.x + 0.45,
        minZ: p.z - 0.45,
        maxZ: p.z + 0.45
      });
    });

    // E. Rustic Wooden Coastal Fishing Pier
    const pierGroup = new THREE.Group();
    pierGroup.name = 'Coastal_Fishing_Pier';

    const woodDeckMat = new THREE.MeshStandardMaterial({
      map: woodPlanksTex,
      roughness: 0.75,
      metalness: 0.12
    });
    const darkWoodMat = new THREE.MeshStandardMaterial({
      color: 0x2b211a,
      roughness: 0.85,
      metalness: 0.1
    });

    // Main Deck Planking (26m long, 3.4m wide, elevation -1.55m)
    const deckGeo = new THREE.BoxGeometry(3.4, 0.22, 26.0);
    const deckMesh = new THREE.Mesh(deckGeo, woodDeckMat);
    deckMesh.position.set(14.0, -1.55, 125.0);
    deckMesh.castShadow = true;
    deckMesh.receiveShadow = true;
    pierGroup.add(deckMesh);

    // Supporting Timber Pilings & Cross-Braces
    const pilingGeo = new THREE.CylinderGeometry(0.18, 0.22, 5.2, 8);
    const braceGeo = new THREE.BoxGeometry(0.12, 0.18, 3.8);

    const pilingZList = [113, 117, 121, 125, 129, 133, 137];
    pilingZList.forEach(pz => {
      // Left & Right pilings
      for (const side of [-1, 1]) {
        const px = 14.0 + side * 1.5;
        const piling = new THREE.Mesh(pilingGeo, darkWoodMat);
        piling.position.set(px, -3.2, pz);
        pierGroup.add(piling);

        // Vertical Railing Post
        const postGeo = new THREE.CylinderGeometry(0.065, 0.075, 1.15, 6);
        const post = new THREE.Mesh(postGeo, darkWoodMat);
        post.position.set(px, -0.92, pz);
        pierGroup.add(post);
      }

      // Cross-brace
      const brace = new THREE.Mesh(braceGeo, darkWoodMat);
      brace.position.set(14.0, -2.2, pz);
      pierGroup.add(brace);
    });

    // Horizontal Handrails
    const railGeo = new THREE.CylinderGeometry(0.045, 0.045, 26.0, 8);
    railGeo.rotateX(Math.PI / 2);
    for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(railGeo, darkWoodMat);
      rail.position.set(14.0 + side * 1.5, -0.42, 125.0);
      pierGroup.add(rail);

      const midRail = new THREE.Mesh(railGeo, darkWoodMat);
      midRail.position.set(14.0 + side * 1.5, -0.95, 125.0);
      pierGroup.add(midRail);
    }

    // End Barrier Railing
    const endRailGeo = new THREE.CylinderGeometry(0.045, 0.045, 3.2, 8);
    endRailGeo.rotateZ(Math.PI / 2);
    const endRail = new THREE.Mesh(endRailGeo, darkWoodMat);
    endRail.position.set(14.0, -0.42, 137.9);
    pierGroup.add(endRail);

    // Vintage Brass Hanging Lanterns at Pier End
    const lanternMat = new THREE.MeshStandardMaterial({ color: 0x3a2c18, metalness: 0.85, roughness: 0.35 });
    const lanternGlassMat = new THREE.MeshBasicMaterial({ color: 0xffaa33 });
    for (const side of [-1, 1]) {
      const lx = 14.0 + side * 1.5;
      const lz = 137.5;
      const lanternArmGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.6, 6);
      const lanternArm = new THREE.Mesh(lanternArmGeo, lanternMat);
      lanternArm.position.set(lx, -0.22, lz);
      pierGroup.add(lanternArm);

      const lanternBoxGeo = new THREE.BoxGeometry(0.24, 0.35, 0.24);
      const lanternBox = new THREE.Mesh(lanternBoxGeo, lanternGlassMat);
      lanternBox.position.set(lx, -0.45, lz);
      pierGroup.add(lanternBox);

      const pierLight = new THREE.PointLight(0xff9933, 2.4, 12.0);
      pierLight.position.set(lx, -0.45, lz);
      pierGroup.add(pierLight);
    }

    // Pier Railing Colliders
    colliders.push({ minX: 12.1, maxX: 12.6, minZ: 114.0, maxZ: 138.0 });
    colliders.push({ minX: 15.4, maxX: 15.9, minZ: 114.0, maxZ: 138.0 });
    colliders.push({ minX: 12.1, maxX: 15.9, minZ: 137.6, maxZ: 138.3 });

    scene.add(pierGroup);

    // F. Abandoned Weathered Fishing Rowboat in the Sand Dunes
    const boatGroup = new THREE.Group();
    boatGroup.name = 'Beached_Fishing_Boat';
    boatGroup.position.set(44.0, getTerrainHeight(44.0, 116.0) + 0.12, 116.0);
    boatGroup.rotation.set(0.18, 0.42, -0.22);

    const boatMat = new THREE.MeshStandardMaterial({
      color: 0x3e454b,
      roughness: 0.85,
      metalness: 0.15
    });
    const boatTrimMat = new THREE.MeshStandardMaterial({
      color: 0x6e3828,
      roughness: 0.75
    });

    const keelGeo = new THREE.BoxGeometry(1.6, 0.55, 4.4);
    const keelMesh = new THREE.Mesh(keelGeo, boatMat);
    boatGroup.add(keelMesh);

    const bowGeo = new THREE.ConeGeometry(0.85, 1.4, 5);
    bowGeo.rotateX(Math.PI / 2);
    const bowMesh = new THREE.Mesh(bowGeo, boatMat);
    bowMesh.position.set(0, 0.05, 2.7);
    boatGroup.add(bowMesh);

    for (const bz of [-1.1, 0.3, 1.5]) {
      const seatGeo = new THREE.BoxGeometry(1.5, 0.08, 0.38);
      const seatMesh = new THREE.Mesh(seatGeo, boatTrimMat);
      seatMesh.position.set(0, 0.28, bz);
      boatGroup.add(seatMesh);
    }

    const oarGeo = new THREE.CylinderGeometry(0.03, 0.03, 3.2, 6);
    oarGeo.rotateZ(0.35);
    const oar1 = new THREE.Mesh(oarGeo, woodDeckMat);
    oar1.position.set(0.4, 0.42, 0.2);
    boatGroup.add(oar1);

    colliders.push({ minX: 42.6, maxX: 45.4, minZ: 114.2, maxZ: 118.2 });
    scene.add(boatGroup);

    // G. Coastal Driftwood Trunks
    const driftwoodMat = new THREE.MeshStandardMaterial({
      color: 0x5a554c,
      roughness: 0.92,
      metalness: 0.05
    });
    const logConfigs = [
      { x: -16.0, z: 104.0, rotY: 0.85, len: 6.5, rad: 0.32 },
      { x: 56.0, z: 112.0, rotY: -0.65, len: 5.4, rad: 0.28 },
      { x: -52.0, z: 115.0, rotY: 1.25, len: 7.2, rad: 0.38 },
      { x: 88.0, z: 118.0, rotY: -0.4, len: 4.8, rad: 0.26 }
    ];
    logConfigs.forEach(cfg => {
      const logGeo = new THREE.CylinderGeometry(cfg.rad * 0.85, cfg.rad, cfg.len, 7);
      logGeo.rotateZ(Math.PI / 2);
      const logMesh = new THREE.Mesh(logGeo, driftwoodMat);
      const gy = getTerrainHeight(cfg.x, cfg.z);
      logMesh.position.set(cfg.x, gy + cfg.rad * 0.5, cfg.z);
      logMesh.rotation.y = cfg.rotY;
      scene.add(logMesh);

      colliders.push({
        minX: cfg.x - cfg.len * 0.35,
        maxX: cfg.x + cfg.len * 0.35,
        minZ: cfg.z - cfg.rad * 1.5,
        maxZ: cfg.z + cfg.rad * 1.5
      });
    });


    // I. Coastal Dune Grass & Reeds along the snow-sand transition
    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x9e9168,
      roughness: 0.85,
      flatShading: true,
      side: THREE.DoubleSide
    });
    const bladeGeo = new THREE.ConeGeometry(0.12, 1.4, 4);
    for (let g = 0; g < 32; g++) {
      const gx = -85 + Math.random() * 170;
      if (Math.abs(gx - getRiverCenterX(84)) < 8.0) continue;
      const gz = 78 + Math.random() * 22;
      const gy = getTerrainHeight(gx, gz);
      const clump = new THREE.Group();
      clump.position.set(gx, gy + 0.45, gz);
      for (let b = 0; b < 6; b++) {
        const blade = new THREE.Mesh(bladeGeo, grassMat);
        blade.position.set((Math.random() - 0.5) * 0.4, 0, (Math.random() - 0.5) * 0.4);
        blade.rotation.set((Math.random() - 0.5) * 0.35, Math.random() * Math.PI, (Math.random() - 0.5) * 0.35);
        clump.add(blade);
      }
      scene.add(clump);
    }
  }

  // 10. Ancient Misty Christian Cemetery (Kuburan Kristen Berlumut, Salib-Salib Kuno, Makam Peti Batu & Gapura Besi)
  function buildChristianCemetery(scene, textures) {
    const root = new THREE.Group();
    root.name = 'Ancient_Christian_Cemetery';

    // Weathered Gothic Materials
    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x3d4745, flatShading: false });
    const stoneDarkMat = new THREE.MeshLambertMaterial({ color: 0x2b3433, flatShading: false });
    const mossStoneMat = new THREE.MeshLambertMaterial({ color: 0x30423c, flatShading: false });
    const woodCrossMat = new THREE.MeshLambertMaterial({ color: 0x261f1a, flatShading: false });
    const earthMoundMat = new THREE.MeshLambertMaterial({ color: 0x1b2c2a, flatShading: false });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x182022, roughness: 0.85, metalness: 0.65 });
    const candleGlowMat = new THREE.MeshBasicMaterial({ color: 0xffb347 });
    const brassMat = new THREE.MeshLambertMaterial({ color: 0x483a22, flatShading: false });
    const deadWoodMat = new THREE.MeshLambertMaterial({ color: 0x231e1a, flatShading: false });

    // A. Central Monumental Crucifix (Salib Kristen Batu Utama / High Cross)
    const centerX = -31.0;
    const centerZ = -31.0;
    const centerBaseY = getTerrainHeight(centerX, centerZ);

    const monument = new THREE.Group();
    monument.position.set(centerX, centerBaseY, centerZ);

    // 3-tier stepped square plinth
    const t1 = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.4, 3.6), stoneMat);
    t1.position.y = 0.2;
    t1.castShadow = true; t1.receiveShadow = true;
    monument.add(t1);

    const t2 = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.35, 2.6), stoneDarkMat);
    t2.position.y = 0.575;
    t2.castShadow = true; t2.receiveShadow = true;
    monument.add(t2);

    const t3 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.4, 1.8), stoneMat);
    t3.position.y = 0.95;
    t3.castShadow = true; t3.receiveShadow = true;
    monument.add(t3);

    // Tall vertical cross shaft
    const shaftH = 4.4;
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.38, shaftH, 0.38), stoneMat);
    shaft.position.y = 1.15 + shaftH / 2;
    shaft.castShadow = true; shaft.receiveShadow = true;
    monument.add(shaft);

    // Horizontal crossbeam
    const beamW = 2.4;
    const beamY = 1.15 + shaftH * 0.72;
    const crossbeam = new THREE.Mesh(new THREE.BoxGeometry(beamW, 0.38, 0.36), stoneMat);
    crossbeam.position.y = beamY;
    crossbeam.castShadow = true; crossbeam.receiveShadow = true;
    monument.add(crossbeam);

    // Celtic stone halo ring connecting the arms
    const haloGeo = new THREE.TorusGeometry(0.68, 0.08, 6, 16);
    const halo = new THREE.Mesh(haloGeo, stoneDarkMat);
    halo.position.set(0, beamY, 0);
    halo.castShadow = true;
    monument.add(halo);

    // Raised relief inner Latin cross on front & back faces
    for (let fz of [0.20, -0.20]) {
      const innerReliefV = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.8, 0.06), mossStoneMat);
      innerReliefV.position.set(0, 1.15 + shaftH / 2, fz);
      monument.add(innerReliefV);

      const innerReliefH = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.18, 0.06), mossStoneMat);
      innerReliefH.position.set(0, beamY, fz);
      monument.add(innerReliefH);
    }

    // 4 Brass Lanterns at the corners of Tier 1 with flickering amber glow
    const lanternOffsets = [
      [-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]
    ];
    lanternOffsets.forEach(([lx, lz], idx) => {
      const lantGroup = new THREE.Group();
      lantGroup.position.set(lx, 0.4, lz);

      const lantBase = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.35, 0.24), brassMat);
      lantBase.position.y = 0.175;
      lantGroup.add(lantBase);

      const flame = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), candleGlowMat);
      flame.position.y = 0.26;
      lantGroup.add(flame);

      const lantLight = new THREE.PointLight(0xffa834, 1.1, 9.0, 1.5);
      lantLight.position.y = 0.30;
      lantGroup.add(lantLight);

      cemeteryCandles.push({ light: lantLight, flame, baseIntensity: 1.1, seed: idx * 2.3 });
      monument.add(lantGroup);
    });

    colliders.push({
      minX: centerX - 1.9, maxX: centerX + 1.9,
      minZ: centerZ - 1.9, maxZ: centerZ + 1.9,
      category: 'cemetery'
    });
    root.add(monument);

    // Helper: Create Standing Stone Latin Cross (Salib Nisan Batu)
    function addStoneCross(x, z, scale = 1.0, rotY = 0, tiltX = 0, tiltZ = 0) {
      const cy = getTerrainHeight(x, z);
      const crossGroup = new THREE.Group();
      crossGroup.position.set(x, cy, z);
      crossGroup.rotation.y = rotY;
      crossGroup.rotation.x = tiltX;
      crossGroup.rotation.z = tiltZ;

      // Base plinth
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.7 * scale, 0.25 * scale, 0.7 * scale), stoneDarkMat);
      plinth.position.y = 0.125 * scale;
      plinth.castShadow = true; plinth.receiveShadow = true;
      crossGroup.add(plinth);

      // Shaft
      const hShaft = 2.0 * scale;
      const cShaft = new THREE.Mesh(new THREE.BoxGeometry(0.24 * scale, hShaft, 0.22 * scale), stoneMat);
      cShaft.position.y = 0.25 * scale + hShaft / 2;
      cShaft.castShadow = true; cShaft.receiveShadow = true;
      crossGroup.add(cShaft);

      // Crossbeam
      const wBeam = 1.25 * scale;
      const yBeam = 0.25 * scale + hShaft * 0.72;
      const cBeam = new THREE.Mesh(new THREE.BoxGeometry(wBeam, 0.24 * scale, 0.20 * scale), stoneMat);
      cBeam.position.y = yBeam;
      cBeam.castShadow = true; cBeam.receiveShadow = true;
      crossGroup.add(cBeam);

      // Relief cross carving
      const relV = new THREE.Mesh(new THREE.BoxGeometry(0.10 * scale, hShaft * 0.75, 0.04 * scale), mossStoneMat);
      relV.position.set(0, yBeam - 0.1 * scale, 0.12 * scale);
      crossGroup.add(relV);

      // Earth burial mound
      const mound = new THREE.Mesh(new THREE.BoxGeometry(0.85 * scale, 0.26 * scale, 1.8 * scale), earthMoundMat);
      mound.position.set(0, 0.13 * scale, 0.9 * scale);
      crossGroup.add(mound);

      const r = 0.45 * scale;
      colliders.push({ minX: x - r, maxX: x + r, minZ: z - r, maxZ: z + r, category: 'cemetery' });
      root.add(crossGroup);
    }

    // Helper: Create Weathered Wooden Cross (Salib Kayu Kuno)
    function addWoodCross(x, z, scale = 1.0, rotY = 0, tiltX = 0, tiltZ = 0) {
      const cy = getTerrainHeight(x, z);
      const crossGroup = new THREE.Group();
      crossGroup.position.set(x, cy, z);
      crossGroup.rotation.y = rotY;
      crossGroup.rotation.x = tiltX;
      crossGroup.rotation.z = tiltZ;

      // Vertical post
      const hPost = 1.75 * scale;
      const vPost = new THREE.Mesh(new THREE.BoxGeometry(0.14 * scale, hPost, 0.12 * scale), woodCrossMat);
      vPost.position.y = hPost / 2;
      vPost.castShadow = true; vPost.receiveShadow = true;
      crossGroup.add(vPost);

      // Horizontal beam
      const wBeam = 1.0 * scale;
      const yBeam = hPost * 0.72;
      const hBeam = new THREE.Mesh(new THREE.BoxGeometry(wBeam, 0.12 * scale, 0.10 * scale), woodCrossMat);
      hBeam.position.set(0, yBeam, 0.05 * scale);
      hBeam.castShadow = true;
      crossGroup.add(hBeam);

      // Center iron nail stud
      const stud = new THREE.Mesh(new THREE.CylinderGeometry(0.03 * scale, 0.03 * scale, 0.14 * scale, 6), ironMat);
      stud.rotation.x = Math.PI / 2;
      stud.position.set(0, yBeam, 0.05 * scale);
      crossGroup.add(stud);

      // Earth mound
      const mound = new THREE.Mesh(new THREE.BoxGeometry(0.75 * scale, 0.24 * scale, 1.7 * scale), earthMoundMat);
      mound.position.set(0, 0.12 * scale, 0.85 * scale);
      crossGroup.add(mound);

      const r = 0.35 * scale;
      colliders.push({ minX: x - r, maxX: x + r, minZ: z - r, maxZ: z + r, category: 'cemetery' });
      root.add(crossGroup);
    }

    // Helper: Create Gothic Headstone with Carved Latin Cross (Batu Nisan Lengkung Gotik)
    function addGothicHeadstone(x, z, scale = 1.0, rotY = 0, tiltZ = 0, hasCandle = false) {
      const cy = getTerrainHeight(x, z);
      const stoneGroup = new THREE.Group();
      stoneGroup.position.set(x, cy, z);
      stoneGroup.rotation.y = rotY;
      stoneGroup.rotation.z = tiltZ;

      // Base
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.85 * scale, 0.18 * scale, 0.42 * scale), stoneDarkMat);
      base.position.y = 0.09 * scale;
      base.castShadow = true; base.receiveShadow = true;
      stoneGroup.add(base);

      // Slab body
      const slabH = 0.95 * scale;
      const slab = new THREE.Mesh(new THREE.BoxGeometry(0.68 * scale, slabH, 0.20 * scale), stoneMat);
      slab.position.y = 0.18 * scale + slabH / 2;
      slab.castShadow = true; slab.receiveShadow = true;
      stoneGroup.add(slab);

      // Gothic arched top
      const archTop = new THREE.Mesh(new THREE.CylinderGeometry(0.34 * scale, 0.34 * scale, 0.20 * scale, 12), stoneMat);
      archTop.rotation.z = Math.PI / 2;
      archTop.position.y = 0.18 * scale + slabH;
      archTop.castShadow = true;
      stoneGroup.add(archTop);

      // Carved Latin Cross in high relief
      const crV = new THREE.Mesh(new THREE.BoxGeometry(0.08 * scale, 0.50 * scale, 0.04 * scale), mossStoneMat);
      crV.position.set(0, 0.18 * scale + slabH * 0.65, 0.11 * scale);
      stoneGroup.add(crV);

      const crH = new THREE.Mesh(new THREE.BoxGeometry(0.32 * scale, 0.08 * scale, 0.04 * scale), mossStoneMat);
      crH.position.set(0, 0.18 * scale + slabH * 0.75, 0.11 * scale);
      stoneGroup.add(crH);

      // Earth mound
      const mound = new THREE.Mesh(new THREE.BoxGeometry(0.85 * scale, 0.25 * scale, 1.9 * scale), earthMoundMat);
      mound.position.set(0, 0.125 * scale, 0.95 * scale);
      stoneGroup.add(mound);

      // Memorial candle
      if (hasCandle) {
        const cGroup = new THREE.Group();
        cGroup.position.set(0.24 * scale, 0.18 * scale, 0.16 * scale);

        const wax = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.14, 6), new THREE.MeshLambertMaterial({ color: 0xdedede }));
        wax.position.y = 0.07;
        cGroup.add(wax);

        const flame = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), candleGlowMat);
        flame.position.y = 0.16;
        cGroup.add(flame);

        const cLight = new THREE.PointLight(0xffb040, 0.75, 5.0, 1.8);
        cLight.position.y = 0.18;
        cGroup.add(cLight);

        cemeteryCandles.push({ light: cLight, flame, baseIntensity: 0.75, seed: Math.random() * 10 });
        stoneGroup.add(cGroup);
      }

      const r = 0.42 * scale;
      colliders.push({ minX: x - r, maxX: x + r, minZ: z - r, maxZ: z + r, category: 'cemetery' });
      root.add(stoneGroup);
    }

    // Helper: Create Elevated Stone Sarcophagus (Makam Peti Batu Megah)
    function addStoneSarcophagus(x, z, rotY = 0) {
      const cy = getTerrainHeight(x, z);
      const sarc = new THREE.Group();
      sarc.position.set(x, cy, z);
      sarc.rotation.y = rotY;

      // Base plinth
      const bPlinth = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.25, 2.6), stoneDarkMat);
      bPlinth.position.y = 0.125;
      bPlinth.castShadow = true; bPlinth.receiveShadow = true;
      sarc.add(bPlinth);

      // Chest
      const chest = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.65, 2.4), stoneMat);
      chest.position.y = 0.25 + 0.325;
      chest.castShadow = true; chest.receiveShadow = true;
      sarc.add(chest);

      // Beveled Lid
      const lid = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.20, 2.5), stoneDarkMat);
      lid.position.y = 0.90 + 0.10;
      lid.castShadow = true; lid.receiveShadow = true;
      sarc.add(lid);

      // Carved Stone Cross running the length of the lid
      const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 1.9), mossStoneMat);
      crossV.position.set(0, 1.13, 0);
      sarc.add(crossV);

      const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.06, 0.14), mossStoneMat);
      crossH.position.set(0, 1.13, -0.35);
      sarc.add(crossH);

      // 4 Corner Pillars
      for (let cx of [-0.6, 0.6]) {
        for (let cz of [-1.2, 1.2]) {
          const col = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.95, 0.18), stoneDarkMat);
          col.position.set(cx, 0.475, cz);
          sarc.add(col);
        }
      }

      colliders.push({ minX: x - 0.75, maxX: x + 0.75, minZ: z - 1.35, maxZ: z + 1.35, category: 'cemetery' });
      root.add(sarc);
    }

    // 1. Spawn Sarcophagi
    addStoneSarcophagus(-37.5, -26.0, 0.18);
    addStoneSarcophagus(-25.0, -37.0, -0.12);
    addStoneSarcophagus(-23.0, -25.0, 0.28);

    // 2. Spawn Standing Stone Crosses (Salib Batu)
    const stoneCrossData = [
      [-38.0, -36.0, 1.10, 0.12, 0.08, -0.10],
      [-38.0, -20.0, 0.95, -0.22, -0.05, 0.12],
      [-26.0, -20.0, 1.05, 0.05, 0.04, -0.06],
      [-33.0, -39.0, 1.00, -0.15, -0.12, 0.05],
      [-35.0, -22.0, 1.10, 0.20, 0.06, -0.08],
      [-20.0, -35.0, 0.90, -0.08, 0.10, 0.09],
      [-20.0, -28.0, 1.00, 0.15, -0.04, -0.10],
      [-20.0, -21.0, 1.05, -0.18, 0.07, 0.06],
      [-30.0, -22.0, 0.95, 0.04, -0.05, 0.08],
      [-25.0, -31.0, 1.00, -0.12, 0.08, -0.07],
      [-34.0, -28.0, 1.05, 0.10, -0.06, 0.04],
      [-28.0, -36.0, 0.92, -0.20, 0.09, -0.11]
    ];
    stoneCrossData.forEach(([x, z, s, ry, tx, tz]) => addStoneCross(x, z, s, ry, tx, tz));

    // 3. Spawn Weathered Wooden Crosses (Salib Kayu Tua)
    const woodCrossData = [
      [-41.0, -32.0, 1.05, 0.18, 0.12, -0.15],
      [-41.0, -22.0, 0.95, -0.25, -0.10, 0.08],
      [-35.0, -33.0, 1.00, 0.08, 0.06, 0.14],
      [-28.0, -41.0, 1.10, -0.14, -0.15, -0.08],
      [-23.0, -31.0, 0.90, 0.22, 0.09, -0.12],
      [-33.0, -18.0, 1.00, -0.18, -0.08, 0.10],
      [-27.0, -17.0, 0.95, 0.06, 0.11, -0.06],
      [-39.0, -40.0, 1.00, -0.20, -0.09, -0.12]
    ];
    woodCrossData.forEach(([x, z, s, ry, tx, tz]) => addWoodCross(x, z, s, ry, tx, tz));

    // 4. Spawn Gothic Headstones with Carved Crosses (Batu Nisan Lengkung)
    const headstoneData = [
      [-37.0, -32.0, 1.05, 0.08, -0.06, true],
      [-37.0, -22.0, 0.95, -0.14, 0.08, false],
      [-32.0, -35.0, 1.00, 0.05, -0.05, true],
      [-32.0, -25.0, 1.10, -0.09, 0.07, false],
      [-27.0, -35.0, 0.92, 0.12, -0.08, false],
      [-27.0, -25.0, 1.05, -0.06, 0.05, true],
      [-22.0, -38.0, 0.95, 0.15, -0.07, false],
      [-22.0, -18.0, 1.00, -0.11, 0.09, true],
      [-35.0, -37.0, 0.98, 0.04, -0.04, false],
      [-30.0, -19.0, 1.02, -0.08, 0.06, false],
      [-39.0, -28.0, 0.90, 0.18, -0.10, false],
      [-24.0, -21.0, 1.00, -0.15, 0.08, false]
    ];
    headstoneData.forEach(([x, z, s, ry, tz, candle]) => addGothicHeadstone(x, z, s, ry, tz, candle));

    // 5. Wrought Iron Fence & Stone Entrance Gate
    const pMinX = -44.0, pMaxX = -16.0;
    const pMinZ = -44.0, pMaxZ = -16.0;

    // Helper: Add stone pillar with decorative iron cross topper
    function addCemeteryPillar(px, pz) {
      const py = getTerrainHeight(px, pz);
      const pil = new THREE.Group();
      pil.position.set(px, py, pz);

      const pBody = new THREE.Mesh(new THREE.BoxGeometry(0.85, 2.6, 0.85), stoneDarkMat);
      pBody.position.y = 1.3;
      pBody.castShadow = true; pBody.receiveShadow = true;
      pil.add(pBody);

      const pCap = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.25, 1.05), stoneMat);
      pCap.position.y = 2.6 + 0.125;
      pCap.castShadow = true;
      pil.add(pCap);

      // Mini iron cross topper
      const topV = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.55, 0.04), ironMat);
      topV.position.y = 2.725 + 0.275;
      pil.add(topV);
      const topH = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.06, 0.04), ironMat);
      topH.position.y = 2.725 + 0.38;
      pil.add(topH);

      colliders.push({ minX: px - 0.5, maxX: px + 0.5, minZ: pz - 0.5, maxZ: pz + 0.5, category: 'cemetery' });
      root.add(pil);
    }

    // 4 Corner Pillars
    addCemeteryPillar(pMinX, pMinZ);
    addCemeteryPillar(pMaxX, pMinZ);
    addCemeteryPillar(pMinX, pMaxZ);
    addCemeteryPillar(pMaxX, pMaxZ);

    // 2 Entrance Gate Pillars (Leaves a 5.0m wide open gateway from X = -33.5 to X = -28.5 at Z = -16.0)
    const gateX1 = -33.5;
    const gateX2 = -28.5;
    addCemeteryPillar(gateX1, pMaxZ);
    addCemeteryPillar(gateX2, pMaxZ);

    // Helper: Add Wrought Iron Fence Segment
    function addFenceLine(x1, z1, x2, z2) {
      const dist = Math.hypot(x2 - x1, z2 - z1);
      const ang = Math.atan2(x2 - x1, z2 - z1);
      const steps = Math.floor(dist / 0.40);

      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const fx = x1 + (x2 - x1) * t;
        const fz = z1 + (z2 - z1) * t;
        const fy = getTerrainHeight(fx, fz);

        const picketGroup = new THREE.Group();
        picketGroup.position.set(fx, fy, fz);
        picketGroup.rotation.y = ang;

        // Vertical spear-tipped picket
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.85, 0.05), ironMat);
        bar.position.y = 0.925;
        picketGroup.add(bar);

        // Spearhead tip
        const spear = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.22, 4), ironMat);
        spear.position.y = 1.85 + 0.11;
        picketGroup.add(spear);

        root.add(picketGroup);
      }

      // Horizontal top & bottom rails
      const midX = (x1 + x2) / 2;
      const midZ = (z1 + z2) / 2;
      const midY = getTerrainHeight(midX, midZ);
      const railH = new THREE.Group();
      railH.position.set(midX, midY, midZ);
      railH.rotation.y = ang;

      const rTop = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, dist), ironMat);
      rTop.position.y = 1.55;
      railH.add(rTop);

      const rBot = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, dist), ironMat);
      rBot.position.y = 0.35;
      railH.add(rBot);

      root.add(railH);

      // Collider
      const pad = 0.4;
      colliders.push({
        minX: Math.min(x1, x2) - pad, maxX: Math.max(x1, x2) + pad,
        minZ: Math.min(z1, z2) - pad, maxZ: Math.max(z1, z2) + pad,
        category: 'cemetery'
      });
    }

    // North Fence
    addFenceLine(pMinX + 0.5, pMinZ, pMaxX - 0.5, pMinZ);
    // West Fence
    addFenceLine(pMinX, pMinZ + 0.5, pMinX, pMaxZ - 0.5);
    // East Fence
    addFenceLine(pMaxX, pMinZ + 0.5, pMaxX, pMaxZ - 0.5);
    // South Fence: Left of gate
    addFenceLine(pMinX + 0.5, pMaxZ, gateX1 - 0.5, pMaxZ);
    // South Fence: Right of gate
    addFenceLine(gateX2 + 0.5, pMaxZ, pMaxX - 0.5, pMaxZ);

    // Open Wrought Iron Gate Wings standing ajar into the cemetery
    for (let [gx, gRot] of [[gateX1 + 0.3, 0.65], [gateX2 - 0.3, -0.65]]) {
      const gy = getTerrainHeight(gx, pMaxZ);
      const gateWing = new THREE.Group();
      gateWing.position.set(gx, gy, pMaxZ);
      gateWing.rotation.y = gRot;

      const gFrame = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.9, 0.06), ironMat);
      gFrame.position.set(1.05, 0.95, 0);
      gateWing.add(gFrame);

      // Cross on each gate wing
      const gCrossV = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.2, 0.08), ironMat);
      gCrossV.position.set(1.05, 1.05, 0);
      gateWing.add(gCrossV);

      const gCrossH = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.06, 0.08), ironMat);
      gCrossH.position.set(1.05, 1.25, 0);
      gateWing.add(gCrossH);

      root.add(gateWing);
    }

    // 6. Gnarled Dead Cemetery Trees
    function addDeadCemeteryTree(tx, tz) {
      const ty = getTerrainHeight(tx, tz);
      const tree = new THREE.Group();
      tree.position.set(tx, ty, tz);

      // Crooked trunk
      const trunkH = 5.2 + Math.random() * 1.5;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.45, trunkH, 6), deadWoodMat);
      trunk.position.y = trunkH / 2;
      trunk.rotation.z = (Math.random() - 0.5) * 0.25;
      trunk.rotation.x = (Math.random() - 0.5) * 0.25;
      trunk.castShadow = true;
      tree.add(trunk);

      // Weeping bare branches
      for (let b = 0; b < 6; b++) {
        const bLen = 2.4 + Math.random() * 1.2;
        const bMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.16, bLen, 5), deadWoodMat);
        bMesh.position.set(0, trunkH * (0.6 + b * 0.06), 0);
        bMesh.rotation.set((Math.random() - 0.5) * 0.8, (b / 6) * Math.PI * 2, 0.8 + Math.random() * 0.4);
        tree.add(bMesh);
      }

      colliders.push({ minX: tx - 0.5, maxX: tx + 0.5, minZ: tz - 0.5, maxZ: tz + 0.5, category: 'cemetery' });
      root.add(tree);
    }

    addDeadCemeteryTree(-42.0, -42.0);
    addDeadCemeteryTree(-18.0, -42.0);
    addDeadCemeteryTree(-42.0, -18.0);
    addDeadCemeteryTree(-18.0, -18.0);

    // 7. Ground Mist Layer in Cemetery (Volumetric foggy ground veil)
    const mistGeo = new THREE.PlaneGeometry(30.0, 30.0);
    mistGeo.rotateX(-Math.PI / 2);
    const mistMat = new THREE.MeshBasicMaterial({
      color: 0x42668c,
      transparent: true,
      opacity: 0.22,
      depthWrite: false
    });
    const mistMesh = new THREE.Mesh(mistGeo, mistMat);
    mistMesh.position.set(centerX, centerBaseY + 0.25, centerZ);
    root.add(mistMesh);

    // 8. Solitary Wilderness Christian Crosses (Scattered across misty trails)
    addWoodCross(14.0, 18.0, 1.10, 0.25, 0.12, -0.08);
    addStoneCross(-8.0, 32.0, 1.05, -0.15, -0.06, 0.10);
    addWoodCross(30.0, -12.0, 0.95, 0.35, 0.08, 0.12);
    addStoneCross(-2.0, -38.0, 1.15, -0.10, 0.10, -0.07);

    scene.add(root);
  }

  // Construct Mountain Highway, Blackwood Moors Stone Tunnel & "WELCOME TO COLDBROOK" Archway
  function buildMountainRoadTunnelAndWelcomeArch(scene, textures) {
    const { asphaltRoadTex } = textures;
    const root = new THREE.Group();
    root.name = 'Mountain_Highway_System';

    // Materials
    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x3d4147, flatShading: false });
    const darkStoneMat = new THREE.MeshLambertMaterial({ color: 0x22262a, flatShading: false });
    const tunnelCeilMat = new THREE.MeshLambertMaterial({ color: 0x1b1f23, flatShading: false });
    const woodArchMat = new THREE.MeshLambertMaterial({ color: 0x2b1c14, flatShading: false });
    const snowCapMat = new THREE.MeshLambertMaterial({ color: 0xedf4f8, flatShading: false });
    const ironBarMat = new THREE.MeshStandardMaterial({ color: 0x181a1d, metalness: 0.8, roughness: 0.5 });
    const yellowLampGlowMat = new THREE.MeshBasicMaterial({ color: 0xffaa33 });
    const whiteEdgeLineMat = new THREE.MeshBasicMaterial({ color: 0xdde7ef });
    const roadCurbMat = new THREE.MeshLambertMaterial({ color: 0x4f555d, flatShading: false });

    // 1. ASPHALT MOUNTAIN HIGHWAY ROADWAY (continuous from z = -220 to z = 28)
    const roadW = 6.8;
    const roadZStart = -220.0;
    const roadZEnd = 28.0;
    const roadLen = roadZEnd - roadZStart; // 248m continuous roadway extending into the distant fog
    const roadMidZ = (roadZStart + roadZEnd) / 2; // -96.0

    // Main asphalt roadbed
    const roadGeo = new THREE.PlaneGeometry(roadW, roadLen);
    roadGeo.rotateX(-Math.PI / 2);

    const roadTexClone = asphaltRoadTex.clone();
    roadTexClone.wrapS = THREE.RepeatWrapping;
    roadTexClone.wrapT = THREE.RepeatWrapping;
    roadTexClone.repeat.set(1, Math.round(roadLen / 4.0));
    roadTexClone.needsUpdate = true;

    const roadMesh = new THREE.Mesh(
      roadGeo,
      new THREE.MeshLambertMaterial({
        map: roadTexClone,
        color: 0x30353b,
        polygonOffset: true,
        polygonOffsetFactor: -1.0,
        polygonOffsetUnits: -1.0
      })
    );
    roadMesh.position.set(0, 0.05, roadMidZ);
    roadMesh.receiveShadow = true;
    root.add(roadMesh);

    // Road Curbs / Snowy Shoulders along sides
    [-roadW / 2, roadW / 2].forEach(cx => {
      const curb = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, roadLen), roadCurbMat);
      curb.position.set(cx, 0.09, roadMidZ);
      root.add(curb);

      const snowShoulder = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.14, roadLen), snowCapMat);
      snowShoulder.position.set(cx + (cx < 0 ? -0.75 : 0.75), 0.07, roadMidZ);
      root.add(snowShoulder);
    });

    // Road Reflector Posts in open road section (z >= -4 to z <= 24)
    for (let rz = -3; rz <= 25; rz += 4.5) {
      [-roadW / 2 - 0.25, roadW / 2 + 0.25].forEach((rx, idx) => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.0, 6), whiteEdgeLineMat);
        post.position.set(rx, 0.5, rz);
        root.add(post);

        const cap = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.18, 0.06), yellowLampGlowMat);
        cap.position.set(rx, 0.88, rz);
        root.add(cap);
      });
    }

    // 2. OPEN HIGHWAY THROUGH BLACKWOOD MOORS (z = -215 to z = 10)
    // Roadside snow guide posts with reflectors along both sides extending continuously into fog
    for (let rz = -215; rz <= 10; rz += 5.5) {
      [-3.6, 3.6].forEach(rx => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.25, 0.12), darkWoodMat);
        post.position.set(rx, 0.6, rz);
        post.castShadow = true;
        root.add(post);

        const reflector = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.22, 0.08), yellowLampGlowMat);
        reflector.position.set(rx, 1.05, rz);
        root.add(reflector);

        const postSnow = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.16), snowCapMat);
        postSnow.position.set(rx, 1.25, rz);
        root.add(postSnow);
      });
    }

    // -------------------------------------------------------------
    // 3. THE GRAND GOTHIC "WELCOME TO COLDBROOK" ARCHWAY (z = 18.0)
    // -------------------------------------------------------------
    const archZ = 18.0;
    const archSpan = 7.4; // Wide clearance for roadway
    const archPillarW = 1.1;
    const archPillarH = 5.2;

    // Two Ancient Stone Pillars flanking the road
    [-archSpan / 2, archSpan / 2].forEach(px => {
      // Stone Base
      const pillarBase = new THREE.Mesh(new THREE.BoxGeometry(archPillarW + 0.3, 0.8, archPillarW + 0.3), darkStoneMat);
      pillarBase.position.set(px, 0.4, archZ);
      root.add(pillarBase);

      // Stone Shaft
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(archPillarW, archPillarH, archPillarW), stoneMat);
      pillar.position.set(px, archPillarH / 2 + 0.4, archZ);
      pillar.castShadow = true;
      root.add(pillar);

      // Decorative Cap
      const cap = new THREE.Mesh(new THREE.BoxGeometry(archPillarW + 0.25, 0.3, archPillarW + 0.25), stoneMat);
      cap.position.set(px, archPillarH + 0.55, archZ);
      root.add(cap);

      // Snow mantle on pillar top
      const capSnow = new THREE.Mesh(new THREE.BoxGeometry(archPillarW + 0.28, 0.25, archPillarW + 0.28), snowCapMat);
      capSnow.position.set(px, archPillarH + 0.8, archZ);
      root.add(capSnow);

      // Gothic Iron Finial on top
      const finial = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.65, 4), ironBarMat);
      finial.position.set(px, archPillarH + 1.2, archZ);
      root.add(finial);

      // Heavy iron lantern arm holding a glowing brass lantern
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.75), ironBarMat);
      arm.position.set(px, archPillarH - 0.8, archZ + 0.45);
      root.add(arm);

      const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.42, 0.28), yellowLampGlowMat);
      lantern.position.set(px, archPillarH - 1.1, archZ + 0.8);
      root.add(lantern);

      // Colliders on pillars so player cannot clip through stone
      colliders.push({
        minX: px - archPillarW / 2 - 0.15,
        maxX: px + archPillarW / 2 + 0.15,
        minZ: archZ - 0.7,
        maxZ: archZ + 0.7,
        category: 'road',
        disabled: false
      });
    });

    // Massive Dark Oak Crossbeam spanning across the highway (4.6m clearance)
    const beamW = archSpan + archPillarW * 2 + 0.6;
    const beamY = 4.75;
    const mainBeam = new THREE.Mesh(new THREE.BoxGeometry(beamW, 0.55, 0.6), woodArchMat);
    mainBeam.position.set(0, beamY, archZ);
    mainBeam.castShadow = true;
    root.add(mainBeam);

    // Secondary Upper Support Beam
    const upperBeam = new THREE.Mesh(new THREE.BoxGeometry(beamW - 1.2, 0.35, 0.45), woodArchMat);
    upperBeam.position.set(0, beamY + 0.75, archZ);
    root.add(upperBeam);

    // Snow coating on top of arch beam
    const beamSnow = new THREE.Mesh(new THREE.BoxGeometry(beamW + 0.1, 0.2, 0.65), snowCapMat);
    beamSnow.position.set(0, beamY + 1.0, archZ);
    root.add(beamSnow);

    // Wrought Iron Gothic Scrolls in Arch Corners
    [-archSpan / 2 + 0.7, archSpan / 2 - 0.7].forEach(bx => {
      const brace = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 0.08), ironBarMat);
      brace.position.set(bx, beamY - 0.5, archZ);
      brace.rotateZ((bx < 0) ? -Math.PI / 4 : Math.PI / 4);
      root.add(brace);
    });

    // 3b. THE ICONIC "WELCOME TO COLDBROOK" SIGNBOARD
    const welcomeCanvas = document.createElement('canvas');
    welcomeCanvas.width = 1024;
    welcomeCanvas.height = 256;
    const wctx = welcomeCanvas.getContext('2d');

    // Weathered Dark Oak Wood grain
    wctx.fillStyle = '#18120d';
    wctx.fillRect(0, 0, 1024, 256);

    // Double Ornate Carved Gold Inlay Border
    wctx.strokeStyle = '#c99e4b';
    wctx.lineWidth = 10;
    wctx.strokeRect(14, 14, 996, 228);
    wctx.lineWidth = 3;
    wctx.strokeStyle = '#6e5022';
    wctx.strokeRect(26, 26, 972, 204);

    // Corner decorative flourishes
    wctx.fillStyle = '#c99e4b';
    wctx.font = '28px serif';
    wctx.fillText('✦', 36, 52);
    wctx.fillText('✦', 968, 52);
    wctx.fillText('✦', 36, 218);
    wctx.fillText('✦', 968, 218);

    // "WELCOME TO"
    wctx.textAlign = 'center';
    wctx.fillStyle = '#deb765';
    wctx.font = 'bold 42px "Times New Roman", serif';
    wctx.fillText('✦  WELCOME TO  ✦', 512, 74);

    // "COLDBROOK"
    wctx.fillStyle = '#f5eedb';
    wctx.font = 'bold 84px "Times New Roman", serif';
    wctx.shadowColor = '#000000';
    wctx.shadowBlur = 12;
    wctx.shadowOffsetX = 4;
    wctx.shadowOffsetY = 4;
    wctx.fillText('COLDBROOK', 512, 156);

    // Subtitle / Motto: "EST. 1842 • THE VALLEY OF PENANCE"
    wctx.shadowBlur = 0;
    wctx.shadowOffsetX = 0;
    wctx.shadowOffsetY = 0;
    wctx.fillStyle = '#9cb3a2';
    wctx.font = 'italic 26px "Times New Roman", serif';
    wctx.fillText('EST. 1842  •  "THE VALLEY OF SILENT PRAYERS"', 512, 206);

    const welcomeTex = new THREE.CanvasTexture(welcomeCanvas);

    // Signboard Double-Sided Mesh
    const welcomeBoard = new THREE.Mesh(
      new THREE.BoxGeometry(4.8, 1.25, 0.12),
      [
        woodArchMat, // right
        woodArchMat, // left
        woodArchMat, // top
        woodArchMat, // bottom
        new THREE.MeshLambertMaterial({ map: welcomeTex }), // front (facing player approaching from tunnel)
        new THREE.MeshLambertMaterial({ map: welcomeTex })  // back (facing village)
      ]
    );
    welcomeBoard.position.set(0, beamY - 0.35, archZ);
    welcomeBoard.castShadow = true;
    root.add(welcomeBoard);

    // Small Iron Hanging Chains suspending the signboard
    [-1.8, 1.8].forEach(cx => {
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.45, 6), ironBarMat);
      chain.position.set(cx, beamY + 0.12, archZ);
      root.add(chain);
    });

    // 3c. SIDE SIGNPOST: "POPULATION: 128" & "SPEED LIMIT 20"
    const sideSignCanvas = document.createElement('canvas');
    sideSignCanvas.width = 256;
    sideSignCanvas.height = 256;
    const sctx = sideSignCanvas.getContext('2d');
    sctx.fillStyle = '#22262a';
    sctx.fillRect(0, 0, 256, 256);
    sctx.strokeStyle = '#ffffff';
    sctx.lineWidth = 6;
    sctx.strokeRect(8, 8, 240, 240);

    sctx.fillStyle = '#ffffff';
    sctx.textAlign = 'center';
    sctx.font = 'bold 28px sans-serif';
    sctx.fillText('COLDBROOK', 128, 48);
    sctx.font = 'bold 20px sans-serif';
    sctx.fillStyle = '#a9b7c6';
    sctx.fillText('POPULATION', 128, 86);

    // Crossed out population count with eerie red blood mark
    sctx.font = 'bold 36px monospace';
    sctx.fillStyle = '#e6eff7';
    sctx.fillText('128', 128, 134);

    // Blood slash over numbers
    sctx.strokeStyle = '#b81622';
    sctx.lineWidth = 7;
    sctx.beginPath();
    sctx.moveTo(85, 142);
    sctx.lineTo(170, 115);
    sctx.stroke();

    sctx.font = 'bold 28px "Redaction 70", serif';
    sctx.fillStyle = '#ff2b3c';
    sctx.fillText('??', 188, 140);

    sctx.fillStyle = '#deb33a';
    sctx.font = 'bold 20px sans-serif';
    sctx.fillText('SPEED LIMIT 20', 128, 205);

    const sideSignTex = new THREE.CanvasTexture(sideSignCanvas);
    const sideSignMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.85, 0.85),
      new THREE.MeshLambertMaterial({ map: sideSignTex })
    );
    sideSignMesh.position.set(-archSpan / 2 - 1.1, 1.85, archZ - 0.1);
    root.add(sideSignMesh);

    const sidePost = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.4, 6), ironBarMat);
    sidePost.position.set(-archSpan / 2 - 1.1, 1.2, archZ - 0.15);
    root.add(sidePost);

    roadObject = root;
    scene.add(root);
  }

  // Pure Dense Snow Forest (No road, no vehicles, only deep snow wilderness)
  buildDenseSnowForest();

  // Construct Mountain Highway, Blackwood Moors Stone Tunnel & "WELCOME TO COLDBROOK" Archway
  buildMountainRoadTunnelAndWelcomeArch(scene, textures);

  // World Boundary Chainlink Security Perimeter Fence
  buildChainlinkBoundaryFence(scene, chainlinkTex);

  // Construct Winding River, Mountain Waterfall & Wooden Bridge
  buildRiverAndWaterfall(scene, textures);

  // Construct Coastal Beach, Sand Dunes, Ocean Bay & Fishing Pier
  buildBeachAndCoastline(scene, textures);

  // Construct Ancient Misty Christian Cemetery (Kuburan Kristen Berlumut & Salib Kuno)
  buildChristianCemetery(scene, textures);

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

  // Fallen Mossy Logs in the Snow
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

  // Restore original scene.add and build Times Square NYC Arena separately
  scene.add = origSceneAdd;
  initTimesSquareWorld(scene, colliders);

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
    if (c.disabled) continue;
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

  // Natural Water Boundary: Only in Coldbrook Village Story Mode (Times Square NYC has no river/ocean)
  if (!window.__ENDLESS_ACTIVE) {
    const isOnPier = (z >= 112.0 && z <= 138.0 && Math.abs(x - 14.0) < 1.8);
    const bridgeCenterX = getRiverCenterX(4.0);
    const isOnBridge = (Math.abs(z - 4.0) < 1.7 && Math.abs(x - bridgeCenterX) < 6.6);

    if (!isOnPier && !isOnBridge) {
      // Ocean Shoreline Barrier: Player cannot walk out into open sea
      if (z > 124.5) return true;

      // Deep River Barrier: Player cannot drown or enter deep river channels
      const wsY = getWaterSurfaceY(x, z);
      if (wsY !== null) {
        const gY = getTerrainHeight(x, z);
        if (wsY - gY > 0.65) return true;
      }
    }
  }

  const cx = Math.floor(x / GRID_CELL_SIZE);
  const cz = Math.floor(z / GRID_CELL_SIZE);
  const key = getGridKey(cx, cz);
  const nearby = colliderGrid.get(key);
  if (!nearby) return false;

  for (let i = 0; i < nearby.length; i++) {
    const c = nearby[i];
    if (c.disabled) continue;
    if (x > c.minX && x < c.maxX && z > c.minZ && z < c.maxZ) return true;
  }
  return false;
}

/**
 * Lightweight spatial-grid wall/prop check for TPS camera collision (ignores water).
 */
export function checkCameraCollision(x, z) {
  const cx = Math.floor(x / GRID_CELL_SIZE);
  const cz = Math.floor(z / GRID_CELL_SIZE);
  const key = getGridKey(cx, cz);
  const nearby = colliderGrid.get(key);
  if (!nearby) return false;

  for (let i = 0; i < nearby.length; i++) {
    const c = nearby[i];
    if (c.disabled) continue;
    if (x > c.minX - 0.15 && x < c.maxX + 0.15 && z > c.minZ - 0.15 && z < c.maxZ + 0.15) return true;
  }
  return false;
}

/**
 * Configure environment specifically for Endless Survival Mode:
 * - Removes houses and road structures for pure, unhindered snow wilderness combat.
 * - Disables collisions for removed structures so player & zombies never hit phantom walls.
 * - Drastically thickens atmospheric fog for dense, claustrophobic survival horror.
 */
export function setEndlessEnvironment(isEndless, scene) {
  window.__ENDLESS_ACTIVE = !!isEndless;

  // 1. Hide/Show All Village Houses and Sanctuary Farmhouse
  houseObjects.forEach(h => {
    if (h) h.visible = !isEndless;
  });

  // 2. Hide/Show Asphalt Road, Curbs, Highway, Reflectors, and Welcome Arch
  if (roadObject) {
    roadObject.visible = !isEndless;
  }

  // 3. Isolate World Visibility & Colliders cleanly (Coldbrook Village vs Times Square NYC)
  if (coldbrookGroup) {
    coldbrookGroup.visible = !isEndless;
  }
  colliders.forEach(c => {
    if (c.category !== 'nyc') {
      c.disabled = !!isEndless;
    }
  });
  if (groundMeshRef) {
    groundMeshRef.visible = !isEndless;
  }
  setTimesSquareActive(isEndless);
  indexColliders();

  // 4. Night Atmosphere: Crisp, readable NYC Night Lighting for Times Square vs Coldbrook Mist
  if (ambientLight) {
    ambientLight.color.setHex(isEndless ? 0x4c5b73 : 0x304a68);
    ambientLight.intensity = isEndless ? 0.85 : 1.0;
  }
  if (overcastDirLight) {
    overcastDirLight.intensity = isEndless ? 0.58 : 0.75;
  }
  if (scene) {
    scene.background = isEndless ? new THREE.Color(0x101828) : null;
  }
  if (scene && scene.fog) {
    if (isEndless) {
      scene.fog.color.setHex(0x101828);
      scene.fog.near = 28.0;
      scene.fog.far = 135.0;
    } else {
      scene.fog.color.setHex(0x325274);
      scene.fog.near = 2.0;
      scene.fog.far = 32.0;
    }
  }

  // 5. Hide/Show Village NPCs (Old Thomas, Martha, Edward, etc.)
  setEndlessVillagers(isEndless);
}

export { updateTimesSquareEffects };
