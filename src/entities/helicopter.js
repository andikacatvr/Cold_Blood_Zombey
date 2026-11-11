import * as THREE from 'three';

/**
 * Tactical Military Transport Helicopter
 * - Composite fuselage with cockpit windshield and illuminated cabin
 * - Animated spinning main rotor and tail rotor
 * - Dual tubular landing skids
 * - Gimbal tactical searchlight with volumetric beam cone
 * - Flashing navigation strobe
 */
export function createTacticalHelicopter() {
  const heliGroup = new THREE.Group();
  heliGroup.name = 'Tactical_Helicopter_Transport';

  // Materials
  const oliveMat = new THREE.MeshStandardMaterial({
    color: 0x1d2920, // Tactical military dark olive
    roughness: 0.45,
    metalness: 0.65
  });
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x141816,
    roughness: 0.35,
    metalness: 0.85
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x08100c,
    roughness: 0.1,
    metalness: 0.9,
    transparent: true,
    opacity: 0.88
  });

  // 1. Fuselage Body
  const cabinGeo = new THREE.BoxGeometry(1.6, 1.8, 4.4);
  const cabinMesh = new THREE.Mesh(cabinGeo, oliveMat);
  cabinMesh.position.set(0, 0, 0);
  heliGroup.add(cabinMesh);

  // Cockpit aerodynamic nose
  const noseGeo = new THREE.ConeGeometry(0.9, 1.8, 8);
  const noseMesh = new THREE.Mesh(noseGeo, oliveMat);
  noseMesh.rotation.x = -Math.PI / 2;
  noseMesh.position.set(0, -0.15, 2.9);
  noseMesh.scale.set(0.9, 1.0, 0.7);
  heliGroup.add(noseMesh);

  // Cockpit windshield glass
  const glassGeo = new THREE.BoxGeometry(1.4, 0.8, 1.4);
  const glassMesh = new THREE.Mesh(glassGeo, glassMat);
  glassMesh.position.set(0, 0.45, 1.8);
  glassMesh.rotation.x = -0.35;
  heliGroup.add(glassMesh);

  // 2. Open side sliding door (revealing warm interior light)
  const interiorLight = new THREE.PointLight(0xff6622, 1.8, 6.0);
  interiorLight.position.set(0.7, 0.1, -0.2);
  heliGroup.add(interiorLight);

  // 3. Tail Boom & Fin
  const boomGeo = new THREE.CylinderGeometry(0.22, 0.42, 5.2, 8);
  const boomMesh = new THREE.Mesh(boomGeo, oliveMat);
  boomMesh.rotation.x = Math.PI / 2;
  boomMesh.position.set(0, 0.25, -4.5);
  heliGroup.add(boomMesh);

  // Tail vertical fin
  const finGeo = new THREE.BoxGeometry(0.12, 1.6, 1.2);
  const finMesh = new THREE.Mesh(finGeo, oliveMat);
  finMesh.position.set(0, 0.85, -6.9);
  finMesh.rotation.x = 0.25;
  heliGroup.add(finMesh);

  // Tail rotor
  const tailRotorGroup = new THREE.Group();
  tailRotorGroup.position.set(0.15, 1.2, -7.0);
  const trBladeGeo = new THREE.BoxGeometry(0.04, 1.4, 0.1);
  const trBladeMesh = new THREE.Mesh(trBladeGeo, darkMetalMat);
  tailRotorGroup.add(trBladeMesh);
  heliGroup.add(tailRotorGroup);

  // 4. Main Rotor System
  const mastGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.6, 8);
  const mastMesh = new THREE.Mesh(mastGeo, darkMetalMat);
  mastMesh.position.set(0, 1.15, 0.3);
  heliGroup.add(mastMesh);

  const mainRotorGroup = new THREE.Group();
  mainRotorGroup.position.set(0, 1.45, 0.3);

  // 4 rotor blades
  for (let i = 0; i < 4; i++) {
    const angle = i * (Math.PI / 2);
    const bladeGeo = new THREE.BoxGeometry(0.25, 0.03, 4.4);
    const bladeMesh = new THREE.Mesh(bladeGeo, darkMetalMat);
    bladeMesh.rotation.y = angle;
    bladeMesh.position.set(Math.sin(angle) * 2.2, 0, Math.cos(angle) * 2.2);
    bladeMesh.rotation.z = 0.05;
    mainRotorGroup.add(bladeMesh);
  }
  heliGroup.add(mainRotorGroup);

  // 5. Landing Skids
  const skidMat = darkMetalMat;
  for (const side of [-1, 1]) {
    const skidGeo = new THREE.CylinderGeometry(0.045, 0.045, 4.6, 8);
    const skidMesh = new THREE.Mesh(skidGeo, skidMat);
    skidMesh.rotation.x = Math.PI / 2;
    skidMesh.position.set(side * 0.95, -1.15, 0.2);
    heliGroup.add(skidMesh);

    // Curved front tip
    const tipGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.6, 8);
    const tipMesh = new THREE.Mesh(tipGeo, skidMat);
    tipMesh.rotation.x = Math.PI / 3;
    tipMesh.position.set(side * 0.95, -0.95, 2.6);
    heliGroup.add(tipMesh);

    // Pylon struts
    for (const zOffset of [-1.0, 1.2]) {
      const pylonGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.65, 8);
      const pylonMesh = new THREE.Mesh(pylonGeo, skidMat);
      pylonMesh.position.set(side * 0.85, -0.75, zOffset);
      pylonMesh.rotation.z = side * 0.25;
      heliGroup.add(pylonMesh);
    }
  }

  // 6. Tactical Searchlight & Volumetric Light Beam
  const searchlight = new THREE.SpotLight(0xddeeff, 9.0, 50, Math.PI / 4.2, 0.35, 1.1);
  searchlight.position.set(0, -0.6, 2.2);
  heliGroup.add(searchlight);
  heliGroup.add(searchlight.target);

  // Volumetric beam cone
  const coneGeo = new THREE.CylinderGeometry(0.15, 4.2, 22.0, 16, 1, true);
  const coneMat = new THREE.MeshBasicMaterial({
    color: 0x99ccff,
    transparent: true,
    opacity: 0.18,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const coneMesh = new THREE.Mesh(coneGeo, coneMat);
  coneMesh.position.set(0, -11.0, 0);
  searchlight.add(coneMesh);

  // 7. Navigation Strobe Light
  const navLight = new THREE.PointLight(0xff2222, 2.5, 8.0);
  navLight.position.set(0, 1.7, -7.0);
  heliGroup.add(navLight);

  return {
    root: heliGroup,
    mainRotor: mainRotorGroup,
    tailRotor: tailRotorGroup,
    searchlight,
    navLight,
    update(dt = 0.016) {
      mainRotorGroup.rotation.y += dt * 38.0;
      tailRotorGroup.rotation.x += dt * 55.0;
      navLight.intensity = (Math.sin(performance.now() * 0.01) > 0.6) ? 3.5 : 0.2;
    }
  };
}

