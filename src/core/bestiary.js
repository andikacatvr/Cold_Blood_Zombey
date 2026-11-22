/* =========================================================================
   COLD BLOOD ZOMBEY - MONSTER BESTIARY & FIELD DOSSIER COMPENDIUM
   - Persistent unlock system when zombies are defeated in combat
   - Detailed lore, artwork, danger levels, combat abilities, and field advisories
   - Authentic Retro PS2 / Resident Evil / Silent Hill survival journal aesthetic
   ========================================================================= */

import { Sfx } from '../audio/sfx.js';

const STORAGE_KEY = 'cbz_zombie_bestiary_v1';

export const BESTIARY_DATA = [
  {
    id: 'winter_walker',
    name: 'Winter Peasant (Walker)',
    indonesianName: 'Mayat Hidup Salju (Pejalan)',
    category: 'infected',
    categoryLabel: 'Common Infected',
    dangerLevel: 2,
    image: null,
    hpRange: '65 - 120 HP',
    speedLabel: 'Sedang (3.2 m/s)',
    damageLabel: '15 DMG',
    description: 'Penduduk desa Coldbrook yang terpapar patogen cairan ritual biara. Jaringan tubuhnya telah membeku di bawah salju ekstrem namun digerakkan oleh rasa lapar kanibalistik yang tak terpadamkan.',
    abilities: [
      {
        name: 'Claw Swarm (Cakaran Beruntun)',
        desc: 'Menerkam survivor dalam jarak dekat dengan ayunan kuku tajam bergerigi berulang kali.'
      },
      {
        name: 'Cold Stench (Pengepungan Kabut)',
        desc: 'Muncul bergerombol dari balik selubung kabut tebal untuk mengepung posisi survivor.'
      },
      {
        name: 'Erratic Spasms (Kedutan Tak Terduga)',
        desc: 'Otot leher dan kepala yang berkedut acak mempersulit penembak melakukan headshot bersih.'
      }
    ],
    advisory: 'Jaga jarak aman sekitar 3 meter. Bidik tepat di bagian kepala (Headshot) dengan Shotgun untuk melumpuhkannya seketika dan menghemat peluru.',
    lore: '"Mereka memakai pakaian wol lusuh para penebang kayu Yorkshire. Matanya merah menyala dan dingin tanpa detak nadi." — Catatan Riset Rodrick'
  },
  {
    id: 'winter_sprinter',
    name: 'Winter Sprinter (Feral Runner)',
    indonesianName: 'Pelari Feral (Sprinter Bertudung)',
    category: 'infected',
    categoryLabel: 'Common Infected',
    dangerLevel: 3,
    image: null,
    hpRange: '55 - 95 HP',
    speedLabel: 'Cepat (4.2 m/s)',
    damageLabel: '15 DMG',
    description: 'Varian terinfeksi yang lebih muda dan atletis. Jaket bertudung tebal menjaga fleksibilitas persendian dari pembekuan salju, memungkinkan mereka berlari sprint tanpa mengenal rasa lelah.',
    abilities: [
      {
        name: 'Feral Dash (Lari Cepat +25%)',
        desc: 'Melesat maju dengan akselerasi tinggi begitu mendeteksi survivor, memperpendek jarak serang dengan kilat.'
      },
      {
        name: 'Flanking Rush (Manuver Kepung)',
        desc: 'Sering berlari sedikit menyamping untuk menghindari garis laras tembakan lurus pemain.'
      }
    ],
    advisory: 'Prioritaskan pelari ini terlebih dahulu sebelum menembak zombie pejalan lambat. Manfaatkan ledakan scatter Shotgun saat mereka mendekat dalam garis lurus.',
    lore: '"Langkahnya berderap keras di atas salju tebal. Mereka tidak merintih seperti yang lain—mereka menderu penuh dendam." — Kristin'
  },
  {
    id: 'winter_bruiser',
    name: 'Winter Bruiser (Goliath Tanker)',
    indonesianName: 'Zombie Kekar (Goliath Tanker)',
    category: 'infected',
    categoryLabel: 'Special Infected',
    dangerLevel: 3,
    image: null,
    hpRange: '90 - 160 HP',
    speedLabel: 'Lambat (2.6 m/s)',
    damageLabel: '20 DMG',
    description: 'Spesimen terinfeksi dengan perawakan raksasa dan massa otot ganda. Kulitnya yang menebal dan jaringan tubuh keras membuatnya sangat tahan banting terhadap peluru senapan kaliber biasa.',
    abilities: [
      {
        name: 'Heavy Pummel (Hantaman Berat)',
        desc: 'Pukulan tinju berbobot 20 damage yang mampu melontarkan target ke belakang.'
      },
      {
        name: 'Reinforced Carcass (+35% Ketahanan)',
        desc: 'Kebal terhadap efek stagger tembakan biasa; hanya goyah pada ledakan jarak dekat berkekuatan penuh.'
      }
    ],
    advisory: 'Jangan pernah membiarkannya mendekati sudut sempit. Lakukan teknik kiting (mundur sambil menembak) dan bidik kepalanya berulang kali.',
    lore: '"Otot-ototnya membengkak melampaui batas wajar anatomi manusia. Patogen ini rupanya memicu mutasi hormon fisik secara abnormal." — Kristin'
  },
  {
    id: 'victorian_bride',
    name: 'The Victorian Bride (Pengantin Berdarah)',
    indonesianName: 'Pengantin Victoria Berdarah',
    category: 'boss',
    categoryLabel: 'Elite Special Infected',
    dangerLevel: 4,
    image: null,
    hpRange: '85 - 160 HP',
    speedLabel: 'Sangat Cepat (6.8 m/s)',
    damageLabel: '24 DMG',
    description: 'Sosok mempelai wanita dalam balutan gaun sutra pernikahan abad ke-19 yang tercabik-cabik dan bersimbah darah segar. Jiwanya terbelenggu kutukan keputusasaan akibat pembantaian di kapel tua.',
    abilities: [
      {
        name: 'Supersonic Sprint (Kecepatan Ekstrem)',
        desc: 'Berlari dengan kecepatan 6.8 m/s—jauh melampaui kecepatan lari sprint survivor.'
      },
      {
        name: 'Terrifying Jumpscare Screech',
        desc: 'Meneriakkan jeritan melengking saat menerkam yang memicu distorsi visual jumpscare di layar.'
      },
      {
        name: 'Frenzied Slashing (Cakaran Mematikan)',
        desc: 'Melancarkan serangan cakar bertubi-tubi dengan damage mematikan (24 DMG per pukulan).'
      }
    ],
    advisory: 'Dengarkan suara jeritannya dari kejauhan. Begitu siluet putihnya terlihat berlari, segera kokang Shotgun dan lepaskan tembakan tepat saat ia meloncat menerjang.',
    lore: '"Gaun renda putihnya terseret di atas hamparan salju merah. Dari balik kerudung pengantinnya, hanya terlihat mulut menyeringai bersimbah darah kental." — Catatan Paroki'
  },
  {
    id: 'nona_batavia',
    name: 'Nona Batavia (The Weeping Spectre)',
    indonesianName: 'Nona Batavia (Arwah Berkebaya Merah)',
    category: 'boss',
    categoryLabel: 'Supreme Boss',
    dangerLevel: 5,
    image: null,
    hpRange: '450 - 900+ HP',
    speedLabel: 'Melayang Udara (4.0 m/s)',
    damageLabel: '24 - 35 DMG',
    description: 'Entitas gaib agung berparas ningrat dari era kolonial Hindia Belanda. Mengenakan kebaya putih bermotif darah kental dan jarik batik kuno. Melayang tinggi mengangkangi badai salju Coldbrook sebagai ratu kegelapan mistis.',
    abilities: [
      {
        name: 'Aerial Levitation (Penerbangan Gaib)',
        desc: 'Melayang di udara pada ketinggian 4.4 meter, bebas dari rintangan darat dan perangkap medan.'
      },
      {
        name: 'Crimson Blood Orbs (Peluru Darah Kutukan)',
        desc: 'Menciptakan bola-bola darah terkutuk yang melesat di udara dan melacak posisi pemain (Homing Attack).'
      },
      {
        name: 'Spectral Shockwave (Dentuman Aura Merah)',
        desc: 'Saat pertama kali tiba di medan pertempuran, memicu dentuman gelombang merah yang menggetarkan pandangan.'
      },
      {
        name: 'Haunting Gaze (Tatapan Dingin Maut)',
        desc: 'Aura tatapan mata tajam yang menekan mental survivor di sekeliling radius 20 meter.'
      }
    ],
    advisory: 'Arahkan laras ke atas dan bidik bagian dadanya yang berlumuran darah. Hindari tembakan Blood Orb dengan cara berlari sprint ke samping (strafe) sambil terus membalas tembakan.',
    lore: '"Kecantikannya abadi, namun matanya memancarkan kepedihan ratusan tahun silam. Kehadirannya di Yorkshire adalah misteri kuno yang melintasi samudera." — Rodrick'
  },
  {
    id: 'sister_valentina',
    name: 'Sister Valentina (The Bleeding Mother)',
    indonesianName: 'Sister Valentina (Biarawati Berdarah)',
    category: 'boss',
    categoryLabel: 'Arch-Nemesis Boss',
    dangerLevel: 5,
    image: null,
    hpRange: '700 - 1300+ HP',
    speedLabel: 'Cepat & Teleport (4.8 m/s)',
    damageLabel: '28 DMG',
    description: 'Ibu asrama biara ordo tertutup Coldbrook. Membawa salib perak berkarat dan jubah kerudung biara yang terus mengucurkan darah tak berujung. Menghukum siapa pun yang berani menginjak tanah suci biara.',
    abilities: [
      {
        name: 'Blood Fog Teleport (Teleportasi Darah)',
        desc: 'Lenyap ke dalam pusaran kabut darah pekat lalu muncul mendadak tepat di belakang punggung survivor.'
      },
      {
        name: 'Unholy Crucifix Slash (Tebasan Salib Perak)',
        desc: 'Mengayunkan salib perak berbobot masif yang menghasilkan 28 damage mematikan.'
      },
      {
        name: 'Unholy Hymn Summon (Jeritan Panggil Pasukan)',
        desc: 'Menyanyikan kidung teror yang memanggil sekelompok mayat hidup tambahan untuk membantunya.'
      }
    ],
    advisory: 'Waspadai saat ia menghilang—segera putar badan 180 derajat karena ia biasanya muncul di belakang. Manfaatkan ruang terbuka agar tidak terpojok oleh anak buahnya.',
    lore: '"Ia meminum cawan beracun bersama seluruh biarawati demi janji keselamatan palsu. Kini ia menjaga rahasia gereja dengan darah abadi." — Dokumen Arsip Paroki'
  }
];

export let isBestiaryOpen = false;
let selectedEntryId = 'winter_walker';
let activeCategoryFilter = 'all';
let gameStateRef = null;

/**
 * Loads unlocked bestiary records from browser localStorage
 */
export function getSavedBestiaryRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('[BESTIARY] Error reading localStorage:', err);
  }
  return {};
}

/**
 * Saves bestiary records to localStorage
 */
function saveBestiaryRecords(records) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (err) {
    console.warn('[BESTIARY] Error saving to localStorage:', err);
  }
}

/**
 * Maps a defeated zombie object to its canonical Bestiary entry ID
 */
export function getZombieBestiaryId(zombie) {
  if (!zombie) return 'winter_walker';
  if (zombie.bossType === 'nona_batavia') return 'nona_batavia';
  if (zombie.bossType === 'sister_valentina') return 'sister_valentina';
  if (zombie.isVictorianBride) return 'victorian_bride';
  if (zombie.variant === 1) return 'winter_sprinter';
  if (zombie.variant === 3) return 'winter_bruiser';
  return 'winter_walker';
}

/**
 * Registers a zombie kill and automatically unlocks its entry in the Bestiary
 */
export function registerZombieKill(zombie, state) {
  const entryId = getZombieBestiaryId(zombie);
  const entryDef = BESTIARY_DATA.find(e => e.id === entryId);
  if (!entryDef) return;

  const records = getSavedBestiaryRecords();
  const current = records[entryId] || {
    unlocked: false,
    kills: 0,
    firstWave: 1,
    unlockedAt: null
  };

  const wasUnlocked = !!current.unlocked;
  current.kills = (current.kills || 0) + 1;

  if (!wasUnlocked) {
    current.unlocked = true;
    current.firstWave = state && state.wave ? state.wave : 1;
    current.unlockedAt = new Date().toLocaleDateString();
    records[entryId] = current;
    saveBestiaryRecords(records);

    // Show on-screen toast announcement
    showBestiaryUnlockToast(entryDef);

    // Play discovery chime sound
    if (Sfx && Sfx.playSmallBell) {
      Sfx.playSmallBell(2600, 0.7);
    }
  } else {
    records[entryId] = current;
    saveBestiaryRecords(records);
  }

  // Live update if bestiary is currently open
  if (isBestiaryOpen) {
    renderBestiaryUI();
  }
}

/**
 * Displays a non-intrusive on-screen notification when a new monster is discovered
 */
export function showBestiaryUnlockToast(entry) {
  const toast = document.getElementById('bestiary-unlock-toast');
  const nameEl = document.getElementById('bestiary-toast-name');
  if (!toast || !nameEl) return;

  nameEl.innerText = `${entry.name} (${entry.indonesianName})`;
  toast.classList.remove('active');
  void toast.offsetWidth; // Reflow for restartable CSS animation
  toast.classList.add('active');

  setTimeout(() => {
    toast.classList.remove('active');
  }, 4800);
}

/**
 * Calculates overall collection completion percentage
 */
export function getBestiaryProgress() {
  const records = getSavedBestiaryRecords();
  let unlockedCount = 0;
  BESTIARY_DATA.forEach(entry => {
    if (records[entry.id] && records[entry.id].unlocked) {
      unlockedCount++;
    }
  });
  const total = BESTIARY_DATA.length;
  const percent = Math.round((unlockedCount / total) * 100);
  return { total, unlockedCount, percent };
}

/**
 * Opens the Bestiary Field Compendium modal
 */
export function openBestiary(state) {
  if (isBestiaryOpen) return;
  isBestiaryOpen = true;
  gameStateRef = state;

  if (state && state.running) {
    state.isPaused = true;
    if (document.pointerLockElement === document.body && document.exitPointerLock) {
      document.exitPointerLock();
    }
  }

  const modal = document.getElementById('screen-bestiary');
  if (modal) {
    modal.style.display = 'flex';
  }

  if (Sfx && Sfx.playMenuSelect) Sfx.playMenuSelect();

  renderBestiaryUI();
}

/**
 * Closes the Bestiary modal
 */
export function closeBestiary(state) {
  if (!isBestiaryOpen) return;
  isBestiaryOpen = false;

  const modal = document.getElementById('screen-bestiary');
  if (modal) {
    modal.style.display = 'none';
  }

  const s = state || gameStateRef;
  if (s && s.running) {
    s.isPaused = false;
    // Re-request pointer lock if clicked inside game
    const canvas = document.getElementById('game-canvas');
    if (canvas && canvas.requestPointerLock) {
      canvas.requestPointerLock();
    }
  }

  if (Sfx && Sfx.playMenuHover) Sfx.playMenuHover();
}

/**
 * Toggles the Bestiary modal open / close
 */
export function toggleBestiary(state) {
  if (isBestiaryOpen) {
    closeBestiary(state);
  } else {
    openBestiary(state);
  }
}

/**
 * Renders the full Bestiary UI: Directory list on left, detailed dossier on right
 */
export function renderBestiaryUI() {
  const records = getSavedBestiaryRecords();
  const { total, unlockedCount, percent } = getBestiaryProgress();

  // 1. Update Header Progress
  const progressTextEl = document.getElementById('bestiary-progress-text');
  const progressFillEl = document.getElementById('bestiary-progress-fill');
  if (progressTextEl) {
    progressTextEl.innerText = `${unlockedCount} / ${total} DISCOVERED (${percent}%)`;
  }
  if (progressFillEl) {
    progressFillEl.style.width = `${percent}%`;
  }

  // 2. Render Left Directory List
  const listContainer = document.getElementById('bestiary-list-container');
  if (listContainer) {
    let listHtml = '';
    const filteredEntries = BESTIARY_DATA.filter(entry => {
      if (activeCategoryFilter === 'all') return true;
      return entry.category === activeCategoryFilter;
    });

    filteredEntries.forEach(entry => {
      const rec = records[entry.id];
      const isUnlocked = rec && rec.unlocked;
      const isSelected = entry.id === selectedEntryId;
      const kills = rec ? rec.kills || 0 : 0;

      // Generate danger star rating
      let stars = '';
      for (let i = 0; i < 5; i++) {
        stars += (i < entry.dangerLevel) ? '★' : '☆';
      }

      const cardClass = `bestiary-list-card ${isSelected ? 'selected' : ''} ${isUnlocked ? 'unlocked' : 'locked'}`;
      const thumbHtml = isUnlocked
        ? (entry.image
            ? `<img class="bestiary-thumb" src="${entry.image}" alt="${entry.name}" />`
            : `<div class="bestiary-thumb-specimen"><span class="bio-icon">☣</span></div>`)
        : `<div class="bestiary-thumb-locked"><span class="lock-icon">?</span></div>`;

      const titleHtml = isUnlocked
        ? `<div class="bestiary-card-name">${entry.name}</div>
           <div class="bestiary-card-sub">${entry.indonesianName}</div>`
        : `<div class="bestiary-card-name" style="color: #8899a6;">??? UNIDENTIFIED</div>
           <div class="bestiary-card-sub" style="color: #556673;">Data Belum Terbuka</div>`;

      const badgeHtml = isUnlocked
        ? `<span class="bestiary-card-kills">☠ ${kills} Kills</span>`
        : `<span class="bestiary-card-locked-tag">🔒 Terkunci</span>`;

      listHtml += `
        <div class="${cardClass}" data-id="${entry.id}">
          <div class="bestiary-card-thumb-wrap">
            ${thumbHtml}
          </div>
          <div class="bestiary-card-info">
            ${titleHtml}
            <div class="bestiary-card-footer">
              <span class="bestiary-stars" title="Threat Level: ${entry.dangerLevel}/5">${stars}</span>
              ${badgeHtml}
            </div>
          </div>
        </div>
      `;
    });

    listContainer.innerHTML = listHtml;

    // Attach click events to list cards
    listContainer.querySelectorAll('.bestiary-list-card').forEach(card => {
      card.addEventListener('click', () => {
        selectedEntryId = card.dataset.id;
        if (Sfx && Sfx.playMenuSelect) Sfx.playMenuSelect();
        renderBestiaryUI();
      });
    });
  }

  // 3. Render Right Dossier Details
  const dossierContainer = document.getElementById('bestiary-dossier-container');
  if (dossierContainer) {
    const selectedEntry = BESTIARY_DATA.find(e => e.id === selectedEntryId) || BESTIARY_DATA[0];
    const rec = records[selectedEntry.id];
    const isUnlocked = rec && rec.unlocked;
    const kills = rec ? rec.kills || 0 : 0;
    const firstWave = rec ? rec.firstWave || 1 : 1;
    const unlockedDate = rec && rec.unlockedAt ? rec.unlockedAt : 'Pertempuran Terakhir';

    if (isUnlocked) {
      let abilitiesHtml = '';
      selectedEntry.abilities.forEach(ab => {
        abilitiesHtml += `
          <div class="bestiary-ability-item">
            <div class="bestiary-ability-title">⚡ ${ab.name}</div>
            <div class="bestiary-ability-desc">${ab.desc}</div>
          </div>
        `;
      });

      let stars = '';
      for (let i = 0; i < 5; i++) {
        stars += (i < selectedEntry.dangerLevel) ? '★' : '☆';
      }

      dossierContainer.innerHTML = `
        <div class="dossier-inner">
          <!-- TOP DOSSIER HEADER -->
          <div class="dossier-header">
            <div>
              <div class="dossier-classification">${selectedEntry.categoryLabel.toUpperCase()} &bull; DOSSIER ARCHIVE</div>
              <div class="dossier-title">${selectedEntry.name}</div>
              <div class="dossier-subtitle">${selectedEntry.indonesianName}</div>
            </div>
            <div class="dossier-danger-box">
              <div class="dossier-danger-label">THREAT LEVEL</div>
              <div class="dossier-danger-stars">${stars}</div>
              <div class="dossier-danger-level">${selectedEntry.dangerLevel} / 5 DANGER</div>
            </div>
          </div>

          <!-- DOSSIER BODY: SPLIT ARTWORK & COMBAT STATS -->
          <div class="dossier-row-top">
            <div class="dossier-art-frame">
              ${selectedEntry.image
                ? `<img class="dossier-art-img" src="${selectedEntry.image}" alt="${selectedEntry.name}" />`
                : `<div class="dossier-art-classified">
                    <div class="dossier-classified-badge">PENDING SPECIMEN</div>
                    <div class="dossier-classified-icon">☣</div>
                    <div class="dossier-classified-label">VISUAL RECORDING ARCHIVED</div>
                    <div class="dossier-classified-sub">[ DOKUMEN FOTO DITANGGUHKAN ]</div>
                  </div>`
              }
              <div class="dossier-art-overlay-line">FIELD VISUAL SPECIMEN</div>
            </div>

            <div class="dossier-stats-col">
              <div class="dossier-stat-tile">
                <span class="dossier-stat-name">DAYA TAHAN (HP)</span>
                <span class="dossier-stat-val" style="color: #ff5260;">${selectedEntry.hpRange}</span>
              </div>
              <div class="dossier-stat-tile">
                <span class="dossier-stat-name">KECEPATAN GERAK</span>
                <span class="dossier-stat-val" style="color: #ffd15c;">${selectedEntry.speedLabel}</span>
              </div>
              <div class="dossier-stat-tile">
                <span class="dossier-stat-name">DAYA RUSAK SERANGAN</span>
                <span class="dossier-stat-val" style="color: #ff3344;">${selectedEntry.damageLabel}</span>
              </div>
              <div class="dossier-stat-tile highlight">
                <span class="dossier-stat-name">TOTAL DIHABISI (KILLS)</span>
                <span class="dossier-stat-val" style="color: #5cf0a5; font-size: 22px;">☠ ${kills} SPECIMENS</span>
              </div>
              <div class="dossier-record-note">
                Pertama ditaklukkan pada <strong>Wave ${firstWave}</strong> (${unlockedDate})
              </div>
            </div>
          </div>

          <!-- ANATOMICAL SUMMARY & DESCRIPTION -->
          <div class="dossier-section">
            <div class="dossier-section-title">DESKRIPSI SPESIMEN &amp; ANATOMI</div>
            <p class="dossier-text">${selectedEntry.description}</p>
          </div>

          <!-- COMBAT ABILITIES LIST -->
          <div class="dossier-section">
            <div class="dossier-section-title">KEMAMPUAN KHUSUS &amp; POLA SERANGAN</div>
            <div class="bestiary-abilities-grid">
              ${abilitiesHtml}
            </div>
          </div>

          <!-- TACTICAL COMBAT ADVISORY -->
          <div class="dossier-advisory-box">
            <div class="dossier-advisory-title">🛡️ INSTRUKSI TAKTIS &amp; PANDUAN BERTAHAN</div>
            <p class="dossier-advisory-text">${selectedEntry.advisory}</p>
          </div>

          <!-- FIELD JOURNAL QUOTE -->
          <div class="dossier-lore-box">
            ${selectedEntry.lore}
          </div>
        </div>
      `;
    } else {
      // LOCKED STATE DOSSIER
      dossierContainer.innerHTML = `
        <div class="dossier-inner locked-state">
          <div class="locked-silhouette-wrap">
            <div class="locked-silhouette-box">
              <span class="locked-giant-q">?</span>
            </div>
            <div class="locked-headline">[ DATA BELUM TERBUKA / UNIDENTIFIED THREAT ]</div>
            <p class="locked-desc">
              Sampel jaringan dan data anatomi makhluk ini belum berhasil dikoleksi oleh Dr. Rodrick &amp; Kristin.
            </p>
            <div class="locked-instruction-card">
              <div class="locked-inst-title">CARA MEMBUKA KOLEKSI:</div>
              <p class="locked-inst-text">
                Hadapi dan kalahkan makhluk ini dalam pertempuran (Story Mode atau Endless Mode).
                Setelah berhasil menembak mati spesimen ini, profil lengkap, foto ilustrasi, dan daftar kemampuannya akan otomatis tercatat ke dalam buku koleksi ini.
              </p>
            </div>
          </div>
        </div>
      `;
    }
  }
}

/**
 * Initializes Bestiary event handlers and button bindings
 */
export function initBestiaryUI(gameState) {
  gameStateRef = gameState;

  // 1. HUD Bestiary Button
  const hudBtn = document.getElementById('hud-bestiary-btn');
  if (hudBtn) {
    hudBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openBestiary(gameState);
    });
  }

  // 2. Main Menu Bestiary Button
  const menuBtn = document.getElementById('btn-menu-bestiary');
  if (menuBtn) {
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openBestiary(gameState);
    });
  }

  // 3. Modal Close Button & Backdrop Click
  const closeBtn = document.getElementById('btn-close-bestiary');
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeBestiary(gameState);
    });
  }
  const closeX = document.getElementById('btn-close-bestiary-x');
  if (closeX) {
    closeX.addEventListener('click', (e) => {
      e.stopPropagation();
      closeBestiary(gameState);
    });
  }

  // 4. Category Filter Buttons
  const filterBtns = document.querySelectorAll('.bestiary-tab-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategoryFilter = btn.dataset.category || 'all';
      if (Sfx && Sfx.playMenuSelect) Sfx.playMenuSelect();
      renderBestiaryUI();
    });
  });
}
