/* =========================================================================
   HERO & COMPANION: KRISTIN (OFFICIAL PS2 3D GLB CHARACTER ASSET)
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

export let kristinModel = null;
export const NPC_SCALE = 1.38; // Rescaled larger and heroic

// Companion AI & Following State
export let companionFollowMode = true;
let walkCadence = 0;
let lastFootstepTime = 0;
let combatShootCooldown = 0;
let lastLeadCalloutTime = 0;
let lastWaitCalloutTime = 0;
let lastArriveCalloutTime = 0;

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
  const bannerEl = document.getElementById('kristin-npc-banner');
  const textEl = document.getElementById('kristin-dialog-text');
  if (!bannerEl) return;

  if (text && textEl) {
    let clean = text.trim();
    // Strip leading name prefixes like "KRISTIN: " to avoid double rendering with the name banner
    clean = clean.replace(/^(KRISTIN|RODRICK|WARGA|DARRELL|MRS\. ELEANOR|EDWARD):\s*/i, '');
    clean = clean.replace(/^["']|["']$/g, '').trim();
    // Remove browser-like "(tekan [E])" from spoken character dialogue
    clean = clean.replace(/\s*\(tekan\s*\[.*?\]\)!?/gi, '');
    textEl.textContent = `"${clean}"`;
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

  const isEarly = (!window.__STORY_PHASE || window.__STORY_PHASE === 'orientation' || window.__STORY_PHASE === 'complication');
  let text = '';
  if (companionFollowMode) {
    text = isEarly
      ? 'KRISTIN: "Ayo Rod, ikuti gue! Gue tunjukin jalan ke objektif kita!"'
      : 'KRISTIN: "Siap Rod, gue cover dan dampingi lo! Ayo maju!"';
  } else {
    text = 'KRISTIN: "Oke Rod, gue tunggu di sini dulu. Jangan lama-lama ya!"';
  }

  showDialogSubtitle(text, 3800);
}

export const KRISTIN_OBJECTIVE_HINTS = {
  'orientation': [
    "Coba kita sapa warga sekitar dulu, Rod. Ada bapak tua di dekat gerbang dan pemburu di sebelah timur.",
    "Bicara dengan mereka (tekan [E]). Gue bakal rekam data biologis dan sampel airnya dari sini.",
    "Perhatikan Darrell di depan pondok timur. Dia tampak sangat waspada dan tidak tersenyum aneh seperti yang lain."
  ],
  'complication': [
    "Lari Rod, jangan berhenti! Kita belum punya senjata! Lari ke arah timur!",
    "Pondok Darrell ada di ujung gang timur! Ada tengkorak babi hutan di pagar depannya!",
    "Masuk ke dalam pondok Darrell! Ambil senapan laras ganda di atas mejanya, cepat!"
  ],
  'resolution': [
    "Bagus Rod, lo dapet senapannya! Tembak jatuh zombie yang mengepung pintu!",
    "Arahkan ke kepala mereka! Kita harus amankan pondok ini dulu!",
    "Habisi sisa mayat hidup di depan teras pondok, jangan biarkan mereka masuk!"
  ],
  'coda': [
    "Area pondok aman sekarang. Nyalakan alat perekam lo, catat apa yang baru saja terjadi.",
    "Kita harus segera mencari Mrs. Eleanor di mata air kuno sebelah barat.",
    "Ikuti jalur jalan setapak ke arah bukit barat, Rod. Mrs. Eleanor tahu jalan rahasia keluar dari Coldbrook."
  ],
  '1.1': [
    "Anyone who defied Father Raksha's cult lives away from the village square. Check the eastern lane, Rod.",
    "Darrell the huntsman told us he hunts wild boar. His cottage has the skull mounted on the fence post!",
    "Eastern lane, Darrell's cottage. Check the wooden table inside for his double-barrel shotgun! Hurry!"
  ],
  '1.2': [
    "The main road is chained shut by the Devout. We must find Mrs. Eleanor, the parish elder who refused the communion...",
    "Mrs. Eleanor! She lives near the ancient stone spring on the western ridge, Rod.",
    "Follow the cobblestone trail west toward the old spring. Find Mrs. Eleanor—she knows the hidden path through the hills!"
  ],
  '1.3': [
    "Replay the recording of the parish hymn near the spring, Rod. Listen closely to the count.",
    "The verses speak of 'Three prostrations, two bows, one silence.'",
    "There are three kneeling stone statues! Press 3 times on the left, 2 in the center, and 1 on the right!"
  ],
  '2.1': [
    "This ancient catacomb leads directly beneath the cathedral abbey. Search for clinical experiment records.",
    "I hear someone behind the cabinet down the hall! Check it out, someone might still be sane!"
  ],
  '2.2': [
    "The generator panel requires three glass tube fuses to power the shortwave radio. Search the premises.",
    "The fuses are scattered in the Ward, Water Kitchen, and Archive Room. Collect all three, Rod!"
  ],
  '2.3': [
    "The Main Lab passcode has 4 digits. Count: beds (7), barrels (3), red files (9), candles (1). The code is 7391!",
    "In the Water Kitchen! The valves are crimson. Matron Agnes hunts sound—shut all three pipeline valves to weaken her!"
  ],
  '2.4': [
    "The clinical notes state the most stable compound must be mixed first. Add Benjamin's ampoule first, Rod!",
    "Formulation order: Benjamin's Base -> Cryo-Stabilizer -> Pure Holy Water Sample!"
  ],
  '3.1': [
    "Father Raksha's purification ritual is gathering at the abbey bell tower plaza. We must ascend to the surface!",
    "Beware the Devout surrounding the square—they swarm in unison, but can be distracted by loud noises!"
  ],
  '3.2': [
    "Sever the 3 release valves on the ground, middle, and top floors of the bell tower before the vapor spreads!",
    "Father Raksha's chest is glowing with mutated ritual glyphs! Aim for the glowing core in his chest—that's his weak point!"
  ]
};

let hintCycleState = {};

export function giveKristinHint(objectiveId = '1.1', sfxRef = Sfx) {
  const hints = KRISTIN_OBJECTIVE_HINTS[objectiveId] || KRISTIN_OBJECTIVE_HINTS['1.1'];
  if (!hintCycleState[objectiveId]) hintCycleState[objectiveId] = 0;
  const index = hintCycleState[objectiveId] % hints.length;
  hintCycleState[objectiveId]++;

  const hintText = hints[index];
  showDialogSubtitle(hintText, 5500);
  if (sfxRef && sfxRef.playSmallBell) {
    sfxRef.playSmallBell(2400 + index * 200, 0.5);
  }
  return hintText;
}

export const STORY_CONVERSATIONS = [
  "Woi bro! Sumpah lu beneran masih hidup?! Gua kira lu udah tewas kena semburan sihir gelap tadi! Hutan ini bukan sekadar lembah alam biasa...",
  "Lu liat anggota tim riset yang lain ga? Gua sempet liat alat-alat pengukuran sama ranselnya anak-anak diseret makhluk-makhluk terkutuk ke arah hutan terlarang...",
  "Hasil artefak dan sampel yang kita gali tadi ngebuktiin ada segel sihir hitam kuno yang terkubur ratusan tahun. Dan penggalian riset kita ga sengaja ngebangkitin itu semua!",
  "Satu-satunya jalan kabur dari lembah terkutuk ini cuma perahu motor di dermaga utara. Tapi gerbangnya digembok pake rune okultis. Kita harus cari kuncinya!",
  "Pegang shotgun lu erat-erat. Sebagai sesama mahasiswa peneliti, kita ga bakal mati konyol di lembah terkutuk ini. Kita habisi mereka bareng-bareng!"
];
let storyConvIndex = 0;

export const GESTURE_CONFIG = {
  wave: {
    tag: '👋 SAPAAN',
    text: '"Rod! Syukurlah kita selamat sampai di desa Coldbrook ini. Kabutnya tebal banget... Ikuti gue, ayo kita cari tahu apa yang terjadi!"',
    sound: (sfx) => { if (sfx && sfx.playSmallBell) sfx.playSmallBell(2400, 0.45); },
    duration: 3.8
  },
  point: {
    tag: '👉 PENUNJUK ARAH',
    text: '"Rod! Jalannya lewat sini, ikuti gue!"',
    sound: (sfx) => { if (sfx && sfx.playSmallBell) sfx.playSmallBell(2600, 0.4); },
    duration: 3.5
  },
  beckon: {
    tag: '👉 AJAK JALAN',
    text: '"Rod! Jangan melamun di belakang, ayo lekas ikuti gue!"',
    sound: (sfx) => { if (sfx && sfx.playSmallBell) sfx.playSmallBell(2400, 0.4); },
    duration: 3.6
  },
  pump: {
    tag: '⚔ SIAP TEMPUR',
    text: '"Pegang shotgun lo erat-erat, Rod! Kita habisi monster-monster ini!"',
    sound: (sfx) => { if (sfx && sfx.playPumpRack) sfx.playPumpRack(); },
    duration: 3.5
  },
  cheer: {
    tag: '👍 SOLIDARITAS',
    text: '"Bagus banget tembakan lo, Rod! Gue jagain punggung lo!"',
    sound: (sfx) => { if (sfx && sfx.playSmallBell) sfx.playSmallBell(2800, 0.5); },
    duration: 3.6
  }
};

export function triggerKristinGesture(name, sfxRef = Sfx) {
  const keys = ['wave', 'point', 'beckon', 'cheer'];
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
  gestureDuration = (cfg && cfg.duration) ? cfg.duration : 3.5;

  // Audio trigger
  if (cfg && cfg.sound) cfg.sound(sfxRef);

  // Spoken text line
  let spokenText = (cfg && cfg.text) ? cfg.text : '';
  if (isCycling) {
    const storyLine = STORY_CONVERSATIONS[storyConvIndex % STORY_CONVERSATIONS.length];
    storyConvIndex++;
    spokenText = storyLine;
  }
  if (spokenText) {
    showDialogSubtitle(spokenText, 4800);
  }

  // NOTE: Gestures NEVER force weapon changes! Weapons are controlled strictly by setWeapon().
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
  } else if (type === 'research') {
    // Environmental Science Field Clipboard & Water Sample Tube
    const boardMat = new THREE.MeshLambertMaterial({ color: 0x4a3319 });
    const paperMat = new THREE.MeshBasicMaterial({ color: 0xf4f1ea });
    const clipMat = new THREE.MeshStandardMaterial({ color: 0xb0b8c0, metalness: 0.85, roughness: 0.3 });
    const vialMat = new THREE.MeshStandardMaterial({ color: 0x44ddff, roughness: 0.1, transparent: true, opacity: 0.85 });

    // Wooden Clipboard
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.32, 0.02), boardMat);
    board.position.set(0, 0, 0.08);
    g.add(board);

    // Research Paper with notes
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.20, 0.28), paperMat);
    paper.position.set(0, 0, 0.092);
    g.add(paper);

    // Top metal clamp
    const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.03), clipMat);
    clamp.position.set(0, 0.13, 0.095);
    g.add(clamp);

    // Water sample test tube
    const vial = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.12, 8), vialMat);
    vial.position.set(0.14, 0, 0.08);
    g.add(vial);
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

export function buildKristinCharacter(textures) {
  const root = new THREE.Group();
  root.name = 'Kristin_Companion_GLB';
  root.scale.set(NPC_SCALE, NPC_SCALE, NPC_SCALE);

  const miniSpin = createMiniWeapon('spin');
  const miniPump = createMiniWeapon('pump');
  const miniGolok = createMiniWeapon('golok');
  const miniResearch = createMiniWeapon('research');

  // Strictly initialize weapons hidden so she starts unarmed with research clipboard
  miniSpin.visible = false;
  miniPump.visible = false;
  miniGolok.visible = false;
  miniResearch.visible = true;

  // Base socket position attached naturally to right hand in rest pose
  const weaponSocket = new THREE.Group();
  weaponSocket.position.set(0.46, 0.98, 0.04);
  weaponSocket.rotation.x = -Math.PI / 2.7;
  weaponSocket.rotation.y = -0.15;
  weaponSocket.add(miniSpin);
  weaponSocket.add(miniPump);
  weaponSocket.add(miniGolok);
  weaponSocket.add(miniResearch);
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
      console.log('[COMPANION] Kristin PS2 Character Asset loaded with Kinematic Rigging!');
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
      // In Story Mode (prologue, orientation, complication), firearms are locked.
      // In Endless Mode, weapons are unlocked immediately from wave 1!
      const isStoryMode = (window.__GAME_MODE === 'story' || !window.__GAME_MODE);
      const isEarlyPhase = isStoryMode && (!window.__STORY_PHASE || window.__STORY_PHASE === 'orientation' || window.__STORY_PHASE === 'complication');
      if (isEarlyPhase) {
        miniSpin.visible = false;
        miniPump.visible = false;
        miniGolok.visible = false;
        miniResearch.visible = true;
        return;
      }
      const isUnarmed = (w === 'unarmed' || !w || w === 'research');
      miniSpin.visible = !isUnarmed && (w === 'spin');
      miniPump.visible = !isUnarmed && (w === 'pump');
      miniGolok.visible = !isUnarmed && (w === 'golok');
      miniResearch.visible = isUnarmed;
    }
  };
}

export function initKristinCompanion(scene, textures) {
  kristinModel = buildKristinCharacter(textures);
  // Spawn companion Kristin right near player start at Coldbrook Village gate
  kristinModel.root.position.set(1.6, 0.10, 13.8);
  kristinModel.root.rotation.y = -0.35;
  scene.add(kristinModel.root);
  // Kristin starts holding her research field clipboard, NOT a weapon!
  kristinModel.setWeapon('unarmed');

  // Wire up gesture buttons in DOM
  const btns = document.querySelectorAll('.kristin-gesture-btn');
  btns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const g = btn.getAttribute('data-gesture');
      triggerKristinGesture(g);
    });
  });

  const btnFollow = document.getElementById('btn-toggle-follow');
  if (btnFollow) {
    btnFollow.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleCompanionFollow();
    });
  }

  const bannerEl = document.getElementById('kristin-npc-banner');
  if (bannerEl) {
    bannerEl.addEventListener('click', (e) => {
      if (e.target.tagName !== 'BUTTON') {
        triggerKristinGesture();
      }
    });
  }
}

export function updateKristinCompanion(camera, Sfx, dt = 0.016) {
  if (!kristinModel) return;

  const now = performance.now();
  const t = now * 0.002;

  // Check story phase & game mode:
  // In Story Mode: Orientation & Complication use Guide/Leader AI (Player follows Kristin!)
  // In Endless Mode: Always Combat Bodyguard AI (Follows, covers, and shoots zombies alongside Rodrick)
  const gameMode = window.__GAME_MODE || 'story';
  const storyPhase = window.__STORY_PHASE || 'orientation';
  const isGuideMode = (gameMode === 'story') && (storyPhase === 'orientation' || storyPhase === 'complication');

  // Use actual survivor player position
  const playerX = (typeof playerPos !== 'undefined') ? playerPos.x : camera.position.x;
  const playerZ = (typeof playerPos !== 'undefined') ? playerPos.z : camera.position.z;

  const curX = kristinModel.root.position.x;
  const curZ = kristinModel.root.position.z;

  const dToPlayerX = playerX - curX;
  const dToPlayerZ = playerZ - curZ;
  const distToPlayer = Math.hypot(dToPlayerX, dToPlayerZ);

  let isWalking = false;
  let isSprinting = false;

  if (isGuideMode && companionFollowMode) {
    // =============================================================
    // GUIDE & LEADER AI: KRISTIN LEADS THE PLAYER TO OBJECTIVES
    // Player follows Kristin; Kristin directs the path!
    // =============================================================
    const actObj = (typeof window.getActiveObjective === 'function') ? window.getActiveObjective() : null;
    let goalX = 2.2;
    let goalZ = 15.5; // Default: Old Thomas at Coldbrook gate
    if (actObj && actObj.marker) {
      goalX = actObj.marker.x;
      goalZ = actObj.marker.z;
    }

    const dGoalX = goalX - curX;
    const dGoalZ = goalZ - curZ;
    const distToGoal = Math.hypot(dGoalX, dGoalZ);

    // Initial greeting right after cutscene
    if (!hasAutoGreeted && distToPlayer < 7.0) {
      hasAutoGreeted = true;
      showDialogSubtitle('KRISTIN: "Rod! Kabutnya tebal banget dan hawa desa ini aneh... Ikuti gue, ayo kita cari tahu apa yang terjadi!"', 6000);
      triggerKristinGesture('point', Sfx);
    }

    if (distToGoal <= 2.4) {
      // 1. ARRIVED AT DESTINATION: Wait at objective, point and direct player
      isWalking = false;
      isSprinting = false;

      if (distToPlayer > 5.5) {
        // Player is behind: turn towards player and beckon them over
        const facePlayerYaw = Math.atan2(dToPlayerX, dToPlayerZ);
        kristinModel.root.rotation.y = THREE.MathUtils.lerp(kristinModel.root.rotation.y, facePlayerYaw, 0.14);
        if (now - lastWaitCalloutTime > 8000) {
          lastWaitCalloutTime = now;
          triggerKristinGesture('beckon', Sfx);
          showDialogSubtitle('KRISTIN: "Rod! Gue udah sampai di sini! Ayo cepat ke sini!"', 4500);
        }
      } else {
        // Player is close: turn towards the destination/NPC and point arm
        const faceGoalYaw = Math.atan2(dGoalX, dGoalZ);
        kristinModel.root.rotation.y = THREE.MathUtils.lerp(kristinModel.root.rotation.y, faceGoalYaw, 0.12);
        if (now - lastArriveCalloutTime > 10000) {
          lastArriveCalloutTime = now;
          triggerKristinGesture('point', Sfx);
          if (storyPhase === 'orientation') {
            showDialogSubtitle('Rod, kita udah sampai di gerbang Coldbrook. Coba dekati bapak tua itu, dia dari tadi tersenyum aneh ke arah kita.', 5500);
          } else if (storyPhase === 'complication') {
            showDialogSubtitle('KRISTIN: "Rod, cepat masuk ke pondok Darrell dan ambil senapan di mejanya!"', 5000);
          }
        }
      }

      // Idle breathing on terrain
      const curGY = getTerrainHeight(curX, curZ);
      kristinModel.root.position.y = curGY + 0.10 + Math.sin(t * 1.8) * 0.008;
      walkCadence = THREE.MathUtils.lerp(walkCadence, 0, 0.1);

    } else if (distToPlayer > 12.0) {
      // 2. PLAYER IS TOO FAR BEHIND: Kristin pauses and beckons player to hurry up!
      isWalking = false;
      isSprinting = false;

      // Turn around to face player
      const facePlayerYaw = Math.atan2(dToPlayerX, dToPlayerZ);
      kristinModel.root.rotation.y = THREE.MathUtils.lerp(kristinModel.root.rotation.y, facePlayerYaw, 0.14);

      if (now - lastWaitCalloutTime > 7500) {
        lastWaitCalloutTime = now;
        triggerKristinGesture('beckon', Sfx);
        showDialogSubtitle('KRISTIN: "Rod! Jangan melamun di belakang, ayo lekas ikuti gue!"', 4000);
      }

      const curGY = getTerrainHeight(curX, curZ);
      kristinModel.root.position.y = curGY + 0.10 + Math.sin(t * 1.8) * 0.008;
      walkCadence = THREE.MathUtils.lerp(walkCadence, 0, 0.1);

    } else {
      // 3. ACTIVELY LEADING FORWARD: Kristin walks/sprints ahead toward goal!
      isWalking = true;
      isSprinting = distToPlayer < 4.8; // Sprint ahead if player is close behind
      const speed = isSprinting ? 5.8 : 3.8;

      const dirX = dGoalX / distToGoal;
      const dirZ = dGoalZ / distToGoal;
      const stepX = dirX * speed * dt;
      const stepZ = dirZ * speed * dt;

      // Smart collision check & tangent sliding
      let movedX = false;
      let movedZ = false;

      if (!checkWallCollision(curX + stepX, curZ)) {
        kristinModel.root.position.x += stepX;
        movedX = true;
      }
      if (!checkWallCollision(kristinModel.root.position.x, curZ + stepZ)) {
        kristinModel.root.position.z += stepZ;
        movedZ = true;
      }

      if (!movedX && !movedZ) {
        const perpX = -dirZ * speed * dt;
        const perpZ = dirX * speed * dt;
        if (!checkWallCollision(curX + perpX, curZ + perpZ)) {
          kristinModel.root.position.x += perpX;
          kristinModel.root.position.z += perpZ;
        } else if (!checkWallCollision(curX - perpX, curZ - perpZ)) {
          kristinModel.root.position.x -= perpX;
          kristinModel.root.position.z -= perpZ;
        }
      }

      // Smoothly turn to face forward heading
      const moveYaw = Math.atan2(dirX, dirZ);
      kristinModel.root.rotation.y = THREE.MathUtils.lerp(
        kristinModel.root.rotation.y,
        moveYaw,
        0.18
      );

      // Walking stride & step height on undulating terrain
      walkCadence += dt * (speed * 1.8);
      const stride = Math.sin(walkCadence);
      const curGY = getTerrainHeight(kristinModel.root.position.x, kristinModel.root.position.z);
      kristinModel.root.position.y = curGY + 0.10 + Math.abs(stride) * 0.055;

      // Footsteps in snow synchronized to walk cadence
      if (Math.abs(stride) > 0.85 && now - lastFootstepTime > (isSprinting ? 260 : 370)) {
        lastFootstepTime = now;
        if (Sfx && Sfx.playSnowStep) Sfx.playSnowStep();
      }

      // Occasional guidance shout while leading
      if (now - lastLeadCalloutTime > 14000) {
        lastLeadCalloutTime = now;
        if (storyPhase === 'complication') {
          showDialogSubtitle('KRISTIN: "Ikuti gue lari ke pondok Darrell, Rod! Jangan berhenti!"', 4500);
        } else {
          showDialogSubtitle('KRISTIN: "Ikuti gue Rod, jalannya lewat sini!"', 4000);
        }
      }
    }

  } else if (companionFollowMode) {
    // =============================================================
    // COMBAT BODYGUARD AI: RESOLUTION & CODA (FOLLOWS & COVERS RODRICK)
    // =============================================================
    const stopDist = 2.4;
    if (distToPlayer > 32.0) {
      const pYaw = (typeof yaw !== 'undefined') ? yaw : camera.rotation.y;
      kristinModel.root.position.x = playerX - Math.sin(pYaw) * 3.5;
      kristinModel.root.position.z = playerZ - Math.cos(pYaw) * 3.5;
    }

    if (distToPlayer > stopDist) {
      isWalking = true;
      isSprinting = distToPlayer > 6.0;
      const speed = isSprinting ? 6.8 : 4.0;

      const dirX = dToPlayerX / distToPlayer;
      const dirZ = dToPlayerZ / distToPlayer;
      const stepX = dirX * speed * dt;
      const stepZ = dirZ * speed * dt;

      let movedX = false;
      let movedZ = false;

      if (!checkWallCollision(curX + stepX, curZ)) {
        kristinModel.root.position.x += stepX;
        movedX = true;
      }
      if (!checkWallCollision(kristinModel.root.position.x, curZ + stepZ)) {
        kristinModel.root.position.z += stepZ;
        movedZ = true;
      }

      if (!movedX && !movedZ) {
        const perpX = -dirZ * speed * dt;
        const perpZ = dirX * speed * dt;
        if (!checkWallCollision(curX + perpX, curZ + perpZ)) {
          kristinModel.root.position.x += perpX;
          kristinModel.root.position.z += perpZ;
        } else if (!checkWallCollision(curX - perpX, curZ - perpZ)) {
          kristinModel.root.position.x -= perpX;
          kristinModel.root.position.z -= perpZ;
        }
      }

      const moveYaw = Math.atan2(dirX, dirZ);
      kristinModel.root.rotation.y = THREE.MathUtils.lerp(
        kristinModel.root.rotation.y,
        moveYaw,
        0.16
      );

      walkCadence += dt * (speed * 1.8);
      const stride = Math.sin(walkCadence);
      const curGY = getTerrainHeight(kristinModel.root.position.x, kristinModel.root.position.z);
      kristinModel.root.position.y = curGY + 0.10 + Math.abs(stride) * 0.055;

      if (Math.abs(stride) > 0.85 && now - lastFootstepTime > (isSprinting ? 260 : 370)) {
        lastFootstepTime = now;
        if (Sfx && Sfx.playSnowStep) Sfx.playSnowStep();
      }
    } else {
      const curGY = getTerrainHeight(kristinModel.root.position.x, kristinModel.root.position.z);
      kristinModel.root.position.y = curGY + 0.10 + Math.sin(t * 1.8) * 0.008;
      const targetAngle = Math.atan2(dToPlayerX, dToPlayerZ);
      kristinModel.root.rotation.y = THREE.MathUtils.lerp(
        kristinModel.root.rotation.y,
        targetAngle,
        0.08
      );
      walkCadence = THREE.MathUtils.lerp(walkCadence, 0, 0.1);
    }
  } else {
    // Hold position mode: stays in place, breathing on terrain height
    const curGY = getTerrainHeight(kristinModel.root.position.x, kristinModel.root.position.z);
    kristinModel.root.position.y = curGY + 0.10 + Math.sin(t * 1.8) * 0.008;
    const targetAngle = Math.atan2(dToPlayerX, dToPlayerZ);
    kristinModel.root.rotation.y = THREE.MathUtils.lerp(
      kristinModel.root.rotation.y,
      targetAngle,
      0.08
    );
    walkCadence = THREE.MathUtils.lerp(walkCadence, 0, 0.1);
  }

  // Combat Defense: ONLY ACTIVE IN RESOLUTION / CODA PHASES (Combat Armed)
  if (!isGuideMode && zombies && zombies.length > 0) {
    let nearestZ = null;
    let minZDist = 8.5;
    for (let i = 0; i < zombies.length; i++) {
      const z = zombies[i];
      if (!z.isDead && z.hp > 0) {
        const d = Math.hypot(z.x - kristinModel.root.position.x, z.z - kristinModel.root.position.z);
        if (d < minZDist) {
          minZDist = d;
          nearestZ = z;
        }
      }
    }

    if (nearestZ && now > combatShootCooldown) {
      combatShootCooldown = now + 2400; // Shotgun firing cooldown
      const aimAngle = Math.atan2(nearestZ.x - kristinModel.root.position.x, nearestZ.z - kristinModel.root.position.z);
      kristinModel.root.rotation.y = aimAngle;

      triggerKristinGesture('pump', Sfx);
      nearestZ.hp -= 45;
      if (Sfx && Sfx.playShotgun) Sfx.playShotgun();

      // Show combat shout
      const shouts = [
        "Mampus lo monster!",
        "Gue tembak yang di situ, awas!",
        "Jangan deket-deket Rodrick!",
        "Rasain timah panas!"
      ];
      const shoutText = shouts[Math.floor(Math.random() * shouts.length)];
      showDialogSubtitle(`KRISTIN: "${shoutText}"`, 2500);
    }
  }

  // Kinematic Rig & Mesh Gesture Deformation
  if (kristinModel.charMesh && kristinModel.origPositions && kristinModel.vertexWeights) {
    const vCount = kristinModel.vertexCount;
    const orig = kristinModel.origPositions;
    const weights = kristinModel.vertexWeights;
    const posArr = kristinModel.charMesh.geometry.attributes.position.array;

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
      const headWorldY = kristinModel.root.position.y + 1.45 * NPC_SCALE;
      const dx = camera.position.x - kristinModel.root.position.x;
      const dy = camera.position.y - headWorldY;
      const dz = camera.position.z - kristinModel.root.position.z;

      const worldAngle = Math.atan2(dx, dz);
      const charAngle = kristinModel.root.rotation.y;
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
        if (kristinModel.miniPump && kristinModel.miniPump.pumpSlideMesh) {
          kristinModel.miniPump.pumpSlideMesh.position.z = 0.20 + pumpSlide * 0.05 * blend;
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
      } else if (currentGesture === 'point') {
        // Directing arm gesture pointing straight towards active objective
        la_rx += -1.35 * blend;
        la_rz += 0.18 * blend;
        la_ry += 0.25 * blend;
        h_rx += 0.10 * blend;
        t_ry += 0.12 * blend;
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
    kristinModel.charMesh.geometry.attributes.position.needsUpdate = true;

    // Attach weapon socket seamlessly to transformed right hand
    const [rhX, rhY, rhZ] = rotRArm(0.46, 0.98, 0.04);
    const [finX, finY, finZ] = rotTorso(rhX, rhY, rhZ);
    kristinModel.weaponSocket.position.set(finX, finY, finZ);
    kristinModel.weaponSocket.rotation.x = -Math.PI / 2.7 + ra_rx * 0.9 + t_rx * 0.5;
    kristinModel.weaponSocket.rotation.y = -0.15 + ra_ry * 0.9 + t_ry * 0.5;
    kristinModel.weaponSocket.rotation.z = ra_rz * 0.9 + t_rz * 0.5;
  }
}
