/* =========================================================================
   HUD & USER INTERFACE LIFECYCLE
   Wave stats, Health & 3 Lives Hearts, Ammo, Game Over screen
   ========================================================================= */

import { updateTouchControlsVisibility } from './touchControls.js';

export function updateHUD(state) {
  const waveEl = document.getElementById('hud-wave');
  if (waveEl) {
    if (state.gameMode === 'story') {
      const ch = (state.storyPhase === 'orientation') ? 'ACT I • ORIENTASI'
               : (state.storyPhase === 'complication') ? 'ACT I • KOMPLIKASI'
               : (state.storyPhase === 'resolution') ? 'ACT I • RESOLUSI'
               : 'ACT I • KODA';
      waveEl.innerText = `${ch}`;
    } else {
      waveEl.innerText = `ENDLESS HORDE: WAVE ${state.wave}`;
    }
  }

  const scoreEl = document.getElementById('hud-score');
  if (scoreEl) {
    if (state.gameMode === 'endless') {
      scoreEl.style.display = 'block';
      scoreEl.innerText = `CRIMSON PURGED: ${String(state.kills).padStart(3, '0')}`;
    } else {
      scoreEl.style.display = 'none';
    }
  }

  const p = state.player;
  const ammoEl = document.getElementById('hud-ammo');
  if (ammoEl) {
    if (p.weapon === 'unarmed') {
      ammoEl.innerText = 'EQUIP: [TANGAN KOSONG]';
      ammoEl.style.color = '#ff9933';
    } else if (p.weapon === 'golok') {
      ammoEl.innerText = 'EQUIP: [GOLOK RIMBA]';
      ammoEl.style.color = '#e6edf5';
    } else if (p.isReloading) {
      ammoEl.innerText = '[ R ] RELOADING...';
      ammoEl.style.color = '#ffcc00';
    } else if (p.clip === 0) {
      ammoEl.innerText = `EMPTY! [ R ] RELOAD (0 / ${p.reserve})`;
      ammoEl.style.color = '#ff3344';
    } else {
      ammoEl.innerText = `SHELLS: ${p.clip} / ${p.reserve}`;
      ammoEl.style.color = (p.clip <= 2 ? '#ff9933' : '#e0e9f0');
    }
  }

  const vitalEl = document.getElementById('hud-vital');
  const portraitFrame = document.getElementById('hud-portrait-frame');
  const portraitTint = document.getElementById('hud-portrait-status-tint');
  const condition = p.hp > 65 ? 'FINE' : p.hp > 30 ? 'CAUTION' : 'DANGER';

  if (vitalEl) {
    vitalEl.innerText = `CONDITION: ${condition} [${p.hp}%]`;
    if (condition === 'FINE') {
      vitalEl.style.color = '#78e08f';
      vitalEl.classList.remove('hud-danger', 'hud-caution');
    } else if (condition === 'CAUTION') {
      vitalEl.style.color = '#e5a038';
      vitalEl.classList.remove('hud-danger');
      vitalEl.classList.add('hud-caution');
    } else {
      vitalEl.style.color = '#ff3a4b';
      vitalEl.classList.remove('hud-caution');
      vitalEl.classList.add('hud-danger');
    }
  }

  if (portraitFrame) {
    if (condition === 'FINE') {
      portraitFrame.style.borderColor = '#78e08f';
      portraitFrame.style.boxShadow = 'inset 0 0 6px rgba(0,0,0,0.9), 0 0 8px rgba(120, 224, 143, 0.4)';
      if (portraitTint) {
        portraitTint.style.opacity = '0';
        portraitTint.style.background = 'transparent';
      }
    } else if (condition === 'CAUTION') {
      portraitFrame.style.borderColor = '#e5a038';
      portraitFrame.style.boxShadow = 'inset 0 0 6px rgba(0,0,0,0.9), 0 0 8px rgba(229, 160, 56, 0.4)';
      if (portraitTint) {
        portraitTint.style.opacity = '0.22';
        portraitTint.style.background = '#e5a038';
      }
    } else {
      portraitFrame.style.borderColor = '#ff3a4b';
      portraitFrame.style.boxShadow = 'inset 0 0 8px rgba(0,0,0,0.9), 0 0 12px rgba(255, 58, 75, 0.75)';
      if (portraitTint) {
        portraitTint.style.opacity = '0.38';
        portraitTint.style.background = '#ff3a4b';
      }
    }
  }

  const iconsContainer = document.getElementById('hud-lives-icons');
  if (iconsContainer) {
    let html = '';
    for (let i = 0; i < p.maxLives; i++) {
      if (i < p.lives) {
        html += '<span class="life-heart full">♥</span>';
      } else {
        html += '<span class="life-heart lost">♡</span>';
      }
    }
    iconsContainer.innerHTML = html;
    const countEl = document.getElementById('hud-lives-count');
    if (countEl) countEl.innerText = `(${p.lives}/${p.maxLives})`;
  }
}

export function showLifeLostAlert(remainingLives) {
  const banner = document.getElementById('life-alert-banner');
  const remEl = document.getElementById('life-alert-remaining');
  if (banner && remEl) {
    let icons = '';
    for (let i = 0; i < 3; i++) {
      icons += (i < remainingLives ? '♥ ' : '♡ ');
    }
    remEl.innerText = `${icons.trim()} (${remainingLives}/3 Nyawa Tersisa)`;
    banner.style.display = 'flex';
    setTimeout(() => {
      banner.style.display = 'none';
    }, 2200);
  }

  const aura = document.getElementById('invuln-aura');
  if (aura) {
    aura.style.display = 'block';
    setTimeout(() => {
      aura.style.display = 'none';
    }, 2500);
  }
}

export function triggerGameOver(state) {
  state.running = false;
  state.isPaused = false;
  if (document.exitPointerLock) document.exitPointerLock();

  const hud = document.getElementById('hud');
  if (hud) hud.style.display = 'none';
  const reticle = document.getElementById('reticle');
  if (reticle) reticle.style.display = 'none';
  const bossHud = document.getElementById('boss-hud-container');
  if (bossHud) bossHud.style.display = 'none';
  const settings = document.getElementById('screen-settings');
  if (settings) settings.style.display = 'none';

  updateTouchControlsVisibility();

  const goScreen = document.getElementById('screen-gameover');
  if (goScreen) goScreen.style.display = 'flex';

  const goWave = document.getElementById('go-wave-text');
  if (goWave) {
    if (state.gameMode === 'story') {
      const ch = (state.storyPhase === 'orientation') ? 'FASE ORIENTASI'
               : (state.storyPhase === 'complication') ? 'FASE KOMPLIKASI'
               : (state.storyPhase === 'resolution') ? 'FASE RESOLUSI'
               : 'FASE KODA';
      goWave.innerText = `MODE CERITA: GUGUR PADA ${ch}`;
    } else {
      goWave.innerText = `MODE BERTAHAN: BERTAHAN HINGGA WAVE ${state.wave}`;
    }
  }
  const goKills = document.getElementById('go-kills');
  if (goKills) goKills.innerText = `TOTAL CRIMSON PURGED: ${state.kills}`;
}
