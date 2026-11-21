/* =========================================================================
   HUD & USER INTERFACE LIFECYCLE
   Wave stats, Health & 3 Lives Hearts, Ammo, Game Over screen
   ========================================================================= */

import { updateTouchControlsVisibility } from './touchControls.js';

let lastState = null;

export function updateHUD(state) {
  if (state) lastState = state;
  const s = state || lastState;
  if (!s) return;

  const waveEl = document.getElementById('hud-wave');
  if (waveEl) {
    if (s.gameMode === 'story') {
      const ch = (s.storyPhase === 'orientation') ? 'ACT I • ORIENTASI'
               : (s.storyPhase === 'complication') ? 'ACT I • KOMPLIKASI'
               : (s.storyPhase === 'resolution') ? 'ACT I • RESOLUSI'
               : 'ACT I • KODA';
      waveEl.innerText = `${ch}`;
    } else {
      waveEl.innerText = `ENDLESS HORDE: WAVE ${s.wave}`;
    }
  }

  const killsEl = document.getElementById('hud-kills');
  const killsValEl = document.getElementById('hud-kills-value');
  if (killsEl) {
    if (s.gameMode === 'endless') {
      killsEl.style.display = 'inline-block';
      const curKills = s.kills || 0;
      if (killsValEl) {
        if (killsValEl.dataset.prevKills !== undefined && Number(killsValEl.dataset.prevKills) !== curKills) {
          killsEl.classList.remove('kill-pulse');
          void killsEl.offsetWidth; // trigger reflow
          killsEl.classList.add('kill-pulse');
        }
        killsValEl.dataset.prevKills = curKills;
        killsValEl.innerText = curKills;
      } else {
        killsEl.innerHTML = `☠ KILLS: <span id="hud-kills-value" style="color: #ffffff;">${curKills}</span>`;
      }
    } else {
      killsEl.style.display = 'none';
    }
  }

  const scoreEl = document.getElementById('hud-score');
  if (scoreEl) {
    if (s.gameMode === 'endless') {
      scoreEl.style.display = 'block';
      scoreEl.innerText = `CRIMSON PURGED: ${String(s.kills || 0).padStart(3, '0')}`;
    } else {
      scoreEl.style.display = 'none';
    }
  }

  const p = s.player;
  if (!p) return;

  // 1. TACTICAL SLANTED HEALTH BAR (PS2 007 NIGHTFIRE / BLACK STYLE - 20 SEGMENTS)
  const healthSegmentsEl = document.getElementById('tactical-health-segments');
  if (healthSegmentsEl) {
    const totalSegments = 20;
    const activeSegments = Math.max(0, Math.min(totalSegments, Math.ceil((p.hp / 100) * totalSegments)));
    const condition = p.hp > 65 ? 'fine' : p.hp > 30 ? 'caution' : 'danger';
    let segsHtml = '';
    for (let i = 0; i < totalSegments; i++) {
      if (i < activeSegments) {
        segsHtml += `<span class="tac-seg active ${condition}"></span>`;
      } else {
        segsHtml += '<span class="tac-seg inactive"></span>';
      }
    }
    healthSegmentsEl.innerHTML = segsHtml;
  }

  // 2. TACTICAL 3 LIVES / MEDKIT CROSSES (+ + +)
  const crossesWrap = document.getElementById('tactical-crosses');
  if (crossesWrap) {
    let crossHtml = '';
    for (let i = 0; i < p.maxLives; i++) {
      if (i < p.lives) {
        crossHtml += '<span class="tac-cross full">+</span>';
      } else {
        crossHtml += '<span class="tac-cross lost">+</span>';
      }
    }
    crossesWrap.innerHTML = crossHtml;
  }

  // 3. TACTICAL WEAPON & AMMO METER (TOP-RIGHT DISPLAY: 07 \ 40)
  const ammoDigitsEl = document.getElementById('tactical-ammo-display');
  const weaponNameEl = document.getElementById('tactical-weapon-name');
  if (ammoDigitsEl) {
    if (p.weapon === 'unarmed') {
      ammoDigitsEl.innerHTML = '<span class="tac-ammo-clip">--</span><span class="tac-ammo-slash">\\</span><span class="tac-ammo-res">--</span>';
      if (weaponNameEl) weaponNameEl.innerText = 'TANGAN KOSONG';
    } else if (p.weapon === 'golok') {
      ammoDigitsEl.innerHTML = '<span class="tac-ammo-clip">--</span><span class="tac-ammo-slash">\\</span><span class="tac-ammo-res">--</span>';
      if (weaponNameEl) weaponNameEl.innerText = 'GOLOK RIMBA';
    } else if (p.isReloading) {
      ammoDigitsEl.innerHTML = '<span class="tac-ammo-reload">RELOAD...</span>';
      if (weaponNameEl) weaponNameEl.innerText = 'SHOTGUN 12G';
    } else if (p.clip === 0) {
      ammoDigitsEl.innerHTML = `<span class="tac-ammo-empty">00</span><span class="tac-ammo-slash">\\</span><span class="tac-ammo-res">${String(p.reserve).padStart(2, '0')}</span>`;
      if (weaponNameEl) weaponNameEl.innerText = 'SHOTGUN [EMPTY]';
    } else {
      const clipStr = String(p.clip).padStart(2, '0');
      const resStr = String(p.reserve).padStart(2, '0');
      ammoDigitsEl.innerHTML = `<span class="tac-ammo-clip">${clipStr}</span><span class="tac-ammo-slash">\\</span><span class="tac-ammo-res">${resStr}</span>`;
      if (weaponNameEl) weaponNameEl.innerText = 'SHOTGUN 12G';
    }
  }

  // Legacy fallback HUD ammo
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

  // Legacy fallback Vital / Portrait
  const vitalEl = document.getElementById('hud-vital');
  const portraitFrame = document.getElementById('hud-portrait-frame');
  const portraitTint = document.getElementById('hud-portrait-status-tint');
  const condition = p.hp > 65 ? 'FINE' : p.hp > 30 ? 'CAUTION' : 'DANGER';

  if (vitalEl) {
    vitalEl.innerText = `CONDITION: ${condition} [${p.hp}%]`;
  }
  if (portraitFrame) {
    portraitFrame.style.borderColor = condition === 'FINE' ? '#78e08f' : condition === 'CAUTION' ? '#e5a038' : '#ff3a4b';
  }

  const iconsContainer = document.getElementById('hud-lives-icons');
  if (iconsContainer) {
    let html = '';
    for (let i = 0; i < p.maxLives; i++) {
      html += (i < p.lives ? '<span class="life-heart full">♥</span>' : '<span class="life-heart lost">♡</span>');
    }
    iconsContainer.innerHTML = html;
    const countEl = document.getElementById('hud-lives-count');
    if (countEl) countEl.innerText = `(${p.lives}/${p.maxLives})`;
  }
}

export function showLifeLostAlert(remainingLives) {
  // 1. Flash top-left tactical health widget (subtle, non-intrusive red pulse)
  const tacWidget = document.getElementById('tactical-health-widget');
  if (tacWidget) {
    tacWidget.classList.add('hit-flash');
    setTimeout(() => {
      tacWidget.classList.remove('hit-flash');
    }, 850);
  }

  // 2. Flash screen damage vignette without blocking central vision
  const damageFlash = document.getElementById('damage-flash');
  if (damageFlash) {
    damageFlash.style.opacity = '0.65';
    setTimeout(() => {
      damageFlash.style.opacity = '0';
    }, 380);
  }

  // 3. Invulnerability aura
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
