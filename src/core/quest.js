/**
 * COLD BLOOD ZOMBEY - QUEST & OBJECTIVE SYSTEM
 * Based directly on GDD: "COLD BLOOD ZOMBEY.docx"
 * Manages Chapters, Objectives, Journal Entries, and UI Tracker
 */

import { giveKristinHint } from '../entities/kristin.js';

export const OBJECTIVES = {
  'prolog': {
    id: 'prolog',
    chapter: 'PROLOGUE: EXPEDITION AT THE BLACKWOOD MOORS',
    title: 'Investigate Coldbrook Village',
    journal: 'Two weeks studying ancient parish rites and hydrology samples in Yorkshire Moors. Something is deeply unsettling with the villagers\' smiles...',
    location: 'Coldbrook Village Gothic Gate',
    marker: { x: 0, z: 20 }
  },
  '1.1': {
    id: '1.1',
    chapter: 'CHAPTER 1: THE SILENT PARISH',
    title: 'OBJECTIVE 1.1: Seek Shelter & Weapon',
    journal: 'The gate is chained shut by the Devout. Find Darrell\'s cottage at the eastern lane—he rejected Father Raksha\'s cult and kept weapons.',
    location: 'Darrell\'s Hunting Cottage (East lane, boar skull on fence post)',
    marker: { x: -13, z: -6 }
  },
  '1.2': {
    id: '1.2',
    chapter: 'CHAPTER 1: THE SILENT PARISH',
    title: 'OBJECTIVE 1.2: Find Alternate Escape Route',
    journal: 'The main road is guarded by the Devout. Seek Mrs. Eleanor, the parish elder residing near the ancient spring.',
    location: 'Mrs. Eleanor\'s Cottage near Ancient Spring (West hill)',
    marker: { x: -45, z: 20 }
  },
  '1.3': {
    id: '1.3',
    chapter: 'CHAPTER 1: THE SILENT PARISH',
    title: 'OBJECTIVE 1.3: Unlock the Secret Path at Ancient Spring',
    journal: 'Listen to the hymn chanting pattern: "Three prostrations, two bows, one silence". Strike the three stone statues.',
    location: 'Ancient Spring (Stone Vault & 3 Kneeling Statues)',
    marker: { x: -60, z: 35 }
  },
  '2.1': {
    id: '2.1',
    chapter: 'CHAPTER 2: BENEATH THE CATHEDRAL ABBEY',
    title: 'OBJECTIVE 2.1: Infiltrate Underground Vault',
    journal: 'This subterranean tunnel leads beneath the abbey. Search for clinical experiment records and volunteer Brandon.',
    location: 'Underground Catacomb Vaults',
    marker: { x: 10, z: -40 }
  },
  '2.2': {
    id: '2.2',
    chapter: 'CHAPTER 2: BENEATH THE CATHEDRAL ABBEY',
    title: 'OBJECTIVE 2.2: Restore Power & Radio Dr. Laura',
    journal: 'Locate 3 glass tube fuses in the Ward, Water Kitchen, and Archives. Contact Dr. Laura on the radio frequency.',
    location: 'Radio Room & Generator Substation',
    marker: { x: 15, z: -45 }
  },
  '2.3': {
    id: '2.3',
    chapter: 'CHAPTER 2: BENEATH THE CATHEDRAL ABBEY',
    title: 'OBJECTIVE 2.3: Breaching Main Lab & Subdue Matron Agnes',
    journal: 'Main lab door locked with code 7391. Shut off the 3 red pipeline valves in the Water Kitchen to weaken Matron Agnes!',
    location: 'Water Kitchen & Lab Door 7391',
    marker: { x: 25, z: -50 }
  },
  '2.4': {
    id: '2.4',
    chapter: 'CHAPTER 2: BENEATH THE CATHEDRAL ABBEY',
    title: 'OBJECTIVE 2.4: Synthesize the Antidote Compound',
    journal: 'Meet Benjamin in the lab. Formulate: Benjamin\'s Base Ampoule -> Cryo-Stabilizer -> Pure Holy Water Sample.',
    location: 'Cathedral Main Laboratory',
    marker: { x: 30, z: -55 }
  },
  '3.1': {
    id: '3.1',
    chapter: 'CHAPTER 3: THE PURIFICATION DAY',
    title: 'OBJECTIVE 3.1: Halt the Mass Ritual at the Plaza',
    journal: 'The ritual begins as the moon aligns with the bell tower. Ascend to the square and confront Father Raksha!',
    location: 'Cathedral Bell Tower Plaza',
    marker: { x: 0, z: -70 }
  },
  '3.2': {
    id: '3.2',
    chapter: 'CHAPTER 3: THE PURIFICATION DAY',
    title: 'OBJECTIVE 3.2: Sever Holy Water Tank & Defeat Father Raksha',
    journal: 'Shut down the 3 bell tower valves. Evade the flock and target Father Raksha\'s radiant mutated chest core!',
    location: 'Abbey Bell Tower Summit',
    marker: { x: 0, z: -75 }
  }
};

let currentObjectiveId = '1.1';
window.__ACTIVE_OBJECTIVE_ID = currentObjectiveId;

export function getActiveObjective() {
  return OBJECTIVES[currentObjectiveId] || OBJECTIVES['1.1'];
}

export function setObjective(objId, showBanner = true) {
  if (!OBJECTIVES[objId]) return;
  currentObjectiveId = objId;
  window.__ACTIVE_OBJECTIVE_ID = objId;

  updateQuestHUD();

  if (showBanner) {
    const obj = OBJECTIVES[objId];
    const panel = document.getElementById('hud-quest-panel');
    if (panel) {
      panel.style.transform = 'scale(1.04)';
      panel.style.transition = 'transform 0.25s ease';
      setTimeout(() => {
        panel.style.transform = 'scale(1)';
      }, 300);
    }
  }
}

export function updateQuestHUD() {
  const obj = getActiveObjective();
  const chapterEl = document.getElementById('quest-chapter-tag');
  const titleEl = document.getElementById('quest-title-text');
  const descEl = document.getElementById('quest-desc-text');

  if (chapterEl) chapterEl.textContent = obj.chapter;
  if (titleEl) titleEl.textContent = obj.title;
  if (descEl) descEl.textContent = `"${obj.journal}"`;
}

export function requestKristinHint(sfxRef) {
  return giveKristinHint(currentObjectiveId, sfxRef);
}

export function initQuestSystem(sfxRef) {
  updateQuestHUD();

  const hintBtn = document.getElementById('quest-hint-key-btn');
  if (hintBtn) {
    hintBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      requestKristinHint(sfxRef);
    });
  }
}
