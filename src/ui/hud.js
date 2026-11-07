/* =========================================================================
   HUD & USER INTERFACE LIFECYCLE
   Wave stats, Health & 3 Lives Hearts, Ammo, Game Over screen
   ========================================================================= */

export function updateHUD(state) {
  const waveEl = document.getElementById('hud-wave');
  if (waveEl) waveEl.innerText = `ENDLESS HORDE: WAVE ${state.wave}`;

  const scoreEl = document.getElementById('hud-score');
  if (scoreEl) scoreEl.innerText = `CRIMSON PURGED: ${String(state.kills).padStart(3, '0')}`;

  const p = state.player;
  const ammoEl = document.getElementById('hud-ammo');
  if (ammoEl) {
    if (p.weapon === 'golok') {
      ammoEl.innerText = 'MELEE: ∞ (TAJAM)';
      ammoEl.style.color = '#e6edf5';
    } else if (p.isReloading) {
      ammoEl.innerText = 'RELOAD CEPAT (1s)...';
      ammoEl.style.color = '#ffcc00';
    } else if (p.clip === 0) {
      ammoEl.innerText = `KOSONG! [TEKAN R] (0 / ${p.reserve})`;
      ammoEl.style.color = '#ff3344';
    } else {
      ammoEl.innerText = `SHELLS: ${p.clip} / ${p.reserve}`;
      ammoEl.style.color = (p.clip <= 2 ? '#ff9933' : '#e0e9f0');
    }
  }

  const vitalEl = document.getElementById('hud-vital');
  if (vitalEl) {
    vitalEl.innerText = `VITAL: ${p.hp}%`;
    if (p.hp <= 30) {
      vitalEl.classList.add('hud-danger');
    } else {
      vitalEl.classList.remove('hud-danger');
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

  const goScreen = document.getElementById('screen-gameover');
  if (goScreen) goScreen.style.display = 'flex';

  const goWave = document.getElementById('go-wave-text');
  if (goWave) goWave.innerText = `ENDLESS RUN: BERTAHAN HINGGA WAVE ${state.wave}`;
  const goKills = document.getElementById('go-kills');
  if (goKills) goKills.innerText = `TOTAL CRIMSON PURGED: ${state.kills}`;
}
