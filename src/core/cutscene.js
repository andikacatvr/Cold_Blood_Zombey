/* =========================================================================
   CINEMATIC INTRO CUTSCENE & STORY PRESENTATION
   - University student research expedition unearths ancient dark magic
   - Dark occult shockwave erupts, leaving player unconscious in the snow
   - Companion Kristin stands guard vigilant with shotgun against the undead horde
   - Player stirs, regains consciousness, and rises to feet into FPS perspective
   ========================================================================= */

import {
  getTerrainHeight
} from '../world/environment.js';
import { andikaModel } from '../entities/kristin.js';
import {
  nataliaModel,
  showNataliaSubtitle
} from '../entities/natalia.js';
import { createTacticalHelicopter } from '../entities/helicopter.js';
import { weaponHolder } from '../entities/weapons.js';
import { playerMeshRoot, cameraMode, setPlayerCutscenePose } from '../entities/playerModel.js';
import { scene, playerFlashlight } from '../graphics/engine.js';
import { playerPos, state } from './player.js';
import { updateTouchControlsVisibility } from '../ui/touchControls.js';

const THREE = window.THREE;

export let isCinematicActive = false;
export let activeCutsceneType = null; // 'intro' | 'nona_batavia' | 'natalia_helicopter'
let cutsceneTime = 0;
let cameraRef = null;
let onCompleteCallback = null;
let currentStageIndex = -1;
let sfxRef = null;
let cutsceneDroppedShotgun = null;
let activeBossRef = null;
let activeHelicopter = null;

const NONA_BATAVIA_STAGES = [
  {
    start: 0.0,
    end: 4.5,
    getCamStart: (bx, by, bz, px, py, pz) => {
      const dx = bx - px, dz = bz - pz;
      const d = Math.sqrt(dx * dx + dz * dz) || 1;
      const nx = dx / d, nz = dz / d;
      const perpX = -nz, perpZ = nx;
      return new THREE.Vector3(bx - nx * 12.0 + perpX * 3.5, by - 0.4, bz - nz * 12.0 + perpZ * 3.5);
    },
    getCamEnd: (bx, by, bz, px, py, pz) => {
      const dx = bx - px, dz = bz - pz;
      const d = Math.sqrt(dx * dx + dz * dz) || 1;
      const nx = dx / d, nz = dz / d;
      return new THREE.Vector3(bx - nx * 6.5, by + 0.2, bz - nz * 6.5);
    },
    getLookStart: (bx, by, bz) => new THREE.Vector3(bx, by + 0.6, bz),
    getLookEnd: (bx, by, bz) => new THREE.Vector3(bx, by + 1.2, bz),
    subtitle: `<span style="color:#ffffff;">Lolongan roh gentayangan Batavia membelah kesunyian badai salju...</span>`,
    onEnter: (sfx) => {}
  },
  {
    start: 4.5,
    end: 8.8,
    getCamStart: (bx, by, bz, px, py, pz) => {
      const dx = bx - px, dz = bz - pz;
      const d = Math.sqrt(dx * dx + dz * dz) || 1;
      const nx = dx / d, nz = dz / d;
      const perpX = -nz, perpZ = nx;
      return new THREE.Vector3(bx - nx * 4.2 + perpX * 2.8, by + 0.8, bz - nz * 4.2 + perpZ * 2.8);
    },
    getCamEnd: (bx, by, bz, px, py, pz) => {
      const dx = bx - px, dz = bz - pz;
      const d = Math.sqrt(dx * dx + dz * dz) || 1;
      const nx = dx / d, nz = dz / d;
      const perpX = -nz, perpZ = nx;
      return new THREE.Vector3(bx - nx * 3.2 - perpX * 2.8, by + 1.2, bz - nz * 3.2 - perpZ * 2.8);
    },
    getLookStart: (bx, by, bz) => new THREE.Vector3(bx, by + 1.2, bz),
    getLookEnd: (bx, by, bz) => new THREE.Vector3(bx, by + 0.9, bz),
    subtitle: `<span style="color:#ff6b6b; font-size:21px; font-weight:bold; text-shadow:0 0 12px #900;">"Suara kutukan Batavia bergema... Roh penasaran mencari mangsa segar!"</span>`,
    onEnter: (sfx) => {}
  },
  {
    start: 8.8,
    end: 13.4,
    getCamStart: (bx, by, bz, px, py, pz) => {
      const dx = bx - px, dz = bz - pz;
      const d = Math.sqrt(dx * dx + dz * dz) || 1;
      const nx = dx / d, nz = dz / d;
      const perpX = -nz, perpZ = nx;
      return new THREE.Vector3(px - nx * 2.8 + perpX * 1.4, py + 1.2, pz - nz * 2.8 + perpZ * 1.4);
    },
    getCamEnd: (bx, by, bz, px, py, pz) => new THREE.Vector3(px, py, pz),
    getLookStart: (bx, by, bz) => new THREE.Vector3(bx, by + 0.6, bz),
    getLookEnd: (bx, by, bz) => new THREE.Vector3(bx, by + 0.2, bz),
    subtitle: `<span style="color:#5cf0a5; font-size:21px; font-weight:bold;">KRISTIN:</span> "Woi awas bro! Dia melayang di atas bawa pasukan! Fokus tembak jatuh roh itu!"`,
    onEnter: (sfx) => {
      if (sfx && sfx.playPumpRack) sfx.playPumpRack();
    }
  }
];

const CUTSCENE_STAGES = [
  {
    start: 0.0,
    end: 4.5,
    camStart: new THREE.Vector3(4.8, 3.2, 24.5),
    camEnd: new THREE.Vector3(1.8, 1.8, 17.5),
    lookStart: new THREE.Vector3(0.2, 1.0, 15.5),
    lookEnd: new THREE.Vector3(0.4, 0.55, 14.0),
    subtitle: `<span style="color:#ffffff;">Malam membeku di Hutan Long Way Hill... Gelombang sihir gelap kuno bangkit menyelimuti tanah!</span>`,
    onEnter: (sfx) => {
      if (sfx && sfx.playChurchBellToll) sfx.playChurchBellToll();
      if (sfx && sfx.playSnowStep) sfx.playSnowStep();
    }
  },
  {
    start: 4.5,
    end: 9.8,
    camStart: new THREE.Vector3(-1.15, 1.15, 15.5),
    camEnd: new THREE.Vector3(-0.65, 0.85, 14.8),
    lookStart: new THREE.Vector3(0.55, 0.45, 13.9),
    lookEnd: new THREE.Vector3(0.70, 0.50, 13.9),
    subtitle: `<span style="color:#5cf0a5; font-size:22px; font-weight:bold;">KRISTIN:</span> <i>*jongkok panik mengguncang bahumu*</i> <span style="color:#ffffff; font-size:21px; font-weight:bold;">"Woii bangun! Woii bangun bro! Sadar woy!"</span>`,
    onEnter: (sfx) => {
      if (sfx && sfx.playZombieGroan) sfx.playZombieGroan();
    }
  },
  {
    start: 9.8,
    end: 15.5,
    camStart: new THREE.Vector3(-0.15, 0.55, 14.6),
    camEnd: new THREE.Vector3(0.0, 1.80, 14.0),
    lookStart: new THREE.Vector3(0.80, 0.85, 13.9),
    lookEnd: new THREE.Vector3(0.85, 1.65, 13.9),
    subtitle: `<span style="color:#5cf0a5; font-size:22px; font-weight:bold;">KRISTIN:</span> "Woii bangun! Syukurlah lu selamat bro! Mayat-mayat pada bangkit karena kutukan sihir gelap! Cepat berdiri, ambil senjatamu, kita harus bertahan hidup!"`,
    onEnter: (sfx) => {
      if (sfx && sfx.playPumpRack) sfx.playPumpRack();
      if (sfx && sfx.playSnowThud) sfx.playSnowThud(1.0);
    }
  }
];

const NATALIA_HELICOPTER_STAGES = [
  {
    start: 0.0,
    end: 4.8,
    subtitle: `<span style="color:#f5ba42; font-size:22px; font-weight:bold;">HQ AIR SUPPORT:</span> <i>*suara baling-baling helikopter membelah badai salju*</i> <span style="color:#ffffff; font-size:21px; font-weight:bold;">"Milestone 100 mayat hidup terverifikasi! Helikopter taktis Unit Khusus tiba di sektor!"</span>`,
    onEnter: (sfx) => {
      if (sfx && sfx.startHelicopterAudio) sfx.startHelicopterAudio();
    }
  },
  {
    start: 4.8,
    end: 9.8,
    subtitle: `<span style="color:#f5ba42; font-size:22px; font-weight:bold;">AGENT NATALIA:</span> <i>*terjun dari helikopter menembus badai salju*</i> <span style="color:#ffffff; font-size:21px; font-weight:bold;">"Drop zone aman! Touching down in three... two... one!"</span>`,
    onEnter: (sfx) => {}
  },
  {
    start: 9.8,
    end: 14.8,
    subtitle: `<span style="color:#f5ba42; font-size:23px; font-weight:bold;">AGENT NATALIA:</span> <i>*menodongkan combat shotgun waspada*</i> <span style="color:#ffffff; font-size:22px; font-weight:bold;">"Siapa kamu?! Apa urusanmu di sini?!"</span>`,
    onEnter: (sfx) => {
      if (sfx && sfx.fadeHelicopterAudio) sfx.fadeHelicopterAudio(4.5);
      if (sfx && sfx.playSnowThud) sfx.playSnowThud(1.2);
      if (sfx && sfx.playPumpRack) setTimeout(() => sfx.playPumpRack(), 700);
    }
  },
  {
    start: 14.8,
    end: 20.2,
    subtitle: `<span style="color:#5cf0a5; font-size:21px; font-weight:bold;">KRISTIN:</span> "Woi tahan, jangan tembak! Kita mahasiswa tim riset yang selamat! Bus kami hancur!"<br><span style="color:#f5ba42; font-size:21px; font-weight:bold;">AGENT NATALIA:</span> "Warga sipil yang berhasil bantai 100 zombie sendirian?! Luar biasa... Skuadron taktis mendeteksi sinyal kalian dari udara. Mulai sekarang, gua kawal kalian sampai ke dermaga!"`,
    onEnter: (sfx) => {
      if (sfx && sfx.playPumpRack) sfx.playPumpRack();
    }
  }
];

function createDroppedShotgun() {
  if (cutsceneDroppedShotgun && scene) {
    scene.remove(cutsceneDroppedShotgun);
    cutsceneDroppedShotgun = null;
  }
  const g = new THREE.Group();
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x22262a, roughness: 0.35, metalness: 0.8 });
  const woodMat = new THREE.MeshLambertMaterial({ color: 0x3d2215 });

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.75, 8), steelMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0, 0.28);
  g.add(barrel);

  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.08, 0.26), woodMat);
  stock.position.set(0, -0.02, -0.18);
  g.add(stock);

  const gy = (typeof getTerrainHeight === 'function') ? getTerrainHeight(-0.62, 14.1) : 0;
  g.position.set(-0.62, gy + 0.08, 14.1);
  g.rotation.set(0.12, 0.52, Math.PI / 2.05);

  cutsceneDroppedShotgun = g;
  if (scene) scene.add(cutsceneDroppedShotgun);
}

function skipActiveCutscene() {
  if (!isCinematicActive) return;
  if (activeCutsceneType === 'nona_batavia') {
    finishNonaBataviaCutscene();
  } else if (activeCutsceneType === 'natalia_helicopter') {
    finishNataliaHelicopterCutscene();
  } else {
    finishCutscene();
  }
}

export function startIntroCutscene(camera, sfx, onComplete) {
  cameraRef = camera;
  sfxRef = sfx;
  onCompleteCallback = onComplete;
  activeCutsceneType = 'intro';
  cutsceneTime = 0;
  currentStageIndex = -1;
  isCinematicActive = true;

  // Hide hands viewmodel & flashlight during cutscene
  if (weaponHolder) weaponHolder.visible = false;
  if (playerFlashlight) playerFlashlight.visible = false;

  // Position unconscious player lying limp on back in the snow
  setPlayerCutscenePose('unconscious');

  // Spawn dropped shotgun in the snow next to player's outstretched hand
  createDroppedShotgun();

  // Position Kristin crouching down beside the unconscious player
  if (andikaModel && andikaModel.root) {
    const gy = (typeof getTerrainHeight === 'function') ? getTerrainHeight(0.82, 13.9) : 0.1;
    andikaModel.root.position.set(0.82, gy - 0.58, 13.9);
    andikaModel.root.rotation.set(0.42, -Math.PI / 2 - 0.28, 0.16); // Leaning down close over player
  }

  // Show cinema overlay & letterbox
  const overlay = document.getElementById('cinematic-overlay');
  if (overlay) {
    overlay.style.display = 'block';
    overlay.style.opacity = '1';
  }

  // Hide HUD while in cutscene
  const hud = document.getElementById('hud');
  if (hud) hud.style.display = 'none';
  const reticle = document.getElementById('reticle');
  if (reticle) reticle.style.display = 'none';
  updateTouchControlsVisibility();

  // Wire skip button
  const skipBtn = document.getElementById('cinematic-skip-btn');
  if (skipBtn) {
    skipBtn.onclick = (e) => {
      e.stopPropagation();
      skipActiveCutscene();
    };
  }

  // Keyboard skip
  const handleKeySkip = (e) => {
    if (!isCinematicActive || activeCutsceneType !== 'intro') {
      window.removeEventListener('keydown', handleKeySkip);
      return;
    }
    if (e.code === 'Space' || e.code === 'Escape' || e.code === 'KeyE') {
      skipActiveCutscene();
      window.removeEventListener('keydown', handleKeySkip);
    }
  };
  window.addEventListener('keydown', handleKeySkip);
}

export function startNonaBataviaCutscene(bossZombie, camera, sfx, onComplete) {
  if (isCinematicActive) return;

  cameraRef = camera;
  sfxRef = sfx;
  onCompleteCallback = onComplete;
  activeBossRef = bossZombie;
  activeCutsceneType = 'nona_batavia';
  cutsceneTime = 0;
  currentStageIndex = -1;
  isCinematicActive = true;

  // Hide hands viewmodel & flashlight
  if (weaponHolder) weaponHolder.visible = false;
  if (playerFlashlight) playerFlashlight.visible = false;

  // Show cinema overlay & letterbox
  const overlay = document.getElementById('cinematic-overlay');
  if (overlay) {
    overlay.style.display = 'block';
    overlay.style.opacity = '1';
  }

  // Hide HUD & reticle
  const hud = document.getElementById('hud');
  if (hud) hud.style.display = 'none';
  const reticle = document.getElementById('reticle');
  if (reticle) reticle.style.display = 'none';
  updateTouchControlsVisibility();
  const bossHud = document.getElementById('boss-hud-container');
  if (bossHud) bossHud.style.display = 'none';
  const npcBanner = document.getElementById('andika-npc-banner');
  if (npcBanner) npcBanner.style.display = 'none';
  const bossFlash = document.getElementById('boss-warning-flash');
  if (bossFlash) {
    bossFlash.style.display = 'none';
    bossFlash.style.opacity = '0';
  }

  // Wire skip button
  const skipBtn = document.getElementById('cinematic-skip-btn');
  if (skipBtn) {
    skipBtn.onclick = (e) => {
      e.stopPropagation();
      skipActiveCutscene();
    };
  }

  // Keyboard skip
  const handleKeySkip = (e) => {
    if (!isCinematicActive || activeCutsceneType !== 'nona_batavia') {
      window.removeEventListener('keydown', handleKeySkip);
      return;
    }
    if (e.code === 'Space' || e.code === 'Escape' || e.code === 'KeyE') {
      skipActiveCutscene();
      window.removeEventListener('keydown', handleKeySkip);
    }
  };
  window.addEventListener('keydown', handleKeySkip);
}

function updateNonaBataviaCutscene(dt) {
  if (!activeBossRef || !activeBossRef.model || !activeBossRef.model.root) {
    finishNonaBataviaCutscene();
    return;
  }

  // Sinister levitation sway
  const root = activeBossRef.model.root;
  root.position.y = activeBossRef.y + Math.sin(cutsceneTime * 2.2) * 0.42;
  root.rotation.y += dt * 0.4;

  if (cutsceneTime >= 13.4) {
    finishNonaBataviaCutscene();
    return;
  }

  const bx = activeBossRef.x;
  const by = activeBossRef.y;
  const bz = activeBossRef.z;
  const px = (typeof playerPos !== 'undefined' && playerPos) ? playerPos.x : (cameraRef ? cameraRef.position.x : 0);
  const pz = (typeof playerPos !== 'undefined' && playerPos) ? playerPos.z : (cameraRef ? cameraRef.position.z : 0);
  const py = (typeof getTerrainHeight === 'function' ? getTerrainHeight(px, pz) : 0) + 1.8;

  let stage = null;
  let stageIdx = -1;
  for (let i = 0; i < NONA_BATAVIA_STAGES.length; i++) {
    const s = NONA_BATAVIA_STAGES[i];
    if (cutsceneTime >= s.start && cutsceneTime < s.end) {
      stage = s;
      stageIdx = i;
      break;
    }
  }

  if (stage) {
    if (stageIdx !== currentStageIndex) {
      currentStageIndex = stageIdx;
      if (stage.onEnter) stage.onEnter(sfxRef);
      const subEl = document.getElementById('cinematic-subtitles');
      if (subEl) {
        subEl.innerHTML = stage.subtitle;
      }
    }

    const stageProgress = (cutsceneTime - stage.start) / (stage.end - stage.start);
    const easeProg = 0.5 - 0.5 * Math.cos(stageProgress * Math.PI);

    const cStart = stage.getCamStart(bx, by, bz, px, py, pz);
    const cEnd = stage.getCamEnd(bx, by, bz, px, py, pz);
    cameraRef.position.lerpVectors(cStart, cEnd, easeProg);

    const lStart = stage.getLookStart(bx, by, bz);
    const lEnd = stage.getLookEnd(bx, by, bz);
    const lookTarget = new THREE.Vector3().lerpVectors(lStart, lEnd, easeProg);
    cameraRef.lookAt(lookTarget);
  }
}

export function finishNonaBataviaCutscene() {
  if (!isCinematicActive || activeCutsceneType !== 'nona_batavia') return;
  isCinematicActive = false;
  activeCutsceneType = null;

  // Aim player toward Nona Batavia
  if (cameraRef && activeBossRef) {
    const px = (typeof playerPos !== 'undefined' && playerPos) ? playerPos.x : 0;
    const pz = (typeof playerPos !== 'undefined' && playerPos) ? playerPos.z : 0;
    const py = (typeof getTerrainHeight === 'function' ? getTerrainHeight(px, pz) : 0) + 1.8;
    cameraRef.position.set(px, py, pz);
    cameraRef.lookAt(activeBossRef.x, activeBossRef.y + 0.6, activeBossRef.z);
  }

  // Fade out & hide cinema overlay
  const overlay = document.getElementById('cinematic-overlay');
  if (overlay) {
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.style.display = 'none';
    }, 400);
  }

  // Reveal HUD, crosshair, and boss health bar
  const hud = document.getElementById('hud');
  if (hud) hud.style.display = 'flex';
  const reticle = document.getElementById('reticle');
  if (reticle) reticle.style.display = 'block';
  const bossHud = document.getElementById('boss-hud-container');
  if (bossHud) bossHud.style.display = 'flex';
  updateTouchControlsVisibility();

  // Restore player viewmodel & flashlight
  if (playerFlashlight) playerFlashlight.visible = true;
  if (playerMeshRoot) playerMeshRoot.visible = (cameraMode === 'tps');
  if (weaponHolder) weaponHolder.visible = (cameraMode === 'fps');

  // Request pointer lock for FPS gameplay
  try {
    document.body.requestPointerLock();
  } catch (e) {
    console.warn('Pointer lock request:', e);
  }

  if (typeof onCompleteCallback === 'function') {
    onCompleteCallback();
    onCompleteCallback = null;
  }
}

export function updateCutscene(dt) {
  if (!isCinematicActive || !cameraRef) return;

  cutsceneTime += dt;

  if (activeCutsceneType === 'nona_batavia') {
    updateNonaBataviaCutscene(dt);
    return;
  }

  if (activeCutsceneType === 'natalia_helicopter') {
    updateNataliaHelicopterCutscene(dt);
    return;
  }

  // 1. Character Posing & Dynamic Awakening Transition
  if (cutsceneTime < 9.8) {
    // Player remains unconscious flat on the snow
    setPlayerCutscenePose('unconscious');

    // Kristin crouched down over player, shaking player's shoulder and shouting "woii bangun"
    if (andikaModel && andikaModel.root) {
      const gy = (typeof getTerrainHeight === 'function') ? getTerrainHeight(0.82, 13.9) : 0.1;
      const shake = (cutsceneTime > 4.2) ? Math.sin(cutsceneTime * 11.0) * 0.028 : Math.sin(cutsceneTime * 2.5) * 0.010;
      const headNod = (cutsceneTime > 4.2) ? Math.sin(cutsceneTime * 5.5) * 0.04 : 0;
      andikaModel.root.position.set(0.82 + shake * 0.6, gy - 0.58 + Math.abs(shake) * 0.25, 13.9);
      andikaModel.root.rotation.set(0.42 + headNod, -Math.PI / 2 - 0.28, 0.16);
    }
  } else {
    // Stage 3: Player awakens and rises up
    const wakeProgress = Math.min(1.0, (cutsceneTime - 9.8) / 4.2);
    setPlayerCutscenePose('waking', wakeProgress);

    // Kristin stands up from crouching to full standing height as player wakes up
    if (andikaModel && andikaModel.root) {
      const ease = wakeProgress * wakeProgress * (3 - 2 * wakeProgress);
      const gy = (typeof getTerrainHeight === 'function') ? getTerrainHeight(0.82, 13.9) : 0.1;
      const curY = THREE.MathUtils.lerp(gy - 0.58, gy, ease);
      const curRotX = THREE.MathUtils.lerp(0.42, 0, ease);
      const curRotZ = THREE.MathUtils.lerp(0.16, 0, ease);
      andikaModel.root.position.set(0.82, curY, 13.9);
      andikaModel.root.rotation.set(curRotX, -Math.PI / 2 - 0.28, curRotZ);
    }

    // Player retrieves dropped shotgun from snow
    if (wakeProgress > 0.82 && cutsceneDroppedShotgun && scene) {
      scene.remove(cutsceneDroppedShotgun);
      cutsceneDroppedShotgun = null;
    }
  }

  if (cutsceneTime >= 15.5) {
    finishCutscene();
    return;
  }

  // 3. Camera Choreography & Subtitles
  let stage = null;
  let stageIdx = -1;
  for (let i = 0; i < CUTSCENE_STAGES.length; i++) {
    const s = CUTSCENE_STAGES[i];
    if (cutsceneTime >= s.start && cutsceneTime < s.end) {
      stage = s;
      stageIdx = i;
      break;
    }
  }

  if (stage) {
    if (stageIdx !== currentStageIndex) {
      currentStageIndex = stageIdx;
      if (stage.onEnter) stage.onEnter(sfxRef);
      const subEl = document.getElementById('cinematic-subtitles');
      if (subEl) {
        subEl.innerHTML = stage.subtitle;
      }
    }

    const stageProgress = (cutsceneTime - stage.start) / (stage.end - stage.start);
    const easeProg = 0.5 - 0.5 * Math.cos(stageProgress * Math.PI);

    cameraRef.position.lerpVectors(stage.camStart, stage.camEnd, easeProg);
    const lookTarget = new THREE.Vector3().lerpVectors(stage.lookStart, stage.lookEnd, easeProg);
    cameraRef.lookAt(lookTarget);
  }
}

export function finishCutscene() {
  if (!isCinematicActive) return;
  isCinematicActive = false;

  // Remove dropped shotgun if still present
  if (cutsceneDroppedShotgun && scene) {
    scene.remove(cutsceneDroppedShotgun);
    cutsceneDroppedShotgun = null;
  }

  // Reset player model to standard upright stance
  setPlayerCutscenePose('reset');

  // Position Kristin beside player ready for escort mode
  if (andikaModel && andikaModel.root) {
    const gy = (typeof getTerrainHeight === 'function') ? getTerrainHeight(1.2, 13.8) : 0.1;
    andikaModel.root.position.set(1.2, gy, 13.8);
    andikaModel.root.rotation.set(0, -0.35, 0);
  }

  // Restore camera to default player eye-level spawn
  if (cameraRef) {
    cameraRef.position.set(0, 1.8, 14.0);
    cameraRef.rotation.set(0, 0, 0);
  }

  // Fade out and hide cinema overlay
  const overlay = document.getElementById('cinematic-overlay');
  if (overlay) {
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.style.display = 'none';
    }, 400);
  }

  // Reveal HUD and Crosshair
  const hud = document.getElementById('hud');
  if (hud) hud.style.display = 'flex';
  const reticle = document.getElementById('reticle');
  if (reticle) reticle.style.display = 'block';

  // Restore flashlight and viewmodels / player model
  if (playerFlashlight) playerFlashlight.visible = true;
  if (playerMeshRoot) playerMeshRoot.visible = (cameraMode === 'tps');
  if (weaponHolder) weaponHolder.visible = (cameraMode === 'fps');

  // Request pointer lock for FPS gameplay
  try {
    document.body.requestPointerLock();
  } catch (e) {
    console.warn('Pointer lock request:', e);
  }

  if (typeof onCompleteCallback === 'function') {
    onCompleteCallback();
    onCompleteCallback = null;
  }

  updateTouchControlsVisibility();
}

/**
 * -----------------------------------------------------------------------------
 * AGENT NATALIA HELICOPTER ARRIVAL CUTSCENE (TRIGGERS AT 100 KILLS)
 * -----------------------------------------------------------------------------
 */
export function startNataliaHelicopterCutscene(camera, sfx, onComplete) {
  if (isCinematicActive) return;

  cameraRef = camera;
  sfxRef = sfx;
  onCompleteCallback = onComplete;
  activeCutsceneType = 'natalia_helicopter';
  cutsceneTime = 0;
  currentStageIndex = -1;
  isCinematicActive = true;

  // Hide hands viewmodel & flashlight
  if (weaponHolder) weaponHolder.visible = false;
  if (playerFlashlight) playerFlashlight.visible = false;

  // Show cinema overlay & letterbox
  const overlay = document.getElementById('cinematic-overlay');
  if (overlay) {
    overlay.style.display = 'block';
    overlay.style.opacity = '1';
  }

  // Hide HUD & reticle
  const hud = document.getElementById('hud');
  if (hud) hud.style.display = 'none';
  const reticle = document.getElementById('reticle');
  if (reticle) reticle.style.display = 'none';
  updateTouchControlsVisibility();

  // Create tactical helicopter in scene
  if (!activeHelicopter && scene) {
    activeHelicopter = createTacticalHelicopter();
    scene.add(activeHelicopter.root);
  }

  const px = (typeof playerPos !== 'undefined' && playerPos) ? playerPos.x : (cameraRef ? cameraRef.position.x : 0);
  const pz = (typeof playerPos !== 'undefined' && playerPos) ? playerPos.z : (cameraRef ? cameraRef.position.z : 14.0);
  const pgy = (typeof getTerrainHeight === 'function' ? getTerrainHeight(px, pz) : 0);

  // Position helicopter starting far away in the stormy sky
  if (activeHelicopter) {
    activeHelicopter.root.position.set(px - 40, pgy + 32, pz + 42);
    activeHelicopter.root.rotation.set(-0.15, Math.PI / 4, 0.12);
  }

  // Position Natalia hidden initially
  if (nataliaModel && nataliaModel.root) {
    nataliaModel.root.visible = false;
    nataliaModel._hasLandedHeli = false;
  }

  // Start synthesized helicopter rotor sound
  if (sfxRef && sfxRef.startHelicopterAudio) sfxRef.startHelicopterAudio();

  // Wire skip button
  const skipBtn = document.getElementById('cinematic-skip-btn');
  if (skipBtn) {
    skipBtn.onclick = (e) => {
      e.stopPropagation();
      skipActiveCutscene();
    };
  }

  // Keyboard skip
  const handleKeySkip = (e) => {
    if (!isCinematicActive || activeCutsceneType !== 'natalia_helicopter') {
      window.removeEventListener('keydown', handleKeySkip);
      return;
    }
    if (e.code === 'Space' || e.code === 'Escape' || e.code === 'KeyE') {
      skipActiveCutscene();
      window.removeEventListener('keydown', handleKeySkip);
    }
  };
  window.addEventListener('keydown', handleKeySkip);
}

function updateNataliaHelicopterCutscene(dt) {
  const px = (typeof playerPos !== 'undefined' && playerPos) ? playerPos.x : (cameraRef ? cameraRef.position.x : 0);
  const pz = (typeof playerPos !== 'undefined' && playerPos) ? playerPos.z : (cameraRef ? cameraRef.position.z : 14.0);
  const pgy = (typeof getTerrainHeight === 'function' ? getTerrainHeight(px, pz) : 0);

  const dropX = px + 2.5;
  const dropZ = pz + 1.8;
  const dropGY = (typeof getTerrainHeight === 'function' ? getTerrainHeight(dropX, dropZ) : 0);

  const hoverX = dropX;
  const hoverY = dropGY + 13.0;
  const hoverZ = dropZ;

  if (activeHelicopter) {
    activeHelicopter.update(dt);
  }

  if (cutsceneTime < 4.8) {
    // Stage 0: Helicopter approaches rapidly from sky
    const p = cutsceneTime / 4.8;
    const ease = 0.5 - 0.5 * Math.cos(p * Math.PI);

    if (activeHelicopter) {
      activeHelicopter.root.position.set(
        THREE.MathUtils.lerp(px - 40, hoverX, ease),
        THREE.MathUtils.lerp(pgy + 32, hoverY, ease),
        THREE.MathUtils.lerp(pz + 42, hoverZ, ease)
      );
      activeHelicopter.root.rotation.set(
        THREE.MathUtils.lerp(-0.15, -0.05, ease),
        THREE.MathUtils.lerp(Math.PI / 4, -0.35, ease),
        THREE.MathUtils.lerp(0.12, 0.02, ease)
      );
      if (activeHelicopter.searchlight && activeHelicopter.searchlight.target) {
        activeHelicopter.searchlight.target.position.set(dropX, dropGY, dropZ);
      }
    }

    // Camera looks up from player position toward incoming helicopter
    if (cameraRef) {
      cameraRef.position.set(px, pgy + 1.8, pz);
      const camTarget = new THREE.Vector3(
        activeHelicopter ? activeHelicopter.root.position.x : dropX,
        activeHelicopter ? activeHelicopter.root.position.y : hoverY,
        activeHelicopter ? activeHelicopter.root.position.z : dropZ
      );
      cameraRef.lookAt(camTarget);
    }
  } else if (cutsceneTime < 9.8) {
    // Stage 1: Helicopter hovers, Natalia drops down to snow
    const dropProg = Math.min(1.0, (cutsceneTime - 4.8) / 4.2);
    const dropEase = dropProg * dropProg * (3 - 2 * dropProg);

    if (activeHelicopter) {
      const hoverSway = Math.sin(cutsceneTime * 2.5) * 0.15;
      activeHelicopter.root.position.set(hoverX + hoverSway * 0.4, hoverY + hoverSway, hoverZ);
      activeHelicopter.root.rotation.set(
        -0.05 + Math.sin(cutsceneTime * 2.0) * 0.02,
        -0.35,
        Math.cos(cutsceneTime * 2.2) * 0.02
      );
      if (activeHelicopter.searchlight && activeHelicopter.searchlight.target) {
        activeHelicopter.searchlight.target.position.set(dropX, dropGY, dropZ);
      }
    }

    if (nataliaModel && nataliaModel.root) {
      nataliaModel.root.visible = true;
      const curY = THREE.MathUtils.lerp(hoverY - 1.2, dropGY, dropEase);
      nataliaModel.root.position.set(dropX, curY, dropZ);
      nataliaModel.root.rotation.set(0, -Math.PI / 2 - 0.35, 0);

      // On impact touchdown
      if (dropProg >= 0.96 && !nataliaModel._hasLandedHeli) {
        nataliaModel._hasLandedHeli = true;
        if (sfxRef && sfxRef.playSnowThud) sfxRef.playSnowThud(1.2);
        if (sfxRef && sfxRef.playPumpRack) sfxRef.playPumpRack();
      }
    }

    // Camera follows Natalia down as she descends
    if (cameraRef) {
      const camProg = Math.min(1.0, (cutsceneTime - 4.8) / 4.8);
      cameraRef.position.set(
        THREE.MathUtils.lerp(px, px + 0.6, camProg),
        THREE.MathUtils.lerp(pgy + 1.8, pgy + 1.6, camProg),
        THREE.MathUtils.lerp(pz, pz + 0.5, camProg)
      );
      const lookY = THREE.MathUtils.lerp(hoverY - 1.0, dropGY + 1.3, camProg);
      cameraRef.lookAt(dropX, lookY, dropZ);
    }
  } else if (cutsceneTime < 14.8) {
    // Stage 2: Helicopter flies off into distance, Natalia aims shotgun
    const departProg = (cutsceneTime - 9.8) / 5.0;
    const departEase = departProg * departProg;

    if (activeHelicopter) {
      activeHelicopter.root.position.set(
        hoverX + departEase * 55,
        hoverY + departEase * 35,
        hoverZ - departEase * 48
      );
      activeHelicopter.root.rotation.set(-0.25, -0.65, 0.22);
    }

    if (nataliaModel && nataliaModel.root) {
      nataliaModel.root.visible = true;
      nataliaModel.root.position.set(dropX, dropGY, dropZ);
      nataliaModel.root.rotation.set(0, -Math.PI / 2 - 0.35, 0);
    }

    // Camera frames Natalia standing alert in the snow
    if (cameraRef) {
      cameraRef.position.set(px + 0.8, pgy + 1.65, pz + 0.6);
      cameraRef.lookAt(dropX, dropGY + 1.45, dropZ);
    }
  } else {
    // Stage 3: Kristin and Natalia dialogue
    if (nataliaModel && nataliaModel.root) {
      nataliaModel.root.visible = true;
      nataliaModel.root.position.set(dropX, dropGY, dropZ);
      nataliaModel.root.rotation.set(0, -Math.PI / 2 - 0.35, 0);
    }

    // Camera frames both Natalia and player/Kristin
    if (cameraRef) {
      cameraRef.position.set(px + 0.4, pgy + 1.7, pz);
      cameraRef.lookAt(dropX, dropGY + 1.4, dropZ);
    }
  }

  if (cutsceneTime >= 20.2) {
    finishNataliaHelicopterCutscene();
    return;
  }

  // Update subtitles
  for (let i = 0; i < NATALIA_HELICOPTER_STAGES.length; i++) {
    const s = NATALIA_HELICOPTER_STAGES[i];
    if (cutsceneTime >= s.start && cutsceneTime < s.end) {
      if (i !== currentStageIndex) {
        currentStageIndex = i;
        if (s.onEnter) s.onEnter(sfxRef);
        const subEl = document.getElementById('cinematic-subtitles');
        if (subEl) subEl.innerHTML = s.subtitle;
      }
      break;
    }
  }
}

export function finishNataliaHelicopterCutscene() {
  if (!isCinematicActive || activeCutsceneType !== 'natalia_helicopter') return;
  isCinematicActive = false;
  activeCutsceneType = null;

  // Remove helicopter from scene
  if (activeHelicopter && scene) {
    scene.remove(activeHelicopter.root);
    activeHelicopter = null;
  }

  // Stop helicopter audio
  if (sfxRef && sfxRef.stopHelicopterAudio) {
    sfxRef.stopHelicopterAudio();
  }

  const px = (typeof playerPos !== 'undefined' && playerPos) ? playerPos.x : (cameraRef ? cameraRef.position.x : 0);
  const pz = (typeof playerPos !== 'undefined' && playerPos) ? playerPos.z : (cameraRef ? cameraRef.position.z : 14.0);
  const dropX = px + 2.5;
  const dropZ = pz + 1.8;
  const dropGY = (typeof getTerrainHeight === 'function' ? getTerrainHeight(dropX, dropZ) : 0);

  // Position Natalia firmly beside player in escort mode
  if (nataliaModel && nataliaModel.root) {
    nataliaModel.root.visible = true;
    nataliaModel.root.position.set(dropX, dropGY, dropZ);
    nataliaModel.root.rotation.set(0, -Math.PI / 2 - 0.35, 0);
    nataliaModel._hasLandedHeli = false;
  }

  state.nataliaSpawned = true;

  // Restore camera
  if (cameraRef) {
    cameraRef.position.set(px, (typeof getTerrainHeight === 'function' ? getTerrainHeight(px, pz) : 0) + 1.8, pz);
    cameraRef.lookAt(dropX, dropGY + 1.4, dropZ);
  }

  // Fade out & hide cinema overlay
  const overlay = document.getElementById('cinematic-overlay');
  if (overlay) {
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.style.display = 'none';
    }, 400);
  }

  // Reveal HUD, reticle
  const hud = document.getElementById('hud');
  if (hud) hud.style.display = 'flex';
  const reticle = document.getElementById('reticle');
  if (reticle) reticle.style.display = 'block';
  updateTouchControlsVisibility();

  // Restore flashlight and viewmodels
  if (playerFlashlight) playerFlashlight.visible = true;
  if (playerMeshRoot) playerMeshRoot.visible = (cameraMode === 'tps');
  if (weaponHolder) weaponHolder.visible = (cameraMode === 'fps');

  // Show Agent Natalia's speech banner
  showNataliaSubtitle("Siapa kamu?! Apa urusanmu di sini?! ...Tetap di belakang gua, kita habisi zombienya bareng-bareng!", 6000);

  try {
    document.body.requestPointerLock();
  } catch (e) {}

  if (typeof onCompleteCallback === 'function') {
    onCompleteCallback();
    onCompleteCallback = null;
  }
}
