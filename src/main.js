/* =========================================================================
   COLD BLOOD ZOMBEY
   Main Entry Point & Modular Game Orchestrator
   ========================================================================= */

import { gameSettings, DEFAULT_SETTINGS, saveSettings } from './config/settings.js';
import { Sfx } from './audio/sfx.js';
import { scene, camera, renderer, applyGraphicFidelity, playerFlashlight } from './graphics/engine.js';
import { textures } from './graphics/textures.js';
import {
  initWorld,
  getTerrainHeight,
  getRiverCenterX,
  getRiverWaterY,
  waterfallSplashRing,
  waterfallVeilMesh,
  waterfallInnerSplash,
  waterfallMistParticles,
  waterfallMistVel,
  topRiverMesh,
  topRiverCrestFoam,
  lockedDoors,
  showLockedDoorPrompt,
  checkHousePickups,
  checkWallCollision,
  SNOW_COUNT,
  snowGeo,
  snowVel,
  busHazardLights
} from './world/environment.js';
import { isCinematicActive, updateCutscene } from './core/cutscene.js';
import {
  initEffects,
  bloodDecals,
  deadCorpses,
  airborneDrips,
  curseProjectiles,
  woodSplinters,
  breathPuffs,
  spawnWalkingBloodDrip,
  createAirborneBloodDrop,
  spawnBloodPoolOnSnow,
  spawnColdBreath
} from './entities/effects.js';
import {
  weaponHolder,
  pumpShotgunGroup,
  spinShotgunGroup,
  golokGroup,
  weaponSpin,
  meleeSwing,
  setupWeaponHolder,
  slashTrailMat
} from './entities/weapons.js';
import {
  initEnemyMaterials,
  initEnemies,
  zombies,
  currentBoss,
  spawnWinterZombie,
  spawnNonaBataviaBoss,
  spawnLadyMithrillBoss,
  spawnSisterValentinaBoss,
  preloadNonaBataviaModel,
  preloadLadyMithrillModel,
  castCurseBloodOrb,
  killZombieWithKinematics
} from './entities/enemies.js';
import {
  initAndikaCompanion,
  updateAndikaCompanion
} from './entities/andika.js';
import {
  state,
  keys,
  pVel,
  playerPos,
  yaw,
  pitch,
  initPlayer,
  switchWeapon,
  hitPlayer,
  startWinterSurvive,
  setupPlayerControls
} from './core/player.js';
import {
  updatePlayerModelAnimation,
  updateHorrorCamera,
  cameraMode
} from './entities/playerModel.js';
import { updateHUD } from './ui/hud.js';
import {
  setupSettingsListeners,
  syncSettingsUI
} from './ui/settingsMenu.js';

const THREE = window.THREE;

let lastTick = performance.now();
let playerBreathTimer = 1.0;
let ambientHordeTimer = 0;

function updateSimulation(dt) {
  if (!state.running) return;

  // Ambient Horde Spawner: Constantly repopulates the dark forest so infected lurk in the trees
  ambientHordeTimer += dt;
  if (ambientHordeTimer >= 2.4) {
    ambientHordeTimer = 0;
    const aliveCount = zombies.filter(m => !m.isDead).length;
    if (aliveCount < 16) {
      const a = Math.random() * Math.PI * 2;
      const r = 22 + Math.random() * 14;
      spawnWinterZombie(playerPos.x + Math.sin(a) * r, playerPos.z + Math.cos(a) * r, state);
    }
  }

  // 1. Locomotion & Snowstep Audio
  const move = new THREE.Vector3();
  if (keys.w) move.z -= 1;
  if (keys.s) move.z += 1;
  if (keys.a) move.x -= 1;
  if (keys.d) move.x += 1;
  const isMoving = move.lengthSq() > 0;
  move.normalize();

  const spd = (keys.shift ? state.player.sprintSpeed : state.player.walkSpeed) * dt;
  const rot = new THREE.Vector3(move.x, 0, move.z).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);

  const nextX = playerPos.x + rot.x * spd;
  const nextZ = playerPos.z + rot.z * spd;
  if (!checkWallCollision(nextX, playerPos.z)) playerPos.x = nextX;
  if (!checkWallCollision(playerPos.x, nextZ)) playerPos.z = nextZ;

  // Undulating Terrain Ground Height Tracking & Bridge Clambering
  let targetGroundY = getTerrainHeight(playerPos.x, playerPos.z);
  const bridgeCenterX = getRiverCenterX(4.0);
  const bridgeFloorY = getRiverWaterY(4.0) + 0.68;
  if (Math.abs(playerPos.z - 4.0) < 1.7 && Math.abs(playerPos.x - bridgeCenterX) < 6.6) {
    targetGroundY = Math.max(targetGroundY, bridgeFloorY);
  }

  if (playerPos.y > targetGroundY + 0.05) {
    pVel.y -= 22 * dt;
    playerPos.y += pVel.y * dt;
    if (playerPos.y <= targetGroundY) {
      playerPos.y = targetGroundY;
      pVel.y = 0;
      Sfx.playSnowStep();
    }
  } else {
    // Smooth step-up climbing undulating hills & knolls
    playerPos.y = THREE.MathUtils.lerp(playerPos.y, targetGroundY, Math.min(1.0, dt * 20));
    pVel.y = 0;
  }

  // River immersion check (wading through the icy mountain river)
  const rX = getRiverCenterX(playerPos.z);
  const waterY = getRiverWaterY(playerPos.z);
  const inRiver = (playerPos.z > -59.5 && playerPos.z < 110.0 && Math.abs(playerPos.x - rX) < 4.4 && playerPos.y <= waterY + 0.08);

  if (isMoving && Math.abs(playerPos.y - targetGroundY) < 0.15) {
    if (inRiver) {
      Sfx.playWaterSplash();
    } else {
      Sfx.playSnowStep();
    }
  }

  // Update Survivor Player 3D Model & Silent Hill Horror Camera (TPS/FPS)
  updatePlayerModelAnimation(isMoving, keys.shift, dt, state.player.weapon);
  updateHorrorCamera(camera, playerPos, yaw, pitch, dt);

  if (weaponHolder) {
    weaponHolder.visible = (cameraMode === 'fps');
  }

  // 2. Andika Companion NPC update (Follows Player & Combat Support)
  updateAndikaCompanion(camera, Sfx, dt);

  // 3. Check house pickups
  checkHousePickups(playerPos, state, () => updateHUD(state));

  // 4. Check proximity to locked village doors
  let nearLockedDoor = false;
  for (let i = 0; i < lockedDoors.length; i++) {
    if (camera.position.distanceTo(lockedDoors[i].worldPos) < 4.0) {
      showLockedDoorPrompt(lockedDoors[i]);
      nearLockedDoor = true;
      break;
    }
  }
  if (!nearLockedDoor) {
    const pEl = document.getElementById('door-locked-prompt');
    if (pEl && pEl.style.display === 'block') {
      pEl.style.display = 'none';
    }
  }

  // 5. Wood splinter debris from breached doors
  for (let i = woodSplinters.length - 1; i >= 0; i--) {
    const sp = woodSplinters[i];
    sp.age += dt;
    sp.vy -= 15.0 * dt;
    sp.mesh.position.x += sp.vx * dt;
    sp.mesh.position.y += sp.vy * dt;
    sp.mesh.position.z += sp.vz * dt;
    sp.mesh.rotation.x += sp.rotX * dt;
    sp.mesh.rotation.z += sp.rotZ * dt;

    if (sp.mesh.position.y <= 0.05) {
      sp.mesh.position.y = 0.05;
      sp.vx *= 0.4;
      sp.vz *= 0.4;
    }

    if (sp.age >= sp.maxLife) {
      scene.remove(sp.mesh);
      woodSplinters.splice(i, 1);
    }
  }

  // 6. Player cold breath steam
  playerBreathTimer -= dt;
  if (playerBreathTimer <= 0) {
    playerBreathTimer = 1.8 + Math.random() * 0.8;
    const pFwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const pPos = camera.position.clone().addScaledVector(pFwd, 0.45).add(new THREE.Vector3(0, -0.16, 0));
    spawnColdBreath(pPos, pFwd, true);
  }

  for (let i = breathPuffs.length - 1; i >= 0; i--) {
    const b = breathPuffs[i];
    b.age += dt;
    const progress = b.age / b.maxLife;
    if (progress >= 1.0) {
      scene.remove(b.mesh);
      breathPuffs.splice(i, 1);
      continue;
    }
    b.mesh.position.x += b.vx * dt;
    b.mesh.position.y += b.vy * dt;
    b.mesh.position.z += b.vz * dt;
    b.mesh.quaternion.copy(camera.quaternion);

    const curScale = THREE.MathUtils.lerp(b.initialScale, b.targetScale, progress);
    b.mesh.scale.set(curScale, curScale, 1);
    b.mesh.material.opacity = (1.0 - progress) * 0.38;
  }

  // 7. Weapon Recoil Recovery
  pumpShotgunGroup.position.z = THREE.MathUtils.lerp(pumpShotgunGroup.position.z, -0.55, dt * 8.5);
  spinShotgunGroup.position.z = THREE.MathUtils.lerp(spinShotgunGroup.position.z, -0.55, dt * 8.5);

  // 8. Shotgun Putar M1887 360 Spin Flip Animation
  if (weaponSpin.active) {
    const elapsed = performance.now() - weaponSpin.startTime;
    const progress = Math.min(1.0, elapsed / weaponSpin.duration);
    spinShotgunGroup.rotation.x = -Math.PI * 2 * progress;
    if (progress >= 1.0) {
      weaponSpin.active = false;
      spinShotgunGroup.rotation.x = 0;
    }
  } else {
    spinShotgunGroup.rotation.x = THREE.MathUtils.lerp(spinShotgunGroup.rotation.x, 0, dt * 10);
  }

  // 9. Golok Rimba Melee Swing Animation
  if (meleeSwing.active) {
    const elapsed = performance.now() - meleeSwing.startTime;
    const prog = Math.min(1.0, elapsed / meleeSwing.duration);

    if (prog < 0.22) {
      const sub = prog / 0.22;
      golokGroup.position.set(0.32, -0.16 + sub * 0.14, -0.42);
      golokGroup.rotation.set(0.40, -0.10, 0.60 - sub * 0.25);
    } else if (prog < 0.72) {
      const sub = (prog - 0.22) / 0.50;
      golokGroup.position.set(0.32 - sub * 0.65, -0.02 - sub * 0.38, -0.58 + Math.sin(sub * Math.PI) * 0.16);
      golokGroup.rotation.set(0.20 - sub * 0.88, -0.10 + sub * 0.55, 0.35 - sub * 1.55);
      slashTrailMat.opacity = Math.max(0, (1.0 - sub) * 0.85);
    } else {
      const sub = (prog - 0.72) / 0.28;
      golokGroup.position.lerp(new THREE.Vector3(0.28, -0.26, -0.52), sub);
      golokGroup.rotation.x = THREE.MathUtils.lerp(golokGroup.rotation.x, 0.18, sub);
      golokGroup.rotation.y = THREE.MathUtils.lerp(golokGroup.rotation.y, -0.22, sub);
      golokGroup.rotation.z = THREE.MathUtils.lerp(golokGroup.rotation.z, 0.26, sub);
      slashTrailMat.opacity = 0;
    }

    if (prog >= 1.0) {
      meleeSwing.active = false;
      slashTrailMat.opacity = 0;
      golokGroup.position.set(0.28, -0.26, -0.52);
      golokGroup.rotation.set(0.18, -0.22, 0.26);

      if (meleeSwing.isQuickMelee && meleeSwing.returnWeapon) {
        switchWeapon(meleeSwing.returnWeapon);
        meleeSwing.isQuickMelee = false;
        meleeSwing.returnWeapon = null;
      }
    }
  } else if (state.player.weapon === 'golok') {
    golokGroup.position.z = THREE.MathUtils.lerp(golokGroup.position.z, -0.52, dt * 8.5);
  }

  // 10. Snowflakes Animation
  const positions = snowGeo.attributes.position.array;
  for (let i = 0; i < SNOW_COUNT; i++) {
    snowVel[i].sway += dt * 1.5;
    positions[i * 3 + 1] -= snowVel[i].y * dt * 2.8;
    positions[i * 3 + 0] += Math.sin(snowVel[i].sway) * dt * 0.45 + snowVel[i].xDrift * dt;

    if (positions[i * 3 + 1] <= 0.1) {
      positions[i * 3 + 1] = 22 + Math.random() * 4;
      positions[i * 3 + 0] = camera.position.x + (Math.random() - 0.5) * 65;
      positions[i * 3 + 2] = camera.position.z + (Math.random() - 0.5) * 65;
    }
  }
  snowGeo.attributes.position.needsUpdate = true;

  // 11. Airborne Blood Drops
  for (let i = airborneDrips.length - 1; i >= 0; i--) {
    const drop = airborneDrips[i];
    drop.velY -= 12.0 * dt;
    drop.mesh.position.y += drop.velY * dt;
    drop.mesh.position.x += drop.vx * dt;
    drop.mesh.position.z += drop.vz * dt;

    if (drop.mesh.position.y <= 0.02) {
      spawnWalkingBloodDrip(drop.mesh.position.x, drop.mesh.position.z, 0.4);
      scene.remove(drop.mesh);
      airborneDrips.splice(i, 1);
    }
  }

  // 12. Boss Curse Projectiles
  for (let i = curseProjectiles.length - 1; i >= 0; i--) {
    const orb = curseProjectiles[i];
    orb.life -= dt;
    orb.mesh.position.addScaledVector(orb.dir, orb.speed * dt);
    orb.mesh.rotation.x += dt * 5;
    orb.mesh.rotation.y += dt * 7;

    if (orb.mesh.position.distanceTo(playerPos) < 1.4) {
      hitPlayer(22);
      Sfx.playImpactSplat();
      scene.remove(orb.mesh);
      curseProjectiles.splice(i, 1);
      continue;
    }

    if (orb.life <= 0 || orb.mesh.position.y <= 0.1) {
      spawnBloodPoolOnSnow(orb.mesh.position.x, orb.mesh.position.z, 0.5);
      scene.remove(orb.mesh);
      curseProjectiles.splice(i, 1);
    }
  }

  // 13. Active Zombies & Boss Sister Valentina
  let nearZombiesCount = 0;
  for (let i = 0; i < zombies.length; i++) {
    const z = zombies[i];
    if (z.isDead) continue;

    const dx = playerPos.x - z.x;
    const dz = playerPos.z - z.z;
    const dist = Math.hypot(dx, dz);
    const ang = Math.atan2(dx, dz);
    z.model.root.rotation.y = ang;

    if (dist < 6.8) nearZombiesCount++;

    if (z.isBoss) {
      if (z.isFloatingBoss) {
        // LADY MITHRILL: Floating Spectre Boss (flies in mid-air, ga napak dipermukaan)
        z.floatTime += dt * 2.2;
        const bGroundY = getTerrainHeight(z.x, z.z);

        // Hovering flight altitude (3.2m above undulating terrain)
        const targetHoverY = bGroundY + (z.flyAltitude || 3.2) + Math.sin(z.floatTime * 2.0) * 0.45;
        z.y = THREE.MathUtils.lerp(z.y !== undefined ? z.y : targetHoverY, targetHoverY, dt * 5.5);
        z.model.root.position.set(z.x, z.y, z.z);

        // Turn towards player + graceful aerial banking tilt
        z.model.root.rotation.y = ang;
        if (z.model.modelHolder) {
          z.model.modelHolder.rotation.z = Math.sin(z.floatTime * 1.6) * 0.08;
          z.model.modelHolder.rotation.x = Math.cos(z.floatTime * 1.2) * 0.05;
        }

        // Periodic Horde Summoning ("bawa banyak zombie"): Lady Mithrill summons reinforcements
        z.screamSummonCooldown -= dt;
        if (z.screamSummonCooldown <= 0) {
          z.screamSummonCooldown = 9.5 + Math.random() * 2.5;
          if (Sfx.playSpectralSummonChime) Sfx.playSpectralSummonChime();
          if (Sfx.playLadyMithrillScream) Sfx.playLadyMithrillScream();

          // Spawns 4 zombies rushing from snow beneath her
          for (let k = 0; k < 4; k++) {
            const sa = Math.random() * Math.PI * 2;
            const sr = 2.5 + Math.random() * 5.0;
            spawnWinterZombie(z.x + Math.sin(sa) * sr, z.z + Math.cos(sa) * sr, state);
          }
        }

        // Aerial spectral projectile: Casts floating curse orbs down at player
        z.curseCooldown -= dt;
        if (z.curseCooldown <= 0 && dist > 4.5) {
          z.curseCooldown = 3.2 + Math.random() * 0.8;
          const handPos = new THREE.Vector3(z.x, z.y - 0.4, z.z);
          castCurseBloodOrb(handPos, new THREE.Vector3(playerPos.x, playerPos.y + 1.2, playerPos.z));
        }

        // Glides gracefully in mid-air towards the player
        if (dist > 3.2) {
          const step = z.speed * dt;
          z.x += Math.sin(ang) * step;
          z.z += Math.cos(ang) * step;
        } else {
          // Aerial dive proximity damage
          z.attackCooldown -= dt;
          if (z.attackCooldown <= 0) {
            hitPlayer(z.dmg);
            Sfx.playImpactSplat();
            z.attackCooldown = 1.0;
          }
        }
      } else {
        // SISTER VALENTINA: Bleeding Mother Boss
        z.floatTime += dt * 2.8;
        const bGroundY = getTerrainHeight(z.x, z.z);
        z.model.root.position.y = bGroundY + 0.55 + Math.sin(z.floatTime) * 0.28;

        if (z.model.lFore) z.model.lFore.rotation.x = 0.25 + Math.sin(z.floatTime * 1.5) * 0.15;
        if (z.model.rFore) z.model.rFore.rotation.x = 0.25 + Math.cos(z.floatTime * 1.5) * 0.15;

        z.dripTimer -= dt;
        if (z.dripTimer <= 0) {
          z.dripTimer = 0.16;
          spawnWalkingBloodDrip(z.x + (Math.random() - 0.5) * 0.8, z.z + (Math.random() - 0.5) * 0.8, 0.6);
          createAirborneBloodDrop(new THREE.Vector3(z.x, 1.4, z.z));
        }

        z.teleportCooldown -= dt;
        if (z.teleportCooldown <= 0 && dist > 14) {
          z.teleportCooldown = 8.5;
          Sfx.playTeleportWhoosh();
          spawnBloodPoolOnSnow(z.x, z.z, 1.4);

          const telAngle = yaw + (Math.random() > 0.5 ? 0.7 : -0.7);
          z.x = playerPos.x + Math.sin(telAngle) * 9.0;
          z.z = playerPos.z + Math.cos(telAngle) * 9.0;
          z.model.root.position.set(z.x, z.model.root.position.y, z.z);
          spawnBloodPoolOnSnow(z.x, z.z, 1.4);
        }

        z.screamSummonCooldown -= dt;
        if (z.screamSummonCooldown <= 0) {
          z.screamSummonCooldown = 14.0;
          Sfx.playNunChoirScream();
          for (let k = 0; k < 2; k++) {
            const sa = Math.random() * Math.PI * 2;
            spawnWinterZombie(z.x + Math.sin(sa) * 4.5, z.z + Math.cos(sa) * 4.5, state);
          }
        }

        z.curseCooldown -= dt;
        if (z.curseCooldown <= 0 && dist > 5) {
          z.curseCooldown = 3.6;
          const handPos = new THREE.Vector3(z.x, z.model.root.position.y + 1.6, z.z);
          castCurseBloodOrb(handPos, new THREE.Vector3(playerPos.x, 1.4, playerPos.z));
        }

        if (dist > 1.8) {
          const step = z.speed * dt;
          z.x += Math.sin(ang) * step;
          z.z += Math.cos(ang) * step;
          z.model.root.position.x = z.x;
          z.model.root.position.z = z.z;
        } else {
          z.attackCooldown -= dt;
          if (z.attackCooldown <= 0) {
            hitPlayer(z.dmg);
            Sfx.playImpactSplat();
            z.attackCooldown = 0.9;
          }
        }
      }
    } else {
      const reach = 1.35;

      if (z.staggerTimer > 0) {
        z.staggerTimer -= dt;
        const p = z.model;
        p.spine.rotation.x = -0.38;
        p.lArm.rotation.x = -1.2;
        p.rArm.rotation.x = -1.2;
        p.neck.rotation.x = 0.32;
        if (p.lFore) p.lFore.rotation.x = -0.2;
        if (p.rFore) p.rFore.rotation.x = -0.2;

        z.x -= Math.sin(ang) * 1.6 * dt;
        z.z -= Math.cos(ang) * 1.6 * dt;
        const gy = getTerrainHeight(z.x, z.z);
        z.model.root.position.set(z.x, gy, z.z);
        continue;
      }

      z.shriekCooldown = (z.shriekCooldown || 3.0) - dt;
      if (z.shriekCooldown <= 0 && dist < 22) {
        z.shriekCooldown = 3.0 + Math.random() * 4.5;
        if (Math.random() < 0.65) Sfx.playL4DRoar();
      }

      if (dist > reach) {
        const step = z.speed * dt;
        const nx = z.x + Math.sin(ang) * step;
        const nz = z.z + Math.cos(ang) * step;
        if (!checkWallCollision(nx, nz)) {
          z.x = nx;
          z.z = nz;
        }
        const gy = getTerrainHeight(z.x, z.z);
        z.model.root.position.set(z.x, gy, z.z);

        z.stepTime += dt * (z.speed * 2.8);
        const p = z.model;

        p.spine.rotation.x = 0.34 + Math.sin(z.stepTime * 2) * 0.08;
        p.spine.rotation.y = Math.sin(z.stepTime) * 0.14;

        // Eerie spastic head twitching & unnatural zombie tremors
        const twitchSeed = z.headTwitchSeed || 0;
        const isTwitching = Math.sin(performance.now() * 0.02 + twitchSeed) > 0.84;
        const spasmZ = isTwitching ? (Math.sin(performance.now() * 0.09) * 0.42) : 0;
        const spasmY = isTwitching ? (Math.cos(performance.now() * 0.09) * 0.32) : 0;

        p.neck.rotation.x = -0.22 + Math.sin(z.stepTime * 3) * 0.07;
        p.neck.rotation.z = Math.sin(z.stepTime * 1.5) * 0.08 + spasmZ;
        p.neck.rotation.y = Math.sin(z.stepTime * 0.8) * 0.12 + spasmY;
        if (p.jaw) p.jaw.rotation.x = 0.36 + Math.sin(z.stepTime * 3.2) * 0.18;

        p.lArm.rotation.x = -0.85 + Math.sin(z.stepTime) * 0.85;
        p.rArm.rotation.x = -0.85 - Math.sin(z.stepTime) * 0.85;
        p.lArm.rotation.z = -0.20 + Math.sin(z.stepTime * 1.2) * 0.16;
        p.rArm.rotation.z = 0.20 - Math.sin(z.stepTime * 1.2) * 0.16;

        if (p.lFore) p.lFore.rotation.x = -0.55 + Math.abs(Math.sin(z.stepTime)) * 0.35;
        if (p.rFore) p.rFore.rotation.x = -0.55 + Math.abs(Math.cos(z.stepTime)) * 0.35;

        p.lLeg.rotation.x = Math.sin(z.stepTime) * 0.75;
        p.rLeg.rotation.x = -Math.sin(z.stepTime) * 0.75;
        if (p.lShin) p.lShin.rotation.x = Math.max(0, -Math.sin(z.stepTime) * 0.85);
        if (p.rShin) p.rShin.rotation.x = Math.max(0, Math.sin(z.stepTime) * 0.85);

        if (p.danglingGuts) {
          p.danglingGuts.forEach(g => {
            const sway = Math.sin(z.stepTime + g.phase) * 0.35;
            g.root.rotation.x = 0.2 + sway;
            g.segments.forEach((seg, k) => {
              seg.rotation.z = Math.cos(z.stepTime * 1.2 + k) * 0.22;
            });
          });
        }

        z.breathTimer = (z.breathTimer || (1.0 + Math.random() * 1.5)) - dt;
        if (z.breathTimer <= 0 && dist < 22) {
          z.breathTimer = 1.6 + Math.random() * 1.4;
          const zFwd = new THREE.Vector3(Math.sin(ang), 0, Math.cos(ang));
          const zHeadPos = new THREE.Vector3(z.x + zFwd.x * 0.35, 1.42, z.z + zFwd.z * 0.35);
          spawnColdBreath(zHeadPos, zFwd, false);
        }

        z.dripTimer -= dt;
        const distMoved = Math.hypot(z.x - z.lastStepPos.x, z.z - z.lastStepPos.y);
        if (z.dripTimer <= 0 || distMoved > 0.75) {
          z.dripTimer = 0.22 + Math.random() * 0.25;
          z.lastStepPos.set(z.x, z.z);
          spawnWalkingBloodDrip(z.x, z.z, 0.45);

          if (p.gutAnchor) {
            const gutPos = new THREE.Vector3();
            p.gutAnchor.getWorldPosition(gutPos);
            createAirborneBloodDrop(gutPos);
          }
        }
      } else {
        z.attackCooldown -= dt;
        z.attackAnimTime = (z.attackAnimTime || 0) + dt * 10;
        const p = z.model;

        p.spine.rotation.x = 0.42;
        p.lArm.rotation.x = -1.1 + Math.sin(z.attackAnimTime) * 0.95;
        p.rArm.rotation.x = -1.1 - Math.cos(z.attackAnimTime) * 0.95;
        if (p.lFore) p.lFore.rotation.x = -0.7;
        if (p.rFore) p.rFore.rotation.x = -0.7;
        if (p.jaw) p.jaw.rotation.x = 0.55 + Math.sin(z.attackAnimTime * 2) * 0.2;

        if (z.attackCooldown <= 0) {
          hitPlayer(z.dmg);
          Sfx.playL4DAttackSwipe();
          z.attackCooldown = 0.92;
        }
      }
    }
  }

  // Horror flashlight tension flicker & visceral heartbeat audio
  if (playerFlashlight) {
    playerFlashlight.intensity = 2.6;
  }

  if (nearZombiesCount >= 2 || state.player.hp < 45) {
    Sfx.playHeartbeat(state.player.hp < 35 ? 1.4 : 1.0);
  }

  // 14. Kinematic Ragdoll Corpses (10-second decay)
  for (let i = deadCorpses.length - 1; i >= 0; i--) {
    const c = deadCorpses[i];
    c.age += dt;
    const p = c.model;
    const r = p.root;

    if (c.linVel.length() > 0.04) {
      r.position.x += c.linVel.x * dt;
      r.position.z += c.linVel.z * dt;
      c.linVel.multiplyScalar(Math.max(0, 1.0 - 5.0 * dt));
    }
    const cGroundY = getTerrainHeight(r.position.x, r.position.z);
    r.position.y = cGroundY - (c.age > 8.0 ? (c.age - 8.0) * 0.25 : 0);

    if (!c.settled) {
      if (c.isFloatingBoss) {
        // Ethereal descent: Lady Mithrill spirals slowly down into the snow
        r.rotation.y += dt * 2.8;
        r.rotation.x = THREE.MathUtils.lerp(r.rotation.x, 0.40, dt * 2.0);
        if (r.position.y > cGroundY + 0.3) {
          r.position.y -= dt * 2.2;
        } else {
          r.position.y = cGroundY + 0.2;
          c.settled = true;
          Sfx.playSnowThud(1.2);
        }
        continue;
      }

      if (c.style === 'backward') {
        c.kneeAngle = THREE.MathUtils.lerp(c.kneeAngle, 1.35, dt * 7.5);
        c.hipsY = THREE.MathUtils.lerp(c.hipsY, 0.2, dt * 7.0);
        c.hipsRotX = THREE.MathUtils.lerp(c.hipsRotX, -Math.PI / 2, dt * 7.0);
        c.spineRotX = THREE.MathUtils.lerp(c.spineRotX, -0.4, dt * 6.5);
        c.neckRotX = THREE.MathUtils.lerp(c.neckRotX, 0.45, dt * 8.0);

        if (p.lLeg) {
          p.lLeg.rotation.x = c.kneeAngle;
          p.rLeg.rotation.x = c.kneeAngle * 0.95;
        }
        p.lArm.rotation.x = THREE.MathUtils.lerp(p.lArm.rotation.x, -1.1, dt * 6);
        p.rArm.rotation.x = THREE.MathUtils.lerp(p.rArm.rotation.x, -1.1, dt * 6);
      } else if (c.style === 'faceplant') {
        c.hipsY = THREE.MathUtils.lerp(c.hipsY, 0.18, dt * 7.5);
        c.hipsRotX = THREE.MathUtils.lerp(c.hipsRotX, Math.PI / 2, dt * 7.0);
        c.spineRotX = THREE.MathUtils.lerp(c.spineRotX, 0.35, dt * 6.5);
        p.lArm.rotation.x = THREE.MathUtils.lerp(p.lArm.rotation.x, 1.25, dt * 7);
        p.rArm.rotation.x = THREE.MathUtils.lerp(p.rArm.rotation.x, 1.25, dt * 7);
      } else if (c.style === 'headshot_spin') {
        c.hipsY = THREE.MathUtils.lerp(c.hipsY, 0.2, dt * 8.0);
        c.hipsRotX = THREE.MathUtils.lerp(c.hipsRotX, -Math.PI / 2.2, dt * 7.0);
        c.neckRotX = THREE.MathUtils.lerp(c.neckRotX, 0.9, dt * 9.0);
        r.rotation.y += c.sideSign * dt * 4.0 * Math.max(0, 1.0 - c.age * 2.0);
      } else {
        c.hipsY = THREE.MathUtils.lerp(c.hipsY, 0.2, dt * 7.5);
        c.hipsRotZ = THREE.MathUtils.lerp(c.hipsRotZ, c.sideSign * (Math.PI / 2), dt * 6.5);
        r.rotation.y += c.sideSign * dt * 2.8 * Math.max(0, 1.0 - c.age * 2.0);
      }

      p.hips.position.y = c.hipsY;
      p.hips.rotation.x = c.hipsRotX;
      p.hips.rotation.z = c.hipsRotZ;
      p.spine.rotation.x = c.spineRotX;
      p.neck.rotation.x = c.neckRotX;

      if (p.danglingGuts && !c.gutSpillDone) {
        p.danglingGuts.forEach((g) => {
          g.root.rotation.x = Math.PI / 2;
          g.segments.forEach(seg => {
            seg.rotation.x = 0.4;
            seg.rotation.z = (Math.random() - 0.5) * 0.8;
          });
        });
        c.gutSpillDone = true;
      }

      if (c.hipsY <= 0.26 && !c.hasImpactedGround) {
        c.hasImpactedGround = true;
        Sfx.playSnowThud(c.weight);
      }
      if (c.hasImpactedGround && Math.abs(c.hipsY - 0.2) < 0.03) {
        c.settled = true;
      }
    }

    if (c.age > 8.0) {
      r.position.y -= dt * 0.25;
    }

    if (c.age >= c.maxLife) {
      scene.remove(r);
      deadCorpses.splice(i, 1);
    }
  }

  // 15. Blood Pools on Snow (10-second decay)
  for (let i = bloodDecals.length - 1; i >= 0; i--) {
    const b = bloodDecals[i];
    b.age += dt;

    if (b.curScale < b.targetScale) {
      b.curScale += dt * b.spreadSpeed;
      b.mesh.scale.set(b.curScale, b.curScale, 1);
    }

    if (b.age > 8.0) {
      const fade = (10.0 - b.age) / 2.0;
      b.mat.opacity = Math.max(0, fade * 0.98);
    }

    if (b.age >= b.maxLife) {
      scene.remove(b.mesh);
      bloodDecals.splice(i, 1);
    }
  }
}

function renderScene() {
  renderer.render(scene, camera);
}

function frameLoop(t) {
  const dt = Math.min((t - lastTick) / 1000, 0.1);
  lastTick = t;

  if (isCinematicActive) {
    updateCutscene(dt);
    if (busHazardLights && busHazardLights.length > 0) {
      const pulse = (Math.sin(performance.now() * 0.007) > 0.1 ? 2.5 : 0.2);
      busHazardLights.forEach(l => l.intensity = pulse);
    }
  } else if (state.running && !state.isPaused) {
    updateSimulation(dt);
    if (busHazardLights && busHazardLights.length > 0) {
      const pulse = (Math.sin(performance.now() * 0.007) > 0.1 ? 2.5 : 0.2);
      busHazardLights.forEach(l => l.intensity = pulse);
    }
  }

  // Dynamic Flowing Mountain River & Cascading 3D Waterfall UV Animation
  if (textures.riverWaterTex) {
    textures.riverWaterTex.offset.y -= dt * 0.26;
  }
  if (textures.topStreamTex) {
    textures.topStreamTex.offset.y -= dt * 0.82; // Rushing upper mountain stream
  }
  if (textures.crestFoamTex) {
    textures.crestFoamTex.offset.x += dt * 0.45; // Agitated froth shimmer
  }
  if (topRiverCrestFoam) {
    const foamPulse = 1.0 + Math.sin(performance.now() * 0.01) * 0.08;
    topRiverCrestFoam.scale.set(1.0, foamPulse, 1.0);
  }
  if (textures.waterfallTex) {
    textures.waterfallTex.offset.y -= dt * 1.95;
  }
  if (waterfallSplashRing) {
    const splashPulse = 1.0 + Math.sin(performance.now() * 0.008) * 0.12;
    waterfallSplashRing.scale.set(splashPulse, splashPulse, 1);
  }
  if (waterfallInnerSplash) {
    const innerPulse = 1.0 + Math.cos(performance.now() * 0.012) * 0.18;
    waterfallInnerSplash.scale.set(innerPulse, innerPulse, 1);
    waterfallInnerSplash.rotation.z += dt * 0.45;
  }

  // Rising Waterfall Mist / Spray particles simulation
  if (waterfallMistParticles && waterfallMistVel.length > 0) {
    const mPos = waterfallMistParticles.geometry.attributes.position.array;
    for (let i = 0; i < waterfallMistVel.length; i++) {
      const v = waterfallMistVel[i];
      v.life += dt;
      mPos[i * 3 + 0] += v.vx * dt;
      mPos[i * 3 + 1] += v.vy * dt;
      mPos[i * 3 + 2] += v.vz * dt;

      if (v.life >= v.maxLife || mPos[i * 3 + 1] > 6.0) {
        v.life = 0;
        mPos[i * 3 + 0] = 42.0 + (Math.random() - 0.5) * 10.5;
        mPos[i * 3 + 1] = 0.85 + Math.random() * 0.4;
        mPos[i * 3 + 2] = -55.8 + Math.random() * 2.5;
      }
    }
    waterfallMistParticles.geometry.attributes.position.needsUpdate = true;
  }

  // Update Spatial Waterfall Roar sound
  if (Sfx && Sfx.updateWaterfallSpatialAudio) {
    Sfx.updateWaterfallSpatialAudio(playerPos);
  }

  renderScene();

  requestAnimationFrame(frameLoop);
}

// Global initialization
function init() {
  setupWeaponHolder(camera);
  if (weaponHolder) weaponHolder.visible = false;
  scene.add(camera);

  initWorld(scene, textures);
  initEffects(scene, textures.bloodSnowTex, textures.bloodDripTex);
  initEnemyMaterials(textures);
  initEnemies(scene, camera);
  preloadNonaBataviaModel(scene);
  initAndikaCompanion(scene, textures);
  initPlayer(camera, scene);
  setupPlayerControls();

  window.__gameDebug = {
    playerPos,
    camera,
    scene,
    state,
    spawnNonaBatavia: () => spawnNonaBataviaBoss(state),
    spawnLadyMithrill: () => spawnNonaBataviaBoss(state),
    spawnValentina: () => spawnSisterValentinaBoss(state),
    triggerKillMilestone: (k = 50) => {
      state.kills = k - 1;
      if (zombies.length > 0) {
        killZombieWithKinematics(zombies[0], new THREE.Vector3(0, 0, 1), 5, false, state, () => updateHUD(state), nextWave);
      } else {
        state.kills = k;
        updateHUD(state);
        spawnLadyMithrillBoss(state);
      }
    }
  };

  setupSettingsListeners({
    gameSettings,
    DEFAULT_SETTINGS,
    saveSettings,
    Sfx,
    applyGraphicFidelity,
    switchWeapon,
    state
  });

  const btnEnter = document.getElementById('btn-enter');
  if (btnEnter) btnEnter.addEventListener('click', () => startWinterSurvive(scene));

  const btnRestart = document.getElementById('btn-restart');
  if (btnRestart) btnRestart.addEventListener('click', () => startWinterSurvive(scene));

  applyGraphicFidelity(gameSettings.graphicMode || 'ps2');
  switchWeapon(gameSettings.weapon || 'spin');
  syncSettingsUI(gameSettings, state);

  lastTick = performance.now();
  requestAnimationFrame(frameLoop);
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
