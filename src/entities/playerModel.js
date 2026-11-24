/* =========================================================================
   SILENT HILL 2 FIRST-PERSON SHOOTER (FPS) CAMERA CONTROLLER & PLAYER MODEL
   - Default: Pure FPS (First-Person Shooter) with HUD reticle & hands viewmodel
   - Realistic camera orientation tracking pitch & yaw at player eye-level (1.8m)
   - Optional toggle between FPS (default) and TPS with [C]
   ========================================================================= */

const THREE = window.THREE;
import { getTerrainHeight, checkCameraCollision } from '../world/environment.js';
import { renderer } from '../graphics/engine.js';
import { weaponHolder, meleeSwing, weaponSpin } from './weapons.js';
import { isStoryDialogueOpen } from '../core/dialogueSystem.js';

export let cameraMode = 'fps'; // Default: Pure FPS (First-Person Shooter)
export let activeCharacter = 'rodrick'; // 'rodrick' | 'nona_batavia' | 'sister_valentina' | 'kristin'
export let playerMeshRoot = null;
export let isRodrickGLBLoaded = false;
export let isNonaBataviaLoaded = false;
export let isValentinaLoaded = false;
export let isKristinPlayerLoaded = false;
export let hasCapturedPortrait = false;
export const RODRICK_SCALE = 1.34; // Matches standard heroic stature (~2.34m)
export const NONA_BATAVIA_SCALE = 1.30;
export const VALENTINA_SCALE = 1.28;
export const KRISTIN_PLAYER_SCALE = 1.34;

// 360° Hero Inspection Orbit Camera (Right Click Hold / Toggle)
export let isHeroInspectActive = false;
export let inspectOrbitYaw = Math.PI;
export let inspectOrbitPitch = 0.08;
export let inspectBaseYaw = 0;
export let inspectOrbitDist = 2.4;
export let targetInspectDist = 2.4;

export function setHeroInspect(active, currentYaw = 0) {
  if (active && !isHeroInspectActive) {
    isHeroInspectActive = true;
    inspectBaseYaw = currentYaw;
    // Starts directly in FRONT of the hero facing their face, body, and weapon
    inspectOrbitYaw = Math.PI;
    inspectOrbitPitch = 0.08;
    inspectOrbitDist = 2.4;
    targetInspectDist = 2.4;
    const ret = document.getElementById('reticle');
    if (ret) ret.style.display = 'none';
    const pill = document.getElementById('hud-inspect-pill');
    if (pill) pill.style.display = 'block';
  } else if (!active && isHeroInspectActive) {
    isHeroInspectActive = false;
    const ret = document.getElementById('reticle');
    if (ret) ret.style.display = 'block';
    const pill = document.getElementById('hud-inspect-pill');
    if (pill) pill.style.display = 'none';
    if (cameraMode === 'fps') {
      if (playerMeshRoot) playerMeshRoot.visible = false;
      if (weaponHolder) weaponHolder.visible = true;
    }
  }
}

export function updateHeroInspectDelta(dx, dy, sens = 0.0034) {
  if (!isHeroInspectActive) return;
  // Moving mouse right orbits the camera around to the right side / front of the character
  inspectOrbitYaw += dx * sens;
  inspectOrbitPitch = Math.max(-0.65, Math.min(0.85, inspectOrbitPitch - dy * sens));
}

export function zoomHeroInspect(delta) {
  if (!isHeroInspectActive) return;
  // delta < 0 is Zoom In (scroll up), delta > 0 is Zoom Out (scroll down)
  const zoomStep = 0.32;
  if (delta < 0) {
    targetInspectDist = Math.max(0.68, targetInspectDist - zoomStep);
  } else {
    targetInspectDist = Math.min(6.2, targetInspectDist + zoomStep);
  }
}
let placeholderGroup = null;
let rodrickGLBScene = null;
let nonaBataviaPlayerScene = null;
let nonaBataviaWeaponSocket = null;
let sisterValentinaPlayerScene = null;
let sisterValentinaWeaponSocket = null;
let kristinPlayerScene = null;
let kristinPlayerWeaponSocket = null;
let playerContactShadow = null;
let rodrickTorsoBaseY = 0.893;
let rodrickLeftLegBaseY = 0.90;
let rodrickRightLegBaseY = 0.90;

// Dynamic kinematic deformation controllers for seamless leg/arm walking across all character meshes
const kristinDeformers = [];
const nonaDeformers = [];
const valentinaDeformers = [];

function makeRotator(rx, ry, rz, px, py, pz) {
  const cx = Math.cos(rx), sx = Math.sin(rx);
  const cy = Math.cos(ry), sy = Math.sin(ry);
  const cz = Math.cos(rz), sz = Math.sin(rz);
  return (x, y, z) => {
    const dx = x - px, dy = y - py, dz = z - pz;
    // 1. X-axis pitch (forward/backward leg & arm swing)
    const y1 = cx * dy - sx * dz;
    const z1 = sx * dy + cx * dz;
    // 2. Y-axis yaw (torso twist)
    const x2 = cy * dx + sy * z1;
    const z2 = -sy * dx + cy * z1;
    // 3. Z-axis roll (inward/outward arm & hip tilt)
    const x3 = cz * x2 - sz * y1;
    const y3 = sz * x2 + cz * y1;
    return [x3 + px, y3 + py, z2 + pz];
  };
}

function initMeshDeformer(mesh) {
  if (!mesh || !mesh.geometry || !mesh.geometry.attributes.position) return null;
  const geom = mesh.geometry;
  const posAttr = geom.attributes.position;
  const count = posAttr.count;
  const orig = new Float32Array(count * 3);
  for (let i = 0; i < count * 3; i++) orig[i] = posAttr.array[i];

  // Weights: [wTorso, wLArm, wRArm, wLLeg, wRLeg]
  const weights = new Float32Array(count * 5);
  for (let i = 0; i < count; i++) {
    const x = orig[i * 3];
    const y = orig[i * 3 + 1];

    let wTorso = 0, wLArm = 0, wRArm = 0, wLLeg = 0, wRLeg = 0;
    // Arms
    if (x < -0.22 && y > 0.78) {
      wLArm = Math.min(1.0, Math.max(0.0, (-x - 0.22) / 0.08));
    }
    if (x > 0.22 && y > 0.78) {
      wRArm = Math.min(1.0, Math.max(0.0, (x - 0.22) / 0.08));
    }
    // Torso / Chest
    if (y > 0.82 && Math.abs(x) <= 0.24) {
      wTorso = Math.min(1.0, Math.max(0.0, (y - 0.82) / 0.15));
    }
    // Legs (split below hip at 0.84)
    if (y <= 0.84) {
      const legFactor = Math.min(1.0, Math.max(0.0, (0.84 - y) / 0.08));
      if (x <= 0.01) {
        wLLeg = legFactor * (x < -0.02 ? 1.0 : Math.max(0.0, -x / 0.02));
      }
      if (x >= -0.01) {
        wRLeg = legFactor * (x > 0.02 ? 1.0 : Math.max(0.0, x / 0.02));
      }
    }

    weights[i * 5 + 0] = wTorso;
    weights[i * 5 + 1] = wLArm;
    weights[i * 5 + 2] = wRArm;
    weights[i * 5 + 3] = wLLeg;
    weights[i * 5 + 4] = wRLeg;
  }

  return { mesh, orig, weights, count };
}

function applyDeformation(deformer, ll_rx, rl_rx, la_rx, ra_rx, t_rx, t_ry, t_rz, armInwardZ = 0.08) {
  if (!deformer) return;
  const { mesh, orig, weights, count } = deformer;
  const posArr = mesh.geometry.attributes.position.array;

  const rotLArm = makeRotator(la_rx, 0, armInwardZ, -0.26, 1.26, 0);
  const rotRArm = makeRotator(ra_rx, 0, -armInwardZ, 0.26, 1.26, 0);
  const rotTorso = makeRotator(t_rx, t_ry, t_rz, 0, 0.85, 0);
  const rotLLeg = makeRotator(ll_rx, 0, 0, -0.11, 0.82, 0);
  const rotRLeg = makeRotator(rl_rx, 0, 0, 0.11, 0.82, 0);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const i5 = i * 5;
    const x0 = orig[i3], y0 = orig[i3 + 1], z0 = orig[i3 + 2];
    const wTorso = weights[i5 + 0];
    const wLArm = weights[i5 + 1];
    const wRArm = weights[i5 + 2];
    const wLLeg = weights[i5 + 3];
    const wRLeg = weights[i5 + 4];

    let fx = x0, fy = y0, fz = z0;
    if (wLArm > 0.01) {
      const [rx, ry, rz] = rotLArm(x0, y0, z0);
      fx += (rx - x0) * wLArm;
      fy += (ry - y0) * wLArm;
      fz += (rz - z0) * wLArm;
    }
    if (wRArm > 0.01) {
      const [rx, ry, rz] = rotRArm(x0, y0, z0);
      fx += (rx - x0) * wRArm;
      fy += (ry - y0) * wRArm;
      fz += (rz - z0) * wRArm;
    }
    if (wTorso > 0.01) {
      const [rx, ry, rz] = rotTorso(x0, y0, z0);
      fx += (rx - x0) * wTorso;
      fy += (ry - y0) * wTorso;
      fz += (rz - z0) * wTorso;
    }
    if (wLLeg > 0.01) {
      const [rx, ry, rz] = rotLLeg(x0, y0, z0);
      fx += (rx - x0) * wLLeg;
      fy += (ry - y0) * wLLeg;
      fz += (rz - z0) * wLLeg;
    }
    if (wRLeg > 0.01) {
      const [rx, ry, rz] = rotRLeg(x0, y0, z0);
      fx += (rx - x0) * wRLeg;
      fy += (ry - y0) * wRLeg;
      fz += (rz - z0) * wRLeg;
    }

    posArr[i3] = fx;
    posArr[i3 + 1] = fy;
    posArr[i3 + 2] = fz;
  }

  mesh.geometry.attributes.position.needsUpdate = true;
}

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
// Smooth Locomotion & Jump Kinematics State
let locoWeight = 0;
let sprintWeight = 0;
let airWeight = 0;
let landingCompression = 0;
let wasGroundedLastFrame = true;
let walkPhase = 0;
let idlePhase = 0;

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
    if (glbLeftLeg) {
      playerLeftLeg = glbLeftLeg;
      rodrickLeftLegBaseY = glbLeftLeg.position.y || 0.90;
    }
    if (glbRightLeg) {
      playerRightLeg = glbRightLeg;
      rodrickRightLegBaseY = glbRightLeg.position.y || 0.90;
    }
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

function loadNonaBataviaPlayerModel(root) {
  if (typeof THREE === 'undefined' || !THREE.GLTFLoader) return;

  const loader = new THREE.GLTFLoader();
  const url = '/models/nona_batavia.glb';

  loader.load(
    url,
    (gltf) => {
      const charScene = gltf.scene;
      charScene.name = 'Nona_Batavia_Player_Mesh';
      charScene.scale.set(NONA_BATAVIA_SCALE, NONA_BATAVIA_SCALE, NONA_BATAVIA_SCALE);
      charScene.rotation.y = Math.PI;

      charScene.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            child.material.roughness = 0.82;
            child.material.metalness = 0.08;
            child.material.needsUpdate = true;
          }
          const def = initMeshDeformer(child);
          if (def) nonaDeformers.push(def);
        }
      });

      // Weapon socket at right side / hand level
      nonaBataviaWeaponSocket = new THREE.Group();
      nonaBataviaWeaponSocket.name = 'NonaBatavia_WeaponSocket';
      nonaBataviaWeaponSocket.position.set(-0.24, 0.88, 0.12);
      nonaBataviaWeaponSocket.rotation.set(0.25, -0.05, 0.0);
      charScene.add(nonaBataviaWeaponSocket);

      nonaBataviaPlayerScene = charScene;
      nonaBataviaPlayerScene.visible = (activeCharacter === 'nona_batavia');
      root.add(charScene);
      isNonaBataviaLoaded = true;
      console.log('[PLAYER] nona_batavia.glb loaded successfully as playable character!');

      if (activeCharacter === 'nona_batavia' && renderer) {
        setTimeout(() => captureNonaBataviaPortrait(renderer), 150);
      }
    },
    undefined,
    (err) => console.warn('[PLAYER] Failed loading nona_batavia.glb for player:', err)
  );
}

function loadSisterValentinaPlayerModel(root) {
  if (typeof THREE === 'undefined' || !THREE.GLTFLoader) return;

  const loader = new THREE.GLTFLoader();
  const url = '/models/sister_valentina.glb';

  loader.load(
    url,
    (gltf) => {
      const charScene = gltf.scene;
      charScene.name = 'Sister_Valentina_Player_Mesh';
      charScene.scale.set(VALENTINA_SCALE, VALENTINA_SCALE, VALENTINA_SCALE);
      charScene.rotation.y = Math.PI;

      charScene.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            child.material.roughness = 0.82;
            child.material.metalness = 0.04;
            child.material.needsUpdate = true;
          }
          const def = initMeshDeformer(child);
          if (def) valentinaDeformers.push(def);
        }
      });

      // Weapon socket at right side / demonic claw
      sisterValentinaWeaponSocket = new THREE.Group();
      sisterValentinaWeaponSocket.name = 'SisterValentina_WeaponSocket';
      sisterValentinaWeaponSocket.position.set(-0.28, 0.95, 0.16);
      sisterValentinaWeaponSocket.rotation.set(0.3, -0.05, 0.0);
      charScene.add(sisterValentinaWeaponSocket);

      sisterValentinaPlayerScene = charScene;
      sisterValentinaPlayerScene.visible = (activeCharacter === 'sister_valentina');
      root.add(charScene);
      isValentinaLoaded = true;
      console.log('[PLAYER] sister_valentina.glb loaded successfully as playable character!');

      if (activeCharacter === 'sister_valentina' && renderer) {
        setTimeout(() => captureSisterValentinaPortrait(renderer), 150);
      }
    },
    undefined,
    (err) => console.warn('[PLAYER] Failed loading sister_valentina.glb for player:', err)
  );
}

function loadKristinPlayerModel(root) {
  if (typeof THREE === 'undefined' || !THREE.GLTFLoader) return;

  const loader = new THREE.GLTFLoader();
  const url = '/models/ps2_character_asset.glb';

  loader.load(
    url,
    (gltf) => {
      const charScene = gltf.scene;
      charScene.name = 'Kristin_Player_Mesh';
      charScene.scale.set(KRISTIN_PLAYER_SCALE, KRISTIN_PLAYER_SCALE, KRISTIN_PLAYER_SCALE);
      charScene.rotation.y = Math.PI;

      charScene.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            child.material.roughness = 0.82;
            child.material.metalness = 0.08;
            child.material.needsUpdate = true;
          }
          const def = initMeshDeformer(child);
          if (def) kristinDeformers.push(def);
        }
      });

      // Weapon socket at right hand
      kristinPlayerWeaponSocket = new THREE.Group();
      kristinPlayerWeaponSocket.name = 'Kristin_WeaponSocket';
      kristinPlayerWeaponSocket.position.set(-0.20, 0.88, 0.12);
      kristinPlayerWeaponSocket.rotation.set(0.25, -0.05, 0.0);
      charScene.add(kristinPlayerWeaponSocket);

      kristinPlayerScene = charScene;
      kristinPlayerScene.visible = (activeCharacter === 'kristin');
      root.add(charScene);
      isKristinPlayerLoaded = true;
      console.log('[PLAYER] ps2_character_asset.glb loaded successfully as playable character Kristin!');

      if (activeCharacter === 'kristin' && renderer) {
        setTimeout(() => captureKristinPortrait(), 150);
      }
    },
    undefined,
    (err) => console.warn('[PLAYER] Failed loading ps2_character_asset.glb for player Kristin:', err)
  );
}

export function captureSisterValentinaPortrait(rndr = renderer) {
  const targetCanvas = document.getElementById('hud-portrait-canvas');
  if (!targetCanvas || !rndr || !sisterValentinaPlayerScene) return;

  const w = 96;
  const h = 96;

  try {
    const renderTarget = new THREE.WebGLRenderTarget(w, h, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat
    });

    const portraitScene = new THREE.Scene();
    portraitScene.background = new THREE.Color(0x1a0508);

    const amb = new THREE.AmbientLight(0xffeedd, 1.4);
    portraitScene.add(amb);
    const key = new THREE.DirectionalLight(0xffcccc, 2.0);
    key.position.set(1.2, 2.2, 2.2);
    portraitScene.add(key);
    const rim = new THREE.DirectionalLight(0xff2244, 2.0);
    rim.position.set(-1.6, 1.2, 1.6);
    portraitScene.add(rim);

    const rigClone = sisterValentinaPlayerScene.clone(true);
    rigClone.scale.set(1.0, 1.0, 1.0);
    rigClone.rotation.set(0, 0, 0); // Face points +Z straight at camera
    rigClone.position.set(0, 0, 0);
    portraitScene.add(rigClone);

    const cam = new THREE.PerspectiveCamera(28, 1.0, 0.1, 10);
    cam.position.set(0, 1.58, 0.70);
    cam.lookAt(0, 1.54, 0);

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
    console.log('[PORTRAIT] Sister Valentina portrait captured successfully to HUD canvas!');
  } catch (err) {
    console.warn('[PORTRAIT] Could not capture Sister Valentina portrait:', err);
  }
}

export function captureKristinPortrait() {
  const targetCanvas = document.getElementById('hud-portrait-canvas');
  if (!targetCanvas) return;
  const img = new Image();
  img.onload = () => {
    const ctx = targetCanvas.getContext('2d');
    ctx.drawImage(img, 0, 0, targetCanvas.width, targetCanvas.height);
  };
  img.src = '/textures/kristin_face_hd.png';
}

export function captureNonaBataviaPortrait(rndr = renderer) {
  const targetCanvas = document.getElementById('hud-portrait-canvas');
  if (!targetCanvas || !rndr || !nonaBataviaPlayerScene) return;

  const w = 96;
  const h = 96;

  try {
    const renderTarget = new THREE.WebGLRenderTarget(w, h, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat
    });

    const portraitScene = new THREE.Scene();
    portraitScene.background = new THREE.Color(0x120c18);

    const amb = new THREE.AmbientLight(0xffeedd, 1.5);
    portraitScene.add(amb);
    const key = new THREE.DirectionalLight(0xffdfba, 2.2);
    key.position.set(1.2, 2.2, 2.2);
    portraitScene.add(key);
    const rim = new THREE.DirectionalLight(0xff5577, 1.6);
    rim.position.set(-1.6, 1.2, 1.6);
    portraitScene.add(rim);

    const rigClone = nonaBataviaPlayerScene.clone(true);
    rigClone.scale.set(1.0, 1.0, 1.0);
    rigClone.rotation.set(0, 0, 0); // Face points +Z straight at portrait camera
    rigClone.position.set(0, 0, 0);
    portraitScene.add(rigClone);

    const cam = new THREE.PerspectiveCamera(28, 1.0, 0.1, 10);
    cam.position.set(0, 1.50, 0.65);
    cam.lookAt(0, 1.48, 0);

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
    console.log('[PORTRAIT] Nona Batavia portrait captured successfully to HUD canvas!');
  } catch (err) {
    console.warn('[PORTRAIT] Could not capture Nona Batavia portrait:', err);
  }
}

export function setPlayerCharacter(charId, rndr = renderer) {
  const validChars = ['rodrick', 'nona_batavia', 'sister_valentina', 'kristin'];
  if (!validChars.includes(charId)) return activeCharacter;
  activeCharacter = charId;
  window.__ACTIVE_CHARACTER = charId;

  if (rodrickGLBScene) {
    rodrickGLBScene.visible = (activeCharacter === 'rodrick');
  }
  if (nonaBataviaPlayerScene) {
    nonaBataviaPlayerScene.visible = (activeCharacter === 'nona_batavia');
  }
  if (sisterValentinaPlayerScene) {
    sisterValentinaPlayerScene.visible = (activeCharacter === 'sister_valentina');
  }
  if (kristinPlayerScene) {
    kristinPlayerScene.visible = (activeCharacter === 'kristin');
  }

  // Reparent weapon socket
  if (playerWeaponSocket) {
    if (activeCharacter === 'rodrick' && playerRightArm) {
      playerRightArm.add(playerWeaponSocket);
      playerWeaponSocket.position.set(-0.02, -0.48, 0.08);
      playerWeaponSocket.rotation.set(0.35, -0.06, 0.02);
    } else if (activeCharacter === 'nona_batavia' && nonaBataviaWeaponSocket) {
      nonaBataviaWeaponSocket.add(playerWeaponSocket);
      playerWeaponSocket.position.set(0, 0, 0);
      playerWeaponSocket.rotation.set(0, 0, 0);
    } else if (activeCharacter === 'sister_valentina' && sisterValentinaWeaponSocket) {
      sisterValentinaWeaponSocket.add(playerWeaponSocket);
      playerWeaponSocket.position.set(0, 0, 0);
      playerWeaponSocket.rotation.set(0, 0, 0);
    } else if (activeCharacter === 'kristin' && kristinPlayerWeaponSocket) {
      kristinPlayerWeaponSocket.add(playerWeaponSocket);
      playerWeaponSocket.position.set(0, 0, 0);
      playerWeaponSocket.rotation.set(0, 0, 0);
    }
  }

  // Update HUD Tactical Tag
  const tagEl = document.getElementById('hud-character-tag');
  if (tagEl) {
    if (activeCharacter === 'nona_batavia') {
      tagEl.innerText = 'NONA BATAVIA';
      tagEl.style.color = '#ffd15c';
      tagEl.style.textShadow = '0 0 10px rgba(255, 209, 92, 0.85)';
    } else if (activeCharacter === 'sister_valentina') {
      tagEl.innerText = 'SISTER VALENTINA';
      tagEl.style.color = '#ff4a68';
      tagEl.style.textShadow = '0 0 10px rgba(255, 74, 104, 0.85)';
    } else if (activeCharacter === 'kristin') {
      tagEl.innerText = 'KRISTIN';
      tagEl.style.color = '#5cf0a5';
      tagEl.style.textShadow = '0 0 10px rgba(92, 240, 165, 0.85)';
    } else {
      tagEl.innerText = 'RODRICK';
      tagEl.style.color = '#9e6d76';
      tagEl.style.textShadow = 'none';
    }
  }

  // Capture portrait
  if (rndr) {
    if (activeCharacter === 'nona_batavia') {
      captureNonaBataviaPortrait(rndr);
    } else if (activeCharacter === 'sister_valentina') {
      captureSisterValentinaPortrait(rndr);
    } else if (activeCharacter === 'kristin') {
      captureKristinPortrait();
    } else {
      captureRodrickPortrait(rndr);
    }
  }

  return activeCharacter;
}

export function togglePlayerCharacter(rndr = renderer) {
  const list = ['rodrick', 'nona_batavia', 'sister_valentina', 'kristin'];
  const idx = list.indexOf(activeCharacter);
  const nextIdx = (idx + 1) % list.length;
  return setPlayerCharacter(list[nextIdx], rndr);
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

  // Grounded PS2-style soft contact shadow directly under character's feet
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 64;
  shadowCanvas.height = 64;
  const sCtx = shadowCanvas.getContext('2d');
  const grad = sCtx.createRadialGradient(32, 32, 4, 32, 32, 30);
  grad.addColorStop(0, 'rgba(6, 12, 22, 0.58)');
  grad.addColorStop(0.55, 'rgba(6, 12, 22, 0.24)');
  grad.addColorStop(1, 'rgba(6, 12, 22, 0.0)');
  sCtx.fillStyle = grad;
  sCtx.fillRect(0, 0, 64, 64);
  const shadowTex = new THREE.CanvasTexture(shadowCanvas);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2
  });
  playerContactShadow = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 1.15), shadowMat);
  playerContactShadow.rotation.x = -Math.PI * 0.5;
  playerContactShadow.position.set(0, 0.03, 0);
  playerContactShadow.renderOrder = 1;
  root.add(playerContactShadow);

  // Load official Rodrick GLB asset
  loadRodrickGLBModel(root);
  // Load official Nona Batavia GLB asset for character switching
  loadNonaBataviaPlayerModel(root);
  // Load official Sister Valentina GLB asset for character switching
  loadSisterValentinaPlayerModel(root);
  // Load official Kristin GLB asset for character switching
  loadKristinPlayerModel(root);

  drawInitialPortraitPlaceholder();

  root.visible = false; // Default: hidden for pure FPS view
  playerMeshRoot = root;
  return root;
}

export function updatePlayerModelAnimation(isMoving, isSprinting, dt, activeWeapon, grounded = true, vertVel = 0, aimPitch = 0) {
  // Capture 3D face portrait once WebGL is active and model is loaded
  if (isRodrickGLBLoaded && !hasCapturedPortrait && renderer) {
    if (activeCharacter === 'nona_batavia') {
      captureNonaBataviaPortrait(renderer);
    } else if (activeCharacter === 'sister_valentina') {
      captureSisterValentinaPortrait(renderer);
    } else if (activeCharacter === 'kristin') {
      captureKristinPortrait();
    } else {
      captureRodrickPortrait(renderer);
    }
  }

  if (!playerMeshRoot || !playerMeshRoot.visible) return;

  // Keep player mesh standing upright without unwanted tilt
  playerMeshRoot.rotation.x = THREE.MathUtils.lerp(playerMeshRoot.rotation.x, 0, dt * 10.0);

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

  // --- Smooth Kinematic Blend Weights & Landing Compression ---
  const safeDt = Math.min(dt, 0.05);
  locoWeight = THREE.MathUtils.lerp(locoWeight, isMoving ? 1.0 : 0.0, Math.min(1.0, safeDt * 10.0));
  sprintWeight = THREE.MathUtils.lerp(sprintWeight, (isMoving && isSprinting) ? 1.0 : 0.0, Math.min(1.0, safeDt * 8.0));
  airWeight = THREE.MathUtils.lerp(airWeight, grounded ? 0.0 : 1.0, Math.min(1.0, safeDt * 12.0));

  // Detect physical landing impact spring
  if (grounded && !wasGroundedLastFrame) {
    landingCompression = Math.min(0.12, Math.max(0.04, Math.abs(vertVel) * 0.016));
  }
  wasGroundedLastFrame = grounded;
  landingCompression = THREE.MathUtils.lerp(landingCompression, 0.0, Math.min(1.0, safeDt * 9.0));

  // Continuous phases for stride and breathing
  const walkFreq = THREE.MathUtils.lerp(8.0, 12.8, sprintWeight);
  walkPhase += safeDt * walkFreq * Math.max(0.12, locoWeight);
  idlePhase += safeDt * 2.2;

  const rawStride = Math.sin(walkPhase);
  const clampedPitch = Math.max(-0.85, Math.min(0.85, aimPitch));
  const isTalking = (typeof isStoryDialogueOpen === 'function') && isStoryDialogueOpen();
  const talkClock = performance.now() * 0.001;

  // Decay TPS weapon recoil smoothly
  tpsWeaponRecoil = THREE.MathUtils.lerp(tpsWeaponRecoil, 0.0, Math.min(1.0, safeDt * 14.0));

  // Compute TPS melee slash & shotgun spin progress (0..1)
  let slashProgress = -1;
  if (meleeSwing && meleeSwing.active) {
    slashProgress = Math.min(1.0, (performance.now() - meleeSwing.startTime) / Math.max(1, meleeSwing.duration));
  }
  let spinProgress = -1;
  if (weaponSpin && weaponSpin.active) {
    spinProgress = Math.min(1.0, (performance.now() - weaponSpin.startTime) / Math.max(1, weaponSpin.duration));
  }

  // Stride amplitude smoothly scales down when airborne or talking
  const talkWeight = isTalking ? 0.0 : 1.0;
  let maxStride = THREE.MathUtils.lerp(0.55, 0.85, sprintWeight) * locoWeight * (1.0 - airWeight) * talkWeight;
  let currentStride = rawStride * maxStride;

  // Real-time kinematic limb angles for deformed models (Nona, Valentina, Kristin)
  let defLLeg = currentStride;
  let defRLeg = -currentStride;
  if (airWeight > 0.1) {
    defLLeg += (vertVel > 0.4 ? -0.44 : 0.24) * airWeight;
    defRLeg += (vertVel > 0.4 ? -0.22 : 0.14) * airWeight;
  } else if (landingCompression > 0.005) {
    defLLeg -= landingCompression * 1.8;
    defRLeg += landingCompression * 1.4;
  }

  // Note on deformer mesh local space (rotation.y = Math.PI):
  // x < -0.22 is character's RIGHT arm (la_rx), x > 0.22 is character's LEFT arm (ra_rx)
  let defLArm = 0; // Right arm (trigger / golok hand)
  let defRArm = 0; // Left arm (support forend hand)
  let defArmInwardZ = 0.05;

  if (isTalking) {
    // Respectful lowered weapon + natural conversational hand gestures
    defLArm = -0.22 + Math.sin(talkClock * 4.2) * 0.18;
    defRArm = -0.32 + Math.cos(talkClock * 3.5) * 0.22;
    defArmInwardZ = 0.06;
  } else if (slashProgress >= 0) {
    // Full-body Golok slash arc (windup -> cleave -> follow-through)
    const swingAngle = slashProgress < 0.35
      ? THREE.MathUtils.lerp(-0.55, -1.45, slashProgress / 0.35)
      : THREE.MathUtils.lerp(-1.45, 0.65, (slashProgress - 0.35) / 0.65);
    defLArm = swingAngle;
    defRArm = -0.30 + Math.sin(slashProgress * Math.PI) * 0.25;
    defArmInwardZ = -0.05;
  } else if (activeWeapon !== 'unarmed') {
    if (activeWeapon === 'golok') {
      defLArm = -0.52 - clampedPitch * 0.50 + Math.sin(walkPhase) * 0.14 * locoWeight;
      defRArm = -0.18 - clampedPitch * 0.20 - Math.sin(walkPhase) * 0.12 * locoWeight;
      defArmInwardZ = 0.04;
    } else {
      // Authentic Two-Handed Shotgun Ready Stance (arms raised forward & slightly inward to grip stock + forend)
      defLArm = -0.62 - clampedPitch * 0.65 + Math.sin(walkPhase) * 0.12 * locoWeight - tpsWeaponRecoil * 0.65;
      defRArm = -0.82 - clampedPitch * 0.65 - Math.sin(walkPhase) * 0.10 * locoWeight - tpsWeaponRecoil * 0.55;
      defArmInwardZ = -0.18;
    }
  } else {
    // Natural unarmed walking arm swings + airborne balance flare
    defLArm = -rawStride * 0.72 * locoWeight * (1.0 - airWeight) + (airWeight * (vertVel > 0 ? -0.35 : 0.25));
    defRArm = rawStride * 0.72 * locoWeight * (1.0 - airWeight) + (airWeight * (vertVel > 0 ? -0.28 : 0.22));
    defArmInwardZ = 0.06 + airWeight * 0.22;
  }

  let defTorsoX = THREE.MathUtils.lerp(0.02, 0.08, sprintWeight) * locoWeight - clampedPitch * 0.20;
  let defTorsoY = Math.sin(walkPhase) * 0.07 * locoWeight;
  let defTorsoZ = -Math.sin(walkPhase) * 0.04 * locoWeight;
  if (isTalking) {
    defTorsoX = 0.06 + Math.sin(talkClock * 2.5) * 0.025;
    defTorsoY = Math.sin(talkClock * 2.0) * 0.07;
  } else if (slashProgress >= 0) {
    defTorsoY += Math.sin(slashProgress * Math.PI) * 0.32;
    defTorsoX += Math.sin(slashProgress * Math.PI) * 0.12;
  }

  // Helper to orient TPS weapon socket naturally in hand for deformer characters
  const updateCharacterWeaponSocket = (socket, baseHandX, baseHandY, baseHandZ) => {
    if (!socket) return;
    socket.visible = (activeWeapon !== 'unarmed');
    if (!socket.visible) return;
    if (isTalking) {
      socket.position.set(baseHandX - 0.04, baseHandY - 0.14, baseHandZ - 0.06);
      socket.rotation.set(0.32, 0.05, 0.08);
    } else if (activeWeapon === 'golok') {
      const slashRotX = slashProgress >= 0
        ? (slashProgress < 0.35 ? THREE.MathUtils.lerp(-0.22, -1.1, slashProgress / 0.35) : THREE.MathUtils.lerp(-1.1, 0.85, (slashProgress - 0.35) / 0.65))
        : (-0.22 - clampedPitch * 0.50 + Math.sin(walkPhase) * 0.10 * locoWeight);
      socket.position.set(baseHandX - 0.04, baseHandY - 0.04 + Math.sin(walkPhase * 2.0) * 0.015 * locoWeight, baseHandZ + 0.06);
      socket.rotation.set(slashRotX, -0.04, 0.06);
    } else {
      // Shotgun held across chest at waist/rib height pointing forward (+Z)
      const spinRot = (spinProgress >= 0) ? -spinProgress * Math.PI * 2 : 0;
      const targetRotX = -0.06 - clampedPitch * 0.65 + Math.sin(walkPhase) * 0.08 * locoWeight - tpsWeaponRecoil * 0.45 + spinRot;
      socket.position.set(
        baseHandX + 0.06,
        baseHandY + 0.14 + Math.sin(walkPhase * 2.0) * 0.016 * locoWeight - landingCompression * 0.25,
        baseHandZ + 0.16 - tpsWeaponRecoil * 0.14
      );
      socket.rotation.x = THREE.MathUtils.lerp(socket.rotation.x, targetRotX, safeDt * 18.0);
      socket.rotation.y = THREE.MathUtils.lerp(socket.rotation.y, 0.18, safeDt * 14.0);
      socket.rotation.z = THREE.MathUtils.lerp(socket.rotation.z, 0.0, safeDt * 14.0);
    }
  };

  // Handle Nona Batavia distinct motion dynamics + walking legs & arms
  if (activeCharacter === 'nona_batavia') {
    if (nonaBataviaPlayerScene) {
      const bob = (Math.sin(walkPhase * 2.0) * 0.038 * locoWeight) + (Math.sin(idlePhase) * 0.014 * (1.0 - locoWeight));
      nonaBataviaPlayerScene.position.y = bob - landingCompression + (airWeight * 0.10);
      nonaBataviaPlayerScene.rotation.z = Math.sin(walkPhase) * 0.035 * locoWeight;
      nonaBataviaPlayerScene.rotation.x = THREE.MathUtils.lerp(0.02, 0.075, sprintWeight) * locoWeight - clampedPitch * 0.15;

      updateCharacterWeaponSocket(nonaBataviaWeaponSocket, -0.22, 0.96, 0.14);

      for (let i = 0; i < nonaDeformers.length; i++) {
        applyDeformation(nonaDeformers[i], defLLeg, defRLeg, defLArm, defRArm, defTorsoX, defTorsoY, defTorsoZ, defArmInwardZ);
      }
    }
    return;
  }

  // Handle Sister Valentina distinct demonic glide motion + walking legs & claws
  if (activeCharacter === 'sister_valentina') {
    if (sisterValentinaPlayerScene) {
      const bob = (Math.sin(walkPhase * 2.0) * 0.045 * locoWeight) + (Math.sin(idlePhase) * 0.018 * (1.0 - locoWeight));
      sisterValentinaPlayerScene.position.y = bob - landingCompression + (airWeight * 0.14);
      sisterValentinaPlayerScene.rotation.z = Math.sin(walkPhase) * 0.04 * locoWeight;
      sisterValentinaPlayerScene.rotation.x = THREE.MathUtils.lerp(0.035, 0.095, sprintWeight) * locoWeight - clampedPitch * 0.15;

      updateCharacterWeaponSocket(sisterValentinaWeaponSocket, -0.24, 1.00, 0.16);

      for (let i = 0; i < valentinaDeformers.length; i++) {
        applyDeformation(valentinaDeformers[i], defLLeg, defRLeg, defLArm, defRArm, defTorsoX, defTorsoY, defTorsoZ, defArmInwardZ);
      }
    }
    return;
  }

  // Handle Kristin distinct athletic stride motion + walking legs & arms
  if (activeCharacter === 'kristin') {
    if (kristinPlayerScene) {
      const bob = (Math.abs(rawStride) * 0.038 * locoWeight) + (Math.sin(idlePhase) * 0.012 * (1.0 - locoWeight));
      kristinPlayerScene.position.y = bob - landingCompression;
      kristinPlayerScene.rotation.z = Math.sin(walkPhase) * 0.032 * locoWeight;
      kristinPlayerScene.rotation.x = THREE.MathUtils.lerp(0.03, 0.085, sprintWeight) * locoWeight - clampedPitch * 0.18;

      updateCharacterWeaponSocket(kristinPlayerWeaponSocket, -0.20, 0.96, 0.14);

      for (let i = 0; i < kristinDeformers.length; i++) {
        applyDeformation(kristinDeformers[i], defLLeg, defRLeg, defLArm, defRArm, defTorsoX, defTorsoY, defTorsoZ, defArmInwardZ);
      }
    }
    return;
  }

  // --- Rodrick Primary Locomotion & Bone Kinematics ---
  const baseY = isRodrickGLBLoaded ? rodrickTorsoBaseY : 0.95;

  // Stride amplitude smoothly scales down when airborne
  maxStride = THREE.MathUtils.lerp(0.50, 0.78, sprintWeight) * locoWeight * (1.0 - airWeight);
  currentStride = rawStride * maxStride;

  // Legs Kinematics: Walk stride + knee lift + realistic jump tuck/extension & landing squash
  if (playerLeftLeg && playerRightLeg) {
    if (airWeight > 0.1) {
      // Ascent: knees tuck higher for jump momentum; Descent: legs reach toward snow
      const airPoseLeft = (vertVel > 0.4 ? -0.46 : 0.24) * airWeight;
      const airPoseRight = (vertVel > 0.4 ? -0.22 : 0.14) * airWeight;
      playerLeftLeg.rotation.x = THREE.MathUtils.lerp(playerLeftLeg.rotation.x, currentStride + airPoseLeft, safeDt * 13.0);
      playerRightLeg.rotation.x = THREE.MathUtils.lerp(playerRightLeg.rotation.x, -currentStride + airPoseRight, safeDt * 13.0);
    } else {
      const landKneeL = landingCompression * 2.1;
      const landKneeR = -landingCompression * 1.5;
      playerLeftLeg.rotation.x = THREE.MathUtils.lerp(playerLeftLeg.rotation.x, currentStride + landKneeL, safeDt * 18.0);
      playerRightLeg.rotation.x = THREE.MathUtils.lerp(playerRightLeg.rotation.x, -currentStride + landKneeR, safeDt * 18.0);

      // Organic knee clearance lift while walking through snow
      const liftL = Math.max(0, -rawStride) * 0.065 * locoWeight * talkWeight;
      const liftR = Math.max(0, rawStride) * 0.065 * locoWeight * talkWeight;
      playerLeftLeg.position.y = THREE.MathUtils.lerp(playerLeftLeg.position.y, (rodrickLeftLegBaseY || 0.90) + liftL - landingCompression * 0.35, safeDt * 16.0);
      playerRightLeg.position.y = THREE.MathUtils.lerp(playerRightLeg.position.y, (rodrickRightLegBaseY || 0.90) + liftR - landingCompression * 0.35, safeDt * 16.0);

      // Natural outward hip roll during stride
      playerLeftLeg.rotation.z = Math.sin(walkPhase) * 0.035 * locoWeight * talkWeight;
      playerRightLeg.rotation.z = -Math.sin(walkPhase) * 0.035 * locoWeight * talkWeight;
    }
  }

  // Arms Kinematics: Weapon Grip, Combat Slash/Recoil, Airborne Balance, & Talking Gestures
  const pitchArms = clampedPitch * 0.70;
  const blendSpeed = safeDt * (slashProgress >= 0 ? 24.0 : 14.0);

  let targetRRotX = 0;
  let targetRRotY = 0;
  let targetRRotZ = 0;
  let targetLRotX = 0;
  let targetLRotY = 0;
  let targetLRotZ = 0;

  if (isTalking) {
    // Respectful relaxed weapon carry + expressive conversational hand gestures
    targetRRotX = 0.14 + Math.sin(talkClock * 3.2) * 0.08;
    targetRRotY = -0.08;
    targetRRotZ = 0.10;

    targetLRotX = -0.45 + Math.cos(talkClock * 4.1) * 0.24;
    targetLRotY = 0.22 + Math.sin(talkClock * 2.6) * 0.10;
    targetLRotZ = -0.14;
  } else if (slashProgress >= 0) {
    // Full-body TPS Golok Slash Arc (windup -> diagonal cleave -> follow-through)
    if (slashProgress < 0.32) {
      const p = slashProgress / 0.32;
      targetRRotX = THREE.MathUtils.lerp(-0.42, -1.48, p);
      targetRRotY = THREE.MathUtils.lerp(0.10, -0.55, p);
      targetRRotZ = THREE.MathUtils.lerp(0.06, 0.45, p);
    } else {
      const p = (slashProgress - 0.32) / 0.68;
      targetRRotX = THREE.MathUtils.lerp(-1.48, 0.65, p);
      targetRRotY = THREE.MathUtils.lerp(-0.55, 0.58, p);
      targetRRotZ = THREE.MathUtils.lerp(0.45, -0.35, p);
    }
    targetLRotX = -0.35 + Math.sin(slashProgress * Math.PI) * 0.28;
    targetLRotY = 0.18;
    targetLRotZ = -0.22;
  } else if (activeWeapon !== 'unarmed') {
    if (activeWeapon === 'golok') {
      // One-handed melee ready stance: blade held forward with natural arm pumping
      targetRRotX = -0.42 - pitchArms * 0.6 + Math.sin(walkPhase) * 0.16 * locoWeight;
      targetRRotY = 0.10 + Math.cos(walkPhase) * 0.05 * locoWeight;
      targetRRotZ = 0.06;

      targetLRotX = -0.22 - pitchArms * 0.25 - Math.sin(walkPhase) * 0.14 * locoWeight;
      targetLRotY = 0.14;
      targetLRotZ = -0.08;
    } else {
      // Two-Handed Survival Horror Shotgun Ready Stance + recoil kickback + landing dip
      const recoilKick = tpsWeaponRecoil * 0.85;
      const spinLift = (spinProgress >= 0) ? Math.sin(spinProgress * Math.PI) * 0.35 : 0;
      targetRRotX = -0.42 - pitchArms + Math.sin(walkPhase) * 0.16 * locoWeight - recoilKick - spinLift + landingCompression * 1.2;
      targetRRotY = 0.08 + Math.cos(walkPhase) * 0.04 * locoWeight;
      targetRRotZ = -0.06;

      targetLRotX = -0.66 - pitchArms - Math.sin(walkPhase) * 0.14 * locoWeight - recoilKick * 0.7 + landingCompression * 1.0;
      targetLRotY = 0.38 + Math.cos(walkPhase) * 0.04 * locoWeight;
      targetLRotZ = -0.22;
    }
  } else {
    // Unarmed natural walking arm swings (full 45° human swing) + airborne balance flare
    const unarmedSwing = rawStride * 0.72 * locoWeight * (1.0 - airWeight);
    const idleLRotX = 0.05 + Math.sin(idlePhase) * 0.02;
    const idleRRotX = -0.05 - Math.sin(idlePhase) * 0.02;

    targetLRotX = -unarmedSwing + (idleLRotX * (1.0 - locoWeight));
    targetRRotX = unarmedSwing + (idleRRotX * (1.0 - locoWeight));

    if (airWeight > 0.1) {
      targetLRotX += (vertVel > 0.4 ? -0.38 : 0.22) * airWeight;
      targetRRotX += (vertVel > 0.4 ? -0.28 : 0.18) * airWeight;
      targetLRotZ = -0.26 * airWeight;
      targetRRotZ = 0.26 * airWeight;
    }
  }

  if (playerRightArm) {
    playerRightArm.rotation.x = THREE.MathUtils.lerp(playerRightArm.rotation.x, targetRRotX, blendSpeed);
    playerRightArm.rotation.y = THREE.MathUtils.lerp(playerRightArm.rotation.y, targetRRotY, blendSpeed);
    playerRightArm.rotation.z = THREE.MathUtils.lerp(playerRightArm.rotation.z, targetRRotZ, blendSpeed);
  }

  if (playerLeftArm) {
    playerLeftArm.rotation.x = THREE.MathUtils.lerp(playerLeftArm.rotation.x, targetLRotX, blendSpeed);
    playerLeftArm.rotation.y = THREE.MathUtils.lerp(playerLeftArm.rotation.y, targetLRotY, blendSpeed);
    playerLeftArm.rotation.z = THREE.MathUtils.lerp(playerLeftArm.rotation.z, targetLRotZ, blendSpeed);
  }

  // Weapon socket bounce, recoil kick, & lever-action spin in TPS
  if (playerWeaponSocket) {
    const walkBobY = isMoving ? Math.sin(walkPhase * 2.0) * 0.02 * locoWeight : 0;
    const walkSwayZ = isMoving ? Math.cos(walkPhase) * 0.02 * locoWeight : 0;
    playerWeaponSocket.position.y = -0.48 + walkBobY - landingCompression * 0.25;
    playerWeaponSocket.position.z = 0.08 + walkSwayZ - tpsWeaponRecoil * 0.18;
    if (spinProgress >= 0) {
      playerWeaponSocket.rotation.x = 0.35 - spinProgress * Math.PI * 2;
    } else {
      playerWeaponSocket.rotation.x = THREE.MathUtils.lerp(playerWeaponSocket.rotation.x, 0.35 - tpsWeaponRecoil * 0.45, safeDt * 16.0);
    }
  }

  // Head subtle nod & tilt when interacting in dialogue
  if (playerHead) {
    const headPitch = isTalking ? Math.sin(talkClock * 3.6) * 0.07 : 0;
    const headTilt = isTalking ? Math.sin(talkClock * 1.9) * 0.04 : 0;
    playerHead.rotation.x = THREE.MathUtils.lerp(playerHead.rotation.x, headPitch, safeDt * 8.0);
    playerHead.rotation.z = THREE.MathUtils.lerp(playerHead.rotation.z, headTilt, safeDt * 8.0);
  }

  // Torso & Pelvis Kinematics: Pelvic bobbing, lateral hip weight transfer, slash twist & pitch tilt
  if (playerTorso) {
    const pelvicBob = Math.abs(rawStride) * 0.034 * locoWeight * talkWeight;
    const breathingBob = Math.sin(idlePhase) * 0.010 * (1.0 - locoWeight);
    const targetTorsoY = baseY + pelvicBob + breathingBob - landingCompression * 1.25;

    playerTorso.position.y = THREE.MathUtils.lerp(playerTorso.position.y, targetTorsoY, safeDt * 16.0);

    // Lateral hip weight shift from foot to foot
    const targetRollZ = Math.sin(walkPhase) * 0.032 * locoWeight * talkWeight;
    playerTorso.rotation.z = THREE.MathUtils.lerp(playerTorso.rotation.z, targetRollZ, safeDt * 14.0);

    // Torso yaw counter-rotation during stride + slash torso twist
    let targetYawY = Math.cos(walkPhase) * 0.042 * locoWeight * talkWeight;
    if (slashProgress >= 0) targetYawY += Math.sin(slashProgress * Math.PI) * 0.35;
    if (isTalking) targetYawY = Math.sin(talkClock * 1.8) * 0.06;
    playerTorso.rotation.y = THREE.MathUtils.lerp(playerTorso.rotation.y, targetYawY, safeDt * 14.0);

    // Torso pitch tilt: leans forward into sprint/talk, tilts spine with crosshair aim
    const sprintLean = THREE.MathUtils.lerp(0.02, 0.075, sprintWeight) * locoWeight * talkWeight;
    const spinePitchTilt = -clampedPitch * 0.28;
    const talkLean = isTalking ? 0.05 : 0;
    const targetPitchX = sprintLean + spinePitchTilt + talkLean;
    playerTorso.rotation.x = THREE.MathUtils.lerp(playerTorso.rotation.x, targetPitchX, safeDt * 14.0);
  }
}

export let screenShakeIntensity = 0;
export let screenShakeDuration = 0;
export let hitStopTimer = 0;
let fovKick = 0;

let tpsWeaponRecoil = 0;

export function triggerTPSWeaponRecoil(amount = 0.28) {
  tpsWeaponRecoil = Math.min(0.45, Math.max(tpsWeaponRecoil, amount));
}

export function triggerScreenShake(intensity = 0.45, duration = 1.2) {
  screenShakeIntensity = Math.max(screenShakeIntensity, intensity);
  screenShakeDuration = Math.max(screenShakeDuration, duration);
}

export function triggerHitStop(duration = 0.038, kick = -2.2) {
  hitStopTimer = Math.max(hitStopTimer, duration);
  fovKick = kick;
}

export function consumeHitStop(dt) {
  if (hitStopTimer <= 0) return false;
  hitStopTimer = Math.max(0, hitStopTimer - dt);
  return true;
}

/**
 * Updates the Third-Person Horror Camera tracking behind the player,
 * including Dynamic FOV for sprint/inspect/combat impact.
 */
export function updateHorrorCamera(camera, playerPos, yaw, pitch, dt, isMoving = false, isSprinting = false) {
  if (!playerMeshRoot) return;

  // Dynamic FOV & Sprint/Inspect Lens Feel
  if (camera && camera.isPerspectiveCamera) {
    const aspect = camera.aspect || 1.77;
    const baseFov = (aspect >= 2.0) ? 68 : (aspect >= 1.7) ? 65 : (aspect <= 1.35) ? 60 : 62;
    let targetFov = baseFov;
    if (isHeroInspectActive) {
      targetFov = baseFov - 6.0;
    } else if (isMoving && isSprinting) {
      targetFov = baseFov + 4.5;
    }
    fovKick = THREE.MathUtils.lerp(fovKick, 0, Math.min(1.0, (dt || 0.016) * 14.0));
    targetFov += fovKick;

    if (Math.abs(camera.fov - targetFov) > 0.03) {
      camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, Math.min(1.0, (dt || 0.016) * 10.0));
      camera.updateProjectionMatrix();
    }
  }

  // Keep player's contact shadow grounded on terrain beneath feet
  if (playerContactShadow && typeof getTerrainHeight === 'function') {
    const groundY = getTerrainHeight(playerPos.x, playerPos.z);
    const heightAboveGround = Math.max(0, playerPos.y - groundY);
    playerContactShadow.position.y = (groundY - playerPos.y) + 0.03;
    const shadowScale = Math.max(0.55, 1.0 - heightAboveGround * 0.18);
    playerContactShadow.scale.set(shadowScale, shadowScale, 1);
    if (playerContactShadow.material) {
      playerContactShadow.material.opacity = Math.max(0.25, 1.0 - heightAboveGround * 0.35);
    }
  }

  // 1. Right Click 360° Hero Orbit Inspection Mode
  if (isHeroInspectActive) {
    playerMeshRoot.visible = true;
    if (weaponHolder) weaponHolder.visible = false;
    playerMeshRoot.position.set(playerPos.x, playerPos.y, playerPos.z);
    playerMeshRoot.rotation.y = inspectBaseYaw;

    // Smoothly interpolate current camera orbit distance
    inspectOrbitDist = THREE.MathUtils.lerp(inspectOrbitDist, targetInspectDist, Math.min(1.0, dt * 12.0));
    const camDist = inspectOrbitDist;

    const totalYaw = inspectBaseYaw + inspectOrbitYaw;
    const cosP = Math.cos(inspectOrbitPitch);
    const sinP = Math.sin(inspectOrbitPitch);

    const camX = playerPos.x + Math.sin(totalYaw) * cosP * camDist;
    let camY = playerPos.y + 1.35 + sinP * camDist;
    const camZ = playerPos.z + Math.cos(totalYaw) * cosP * camDist;

    // Prevent camera from clipping through terrain or snowbanks
    if (typeof getTerrainHeight === 'function') {
      const terrainGroundY = getTerrainHeight(camX, camZ);
      camY = Math.max(camY, terrainGroundY + 0.30);
    }

    camera.position.set(camX, camY, camZ);

    // Dynamic focus height: when zoomed in close (< 1.6m), target head/face level (~1.58m)
    // When zoomed out, look at chest/body center (~1.25m)
    const zoomRatio = Math.max(0, Math.min(1, (camDist - 0.68) / 2.2));
    const lookTargetY = THREE.MathUtils.lerp(playerPos.y + 1.58, playerPos.y + 1.25, zoomRatio);

    camera.lookAt(playerPos.x, lookTargetY, playerPos.z);
    return;
  }

  if (cameraMode === 'tps') {
    playerMeshRoot.visible = true;
    if (weaponHolder) weaponHolder.visible = false;
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

    const anchorX = playerPos.x + cosY * (camSideOffset * 0.35);
    const anchorY = playerPos.y + 1.65;
    const anchorZ = playerPos.z - sinY * (camSideOffset * 0.35);

    let targetCamX = playerPos.x + backX;
    let targetCamY = playerPos.y + camHeight;
    let targetCamZ = playerPos.z + backZ;

    // TPS Camera Wall Collision: step from shoulder anchor to targetCam and pull forward if blocked
    if (typeof checkCameraCollision === 'function') {
      const steps = 10;
      for (let s = 1; s <= steps; s++) {
        const frac = s / steps;
        const testX = anchorX + (targetCamX - anchorX) * frac;
        const testZ = anchorZ + (targetCamZ - anchorZ) * frac;
        if (checkCameraCollision(testX, testZ)) {
          const safeFrac = Math.max(0.18, (s - 1) / steps);
          targetCamX = anchorX + (targetCamX - anchorX) * safeFrac;
          targetCamY = anchorY + (targetCamY - anchorY) * safeFrac;
          targetCamZ = anchorZ + (targetCamZ - anchorZ) * safeFrac;
          break;
        }
      }
    }

    // Prevent TPS camera from dipping beneath undulating snow terrain
    if (typeof getTerrainHeight === 'function') {
      const camGroundY = getTerrainHeight(targetCamX, targetCamZ);
      targetCamY = Math.max(targetCamY, camGroundY + 0.38);
    }

    const camLerp = Math.min(1.0, Math.max(0.01, (dt || 0.016) * 18.0));
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetCamX, camLerp);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetCamY, camLerp);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetCamZ, camLerp);

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

