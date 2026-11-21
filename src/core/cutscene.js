/* =========================================================================
   CINEMATIC INTRO CUTSCENE & STORY PRESENTATION
   - University student research expedition unearths ancient dark magic
   - Dark occult shockwave erupts, leaving player unconscious in the snow
   - Companion Kristin stands guard vigilant with shotgun against the undead horde
   - Player stirs, regains consciousness, and rises to feet into FPS perspective
   ========================================================================= */

import {
  getTerrainHeight,
  colliders
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
let parkedCarCollider = null;
let activeBossRef = null;
let activeHelicopter = null;

const NONA_BATAVIA_STAGES = [
  // 1. GRAND REVELATION: Camera pushes in directly facing Nona Batavia towering in mist
  {
    start: 0.0,
    end: 4.2,
    getCamStart: (bx, by, bz, px, py, pz) => {
      const dx = bx - px, dz = bz - pz;
      const d = Math.sqrt(dx * dx + dz * dz) || 1;
      const nx = dx / d, nz = dz / d;
      return new THREE.Vector3(bx - nx * 7.8, by - 0.8, bz - nz * 7.8);
    },
    getCamEnd: (bx, by, bz, px, py, pz) => {
      const dx = bx - px, dz = bz - pz;
      const d = Math.sqrt(dx * dx + dz * dz) || 1;
      const nx = dx / d, nz = dz / d;
      return new THREE.Vector3(bx - nx * 3.6, by + 0.3, bz - nz * 3.6);
    },
    getLookStart: (bx, by, bz) => new THREE.Vector3(bx, by + 1.2, bz),
    getLookEnd: (bx, by, bz) => new THREE.Vector3(bx, by + 1.35, bz),
    subtitle: `<div style="text-align:center;">
      <div style="color:#ff3344; font-size:15px; letter-spacing:5px; font-weight:bold; text-shadow:0 0 10px #f00;">✦ SPECTRAL ENTITY MANIFESTED ✦</div>
      <div style="color:#ffffff; font-size:36px; font-weight:900; letter-spacing:3px; text-shadow:0 0 25px rgba(255,20,50,0.95), 2px 2px 0 #000; font-family:'Times New Roman', serif;">NONA BATAVIA</div>
      <div style="color:#ffd15c; font-size:18px; font-style:italic; letter-spacing:2px; text-shadow:0 0 8px rgba(255,200,50,0.8);">"Arwah Penasaran Berkebaya Merah"</div>
    </div>`,
    onEnter: (sfx) => {
      if (sfx) {
        if (sfx.playNonaBataviaScream) sfx.playNonaBataviaScream();
        else if (sfx.playLadyMithrillScream) sfx.playLadyMithrillScream();
        if (sfx.playChurchBellToll) sfx.playChurchBellToll();
      }
    }
  },
  // 2. TACTICAL REACTION: Shotgun rack & urgent warning from companion
  {
    start: 4.2,
    end: 7.8,
    getCamStart: (bx, by, bz, px, py, pz) => {
      const dx = bx - px, dz = bz - pz;
      const d = Math.sqrt(dx * dx + dz * dz) || 1;
      const nx = dx / d, nz = dz / d;
      const perpX = -nz, perpZ = nx;
      return new THREE.Vector3(px - nx * 2.2 + perpX * 1.2, py + 1.2, pz - nz * 2.2 + perpZ * 1.2);
    },
    getCamEnd: (bx, by, bz, px, py, pz) => new THREE.Vector3(px, py, pz),
    getLookStart: (bx, by, bz) => new THREE.Vector3(bx, by + 0.8, bz),
    getLookEnd: (bx, by, bz) => new THREE.Vector3(bx, by + 0.3, bz),
    subtitle: `<span style="color:#5cf0a5; font-size:22px; font-weight:bold;">KRISTIN:</span> "YA TUHAN, ROD...! Nona Batavia bangkit melayang di atas! SIAPKAN SHOTGUN, TEMBAK DIA JATUH!"`,
    onEnter: (sfx) => {
      if (sfx && sfx.playPumpRack) sfx.playPumpRack();
    }
  }
];

const CUTSCENE_STAGES = [
  // 1. RODRICK MENYETIR (Shot langsung ke Rodrick di kursi kemudi)
  {
    start: 0.0,
    end: 4.5,
    type: 'car_rodrick',
    subtitle: `<span style="color:#a8c4da; font-size:14px; letter-spacing:2px; font-family:serif;">BLACKWOOD MOORS HIGHWAY — MENUJU COLDBROOK</span><br><span style="color:#d8b26e; font-size:21px; font-weight:bold;">RODRICK (Perekam Suara):</span> <i>*deru mesin Honda Civic & derak kaset pita*</i> "Catatan lapangan hari pertama. Kita baru saja menyusuri jalan Blackwood Moors menuju Coldbrook..."`,
    onEnter: (sfx) => {
      if (sfx && sfx.playChurchBellToll) sfx.playChurchBellToll();
    }
  },
  // 2. KRISTIN BERBICARA (Shot langsung ke Kristin di kursi penumpang)
  {
    start: 4.5,
    end: 8.5,
    type: 'car_kristin',
    subtitle: `<span style="color:#5cf0a5; font-size:21px; font-weight:bold;">KRISTIN:</span> "Dan dua minggu penelitian sampel air sumur! Jangan lupa riset lingkungan gue juga wajib masuk publikasi ilmiah, Rod!"`,
    onEnter: (sfx) => {}
  },
  // 3. MOBIL TIBA DI DEPAN GERBANG (Shot pelan mobil & gapura Gothic Coldbrook)
  {
    start: 8.5,
    end: 12.0,
    type: 'car_arrival',
    subtitle: `<span style="color:#a8c4da; font-size:14px; letter-spacing:2px; font-family:serif;">GERBANG PERBATASAN DESA COLDBROOK</span><br><span style="color:#d8b26e; font-size:19px; font-weight:bold;">RODRICK:</span> "Mesin mati. Kita sudah sampai di depan gerbang perbatasan... lihat orang tua yang berdiri di bawah gerbang itu."`,
    onEnter: (sfx) => {
      if (sfx && sfx.playSnowStep) sfx.playSnowStep();
    }
  },
  // 4. OLD THOMAS / KEPALA DESA MENYAMBUT (Shot close-up langsung ke Old Thomas & cawannya)
  {
    start: 12.0,
    end: 17.0,
    type: 'old_thomas',
    subtitle: `<span style="color:#f0ebe0; font-size:21px; font-weight:bold;">OLD THOMAS (Warga Sepuh Gerbang):</span> <i>*senyum lebar ganjil & menyodorkan cawan air*</i> "Selamat datang di Coldbrook, anak-anak muda... Basuhlah tenggorokan kalian dengan air suci sumur biara. Pastor Raksha selalu membuka pintu..."`,
    onEnter: (sfx) => {
      if (sfx && sfx.playZombieGroan) sfx.playZombieGroan();
    }
  },
  // 5. RODRICK CURIGA DENGAN GERAK-GERIK WARGA (Shot langsung ke Rodrick di luar mobil)
  {
    start: 17.0,
    end: 21.0,
    type: 'rodrick_standing',
    subtitle: `<span style="color:#d8b26e; font-size:21px; font-weight:bold;">RODRICK:</span> "Tatapannya kosong... dan senyumnya kaku seperti topeng. Intonasi bicaranya tidak wajar sama sekali."`,
    onEnter: (sfx) => {
      if (sfx && sfx.playSnowStep) sfx.playSnowStep();
    }
  },
  // 6. KRISTIN MEMPERINGATKAN RACUN DI AIR (Shot langsung ke Kristin)
  {
    start: 21.0,
    end: 26.0,
    type: 'kristin_standing',
    subtitle: `<span style="color:#5cf0a5; font-size:21px; font-weight:bold;">KRISTIN:</span> <i>*reagen kimia berubah keruh pekat*</i> "Rod, gawat! Sampel air dari cawan itu... ada zat narkotik dan racun pembusuk saraf! Otak warga di sini dicuci perlahan oleh air sumur biara!"`,
    onEnter: (sfx) => {
      if (sfx && sfx.playSnowStep) sfx.playSnowStep();
    }
  },
  // 7. OLD THOMAS BERGUMAM DENGAN SENYUM GANJIL (Shot close-up kembali ke wajah Old Thomas)
  {
    start: 26.0,
    end: 30.0,
    type: 'old_thomas_creepy',
    subtitle: `<span style="color:#f0ebe0; font-size:21px; font-weight:bold;">OLD THOMAS:</span> <i>*senyum membeku tanpa kedip*</i> "Semua dosa... telah dibasuh oleh Pastor Raksha... Tidak ada rasa sakit di Coldbrook..."`,
    onEnter: (sfx) => {}
  },
  // 8. SHOT KE RUMAH-RUMAH WARGA & PONDOK DARRELL (Shot kamera ke arah rumah-rumah desa)
  {
    start: 30.0,
    end: 36.0,
    type: 'village_houses',
    subtitle: `<span style="color:#5cf0a5; font-size:20px; font-weight:bold;">KRISTIN:</span> "Kita harus lekas menuju rumah Darrell si pemburu di pondok timur itu! Dia warga yang masih sadar!"<br><span style="color:#d8b26e; font-size:20px; font-weight:bold;">RODRICK:</span> "Ayo kita telusuri rumah-rumah warga di depan. Tetap waspada, siapkan senjata!"`,
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
  if (parkedCarCollider) {
    const idx = colliders.indexOf(parkedCarCollider);
    if (idx !== -1) colliders.splice(idx, 1);
    parkedCarCollider = null;
  }
  if (cutsceneCivicCar) {
    cutsceneCivicCar.dispose();
    cutsceneCivicCar = null;
  }
  if (cutsceneTruck && scene) {
    scene.remove(cutsceneTruck);
    cutsceneTruck = null;
  }
  cutsceneCivicCar = createHondaCivicCar();
  const gyCar = (typeof getTerrainHeight === 'function') ? getTerrainHeight(0.0, -52.0) : 0;
  cutsceneCivicCar.root.position.set(0.0, gyCar, -52.0);
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
  const gyThomas = (typeof getTerrainHeight === 'function') ? getTerrainHeight(1.8, 17.5) : 0;
  cutsceneOldThomas.position.set(1.8, gyThomas, 17.5);
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

  // Dramatic "WAH" Blood-Red Flash vignette on canvas
  const canvas = document.getElementById('ps1-canvas') || document.querySelector('canvas');
  if (canvas) {
    canvas.style.transition = 'filter 0.15s ease-out';
    canvas.style.filter = 'contrast(170%) saturate(220%) drop-shadow(0 0 24px #ff0022)';
    setTimeout(() => {
      if (canvas) {
        canvas.style.transition = 'filter 1.2s ease-in-out';
        canvas.style.filter = '';
      }
    }, 500);
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

  const bx = activeBossRef.x;
  const by = activeBossRef.y;
  const bz = activeBossRef.z;
  const px = (typeof playerPos !== 'undefined' && playerPos) ? playerPos.x : (cameraRef ? cameraRef.position.x : 0);
  const pz = (typeof playerPos !== 'undefined' && playerPos) ? playerPos.z : (cameraRef ? cameraRef.position.z : 0);
  const py = (typeof getTerrainHeight === 'function' ? getTerrainHeight(px, pz) : 0) + 1.8;

  // Imposing phantom levitation (strictly faces player, ZERO spinning!)
  const root = activeBossRef.model.root;
  root.position.y = activeBossRef.y + Math.sin(cutsceneTime * 1.8) * 0.22;
  const bdx = px - bx;
  const bdz = pz - bz;
  const facePlayerYaw = Math.atan2(bdx, bdz);
  root.rotation.set(0, facePlayerYaw, 0);

  if (cutsceneTime >= 7.8) {
    finishNonaBataviaCutscene();
    return;
  }

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
  if (cutsceneTime < 12.0) {
    // Stage 1 - 3: Driving on highway toward Coldbrook gate
    const driveT = Math.min(1.0, cutsceneTime / 11.5);
    const easeDrive = driveT * (2 - driveT); // Smooth deceleration as car approaches gate
    const carZ = THREE.MathUtils.lerp(-52.0, 5.0, easeDrive);
    const carX = THREE.MathUtils.lerp(0.0, 3.2, driveT * driveT);
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
    // Stage 4 - 8: Car is parked at road shoulder, Rodrick & Kristin have stepped out
    if (cutsceneCivicCar && cutsceneCivicCar.root) {
      const gyCar = (typeof getTerrainHeight === 'function') ? getTerrainHeight(3.2, 5.0) : 0;
      cutsceneCivicCar.root.position.set(3.2, gyCar, 5.0);
      cutsceneCivicCar.update(dt, 0, false, cutsceneTime);
      cutsceneCivicCar.setPassengersVisible(false); // Stepped out
      if (sfxRef && sfxRef.updateCarEnginePitch) sfxRef.updateCarEnginePitch(0.80);
    }

    const gyP = (typeof getTerrainHeight === 'function') ? getTerrainHeight(-0.55, 14.2) : 0;
    const gyK = (typeof getTerrainHeight === 'function') ? getTerrainHeight(0.55, 14.4) : 0;
    playerPos.set(-0.55, gyP, 14.2);

    if (playerMeshRoot) {
      playerMeshRoot.visible = true;
      const breath = Math.sin(cutsceneTime * 2.2) * 0.012;
      playerMeshRoot.position.set(-0.55, gyP + breath, 14.2);

      if (cutsceneTime >= 21.0 && cutsceneTime < 26.0) {
        // Rodrick turns to face Kristin when she whispers about tainted water
        playerMeshRoot.rotation.y = THREE.MathUtils.lerp(playerMeshRoot.rotation.y, Math.PI - 0.55, dt * 3.0);
      } else if (cutsceneTime >= 30.0) {
        // Rodrick turns toward village houses trail
        playerMeshRoot.rotation.y = THREE.MathUtils.lerp(playerMeshRoot.rotation.y, -0.45, dt * 2.5);
      } else {
        // Face forward toward Old Thomas & Coldbrook gate
        playerMeshRoot.rotation.y = THREE.MathUtils.lerp(playerMeshRoot.rotation.y, Math.PI - 0.05, dt * 3.0);
      }
      setPlayerCutscenePose('intro');
    }

    if (kristinModel && kristinModel.root) {
      kristinModel.root.visible = true;
      kristinModel.root.position.set(0.55, gyK, 14.4);
      if (cutsceneTime >= 21.0 && cutsceneTime < 26.0) {
        // Kristin turns toward Rodrick to explain chemical analysis
        kristinModel.root.rotation.y = THREE.MathUtils.lerp(kristinModel.root.rotation.y, -0.65, dt * 3.0);
      } else if (cutsceneTime >= 30.0) {
        // Kristin turns to look down the village trail toward Darrell's cabin
        kristinModel.root.rotation.y = THREE.MathUtils.lerp(kristinModel.root.rotation.y, -0.35, dt * 2.5);
      } else {
        // Face forward toward Old Thomas
        kristinModel.root.rotation.y = THREE.MathUtils.lerp(kristinModel.root.rotation.y, 0.10, dt * 3.0);
      }
      animateKristinCutsceneStep(dt, false);
    }
  }

  if (cutsceneTime >= 36.0) {
    finishCutscene();
    return;
  }

  // 4. Object- & Character-Focused Camera Choreography & Subtitles
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

    const sT = Math.max(0, Math.min(1.0, (cutsceneTime - stage.start) / (stage.end - stage.start)));
    const easeProg = sT * sT * (3 - 2 * sT);

    const carPos = cutsceneCivicCar && cutsceneCivicCar.root ? cutsceneCivicCar.root.position : new THREE.Vector3(0, 0, 0);
    const gyThomas = (typeof getTerrainHeight === 'function') ? getTerrainHeight(1.8, 17.5) : 0;
    const gyP = (typeof getTerrainHeight === 'function') ? getTerrainHeight(-0.55, 14.2) : 0;
    const gyK = (typeof getTerrainHeight === 'function') ? getTerrainHeight(0.55, 14.4) : 0;

    switch (stage.type) {
      case 'car_rodrick':
        // 1. Shot langsung ke Rodrick di kursi kemudi
        cameraRef.position.set(
          carPos.x + 0.52 - sT * 0.10,
          carPos.y + 1.25,
          carPos.z + 2.10 + sT * 0.20
        );
        cameraRef.lookAt(carPos.x + 0.46, carPos.y + 1.05, carPos.z - 0.40);
        break;

      case 'car_kristin':
        // 2. Cut langsung ke Kristin di kursi penumpang
        cameraRef.position.set(
          carPos.x - 0.48 + sT * 0.10,
          carPos.y + 1.22,
          carPos.z + 2.05 + sT * 0.20
        );
        cameraRef.lookAt(carPos.x - 0.46, carPos.y + 1.02, carPos.z - 0.40);
        break;

      case 'car_arrival':
        // 3. Tracking shot mobil tiba & mengerem di depan gerbang Gothic
        cameraRef.position.set(
          THREE.MathUtils.lerp(carPos.x + 3.0, 2.2, easeProg),
          THREE.MathUtils.lerp(carPos.y + 1.6, 2.1, easeProg),
          THREE.MathUtils.lerp(carPos.z - 3.2, 10.5, easeProg)
        );
        const lookArrival = new THREE.Vector3().lerpVectors(
          new THREE.Vector3(carPos.x, carPos.y + 1.0, carPos.z + 1.5),
          new THREE.Vector3(0.0, 2.3, 18.0),
          easeProg
        );
        cameraRef.lookAt(lookArrival);
        break;

      case 'old_thomas':
        // 4. Shot close-up langsung ke Old Thomas (kepala desa / tetua) menyodorkan cawan
        cameraRef.position.set(
          THREE.MathUtils.lerp(1.35, 1.48, easeProg),
          THREE.MathUtils.lerp(gyThomas + 1.58, gyThomas + 1.55, easeProg),
          THREE.MathUtils.lerp(15.4, 15.9, easeProg)
        );
        cameraRef.lookAt(1.80, gyThomas + 1.52, 17.50);
        break;

      case 'rodrick_standing':
        // 5. Shot langsung ke Rodrick mengamati situasi
        cameraRef.position.set(
          THREE.MathUtils.lerp(-0.12, -0.22, easeProg),
          THREE.MathUtils.lerp(gyP + 1.62, gyP + 1.60, easeProg),
          THREE.MathUtils.lerp(12.6, 12.9, easeProg)
        );
        cameraRef.lookAt(-0.55, gyP + 1.56, 14.20);
        break;

      case 'kristin_standing':
        // 6. Shot langsung ke Kristin saat memperingatkan Rodrick tentang racun di air
        cameraRef.position.set(
          THREE.MathUtils.lerp(0.15, 0.26, easeProg),
          THREE.MathUtils.lerp(gyK + 1.56, gyK + 1.58, easeProg),
          THREE.MathUtils.lerp(12.9, 13.2, easeProg)
        );
        cameraRef.lookAt(0.55, gyK + 1.52, 14.40);
        break;

      case 'old_thomas_creepy':
        // 7. Low-angle shot intens ke senyum kaku Old Thomas
        cameraRef.position.set(
          THREE.MathUtils.lerp(1.55, 1.68, easeProg),
          THREE.MathUtils.lerp(gyThomas + 1.42, gyThomas + 1.48, easeProg),
          THREE.MathUtils.lerp(16.2, 16.6, easeProg)
        );
        cameraRef.lookAt(1.80, gyThomas + 1.60, 17.50);
        break;

      case 'village_houses':
        // 8. Shot kamera melayang & panning ke arah pondok Darrell & rumah-rumah desa Coldbrook
        cameraRef.position.set(
          THREE.MathUtils.lerp(0.4, 1.6, easeProg),
          THREE.MathUtils.lerp(2.6, 4.2, easeProg),
          THREE.MathUtils.lerp(15.5, 5.0, easeProg)
        );
        const lookVillage = new THREE.Vector3().lerpVectors(
          new THREE.Vector3(1.0, 2.0, 10.0),
          new THREE.Vector3(18.0, 2.8, 6.0),
          easeProg
        );
        cameraRef.lookAt(lookVillage);
        break;

      default:
        break;
    }
  }
}

export function finishCutscene() {
  if (!isCinematicActive || activeCutsceneType !== 'intro') return;
  isCinematicActive = false;

  // Keep Honda Civic parked at Coldbrook entrance with headlights on as their vehicle
  if (cutsceneCivicCar) {
    cutsceneCivicCar.setPassengersVisible(false);
    const gyCar = (typeof getTerrainHeight === 'function') ? getTerrainHeight(3.2, 5.0) : 0;
    cutsceneCivicCar.root.position.set(3.2, gyCar, 5.0);
    cutsceneCivicCar.update(0, 0, false, 0);

    // Register car physical boundary so player and Kristin cannot clip through it
    if (!parkedCarCollider) {
      parkedCarCollider = {
        minX: 3.2 - 1.25,
        maxX: 3.2 + 1.25,
        minZ: 5.0 - 2.6,
        maxZ: 5.0 + 2.6
      };
      colliders.push(parkedCarCollider);
    }
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
  const gyK = (typeof getTerrainHeight === 'function') ? getTerrainHeight(0.65, 13.8) : 0.1;
  if (kristinModel && kristinModel.root) {
    kristinModel.root.position.set(0.65, gyK, 13.8);
    kristinModel.root.rotation.set(0, -0.35, 0);
    if (kristinModel.setWeapon) kristinModel.setWeapon('unarmed');
  }

  // Restore camera to default player eye-level spawn facing into Coldbrook Village (negative Z)
  const gyP = (typeof getTerrainHeight === 'function') ? getTerrainHeight(-0.45, 14.0) : 0.1;
  playerPos.set(-0.45, gyP, 14.0);
  if (cameraRef) {
    cameraRef.position.set(-0.45, gyP + 1.8, 14.0);
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

  // Dramatic "WAH" Blood-Red Flash vignette on canvas
  const canvas = document.getElementById('ps1-canvas') || document.querySelector('canvas');
  if (canvas) {
    canvas.style.transition = 'filter 0.15s ease-out';
    canvas.style.filter = 'contrast(170%) saturate(220%) drop-shadow(0 0 24px #ff0022)';
    setTimeout(() => {
      if (canvas) {
        canvas.style.transition = 'filter 1.2s ease-in-out';
        canvas.style.filter = '';
      }
    }, 500);
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
