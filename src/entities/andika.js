/* =========================================================================
   HERO & COMPANION: ANDIKA / KRISTIN (OFFICIAL PS2 3D GLB CHARACTER ASSET)
   - Rescaled & prominent heroic presence (NPC_SCALE = 1.38)
   - Real-time kinematic vertex deformation & motion control
   - Expressive 3D gestures: Wave (Sapaan), Combat Pump, Thumbs Up, Beckon
   - Dynamic player tracking (head & eyes tilt/yaw towards player)
   - Alive idle breathing & natural weight shifting
   ========================================================================= */

import { Sfx } from '../audio/sfx.js';
import { checkWallCollision, getTerrainHeight } from '../world/environment.js';
import { zombies } from './enemies.js';
import { playerPos, yaw } from '../core/player.js';

const THREE = window.THREE;

export let andikaModel = null;
export const NPC_SCALE = 1.38; // Rescaled larger and heroic

// Companion AI & Following State
export let companionFollowMode = true;
let walkCadence = 0;
let lastFootstepTime = 0;
let combatShootCooldown = 0;

// Gesture state
export let currentGesture = 'idle';
let gestureStartTime = 0;
let gestureDuration = 4.0;
let hasAutoGreeted = false;
let headYaw = 0;
let headPitch = 0;

let dialogHideTimeout = null;

/**
 * Show pure cinematic dialogue subtitle that automatically fades out
 */
export function showDialogSubtitle(text, duration = 4500) {
  const bannerEl = document.getElementById('andika-npc-banner');
  const textEl = document.getElementById('andika-dialog-text');
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

export function toggleCompanionFollow(sfxRef = Sfx) {
  companionFollowMode = !companionFollowMode;
  if (sfxRef && sfxRef.playSmallBell) sfxRef.playSmallBell(companionFollowMode ? 2600 : 1800, 0.45);

  const text = companionFollowMode
    ? "Siap bro, gua ikutin lu dari belakang! Ayo jalan!"
    : "Oke, gua jaga di sini sambil mantau musuh! Panggil kalau lu butuh!";

  showDialogSubtitle(text, 3800);
}

export const STORY_CONVERSATIONS = [
  "Woi bro! Sumpah lu beneran masih hidup?! Gua kira lu udah abis diseret monster-monster itu di hutan salju ini! Masuk cepet, kunci pintunya!",
  "Lu liat anak-anak yang lain ga? Gua sempet liat tasnya Rian sama Fajar diseret sama orang-orang bertopeng ke arah kapel katedral kuno di puncak bukit...",
  "Kata buku catatan harian yang gua temuin di meja ini, hutan ini dikuasai sekte sesat Ordo Valentina. Mereka yang ngebantai dan ngerubah mayat jadi monster!",
  "Satu-satunya jalan kabur dari pulau terkutuk ini cuma perahu motor di dermaga utara. Tapi gerbangnya digembok pake rune okultis. Kita harus cari kuncinya!",
  "Gua nemu senapan pemburu peninggalan pemilik rumah ini. Kita ga bakal mati konyol di hutan ini, kita habisi mereka bareng-bareng!"
];
let storyConvIndex = 0;

export const GESTURE_CONFIG = {
  wave: {
    tag: '👋 TEMAN SEKOLAH',
    text: '"Woi bro! Sumpah lu beneran masih hidup?! Gua kira lu udah abis diseret monster-monster itu di hutan salju ini! Masuk sini cepetan!"',
    sound: (sfx) => { if (sfx && sfx.playSmallBell) sfx.playSmallBell(2400, 0.45); },
    duration: 3.8
  },
  pump: {
    tag: '⚔ SIAP TEMPUR',
    text: '"Gua nemu shotgun pemburu di rumah ini. Pegang senjata lu erat-erat, kita ga bakal mati konyol di hutan ini!"',
    sound: (sfx) => { if (sfx && sfx.playPumpRack) sfx.playPumpRack(); },
    duration: 3.5
  },
  cheer: {
    tag: '👍 SOLIDARITAS',
    text: '"Gokil, bidikan lu mantep juga pas kepepet! Tenang, gua jagain punggung lu. Kita harus kabur bareng-bareng!"',
    sound: (sfx) => { if (sfx && sfx.playSmallBell) sfx.playSmallBell(2800, 0.5); },
    duration: 3.6
  },
  beckon: {
    tag: '👉 AMBIL PELURU',
    text: '"Amunisi peluru shells gua taro di peti samping gua nih. Ambil secukupnya, jangan sampai kehabisan di luar!"',
    sound: (sfx) => { if (sfx && sfx.playShellInsert) sfx.playShellInsert(); },
    duration: 3.6
  }
};

export function triggerAndikaGesture(name, sfxRef = Sfx) {
  const keys = ['wave', 'pump', 'cheer', 'beckon'];
  let target = name;
  let isCycling = false;
  if (!target || !GESTURE_CONFIG[target]) {
    isCycling = true;
    const curIdx = keys.indexOf(currentGesture);
    target = keys[(curIdx + 1) % keys.length];
  }

  currentGesture = target;
  gestureStartTime = performance.now();
  const cfg = GESTURE_CONFIG[target];
  gestureDuration = cfg.duration;

  // Audio trigger
  if (cfg.sound) cfg.sound(sfxRef);

  // Spoken text line
  let spokenText = cfg.text;
  if (isCycling) {
    const storyLine = STORY_CONVERSATIONS[storyConvIndex % STORY_CONVERSATIONS.length];
    storyConvIndex++;
    spokenText = storyLine;
  }
  showDialogSubtitle(spokenText, 4800);

  // Weapon switch sync for combat gesture
  if (andikaModel && andikaModel.setWeapon) {
    if (target === 'pump') {
      andikaModel.setWeapon('pump');
    } else {
      andikaModel.setWeapon('spin');
    }
  }
}

export function createMiniWeapon(type) {
  const g = new THREE.Group();
  const gunSteelMat = new THREE.MeshStandardMaterial({ color: 0x242c35, roughness: 0.3, metalness: 0.85 });
  const gunDarkMat = new THREE.MeshStandardMaterial({ color: 0x161a20, roughness: 0.4, metalness: 0.7 });
  const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x2e1e17, roughness: 0.75, metalness: 0.1 });
  const golokBladeMat = new THREE.MeshStandardMaterial({ color: 0xaec0cf, roughness: 0.2, metalness: 0.95 });
  const golokEdgeMat = new THREE.MeshStandardMaterial({ color: 0xf5f9fd, roughness: 0.1, metalness: 0.98 });
  const golokBrassMat = new THREE.MeshStandardMaterial({ color: 0xd4a244, roughness: 0.25, metalness: 0.9 });

  if (type === 'spin') {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.62, 10), gunSteelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0, 0.22);
    g.add(barrel);
    const mag = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.54, 10), gunSteelMat);
    mag.rotation.x = Math.PI / 2;
    mag.position.set(0, -0.026, 0.18);
    g.add(mag);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.07, 0.14), gunDarkMat);
    body.position.set(0, 0, -0.05);
    g.add(body);
    const lever = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.008, 6, 12), gunDarkMat);
    lever.position.set(0, -0.045, -0.06);
    lever.rotation.y = Math.PI / 2;
    g.add(lever);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.065, 0.22), darkWoodMat);
    stock.position.set(0, -0.02, -0.20);
    g.add(stock);
  } else if (type === 'pump') {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.72, 10), gunSteelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0, 0.26);
    g.add(barrel);
    const mag = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.62, 10), gunSteelMat);
    mag.rotation.x = Math.PI / 2;
    mag.position.set(0, -0.028, 0.22);
    g.add(mag);
    const pump = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.16, 10), darkWoodMat);
    pump.name = 'miniPumpSlide';
    pump.rotation.x = Math.PI / 2;
    pump.position.set(0, -0.028, 0.20);
    g.add(pump);
    g.pumpSlideMesh = pump;
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.16), gunDarkMat);
    body.position.set(0, 0, -0.06);
    g.add(body);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.075, 0.24), darkWoodMat);
    stock.position.set(0, -0.02, -0.22);
    g.add(stock);
  } else if (type === 'golok') {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.06, 0.44), golokBladeMat);
    blade.position.set(0, 0, 0.20);
    g.add(blade);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.02, 0.42), golokEdgeMat);
    edge.position.set(0, -0.035, 0.20);
    g.add(edge);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.07, 0.02), golokBrassMat);
    guard.position.set(0, 0, -0.02);
    g.add(guard);
    const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.16, 10), darkWoodMat);
    hilt.rotation.x = Math.PI / 2;
    hilt.position.set(0, 0, -0.10);
    g.add(hilt);
  }
  return g;
}

// 3D rotation helper about arbitrary pivot
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

export function buildAndikaCharacter(textures) {
  const root = new THREE.Group();
  root.name = 'Kristin_Companion_GLB';
  root.scale.set(NPC_SCALE, NPC_SCALE, NPC_SCALE);

  const miniSpin = createMiniWeapon('spin');
  const miniPump = createMiniWeapon('pump');
  const miniGolok = createMiniWeapon('golok');

  // Base socket position attached naturally to right hand in rest pose
  const weaponSocket = new THREE.Group();
  weaponSocket.position.set(0.46, 0.98, 0.04);
  weaponSocket.rotation.x = -Math.PI / 2.7;
  weaponSocket.rotation.y = -0.15;
  weaponSocket.add(miniSpin);
  weaponSocket.add(miniPump);
  weaponSocket.add(miniGolok);
  root.add(weaponSocket);

  // Mesh deformation rig variables
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
      // Head & Hair
      if (y > 1.32 && Math.abs(x) < 0.28) {
        wHead = Math.min(1, Math.max(0, (y - 1.32) / 0.06));
      }
      // Left Arm & Forearm
      if (x < -0.30 && y > 0.82) {
        wLArm = Math.min(1, Math.max(0, (-x - 0.30) / 0.05));
      }
      // Right Arm & Forearm
      if (x > 0.30 && y > 0.82) {
        wRArm = Math.min(1, Math.max(0, (x - 0.30) / 0.05));
      }
      // Torso / Chest / Spine
      const upperSum = Math.min(1, wHead + wLArm + wRArm);
      if (y > 0.80) {
        const torsoFactor = Math.min(1, Math.max(0, (y - 0.80) / 0.08));
        wTorso = torsoFactor * (1 - upperSum);
      }
      // Left Leg (Pivot hip: -0.12, 0.82, 0)
      if (y <= 0.84) {
        const legFactor = Math.min(1, Math.max(0, (0.84 - y) / 0.06));
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

  // Load the 3D asset `ps2_character_asset.glb`
  const gltfLoader = new THREE.GLTFLoader();
  const glbUrl = '/models/ps2_character_asset.glb';

  gltfLoader.load(
    glbUrl,
    (gltf) => {
      const charScene = gltf.scene;
      charScene.name = 'Kristin_PS2_Character';

      charScene.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            child.material.roughness = 0.82;
            child.material.metalness = 0.08;
            child.material.needsUpdate = true;
          }
          if (!charMesh) initMeshDeformation(child);
        }
      });

      charScene.position.set(0, 0, 0);
      root.add(charScene);
      console.log('★ Kristin PS2 Character Asset loaded with Kinematic Rigging!');
    },
    undefined,
    (err) => {
      console.warn('Retrying GLB load from models directory:', err);
      gltfLoader.load('/models/ps2_character_asset.glb', (gltf) => {
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
    miniSpin,
    miniPump,
    miniGolok,
    get charMesh() { return charMesh; },
    get origPositions() { return origPositions; },
    get vertexWeights() { return vertexWeights; },
    get vertexCount() { return vertexCount; },
    setWeapon(w) {
      miniSpin.visible = (w === 'spin');
      miniPump.visible = (w === 'pump');
      miniGolok.visible = (w === 'golok');
    }
  };
}

export function initAndikaCompanion(scene, textures) {
  andikaModel = buildAndikaCharacter(textures);
  // Spawn companion Kristin right near player start at bus crash site
  andikaModel.root.position.set(1.6, 0.10, 13.8);
  andikaModel.root.rotation.y = -0.35;
  scene.add(andikaModel.root);
  andikaModel.setWeapon('spin');

  // Wire up gesture buttons in DOM
  const btns = document.querySelectorAll('.andika-gesture-btn');
  btns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const g = btn.getAttribute('data-gesture');
      triggerAndikaGesture(g);
    });
  });

  const btnFollow = document.getElementById('btn-toggle-follow');
  if (btnFollow) {
    btnFollow.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleCompanionFollow();
    });
  }

  const bannerEl = document.getElementById('andika-npc-banner');
  if (bannerEl) {
    bannerEl.addEventListener('click', (e) => {
      if (e.target.tagName !== 'BUTTON') {
        triggerAndikaGesture();
      }
    });
  }
}

export function updateAndikaCompanion(camera, Sfx, dt = 0.016) {
  if (!andikaModel) return;

  const now = performance.now();
  const t = now * 0.002;

  // Use actual survivor player position
  const targetX = (typeof playerPos !== 'undefined') ? playerPos.x : camera.position.x;
  const targetZ = (typeof playerPos !== 'undefined') ? playerPos.z : camera.position.z;

  const dx = targetX - andikaModel.root.position.x;
  const dz = targetZ - andikaModel.root.position.z;
  const distToPlayer = Math.hypot(dx, dz);

  // 1. Companion Following AI (Moves & Follows the Player)
  let isWalking = false;
  let isSprinting = false;

  if (companionFollowMode) {
    // Catch-up reposition if player runs too far
    if (distToPlayer > 32.0) {
      const pYaw = (typeof yaw !== 'undefined') ? yaw : camera.rotation.y;
      andikaModel.root.position.x = targetX - Math.sin(pYaw) * 3.5;
      andikaModel.root.position.z = targetZ - Math.cos(pYaw) * 3.5;
    }

    const stopDist = 2.1;
    if (distToPlayer > stopDist) {
      isWalking = true;
      isSprinting = distToPlayer > 5.5;
      const speed = isSprinting ? 6.8 : 3.8;

      const dirX = dx / distToPlayer;
      const dirZ = dz / distToPlayer;

      const stepX = dirX * speed * dt;
      const stepZ = dirZ * speed * dt;

      const curX = andikaModel.root.position.x;
      const curZ = andikaModel.root.position.z;

      // Smart sliding & obstacle avoidance
      let movedX = false;
      let movedZ = false;

      if (!checkWallCollision(curX + stepX, curZ)) {
        andikaModel.root.position.x += stepX;
        movedX = true;
      }
      if (!checkWallCollision(andikaModel.root.position.x, curZ + stepZ)) {
        andikaModel.root.position.z += stepZ;
        movedZ = true;
      }

      // If directly blocked on both axes, try tangent lateral sliding
      if (!movedX && !movedZ) {
        const perpX = -dirZ * speed * dt;
        const perpZ = dirX * speed * dt;
        if (!checkWallCollision(curX + perpX, curZ + perpZ)) {
          andikaModel.root.position.x += perpX;
          andikaModel.root.position.z += perpZ;
        } else if (!checkWallCollision(curX - perpX, curZ - perpZ)) {
          andikaModel.root.position.x -= perpX;
          andikaModel.root.position.z -= perpZ;
        }
      }

      // Smoothly turn to face travel direction
      const moveYaw = Math.atan2(dirX, dirZ);
      andikaModel.root.rotation.y = THREE.MathUtils.lerp(
        andikaModel.root.rotation.y,
        moveYaw,
        0.16
      );

      // Walking stride & step height on undulating terrain
      walkCadence += dt * (speed * 1.8);
      const stride = Math.sin(walkCadence);
      const curGY = getTerrainHeight(andikaModel.root.position.x, andikaModel.root.position.z);
      andikaModel.root.position.y = curGY + 0.10 + Math.abs(stride) * 0.055;

      // Footsteps in snow synchronized to walk cadence
      if (Math.abs(stride) > 0.85 && now - lastFootstepTime > (isSprinting ? 260 : 370)) {
        lastFootstepTime = now;
        if (Sfx && Sfx.playSnowStep) Sfx.playSnowStep();
      }
    } else {
      // Stopped near player, breathing on terrain height
      const curGY = getTerrainHeight(andikaModel.root.position.x, andikaModel.root.position.z);
      andikaModel.root.position.y = curGY + 0.10 + Math.sin(t * 1.8) * 0.008;
      const targetAngle = Math.atan2(dx, dz);
      andikaModel.root.rotation.y = THREE.MathUtils.lerp(
        andikaModel.root.rotation.y,
        targetAngle,
        0.08
      );
      walkCadence = THREE.MathUtils.lerp(walkCadence, 0, 0.1);
    }
  } else {
    // Hold position mode: stays in place, breathing on terrain height
    const curGY = getTerrainHeight(andikaModel.root.position.x, andikaModel.root.position.z);
    andikaModel.root.position.y = curGY + 0.10 + Math.sin(t * 1.8) * 0.008;
    const targetAngle = Math.atan2(dx, dz);
    andikaModel.root.rotation.y = THREE.MathUtils.lerp(
      andikaModel.root.rotation.y,
      targetAngle,
      0.08
    );
    walkCadence = THREE.MathUtils.lerp(walkCadence, 0, 0.1);
  }

  // 2. Combat Defense (Kristin shoots and protects player from nearby zombies)
  if (zombies && zombies.length > 0) {
    let nearestZ = null;
    let minZDist = 7.5;
    for (let i = 0; i < zombies.length; i++) {
      const z = zombies[i];
      if (!z.isDead && z.hp > 0) {
        const d = Math.hypot(z.x - andikaModel.root.position.x, z.z - andikaModel.root.position.z);
        if (d < minZDist) {
          minZDist = d;
          nearestZ = z;
        }
      }
    }

    if (nearestZ && now > combatShootCooldown) {
      combatShootCooldown = now + 2400; // Shotgun firing cooldown
      const aimAngle = Math.atan2(nearestZ.x - andikaModel.root.position.x, nearestZ.z - andikaModel.root.position.z);
      andikaModel.root.rotation.y = aimAngle;

      triggerAndikaGesture('pump', Sfx);
      nearestZ.hp -= 45;
      if (Sfx && Sfx.playShotgun) Sfx.playShotgun();

      // Show combat shout
      const shouts = [
        "Mampus lu monster!",
        "Gua tembak yang di situ, awas!",
        "Jangan deket-deket teman gua!",
        "Rasain timah panas!"
      ];
      const shoutText = shouts[Math.floor(Math.random() * shouts.length)];
      showDialogSubtitle(shoutText, 2500);
    }
  }

  // Dynamic Initial Greeting (plays greeting subtitle once when first meeting)
  if (!hasAutoGreeted && distToPlayer < 4.4) {
    hasAutoGreeted = true;
    triggerAndikaGesture('wave', Sfx);
  }

  // Kinematic Rig & Mesh Gesture Deformation
  if (andikaModel.charMesh && andikaModel.origPositions && andikaModel.vertexWeights) {
    const vCount = andikaModel.vertexCount;
    const orig = andikaModel.origPositions;
    const weights = andikaModel.vertexWeights;
    const posArr = andikaModel.charMesh.geometry.attributes.position.array;

    // Base Rotations
    let h_rx = 0, h_ry = 0, h_rz = 0;
    let la_rx = 0, la_ry = 0, la_rz = 0;
    let ra_rx = 0, ra_ry = 0, ra_rz = 0;
    let t_rx = 0, t_ry = 0, t_rz = 0;
    let ll_rx = 0, ll_ry = 0, ll_rz = 0;
    let rl_rx = 0, rl_ry = 0, rl_rz = 0;

    // Alive Idle Motion Control
    const breath = Math.sin(t * 1.8);
    t_rx += breath * 0.016; // Breathing chest
    t_rz += Math.sin(t * 0.9) * 0.02; // Weight shift between feet
    ra_rx += breath * 0.01;
    la_rx += breath * 0.01;

    // Realistic Walking & Running Leg/Arm Strides
    if (isWalking) {
      const strideAmp = isSprinting ? 0.75 : 0.55;
      ll_rx += Math.sin(walkCadence) * strideAmp;
      rl_rx += -Math.sin(walkCadence) * strideAmp;

      // Natural opposing arm swing
      la_rx += -Math.sin(walkCadence) * 0.42;
      ra_rx += Math.sin(walkCadence) * 0.14;
      t_ry += Math.sin(walkCadence) * 0.08;
      t_rz += -Math.sin(walkCadence) * 0.03;
    }

    // Head Tracking towards camera / player
    if (distToPlayer < 7.0) {
      const headWorldY = andikaModel.root.position.y + 1.45 * NPC_SCALE;
      const dx = camera.position.x - andikaModel.root.position.x;
      const dy = camera.position.y - headWorldY;
      const dz = camera.position.z - andikaModel.root.position.z;

      const worldAngle = Math.atan2(dx, dz);
      const charAngle = andikaModel.root.rotation.y;
      let relYaw = THREE.MathUtils.euclideanModulo(worldAngle - charAngle + Math.PI, Math.PI * 2) - Math.PI;
      relYaw = Math.max(-0.6, Math.min(0.6, relYaw));

      const hDist = Math.hypot(dx, dz);
      let relPitch = -Math.atan2(dy, hDist);
      relPitch = Math.max(-0.4, Math.min(0.4, relPitch));

      headYaw = THREE.MathUtils.lerp(headYaw, relYaw, 0.12);
      headPitch = THREE.MathUtils.lerp(headPitch, relPitch, 0.12);
      h_ry += headYaw;
      h_rx += headPitch;
    } else {
      // Idle survey head motion
      headYaw = THREE.MathUtils.lerp(headYaw, Math.sin(t * 0.7) * 0.18, 0.05);
      headPitch = THREE.MathUtils.lerp(headPitch, 0, 0.05);
      h_ry += headYaw;
      h_rx += headPitch;
    }

    // Active Gesture Kinematics
    const gTime = (now - gestureStartTime) * 0.001;
    if (gTime < gestureDuration && currentGesture !== 'idle') {
      const gProg = gTime / gestureDuration;
      const blend = Math.sin(gProg * Math.PI); // Smooth ease-in & ease-out

      if (currentGesture === 'wave') {
        // High enthusiastic waving left arm
        la_rx += -1.30 * blend;
        la_rz += (0.65 + Math.sin(gTime * 14) * 0.45) * blend;
        la_ry += 0.25 * blend;
        h_rz += Math.sin(gTime * 7) * 0.14 * blend;
        h_rx += 0.08 * blend;
      } else if (currentGesture === 'pump') {
        // Aggressive forward combat stance
        t_rx += 0.20 * blend;
        t_rz += -0.04 * blend;
        // Raise shotgun to chest height
        ra_rx += -0.52 * blend;
        ra_rz += -0.16 * blend;
        const pumpSlide = Math.sin(gTime * 8);
        ra_ry += pumpSlide * 0.14 * blend;
        // Support arm
        la_rx += -0.45 * blend;
        la_rz += -0.22 * blend;
        h_rx += (0.16 + Math.sin(gTime * 6) * 0.08) * blend;
        // Animate mini pump slide mesh if active
        if (andikaModel.miniPump && andikaModel.miniPump.pumpSlideMesh) {
          andikaModel.miniPump.pumpSlideMesh.position.z = 0.20 + pumpSlide * 0.05 * blend;
        }
      } else if (currentGesture === 'cheer') {
        // Thumbs up / salute forward
        la_rx += -0.80 * blend;
        la_rz += (0.38 + Math.sin(gTime * 8) * 0.12) * blend;
        la_ry += -0.35 * blend;
        t_rz += -0.06 * blend;
        // Proud head nod
        h_rx += Math.sin(gTime * 9) * 0.18 * blend;
      } else if (currentGesture === 'beckon') {
        // Beckoning sweep towards ammo crate
        la_rx += (-0.65 + Math.sin(gTime * 6) * 0.22) * blend;
        la_rz += (-0.32 + Math.sin(gTime * 8) * 0.32) * blend;
        la_ry += 0.45 * blend;
        t_ry += 0.14 * blend;
        h_ry += -0.16 * blend;
      }
    } else if (currentGesture !== 'idle') {
      currentGesture = 'idle';
    }

    // Build transformation rotators with exact body joint pivots
    const rotHead = makeRotator(h_rx, h_ry, h_rz, 0, 1.35, 0);
    const rotLArm = makeRotator(la_rx, la_ry, la_rz, -0.32, 1.25, 0);
    const rotRArm = makeRotator(ra_rx, ra_ry, ra_rz, 0.32, 1.25, 0);
    const rotTorso = makeRotator(t_rx, t_ry, t_rz, 0, 0.85, 0);
    const rotLLeg = makeRotator(ll_rx, ll_ry, ll_rz, -0.12, 0.82, 0);
    const rotRLeg = makeRotator(rl_rx, rl_ry, rl_rz, 0.12, 0.82, 0);

    // Apply vertex deformation smoothly across all 3372 vertices
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
    andikaModel.charMesh.geometry.attributes.position.needsUpdate = true;

    // Attach weapon socket seamlessly to transformed right hand
    const [rhX, rhY, rhZ] = rotRArm(0.46, 0.98, 0.04);
    const [finX, finY, finZ] = rotTorso(rhX, rhY, rhZ);
    andikaModel.weaponSocket.position.set(finX, finY, finZ);
    andikaModel.weaponSocket.rotation.x = -Math.PI / 2.7 + ra_rx * 0.9 + t_rx * 0.5;
    andikaModel.weaponSocket.rotation.y = -0.15 + ra_ry * 0.9 + t_ry * 0.5;
    andikaModel.weaponSocket.rotation.z = ra_rz * 0.9 + t_rz * 0.5;
  }
}

export {
  andikaModel as kristinModel,
  initAndikaCompanion as initKristinCompanion,
  updateAndikaCompanion as updateKristinCompanion,
  buildAndikaCharacter as buildKristinCharacter
};
