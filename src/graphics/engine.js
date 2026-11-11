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
  antialias: false,
  powerPreference: 'high-performance',
  precision: 'mediump'
});
renderer.setPixelRatio(1.0);
renderer.shadowMap.enabled = !isMobileDevice;
renderer.shadowMap.type = THREE.BasicShadowMap; // Authentic PS2 hard shadow: 3x faster than PCFSoftShadowMap

export const FOG_COLOR = 0x828a93; // Silent Hill 2 iconic dense ash-gray mist
renderer.setClearColor(FOG_COLOR);

export const scene = new THREE.Scene();
scene.fog = new THREE.Fog(FOG_COLOR, 1.0, 18.0); // Extra dense atmospheric fog (engulfs horizon beyond 18m)

export const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 48.0);
camera.rotation.order = 'YXZ';

// Ambient Lighting (Diffused cold daylight penetrating through dense fog)
export const ambientLight = new THREE.AmbientLight(0x9aa4af, 0.85);
scene.add(ambientLight);

// Pale Overcast Sky Directional Light (creates soft atmospheric shadows in mist)
export const overcastDirLight = new THREE.DirectionalLight(0xdbe3ec, 0.68);
overcastDirLight.position.set(18, 45, 22);
overcastDirLight.castShadow = !isMobileDevice;
const shadowRes = 512;
overcastDirLight.shadow.mapSize.width = shadowRes;
overcastDirLight.shadow.mapSize.height = shadowRes;
overcastDirLight.shadow.camera.near = 1;
overcastDirLight.shadow.camera.far = 135;
overcastDirLight.shadow.camera.left = -45;
overcastDirLight.shadow.camera.right = 45;
overcastDirLight.shadow.camera.top = 45;
overcastDirLight.shadow.camera.bottom = -45;
overcastDirLight.shadow.bias = -0.0012;
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

export function applyGraphicFidelity(mode = 'ps1') {
  gameSettings.graphicMode = 'ps1';
  canvas.classList.remove('ps2-mode');

  // Authentic PS1 1997 Pixelated Rendering (320px downscaled resolution)
  const aspect = window.innerWidth / window.innerHeight;
  const w = 320;
  const h = Math.max(180, Math.round(320 / aspect));
  renderer.setSize(w, h, false);
  camera.aspect = aspect;
  camera.updateProjectionMatrix();

  renderer.shadowMap.enabled = false;
  overcastDirLight.castShadow = false;
}

window.addEventListener('resize', () => {
  applyGraphicFidelity('ps1');
});
