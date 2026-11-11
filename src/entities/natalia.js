/* =========================================================================
   SPECIAL AGENT NATALIA (OFFICIAL BOSSGAME.GLB CHARACTER ASSET)
   - Brand new tactical agent companion assisting the player against the zombie horde
   - Active combat defense: aims and shoots zombies with shotgun and bullet tracers
   - Real-time kinematic vertex deformation & motion control
   - Dedicated Agent Natalia dialogue banner & tactical voice lines
   - Intelligent flanking follow AI & dynamic player tracking
   ========================================================================= */

import { Sfx } from '../audio/sfx.js';
import { checkWallCollision, getTerrainHeight } from '../world/environment.js';
import { zombies, killZombieWithKinematics } from './enemies.js';
import { playerPos, yaw, state, nextWave } from '../core/player.js';
import { updateHUD } from '../ui/hud.js';
import { createAirborneBloodDrop, spawnBloodPoolOnSnow } from './effects.js';

const THREE = window.THREE;

export let nataliaModel = null;
export const NATALIA_SCALE = 1.0; // 1.0 = true 1.745m height matching bossgame.glb!

// Agent Following & Tactical State
export let nataliaFollowMode = true;
let walkCadence = 0;
let lastFootstepTime = 0;
let combatShootCooldown = 0;

// Gesture & Aim State
export let currentGesture = 'idle';
let gestureStartTime = 0;
let gestureDuration = 4.0;
let hasAutoGreeted = false;
let headYaw = 0;
let headPitch = 0;

let dialogHideTimeout = null;

/**
 * Show cinematic dialogue subtitle specifically for Agent Natalia
 */
export function showNataliaSubtitle(text, duration = 4500) {
  const bannerEl = document.getElementById('natalia-npc-banner');
  const textEl = document.getElementById('natalia-dialog-text');
  if (!bannerEl) return;

  if (text && textEl) {
    const clean = text.trim();
    textEl.textContent = clean.startsWith('"') ? clean : `"${clean}"`;
  }

  bannerEl.style.display = 'block';
  bannerEl.style.opacity = '1';

  if (dialogHideTimeout) clearTimeout(dialogHideTimeout);
  dialogHideTimeout = setTimeout(() => {
    bannerEl.style.opacity = '0';
    setTimeout(() => {
      if (bannerEl.style.opacity === '0') {
        bannerEl.style.display = 'none';
      }
    }, 450);
  }, duration);
}

export function toggleNataliaFollow(sfxRef = Sfx) {
  nataliaFollowMode = !nataliaFollowMode;
  if (sfxRef && sfxRef.playSmallBell) sfxRef.playSmallBell(nataliaFollowMode ? 2800 : 1900, 0.45);

  const text = nataliaFollowMode
    ? "Agent Natalia siap bergerak! Formasi tempur, gua kawal sayap kanan lu!"
    : "Holding position! Gua amankan perimeter di sini, panggil kalau butuh tembakan bantuan!";

  showNataliaSubtitle(text, 3800);
}

export const NATALIA_STORY_LINES = [
  "Survivor, gua Agent Natalia dari Unit Investigasi Taktis! Gua dikirim buat netralisir wabah sihir gelap dan evakuasi tim yang tersisa!",
  "Sensor taktis mendeteksi sinyal infeksi berkumpul di sekitar pemukiman. Pegang senjata lu, kita bergerak dalam formasi silang!",
  "Makhluk-makhluk ini bukan zombie biasa, ada energi kutukan kuno yang mengendalikan mereka. Tapi peluru shotgun gua lebih dari cukup buat hancurin mereka!",
  "Tetap di belakang gua saat menerobos lorong sempit. Lu fokus ke depan, gua habisi monster yang berusaha menyergap dari belakang!",
  "Dermaga di utara adalah titik ekstraksi kita. Bersihkan jalan dan jangan biarkan zombie menyentuh kita!"
];
let nataliaStoryIdx = 0;

export const NATALIA_GESTURES = {
  wave: {
    tag: '🎯 AGENT NATALIA',
    text: '"Agent Natalia siap bertugas! Syukurlah lu masih hidup, kita habisi zombie-zombie ini bersama!"',
    sound: (sfx) => { if (sfx && sfx.playSmallBell) sfx.playSmallBell(2800, 0.45); },
    duration: 3.8
  },
  pump: {
    tag: '⚔ SIAP TEMPUR',
    text: '"Combat shotgun gua terkunci dan terisi penuh. Zombie mana pun yang mendekat bakal langsung gua tembak!"',
    sound: (sfx) => { if (sfx && sfx.playPumpRack) sfx.playPumpRack(); },
    duration: 3.5
  },
  cheer: {
    tag: '👍 EXCELLENT SHOT',
    text: '"Tembakan lu akurat bro! Pertahankan bidikan lu, kita pasti bisa tembus ke dermaga!"',
    sound: (sfx) => { if (sfx && sfx.playSmallBell) sfx.playSmallBell(3000, 0.5); },
    duration: 3.6
  },
  beckon: {
    tag: '👉 AMMO RESUPPLY',
    text: '"Gua bawa amunisi cadangan taktis. Isi ulang senjatamu sebelum gelombang berikutnya datang!"',
    sound: (sfx) => { if (sfx && sfx.playShellInsert) sfx.playShellInsert(); },
    duration: 3.6
  }
};

export function triggerNataliaGesture(name, sfxRef = Sfx) {
  const keys = ['wave', 'pump', 'cheer', 'beckon'];
  let target = name;
  let isCycling = false;
  if (!target || !NATALIA_GESTURES[target]) {
    isCycling = true;
    const curIdx = keys.indexOf(currentGesture);
    target = keys[(curIdx + 1) % keys.length];
  }

  currentGesture = target;
  gestureStartTime = performance.now();
  const cfg = NATALIA_GESTURES[target];
  gestureDuration = cfg.duration;

  if (cfg.sound) cfg.sound(sfxRef);

  let spokenText = cfg.text;
  if (isCycling) {
    const storyLine = NATALIA_STORY_LINES[nataliaStoryIdx % NATALIA_STORY_LINES.length];
    nataliaStoryIdx++;
    spokenText = storyLine;
  }
  showNataliaSubtitle(spokenText, 4800);
}

function createMiniWeapon(type) {
  const g = new THREE.Group();
  const gunSteelMat = new THREE.MeshStandardMaterial({ color: 0x242c35, roughness: 0.3, metalness: 0.85 });
  const gunDarkMat = new THREE.MeshStandardMaterial({ color: 0x161a20, roughness: 0.4, metalness: 0.7 });
  const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x2e1e17, roughness: 0.75, metalness: 0.1 });

  if (type === 'pump') {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.72, 10), gunSteelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0, 0.26);
    g.add(barrel);
    const mag = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.62, 10), gunSteelMat);
    mag.rotation.x = Math.PI / 2;
    mag.position.set(0, -0.028, 0.22);
    g.add(mag);
    const pumpSlide = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.18, 12), darkWoodMat);
    pumpSlide.rotation.x = Math.PI / 2;
    pumpSlide.position.set(0, -0.028, 0.20);
    g.add(pumpSlide);
    g.pumpSlideMesh = pumpSlide;
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.075, 0.18), gunDarkMat);
    receiver.position.set(0, 0, -0.08);
    g.add(receiver);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.078, 0.24), darkWoodMat);
    stock.position.set(0, -0.025, -0.25);
    g.add(stock);
  }

  return g;
}

function spawnNataliaShotTracer(agent, targetZombie) {
  if (!agent || !agent.root || !targetZombie) return;
  const scene = agent.root.parent;
  if (!scene) return;

  const muzzlePos = new THREE.Vector3();
  if (agent.weaponSocket) {
    agent.weaponSocket.getWorldPosition(muzzlePos);
    muzzlePos.y += 0.05;
  } else {
    muzzlePos.copy(agent.root.position);
    muzzlePos.y += 1.1;
  }

  const targetPos = targetZombie.mesh
    ? targetZombie.mesh.position.clone().add(new THREE.Vector3(0, 1.1, 0))
    : new THREE.Vector3(targetZombie.x, 1.1, targetZombie.z);

  // 1. Tracer Beam Geometry (high-visibility glowing bullet tracer)
  const geom = new THREE.BufferGeometry().setFromPoints([muzzlePos, targetPos]);
  const mat = new THREE.LineBasicMaterial({
    color: 0xffe680,
    linewidth: 2,
    transparent: true,
    opacity: 0.95
  });
  const line = new THREE.Line(geom, mat);
  scene.add(line);

  // 2. Muzzle Flash Sprite
  const flashMat = new THREE.SpriteMaterial({
    color: 0xffaa33,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending
  });
  const flash = new THREE.Sprite(flashMat);
  flash.position.copy(muzzlePos);
  flash.scale.set(0.55, 0.55, 0.55);
  scene.add(flash);

  setTimeout(() => {
    scene.remove(line);
    geom.dispose();
    mat.dispose();
    scene.remove(flash);
    flashMat.dispose();
  }, 90);
}

function makeRotator(rx, ry, rz, px, py, pz) {
  const crx = Math.cos(rx), srx = Math.sin(rx);
  const cry = Math.cos(ry), sry = Math.sin(ry);
  const crz = Math.cos(rz), srz = Math.sin(rz);

  return function(x, y, z) {
    const dx = x - px, dy = y - py, dz = z - pz;
    const dy1 = dy * crx - dz * srx;
    const dz1 = dy * srx + dz * crx;
    const dx1 = dx;
    const dx2 = dx1 * cry + dz1 * sry;
    const dz2 = -dx1 * sry + dz1 * cry;
    const dy2 = dy1;
    const dx3 = dx2 * crz - dy2 * srz;
    const dy3 = dx2 * srz + dy2 * crz;
    const dz3 = dz2;
    return [px + dx3, py + dy3, pz + dz3];
  };
}

export function buildNataliaCharacter(textures) {
  const root = new THREE.Group();
  root.name = 'Agent_Natalia_GLB';
  root.scale.set(NATALIA_SCALE, NATALIA_SCALE, NATALIA_SCALE);

  const miniPump = createMiniWeapon('pump');

  // Base socket position attached naturally to right hand in rest pose for bossgame.glb
  const weaponSocket = new THREE.Group();
  weaponSocket.position.set(0.31, 0.88, 0.05);
  weaponSocket.rotation.x = -Math.PI / 2.7;
  weaponSocket.rotation.y = -0.15;
  weaponSocket.add(miniPump);
  root.add(weaponSocket);

  let charMesh = null;
  let origPositions = null;
  let vertexWeights = null;
  let vertexCount = 0;

  function initMeshDeformation(mesh) {
    charMesh = mesh;
    const geom = mesh.geometry;
    const posAttr = geom.attributes.position;
    vertexCount = posAttr.count;

    origPositions = new Float32Array(vertexCount * 3);
    for (let i = 0; i < vertexCount * 3; i++) {
      origPositions[i] = posAttr.array[i];
    }

    vertexWeights = new Float32Array(vertexCount * 6); // [wHead, wLArm, wRArm, wTorso, wLLeg, wRLeg]
    for (let i = 0; i < vertexCount; i++) {
      const x = origPositions[i * 3];
      const y = origPositions[i * 3 + 1];

      let wHead = 0, wLArm = 0, wRArm = 0, wTorso = 0, wLLeg = 0, wRLeg = 0;

      // Head & Hair: y > 1.35
      if (y > 1.35 && Math.abs(x) < 0.22) {
        wHead = Math.min(1, Math.max(0, (y - 1.35) / 0.06));
      }

      // Left Arm: x < -0.12 && y in [0.70..1.38]
      if (x < -0.12 && y > 0.70 && y <= 1.38) {
        wLArm = Math.min(1, Math.max(0, (-x - 0.12) / 0.05));
      }

      // Right Arm: x > 0.12 && y in [0.70..1.38]
      if (x > 0.12 && y > 0.70 && y <= 1.38) {
        wRArm = Math.min(1, Math.max(0, (x - 0.12) / 0.05));
      }

      // Torso / Bodice: |x| <= 0.16 && y in [0.70..1.38]
      const upperSum = Math.min(1, wHead + wLArm + wRArm);
      if (y > 0.70) {
        const torsoFactor = Math.min(1, Math.max(0, (y - 0.70) / 0.08));
        wTorso = torsoFactor * (1 - upperSum);
      }

      // Skirt & Legs: y <= 0.72
      if (y <= 0.72) {
        const legFactor = Math.min(1, Math.max(0, (0.72 - y) / 0.06));
        if (x <= 0) {
          wLLeg = legFactor * (x < -0.02 ? 1 : Math.max(0, -x / 0.02));
        }
        if (x >= 0) {
          wRLeg = legFactor * (x > 0.02 ? 1 : Math.max(0, x / 0.02));
        }
      }

      vertexWeights[i * 6 + 0] = wHead;
      vertexWeights[i * 6 + 1] = wLArm;
      vertexWeights[i * 6 + 2] = wRArm;
      vertexWeights[i * 6 + 3] = wTorso;
      vertexWeights[i * 6 + 4] = wLLeg;
      vertexWeights[i * 6 + 5] = wRLeg;
    }
  }

  // Load official bossgame.glb asset
  const gltfLoader = new THREE.GLTFLoader();
  const glbUrl = '/models/bossgame.glb';

  gltfLoader.load(
    glbUrl,
    (gltf) => {
      const charScene = gltf.scene;
      charScene.name = 'Agent_Natalia_GLB';

      charScene.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            child.material.roughness = 0.76;
            child.material.metalness = 0.08;
            child.material.needsUpdate = true;
          }
          if (!charMesh) initMeshDeformation(child);
        }
      });

      charScene.position.set(0, 0, 0);
      root.add(charScene);
      console.log('[AGENT NATALIA] bossgame.glb loaded successfully as Agent Natalia!');
    },
    undefined,
    (err) => {
      console.warn('Retrying GLB load from bossgamerev.glb:', err);
      gltfLoader.load('/models/bossgamerev.glb', (gltf) => {
        gltf.scene.traverse((c) => {
          if (c.isMesh) {
            c.castShadow = true;
            c.receiveShadow = true;
            if (!charMesh) initMeshDeformation(c);
          }
        });
        root.add(gltf.scene);
      });
    }
  );

  return {
    root,
    weaponSocket,
    miniPump,
    get charMesh() { return charMesh; },
    get origPositions() { return origPositions; },
    get vertexWeights() { return vertexWeights; },
    get vertexCount() { return vertexCount; }
  };
}

export function initNataliaAgent(scene, textures) {
  nataliaModel = buildNataliaCharacter(textures);
  // Spawn Agent Natalia on tactical flanking position near bus crash site
  nataliaModel.root.position.set(3.2, 0.10, 14.2);
  nataliaModel.root.rotation.y = -0.45;
  scene.add(nataliaModel.root);

  const bannerEl = document.getElementById('natalia-npc-banner');
  if (bannerEl) {
    bannerEl.addEventListener('click', () => {
      triggerNataliaGesture();
    });
  }
}

export function updateNataliaAgent(camera, Sfx, dt = 0.016) {
  if (!nataliaModel) return;

  const now = performance.now();
  const t = now * 0.002;

  const targetX = (typeof playerPos !== 'undefined') ? playerPos.x : camera.position.x;
  const targetZ = (typeof playerPos !== 'undefined') ? playerPos.z : camera.position.z;

  // Offset flank position (Natalia covers player's flank)
  const pYaw = (typeof yaw !== 'undefined') ? yaw : camera.rotation.y;
  const flankOffsetX = Math.cos(pYaw) * 2.2;
  const flankOffsetZ = -Math.sin(pYaw) * 2.2;
  const goalX = targetX + flankOffsetX;
  const goalZ = targetZ + flankOffsetZ;

  const dx = goalX - nataliaModel.root.position.x;
  const dz = goalZ - nataliaModel.root.position.z;
  const distToGoal = Math.hypot(dx, dz);
  const distToPlayer = Math.hypot(targetX - nataliaModel.root.position.x, targetZ - nataliaModel.root.position.z);

  // 1. Companion Following AI (Intelligent Flanking Follow)
  let isWalking = false;
  let isSprinting = false;

  if (nataliaFollowMode) {
    if (distToPlayer > 34.0) {
      nataliaModel.root.position.x = targetX + flankOffsetX;
      nataliaModel.root.position.z = targetZ + flankOffsetZ;
    }

    const stopDist = 1.8;
    if (distToGoal > stopDist) {
      isWalking = true;
      isSprinting = distToGoal > 5.0;
      const speed = isSprinting ? 7.0 : 4.0;

      const dirX = dx / distToGoal;
      const dirZ = dz / distToGoal;

      const stepX = dirX * speed * dt;
      const stepZ = dirZ * speed * dt;

      const curX = nataliaModel.root.position.x;
      const curZ = nataliaModel.root.position.z;

      let movedX = false;
      let movedZ = false;

      if (!checkWallCollision(curX + stepX, curZ)) {
        natalModel_stepX: nataliaModel.root.position.x += stepX;
        movedX = true;
      }
      if (!checkWallCollision(nataliaModel.root.position.x, curZ + stepZ)) {
        nataliaModel.root.position.z += stepZ;
        movedZ = true;
      }

      if (!movedX && !movedZ) {
        const perpX = -dirZ * speed * dt;
        const perpZ = dirX * speed * dt;
        if (!checkWallCollision(curX + perpX, curZ + perpZ)) {
          nataliaModel.root.position.x += perpX;
          nataliaModel.root.position.z += perpZ;
        } else if (!checkWallCollision(curX - perpX, curZ - perpZ)) {
          nataliaModel.root.position.x -= perpX;
          nataliaModel.root.position.z -= perpZ;
        }
      }

      const moveYaw = Math.atan2(dirX, dirZ);
      nataliaModel.root.rotation.y = THREE.MathUtils.lerp(
        nataliaModel.root.rotation.y,
        moveYaw,
        0.16
      );

      walkCadence += dt * (speed * 1.8);
      const stride = Math.sin(walkCadence);
      const curGY = getTerrainHeight(nataliaModel.root.position.x, nataliaModel.root.position.z);
      nataliaModel.root.position.y = curGY + 0.08 + Math.abs(stride) * 0.055;

      if (Math.abs(stride) > 0.85 && now - lastFootstepTime > (isSprinting ? 250 : 360)) {
        lastFootstepTime = now;
        if (Sfx && Sfx.playSnowStep) Sfx.playSnowStep();
      }
    } else {
      const curGY = getTerrainHeight(nataliaModel.root.position.x, nataliaModel.root.position.z);
      nataliaModel.root.position.y = curGY + 0.08 + Math.sin(t * 1.8) * 0.008;
      const targetAngle = Math.atan2(targetX - nataliaModel.root.position.x, targetZ - nataliaModel.root.position.z);
      nataliaModel.root.rotation.y = THREE.MathUtils.lerp(
        nataliaModel.root.rotation.y,
        targetAngle,
        0.08
      );
      walkCadence = THREE.MathUtils.lerp(walkCadence, 0, 0.1);
    }
  } else {
    const curGY = getTerrainHeight(nataliaModel.root.position.x, nataliaModel.root.position.z);
    nataliaModel.root.position.y = curGY + 0.08 + Math.sin(t * 1.8) * 0.008;
    walkCadence = THREE.MathUtils.lerp(walkCadence, 0, 0.1);
  }

  // 2. COMBAT SHOOTING DEFENSE (Agent Natalia shoots and eliminates zombies!)
  if (zombies && zombies.length > 0) {
    let targetZombie = null;
    let minThreatScore = 22.0; // Tactical shooting range 22m

    for (let i = 0; i < zombies.length; i++) {
      const z = zombies[i];
      if (!z.isDead && z.hp > 0) {
        const dToPlayer = Math.hypot(z.x - targetX, z.z - targetZ);
        const dToAgent = Math.hypot(z.x - nataliaModel.root.position.x, z.z - nataliaModel.root.position.z);
        if (dToAgent < 22.0) {
          const threat = dToAgent + (dToPlayer < 7.0 ? -6.0 : 0.0);
          if (threat < minThreatScore) {
            minThreatScore = threat;
            targetZombie = z;
          }
        }
      }
    }

    if (targetZombie && now > combatShootCooldown) {
      combatShootCooldown = now + 1700 + Math.random() * 500; // 1.7s - 2.2s shooting cadence
      const aimAngle = Math.atan2(targetZombie.x - nataliaModel.root.position.x, targetZombie.z - nataliaModel.root.position.z);
      nataliaModel.root.rotation.y = aimAngle;

      triggerNataliaGesture('pump', Sfx);

      // Visual muzzle flash & bullet tracer beam
      spawnNataliaShotTracer(nataliaModel, targetZombie);

      // Deal high-impact agent shotgun damage
      const damage = 60 + Math.floor(Math.random() * 25); // 60-85 damage
      targetZombie.hp -= damage;

      if (Sfx && Sfx.playShotgun) Sfx.playShotgun();
      if (Sfx && Sfx.playPumpRack) {
        setTimeout(() => Sfx.playPumpRack(), 600);
      }

      if (targetZombie.mesh) {
        createAirborneBloodDrop(targetZombie.mesh.position);
      }

      // Check kill
      if (targetZombie.hp <= 0 && !targetZombie.isDead) {
        const shotDist = Math.hypot(targetZombie.x - nataliaModel.root.position.x, targetZombie.z - nataliaModel.root.position.z);
        const shotDir = new THREE.Vector3(
          targetZombie.x - nataliaModel.root.position.x,
          0,
          targetZombie.z - nataliaModel.root.position.z
        ).normalize();

        killZombieWithKinematics(targetZombie, shotDir, shotDist, true, state, () => updateHUD(state), nextWave);
        spawnBloodPoolOnSnow(targetZombie.x, targetZombie.z, 0.9);

        const killShouts = [
          "Target eliminated! Sektor ini aman!",
          "Headshot! Satu zombie lagi tumbang!",
          "Mampus lu monster! Maju terus survivor!",
          "Beres! Tetap waspada di samping gua!",
          "Threat neutralized! Area bersih!"
        ];
        showNataliaSubtitle(killShouts[Math.floor(Math.random() * killShouts.length)], 2800);
      } else {
        const shootShouts = [
          "Gua tembak yang di situ, awas!",
          "Covering fire! Mundur dikit biar gua habisi!",
          "Tembak bareng-bareng! Jangan biarkan mereka mendekat!",
          "Kena telak! Hajar lagi!"
        ];
        showNataliaSubtitle(shootShouts[Math.floor(Math.random() * shootShouts.length)], 2200);
      }
    }
  }

  // Initial greeting
  if (!hasAutoGreeted && distToPlayer < 4.8) {
    hasAutoGreeted = true;
    triggerNataliaGesture('wave', Sfx);
  }

  // Kinematic Rig & Mesh Gesture Deformation
  if (nataliaModel.charMesh && nataliaModel.origPositions && nataliaModel.vertexWeights) {
    const vCount = nataliaModel.vertexCount;
    const orig = nataliaModel.origPositions;
    const weights = nataliaModel.vertexWeights;
    const posArr = nataliaModel.charMesh.geometry.attributes.position.array;

    let h_rx = 0, h_ry = 0, h_rz = 0;
    let la_rx = 0, la_ry = 0, la_rz = 0;
    let ra_rx = 0, ra_ry = 0, ra_rz = 0;
    let t_rx = 0, t_ry = 0, t_rz = 0;
    let ll_rx = 0, ll_ry = 0, ll_rz = 0;
    let rl_rx = 0, rl_ry = 0, rl_rz = 0;

    // Alive Idle Motion
    const breath = Math.sin(t * 1.8);
    t_rx += breath * 0.016;
    t_rz += Math.sin(t * 0.9) * 0.02;
    ra_rx += breath * 0.01;
    la_rx += breath * 0.01;

    // Walking / Running Strides
    if (isWalking) {
      const strideAmp = isSprinting ? 0.70 : 0.50;
      ll_rx += Math.sin(walkCadence) * strideAmp;
      rl_rx += -Math.sin(walkCadence) * strideAmp;

      la_rx += -Math.sin(walkCadence) * 0.38;
      ra_rx += Math.sin(walkCadence) * 0.12;
      t_ry += Math.sin(walkCadence) * 0.06;
      t_rz += -Math.sin(walkCadence) * 0.025;
    }

    // Head Tracking towards player / camera
    if (distToPlayer < 7.0) {
      const headWorldY = nataliaModel.root.position.y + 1.48 * NATALIA_SCALE;
      const tdx = camera.position.x - nataliaModel.root.position.x;
      const tdy = camera.position.y - headWorldY;
      const tdz = camera.position.z - nataliaModel.root.position.z;

      const worldAngle = Math.atan2(tdx, tdz);
      const charAngle = nataliaModel.root.rotation.y;
      let relYaw = THREE.MathUtils.euclideanModulo(worldAngle - charAngle + Math.PI, Math.PI * 2) - Math.PI;
      relYaw = Math.max(-0.6, Math.min(0.6, relYaw));

      const hDist = Math.hypot(tdx, tdz);
      let relPitch = -Math.atan2(tdy, hDist);
      relPitch = Math.max(-0.4, Math.min(0.4, relPitch));

      headYaw = THREE.MathUtils.lerp(headYaw, relYaw, 0.12);
      headPitch = THREE.MathUtils.lerp(headPitch, relPitch, 0.12);
      h_ry += headYaw;
      h_rx += headPitch;
    } else {
      headYaw = THREE.MathUtils.lerp(headYaw, Math.sin(t * 0.7) * 0.18, 0.05);
      headPitch = THREE.MathUtils.lerp(headPitch, 0, 0.05);
      h_ry += headYaw;
      h_rx += headPitch;
    }

    // Active Gesture Kinematics
    const gTime = (now - gestureStartTime) * 0.001;
    if (gTime < gestureDuration && currentGesture !== 'idle') {
      const gProg = gTime / gestureDuration;
      const blend = Math.sin(gProg * Math.PI);

      if (currentGesture === 'wave') {
        la_rx += -1.30 * blend;
        la_rz += (0.65 + Math.sin(gTime * 14) * 0.45) * blend;
        la_ry += 0.25 * blend;
        h_rz += Math.sin(gTime * 7) * 0.14 * blend;
        h_rx += 0.08 * blend;
      } else if (currentGesture === 'pump') {
        // Combat shotgun firing stance
        t_rx += 0.20 * blend;
        t_rz += -0.04 * blend;
        ra_rx += -0.52 * blend;
        ra_rz += -0.16 * blend;
        const pumpSlide = Math.sin(gTime * 8);
        ra_ry += pumpSlide * 0.14 * blend;
        la_rx += -0.45 * blend;
        la_rz += -0.22 * blend;
        h_rx += (0.16 + Math.sin(gTime * 6) * 0.08) * blend;
        if (nataliaModel.miniPump && nataliaModel.miniPump.pumpSlideMesh) {
          nataliaModel.miniPump.pumpSlideMesh.position.z = 0.20 + pumpSlide * 0.05 * blend;
        }
      } else if (currentGesture === 'cheer') {
        la_rx += -0.80 * blend;
        la_rz += (0.38 + Math.sin(gTime * 8) * 0.12) * blend;
        la_ry += -0.35 * blend;
        t_rz += -0.06 * blend;
        h_rx += Math.sin(gTime * 9) * 0.18 * blend;
      } else if (currentGesture === 'beckon') {
        la_rx += (-0.65 + Math.sin(gTime * 6) * 0.22) * blend;
        la_rz += (-0.32 + Math.sin(gTime * 8) * 0.32) * blend;
        la_ry += 0.45 * blend;
        t_ry += 0.14 * blend;
        h_ry += -0.16 * blend;
      }
    } else if (currentGesture !== 'idle') {
      currentGesture = 'idle';
    }

    // Joint Rotators
    const rotHead = makeRotator(h_rx, h_ry, h_rz, 0, 1.38, 0);
    const rotLArm = makeRotator(la_rx, la_ry, la_rz, -0.16, 1.32, 0);
    const rotRArm = makeRotator(ra_rx, ra_ry, ra_rz, 0.16, 1.32, 0);
    const rotTorso = makeRotator(t_rx, t_ry, t_rz, 0, 0.85, 0);
    const rotLLeg = makeRotator(ll_rx, ll_ry, ll_rz, -0.09, 0.70, 0);
    const rotRLeg = makeRotator(rl_rx, rl_ry, rl_rz, 0.09, 0.70, 0);

    for (let i = 0; i < vCount; i++) {
      const idx6 = i * 6;
      const wHead = weights[idx6];
      const wLArm = weights[idx6 + 1];
      const wRArm = weights[idx6 + 2];
      const wTorso = weights[idx6 + 3];
      const wLLeg = weights[idx6 + 4];
      const wRLeg = weights[idx6 + 5];

      const idx3 = i * 3;
      const x0 = orig[idx3];
      const y0 = orig[idx3 + 1];
      const z0 = orig[idx3 + 2];

      let fx = x0, fy = y0, fz = z0;

      if (wHead > 0.001) {
        const [hx, hy, hz] = rotHead(x0, y0, z0);
        fx += (hx - x0) * wHead;
        fy += (hy - y0) * wHead;
        fz += (hz - z0) * wHead;
      }
      if (wLArm > 0.001) {
        const [lx, ly, lz] = rotLArm(x0, y0, z0);
        fx += (lx - x0) * wLArm;
        fy += (ly - y0) * wLArm;
        fz += (lz - z0) * wLArm;
      }
      if (wRArm > 0.001) {
        const [rx, ry, rz] = rotRArm(x0, y0, z0);
        fx += (rx - x0) * wRArm;
        fy += (ry - y0) * wRArm;
        fz += (rz - z0) * wRArm;
      }
      if (wTorso > 0.001) {
        const [tx, ty, tz] = rotTorso(x0, y0, z0);
        fx += (tx - x0) * wTorso;
        fy += (ty - y0) * wTorso;
        fz += (tz - z0) * wTorso;
      }
      if (wLLeg > 0.001) {
        const [llx, lly, llz] = rotLLeg(x0, y0, z0);
        fx += (llx - x0) * wLLeg;
        fy += (lly - y0) * wLLeg;
        fz += (llz - z0) * wLLeg;
      }
      if (wRLeg > 0.001) {
        const [rlx, rly, rlz] = rotRLeg(x0, y0, z0);
        fx += (rlx - x0) * wRLeg;
        fy += (rly - y0) * wRLeg;
        fz += (rlz - z0) * wRLeg;
      }

      posArr[idx3] = fx;
      posArr[idx3 + 1] = fy;
      posArr[idx3 + 2] = fz;
    }
    nataliaModel.charMesh.geometry.attributes.position.needsUpdate = true;

    // Attach weapon socket seamlessly to transformed right hand
    const [rhX, rhY, rhZ] = rotRArm(0.31, 0.88, 0.05);
    const [finX, finY, finZ] = rotTorso(rhX, rhY, rhZ);
    nataliaModel.weaponSocket.position.set(finX, finY, finZ);
    nataliaModel.weaponSocket.rotation.x = -Math.PI / 2.7 + ra_rx * 0.9 + t_rx * 0.5;
    nataliaModel.weaponSocket.rotation.y = -0.15 + ra_ry * 0.9 + t_ry * 0.5;
    nataliaModel.weaponSocket.rotation.z = ra_rz * 0.9 + t_rz * 0.5;
  }
}
