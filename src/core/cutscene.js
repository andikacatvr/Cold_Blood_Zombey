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
import { kristinModel, animateKristinCutsceneStep } from '../entities/kristin.js';
import {
  nataliaModel,
  showNataliaSubtitle
} from '../entities/natalia.js';
import { createTacticalHelicopter } from '../entities/helicopter.js';
import { createHondaCivicCar, preloadHondaCivicModel } from '../entities/car.js';
import { weaponHolder } from '../entities/weapons.js';
import { playerMeshRoot, cameraMode, setPlayerCutscenePose } from '../entities/playerModel.js';
import { scene, playerFlashlight } from '../graphics/engine.js';
import { playerPos, state, setPlayerYawPitch } from './player.js';
import { zombies } from '../entities/enemies.js';
import { updateTouchControlsVisibility } from '../ui/touchControls.js';
import { setObjective } from './quest.js';
import { buildOldThomasModel, buildVintagePickupTruck, buildGothicVillageGate } from '../entities/villager.js';

const THREE = window.THREE;

export let isCinematicActive = false;
export let activeCutsceneType = null; // 'intro' | 'nona_batavia' | 'natalia_helicopter'
let cutsceneTime = 0;
let cameraRef = null;
let onCompleteCallback = null;
let currentStageIndex = -1;
let sfxRef = null;
let cutsceneDroppedShotgun = null;
let cutsceneCivicCar = null;
let cutsceneTruck = null;
let cutsceneOldThomas = null;
let cutsceneVillageGate = null;
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
    subtitle: `<span style="color:#ffffff;">Lolongan Lady of Blackwood Moors membelah kesunyian badai salju...</span>`,
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
    subtitle: `<span style="color:#ff6b6b; font-size:21px; font-weight:bold; text-shadow:0 0 12px #900;">"Suara kutukan Blackwood bergema... Roh penasaran mencari mangsa segar!"</span>`,
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
    end: 7.5,
    camStart: new THREE.Vector3(0.7, 1.35, -21.0),
    camEnd: new THREE.Vector3(2.4, 1.85, 12.0),
    lookStart: new THREE.Vector3(0.1, 1.0, -25.5),
    lookEnd: new THREE.Vector3(0.0, 1.8, 17.5),
    subtitle: `<span style="color:#a8c4da; font-size:15px; letter-spacing:2px; font-family:serif;">COLDBROOK ROADWAY — BLACKWOOD MOORS, ENGLAND</span><br><span style="color:#d8b26e; font-size:21px; font-weight:bold;">RODRICK (Perekam Suara):</span> <i>*deru mesin Honda Civic & suara kaset berderak*</i> "Catatan lapangan hari pertama. Kita baru saja tiba di perbatasan Coldbrook menyusuri jalan Blackwood Moors..."<br><span style="color:#5cf0a5; font-size:20px; font-weight:bold;">KRISTIN:</span> "Dan dua minggu penelitian sampel air sumur! Jangan lupa riset lingkungan gue juga masuk publikasi, Rod."`,
    onEnter: (sfx) => {
      if (sfx && sfx.playChurchBellToll) sfx.playChurchBellToll();
    }
  },
  {
    start: 7.5,
    end: 14.5,
    camStart: new THREE.Vector3(0.3, 1.55, 15.8),
    camEnd: new THREE.Vector3(0.7, 1.62, 16.6),
    lookStart: new THREE.Vector3(0.8, 1.55, 17.5),
    lookEnd: new THREE.Vector3(0.8, 1.55, 17.5),
    subtitle: `<span style="color:#f0ebe0; font-size:21px; font-weight:bold;">OLD THOMAS:</span> <i>*senyum lebar ganjil & tatapan kosong*</i> "Selamat datang di Coldbrook, anak-anak muda... Silakan basuh tenggorokan dengan air suci sumur biara. Pastor Raksha selalu membuka pintu bagi jiwa-jiwa berdosa..."<br><span style="color:#d8b26e; font-size:19px; font-weight:bold;">RODRICK (Rekaman):</span> "Hari kedua... Gue dengar warga lain menyambut dengan kalimat yang persis sama, intonasi yang sama, dan senyum kaku yang sama..."`,
    onEnter: (sfx) => {
      if (sfx && sfx.playZombieGroan) sfx.playZombieGroan();
    }
  },
  {
    start: 14.5,
    end: 21.5,
    camStart: new THREE.Vector3(1.2, 1.5, 15.2),
    camEnd: new THREE.Vector3(0.2, 1.5, 15.4),
    lookStart: new THREE.Vector3(-0.3, 1.5, 14.5),
    lookEnd: new THREE.Vector3(0.8, 1.55, 17.5),
    subtitle: `<span style="color:#5cf0a5; font-size:21px; font-weight:bold;">KRISTIN:</span> "Rod, gawat! Sampel air dari cawan itu... ada zat narkotik dan racun pembusuk jaringan tubuh! Warga di sini bukan ramah, saraf otak mereka dicuci oleh air biara!"<br><span style="color:#f0ebe0; font-size:19px; font-weight:bold;">OLD THOMAS:</span> <i>*senyum membeku, bola mata keruh*</i> "Semua dosa... telah diampuni..."`,
    onEnter: (sfx) => {
      if (sfx && sfx.playSnowStep) sfx.playSnowStep();
    }
  },
  {
    start: 21.5,
    end: 28.5,
    camStart: new THREE.Vector3(-0.2, 1.6, 13.0),
    camEnd: new THREE.Vector3(0.0, 1.75, 14.0),
    lookStart: new THREE.Vector3(0.0, 1.6, 18.0),
    lookEnd: new THREE.Vector3(0.0, 1.6, 6.0),
    subtitle: `<span style="color:#5cf0a5; font-size:21px; font-weight:bold;">KRISTIN:</span> "Sore sudah menjelang senja, Rod. Warga di sini tampak tenang dan ramah, tapi suasana desanya terasa sangat dingin dan aneh..."<br><span style="color:#d8b26e; font-size:21px; font-weight:bold;">RODRICK:</span> "Ayo kita telusuri jalan desa dan ajak ngobrol warga sekitar dulu. Catat semua kejanggalan yang kita temukan."`,
    onEnter: (sfx) => {
      if (sfx && sfx.playSnowStep) sfx.playSnowStep();
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
    subtitle: `<span style="color:#f5ba42; font-size:23px; font-weight:bold;">AGENT NATALIA:</span> <i>*menodongkan pistol taktis waspada*</i> <span style="color:#ffffff; font-size:22px; font-weight:bold;">"Siapa kamu?! Apa urusanmu di sini?!"</span>`,
    onEnter: (sfx) => {
      if (sfx && sfx.fadeHelicopterAudio) sfx.fadeHelicopterAudio(4.5);
      if (sfx && sfx.playSnowThud) sfx.playSnowThud(1.2);
      if (sfx && sfx.playPistolShot) setTimeout(() => sfx.playPistolShot(), 800);
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

  // Position upright player standing beside Kristin
  setPlayerCutscenePose('intro');
  if (state && state.player) state.player.isInvulnerable = true;

  // 1. Permanent "WELCOME TO COLDBROOK" Gothic Arch & Roadway is built into world environment
  if (cutsceneVillageGate && scene) {
    scene.remove(cutsceneVillageGate);
    cutsceneVillageGate = null;
  }

  // 2. Spawn 1985 Honda Civic Car on open highway
  if (cutsceneCivicCar) {
    cutsceneCivicCar.dispose();
    cutsceneCivicCar = null;
  }
  if (cutsceneTruck && scene) {
    scene.remove(cutsceneTruck);
    cutsceneTruck = null;
  }
  cutsceneCivicCar = createHondaCivicCar();
  const gyCar = (typeof getTerrainHeight === 'function') ? getTerrainHeight(0.0, -26.0) : 0;
  cutsceneCivicCar.root.position.set(0.0, gyCar, -26.0);
  cutsceneCivicCar.root.rotation.set(0, 0, 0); // Faces forward along +Z toward Coldbrook gate
  cutsceneCivicCar.setHeadlights(true);
  cutsceneCivicCar.setPassengersVisible(true); // Rodrick driving behind wheel, Kristin in passenger seat
  if (scene) scene.add(cutsceneCivicCar.root);

  if (sfxRef && sfxRef.startCarEngineAudio) {
    sfxRef.startCarEngineAudio();
  }

  // 3. Spawn Old Thomas (Elderly British villager with creepy smile & chalice at Coldbrook arch)
  if (cutsceneOldThomas && scene) scene.remove(cutsceneOldThomas);
  cutsceneOldThomas = buildOldThomasModel();
  const gyThomas = (typeof getTerrainHeight === 'function') ? getTerrainHeight(0.8, 17.5) : 0;
  cutsceneOldThomas.position.set(0.8, gyThomas, 17.5);
  cutsceneOldThomas.rotation.y = Math.PI; // Faces toward oncoming road & arrivals
  if (scene) scene.add(cutsceneOldThomas);

  // 4. Rodrick & Kristin start inside the driving car
  if (playerMeshRoot) {
    playerMeshRoot.visible = false; // Hidden during driving shot, visible when stepping out
  }
  if (kristinModel && kristinModel.root) {
    kristinModel.root.visible = false;
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
  if (state && state.player) state.player.isInvulnerable = true;

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
  const npcBanner = document.getElementById('kristin-npc-banner');
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
  if (state && state.player) state.player.isInvulnerable = false;

  // Aim player toward Nona Batavia
  if (cameraRef && activeBossRef) {
    const px = (typeof playerPos !== 'undefined' && playerPos) ? playerPos.x : 0;
    const pz = (typeof playerPos !== 'undefined' && playerPos) ? playerPos.z : 0;
    const py = (typeof getTerrainHeight === 'function' ? getTerrainHeight(px, pz) : 0) + 1.8;
    cameraRef.position.set(px, py, pz);
    const bdx = activeBossRef.x - px;
    const bdz = activeBossRef.z - pz;
    const targetYaw = Math.atan2(-bdx, -bdz);
    setPlayerYawPitch(targetYaw, 0.08);
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

  // 1. Animate Old Thomas (Creepy head tilt & holy water arm sway)
  if (cutsceneOldThomas && cutsceneOldThomas.userData) {
    const { headGroup, rArmGroup } = cutsceneOldThomas.userData;
    if (rArmGroup) {
      rArmGroup.rotation.x = -0.15 + Math.sin(cutsceneTime * 1.8) * 0.08;
    }
    if (headGroup) {
      headGroup.rotation.y = Math.sin(cutsceneTime * 1.2) * 0.07;
      headGroup.rotation.z = Math.sin(cutsceneTime * 0.9) * 0.04;
    }
  }

  // 2. Animate Car & Characters (Driving Phase vs Stepped Out Phase)
  if (cutsceneTime < 7.5) {
    // Stage 1: Driving on highway toward Coldbrook gate
    const driveT = Math.min(1.0, cutsceneTime / 7.2);
    const easeDrive = driveT * (2 - driveT); // Smooth deceleration as car approaches gate
    const carZ = THREE.MathUtils.lerp(-26.0, 13.5, easeDrive);
    const carX = THREE.MathUtils.lerp(0.0, 1.85, driveT * driveT);
    const gyCar = (typeof getTerrainHeight === 'function') ? getTerrainHeight(carX, carZ) : 0;

    if (cutsceneCivicCar && cutsceneCivicCar.root) {
      cutsceneCivicCar.root.position.set(carX, gyCar, carZ);
      const carSpeed = (1 - easeDrive) * 16.0;
      cutsceneCivicCar.update(dt, carSpeed, true, cutsceneTime);
      cutsceneCivicCar.setPassengersVisible(true);
      if (sfxRef && sfxRef.updateCarEnginePitch) sfxRef.updateCarEnginePitch(0.85 + (1 - easeDrive) * 0.75);
    }

    // Keep external models hidden during driving shot (they are inside the car!)
    if (playerMeshRoot) playerMeshRoot.visible = false;
    if (kristinModel && kristinModel.root) kristinModel.root.visible = false;
    playerPos.set(carX, gyCar, carZ);
  } else {
    // Stage 2 - 4: Car is parked at road shoulder, Rodrick & Kristin have stepped out
    if (cutsceneCivicCar && cutsceneCivicCar.root) {
      const gyCar = (typeof getTerrainHeight === 'function') ? getTerrainHeight(1.85, 13.5) : 0;
      cutsceneCivicCar.root.position.set(1.85, gyCar, 13.5);
      cutsceneCivicCar.update(dt, 0, false, cutsceneTime);
      cutsceneCivicCar.setPassengersVisible(false); // Stepped out
      if (sfxRef && sfxRef.updateCarEnginePitch) sfxRef.updateCarEnginePitch(0.80);
    }

    const gyP = (typeof getTerrainHeight === 'function') ? getTerrainHeight(-0.45, 14.2) : 0;
    const gyK = (typeof getTerrainHeight === 'function') ? getTerrainHeight(0.45, 14.4) : 0;
    playerPos.set(-0.45, gyP, 14.2);

    if (playerMeshRoot) {
      playerMeshRoot.visible = true;
      const breath = Math.sin(cutsceneTime * 2.2) * 0.012;
      playerMeshRoot.position.set(-0.45, gyP + breath, 14.2);

      if (cutsceneTime > 14.5 && cutsceneTime < 21.5) {
        // Turn to face Kristin when she whispers about tainted water
        playerMeshRoot.rotation.y = THREE.MathUtils.lerp(playerMeshRoot.rotation.y, Math.PI - 0.55, dt * 2.5);
      } else {
        // Face forward toward Old Thomas & Coldbrook gate
        playerMeshRoot.rotation.y = THREE.MathUtils.lerp(playerMeshRoot.rotation.y, Math.PI - 0.05, dt * 2.5);
      }
      setPlayerCutscenePose('intro');
    }

    if (kristinModel && kristinModel.root) {
      kristinModel.root.visible = true;
      kristinModel.root.position.set(0.45, gyK, 14.4);
      if (cutsceneTime > 14.5 && cutsceneTime < 21.5) {
        kristinModel.root.rotation.y = THREE.MathUtils.lerp(kristinModel.root.rotation.y, -0.65, dt * 2.5);
      } else if (cutsceneTime >= 21.5) {
        kristinModel.root.rotation.y = THREE.MathUtils.lerp(kristinModel.root.rotation.y, -0.2, dt * 2.5);
      } else {
        kristinModel.root.rotation.y = THREE.MathUtils.lerp(kristinModel.root.rotation.y, 0.10, dt * 2.5);
      }
      animateKristinCutsceneStep(dt, false);
    }
  }

  if (cutsceneTime >= 28.5) {
    finishCutscene();
    return;
  }

  // 4. Camera Choreography & Subtitles
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

    if (stageIdx === 0 && cutsceneCivicCar && cutsceneCivicCar.root) {
      // Dynamic camera tracking with moving car in Stage 1
      const carPos = cutsceneCivicCar.root.position;
      if (cutsceneTime < 4.2) {
        // Shot 1: Front windshield view looking directly at Rodrick driving & Kristin
        const sT = cutsceneTime / 4.2;
        cameraRef.position.set(carPos.x + 0.65 - sT * 0.35, carPos.y + 1.25, carPos.z + 3.8 + sT * 0.6);
        cameraRef.lookAt(carPos.x + 0.12, carPos.y + 0.95, carPos.z - 0.2);
      } else {
        // Shot 2: Revealing Coldbrook gate ahead as car approaches and brakes
        const sT = (cutsceneTime - 4.2) / 3.3;
        const ease2 = sT * sT * (3 - 2 * sT);
        cameraRef.position.set(
          THREE.MathUtils.lerp(carPos.x + 2.8, 2.3, ease2),
          THREE.MathUtils.lerp(carPos.y + 1.6, carPos.y + 1.85, ease2),
          THREE.MathUtils.lerp(carPos.z - 3.5, 12.0, ease2)
        );
        const lookTarget = new THREE.Vector3().lerpVectors(
          new THREE.Vector3(carPos.x, carPos.y + 1.1, carPos.z),
          new THREE.Vector3(0.0, 1.8, 17.5),
          ease2
        );
        cameraRef.lookAt(lookTarget);
      }
    } else {
      // Stage 2 - 4: Standard smooth cinematic lerp
      const stageProgress = (cutsceneTime - stage.start) / (stage.end - stage.start);
      const easeProg = 0.5 - 0.5 * Math.cos(stageProgress * Math.PI);

      cameraRef.position.lerpVectors(stage.camStart, stage.camEnd, easeProg);
      const lookTarget = new THREE.Vector3().lerpVectors(stage.lookStart, stage.lookEnd, easeProg);
      cameraRef.lookAt(lookTarget);
    }
  }
}

export function finishCutscene() {
  if (!isCinematicActive || activeCutsceneType !== 'intro') return;
  isCinematicActive = false;

  // Keep Honda Civic parked at Coldbrook entrance with headlights on as their vehicle
  if (cutsceneCivicCar) {
    cutsceneCivicCar.setPassengersVisible(false);
    const gyCar = (typeof getTerrainHeight === 'function') ? getTerrainHeight(1.85, 13.5) : 0;
    cutsceneCivicCar.root.position.set(1.85, gyCar, 13.5);
    cutsceneCivicCar.update(0, 0, false, 0);
  }
  if (sfxRef && sfxRef.stopCarEngineAudio) {
    sfxRef.stopCarEngineAudio();
  }

  // Clean up vintage truck & Old Thomas
  if (cutsceneTruck && scene) {
    scene.remove(cutsceneTruck);
    cutsceneTruck = null;
  }
  if (cutsceneOldThomas && scene) {
    scene.remove(cutsceneOldThomas);
    cutsceneOldThomas = null;
  }

  // Keep cutsceneVillageGate as a permanent entrance landmark in the world

  // Remove dropped shotgun if any
  if (cutsceneDroppedShotgun && scene) {
    scene.remove(cutsceneDroppedShotgun);
    cutsceneDroppedShotgun = null;
  }

  // Reset player model to standard upright stance
  setPlayerCutscenePose('reset');
  if (state && state.player) state.player.isInvulnerable = false;

  // Position Kristin beside player ready for escort mode
  const gyK = (typeof getTerrainHeight === 'function') ? getTerrainHeight(1.2, 13.8) : 0.1;
  if (kristinModel && kristinModel.root) {
    kristinModel.root.position.set(1.2, gyK, 13.8);
    kristinModel.root.rotation.set(0, -0.35, 0);
    if (kristinModel.setWeapon) kristinModel.setWeapon('unarmed');
  }

  // Restore camera to default player eye-level spawn facing into Coldbrook Village (negative Z)
  const gyP = (typeof getTerrainHeight === 'function') ? getTerrainHeight(0, 14.0) : 0.1;
  playerPos.set(0, gyP, 14.0);
  if (cameraRef) {
    cameraRef.position.set(0, gyP + 1.8, 14.0);
    setPlayerYawPitch(0, 0);
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

  // Activate Orientasi Objective: Eksplorasi & Wawancara Warga
  setObjective('orientation');
  window.__STORY_PHASE = 'orientation';

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

  // Protect player from damage during cutscene
  if (state && state.player) {
    state.player.isInvulnerable = true;
  }

  // Create tactical helicopter in scene
  if (!activeHelicopter && scene) {
    activeHelicopter = createTacticalHelicopter();
    scene.add(activeHelicopter.root);
  }

  const px = (typeof playerPos !== 'undefined' && playerPos) ? playerPos.x : (cameraRef ? cameraRef.position.x : 0);
  const pz = (typeof playerPos !== 'undefined' && playerPos) ? playerPos.z : (cameraRef ? cameraRef.position.z : 14.0);
  const pgy = (typeof getTerrainHeight === 'function' ? getTerrainHeight(px, pz) : 0);

  // Push nearby zombies back away from cutscene drop zone
  if (zombies && zombies.length) {
    for (let i = 0; i < zombies.length; i++) {
      const z = zombies[i];
      if (!z || z.isDead) continue;
      const dx = z.x - px;
      const dz = z.z - pz;
      const dist = Math.hypot(dx, dz);
      if (dist < 20.0) {
        const pushAng = (dist > 0.1) ? Math.atan2(dx, dz) : Math.random() * Math.PI * 2;
        z.x = px + Math.sin(pushAng) * (20.0 + Math.random() * 4.0);
        z.z = pz + Math.cos(pushAng) * (20.0 + Math.random() * 4.0);
        if (z.model && z.model.root) {
          const gy = (typeof getTerrainHeight === 'function' ? getTerrainHeight(z.x, z.z) : 0);
          z.model.root.position.set(z.x, gy, z.z);
        }
      }
    }
  }

  // Widen fog distance temporarily so helicopter approach is visible through misty atmosphere
  if (scene && scene.fog) {
    scene.fog.far = 52.0;
  }

  // Position helicopter starting in sky within camera frustum
  if (activeHelicopter) {
    activeHelicopter.root.position.set(px - 22, pgy + 16, pz + 24);
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
        THREE.MathUtils.lerp(px - 22, hoverX, ease),
        THREE.MathUtils.lerp(pgy + 16, hoverY, ease),
        THREE.MathUtils.lerp(pz + 24, hoverZ, ease)
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
        if (sfxRef && sfxRef.playPistolShot) sfxRef.playPistolShot();
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

  // Restore dense fog distance
  if (scene && scene.fog) {
    scene.fog.far = 18.0;
  }

  // Restore player invulnerability
  if (state && state.player) {
    state.player.isInvulnerable = false;
  }

  // Restore camera orientation smoothly towards Natalia without mouse snap
  if (cameraRef) {
    cameraRef.position.set(px, (typeof getTerrainHeight === 'function' ? getTerrainHeight(px, pz) : 0) + 1.8, pz);
    const cdx = dropX - px;
    const cdz = dropZ - pz;
    const targetYaw = Math.atan2(-cdx, -cdz);
    setPlayerYawPitch(targetYaw, 0.05);
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
