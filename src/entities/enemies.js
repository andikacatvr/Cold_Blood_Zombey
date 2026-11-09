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

  l4dFlannelMat = new THREE.MeshLambertMaterial({ map: l4dFlannelTex, flatShading: false });
  l4dHoodieMat = new THREE.MeshLambertMaterial({ map: l4dHoodieTex, flatShading: false });
  l4dPatientMat = new THREE.MeshLambertMaterial({ map: l4dPatientTex, flatShading: false });
  l4dBruiserMat = new THREE.MeshLambertMaterial({ map: l4dBruiserTex, flatShading: false });
  l4dDenimMat = new THREE.MeshLambertMaterial({ map: l4dDenimTex, flatShading: false });
  l4dDarkPantsMat = new THREE.MeshLambertMaterial({ map: l4dDarkPantsTex, flatShading: false });
  l4dFaceMat = new THREE.MeshLambertMaterial({ map: l4dFaceTex, flatShading: false });
  l4dNecroticSkinMat = new THREE.MeshLambertMaterial({ map: l4dNecroticSkinTex, flatShading: false });
  l4dClawsMat = new THREE.MeshLambertMaterial({ map: l4dClawsTex, flatShading: false });
  l4dBootMat = new THREE.MeshLambertMaterial({ color: 0x181311, flatShading: false });
  l4dHairMat = new THREE.MeshLambertMaterial({ color: 0x1c1715, flatShading: false });

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

export function buildLeft4DeadInfected(variant = 0) {
  const root = new THREE.Group();
  const parts = { root, variant };

  const scale = (variant === 3) ? 1.14 : ((variant === 1) ? 0.94 : 1.0);

  let shirtMat = l4dFlannelMat;
  let pantsMat = l4dDenimMat;
  if (variant === 1) {
    shirtMat = l4dHoodieMat;
    pantsMat = l4dDarkPantsMat;
  } else if (variant === 2) {
    shirtMat = l4dPatientMat;
    pantsMat = l4dPatientMat;
  } else if (variant === 3) {
    shirtMat = l4dBruiserMat;
    pantsMat = l4dDenimMat;
  }

  // 1. Hips & Anatomical Pelvic Girdle
  const hips = new THREE.Group();
  hips.position.y = 0.96 * scale;
  root.add(hips);
  parts.hips = hips;

  const pelvis = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24 * scale, 0.17 * scale, 0.28 * scale, 7),
    pantsMat
  );
  pelvis.scale.set(1.15, 1.0, 0.85);
  hips.add(pelvis);

  // Shredded cloth rags hanging from waist
  [-0.12, 0, 0.12].forEach((tx, idx) => {
    const rag = new THREE.Mesh(
      new THREE.ConeGeometry(0.05 * scale, 0.18 * scale, 3),
      pantsMat
    );
    rag.position.set(tx * scale, -0.16 * scale, (idx === 1 ? 0.12 : -0.10) * scale);
    rag.rotation.x = idx === 1 ? 0.4 : -0.3;
    rag.rotation.z = (idx - 1) * 0.2;
    hips.add(rag);
  });

  // 2. Spine & Gaunt Anatomical Torso
  const spine = new THREE.Group();
  spine.position.y = 0.16 * scale;
  spine.rotation.x = 0.32;
  hips.add(spine);
  parts.spine = spine;

  // Gaunt, emaciated ribcage tapered at the waist and flared at the clavicles
  const chestGeo = new THREE.CylinderGeometry(0.31 * scale, 0.21 * scale, 0.52 * scale, 8);
  const chest = new THREE.Mesh(chestGeo, shirtMat);
  chest.position.y = 0.48 * scale;
  chest.scale.set(1.18, 1.0, 0.76);
  spine.add(chest);
  parts.chest = chest;

  // Hollow gaping wound cavity in the chest
  const cavity = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.16 * scale, 0),
    fleshDarkClotMat
  );
  cavity.position.set(0.04 * scale, 0.46 * scale, 0.16 * scale);
  cavity.scale.set(1.1, 1.5, 0.7);
  spine.add(cavity);

  // 4 pairs of 3D curved anatomical ribs piercing through torn flesh and clothes
  [-1, 1].forEach((sideSign) => {
    for (let r = 0; r < 4; r++) {
      const ribR = (0.16 - r * 0.015) * scale;
      const ribTube = 0.018 * scale;
      const rib = new THREE.Mesh(
        new THREE.TorusGeometry(ribR, ribTube, 4, 8, Math.PI * 0.72),
        exposedWhiteRibMat
      );
      rib.position.set(sideSign * 0.07 * scale, (0.58 - r * 0.08) * scale, 0.12 * scale);
      rib.rotation.y = sideSign * 0.35;
      rib.rotation.x = 0.25 - r * 0.05;
      rib.rotation.z = sideSign * (-0.3 + r * 0.08);
      spine.add(rib);
    }
  });

  // Protruding rotting vertebral column along the spine on the back
  for (let v = 0; v < 5; v++) {
    const vert = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.034 * scale, 0),
      exposedWhiteRibMat
    );
    vert.position.set(0, (0.32 + v * 0.08) * scale, -0.16 * scale);
    vert.scale.set(0.9, 1.1, 1.4);
    spine.add(vert);
  }

  // Visceral clotted gore blobs
  const goreSplatter = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.08 * scale, 0),
    fleshRawCrimsonMat
  );
  goreSplatter.position.set(-0.06 * scale, 0.38 * scale, 0.18 * scale);
  goreSplatter.scale.set(1.3, 0.7, 0.8);
  spine.add(goreSplatter);

  // Intestinal coils & dangling entrails
  const gutAnchor = new THREE.Group();
  gutAnchor.position.set(0, 0.18 * scale, 0.20 * scale);
  spine.add(gutAnchor);
  parts.gutAnchor = gutAnchor;

  for (let i = 0; i < 4; i++) {
    const loopR = (0.06 + (i % 2) * 0.03) * scale;
    const loop = new THREE.Mesh(
      new THREE.TorusGeometry(loopR, 0.035 * scale, 5, 8),
      i % 2 === 0 ? intestineWetPinkMat : fleshDarkClotMat
    );
    loop.position.set(((i % 3 - 1) * 0.08) * scale, (-Math.floor(i / 3) * 0.06) * scale, (i * 0.02) * scale);
    gutAnchor.add(loop);
  }

  const danglingGuts = [];
  for (let s = 0; s < 2; s++) {
    const strand = new THREE.Group();
    strand.position.set((s * 0.12 - 0.06) * scale, -0.04 * scale, 0.02 * scale);
    let parentJoint = strand;
    const segments = [];
    for (let k = 0; k < 3; k++) {
      const segGeo = new THREE.CylinderGeometry(0.034 * scale, 0.030 * scale, 0.14 * scale, 5);
      const segMesh = new THREE.Mesh(segGeo, k % 2 === 0 ? intestineWetPinkMat : fleshDarkClotMat);
      segMesh.position.y = -0.07 * scale;
      const joint = new THREE.Group();
      joint.add(segMesh);
      if (k > 0) joint.position.y = -0.13 * scale;
      parentJoint.add(joint);
      parentJoint = joint;
      segments.push(joint);
    }
    gutAnchor.add(strand);
    danglingGuts.push({ root: strand, segments, phase: s * 1.4 });
  }
  parts.danglingGuts = danglingGuts;

  // 3. Neck, Anatomical Horror Skull & Distended Mandible
  const neck = new THREE.Group();
  neck.position.set(0, 0.74 * scale, 0.04 * scale);
  neck.rotation.x = -0.18;
  spine.add(neck);
  parts.neck = neck;

  // Necrotic cervical column with torn gristle
  const neckMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.085 * scale, 0.11 * scale, 0.22 * scale, 6),
    l4dNecroticSkinMat
  );
  neckMesh.position.y = 0.08 * scale;
  neck.add(neckMesh);

  // Organic low-poly horror skull with recessed temples and rotting brow ridge
  const skullGroup = new THREE.Group();
  skullGroup.position.y = 0.22 * scale;
  neck.add(skullGroup);
  parts.head = skullGroup;

  const cranium = new THREE.Mesh(
    new THREE.SphereGeometry(0.22 * scale, 8, 7),
    l4dNecroticSkinMat
  );
  cranium.scale.set(0.92, 1.14, 1.06);
  skullGroup.add(cranium);

  // Rotting exposed parietal bone cap
  const exposedBone = new THREE.Mesh(
    new THREE.SphereGeometry(0.14 * scale, 6, 5),
    exposedWhiteRibMat
  );
  exposedBone.position.set(-0.04 * scale, 0.12 * scale, -0.04 * scale);
  exposedBone.scale.set(1.1, 0.6, 1.0);
  skullGroup.add(exposedBone);

  // Sunken eye sockets & feral glowing pinpoints
  [-0.085, 0.085].forEach((eyeX) => {
    // Sunken orbital cavity
    const socket = new THREE.Mesh(
      new THREE.SphereGeometry(0.052 * scale, 6, 5),
      fleshDarkClotMat
    );
    socket.position.set(eyeX * scale, 0.04 * scale, 0.18 * scale);
    socket.scale.set(1.0, 0.8, 0.6);
    skullGroup.add(socket);

    // Feral glowing pupil (piercing evil red gaze)
    const pupil = new THREE.Mesh(
      new THREE.SphereGeometry(0.024 * scale, 5, 4),
      feralGlowingEyesMat
    );
    pupil.position.set(eyeX * scale, 0.04 * scale, 0.21 * scale);
    skullGroup.add(pupil);
  });

  // Rotting stringy hair clumps hanging from scalp
  [-0.14, 0.12, -0.02].forEach((hx, hidx) => {
    const hairStrand = new THREE.Mesh(
      new THREE.ConeGeometry(0.055 * scale, 0.24 * scale, 3),
      l4dHairMat
    );
    hairStrand.position.set(hx * scale, 0.10 * scale, (hidx === 2 ? -0.16 : -0.08) * scale);
    hairStrand.rotation.x = hidx === 2 ? -0.5 : 0.3;
    hairStrand.rotation.z = (hx > 0 ? 0.35 : -0.35);
    skullGroup.add(hairStrand);
  });

  // Upper jaw maxilla with sharp needle fangs
  [-0.06, -0.02, 0.02, 0.06].forEach((tx) => {
    const tooth = new THREE.Mesh(
      new THREE.ConeGeometry(0.014 * scale, 0.052 * scale, 3),
      exposedWhiteRibMat
    );
    tooth.position.set(tx * scale, -0.10 * scale, 0.18 * scale);
    tooth.rotation.x = Math.PI;
    skullGroup.add(tooth);
  });

  // Distended Jaw / Lower Mandible
  const jaw = new THREE.Group();
  jaw.position.set(0, 0.06 * scale, 0.08 * scale);
  jaw.rotation.x = 0.38;
  neck.add(jaw);
  parts.jaw = jaw;

  const mandible = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13 * scale, 0.07 * scale, 0.14 * scale, 5),
    fleshDarkClotMat
  );
  mandible.position.set(0, -0.06 * scale, 0.04 * scale);
  mandible.scale.set(1.15, 0.7, 1.4);
  jaw.add(mandible);

  // Lower needle fangs pointing upwards
  [-0.05, -0.015, 0.015, 0.05].forEach((tx) => {
    const tooth = new THREE.Mesh(
      new THREE.ConeGeometry(0.014 * scale, 0.048 * scale, 3),
      exposedWhiteRibMat
    );
    tooth.position.set(tx * scale, 0.02 * scale, 0.11 * scale);
    jaw.add(tooth);
  });

  // Stretched bloody cheek tendon cords
  [-0.10, 0.10].forEach((sx) => {
    const tendon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012 * scale, 0.012 * scale, 0.12 * scale, 4),
      fleshRawCrimsonMat
    );
    tendon.position.set(sx * scale, 0.01 * scale, 0.04 * scale);
    jaw.add(tendon);
  });

  // 4. Arms & Gaunt Horror Claws
  const makeArm = (isRight) => {
    const sSign = isRight ? 1 : -1;
    const isBruiserRight = (variant === 3 && isRight);
    const armThick = isBruiserRight ? 1.5 : 1.0;

    const shoulder = new THREE.Group();
    shoulder.position.set(sSign * 0.40 * scale, 0.62 * scale, 0);

    // Anatomical shoulder deltoid
    const deltoid = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.12 * armThick * scale, 0),
      shirtMat
    );
    deltoid.scale.set(1.1, 1.2, 1.0);
    shoulder.add(deltoid);

    // Upper arm / bicep
    const bicep = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11 * armThick * scale, 0.09 * armThick * scale, 0.44 * scale, 6),
      shirtMat
    );
    bicep.position.set(0, -0.20 * scale, 0);
    shoulder.add(bicep);

    const elbow = new THREE.Group();
    elbow.position.set(0, -0.42 * scale, 0);
    shoulder.add(elbow);

    // Forearm with torn necrotic flesh
    const forearm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.095 * armThick * scale, 0.075 * armThick * scale, 0.42 * scale, 6),
      isBruiserRight ? fleshDarkClotMat : l4dNecroticSkinMat
    );
    forearm.position.set(0, -0.19 * scale, 0);
    elbow.add(forearm);

    // Bruiser mutated bone spikes on elbow/forearm
    if (isBruiserRight) {
      for (let sp = 0; sp < 3; sp++) {
        const spike = new THREE.Mesh(
          new THREE.ConeGeometry(0.035 * scale, 0.18 * scale, 4),
          exposedWhiteRibMat
        );
        spike.position.set(0.08 * scale, (-0.08 - sp * 0.11) * scale, -0.06 * scale);
        spike.rotation.z = -0.7;
        spike.rotation.x = 0.3;
        elbow.add(spike);
      }
    }

    // Hand & Gaunt Horror Claws (curved palm + 4 elongated skeletal talons)
    const handGroup = new THREE.Group();
    handGroup.position.set(0, -0.42 * scale, 0);
    elbow.add(handGroup);

    // Flattened palm
    const palm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065 * armThick * scale, 0.045 * armThick * scale, 0.11 * scale, 5),
      l4dClawsMat
    );
    palm.scale.set(1.2, 1.0, 0.6);
    palm.position.y = -0.04 * scale;
    handGroup.add(palm);

    // 4 needle claw fingers
    [-0.04, -0.013, 0.013, 0.04].forEach((fx, fidx) => {
      const clawLen = (isBruiserRight ? 0.22 : (0.13 + (1 - Math.abs(fidx - 1.5)) * 0.03)) * scale;
      const claw = new THREE.Mesh(
        new THREE.ConeGeometry(0.015 * armThick * scale, clawLen, 4),
        l4dClawsMat
      );
      claw.position.set(fx * armThick * scale, (-0.08 - clawLen * 0.4) * scale, 0.015 * scale);
      claw.rotation.x = 0.25;
      handGroup.add(claw);
    });

    return { shoulder, elbow };
  };

  const lArmData = makeArm(false);
  const rArmData = makeArm(true);
  spine.add(lArmData.shoulder);
  spine.add(rArmData.shoulder);
  parts.lArm = lArmData.shoulder;
  parts.rArm = rArmData.shoulder;
  parts.lFore = lArmData.elbow;
  parts.rFore = rArmData.elbow;

  // 5. Legs & Decaying Combat Boots
  const makeLeg = (isRight) => {
    const sSign = isRight ? 1 : -1;
    const hip = new THREE.Group();
    hip.position.set(sSign * 0.18 * scale, -0.10 * scale, 0);

    // Thigh
    const thigh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13 * scale, 0.10 * scale, 0.46 * scale, 6),
      pantsMat
    );
    thigh.position.set(0, -0.22 * scale, 0);
    hip.add(thigh);

    const knee = new THREE.Group();
    knee.position.set(0, -0.44 * scale, 0);
    hip.add(knee);

    // Knee joint cap
    const kneeCap = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.09 * scale, 0),
      pantsMat
    );
    kneeCap.position.set(0, 0, 0.04 * scale);
    knee.add(kneeCap);

    // Shin
    const shin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.095 * scale, 0.08 * scale, 0.44 * scale, 6),
      pantsMat
    );
    shin.position.set(0, -0.20 * scale, 0);
    knee.add(shin);

    // Anatomical Decayed Boot (heel + tapered foot wedge + clawed toes)
    const bootGroup = new THREE.Group();
    bootGroup.position.set(0, -0.43 * scale, 0.03 * scale);
    knee.add(bootGroup);

    // Boot ankle & foot body
    const bootFoot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.085 * scale, 0.065 * scale, 0.22 * scale, 6),
      l4dBootMat
    );
    bootFoot.rotation.x = Math.PI / 2.2;
    bootFoot.position.set(0, -0.02 * scale, 0.05 * scale);
    bootFoot.scale.set(0.9, 1.2, 0.6);
    bootGroup.add(bootFoot);

    // Rotting exposed toe claws protruding from torn boot tip
    [-0.025, 0, 0.025].forEach((tx) => {
      const toeClaw = new THREE.Mesh(
        new THREE.ConeGeometry(0.012 * scale, 0.055 * scale, 3),
        fleshDarkClotMat
      );
      toeClaw.position.set(tx * scale, -0.04 * scale, 0.16 * scale);
      toeClaw.rotation.x = Math.PI / 2.3;
      bootGroup.add(toeClaw);
    });

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
  // High-performance shadow casting: only main torso/pelvis casts shadow on desktop; disabled on mobile
  if (!isMobileDevice) {
    if (chest) chest.castShadow = true;
    if (pelvis) pelvis.castShadow = true;
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
      console.log('★ Nona Batavia 3D Model preloaded successfully!');
    },
    undefined,
    (err) => {
      console.warn('Retrying Nona Batavia load from fallback:', err);
      loader.load('/models/lady_mithrill.glb', (gltf) => {
        ladyMithrillTemplate = gltf.scene;
        console.log('★ Nona Batavia loaded from fallback!');
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
      console.log('★ Victorian Bride 3D Model preloaded successfully!');
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

export function castCurseBloodOrb(origin, target) {
  if (!sceneRef) return;
  Sfx.playCurseOrbCast();

  const dir = new THREE.Vector3().subVectors(target, origin).normalize();
  const orbMesh = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.35, 1),
    new THREE.MeshBasicMaterial({ color: 0xff1122 })
  );
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
    console.log(`★ Nona Batavia Milestone Reached: ${state.kills} Kills! Spawning aerial boss...`);
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
