global.FileReader = class {
  async readAsArrayBuffer(blob) {
    this.result = await blob.arrayBuffer();
    if (this.onloadend) this.onloadend();
  }
};

import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import fs from 'fs';
import path from 'path';

const outDirs = [
  path.resolve('public/models'),
  path.resolve('dist/models')
];

outDirs.forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// Helper to create anatomical human head geometry (NOT a box!)
function createRealisticHeadGeometry(scale = 1.0, isFemale = false) {
  const headGroup = new THREE.Group();
  headGroup.name = 'head';

  // 1. Cranium & Face base mesh: Contoured anatomical sphere
  const craniumGeo = new THREE.SphereGeometry(0.115 * scale, 16, 14);
  // Deform sphere to human skull shape: elongated back, flattened temples, tapered chin
  const pos = craniumGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);

    // Flatten temples
    if (Math.abs(x) > 0.06 * scale) {
      x *= 0.88;
    }
    // Elongate occipital back
    if (z < 0) {
      z *= 1.15;
    }
    // Taper lower face toward chin
    if (y < 0 && z > -0.02 * scale) {
      x *= (1.0 + y * 1.4);
      z *= (1.0 + y * 0.5);
    }
    // Brow ridge protrusion
    if (y > 0.01 * scale && y < 0.05 * scale && z > 0.06 * scale) {
      z += 0.015 * scale;
    }
    pos.setXYZ(i, x, y, z);
  }
  craniumGeo.computeVertexNormals();

  const skinColor = isFemale ? 0xc8cecb : 0xb6bdb9;
  const skinMat = new THREE.MeshStandardMaterial({
    color: skinColor,
    roughness: 0.78,
    metalness: 0.05
  });

  const craniumMesh = new THREE.Mesh(craniumGeo, skinMat);
  craniumMesh.name = 'cranium';
  headGroup.add(craniumMesh);

  // 2. 3D Anatomical Nose (Bridge, ridge & nostrils)
  const noseGroup = new THREE.Group();
  noseGroup.position.set(0, 0.01 * scale, 0.115 * scale);
  headGroup.add(noseGroup);

  const noseBridgeGeo = new THREE.CylinderGeometry(0.012 * scale, 0.022 * scale, 0.055 * scale, 5);
  const noseBridge = new THREE.Mesh(noseBridgeGeo, skinMat);
  noseBridge.rotation.x = -0.32;
  noseBridge.position.set(0, 0, 0.008 * scale);
  noseGroup.add(noseBridge);

  const noseTipGeo = new THREE.SphereGeometry(0.014 * scale, 8, 6);
  const noseTip = new THREE.Mesh(noseTipGeo, skinMat);
  noseTip.position.set(0, -0.022 * scale, 0.02 * scale);
  noseGroup.add(noseTip);

  // Left & Right Nostril wings
  [-0.013, 0.013].forEach(nx => {
    const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.009 * scale, 6, 5), skinMat);
    nostril.position.set(nx * scale, -0.024 * scale, 0.014 * scale);
    noseGroup.add(nostril);
  });

  // 3. 3D Anatomical Cheekbones (Zygomatic arches)
  [-0.075, 0.075].forEach(cx => {
    const cheek = new THREE.Mesh(
      new THREE.SphereGeometry(0.032 * scale, 8, 6),
      skinMat
    );
    cheek.scale.set(0.7, 1.2, 0.8);
    cheek.position.set(cx * scale, 0.01 * scale, 0.075 * scale);
    headGroup.add(cheek);
  });

  // 4. Sunken Eye Orbits with realistic zombie eyes
  const eyeOrbitMat = new THREE.MeshStandardMaterial({ color: 0x1f1a1d, roughness: 0.95 });
  const eyeBallMat = new THREE.MeshStandardMaterial({ color: 0xe8ece8, roughness: 0.4 });
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x3d0608 });

  [-0.042, 0.042].forEach(ex => {
    // Orbital depression
    const orbit = new THREE.Mesh(new THREE.SphereGeometry(0.026 * scale, 8, 6), eyeOrbitMat);
    orbit.position.set(ex * scale, 0.025 * scale, 0.09 * scale);
    headGroup.add(orbit);

    // Eyeball nestled inside
    const eyeBall = new THREE.Mesh(new THREE.SphereGeometry(0.015 * scale, 8, 8), eyeBallMat);
    eyeBall.position.set(ex * scale, 0.024 * scale, 0.095 * scale);
    headGroup.add(eyeBall);

    // Pupil
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.007 * scale, 6, 6), pupilMat);
    pupil.position.set(ex * scale, 0.024 * scale, 0.108 * scale);
    headGroup.add(pupil);
  });

  // 5. 3D Upper Lip & Chin
  const upperLip = new THREE.Mesh(new THREE.BoxGeometry(0.05 * scale, 0.014 * scale, 0.02 * scale), skinMat);
  upperLip.position.set(0, -0.042 * scale, 0.105 * scale);
  headGroup.add(upperLip);

  // 6. Hinged Mandible / Jaw & Lower Lip
  const jaw = new THREE.Group();
  jaw.name = 'jaw';
  jaw.position.set(0, -0.055 * scale, 0.04 * scale);
  headGroup.add(jaw);

  const lowerLip = new THREE.Mesh(new THREE.BoxGeometry(0.046 * scale, 0.013 * scale, 0.022 * scale), skinMat);
  lowerLip.position.set(0, 0.002 * scale, 0.062 * scale);
  jaw.add(lowerLip);

  const chinGeo = new THREE.SphereGeometry(0.034 * scale, 8, 6);
  const chin = new THREE.Mesh(chinGeo, skinMat);
  chin.scale.set(1.1, 0.9, 1.2);
  chin.position.set(0, -0.025 * scale, 0.055 * scale);
  jaw.add(chin);

  // Mandible jawbone branches reaching back
  [-0.055, 0.055].forEach(jx => {
    const jawBranch = new THREE.Mesh(new THREE.BoxGeometry(0.02 * scale, 0.045 * scale, 0.07 * scale), skinMat);
    jawBranch.position.set(jx * scale, 0.01 * scale, 0.01 * scale);
    jawBranch.rotation.x = -0.3;
    jaw.add(jawBranch);
  });

  // 7. Anatomical 3D Ears
  [-0.105, 0.105].forEach((earX, idx) => {
    const earGroup = new THREE.Group();
    earGroup.position.set(earX * scale, 0.015 * scale, -0.01 * scale);
    earGroup.rotation.y = (idx === 0 ? -0.25 : 0.25);
    headGroup.add(earGroup);

    const earHelix = new THREE.Mesh(new THREE.TorusGeometry(0.022 * scale, 0.006 * scale, 5, 8, Math.PI * 1.3), skinMat);
    earHelix.rotation.z = Math.PI * 0.45;
    earGroup.add(earHelix);

    const earLobe = new THREE.Mesh(new THREE.SphereGeometry(0.012 * scale, 6, 5), skinMat);
    earLobe.scale.set(0.6, 1.2, 0.7);
    earLobe.position.set(0, -0.015 * scale, 0);
    earGroup.add(earLobe);
  });

  return { headGroup, jaw, skinMat };
}

// Build Archetype 1: Female Shaggy Zombie (Reference Photo 4 & 5)
function buildFemaleShaggyZombie() {
  const root = new THREE.Group();
  root.name = 'Zombie_Female_Shaggy';
  const scale = 1.34; // Scaled to match Kristin (NPC_SCALE = 1.38)

  const blouseMat = new THREE.MeshStandardMaterial({ color: 0xd8d6cc, roughness: 0.88 });
  const skirtMat = new THREE.MeshStandardMaterial({ color: 0x242426, roughness: 0.92 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x1f1917, roughness: 0.85 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x141212, roughness: 0.7 });

  // 1. Hips
  const hips = new THREE.Group();
  hips.name = 'hips';
  hips.position.y = 0.95 * scale;
  root.add(hips);

  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.24 * scale, 0.18 * scale, 0.18 * scale), skirtMat);
  pelvis.name = 'pelvis';
  hips.add(pelvis);

  // Long Flared Skirt (Reference Left)
  const skirtGeo = new THREE.CylinderGeometry(0.20 * scale, 0.45 * scale, 0.76 * scale, 12, 1, true);
  const skirt = new THREE.Mesh(skirtGeo, skirtMat);
  skirt.name = 'skirt';
  skirt.position.y = -0.38 * scale;
  hips.add(skirt);

  // 2. Spine & Chest
  const spine = new THREE.Group();
  spine.name = 'spine';
  spine.position.y = 0.12 * scale;
  spine.rotation.x = 0.10;
  spine.rotation.z = -0.06;
  hips.add(spine);

  const chest = new THREE.Group();
  chest.name = 'chest';
  chest.position.y = 0.22 * scale;
  spine.add(chest);

  const torsoMesh = new THREE.Mesh(new THREE.BoxGeometry(0.28 * scale, 0.32 * scale, 0.18 * scale), blouseMat);
  torsoMesh.name = 'torso';
  chest.add(torsoMesh);

  // Blouse folded collar
  const collar = new THREE.Mesh(new THREE.BoxGeometry(0.16 * scale, 0.06 * scale, 0.06 * scale), blouseMat);
  collar.position.set(0, 0.15 * scale, 0.07 * scale);
  chest.add(collar);

  // 3. Neck & Realistic Head
  const neck = new THREE.Group();
  neck.name = 'neck';
  neck.position.y = 0.20 * scale;
  neck.rotation.x = -0.12;
  neck.rotation.z = 0.28; // eerie sideways tilt
  chest.add(neck);

  const { headGroup, jaw, skinMat } = createRealisticHeadGeometry(scale, true);
  headGroup.position.y = 0.12 * scale;
  neck.add(headGroup);

  // 3D Shaggy Bob Hair (Matches photo 5: layered bob hair framing face)
  const hairGroup = new THREE.Group();
  hairGroup.name = 'hair';
  headGroup.add(hairGroup);

  const hairTop = new THREE.Mesh(new THREE.SphereGeometry(0.125 * scale, 12, 10), hairMat);
  hairTop.scale.set(1.05, 0.85, 1.15);
  hairTop.position.set(0, 0.05 * scale, -0.01 * scale);
  hairGroup.add(hairTop);

  // Layered shaggy side bangs
  [-0.10, 0.10].forEach(bx => {
    const bang = new THREE.Mesh(new THREE.CylinderGeometry(0.02 * scale, 0.045 * scale, 0.24 * scale, 6), hairMat);
    bang.position.set(bx * scale, -0.02 * scale, 0.04 * scale);
    bang.rotation.z = (bx > 0 ? -0.15 : 0.15);
    bang.rotation.x = 0.1;
    hairGroup.add(bang);
  });

  // Shaggy back curtain
  const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.22 * scale, 0.26 * scale, 0.08 * scale), hairMat);
  hairBack.position.set(0, -0.06 * scale, -0.09 * scale);
  hairBack.rotation.x = -0.15;
  hairGroup.add(hairBack);

  // 4. Arms
  [-1, 1].forEach(sign => {
    const isRight = (sign === 1);
    const shoulder = new THREE.Group();
    shoulder.name = isRight ? 'rArm' : 'lArm';
    shoulder.position.set(sign * 0.18 * scale, 0.10 * scale, 0);
    shoulder.rotation.x = 0.25 + (isRight ? 0.10 : -0.05);
    shoulder.rotation.z = sign * (isRight ? -0.15 : -0.22);
    chest.add(shoulder);

    const bicep = new THREE.Mesh(new THREE.BoxGeometry(0.08 * scale, 0.24 * scale, 0.08 * scale), blouseMat);
    bicep.position.y = -0.12 * scale;
    shoulder.add(bicep);

    const elbow = new THREE.Group();
    elbow.name = isRight ? 'rFore' : 'lFore';
    elbow.position.y = -0.24 * scale;
    elbow.rotation.x = 0.3;
    shoulder.add(elbow);

    const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.075 * scale, 0.22 * scale, 0.075 * scale), blouseMat);
    forearm.position.y = -0.11 * scale;
    elbow.add(forearm);

    // Clawed bloody hand
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.06 * scale, 0.10 * scale, 0.03 * scale), skinMat);
    hand.position.set(0, -0.22 * scale, 0.01 * scale);
    elbow.add(hand);
  });

  // 5. Legs & Shoes
  [-1, 1].forEach(sign => {
    const isRight = (sign === 1);
    const hip = new THREE.Group();
    hip.name = isRight ? 'rLeg' : 'lLeg';
    hip.position.set(sign * 0.10 * scale, -0.08 * scale, 0);
    hips.add(hip);

    const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.11 * scale, 0.42 * scale, 0.11 * scale), skirtMat);
    thigh.position.y = -0.21 * scale;
    hip.add(thigh);

    const knee = new THREE.Group();
    knee.name = isRight ? 'rShin' : 'lShin';
    knee.position.y = -0.42 * scale;
    hip.add(knee);

    const shin = new THREE.Mesh(new THREE.BoxGeometry(0.10 * scale, 0.42 * scale, 0.10 * scale), skirtMat);
    shin.position.y = -0.21 * scale;
    knee.add(shin);

    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.09 * scale, 0.07 * scale, 0.18 * scale), shoeMat);
    shoe.position.set(0, -0.42 * scale, 0.03 * scale);
    knee.add(shoe);
  });

  return root;
}

// Build Archetype 2: Male Vest Zombie (Reference Photo 3 & 4)
function buildMaleVestZombie() {
  const root = new THREE.Group();
  root.name = 'Zombie_Male_Vest';
  const scale = 1.38; // Scaled to match Kristin (NPC_SCALE = 1.38)

  const shirtMat = new THREE.MeshStandardMaterial({ color: 0xd2d5d8, roughness: 0.88 });
  const vestMat = new THREE.MeshStandardMaterial({ color: 0xb5ad9e, roughness: 0.85 }); // cream/beige waistcoat
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x5a6064, roughness: 0.90 }); // grey slacks
  const tieMat = new THREE.MeshStandardMaterial({ color: 0x181a1c, roughness: 0.8 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x2c221c, roughness: 0.9 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x1f1a18, roughness: 0.7 });

  const hips = new THREE.Group();
  hips.name = 'hips';
  hips.position.y = 0.95 * scale;
  root.add(hips);

  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.28 * scale, 0.20 * scale, 0.20 * scale), pantsMat);
  pelvis.name = 'pelvis';
  hips.add(pelvis);

  const spine = new THREE.Group();
  spine.name = 'spine';
  spine.position.y = 0.12 * scale;
  spine.rotation.x = 0.24;
  spine.rotation.z = 0.08;
  hips.add(spine);

  const chest = new THREE.Group();
  chest.name = 'chest';
  chest.position.y = 0.22 * scale;
  spine.add(chest);

  const vestMesh = new THREE.Mesh(new THREE.BoxGeometry(0.34 * scale, 0.34 * scale, 0.22 * scale), vestMat);
  chest.add(vestMesh);

  // Shirt collar & necktie
  const collar = new THREE.Mesh(new THREE.BoxGeometry(0.12 * scale, 0.07 * scale, 0.08 * scale), shirtMat);
  collar.position.set(0, 0.17 * scale, 0.08 * scale);
  chest.add(collar);

  const tie = new THREE.Mesh(new THREE.BoxGeometry(0.05 * scale, 0.24 * scale, 0.02 * scale), tieMat);
  tie.position.set(0, 0.05 * scale, 0.12 * scale);
  tie.rotation.x = -0.06;
  chest.add(tie);

  const neck = new THREE.Group();
  neck.name = 'neck';
  neck.position.y = 0.20 * scale;
  neck.rotation.x = 0.16;
  neck.rotation.z = -0.22; // tilted head
  chest.add(neck);

  const { headGroup, skinMat } = createRealisticHeadGeometry(scale, false);
  headGroup.position.y = 0.12 * scale;
  neck.add(headGroup);

  // Disheveled messy hair (matches photo 4: tired sunken eyes man)
  const hairGroup = new THREE.Group();
  hairGroup.name = 'hair';
  headGroup.add(hairGroup);

  const hairBase = new THREE.Mesh(new THREE.SphereGeometry(0.12 * scale, 12, 10), hairMat);
  hairBase.scale.set(1.05, 0.8, 1.15);
  hairBase.position.set(0, 0.06 * scale, -0.01 * scale);
  hairGroup.add(hairBase);

  // Messy fringe strands hanging in front
  [-0.04, 0.03].forEach(fx => {
    const fringe = new THREE.Mesh(new THREE.CylinderGeometry(0.015 * scale, 0.025 * scale, 0.09 * scale, 4), hairMat);
    fringe.position.set(fx * scale, 0.06 * scale, 0.10 * scale);
    fringe.rotation.x = 0.4;
    hairGroup.add(fringe);
  });

  // Arms
  [-1, 1].forEach(sign => {
    const isRight = (sign === 1);
    const shoulder = new THREE.Group();
    shoulder.name = isRight ? 'rArm' : 'lArm';
    shoulder.position.set(sign * 0.22 * scale, 0.10 * scale, 0);
    shoulder.rotation.x = 0.40 + (isRight ? 0.15 : 0.0);
    shoulder.rotation.z = sign * -0.18;
    chest.add(shoulder);

    const bicep = new THREE.Mesh(new THREE.BoxGeometry(0.09 * scale, 0.24 * scale, 0.09 * scale), shirtMat);
    bicep.position.y = -0.12 * scale;
    shoulder.add(bicep);

    const elbow = new THREE.Group();
    elbow.name = isRight ? 'rFore' : 'lFore';
    elbow.position.y = -0.24 * scale;
    elbow.rotation.x = 0.35;
    shoulder.add(elbow);

    const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.08 * scale, 0.22 * scale, 0.08 * scale), shirtMat);
    forearm.position.y = -0.11 * scale;
    elbow.add(forearm);

    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.07 * scale, 0.10 * scale, 0.03 * scale), skinMat);
    hand.position.set(0, -0.22 * scale, 0.01 * scale);
    elbow.add(hand);
  });

  // Legs
  [-1, 1].forEach(sign => {
    const isRight = (sign === 1);
    const hip = new THREE.Group();
    hip.name = isRight ? 'rLeg' : 'lLeg';
    hip.position.set(sign * 0.11 * scale, -0.08 * scale, 0);
    hips.add(hip);

    const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.12 * scale, 0.42 * scale, 0.12 * scale), pantsMat);
    thigh.position.y = -0.21 * scale;
    hip.add(thigh);

    const knee = new THREE.Group();
    knee.name = isRight ? 'rShin' : 'lShin';
    knee.position.y = -0.42 * scale;
    hip.add(knee);

    const shin = new THREE.Mesh(new THREE.BoxGeometry(0.11 * scale, 0.42 * scale, 0.11 * scale), pantsMat);
    shin.position.y = -0.21 * scale;
    knee.add(shin);

    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.10 * scale, 0.08 * scale, 0.21 * scale), shoeMat);
    shoe.position.set(0, -0.42 * scale, 0.03 * scale);
    knee.add(shoe);
  });

  return root;
}

// Build Archetype 3: Male Suit Zombie (Reference Photo 2 & 1)
function buildMaleSuitZombie() {
  const root = new THREE.Group();
  root.name = 'Zombie_Male_Suit';
  const scale = 1.40; // Scaled to match Kristin (NPC_SCALE = 1.38)

  const suitMat = new THREE.MeshStandardMaterial({ color: 0x181a1d, roughness: 0.88 }); // dark charcoal/black suit
  const shirtMat = new THREE.MeshStandardMaterial({ color: 0xe0e2e5, roughness: 0.85 });
  const tieMat = new THREE.MeshStandardMaterial({ color: 0x0f1113, roughness: 0.8 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x141210, roughness: 0.8 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x101112, roughness: 0.65 });

  const hips = new THREE.Group();
  hips.name = 'hips';
  hips.position.y = 0.95 * scale;
  root.add(hips);

  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.28 * scale, 0.20 * scale, 0.20 * scale), suitMat);
  pelvis.name = 'pelvis';
  hips.add(pelvis);

  const spine = new THREE.Group();
  spine.name = 'spine';
  spine.position.y = 0.12 * scale;
  spine.rotation.x = 0.30;
  spine.rotation.z = -0.04;
  hips.add(spine);

  const chest = new THREE.Group();
  chest.name = 'chest';
  chest.position.y = 0.22 * scale;
  spine.add(chest);

  const suitJacket = new THREE.Mesh(new THREE.BoxGeometry(0.35 * scale, 0.35 * scale, 0.22 * scale), suitMat);
  chest.add(suitJacket);

  // Inner shirt & Lapels
  const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.14 * scale, 0.12 * scale, 0.06 * scale), shirtMat);
  shirt.position.set(0, 0.12 * scale, 0.09 * scale);
  chest.add(shirt);

  const tie = new THREE.Mesh(new THREE.BoxGeometry(0.05 * scale, 0.24 * scale, 0.02 * scale), tieMat);
  tie.position.set(0, 0.05 * scale, 0.12 * scale);
  chest.add(tie);

  [-0.065, 0.065].forEach((lx, idx) => {
    const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.045 * scale, 0.22 * scale, 0.02 * scale), suitMat);
    lapel.position.set(lx * scale, 0.07 * scale, 0.12 * scale);
    lapel.rotation.z = (idx === 0 ? -0.2 : 0.2);
    chest.add(lapel);
  });

  const neck = new THREE.Group();
  neck.name = 'neck';
  neck.position.y = 0.20 * scale;
  neck.rotation.x = 0.22;
  chest.add(neck);

  const { headGroup, skinMat } = createRealisticHeadGeometry(scale, false);
  headGroup.position.y = 0.12 * scale;
  neck.add(headGroup);

  // Modern Taper Fade Hair (matches photo 2: Asian fade haircut)
  const hairGroup = new THREE.Group();
  hairGroup.name = 'hair';
  headGroup.add(hairGroup);

  const hairTop = new THREE.Mesh(new THREE.BoxGeometry(0.19 * scale, 0.065 * scale, 0.20 * scale), hairMat);
  hairTop.position.set(0, 0.085 * scale, -0.01 * scale);
  hairGroup.add(hairTop);

  // Faded short sides
  [-0.095, 0.095].forEach(sx => {
    const fadeSide = new THREE.Mesh(new THREE.BoxGeometry(0.02 * scale, 0.07 * scale, 0.16 * scale), hairMat);
    fadeSide.position.set(sx * scale, 0.04 * scale, -0.02 * scale);
    hairGroup.add(fadeSide);
  });

  // Arms
  [-1, 1].forEach(sign => {
    const isRight = (sign === 1);
    const shoulder = new THREE.Group();
    shoulder.name = isRight ? 'rArm' : 'lArm';
    shoulder.position.set(sign * 0.23 * scale, 0.10 * scale, 0);
    shoulder.rotation.x = 0.55 + (isRight ? -0.10 : 0.10);
    shoulder.rotation.z = sign * -0.12;
    chest.add(shoulder);

    const bicep = new THREE.Mesh(new THREE.BoxGeometry(0.095 * scale, 0.24 * scale, 0.095 * scale), suitMat);
    bicep.position.y = -0.12 * scale;
    shoulder.add(bicep);

    const elbow = new THREE.Group();
    elbow.name = isRight ? 'rFore' : 'lFore';
    elbow.position.y = -0.24 * scale;
    elbow.rotation.x = 0.35;
    shoulder.add(elbow);

    const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.085 * scale, 0.22 * scale, 0.085 * scale), suitMat);
    forearm.position.y = -0.11 * scale;
    elbow.add(forearm);

    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.07 * scale, 0.10 * scale, 0.03 * scale), skinMat);
    hand.position.set(0, -0.22 * scale, 0.01 * scale);
    elbow.add(hand);
  });

  // Legs
  [-1, 1].forEach(sign => {
    const isRight = (sign === 1);
    const hip = new THREE.Group();
    hip.name = isRight ? 'rLeg' : 'lLeg';
    hip.position.set(sign * 0.11 * scale, -0.08 * scale, 0);
    hips.add(hip);

    const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.12 * scale, 0.42 * scale, 0.12 * scale), suitMat);
    thigh.position.y = -0.21 * scale;
    hip.add(thigh);

    const knee = new THREE.Group();
    knee.name = isRight ? 'rShin' : 'lShin';
    knee.position.y = -0.42 * scale;
    hip.add(knee);

    const shin = new THREE.Mesh(new THREE.BoxGeometry(0.11 * scale, 0.42 * scale, 0.11 * scale), suitMat);
    shin.position.y = -0.21 * scale;
    knee.add(shin);

    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.10 * scale, 0.08 * scale, 0.21 * scale), shoeMat);
    shoe.position.set(0, -0.42 * scale, 0.03 * scale);
    knee.add(shoe);
  });

  return root;
}

// Build Archetype 4: Female Sleek Zombie (Reference Photo 3)
function buildFemaleSleekZombie() {
  const root = new THREE.Group();
  root.name = 'Zombie_Female_Sleek';
  const scale = 1.35; // Scaled to match Kristin (NPC_SCALE = 1.38)

  const blouseMat = new THREE.MeshStandardMaterial({ color: 0xedebe4, roughness: 0.88 });
  const skirtMat = new THREE.MeshStandardMaterial({ color: 0x1c1d1f, roughness: 0.92 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x191614, roughness: 0.75 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x121010, roughness: 0.7 });

  const hips = new THREE.Group();
  hips.name = 'hips';
  hips.position.y = 0.95 * scale;
  root.add(hips);

  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.24 * scale, 0.18 * scale, 0.18 * scale), skirtMat);
  pelvis.name = 'pelvis';
  hips.add(pelvis);

  const skirtGeo = new THREE.CylinderGeometry(0.20 * scale, 0.44 * scale, 0.76 * scale, 12, 1, true);
  const skirt = new THREE.Mesh(skirtGeo, skirtMat);
  skirt.name = 'skirt';
  skirt.position.y = -0.38 * scale;
  hips.add(skirt);

  const spine = new THREE.Group();
  spine.name = 'spine';
  spine.position.y = 0.12 * scale;
  spine.rotation.x = 0.14;
  hips.add(spine);

  const chest = new THREE.Group();
  chest.name = 'chest';
  chest.position.y = 0.22 * scale;
  spine.add(chest);

  const torsoMesh = new THREE.Mesh(new THREE.BoxGeometry(0.28 * scale, 0.32 * scale, 0.18 * scale), blouseMat);
  chest.add(torsoMesh);

  const neck = new THREE.Group();
  neck.name = 'neck';
  neck.position.y = 0.20 * scale;
  neck.rotation.x = -0.08;
  neck.rotation.z = -0.22; // subtle eerie tilt
  chest.add(neck);

  const { headGroup, skinMat } = createRealisticHeadGeometry(scale, true);
  headGroup.position.y = 0.12 * scale;
  neck.add(headGroup);

  // Sleek Bun Hair (matches photo 3: sleek pulled-back hair)
  const hairGroup = new THREE.Group();
  hairGroup.name = 'hair';
  headGroup.add(hairGroup);

  const hairSleek = new THREE.Mesh(new THREE.SphereGeometry(0.12 * scale, 14, 12), hairMat);
  hairSleek.scale.set(1.02, 0.88, 1.10);
  hairSleek.position.set(0, 0.045 * scale, -0.015 * scale);
  hairGroup.add(hairSleek);

  // Neat bun at nape of neck
  const bun = new THREE.Mesh(new THREE.SphereGeometry(0.045 * scale, 10, 8), hairMat);
  bun.position.set(0, 0.01 * scale, -0.12 * scale);
  hairGroup.add(bun);

  // Arms
  [-1, 1].forEach(sign => {
    const isRight = (sign === 1);
    const shoulder = new THREE.Group();
    shoulder.name = isRight ? 'rArm' : 'lArm';
    shoulder.position.set(sign * 0.18 * scale, 0.10 * scale, 0);
    shoulder.rotation.x = 0.30 + (isRight ? 0.05 : -0.05);
    shoulder.rotation.z = sign * -0.16;
    chest.add(shoulder);

    const bicep = new THREE.Mesh(new THREE.BoxGeometry(0.08 * scale, 0.24 * scale, 0.08 * scale), blouseMat);
    bicep.position.y = -0.12 * scale;
    shoulder.add(bicep);

    const elbow = new THREE.Group();
    elbow.name = isRight ? 'rFore' : 'lFore';
    elbow.position.y = -0.24 * scale;
    elbow.rotation.x = 0.28;
    shoulder.add(elbow);

    const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.075 * scale, 0.22 * scale, 0.075 * scale), blouseMat);
    forearm.position.y = -0.11 * scale;
    elbow.add(forearm);

    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.06 * scale, 0.10 * scale, 0.03 * scale), skinMat);
    hand.position.set(0, -0.22 * scale, 0.01 * scale);
    elbow.add(hand);
  });

  // Legs
  [-1, 1].forEach(sign => {
    const isRight = (sign === 1);
    const hip = new THREE.Group();
    hip.name = isRight ? 'rLeg' : 'lLeg';
    hip.position.set(sign * 0.10 * scale, -0.08 * scale, 0);
    hips.add(hip);

    const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.11 * scale, 0.42 * scale, 0.11 * scale), skirtMat);
    thigh.position.y = -0.21 * scale;
    hip.add(thigh);

    const knee = new THREE.Group();
    knee.name = isRight ? 'rShin' : 'lShin';
    knee.position.y = -0.42 * scale;
    hip.add(knee);

    const shin = new THREE.Mesh(new THREE.BoxGeometry(0.10 * scale, 0.42 * scale, 0.10 * scale), skirtMat);
    shin.position.y = -0.21 * scale;
    knee.add(shin);

    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.09 * scale, 0.07 * scale, 0.18 * scale), shoeMat);
    shoe.position.set(0, -0.42 * scale, 0.03 * scale);
    knee.add(shoe);
  });

  return root;
}

// Export models to binary .glb files
async function exportAllGlb() {
  const models = [
    { name: 'zombie_female_shaggy.glb', build: buildFemaleShaggyZombie },
    { name: 'zombie_male_vest.glb', build: buildMaleVestZombie },
    { name: 'zombie_male_suit.glb', build: buildMaleSuitZombie },
    { name: 'zombie_female_sleek.glb', build: buildFemaleSleekZombie }
  ];

  const exporter = new GLTFExporter();

  for (const item of models) {
    const scene = new THREE.Scene();
    const modelGroup = item.build();
    scene.add(modelGroup);

    await new Promise((resolve, reject) => {
      exporter.parse(
        scene,
        (gltf) => {
          const buffer = Buffer.from(gltf);
          outDirs.forEach(dir => {
            const dest = path.join(dir, item.name);
            fs.writeFileSync(dest, buffer);
            console.log(`Saved GLB model [${item.name}] (${buffer.length} bytes) to ${dest}`);
          });
          resolve();
        },
        (err) => reject(err),
        { binary: true }
      );
    });
  }
}

exportAllGlb().then(() => {
  console.log('All 4 realistic zombie .glb models exported successfully!');
}).catch(err => {
  console.error('Export failed:', err);
  process.exit(1);
});
