/**
 * COLD BLOOD ZOMBEY - QUEST & OBJECTIVE SYSTEM
 * Based directly on GDD: "COLD BLOOD ZOMBEY.docx"
 * Manages Chapters, Objectives, Journal Entries, and UI Tracker
 */

import { giveKristinHint } from '../entities/kristin.js';

export const OBJECTIVES = {
  'prolog': {
    id: 'prolog',
    chapter: 'PROLOG: PENELITIAN YANG SALAH WAKTU',
    title: 'Periksa Desa Karang Wening',
    journal: 'Dua minggu penelitian ritual dan sampel air di lereng gunung. Ada yang aneh dengan senyum warga...',
    location: 'Gerbang Desa Karang Wening',
    marker: { x: 0, z: 20 }
  },
  '1.1': {
    id: '1.1',
    chapter: 'BAB 1: DESA SUNYI',
    title: 'OBJEKTIF 1.1: Cari Tempat Aman dan Senjata',
    journal: 'Gerbang dijaga umat. Cari rumah warga yang menolak ajaran Guru (Pak Darmo), mungkin dia menyimpan sesuatu.',
    location: 'Rumah Pak Darmo, ujung gang timur (tanda tengkorak babi hutan)',
    marker: { x: -13, z: -6 }
  },
  '1.2': {
    id: '1.2',
    chapter: 'BAB 1: DESA SUNYI',
    title: 'OBJEKTIF 1.2: Cari Jalan Keluar Selain Gerbang',
    journal: 'Gerbang tidak mungkin. Cari seseorang yang tahu jalan lain (Ibu Sumi).',
    location: 'Rumah Ibu Sumi di dekat Sendang Tua (mata air lama barat desa)',
    marker: { x: -45, z: 20 }
  },
  '1.3': {
    id: '1.3',
    chapter: 'BAB 1: DESA SUNYI',
    title: 'OBJEKTIF 1.3: Buka Jalur Rahasia Sendang Tua',
    journal: 'Dengarkan nyanyian umat: "Tiga sujud, dua tunduk, satu diam". Hitungannya adalah kunci pintu batu.',
    location: 'Sendang Tua (Dinding batu & 3 patung sujud)',
    marker: { x: -60, z: 35 }
  },
  '2.1': {
    id: '2.1',
    chapter: 'BAB 2: DI BAWAH RUMAH IBADAH',
    title: 'OBJEKTIF 2.1: Telusuri Fasilitas Bawah Tanah',
    journal: 'Lorong kuno ini tembus ke bawah rumah ibadah. Cari bukti protokol eksperimen manusia dan relawan Rendra.',
    location: 'Fasilitas Bawah Tanah',
    marker: { x: 10, z: -40 }
  },
  '2.2': {
    id: '2.2',
    chapter: 'BAB 2: DI BAWAH RUMAH IBADAH',
    title: 'OBJEKTIF 2.2: Nyalakan Radio & Hubungi Dunia Luar',
    journal: 'Cari 3 sekring di Ruang Rawat, Dapur Air, dan Arsip. Hubungi Dr. Laras Kusumo lewat radio.',
    location: 'Ruang Radio & Generator Bawah Tanah',
    marker: { x: 15, z: -45 }
  },
  '2.3': {
    id: '2.3',
    chapter: 'BAB 2: DI BAWAH RUMAH IBADAH',
    title: 'OBJEKTIF 2.3: Cari Lab Utama & Kalahkan Ibu Asuh',
    journal: 'Pintu lab terkunci kode 7391. Di Dapur Air, matikan 3 katup merah untuk melemahkan Ibu Asuh!',
    location: 'Dapur Air & Pintu Lab 7391',
    marker: { x: 25, z: -50 }
  },
  '2.4': {
    id: '2.4',
    chapter: 'BAB 2: DI BAWAH RUMAH IBADAH',
    title: 'OBJEKTIF 2.4: Racik Penawar Wabah',
    journal: 'Temui Bima di Lab Utama. Racik: Ampul Dasar Bima -> Stabilizer Pendingin -> Sampel Murni Air Suci.',
    location: 'Laboratorium Utama Bawah Tanah',
    marker: { x: 30, z: -55 }
  },
  '3.1': {
    id: '3.1',
    chapter: 'BAB 3: HARI PENYUCIAN',
    title: 'OBJEKTIF 3.1: Hentikan Ritual Massal di Alun-Alun',
    journal: 'Ritual dimulai saat bulan di atas menara lonceng. Naik ke alun-alun dan hadapi Guru Raksa.',
    location: 'Alun-alun Menara Lonceng',
    marker: { x: 0, z: -70 }
  },
  '3.2': {
    id: '3.2',
    chapter: 'BAB 3: HARI PENYUCIAN',
    title: 'OBJEKTIF 3.2: Putus Aliran Tangki & Lawan Guru Raksa',
    journal: 'Putus 3 katup menara lonceng. Hindari kepungan umat dan serang titik lemah dada bercahaya Guru Raksa!',
    location: 'Menara Lonceng Alun-Alun',
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
