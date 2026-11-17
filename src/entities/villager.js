/**
 * COLD BLOOD ZOMBEY - PROLOGUE 3D PROPS & CHARACTERS
 * - Old Thomas (Elder British Villager with creepy smile & holy water cup)
 * - Vintage British Flatbed Pick-Up Truck (Cabin, wooden bed, headlights)
 * - Coldbrook Village Gothic Stone Gate
 */

const THREE = window.THREE;

/**
 * Builds Old Thomas - The elderly British villager
 */
export function buildOldThomasModel() {
  const root = new THREE.Group();
  root.name = 'Old_Thomas_Villager';

  // Materials
  const coatMat = new THREE.MeshLambertMaterial({ color: 0x3d3830, flatShading: false });
  const vestMat = new THREE.MeshLambertMaterial({ color: 0x5a4838, flatShading: false });
  const trousersMat = new THREE.MeshLambertMaterial({ color: 0x2e3035, flatShading: false });
  const skinMat = new THREE.MeshLambertMaterial({ color: 0xd6bba2, flatShading: false });
  const greyHairMat = new THREE.MeshLambertMaterial({ color: 0xb5b5b5, flatShading: false });
  const tweedCapMat = new THREE.MeshLambertMaterial({ color: 0x484238, flatShading: false });
  const bootMat = new THREE.MeshLambertMaterial({ color: 0x221a14, flatShading: false });
  const brassCupMat = new THREE.MeshStandardMaterial({ color: 0xb08838, metalness: 0.85, roughness: 0.35 });

  // 1. Torso & Tweed Overcoat
  const torsoGroup = new THREE.Group();
  torsoGroup.position.set(0, 0.95, 0);

  const coatBody = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.62, 0.30), coatMat);
  coatBody.position.set(0, 0.18, 0);
  coatBody.castShadow = true;
  torsoGroup.add(coatBody);

  // Inner vest / shirt collar
  const innerShirt = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.28, 0.31), vestMat);
  innerShirt.position.set(0, 0.32, 0.01);
  torsoGroup.add(innerShirt);

  // Overcoat lower skirt / flaps
  const coatSkirt = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.42, 0.32), coatMat);
  coatSkirt.position.set(0, -0.22, 0);
  coatSkirt.castShadow = true;
  torsoGroup.add(coatSkirt);

  // 2. Head & British Tweed Flat Cap
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.58, 0);

  // Neck
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.10, 0.14, 8), skinMat);
  neck.position.set(0, -0.06, 0);
  headGroup.add(neck);

  // Head base
  const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.26, 0.24), skinMat);
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  // Canvas creepy smiling face texture
  const faceCanvas = document.createElement('canvas');
  faceCanvas.width = 128;
  faceCanvas.height = 128;
  const fctx = faceCanvas.getContext('2d');
  fctx.fillStyle = '#d6bba2';
  fctx.fillRect(0, 0, 128, 128);

  // Wrinkles & aged shadows
  fctx.fillStyle = '#b89980';
  fctx.fillRect(24, 38, 80, 4); // Brow wrinkles
  fctx.fillRect(32, 46, 64, 3);
  fctx.fillRect(18, 70, 24, 3); // Under-eye lines
  fctx.fillRect(86, 70, 24, 3);

  // Empty wide-open staring eyes
  fctx.fillStyle = '#1c1b18';
  fctx.beginPath();
  fctx.arc(38, 64, 7, 0, Math.PI * 2);
  fctx.arc(90, 64, 7, 0, Math.PI * 2);
  fctx.fill();
  fctx.fillStyle = '#d8d4c8'; // Dull clouded iris
  fctx.beginPath();
  fctx.arc(38, 64, 3.5, 0, Math.PI * 2);
  fctx.arc(90, 64, 3.5, 0, Math.PI * 2);
  fctx.fill();

  // Wide, unnatural creepy smile showing teeth
  fctx.fillStyle = '#3a1414';
  fctx.beginPath();
  fctx.ellipse(64, 98, 38, 16, 0, 0, Math.PI);
  fctx.fill();
  fctx.fillStyle = '#f0ebe0'; // Teeth row
  fctx.fillRect(34, 94, 60, 6);
  fctx.strokeStyle = '#220808';
  fctx.lineWidth = 1.5;
  for (let x = 40; x < 90; x += 8) {
    fctx.beginPath();
    fctx.moveTo(x, 94);
    fctx.lineTo(x, 100);
    fctx.stroke();
  }

  const faceTexture = new THREE.CanvasTexture(faceCanvas);
  const faceMat = new THREE.MeshLambertMaterial({ map: faceTexture });
  const facePlane = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.25), faceMat);
  facePlane.position.set(0, 0, 0.122);
  headGroup.add(facePlane);

  // Grey side hair
  const hairL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.20), greyHairMat);
  hairL.position.set(-0.13, 0.02, -0.02);
  headGroup.add(hairL);
  const hairR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.20), greyHairMat);
  hairR.position.set(0.13, 0.02, -0.02);
  headGroup.add(hairR);

  // British Tweed Flat Cap (Peaky / Country style)
  const capTop = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.32), tweedCapMat);
  capTop.position.set(0, 0.16, -0.02);
  capTop.rotation.x = -0.10;
  headGroup.add(capTop);

  const capBrim = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.02, 0.14), tweedCapMat);
  capBrim.position.set(0, 0.11, 0.16);
  capBrim.rotation.x = 0.20;
  headGroup.add(capBrim);

  torsoGroup.add(headGroup);

  // 3. Right Arm holding Holy Water Chalice
  const rArmGroup = new THREE.Group();
  rArmGroup.position.set(0.28, 0.38, 0);

  const rSleeve = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.32, 0.14), coatMat);
  rSleeve.position.set(0.04, -0.14, 0.08);
  rSleeve.rotation.x = -0.55;
  rArmGroup.add(rSleeve);

  const rHand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.10), skinMat);
  rHand.position.set(0.04, -0.28, 0.22);
  rArmGroup.add(rHand);

  // Holy Water Chalice / Cup
  const cupGroup = new THREE.Group();
  cupGroup.position.set(0.04, -0.24, 0.28);
  const cupBase = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.14, 8), brassCupMat);
  cupGroup.add(cupBase);
  const holyLiquid = new THREE.Mesh(
    new THREE.CircleGeometry(0.055, 8),
    new THREE.MeshLambertMaterial({ color: 0x88ccff, emissive: 0x225588, emissiveIntensity: 0.6 })
  );
  holyLiquid.rotation.x = -Math.PI / 2;
  holyLiquid.position.set(0, 0.071, 0);
  cupGroup.add(holyLiquid);
  rArmGroup.add(cupGroup);

  torsoGroup.add(rArmGroup);

  // 4. Left Arm (Dangling at side)
  const lArmGroup = new THREE.Group();
  lArmGroup.position.set(-0.28, 0.38, 0);

  const lSleeve = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.42, 0.14), coatMat);
  lSleeve.position.set(-0.04, -0.18, 0);
  lArmGroup.add(lSleeve);

  const lHand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), skinMat);
  lHand.position.set(-0.04, -0.42, 0);
  lArmGroup.add(lHand);

  torsoGroup.add(lArmGroup);

  root.add(torsoGroup);

  // 5. Legs & Boots
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.58, 0.18), trousersMat);
  legL.position.set(-0.13, 0.36, 0);
  root.add(legL);

  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.58, 0.18), trousersMat);
  legR.position.set(0.13, 0.36, 0);
  root.add(legR);

  const bootL = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.14, 0.24), bootMat);
  bootL.position.set(-0.13, 0.07, 0.03);
  root.add(bootL);

  const bootR = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.14, 0.24), bootMat);
  bootR.position.set(0.13, 0.07, 0.03);
  root.add(bootR);

  // Internal references for animation
  root.userData = {
    headGroup,
    rArmGroup,
    cupGroup,
    torsoGroup
  };

  return root;
}

/**
 * Builds Vintage British Flatbed Pick-Up Truck
 */
export function buildVintagePickupTruck() {
  const root = new THREE.Group();
  root.name = 'Vintage_Pickup_Truck';

  // Materials
  const bodyPaintMat = new THREE.MeshLambertMaterial({ color: 0x2b382d, flatShading: false }); // British racing dark green
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd0d5db, metalness: 0.9, roughness: 0.2 });
  const woodBedMat = new THREE.MeshLambertMaterial({ color: 0x4a321f, flatShading: false });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x88aabb, roughness: 0.1, metalness: 0.5, transparent: true, opacity: 0.75 });
  const tireMat = new THREE.MeshLambertMaterial({ color: 0x18181a, flatShading: true });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0x889098, metalness: 0.7, roughness: 0.4 });
  const lampGlowMat = new THREE.MeshBasicMaterial({ color: 0xffeebb });

  // 1. Cabin & Hood
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.4, 1.6), bodyPaintMat);
  cabin.position.set(0, 1.45, 0.4);
  cabin.castShadow = true;
  root.add(cabin);

  // Windshield
  const windshield = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.7), glassMat);
  windshield.position.set(0, 1.65, 1.21);
  windshield.rotation.x = -0.15;
  root.add(windshield);

  // Hood / Engine Bay
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.85, 1.8), bodyPaintMat);
  hood.position.set(0, 0.95, 2.0);
  hood.castShadow = true;
  root.add(hood);

  // Front Radiator Grille
  const grille = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.75, 0.1), chromeMat);
  grille.position.set(0, 0.92, 2.92);
  root.add(grille);

  // Dual Vintage Round Headlights with warm beam
  [-0.65, 0.65].forEach(hx => {
    const lampHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.15, 12), chromeMat);
    lampHousing.rotation.x = Math.PI / 2;
    lampHousing.position.set(hx, 0.95, 2.95);
    root.add(lampHousing);

    const lampLens = new THREE.Mesh(new THREE.CircleGeometry(0.14, 12), lampGlowMat);
    lampLens.position.set(hx, 0.95, 3.03);
    root.add(lampLens);
  });

  // Front Bumper
  const fCrossBumper = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.16, 0.14), chromeMat);
  fCrossBumper.position.set(0, 0.50, 3.02);
  root.add(fCrossBumper);

  // 2. Open Wooden Flatbed (Back Cargo)
  const bedFloor = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.12, 2.8), woodBedMat);
  bedFloor.position.set(0, 0.78, -1.8);
  bedFloor.castShadow = true;
  root.add(bedFloor);

  // Bed side railings
  [-0.98, 0.98].forEach(rx => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 2.8), woodBedMat);
    rail.position.set(rx, 1.02, -1.8);
    rail.castShadow = true;
    root.add(rail);
  });
  const backRail = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.45, 0.08), woodBedMat);
  backRail.position.set(0, 1.02, -3.18);
  root.add(backRail);

  // 3. Four Heavy-Duty Tires & Wheels
  const wheelGeom = new THREE.CylinderGeometry(0.44, 0.44, 0.32, 14);
  wheelGeom.rotateZ(Math.PI / 2);

  const wheelPositions = [
    [-0.98, 0.44, 1.9],  // Front Left
    [0.98, 0.44, 1.9],   // Front Right
    [-1.02, 0.44, -1.9], // Rear Left
    [1.02, 0.44, -1.9]   // Rear Right
  ];

  wheelPositions.forEach(([wx, wy, wz]) => {
    const tire = new THREE.Mesh(wheelGeom, tireMat);
    tire.position.set(wx, wy, wz);
    tire.castShadow = true;

    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.34, 10), rimMat);
    hub.rotation.z = Math.PI / 2;
    tire.add(hub);

    root.add(tire);
  });

  return root;
}

/**
 * Builds Coldbrook Village Gothic Stone Gate & Lanterns
 */
export function buildGothicVillageGate() {
  const root = new THREE.Group();
  root.name = 'Coldbrook_Village_Gate';

  const stoneMat = new THREE.MeshLambertMaterial({ color: 0x484c52, flatShading: false });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x1f2226, metalness: 0.8, roughness: 0.4 });
  const woodMat = new THREE.MeshLambertMaterial({ color: 0x3d2a1c });
  const lanternGlowMat = new THREE.MeshBasicMaterial({ color: 0xffaa44 });

  // Two Ancient Stone Pillars
  [-2.8, 2.8].forEach(px => {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.85, 3.8, 0.85), stoneMat);
    pillar.position.set(px, 1.9, 0);
    pillar.castShadow = true;
    root.add(pillar);

    // Pillar Cap
    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.22, 1.05), stoneMat);
    cap.position.set(px, 3.85, 0);
    root.add(cap);

    // Wall lamp
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.45), ironMat);
    bracket.position.set(px, 2.9, 0.45);
    root.add(bracket);

    const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.35, 0.24), lanternGlowMat);
    lantern.position.set(px, 2.75, 0.65);
    root.add(lantern);
  });

  // Wrought Iron Arch across top
  const archBar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 5.8, 8), ironMat);
  archBar.rotation.z = Math.PI / 2;
  archBar.position.set(0, 3.75, 0);
  root.add(archBar);

  // Arch Wooden Signboard: "COLDBROOK"
  const signBoard = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.45, 0.08), woodMat);
  signBoard.position.set(0, 3.45, 0);
  root.add(signBoard);

  const signCanvas = document.createElement('canvas');
  signCanvas.width = 256;
  signCanvas.height = 64;
  const sctx = signCanvas.getContext('2d');
  sctx.fillStyle = '#2b1b10';
  sctx.fillRect(0, 0, 256, 64);
  sctx.fillStyle = '#e6c888';
  sctx.font = 'bold 26px "Times New Roman", serif';
  sctx.textAlign = 'center';
  sctx.textBaseline = 'middle';
  sctx.fillText('COLDBROOK', 128, 32);

  const signTex = new THREE.CanvasTexture(signCanvas);
  const signLabel = new THREE.Mesh(new THREE.PlaneGeometry(2.35, 0.42), new THREE.MeshBasicMaterial({ map: signTex }));
  signLabel.position.set(0, 3.45, 0.045);
  root.add(signLabel);

  return root;
}
