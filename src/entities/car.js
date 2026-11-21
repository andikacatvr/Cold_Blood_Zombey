/* =========================================================================
   1985 HONDA CIVIC PS2 VEHICLE SYSTEM
   - 3D Model: honda_civic_1985_ps2.glb
   - Dual high-beam headlights with volumetric light shafts & glowing lenses
   - Spinning wheels, suspension kinematics, and realistic driving motion
   - Procedural backup model for instant fallback
   ========================================================================= */

const THREE = window.THREE;
import { getTerrainHeight } from '../world/environment.js';

let civicTemplate = null;
let isCivicLoading = false;
let rodrickPassengerTemplate = null;
let kristinPassengerTemplate = null;

// 1.58x car scale: Perfectly balances roof height (~2.05m) to character shoulder/chin level
export const CAR_SCALE = 1.58;

/**
 * Preload the Honda Civic 1985 GLB asset and character GLBs for passengers
 */
export function preloadHondaCivicModel() {
  if (typeof THREE === 'undefined' || !THREE.GLTFLoader) return;

  const loader = new THREE.GLTFLoader();

  // 1. Honda Civic 1985 car model
  if (!civicTemplate && !isCivicLoading) {
    isCivicLoading = true;
    loader.load(
      '/models/honda_civic_1985_ps2.glb',
      (gltf) => {
        const model = gltf.scene;
        model.name = 'Honda_Civic_1985_Template';
        model.scale.set(1, 1, 1);

        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              child.material.roughness = 0.65;
              child.material.metalness = 0.25;
              if (child.material.name === 'Mat_PS2_Glass' || (child.name && child.name.toLowerCase().includes('glass'))) {
                child.material.transparent = true;
                child.material.opacity = 0.28;
                child.material.roughness = 0.05;
                child.material.metalness = 0.1;
                child.material.depthWrite = false;
              }
            }
          }
        });

        civicTemplate = model;
        isCivicLoading = false;
        console.log('[CAR] 1985 Honda Civic PS2 model preloaded successfully');
      },
      undefined,
      (err) => {
        console.warn('[CAR] Could not load Honda Civic GLB, using procedural fallback:', err);
        isCivicLoading = false;
      }
    );
  }

  // 2. Preload Rodrick GLB for vehicle driver seat
  if (!rodrickPassengerTemplate) {
    loader.load('/models/rodrick.glb', (gltf) => {
      rodrickPassengerTemplate = gltf.scene;
      console.log('[CAR] Preloaded Rodrick GLB for vehicle driver');
    });
  }

  // 3. Preload Kristin GLB for vehicle passenger seat
  if (!kristinPassengerTemplate) {
    loader.load('/models/ps2_character_asset.glb', (gltf) => {
      kristinPassengerTemplate = gltf.scene;
      console.log('[CAR] Preloaded Kristin GLB for vehicle passenger');
    });
  }
}

/**
 * Builds a procedural fallback vintage 1985 hatchback in case GLB is still streaming
 */
function buildProceduralCivicFallback() {
  const group = new THREE.Group();
  group.name = 'Civic_Fallback_Mesh';

  const redMat = new THREE.MeshLambertMaterial({ color: 0x9b1b22, flatShading: false });
  const darkTrimMat = new THREE.MeshLambertMaterial({ color: 0x1f2326, flatShading: false });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x7799aa, roughness: 0.1, metalness: 0.5, transparent: true, opacity: 0.75 });
  const tireMat = new THREE.MeshLambertMaterial({ color: 0x141517, flatShading: true });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0x9098a0, metalness: 0.8, roughness: 0.3 });

  // Main Car Body (1985 Honda Civic Hatchback silhouette)
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.72, 3.6), redMat);
  body.position.set(0, 0.62, 0);
  body.castShadow = true;
  group.add(body);

  // Cabin & Slanted Hatchback Roof
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.62, 2.1), redMat);
  cabin.position.set(0, 1.15, -0.22);
  cabin.castShadow = true;
  group.add(cabin);

  // Windshield
  const windshield = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.62), glassMat);
  windshield.position.set(0, 1.16, 0.85);
  windshield.rotation.x = -0.38;
  group.add(windshield);

  // Bumpers
  const fBumper = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.24, 0.22), darkTrimMat);
  fBumper.position.set(0, 0.36, 1.82);
  group.add(fBumper);

  const rBumper = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.24, 0.22), darkTrimMat);
  rBumper.position.set(0, 0.36, -1.82);
  group.add(rBumper);

  // 4 Wheels
  const wheelPositions = [
    { name: 'Wheel_FL', x: -0.88, z: 1.05 },
    { name: 'Wheel_FR', x: 0.88, z: 1.05 },
    { name: 'Wheel_RL', x: -0.88, z: -1.05 },
    { name: 'Wheel_RR', x: 0.88, z: -1.05 }
  ];

  wheelPositions.forEach((wp) => {
    const wPivot = new THREE.Group();
    wPivot.name = wp.name;
    wPivot.position.set(wp.x, 0.35, wp.z);

    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.22, 16), tireMat);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    wPivot.add(tire);

    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.23, 12), rimMat);
    rim.rotation.z = Math.PI / 2;
    wPivot.add(rim);

    group.add(wPivot);
  });

  return group;
}

/**
 * Builds animated passenger figures inside the Honda Civic cabin:
 * - Driver (Rodrick): sitting on right seat (UK/JDM spec) with hands on steering wheel, turning wheel
 * - Passenger (Kristin): sitting on left seat in green jacket holding field research notebook
 * - Expressive textured faces on both characters visible through windshield
 * - Soft interior cabin lighting for clear visibility through glass
 */

/**
 * Creates high-detail retro PS2 stylized face texture for Rodrick (Driver)
 */
function createRodrickFaceTexture() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  // Base warm tanned masculine skin
  ctx.fillStyle = '#6d4c36';
  ctx.fillRect(0, 0, 128, 128);

  // Forehead highlight & cheek contour
  const browGrad = ctx.createRadialGradient(64, 42, 4, 64, 42, 48);
  browGrad.addColorStop(0, '#825c43');
  browGrad.addColorStop(1, '#654531');
  ctx.fillStyle = browGrad;
  ctx.fillRect(16, 20, 96, 42);

  // Cheeks & Jawline shadow contour
  ctx.fillStyle = '#543826';
  ctx.beginPath();
  ctx.ellipse(22, 78, 14, 28, 0.1, 0, Math.PI * 2);
  ctx.ellipse(106, 78, 14, 28, -0.1, 0, Math.PI * 2);
  ctx.fill();

  // 5 o'clock stubble shadow around jaw and chin
  ctx.fillStyle = 'rgba(28, 20, 15, 0.22)';
  ctx.beginPath();
  ctx.arc(64, 98, 26, 0, Math.PI);
  ctx.fill();

  // Strong, focused dark eyebrows (angled for determined driver gaze)
  ctx.strokeStyle = '#18120e';
  ctx.lineWidth = 4.5;
  ctx.lineCap = 'round';
  // Left brow
  ctx.beginPath();
  ctx.moveTo(26, 42);
  ctx.quadraticCurveTo(42, 36, 56, 40);
  ctx.stroke();
  // Right brow
  ctx.beginPath();
  ctx.moveTo(102, 42);
  ctx.quadraticCurveTo(86, 36, 72, 40);
  ctx.stroke();

  // Concentration brow crease
  ctx.strokeStyle = '#3e281b';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(60, 38);
  ctx.lineTo(60, 44);
  ctx.moveTo(68, 38);
  ctx.lineTo(68, 44);
  ctx.stroke();

  // Eyes (Focused forward through windshield)
  // Left eye sclera
  ctx.fillStyle = '#edf0ef';
  ctx.beginPath();
  ctx.ellipse(42, 51, 11, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  // Right eye sclera
  ctx.beginPath();
  ctx.ellipse(86, 51, 11, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Irises (Dark amber brown)
  ctx.fillStyle = '#3a2012';
  ctx.beginPath();
  ctx.arc(43, 51, 5.5, 0, Math.PI * 2);
  ctx.arc(85, 51, 5.5, 0, Math.PI * 2);
  ctx.fill();

  // Pupils (Deep black)
  ctx.fillStyle = '#0a0604';
  ctx.beginPath();
  ctx.arc(43, 51, 3.2, 0, Math.PI * 2);
  ctx.arc(85, 51, 3.2, 0, Math.PI * 2);
  ctx.fill();

  // White specular glints (Lively reflection)
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(45, 49, 1.6, 0, Math.PI * 2);
  ctx.arc(87, 49, 1.6, 0, Math.PI * 2);
  ctx.fill();

  // Upper eyelid & lash line
  ctx.strokeStyle = '#1b120c';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(30, 50);
  ctx.quadraticCurveTo(42, 45, 54, 51);
  ctx.moveTo(74, 51);
  ctx.quadraticCurveTo(86, 45, 98, 50);
  ctx.stroke();

  // Nose bridge & tip
  ctx.fillStyle = '#7a543b';
  ctx.fillRect(62, 46, 4, 24);
  // Nose tip & nostrils
  ctx.fillStyle = '#523522';
  ctx.beginPath();
  ctx.arc(64, 73, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#26160d';
  ctx.beginPath();
  ctx.ellipse(58, 75, 2.5, 1.8, 0, 0, Math.PI * 2);
  ctx.ellipse(70, 75, 2.5, 1.8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Mouth (Serious, determined line)
  ctx.strokeStyle = '#381e13';
  ctx.lineWidth = 3.0;
  ctx.beginPath();
  ctx.moveTo(48, 93);
  ctx.quadraticCurveTo(64, 95, 80, 93);
  ctx.stroke();
  // Lower lip shadow contour
  ctx.fillStyle = '#503222';
  ctx.beginPath();
  ctx.ellipse(64, 99, 9, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Hair bangs at top of forehead (Dark hair matching 3D hair geometry)
  ctx.fillStyle = '#14110f';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(128, 0);
  ctx.lineTo(128, 22);
  ctx.lineTo(108, 16);
  ctx.lineTo(92, 24);
  ctx.lineTo(76, 15);
  ctx.lineTo(58, 26);
  ctx.lineTo(40, 16);
  ctx.lineTo(24, 25);
  ctx.lineTo(0, 18);
  ctx.closePath();
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;

  // Asynchronously check for pre-rendered face texture
  if (THREE.TextureLoader) {
    const loader = new THREE.TextureLoader();
    loader.load('/textures/rodrick_face.png', (loaded) => {
      if (loaded && loaded.image) {
        loaded.wrapS = THREE.ClampToEdgeWrapping;
        loaded.wrapT = THREE.ClampToEdgeWrapping;
        loaded.minFilter = THREE.LinearFilter;
        loaded.magFilter = THREE.LinearFilter;
        tex.image = loaded.image;
        tex.needsUpdate = true;
      }
    }, undefined, () => {});
  }

  return tex;
}

/**
 * Creates high-detail retro PS2 stylized face texture for Kristin (Passenger)
 */
function createKristinFaceTexture() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  // Base fair smooth skin
  ctx.fillStyle = '#ebd1c0';
  ctx.fillRect(0, 0, 128, 128);

  // Soft rosy blush on cheeks
  const lBlush = ctx.createRadialGradient(34, 69, 2, 34, 69, 18);
  lBlush.addColorStop(0, 'rgba(230, 115, 110, 0.32)');
  lBlush.addColorStop(1, 'rgba(235, 209, 192, 0)');
  ctx.fillStyle = lBlush;
  ctx.beginPath();
  ctx.arc(34, 69, 18, 0, Math.PI * 2);
  ctx.fill();

  const rBlush = ctx.createRadialGradient(94, 69, 2, 94, 69, 18);
  rBlush.addColorStop(0, 'rgba(230, 115, 110, 0.32)');
  rBlush.addColorStop(1, 'rgba(235, 209, 192, 0)');
  ctx.fillStyle = rBlush;
  ctx.beginPath();
  ctx.arc(94, 69, 18, 0, Math.PI * 2);
  ctx.fill();

  // Arched, delicate dark brown eyebrows
  ctx.strokeStyle = '#281711';
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  // Left brow
  ctx.beginPath();
  ctx.moveTo(25, 40);
  ctx.quadraticCurveTo(42, 30, 57, 37);
  ctx.stroke();
  // Right brow
  ctx.beginPath();
  ctx.moveTo(103, 40);
  ctx.quadraticCurveTo(86, 30, 71, 37);
  ctx.stroke();

  // Almond-shaped expressive eyes
  // Left eye sclera
  ctx.fillStyle = '#f8faf9';
  ctx.beginPath();
  ctx.ellipse(42, 51, 12, 6.5, 0.05, 0, Math.PI * 2);
  ctx.fill();
  // Right eye sclera
  ctx.beginPath();
  ctx.ellipse(86, 51, 12, 6.5, -0.05, 0, Math.PI * 2);
  ctx.fill();

  // Dark chocolate brown irises
  ctx.fillStyle = '#2b170e';
  ctx.beginPath();
  ctx.arc(42, 51, 5.8, 0, Math.PI * 2);
  ctx.arc(86, 51, 5.8, 0, Math.PI * 2);
  ctx.fill();

  // Deep pupils
  ctx.fillStyle = '#0a0604';
  ctx.beginPath();
  ctx.arc(42, 51, 3.2, 0, Math.PI * 2);
  ctx.arc(86, 51, 3.2, 0, Math.PI * 2);
  ctx.fill();

  // Vibrant specular sparkle catchlights (Multiple glints for lively eyes)
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(44, 48.5, 1.8, 0, Math.PI * 2);
  ctx.arc(40, 53.5, 1.0, 0, Math.PI * 2);
  ctx.arc(88, 48.5, 1.8, 0, Math.PI * 2);
  ctx.arc(84, 53.5, 1.0, 0, Math.PI * 2);
  ctx.fill();

  // Winged black eyeliner & eyelashes
  ctx.strokeStyle = '#120c09';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(27, 52);
  ctx.quadraticCurveTo(41, 44, 55, 51);
  ctx.moveTo(101, 52);
  ctx.quadraticCurveTo(87, 44, 73, 51);
  ctx.stroke();

  // Small cute nose
  ctx.fillStyle = '#cca088';
  ctx.beginPath();
  ctx.arc(64, 71, 4.0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#9e6e58';
  ctx.beginPath();
  ctx.ellipse(59, 73, 2.0, 1.4, 0, 0, Math.PI * 2);
  ctx.ellipse(69, 73, 2.0, 1.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Rosy lips with cheerful confident smile & toothy highlight
  // Upper lip
  ctx.fillStyle = '#b84d46';
  ctx.beginPath();
  ctx.moveTo(46, 89);
  ctx.quadraticCurveTo(55, 86, 64, 88);
  ctx.quadraticCurveTo(73, 86, 82, 89);
  ctx.quadraticCurveTo(64, 91, 46, 89);
  ctx.fill();

  // White teeth slit
  ctx.fillStyle = '#fcfcfc';
  ctx.beginPath();
  ctx.moveTo(50, 90);
  ctx.quadraticCurveTo(64, 93, 78, 90);
  ctx.quadraticCurveTo(64, 91, 50, 90);
  ctx.fill();

  // Lower lip
  ctx.fillStyle = '#c95952';
  ctx.beginPath();
  ctx.moveTo(46, 89);
  ctx.quadraticCurveTo(64, 99, 82, 89);
  ctx.quadraticCurveTo(64, 93, 46, 89);
  ctx.fill();

  // Smile corner dimples
  ctx.fillStyle = '#7a3028';
  ctx.fillRect(45, 89, 2, 2);
  ctx.fillRect(81, 89, 2, 2);

  // Black bangs & front hairline framing forehead (seamlessly joins 3D hair)
  ctx.fillStyle = '#110f0e';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(128, 0);
  ctx.lineTo(128, 20);
  ctx.lineTo(105, 14);
  ctx.lineTo(88, 22);
  ctx.lineTo(64, 12);
  ctx.lineTo(40, 22);
  ctx.lineTo(22, 14);
  ctx.lineTo(0, 20);
  ctx.closePath();
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;

  // Asynchronously try loading `/textures/kristin_face.png` to blend if available
  if (THREE.TextureLoader) {
    const imgLoader = new THREE.TextureLoader();
    imgLoader.load('/textures/kristin_face.png', (loadedTex) => {
      if (loadedTex && loadedTex.image) {
        loadedTex.wrapS = THREE.ClampToEdgeWrapping;
        loadedTex.wrapT = THREE.ClampToEdgeWrapping;
        loadedTex.minFilter = THREE.LinearFilter;
        loadedTex.magFilter = THREE.LinearFilter;
        tex.image = loadedTex.image;
        tex.needsUpdate = true;
      }
    }, undefined, () => {});
  }

  return tex;
}

function buildCivicPassengers() {
  const group = new THREE.Group();
  group.name = 'Civic_Interior_Passengers';

  // Materials
  const rodrickSkinMat = new THREE.MeshLambertMaterial({ color: 0x5a3d28 });
  const rodrickHairMat = new THREE.MeshLambertMaterial({ color: 0x141210 });
  const rodrickJacketMat = new THREE.MeshLambertMaterial({ color: 0x363a40 });
  const stripeMat = new THREE.MeshLambertMaterial({ color: 0xd8d8d4 });

  const kristinSkinMat = new THREE.MeshLambertMaterial({ color: 0xe0b49c });
  const kristinHairMat = new THREE.MeshLambertMaterial({ color: 0x121010 });
  const kristinJacketMat = new THREE.MeshLambertMaterial({ color: 0x243e32 });
  const kristinScarfMat = new THREE.MeshLambertMaterial({ color: 0x8a3028 });
  const notebookMat = new THREE.MeshLambertMaterial({ color: 0x9a8060 });

  const steeringMat = new THREE.MeshLambertMaterial({ color: 0x1c1e22 });
  const hondaBadgeMat = new THREE.MeshBasicMaterial({ color: 0xcc1822 });

  // 1. DRIVER (RODRICK) - Positioned at Right Hand Seat (UK/JDM spec)
  const driverGroup = new THREE.Group();
  driverGroup.name = 'Driver_Rodrick';
  driverGroup.position.set(0.32, 0.60, -0.28);

  // Torso (Striped jacket)
  const rTorso = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.38, 0.22), rodrickJacketMat);
  rTorso.position.set(0, 0.19, 0);
  driverGroup.add(rTorso);

  const rStripe1 = new THREE.Mesh(new THREE.BoxGeometry(0.326, 0.05, 0.226), stripeMat);
  rStripe1.position.set(0, 0.24, 0);
  driverGroup.add(rStripe1);

  const rStripe2 = new THREE.Mesh(new THREE.BoxGeometry(0.326, 0.05, 0.226), stripeMat);
  rStripe2.position.set(0, 0.13, 0);
  driverGroup.add(rStripe2);

  // Neck & Head
  const rNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.07, 8), rodrickSkinMat);
  rNeck.position.set(0, 0.40, 0.01);
  driverGroup.add(rNeck);

  const rHeadGroup = new THREE.Group();
  rHeadGroup.position.set(0, 0.50, 0.02);

  // Smooth rounded head base (cylindrical skull instead of sharp cube)
  const rHead = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.082, 0.20, 16), rodrickSkinMat);
  rHeadGroup.add(rHead);

  // Rodrick's textured expressive face on front head plane
  const rFaceGeo = new THREE.PlaneGeometry(0.174, 0.198);
  const rFaceMat = new THREE.MeshLambertMaterial({ map: createRodrickFaceTexture(), transparent: false });
  const rFaceMesh = new THREE.Mesh(rFaceGeo, rFaceMat);
  rFaceMesh.position.set(0, 0, 0.089);
  rHeadGroup.add(rFaceMesh);

  // 3D Nose bridge
  const rNose = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.052, 0.038), rodrickSkinMat);
  rNose.position.set(0, -0.01, 0.098);
  rHeadGroup.add(rNose);

  // 3D Hair cap with volume
  const rHair = new THREE.Mesh(new THREE.CylinderGeometry(0.098, 0.092, 0.12, 16), rodrickHairMat);
  rHair.position.set(0, 0.06, -0.01);
  rHeadGroup.add(rHair);

  driverGroup.add(rHeadGroup);

  // Steering Column & Wheel
  const steeringPivot = new THREE.Group();
  steeringPivot.position.set(0, 0.28, 0.36);
  steeringPivot.rotation.x = 0.38;

  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.30, 8), steeringMat);
  column.position.set(0, -0.10, -0.08);
  column.rotation.x = Math.PI / 2;
  steeringPivot.add(column);

  const wheelGroup = new THREE.Group();
  const wheelRing = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.018, 8, 20), steeringMat);
  wheelGroup.add(wheelRing);

  const spokeH = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.024, 0.02), steeringMat);
  wheelGroup.add(spokeH);

  const spokeV = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.13, 0.02), steeringMat);
  spokeV.position.set(0, -0.06, 0);
  wheelGroup.add(spokeV);

  const badge = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.025), hondaBadgeMat);
  wheelGroup.add(badge);

  steeringPivot.add(wheelGroup);
  driverGroup.add(steeringPivot);

  // Arms reaching to wheel
  const lArm = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.28), rodrickJacketMat);
  lArm.position.set(-0.11, 0.26, 0.18);
  lArm.rotation.set(-0.35, 0.22, 0);
  driverGroup.add(lArm);

  const lHand = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.07), rodrickSkinMat);
  lHand.position.set(-0.10, 0.32, 0.34);
  driverGroup.add(lHand);

  const rArm = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.28), rodrickJacketMat);
  rArm.position.set(0.11, 0.26, 0.18);
  rArm.rotation.set(-0.35, -0.22, 0);
  driverGroup.add(rArm);

  const rHand = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.07), rodrickSkinMat);
  rHand.position.set(0.10, 0.32, 0.34);
  driverGroup.add(rHand);

  group.add(driverGroup);

  // 2. PASSENGER (KRISTIN) - Positioned at Left Hand Seat
  const passengerGroup = new THREE.Group();
  passengerGroup.name = 'Passenger_Kristin';
  passengerGroup.position.set(-0.32, 0.60, -0.28);

  // Torso (Olive green coat)
  const kTorso = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.36, 0.20), kristinJacketMat);
  kTorso.position.set(0, 0.18, 0);
  passengerGroup.add(kTorso);

  // Red Scarf
  const kScarf = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.07, 0.18), kristinScarfMat);
  kScarf.position.set(0, 0.34, 0.02);
  passengerGroup.add(kScarf);

  // Head & Long Hair
  const kHeadGroup = new THREE.Group();
  kHeadGroup.position.set(0, 0.49, 0.02);

  // Smooth rounded head base (cylindrical skull instead of sharp cube)
  const kHead = new THREE.Mesh(new THREE.CylinderGeometry(0.080, 0.075, 0.19, 16), kristinSkinMat);
  kHeadGroup.add(kHead);

  // Kristin's textured expressive face on front head plane
  const kFaceGeo = new THREE.PlaneGeometry(0.158, 0.188);
  const kFaceMat = new THREE.MeshLambertMaterial({ map: createKristinFaceTexture(), transparent: false });
  const kFaceMesh = new THREE.Mesh(kFaceGeo, kFaceMat);
  kFaceMesh.position.set(0, 0, 0.081);
  kHeadGroup.add(kFaceMesh);

  // 3D Cute Nose
  const kNose = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.044, 0.032), kristinSkinMat);
  kNose.position.set(0, -0.01, 0.090);
  kHeadGroup.add(kNose);

  // Long flowing black hair
  const kHairTop = new THREE.Mesh(new THREE.CylinderGeometry(0.090, 0.085, 0.10, 16), kristinHairMat);
  kHairTop.position.set(0, 0.07, -0.01);
  kHeadGroup.add(kHairTop);

  const kHairBack = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.34, 0.08), kristinHairMat);
  kHairBack.position.set(0, -0.05, -0.06);
  kHeadGroup.add(kHairBack);

  const kHairLeft = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.30, 0.14), kristinHairMat);
  kHairLeft.position.set(-0.085, -0.04, 0.01);
  kHeadGroup.add(kHairLeft);

  const kHairRight = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.30, 0.14), kristinHairMat);
  kHairRight.position.set(0.085, -0.04, 0.01);
  kHeadGroup.add(kHairRight);

  passengerGroup.add(kHeadGroup);

  // Arms resting in lap holding field notes
  const kArmL = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.065, 0.22), kristinJacketMat);
  kArmL.position.set(-0.11, 0.16, 0.12);
  kArmL.rotation.set(-0.25, 0.15, 0);
  passengerGroup.add(kArmL);

  const kArmR = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.065, 0.22), kristinJacketMat);
  kArmR.position.set(0.11, 0.16, 0.12);
  kArmR.rotation.set(-0.25, -0.15, 0);
  passengerGroup.add(kArmR);

  // Research Notebook
  const notebook = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.02, 0.15), notebookMat);
  notebook.position.set(0, 0.14, 0.20);
  notebook.rotation.x = -0.3;
  passengerGroup.add(notebook);

  group.add(passengerGroup);

  // --- Real 3D GLB Character Models Inside Cabin ---
  let glbRodrickModel = null;
  let glbRodrickHead = null;
  let glbKristinModel = null;

  function attachRodrickGLB(source) {
    if (glbRodrickModel || !source) return;
    const rScene = source.clone(true);
    rScene.name = 'Driver_Rodrick_GLB_Scene';
    rScene.scale.set(0.70, 0.70, 0.70);
    rScene.position.set(0, -0.64, 0.0);
    rScene.rotation.set(0, 0, 0);

    // Hide legs completely so they don't clip under car
    const rLeg = rScene.getObjectByName('Right_Leg_Pivot');
    const lLeg = rScene.getObjectByName('Left_Leg_Pivot');
    if (rLeg) rLeg.visible = false;
    if (lLeg) lLeg.visible = false;

    // Angle arms to reach forward onto the steering wheel
    const rArmG = rScene.getObjectByName('Right_Arm_Pivot');
    const lArmG = rScene.getObjectByName('Left_Arm_Pivot');
    if (rArmG) rArmG.rotation.set(-0.95, -0.22, 0.18);
    if (lArmG) lArmG.rotation.set(-0.95, 0.22, -0.18);

    glbRodrickHead = rScene.getObjectByName('Head_Pivot');
    glbRodrickModel = rScene;

    // Hide geometric fallback box meshes
    rTorso.visible = false;
    rStripe1.visible = false;
    rStripe2.visible = false;
    rNeck.visible = false;
    rHeadGroup.visible = false;
    lArm.visible = false;
    rArm.visible = false;
    lHand.visible = false;
    rHand.visible = false;

    driverGroup.add(rScene);
    console.log('[CAR] Authentic Rodrick GLB successfully placed in driver seat!');
  }

  function attachKristinGLB(source) {
    if (glbKristinModel || !source) return;
    const kScene = source.clone(true);
    kScene.name = 'Passenger_Kristin_GLB_Scene';
    kScene.scale.set(0.70, 0.70, 0.70);
    kScene.position.set(0, -0.58, 0.02);
    kScene.rotation.set(0, 0, 0);

    kScene.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material.roughness = 0.82;
        child.material.metalness = 0.08;
      }
    });

    glbKristinModel = kScene;

    // Hide geometric fallback box meshes
    kTorso.visible = false;
    kScarf.visible = false;
    kHeadGroup.visible = false;
    kArmL.visible = false;
    kArmR.visible = false;
    notebook.visible = false;

    passengerGroup.add(kScene);
    console.log('[CAR] Authentic Kristin GLB successfully placed in passenger seat!');
  }

  if (rodrickPassengerTemplate) {
    attachRodrickGLB(rodrickPassengerTemplate);
  } else if (typeof THREE !== 'undefined' && THREE.GLTFLoader) {
    const l = new THREE.GLTFLoader();
    l.load('/models/rodrick.glb', (gltf) => {
      rodrickPassengerTemplate = gltf.scene;
      attachRodrickGLB(gltf.scene);
    });
  }

  if (kristinPassengerTemplate) {
    attachKristinGLB(kristinPassengerTemplate);
  } else if (typeof THREE !== 'undefined' && THREE.GLTFLoader) {
    const l = new THREE.GLTFLoader();
    l.load('/models/ps2_character_asset.glb', (gltf) => {
      kristinPassengerTemplate = gltf.scene;
      attachKristinGLB(gltf.scene);
    });
  }

  // 3. Cabin Interior Ambient & Frontal Face Illumination
  const cabinLight = new THREE.PointLight(0xfff3e2, 1.8, 4.2, 1.2);
  cabinLight.position.set(0, 1.15, 0.12);
  group.add(cabinLight);

  // Frontal fill light from dashboard directly illuminating both faces through windshield
  const frontalFaceLight = new THREE.PointLight(0xffeedd, 1.4, 2.5, 1.1);
  frontalFaceLight.position.set(0, 1.05, 0.35);
  group.add(frontalFaceLight);

  return {
    group,
    driverGroup,
    passengerGroup,
    rHeadGroup,
    kHeadGroup,
    wheelGroup,
    lHand,
    rHand,
    cabinLight,

    update(dt, speed = 0, isDriving = false, cutsceneTime = 0) {
      if (isDriving || speed > 0) {
        // Active steering wheel micro-adjustments
        const steer = Math.sin(cutsceneTime * 2.8) * 0.18 + Math.cos(cutsceneTime * 1.4) * 0.08;
        wheelGroup.rotation.z = steer;
        lHand.position.y = 0.32 - steer * 0.06;
        rHand.position.y = 0.32 + steer * 0.06;

        // Subtle road bump head bob
        const roadBump = Math.sin(cutsceneTime * 14.0) * 0.005;
        rHeadGroup.position.y = 0.50 + roadBump;
        kHeadGroup.position.y = 0.49 + roadBump;

        // Rodrick looks focused at the road
        rHeadGroup.rotation.y = -steer * 0.3;
        rHeadGroup.rotation.x = 0.04;
        if (glbRodrickHead) {
          glbRodrickHead.rotation.y = -steer * 0.3;
          glbRodrickHead.rotation.x = 0.04;
        }

        // Kristin looks toward Rodrick when talking
        if (cutsceneTime >= 4.2 && cutsceneTime < 8.5) {
          kHeadGroup.rotation.y = THREE.MathUtils.lerp(kHeadGroup.rotation.y, 0.45, dt * 3.0);
          if (glbKristinModel) glbKristinModel.rotation.y = THREE.MathUtils.lerp(glbKristinModel.rotation.y, 0.32, dt * 3.0);
        } else {
          kHeadGroup.rotation.y = THREE.MathUtils.lerp(kHeadGroup.rotation.y, 0.05, dt * 3.0);
          if (glbKristinModel) glbKristinModel.rotation.y = THREE.MathUtils.lerp(glbKristinModel.rotation.y, 0.02, dt * 3.0);
        }
      } else {
        // Idle at gate
        wheelGroup.rotation.z = 0;
        rHeadGroup.position.y = 0.50;
        kHeadGroup.position.y = 0.49;
        if (glbRodrickHead) glbRodrickHead.rotation.set(0, 0, 0);
        if (glbKristinModel) glbKristinModel.rotation.set(0, 0, 0);
      }
    },

    setVisible(visible) {
      group.visible = visible;
    }
  };
}

/**
 * Creates an interactive Honda Civic 1985 Car with dynamic headlights & wheels
 */
export function createHondaCivicCar() {
  const root = new THREE.Group();
  root.name = 'Honda_Civic_1985_Vehicle';

  // Master Scaled Vehicle Container (Synchronizes scale of car, passengers, and lights)
  const carHolder = new THREE.Group();
  carHolder.name = 'Car_Scaled_Holder';
  carHolder.scale.set(CAR_SCALE, CAR_SCALE, CAR_SCALE);
  root.add(carHolder);

  let civicMesh = null;
  const wheelNodes = [];
  let wheelRotX = 0;

  // Passengers inside cabin (Rodrick driving, Kristin beside him)
  const passengers = buildCivicPassengers();
  passengers.group.position.set(0, 0, 0);
  passengers.group.scale.set(1, 1, 1);
  carHolder.add(passengers.group);

  // 1. Dual High-Beam Headlights (Lamps)
  const leftHeadlight = new THREE.SpotLight(0xfff6dd, 4.2, 45, Math.PI / 4.2, 0.55, 1.1);
  leftHeadlight.position.set(-0.58, 0.58, 1.62);
  const leftTarget = new THREE.Object3D();
  leftTarget.position.set(-0.58, 0.10, 30);
  carHolder.add(leftTarget);
  leftHeadlight.target = leftTarget;
  leftHeadlight.castShadow = true;
  carHolder.add(leftHeadlight);

  const rightHeadlight = new THREE.SpotLight(0xfff6dd, 4.2, 45, Math.PI / 4.2, 0.55, 1.1);
  rightHeadlight.position.set(0.58, 0.58, 1.62);
  const rightTarget = new THREE.Object3D();
  rightTarget.position.set(0.58, 0.10, 30);
  carHolder.add(rightTarget);
  rightHeadlight.target = rightTarget;
  rightHeadlight.castShadow = true;
  carHolder.add(rightHeadlight);

  // Ambient road glow right under front bumper
  const frontRoadGlow = new THREE.PointLight(0xffeedd, 1.6, 6.0, 1.5);
  frontRoadGlow.position.set(0, 0.45, 1.9);
  carHolder.add(frontRoadGlow);

  // Glowing Headlight Lens Discs
  const lensGeo = new THREE.CircleGeometry(0.10, 12);
  const lensMat = new THREE.MeshBasicMaterial({ color: 0xfffaea, side: THREE.DoubleSide });
  const leftLens = new THREE.Mesh(lensGeo, lensMat);
  leftLens.position.set(-0.58, 0.58, 1.69);
  carHolder.add(leftLens);

  const rightLens = new THREE.Mesh(lensGeo, lensMat);
  rightLens.position.set(0.58, 0.58, 1.69);
  carHolder.add(rightLens);

  // Volumetric Headlight Beams (Cones cutting through the misty night air)
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xfff3d8,
    transparent: true,
    opacity: 0.18,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const beamGeo = new THREE.ConeGeometry(1.4, 14, 12, 1, true);
  beamGeo.rotateX(Math.PI / 2);
  beamGeo.translate(0, 0, 7);

  const leftBeam = new THREE.Mesh(beamGeo, beamMat);
  leftBeam.position.set(-0.58, 0.58, 1.69);
  carHolder.add(leftBeam);

  const rightBeam = new THREE.Mesh(beamGeo, beamMat);
  rightBeam.position.set(0.58, 0.58, 1.69);
  carHolder.add(rightBeam);

  // Glowing Red Taillights (Rear)
  const tailGeo = new THREE.PlaneGeometry(0.24, 0.10);
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff1525, side: THREE.DoubleSide });
  const leftTail = new THREE.Mesh(tailGeo, tailMat);
  leftTail.position.set(-0.60, 0.62, -1.70);
  leftTail.rotation.y = Math.PI;
  carHolder.add(leftTail);

  const rightTail = new THREE.Mesh(tailGeo, tailMat);
  rightTail.position.set(0.60, 0.62, -1.70);
  rightTail.rotation.y = Math.PI;
  carHolder.add(rightTail);

  // 2. Load GLB Mesh or use Procedural Fallback
  function attachWheels(node) {
    const wNames = ['Wheel_FL', 'Wheel_FR', 'Wheel_RL', 'Wheel_RR'];
    node.traverse((child) => {
      if (wNames.includes(child.name)) {
        wheelNodes.push(child);
      }
    });
  }

  if (civicTemplate) {
    civicMesh = civicTemplate.clone(true);
    civicMesh.position.set(0, 0, 0); // Wheels sit directly on ground
    civicMesh.scale.set(1, 1, 1);
    carHolder.add(civicMesh);
    attachWheels(civicMesh);
  } else {
    // Check if GLTFLoader is ready
    if (typeof THREE !== 'undefined' && THREE.GLTFLoader) {
      const loader = new THREE.GLTFLoader();
      loader.load(
        '/models/honda_civic_1985_ps2.glb',
        (gltf) => {
          const model = gltf.scene;
          model.name = 'Honda_Civic_1985_Mesh';
          model.scale.set(1, 1, 1);
          model.position.set(0, 0, 0);

          model.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              if (child.material) {
                child.material.roughness = 0.65;
                child.material.metalness = 0.25;
                if (child.material.name === 'Mat_PS2_Glass' || (child.name && child.name.toLowerCase().includes('glass'))) {
                  child.material.transparent = true;
                  child.material.opacity = 0.28;
                  child.material.roughness = 0.05;
                  child.material.metalness = 0.1;
                  child.material.depthWrite = false;
                }
              }
            }
          });

          // Replace fallback if present
          if (civicMesh && civicMesh.parent) {
            carHolder.remove(civicMesh);
          }
          civicMesh = model;
          carHolder.add(civicMesh);
          wheelNodes.length = 0;
          attachWheels(civicMesh);
        },
        undefined,
        () => {
          // Fallback to procedural
          if (!civicMesh) {
            civicMesh = buildProceduralCivicFallback();
            carHolder.add(civicMesh);
            attachWheels(civicMesh);
          }
        }
      );
    } else {
      civicMesh = buildProceduralCivicFallback();
      carHolder.add(civicMesh);
      attachWheels(civicMesh);
    }
  }

  // API Methods
  return {
    root,

    setHeadlights(enabled) {
      leftHeadlight.visible = enabled;
      rightHeadlight.visible = enabled;
      frontRoadGlow.visible = enabled;
      leftLens.visible = enabled;
      rightLens.visible = enabled;
      leftBeam.visible = enabled;
      rightBeam.visible = enabled;
      leftTail.visible = enabled;
      rightTail.visible = enabled;
    },

    setHeadlightIntensity(intensity) {
      leftHeadlight.intensity = intensity;
      rightHeadlight.intensity = intensity;
      frontRoadGlow.intensity = intensity * 0.45;
      beamMat.opacity = Math.min(0.25, intensity * 0.05);
    },

    setPassengersVisible(enabled) {
      passengers.setVisible(enabled);
    },

    update(dt, speed = 0, isDriving = false, cutsceneTime = 0) {
      // Rotate wheels when car is in motion
      if (speed !== 0 || isDriving) {
        wheelRotX += speed * dt * 2.8;
        wheelNodes.forEach((w) => {
          w.rotation.x = wheelRotX;
        });
      }

      // Engine chassis vibration & subtle suspension bounce
      if (civicMesh) {
        const bounce = Math.sin(performance.now() * 0.016) * (isDriving ? 0.012 : 0.003);
        civicMesh.position.y = bounce;
      }

      // Update passengers (steering wheel animation, driver hands, head rotation)
      passengers.update(dt, speed, isDriving, cutsceneTime);

      // Subtle atmospheric flicker on headlight beam in foggy wind
      const beamFlicker = 0.16 + Math.sin(performance.now() * 0.007) * 0.025;
      beamMat.opacity = beamFlicker;
    },

    dispose() {
      if (root.parent) {
        root.parent.remove(root);
      }
    }
  };
}
