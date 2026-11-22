/* =========================================================================
   PLAYER CONTROLS & SHOOTING ARSENAL (PURE FPS GAMEPLAY)
   Movement, weapon switching, raycasting, shotgun breaching, melee
   ========================================================================= */

import { gameSettings, saveSettings } from '../config/settings.js';
import { Sfx } from '../audio/sfx.js';
import {
  weaponHolder,
  pumpShotgunGroup,
  spinShotgunGroup,
  golokGroup,
  pumpFire,
  spinFire,
  showMuzzleFire,
  slashTrailMat,
  weaponSpin,
  meleeSwing
} from '../entities/weapons.js';
import {
  bloodDecals,
  deadCorpses,
  airborneDrips,
  curseProjectiles,
  woodSplinters,
  spawnBloodPoolOnSnow,
  createAirborneBloodDrop,
  clearBossDeathEffects
} from '../entities/effects.js';
import {
  zombies,
  currentBoss,
  spawnWinterZombie,
  spawnVictorianBride,
  spawnSisterValentinaBoss,
  spawnLadyMithrillBoss,
  spawnNonaBataviaBoss,
  killZombieWithKinematics,
  clearEnemies
} from '../entities/enemies.js';
import {
  lockedDoors,
  blastOpenDoor,
  checkWallCollision,
  respawnHousePickups,
  showPickupAlert,
  getTerrainHeight,
  MAP_LIMIT,
  setEndlessEnvironment
} from '../world/environment.js';
import { updateHUD, showLifeLostAlert, triggerGameOver } from '../ui/hud.js';
import { openSettings, closeSettings, isSettingsOpen } from '../ui/settingsMenu.js';
import { toggleMap, closeMap, isMapOpen } from '../ui/mapMenu.js';
import { isBestiaryOpen, toggleBestiary, closeBestiary } from './bestiary.js';
import { triggerKristinGesture, toggleCompanionFollow, kristinModel, giveKristinHint, showDialogSubtitle } from '../entities/kristin.js';
import { triggerNataliaGesture, toggleNataliaFollow, nataliaModel } from '../entities/natalia.js';
import { startIntroCutscene, isCinematicActive } from './cutscene.js';
import { updateTouchControlsVisibility } from '../ui/touchControls.js';
import { setObjective, getActiveObjective, updateQuestHUD } from './quest.js';
import { getNearestVillager, spawnVillageNPCs } from '../entities/villager.js';
import { openStoryDialogue, isStoryDialogueOpen, advanceStoryDialogue, closeStoryDialogue } from './dialogueSystem.js';
import {
  buildSurvivorPlayerModel,
  updatePlayerModelAnimation,
  updateHorrorCamera,
  cameraMode,
  toggleCameraMode,
  playerMeshRoot
} from '../entities/playerModel.js';

const THREE = window.THREE;

// High-performance reusable scratch instances (Zero garbage collection churn)
const _sharedRaycaster = new THREE.Raycaster();
const _tempOrigin = new THREE.Vector3();
const _tempDir = new THREE.Vector3();
const _tempHeadWorld = new THREE.Vector3();
const _tempTorsoWorld = new THREE.Vector3();
const _tempPushDir = new THREE.Vector3();
const _tempPPos = new THREE.Vector3();
const _tempFwd = new THREE.Vector3();
const _tempToZ = new THREE.Vector3();
const _tempNorm = new THREE.Vector3();

export const state = {
  running: false,
  isPaused: false,
  score: 0,
  kills: 0,
  lastLadyMithrillKills: 0,
  nataliaSpawned: false,
  wave: 1,
  gameMode: 'story', // 'story' | 'endless'
  storyPhase: 'orientation', // 'orientation' | 'complication' | 'resolution' | 'coda'
  talkedVillagers: new Set(),
  resolutionKills: 0,
  player: {
    lives: 3,
    maxLives: 3,
    hp: 100,
    walkSpeed: 9.0,
    sprintSpeed: 15.0,
    weapon: gameSettings.weapon || 'spin',
    clip: 60,
    maxClip: 60,
    reserve: 240,
    isReloading: false,
    lastFired: 0,
    isInvulnerable: false
  }
};
window.__GAME_MODE = state.gameMode;
window.__STORY_PHASE = state.storyPhase;

export const keys = { w: false, a: false, s: false, d: false, shift: false };
export const touchMove = { x: 0, z: 0, active: false };
export const pVel = new THREE.Vector3();
export const playerPos = new THREE.Vector3(0, 0, 14);
export let isGrounded = true;
export let yaw = 0;
export let pitch = 0;

export function setIsGrounded(val) {
  isGrounded = !!val;
}

export function triggerPlayerJump() {
  if (state.running && !state.isPaused) {
    if (window.__PLAYER_SWIMMING) {
      // Swimming upward water stroke kick
      pVel.y = 4.2;
      playerPos.y += 0.08;
      if (Sfx && Sfx.playWaterSplash) Sfx.playWaterSplash();
      return;
    }
    if (isGrounded) {
      pVel.y = 7.0;
      playerPos.y += 0.04;
      isGrounded = false;
      if (Sfx && Sfx.playSnowStep) Sfx.playSnowStep();
    }
  }
}

export function triggerPlayerAttack() {
  if (!state.running || state.isPaused || isSettingsOpen) return;
  fireCombatShotgun();
}

export function addLookDelta(dx, dy) {
  if (!state.running || state.isPaused || !cameraRef) return;
  const sens = 0.0032 * (gameSettings.sensitivity || 1.0);
  yaw -= dx * sens;
  pitch -= dy * sens;
  pitch = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, pitch));
  if (cameraRef) {
    cameraRef.rotation.y = yaw;
    cameraRef.rotation.x = pitch;
  }
}

export function setPlayerYawPitch(newYaw, newPitch = 0) {
  yaw = newYaw;
  pitch = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, newPitch));
  if (cameraRef) {
    cameraRef.rotation.order = 'YXZ';
    cameraRef.rotation.y = yaw;
    cameraRef.rotation.x = pitch;
    cameraRef.rotation.z = 0;
  }
}

export function triggerInteract() {
  if (!state.running || state.isPaused) return;

  if (isStoryDialogueOpen()) {
    advanceStoryDialogue();
    return;
  }

  // 1. Check interactive village NPCs during Orientation
  const nearestVillager = getNearestVillager(playerPos, 3.8);
  if (nearestVillager && state.storyPhase === 'orientation') {
    openStoryDialogue(nearestVillager, (talkedNPC) => {
      handleVillagerTalked(talkedNPC);
    });
    return;
  }

  // 2. Otherwise trigger Kristin/Natalia companion gesture
  if (state.nataliaSpawned && nataliaModel && kristinModel) {
    const dNatalia = playerPos.distanceTo(nataliaModel.root.position);
    const dKristin = playerPos.distanceTo(kristinModel.root.position);
    if (dNatalia < 6.5 && dNatalia <= dKristin) {
      triggerNataliaGesture();
    } else if (dKristin < 6.5) {
      triggerKristinGesture();
    }
  } else if (state.nataliaSpawned && nataliaModel && playerPos.distanceTo(nataliaModel.root.position) < 6.5) {
    triggerNataliaGesture();
  } else if (kristinModel && playerPos.distanceTo(kristinModel.root.position) < 6.5) {
    triggerKristinGesture();
  } else {
    triggerKristinGesture();
  }
}
window.__triggerInteract = triggerInteract;

let cameraRef = null;
let sceneRef = null;

export function initPlayer(camera, scene) {
  cameraRef = camera;
  sceneRef = scene;
  playerPos.set(0, 0, 14);
  camera.position.set(0, 1.8, 14);
  if (scene) {
    const pModel = buildSurvivorPlayerModel();
    pModel.visible = (cameraMode === 'tps');
    scene.add(pModel);
  }
}

export function switchWeapon(weaponType) {
  const target = weaponType || state.player.weapon || 'unarmed';
  state.player.weapon = target;
  gameSettings.weapon = target;
  saveSettings();

  const nameEl = document.getElementById('hud-weapon-name');

  if (target === 'unarmed') {
    pumpShotgunGroup.visible = false;
    spinShotgunGroup.visible = false;
    golokGroup.visible = false;
    state.player.maxClip = 0;
    state.player.clip = 0;
    state.player.reserve = 0;
    if (nameEl) {
      nameEl.innerText = 'TANGAN KOSONG';
      nameEl.style.color = '#a9b7c6';
    }
  } else if (target === 'pump') {
    pumpShotgunGroup.visible = true;
    spinShotgunGroup.visible = false;
    golokGroup.visible = false;
    state.player.maxClip = 8;
    if (state.player.clip > 8) state.player.clip = 8;
    if (nameEl) {
      nameEl.innerText = 'DARRELL\'S SHOTGUN';
      nameEl.style.color = '#78e08f';
    }
  } else if (target === 'spin') {
    pumpShotgunGroup.visible = false;
    spinShotgunGroup.visible = true;
    golokGroup.visible = false;
    state.player.maxClip = 60;
    if (state.player.clip > 60) state.player.clip = 60;
    if (nameEl) {
      nameEl.innerText = 'M1887 LEVER SHOTGUN';
      nameEl.style.color = '#ff9933';
    }
  } else if (target === 'golok') {
    pumpShotgunGroup.visible = false;
    spinShotgunGroup.visible = false;
    golokGroup.visible = true;
    state.player.maxClip = 0;
    state.player.clip = 0;
    if (nameEl) {
      nameEl.innerText = 'HUNTING MACHETE';
      nameEl.style.color = '#ff4455';
    }
  }

  updateHUD(state);
}

window.__equipDarrellShotgun = () => {
  switchWeapon('pump');
};

export function handleVillagerTalked(talkedNPC) {
  if (!talkedNPC) return;
  state.talkedVillagers.add(talkedNPC.id);
  const count = state.talkedVillagers.size;

  // Update HUD Quest Tracker for Orientation
  const obj = getActiveObjective();
  if (obj && state.storyPhase === 'orientation') {
    obj.title = `Wawancara Warga Desa (${count}/3)`;

    // Kristin dynamically directs player to next objective
    if (talkedNPC.id === 'old_thomas') {
      obj.location = 'Pondok Darrell di Timur (Tengkorak Babi Hutan)';
      obj.marker = { x: -11.0, z: -3.5 };
      setTimeout(() => {
        showDialogSubtitle('KRISTIN: "Rod, orang tua tadi aneh banget! Lihat ke arah timur sana—ada pondok kayu berpagar tengkorak babi (Darrell). Ayo kita ke sana!"', 6500);
        triggerKristinGesture('point');
      }, 600);
    } else if (talkedNPC.id === 'darrell') {
      obj.location = 'Mrs. Eleanor di Jalur Barat';
      obj.marker = { x: -28.0, z: 14.0 };
      setTimeout(() => {
        showDialogSubtitle('KRISTIN: "Darrell bilang jangan percaya orang yang terus tersenyum... Sekarang kita ke jalur barat, kita tanya nenek tua di dekat mata air (Mrs. Eleanor)!"', 6500);
        triggerKristinGesture('point');
      }, 600);
    } else {
      setTimeout(() => {
        showDialogSubtitle('KRISTIN: "Ayo kita sapa warga yang ada di persimpangan desa sebelum hari gelap, Rod!"', 5500);
        triggerKristinGesture('point');
      }, 600);
    }

    updateQuestHUD();
  }

  // Trigger complication when at least 3 villagers talked to or Darrell has been talked to and count >= 2
  if (count >= 3 || (state.talkedVillagers.has('darrell') && count >= 2)) {
    setTimeout(() => {
      triggerComplicationPhase();
    }, 1800);
  }
}

export function triggerComplicationPhase() {
  if (state.storyPhase !== 'orientation') return;
  state.storyPhase = 'complication';
  window.__STORY_PHASE = 'complication';
  setObjective('complication');

  // Lonceng biara berdentang kencang bertubi-tubi + erangan zombie
  if (Sfx && Sfx.playChurchBellToll) {
    Sfx.playChurchBellToll();
    setTimeout(() => { if (Sfx && Sfx.playChurchBellToll) Sfx.playChurchBellToll(); }, 2400);
  }
  if (Sfx && Sfx.playZombieGroan) Sfx.playZombieGroan();

  showDialogSubtitle('KRISTIN: "ROD! Sensor hidrologi gue selesai analisis! Air sumur biara itu bukan air suci—itu senyawa neurotoksin kultus! LIHAT WARGA-WARGA ITU BERMUTASI! IKUTI GUE LARI KE PONDOK DARRELL!"', 8000);
  triggerKristinGesture('point');

  // Spawn initial outbreak zombies (Infected Devout)
  setTimeout(() => {
    if (!state.running) return;
    spawnWinterZombie(1.8, 17.5, state); // Old Thomas mutant
    spawnWinterZombie(8.5, -2.0, state); // Edward mutant
    spawnWinterZombie(0.0, 7.0, state);
    spawnWinterZombie(-5.0, 10.0, state);
  }, 1200);
}

window.__triggerDarrellPickup = () => {
  if (state.storyPhase === 'complication' || state.storyPhase === 'orientation') {
    state.storyPhase = 'resolution';
    window.__STORY_PHASE = 'resolution';
    state.resolutionKills = 0;
    setObjective('resolution');
    // Kristin is strictly an unarmed civilian researcher
    if (kristinModel && kristinModel.setWeapon) kristinModel.setWeapon('unarmed');
    showDialogSubtitle('KRISTIN: "Mantap Rod, lo dapet senapannya! Zombie-zombie itu mengepung pintu depan pondok! Habisi mereka semua!"', 6000);
    triggerKristinGesture('point');

    // Spawn zombies besieging Darrell's cottage
    setTimeout(() => {
      if (!state.running) return;
      spawnWinterZombie(-12.8, -1.0, state);
      spawnWinterZombie(-10.5, -2.5, state);
      spawnWinterZombie(-14.5, -2.0, state);
      spawnWinterZombie(-8.5, -5.0, state);
    }, 400);
  } else {
    setObjective('1.2');
    showDialogSubtitle("Mantap Rod, lo nemu shotgun laras ganda Darrell! Sekarang kita cari Mrs. Eleanor di dekat Ancient Spring!", 5500);
  }
};

window.__triggerCodaPhase = () => {
  if (state.storyPhase !== 'resolution') return;
  state.storyPhase = 'coda';
  window.__STORY_PHASE = 'coda';
  setObjective('coda');
  showPickupAlert("PONDOK DARRELL BERHASIL DIAMANKAN!", true);
  if (Sfx && Sfx.playSmallBell) Sfx.playSmallBell(1400, 0.6);

  setTimeout(() => {
    showDialogSubtitle('Coldbrook dikuasai kultus biara. Ayo ikuti gue ke bukit barat, Rod!', 5500);
    triggerKristinGesture('point');
    setObjective('1.2');
  }, 1200);
};

export function performGolokSlash(isQuick = false) {
  const now = performance.now();
  if (meleeSwing.active || now - state.player.lastFired < 280) return;

  if (isQuick && state.player.weapon !== 'golok') {
    meleeSwing.isQuickMelee = true;
    meleeSwing.returnWeapon = state.player.weapon;
    pumpShotgunGroup.visible = false;
    spinShotgunGroup.visible = false;
    golokGroup.visible = true;
  } else {
    meleeSwing.isQuickMelee = false;
    meleeSwing.returnWeapon = null;
  }

  state.player.lastFired = now;
  meleeSwing.active = true;
  meleeSwing.startTime = now;
  meleeSwing.duration = 270;
  meleeSwing.hasHit = false;

  Sfx.playBladeWhoosh();
  slashTrailMat.opacity = 0.8;

  pitch -= 0.02;

  if (!cameraRef) return;
  const pPos = _tempPPos.set(playerPos.x, playerPos.y + 1.2, playerPos.z);
  const fwd = _tempFwd.set(0, 0, -1).applyQuaternion(cameraRef.quaternion);

  for (let i = 0; i < zombies.length; i++) {
    const z = zombies[i];
    if (z.isDead) continue;

    const zPos = z.model.root.position;
    const toZ = _tempToZ.set(zPos.x - pPos.x, (zPos.y + 1.2) - pPos.y, zPos.z - pPos.z);
    const dist = toZ.length();

    if (dist <= 2.9) {
      const normToZ = _tempNorm.copy(toZ).normalize();
      const dot = fwd.dot(normToZ);
      if (dot > 0.35) {
        Sfx.playBladeCleave();

        const isHead = (toZ.y > 0.45);
        const dmg = isHead ? 130 : 65;
        z.hp -= dmg;
        z.staggerTimer = 0.42;
        if (isHead) Sfx.playL4DHeadDecap();
        else Sfx.playL4DStagger();

        if (z.isBoss) {
          const pct = Math.max(0, (z.hp / z.maxHp) * 100);
          const bar = document.getElementById('boss-bar-fill');
          if (bar) bar.style.width = `${pct}%`;
        }

        const pushDir = _tempPushDir.set(fwd.x, 0, fwd.z).normalize();
        z.x += pushDir.x * (z.isBoss ? 0.25 : 0.70);
        z.z += pushDir.z * (z.isBoss ? 0.25 : 0.70);

        spawnBloodPoolOnSnow(zPos.x, zPos.z, 0.85);
        _tempHeadWorld.set(zPos.x, zPos.y + 1.2, zPos.z);
        createAirborneBloodDrop(_tempHeadWorld);

        if (z.hp <= 0 && !z.isDead) {
          killZombieWithKinematics(z, pushDir, dist, isHead, state, () => updateHUD(state), nextWave);
        }
        break;
      }
    }
  }
}

export function reloadWeapon() {
  const p = state.player;
  if (p.weapon === 'unarmed' || p.weapon === 'golok') return;
  if (p.isReloading || p.clip >= p.maxClip) return;
  p.isReloading = true;

  const isSpin = (p.weapon === 'spin');

  // Quick shell insert sound at start
  Sfx.playShellInsert();

  // Fast cock / spin rack audio at 450ms
  setTimeout(() => {
    if (!p.isReloading) return;
    if (isSpin) {
      weaponSpin.active = true;
      weaponSpin.startTime = performance.now();
      weaponSpin.duration = 420;
      Sfx.playSpinCock();
    } else {
      Sfx.playPumpRack();
    }
  }, 450);

  updateHUD(state);

  // EXACTLY 1.0 SECOND RELOAD DURATION (1000ms):
  setTimeout(() => {
    if (!p.isReloading) return;
    const need = p.maxClip - p.clip;
    const take = (p.reserve !== undefined && p.reserve > 0) ? Math.min(need, p.reserve) : need;
    p.clip += take;
    if (p.reserve !== undefined && p.reserve > 0) {
      p.reserve = Math.max(0, p.reserve - take);
    }
    p.isReloading = false;
    updateHUD(state);
  }, 1000);
}

export function fireCombatShotgun() {
  const p = state.player;
  if (p.weapon === 'unarmed') {
    showDialogSubtitle("Aku belum punya senjata! Aku harus cari senapan di Pondok Darrell (ujung jalan timur)!", 3500);
    if (Sfx && Sfx.playSmallBell) Sfx.playSmallBell(1600, 0.4);
    return;
  }
  const now = performance.now();
  const isSpin = (p.weapon === 'spin');
  const fireCooldown = isSpin ? 420 : 480;

  if (p.isReloading || now - p.lastFired < fireCooldown) return;

  if (p.clip <= 0) {
    reloadWeapon();
    return;
  }

  p.lastFired = now;
  p.clip--;
  updateHUD(state);

  Sfx.playShotgun();

  if (isSpin) {
    pitch += 0.088;
    spinShotgunGroup.position.z = -0.34;
    showMuzzleFire(spinFire);

    weaponSpin.active = true;
    weaponSpin.startTime = performance.now();
    weaponSpin.duration = 380;
    setTimeout(() => Sfx.playSpinCock(), 160);
  } else {
    pitch += 0.075;
    pumpShotgunGroup.position.z = -0.38;
    showMuzzleFire(pumpFire);

    setTimeout(() => Sfx.playPumpRack(), 120);
  }

  if (!cameraRef) return;
  const raycaster = _sharedRaycaster;
  const pelletCount = isSpin ? 8 : 7;
  const spreadAngle = isSpin ? 0.088 : 0.075;

  const originPos = cameraMode === 'tps'
    ? _tempOrigin.set(playerPos.x, playerPos.y + 1.65, playerPos.z)
    : _tempOrigin.copy(cameraRef.position);

  for (let pellet = 0; pellet < pelletCount; pellet++) {
    const sprX = (Math.random() - 0.5) * spreadAngle;
    const sprY = (Math.random() - 0.5) * spreadAngle;
    const dir = _tempDir.set(sprX, sprY, -1).normalize().applyQuaternion(cameraRef.quaternion);

    raycaster.set(originPos, dir);
    raycaster.far = isSpin ? 46 : 42;

    for (let d = 0; d < lockedDoors.length; d++) {
      const lDoor = lockedDoors[d];
      if (lDoor.isBroken) continue;
      if (originPos.distanceTo(lDoor.worldPos) < 32) {
        const distToDoor = raycaster.ray.distanceToPoint(lDoor.worldPos);
        if (distToDoor < 1.45) {
          blastOpenDoor(lDoor, state, () => updateHUD(state));
          break;
        }
      }
    }

    for (let i = 0; i < zombies.length; i++) {
      const z = zombies[i];
      if (z.isDead) continue;

      const zPos = z.model.root.position;
      const hitDist = originPos.distanceTo(zPos);

      const headWorld = _tempHeadWorld;
      if (z.model.head) {
        z.model.head.getWorldPosition(headWorld);
      } else {
        headWorld.set(zPos.x, zPos.y + (z.isFloatingBoss ? 1.8 : 1.6), zPos.z);
      }
      const distToHead = raycaster.ray.distanceToPoint(headWorld);

      const torsoY = zPos.y + (z.isFloatingBoss ? (0.85 * (z.model.scale || 1.0)) : (z.isBoss ? 1.6 : 1.15));
      const torsoPos = _tempTorsoWorld.set(zPos.x, torsoY, zPos.z);
      const distToTorso = raycaster.ray.distanceToPoint(torsoPos);

      const zScale = z.model.scale || 1.0;
      let isHeadshot = false;
      let didHit = false;

      if (distToHead < 0.38 * zScale) {
        isHeadshot = true;
        didHit = true;
      } else if (distToTorso < 0.68 * zScale) {
        didHit = true;
      }

      if (didHit) {
        Sfx.playImpactSplat();
        const baseDmg = isSpin ? 36 : 32;
        const headDmg = isSpin ? 75 : 65;
        const dmg = isHeadshot ? headDmg : baseDmg;
        z.hp -= dmg;
        z.staggerTimer = 0.32;
        if (isHeadshot) {
          Sfx.playL4DHeadDecap();
          spawnBloodPoolOnSnow(zPos.x, zPos.z, 0.75);
        } else {
          Sfx.playL4DStagger();
        }

        if (z.isBoss) {
          const pct = Math.max(0, (z.hp / z.maxHp) * 100);
          const bar = document.getElementById('boss-bar-fill');
          if (bar) bar.style.width = `${pct}%`;
        }

        const shotDir = new THREE.Vector3(zPos.x - originPos.x, 0, zPos.z - originPos.z).normalize();
        const pushFactor = isSpin ? (z.isBoss ? 0.12 : 0.30) : (z.isBoss ? 0.08 : 0.22);
        z.x += shotDir.x * pushFactor;
        z.z += shotDir.z * pushFactor;

        spawnBloodPoolOnSnow(zPos.x, zPos.z, 0.65);

        if (z.hp <= 0 && !z.isDead) {
          killZombieWithKinematics(z, shotDir, hitDist, isHeadshot, state, () => updateHUD(state), nextWave);
        }
        break;
      }
    }
  }
}

export function repelNearbyZombies() {
  const pPos = playerPos;
  for (let i = 0; i < zombies.length; i++) {
    const z = zombies[i];
    if (z.isDead) continue;
    const dx = z.x - pPos.x;
    const dz = z.z - pPos.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 7.5 && dist > 0.01) {
      const push = (7.5 - dist) * 1.4;
      z.x += (dx / dist) * push;
      z.z += (dz / dist) * push;
      z.model.root.position.set(z.x, z.model.root.position.y, z.z);
    }
  }
}

export function hitPlayer(dmg) {
  if (!state.running || state.player.isInvulnerable || state.isPaused || isCinematicActive) return;

  let effectiveDmg = dmg;
  if (gameSettings.difficulty === 'easy') effectiveDmg = Math.round(dmg * 0.7);
  else if (gameSettings.difficulty === 'hard') effectiveDmg = Math.round(dmg * 1.4);

  state.player.hp -= effectiveDmg;
  const flash = document.getElementById('damage-flash');
  if (flash) {
    flash.style.opacity = '0.85';
    setTimeout(() => { if (flash) flash.style.opacity = '0'; }, 120);
  }

  if (state.player.hp <= 0) {
    state.player.lives -= 1;
    if (state.player.lives > 0) {
      state.player.hp = 100;
      state.player.isInvulnerable = true;
      Sfx.playLifeLost();
      showLifeLostAlert(state.player.lives);
      repelNearbyZombies();

      setTimeout(() => {
        state.player.isInvulnerable = false;
      }, 2500);
    } else {
      state.player.hp = 0;
      state.player.lives = 0;
      triggerGameOver(state);
    }
  }
  updateHUD(state);
}

export function startWinterWave(w) {
  state.wave = w;
  updateHUD(state);
  respawnHousePickups();

  // Boss Encounters:
  // - Nona Batavia: Spawns dynamically every 50 kills (50, 150, 200, ...)
  // - In Endless Mode: Guaranteed Boss Wave every 3 waves (Wave 3, 6, 9, ...)
  if (state.gameMode === 'endless' && w % 3 === 0) {
    if (!currentBoss || currentBoss.isDead) {
      setTimeout(() => {
        if (!state.running) return;
        spawnNonaBataviaBoss(state);
      }, 3200);
    }
  }

  // Endless Progressive Horde scaling
  const count = 16 + w * 8;
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      if (!state.running) return;
      const a = Math.random() * Math.PI * 2;
      const r = 20 + Math.random() * 20;
      let sx = playerPos.x + Math.sin(a) * r;
      let sz = playerPos.z + Math.cos(a) * r;
      sx = Math.max(-MAP_LIMIT + 3.0, Math.min(MAP_LIMIT - 3.0, sx));
      sz = Math.max(-MAP_LIMIT + 3.0, Math.min(MAP_LIMIT - 3.0, sz));
      spawnWinterZombie(sx, sz, state);
    }, i * 260);
  }

  // Fast Victorian Bride sprinters (Unnatural speed & jumpscare bite)
  const brideCount = Math.min(6, 1 + Math.floor(w * 0.8));
  for (let b = 0; b < brideCount; b++) {
    setTimeout(() => {
      if (!state.running) return;
      const ba = Math.random() * Math.PI * 2;
      const br = 20 + Math.random() * 16;
      let bx = playerPos.x + Math.sin(ba) * br;
      let bz = playerPos.z + Math.cos(ba) * br;
      bx = Math.max(-MAP_LIMIT + 3.0, Math.min(MAP_LIMIT - 3.0, bx));
      bz = Math.max(-MAP_LIMIT + 3.0, Math.min(MAP_LIMIT - 3.0, bz));
      spawnVictorianBride(bx, bz, state);
    }, 1500 + b * 2200);
  }
}

export function nextWave() {
  // Survival Wave Rewards
  state.player.reserve = Math.min(state.player.reserve + 24, 48);
  state.player.hp = Math.min(100, state.player.hp + 20);
  const nw = state.wave + 1;

  if (state.gameMode === 'endless') {
    const chapterEl = document.getElementById('quest-chapter-tag');
    const titleEl = document.getElementById('quest-title-text');
    if (chapterEl) chapterEl.textContent = 'MODE BERTAHAN';
    if (titleEl) titleEl.textContent = `GELOMBANG ${nw}: HABISI ZOMBIE`;
  }

  updateHUD(state);
  startWinterWave(nw);
}

export function returnToMainMenu() {
  state.running = false;
  state.isPaused = false;
  window.__GAME_RUNNING = false;
  if (sceneRef) {
    setEndlessEnvironment(false, sceneRef);
  }
  clearEnemies();
  const go = document.getElementById('screen-gameover');
  if (go) go.style.display = 'none';
  const st = document.getElementById('screen-settings');
  if (st) st.style.display = 'none';
  const hud = document.getElementById('hud');
  if (hud) hud.style.display = 'none';
  const qp = document.getElementById('hud-quest-panel');
  if (qp) qp.style.display = 'none';
  const np = document.getElementById('npc-interaction-prompt');
  if (np) np.style.display = 'none';
  const so = document.getElementById('story-dialogue-overlay');
  if (so) so.style.display = 'none';
  const reticle = document.getElementById('reticle');
  if (reticle) reticle.style.display = 'none';
  const cinOverlay = document.getElementById('cinematic-overlay');
  if (cinOverlay) cinOverlay.style.display = 'none';
  const bossHud = document.getElementById('boss-hud-container');
  if (bossHud) bossHud.style.display = 'none';

  const menuRoot = document.getElementById('menu-view-root');
  if (menuRoot) menuRoot.style.display = 'flex';
  const menuModes = document.getElementById('menu-view-modes');
  if (menuModes) menuModes.style.display = 'none';
  const menuControls = document.getElementById('menu-view-controls');
  if (menuControls) menuControls.style.display = 'none';

  const screenStart = document.getElementById('screen-start');
  if (screenStart) screenStart.style.display = 'flex';
  try {
    if (document.exitPointerLock) document.exitPointerLock();
  } catch (e) {}
}

export function startWinterSurvive(scene, mode = 'story') {
  sceneRef = scene;
  state.gameMode = mode;
  window.__GAME_MODE = mode;
  window.__GAME_RUNNING = true;

  // Toggle Endless Environment: remove houses & roads, disable collisions, increase fog density
  setEndlessEnvironment(mode === 'endless', scene);

  Sfx.init(state);
  respawnHousePickups();

  clearEnemies();

  deadCorpses.forEach(c => scene.remove(c.model.root));
  deadCorpses.length = 0;
  bloodDecals.forEach(b => {
    b.active = false;
    if (b.mesh) b.mesh.visible = false;
  });
  airborneDrips.forEach(d => {
    d.active = false;
    if (d.mesh) d.mesh.visible = false;
  });
  curseProjectiles.forEach(p => scene.remove(p.mesh));
  curseProjectiles.length = 0;
  woodSplinters.forEach(s => {
    s.active = false;
    if (s.mesh) s.mesh.visible = false;
  });
  clearBossDeathEffects();

  state.score = 0;
  state.kills = 0;
  state.lastLadyMithrillKills = 0;
  state.wave = 1;
  state.isPaused = false;
  state.player.lives = 3;
  state.player.maxLives = 3;
  state.player.isInvulnerable = false;
  state.player.hp = 100;
  state.player.isReloading = false;

  document.getElementById('screen-start').style.display = 'none';
  document.getElementById('screen-gameover').style.display = 'none';
  document.getElementById('screen-settings').style.display = 'none';
  const bossHud = document.getElementById('boss-hud-container');
  if (bossHud) bossHud.style.display = 'none';

  if (mode === 'story') {
    // ==========================================
    // 1. STORY MODE: Narrative Campaign
    // ==========================================
    state.running = false;
    state.storyPhase = 'orientation';
    window.__STORY_PHASE = 'orientation';
    state.talkedVillagers = new Set();
    state.resolutionKills = 0;
    state.player.weapon = 'unarmed';
    state.player.maxClip = 0;
    state.player.clip = 0;
    state.player.reserve = 0;
    switchWeapon('unarmed');

    playerPos.set(0, 0, 14);
    if (cameraRef) {
      cameraRef.position.set(0, 1.8, 14);
    }
    yaw = 0;
    pitch = 0;

    spawnVillageNPCs(scene, getTerrainHeight);
    setObjective('orientation');

    startIntroCutscene(cameraRef, Sfx, () => {
      state.running = true;
      state.storyPhase = 'orientation';
      window.__STORY_PHASE = 'orientation';
      updateHUD(state);
      updateTouchControlsVisibility();
      setTimeout(() => {
        showDialogSubtitle('KRISTIN: "Rod, kita mulai riset dari bapak tua di depan gerbang itu dulu (Old Thomas). Dia bawa cawan air, ayo kita ke sana!"', 6500);
        triggerKristinGesture('point');
      }, 800);
    });

  } else {
    // ==========================================
    // 2. ENDLESS MODE: Wave-based Survival Action
    // ==========================================
    state.running = true;
    state.storyPhase = 'resolution';
    window.__STORY_PHASE = 'resolution';
    const initWep = gameSettings.weapon || 'spin';
    state.player.weapon = initWep;
    state.player.clip = (initWep === 'spin') ? 5 : 7;
    state.player.maxClip = state.player.clip;
    state.player.reserve = 36;
    switchWeapon(initWep);

    const gyP = (typeof getTerrainHeight === 'function') ? getTerrainHeight(0, 14.0) : 0.1;
    playerPos.set(0, gyP, 14.0);
    if (cameraRef) {
      cameraRef.position.set(0, gyP + 1.8, 14.0);
      setPlayerYawPitch(0, 0);
    }

    const gyK = (typeof getTerrainHeight === 'function') ? getTerrainHeight(1.4, 14.0) : 0.1;
    if (kristinModel && kristinModel.root) {
      kristinModel.root.position.set(1.4, gyK, 14.0);
      kristinModel.root.rotation.set(0, -0.25, 0);
      if (kristinModel.setWeapon) kristinModel.setWeapon('unarmed');
    }

    // Hide cinematic overlay & show HUD
    const cinOverlay = document.getElementById('cinematic-overlay');
    if (cinOverlay) cinOverlay.style.display = 'none';

    const hud = document.getElementById('hud');
    if (hud) hud.style.display = 'flex';
    const reticle = document.getElementById('reticle');
    if (reticle) reticle.style.display = 'block';

    if (playerFlashlight) playerFlashlight.visible = true;
    if (playerMeshRoot) playerMeshRoot.visible = (cameraMode === 'tps');
    if (weaponHolder) weaponHolder.visible = (cameraMode === 'fps');

    // Endless Mode Quest HUD
    const chapterEl = document.getElementById('quest-chapter-tag');
    const titleEl = document.getElementById('quest-title-text');
    const compassEl = document.getElementById('kristin-compass-text');
    if (chapterEl) chapterEl.textContent = 'MODE BERTAHAN';
    if (titleEl) titleEl.textContent = 'GELOMBANG 1: BERSIHKAN ZOMBIE';
    if (compassEl) compassEl.textContent = 'Waspada, zombie menyerang!';

    updateHUD(state);
    updateTouchControlsVisibility();

    // Start wave 1 immediately
    startWinterWave(1);

    setTimeout(() => {
      showDialogSubtitle('KRISTIN: "Rod! Mereka datang bergelombang dari segala arah! Siapkan shotgun lo, jangan biarkan mereka mendekat!"', 6000);
      triggerKristinGesture('pump', Sfx);
    }, 600);

    try {
      document.body.requestPointerLock();
    } catch (e) {
      console.warn('Pointer lock request:', e);
    }
  }
}

export function setupPlayerControls() {
  window.addEventListener('keydown', (e) => {
    if (isCinematicActive) return;
    if (e.repeat) return; // Prevent key repeat from rapid-fire advancing or skipping dialogue

    const c = e.code;
    const k = (e.key || '').toLowerCase();

    // If story dialogue is open, KeyE / 'e' / Space / Enter advances dialogue, Escape closes it
    if (isStoryDialogueOpen()) {
      if (c === 'KeyE' || k === 'e' || c === 'Space' || c === 'Enter') {
        e.preventDefault();
        advanceStoryDialogue();
        return;
      }
      if (c === 'Escape') {
        e.preventDefault();
        closeStoryDialogue();
        return;
      }
      return;
    }

    if (c === 'Escape') {
      if (isBestiaryOpen) {
        closeBestiary(state);
        return;
      }
      if (isMapOpen) {
        closeMap(state);
        return;
      }
      if (isSettingsOpen) {
        closeSettings(state);
      } else if (state.running) {
        openSettings(state, gameSettings);
      }
      return;
    }
    if (c === 'KeyB' || k === 'b') {
      if (!isSettingsOpen && !isMapOpen) {
        toggleBestiary(state);
      }
      return;
    }
    if (c === 'KeyM' || k === 'm') {
      if (!isSettingsOpen && !isBestiaryOpen) {
        toggleMap(state);
      }
      return;
    }
    if (state.isPaused || isMapOpen || isBestiaryOpen) return;

    if (c === 'KeyW' || k === 'w') keys.w = true;
    if (c === 'KeyA' || k === 'a') keys.a = true;
    if (c === 'KeyS' || k === 's') keys.s = true;
    if (c === 'KeyD' || k === 'd') keys.d = true;
    if (c === 'ShiftLeft' || c === 'ShiftRight' || e.shiftKey) keys.shift = true;
    if (c === 'Space') {
      triggerPlayerJump();
    }
    if (c === 'KeyR' || k === 'r') reloadWeapon();
    if (c === 'KeyT' || k === 't') {
      toggleCompanionFollow();
      if (state.nataliaSpawned) toggleNataliaFollow();
    }
    if (c === 'KeyH' || k === 'h') {
      giveKristinHint(window.__ACTIVE_OBJECTIVE_ID || '1.1');
    }
    if (c === 'KeyC' || k === 'c') {
      const mode = toggleCameraMode();
      if (Sfx && Sfx.playSmallBell) Sfx.playSmallBell(mode === 'tps' ? 2800 : 1800, 0.4);
    }
    if (c === 'KeyE' || k === 'e') {
      triggerInteract();
    }
  });

  window.addEventListener('keyup', (e) => {
    const c = e.code;
    const k = (e.key || '').toLowerCase();
    if (c === 'KeyW' || k === 'w') keys.w = false;
    if (c === 'KeyA' || k === 'a') keys.a = false;
    if (c === 'KeyS' || k === 's') keys.s = false;
    if (c === 'KeyD' || k === 'd') keys.d = false;
    if (c === 'ShiftLeft' || c === 'ShiftRight') keys.shift = false;
  });

  document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement !== document.body || !state.running || state.isPaused || !cameraRef || isMapOpen || isBestiaryOpen) return;
    const sens = 0.0024 * (gameSettings.sensitivity || 1.0);
    yaw -= e.movementX * sens;
    pitch -= e.movementY * sens;
    pitch = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, pitch));
    cameraRef.rotation.y = yaw;
    cameraRef.rotation.x = pitch;
  });

  document.addEventListener('mousedown', (e) => {
    if (!state.running || state.isPaused || isSettingsOpen || isMapOpen || isBestiaryOpen) return;

    // Clicking while reading story dialogue advances dialogue
    if (isStoryDialogueOpen()) {
      advanceStoryDialogue();
      return;
    }

    if (document.pointerLockElement !== document.body) {
      try {
        document.body.requestPointerLock();
      } catch (err) {}
    }

    if (e.button === 0) {
      // If player is looking at / standing near interactive villager in Orientation phase, clicking talks to them!
      const nearestVillager = getNearestVillager(playerPos, 3.8);
      if (nearestVillager && state.storyPhase === 'orientation') {
        triggerInteract();
        return;
      }
      fireCombatShotgun();
    }
  });

  // HUD badge clicks - triggers shotgun putar cocking spin
  const hudBadge = document.getElementById('hud-weapon-badge');
  if (hudBadge) {
    hudBadge.addEventListener('click', (e) => {
      e.stopPropagation();
      weaponSpin.active = true;
      weaponSpin.startTime = performance.now();
      weaponSpin.duration = 380;
      Sfx.playSpinCock();
    });
  }

  const hudAmmo = document.getElementById('hud-ammo');
  if (hudAmmo) {
    hudAmmo.addEventListener('click', (e) => {
      e.stopPropagation();
      reloadWeapon();
    });
  }
  const tacAmmo = document.getElementById('tactical-ammo-widget');
  if (tacAmmo) {
    tacAmmo.addEventListener('click', (e) => {
      e.stopPropagation();
      reloadWeapon();
    });
  }
}
