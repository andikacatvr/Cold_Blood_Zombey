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

/**
 * Preload the Honda Civic 1985 GLB asset
 */
export function preloadHondaCivicModel() {
  if (civicTemplate || isCivicLoading) return;
  if (typeof THREE === 'undefined' || !THREE.GLTFLoader) return;

  isCivicLoading = true;
  const loader = new THREE.GLTFLoader();
  const url = '/models/honda_civic_1985_ps2.glb';

  loader.load(
    url,
    (gltf) => {
      const model = gltf.scene;
      model.name = 'Honda_Civic_1985_Template';
      model.scale.set(1.15, 1.15, 1.15); // Authentic vehicle scale

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
 * - Soft interior cabin lighting for clear visibility through glass
 */
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

  const rHead = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.20, 0.18), rodrickSkinMat);
  rHeadGroup.add(rHead);

  const rHair = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.10, 0.20), rodrickHairMat);
  rHair.position.set(0, 0.07, -0.01);
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

  const kHead = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.19, 0.16), kristinSkinMat);
  kHeadGroup.add(kHead);

  // Long flowing black hair
  const kHairTop = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.18), kristinHairMat);
  kHairTop.position.set(0, 0.08, 0);
  kHeadGroup.add(kHairTop);

  const kHairBack = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.32, 0.08), kristinHairMat);
  kHairBack.position.set(0, -0.05, -0.07);
  kHeadGroup.add(kHairBack);

  const kHairLeft = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.28, 0.14), kristinHairMat);
  kHairLeft.position.set(-0.085, -0.04, 0.01);
  kHeadGroup.add(kHairLeft);

  const kHairRight = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.28, 0.14), kristinHairMat);
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

  // 3. Cabin Interior Ambient Glow
  const cabinLight = new THREE.PointLight(0xffeed8, 1.35, 3.8, 1.4);
  cabinLight.position.set(0, 1.15, -0.15);
  group.add(cabinLight);

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

        // Kristin looks toward Rodrick when talking
        if (cutsceneTime < 6.8) {
          kHeadGroup.rotation.y = THREE.MathUtils.lerp(kHeadGroup.rotation.y, 0.45, dt * 3.0);
        } else {
          kHeadGroup.rotation.y = THREE.MathUtils.lerp(kHeadGroup.rotation.y, 0.08, dt * 3.0);
        }
      } else {
        // Idle at gate
        wheelGroup.rotation.z = 0;
        rHeadGroup.position.y = 0.50;
        kHeadGroup.position.y = 0.49;
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

  let civicMesh = null;
  const wheelNodes = [];
  let wheelRotX = 0;

  // Passengers inside cabin (Rodrick driving, Kristin beside him)
  const passengers = buildCivicPassengers();
  passengers.group.scale.set(1.15, 1.15, 1.15);
  passengers.group.position.set(0, 1.07 * 1.15, 0);
  root.add(passengers.group);

  // 1. Dual High-Beam Headlights (Lamps)
  const leftHeadlight = new THREE.SpotLight(0xfff6dd, 4.2, 55, Math.PI / 4.2, 0.55, 1.1);
  leftHeadlight.position.set(-0.68, 0.65, 1.85);
  const leftTarget = new THREE.Object3D();
  leftTarget.position.set(-0.68, 0.15, 35);
  root.add(leftTarget);
  leftHeadlight.target = leftTarget;
  leftHeadlight.castShadow = true;
  root.add(leftHeadlight);

  const rightHeadlight = new THREE.SpotLight(0xfff6dd, 4.2, 55, Math.PI / 4.2, 0.55, 1.1);
  rightHeadlight.position.set(0.68, 0.65, 1.85);
  const rightTarget = new THREE.Object3D();
  rightTarget.position.set(0.68, 0.15, 35);
  root.add(rightTarget);
  rightHeadlight.target = rightTarget;
  rightHeadlight.castShadow = true;
  root.add(rightHeadlight);

  // Ambient road glow right under front bumper
  const frontRoadGlow = new THREE.PointLight(0xffeedd, 1.6, 8.0, 1.5);
  frontRoadGlow.position.set(0, 0.55, 2.4);
  root.add(frontRoadGlow);

  // Glowing Headlight Lens Discs
  const lensGeo = new THREE.CircleGeometry(0.12, 12);
  const lensMat = new THREE.MeshBasicMaterial({ color: 0xfffaea, side: THREE.DoubleSide });
  const leftLens = new THREE.Mesh(lensGeo, lensMat);
  leftLens.position.set(-0.68, 0.65, 1.95);
  root.add(leftLens);

  const rightLens = new THREE.Mesh(lensGeo, lensMat);
  rightLens.position.set(0.68, 0.65, 1.95);
  root.add(rightLens);

  // Volumetric Headlight Beams (Cones cutting through the misty night air)
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xfff3d8,
    transparent: true,
    opacity: 0.18,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const beamGeo = new THREE.ConeGeometry(1.8, 16, 12, 1, true);
  beamGeo.rotateX(Math.PI / 2);
  beamGeo.translate(0, 0, 8);

  const leftBeam = new THREE.Mesh(beamGeo, beamMat);
  leftBeam.position.set(-0.68, 0.65, 1.95);
  root.add(leftBeam);

  const rightBeam = new THREE.Mesh(beamGeo, beamMat);
  rightBeam.position.set(0.68, 0.65, 1.95);
  root.add(rightBeam);

  // Glowing Red Taillights (Rear)
  const tailGeo = new THREE.PlaneGeometry(0.28, 0.12);
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff1525, side: THREE.DoubleSide });
  const leftTail = new THREE.Mesh(tailGeo, tailMat);
  leftTail.position.set(-0.72, 0.68, -1.98);
  leftTail.rotation.y = Math.PI;
  root.add(leftTail);

  const rightTail = new THREE.Mesh(tailGeo, tailMat);
  rightTail.position.set(0.72, 0.68, -1.98);
  rightTail.rotation.y = Math.PI;
  root.add(rightTail);

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
    civicMesh.position.set(0, 1.07 * 1.15, 0); // Align bottom of wheels with ground level
    root.add(civicMesh);
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
          model.scale.set(1.15, 1.15, 1.15);
          model.position.set(0, 1.07 * 1.15, 0);

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
            root.remove(civicMesh);
          }
          civicMesh = model;
          root.add(civicMesh);
          wheelNodes.length = 0;
          attachWheels(civicMesh);
        },
        undefined,
        () => {
          // Fallback to procedural
          if (!civicMesh) {
            civicMesh = buildProceduralCivicFallback();
            root.add(civicMesh);
            attachWheels(civicMesh);
          }
        }
      );
    } else {
      civicMesh = buildProceduralCivicFallback();
      root.add(civicMesh);
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
        civicMesh.position.y = (1.07 * 1.15) + bounce;
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
