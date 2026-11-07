/* =========================================================================
   ARSENAL VIEWMODELS (PUMP SHOTGUN, SPIN M1887, GOLOK RIMBA) & MUZZLE FIRE FX
   ========================================================================= */

const THREE = window.THREE;

export const weaponHolder = new THREE.Group();

const gunSteelMat = new THREE.MeshPhongMaterial({ color: 0x242c35, specular: 0x8fa1b3, shininess: 75, flatShading: false });
const gunDarkMat = new THREE.MeshPhongMaterial({ color: 0x161a20, specular: 0x5a6a7a, shininess: 60, flatShading: false });
const gunWoodMat = new THREE.MeshLambertMaterial({ color: 0x4a2c19, flatShading: false });
const gunBrassMat = new THREE.MeshPhongMaterial({ color: 0xc49b40, specular: 0xffe888, shininess: 110, flatShading: false });

export const gunLight = new THREE.PointLight(0xff6611, 0, 24);
gunLight.position.set(0.24, -0.22, -1.2);
weaponHolder.add(gunLight);

export function createMuzzleFire() {
  const group = new THREE.Group();

  const coreGeo = new THREE.ConeGeometry(0.09, 0.7, 6);
  const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const coreCone = new THREE.Mesh(coreGeo, coreMat);
  coreCone.rotation.x = -Math.PI / 2;
  coreCone.position.z = -0.35;
  group.add(coreCone);

  const midGeo = new THREE.ConeGeometry(0.18, 0.95, 6);
  const midMat = new THREE.MeshBasicMaterial({
    color: 0xff7700,
    transparent: true,
    opacity: 0.95
  });
  const midCone = new THREE.Mesh(midGeo, midMat);
  midCone.rotation.x = -Math.PI / 2;
  midCone.position.z = -0.48;
  group.add(midCone);

  const petalGeo = new THREE.PlaneGeometry(0.52, 0.96);
  const petalMat = new THREE.MeshBasicMaterial({
    color: 0xff2200,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.82
  });
  const petal1 = new THREE.Mesh(petalGeo, petalMat);
  petal1.position.z = -0.46;
  group.add(petal1);

  const petal2 = new THREE.Mesh(petalGeo, petalMat);
  petal2.rotation.z = Math.PI / 2;
  petal2.position.z = -0.46;
  group.add(petal2);

  const petal3 = new THREE.Mesh(petalGeo, petalMat);
  petal3.rotation.z = Math.PI / 4;
  petal3.position.z = -0.46;
  group.add(petal3);

  const sparks = [];
  const spkMat1 = new THREE.MeshBasicMaterial({ color: 0xffea38 });
  const spkMat2 = new THREE.MeshBasicMaterial({ color: 0xff4b14 });
  for (let s = 0; s < 7; s++) {
    const sm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.04), s % 2 === 0 ? spkMat1 : spkMat2);
    const ang = (s / 7) * Math.PI * 2;
    const dist = 0.14 + (s % 3) * 0.08;
    sm.position.set(Math.cos(ang) * dist, Math.sin(ang) * dist, -0.2 - s * 0.1);
    group.add(sm);
    sparks.push(sm);
  }

  group.visible = false;
  return { group, coreCone, midCone, petal1, petal2, petal3, sparks };
}

export function showMuzzleFire(fireObj) {
  if (!fireObj || !fireObj.group) return;
  fireObj.group.visible = true;

  const fScale = 0.85 + Math.random() * 0.4;
  fireObj.group.scale.set(fScale, fScale, fScale * (1.0 + Math.random() * 0.35));
  fireObj.group.rotation.z = Math.random() * Math.PI * 2;

  fireObj.sparks.forEach((spk, idx) => {
    const a = (idx / 7) * Math.PI * 2 + Math.random() * 0.5;
    const d = 0.15 + Math.random() * 0.18;
    spk.position.set(Math.cos(a) * d, Math.sin(a) * d, -0.25 - Math.random() * 0.6);
  });

  gunLight.color.setHex(0xff6611);
  gunLight.intensity = 5.2;

  setTimeout(() => {
    if (fireObj && fireObj.group) fireObj.group.visible = false;
    gunLight.intensity = 0;
  }, 95);
}

// 1. Pump Shotgun
export const pumpShotgunGroup = new THREE.Group();
const pumpReceiver = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.72), gunSteelMat);
pumpShotgunGroup.add(pumpReceiver);

const pumpBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.95, 6), gunSteelMat);
pumpBarrel.rotation.x = Math.PI / 2;
pumpBarrel.position.set(0, 0.045, -0.62);
pumpShotgunGroup.add(pumpBarrel);

const pumpMagTube = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.85, 6), gunSteelMat);
pumpMagTube.rotation.x = Math.PI / 2;
pumpMagTube.position.set(0, -0.035, -0.55);
pumpShotgunGroup.add(pumpMagTube);

const pumpGripMesh = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.14, 0.32), gunWoodMat);
pumpGripMesh.position.set(0, -0.035, -0.48);
pumpShotgunGroup.add(pumpGripMesh);

const pumpStock = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.22, 0.44), gunWoodMat);
pumpStock.position.set(0, -0.07, 0.42);
pumpStock.rotation.x = -0.18;
pumpShotgunGroup.add(pumpStock);

export const pumpFire = createMuzzleFire();
pumpFire.group.position.set(0, 0.045, -1.1);
pumpShotgunGroup.add(pumpFire.group);
pumpShotgunGroup.position.set(0.24, -0.27, -0.55);
weaponHolder.add(pumpShotgunGroup);

// 2. Shotgun Putar M1887
export const spinShotgunGroup = new THREE.Group();
const spinReceiver = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.18, 0.58), gunDarkMat);
spinShotgunGroup.add(spinReceiver);

const spinBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.78, 6), gunSteelMat);
spinBarrel.rotation.x = Math.PI / 2;
spinBarrel.position.set(0, 0.045, -0.52);
spinShotgunGroup.add(spinBarrel);

const spinMag = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.72, 6), gunSteelMat);
spinMag.rotation.x = Math.PI / 2;
spinMag.position.set(0, -0.035, -0.49);
spinShotgunGroup.add(spinMag);

const spinClamp = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.07), gunSteelMat);
spinClamp.position.set(0, 0.005, -0.82);
spinShotgunGroup.add(spinClamp);

const spinBead = new THREE.Mesh(new THREE.SphereGeometry(0.018, 5, 5), gunBrassMat);
spinBead.position.set(0, 0.088, -0.84);
spinShotgunGroup.add(spinBead);

const spinGrip = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.22, 0.32), gunWoodMat);
spinGrip.position.set(0, -0.12, 0.36);
spinGrip.rotation.x = -0.42;
spinShotgunGroup.add(spinGrip);

const spinButtCap = new THREE.Mesh(new THREE.BoxGeometry(0.105, 0.06, 0.12), gunBrassMat);
spinButtCap.position.set(0, -0.22, 0.44);
spinButtCap.rotation.x = -0.42;
spinShotgunGroup.add(spinButtCap);

const leverLoopGeo = new THREE.TorusGeometry(0.07, 0.016, 6, 12);
const leverLoop = new THREE.Mesh(leverLoopGeo, gunSteelMat);
leverLoop.position.set(0, -0.14, 0.05);
leverLoop.rotation.y = Math.PI / 2;
spinShotgunGroup.add(leverLoop);

const leverBar = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.08, 0.16), gunSteelMat);
leverBar.position.set(0, -0.10, 0.14);
spinShotgunGroup.add(leverBar);

export const spinFire = createMuzzleFire();
spinFire.group.position.set(0, 0.045, -0.92);
spinShotgunGroup.add(spinFire.group);
spinShotgunGroup.position.set(0.24, -0.27, -0.55);
weaponHolder.add(spinShotgunGroup);

export const weaponSpin = {
  active: false,
  startTime: 0,
  duration: 380
};

// 3. Golok Rimba Melee
export const golokGroup = new THREE.Group();
const golokBladeMat = new THREE.MeshPhongMaterial({ color: 0x8fa0ae, specular: 0xddeef8, shininess: 85, flatShading: false });
const golokEdgeMat = new THREE.MeshPhongMaterial({ color: 0xf0f5fa, specular: 0xffffff, shininess: 120, flatShading: false });
const golokWoodMat = new THREE.MeshLambertMaterial({ color: 0x422314, flatShading: false });
const golokBrassMat = new THREE.MeshPhongMaterial({ color: 0xd4a244, specular: 0xffe988, shininess: 100, flatShading: false });
const golokBloodMat = new THREE.MeshPhongMaterial({ color: 0x7a0914, specular: 0xcc2222, shininess: 80, flatShading: false });

const golokHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.038, 0.36, 6), golokWoodMat);
golokHandle.position.set(0, -0.15, 0.20);
golokHandle.rotation.x = -0.28;
golokGroup.add(golokHandle);

const golokPommel = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.036, 0.06, 6), golokBrassMat);
golokPommel.position.set(0, -0.31, 0.25);
golokPommel.rotation.x = -0.28;
golokGroup.add(golokPommel);

const golokGuard = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.045, 0.09), golokBrassMat);
golokGuard.position.set(0, 0.01, 0.15);
golokGroup.add(golokGuard);

const golokSpine = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.13, 0.72), golokBladeMat);
golokSpine.position.set(0, 0.15, -0.20);
golokGroup.add(golokSpine);

const golokEdge = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.075, 0.68), golokEdgeMat);
golokEdge.position.set(0, 0.05, -0.22);
golokGroup.add(golokEdge);

const golokTip = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.17, 0.22), golokBladeMat);
golokTip.position.set(0, 0.18, -0.62);
golokTip.rotation.x = 0.26;
golokGroup.add(golokTip);

const golokBlood = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.095, 0.18), golokBloodMat);
golokBlood.position.set(0, 0.17, -0.60);
golokBlood.rotation.x = 0.26;
golokGroup.add(golokBlood);

const slashTrailGeo = new THREE.RingGeometry(0.38, 0.88, 8, 1, -Math.PI * 0.45, Math.PI * 0.9);
export const slashTrailMat = new THREE.MeshBasicMaterial({
  color: 0xeeffff,
  side: THREE.DoubleSide,
  transparent: true,
  opacity: 0,
  depthWrite: false
});
const slashTrail = new THREE.Mesh(slashTrailGeo, slashTrailMat);
slashTrail.position.set(-0.15, 0.1, -0.45);
slashTrail.rotation.x = Math.PI / 2.8;
slashTrail.rotation.y = -Math.PI / 4;
golokGroup.add(slashTrail);

golokGroup.position.set(0.28, -0.26, -0.52);
golokGroup.rotation.set(0.18, -0.22, 0.26);
golokGroup.visible = false;
weaponHolder.add(golokGroup);

export const meleeSwing = {
  active: false,
  startTime: 0,
  duration: 270,
  hasHit: false,
  isQuickMelee: false,
  returnWeapon: null
};

export function setupWeaponHolder(camera) {
  camera.add(weaponHolder);
}
