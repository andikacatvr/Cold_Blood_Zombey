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

// Output directories
const outFiles = [
  path.resolve('public/models/bossgame.glb'),
  path.resolve('public/models/boss_bride.glb'),
  path.resolve('dist/models/bossgame.glb'),
  path.resolve('dist/models/boss_bride.glb'),
  path.resolve('bossgame.glb')
];

outFiles.forEach(f => {
  const dir = path.dirname(f);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

/**
 * Builds the accurate 3D PS1 retro model matching bossgame.png:
 * - Elegant strapless off-white evening/bridal gown with front-side thigh slit
 * - Splatters and stains of blood across chest, hip, and skirt hem
 * - Blood-red eyes, delicate white pearl choker necklace, pearl stud earrings
 * - Dark brown updo high bun with two iconic loose wavy strands framing cheeks
 * - Bare shoulders, slender arms, elegant white bridal dress pumps
 */
function buildBossGameModel() {
  const root = new THREE.Group();
  root.name = 'BossGame_PS1_Bride';
  const scale = 1.36; // Matching companion Kristin's height scale

  // PS1 Retro Materials
  const skinMat = new THREE.MeshLambertMaterial({
    color: 0xdecbbd,
    flatShading: true
  });

  const gownWhiteMat = new THREE.MeshLambertMaterial({
    color: 0xf2eeea,
    flatShading: true
  });

  const bloodStainMat = new THREE.MeshLambertMaterial({
    color: 0x8a1820,
    flatShading: true
  });

  const hairMat = new THREE.MeshLambertMaterial({
    color: 0x241a15,
    flatShading: true
  });

  const pearlMat = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    flatShading: true
  });

  const shoeMat = new THREE.MeshLambertMaterial({
    color: 0xede8e2,
    flatShading: true
  });

  const eyeRedMat = new THREE.MeshBasicMaterial({
    color: 0xb5121b
  });

  // 1. Hips / Pelvis
  const hips = new THREE.Group();
  hips.name = 'hips';
  hips.position.y = 0.94 * scale;
  root.add(hips);

  // Corset lower waist & pelvic band
  const pelvisGeo = new THREE.CylinderGeometry(0.18 * scale, 0.22 * scale, 0.24 * scale, 10);
  pelvisGeo.scale(1.15, 1.0, 0.85);
  const pelvis = new THREE.Mesh(pelvisGeo, gownWhiteMat);
  pelvis.name = 'pelvis';
  hips.add(pelvis);

  // Blood stain patch on right hip (matches reference)
  const hipBlood = new THREE.Mesh(new THREE.BoxGeometry(0.08 * scale, 0.12 * scale, 0.04 * scale), bloodStainMat);
  hipBlood.position.set(0.12 * scale, -0.02 * scale, 0.09 * scale);
  hipBlood.rotation.z = -0.25;
  hips.add(hipBlood);

  // 2. Elegant Long Gown with Front-Side Slit (Matches bossgame.png)
  const gownGroup = new THREE.Group();
  gownGroup.name = 'dressGown';
  hips.add(gownGroup);

  // Main flared skirt column
  const skirtLength = 0.88 * scale;
  const skirtGeo = new THREE.CylinderGeometry(0.20 * scale, 0.38 * scale, skirtLength, 12, 4, true);
  skirtGeo.scale(1.18, 1.0, 0.92);
  const skirtMesh = new THREE.Mesh(skirtGeo, gownWhiteMat);
  skirtMesh.position.y = -skirtLength * 0.5 - 0.08 * scale;
  gownGroup.add(skirtMesh);

  // Blood splatters along skirt body & lower hem (matching bossgame.png)
  const bloodSpots = [
    { x: 0.06, y: -0.22, z: 0.18, sx: 0.10, sy: 0.12, rot: 0.2 },
    { x: -0.12, y: -0.35, z: 0.16, sx: 0.09, sy: 0.09, rot: -0.1 },
    { x: -0.05, y: -0.52, z: 0.22, sx: 0.14, sy: 0.08, rot: 0.3 },
    { x: 0.18, y: -0.65, z: 0.24, sx: 0.12, sy: 0.15, rot: -0.4 },
    { x: -0.16, y: -0.78, z: 0.28, sx: 0.18, sy: 0.14, rot: 0.15 },
    { x: 0.08, y: -0.82, z: 0.30, sx: 0.22, sy: 0.12, rot: -0.2 }
  ];
  bloodSpots.forEach((sp) => {
    const spot = new THREE.Mesh(
      new THREE.BoxGeometry(sp.sx * scale, sp.sy * scale, 0.03 * scale),
      bloodStainMat
    );
    spot.position.set(sp.x * scale, sp.y * scale, sp.z * scale);
    spot.rotation.z = sp.rot;
    gownGroup.add(spot);
  });

  // Front-side slit opening on the right leg
  const slitTrim = new THREE.Mesh(
    new THREE.BoxGeometry(0.02 * scale, 0.58 * scale, 0.06 * scale),
    bloodStainMat
  );
  slitTrim.position.set(0.14 * scale, -0.42 * scale, 0.16 * scale);
  slitTrim.rotation.z = -0.08;
  gownGroup.add(slitTrim);

  // 3. Spine & Strapless Corset Bodice
  const spine = new THREE.Group();
  spine.name = 'spine';
  spine.position.y = 0.12 * scale;
  hips.add(spine);

  const chest = new THREE.Group();
  chest.name = 'chest';
  chest.position.y = 0.18 * scale;
  spine.add(chest);

  // Slim hourglass corset waist
  const waistGeo = new THREE.CylinderGeometry(0.17 * scale, 0.18 * scale, 0.18 * scale, 10);
  waistGeo.scale(1.15, 1.0, 0.85);
  const waist = new THREE.Mesh(waistGeo, gownWhiteMat);
  chest.add(waist);

  // Strapless sweetheart bodice with blood splatter (matches reference chest)
  const bodiceGeo = new THREE.BoxGeometry(0.30 * scale, 0.18 * scale, 0.18 * scale);
  const bodice = new THREE.Mesh(bodiceGeo, gownWhiteMat);
  bodice.position.set(0, 0.12 * scale, 0);
  chest.add(bodice);

  // Prominent blood splatter on left bodice chest (matches bossgame.png)
  const chestBlood = new THREE.Mesh(new THREE.BoxGeometry(0.09 * scale, 0.10 * scale, 0.03 * scale), bloodStainMat);
  chestBlood.position.set(-0.06 * scale, 0.14 * scale, 0.095 * scale);
  chestBlood.rotation.z = 0.35;
  chest.add(chestBlood);

  // 4. Bare Shoulders, Clavicles & Neck
  const clavicleGeo = new THREE.BoxGeometry(0.32 * scale, 0.09 * scale, 0.16 * scale);
  const clavicles = new THREE.Mesh(clavicleGeo, skinMat);
  clavicles.position.set(0, 0.22 * scale, 0);
  chest.add(clavicles);

  const neck = new THREE.Group();
  neck.name = 'neck';
  neck.position.y = 0.27 * scale;
  chest.add(neck);

  const neckMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.052 * scale, 0.062 * scale, 0.12 * scale, 8),
    skinMat
  );
  neckMesh.position.y = 0.04 * scale;
  neck.add(neckMesh);

  // White Pearl Choker Necklace (Matches bossgame.png)
  const necklaceGroup = new THREE.Group();
  necklaceGroup.position.set(0, 0.03 * scale, 0);
  neck.add(necklaceGroup);

  const pearlCount = 14;
  for (let i = 0; i < pearlCount; i++) {
    const angle = (i / pearlCount) * Math.PI * 2;
    const px = Math.cos(angle) * 0.062 * scale;
    const pz = Math.sin(angle) * 0.058 * scale;
    const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.007 * scale, 5, 5), pearlMat);
    pearl.position.set(px, 0, pz);
    necklaceGroup.add(pearl);
  }

  // 5. Head, Retro PS1 Face & Red Glowing Eyes
  const head = new THREE.Group();
  head.name = 'head';
  head.position.y = 0.12 * scale;
  neck.add(head);

  // PS1 Contoured Facial Cranium
  const craniumGeo = new THREE.BoxGeometry(0.16 * scale, 0.20 * scale, 0.17 * scale);
  const cranium = new THREE.Mesh(craniumGeo, skinMat);
  cranium.position.set(0, 0.06 * scale, 0);
  head.add(cranium);

  // Tapered chin
  const chin = new THREE.Mesh(new THREE.ConeGeometry(0.07 * scale, 0.08 * scale, 5), skinMat);
  chin.position.set(0, -0.06 * scale, 0.02 * scale);
  chin.rotation.x = Math.PI;
  head.add(chin);

  // 3D Nose bridge
  const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.01 * scale, 0.018 * scale, 0.05 * scale, 4), skinMat);
  nose.position.set(0, 0.05 * scale, 0.095 * scale);
  nose.rotation.x = -0.3;
  head.add(nose);

  // Blood-Red Glowing Eyes (Iconic to bossgame.png)
  [-0.042, 0.042].forEach(ex => {
    // Eye socket
    const socket = new THREE.Mesh(new THREE.BoxGeometry(0.032 * scale, 0.018 * scale, 0.01 * scale), skinMat);
    socket.position.set(ex * scale, 0.075 * scale, 0.086 * scale);
    head.add(socket);

    // Glowing red iris / pupil
    const iris = new THREE.Mesh(new THREE.BoxGeometry(0.016 * scale, 0.016 * scale, 0.012 * scale), eyeRedMat);
    iris.position.set(ex * scale, 0.075 * scale, 0.091 * scale);
    head.add(iris);
  });

  // Soft subtle mouth
  const lips = new THREE.Mesh(new THREE.BoxGeometry(0.045 * scale, 0.012 * scale, 0.01 * scale), skinMat);
  lips.position.set(0, 0.015 * scale, 0.088 * scale);
  head.add(lips);

  // Pearl stud earrings on both ears
  [-0.085, 0.085].forEach(ex => {
    const earring = new THREE.Mesh(new THREE.SphereGeometry(0.007 * scale, 5, 5), pearlMat);
    earring.position.set(ex * scale, 0.06 * scale, 0.01 * scale);
    head.add(earring);
  });

  // 6. Hair: Elegant Updo Bun + Two Iconic Loose Front Tendrils
  const hairGroup = new THREE.Group();
  hairGroup.name = 'hair';
  head.add(hairGroup);

  // Main parted hair cap
  const hairCap = new THREE.Mesh(new THREE.BoxGeometry(0.185 * scale, 0.10 * scale, 0.19 * scale), hairMat);
  hairCap.position.set(0, 0.13 * scale, -0.01 * scale);
  hairGroup.add(hairCap);

  // High Updo Bun atop head (matches bossgame.png)
  const bunGeo = new THREE.SphereGeometry(0.072 * scale, 8, 8);
  bunGeo.scale(1.15, 0.95, 1.1);
  const bun = new THREE.Mesh(bunGeo, hairMat);
  bun.position.set(0, 0.18 * scale, -0.03 * scale);
  hairGroup.add(bun);

  // Two iconic loose wavy hair tendrils framing cheeks down past jawline
  [-0.088, 0.088].forEach(hx => {
    const sign = hx > 0 ? 1 : -1;
    const strandUpper = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012 * scale, 0.010 * scale, 0.14 * scale, 4),
      hairMat
    );
    strandUpper.position.set(hx * scale, 0.04 * scale, 0.07 * scale);
    strandUpper.rotation.z = sign * -0.15;
    strandUpper.rotation.x = 0.18;
    hairGroup.add(strandUpper);

    // Curled tip curving inwards toward chin
    const strandTip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.010 * scale, 0.004 * scale, 0.08 * scale, 4),
      hairMat
    );
    strandTip.position.set((hx - sign * 0.01) * scale, -0.05 * scale, 0.075 * scale);
    strandTip.rotation.z = sign * 0.25;
    hairGroup.add(strandTip);
  });

  // 7. Slender Bare Arms in Relaxed A-Pose
  const makeArm = (isRight) => {
    const sign = isRight ? 1 : -1;
    const shoulder = new THREE.Group();
    shoulder.name = isRight ? 'rArm' : 'lArm';
    shoulder.position.set(sign * 0.19 * scale, 0.18 * scale, 0);
    // Natural subtle A-pose from reference
    shoulder.rotation.z = sign * -0.22;
    shoulder.rotation.x = 0.05;

    const bicep = new THREE.Mesh(
      new THREE.CylinderGeometry(0.042 * scale, 0.036 * scale, 0.26 * scale, 6),
      skinMat
    );
    bicep.position.y = -0.13 * scale;
    shoulder.add(bicep);

    const elbow = new THREE.Group();
    elbow.name = isRight ? 'rFore' : 'lFore';
    elbow.position.y = -0.26 * scale;
    elbow.rotation.x = 0.10;
    shoulder.add(elbow);

    const forearm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.036 * scale, 0.028 * scale, 0.24 * scale, 6),
      skinMat
    );
    forearm.position.y = -0.12 * scale;
    elbow.add(forearm);

    // Slender hand with fingers relaxed
    const hand = new THREE.Mesh(
      new THREE.BoxGeometry(0.052 * scale, 0.085 * scale, 0.02 * scale),
      skinMat
    );
    hand.position.set(0, -0.26 * scale, 0.005 * scale);
    elbow.add(hand);

    return shoulder;
  };

  chest.add(makeArm(false));
  chest.add(makeArm(true));

  // 8. Legs & Elegant White Bridal Pumps
  const makeLeg = (isRight) => {
    const sign = isRight ? 1 : -1;
    const hipJoint = new THREE.Group();
    hipJoint.name = isRight ? 'rLeg' : 'lLeg';
    hipJoint.position.set(sign * 0.09 * scale, -0.06 * scale, 0);

    const thigh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065 * scale, 0.052 * scale, 0.44 * scale, 6),
      skinMat
    );
    thigh.position.y = -0.22 * scale;
    hipJoint.add(thigh);

    const knee = new THREE.Group();
    knee.name = isRight ? 'rShin' : 'lShin';
    knee.position.y = -0.44 * scale;
    hipJoint.add(knee);

    const shin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.050 * scale, 0.038 * scale, 0.44 * scale, 6),
      skinMat
    );
    shin.position.y = -0.22 * scale;
    knee.add(shin);

    // White bridal dress pumps (matches shoes in bossgame.png)
    const shoeGroup = new THREE.Group();
    shoeGroup.position.set(0, -0.44 * scale, 0.02 * scale);
    knee.add(shoeGroup);

    const shoeBase = new THREE.Mesh(
      new THREE.BoxGeometry(0.075 * scale, 0.065 * scale, 0.16 * scale),
      shoeMat
    );
    shoeBase.position.set(0, 0, 0.02 * scale);
    shoeGroup.add(shoeBase);

    // Pointed toe tip
    const shoeToe = new THREE.Mesh(
      new THREE.ConeGeometry(0.04 * scale, 0.06 * scale, 4),
      shoeMat
    );
    shoeToe.rotation.x = Math.PI / 2;
    shoeToe.position.set(0, -0.01 * scale, 0.10 * scale);
    shoeGroup.add(shoeToe);

    return hipJoint;
  };

  hips.add(makeLeg(false));
  hips.add(makeLeg(true));

  return root;
}

// Export function
async function exportBossGlb() {
  const exporter = new GLTFExporter();
  const scene = new THREE.Scene();
  const model = buildBossGameModel();
  scene.add(model);

  await new Promise((resolve, reject) => {
    exporter.parse(
      scene,
      (gltf) => {
        const buffer = Buffer.from(gltf);
        outFiles.forEach(dest => {
          fs.writeFileSync(dest, buffer);
          console.log(`Saved GLB model (${buffer.length} bytes) to ${dest}`);
        });
        resolve();
      },
      (err) => reject(err),
      { binary: true }
    );
  });
}

exportBossGlb().then(() => {
  console.log('Successfully generated and exported bossgame.glb in PS1 retro 3D format!');
}).catch(err => {
  console.error('Export error:', err);
  process.exit(1);
});
