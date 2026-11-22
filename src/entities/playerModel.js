/* =========================================================================
   SILENT HILL 2 FIRST-PERSON SHOOTER (FPS) CAMERA CONTROLLER & PLAYER MODEL
   - Default: Pure FPS (First-Person Shooter) with HUD reticle & hands viewmodel
   - Realistic camera orientation tracking pitch & yaw at player eye-level (1.8m)
   - Optional toggle between FPS (default) and TPS with [C]
   ========================================================================= */

const THREE = window.THREE;
import { getTerrainHeight } from '../world/environment.js';
import { renderer } from '../graphics/engine.js';

export let cameraMode = 'fps'; // Default: Pure FPS (First-Person Shooter)
export let playerMeshRoot = null;
export let isRodrickGLBLoaded = false;
export let hasCapturedPortrait = false;
export const RODRICK_SCALE = 1.34; // Perfectly matches Kristin's heroic height (~2.34m)
let placeholderGroup = null;
let rodrickGLBScene = null;
let rodrickTorsoBaseY = 0.893;

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

function loadRodrickGLBModel(root) {
  if (typeof THREE === 'undefined' || !THREE.GLTFLoader) {
    console.warn('[PLAYER] THREE.GLTFLoader unavailable, using placeholder');
    return;
  }

  const loader = new THREE.GLTFLoader();
  const primaryUrl = '/models/rodrick.glb';
  const fallbackUrl = '/rodrick.glb';

  function applyGLB(gltf, src) {
    const charScene = gltf.scene;
    charScene.name = 'Rodrick_GLB_Player_Mesh';

    // Scale Rodrick so his height matches Kristin's heroic stature (~2.34m)
    charScene.scale.set(RODRICK_SCALE, RODRICK_SCALE, RODRICK_SCALE);
    // Face forward along -Z (Three.js camera forward) so Rodrick faces the direction of travel
    charScene.rotation.y = Math.PI;

    charScene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          child.material.roughness = 0.82;
          child.material.metalness = 0.06;
          child.material.needsUpdate = true;
        }
      }
    });

    // Locate hierarchical joints
    const glbHead = charScene.getObjectByName('Head_Pivot');
    const glbRightArm = charScene.getObjectByName('Right_Arm_Pivot');
    const glbLeftArm = charScene.getObjectByName('Left_Arm_Pivot');
    const glbRightLeg = charScene.getObjectByName('Right_Leg_Pivot');
    const glbLeftLeg = charScene.getObjectByName('Left_Leg_Pivot');
    const glbTorsoMesh = charScene.getObjectByName('Torso_Smooth_Mesh');

    // Hide geometric fallback boxes
    if (placeholderGroup) {
      placeholderGroup.visible = false;
    }

    // Rebind animated pivots
    if (glbHead) playerHead = glbHead;
    if (glbLeftArm) playerLeftArm = glbLeftArm;
    if (glbRightArm) {
      playerRightArm = glbRightArm;
      if (playerWeaponSocket) {
        playerWeaponSocket.position.set(-0.02, -0.48, 0.08);
        playerWeaponSocket.rotation.set(0.35, -0.06, 0.02);
        playerRightArm.add(playerWeaponSocket);
      }
    }
    if (glbLeftLeg) playerLeftLeg = glbLeftLeg;
    if (glbRightLeg) playerRightLeg = glbRightLeg;
    if (glbTorsoMesh) {
      playerTorso = glbTorsoMesh;
      rodrickTorsoBaseY = glbTorsoMesh.position.y || 0.893;
    }

    rodrickGLBScene = charScene;
    root.add(charScene);
    isRodrickGLBLoaded = true;
    console.log(`[PLAYER] rodrick.glb loaded successfully from ${src} as official player model!`);

    setTimeout(() => {
      if (renderer) captureRodrickPortrait(renderer);
    }, 150);
  }

  loader.load(
    primaryUrl,
    (gltf) => applyGLB(gltf, primaryUrl),
    undefined,
    (err) => {
      console.warn(`[PLAYER] Failed loading ${primaryUrl}, retrying fallback ${fallbackUrl}:`, err);
      loader.load(
        fallbackUrl,
        (gltf) => applyGLB(gltf, fallbackUrl),
        undefined,
        (fErr) => console.error('[PLAYER] Could not load rodrick.glb from any location:', fErr)
      );
    }
  );
}

export function drawInitialPortraitPlaceholder() {
  const canvas = document.getElementById('hud-portrait-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  ctx.fillStyle = '#0a1015';
  ctx.fillRect(0, 0, w, h);

  // Retro stylized survivor bust silhouette (PS1 scanline grid)
  ctx.fillStyle = '#16232b';
  ctx.beginPath();
  ctx.ellipse(w / 2, h * 0.95, w * 0.42, h * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#223842';
  ctx.beginPath();
  ctx.ellipse(w / 2, h * 0.48, w * 0.22, h * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#111d24';
  ctx.beginPath();
  ctx.ellipse(w / 2, h * 0.32, w * 0.24, h * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#78e08f';
  ctx.fillRect(w / 2 - 2, h * 0.82, 4, 2);
}

export function captureRodrickPortrait(rndr = renderer) {
  const targetCanvas = document.getElementById('hud-portrait-canvas');
  if (!targetCanvas || !rndr || !rodrickGLBScene) return;

  const w = 96;
  const h = 96;

  try {
    const renderTarget = new THREE.WebGLRenderTarget(w, h, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat
    });

    const portraitScene = new THREE.Scene();
    portraitScene.background = new THREE.Color(0x0a1015);

    // Dynamic PS1 Survivor Portrait Lighting
    const amb = new THREE.AmbientLight(0xffffff, 1.45);
    portraitScene.add(amb);
    const key = new THREE.DirectionalLight(0xffeedd, 2.0);
    key.position.set(1.2, 2.2, 2.2);
    portraitScene.add(key);
    const rim = new THREE.DirectionalLight(0x78e08f, 1.3);
    rim.position.set(-1.6, 1.2, 1.6);
    portraitScene.add(rim);

    // Clone rodrick scene for portrait snapshot
    const rigClone = rodrickGLBScene.clone(true);
    // In rodrick.glb, Head_Pivot is at Y = 1.503, center of face is at Y = 1.62
    rigClone.scale.set(1.0, 1.0, 1.0);
    rigClone.rotation.set(0, 0, 0); // Face points +Z straight at portrait camera
    rigClone.position.set(0, 0, 0);
    portraitScene.add(rigClone);

    const cam = new THREE.PerspectiveCamera(28, 1.0, 0.1, 10);
    cam.position.set(0, 1.62, 0.68);
    cam.lookAt(0, 1.58, 0);

    const oldTarget = rndr.getRenderTarget();
    rndr.setRenderTarget(renderTarget);
    rndr.render(portraitScene, cam);

    const pixels = new Uint8Array(w * h * 4);
    rndr.readRenderTargetPixels(renderTarget, 0, 0, w, h, pixels);
    rndr.setRenderTarget(oldTarget);
    renderTarget.dispose();

    const ctx = targetCanvas.getContext('2d');
    const imgData = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const srcIdx = ((h - 1 - y) * w + x) * 4;
        const dstIdx = (y * w + x) * 4;
        imgData.data[dstIdx] = pixels[srcIdx];
        imgData.data[dstIdx + 1] = pixels[srcIdx + 1];
        imgData.data[dstIdx + 2] = pixels[srcIdx + 2];
        imgData.data[dstIdx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    hasCapturedPortrait = true;
    console.log('[PORTRAIT] Rodrick face portrait captured successfully to HUD canvas!');
  } catch (err) {
    console.warn('[PORTRAIT] Could not capture Rodrick portrait:', err);
  }
}

export function buildSurvivorPlayerModel() {
  const root = new THREE.Group();
  root.name = 'Survivor_Player_Model';

  placeholderGroup = new THREE.Group();
  placeholderGroup.name = 'Survivor_Placeholder_Mesh';

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
  playerWeaponSocket.position.set(-0.02, -0.48, 0.08);
  playerWeaponSocket.rotation.set(0.35, -0.06, 0.02);

  // Mini Shotgun
  playerMiniShotgun = new THREE.Group();
  const gunBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.65, 8), steelMat);
  gunBarrel.rotation.x = Math.PI / 2;
  gunBarrel.position.set(0, 0, 0.25);
  playerMiniShotgun.add(gunBarrel);
  const gunStock = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.07, 0.22), new THREE.MeshLambertMaterial({ color: 0x3d2215 }));
  gunStock.position.set(0, -0.02, -0.16);
  playerMiniShotgun.add(gunStock);
  playerMiniShotgun.visible = false; // Strictly hidden by default until a firearm is equipped
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

  placeholderGroup.add(playerTorso);

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

  placeholderGroup.add(playerLeftLeg);

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

  placeholderGroup.add(playerRightLeg);
  placeholderGroup.rotation.y = Math.PI;
  root.add(placeholderGroup);

  // Load official Rodrick GLB asset
  loadRodrickGLBModel(root);

  drawInitialPortraitPlaceholder();

  root.visible = false; // Default: hidden for pure FPS view
  playerMeshRoot = root;
  return root;
}

export function updatePlayerModelAnimation(isMoving, isSprinting, dt, activeWeapon, isSwimming = false) {
  // Capture 3D face portrait once WebGL is active and model is loaded
  if (isRodrickGLBLoaded && !hasCapturedPortrait && renderer) {
    captureRodrickPortrait(renderer);
  }

  if (!playerMeshRoot || !playerMeshRoot.visible) return;

  // Swimming Posture (body tilts forward into swimming water displacement)
  if (isSwimming) {
    playerMeshRoot.rotation.x = THREE.MathUtils.lerp(playerMeshRoot.rotation.x, isMoving ? 0.72 : 0.32, dt * 6.0);
    const swimFreq = isSprinting ? 11.0 : 7.0;
    walkTime += dt * swimFreq;
    const kick = Math.sin(walkTime) * (isMoving ? 0.52 : 0.22);
    if (playerLeftLeg) playerLeftLeg.rotation.set(kick, 0, 0.08);
    if (playerRightLeg) playerRightLeg.rotation.set(-kick, 0, -0.08);

    if (activeWeapon === 'unarmed') {
      if (playerLeftArm) playerLeftArm.rotation.set(-kick * 0.9, 0.25, -0.35);
      if (playerRightArm) playerRightArm.rotation.set(kick * 0.9, -0.25, 0.35);
    } else {
      if (playerRightArm) playerRightArm.rotation.set(-0.35 + kick * 0.1, 0.08, -0.06);
      if (playerLeftArm) playerLeftArm.rotation.set(-0.55 - kick * 0.1, 0.32, -0.20);
    }
    return;
  } else {
    playerMeshRoot.rotation.x = THREE.MathUtils.lerp(playerMeshRoot.rotation.x, 0, dt * 10.0);
  }

  // Weapon visibility sync (Unarmed means player holds NOTHING in hand)
  if (playerMiniShotgun && playerMiniGolok) {
    if (activeWeapon === 'unarmed') {
      playerMiniGolok.visible = false;
      playerMiniShotgun.visible = false;
    } else if (activeWeapon === 'golok') {
      playerMiniGolok.visible = true;
      playerMiniShotgun.visible = false;
    } else {
      playerMiniGolok.visible = false;
      playerMiniShotgun.visible = true;
    }
  }

  // Locomotion Stride Kinematics
  const baseY = isRodrickGLBLoaded ? rodrickTorsoBaseY : 0.95;

  if (isMoving) {
    const freq = isSprinting ? 12.5 : 8.5;
    const amp = isSprinting ? 0.75 : 0.55;
    walkTime += dt * freq;

    const stride = Math.sin(walkTime);
    if (playerLeftLeg) playerLeftLeg.rotation.x = stride * amp;
    if (playerRightLeg) playerRightLeg.rotation.x = -stride * amp;

    // Counter arm swinging & weapon posture
    if (activeWeapon !== 'unarmed') {
      if (activeWeapon === 'golok') {
        // One-handed melee ready posture
        if (playerRightArm) {
          playerRightArm.rotation.x = -0.42 + stride * 0.08;
          playerRightArm.rotation.y = 0.08;
          playerRightArm.rotation.z = 0.05;
        }
        if (playerLeftArm) {
          playerLeftArm.rotation.x = -0.22 - stride * 0.06;
          playerLeftArm.rotation.y = 0.12;
          playerLeftArm.rotation.z = -0.08;
        }
      } else {
        // Authentic Two-Handed Survival Horror Shotgun Ready Stance (Leon S. Kennedy / James Sunderland)
        // Right hand holds trigger/grip forward at hip level pointing downrange
        if (playerRightArm) {
          playerRightArm.rotation.x = -0.38 + stride * 0.05;
          playerRightArm.rotation.y = 0.08;
          playerRightArm.rotation.z = -0.06;
        }
        // Left hand reaches forward across the chest to support the forend
        if (playerLeftArm) {
          playerLeftArm.rotation.x = -0.62 - stride * 0.05;
          playerLeftArm.rotation.y = 0.36;
          playerLeftArm.rotation.z = -0.22;
        }
      }
    } else {
      if (playerLeftArm) playerLeftArm.rotation.set(-stride * 0.45, 0, 0);
      if (playerRightArm) playerRightArm.rotation.set(stride * 0.45, 0, 0);
    }

    // Hip bobbing & subtle sway
    if (playerTorso) {
      playerTorso.position.y = baseY + Math.abs(stride) * 0.035;
      playerTorso.rotation.y = Math.sin(walkTime) * 0.05;
    }
  } else {
    // Idle breathing
    walkTime += dt * 2.0;
    const breath = Math.sin(walkTime);
    if (playerLeftLeg) playerLeftLeg.rotation.x = THREE.MathUtils.lerp(playerLeftLeg.rotation.x, 0, 0.15);
    if (playerRightLeg) playerRightLeg.rotation.x = THREE.MathUtils.lerp(playerRightLeg.rotation.x, 0, 0.15);

    if (activeWeapon !== 'unarmed') {
      if (activeWeapon === 'golok') {
        if (playerRightArm) {
          playerRightArm.rotation.x = THREE.MathUtils.lerp(playerRightArm.rotation.x, -0.42, 0.15);
          playerRightArm.rotation.y = THREE.MathUtils.lerp(playerRightArm.rotation.y, 0.08, 0.15);
          playerRightArm.rotation.z = THREE.MathUtils.lerp(playerRightArm.rotation.z, 0.05, 0.15);
        }
        if (playerLeftArm) {
          playerLeftArm.rotation.x = THREE.MathUtils.lerp(playerLeftArm.rotation.x, -0.22, 0.15);
          playerLeftArm.rotation.y = THREE.MathUtils.lerp(playerLeftArm.rotation.y, 0.12, 0.15);
          playerLeftArm.rotation.z = THREE.MathUtils.lerp(playerLeftArm.rotation.z, -0.08, 0.15);
        }
      } else {
        if (playerRightArm) {
          playerRightArm.rotation.x = THREE.MathUtils.lerp(playerRightArm.rotation.x, -0.38, 0.15);
          playerRightArm.rotation.y = THREE.MathUtils.lerp(playerRightArm.rotation.y, 0.08, 0.15);
          playerRightArm.rotation.z = THREE.MathUtils.lerp(playerRightArm.rotation.z, -0.06, 0.15);
        }
        if (playerLeftArm) {
          playerLeftArm.rotation.x = THREE.MathUtils.lerp(playerLeftArm.rotation.x, -0.62, 0.15);
          playerLeftArm.rotation.y = THREE.MathUtils.lerp(playerLeftArm.rotation.y, 0.36, 0.15);
          playerLeftArm.rotation.z = THREE.MathUtils.lerp(playerLeftArm.rotation.z, -0.22, 0.15);
        }
      }
    } else {
      if (playerLeftArm) {
        playerLeftArm.rotation.x = THREE.MathUtils.lerp(playerLeftArm.rotation.x, 0.05, 0.15);
        playerLeftArm.rotation.y = THREE.MathUtils.lerp(playerLeftArm.rotation.y, 0, 0.15);
        playerLeftArm.rotation.z = THREE.MathUtils.lerp(playerLeftArm.rotation.z, 0, 0.15);
      }
      if (playerRightArm) {
        playerRightArm.rotation.x = THREE.MathUtils.lerp(playerRightArm.rotation.x, -0.05, 0.15);
        playerRightArm.rotation.y = THREE.MathUtils.lerp(playerRightArm.rotation.y, 0, 0.15);
        playerRightArm.rotation.z = THREE.MathUtils.lerp(playerRightArm.rotation.z, 0, 0.15);
      }
    }

    if (playerTorso) {
      playerTorso.position.y = baseY + breath * 0.008;
      playerTorso.rotation.y = THREE.MathUtils.lerp(playerTorso.rotation.y, 0, 0.1);
    }
  }
}

export let screenShakeIntensity = 0;
export let screenShakeDuration = 0;

export function triggerScreenShake(intensity = 0.45, duration = 1.2) {
  screenShakeIntensity = Math.max(screenShakeIntensity, intensity);
  screenShakeDuration = Math.max(screenShakeDuration, duration);
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

    // Resident Evil 4 / Silent Hill 2 Balanced Over-the-Shoulder Camera position
    const camDist = 3.35;
    const camHeight = 2.15;
    const camSideOffset = 0.42;

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
    const lookAheadDist = 6.5;
    const lookTargetX = playerPos.x - sinY * lookAheadDist;
    const lookTargetY = playerPos.y + 1.75 + Math.sin(pitch) * 2.4;
    const lookTargetZ = playerPos.z - cosY * lookAheadDist;

    camera.lookAt(lookTargetX, lookTargetY, lookTargetZ);
  } else {
    // FPS Mode: Eye level positioned at Rodrick's head height (~2.12m) to look straight at Kristin
    playerMeshRoot.visible = false;
    const eyeHeight = isRodrickGLBLoaded ? 2.12 : 1.8;
    camera.position.set(playerPos.x, playerPos.y + eyeHeight, playerPos.z);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;
  }

  // Cinematic Screenshake offset for explosions, shockwaves and heavy impacts
  if (screenShakeDuration > 0) {
    screenShakeDuration -= dt;
    const shakePower = screenShakeIntensity * Math.min(1.0, screenShakeDuration * 1.5);
    camera.position.x += (Math.random() - 0.5) * shakePower * 0.45;
    camera.position.y += (Math.random() - 0.5) * shakePower * 0.35;
    camera.rotation.z += (Math.random() - 0.5) * shakePower * 0.06;
    if (screenShakeDuration <= 0) {
      screenShakeIntensity = 0;
      camera.rotation.z = 0;
    }
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

  if (mode === 'walk') {
    playerMeshRoot.visible = true;
    const stride = Math.sin(progress);
    if (playerLeftLeg) playerLeftLeg.rotation.x = stride * 0.55;
    if (playerRightLeg) playerRightLeg.rotation.x = -stride * 0.55;
    if (playerLeftArm) playerLeftArm.rotation.set(-stride * 0.45, 0, 0.05);
    if (playerRightArm) playerRightArm.rotation.set(stride * 0.45, 0, -0.05);
    if (playerHead) playerHead.rotation.set(0, 0, 0);
    if (playerTorso) {
      const baseY = isRodrickGLBLoaded ? rodrickTorsoBaseY : 0.95;
      playerTorso.position.y = baseY + Math.abs(stride) * 0.035;
      playerTorso.rotation.y = Math.sin(progress) * 0.04;
    }
    if (playerWeaponSocket) playerWeaponSocket.visible = false;
  } else if (mode === 'intro') {
    // Standing beside Kristin alert & observing Coldbrook gate
    playerMeshRoot.visible = true;
    const gyP = (typeof getTerrainHeight === 'function') ? getTerrainHeight(-0.40, 14.2) : gy;
    playerMeshRoot.position.set(-0.40, gyP, 14.2);
    playerMeshRoot.rotation.set(0, Math.PI - 0.05, 0); // Face forward toward Coldbrook gate (same orientation as Kristin)
    if (playerHead) playerHead.rotation.set(0, 0, 0);
    if (playerLeftArm) playerLeftArm.rotation.set(0.08, 0, 0.05);
    if (playerRightArm) playerRightArm.rotation.set(-0.10, 0, -0.05);
    if (playerLeftLeg) playerLeftLeg.rotation.set(0, 0, 0);
    if (playerRightLeg) playerRightLeg.rotation.set(0, 0, 0);
    if (playerWeaponSocket) playerWeaponSocket.visible = false; // Unarmed during intro
  } else if (mode === 'unconscious') {
    playerMeshRoot.visible = true;
    // Laying down flat on back in the snow
    // Pivot is at feet, head rests naturally near Z = 14.3
    playerMeshRoot.position.set(0, gy + 0.22, 12.8);
    playerMeshRoot.rotation.set(-Math.PI / 2, Math.PI, 0.12);

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
    playerMeshRoot.rotation.y = THREE.MathUtils.lerp(Math.PI, 0, ease);
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

