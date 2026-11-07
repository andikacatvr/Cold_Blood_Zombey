/* =========================================================================
   EFFECTS & PARTICLES (BLOOD DECALS, SPLINTERS, COLD BREATH VAPOR, DRIPS)
   ========================================================================= */

import { getTerrainHeight } from '../world/environment.js';

const THREE = window.THREE;

export const bloodDecals = [];
export const deadCorpses = [];
export const airborneDrips = [];
export const curseProjectiles = [];
export const woodSplinters = [];
export const breathPuffs = [];

let sceneRef = null;
let bloodSnowTexRef = null;
let bloodDripTexRef = null;

const breathGeo = new THREE.PlaneGeometry(0.24, 0.24);
const breathMat = new THREE.MeshBasicMaterial({
  color: 0xd8e8f2,
  transparent: true,
  opacity: 0.38,
  depthWrite: false
});

export function initEffects(scene, bloodSnowTex, bloodDripTex) {
  sceneRef = scene;
  bloodSnowTexRef = bloodSnowTex;
  bloodDripTexRef = bloodDripTex;
}

export function spawnBloodPoolOnSnow(x, z, scale = 1.0) {
  if (!sceneRef) return;
  if (bloodDecals.length > 50) {
    const oldest = bloodDecals.shift();
    if (oldest && oldest.mesh) sceneRef.remove(oldest.mesh);
  }
  const finalR = (1.9 + Math.random() * 1.2) * scale;
  const initR = finalR * 0.25;

  const g = new THREE.PlaneGeometry(1, 1);
  const m = new THREE.MeshPhongMaterial({
    map: bloodSnowTexRef,
    transparent: true,
    opacity: 0.98,
    specular: 0x991822,
    shininess: 90,
    depthWrite: false
  });
  const decal = new THREE.Mesh(g, m);
  decal.rotation.x = -Math.PI / 2;
  decal.rotation.z = Math.random() * Math.PI * 2;
  const gy = getTerrainHeight(x, z);
  decal.position.set(
    x + (Math.random() - 0.5) * 0.2,
    gy + 0.02 + (bloodDecals.length % 35) * 0.001,
    z + (Math.random() - 0.5) * 0.2
  );
  decal.scale.set(initR, initR, 1);
  sceneRef.add(decal);

  bloodDecals.push({
    mesh: decal,
    mat: m,
    age: 0,
    maxLife: 10.0, // EXACTLY 10 SECONDS
    curScale: initR,
    targetScale: finalR,
    spreadSpeed: 2.8
  });
}

export function spawnWalkingBloodDrip(x, z, scale = 0.45) {
  if (!sceneRef) return;
  if (bloodDecals.length > 50) {
    const oldest = bloodDecals.shift();
    if (oldest && oldest.mesh) sceneRef.remove(oldest.mesh);
  }
  const g = new THREE.PlaneGeometry(1, 1);
  const m = new THREE.MeshBasicMaterial({
    map: bloodDripTexRef,
    transparent: true,
    opacity: 0.94,
    depthWrite: false
  });
  const decal = new THREE.Mesh(g, m);
  decal.rotation.x = -Math.PI / 2;
  decal.rotation.z = Math.random() * Math.PI * 2;
  const gy = getTerrainHeight(x, z);
  decal.position.set(
    x + (Math.random() - 0.5) * 0.28,
    gy + 0.015 + (bloodDecals.length % 35) * 0.001,
    z + (Math.random() - 0.5) * 0.28
  );
  const r = (0.35 + Math.random() * 0.35) * scale;
  decal.scale.set(r, r, 1);
  sceneRef.add(decal);

  bloodDecals.push({
    mesh: decal,
    mat: m,
    age: 0,
    maxLife: 10.0,
    curScale: r,
    targetScale: r * 1.15,
    spreadSpeed: 0.4
  });
}

export function createAirborneBloodDrop(originPos) {
  if (!sceneRef) return;
  const g = new THREE.BoxGeometry(0.06, 0.09, 0.06);
  const m = new THREE.MeshBasicMaterial({ color: 0x9e080f });
  const mesh = new THREE.Mesh(g, m);
  mesh.position.copy(originPos);
  mesh.position.x += (Math.random() - 0.5) * 0.3;
  mesh.position.z += (Math.random() - 0.5) * 0.3;
  sceneRef.add(mesh);

  airborneDrips.push({
    mesh,
    velY: -(0.5 + Math.random() * 1.2),
    vx: (Math.random() - 0.5) * 0.3,
    vz: (Math.random() - 0.5) * 0.3
  });
}

export function spawnWoodSplinters(pos) {
  if (!sceneRef) return;
  const splinterMat1 = new THREE.MeshLambertMaterial({ color: 0x825332, flatShading: true });
  const splinterMat2 = new THREE.MeshLambertMaterial({ color: 0x4a2e1d, flatShading: true });

  for (let i = 0; i < 16; i++) {
    const sw = 0.08 + Math.random() * 0.12;
    const sh = 0.22 + Math.random() * 0.45;
    const sd = 0.06 + Math.random() * 0.08;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, sd), i % 2 === 0 ? splinterMat1 : splinterMat2);
    mesh.position.set(
      pos.x + (Math.random() - 0.5) * 0.7,
      pos.y + (Math.random() - 0.5) * 0.7,
      pos.z + (Math.random() - 0.5) * 0.7
    );
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    sceneRef.add(mesh);

    const a = Math.random() * Math.PI * 2;
    const spd = 3.2 + Math.random() * 4.6;
    woodSplinters.push({
      mesh: mesh,
      vx: Math.cos(a) * spd,
      vy: 2.8 + Math.random() * 3.6,
      vz: Math.sin(a) * spd,
      rotX: (Math.random() - 0.5) * 14,
      rotZ: (Math.random() - 0.5) * 14,
      age: 0,
      maxLife: 6.5
    });
  }
}

export function spawnColdBreath(pos, dir, isPlayer = false) {
  if (!sceneRef) return;
  const mesh = new THREE.Mesh(breathGeo, breathMat.clone());
  mesh.position.copy(pos);
  mesh.rotation.z = Math.random() * Math.PI * 2;
  sceneRef.add(mesh);

  breathPuffs.push({
    mesh,
    age: 0,
    maxLife: isPlayer ? 1.4 : 0.95,
    vx: dir.x * 0.45 + (Math.random() - 0.5) * 0.08,
    vy: 0.16 + Math.random() * 0.10,
    vz: dir.z * 0.45 + (Math.random() - 0.5) * 0.08,
    initialScale: isPlayer ? 0.28 : 0.22,
    targetScale: isPlayer ? 1.15 : 0.8
  });
}
