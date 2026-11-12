/* =========================================================================
   MOBILE PHONE TOUCH CONTROLS & ERGONOMIC ON-SCREEN INTERACTION
   Virtual thumbstick locomotion, touch drag camera look, and tactile combat buttons
   ========================================================================= */

import { gameSettings } from '../config/settings.js';
import {
  state,
  keys,
  touchMove,
  addLookDelta,
  triggerPlayerAttack,
  triggerPlayerJump,
  reloadWeapon,
  switchWeapon,
  performGolokSlash,
  triggerInteract
} from '../core/player.js';
import { toggleCameraMode } from '../entities/playerModel.js';
import { isCinematicActive } from '../core/cutscene.js';
import { isSettingsOpen } from './settingsMenu.js';
import { isMapOpen } from './mapMenu.js';

let joystickTouchId = null;
let lookTouchId = null;
let lastLookX = 0;
let lastLookY = 0;

let joystickZone = null;
let joystickBase = null;
let joystickKnob = null;
let touchControlsContainer = null;
let fireInterval = null;

export function isTouchDevice() {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
  );
}

export function isTouchControlsEnabled() {
  const setting = gameSettings.touchControls || 'auto';
  if (setting === 'on') return true;
  if (setting === 'off') return false;
  return isTouchDevice();
}

export function updateTouchControlsVisibility() {
  if (!touchControlsContainer) {
    touchControlsContainer = document.getElementById('touch-controls');
  }
  if (!touchControlsContainer) return;

  const shouldShow =
    state.running &&
    !state.isPaused &&
    !isCinematicActive &&
    !isSettingsOpen &&
    !isMapOpen &&
    isTouchControlsEnabled();

  touchControlsContainer.style.display = shouldShow ? 'block' : 'none';
}

function vibrate(ms = 22) {
  try {
    if (navigator.vibrate) {
      navigator.vibrate(ms);
    }
  } catch (err) {}
}

export function initTouchControls() {
  touchControlsContainer = document.getElementById('touch-controls');
  joystickZone = document.getElementById('touch-joystick-zone');
  joystickBase = document.getElementById('joystick-base');
  joystickKnob = document.getElementById('joystick-knob');
  const lookZone = document.getElementById('touch-look-zone');

  if (!touchControlsContainer || !joystickZone || !joystickBase || !joystickKnob || !lookZone) {
    return;
  }

  // 1. Virtual Joystick Locomotion
  const MAX_RADIUS = 46;

  function handleJoystickTouch(touch) {
    const rect = joystickBase.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = touch.clientX - centerX;
    const dy = touch.clientY - centerY;
    const dist = Math.hypot(dx, dy);

    const clampedDist = Math.min(dist, MAX_RADIUS);
    const angle = Math.atan2(dy, dx);

    const knobX = Math.cos(angle) * clampedDist;
    const knobY = Math.sin(angle) * clampedDist;

    joystickKnob.style.transform = `translate(${knobX}px, ${knobY}px)`;

    const normX = clampedDist > 6 ? (knobX / MAX_RADIUS) : 0;
    const normY = clampedDist > 6 ? (knobY / MAX_RADIUS) : 0;

    touchMove.x = normX;
    touchMove.z = normY;
    touchMove.active = clampedDist > 6;

    // Digital fallback keys for sub-systems
    keys.w = normY < -0.32;
    keys.s = normY > 0.32;
    keys.a = normX < -0.32;
    keys.d = normX > 0.32;
  }

  function resetJoystick() {
    joystickTouchId = null;
    joystickKnob.style.transform = 'translate(0px, 0px)';
    touchMove.x = 0;
    touchMove.z = 0;
    touchMove.active = false;
    keys.w = false;
    keys.s = false;
    keys.a = false;
    keys.d = false;
  }

  joystickZone.addEventListener('touchstart', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (joystickTouchId !== null) return;
    const touch = e.changedTouches[0];
    joystickTouchId = touch.identifier;
    handleJoystickTouch(touch);
    vibrate(15);
  }, { passive: false });

  joystickZone.addEventListener('touchmove', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (joystickTouchId === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joystickTouchId) {
        handleJoystickTouch(e.changedTouches[i]);
        break;
      }
    }
  }, { passive: false });

  const endJoystick = (e) => {
    if (joystickTouchId === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joystickTouchId) {
        resetJoystick();
        break;
      }
    }
  };

  joystickZone.addEventListener('touchend', endJoystick, { passive: false });
  joystickZone.addEventListener('touchcancel', endJoystick, { passive: false });

  // 2. Touch-to-Look Camera Pan (Right Side)
  lookZone.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (lookTouchId !== null) return;
    const touch = e.changedTouches[0];
    lookTouchId = touch.identifier;
    lastLookX = touch.clientX;
    lastLookY = touch.clientY;
  }, { passive: false });

  lookZone.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (lookTouchId === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === lookTouchId) {
        const dx = touch.clientX - lastLookX;
        const dy = touch.clientY - lastLookY;
        addLookDelta(dx, dy);
        lastLookX = touch.clientX;
        lastLookY = touch.clientY;
        break;
      }
    }
  }, { passive: false });

  const endLook = (e) => {
    if (lookTouchId === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === lookTouchId) {
        lookTouchId = null;
        break;
      }
    }
  };

  lookZone.addEventListener('touchend', endLook, { passive: false });
  lookZone.addEventListener('touchcancel', endLook, { passive: false });

  // 3. Action Buttons
  // Fire Button (Tap & Rapid Hold)
  const btnFire = document.getElementById('btn-touch-fire');
  if (btnFire) {
    const startFire = (e) => {
      e.preventDefault();
      e.stopPropagation();
      btnFire.classList.add('active');
      vibrate(28);
      triggerPlayerAttack();
      if (!fireInterval) {
        fireInterval = setInterval(() => {
          if (state.running && !state.isPaused) {
            triggerPlayerAttack();
          }
        }, 110);
      }
    };

    const stopFire = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      btnFire.classList.remove('active');
      if (fireInterval) {
        clearInterval(fireInterval);
        fireInterval = null;
      }
    };

    btnFire.addEventListener('touchstart', startFire, { passive: false });
    btnFire.addEventListener('touchend', stopFire, { passive: false });
    btnFire.addEventListener('touchcancel', stopFire, { passive: false });
    btnFire.addEventListener('mousedown', startFire);
    btnFire.addEventListener('mouseup', stopFire);
    btnFire.addEventListener('mouseleave', stopFire);
  }

  // Reload Button
  const btnReload = document.getElementById('btn-touch-reload');
  if (btnReload) {
    const onReload = (e) => {
      e.preventDefault();
      e.stopPropagation();
      vibrate(20);
      reloadWeapon();
    };
    btnReload.addEventListener('touchstart', onReload, { passive: false });
    btnReload.addEventListener('click', onReload);
  }

  // Weapon Switch Button
  const btnSwitch = document.getElementById('btn-touch-switch');
  if (btnSwitch) {
    const onSwitch = (e) => {
      e.preventDefault();
      e.stopPropagation();
      vibrate(20);
      switchWeapon();
    };
    btnSwitch.addEventListener('touchstart', onSwitch, { passive: false });
    btnSwitch.addEventListener('click', onSwitch);
  }

  // Quick Melee Slash Button
  const btnMelee = document.getElementById('btn-touch-melee');
  if (btnMelee) {
    const onMelee = (e) => {
      e.preventDefault();
      e.stopPropagation();
      vibrate(25);
      performGolokSlash(true);
    };
    btnMelee.addEventListener('touchstart', onMelee, { passive: false });
    btnMelee.addEventListener('click', onMelee);
  }

  // Jump Button
  const btnJump = document.getElementById('btn-touch-jump');
  if (btnJump) {
    const onJump = (e) => {
      e.preventDefault();
      e.stopPropagation();
      vibrate(20);
      triggerPlayerJump();
    };
    btnJump.addEventListener('touchstart', onJump, { passive: false });
    btnJump.addEventListener('click', onJump);
  }

  // Sprint Toggle Button
  const btnSprint = document.getElementById('btn-touch-sprint');
  if (btnSprint) {
    const onSprint = (e) => {
      e.preventDefault();
      e.stopPropagation();
      keys.shift = !keys.shift;
      btnSprint.classList.toggle('active', keys.shift);
      vibrate(22);
    };
    btnSprint.addEventListener('touchstart', onSprint, { passive: false });
    btnSprint.addEventListener('click', onSprint);
  }

  // Kristin Companion Dialogue Button
  const btnInteract = document.getElementById('btn-touch-interact');
  if (btnInteract) {
    const onInteract = (e) => {
      e.preventDefault();
      e.stopPropagation();
      vibrate(20);
      triggerInteract();
    };
    btnInteract.addEventListener('touchstart', onInteract, { passive: false });
    btnInteract.addEventListener('click', onInteract);
  }

  // Camera Switch Button (FPS/TPS)
  const btnCamera = document.getElementById('btn-touch-camera');
  if (btnCamera) {
    const onCamera = (e) => {
      e.preventDefault();
      e.stopPropagation();
      vibrate(20);
      toggleCameraMode();
    };
    btnCamera.addEventListener('touchstart', onCamera, { passive: false });
    btnCamera.addEventListener('click', onCamera);
  }

  // Initial visibility update
  updateTouchControlsVisibility();
}

