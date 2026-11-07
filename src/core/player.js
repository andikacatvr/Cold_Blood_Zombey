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
  createAirborneBloodDrop
} from '../entities/effects.js';
import {
  zombies,
  currentBoss,
  spawnWinterZombie,
  spawnSisterValentinaBoss,
  spawnLadyMithrillBoss,
  killZombieWithKinematics,
  clearEnemies
} from '../entities/enemies.js';
import {
  lockedDoors,
  blastOpenDoor,
  checkWallCollision,
  respawnHousePickups
} from '../world/environment.js';
import { updateHUD, showLifeLostAlert, triggerGameOver } from '../ui/hud.js';
import { openSettings, closeSettings, isSettingsOpen } from '../ui/settingsMenu.js';
import { triggerAndikaGesture, toggleCompanionFollow, andikaModel } from '../entities/andika.js';
import { startIntroCutscene, isCinematicActive } from './cutscene.js';
import {
  buildSurvivorPlayerModel,
  updatePlayerModelAnimation,
  updateHorrorCamera,
  cameraMode,
  toggleCameraMode,
  playerMeshRoot
} from '../entities/playerModel.js';

const THREE = window.THREE;

export const state = {
  running: false,
  isPaused: false,
  score: 0,
  kills: 0,
  lastLadyMithrillKills: 0,
  wave: 1,
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

export const keys = { w: false, a: false, s: false, d: false, shift: false };
export const pVel = new THREE.Vector3();
export const playerPos = new THREE.Vector3(0, 0, 14);
export let isGrounded = true;
export let yaw = 0;
export let pitch = 0;

let cameraRef = null;

export function initPlayer(camera, scene) {
  cameraRef = camera;
  playerPos.set(0, 0, 14);
  camera.position.set(0, 1.8, 14);
  if (scene) {
    const pModel = buildSurvivorPlayerModel();
    pModel.visible = (cameraMode === 'tps');
    scene.add(pModel);
  }
}

export function switchWeapon(type) {
  if (state.player.isReloading && !type) return;
  if (state.player.isReloading) {
    state.player.isReloading = false;
  }
  if (meleeSwing.active && !type) return;

  const weapons = ['pump', 'spin', 'golok'];
  let target = type;
  if (!target) {
    const curIdx = weapons.indexOf(state.player.weapon);
    target = weapons[(curIdx + 1) % weapons.length];
  }

  state.player.weapon = target;
  gameSettings.weapon = target;
  saveSettings();

  const isPump = (target === 'pump');
  const isSpin = (target === 'spin');
  const isGolok = (target === 'golok');

  pumpShotgunGroup.visible = isPump;
  spinShotgunGroup.visible = isSpin;
  golokGroup.visible = isGolok;

  if (isPump) {
    state.player.maxClip = 60;
    if (state.player.clip > 60) state.player.clip = 60;
    pumpShotgunGroup.position.z = -0.42;
    Sfx.playPumpRack();
  } else if (isSpin) {
    state.player.maxClip = 60;
    if (state.player.clip > 60) state.player.clip = 60;
    weaponSpin.active = true;
    weaponSpin.startTime = performance.now();
    weaponSpin.duration = 340;
    Sfx.playSpinCock();
  } else if (isGolok) {
    Sfx.playBladeWhoosh();
    golokGroup.position.set(0.28, -0.22, -0.45);
  }

  const nameEl = document.getElementById('hud-weapon-name');
  if (nameEl) {
    if (isGolok) {
      nameEl.innerText = '[3] GOLOK RIMBA (MELEE)';
      nameEl.style.color = '#ff3344';
    } else if (isSpin) {
      nameEl.innerText = '[2] SHOTGUN PUTAR M1887';
      nameEl.style.color = '#ff9933';
    } else {
      nameEl.innerText = '[1] SHOTGUN POMPA';
      nameEl.style.color = '#a2d2ff';
    }
  }

  const wGroup = document.getElementById('group-weapon');
  if (wGroup) {
    wGroup.querySelectorAll('.btn-opt').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.weapon === target);
    });
  }

  updateHUD(state);
}

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
  const pPos = new THREE.Vector3(playerPos.x, playerPos.y + 1.2, playerPos.z);
  const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(cameraRef.quaternion);

  for (let i = 0; i < zombies.length; i++) {
    const z = zombies[i];
    if (z.isDead) continue;

    const zPos = z.model.root.position;
    const toZ = new THREE.Vector3(zPos.x - pPos.x, (zPos.y + 1.2) - pPos.y, zPos.z - pPos.z);
    const dist = toZ.length();

    if (dist <= 2.9) {
      const dot = fwd.dot(toZ.clone().normalize());
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

        const pushDir = new THREE.Vector3(fwd.x, 0, fwd.z).normalize();
        z.x += pushDir.x * (z.isBoss ? 0.25 : 0.70);
        z.z += pushDir.z * (z.isBoss ? 0.25 : 0.70);

        spawnBloodPoolOnSnow(zPos.x, zPos.z, 0.85);
        createAirborneBloodDrop(new THREE.Vector3(zPos.x, zPos.y + 1.2, zPos.z));

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
  if (p.weapon === 'golok') return;
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
  const raycaster = new THREE.Raycaster();
  const pelletCount = isSpin ? 8 : 7;
  const spreadAngle = isSpin ? 0.088 : 0.075;

  const originPos = cameraMode === 'tps'
    ? new THREE.Vector3(playerPos.x, playerPos.y + 1.25, playerPos.z)
    : cameraRef.position;

  for (let pellet = 0; pellet < pelletCount; pellet++) {
    const sprX = (Math.random() - 0.5) * spreadAngle;
    const sprY = (Math.random() - 0.5) * spreadAngle;
    const dir = new THREE.Vector3(sprX, sprY, -1).normalize().applyQuaternion(cameraRef.quaternion);

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

      const headWorld = new THREE.Vector3();
      if (z.model.head) {
        z.model.head.getWorldPosition(headWorld);
      } else {
        headWorld.set(zPos.x, zPos.y + (z.isFloatingBoss ? 1.8 : 1.6), zPos.z);
      }
      const distToHead = raycaster.ray.distanceToPoint(headWorld);

      const torsoY = zPos.y + (z.isFloatingBoss ? (0.85 * (z.model.scale || 1.0)) : (z.isBoss ? 1.6 : 1.15));
      const distToTorso = raycaster.ray.distanceToPoint(new THREE.Vector3(zPos.x, torsoY, zPos.z));

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
  if (!state.running || state.player.isInvulnerable || state.isPaused) return;

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
  // - Nona Batavia: Spawns dynamically every 50 kills (50, 100, 150, 200, ...)
  // - Sister Valentina (Main Boss): Spawns on wave 3, 6, 9, etc.
  if (w >= 3 && w % 3 === 0 && !currentBoss) {
    setTimeout(() => spawnSisterValentinaBoss(state), 1800);
  }

  // Endless Progressive Horde scaling
  const count = 16 + w * 8;
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      if (!state.running) return;
      const a = Math.random() * Math.PI * 2;
      const r = 22 + Math.random() * 22;
      spawnWinterZombie(playerPos.x + Math.sin(a) * r, playerPos.z + Math.cos(a) * r, state);
    }, i * 260);
  }
}

export function nextWave() {
  // Survival Wave Rewards
  state.player.reserve = Math.min(state.player.reserve + 24, 48);
  state.player.hp = Math.min(100, state.player.hp + 20);
  updateHUD(state);
  startWinterWave(state.wave + 1);
}

export function startWinterSurvive(scene) {
  Sfx.init(state);
  respawnHousePickups();

  clearEnemies();

  deadCorpses.forEach(c => scene.remove(c.model.root));
  deadCorpses.length = 0;
  bloodDecals.forEach(b => scene.remove(b.mesh));
  bloodDecals.length = 0;
  airborneDrips.forEach(d => scene.remove(d.mesh));
  airborneDrips.length = 0;
  curseProjectiles.forEach(p => scene.remove(p.mesh));
  curseProjectiles.length = 0;
  woodSplinters.forEach(s => scene.remove(s.mesh));
  woodSplinters.length = 0;

  state.score = 0;
  state.kills = 0;
  state.lastLadyMithrillKills = 0;
  state.wave = 1;
  state.isPaused = false;
  state.player.lives = 3;
  state.player.maxLives = 3;
  state.player.isInvulnerable = false;
  state.player.hp = 100;
  state.player.weapon = gameSettings.weapon || 'spin';
  state.player.maxClip = (state.player.weapon === 'golok' ? 0 : 60);
  state.player.clip = state.player.maxClip;
  state.player.reserve = 240;
  state.player.isReloading = false;
  state.running = false;
  switchWeapon(state.player.weapon);

  playerPos.set(0, 0, 14);
  if (cameraRef) {
    cameraRef.position.set(0, 1.8, 14);
  }
  yaw = 0;
  pitch = 0;

  document.getElementById('screen-start').style.display = 'none';
  document.getElementById('screen-gameover').style.display = 'none';
  document.getElementById('screen-settings').style.display = 'none';
  const bossHud = document.getElementById('boss-hud-container');
  if (bossHud) bossHud.style.display = 'none';

  startIntroCutscene(cameraRef, Sfx, () => {
    state.running = true;
    updateHUD(state);
    startWinterWave(1);
  });
}

export function setupPlayerControls() {
  window.addEventListener('keydown', (e) => {
    if (isCinematicActive) return;
    const c = e.code;
    if (c === 'Escape') {
      if (isSettingsOpen) {
        closeSettings(state);
      } else if (state.running) {
        openSettings(state, gameSettings);
      }
      return;
    }
    if (state.isPaused) return;

    if (c === 'KeyW') keys.w = true;
    if (c === 'KeyA') keys.a = true;
    if (c === 'KeyS') keys.s = true;
    if (c === 'KeyD') keys.d = true;
    if (c === 'ShiftLeft' || c === 'ShiftRight') keys.shift = true;
    if (c === 'Space' && isGrounded && state.running) {
      pVel.y = 6.8;
      isGrounded = false;
    }
    if (c === 'KeyR') reloadWeapon();
    if (c === 'KeyT') toggleCompanionFollow();
    if (c === 'KeyC') {
      const mode = toggleCameraMode();
      if (Sfx && Sfx.playSmallBell) Sfx.playSmallBell(mode === 'tps' ? 2800 : 1800, 0.4);
    }
    if (c === 'KeyE') {
      if (andikaModel) {
        const dist = playerPos.distanceTo(andikaModel.root.position);
        if (dist < 6.5) {
          triggerAndikaGesture();
        }
      } else {
        triggerAndikaGesture();
      }
    }
    if (c === 'KeyF' || c === 'KeyV') performGolokSlash(true);
    if (c === 'Digit1') switchWeapon('pump');
    if (c === 'Digit2') switchWeapon('spin');
    if (c === 'Digit3') switchWeapon('golok');
    if (c === 'KeyQ') switchWeapon();
  });

  window.addEventListener('keyup', (e) => {
    const c = e.code;
    if (c === 'KeyW') keys.w = false;
    if (c === 'KeyA') keys.a = false;
    if (c === 'KeyS') keys.s = false;
    if (c === 'KeyD') keys.d = false;
    if (c === 'ShiftLeft' || c === 'ShiftRight') keys.shift = false;
  });

  window.addEventListener('wheel', () => {
    if (!state.running || state.isPaused || isSettingsOpen) return;
    switchWeapon();
  }, { passive: true });

  document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement !== document.body || !state.running || state.isPaused || !cameraRef) return;
    const sens = 0.0024 * (gameSettings.sensitivity || 1.0);
    yaw -= e.movementX * sens;
    pitch -= e.movementY * sens;
    pitch = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, pitch));
    cameraRef.rotation.y = yaw;
    cameraRef.rotation.x = pitch;
  });

  document.addEventListener('mousedown', (e) => {
    if (!state.running || state.isPaused || isSettingsOpen) return;
    if (document.pointerLockElement !== document.body) {
      try {
        document.body.requestPointerLock();
      } catch (err) {}
    }
    if (e.button === 0) {
      if (state.player.weapon === 'golok') {
        performGolokSlash();
      } else {
        fireCombatShotgun();
      }
    }
  });

  // HUD badge clicks
  const hudBadge = document.getElementById('hud-weapon-badge');
  if (hudBadge) {
    hudBadge.addEventListener('click', (e) => {
      e.stopPropagation();
      switchWeapon();
    });
  }

  const hudAmmo = document.getElementById('hud-ammo');
  if (hudAmmo) {
    hudAmmo.addEventListener('click', (e) => {
      e.stopPropagation();
      reloadWeapon();
    });
  }
}
