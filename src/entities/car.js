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
            if (child.material.name === 'Mat_PS2_Glass') {
              child.material.transparent = true;
              child.material.opacity = 0.82;
              child.material.roughness = 0.1;
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
 * Creates an interactive Honda Civic 1985 Car with dynamic headlights & wheels
 */
export function createHondaCivicCar() {
  const root = new THREE.Group();
  root.name = 'Honda_Civic_1985_Vehicle';

  let civicMesh = null;
  const wheelNodes = [];
  let wheelRotX = 0;

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
                if (child.material.name === 'Mat_PS2_Glass') {
                  child.material.transparent = true;
                  child.material.opacity = 0.82;
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

    update(dt, speed = 0, isDriving = false) {
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
