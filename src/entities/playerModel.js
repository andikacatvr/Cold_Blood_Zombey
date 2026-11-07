/* =========================================================================
   SILENT HILL 2 FIRST-PERSON SHOOTER (FPS) CAMERA CONTROLLER & PLAYER MODEL
   - Default: Pure FPS (First-Person Shooter) with HUD reticle & hands viewmodel
   - Realistic camera orientation tracking pitch & yaw at player eye-level (1.8m)
   - Optional toggle between FPS (default) and TPS with [C]
   ========================================================================= */

const THREE = window.THREE;
import { getTerrainHeight } from '../world/environment.js';

export let cameraMode = 'fps'; // Default: Pure FPS (First-Person Shooter)
export let playerMeshRoot = null;
let playerLeftLeg = null;
let playerRightLeg = null;
let playerLeftArm = null;
let playerRightArm = null;
let playerTorso = null;
let playerHead = null;
let playerWeaponSocket = null;
let playerMiniShotgun = null;
let playerMiniGolok = null;

let walkTime = 0;

export function toggleCameraMode() {
  cameraMode = (cameraMode === 'fps' ? 'tps' : 'fps');
  if (playerMeshRoot) {
    playerMeshRoot.visible = (cameraMode === 'tps');
  }
  return cameraMode;
}

export function buildSurvivorPlayerModel() {
  const root = new THREE.Group();
  root.name = 'Survivor_Player_Model';

  // Materials
  const jacketOliveMat = new THREE.MeshLambertMaterial({ color: 0x3d4d38, flatShading: false });
  const jacketDarkMat = new THREE.MeshLambertMaterial({ color: 0x2c3829, flatShading: false });
  const jeansMat = new THREE.MeshLambertMaterial({ color: 0x24303d, flatShading: false });
  const bootMat = new THREE.MeshLambertMaterial({ color: 0x2d1f16, flatShading: false });
  const skinMat = new THREE.MeshLambertMaterial({ color: 0xd9bfa9, flatShading: false });
  const hairMat = new THREE.MeshLambertMaterial({ color: 0x5a452d, flatShading: false });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x22262a, roughness: 0.35, metalness: 0.8 });

  // 1. Torso & Olive Field Jacket (James Sunderland style)
  playerTorso = new THREE.Group();
  playerTorso.position.set(0, 0.95, 0);

  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.52, 0.28), jacketOliveMat);
  chest.position.set(0, 0.26, 0);
  chest.castShadow = true;
  playerTorso.add(chest);

  // Field jacket collar
  const collar = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.08, 0.26), jacketDarkMat);
  collar.position.set(0, 0.54, -0.01);
  playerTorso.add(collar);

  // Flap chest pockets
  [-0.12, 0.12].forEach(px => {
    const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.03), jacketDarkMat);
    pocket.position.set(px, 0.28, 0.15);
    playerTorso.add(pocket);
  });

  // Pinned Chest Flashlight (Iconic Silent Hill 2 chest light)
  const chestLightMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.12, 8), steelMat);
  chestLightMesh.rotation.x = Math.PI / 2;
  chestLightMesh.position.set(-0.12, 0.32, 0.18);
  playerTorso.add(chestLightMesh);

  // 2. Head & Hair
  playerHead = new THREE.Group();
  playerHead.position.set(0, 0.58, 0);

  const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.22), skinMat);
  headMesh.position.set(0, 0.12, 0);
  headMesh.castShadow = true;
  playerHead.add(headMesh);

  // Parted hair (James Sunderland style)
  const hairMesh = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.24), hairMat);
  hairMesh.position.set(0, 0.20, -0.01);
  playerHead.add(hairMesh);

  playerTorso.add(playerHead);

  // 3. Left Arm
  playerLeftArm = new THREE.Group();
  playerLeftArm.position.set(-0.28, 0.46, 0);

  const lUpper = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.48, 0.15), jacketOliveMat);
  lUpper.position.set(0, -0.20, 0);
  lUpper.castShadow = true;
  playerLeftArm.add(lUpper);

  const lHand = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 0.10), skinMat);
  lHand.position.set(0, -0.46, 0);
  playerLeftArm.add(lHand);
  playerTorso.add(playerLeftArm);

  // 4. Right Arm & Weapon Socket
  playerRightArm = new THREE.Group();
  playerRightArm.position.set(0.28, 0.46, 0);

  const rUpper = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.48, 0.15), jacketOliveMat);
  rUpper.position.set(0, -0.20, 0);
  rUpper.castShadow = true;
  playerRightArm.add(rUpper);

  const rHand = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 0.10), skinMat);
  rHand.position.set(0, -0.46, 0);
  playerRightArm.add(rHand);

  // Weapon socket
  playerWeaponSocket = new THREE.Group();
  playerWeaponSocket.position.set(0, -0.46, 0.08);
  playerWeaponSocket.rotation.x = -Math.PI / 2.5;

  // Mini Shotgun
  playerMiniShotgun = new THREE.Group();
  const gunBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.65, 8), steelMat);
  gunBarrel.rotation.x = Math.PI / 2;
  gunBarrel.position.set(0, 0, 0.25);
  playerMiniShotgun.add(gunBarrel);
  const gunStock = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.07, 0.22), new THREE.MeshLambertMaterial({ color: 0x3d2215 }));
  gunStock.position.set(0, -0.02, -0.16);
  playerMiniShotgun.add(gunStock);
  playerWeaponSocket.add(playerMiniShotgun);

  // Mini Golok Rimba / Pipe
  playerMiniGolok = new THREE.Group();
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.06, 0.52), steelMat);
  blade.position.set(0, 0, 0.20);
  playerMiniGolok.add(blade);
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.16, 8), new THREE.MeshLambertMaterial({ color: 0x4a2a1b }));
  grip.rotation.x = Math.PI / 2;
  grip.position.set(0, 0, -0.08);
  playerMiniGolok.add(grip);
  playerMiniGolok.visible = false;
  playerWeaponSocket.add(playerMiniGolok);

  playerRightArm.add(playerWeaponSocket);
  playerTorso.add(playerRightArm);

  root.add(playerTorso);

  // 5. Left Leg (Hip Joint pivot at y = 0.95)
  playerLeftLeg = new THREE.Group();
  playerLeftLeg.position.set(-0.13, 0.95, 0);

  const lThigh = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.52, 0.18), jeansMat);
  lThigh.position.set(0, -0.26, 0);
  lThigh.castShadow = true;
  playerLeftLeg.add(lThigh);

  const lShin = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.44, 0.16), jeansMat);
  lShin.position.set(0, -0.66, 0);
  lShin.castShadow = true;
  playerLeftLeg.add(lShin);

  const lBoot = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.14, 0.26), bootMat);
  lBoot.position.set(0, -0.88, 0.04);
  lBoot.castShadow = true;
  playerLeftLeg.add(lBoot);

  root.add(playerLeftLeg);

  // 6. Right Leg (Hip Joint pivot at y = 0.95)
  playerRightLeg = new THREE.Group();
  playerRightLeg.position.set(0.13, 0.95, 0);

  const rThigh = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.52, 0.18), jeansMat);
  rThigh.position.set(0, -0.26, 0);
  rThigh.castShadow = true;
  playerRightLeg.add(rThigh);

  const rShin = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.44, 0.16), jeansMat);
  rShin.position.set(0, -0.66, 0);
  rShin.castShadow = true;
  playerRightLeg.add(rShin);

  const rBoot = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.14, 0.26), bootMat);
  rBoot.position.set(0, -0.88, 0.04);
  rBoot.castShadow = true;
  playerRightLeg.add(rBoot);

  root.add(playerRightLeg);
  root.visible = false; // Default: hidden for pure FPS view

  playerMeshRoot = root;
  return root;
}

export function updatePlayerModelAnimation(isMoving, isSprinting, dt, activeWeapon) {
  if (!playerMeshRoot || !playerMeshRoot.visible) return;

  // Weapon visibility sync
  if (playerMiniShotgun && playerMiniGolok) {
    if (activeWeapon === 'golok') {
      playerMiniGolok.visible = true;
      playerMiniShotgun.visible = false;
    } else {
      playerMiniGolok.visible = false;
      playerMiniShotgun.visible = true;
    }
  }

  // Locomotion Stride Kinematics
  if (isMoving) {
    const freq = isSprinting ? 12.5 : 8.5;
    const amp = isSprinting ? 0.75 : 0.55;
    walkTime += dt * freq;

    const stride = Math.sin(walkTime);
    playerLeftLeg.rotation.x = stride * amp;
    playerRightLeg.rotation.x = -stride * amp;

    // Counter arm swinging
    playerLeftArm.rotation.x = -stride * 0.45;
    playerRightArm.rotation.x = -0.35 + stride * 0.18;

    // Hip bobbing & subtle sway
    playerTorso.position.y = 0.95 + Math.abs(stride) * 0.04;
    playerTorso.rotation.y = Math.sin(walkTime) * 0.06;
  } else {
    // Idle breathing
    walkTime += dt * 2.0;
    const breath = Math.sin(walkTime);
    playerLeftLeg.rotation.x = THREE.MathUtils.lerp(playerLeftLeg.rotation.x, 0, 0.15);
    playerRightLeg.rotation.x = THREE.MathUtils.lerp(playerRightLeg.rotation.x, 0, 0.15);
    playerLeftArm.rotation.x = THREE.MathUtils.lerp(playerLeftArm.rotation.x, 0.05, 0.15);
    playerRightArm.rotation.x = THREE.MathUtils.lerp(playerRightArm.rotation.x, -0.30, 0.15);
    playerTorso.position.y = 0.95 + breath * 0.008;
    playerTorso.rotation.y = THREE.MathUtils.lerp(playerTorso.rotation.y, 0, 0.1);
  }
}

/**
 * Updates the Third-Person Horror Camera tracking behind the player.
 */
export function updateHorrorCamera(camera, playerPos, yaw, pitch, dt) {
  if (!playerMeshRoot) return;

  if (cameraMode === 'tps') {
    playerMeshRoot.visible = true;
    playerMeshRoot.position.set(playerPos.x, playerPos.y, playerPos.z);
    playerMeshRoot.rotation.y = yaw;

    // Silent Hill 2 Elevated Over-the-Shoulder Camera position
    const camDist = 2.65;
    const camHeight = 1.95;
    const camSideOffset = 0.38;

    // In Three.js, with yaw=0 forward is -Z and backward is +Z
    // In TPS mode, camera sits behind player (+Z) and slightly over right shoulder (+X)
    const sinY = Math.sin(yaw);
    const cosY = Math.cos(yaw);

    // backward vector = (+sinY, 0, +cosY), right vector = (+cosY, 0, -sinY)
    const backX = sinY * camDist + cosY * camSideOffset;
    const backZ = cosY * camDist - sinY * camSideOffset;

    const targetCamX = playerPos.x + backX;
    const targetCamY = playerPos.y + camHeight;
    const targetCamZ = playerPos.z + backZ;

    camera.position.set(targetCamX, targetCamY, targetCamZ);

    // Look at target in front of player (towards -Z when yaw=0)
    const lookAheadDist = 6.0;
    const lookTargetX = playerPos.x - sinY * lookAheadDist;
    const lookTargetY = playerPos.y + 1.45 + Math.sin(pitch) * 2.4;
    const lookTargetZ = playerPos.z - cosY * lookAheadDist;

    camera.lookAt(lookTargetX, lookTargetY, lookTargetZ);
  } else {
    // FPS Mode
    playerMeshRoot.visible = false;
    camera.position.set(playerPos.x, playerPos.y + 1.8, playerPos.z);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;
  }
}

/**
 * Poses the player model during the intro cutscene:
 * - 'unconscious': lying limp & unconscious in the snow beside Kristin
 * - 'waking': smoothly interpolates from lying down to rising up on feet
 * - 'reset': restores default standing pose and visibility
 */
export function setPlayerCutscenePose(mode, progress = 0) {
  if (!playerMeshRoot) return;

  const gy = (typeof getTerrainHeight === 'function') ? getTerrainHeight(0, 14.0) : 0;

  if (mode === 'unconscious') {
    playerMeshRoot.visible = true;
    // Laying down flat on back in the snow
    // Pivot is at feet, head rests naturally near Z = 14.3
    playerMeshRoot.position.set(0, gy + 0.22, 12.8);
    playerMeshRoot.rotation.set(-Math.PI / 2, 0, 0.12);

    // Limp, unconscious limbs sprawled naturally in the snow
    if (playerHead) playerHead.rotation.set(0.12, 0.45, -0.06);
    if (playerLeftArm) playerLeftArm.rotation.set(0.18, 0.10, 0.75);
    if (playerRightArm) playerRightArm.rotation.set(-0.35, -0.15, -0.40);
    if (playerLeftLeg) playerLeftLeg.rotation.set(0.10, 0.14, 0.18);
    if (playerRightLeg) playerRightLeg.rotation.set(-0.06, -0.12, -0.15);
    if (playerWeaponSocket) playerWeaponSocket.visible = false;
  } else if (mode === 'waking') {
    playerMeshRoot.visible = true;
    const ease = progress * progress * (3 - 2 * progress); // smooth cubic
    playerMeshRoot.position.set(
      0,
      THREE.MathUtils.lerp(gy + 0.22, gy, ease),
      THREE.MathUtils.lerp(12.8, 14.0, ease)
    );
    playerMeshRoot.rotation.x = THREE.MathUtils.lerp(-Math.PI / 2, 0, ease);
    playerMeshRoot.rotation.z = THREE.MathUtils.lerp(0.12, 0, ease);

    if (playerHead) playerHead.rotation.set(
      THREE.MathUtils.lerp(0.12, 0, ease),
      THREE.MathUtils.lerp(0.45, 0, ease),
      0
    );
    if (playerLeftArm) playerLeftArm.rotation.set(
      THREE.MathUtils.lerp(0.18, 0, ease),
      THREE.MathUtils.lerp(0.10, 0, ease),
      THREE.MathUtils.lerp(0.75, 0, ease)
    );
    if (playerRightArm) playerRightArm.rotation.set(
      THREE.MathUtils.lerp(-0.35, 0, ease),
      THREE.MathUtils.lerp(-0.15, 0, ease),
      THREE.MathUtils.lerp(-0.40, 0, ease)
    );
    if (playerLeftLeg) playerLeftLeg.rotation.set(
      THREE.MathUtils.lerp(0.10, 0, ease),
      THREE.MathUtils.lerp(0.14, 0, ease),
      THREE.MathUtils.lerp(0.18, 0, ease)
    );
    if (playerRightLeg) playerRightLeg.rotation.set(
      THREE.MathUtils.lerp(-0.06, 0, ease),
      THREE.MathUtils.lerp(-0.12, 0, ease),
      THREE.MathUtils.lerp(-0.15, 0, ease)
    );

    if (playerWeaponSocket) {
      playerWeaponSocket.visible = (progress > 0.85);
    }
  } else {
    // Reset to normal gameplay state
    playerMeshRoot.rotation.set(0, 0, 0);
    playerMeshRoot.position.set(0, gy, 14.0);
    if (playerHead) playerHead.rotation.set(0, 0, 0);
    if (playerLeftArm) playerLeftArm.rotation.set(0, 0, 0);
    if (playerRightArm) playerRightArm.rotation.set(0, 0, 0);
    if (playerLeftLeg) playerLeftLeg.rotation.set(0, 0, 0);
    if (playerRightLeg) playerRightLeg.rotation.set(0, 0, 0);
    if (playerWeaponSocket) playerWeaponSocket.visible = true;
    playerMeshRoot.visible = (cameraMode === 'tps');
  }
}

