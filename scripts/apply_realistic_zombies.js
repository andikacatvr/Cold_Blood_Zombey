import fs from 'fs';

const filePath = 'c:/Users/tryfi/OneDrive/foto- camera/Documents/andika/game_zombie/src/entities/enemies.js';
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Tambahkan variabel material wajah realistis
const matInsertPoint = 'let ps1FemaleHairMat, ps1MaleHairMat, ps1TieMat, ps1FormalShoeMat, ps1DarkBeltMat;';
const matRepl = `let ps1FemaleHairMat, ps1MaleHairMat, ps1TieMat, ps1FormalShoeMat, ps1DarkBeltMat;
let faceFemaleShaggyMat, faceMaleTiredMat, faceMaleFadeMat, faceFemaleSleekMat;
export const zombieGLBCache = { femaleShaggy: null, maleVest: null, maleSuit: null, femaleSleek: null };`;

content = content.replace(matInsertPoint, matRepl);

// 2. Di initEnemyMaterials, inisialisasi material foto wajah asli
const initEnemyPoint = 'ps1DarkBeltMat = new THREE.MeshLambertMaterial({ color: 0x16181a, flatShading: true });';
const initEnemyRepl = `ps1DarkBeltMat = new THREE.MeshLambertMaterial({ color: 0x16181a, flatShading: true });

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
  });`;

content = content.replace(initEnemyPoint, initEnemyRepl);

// 3. Tambahkan fungsi createRealisticContouredHead dan preloadZombieGLBModels
const funcInsertPoint = 'export function buildLeft4DeadInfected(variant = 0) {';
const newHeadFunc = `export function preloadZombieGLBModels(scene) {
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
  let faceMat = faceFemaleShaggyMat || l4dFaceMat;
  let hairMat = ps1FemaleHairMat;
  const isFemale = (variant === 0 || variant === 3);

  if (variant === 1) {
    faceMat = faceMaleTiredMat || l4dFaceMat;     // tired sunken eyes man (Photo 4)
    hairMat = ps1MaleHairMat;
  } else if (variant === 2) {
    faceMat = faceMaleFadeMat || l4dFaceMat;      // Asian fade man (Photo 2)
    hairMat = ps1MaleHairMat;
  } else if (variant === 3) {
    faceMat = faceFemaleSleekMat || l4dFaceMat;   // sleek pulled-back hair lady (Photo 3)
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

  // 8. Anatomical 3D Ears
  [-0.102, 0.102].forEach((earX, idx) => {
    const earGroup = new THREE.Group();
    earGroup.position.set(earX * scale, 0.015 * scale, -0.01 * scale);
    earGroup.rotation.y = (idx === 0 ? -0.22 : 0.22);
    head.add(earGroup);

    const earHelix = new THREE.Mesh(new THREE.TorusGeometry(0.020 * scale, 0.005 * scale, 5, 8, Math.PI * 1.3), l4dNecroticSkinMat);
    earHelix.rotation.z = Math.PI * 0.45;
    earGroup.add(earHelix);
  });

  // 9. 3D Hairstyling matching user photos
  const hairGroup = new THREE.Group();
  head.add(hairGroup);

  if (variant === 0) {
    // Female Shaggy (Photo 5: Layered bob bangs framing face)
    const hairTop = new THREE.Mesh(new THREE.SphereGeometry(0.124 * scale, 14, 10), hairMat);
    hairTop.scale.set(1.05, 0.85, 1.15);
    hairTop.position.set(0, 0.048 * scale, -0.012 * scale);
    hairGroup.add(hairTop);

    [-0.098, 0.098].forEach(bx => {
      const bang = new THREE.Mesh(new THREE.CylinderGeometry(0.018 * scale, 0.042 * scale, 0.24 * scale, 6), hairMat);
      bang.position.set(bx * scale, -0.02 * scale, 0.04 * scale);
      bang.rotation.z = (bx > 0 ? -0.15 : 0.15);
      bang.rotation.x = 0.1;
      hairGroup.add(bang);
    });

    const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.22 * scale, 0.24 * scale, 0.08 * scale), hairMat);
    hairBack.position.set(0, -0.05 * scale, -0.088 * scale);
    hairBack.rotation.x = -0.15;
    hairGroup.add(hairBack);
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

export function buildLeft4DeadInfected(variant = 0) {`;

content = content.replace(funcInsertPoint, newHeadFunc);

// 4. Di dalam buildLeft4DeadInfected, ganti pembuatan kepala kotak dengan createRealisticContouredHead
const oldHeadCreation = `  const head = new THREE.Group();
  head.position.y = 0.12 * scale;
  neck.add(head);
  parts.head = head;

  // PS1 low-poly angular cranium
  const craniumGeo = new THREE.BoxGeometry(0.18 * scale, 0.22 * scale, 0.19 * scale);
  const craniumMesh = new THREE.Mesh(craniumGeo, l4dFaceMat);
  head.add(craniumMesh);

  // Hair styling according to reference
  if (isFemale) {
    // Classic retro bob hair (brown/brunette)
    const hairTopGeo = new THREE.BoxGeometry(0.20 * scale, 0.09 * scale, 0.21 * scale);
    const hairTop = new THREE.Mesh(hairTopGeo, ps1FemaleHairMat);
    hairTop.position.set(0, 0.08 * scale, 0.01 * scale);
    head.add(hairTop);

    const hairBackGeo = new THREE.BoxGeometry(0.21 * scale, 0.20 * scale, 0.10 * scale);
    const hairBack = new THREE.Mesh(hairBackGeo, ps1FemaleHairMat);
    hairBack.position.set(0, -0.02 * scale, -0.07 * scale);
    head.add(hairBack);

    // Side strands hanging down
    [-0.10, 0.10].forEach((hx) => {
      const strand = new THREE.Mesh(new THREE.BoxGeometry(0.03 * scale, 0.18 * scale, 0.12 * scale), ps1FemaleHairMat);
      strand.position.set(hx * scale, -0.02 * scale, 0.02 * scale);
      head.add(strand);
    });
  } else if (isSuitMale) {
    // Neat parted dark hair
    const hairTop = new THREE.Mesh(
      new THREE.BoxGeometry(0.19 * scale, 0.07 * scale, 0.20 * scale),
      ps1MaleHairMat
    );
    hairTop.position.set(0, 0.09 * scale, -0.01 * scale);
    head.add(hairTop);
  } else {
    // Vest male: Receding/messy disheveled hair
    const hairSide = new THREE.Mesh(
      new THREE.BoxGeometry(0.20 * scale, 0.05 * scale, 0.18 * scale),
      ps1MaleHairMat
    );
    hairSide.position.set(0, 0.07 * scale, -0.03 * scale);
    head.add(hairSide);
  }

  // Jaw for biting / groaning animation
  const jaw = new THREE.Group();
  jaw.position.set(0, -0.08 * scale, 0.04 * scale);
  head.add(jaw);
  parts.jaw = jaw;

  const jawGeo = new THREE.BoxGeometry(0.12 * scale, 0.06 * scale, 0.12 * scale);
  const jawMesh = new THREE.Mesh(jawGeo, l4dNecroticSkinMat);
  jaw.add(jawMesh);

  // Eerie dead eyes (dark sunken sockets with tiny glowing pinpricks)
  [-0.045, 0.045].forEach((ex) => {
    const eyeSocket = new THREE.Mesh(
      new THREE.BoxGeometry(0.035 * scale, 0.025 * scale, 0.02 * scale),
      fleshDarkClotMat
    );
    eyeSocket.position.set(ex * scale, 0.02 * scale, 0.10 * scale);
    head.add(eyeSocket);

    const pupil = new THREE.Mesh(
      new THREE.BoxGeometry(0.012 * scale, 0.012 * scale, 0.01 * scale),
      feralGlowingEyesMat
    );
    pupil.position.set(ex * scale, 0.02 * scale, 0.11 * scale);
    head.add(pupil);
  });`;

const newHeadCreation = `  // Realistic Anatomical Contoured Head (From User Photos & Not a Box!)
  const { head, jaw } = createRealisticContouredHead(variant, scale);
  head.position.y = 0.12 * scale;
  neck.add(head);
  parts.head = head;
  parts.jaw = jaw;`;

content = content.replace(oldHeadCreation, newHeadCreation);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Successfully updated enemies.js with realistic contoured human heads and GLB caching!');

