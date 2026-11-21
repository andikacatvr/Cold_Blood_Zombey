import { gameSettings } from '../config/settings.js';

const THREE = window.THREE;

export const NATIVE_W = 320;
export const NATIVE_H = 240;

export const isMobileDevice = (
  'ontouchstart' in window ||
  navigator.maxTouchPoints > 0 ||
  (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
);

export const canvas = document.getElementById('ps1-canvas');
export const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
  precision: 'highp'
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1.0, 2.0));
renderer.shadowMap.enabled = !isMobileDevice;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Clean soft shadow filtering

export const FOG_COLOR = 0x828a93; // Silent Hill 2 iconic dense ash-gray mist
renderer.setClearColor(FOG_COLOR);

export const scene = new THREE.Scene();
scene.fog = new THREE.Fog(FOG_COLOR, 3.0, 42.0); // Balanced atmospheric fog: crisp nearby details + deep eerie horizon

export const camera = new THREE.PerspectiveCamera(62, window.innerWidth / Math.max(1, window.innerHeight), 0.1, 75.0);
camera.rotation.order = 'YXZ';

// Ambient Lighting (Diffused cold daylight penetrating through dense fog)
export const ambientLight = new THREE.AmbientLight(0x9aa4af, 0.88);
scene.add(ambientLight);

// Pale Overcast Sky Directional Light (creates soft atmospheric shadows in mist)
export const overcastDirLight = new THREE.DirectionalLight(0xdbe3ec, 0.72);
overcastDirLight.position.set(18, 45, 22);
overcastDirLight.castShadow = !isMobileDevice;
const shadowRes = 1024;
overcastDirLight.shadow.mapSize.width = shadowRes;
overcastDirLight.shadow.mapSize.height = shadowRes;
overcastDirLight.shadow.camera.near = 1;
overcastDirLight.shadow.camera.far = 135;
overcastDirLight.shadow.camera.left = -45;
overcastDirLight.shadow.camera.right = 45;
overcastDirLight.shadow.camera.top = 45;
overcastDirLight.shadow.camera.bottom = -45;
overcastDirLight.shadow.bias = -0.0008;
scene.add(overcastDirLight);

// Silent Hill 2 Chest-Pinned Flashlight (optimized high-intensity beam without costly dynamic shadow maps)
export const playerFlashlight = new THREE.SpotLight(0xfff8e8, 2.8, 32, Math.PI / 4.2, 0.45, 1.15);
playerFlashlight.position.set(0.18, -0.22, 0);
playerFlashlight.castShadow = false;
camera.add(playerFlashlight);

export const flashTarget = new THREE.Object3D();
flashTarget.position.set(0.18, -0.22, -12);
camera.add(flashTarget);
playerFlashlight.target = flashTarget;
scene.add(camera);

export function applyGraphicFidelity(mode = 'hd') {
  const effectiveMode = (mode === 'ps1') ? 'ps1' : 'hd';
  gameSettings.graphicMode = effectiveMode;

  const aspect = window.innerWidth / Math.max(1, window.innerHeight);

  if (effectiveMode === 'hd') {
    canvas.classList.remove('ps1-pixelated');
    canvas.classList.add('hd-mode');

    const dpr = Math.min(window.devicePixelRatio || 1.0, 2.0);
    renderer.setPixelRatio(dpr);
    renderer.setSize(window.innerWidth, window.innerHeight, false);

    renderer.shadowMap.enabled = !isMobileDevice;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    overcastDirLight.castShadow = !isMobileDevice;

    if (scene.fog) {
      if (window.__ENDLESS_ACTIVE) {
        scene.fog.near = 1.0;
        scene.fog.far = 16.0;
      } else {
        scene.fog.near = 3.0;
        scene.fog.far = 42.0;
      }
    }
    camera.far = 75.0;
  } else {
    canvas.classList.remove('hd-mode');
    canvas.classList.add('ps1-pixelated');

    renderer.setPixelRatio(1.0);
    const h = 240;
    const w = Math.max(320, Math.round(240 * aspect));
    renderer.setSize(w, h, false);

    renderer.shadowMap.enabled = false;
    overcastDirLight.castShadow = false;

    if (scene.fog) {
      if (window.__ENDLESS_ACTIVE) {
        scene.fog.near = 1.0;
        scene.fog.far = 14.0;
      } else {
        scene.fog.near = 1.5;
        scene.fog.far = 24.0;
      }
    }
    camera.far = 48.0;
  }

  camera.aspect = aspect;

  // Adaptive FOV for ultrawide & widescreen aspect ratios
  if (aspect >= 2.0) {
    camera.fov = 68;
  } else if (aspect >= 1.7) {
    camera.fov = 65;
  } else if (aspect <= 1.35) {
    camera.fov = 60;
  } else {
    camera.fov = 62;
  }
  camera.updateProjectionMatrix();
}

window.addEventListener('resize', () => {
  applyGraphicFidelity(gameSettings.graphicMode || 'hd');
});
