/* =========================================================================
   EFFECTS & PARTICLES (BLOOD DECALS, SPLINTERS, COLD BREATH VAPOR, DRIPS)
   ========================================================================= */

import { getTerrainHeight } from '../world/environment.js';
import { triggerScreenShake } from './playerModel.js';

const THREE = window.THREE;

export const bloodDecals = [];
export const deadCorpses = [];
export const airborneDrips = [];
export const curseProjectiles = [];
export const woodSplinters = [];
export const breathPuffs = [];
export const bossDeathSequences = [];
export const bossShatterShards = [];
export const bossShockwaves = [];

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

/**
 * Initiates the dramatic overcharge and violent death sequence for Nona Batavia:
 * Phase 1: Violent in-air levitation convulsion with swelling occult core & screech
 * Phase 2: Massive explosive shockwave rings, body shattering into 75 shards, screenshake & boom!
 */
export function spawnNonaBataviaDeathSequence(bossZombie, Sfx) {
  if (!sceneRef || !bossZombie || !bossZombie.model) return;

  const bx = bossZombie.x !== undefined ? bossZombie.x : bossZombie.model.root.position.x;
  const by = bossZombie.y !== undefined ? bossZombie.y : bossZombie.model.root.position.y;
  const bz = bossZombie.z !== undefined ? bossZombie.z : bossZombie.model.root.position.z;
  const pos = new THREE.Vector3(bx, by, bz);

  // 1. Swelling occult core orb inside chest
  const coreGeo = new THREE.SphereGeometry(0.85, 14, 14);
  const coreMat = new THREE.MeshBasicMaterial({
    color: 0xff3824,
    wireframe: true,
    transparent: true,
    opacity: 0.95
  });
  const coreMesh = new THREE.Mesh(coreGeo, coreMat);
  coreMesh.position.copy(pos);
  sceneRef.add(coreMesh);

  // 2. Flickering occult point light
  const light = new THREE.PointLight(0xff4500, 4.5, 30.0);
  light.position.copy(pos);
  sceneRef.add(light);

  // Sound: overcharging wail before detonation
  if (Sfx && Sfx.playNonaBataviaDeathCharge) {
    Sfx.playNonaBataviaDeathCharge();
  }

  bossDeathSequences.push({
    boss: bossZombie,
    pos: pos,
    age: 0,
    detonated: false,
    coreMesh: coreMesh,
    coreMat: coreMat,
    light: light
  });
}

export function updateBossDeathEffects(dt, zombies, Sfx, state, updateHUD) {
  if (!sceneRef) return;

  // 1. Update active boss death sequences
  for (let i = bossDeathSequences.length - 1; i >= 0; i--) {
    const seq = bossDeathSequences[i];
    seq.age += dt;

    if (!seq.detonated) {
      // Phase 1: Violent convulsion & core swelling
      const root = seq.boss.model.root;
      const jitter = 0.08 + seq.age * 0.18;
      root.position.x = seq.pos.x + (Math.random() - 0.5) * jitter;
      root.position.y = seq.pos.y + (Math.random() - 0.5) * jitter;
      root.position.z = seq.pos.z + (Math.random() - 0.5) * jitter;
      root.rotation.y += dt * (5.0 + seq.age * 10.0);

      const sc = 1.0 + seq.age * 1.8;
      seq.coreMesh.scale.set(sc, sc, sc);
      seq.coreMesh.position.copy(root.position);
      seq.light.position.copy(root.position);
      seq.light.intensity = (Math.sin(seq.age * 32.0) > 0 ? 10.0 : 1.8) * (1.0 + seq.age);

      if (seq.age >= 1.65) {
        // DETONATION!
        seq.detonated = true;

        // Clean up charging core
        sceneRef.remove(seq.coreMesh);
        sceneRef.remove(seq.light);

        // Hide original boss model
        sceneRef.remove(root);
        root.visible = false;

        // Sound: massive bass detonation boom & crystal shatter
        if (Sfx && Sfx.playBossDeathBoom) {
          Sfx.playBossDeathBoom();
        }

        // Violent camera screenshake!
        triggerScreenShake(0.85, 1.8);

        // 1. Horizontal Shockwave Wavefront Ring (Additive Blending Glowing Ripple)
        const ringGeo = new THREE.RingGeometry(0.92, 1.0, 48);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xff6b35,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.92,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        const shockRingHoriz = new THREE.Mesh(ringGeo, ringMat);
        shockRingHoriz.rotation.x = Math.PI / 2;
        shockRingHoriz.position.copy(seq.pos);
        sceneRef.add(shockRingHoriz);

        // 2. Vertical Shockwave Wavefront Ring
        const ringMatVert = new THREE.MeshBasicMaterial({
          color: 0xffd15c,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.85,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        const shockRingVert = new THREE.Mesh(ringGeo, ringMatVert);
        shockRingVert.position.copy(seq.pos);
        sceneRef.add(shockRingVert);

        // 3. Ground Shockwave Blast Ring
        const gy = getTerrainHeight(seq.pos.x, seq.pos.z);
        const groundRingMat = new THREE.MeshBasicMaterial({
          color: 0xff2a18,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.82,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        const groundRing = new THREE.Mesh(new THREE.RingGeometry(0.88, 1.0, 48), groundRingMat);
        groundRing.rotation.x = -Math.PI / 2;
        groundRing.position.set(seq.pos.x, gy + 0.15, seq.pos.z);
        sceneRef.add(groundRing);

        bossShockwaves.push({
          horiz: shockRingHoriz,
          vert: shockRingVert,
          ground: groundRing,
          age: 0,
          maxLife: 1.5
        });

        // 4. Shatter Body into 75 3D Physical Shards
        const shardMats = [
          new THREE.MeshLambertMaterial({ color: 0x3d2516, flatShading: true }), // dark kebaya cloth
          new THREE.MeshLambertMaterial({ color: 0x6e452a, flatShading: true }), // amber batik
          new THREE.MeshLambertMaterial({ color: 0xc8baa8, flatShading: true }), // pale bone
          new THREE.MeshBasicMaterial({ color: 0xff3b24 }),                       // glowing blood crystal
          new THREE.MeshBasicMaterial({ color: 0xffd15c })                        // glowing gold soul shard
        ];

        for (let k = 0; k < 75; k++) {
          const sw = 0.14 + Math.random() * 0.32;
          const sh = 0.14 + Math.random() * 0.42;
          const sd = 0.10 + Math.random() * 0.22;
          const sm = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, sd), shardMats[k % shardMats.length]);
          sm.position.set(
            seq.pos.x + (Math.random() - 0.5) * 1.2,
            seq.pos.y + (Math.random() - 0.5) * 1.8,
            seq.pos.z + (Math.random() - 0.5) * 1.2
          );
          sm.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
          sceneRef.add(sm);

          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(Math.random() * 2 - 1);
          const spd = 6.5 + Math.random() * 15.0;
          bossShatterShards.push({
            mesh: sm,
            vx: Math.sin(phi) * Math.cos(theta) * spd,
            vy: Math.cos(phi) * spd + 3.2,
            vz: Math.sin(phi) * Math.sin(theta) * spd,
            rotX: (Math.random() - 0.5) * 18,
            rotY: (Math.random() - 0.5) * 18,
            rotZ: (Math.random() - 0.5) * 18,
            age: 0,
            maxLife: 10.0,
            bounces: 0
          });
        }

        // 5. Massive blood pool & crater in snow
        spawnBloodPoolOnSnow(seq.pos.x, seq.pos.z, 3.2);

        // 6. Blast wave knockback to nearby zombies
        if (zombies && zombies.length) {
          zombies.forEach(zb => {
            if (zb.isDead) return;
            const zx = zb.x !== undefined ? zb.x : (zb.model && zb.model.root ? zb.model.root.position.x : 0);
            const zz = zb.z !== undefined ? zb.z : (zb.model && zb.model.root ? zb.model.root.position.z : 0);
            const dxx = zx - seq.pos.x;
            const dzz = zz - seq.pos.z;
            const dDist = Math.sqrt(dxx * dxx + dzz * dzz) || 1;
            const blastDirX = dxx / dDist;
            const blastDirZ = dzz / dDist;

            if (dDist < 26.0) {
              const pushPower = Math.max(3.5, (1.0 - dDist / 26.0) * 14.0);

              if (!zb.isBoss && dDist < 16.0) {
                // Lethal shockwave impact: kill and catapult into full dynamic kinematic ragdoll
                zb.hp = 0;
                zb.isDead = true;

                if (state) {
                  state.kills = (state.kills || 0) + 1;
                  state.score = (state.score || 0) + 150;
                  if (typeof updateHUD === 'function') updateHUD();
                }

                if (zb.model && zb.model.root) {
                  deadCorpses.push({
                    model: zb.model,
                    isBoss: false,
                    isFloatingBoss: false,
                    isVictorianBride: !!zb.isVictorianBride,
                    style: 'backward',
                    sideSign: Math.random() > 0.5 ? 1 : -1,
                    age: 0,
                    maxLife: 10.0,
                    linVel: new THREE.Vector3(blastDirX * pushPower, 1.8, blastDirZ * pushPower),
                    hipsY: zb.model.hips ? zb.model.hips.position.y : 0,
                    hipsRotX: 0,
                    hipsRotZ: 0,
                    spineRotX: 0,
                    neckRotX: 0,
                    kneeAngle: 0,
                    gutSpillDone: false,
                    hasImpactedGround: false,
                    settled: false,
                    weight: 1.0
                  });
                  spawnBloodPoolOnSnow(zx, zz, 1.2);
                }
              } else {
                // Outer shockwave: stagger and knock back, but keep alive and moving!
                zb.staggerTimer = 1.2;
                if (zb.model && zb.model.root) {
                  zb.model.root.position.x += blastDirX * pushPower * 0.22;
                  zb.model.root.position.z += blastDirZ * pushPower * 0.22;
                }
                if (zb.x !== undefined) zb.x += blastDirX * pushPower * 0.22;
                if (zb.z !== undefined) zb.z += blastDirZ * pushPower * 0.22;
              }
            }
          });
        }
      }
    } else {
      // Completed, remove from sequence array after 4s
      if (seq.age > 4.0) {
        bossDeathSequences.splice(i, 1);
      }
    }
  }

  // 2. Expand and fade Shockwave Rings
  for (let j = bossShockwaves.length - 1; j >= 0; j--) {
    const sw = bossShockwaves[j];
    sw.age += dt;
    const currentRadius = 1.0 + (sw.age / sw.maxLife) * 32.0; // Expands from 1m to 33m
    sw.horiz.scale.set(currentRadius, currentRadius, 1);
    sw.vert.scale.set(currentRadius, currentRadius, 1);
    sw.ground.scale.set(currentRadius, currentRadius, 1);

    const alpha = Math.max(0, 1.0 - sw.age / sw.maxLife);
    sw.horiz.material.opacity = alpha * 0.92;
    sw.vert.material.opacity = alpha * 0.85;
    sw.ground.material.opacity = alpha * 0.80;

    if (sw.age >= sw.maxLife) {
      sceneRef.remove(sw.horiz);
      sceneRef.remove(sw.vert);
      sceneRef.remove(sw.ground);
      bossShockwaves.splice(j, 1);
    }
  }

  // 3. Update physics for Shattered Body Shards
  for (let k = bossShatterShards.length - 1; k >= 0; k--) {
    const sh = bossShatterShards[k];
    sh.age += dt;

    if (sh.bounces < 2) {
      sh.vy -= 16.0 * dt;
      sh.mesh.position.x += sh.vx * dt;
      sh.mesh.position.y += sh.vy * dt;
      sh.mesh.position.z += sh.vz * dt;
      sh.mesh.rotation.x += sh.rotX * dt;
      sh.mesh.rotation.y += sh.rotY * dt;
      sh.mesh.rotation.z += sh.rotZ * dt;

      const gy = getTerrainHeight(sh.mesh.position.x, sh.mesh.position.z);
      if (sh.mesh.position.y <= gy + 0.08) {
        sh.mesh.position.y = gy + 0.08;
        sh.bounces++;
        sh.vy = -sh.vy * 0.35;
        sh.vx *= 0.45;
        sh.vz *= 0.45;
        sh.rotX *= 0.5;
        sh.rotY *= 0.5;
        sh.rotZ *= 0.5;
      }
    } else {
      // Settled in snow
      const gy = getTerrainHeight(sh.mesh.position.x, sh.mesh.position.z);
      sh.mesh.position.y = gy + 0.08;
    }

    if (sh.age >= sh.maxLife) {
      sceneRef.remove(sh.mesh);
      bossShatterShards.splice(k, 1);
    }
  }
}

export function clearBossDeathEffects() {
  if (!sceneRef) return;
  bossDeathSequences.forEach(s => {
    if (s.coreMesh) sceneRef.remove(s.coreMesh);
    if (s.light) sceneRef.remove(s.light);
  });
  bossDeathSequences.length = 0;
  bossShockwaves.forEach(sw => {
    if (sw.horiz) sceneRef.remove(sw.horiz);
    if (sw.vert) sceneRef.remove(sw.vert);
    if (sw.ground) sceneRef.remove(sw.ground);
  });
  bossShockwaves.length = 0;
  bossShatterShards.forEach(sh => {
    if (sh.mesh) sceneRef.remove(sh.mesh);
  });
  bossShatterShards.length = 0;
}
