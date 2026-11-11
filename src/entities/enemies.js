/* =========================================================================
   ENEMIES & BOSS: LEFT 4 DEAD INFECTED & SISTER VALENTINA
   Visceral L4D Infected Archetypes, Nun Boss, Ragdoll Kinematics
   ========================================================================= */

import { Sfx } from '../audio/sfx.js';
import { showDialogSubtitle } from './kristin.js';
import { getTerrainHeight } from '../world/environment.js';
import { startNonaBataviaCutscene } from '../core/cutscene.js';
import { isMobileDevice } from '../graphics/engine.js';
import {
  spawnBloodPoolOnSnow,
  spawnWalkingBloodDrip,
  createAirborneBloodDrop,
  spawnColdBreath,
  deadCorpses,
  curseProjectiles,
  spawnNonaBataviaDeathSequence
} from './effects.js';

const THREE = window.THREE;

export const zombies = [];
export let currentBoss = null;

let ladyMithrillTemplate = null;
let victorianBrideTemplate = null;

let sceneRef = null;
let cameraRef = null;

// Materials
let l4dFlannelMat, l4dHoodieMat, l4dPatientMat, l4dBruiserMat, l4dDenimMat, l4dDarkPantsMat;
let l4dFaceMat, l4dNecroticSkinMat, l4dClawsMat, l4dBootMat, l4dHairMat;
let ps1FemaleHairMat, ps1MaleHairMat, ps1TieMat, ps1FormalShoeMat, ps1DarkBeltMat, goldJewelryMat;
let faceFemaleShaggyMat, faceMaleTiredMat, faceMaleFadeMat, faceFemaleSleekMat, faceFemaleMeghanMat;
export const zombieGLBCache = { femaleShaggy: null, maleVest: null, maleSuit: null, femaleSleek: null };
let fleshRawCrimsonMat, fleshDarkClotMat, intestineWetPinkMat, exposedWhiteRibMat, feralGlowingEyesMat;
let nunHabitMat, nunVeilMat, nunMantleMat, silverCrossMat, bloodyHandsMat, paleFleshMat, nunFaceMat;

export function initEnemyMaterials(textures) {
  const {
    l4dFlannelTex,
    l4dHoodieTex,
    l4dPatientTex,
    l4dBruiserTex,
    l4dDenimTex,
    l4dDarkPantsTex,
    l4dFaceTex,
    l4dNecroticSkinTex,
    l4dClawsTex,
    nunFaceTex
  } = textures;

  l4dFlannelMat = new THREE.MeshLambertMaterial({ map: l4dFlannelTex, flatShading: true });
  l4dHoodieMat = new THREE.MeshLambertMaterial({ map: l4dHoodieTex, flatShading: true });
  l4dPatientMat = new THREE.MeshLambertMaterial({ map: l4dPatientTex, flatShading: true });
  l4dBruiserMat = new THREE.MeshLambertMaterial({ map: l4dBruiserTex, flatShading: true });
  l4dDenimMat = new THREE.MeshLambertMaterial({ map: l4dDenimTex, flatShading: true });
  l4dDarkPantsMat = new THREE.MeshLambertMaterial({ map: l4dDarkPantsTex, flatShading: true });
  l4dFaceMat = new THREE.MeshLambertMaterial({ map: l4dFaceTex, flatShading: true });
  l4dNecroticSkinMat = new THREE.MeshLambertMaterial({ map: l4dNecroticSkinTex, flatShading: true });
  l4dClawsMat = new THREE.MeshLambertMaterial({ map: l4dClawsTex, flatShading: true });
  l4dBootMat = new THREE.MeshLambertMaterial({ color: 0x181311, flatShading: true });
  l4dHairMat = new THREE.MeshLambertMaterial({ color: 0x1c1715, flatShading: true });

  ps1FemaleHairMat = new THREE.MeshLambertMaterial({ color: 0x4a3224, flatShading: true });
  ps1MaleHairMat = new THREE.MeshLambertMaterial({ color: 0x221e1a, flatShading: true });
  ps1TieMat = new THREE.MeshLambertMaterial({ color: 0x141618, flatShading: true });
  ps1FormalShoeMat = new THREE.MeshLambertMaterial({ color: 0x181412, flatShading: true });
  ps1DarkBeltMat = new THREE.MeshLambertMaterial({ color: 0x16181a, flatShading: true });

  faceFemaleShaggyMat = new THREE.MeshLambertMaterial({
    map: textures.faceFemaleShaggyTex || l4dFaceTex,
    flatShading: false
  });
  faceMaleTiredMat = new THREE.MeshLambertMaterial({
    map: textures.faceMaleTiredTex || l4dFaceTex,
    flatShading: false
  });
  faceMaleFadeMat = new THREE.MeshLambertMaterial({
    map: textures.faceMaleFadeTex || l4dFaceTex,
    flatShading: false
  });
  faceFemaleSleekMat = new THREE.MeshLambertMaterial({
    map: textures.faceFemaleSleekTex || l4dFaceTex,
    flatShading: false
  });
  faceFemaleMeghanMat = new THREE.MeshLambertMaterial({
    map: textures.faceFemaleMeghanTex || textures.faceFemaleSleekTex || l4dFaceTex,
    flatShading: false
  });
  goldJewelryMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.3,
    metalness: 0.85
  });

  fleshRawCrimsonMat = new THREE.MeshLambertMaterial({ color: 0x990b14, flatShading: false });
  fleshDarkClotMat = new THREE.MeshLambertMaterial({ color: 0x480307, flatShading: false });
  intestineWetPinkMat = new THREE.MeshLambertMaterial({ color: 0xd64053, flatShading: false });
  exposedWhiteRibMat = new THREE.MeshLambertMaterial({ color: 0xedebe4, flatShading: false });
  feralGlowingEyesMat = new THREE.MeshBasicMaterial({ color: 0xff1616 });

  nunHabitMat = new THREE.MeshLambertMaterial({ color: 0x3e4745, flatShading: false });
  nunVeilMat = new THREE.MeshLambertMaterial({ color: 0x222b2b, flatShading: false });
  nunMantleMat = new THREE.MeshLambertMaterial({ color: 0x4f5a57, flatShading: false });
  silverCrossMat = new THREE.MeshPhongMaterial({ color: 0xddedeb, specular: 0xffffff, shininess: 90, flatShading: false });
  bloodyHandsMat = new THREE.MeshPhongMaterial({ color: 0x8b0811, specular: 0xaa2222, shininess: 80, flatShading: false });
  paleFleshMat = new THREE.MeshLambertMaterial({ color: 0xb5c0c7, flatShading: false });
  nunFaceMat = new THREE.MeshLambertMaterial({ map: nunFaceTex, flatShading: true });
}

export function initEnemies(scene, camera) {
  sceneRef = scene;
  cameraRef = camera;
}

export function preloadZombieGLBModels(scene) {
  if (typeof THREE === 'undefined' || !THREE.GLTFLoader) return;
  const loader = new THREE.GLTFLoader();

  const toLoad = [
    { key: 'femaleShaggy', url: '/models/zombie_female_shaggy.glb' },
    { key: 'maleVest', url: '/models/zombie_male_vest.glb' },
    { key: 'maleSuit', url: '/models/zombie_male_suit.glb' },
    { key: 'femaleSleek', url: '/models/zombie_female_sleek.glb' }
  ];

  toLoad.forEach(item => {
    loader.load(
      item.url,
      (gltf) => {
        zombieGLBCache[item.key] = gltf.scene;
        console.log('[GLB] Successfully loaded and cached 3D model:', item.url);
      },
      undefined,
      (err) => {
        console.warn('[GLB] Note on model', item.url, err);
      }
    );
  });
}

function createRealisticContouredHead(variant, scale) {
  const head = new THREE.Group();
  
  // Select realistic photo face material
  const isFemale = (variant === 0 || variant === 3);
  let faceMat = (faceFemaleMeghanMat || faceFemaleSleekMat || l4dFaceMat);
  let hairMat = ps1FemaleHairMat;

  if (variant === 1) {
    faceMat = faceMaleTiredMat || l4dFaceMat;     // tired sunken eyes man (Photo 4)
    hairMat = ps1MaleHairMat;
  } else if (variant === 2) {
    faceMat = faceMaleFadeMat || l4dFaceMat;      // Asian fade man (Photo 2)
    hairMat = ps1MaleHairMat;
  } else if (isFemale) {
    faceMat = faceFemaleMeghanMat || faceFemaleSleekMat || l4dFaceMat; // Meghan Markle uploaded photo
    hairMat = ps1FemaleHairMat;
  }

  // 1. Contoured Anatomical Skull / Cranium (Smooth curve, NOT a box!)
  const skullGeo = new THREE.SphereGeometry(0.115 * scale, 18, 14);
  const pos = skullGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);

    // Flatten temples
    if (Math.abs(x) > 0.055 * scale) x *= 0.88;
    // Elongate back of head (occiput)
    if (z < 0) z *= 1.14;
    // Taper lower face toward chin
    if (y < 0 && z > -0.02 * scale) {
      x *= (1.0 + y * 1.35);
      z *= (1.0 + y * 0.45);
    }
    // Brow ridge arch
    if (y > 0.01 * scale && y < 0.05 * scale && z > 0.05 * scale) {
      z += 0.016 * scale;
    }
    pos.setXYZ(i, x, y, z);
  }
  skullGeo.computeVertexNormals();

  const skullMesh = new THREE.Mesh(skullGeo, l4dNecroticSkinMat);
  head.add(skullMesh);

  // 2. Realistic Face Front Plate (Anatomical facial curvature with photo texture mapped)
  const faceCurvatureGeo = new THREE.CylinderGeometry(
    0.102 * scale,
    0.082 * scale,
    0.205 * scale,
    14,
    1,
    false,
    -Math.PI * 0.38,
    Math.PI * 0.76
  );
  faceCurvatureGeo.computeVertexNormals();
  const faceCurvatureMesh = new THREE.Mesh(faceCurvatureGeo, faceMat);
  faceCurvatureMesh.position.set(0, 0, 0.015 * scale);
  head.add(faceCurvatureMesh);

  // 3. 3D Anatomical Nose
  const noseGroup = new THREE.Group();
  noseGroup.position.set(0, 0.008 * scale, 0.116 * scale);
  head.add(noseGroup);

  const noseBridgeGeo = new THREE.CylinderGeometry(0.012 * scale, 0.020 * scale, 0.052 * scale, 5);
  const noseBridge = new THREE.Mesh(noseBridgeGeo, l4dNecroticSkinMat);
  noseBridge.rotation.x = -0.32;
  noseGroup.add(noseBridge);

  const noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.014 * scale, 8, 6), l4dNecroticSkinMat);
  noseTip.position.set(0, -0.020 * scale, 0.018 * scale);
  noseGroup.add(noseTip);

  [-0.013, 0.013].forEach(nx => {
    const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.009 * scale, 6, 5), l4dNecroticSkinMat);
    nostril.position.set(nx * scale, -0.022 * scale, 0.012 * scale);
    noseGroup.add(nostril);
  });

  // 4. 3D Cheekbones (Zygomatic arches)
  [-0.072, 0.072].forEach(cx => {
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.030 * scale, 8, 6), l4dNecroticSkinMat);
    cheek.scale.set(0.7, 1.2, 0.8);
    cheek.position.set(cx * scale, 0.008 * scale, 0.076 * scale);
    head.add(cheek);
  });

  // 5. Sunken Eye Orbits with realistic zombie eyes
  [-0.042, 0.042].forEach(ex => {
    const orbit = new THREE.Mesh(new THREE.SphereGeometry(0.024 * scale, 8, 6), fleshDarkClotMat);
    orbit.position.set(ex * scale, 0.024 * scale, 0.092 * scale);
    head.add(orbit);

    const eyeBall = new THREE.Mesh(new THREE.SphereGeometry(0.014 * scale, 8, 8), paleFleshMat);
    eyeBall.position.set(ex * scale, 0.023 * scale, 0.096 * scale);
    head.add(eyeBall);

    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.007 * scale, 6, 6), feralGlowingEyesMat);
    pupil.position.set(ex * scale, 0.023 * scale, 0.108 * scale);
    head.add(pupil);
  });

  // 6. Upper Lip & 3D Mouth
  const upperLip = new THREE.Mesh(new THREE.BoxGeometry(0.05 * scale, 0.014 * scale, 0.018 * scale), l4dNecroticSkinMat);
  upperLip.position.set(0, -0.040 * scale, 0.104 * scale);
  head.add(upperLip);

  // 7. Hinged Mandible / Jaw & Lower Lip
  const jaw = new THREE.Group();
  jaw.position.set(0, -0.052 * scale, 0.038 * scale);
  head.add(jaw);

  const lowerLip = new THREE.Mesh(new THREE.BoxGeometry(0.046 * scale, 0.013 * scale, 0.020 * scale), l4dNecroticSkinMat);
  lowerLip.position.set(0, 0.002 * scale, 0.062 * scale);
  jaw.add(lowerLip);

  const chin = new THREE.Mesh(new THREE.SphereGeometry(0.033 * scale, 8, 6), l4dNecroticSkinMat);
  chin.scale.set(1.1, 0.9, 1.2);
  chin.position.set(0, -0.024 * scale, 0.054 * scale);
  jaw.add(chin);

  // 8. Anatomical 3D Ears & Earrings
  [-0.102, 0.102].forEach((earX, idx) => {
    const earGroup = new THREE.Group();
    earGroup.position.set(earX * scale, 0.015 * scale, -0.01 * scale);
    earGroup.rotation.y = (idx === 0 ? -0.22 : 0.22);
    head.add(earGroup);

    const earHelix = new THREE.Mesh(new THREE.TorusGeometry(0.020 * scale, 0.005 * scale, 5, 8, Math.PI * 1.3), l4dNecroticSkinMat);
    earHelix.rotation.z = Math.PI * 0.45;
    earGroup.add(earHelix);

    // Small stud earring for female zombie (matches uploaded photo)
    if (isFemale && goldJewelryMat) {
      const earring = new THREE.Mesh(new THREE.SphereGeometry(0.005 * scale, 6, 6), goldJewelryMat);
      earring.position.set(0, -0.015 * scale, 0.002 * scale);
      earGroup.add(earring);
    }
  });

  // Delicate gold chain necklace for female zombie (matches uploaded photo)
  if (isFemale && goldJewelryMat) {
    const necklace = new THREE.Mesh(
      new THREE.TorusGeometry(0.076 * scale, 0.0035 * scale, 4, 16, Math.PI * 0.82),
      goldJewelryMat
    );
    necklace.position.set(0, -0.08 * scale, 0.035 * scale);
    necklace.rotation.x = Math.PI * 0.42;
    head.add(necklace);
  }

  // 9. 3D Hairstyling matching user photos
  const hairGroup = new THREE.Group();
  head.add(hairGroup);

  if (variant === 0 || variant === 3) {
    // Female: Sleek pulled-back ponytail & neat bun (Matches uploaded Meghan Markle photo)
    const hairSleek = new THREE.Mesh(new THREE.SphereGeometry(0.122 * scale, 16, 12), hairMat);
    hairSleek.scale.set(1.02, 0.88, 1.10);
    hairSleek.position.set(0, 0.046 * scale, -0.015 * scale);
    hairGroup.add(hairSleek);

    // Neat bun / gathered hair at nape of neck
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.046 * scale, 10, 8), hairMat);
    bun.position.set(0, 0.015 * scale, -0.122 * scale);
    hairGroup.add(bun);

    // Sleek ponytail / gathered tail hanging down back
    const ponytail = new THREE.Mesh(new THREE.CylinderGeometry(0.022 * scale, 0.036 * scale, 0.18 * scale, 6), hairMat);
    ponytail.position.set(0, -0.06 * scale, -0.135 * scale);
    ponytail.rotation.x = 0.25;
    hairGroup.add(ponytail);
  } else if (variant === 1) {
    // Male Tired (Photo 4: Messy wavy hair with loose forehead fringe)
    const hairBase = new THREE.Mesh(new THREE.SphereGeometry(0.122 * scale, 14, 10), hairMat);
    hairBase.scale.set(1.04, 0.82, 1.14);
    hairBase.position.set(0, 0.055 * scale, -0.012 * scale);
    hairGroup.add(hairBase);

    [-0.04, 0.035].forEach(fx => {
      const fringe = new THREE.Mesh(new THREE.CylinderGeometry(0.014 * scale, 0.024 * scale, 0.09 * scale, 4), hairMat);
      fringe.position.set(fx * scale, 0.058 * scale, 0.098 * scale);
      fringe.rotation.x = 0.38;
      hairGroup.add(fringe);
    });
  } else if (variant === 2) {
    // Male Fade (Photo 2: Clean taper fade)
    const hairTop = new THREE.Mesh(new THREE.BoxGeometry(0.185 * scale, 0.065 * scale, 0.195 * scale), hairMat);
    hairTop.position.set(0, 0.082 * scale, -0.01 * scale);
    hairGroup.add(hairTop);

    [-0.092, 0.092].forEach(sx => {
      const fadeSide = new THREE.Mesh(new THREE.BoxGeometry(0.018 * scale, 0.065 * scale, 0.16 * scale), hairMat);
      fadeSide.position.set(sx * scale, 0.038 * scale, -0.02 * scale);
      hairGroup.add(fadeSide);
    });
  } else if (variant === 3) {
    // Female Sleek (Photo 3: Sleek hair with neat bun at nape)
    const hairSleek = new THREE.Mesh(new THREE.SphereGeometry(0.12 * scale, 14, 12), hairMat);
    hairSleek.scale.set(1.02, 0.88, 1.10);
    hairSleek.position.set(0, 0.045 * scale, -0.015 * scale);
    hairGroup.add(hairSleek);

    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.044 * scale, 10, 8), hairMat);
    bun.position.set(0, 0.01 * scale, -0.118 * scale);
    hairGroup.add(bun);
  }

  return { head, jaw };
}

export function buildLeft4DeadInfected(variant = 0) {
  const root = new THREE.Group();
  const parts = { root, variant, danglingGuts: [] };

  const isFemale = (variant === 0 || variant === 3);
  const isSuitMale = (variant === 2);
  const isVestMale = (variant === 1);

  // Scaled to match Kristin's companion height (NPC_SCALE = 1.38)
  const scale = isFemale ? 1.34 : (isSuitMale ? 1.40 : 1.38);

  // Material selection based on archetypes
  let torsoMat = l4dFlannelMat; // female dirty blouse
  let legMat = l4dDenimMat;     // female dark flared skirt
  let shoeMat = ps1FormalShoeMat;

  if (isVestMale) {
    torsoMat = l4dBruiserMat;   // cream/beige formal vest
    legMat = l4dDarkPantsMat;   // ash grey trousers
  } else if (isSuitMale) {
    torsoMat = l4dHoodieMat;    // dark suit blazer
    legMat = l4dPatientMat;     // black suit slacks
  }

  // 1. Hips / Pelvis
  const hips = new THREE.Group();
  hips.position.y = 0.95 * scale;
  root.add(hips);
  parts.hips = hips;

  const pelvisGeo = new THREE.BoxGeometry(0.26 * scale, 0.20 * scale, 0.20 * scale);
  const pelvis = new THREE.Mesh(pelvisGeo, legMat);
  pelvis.position.y = -0.02 * scale;
  hips.add(pelvis);

  // Female Long Vintage Flared Skirt (Reference Left)
  if (isFemale) {
    // Elegant flared PS1 polygon skirt tapering down from hips to ankles
    const skirtGeo = new THREE.CylinderGeometry(0.20 * scale, 0.44 * scale, 0.74 * scale, 8, 1, true);
    const skirtMesh = new THREE.Mesh(skirtGeo, legMat);
    skirtMesh.position.y = -0.37 * scale;
    hips.add(skirtMesh);
    parts.skirt = skirtMesh;

    // Waistband
    const waistBand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.21 * scale, 0.21 * scale, 0.05 * scale, 8),
      ps1DarkBeltMat
    );
    waistBand.position.y = 0.02 * scale;
    hips.add(waistBand);
  } else {
    // Belt for male zombies
    const belt = new THREE.Mesh(
      new THREE.BoxGeometry(0.28 * scale, 0.04 * scale, 0.21 * scale),
      ps1DarkBeltMat
    );
    belt.position.y = 0.08 * scale;
    hips.add(belt);
  }

  // 2. Spine & Torso
  const spine = new THREE.Group();
  spine.position.y = 0.12 * scale;
  // Natural posture tilts matching PS1 Resident Evil eerie stance
  if (isFemale) {
    spine.rotation.x = 0.10;
    spine.rotation.z = -0.06;
  } else if (isVestMale) {
    spine.rotation.x = 0.24;
    spine.rotation.z = 0.08;
  } else {
    // Suit male: aggressive forward hunch
    spine.rotation.x = 0.30;
    spine.rotation.z = -0.04;
  }
  hips.add(spine);
  parts.spine = spine;

  // Chest / Upper Torso
  const chest = new THREE.Group();
  chest.position.y = 0.22 * scale;
  spine.add(chest);
  parts.chest = chest;

  const chestWidth = isFemale ? 0.28 * scale : 0.34 * scale;
  const chestHeight = 0.32 * scale;
  const chestDepth = isFemale ? 0.18 * scale : 0.22 * scale;
  const chestGeo = new THREE.BoxGeometry(chestWidth, chestHeight, chestDepth);
  const chestMesh = new THREE.Mesh(chestGeo, torsoMat);
  chest.add(chestMesh);

  // Clothing details for male archetypes: Collar & Necktie
  if (!isFemale) {
    // White shirt inner collar
    const collarGeo = new THREE.BoxGeometry(0.12 * scale, 0.07 * scale, 0.08 * scale);
    const collar = new THREE.Mesh(collarGeo, l4dFlannelMat);
    collar.position.set(0, 0.16 * scale, 0.07 * scale);
    chest.add(collar);

    // Hanging necktie
    const tieGeo = new THREE.BoxGeometry(0.05 * scale, 0.22 * scale, 0.02 * scale);
    const tie = new THREE.Mesh(tieGeo, ps1TieMat);
    tie.position.set(0, 0.04 * scale, 0.12 * scale);
    tie.rotation.x = -0.05;
    chest.add(tie);

    // Suit lapels for suit male
    if (isSuitMale) {
      const lapelL = new THREE.Mesh(new THREE.BoxGeometry(0.04 * scale, 0.20 * scale, 0.02 * scale), torsoMat);
      lapelL.position.set(-0.06 * scale, 0.06 * scale, 0.12 * scale);
      lapelL.rotation.z = -0.2;
      chest.add(lapelL);

      const lapelR = new THREE.Mesh(new THREE.BoxGeometry(0.04 * scale, 0.20 * scale, 0.02 * scale), torsoMat);
      lapelR.position.set(0.06 * scale, 0.06 * scale, 0.12 * scale);
      lapelR.rotation.z = 0.2;
      chest.add(lapelR);
    }
  } else {
    // Female blouse folded lapel
    const fCollar = new THREE.Mesh(new THREE.BoxGeometry(0.16 * scale, 0.06 * scale, 0.06 * scale), torsoMat);
    fCollar.position.set(0, 0.15 * scale, 0.07 * scale);
    chest.add(fCollar);
  }

  // 3. Neck & Head
  const neck = new THREE.Group();
  neck.position.y = 0.20 * scale;
  // Sideways broken head tilt for female zombie (reference image)
  if (isFemale) {
    neck.rotation.x = -0.12;
    neck.rotation.z = 0.28; // creepy sideways tilt
  } else if (isVestMale) {
    neck.rotation.x = 0.16;
    neck.rotation.z = -0.22; // tilted head to other side
  } else {
    neck.rotation.x = 0.22; // forward jutting skull
  }
  chest.add(neck);
  parts.neck = neck;

  const neckGeo = new THREE.CylinderGeometry(0.05 * scale, 0.065 * scale, 0.10 * scale, 5);
  neck.add(new THREE.Mesh(neckGeo, l4dNecroticSkinMat));

  // Realistic Anatomical Contoured Head (From User Photos & Not a Box!)
  const { head, jaw } = createRealisticContouredHead(variant, scale);
  head.position.y = 0.12 * scale;
  neck.add(head);
  parts.head = head;
  parts.jaw = jaw;

  // 4. Arms & Hands
  const makeArm = (isRight) => {
    const shoulder = new THREE.Group();
    const sign = isRight ? 1 : -1;
    shoulder.position.set(sign * (chestWidth * 0.58), 0.10 * scale, 0);

    // Asymmetric unsettling zombie arm pose matching PS1 reference
    if (isFemale) {
      shoulder.rotation.x = 0.25 + (isRight ? 0.10 : -0.05);
      shoulder.rotation.z = sign * (isRight ? -0.15 : -0.22);
    } else if (isVestMale) {
      shoulder.rotation.x = 0.40 + (isRight ? 0.15 : 0.0);
      shoulder.rotation.z = sign * -0.18;
    } else {
      // Suit male reaching forward
      shoulder.rotation.x = 0.55 + (isRight ? -0.10 : 0.10);
      shoulder.rotation.z = sign * -0.12;
    }

    // Upper Arm Sleeve
    const sleeveLength = 0.24 * scale;
    const sleeveGeo = new THREE.BoxGeometry(0.09 * scale, sleeveLength, 0.09 * scale);
    const sleeve = new THREE.Mesh(sleeveGeo, torsoMat);
    sleeve.position.y = -sleeveLength * 0.45;
    shoulder.add(sleeve);

    // Elbow / Forearm
    const elbow = new THREE.Group();
    elbow.position.y = -sleeveLength;
    elbow.rotation.x = 0.25 + (isRight ? 0.10 : 0.05);
    shoulder.add(elbow);

    const foreArmLength = 0.22 * scale;
    // Forearm sleeve (shirt/blouse/suit)
    const foreSleeveGeo = new THREE.BoxGeometry(0.08 * scale, foreArmLength * 0.6, 0.08 * scale);
    const foreSleeve = new THREE.Mesh(foreSleeveGeo, torsoMat);
    foreSleeve.position.y = -foreArmLength * 0.25;
    elbow.add(foreSleeve);

    // Exposed necrotic wrist & hand
    const wristGeo = new THREE.BoxGeometry(0.065 * scale, foreArmLength * 0.45, 0.065 * scale);
    const wrist = new THREE.Mesh(wristGeo, l4dNecroticSkinMat);
    wrist.position.y = -foreArmLength * 0.70;
    elbow.add(wrist);

    // PS1 Clawed Hand
    const hand = new THREE.Group();
    hand.position.y = -foreArmLength;
    hand.rotation.x = 0.2;
    elbow.add(hand);

    const palmGeo = new THREE.BoxGeometry(0.07 * scale, 0.08 * scale, 0.03 * scale);
    const palm = new THREE.Mesh(palmGeo, isFemale ? bloodyHandsMat : l4dNecroticSkinMat);
    hand.add(palm);

    // Twisted curled fingers
    [-0.02, 0, 0.02].forEach((fx) => {
      const finger = new THREE.Mesh(
        new THREE.BoxGeometry(0.015 * scale, 0.05 * scale, 0.015 * scale),
        l4dClawsMat
      );
      finger.position.set(fx * scale, -0.05 * scale, 0.01 * scale);
      finger.rotation.x = 0.3;
      hand.add(finger);
    });

    return { shoulder, elbow };
  };

  const lArmData = makeArm(false);
  const rArmData = makeArm(true);
  chest.add(lArmData.shoulder);
  chest.add(rArmData.shoulder);
  parts.lArm = lArmData.shoulder;
  parts.rArm = rArmData.shoulder;
  parts.lFore = lArmData.elbow;
  parts.rFore = rArmData.elbow;

  // 5. Legs & Feet
  const makeLeg = (isRight) => {
    const hip = new THREE.Group();
    const sign = isRight ? 1 : -1;
    hip.position.set(sign * 0.10 * scale, -0.08 * scale, 0);

    const legLength = 0.42 * scale;

    // Upper Leg (Thigh)
    const thighGeo = new THREE.BoxGeometry(0.12 * scale, legLength, 0.12 * scale);
    const thigh = new THREE.Mesh(thighGeo, legMat);
    thigh.position.y = -legLength * 0.5;
    hip.add(thigh);

    // Knee / Shin
    const knee = new THREE.Group();
    knee.position.y = -legLength;
    hip.add(knee);

    const shinLength = 0.42 * scale;
    const shinGeo = new THREE.BoxGeometry(0.105 * scale, shinLength, 0.105 * scale);
    const shin = new THREE.Mesh(shinGeo, legMat);
    shin.position.y = -shinLength * 0.5;
    knee.add(shin);

    // PS1 Formal Dress Shoe (Black/Dark Brown Leather)
    const shoeGroup = new THREE.Group();
    shoeGroup.position.set(0, -shinLength, 0.03 * scale);
    knee.add(shoeGroup);

    const shoeGeo = new THREE.BoxGeometry(0.10 * scale, 0.08 * scale, 0.20 * scale);
    const shoe = new THREE.Mesh(shoeGeo, shoeMat);
    shoe.position.set(0, 0, 0.02 * scale);
    shoeGroup.add(shoe);

    // Shoe heel & toe tip
    const toeGeo = new THREE.BoxGeometry(0.09 * scale, 0.06 * scale, 0.06 * scale);
    const toe = new THREE.Mesh(toeGeo, shoeMat);
    toe.position.set(0, -0.01 * scale, 0.11 * scale);
    shoeGroup.add(toe);

    return { hip, knee };
  };

  const lLegData = makeLeg(false);
  const rLegData = makeLeg(true);
  hips.add(lLegData.hip);
  hips.add(rLegData.hip);
  parts.lLeg = lLegData.hip;
  parts.rLeg = rLegData.hip;
  parts.lShin = lLegData.knee;
  parts.rShin = rLegData.knee;

  parts.scale = scale;

  // PS1 Flat Shading Optimization
  if (!isMobileDevice) {
    if (chestMesh) chestMesh.castShadow = true;
    if (pelvis) pelvis.castShadow = true;
    if (parts.skirt) parts.skirt.castShadow = true;
  }

  return parts;
}

export function buildSisterValentina() {
  const root = new THREE.Group();
  const parts = { root, isBoss: true };
  const scale = 1.35;

  const hips = new THREE.Group();
  hips.position.y = 1.1 * scale;
  root.add(hips);
  parts.hips = hips;

  const habitDress = new THREE.Mesh(
    new THREE.CylinderGeometry(0.38 * scale, 0.72 * scale, 1.45 * scale, 7),
    nunHabitMat
  );
  habitDress.position.y = -0.45 * scale;
  hips.add(habitDress);

  const spine = new THREE.Group();
  spine.position.y = 0.22 * scale;
  hips.add(spine);
  parts.spine = spine;

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.72 * scale, 0.65 * scale, 0.48 * scale), nunHabitMat);
  torso.position.y = 0.42 * scale;
  spine.add(torso);

  const mantle = new THREE.Mesh(new THREE.CylinderGeometry(0.55 * scale, 0.85 * scale, 0.68 * scale, 7), nunMantleMat);
  mantle.position.y = 0.46 * scale;
  spine.add(mantle);

  const crossGroup = new THREE.Group();
  crossGroup.position.set(0, 0.35 * scale, 0.38 * scale);
  const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.04 * scale, 0.32 * scale, 0.02 * scale), silverCrossMat);
  const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.2 * scale, 0.04 * scale, 0.02 * scale), silverCrossMat);
  crossH.position.y = 0.06 * scale;
  crossGroup.add(crossV);
  crossGroup.add(crossH);
  spine.add(crossGroup);

  const neck = new THREE.Group();
  neck.position.set(0, 0.82 * scale, 0.02 * scale);
  spine.add(neck);
  parts.neck = neck;

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42 * scale, 0.48 * scale, 0.42 * scale), nunFaceMat);
  neck.add(head);
  parts.head = head;

  const veilCap = new THREE.Mesh(new THREE.BoxGeometry(0.48 * scale, 0.52 * scale, 0.46 * scale), nunVeilMat);
  veilCap.position.set(0, 0.03 * scale, -0.04 * scale);
  neck.add(veilCap);

  const veilHang = new THREE.Mesh(new THREE.BoxGeometry(0.52 * scale, 1.2 * scale, 0.12 * scale), nunVeilMat);
  veilHang.position.set(0, -0.45 * scale, -0.28 * scale);
  veilHang.rotation.x = -0.12;
  neck.add(veilHang);

  const makeNunCurvedArm = (isRight) => {
    const sideSign = isRight ? 1 : -1;
    const shoulder = new THREE.Group();
    shoulder.position.set(sideSign * 0.52 * scale, 0.65 * scale, 0);

    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * scale, 0.14 * scale, 0.62 * scale, 5), nunMantleMat);
    upper.position.set(sideSign * 0.22 * scale, 0.05 * scale, 0);
    upper.rotation.z = sideSign * (-0.75);
    shoulder.add(upper);

    const foreArmGroup = new THREE.Group();
    foreArmGroup.position.set(sideSign * 0.42 * scale, 0.22 * scale, 0);

    const foreArm = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * scale, 0.12 * scale, 0.58 * scale, 5), paleFleshMat);
    foreArm.position.y = 0.26 * scale;
    foreArm.rotation.z = sideSign * 0.45;
    foreArm.rotation.x = 0.25;
    foreArmGroup.add(foreArm);

    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.18 * scale, 0.24 * scale, 0.12 * scale), bloodyHandsMat);
    hand.position.set(0, 0.55 * scale, 0);
    foreArmGroup.add(hand);

    [-0.06, 0, 0.06].forEach((fX, idx) => {
      const claw = new THREE.Mesh(new THREE.BoxGeometry(0.04 * scale, 0.22 * scale, 0.04 * scale), bloodyHandsMat);
      claw.position.set(fX * scale, 0.72 * scale, (idx === 1 ? 0.04 : -0.02) * scale);
      claw.rotation.z = sideSign * (0.15 + idx * 0.08);
      claw.rotation.x = 0.2;
      foreArmGroup.add(claw);
    });

    shoulder.add(foreArmGroup);
    return { shoulder, foreArmGroup };
  };

  const lArmData = makeNunCurvedArm(false);
  const rArmData = makeNunCurvedArm(true);
  spine.add(lArmData.shoulder);
  spine.add(rArmData.shoulder);

  parts.lArm = lArmData.shoulder;
  parts.rArm = rArmData.shoulder;
  parts.lFore = lArmData.foreArmGroup;
  parts.rFore = rArmData.foreArmGroup;
  parts.scale = scale;

  if (habitDress) habitDress.castShadow = true;
  if (torso) torso.castShadow = true;
  return parts;
}

export function preloadNonaBataviaModel(scene) {
  if (typeof THREE === 'undefined' || !THREE.GLTFLoader) return;
  const loader = new THREE.GLTFLoader();
  loader.load(
    '/models/nona_batavia.glb',
    (gltf) => {
      ladyMithrillTemplate = gltf.scene;
      ladyMithrillTemplate.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            child.material.roughness = 0.82;
            child.material.metalness = 0.08;
            child.material.needsUpdate = true;
          }
        }
      });
      console.log('Nona Batavia 3D Model preloaded successfully!');
    },
    undefined,
    (err) => {
      console.warn('Retrying Nona Batavia load from fallback:', err);
      loader.load('/models/lady_mithrill.glb', (gltf) => {
        ladyMithrillTemplate = gltf.scene;
        console.log('Nona Batavia loaded from fallback!');
      });
    }
  );
}
export const preloadLadyMithrillModel = preloadNonaBataviaModel;

export function buildNonaBatavia() {
  const root = new THREE.Group();
  root.name = 'Nona_Batavia_Boss_Root';
  const scale = 2.85; // Colossal, giant floating spectre boss
  const parts = { root, isBoss: true, isFloatingBoss: true, bossType: 'nona_batavia', scale };

  const modelHolder = new THREE.Group();
  modelHolder.scale.set(scale, scale, scale);
  root.add(modelHolder);
  parts.modelHolder = modelHolder;

  // Head proxy for raycast shooting headshots
  const headProxy = new THREE.Group();
  headProxy.position.set(0, 1.54 * scale, 0);
  root.add(headProxy);
  parts.head = headProxy;

  if (ladyMithrillTemplate) {
    const clone = ladyMithrillTemplate.clone(true);
    modelHolder.add(clone);
  } else {
    // If template wasn't ready yet, load immediately
    const loader = new THREE.GLTFLoader();
    loader.load('/models/nona_batavia.glb', (gltf) => {
      gltf.scene.traverse(c => {
        if (c.isMesh) {
          c.castShadow = true;
          c.receiveShadow = true;
        }
      });
      modelHolder.add(gltf.scene);
    }, undefined, () => {
      loader.load('/models/lady_mithrill.glb', (gltf) => {
        modelHolder.add(gltf.scene);
      });
    });
  }

  return parts;
}
export const buildLadyMithrill = buildNonaBatavia;

export function preloadVictorianBrideModel(scene) {
  if (typeof THREE === 'undefined' || !THREE.GLTFLoader) return;
  const loader = new THREE.GLTFLoader();
  loader.load(
    '/models/victorian_bride.glb',
    (gltf) => {
      victorianBrideTemplate = gltf.scene;
      victorianBrideTemplate.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.name === 'Lace_Veil' || (child.material && child.material.name === 'Mat_Lace_Veil_Transparent')) {
            child.material.transparent = true;
            child.material.alphaTest = 0.12;
            child.material.side = THREE.DoubleSide;
            child.material.depthWrite = true;
            child.material.needsUpdate = true;
          }
          if (child.material) {
            child.material.roughness = 0.78;
            child.material.metalness = 0.05;
          }
        }
      });
      console.log('Victorian Bride 3D Model preloaded successfully!');
    },
    undefined,
    (err) => {
      console.warn('Failed preloading Victorian Bride model:', err);
    }
  );
}

export function buildVictorianBride() {
  const root = new THREE.Group();
  root.name = 'Victorian_Bride_Root';
  const scale = 1.08;
  const parts = { root, isVictorianBride: true, scale };

  const modelHolder = new THREE.Group();
  modelHolder.scale.set(scale, scale, scale);
  root.add(modelHolder);
  parts.modelHolder = modelHolder;

  // Head proxy for raycast shooting headshots
  const headProxy = new THREE.Group();
  headProxy.position.set(0, 1.62 * scale, 0);
  root.add(headProxy);
  parts.head = headProxy;

  if (victorianBrideTemplate) {
    const clone = victorianBrideTemplate.clone(true);
    modelHolder.add(clone);
  } else {
    const loader = new THREE.GLTFLoader();
    loader.load('/models/victorian_bride.glb', (gltf) => {
      gltf.scene.traverse(c => {
        if (c.isMesh) {
          c.castShadow = true;
          c.receiveShadow = true;
          if (c.name === 'Lace_Veil' || (c.material && c.material.name === 'Mat_Lace_Veil_Transparent')) {
            c.material.transparent = true;
            c.material.alphaTest = 0.12;
            c.material.side = THREE.DoubleSide;
          }
        }
      });
      modelHolder.add(gltf.scene);
    });
  }

  return parts;
}

export function triggerBrideJumpscare() {
  const overlay = document.getElementById('jumpscare-overlay');
  if (!overlay) return;

  if (Sfx.playBrideJumpscareScream) {
    Sfx.playBrideJumpscareScream();
  }

  overlay.classList.remove('hidden');
  overlay.classList.remove('active');
  void overlay.offsetWidth; // Force CSS reflow
  overlay.classList.add('active');

  const canvas = document.getElementById('ps1-canvas') || document.querySelector('canvas');
  if (canvas) {
    canvas.style.filter = 'invert(0.2) saturate(220%) contrast(180%)';
    setTimeout(() => {
      if (canvas) canvas.style.filter = '';
    }, 450);
  }

  setTimeout(() => {
    overlay.classList.remove('active');
    overlay.classList.add('hidden');
  }, 560);
}

export function spawnVictorianBride(x, z, state) {
  if (!sceneRef) return;
  const model = buildVictorianBride();
  const gy = getTerrainHeight(x, z);
  model.root.position.set(x, gy, z);
  sceneRef.add(model.root);

  const wave = state ? state.wave : 1;
  const hp = 85 + wave * 14;
  const speed = 6.4 + Math.random() * 0.9; // Fast sprinter (significantly faster than regular 2.8 - 3.5 zombie)
  const dmg = 24;

  zombies.push({
    model,
    isBoss: false,
    isVictorianBride: true,
    x,
    z,
    hp,
    maxHp: hp,
    speed,
    dmg,
    isDead: false,
    sprintAnimTime: Math.random() * 10,
    attackCooldown: 0,
    jumpscareCooldown: 0,
    staggerTimer: 0,
    dripTimer: 0.22,
    lastStepPos: new THREE.Vector2(x, z)
  });
}

export function spawnWinterZombie(x, z, state) {
  if (!sceneRef) return;
  const variant = Math.floor(Math.random() * 4);
  const model = buildLeft4DeadInfected(variant);
  model.root.position.set(x, 0, z);
  sceneRef.add(model.root);

  let hp = 65 + state.wave * 14;
  let speed = 2.8 + Math.random() * 0.8;
  let dmg = 15;

  if (variant === 1) {
    speed *= 1.25;
    hp *= 0.88;
  } else if (variant === 3) {
    hp *= 1.35;
    speed *= 0.88;
    dmg = 20;
  }

  zombies.push({
    model,
    variant,
    isBoss: false,
    x,
    z,
    hp,
    maxHp: hp,
    speed,
    dmg,
    isDead: false,
    stepTime: Math.random() * 10,
    attackCooldown: 0,
    attackAnimTime: 0,
    staggerTimer: 0,
    shriekCooldown: 1.5 + Math.random() * 4.0,
    headTwitchSeed: Math.random() * 100,
    dripTimer: Math.random() * 0.35,
    lastStepPos: new THREE.Vector2(x, z)
  });

  Sfx.playL4DRoar();
}

export function spawnSisterValentinaBoss(state) {
  // Disabled for now per user request
  return;
  if (!sceneRef || !cameraRef) return;

  Sfx.playChurchBellToll();
  Sfx.playNunChoirScream();
  Sfx.playBossVoiceNote();

  const banner = document.getElementById('boss-warning-flash');
  if (banner) {
    banner.textContent = 'PERINGATAN: SISTER VALENTINA TELAH BANGKIT!';
    banner.style.color = '#ff3344';
    banner.style.opacity = '1';
    setTimeout(() => { if (banner) banner.style.opacity = '0'; }, 3200);
  }

  const nameBanner = document.getElementById('boss-name-banner');
  if (nameBanner) {
    nameBanner.textContent = 'SISTER VALENTINA - THE BLEEDING MOTHER';
    nameBanner.style.color = '#ff4455';
    nameBanner.style.textShadow = '0 0 16px rgba(255, 30, 50, 0.8), 2px 2px 0 #300';
  }

  const hudCont = document.getElementById('boss-hud-container');
  if (hudCont) hudCont.style.display = 'flex';
  const barFill = document.getElementById('boss-bar-fill');
  if (barFill) {
    barFill.style.width = '100%';
    barFill.style.background = 'linear-gradient(90deg, #990011, #ff2233, #ff6677)';
  }

  const spawnAng = cameraRef.rotation.y + Math.PI + (Math.random() - 0.5) * 0.5;
  const spawnDist = 26;
  const bx = cameraRef.position.x + Math.sin(spawnAng) * spawnDist;
  const bz = cameraRef.position.z + Math.cos(spawnAng) * spawnDist;

  const model = buildSisterValentina();
  model.root.position.set(bx, 0.4, bz);
  sceneRef.add(model.root);

  const maxHp = 700 + (state.wave - 3) * 200;

  currentBoss = {
    model,
    isBoss: true,
    isFloatingBoss: false,
    bossType: 'sister_valentina',
    x: bx,
    z: bz,
    hp: maxHp,
    maxHp: maxHp,
    speed: 4.8,
    dmg: 28,
    isDead: false,
    floatTime: 0,
    attackCooldown: 0,
    teleportCooldown: 7.0,
    curseCooldown: 4.5,
    screamSummonCooldown: 12.0,
    dripTimer: 0.18,
    lastStepPos: new THREE.Vector2(bx, bz)
  };

  zombies.push(currentBoss);
}

export function spawnNonaBataviaBoss(state) {
  if (!sceneRef || !cameraRef) return;

  // Update Boss Banner
  const nameBanner = document.getElementById('boss-name-banner');
  if (nameBanner) {
    nameBanner.textContent = 'NONA BATAVIA - ROH GENTAYANGAN';
    nameBanner.style.color = '#ffd15c';
    nameBanner.style.textShadow = '0 0 16px rgba(223, 183, 67, 0.8), 2px 2px 0 #400';
  }

  const killsCount = state ? state.kills : 50;
  const milestoneCount = Math.max(1, Math.floor(killsCount / 50));

  const banner = document.getElementById('boss-warning-flash');
  if (banner) {
    banner.textContent = `PERINGATAN: ${killsCount} CRIMSON PURGED! NONA BATAVIA MENDEKAT!`;
    banner.style.color = '#ffd15c';
    banner.style.opacity = '1';
    setTimeout(() => { if (banner) banner.style.opacity = '0'; }, 3400);
  }

  const hudCont = document.getElementById('boss-hud-container');
  if (hudCont) hudCont.style.display = 'none'; // Hidden during cinematic cutscene, revealed when cutscene finishes
  const barFill = document.getElementById('boss-bar-fill');
  if (barFill) {
    barFill.style.width = '100%';
    barFill.style.background = 'linear-gradient(90deg, #b8860b, #ffd700, #ff4500)';
  }

  // Spawns in mid-air in front of camera view (22m away, floating high)
  const spawnAng = cameraRef.rotation.y + Math.PI + (Math.random() - 0.5) * 0.35;
  const spawnDist = 22;
  const bx = cameraRef.position.x + Math.sin(spawnAng) * spawnDist;
  const bz = cameraRef.position.z + Math.cos(spawnAng) * spawnDist;
  const groundY = getTerrainHeight(bx, bz);

  const model = buildNonaBatavia();
  const flyAlt = 4.4; // Giant floating height above terrain
  const initFlyY = groundY + flyAlt; // FLYING - DOES NOT TOUCH GROUND!
  model.root.position.set(bx, initFlyY, bz);
  sceneRef.add(model.root);

  const maxHp = 450 + (milestoneCount - 1) * 150;

  currentBoss = {
    model,
    isBoss: true,
    isFloatingBoss: true,
    bossType: 'nona_batavia',
    x: bx,
    z: bz,
    y: initFlyY,
    flyAltitude: flyAlt,
    hp: maxHp,
    maxHp: maxHp,
    speed: 4.0,
    dmg: 24,
    isDead: false,
    floatTime: 0,
    attackCooldown: 0,
    curseCooldown: 3.2,
    screamSummonCooldown: 8.5,
    swaySeed: Math.random() * 10,
    lastStepPos: new THREE.Vector2(bx, bz)
  };

  zombies.push(currentBoss);

  // Trigger Nona Batavia Cinematic Cutscene with sound
  startNonaBataviaCutscene(currentBoss, cameraRef, Sfx, () => {
    showDialogSubtitle(`Waspada bro! Nona Batavia gentayangan terbang di atas bawa pasukan! Tembak jatuh!`);

    // Escort pack of running zombies spawns when cutscene ends
    const escortCount = Math.min(12, 7 + milestoneCount);
    for (let k = 0; k < escortCount; k++) {
      const escortAng = spawnAng + (k - escortCount / 2) * 0.28;
      const escortDist = spawnDist - 2.5 - Math.random() * 4.0;
      const ex = cameraRef.position.x + Math.sin(escortAng) * escortDist;
      const ez = cameraRef.position.z + Math.cos(escortAng) * escortDist;
      setTimeout(() => {
        if (state && !state.running) return;
        spawnWinterZombie(ex, ez, state);
      }, k * 180);
    }
  });
}
export const spawnLadyMithrillBoss = spawnNonaBataviaBoss;

const sharedCurseOrbGeo = new THREE.DodecahedronGeometry(0.35, 1);
const sharedCurseOrbMat = new THREE.MeshBasicMaterial({ color: 0xff1122 });

export function castCurseBloodOrb(origin, target) {
  if (!sceneRef) return;
  Sfx.playCurseOrbCast();

  const dir = new THREE.Vector3().subVectors(target, origin).normalize();
  const orbMesh = new THREE.Mesh(sharedCurseOrbGeo, sharedCurseOrbMat);
  orbMesh.position.copy(origin);
  sceneRef.add(orbMesh);

  curseProjectiles.push({
    mesh: orbMesh,
    dir: dir,
    speed: 13.5,
    life: 4.0
  });
}

export function killZombieWithKinematics(z, shotDir, hitDistance, isHeadshot, state, updateHUD, nextWave) {
  z.isDead = true;
  state.kills++;
  state.score += (z.isBoss ? 2500 : (isHeadshot ? 200 : 100));

  // Horde ammo scavenger bonus (killed infected drop shotgun shells)
  if (state.player) {
    const ammoGain = isHeadshot ? 3 : (Math.random() < 0.55 ? 2 : 1);
    state.player.reserve = Math.min((state.player.reserve || 0) + ammoGain, 48);
  }
  if (updateHUD) updateHUD();

  // Nona Batavia Boss Encounter: Triggers every 50 kills (50, 100, 150, 200, ...)
  const milestone = Math.floor(state.kills / 50) * 50;
  if (milestone >= 50 && milestone > (state.lastLadyMithrillKills || 0)) {
    state.lastLadyMithrillKills = milestone;
    console.log(`[BOSS] Nona Batavia Milestone Reached: ${state.kills} Kills! Spawning aerial boss...`);
    setTimeout(() => {
      if (state && state.running) {
        spawnNonaBataviaBoss(state);
      }
    }, 700);
  }

  if (z.isBoss) {
    const bossHud = document.getElementById('boss-hud-container');
    if (bossHud) bossHud.style.display = 'none';
    currentBoss = null;
    if (z.isFloatingBoss) {
      if (Sfx.playNonaBataviaScream) Sfx.playNonaBataviaScream();
      else if (Sfx.playLadyMithrillScream) Sfx.playLadyMithrillScream();
      showDialogSubtitle('Waspada bro! Tubuhnya kelebihan energi gaib! Dia mau meledak!');
      setTimeout(() => {
        showDialogSubtitle('GILA LU BRO! Hancur lebur tuh setan Batavia! Kita selamat!');
      }, 2600);
      spawnNonaBataviaDeathSequence(z, Sfx);

      const alive = zombies.filter(m => !m.isDead);
      if (alive.length === 0) {
        setTimeout(nextWave, 3600);
      }
      return;
    } else {
      Sfx.playChurchBellToll();
    }
  }

  const model = z.model;
  const rotY = model.root.rotation.y;
  const facing = new THREE.Vector3(Math.sin(rotY), 0, Math.cos(rotY));
  const right = new THREE.Vector3(Math.cos(rotY), 0, -Math.sin(rotY));

  const frontBack = -facing.dot(shotDir);
  const sideProj = right.dot(shotDir);

  let style = 'backward';
  if (z.isFloatingBoss) style = 'spectral_descent';
  else if (isHeadshot) style = 'headshot_spin';
  else if (Math.abs(sideProj) > 0.5) style = 'twist';
  else if (frontBack < -0.2) style = 'faceplant';

  const pushPower = Math.max(2.8, (13.0 - hitDistance) * 0.85) * (z.isBoss ? 0.6 : 1.0);
  const linVel = new THREE.Vector3(shotDir.x * pushPower, 0.4, shotDir.z * pushPower);

  deadCorpses.push({
    model: model,
    isBoss: z.isBoss,
    isFloatingBoss: !!z.isFloatingBoss,
    isVictorianBride: !!z.isVictorianBride,
    style: style,
    sideSign: sideProj >= 0 ? 1 : -1,
    age: 0,
    maxLife: 10.0,
    linVel: linVel,
    hipsY: model.hips ? model.hips.position.y : 0,
    hipsRotX: 0,
    hipsRotZ: 0,
    spineRotX: 0,
    neckRotX: 0,
    kneeAngle: 0,
    gutSpillDone: false,
    hasImpactedGround: false,
    settled: false,
    weight: z.isBoss ? 1.8 : 1.0
  });

  spawnBloodPoolOnSnow(z.x, z.z, z.isBoss ? 2.2 : 1.0);

  const alive = zombies.filter(m => !m.isDead);
  if (alive.length === 0) {
    setTimeout(nextWave, 2600);
  }
}

export function clearEnemies() {
  if (sceneRef) {
    zombies.forEach(z => sceneRef.remove(z.model.root));
  }
  zombies.length = 0;
  currentBoss = null;
}
