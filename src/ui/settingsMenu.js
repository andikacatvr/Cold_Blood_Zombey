/* =========================================================================
   SETTINGS MENU CONTROLLER & EVENT LISTENERS
   Volume, Mouse Sensitivity, PS2/PS1 Fidelity, CRT Scanlines, Crosshair
   ========================================================================= */

import { updateTouchControlsVisibility } from './touchControls.js';

export let isSettingsOpen = false;
let settingsOpenedFromGame = false;

export function applyCrosshairColor(color) {
  document.querySelectorAll('.cross-h, .cross-v').forEach(el => {
    el.style.backgroundColor = color;
  });
}

export function syncSettingsUI(gameSettings, state) {
  // Volume slider
  const volEl = document.getElementById('setting-volume');
  const valVolEl = document.getElementById('val-volume');
  if (volEl && valVolEl) {
    volEl.value = Math.round(gameSettings.volume * 100);
    valVolEl.innerText = `${volEl.value}%`;
  }

  // Sensitivity slider
  const sensEl = document.getElementById('setting-sens');
  const valSensEl = document.getElementById('val-sens');
  if (sensEl && valSensEl) {
    sensEl.value = gameSettings.sensitivity.toFixed(1);
    valSensEl.innerText = `${sensEl.value}x`;
  }

  // Graphic Fidelity
  const gfxGroup = document.getElementById('group-graphics');
  if (gfxGroup) {
    const curGfx = gameSettings.graphicMode || 'ps2';
    gfxGroup.querySelectorAll('.btn-opt').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.gfx === curGfx);
    });
  }

  // CRT Scanlines
  const crtGroup = document.getElementById('group-crt');
  if (crtGroup) {
    crtGroup.querySelectorAll('.btn-opt').forEach(btn => {
      const isAct = (btn.dataset.crt === 'true') === !!gameSettings.crtEnabled;
      btn.classList.toggle('active', isAct);
    });
  }
  const crtEl = document.getElementById('crt-fx');
  if (crtEl) crtEl.style.display = gameSettings.crtEnabled ? 'block' : 'none';

  // Difficulty
  const diffGroup = document.getElementById('group-diff');
  if (diffGroup) {
    diffGroup.querySelectorAll('.btn-opt').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.diff === gameSettings.difficulty);
    });
  }

  // Crosshair Color
  const crossGroup = document.getElementById('group-cross');
  if (crossGroup) {
    crossGroup.querySelectorAll('.btn-opt').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.color === gameSettings.crosshairColor);
    });
  }
  applyCrosshairColor(gameSettings.crosshairColor);

  // Weapon selection in settings
  const weaponGroup = document.getElementById('group-weapon');
  if (weaponGroup) {
    const curW = (state && state.player ? state.player.weapon : null) || gameSettings.weapon || 'spin';
    weaponGroup.querySelectorAll('.btn-opt').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.weapon === curW);
    });
  }

  // Touch Controls Mode
  const touchGroup = document.getElementById('group-touch');
  if (touchGroup) {
    const curTouch = gameSettings.touchControls || 'auto';
    touchGroup.querySelectorAll('.btn-opt').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.touch === curTouch);
    });
  }
}

export function openSettings(state, gameSettings) {
  if (isSettingsOpen) return;
  isSettingsOpen = true;
  settingsOpenedFromGame = state ? state.running : false;

  if (state && state.running) {
    state.isPaused = true;
    if (document.pointerLockElement === document.body && document.exitPointerLock) {
      document.exitPointerLock();
    }
  }

  const sScreen = document.getElementById('screen-settings');
  if (sScreen) sScreen.style.display = 'flex';
  syncSettingsUI(gameSettings, state);
  updateTouchControlsVisibility();
}

export function closeSettings(state) {
  if (!isSettingsOpen) return;
  isSettingsOpen = false;
  const sScreen = document.getElementById('screen-settings');
  if (sScreen) sScreen.style.display = 'none';

  if (settingsOpenedFromGame && state && state.running) {
    state.isPaused = false;
    try {
      document.body.requestPointerLock?.();
    } catch (err) {}
  }
  updateTouchControlsVisibility();
}

export function setupSettingsListeners(context) {
  const {
    gameSettings,
    DEFAULT_SETTINGS,
    saveSettings,
    Sfx,
    applyGraphicFidelity,
    switchWeapon,
    state
  } = context;

  // Volume
  const volInput = document.getElementById('setting-volume');
  if (volInput) {
    volInput.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10) / 100;
      gameSettings.volume = val;
      const lbl = document.getElementById('val-volume');
      if (lbl) lbl.innerText = `${e.target.value}%`;
      Sfx.setVolume(val);
      saveSettings();
    });
  }

  // Sensitivity
  const sensInput = document.getElementById('setting-sens');
  if (sensInput) {
    sensInput.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      gameSettings.sensitivity = val;
      const lbl = document.getElementById('val-sens');
      if (lbl) lbl.innerText = `${val.toFixed(1)}x`;
      saveSettings();
    });
  }

  // Graphic Fidelity
  document.querySelectorAll('#group-graphics .btn-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.gfx || 'ps2';
      gameSettings.graphicMode = mode;
      applyGraphicFidelity(mode);
      syncSettingsUI(gameSettings, state);
      saveSettings();
    });
  });

  // CRT Toggle
  document.querySelectorAll('#group-crt .btn-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      gameSettings.crtEnabled = (btn.dataset.crt === 'true');
      syncSettingsUI(gameSettings, state);
      saveSettings();
    });
  });

  // Difficulty
  document.querySelectorAll('#group-diff .btn-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      gameSettings.difficulty = btn.dataset.diff;
      syncSettingsUI(gameSettings, state);
      saveSettings();
    });
  });

  // Crosshair color
  document.querySelectorAll('#group-cross .btn-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      gameSettings.crosshairColor = btn.dataset.color;
      syncSettingsUI(gameSettings, state);
      saveSettings();
    });
  });

  // Weapon option in settings
  document.querySelectorAll('#group-weapon .btn-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      switchWeapon(btn.dataset.weapon);
    });
  });

  // Touch Controls Setting
  document.querySelectorAll('#group-touch .btn-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      gameSettings.touchControls = btn.dataset.touch || 'auto';
      syncSettingsUI(gameSettings, state);
      saveSettings();
      updateTouchControlsVisibility();
    });
  });

  // Fullscreen button
  const fsBtn = document.getElementById('btn-fullscreen');
  if (fsBtn) {
    fsBtn.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => console.warn(err));
      } else {
        if (document.exitFullscreen) document.exitFullscreen();
      }
    });
  }

  // Reset settings
  const resetBtn = document.getElementById('btn-reset-settings');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      Object.assign(gameSettings, DEFAULT_SETTINGS);
      saveSettings();
      Sfx.setVolume(gameSettings.volume);
      applyGraphicFidelity(gameSettings.graphicMode || 'ps1');
      syncSettingsUI(gameSettings, state);
      switchWeapon(gameSettings.weapon);
    });
  }

  // Open/Close buttons
  const hudSettingsBtn = document.getElementById('hud-settings-btn');
  if (hudSettingsBtn) {
    hudSettingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openSettings(state, gameSettings);
    });
  }

  const menuSettingsBtn = document.getElementById('btn-menu-settings');
  if (menuSettingsBtn) {
    menuSettingsBtn.addEventListener('click', () => openSettings(state, gameSettings));
  }

  const goSettingsBtn = document.getElementById('btn-go-settings');
  if (goSettingsBtn) {
    goSettingsBtn.addEventListener('click', () => openSettings(state, gameSettings));
  }

  const closeSettingsBtn = document.getElementById('btn-close-settings');
  if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener('click', () => closeSettings(state));
  }

  const closeSettingsX = document.getElementById('btn-close-settings-x');
  if (closeSettingsX) {
    closeSettingsX.addEventListener('click', () => closeSettings(state));
  }

  const settingsModal = document.getElementById('screen-settings');
  if (settingsModal) {
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) {
        closeSettings(state);
      }
    });
  }

  // Pointer lock change handler
  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement !== document.body) {
      if (state.running && !isSettingsOpen && state.player.lives > 0) {
        openSettings(state, gameSettings);
      }
    }
  });
}
